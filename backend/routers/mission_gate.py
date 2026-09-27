"""F2 — Mission Risk Budget sign-off gate endpoints. Documentation aid, never a veto."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from middleware.audit import log_audit
from middleware.rbac import require_role
from models.user import User
from services import mission_gate_service

router = APIRouter()


class AcknowledgeIn(BaseModel):
    decision: str  # 'remediate' | 'accept_risk'
    note: Optional[str] = None


@router.post("/mission-gate/evaluate")
def evaluate_tasking(
    unit_id: str,
    tasking_ref: str,
    request: Request,
    current_user: User = Depends(require_role("commander", "admin")),
    db: Session = Depends(get_db),
):
    if current_user.role == "commander" and getattr(current_user, "unit_id", None) and current_user.unit_id != unit_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Commander scope is limited to their own unit.")
    result = mission_gate_service.evaluate_tasking(db, unit_id, tasking_ref, actor_user=current_user)
    return result


@router.get("/mission-gate/{unit_id}/pending")
def unit_pending_assessments(
    unit_id: str,
    request: Request,
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db),
):
    if current_user.role == "commander" and getattr(current_user, "unit_id", None) and current_user.unit_id != unit_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Commander scope is limited to their own unit.")
    log_audit(db=db, user=current_user, request=request, resource_type="mission_gate",
              resource_id=unit_id, action="MISSION_GATE_LIST_VIEW", details={})
    return mission_gate_service.unit_snapshot(db, unit_id)


@router.post("/mission-gate/{assessment_id}/acknowledge")
def acknowledge_assessment(
    assessment_id: str,
    body: AcknowledgeIn,
    request: Request,
    current_user: User = Depends(require_role("commander", "admin")),
    db: Session = Depends(get_db),
):
    try:
        result = mission_gate_service.acknowledge(db, assessment_id, current_user, body.decision, body.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result
