"""F4 — Policy-level What-If cohort simulator endpoint."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from middleware.audit import log_audit
from middleware.rbac import require_role
from models.user import User
from services.policy_simulator_service import simulate_policy

router = APIRouter()


class PolicyLevers(BaseModel):
    max_consecutive_nights: Optional[int] = None
    rest_barrier_hours: Optional[int] = None
    auto_approve_family_crisis: Optional[bool] = False
    extra_rest_days_per_30d: Optional[float] = 0.0


@router.post("/policy-what-if")
def run_policy_simulation(
    unit_id: str,
    body: PolicyLevers,
    request: Request,
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db),
):
    if current_user.role == "commander" and getattr(current_user, "unit_id", None) and current_user.unit_id != unit_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Commander scope is limited to their own unit.")
    result = simulate_policy(db, unit_id, body.model_dump())
    log_audit(db=db, user=current_user, request=request, resource_type="policy_what_if",
              resource_id=unit_id, action="POLICY_WHAT_IF_RUN", details={"levers": body.model_dump()})
    return result
