from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.buddy import BuddySignalSubmitRequest, BuddyUnitSummaryResponse
from services.buddy_service import record_buddy_signal, get_unit_buddy_summary
from middleware.rbac import require_role

router = APIRouter()

@router.post("/signal", status_code=status.HTTP_201_CREATED)
def submit_buddy_signal(
    data: BuddySignalSubmitRequest,
    current_user: User = Depends(require_role("personnel", "admin")),
    db: Session = Depends(get_db)
):
    unit_id = current_user.unit_id
    if not unit_id:
        raise HTTPException(status_code=400, detail="User is not assigned to an active unit")

    # Record signal strictly without saving submitter identity
    record_buddy_signal(
        db=db,
        unit_id=unit_id,
        concern_level=data.concern_level,
        concern_category=data.concern_category
    )

    return {"message": "Anonymous concern recorded. Thank you for looking out for your troop."}

@router.get("/unit-summary/{unit_id}", response_model=BuddyUnitSummaryResponse)
def get_unit_summary(
    unit_id: str,
    weeks: int = 4,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    summary = get_unit_buddy_summary(db=db, unit_id=unit_id, num_weeks=weeks)
    return summary
