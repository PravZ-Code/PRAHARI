import uuid
from datetime import datetime, date, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.personnel import Personnel, Unit
from models.duty_roster import DutyRoster
from models.prediction import RiskPrediction
from models.uro import URORun
from models.audit import AuditLog
from middleware.audit import log_audit
from ml.uro_optimizer import optimize_roster

def run_uro_optimization(
    db: Session,
    unit_id: str,
    user_id: str,
    date_start_str: str,
    date_end_str: str,
    max_swaps: int = 10,
    protect_minimum_manning: bool = True
) -> URORun:
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise ValueError(f"Unit {unit_id} not found")

    # Fetch personnel
    personnel_rows = db.query(Personnel).filter(Personnel.unit_id == unit_id).all()
    p_ids = [p.id for p in personnel_rows]

    # Batch fetch latest predictions in one query
    pred_map = {}
    if p_ids:
        subq = db.query(
            RiskPrediction.personnel_id,
            func.max(RiskPrediction.predicted_at).label("max_pred_at")
        ).filter(RiskPrediction.personnel_id.in_(p_ids)).group_by(RiskPrediction.personnel_id).subquery()

        preds = db.query(RiskPrediction).join(
            subq,
            (RiskPrediction.personnel_id == subq.c.personnel_id) &
            (RiskPrediction.predicted_at == subq.c.max_pred_at)
        ).all()
        pred_map = {r.personnel_id: r for r in preds}

    # Build personnel risk profiles with MOS Trade
    p_profiles = []
    for p in personnel_rows:
        latest_pred = pred_map.get(p.id)
        risk_score = float(latest_pred.risk_score) if latest_pred and latest_pred.risk_score is not None else 0.25
        risk_level = latest_pred.risk_level if latest_pred else "green"

        p_profiles.append({
            "id": p.id,
            "name": p.name,
            "rank": p.rank,
            "trade": getattr(p, "trade", "GD") or "GD",
            "risk_score": risk_score,
            "risk_level": risk_level
        })

    # Fetch duty rosters
    start_d = date.fromisoformat(date_start_str)
    end_d = date.fromisoformat(date_end_str)

    roster_rows = db.query(DutyRoster).filter(
        DutyRoster.unit_id == unit_id,
        DutyRoster.date >= start_d,
        DutyRoster.date <= end_d
    ).all()

    roster_dicts = [
        {
            "id": r.id,
            "personnel_id": r.personnel_id,
            "date": str(r.date),
            "shift_type": r.shift_type,
            "duty_type": r.duty_type,
            "hours": float(r.hours)
        }
        for r in roster_rows
    ]

    # Execute optimization algorithm with trade matching, 8h rest barrier, fairness cap
    opt_result = optimize_roster(
        personnel_list=p_profiles,
        roster_entries=roster_dicts,
        max_swaps=max_swaps,
        protect_minimum_manning=protect_minimum_manning
    )

    uro_run = URORun(
        unit_id=unit_id,
        run_by=user_id,
        roster_date_start=date_start_str,
        roster_date_end=date_end_str,
        before_risk_summary=opt_result["before"],
        after_risk_summary=opt_result["after"],
        swaps_proposed=len(opt_result["swaps"]),
        swaps=opt_result["swaps"],
        risk_reduction_pct=opt_result["risk_reduction_pct"],
        status="proposed",
        commander_approved=False,
        welfare_approved=False,
        roster_committed=False
    )

    db.add(uro_run)
    db.commit()
    db.refresh(uro_run)
    return uro_run

def commit_uro_swaps(db: Session, uro_run: URORun, committed_by_user_id: Optional[str] = None) -> bool:
    """
    Live database commit of approved URO swaps to DutyRoster.
    Updates the shift_type, duty_type, and hours for personnel in prahari.db.
    """
    if uro_run.roster_committed:
        return True

    swaps = uro_run.swaps or []
    for swap in swaps:
        person_a = swap.get("person_a", {})
        person_b = swap.get("person_b", {})
        swap_date_str = swap.get("date")
        if not swap_date_str:
            continue

        swap_date = date.fromisoformat(swap_date_str[:10])

        # New shift assignment for Person A
        new_shift_a = person_a.get("new_shift_type") or person_b.get("original_shift_type")
        new_duty_a = person_a.get("new_duty_type") or person_b.get("original_duty_type")
        new_hours_a = person_a.get("new_hours")
        if new_hours_a is None:
            new_hours_a = 0.0 if new_shift_a == "off" else (10.0 if new_shift_a == "night" else (12.0 if new_shift_a == "split" else 8.0))

        # New shift assignment for Person B
        new_shift_b = person_b.get("new_shift_type") or person_a.get("original_shift_type")
        new_duty_b = person_b.get("new_duty_type") or person_a.get("original_duty_type")
        new_hours_b = person_b.get("new_hours")
        if new_hours_b is None:
            new_hours_b = 0.0 if new_shift_b == "off" else (10.0 if new_shift_b == "night" else (12.0 if new_shift_b == "split" else 8.0))

        # Update or create DutyRoster record for Person A
        roster_a = None
        if swap.get("roster_id_a"):
            roster_a = db.query(DutyRoster).filter(DutyRoster.id == swap.get("roster_id_a")).first()
        if not roster_a and person_a.get("id"):
            roster_a = db.query(DutyRoster).filter(
                DutyRoster.personnel_id == person_a["id"],
                DutyRoster.date == swap_date
            ).first()

        if roster_a:
            roster_a.shift_type = new_shift_a
            roster_a.duty_type = new_duty_a
            roster_a.hours = new_hours_a
        elif person_a.get("id"):
            roster_a = DutyRoster(
                personnel_id=person_a["id"],
                unit_id=uro_run.unit_id,
                date=swap_date,
                shift_type=new_shift_a,
                duty_type=new_duty_a,
                hours=new_hours_a
            )
            db.add(roster_a)

        # Update or create DutyRoster record for Person B
        roster_b = None
        if swap.get("roster_id_b"):
            roster_b = db.query(DutyRoster).filter(DutyRoster.id == swap.get("roster_id_b")).first()
        if not roster_b and person_b.get("id"):
            roster_b = db.query(DutyRoster).filter(
                DutyRoster.personnel_id == person_b["id"],
                DutyRoster.date == swap_date
            ).first()

        if roster_b:
            roster_b.shift_type = new_shift_b
            roster_b.duty_type = new_duty_b
            roster_b.hours = new_hours_b
        elif person_b.get("id"):
            roster_b = DutyRoster(
                personnel_id=person_b["id"],
                unit_id=uro_run.unit_id,
                date=swap_date,
                shift_type=new_shift_b,
                duty_type=new_duty_b,
                hours=new_hours_b
            )
            db.add(roster_b)

    uro_run.roster_committed = True
    uro_run.status = "approved"

    # Write chained audit log entry
    try:
        log_audit(
            db=db,
            user=committed_by_user_id or uro_run.run_by or "system",
            action="PUT",
            resource_type="duty_roster",
            resource_id=uro_run.id,
            endpoint=f"/api/uro/result/{uro_run.id}/approve",
            ip_address="internal",
            details={
                "event": "uro_roster_swaps_committed",
                "run_id": uro_run.id,
                "swaps_count": len(swaps),
                "unit_id": uro_run.unit_id
            }
        )
    except Exception as e:
        print(f"[Audit Log Warning] Failed to log URO commit audit: {e}")

    db.commit()
    return True

def approve_uro_run(
    db: Session,
    run_id: str,
    user_id: str,
    user_role: str,
    as_role: Optional[str] = None,
    single_sign: bool = False
) -> Dict[str, Any]:
    """
    Dual-signature authorization flow for URO optimization results.
    - Records Commander sign-off
    - Records Welfare Officer sign-off
    - Executes live database commit when both co-sign (or when single_sign=True)
    """
    run = db.query(URORun).filter(URORun.id == run_id).first()
    if not run:
        raise ValueError("URO run not found")

    now = datetime.now(timezone.utc)

    if single_sign:
        # Demo or forced single-sign override: co-sign both roles immediately
        run.commander_approved = True
        run.commander_approved_at = now
        run.commander_user_id = user_id
        run.welfare_approved = True
        run.welfare_approved_at = now
        run.welfare_user_id = user_id
    else:
        role_to_sign = as_role or user_role
        if role_to_sign == "commander":
            run.commander_approved = True
            run.commander_approved_at = now
            run.commander_user_id = user_id
        elif role_to_sign == "welfare":
            run.welfare_approved = True
            run.welfare_approved_at = now
            run.welfare_user_id = user_id
        elif user_role == "admin":
            # Admin signs missing signatures
            if not run.commander_approved and not run.welfare_approved:
                # Default admin signs both
                run.commander_approved = True
                run.commander_approved_at = now
                run.commander_user_id = user_id
                run.welfare_approved = True
                run.welfare_approved_at = now
                run.welfare_user_id = user_id
            elif not run.commander_approved:
                run.commander_approved = True
                run.commander_approved_at = now
                run.commander_user_id = user_id
            elif not run.welfare_approved:
                run.welfare_approved = True
                run.welfare_approved_at = now
                run.welfare_user_id = user_id
        else:
            raise ValueError(f"Role '{user_role}' is not authorized to sign off URO runs.")

    # Check if dual authorization is satisfied
    both_approved = bool(run.commander_approved and run.welfare_approved)

    if both_approved:
        run.status = "approved"
        if not run.roster_committed:
            commit_uro_swaps(db, run, committed_by_user_id=user_id)
        message = "Dual-signature authorization complete. Roster swaps committed to live database."
    else:
        run.status = "partially_approved"
        missing = "Welfare Officer" if not run.welfare_approved else "Commander"
        message = f"Signature recorded. Pending {missing} co-signature."

    db.commit()
    db.refresh(run)

    return {
        "message": message,
        "status": run.status,
        "commander_approved": bool(run.commander_approved),
        "commander_approved_at": run.commander_approved_at.isoformat() if run.commander_approved_at else None,
        "commander_user_id": run.commander_user_id,
        "welfare_approved": bool(run.welfare_approved),
        "welfare_approved_at": run.welfare_approved_at.isoformat() if run.welfare_approved_at else None,
        "welfare_user_id": run.welfare_user_id,
        "roster_committed": bool(run.roster_committed),
        "both_approved": both_approved
    }


def reject_uro_run(
    db: Session,
    run_id: str,
    user_id: str,
    user_role: str,
    reason: str = "Operational constraints"
) -> Dict[str, Any]:
    """
    Register an officer decline/rejection of a proposed URO roster intervention.
    Activates longitudinal Cost of Inaction tracking on the affected troopers.
    """
    run = db.query(URORun).filter(URORun.id == run_id).first()
    if not run:
        raise ValueError("URO run not found")

    if run.roster_committed:
        raise ValueError("Cannot reject an already committed roster optimization.")

    now = datetime.now(timezone.utc)
    run.status = "rejected"
    run.declined_by_role = user_role
    run.declined_at = now
    run.declined_user_id = user_id
    run.decline_reason = reason

    # Chained audit log entry
    try:
        log_audit(
            db=db,
            user=user_id,
            action="PUT",
            resource_type="uro_run",
            resource_id=run.id,
            endpoint=f"/api/uro/result/{run.id}/reject",
            ip_address="internal",
            details={
                "event": "uro_run_rejected",
                "run_id": run.id,
                "unit_id": run.unit_id,
                "declined_by_role": user_role,
                "reason": reason,
                "cost_of_inaction_tracking": True
            }
        )
    except Exception as e:
        print(f"[Audit Log Warning] Failed to log URO rejection: {e}")

    db.commit()
    db.refresh(run)

    return {
        "message": "Optimization proposal rejected. Historical cost-of-inaction tracking activated.",
        "status": "rejected",
        "run_id": run.id,
        "declined_by_role": user_role,
        "declined_at": run.declined_at.isoformat() if run.declined_at else None,
        "decline_reason": reason,
        "cost_of_inaction_tracking_active": True
    }


def get_cost_of_inaction_context(db: Session, unit_id: str) -> Dict[str, Any]:
    """
    Evaluates historical longitudinal trajectories for personnel whose proposed
    interventions were previously declined at this unit.
    Provides non-punitive, objective operational context for decision-makers.
    """
    rejected_runs = db.query(URORun).filter(
        URORun.unit_id == unit_id,
        URORun.status == "rejected"
    ).order_by(URORun.run_at.desc()).all()

    if not rejected_runs:
        return {
            "total_rejected_runs": 0,
            "monitored_personnel_count": 0,
            "escalations_count": 0,
            "average_risk_delta": 0.0,
            "historical_observation": None,
            "tracked_trajectories": []
        }

    seen_personnel = set()
    trajectories = []

    for run in rejected_runs:
        swaps = run.swaps or []
        run_timestamp = run.run_at
        if run_timestamp and run_timestamp.tzinfo is None:
            run_timestamp = run_timestamp.replace(tzinfo=timezone.utc)

        for swap in swaps:
            person_a = swap.get("person_a") or {}
            p_id = person_a.get("id")
            if not p_id or p_id in seen_personnel:
                continue
            seen_personnel.add(p_id)

            p_name = person_a.get("name", "Unknown Trooper")
            initial_score = float(person_a.get("current_risk_score", 0.0))

            # Query initial prediction if not in payload
            if initial_score == 0.0:
                base_pred = db.query(RiskPrediction).filter(
                    RiskPrediction.personnel_id == p_id
                ).order_by(RiskPrediction.predicted_at.asc()).first()
                if base_pred:
                    initial_score = float(base_pred.risk_score)

            # Query subsequent predictions after the rejection
            subsequent_preds = db.query(RiskPrediction).filter(
                RiskPrediction.personnel_id == p_id,
                RiskPrediction.predicted_at >= (run.run_at or datetime.min)
            ).order_by(RiskPrediction.predicted_at.asc()).all()

            if subsequent_preds:
                latest_pred = subsequent_preds[-1]
                latest_score = float(latest_pred.risk_score)
                delta = round(latest_score - initial_score, 4)
                pred_time = latest_pred.predicted_at
                if pred_time and pred_time.tzinfo is None:
                    pred_time = pred_time.replace(tzinfo=timezone.utc)
                days_monitored = max(1, (pred_time - run_timestamp).days) if run_timestamp and pred_time else 1
                escalated_to_red = any(p.risk_level == "red" for p in subsequent_preds)
                trend = "escalated" if delta >= 0.05 else ("stable_strain" if delta >= -0.05 else "improved")
            else:
                latest_score = initial_score
                delta = 0.0
                days_monitored = 0
                escalated_to_red = False
                trend = "monitoring_active"

            trajectories.append({
                "personnel_id": p_id,
                "name": p_name,
                "declined_at": run.declined_at.isoformat() if run.declined_at else (run.run_at.isoformat() if run.run_at else None),
                "decline_reason": run.decline_reason or "Operational constraints",
                "days_monitored": days_monitored,
                "initial_risk_score": round(initial_score, 4),
                "latest_risk_score": round(latest_score, 4),
                "risk_delta": delta,
                "trend": trend,
                "escalated_to_red": escalated_to_red
            })

    total_monitored = len(trajectories)
    escalations = sum(1 for t in trajectories if t["escalated_to_red"] or t["trend"] == "escalated")
    avg_delta = round(sum(t["risk_delta"] for t in trajectories) / total_monitored, 4) if total_monitored > 0 else 0.0
    avg_days = int(sum(t["days_monitored"] for t in trajectories) / total_monitored) if total_monitored > 0 else 0

    if escalations > 0:
        observation = (
            f"Historical Inaction Record: In prior declined intervention(s) at this unit, personnel risk scores "
            f"increased by an average of {avg_delta * 100:+.1f} points across {avg_days} days, with {escalations} "
            f"case escalation(s) recorded."
        )
    elif total_monitored > 0:
        observation = (
            f"Historical Inaction Record: {len(rejected_runs)} prior intervention(s) declined at this unit; "
            f"average subsequent risk score delta was {avg_delta * 100:+.1f} points across {avg_days} days."
        )
    else:
        observation = (
            f"Historical Inaction Record: {len(rejected_runs)} prior intervention proposal(s) were declined; "
            f"longitudinal monitoring remains active."
        )

    return {
        "total_rejected_runs": len(rejected_runs),
        "monitored_personnel_count": total_monitored,
        "escalations_count": escalations,
        "average_risk_delta": avg_delta,
        "historical_observation": observation,
        "tracked_trajectories": trajectories
    }


