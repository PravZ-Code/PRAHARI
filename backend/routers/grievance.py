from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.personnel import Personnel, Unit
from models.grievance import GrievanceRequest
from models.leave import LeaveRecord
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
    compute_resolution_bottlenecks,
    to_utc
)
from middleware.rbac import require_role, get_current_user
from services.sync_service import sync_broadcaster

router = APIRouter()

def _format_grievance_responses_batch(reqs: List[GrievanceRequest], db: Session) -> List[GrievanceResponse]:
    if not reqs:
        return []

    # Batch fetch all referenced personnel (requestors + replacements) in 1 query
    p_ids = list({r.personnel_id for r in reqs if r.personnel_id} | {r.suggested_replacement_id for r in reqs if r.suggested_replacement_id})
    personnel_map = {}
    if p_ids:
        for p in db.query(Personnel).filter(Personnel.id.in_(p_ids)).all():
            personnel_map[p.id] = p

    # Batch fetch all referenced units in 1 query
    u_ids = list({p.unit_id for p in personnel_map.values() if p.unit_id})
    unit_map = {}
    if u_ids:
        for u in db.query(Unit).filter(Unit.id.in_(u_ids)).all():
            unit_map[u.id] = u

    now = datetime.now(timezone.utc)
    results = []
    for req in reqs:
        personnel = personnel_map.get(req.personnel_id)
        unit = unit_map.get(personnel.unit_id) if personnel and personnel.unit_id else None
        rep = personnel_map.get(req.suggested_replacement_id) if req.suggested_replacement_id else None

        dl = to_utc(req.sla_deadline)
        diff = dl - now
        hours_rem = max(0.0, round(diff.total_seconds() / 3600.0, 1)) if diff else 0.0

        results.append(GrievanceResponse(
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
        ))
    return results

def _format_grievance_response(req: GrievanceRequest, db: Session) -> GrievanceResponse:
    res = _format_grievance_responses_batch([req], db)
    return res[0]

@router.post("", response_model=GrievanceResponse)
@router.post("/", response_model=GrievanceResponse)
@router.post("/file", response_model=GrievanceResponse)
@router.post("/submit", response_model=GrievanceResponse)
def file_request(
    req: GrievanceFileRequest,
    current_user: User = Depends(require_role("personnel", "jawan", "welfare", "commander", "admin")),
    db: Session = Depends(get_db)
):
    # Idempotency check for flaky 2G mobile connectivity
    if req.id:
        existing = db.query(GrievanceRequest).filter(GrievanceRequest.id == req.id).first()
        if existing:
            _verify_grievance_access(current_user, existing, db)
            return _format_grievance_response(existing, db)

    if current_user.role in ("personnel", "jawan"):
        if not current_user.personnel_id:
            raise HTTPException(status_code=403, detail="Authenticated personnel identity is not linked.")
        if req.personnel_id and req.personnel_id != current_user.personnel_id:
            raise HTTPException(status_code=403, detail="You may only file a request for yourself.")
        target_personnel_id = current_user.personnel_id
    else:
        if not req.personnel_id:
            raise HTTPException(status_code=400, detail="personnel_id is required for officer-submitted requests.")
        target_personnel_id = req.personnel_id
        target = db.query(Personnel).filter(Personnel.id == target_personnel_id).first()
        if not target:
            raise HTTPException(status_code=404, detail="Personnel not found")
        if current_user.role == "commander" and (
            not current_user.unit_id or target.unit_id != current_user.unit_id
        ):
            raise HTTPException(status_code=403, detail="Personnel is outside your command unit.")

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
            user_id=current_user.id,
            request_id=req.id
        )
        sync_broadcaster.publish("grievance_created", {
            "id": obj.id,
            "personnel_id": obj.personnel_id,
            "request_type": obj.request_type,
            "category": obj.category,
            "status": obj.status,
            "is_fast_lane": bool(obj.is_fast_lane),
        })
        return _format_grievance_response(obj, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Filing failed: {e}")

def _verify_grievance_access(current_user: User, req: GrievanceRequest, db: Session):
    """
    Prevents BOLA / IDOR.
    - Admins & Welfare officers retain battalion-wide oversight.
    - Jawans / Personnel can only access their own requests.
    - Company Commanders can only access requests for personnel in their assigned unit.
    """
    if current_user.role in ("admin", "welfare"):
        return
    if current_user.role in ("personnel", "jawan"):
        if req.personnel_id != current_user.personnel_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You are not authorized to view grievance requests belonging to other personnel."
            )
        return
    if current_user.role == "commander":
        soldier = db.query(Personnel).filter(Personnel.id == req.personnel_id).first()
        if not soldier or not current_user.unit_id or soldier.unit_id != current_user.unit_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Personnel is outside your command unit."
            )
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden.")

def _verify_personnel_history_access(current_user: User, target_personnel_id: str, db: Session):
    """
    Prevents BOLA / IDOR on personnel history queries.
    """
    if current_user.role in ("admin", "welfare"):
        return
    if current_user.role in ("personnel", "jawan"):
        if target_personnel_id != current_user.personnel_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You cannot access history for other personnel."
            )
        return
    if current_user.role == "commander":
        soldier = db.query(Personnel).filter(Personnel.id == target_personnel_id).first()
        if not soldier or not current_user.unit_id or soldier.unit_id != current_user.unit_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Personnel is outside your command unit."
            )
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden.")

@router.get("/pending-queue", response_model=List[GrievanceResponse])
def get_pending_queue(
    unit_id: Optional[str] = None,
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db)
):
    """
    Returns pending grievances/leave requests awaiting officer decision.
    Scoped to commander's assigned unit or all units for admin/welfare.
    """
    query = db.query(GrievanceRequest).filter(
        GrievanceRequest.status.notin_(["approved", "rejected", "resolved"])
    )
    target_unit = unit_id or (current_user.unit_id if current_user.role == "commander" else None)
    if current_user.role == "commander" and unit_id is not None and current_user.unit_id != unit_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: Commander cannot view queue for unit '{unit_id}' outside assigned command."
        )
    if target_unit:
        p_ids = [p.id for p in db.query(Personnel.id).filter(Personnel.unit_id == target_unit).all()]
        query = query.filter(GrievanceRequest.personnel_id.in_(p_ids))

    reqs = query.order_by(
        GrievanceRequest.is_fast_lane.desc(),
        GrievanceRequest.sla_deadline.asc()
    ).all()
    return _format_grievance_responses_batch(reqs, db)

@router.get("/mine", response_model=List[GrievanceResponse])
@router.get("/my-requests", response_model=List[GrievanceResponse])
@router.get("/my-status", response_model=List[GrievanceResponse])
def get_my_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns requests filed by or for the current authenticated personnel.
    """
    p_id = current_user.personnel_id
    if not p_id:
        return []

    reqs = db.query(GrievanceRequest).filter(
        GrievanceRequest.personnel_id == p_id
    ).order_by(GrievanceRequest.filed_at.desc()).all()
    return _format_grievance_responses_batch(reqs, db)

@router.get("/unit/{unit_id}/queue", response_model=List[GrievanceResponse])
def get_unit_grievance_queue(
    unit_id: str,
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db)
):
    if current_user.role == "commander" and (not current_user.unit_id or current_user.unit_id != unit_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: Commander cannot view queue for unit '{unit_id}' outside assigned command."
        )
    p_ids = [p.id for p in db.query(Personnel.id).filter(Personnel.unit_id == unit_id).all()]
    if not p_ids:
        return []

    reqs = db.query(GrievanceRequest).filter(
        GrievanceRequest.personnel_id.in_(p_ids)
    ).order_by(GrievanceRequest.is_fast_lane.desc(), GrievanceRequest.sla_deadline.asc()).all()

    return _format_grievance_responses_batch(reqs, db)

@router.get("/personnel/{personnel_id}/history", response_model=List[GrievanceResponse])
def get_personnel_history(
    personnel_id: str,
    current_user: User = Depends(require_role("personnel", "jawan", "welfare", "commander", "admin")),
    db: Session = Depends(get_db)
):
    _verify_personnel_history_access(current_user, personnel_id, db)
    reqs = db.query(GrievanceRequest).filter(
        GrievanceRequest.personnel_id == personnel_id
    ).order_by(GrievanceRequest.filed_at.desc()).all()
    return _format_grievance_responses_batch(reqs, db)


@router.get("/resolution-bottlenecks", summary="Section 12: Cross-company resolution bottleneck detection")
def get_resolution_bottlenecks(
    unit_id: Optional[str] = None,
    current_user: User = Depends(require_role("admin", "commander", "welfare")),
    db: Session = Depends(get_db)
):
    """
    Section 12: Resolution Bottleneck Detection.
    Aggregates welfare resolution performance across companies and identifies
    repeated bottleneck approval tiers, average resolution times, and frequent categories.
    """
    effective_unit_id = unit_id
    if current_user.role == "commander" and not effective_unit_id:
        effective_unit_id = current_user.unit_id

    return compute_resolution_bottlenecks(db=db, unit_id=effective_unit_id)


@router.get("/history")
def get_grievance_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns historical leave and grievance requests for the authenticated soldier,
    formatted for the mobile leave tracker screen.
    """
    p_id = current_user.personnel_id
    if not p_id:
        return []

    results = []

    # 1. Historical leave records
    leave_recs = db.query(LeaveRecord).filter(
        LeaveRecord.personnel_id == p_id
    ).order_by(LeaveRecord.applied_date.desc()).all()

    for lr in leave_recs:
        dur = 7
        if lr.start_date and lr.end_date:
            try:
                dur = max(1, (lr.end_date - lr.start_date).days)
            except Exception:
                pass
        results.append({
            "id": lr.id,
            "category": lr.leave_type or "annual_leave",
            "description": f"Applied on {lr.applied_date.isoformat() if lr.applied_date else 'Past'}",
            "status": lr.status,
            "duration_days": dur,
            "filed_at": lr.applied_date.isoformat() if lr.applied_date else None,
            "decision_by": "Unit Commander",
            "denial_reason": lr.denial_reason
        })

    # 2. Past grievance / fast-track requests
    grvs = db.query(GrievanceRequest).filter(
        GrievanceRequest.personnel_id == p_id
    ).order_by(GrievanceRequest.filed_at.desc()).all()

    for g in grvs:
        dur = 7
        if g.start_date and g.end_date:
            try:
                d1 = datetime.strptime(str(g.start_date)[:10], "%Y-%m-%d")
                d2 = datetime.strptime(str(g.end_date)[:10], "%Y-%m-%d")
                dur = max(1, (d2 - d1).days)
            except Exception:
                pass
        results.append({
            "id": g.id,
            "category": g.category,
            "description": g.description or "Emergency Leave / Fast-Track Request",
            "status": g.status,
            "duration_days": dur,
            "filed_at": g.filed_at.isoformat() if g.filed_at else None,
            "decision_by": "Command Authority" if g.commander_approved else ("Battalion Welfare" if g.welfare_approved else "Pending Review"),
            "denial_reason": g.rejection_reason
        })

    return results


@router.get("/{request_id}", response_model=GrievanceResponse)
def get_request_details(
    request_id: str,
    current_user: User = Depends(require_role("personnel", "jawan", "welfare", "commander", "admin")),
    db: Session = Depends(get_db)
):
    req = db.query(GrievanceRequest).filter(GrievanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Grievance request not found")
    _verify_grievance_access(current_user, req, db)
    return _format_grievance_response(req, db)

@router.get("/{request_id}/countdown", response_model=GrievanceCountdownResponse)
def get_countdown(
    request_id: str,
    current_user: User = Depends(require_role("personnel", "jawan", "welfare", "commander", "admin")),
    db: Session = Depends(get_db)
):
    req = db.query(GrievanceRequest).filter(GrievanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Grievance request not found")
    _verify_grievance_access(current_user, req, db)
    try:
        return get_sla_countdown_info(db, request_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{request_id}/approve")
def approve_request(
    request_id: str,
    req_body: Optional[GrievanceApproveRequest] = None,
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db)
):
    target = db.query(GrievanceRequest).filter(GrievanceRequest.id == request_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Grievance request not found")
    if current_user.role == "commander":
        _verify_grievance_access(current_user, target, db)
    single_sign = req_body.single_sign if req_body else False
    role_to_sign = req_body.role if req_body else None
    notes = req_body.notes if req_body else None

    if single_sign:
        raise HTTPException(status_code=400, detail="Single-user dual signing is prohibited.")
    if current_user.role == "admin" and not role_to_sign:
        raise HTTPException(status_code=400, detail="Admins must explicitly select one approval role.")
    if role_to_sign and current_user.role != "admin" and current_user.role != role_to_sign:
        raise HTTPException(status_code=403, detail=f"User cannot sign as '{role_to_sign}'")

    try:
        res = dual_approve_grievance(
            db=db,
            request_id=request_id,
            user_id=current_user.id,
            user_role=current_user.role,
            role_to_sign=role_to_sign,
            single_sign=single_sign,
            notes=notes
        )
        sync_broadcaster.publish("grievance_approved", {
            "id": request_id,
            "role_signed": role_to_sign or current_user.role,
            "status": "approved" if target.commander_approved and target.welfare_approved else "partially_approved",
        })
        return res
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
    target = db.query(GrievanceRequest).filter(GrievanceRequest.id == request_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Grievance request not found")
    if current_user.role == "commander":
        _verify_grievance_access(current_user, target, db)
    reason = req_body.reason if req_body else "Operational mission constraints"
    try:
        res = reject_grievance(
            db=db,
            request_id=request_id,
            user_id=current_user.id,
            user_role=current_user.role,
            reason=reason
        )
        sync_broadcaster.publish("grievance_rejected", {
            "id": request_id,
            "status": "rejected",
            "reason": reason,
        })
        return res
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


