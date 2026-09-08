from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.uro import URORun
from schemas.uro import (
    UROOptimizeRequest, URORunResponse, UROApproveRequest,
    UROApprovalResponse, URORejectRequest, URORejectResponse
)
from services.uro_service import run_uro_optimization, approve_uro_run, reject_uro_run, get_cost_of_inaction_context
from middleware.rbac import require_role

router = APIRouter()

def _format_run_response(
    run: URORun,
    db: Optional[Session] = None,
    current_user: Optional[User] = None
) -> URORunResponse:
    cost_context = None
    if db is not None and run.unit_id:
        try:
            cost_context = get_cost_of_inaction_context(db, run.unit_id)
        except Exception as e:
            print(f"[Cost of Inaction Warning] Context calculation failed: {e}")

    swaps_data = run.swaps or []
    # If the requesting user is a commander, enforce Section 21 MHA redaction:
    # Scrub psychiatric labels and numeric percentages from named swap items.
    if current_user and current_user.role == "commander":
        sanitized_swaps = []
        for s in swaps_data:
            s_copy = dict(s)
            pa = dict(s_copy.get("person_a", {}))
            pb = dict(s_copy.get("person_b", {}))

            pa["risk_level"] = "rotation_due"
            pa["clinical_redacted"] = True

            pb["risk_level"] = "rest_compliant"
            pb["clinical_redacted"] = True

            s_copy["person_a"] = pa
            s_copy["person_b"] = pb
            s_copy["projected_risk_change_a"] = {"from": 0.0, "to": 0.0}
            s_copy["projected_risk_change_b"] = {"from": 0.0, "to": 0.0}
            sanitized_swaps.append(s_copy)
        swaps_data = sanitized_swaps

    return URORunResponse(
        run_id=run.id,
        unit_id=run.unit_id,
        before=run.before_risk_summary,
        after=run.after_risk_summary,
        swaps=swaps_data,
        risk_reduction_pct=float(run.risk_reduction_pct),
        status=run.status,
        commander_approved=bool(run.commander_approved),
        commander_approved_at=run.commander_approved_at,
        commander_user_id=run.commander_user_id,
        welfare_approved=bool(run.welfare_approved),
        welfare_approved_at=run.welfare_approved_at,
        welfare_user_id=run.welfare_user_id,
        roster_committed=bool(run.roster_committed),
        declined_by_role=run.declined_by_role,
        declined_at=run.declined_at,
        decline_reason=run.decline_reason,
        cost_of_inaction_context=cost_context,
    )

@router.post("/optimize/{unit_id}", response_model=URORunResponse)
def optimize_unit_roster(
    unit_id: str,
    req: UROOptimizeRequest,
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db)
):
    if current_user.role == "commander" and current_user.unit_id and current_user.unit_id != unit_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: Commander cannot trigger optimization for unit '{unit_id}' outside assigned command"
        )

    try:
        uro_run = run_uro_optimization(
            db=db,
            unit_id=unit_id,
            user_id=current_user.id,
            date_start_str=req.roster_date_start,
            date_end_str=req.roster_date_end,
            max_swaps=req.max_swaps,
            protect_minimum_manning=req.protect_minimum_manning
        )
        return _format_run_response(uro_run, db=db, current_user=current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"URO optimization failed: {e}")

@router.get("/result/{run_id}", response_model=URORunResponse)
def get_uro_result(
    run_id: str,
    current_user: User = Depends(require_role("welfare", "commander", "admin")),
    db: Session = Depends(get_db)
):
    run = db.query(URORun).filter(URORun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="URO optimization run not found")

    return _format_run_response(run, db=db, current_user=current_user)

@router.put("/result/{run_id}/approve", response_model=UROApprovalResponse)
def approve_uro_result(
    run_id: str,
    req: Optional[UROApproveRequest] = None,
    single_sign: bool = False,
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db)
):
    run = db.query(URORun).filter(URORun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="URO run not found")

    is_single_sign = single_sign or (req.single_sign if req else False)
    as_role = req.role if req else None

    # Role check: only admin can sign on behalf of another role
    if as_role and current_user.role != "admin" and current_user.role != as_role:
        raise HTTPException(
            status_code=403,
            detail=f"User with role '{current_user.role}' cannot sign as '{as_role}'"
        )

    try:
        res = approve_uro_run(
            db=db,
            run_id=run_id,
            user_id=current_user.id,
            user_role=current_user.role,
            as_role=as_role,
            single_sign=is_single_sign
        )
        return UROApprovalResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Approval failed: {e}")

@router.put("/result/{run_id}/reject", response_model=URORejectResponse)
def reject_uro_result(
    run_id: str,
    req: Optional[URORejectRequest] = None,
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db)
):
    reason = req.reason if req else "Operational constraints"
    try:
        res = reject_uro_run(
            db=db,
            run_id=run_id,
            user_id=current_user.id,
            user_role=current_user.role,
            reason=reason
        )
        return URORejectResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rejection failed: {e}")

@router.get("/unit/{unit_id}/cost-of-inaction")
def get_unit_cost_of_inaction(
    unit_id: str,
    current_user: User = Depends(require_role("commander", "welfare", "admin")),
    db: Session = Depends(get_db)
):
    if current_user.role == "commander" and current_user.unit_id and current_user.unit_id != unit_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: Commander cannot view cost of inaction for unit '{unit_id}'"
        )
    return get_cost_of_inaction_context(db, unit_id)


