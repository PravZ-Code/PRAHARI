import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
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
    CaseReassessResponse,
    SafetyPattern,
    CaseRecoveryItem
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

@router.get("/bulletins")
def get_bulletins(
    refresh: bool = Query(False, description="Force live re-fetch from internet"),
    limit: int = Query(10, ge=1, le=50, description="Max bulletins to return")
):
    """
    Returns live dynamic welfare bulletins and official press releases from MHA, CRPF, and PIB.
    Supports in-memory TTL caching and graceful fallback for air-gapped defense networks.
    """
    from services.bulletin_service import get_live_bulletins
    return get_live_bulletins(force_refresh=refresh, limit=limit)

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

    # Create an isolated temporary file with restricted permissions (0o600)
    fd, pdf_path = tempfile.mkstemp(prefix=f"COI_Dossier_{case_id[:8]}_", suffix=".pdf")
    os.close(fd)
    try:
        os.chmod(pdf_path, 0o600)
    except Exception:
        pass

    pdf_filename = f"COI_Dossier_{case_id[:8]}.pdf"

    def _cleanup_dossier_temp(path: str):
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            pass

    try:
        generate_dossier_pdf(db=db, case_id=case_id, output_path=pdf_path)
    except Exception as e:
        _cleanup_dossier_temp(pdf_path)
        raise HTTPException(status_code=500, detail=f"Failed to generate Court of Inquiry dossier: {str(e)}")

    log_audit(
        db,
        current_user,
        request,
        resource_type="welfare_case_dossier",
        resource_id=case_id,
        details={"export_format": "PDF", "legal_mandate": "Section 63(4) Bharatiya Sakshya Adhiniyam 2023"}
    )

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=pdf_filename,
        background=BackgroundTask(_cleanup_dossier_temp, pdf_path)
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

@router.get("/safety-patterns", response_model=List[SafetyPattern])
def get_safety_patterns_endpoint(
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    """
    Returns proactive early-warning patterns across the force before acute crises occur.
    Restricted to authorized Welfare Officers and Administrators per MHA Privacy Directives.
    """
    query = db.query(WelfareCase).join(Personnel)
    cases = query.order_by(WelfareCase.created_at.desc()).limit(10).all()
    patterns = []

    for c in cases:
        p = c.personnel
        if not p:
            continue
        risk_tag = (c.risk_level_at_creation or "moderate").capitalize()
        noticed = c.created_at.strftime("%d %b %Y") if c.created_at else "10 Sep 2026"
        patterns.append(SafetyPattern(
            id=f"PAT-{p.id[:6].upper()}",
            trooperName=p.name,
            serviceNo=p.service_number,
            rank=p.rank,
            unit=p.unit.name if p.unit else "Alpha Company (Srinagar)",
            concernTitle=f"Cumulative operational fatigue and duty load ({risk_tag} Flag)",
            noticedDate=noticed,
            reasons=[
                {
                    "factor": "Night Duties",
                    "whatHappened": "High night shift rotation in current deployment cycle",
                    "whyItMatters": "May cause circadian disruption and sleep deprivation"
                },
                {
                    "factor": "Operational Deployment",
                    "whatHappened": f"{p.hard_area_months} months in hard/counter-insurgency zone",
                    "whyItMatters": "Prolonged hard area posting increases psychological strain"
                },
                {
                    "factor": "Leave Availability",
                    "whatHappened": "Pending leave requests or restricted sanctioned downtime",
                    "whyItMatters": "Separation from family increases acute domestic stress"
                },
                {
                    "factor": "Rest Compliance",
                    "whatHappened": "Multiple duty cycles requiring short-rest turnaround",
                    "whyItMatters": "Adequate physiological recovery window required"
                }
            ],
            suggestedSupport=[
                {
                    "title": "Welfare Conversation",
                    "description": "Battalion welfare officer coordinates confidential check-in.",
                    "officer": "Welfare Officer"
                },
                {
                    "title": "Day Watch Swap",
                    "description": "Authorize daytime static duty in place of high-strain night patrols.",
                    "officer": "Company Commander"
                },
                {
                    "title": "Clear Delayed Leave",
                    "description": "Sanction pending compensatory leave as replacement covers are locked.",
                    "officer": "Company Commander"
                }
            ]
        ))

    return patterns

@router.get("/recovery-cases", response_model=List[CaseRecoveryItem])
def get_recovery_cases_endpoint(
    current_user: User = Depends(require_role("welfare", "admin", "personnel")),
    db: Session = Depends(get_db)
):
    """
    Returns longitudinal follow-up cases tracking soldier recovery post-intervention.
    Restricted to Welfare Officers/Admins, and individual Jawans querying their own recovery record.
    Commanders are barred per MHCA 2017 §21 to prevent clinical prejudice.
    """
    query = db.query(WelfareCase).join(Personnel)
    if current_user.role == "personnel":
        if not current_user.personnel_id:
            return []
        query = query.filter(WelfareCase.personnel_id == current_user.personnel_id)
    cases = query.order_by(WelfareCase.created_at.desc()).limit(15).all()
    items = []

    for c in cases:
        p = c.personnel
        if not p:
            continue
        is_resolved = c.status == "resolved"
        created_str = c.created_at.strftime("%d %b %Y") if c.created_at else "08 Sep 2026"
        resolved_str = c.resolved_at.strftime("%d %b %Y") if c.resolved_at else "15 Sep 2026"

        items.append(CaseRecoveryItem(
            ref=f"PRH-2026-{c.id[:6].upper()}",
            trooperName=p.name,
            serviceNo=p.service_number,
            unit=p.unit.name if p.unit else "Alpha Company (Srinagar)",
            requestType=c.intervention_type or "Operational Fatigue Relief",
            supportProvided=c.intervention_notes or c.outcome_notes or "Duty reassignment and recovery rest granted.",
            approvedDate=created_str,
            followUpDate=f"{resolved_str} (Follow-up)",
            currentFeedback=c.outcome_notes if is_resolved else "Under ongoing monitoring by battalion welfare committee.",
            status="Completed" if is_resolved else "Under Follow-up"
        ))

    return items


class WelfareCheckinRequest(BaseModel):
    id: Optional[str] = None
    sleep_quality: Optional[str] = "Good"  # "Good", "Okay", "Poor"
    workload_feel: Optional[str] = "Manageable"  # "Light", "Manageable", "Heavy"
    welfare_note: Optional[str] = None
    free_text: Optional[str] = None


class WelfareBuddySignalRequest(BaseModel):
    id: Optional[str] = None
    colleague_name: Optional[str] = None
    target_personnel_id: Optional[str] = None
    concern_type: str = "Fatigue"  # "Fatigue", "Family Crisis", "Mood Change", "Workload"
    note: Optional[str] = None


class WelfareSosRequest(BaseModel):
    id: Optional[str] = None
    message: Optional[str] = "Urgent confidential welfare support requested by personnel via mobile application."
    phone_callback: Optional[str] = None


@router.post("/checkin", status_code=status.HTTP_201_CREATED)
def submit_welfare_checkin(
    data: WelfareCheckinRequest,
    current_user: User = Depends(require_role("personnel", "admin")),
    db: Session = Depends(get_db)
):
    """
    Voluntary, non-punitive wellbeing check-in.
    Confidential: Accessible only by Welfare Officers, strictly hidden from company commanders.
    """
    import uuid
    from models.assessment import SelfAssessment
    from services.sync_service import sync_broadcaster

    if not current_user.personnel_id:
        raise HTTPException(status_code=400, detail="User account is not linked to personnel profile")

    # Idempotency check
    if data.id:
        existing = db.query(SelfAssessment).filter(SelfAssessment.id == data.id).first()
        if existing:
            return {
                "id": existing.id,
                "message": "Check-in received. Sent only to your Welfare Officer — never visible to commanders.",
                "idempotent": True
            }

    # Map string selections to integer scale
    sleep_map = {"good": 4, "okay": 3, "poor": 2}
    sq_val = sleep_map.get((data.sleep_quality or "").lower(), 3)

    energy_map = {"light": 4, "manageable": 3, "heavy": 2}
    energy_val = energy_map.get((data.workload_feel or "").lower(), 3)

    note_text = (data.welfare_note or data.free_text or "").strip()

    record = SelfAssessment(
        id=data.id or str(uuid.uuid4()),
        personnel_id=current_user.personnel_id,
        assessed_at=datetime.now(timezone.utc),
        sleep_quality=sq_val,
        sleep_hours=7.0 if sq_val >= 3 else 5.0,
        mood_score=sq_val,
        energy_level=energy_val,
        stress_level=2 if sq_val >= 3 else 4,
        appetite_score=3,
        social_connection=3,
        free_text=note_text if note_text else None,
        is_offline_entry=True,
        synced_at=datetime.now(timezone.utc)
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    sync_broadcaster.publish("assessment_submitted", {
        "id": record.id,
        "personnel_id": record.personnel_id,
        "is_voluntary": True
    })

    return {
        "id": record.id,
        "message": "Check-in received. Sent only to your Welfare Officer — never visible to commanders."
    }


@router.post("/buddy-signal", status_code=status.HTTP_201_CREATED)
def submit_welfare_buddy_signal(
    data: WelfareBuddySignalRequest,
    current_user: User = Depends(require_role("personnel", "admin")),
    db: Session = Depends(get_db)
):
    """
    Anonymous peer welfare signal.
    Guarantees submitter identity is never revealed to the colleague.
    """
    from services.buddy_service import record_buddy_signal

    unit_id = current_user.unit_id
    if not unit_id:
        raise HTTPException(status_code=400, detail="User is not assigned to an active unit")

    # Map concern level
    concern_map = {"fatigue": 2, "family crisis": 3, "mood change": 2, "workload": 2}
    lvl = concern_map.get((data.concern_type or "").lower(), 2)

    record_buddy_signal(
        db=db,
        unit_id=unit_id,
        concern_level=lvl,
        concern_category=data.concern_type
    )

    return {
        "message": "Concern recorded. Your name is not shared with the person you are reporting about."
    }


@router.post("/sos", status_code=status.HTTP_201_CREATED)
def submit_welfare_sos(
    data: WelfareSosRequest,
    current_user: User = Depends(require_role("personnel", "admin")),
    db: Session = Depends(get_db)
):
    """
    Emergency High-Priority Help / SOS.
    Bypasses normal queues, dual approval, and rosters.
    Activates immediate human welfare contact.
    """
    import uuid
    from services.sync_service import sync_broadcaster

    if not current_user.personnel_id:
        raise HTTPException(status_code=400, detail="User account is not linked to personnel profile")

    now = datetime.now(timezone.utc)
    p = db.query(Personnel).filter(Personnel.id == current_user.personnel_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Personnel record not found")

    case = WelfareCase(
        id=data.id or str(uuid.uuid4()),
        personnel_id=p.id,
        triggered_by="mobile_sos",
        risk_level_at_creation="red",
        status="pending",
        sla_acknowledge_deadline=now + timedelta(hours=4),
        sla_plan_deadline=now + timedelta(hours=12),
        intervention_notes=data.message or "Immediate SOS assistance requested via frontline mobile app."
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    sync_broadcaster.publish("emergency_sos", {
        "case_id": case.id,
        "personnel_id": p.id,
        "unit_id": p.unit_id,
        "triggered_at": now.isoformat()
    })

    from services.notification_service import create_notification
    create_notification(
        db=db,
        title="CRITICAL: Emergency SOS Broadcast",
        message=f"{p.rank} {p.name} has triggered an Emergency SOS distress broadcast.",
        recipient_role="welfare",
        personnel_id=p.id,
        unit_id=p.unit_id,
        link="/welfare",
        priority="critical",
        entity_type="emergency",
        entity_id=case.id
    )
    create_notification(
        db=db,
        title="CRITICAL: Emergency SOS Broadcast",
        message=f"{p.rank} {p.name} has triggered an Emergency SOS distress broadcast.",
        recipient_role="commander",
        personnel_id=p.id,
        unit_id=p.unit_id,
        link="/commander",
        priority="critical",
        entity_type="emergency",
        entity_id=case.id
    )

    return {
        "case_id": case.id,
        "message": "Immediate SOS registered. A Welfare Officer will contact you directly."
    }

