import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from database import get_db
from models.user import User
from models.personnel import Personnel
from models.assessment import SelfAssessment
from models.welfare_case import WelfareCase
from models.prediction import RiskPrediction, PersonalBaseline
from schemas.assessment import (
    AssessmentSubmitRequest,
    AssessmentBulkSyncRequest,
    AssessmentHistoryResponse,
    HelpRequest
)
from schemas.prediction import PersonalDashboardResponse
from middleware.rbac import get_current_user, require_role

router = APIRouter()

@router.post("/submit", status_code=status.HTTP_201_CREATED)
def submit_assessment(
    data: AssessmentSubmitRequest,
    current_user: User = Depends(require_role("personnel", "admin")),
    db: Session = Depends(get_db)
):
    if not current_user.personnel_id:
        raise HTTPException(status_code=400, detail="Account is not mapped to a personnel profile")

    # Offline idempotency: check if client UUID already received
    if data.id:
        existing = db.query(SelfAssessment).filter(SelfAssessment.id == data.id).first()
        if existing:
            return {"id": existing.id, "assessed_at": existing.assessed_at, "message": "Assessment already recorded (idempotent)"}

    assessed_time = data.assessed_at or datetime.now(timezone.utc)

    record = SelfAssessment(
        id=data.id or str(uuid.uuid4()),
        personnel_id=current_user.personnel_id,
        assessed_at=assessed_time,
        sleep_quality=data.sleep_quality,
        sleep_hours=data.sleep_hours,
        mood_score=data.mood_score,
        energy_level=data.energy_level,
        stress_level=data.stress_level,
        appetite_score=data.appetite_score,
        social_connection=data.social_connection,
        free_text=data.free_text,
        is_offline_entry=data.is_offline_entry,
        synced_at=datetime.now(timezone.utc)
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {"id": record.id, "assessed_at": record.assessed_at, "message": "Assessment recorded"}

@router.post("/bulk-sync")
def bulk_sync_assessments(
    data: AssessmentBulkSyncRequest,
    current_user: User = Depends(require_role("personnel", "admin")),
    db: Session = Depends(get_db)
):
    if not current_user.personnel_id:
        raise HTTPException(status_code=400, detail="Account is not mapped to a personnel profile")

    synced_count = 0
    skipped_count = 0
    now = datetime.now(timezone.utc)

    for item in data.assessments[:30]:  # Cap at 30 items per batch
        assessed_time = item.assessed_at or now

        # Prevent duplicate submissions by client id or identical timestamp
        if item.id:
            existing = db.query(SelfAssessment).filter(SelfAssessment.id == item.id).first()
        else:
            existing = db.query(SelfAssessment).filter(
                SelfAssessment.personnel_id == current_user.personnel_id,
                SelfAssessment.assessed_at == assessed_time
            ).first()

        if existing:
            skipped_count += 1
            continue

        rec = SelfAssessment(
            id=item.id or str(uuid.uuid4()),
            personnel_id=current_user.personnel_id,
            assessed_at=assessed_time,
            sleep_quality=item.sleep_quality,
            sleep_hours=item.sleep_hours,
            mood_score=item.mood_score,
            energy_level=item.energy_level,
            stress_level=item.stress_level,
            appetite_score=item.appetite_score,
            social_connection=item.social_connection,
            free_text=item.free_text,
            is_offline_entry=True,
            synced_at=now
        )
        db.add(rec)
        synced_count += 1

    db.commit()
    return {"synced": synced_count, "skipped": skipped_count, "message": "Bulk sync complete"}

@router.get("/my-history", response_model=AssessmentHistoryResponse)
def get_my_history(
    days: int = 30,
    current_user: User = Depends(require_role("personnel", "admin")),
    db: Session = Depends(get_db)
):
    if not current_user.personnel_id:
        raise HTTPException(status_code=400, detail="Not linked to personnel record")

    since = datetime.now(timezone.utc) - timedelta(days=days)
    records = db.query(SelfAssessment).filter(
        SelfAssessment.personnel_id == current_user.personnel_id,
        SelfAssessment.assessed_at >= since
    ).order_by(SelfAssessment.assessed_at.desc()).all()

    items = [
        {
            "id": r.id,
            "assessed_at": r.assessed_at,
            "sleep_quality": r.sleep_quality,
            "sleep_hours": float(r.sleep_hours),
            "mood_score": r.mood_score,
            "energy_level": r.energy_level,
            "stress_level": r.stress_level,
            "appetite_score": r.appetite_score,
            "social_connection": r.social_connection
        }
        for r in records
    ]

    return {"personnel_id": current_user.personnel_id, "assessments": items}

@router.get("/my-dashboard", response_model=PersonalDashboardResponse)
def get_personal_dashboard(
    current_user: User = Depends(require_role("personnel", "admin")),
    db: Session = Depends(get_db)
):
    if not current_user.personnel_id:
        raise HTTPException(status_code=400, detail="Not linked to personnel record")

    p = db.query(Personnel).filter(Personnel.id == current_user.personnel_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Personnel not found")

    latest_pred = db.query(RiskPrediction).filter(
        RiskPrediction.personnel_id == p.id
    ).order_by(RiskPrediction.predicted_at.desc()).first()

    pred_dict = {
        "risk_level": latest_pred.risk_level if latest_pred else "green",
        "risk_score": float(latest_pred.risk_score) if latest_pred else 0.20,
        "confidence": float(latest_pred.confidence_score) if latest_pred else 0.70,
        "data_quality": float(latest_pred.data_quality_score) if latest_pred else 0.85,
        "baseline_type": latest_pred.baseline_type if latest_pred else "cohort",
        "predicted_at": latest_pred.predicted_at if latest_pred else datetime.now(timezone.utc)
    }

    # 30-day risk trend
    since_30 = datetime.now(timezone.utc) - timedelta(days=30)
    past_preds = db.query(RiskPrediction).filter(
        RiskPrediction.personnel_id == p.id,
        RiskPrediction.predicted_at >= since_30
    ).order_by(RiskPrediction.predicted_at.asc()).all()

    trend = [
        {"date": pr.predicted_at.strftime("%Y-%m-%d"), "risk_score": float(pr.risk_score)}
        for pr in past_preds
    ]

    total_assessments = db.query(SelfAssessment).filter(SelfAssessment.personnel_id == p.id).count()
    baseline = db.query(PersonalBaseline).filter(PersonalBaseline.personnel_id == p.id).first()
    b_conf = float(baseline.confidence) if baseline else 0.65
    days_left = max(0, 90 - total_assessments)

    return {
        "personnel_id": p.id,
        "name": p.name,
        "rank": p.rank,
        "current_risk": pred_dict,
        "risk_trend": trend,
        "baseline_confidence": b_conf,
        "assessments_submitted": total_assessments,
        "days_until_personalized": days_left
    }

@router.post("/help-request", status_code=status.HTTP_201_CREATED)
def request_help(
    req: HelpRequest,
    current_user: User = Depends(require_role("personnel", "admin")),
    db: Session = Depends(get_db)
):
    if not current_user.personnel_id:
        raise HTTPException(status_code=400, detail="Account not linked to personnel profile")

    now = datetime.now(timezone.utc)
    p = db.query(Personnel).filter(Personnel.id == current_user.personnel_id).first()

    # Immediate Red escalation, 4h acknowledge SLA, 24h action plan SLA
    case = WelfareCase(
        personnel_id=p.id,
        triggered_by="help_request",
        risk_level_at_creation="red",
        status="pending",
        sla_acknowledge_deadline=now + timedelta(hours=4),
        sla_plan_deadline=now + timedelta(hours=24),
        intervention_notes=req.message or "Immediate confidential assistance requested by personnel via PRAHARI system."
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    return {
        "message": "Your request has been received with highest priority. A dedicated welfare officer will reach out immediately.",
        "case_id": case.id
    }
