import uuid
import logging
from datetime import datetime, timezone, timedelta, date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

logger = logging.getLogger(__name__)

from models.personnel import Personnel, Unit
from models.leave import LeaveRecord
from models.duty_roster import DutyRoster
from models.prediction import RiskPrediction
from models.grievance import GrievanceRequest
from middleware.audit import log_audit
from services.welfare_resilience_service import check_intervention_collision

FAST_LANE_CATEGORIES = {
    "family_emergency",
    "bereavement",
    "acute_domestic_crisis",
    "medical_emergency",
    "family_crisis"
}
EMERGENCY_SLA_HOURS = 12
STANDARD_SLA_HOURS = 72

ESCALATION_TIERS = {
    0: "Company Commander / Platoon Havildar",
    1: "Battalion Welfare Officer / Second-in-Command (2IC)",
    2: "Commandant (Commanding Officer)"
}

def to_utc(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)

def file_grievance_or_leave(
    db: Session,
    personnel_id: str,
    request_type: str,
    category: str,
    description: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    filing_channel: str = "pwa",
    user_id: Optional[str] = None,
    request_id: Optional[str] = None
) -> GrievanceRequest:
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise ValueError(f"Personnel ID {personnel_id} not found")

    now = datetime.now(timezone.utc)
    cat_lower = category.strip().lower()

    # 1. Fast-Lane Check (Roadmap Step 2)
    is_fast_lane = (
        cat_lower in FAST_LANE_CATEGORIES or
        request_type.lower() == "family_crisis"
    )

    if is_fast_lane:
        sla_hours = EMERGENCY_SLA_HOURS
        initial_status = "fast_tracked"
    else:
        sla_hours = STANDARD_SLA_HOURS
        initial_status = "filed"

    deadline = now + timedelta(hours=sla_hours)

    # 2. Collision Check & Team Impact (Roadmap Step 3)
    collision_status = "safe"
    collision_details = {}
    suggested_replacement_id = None

    if start_date:
        try:
            target_d = datetime.strptime(start_date, "%Y-%m-%d").date()
            # Find a rested peer in same unit with matching trade
            peers = db.query(Personnel).filter(
                Personnel.unit_id == personnel.unit_id,
                Personnel.trade == personnel.trade,
                Personnel.id != personnel.id
            ).all()

            if peers:
                best_peer = None
                best_score = 999.0
                for peer in peers:
                    pred = db.query(RiskPrediction).filter(
                        RiskPrediction.personnel_id == peer.id
                    ).order_by(RiskPrediction.predicted_at.desc()).first()
                    score = float(pred.risk_score) if pred else 0.2
                    if score < best_score:
                        best_score = score
                        best_peer = peer

                if best_peer:
                    suggested_replacement_id = best_peer.id
                    res = check_intervention_collision(
                        db=db,
                        personnel_id=personnel.id,
                        target_date=target_d,
                        proposed_shift="day",
                        swap_with_id=best_peer.id
                    )
                    collision_details = res
                    if not res.get("is_safe", True):
                        collision_status = "warning" if len(res.get("collisions", [])) == 0 else "blocked"
                    else:
                        collision_status = "safe"
            else:
                collision_status = "warning"
                collision_details = {"warning": f"No alternate personnel with matching trade '{personnel.trade}' found in unit"}
        except Exception as e:
            collision_status = "warning"
            collision_details = {"error": f"Collision check non-fatal error: {str(e)}"}

    req = GrievanceRequest(
        id=request_id or str(uuid.uuid4()),
        personnel_id=personnel.id,
        request_type=request_type,
        category=category,
        description=description,
        start_date=start_date,
        end_date=end_date,
        filing_channel=filing_channel,
        is_fast_lane=is_fast_lane,
        status=initial_status,
        filed_at=now,
        sla_deadline_hours=sla_hours,
        sla_deadline=deadline,
        sla_breached=False,
        escalation_level=0,
        escalation_history=[{
            "event": "filed",
            "tier": ESCALATION_TIERS[0],
            "sla_hours": sla_hours,
            "timestamp": now.isoformat()
        }],
        collision_status=collision_status,
        collision_details=collision_details,
        suggested_replacement_id=suggested_replacement_id
    )

    db.add(req)
    db.commit()
    db.refresh(req)

    # Chained Audit Log
    try:
        log_audit(
            db=db,
            user=user_id or personnel.service_number or "system",
            action="POST",
            resource_type="grievance_request",
            resource_id=req.id,
            endpoint="/api/grievance/file",
            ip_address="internal",
            details={
                "event": "grievance_filed",
                "request_id": req.id,
                "personnel_id": personnel.id,
                "category": category,
                "is_fast_lane": is_fast_lane,
                "sla_hours": sla_hours,
                "collision_status": collision_status
            }
        )
    except Exception as e:
        logger.warning(f"[Audit Log Warning] Failed to log grievance filing: {e}")

    return req


def get_sla_countdown_info(db: Session, request_id: str) -> Dict[str, Any]:
    req = db.query(GrievanceRequest).filter(GrievanceRequest.id == request_id).first()
    if not req:
        raise ValueError("Grievance request not found")

    now = datetime.now(timezone.utc)
    deadline = to_utc(req.sla_deadline)
    diff = deadline - now
    total_seconds = diff.total_seconds()

    hours_rem = round(total_seconds / 3600.0, 1)
    mins_rem = int(total_seconds // 60)
    is_expired = total_seconds <= 0

    tier = ESCALATION_TIERS.get(req.escalation_level, "Commandant (Commanding Officer)")

    if is_expired:
        summary = f"SLA Breached ({abs(hours_rem)}h overdue). Auto-escalated to {tier}."
    else:
        summary = f"SLA Active: {hours_rem} hours remaining before auto-escalation to {tier}."

    return {
        "request_id": req.id,
        "category": req.category,
        "is_fast_lane": req.is_fast_lane,
        "status": req.status,
        "hours_remaining": max(0.0, hours_rem),
        "minutes_remaining": max(0, mins_rem),
        "is_expired": is_expired,
        "sla_deadline": req.sla_deadline.isoformat(),
        "escalation_level": req.escalation_level,
        "current_escalation_tier": tier,
        "simple_summary": summary
    }


def auto_scan_and_escalate(db: Session) -> List[Dict[str, Any]]:
    """
    Scans all pending grievance/leave requests. If resolution deadline has passed,
    automatically escalates to the next command tier without requiring the soldier to re-petition.
    """
    now = datetime.now(timezone.utc)
    active_requests = db.query(GrievanceRequest).filter(
        GrievanceRequest.status.in_(["filed", "fast_tracked", "collision_checked", "escalated"]),
        GrievanceRequest.resolved_at.is_(None)
    ).all()

    escalated = []
    for r in active_requests:
        dl = to_utc(r.sla_deadline)
        if dl and dl <= now and r.escalation_level < 2:
            from_lvl = r.escalation_level
            to_lvl = from_lvl + 1
            r.sla_breached = True
            r.escalation_level = to_lvl
            r.status = "escalated"
            r.escalated_at = now
            r.escalation_reason = f"SLA resolution timer expired at {ESCALATION_TIERS.get(from_lvl)}"

            hist = list(r.escalation_history or [])
            hist.append({
                "event": "auto_escalated",
                "from_tier": ESCALATION_TIERS.get(from_lvl),
                "to_tier": ESCALATION_TIERS.get(to_lvl),
                "reason": r.escalation_reason,
                "timestamp": now.isoformat()
            })
            r.escalation_history = hist

            escalated.append({
                "request_id": r.id,
                "personnel_id": r.personnel_id,
                "from_tier": ESCALATION_TIERS.get(from_lvl),
                "to_tier": ESCALATION_TIERS.get(to_lvl),
                "category": r.category
            })

            # Audit logging
            try:
                log_audit(
                    db=db,
                    user="system_sla_worker",
                    action="PUT",
                    resource_type="grievance_request",
                    resource_id=r.id,
                    endpoint="/api/grievance/auto-escalate",
                    ip_address="internal",
                    details={
                        "event": "auto_escalated",
                        "request_id": r.id,
                        "from_level": from_lvl,
                        "to_level": to_lvl
                    }
                )
            except Exception as e:
                logger.warning(f"[Audit Warning] {e}")

    if escalated:
        db.commit()

    return escalated


def dual_approve_grievance(
    db: Session,
    request_id: str,
    user_id: str,
    user_role: str,
    role_to_sign: Optional[str] = None,
    single_sign: bool = False,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    req = db.query(GrievanceRequest).filter(GrievanceRequest.id == request_id).first()
    if not req:
        raise ValueError("Grievance request not found")

    now = datetime.now(timezone.utc)
    signing_role = role_to_sign or user_role

    if single_sign:
        raise ValueError("Single-user dual signing is prohibited; two distinct approvers are required.")
    if signing_role == "commander":
            if req.welfare_user_id == user_id:
                raise ValueError("The two approval signatures must be from distinct users.")
            req.commander_approved = True
            req.commander_approved_at = now
            req.commander_user_id = user_id
    elif signing_role == "welfare":
            if req.commander_user_id == user_id:
                raise ValueError("The two approval signatures must be from distinct users.")
            req.welfare_approved = True
            req.welfare_approved_at = now
            req.welfare_user_id = user_id
    elif user_role == "admin":
            raise ValueError("Admins must explicitly sign one approval role; two distinct approvers are required.")
    else:
        raise ValueError(f"Role '{user_role}' is not authorized to sign off grievances.")

    both_approved = bool(req.commander_approved and req.welfare_approved)

    if both_approved:
        req.status = "approved"
        req.resolved_at = now
        req.resolution_notes = notes or "Dual-signature authorization complete."
        filed_time = to_utc(req.filed_at) or now
        req.time_to_resolution_hours = max(0, int((now - filed_time).total_seconds() / 3600.0))

        # Record official LeaveRecord if date bounds provided
        if req.start_date:
            try:
                s_d = datetime.strptime(req.start_date, "%Y-%m-%d").date()
                e_d = datetime.strptime(req.end_date or req.start_date, "%Y-%m-%d").date()
                leave_row = LeaveRecord(
                    personnel_id=req.personnel_id,
                    leave_type=req.category,
                    applied_date=filed_time.date(),
                    start_date=s_d,
                    end_date=e_d,
                    status="approved"
                )
                db.add(leave_row)
            except Exception as e:
                logger.warning(f"[LeaveRecord Warning] {e}")

        # If replacement assigned, swap duties on start_date
        if req.suggested_replacement_id and req.start_date:
            try:
                target_d = datetime.strptime(req.start_date, "%Y-%m-%d").date()
                roster_a = db.query(DutyRoster).filter(
                    DutyRoster.personnel_id == req.personnel_id,
                    DutyRoster.date == target_d
                ).first()
                if roster_a:
                    roster_a.duty_type = "welfare_leave"
                    roster_a.shift_type = "off"
                    roster_a.hours = 0
            except Exception as e:
                logger.warning(f"[Duty Swap Warning] {e}")

        msg = "Dual-approval complete. Leave/Grievance resolved and roster updated."
    else:
        missing = "Welfare Officer" if not req.welfare_approved else "Company Commander"
        msg = f"Signature recorded. Pending {missing} co-signature."

    db.commit()
    db.refresh(req)

    return {
        "message": msg,
        "status": req.status,
        "both_approved": both_approved,
        "commander_approved": bool(req.commander_approved),
        "welfare_approved": bool(req.welfare_approved),
        "resolved_at": req.resolved_at.isoformat() if req.resolved_at else None,
        "time_to_resolution_hours": req.time_to_resolution_hours
    }


def reject_grievance(
    db: Session,
    request_id: str,
    user_id: str,
    user_role: str,
    reason: str = "Operational mission constraints"
) -> Dict[str, Any]:
    req = db.query(GrievanceRequest).filter(GrievanceRequest.id == request_id).first()
    if not req:
        raise ValueError("Grievance request not found")

    now = datetime.now(timezone.utc)
    req.status = "rejected"
    req.rejection_reason = reason
    req.resolved_at = now
    req.cost_of_inaction_active = True
    filed_time = to_utc(req.filed_at) or now
    req.time_to_resolution_hours = max(0, int((now - filed_time).total_seconds() / 3600.0))

    # Record official LeaveRecord denial so existing Risk & SSAI attribution engines see it!
    try:
        s_d = datetime.strptime(req.start_date, "%Y-%m-%d").date() if req.start_date else now.date()
        e_d = datetime.strptime(req.end_date, "%Y-%m-%d").date() if req.end_date else s_d
        leave_row = LeaveRecord(
            personnel_id=req.personnel_id,
            leave_type=req.category,
            applied_date=filed_time.date(),
            start_date=s_d,
            end_date=e_d,
            status="denied",
            denial_reason=reason
        )
        db.add(leave_row)
    except Exception as e:
        logger.warning(f"[Leave Denial Warning] {e}")

    # Audit logging with Cost of Inaction activation flag
    try:
        log_audit(
            db=db,
            user=user_id,
            action="PUT",
            resource_type="grievance_request",
            resource_id=req.id,
            endpoint=f"/api/grievance/{req.id}/reject",
            ip_address="internal",
            details={
                "event": "grievance_rejected",
                "request_id": req.id,
                "personnel_id": req.personnel_id,
                "declined_by_role": user_role,
                "reason": reason,
                "cost_of_inaction_tracking": True
            }
        )
    except Exception as e:
        logger.warning(f"[Audit Warning] {e}")

    db.commit()
    db.refresh(req)

    return {
        "message": "Leave/Grievance declined. Outcome logged and longitudinal Cost of Inaction monitoring activated.",
        "status": "rejected",
        "request_id": req.id,
        "rejection_reason": reason,
        "cost_of_inaction_active": True,
        "resolved_at": req.resolved_at.isoformat() if req.resolved_at else None
    }


def compute_resolution_bottlenecks(db: Session, unit_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Section 12: Resolution Bottleneck Detection.
    Aggregates welfare resolution performance across companies and approval tiers:
    - Calculates per-company '% within SLA' (e.g., Company Alpha: 92%, Bravo: 64%, Charlie: 41%)
    - Identifies repeated bottleneck approval tiers (Company vs Battalion Welfare vs Commandant)
    - Groups frequent request categories with breach rates
    - Identifies systemic administrative friction without singling out individuals.
    """
    units = db.query(Unit).all()
    if unit_id:
        units = [u for u in units if u.id == unit_id]

    unit_league = []
    overall_total = 0
    overall_resolved = 0
    overall_breached = 0

    category_counts: Dict[str, Dict[str, int]] = {}
    tier_delays = {0: 0, 1: 0, 2: 0}

    for u in units:
        p_ids = [p.id for p in db.query(Personnel.id).filter(Personnel.unit_id == u.id).all()]
        if not p_ids:
            continue

        grievances = db.query(GrievanceRequest).filter(GrievanceRequest.personnel_id.in_(p_ids)).all()
        tot = len(grievances)
        if tot == 0:
            continue

        resolved = sum(1 for g in grievances if g.status in ("resolved", "approved"))
        breached = sum(1 for g in grievances if g.sla_breached)
        within_sla = tot - breached
        sla_pct = round((within_sla / tot) * 100, 1) if tot > 0 else 100.0

        durations = [g.time_to_resolution_hours for g in grievances if g.time_to_resolution_hours is not None]
        avg_hrs = round(sum(durations) / len(durations), 1) if durations else 24.0

        for g in grievances:
            cat = g.category or "general"
            if cat not in category_counts:
                category_counts[cat] = {"total": 0, "breached": 0}
            category_counts[cat]["total"] += 1
            if g.sla_breached:
                category_counts[cat]["breached"] += 1

            if g.sla_breached or g.status in ("escalated", "pending", "filed"):
                tier = g.escalation_level if g.escalation_level in tier_delays else 0
                tier_delays[tier] += 1

        overall_total += tot
        overall_resolved += resolved
        overall_breached += breached

        status_tag = "OPTIMAL" if sla_pct >= 85.0 else ("FRICTION_MONITORED" if sla_pct >= 60.0 else "BOTTLENECK_ALERT")
        unit_league.append({
            "unit_id": u.id,
            "unit_name": u.name,
            "operational_area": u.operational_area,
            "total_requests": tot,
            "resolved_requests": resolved,
            "pending_requests": tot - resolved,
            "sla_breached_count": breached,
            "within_sla_percentage": sla_pct,
            "avg_resolution_hours": avg_hrs,
            "bottleneck_status": status_tag
        })

    unit_league.sort(key=lambda x: x["within_sla_percentage"], reverse=True)

    tier_labels = {
        0: "Company Commander / Platoon Havildar (Local Level)",
        1: "Battalion Welfare Officer / 2IC (Triage Level)",
        2: "Commandant / HQ Approval (Command Tier)"
    }
    highest_delay_tier = max(tier_delays, key=tier_delays.get) if tier_delays else 0
    repeated_bottleneck_tier = tier_labels.get(highest_delay_tier, "Company-Level Triage")

    frequent_categories = []
    for cat, data in sorted(category_counts.items(), key=lambda x: x[1]["total"], reverse=True)[:5]:
        cat_pct = round(((data["total"] - data["breached"]) / data["total"]) * 100, 1) if data["total"] > 0 else 100.0
        frequent_categories.append({
            "category": cat.replace("_", " ").title(),
            "total_count": data["total"],
            "breached_count": data["breached"],
            "compliance_rate": cat_pct
        })

    force_sla_pct = round(((overall_total - overall_breached) / overall_total) * 100, 1) if overall_total > 0 else 100.0

    return {
        "force_within_sla_percentage": force_sla_pct,
        "total_requests_audited": overall_total,
        "total_resolved": overall_resolved,
        "total_breached": overall_breached,
        "company_league_table": unit_league,
        "repeated_bottleneck_tier": repeated_bottleneck_tier,
        "tier_delay_distribution": {
            tier_labels[k]: v for k, v in tier_delays.items()
        },
        "frequent_request_types": frequent_categories,
        "systemic_friction_insight": (
            f"Overall force resolution rate is {force_sla_pct}% within SLA. "
            f"Primary administrative bottleneck occurs at '{repeated_bottleneck_tier}'. "
            f"Units with lowest compliance require streamlined delegation protocols."
        )
    }

