import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from database import get_db
from models.user import User
from models.personnel import Personnel
from models.welfare_case import WelfareCase
from models.prediction import RiskPrediction, PersonalBaseline
from schemas.welfare import (
    WelfareCasesResponse,
    WelfareCaseDetail,
    PlanCreateRequest,
    CaseResolveRequest,
    WhatIfRequest,
    WhatIfResponse,
    CaseReassessResponse
)
from schemas.evidence import EvidenceConflictReport
from schemas.trend import TrendAnalysisReport
from services.conflict_service import analyze_evidence_conflict
from services.trend_service import analyze_personnel_trend
from ml.feature_engineering import build_feature_vector
from ml.predict import predict_batch
from services.welfare_service import (
    get_welfare_cases,
    get_welfare_case_detail,
    simulate_what_if
)
from services.dossier_pdf_service import generate_dossier_pdf
from middleware.rbac import require_role
from middleware.audit import log_audit

router = APIRouter()

@router.get("/cases", response_model=WelfareCasesResponse)
def list_cases(
    status: Optional[List[str]] = Query(None),
    page: int = 1,
    per_page: int = 20,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    result = get_welfare_cases(db=db, status_filters=status, page=page, per_page=per_page)
    return result

@router.get("/case/{case_id}", response_model=WelfareCaseDetail)
def get_case(
    case_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    detail = get_welfare_case_detail(db=db, case_id=case_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Welfare case not found")

    log_audit(db, current_user, request, resource_type="welfare_case", resource_id=case_id)
    return detail

@router.get("/case/{case_id}/export-dossier")
def export_case_dossier(
    case_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    case = db.query(WelfareCase).filter(WelfareCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found")

    temp_dir = tempfile.gettempdir()
    pdf_filename = f"COI_Dossier_{case_id[:8]}.pdf"
    pdf_path = os.path.join(temp_dir, f"COI_Dossier_{case_id}.pdf")

    try:
        generate_dossier_pdf(db=db, case_id=case_id, output_path=pdf_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Court of Inquiry dossier: {str(e)}")

    log_audit(
        db,
        current_user,
        request,
        resource_type="welfare_case_dossier",
        resource_id=case_id,
        details={"export_format": "PDF", "legal_mandate": "Section 65B Indian Evidence Act"}
    )

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=pdf_filename
    )

@router.put("/case/{case_id}/acknowledge")
def acknowledge_case(
    case_id: str,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    case = db.query(WelfareCase).filter(WelfareCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found")

    case.status = "acknowledged"
    case.acknowledged_at = datetime.now(timezone.utc)
    case.assigned_officer_id = current_user.id
    db.commit()

    return {"message": "Case acknowledged. SLA acknowledgment timer stopped.", "acknowledged_at": case.acknowledged_at}

@router.put("/case/{case_id}/plan")
def create_intervention_plan(
    case_id: str,
    req: PlanCreateRequest,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    case = db.query(WelfareCase).filter(WelfareCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found")

    case.status = "plan_created"
    case.plan_created_at = datetime.now(timezone.utc)
    case.intervention_type = req.intervention_type
    case.intervention_notes = req.intervention_notes
    db.commit()

    return {"message": "Intervention plan logged. Action SLA met.", "plan_created_at": case.plan_created_at}

@router.put("/case/{case_id}/resolve")
def resolve_case(
    case_id: str,
    req: CaseResolveRequest,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    case = db.query(WelfareCase).filter(WelfareCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found")

    case.status = "resolved"
    case.resolved_at = datetime.now(timezone.utc)
    case.outcome_notes = req.outcome_notes
    db.commit()

    return {"message": "Case successfully resolved and archived.", "resolved_at": case.resolved_at}

@router.get("/personnel/{personnel_id}/profile")
def get_personnel_profile(
    personnel_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    p = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Personnel not found")

    log_audit(db, current_user, request, resource_type="personnel_profile", resource_id=personnel_id)

    latest_pred = db.query(RiskPrediction).filter(
        RiskPrediction.personnel_id == p.id
    ).order_by(RiskPrediction.predicted_at.desc()).first()

    pred_info = {
        "risk_score": float(latest_pred.risk_score) if latest_pred else 0.20,
        "risk_level": latest_pred.risk_level if latest_pred else "green",
        "confidence": float(latest_pred.confidence_score) if latest_pred else 0.75,
        "data_quality": float(latest_pred.data_quality_score) if latest_pred else 0.85,
        "baseline_type": latest_pred.baseline_type if latest_pred else "cohort",
        "predicted_at": latest_pred.predicted_at if latest_pred else datetime.now(timezone.utc)
    }

    shap_factors = latest_pred.shap_values if latest_pred else []
    active_cases = db.query(WelfareCase).filter(
        WelfareCase.personnel_id == p.id,
        WelfareCase.status != "resolved"
    ).count()

    return {
        "personnel": {
            "id": p.id,
            "name": p.name,
            "rank": p.rank,
            "service_number": p.service_number,
            "unit_name": p.unit.name if p.unit else "Unit",
            "date_of_joining": str(p.date_of_joining),
            "current_posting_date": str(p.current_posting_date),
            "hard_area_months": p.hard_area_months,
            "total_transfers": p.total_transfers
        },
        "current_risk": pred_info,
        "shap_explanation": shap_factors,
        "active_welfare_cases": active_cases
    }

@router.post("/what-if", response_model=WhatIfResponse)
def run_what_if(
    req: WhatIfRequest,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    try:
        result = simulate_what_if(db=db, personnel_id=req.personnel_id, scenario=req.scenario)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/personnel/{personnel_id}/evidence-conflict", response_model=EvidenceConflictReport)
def get_evidence_conflict(
    personnel_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    try:
        report = analyze_evidence_conflict(db=db, personnel_id=personnel_id)
        log_audit(db, current_user, request, resource_type="evidence_conflict_report", resource_id=personnel_id)
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/personnel/{personnel_id}/trend-analysis", response_model=TrendAnalysisReport)
def get_trend_analysis(
    personnel_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    try:
        trend = analyze_personnel_trend(db=db, personnel_id=personnel_id)
        log_audit(db, current_user, request, resource_type="longitudinal_trend_analysis", resource_id=personnel_id)
        return trend
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/case/{case_id}/reassess", response_model=CaseReassessResponse)
def reassess_welfare_case(
    case_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    case = db.query(WelfareCase).filter(WelfareCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found")

    personnel = case.personnel
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel associated with case not found")

    if case.trigger_prediction:
        init_score = float(case.trigger_prediction.risk_score)
        init_level = case.trigger_prediction.risk_level
    else:
        init_level = case.risk_level_at_creation or "orange"
        init_score = 0.85 if init_level == "red" else (0.65 if init_level == "orange" else 0.40)

    feats = build_feature_vector(personnel, db)
    live_preds = predict_batch([feats])
    curr_pred = live_preds[0]
    curr_score = float(curr_pred["risk_score"])
    curr_level = curr_pred["risk_level"]

    delta_risk = round(curr_score - init_score, 4)

    if delta_risk <= -0.15:
        recovery_status = "RECOVERING"
        cds = f"Favorable intervention response: Risk decreased by {abs(delta_risk):.2f} (from {init_score:.2f} to {curr_score:.2f})."
    elif delta_risk >= 0.10:
        recovery_status = "DETERIORATING"
        cds = f"Intervention resistance detected: Risk increased by {delta_risk:.2f} (from {init_score:.2f} to {curr_score:.2f}). Escalate intervention plan."
    else:
        recovery_status = "STATIC"
        cds = f"Equilibrium state: Minor risk variance ({delta_risk:+.2f}). Maintain close welfare monitoring."

    now = datetime.now(timezone.utc)
    if recovery_status == "RECOVERING" and curr_level in ("green", "yellow") and case.status == "intervention_active":
        case.outcome_notes = (case.outcome_notes or "") + f" [Reassessment {now.date()}: Risk normalized to {curr_score:.2f}]"

    db.commit()

    log_audit(
        db,
        current_user,
        request,
        resource_type="welfare_case_reassessment",
        resource_id=case_id,
        details={"delta_risk": delta_risk, "recovery_status": recovery_status}
    )

    return CaseReassessResponse(
        case_id=case.id,
        personnel_id=personnel.id,
        personnel_name=personnel.name,
        initial_risk_score=init_score,
        initial_risk_level=init_level,
        current_risk_score=curr_score,
        current_risk_level=curr_level,
        delta_risk=delta_risk,
        recovery_status=recovery_status,
        reassessed_at=now,
        clinical_decision_support=cds
    )


@router.post("/case/{case_id}/copilot-brief")
async def welfare_copilot_brief_alias(
    case_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    from routers.copilot import create_case_brief
    return await create_case_brief(case_id=case_id, request=request, req=None, current_user=current_user, db=db)


@router.post("/copilot/chat")
async def welfare_copilot_chat_alias(
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    from schemas.copilot import CopilotChatRequest
    from routers.copilot import copilot_chat
    body = await request.json()
    req = CopilotChatRequest(**body)
    return await copilot_chat(req=req, request=request, current_user=current_user, db=db)


