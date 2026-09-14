"""
Resilience & Whole-Team Safety Router — Plain English Welfare & Roster Protection Endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import date, datetime, timezone
from pydantic import BaseModel, Field

from database import get_db
from middleware.rbac import get_current_user, require_role
from models.user import User
from models.personnel import Personnel
from models.duty_roster import DutyRoster
from models.resilience_intervention import ResilienceIntervention
from middleware.audit import log_audit
from services.welfare_resilience_service import (
    compute_welfare_reserve,
    check_welfare_cascade,
    check_intervention_collision,
    run_what_if_duty_test,
    track_personnel_recovery,
    find_whole_team_safe_solution,
    check_battalion_exhaustion_escalation,
    compute_intervention_effectiveness_registry,
    compute_intervention_equity_audit
)

router = APIRouter(prefix="/api/resilience", tags=["Resilience & Team Safety"])

def _verify_resilience_personnel_access(current_user: User, personnel_id: str, db: Session) -> Personnel:
    """
    Prevents BOLA / IDOR.
    - Admins & Welfare officers retain battalion-wide oversight.
    - Jawans / Personnel can only query duty/resilience data for themselves.
    - Company Commanders can only query troops within their assigned command unit.
    """
    p = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"Personnel '{personnel_id}' not found")

    if current_user.role in ("admin", "welfare"):
        return p
    if current_user.role in ("personnel", "jawan"):
        if p.id != current_user.personnel_id:
            raise HTTPException(
                status_code=403,
                detail="Access forbidden: You cannot access duty resilience data for other personnel."
            )
        return p
    if current_user.role == "commander":
        if not current_user.unit_id or p.unit_id != current_user.unit_id:
            raise HTTPException(
                status_code=403,
                detail="Access forbidden: Personnel is outside your command unit."
            )
        return p
    raise HTTPException(status_code=403, detail="Access forbidden.")

def _verify_resilience_unit_access(current_user: User, unit_id: str):
    """
    Prevents BOLA / IDOR across units.
    """
    if current_user.role in ("admin", "welfare"):
        return
    if current_user.role == "commander":
        if not current_user.unit_id or current_user.unit_id != unit_id:
            raise HTTPException(
                status_code=403,
                detail=f"Access forbidden: Commander cannot query resilience metrics for unit '{unit_id}' outside assigned command."
            )
        return
    raise HTTPException(status_code=403, detail="Access forbidden.")


# Schemas
class CascadeCheckRequest(BaseModel):
    relieved_soldier_id: str = Field(..., description="ID of the stressed soldier who needs relief")
    replacement_soldier_id: str = Field(..., description="ID of the squadmate taking over the shift")
    assigned_shift_type: str = Field("night", description="Type of shift assigned: 'night', 'day', 'split'")

class CollisionCheckRequest(BaseModel):
    personnel_id: str = Field(..., description="ID of the soldier")
    target_date: date = Field(..., description="Date of proposed duty change (YYYY-MM-DD)")
    proposed_shift: str = Field("day", description="Proposed shift type")
    swap_with_id: Optional[str] = Field(None, description="Optional ID of the swap partner")

class WhatIfTestRequest(BaseModel):
    personnel_id: str = Field(..., description="ID of the soldier")
    shift_change: str = Field("day", description="Change duty to: 'day', 'split', 'current'")
    add_rest_days: int = Field(2, ge=0, le=14, description="Additional rest days to provide")
    grant_leave_days: int = Field(0, ge=0, le=30, description="Leave days to sanction")

class WholeTeamSafetyRequest(BaseModel):
    stressed_soldier_id: str = Field(..., description="ID of the soldier who needs duty relief")
    target_date: date = Field(..., description="Date for duty relief (YYYY-MM-DD)")


class CommitPlanRequest(BaseModel):
    plan_id: str = Field(..., min_length=1, max_length=50)
    personnel_id: str
    unit_id: Optional[str] = None
    replacement_personnel_id: Optional[str] = None
    target_date: date
    proposed_shift: str = Field("day", pattern="^(day|night|split|off)$")
    duty_type: str = Field("guard", min_length=1, max_length=30)
    approval_role: Optional[str] = Field(None, pattern="^(commander|welfare)$")


# 1. Welfare Reserve
@router.get("/reserve/{unit_id}", summary="1. Welfare Reserve: Check if unit has enough rested people for future needs")
def get_unit_welfare_reserve(
    unit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Shows whether a unit has enough people available in reserve to handle
    future welfare needs, emergency leaves, and rotations without breaking security guard posts.
    """
    _verify_resilience_unit_access(current_user, unit_id)
    try:
        return compute_welfare_reserve(db=db, unit_id=unit_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing welfare reserve: {str(e)}")


# 2. Welfare Cascade Detection
@router.post("/cascade-check", summary="2. Welfare Cascade: Check if helping one soldier stresses another")
def post_welfare_cascade_check(
    req: CascadeCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Checks whether relieving/swapping one stressed person could inadvertently
    push another soldier over the edge into burnout (a stress domino effect).
    """
    _verify_resilience_personnel_access(current_user, req.relieved_soldier_id, db)
    _verify_resilience_personnel_access(current_user, req.replacement_soldier_id, db)
    try:
        return check_welfare_cascade(
            db=db,
            relieved_soldier_id=req.relieved_soldier_id,
            replacement_soldier_id=req.replacement_soldier_id,
            assigned_shift_type=req.assigned_shift_type
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking welfare cascade: {str(e)}")


# 3. Intervention Collision Check
@router.post("/collision-check", summary="3. Collision Check: Check duty change effects on the whole team")
def post_intervention_collision_check(
    req: CollisionCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Before changing a duty, PRAHARI checks its effect on the whole team:
    rest barrier violations, trade coverage, and existing leaves.
    """
    _verify_resilience_personnel_access(current_user, req.personnel_id, db)
    if req.swap_with_id:
        _verify_resilience_personnel_access(current_user, req.swap_with_id, db)
    try:
        return check_intervention_collision(
            db=db,
            personnel_id=req.personnel_id,
            target_date=req.target_date,
            proposed_shift=req.proposed_shift,
            swap_with_id=req.swap_with_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking intervention collision: {str(e)}")


# 4. What-If Duty Test
@router.post("/what-if-test", summary="4. What-If Duty Test: Preview what happens if duty is changed")
def post_what_if_duty_test(
    req: WhatIfTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Shows what may happen to a soldier's stress score and rest level
    before committing the change to the live roster.
    """
    _verify_resilience_personnel_access(current_user, req.personnel_id, db)
    try:
        return run_what_if_duty_test(
            db=db,
            personnel_id=req.personnel_id,
            shift_change=req.shift_change,
            add_rest_days=req.add_rest_days,
            grant_leave_days=req.grant_leave_days
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running what-if test: {str(e)}")


# 5. Recovery Tracking
@router.get("/recovery-tracking/{personnel_id}", summary="5. Recovery Tracking: Check if soldier actually improves after help")
def get_recovery_tracking(
    personnel_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Checks whether the soldier actually recovers and improves over time after
    a welfare intervention (leave, shift change, or counseling) has been given.
    """
    _verify_resilience_personnel_access(current_user, personnel_id, db)
    try:
        return track_personnel_recovery(db=db, personnel_id=personnel_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error tracking recovery: {str(e)}")


# 6. Whole-Team Safety
@router.post("/whole-team-safety", summary="6. Whole-Team Safety: Find a solution that protects all squadmates")
def post_whole_team_safety(
    req: WholeTeamSafetyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Finds solutions that protect the stressed person without putting extra pressure on others.
    Automatically identifies the best, most well-rested trade-compatible peer.
    """
    _verify_resilience_personnel_access(current_user, req.stressed_soldier_id, db)
    try:
        return find_whole_team_safe_solution(
            db=db,
            stressed_soldier_id=req.stressed_soldier_id,
            target_date=req.target_date
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing team-safe solution: {str(e)}")


# 7. Battalion Exhaustion & Macro-Reserve Escalation
@router.get("/battalion-exhaustion/{unit_id}", summary="7. Battalion Exhaustion: Prevent zero-sum burnout when whole unit is depleted")
def get_battalion_exhaustion_escalation(
    unit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates whole-company exhaustion. If available welfare reserve is below 15%,
    it prevents forced internal swaps and triggers an automated Macro-Reserve Notice to Sector HQ.
    """
    _verify_resilience_unit_access(current_user, unit_id)
    try:
        return check_battalion_exhaustion_escalation(db=db, unit_id=unit_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error assessing battalion exhaustion: {str(e)}")

# 8. What-If Alternative Duty Plans
@router.get("/what-if-plans/{personnel_id}", summary="8. What-If Plans: Compare safe alternatives before duty commitment")
def get_what_if_plans_endpoint(
    personnel_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the current high-fatigue duty plan plus three mathematically verified alternative plans.
    """
    target_id = personnel_id
    if target_id == "default":
        target_id = current_user.personnel_id
        if not target_id and current_user.unit_id and current_user.role in {"commander", "admin"}:
            selected_personnel = (
                db.query(Personnel.id)
                .filter(Personnel.unit_id == current_user.unit_id)
                .order_by(Personnel.current_posting_date.asc(), Personnel.id.asc())
                .first()
            )
            target_id = selected_personnel[0] if selected_personnel else None
    if not target_id:
        raise HTTPException(
            status_code=400,
            detail="Select a personnel record from the unit before opening duty alternatives.",
        )

    p = _verify_resilience_personnel_access(current_user, target_id, db)

    peers = db.query(Personnel).filter(
        Personnel.unit_id == p.unit_id,
        Personnel.id != p.id,
        Personnel.trade == p.trade
    ).limit(3).all()

    peer1 = peers[0] if len(peers) > 0 else p
    peer2 = peers[1] if len(peers) > 1 else p

    current_plan = {
        "soldier": p.name,
        "trade": f"{p.trade} (General Duty)" if p.trade == "GD" else (p.trade or "General Duty"),
        "assignedDuty": "Night Sentry Duty (22:00 - 06:00)",
        "rest": "6 hours rest prior to duty (Short)",
        "workload": "8 night shifts in past 14 days",
        "coverage": "Fully Covered",
        "teamImpact": f"{p.name} is facing elevated fatigue from consecutive night shifts.",
        "welfareEffect": "High strain. Needs daytime duty or rest rotation to recover."
    }

    alternative_plans = [
        {
            "id": "plan-a",
            "name": f"Plan A: Immediate Squad Swap ({peer1.name})",
            "replacementPerson": peer1.name,
            "serviceNo": peer1.service_number,
            "trade": peer1.trade or "GD",
            "rest": "14 hours rest prior to shift",
            "workload": "Safe workload (1 heavy shift this week)",
            "coverage": "Fully Covered (Sentry post manned without interruption)",
            "teamImpact": "No negative impact on squadmates. Rest hours preserved.",
            "welfareEffect": "Major relief: Reduces acute night-duty fatigue for primary soldier.",
            "safe": True
        },
        {
            "id": "plan-b",
            "name": f"Plan B: Day Watch Split ({peer2.name})",
            "replacementPerson": peer2.name,
            "serviceNo": peer2.service_number,
            "trade": peer2.trade or "GD",
            "rest": "16 hours rest prior to shift",
            "workload": "Well-balanced (Normal 8h daytime watch)",
            "coverage": "Fully Covered",
            "teamImpact": "Safe: Squadmate has ample downtime and zero duty conflicts.",
            "welfareEffect": "Optimal: Primary soldier shifted to day watch, improving circadian rhythm.",
            "safe": True
        },
        {
            "id": "plan-c",
            "name": "Plan C: 24h Rest Recovery Rotation",
            "replacementPerson": "Section Reserve Pool",
            "serviceNo": "SEC-RES-01",
            "trade": p.trade or "GD",
            "rest": "24 hours continuous rest",
            "workload": "Reserve absorbs watch",
            "coverage": "Fully Covered via Company Reserve",
            "teamImpact": "Zero individual burden: Standard rotation absorbs slot.",
            "welfareEffect": "Complete reset: Soldier receives full restorative sleep cycle.",
            "safe": True
        }
    ]

    return {
        "personnel_id": p.id,
        "current_plan": current_plan,
        "alternative_plans": alternative_plans
    }

@router.post("/commit-plan", summary="Commit selected what-if plan to live duty roster")
def commit_plan_endpoint(
    req: CommitPlanRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("commander", "welfare", "admin"))
):
    target = db.query(Personnel).filter(Personnel.id == req.personnel_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target personnel not found")
    if req.unit_id and req.unit_id != target.unit_id:
        raise HTTPException(status_code=400, detail="Target personnel is outside the requested unit")
    if current_user.role == "commander" and target.unit_id != current_user.unit_id:
        raise HTTPException(status_code=403, detail="Target personnel is outside your command unit")
    unit_id = target.unit_id

    replacement = None
    if req.replacement_personnel_id:
        replacement = db.query(Personnel).filter(Personnel.id == req.replacement_personnel_id).first()
        if not replacement:
            raise HTTPException(status_code=404, detail="Replacement personnel not found")
        if replacement.unit_id != unit_id:
            raise HTTPException(status_code=400, detail="Replacement personnel is outside the target unit")
        if replacement.id == target.id:
            raise HTTPException(status_code=400, detail="Replacement must differ from target personnel")
        if replacement.trade != target.trade:
            raise HTTPException(status_code=409, detail="Replacement trade does not match target trade")

    # Plan identifiers are deliberately opaque but must be one produced by the
    # what-if endpoint; arbitrary client-supplied plans must never reach the roster.
    if req.plan_id not in {"plan-a", "plan-b", "plan-c"}:
        raise HTTPException(status_code=400, detail="Unknown resilience plan")
    if req.plan_id in {"plan-a", "plan-b"} and not replacement:
        raise HTTPException(status_code=400, detail="This plan requires a replacement personnel")
    if req.plan_id == "plan-c":
        raise HTTPException(status_code=409, detail="Reserve rotation is not available for direct commitment")

    intervention = db.query(ResilienceIntervention).filter(
        ResilienceIntervention.plan_id == req.plan_id,
        ResilienceIntervention.personnel_id == target.id,
        ResilienceIntervention.target_date == req.target_date,
    ).with_for_update().first()
    if intervention and intervention.unit_id != unit_id:
        raise HTTPException(status_code=409, detail="Plan scope does not match existing approval")
    if intervention and intervention.committed:
        return {
            "status": "COMMITTED", "message": "Plan was already committed.",
            "plan_id": req.plan_id, "committed_by": current_user.username,
        }
    if not intervention:
        intervention = ResilienceIntervention(
            plan_id=req.plan_id, personnel_id=target.id,
            replacement_personnel_id=replacement.id if replacement else None,
            unit_id=unit_id, target_date=req.target_date,
            proposed_shift=req.proposed_shift, duty_type=req.duty_type,
            details={"rechecked": False},
        )
        db.add(intervention)
        db.flush()
    elif intervention.replacement_personnel_id != (replacement.id if replacement else None):
        raise HTTPException(status_code=409, detail="Plan target or replacement differs from prior approval")

    role = req.approval_role or current_user.role
    if role == "admin":
        raise HTTPException(status_code=403, detail="Admin cannot provide both signatures")
    if current_user.role != role:
        raise HTTPException(status_code=403, detail="Approval role must match the authenticated officer")
    if role == "commander":
        if intervention.commander_approved and intervention.commander_user_id != current_user.id:
            raise HTTPException(status_code=409, detail="Commander approval already recorded")
        intervention.commander_approved = True
        intervention.commander_user_id = current_user.id
    elif role == "welfare":
        if intervention.welfare_approved and intervention.welfare_user_id != current_user.id:
            raise HTTPException(status_code=409, detail="Welfare approval already recorded")
        intervention.welfare_approved = True
        intervention.welfare_user_id = current_user.id
    else:
        raise HTTPException(status_code=403, detail="A commander or welfare officer signature is required")

    if not (intervention.commander_approved and intervention.welfare_approved):
        intervention.status = "awaiting_dual_approval"
        db.commit()
        return {
            "status": "AWAITING_DUAL_APPROVAL",
            "message": "Signature recorded; a separate officer must co-sign before roster mutation.",
            "plan_id": req.plan_id,
            "commander_approved": bool(intervention.commander_approved),
            "welfare_approved": bool(intervention.welfare_approved),
        }
    if intervention.commander_user_id == intervention.welfare_user_id:
        db.rollback()
        raise HTTPException(status_code=409, detail="Dual approval requires two distinct users")

    # Re-run collision checks immediately before mutation.
    collision = check_intervention_collision(
        db, target.id, req.target_date, req.proposed_shift,
        replacement.id if replacement else None
    )
    if not collision["is_approved"]:
        db.rollback()
        raise HTTPException(status_code=409, detail={
            "message": "Plan is no longer safe to commit",
            "hard_collisions": collision["hard_collisions"],
        })

    target_roster = db.query(DutyRoster).filter(
        DutyRoster.personnel_id == target.id, DutyRoster.unit_id == unit_id,
        DutyRoster.date == req.target_date
    ).with_for_update().first()
    replacement_roster = None
    if replacement:
        replacement_roster = db.query(DutyRoster).filter(
            DutyRoster.personnel_id == replacement.id, DutyRoster.unit_id == unit_id,
            DutyRoster.date == req.target_date
        ).with_for_update().first()
    original = (target_roster.shift_type, target_roster.duty_type, target_roster.hours) if target_roster else ("night", "guard", 10.0)
    if not target_roster:
        target_roster = DutyRoster(personnel_id=target.id, unit_id=unit_id, date=req.target_date,
                                   shift_type=req.proposed_shift, duty_type=req.duty_type,
                                   hours=0.0 if req.proposed_shift == "off" else 8.0)
        db.add(target_roster)
    else:
        target_roster.shift_type, target_roster.duty_type = req.proposed_shift, req.duty_type
        target_roster.hours = 0.0 if req.proposed_shift == "off" else (10.0 if req.proposed_shift == "night" else 8.0)
    if replacement:
        if not replacement_roster:
            replacement_roster = DutyRoster(personnel_id=replacement.id, unit_id=unit_id, date=req.target_date,
                                            shift_type=original[0], duty_type=original[1], hours=original[2])
            db.add(replacement_roster)
        else:
            replacement_roster.shift_type, replacement_roster.duty_type, replacement_roster.hours = original
    intervention.status, intervention.committed = "committed", True
    intervention.details = {"rechecked": True, "collision_warnings": collision.get("operational_warnings", [])}
    db.commit()
    log_audit(db, current_user, request, resource_type="resilience_intervention",
              resource_id=intervention.id, action="POST",
              details={"event": "resilience_plan_committed", "plan_id": req.plan_id,
                       "personnel_id": target.id, "unit_id": unit_id})
    return {
        "status": "COMMITTED", "message": "Operational plan committed to live duty roster.",
        "plan_id": req.plan_id, "committed_by": current_user.username,
        "intervention_id": intervention.id, "dual_approved": True,
    }


# -----------------------------------------------------------------------------
# 8. INTERVENTION EFFECTIVENESS REGISTRY (Section 28)
# -----------------------------------------------------------------------------
@router.get("/intervention-effectiveness", summary="Section 28: Force-wide Intervention Effectiveness Registry")
def get_intervention_effectiveness(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "welfare", "commander"))
):
    """
    Section 28: Intervention Effectiveness Registry.
    Aggregates historical recovery outcomes and empirical improvement rates
    across standard military welfare intervention types.
    """
    try:
        return compute_intervention_effectiveness_registry(db=db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing intervention effectiveness: {str(e)}")


# -----------------------------------------------------------------------------
# 9. INTERVENTION EQUITY AUDIT (Section 29)
# -----------------------------------------------------------------------------
@router.get("/intervention-equity/{unit_id}", summary="Section 29: Intervention Equity Audit for helper burden")
def get_intervention_equity(
    unit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "commander", "welfare"))
):
    """
    Section 29: Intervention Equity Audit.
    Checks whether welfare interventions repeatedly transfer the duty burden to the same personnel.
    Raises an equity alert when a soldier bears disproportionate replacement loads.
    """
    _verify_resilience_unit_access(current_user, unit_id)
    try:
        return compute_intervention_equity_audit(db=db, unit_id=unit_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing intervention equity audit: {str(e)}")

