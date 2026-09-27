"""F1 — Helper-Load Ledger endpoints (welfare/commander aggregates; no clinical content)."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from middleware.audit import log_audit
from middleware.rbac import require_role
from models.helper_ledger import PaybackTask
from models.personnel import Personnel
from models.user import User
from services import helper_load_service

router = APIRouter()


class DismissIn(BaseModel):
    reason: str


class DismissIn(BaseModel):
    reason: str


@router.get("/helper-load/{unit_id}")
def get_helper_load(
    unit_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin", "commander")),
    db: Session = Depends(get_db),
):
    if current_user.role == "commander" and getattr(current_user, "unit_id", None) and current_user.unit_id != unit_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Commander scope is limited to their own unit.")
    log_audit(db=db, user=current_user, request=request, resource_type="helper_load",
              resource_id=unit_id, action="HELPER_LOAD_VIEW", details={})
    return helper_load_service.unit_helper_load(db, unit_id)


@router.post("/helper-load/payback/{task_id}/complete")
def complete_payback(
    task_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db),
):
    from datetime import datetime
    task = db.query(PaybackTask).filter(PaybackTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Payback task not found")
    if task.status in ("done", "dismissed"):
        raise HTTPException(status_code=400, detail=f"Task already {task.status}")
    task.status = "done"
    task.completed_at = datetime.utcnow()
    db.commit()
    log_audit(db=db, user=current_user, request=request, resource_type="payback_task",
              resource_id=task.id, action="HELPER_PAYBACK_COMPLETED", details={})
    return {"task_id": task.id, "status": task.status}


@router.post("/helper-load/payback/{task_id}/dismiss")
def dismiss_payback(
    task_id: str,
    body: DismissIn,
    request: Request,
    current_user: User = Depends(require_role("commander", "admin")),
    db: Session = Depends(get_db),
):
    reason = (body.reason or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Dismissal requires a written reason (audited).")
    task = db.query(PaybackTask).filter(PaybackTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Payback task not found")
    if task.status in ("done", "dismissed"):
        raise HTTPException(status_code=400, detail=f"Task already {task.status}")
    task.status = "dismissed"
    task.dismissed_by_user_id = current_user.id
    task.dismissal_reason = reason[:255]
    db.commit()
    log_audit(db=db, user=current_user, request=request, resource_type="payback_task",
              resource_id=task.id, action="HELPER_PAYBACK_DISMISSED", details={"reason": reason})
    return {"task_id": task.id, "status": task.status, "dismissed_by": current_user.id}
