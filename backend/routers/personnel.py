from typing import Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.personnel import Personnel, Unit
from middleware.rbac import get_current_user, require_role
from middleware.audit import log_audit

router = APIRouter()

class PersonnelProfileResponse(BaseModel):
    id: str
    service_number: str
    name: str
    rank: str
    trade: Optional[str] = None
    company: Optional[str] = None
    contact_number: Optional[str] = None
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    formation: Optional[str] = None
    operational_area: Optional[str] = None
    date_of_joining: Optional[str] = None
    current_posting_date: Optional[str] = None
    hard_area_months: int = 0
    total_transfers: int = 0

class PersonnelProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    rank: Optional[str] = None
    trade: Optional[str] = None
    company: Optional[str] = None
    contact_number: Optional[str] = None
    date_of_joining: Optional[str] = None
    current_posting_date: Optional[str] = None
    hard_area_months: Optional[int] = None
    total_transfers: Optional[int] = None

def _format_profile(p: Personnel) -> PersonnelProfileResponse:
    return PersonnelProfileResponse(
        id=p.id,
        service_number=p.service_number,
        name=p.name,
        rank=p.rank,
        trade=p.trade,
        company=getattr(p, "company", None) or "Alpha Company",
        contact_number=getattr(p, "contact_number", None) or "",
        unit_id=p.unit_id,
        unit_name=p.unit.name if p.unit else "Battalion HQ",
        formation=p.unit.formation if p.unit else "Field Unit",
        operational_area=p.unit.operational_area if p.unit else "General",
        date_of_joining=p.date_of_joining.isoformat() if p.date_of_joining else None,
        current_posting_date=p.current_posting_date.isoformat() if p.current_posting_date else None,
        hard_area_months=p.hard_area_months or 0,
        total_transfers=p.total_transfers or 0
    )

@router.get("/me", response_model=PersonnelProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the authenticated personnel's personal profile.
    Enforces strict identity: personnel can only view their own record.
    """
    if not current_user.personnel_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authenticated user has no mapped personnel record"
        )
    
    p = db.query(Personnel).filter(Personnel.id == current_user.personnel_id).first()
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personnel record not found"
        )
    
    return _format_profile(p)

@router.put("/me", response_model=PersonnelProfileResponse)
def update_my_profile(
    req: PersonnelProfileUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the authenticated personnel's profile details.
    Persists changes to the database and logs an audit trail.
    """
    if not current_user.personnel_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authenticated user has no mapped personnel record"
        )

    p = db.query(Personnel).filter(Personnel.id == current_user.personnel_id).first()
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personnel record not found"
        )

    updated_fields = {}
    if req.name is not None and req.name.strip():
        p.name = req.name.strip()
        updated_fields["name"] = p.name
    if req.rank is not None and req.rank.strip():
        p.rank = req.rank.strip()
        updated_fields["rank"] = p.rank
    if req.trade is not None and req.trade.strip():
        p.trade = req.trade.strip()
        updated_fields["trade"] = p.trade
    if req.company is not None and req.company.strip():
        p.company = req.company.strip()
        updated_fields["company"] = p.company
    if req.contact_number is not None:
        p.contact_number = req.contact_number.strip()
        updated_fields["contact_number"] = p.contact_number
    if req.hard_area_months is not None:
        p.hard_area_months = max(0, req.hard_area_months)
        updated_fields["hard_area_months"] = p.hard_area_months
    if req.total_transfers is not None:
        p.total_transfers = max(0, req.total_transfers)
        updated_fields["total_transfers"] = p.total_transfers

    if req.date_of_joining:
        try:
            p.date_of_joining = datetime.strptime(req.date_of_joining, "%Y-%m-%d").date()
            updated_fields["date_of_joining"] = str(p.date_of_joining)
        except ValueError:
            pass

    if req.current_posting_date:
        try:
            p.current_posting_date = datetime.strptime(req.current_posting_date, "%Y-%m-%d").date()
            updated_fields["current_posting_date"] = str(p.current_posting_date)
        except ValueError:
            pass

    db.commit()
    db.refresh(p)

    log_audit(
        db=db,
        user=current_user,
        request=request,
        action="UPDATE_PERSONNEL_PROFILE",
        resource_type="personnel",
        resource_id=p.id,
        details=updated_fields
    )

    return _format_profile(p)
