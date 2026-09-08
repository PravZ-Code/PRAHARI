"""
Welfare Resilience Service — Plain English Welfare & Safety Engine for Government Uniformed Services.

Features implemented:
1. Welfare Reserve: Shows whether a unit has enough people available to handle future welfare needs.
2. Welfare Cascade Detection: Checks whether helping one person could create stress for another person.
3. Intervention Collision Check: Before changing a duty, PRAHARI checks its effect on the whole team.
4. What-If Duty Test: Shows what may happen if a person's duty is changed.
5. Recovery Tracking: Checks whether the person actually improves after help is given.
6. Whole-Team Safety: Finds solutions that protect the person without putting extra pressure on others.
"""

from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional
import math
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.personnel import Personnel, Unit
from models.duty_roster import DutyRoster
from models.leave import LeaveRecord
from models.prediction import RiskPrediction
from models.welfare_case import WelfareCase
from models.assessment import SelfAssessment
from models.buddy_signal import BuddySignal


# -----------------------------------------------------------------------------
# 1. WELFARE RESERVE
# Shows whether a unit has enough people available to handle future welfare needs.
# -----------------------------------------------------------------------------
def compute_welfare_reserve(db: Session, unit_id: str) -> Dict[str, Any]:
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise ValueError(f"Unit {unit_id} not found")

    personnel_list = db.query(Personnel).filter(
        Personnel.unit_id == unit_id
    ).all()

    total_strength = len(personnel_list)
    if total_strength == 0:
        return {
            "unit_id": unit_id,
            "unit_name": unit.name,
            "total_strength": 0,
            "reserve_count": 0,
            "reserve_percentage": 0.0,
            "status": "CRITICAL_SHORTAGE",
            "simple_verdict": "No active personnel found in this unit."
        }

    # Minimum security guard posts required for this unit (typically 65% of strength)
    min_operational_requirement = max(1, int(total_strength * 0.65))

    # Check who has green/low stress and is not on consecutive night duty
    now = datetime.now()
    cutoff_7d = now.date() - timedelta(days=7)

    ready_reserve_troops = []
    strained_troops = []

    for p in personnel_list:
        latest_pred = db.query(RiskPrediction).filter(
            RiskPrediction.personnel_id == p.id
        ).order_by(RiskPrediction.predicted_at.desc()).first()

        score = float(latest_pred.risk_score) if latest_pred else 0.25
        level = latest_pred.risk_level if latest_pred else "green"

        # Check recent night duties in last 7 days
        recent_nights = db.query(func.count(DutyRoster.id)).filter(
            DutyRoster.personnel_id == p.id,
            DutyRoster.date >= cutoff_7d,
            DutyRoster.shift_type == "night"
        ).scalar() or 0

        # A soldier is "Ready Reserve" if they are low/medium stress and have <= 2 night shifts
        if score < 0.45 and recent_nights <= 2:
            ready_reserve_troops.append({
                "id": p.id,
                "name": p.name,
                "rank": p.rank,
                "trade": p.trade,
                "stress_score": score,
                "recent_nights": recent_nights
            })
        else:
            strained_troops.append(p.id)

    available_reserves = len(ready_reserve_troops)
    effective_surplus = max(0, total_strength - min_operational_requirement)
    safe_leaves_possible = min(available_reserves, effective_surplus)
    reserve_pct = round((available_reserves / total_strength) * 100, 1)

    if reserve_pct >= 30.0 and safe_leaves_possible >= 5:
        status = "HEALTHY_SURPLUS"
        simple_verdict = f"Good reserve. The unit has {available_reserves} well-rested personnel ({reserve_pct}%). Safe to grant emergency leave or duty swaps without affecting security posts."
    elif reserve_pct >= 15.0 and safe_leaves_possible >= 1:
        status = "ADEQUATE"
        simple_verdict = f"Moderate reserve. The unit has {available_reserves} available personnel ({reserve_pct}%). Can grant urgent welfare swaps, but monitor night duties closely."
    else:
        status = "CRITICAL_SHORTAGE"
        simple_verdict = f"Low reserve warning! Only {available_reserves} rested personnel available ({reserve_pct}%). Swapping duties without fresh replacement will put extra pressure on squadmates."

    return {
        "unit_id": unit_id,
        "unit_name": unit.name,
        "total_strength": total_strength,
        "min_security_requirement": min_operational_requirement,
        "available_rested_reserve": available_reserves,
        "reserve_percentage": reserve_pct,
        "safe_emergency_leaves_possible": safe_leaves_possible,
        "status": status,
        "simple_verdict": simple_verdict,
        "top_reserve_candidates": ready_reserve_troops[:5]
    }


# -----------------------------------------------------------------------------
# 2. WELFARE CASCADE DETECTION
# Checks whether helping one person could create stress for another person.
# -----------------------------------------------------------------------------
def check_welfare_cascade(
    db: Session,
    relieved_soldier_id: str,
    replacement_soldier_id: str,
    assigned_shift_type: str = "night"
) -> Dict[str, Any]:
    relieved = db.query(Personnel).filter(Personnel.id == relieved_soldier_id).first()
    replacement = db.query(Personnel).filter(Personnel.id == replacement_soldier_id).first()

    if not relieved:
        raise ValueError(f"Relieved soldier {relieved_soldier_id} not found")
    if not replacement:
        raise ValueError(f"Replacement soldier {replacement_soldier_id} not found")

    # Fetch replacement soldier's current stress and duty history
    latest_pred = db.query(RiskPrediction).filter(
        RiskPrediction.personnel_id == replacement_soldier_id
    ).order_by(RiskPrediction.predicted_at.desc()).first()

    curr_score = float(latest_pred.risk_score) if latest_pred else 0.30
    curr_level = latest_pred.risk_level if latest_pred else "green"

    # Check night shifts in last 14 days
    cutoff_14d = datetime.now().date() - timedelta(days=14)
    night_shifts_14d = db.query(func.count(DutyRoster.id)).filter(
        DutyRoster.personnel_id == replacement_soldier_id,
        DutyRoster.date >= cutoff_14d,
        DutyRoster.shift_type == "night"
    ).scalar() or 0

    # Calculate expected stress jump on replacement soldier
    added_stress = 0.0
    if assigned_shift_type == "night":
        # Extra night duty adds 0.08 to 0.18 stress depending on existing night burden
        added_stress = 0.10 + (0.02 * min(night_shifts_14d, 5))
    else:
        added_stress = 0.03

    projected_score = min(0.99, round(curr_score + added_stress, 2))

    if projected_score >= 0.70:
        projected_level = "red"
        cascade_risk = "DANGER"
        simple_verdict = (
            f"DANGER: Domino effect detected! Helping {relieved.rank} {relieved.name} by putting "
            f"{replacement.rank} {replacement.name} on extra {assigned_shift_type} duty will push "
            f"{replacement.name} into RED ({projected_score:.2f}). Pick another replacement soldier."
        )
    elif projected_score >= 0.50:
        projected_level = "orange"
        cascade_risk = "WARNING"
        simple_verdict = (
            f"CAUTION: Moderate cascade. {replacement.rank} {replacement.name}'s stress will increase "
            f"from {curr_score:.2f} to {projected_score:.2f} (Yellow/Orange). Keep shifts limited to 1 day."
        )
    else:
        projected_level = "green"
        cascade_risk = "SAFE"
        simple_verdict = (
            f"SAFE: No cascade. {replacement.rank} {replacement.name} is well-rested. "
            f"Their stress remains safely Green ({projected_score:.2f})."
        )

    return {
        "relieved_soldier": {
            "id": relieved.id,
            "name": relieved.name,
            "rank": relieved.rank,
            "trade": relieved.trade
        },
        "replacement_soldier": {
            "id": replacement.id,
            "name": replacement.name,
            "rank": replacement.rank,
            "trade": replacement.trade,
            "current_stress": curr_score,
            "current_level": curr_level,
            "recent_night_shifts": night_shifts_14d,
            "projected_stress": projected_score,
            "projected_level": projected_level
        },
        "cascade_risk": cascade_risk,
        "is_safe": cascade_risk == "SAFE",
        "simple_verdict": simple_verdict
    }


# -----------------------------------------------------------------------------
# 3. INTERVENTION COLLISION CHECK
# Before changing a duty, PRAHARI checks its effect on the whole team.
# -----------------------------------------------------------------------------
def check_intervention_collision(
    db: Session,
    personnel_id: str,
    target_date: date,
    proposed_shift: str = "day",
    swap_with_id: Optional[str] = None
) -> Dict[str, Any]:
    soldier = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not soldier:
        raise ValueError("Soldier not found")

    collisions = []
    warnings = []

    # 1. Trade Compatibility Check
    if swap_with_id:
        peer = db.query(Personnel).filter(Personnel.id == swap_with_id).first()
        if not peer:
            raise ValueError("Swap partner not found")
        if soldier.trade != peer.trade:
            collisions.append(
                f"Trade Mismatch: {soldier.rank} {soldier.name} is a '{soldier.trade}' while "
                f"{peer.rank} {peer.name} is a '{peer.trade}'. Specialized duties cannot be swapped."
            )

    # 2. Existing Leave Collision
    active_leave = db.query(LeaveRecord).filter(
        LeaveRecord.personnel_id == (swap_with_id if swap_with_id else personnel_id),
        LeaveRecord.start_date <= target_date,
        LeaveRecord.end_date >= target_date,
        LeaveRecord.status.in_(["approved", "pending"])
    ).first()
    if active_leave:
        collisions.append(
            f"Leave Conflict: Target soldier already has a scheduled leave on {target_date}."
        )

    # 3. Rest Barrier Collision (8-hour continuous rest rule)
    prev_day = target_date - timedelta(days=1)
    next_day = target_date + timedelta(days=1)
    
    target_check_id = swap_with_id if swap_with_id else personnel_id
    nearby_duties = db.query(DutyRoster).filter(
        DutyRoster.personnel_id == target_check_id,
        DutyRoster.date.in_([prev_day, target_date, next_day])
    ).all()

    for d in nearby_duties:
        if d.date == prev_day and d.shift_type == "night" and proposed_shift == "day":
            collisions.append(
                f"Rest Barrier Violation: Soldier finishes night duty on {prev_day} morning and cannot "
                f"start day shift on {target_date} without 8 hours of continuous sleep."
            )
        elif d.date == target_date and d.shift_type == proposed_shift:
            warnings.append(
                f"Duplicate Duty: Soldier already assigned to {proposed_shift} duty on {target_date}."
            )

    # 4. Minimum Trade Coverage in Unit
    unit_trade_count = db.query(func.count(Personnel.id)).filter(
        Personnel.unit_id == soldier.unit_id,
        Personnel.trade == soldier.trade
    ).scalar() or 0

    if unit_trade_count <= 2:
        warnings.append(
            f"Low Trade Buffer: Unit only has {unit_trade_count} '{soldier.trade}' specialists. "
            f"Duty changes must ensure at least 1 specialist is always on watch."
        )

    has_hard_collision = len(collisions) > 0
    team_status = "BLOCKED" if has_hard_collision else ("APPROVED_WITH_WARNINGS" if warnings else "CLEAR")

    if team_status == "CLEAR":
        verdict = "All clear! This duty change has no conflicts and is safe for the whole team."
    elif team_status == "APPROVED_WITH_WARNINGS":
        verdict = f"Proceed with care. No hard blockers, but noted: {'; '.join(warnings)}"
    else:
        verdict = f"Action Blocked! {collisions[0]}"

    return {
        "personnel_id": soldier.id,
        "soldier_name": f"{soldier.rank} {soldier.name}",
        "target_date": str(target_date),
        "proposed_shift": proposed_shift,
        "team_status": team_status,
        "is_approved": not has_hard_collision,
        "hard_collisions": collisions,
        "operational_warnings": warnings,
        "simple_verdict": verdict
    }


# -----------------------------------------------------------------------------
# 4. WHAT-IF DUTY TEST
# Shows what may happen if a person's duty is changed.
# -----------------------------------------------------------------------------
def run_what_if_duty_test(
    db: Session,
    personnel_id: str,
    shift_change: str = "day",
    add_rest_days: int = 2,
    grant_leave_days: int = 0
) -> Dict[str, Any]:
    soldier = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not soldier:
        raise ValueError("Soldier not found")

    latest_pred = db.query(RiskPrediction).filter(
        RiskPrediction.personnel_id == personnel_id
    ).order_by(RiskPrediction.predicted_at.desc()).first()

    curr_score = float(latest_pred.risk_score) if latest_pred else 0.65
    curr_level = latest_pred.risk_level if latest_pred else "red"

    # Compute benefits of proposed changes
    relief_points = 0.0
    benefit_breakdown = []

    if shift_change == "day":
        relief_points += 0.15
        benefit_breakdown.append("Removing night shifts restores normal sleep cycle (-15% stress)")
    elif shift_change == "split":
        relief_points += 0.08
        benefit_breakdown.append("Changing to split shift provides intermittent rest (-8% stress)")

    if add_rest_days > 0:
        rest_gain = min(0.30, 0.09 * add_rest_days)
        relief_points += rest_gain
        benefit_breakdown.append(f"+{add_rest_days} days of mandatory rest reduces sleep debt (-{int(rest_gain*100)}% stress)")

    if grant_leave_days > 0:
        leave_gain = min(0.35, 0.12 * min(grant_leave_days, 10))
        relief_points += leave_gain
        benefit_breakdown.append(f"+{grant_leave_days} days of home leave resolves family worry (-{int(leave_gain*100)}% stress)")

    projected_score = max(0.12, round(curr_score - relief_points, 2))
    
    if projected_score < 0.35:
        projected_level = "green"
    elif projected_score < 0.60:
        projected_level = "yellow"
    else:
        projected_level = "orange"

    improvement_pct = round(((curr_score - projected_score) / curr_score) * 100, 1)

    simple_verdict = (
        f"If this change is made, {soldier.rank} {soldier.name}'s stress score will drop from "
        f"{curr_score:.2f} ({curr_level.upper()}) to {projected_score:.2f} ({projected_level.upper()}) "
        f"— an improvement of {improvement_pct}%. This brings the soldier into a safe, sustainable state."
    )

    return {
        "soldier_name": f"{soldier.rank} {soldier.name}",
        "service_number": soldier.service_number,
        "current_score": curr_score,
        "current_level": curr_level.upper(),
        "projected_score": projected_score,
        "projected_level": projected_level.upper(),
        "stress_reduction_percentage": improvement_pct,
        "benefits": benefit_breakdown,
        "simple_verdict": simple_verdict
    }


# -----------------------------------------------------------------------------
# 5. RECOVERY TRACKING
# Checks whether the person actually improves after help is given.
# -----------------------------------------------------------------------------
def track_personnel_recovery(db: Session, personnel_id: str) -> Dict[str, Any]:
    soldier = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not soldier:
        raise ValueError("Soldier not found")

    # Find welfare cases for this soldier
    welfare_cases = db.query(WelfareCase).filter(
        WelfareCase.personnel_id == personnel_id
    ).order_by(WelfareCase.created_at.asc()).all()

    # Find longitudinal self assessments
    assessments = db.query(SelfAssessment).filter(
        SelfAssessment.personnel_id == personnel_id
    ).order_by(SelfAssessment.assessed_at.asc()).all()

    # Find predictions history
    predictions = db.query(RiskPrediction).filter(
        RiskPrediction.personnel_id == personnel_id
    ).order_by(RiskPrediction.predicted_at.asc()).all()

    if not predictions:
        return {
            "soldier_name": f"{soldier.rank} {soldier.name}",
            "status": "NO_HISTORY",
            "simple_verdict": "No historical stress checks found for this soldier yet."
        }

    first_pred = predictions[0]
    latest_pred = predictions[-1]

    initial_score = float(first_pred.risk_score)
    latest_score = float(latest_pred.risk_score)
    delta = round(initial_score - latest_score, 2)

    # Recovery percentage
    if initial_score > 0:
        recovery_pct = round((delta / initial_score) * 100, 1)
    else:
        recovery_pct = 0.0

    timeline = []
    for pr in predictions[-5:]:
        timeline.append({
            "date": pr.predicted_at.strftime("%Y-%m-%d"),
            "score": float(pr.risk_score),
            "level": pr.risk_level.upper()
        })

    active_cases = [c for c in welfare_cases if c.status in ["acknowledged", "plan_created", "intervention_active"]]
    resolved_cases = [c for c in welfare_cases if c.status == "resolved"]

    if delta >= 0.20 or recovery_pct >= 25.0:
        status = "RECOVERING_WELL"
        simple_verdict = (
            f"GREAT PROGRESS: {soldier.rank} {soldier.name} is recovering well! Stress has dropped from "
            f"{initial_score:.2f} to {latest_score:.2f} ({recovery_pct}% recovery). The duty adjustment or leave was effective."
        )
    elif delta >= 0.05:
        status = "STABLE"
        simple_verdict = (
            f"STABLE: {soldier.rank} {soldier.name} is steady ({latest_score:.2f}). Continue monitoring for another 7 days."
        )
    else:
        status = "NEEDS_FOLLOW_UP"
        simple_verdict = (
            f"ATTENTION NEEDED: {soldier.rank} {soldier.name}'s stress remains elevated at {latest_score:.2f}. "
            f"Previous action did not fully resolve the problem. Welfare Officer should schedule a follow-up talk."
        )

    return {
        "soldier_id": soldier.id,
        "soldier_name": f"{soldier.rank} {soldier.name}",
        "initial_score": initial_score,
        "latest_score": latest_score,
        "recovery_percentage": recovery_pct,
        "status": status,
        "active_interventions_count": len(active_cases),
        "resolved_interventions_count": len(resolved_cases),
        "recent_progress_timeline": timeline,
        "simple_verdict": simple_verdict
    }


# -----------------------------------------------------------------------------
# 6. WHOLE-TEAM SAFETY
# Finds solutions that protect the person without putting extra pressure on others.
# -----------------------------------------------------------------------------
def find_whole_team_safe_solution(
    db: Session,
    stressed_soldier_id: str,
    target_date: date
) -> Dict[str, Any]:
    soldier = db.query(Personnel).filter(Personnel.id == stressed_soldier_id).first()
    if not soldier:
        raise ValueError("Stressed soldier not found")

    unit_id = soldier.unit_id

    # 1. Find all eligible peers in same unit with matching trade
    peers = db.query(Personnel).filter(
        Personnel.unit_id == unit_id,
        Personnel.trade == soldier.trade,
        Personnel.id != stressed_soldier_id
    ).all()

    if not peers:
        return {
            "success": False,
            "simple_verdict": f"No squadmates with matching trade '{soldier.trade}' available in this company. Consider cross-company welfare relief."
        }

    candidate_evaluations = []
    cutoff_7d = datetime.now().date() - timedelta(days=7)

    for peer in peers:
        # Check current stress
        pred = db.query(RiskPrediction).filter(
            RiskPrediction.personnel_id == peer.id
        ).order_by(RiskPrediction.predicted_at.desc()).first()

        score = float(pred.risk_score) if pred else 0.25

        # Check recent nights
        nights = db.query(func.count(DutyRoster.id)).filter(
            DutyRoster.personnel_id == peer.id,
            DutyRoster.date >= cutoff_7d,
            DutyRoster.shift_type == "night"
        ).scalar() or 0

        # Check active leave
        has_leave = db.query(LeaveRecord).filter(
            LeaveRecord.personnel_id == peer.id,
            LeaveRecord.start_date <= target_date,
            LeaveRecord.end_date >= target_date
        ).first() is not None

        if has_leave:
            continue

        # Composite team-safety score: lower is safer
        # Must be well-rested (< 0.40 stress) and have few night shifts
        safety_penalty = score + (0.10 * nights)
        candidate_evaluations.append({
            "peer_id": peer.id,
            "peer_name": f"{peer.rank} {peer.name}",
            "stress_score": score,
            "recent_nights": nights,
            "safety_penalty": safety_penalty
        })

    if not candidate_evaluations:
        return {
            "success": False,
            "simple_verdict": "All eligible squadmates currently have scheduled leaves or high fatigue."
        }

    # Sort by safest candidate (lowest penalty)
    candidate_evaluations.sort(key=lambda x: x["safety_penalty"])
    best_candidate = candidate_evaluations[0]

    # Run collision check on the best candidate
    collision_res = check_intervention_collision(
        db=db,
        personnel_id=stressed_soldier_id,
        target_date=target_date,
        proposed_shift="night",
        swap_with_id=best_candidate["peer_id"]
    )

    return {
        "success": True,
        "stressed_soldier": f"{soldier.rank} {soldier.name}",
        "selected_safe_peer": best_candidate["peer_name"],
        "peer_current_stress": best_candidate["stress_score"],
        "peer_recent_night_shifts": best_candidate["recent_nights"],
        "is_safe_for_whole_team": collision_res["is_approved"],
        "collision_status": collision_res["team_status"],
        "simple_verdict": (
            f"SAFE TEAM SOLUTION FOUND: Swap {soldier.rank} {soldier.name} with {best_candidate['peer_name']}. "
            f"{best_candidate['peer_name']} has low fatigue ({best_candidate['stress_score']:.2f}) and only "
            f"{best_candidate['recent_nights']} night duties this week. Both soldiers stay in the safe Green/Yellow zone."
        )
    }


# -----------------------------------------------------------------------------
# 7. BATTALION EXHAUSTION & MACRO-RESERVE ESCALATION (BEMRE)
# Prevents zero-sum internal burnout when an entire company is depleted.
# -----------------------------------------------------------------------------
def check_battalion_exhaustion_escalation(db: Session, unit_id: str) -> Dict[str, Any]:
    """
    Evaluates systemic company exhaustion. If a unit operates below minimum safe
    welfare reserve (< 15%), it avoids forcing zero-sum swaps on tired troops
    and generates an automated Macro-Reserve Escalation Notice for Sector HQ / DIG.
    """
    reserve = compute_welfare_reserve(db, unit_id)
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    unit_name = unit.name if unit else "Company"

    reserve_pct = reserve.get("reserve_percentage", 0.0)
    available_reserves = reserve.get("available_rested_reserve", 0)
    total_strength = reserve.get("total_strength", 0)

    is_exhausted = reserve_pct < 15.0 or available_reserves < 3


    if is_exhausted:
        escalation_level = "CRITICAL_SECTOR_HQ_ALERT"
        action_required = "MACRO_RESERVE_ATTACHMENT"
        recommendations = [
            "Inter-Company Attachment: Request temporary 1-section (10 troopers) detachment from Battalion HQ Company or Peace Station.",
            "Tactical Posture Optimization: Temporarily authorize remote sensor/drone perimeter surveillance to reduce stationary guard mount density.",
            "Leave Relief Quota: Release emergency battalion welfare relief quota rather than burning out internal squadmates."
        ]
        verdict = (
            f"SYSTEMIC EXHAUSTION WARNING: {unit_name} has only {available_reserves} well-rested personnel ({reserve_pct}% reserve). "
            f"Internal duty swaps will cause zero-sum burnout. Automated Macro-Reserve Notice dispatched to Sector HQ."
        )
    else:
        escalation_level = "NORMAL_LOCAL_SUSTAINABILITY"
        action_required = "INTERNAL_URO_BALANCING"
        recommendations = [
            "Maintain standard company-level URO optimization swaps.",
            "Enforce mandatory 8-hour sleep barrier between shifts."
        ]
        verdict = (
            f"Unit is locally sustainable. {unit_name} maintains a {reserve_pct}% welfare reserve ({available_reserves} ready troopers). "
            f"Standard internal duty rotation is safe and effective."
        )

    return {
        "unit_id": unit_id,
        "unit_name": unit_name,
        "total_strength": total_strength,
        "welfare_reserve_percentage": reserve_pct,
        "ready_reserve_count": available_reserves,
        "systemic_exhaustion_flag": is_exhausted,
        "escalation_level": escalation_level,
        "action_required": action_required,
        "recommended_tactical_actions": recommendations,
        "simple_verdict": verdict
    }

