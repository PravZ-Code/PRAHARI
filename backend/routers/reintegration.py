"""F3 — Post-Leave Reintegration Window endpoints.
Welfare/admin get the queue; commanders get privacy-safe counts only (MHCA §21).
The trooper pulse endpoint is voluntary and never gates help access.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from database import get_db
from middleware.audit import log_audit
from middleware.rbac import require_role
from models.user import User
from services import reintegration_service

router = APIRouter()


class CheckpointIn(BaseModel):
    day: int
    note_summary: Optional[str] = None


class TrooperPulseIn(BaseModel):
    family_time_rating: Optional[int] = None
    settled_back_rating: Optional[int] = None
    free_text: Optional[str] = None


@router.get("/reintegration/queue")
def get_reintegration_queue(
    request: Request,
    unit_id: Optional[str] = None,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db),
):
    log_audit(db=db, user=current_user, request=request, resource_type="reintegration_window",
              resource_id=unit_id or "all", action="REINTEGRATION_QUEUE_VIEW", details={})
    return {"queue": reintegration_service.welfare_queue(db, unit_id=unit_id)}


@router.post("/reintegration/{window_id}/checkpoint")
def record_reintegration_checkpoint(
    window_id: str,
    body: CheckpointIn,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db),
):
    try:
        return reintegration_service.record_checkpoint(db, window_id, body.day, current_user, body.note_summary)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/reintegration/sync")
def force_reintegration_sync(
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db),
):
    result = reintegration_service.sync_reintegration_windows(db)
    log_audit(db=db, user=current_user, request=request, resource_type="reintegration_window",
              resource_id="sweep", action="REINTEGRATION_SYNC", details=result)
    return result


# Commander-safe aggregate (counts only, no names/content)
cmd_router = APIRouter()

@cmd_router.get("/unit/{unit_id}/reintegration-summary")
def commander_reintegration_summary(
    unit_id: str,
    request: Request,
    current_user: User = Depends(require_role("commander", "admin")),
    db: Session = Depends(get_db),
):
    if not current_user.role == "admin" and getattr(current_user, "unit_id", None) and current_user.unit_id != unit_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Commander scope is limited to their own unit.")
    log_audit(db=db, user=current_user, request=request, resource_type="reintegration_window",
              resource_id=unit_id, action="REINTEGRATION_SUMMARY_VIEW", details={})
    return reintegration_service.commander_aggregate(db, unit_id)


# Voluntary trooper pulse
personnel_router = APIRouter()


@personnel_router.get("/reintegration-status")
def trooper_reintegration_status(
    request: Request,
    current_user: User = Depends(require_role("personnel", "soldier", "jawan")),
    db: Session = Depends(get_db),
):
    """Trooper-facing: tells the portal whether an ACTIVE reintegration window
    exists (so the dashboard can surface the optional re-entry pulse card).
    Returns privacy-safe booleans only."""
    from models.reintegration import ReintegrationWindow
    pid = getattr(current_user, "personnel_id", None)
    if not pid:
        return {"active_window": False, "pulse_submitted": False}
    w = db.query(ReintegrationWindow).filter(
        ReintegrationWindow.personnel_id == pid,
        ReintegrationWindow.status == "active",
    ).order_by(ReintegrationWindow.window_end.desc()).first()
    if not w:
        return {"active_window": False, "pulse_submitted": False}
    return {
        "active_window": True,
        "window_id": w.id,
        "returned_on": w.returned_on.isoformat(),
        "window_end": w.window_end.isoformat(),
        "pulse_submitted": bool(w.trooper_pulse),
    }


@personnel_router.post("/reintegration-pulse")
def trooper_reintegration_pulse(
    body: TrooperPulseIn,
    request: Request,
    current_user: User = Depends(require_role("personnel", "soldier", "jawan")),
    db: Session = Depends(get_db),
):
    pid = getattr(current_user, "personnel_id", None)
    if not pid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not linked to a personnel record.")
    result = reintegration_service.record_trooper_pulse(db, pid, body.model_dump())
    log_audit(db=db, user=current_user, request=request, resource_type="reintegration_window",
              resource_id=result.get("window_id", "none"), action="REINTEGRATION_PULSE", details={"recorded": result.get("recorded")})
    return result
