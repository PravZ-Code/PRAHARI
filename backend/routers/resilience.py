"""
Resilience & Whole-Team Safety Router — Plain English Welfare & Roster Protection Endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import date
from pydantic import BaseModel, Field

from database import get_db
from middleware.rbac import get_current_user
from services.welfare_resilience_service import (
    compute_welfare_reserve,
    check_welfare_cascade,
    check_intervention_collision,
    run_what_if_duty_test,
    track_personnel_recovery,
    find_whole_team_safe_solution,
    check_battalion_exhaustion_escalation
)

router = APIRouter(prefix="/api/resilience", tags=["Resilience & Team Safety"])


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


# 1. Welfare Reserve
@router.get("/reserve/{unit_id}", summary="1. Welfare Reserve: Check if unit has enough rested people for future needs")
def get_unit_welfare_reserve(
    unit_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Shows whether a unit has enough people available in reserve to handle
    future welfare needs, emergency leaves, and rotations without breaking security guard posts.
    """
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
    current_user = Depends(get_current_user)
):
    """
    Checks whether relieving/swapping one stressed person could inadvertently
    push another soldier over the edge into burnout (a stress domino effect).
    """
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
    current_user = Depends(get_current_user)
):
    """
    Before changing a duty, PRAHARI checks its effect on the whole team:
    rest barrier violations, trade coverage, and existing leaves.
    """
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
    current_user = Depends(get_current_user)
):
    """
    Shows what may happen to a soldier's stress score and rest level
    before committing the change to the live roster.
    """
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
    current_user = Depends(get_current_user)
):
    """
    Checks whether the soldier actually recovers and improves over time after
    a welfare intervention (leave, shift change, or counseling) has been given.
    """
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
    current_user = Depends(get_current_user)
):
    """
    Finds solutions that protect the stressed person without putting extra pressure on others.
    Automatically identifies the best, most well-rested trade-compatible peer.
    """
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
    current_user = Depends(get_current_user)
):
    """
    Evaluates whole-company exhaustion. If available welfare reserve is below 15%,
    it prevents forced internal swaps and triggers an automated Macro-Reserve Notice to Sector HQ.
    """
    try:
        return check_battalion_exhaustion_escalation(db=db, unit_id=unit_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error assessing battalion exhaustion: {str(e)}")

