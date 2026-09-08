from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.commander import (
    CommanderUnitsResponse,
    UnitReadinessResponse,
    UnitRiskDistributionResponse,
    UnitWorkloadResponse,
    UnitFatigueResponse
)
from services.commander_service import (
    get_commander_units,
    get_unit_readiness_detail,
    get_unit_risk_distribution,
    get_unit_workload_trends,
    get_unit_fatigue_heatmap,
    get_commander_command_briefing
)
from middleware.rbac import require_role

router = APIRouter()

def _verify_commander_unit_access(current_user: User, unit_id: str):
    """
    Prevents BOLA/IDOR by ensuring commanders can only query metrics for their assigned unit.
    Admins retain oversight across all units.
    """
    if current_user.role == "commander" and current_user.unit_id and current_user.unit_id != unit_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: Commander is not authorized to access unit '{unit_id}' outside assigned command"
        )

@router.get("/units", response_model=CommanderUnitsResponse)
def list_units(
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db)
):
    cards = get_commander_units(db=db, commander_user=current_user)
    return {"units": cards}

@router.get("/unit/{unit_id}/readiness", response_model=UnitReadinessResponse)
def get_readiness(
    unit_id: str,
    current_user: User = Depends(require_role("commander", "admin")),
    db: Session = Depends(get_db)
):
    _verify_commander_unit_access(current_user, unit_id)
    try:
        data = get_unit_readiness_detail(db=db, unit_id=unit_id)
        return data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/unit/{unit_id}/risk-distribution", response_model=UnitRiskDistributionResponse)
def get_risk_distribution(
    unit_id: str,
    current_user: User = Depends(require_role("commander", "admin")),
    db: Session = Depends(get_db)
):
    _verify_commander_unit_access(current_user, unit_id)
    try:
        data = get_unit_risk_distribution(db=db, unit_id=unit_id)
        return data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/unit/{unit_id}/workload-trends", response_model=UnitWorkloadResponse)
def get_workload_trends(
    unit_id: str,
    days: int = 14,
    current_user: User = Depends(require_role("commander", "admin")),
    db: Session = Depends(get_db)
):
    _verify_commander_unit_access(current_user, unit_id)
    trends = get_unit_workload_trends(db=db, unit_id=unit_id, days=days)
    return {"unit_id": unit_id, "trends": trends}

@router.get("/unit/{unit_id}/fatigue", response_model=UnitFatigueResponse)
def get_unit_fatigue(
    unit_id: str,
    current_user: User = Depends(require_role("commander", "admin")),
    db: Session = Depends(get_db)
):
    _verify_commander_unit_access(current_user, unit_id)
    troopers = get_unit_fatigue_heatmap(db=db, unit_id=unit_id)
    return {"unit_id": unit_id, "troopers": troopers}


@router.get("/unit/{unit_id}/command-briefing")
def get_command_briefing_endpoint(
    unit_id: str,
    current_user: User = Depends(require_role("commander", "admin")),
    db: Session = Depends(get_db)
):
    """
    Company Commander Command Briefing (CCCB):
    Reinforces full operational chain-of-command authority with platoon-level
    stress indices, readiness posture, and roster authorization queues.
    """
    _verify_commander_unit_access(current_user, unit_id)
    try:
        return get_commander_command_briefing(db=db, unit_id=unit_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/unit/{unit_id}/command-attribution", summary="Structural Stress Attribution Index (SSAI)")
def get_command_attribution_endpoint(
    unit_id: str,
    current_user: User = Depends(require_role("commander", "admin")),
    db: Session = Depends(get_db)
):
    """
    Structural Stress Attribution Index (SSAI):
    Aggregates unit-level scheduling fairness, leave denials, and rest compliance
    benchmarked against peer units under similar operational conditions.
    Surfaces a private, non-punitive self-correction insight for the Company Commander.
    """
    _verify_commander_unit_access(current_user, unit_id)
    from services.command_attribution_service import compute_structural_stress_attribution
    try:
        return compute_structural_stress_attribution(db=db, unit_id=unit_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))



