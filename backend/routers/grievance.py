from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.personnel import Personnel, Unit
from models.grievance import GrievanceRequest
from schemas.grievance import (
    GrievanceFileRequest,
    GrievanceResponse,
    GrievanceApproveRequest,
    GrievanceRejectRequest,
    GrievanceCountdownResponse
)
from services.grievance_service import (
    file_grievance_or_leave,
    get_sla_countdown_info,
    auto_scan_and_escalate,
    dual_approve_grievance,
    reject_grievance,
    to_utc
)
from middleware.rbac import require_role

router = APIRouter()

def _format_grievance_response(req: GrievanceRequest, db: Session) -> GrievanceResponse:
    personnel = db.query(Personnel).filter(Personnel.id == req.personnel_id).first()
    unit = db.query(Unit).filter(Unit.id == personnel.unit_id).first() if personnel else None
    
    rep = None
    if req.suggested_replacement_id:
        rep = db.query(Personnel).filter(Personnel.id == req.suggested_replacement_id).first()

    now = datetime.now(timezone.utc)
    dl = to_utc(req.sla_deadline)
    diff = dl - now
    hours_rem = max(0.0, round(diff.total_seconds() / 3600.0, 1)) if diff else 0.0

    return GrievanceResponse(
        id=req.id,
        personnel_id=req.personnel_id,
        personnel_name=personnel.name if personnel else "Unknown",
        rank=personnel.rank if personnel else None,
        trade=personnel.trade if personnel else None,
        unit_id=unit.id if unit else None,
        unit_name=unit.name if unit else None,
        request_type=req.request_type,
        category=req.category,
        description=req.description,
        start_date=req.start_date,
        end_date=req.end_date,
        is_fast_lane=bool(req.is_fast_lane),
        status=req.status,
        filed_at=req.filed_at,
        sla_deadline_hours=req.sla_deadline_hours,
        sla_deadline=req.sla_deadline,
        sla_breached=bool(req.sla_breached),
        hours_remaining=hours_rem,
        escalation_level=req.escalation_level,
        escalated_at=req.escalated_at,
        escalation_reason=req.escalation_reason,
        collision_status=req.collision_status,
        collision_details=req.collision_details,
        suggested_replacement_id=req.suggested_replacement_id,
        suggested_replacement_name=rep.name if rep else None,
        commander_approved=bool(req.commander_approved),
        commander_approved_at=req.commander_approved_at,
        welfare_approved=bool(req.welfare_approved),
        welfare_approved_at=req.welfare_approved_at,
        resolution_notes=req.resolution_notes,
        rejection_reason=req.rejection_reason,
        cost_of_inaction_active=bool(req.cost_of_inaction_active)
    )

@router.post("/file", response_model=GrievanceResponse)
def file_request(
    req: GrievanceFileRequest,
    current_user: User = Depends(require_role("personnel", "jawan", "welfare", "commander", "admin")),
    db: Session = Depends(get_db)
):
    target_personnel_id = req.personnel_id
    if not target_personnel_id:
        if current_user.personnel_id:
            target_personnel_id = current_user.personnel_id
        else:
            p = db.query(Personnel).first()
            if not p:
                raise HTTPException(status_code=400, detail="No personnel records found")
            target_personnel_id = p.id

    try:
        obj = file_grievance_or_leave(
            db=db,
            personnel_id=target_personnel_id,
            request_type=req.request_type,
            category=req.category,
            description=req.description,
            start_date=req.start_date,
            end_date=req.end_date,
            filing_channel=req.filing_channel or "pwa",
            user_id=current_user.id
        )
        return _format_grievance_response(obj, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Filing failed: {e}")

@router.get("/{request_id}", response_model=GrievanceResponse)
def get_request_details(
    request_id: str,
    current_user: User = Depends(require_role("personnel", "jawan", "welfare", "commander", "admin")),
    db: Session = Depends(get_db)
):
    req = db.query(GrievanceRequest).filter(GrievanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Grievance request not found")
    return _format_grievance_response(req, db)

@router.get("/{request_id}/countdown", response_model=GrievanceCountdownResponse)
def get_countdown(
    request_id: str,
    current_user: User = Depends(require_role("personnel", "jawan", "welfare", "commander", "admin")),
    db: Session = Depends(get_db)
):
    try:
        return get_sla_countdown_info(db, request_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/unit/{unit_id}/queue", response_model=List[GrievanceResponse])
def get_unit_grievance_queue(
    unit_id: str,
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db)
):
    p_ids = [p.id for p in db.query(Personnel.id).filter(Personnel.unit_id == unit_id).all()]
    if not p_ids:
        return []

    reqs = db.query(GrievanceRequest).filter(
        GrievanceRequest.personnel_id.in_(p_ids)
    ).order_by(GrievanceRequest.is_fast_lane.desc(), GrievanceRequest.sla_deadline.asc()).all()

    return [_format_grievance_response(r, db) for r in reqs]

@router.get("/personnel/{personnel_id}/history", response_model=List[GrievanceResponse])
def get_personnel_history(
    personnel_id: str,
    current_user: User = Depends(require_role("personnel", "jawan", "welfare", "commander", "admin")),
    db: Session = Depends(get_db)
):
    reqs = db.query(GrievanceRequest).filter(
        GrievanceRequest.personnel_id == personnel_id
    ).order_by(GrievanceRequest.filed_at.desc()).all()
    return [_format_grievance_response(r, db) for r in reqs]

@router.put("/{request_id}/approve")
def approve_request(
    request_id: str,
    req_body: Optional[GrievanceApproveRequest] = None,
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db)
):
    single_sign = req_body.single_sign if req_body else False
    role_to_sign = req_body.role if req_body else None
    notes = req_body.notes if req_body else None

    if role_to_sign and current_user.role != "admin" and current_user.role != role_to_sign:
        raise HTTPException(status_code=403, detail=f"User cannot sign as '{role_to_sign}'")

    try:
        return dual_approve_grievance(
            db=db,
            request_id=request_id,
            user_id=current_user.id,
            user_role=current_user.role,
            role_to_sign=role_to_sign,
            single_sign=single_sign,
            notes=notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Approval failed: {e}")

@router.put("/{request_id}/reject")
def reject_request(
    request_id: str,
    req_body: Optional[GrievanceRejectRequest] = None,
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db)
):
    reason = req_body.reason if req_body else "Operational mission constraints"
    try:
        return reject_grievance(
            db=db,
            request_id=request_id,
            user_id=current_user.id,
            user_role=current_user.role,
            reason=reason
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rejection failed: {e}")

@router.post("/scan-escalations")
def scan_escalations(
    current_user: User = Depends(require_role("admin", "commander", "welfare")),
    db: Session = Depends(get_db)
):
    escalated = auto_scan_and_escalate(db)
    return {
        "message": f"Scanned grievance SLAs. {len(escalated)} requests auto-escalated.",
        "escalated_count": len(escalated),
        "escalations": escalated
    }
