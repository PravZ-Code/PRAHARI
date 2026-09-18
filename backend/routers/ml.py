from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.model_health import ModelHealthSnapshot
from schemas.prediction import BatchPredictRequest, BatchPredictResponse
from schemas.model_health import ModelHealthResponse
from services.prediction_service import run_batch_predictions
from middleware.rbac import require_role

router = APIRouter()

@router.post("/predict-batch", response_model=BatchPredictResponse)
def trigger_batch_prediction(
    req: BatchPredictRequest,
    current_user: User = Depends(require_role("admin", "welfare")),
    db: Session = Depends(get_db)
):
    result = run_batch_predictions(db=db, unit_id=req.unit_id, model_version=req.model_version)
    return BatchPredictResponse(
        total_predicted=result["total_predicted"],
        distribution=result["distribution"],
        cases_created=result["cases_created"],
        model_version=result["model_version"]
    )

@router.get("/health", response_model=ModelHealthResponse)
def get_model_health(
    current_user: User = Depends(require_role("admin", "welfare", "commander")),
    db: Session = Depends(get_db)
):
    latest = db.query(ModelHealthSnapshot).order_by(ModelHealthSnapshot.snapshot_date.desc()).first()
    past_7d = db.query(ModelHealthSnapshot).order_by(ModelHealthSnapshot.snapshot_date.desc()).limit(7).all()

    latest_data = None
    if latest:
        latest_data = {
            "date": latest.snapshot_date.strftime("%Y-%m-%d"),
            "total_predictions": latest.total_predictions,
            "distribution": latest.risk_distribution,
            "avg_confidence": float(latest.avg_confidence),
            "avg_data_quality": float(latest.avg_data_quality),
            "calibration_error": float(latest.calibration_error) if latest.calibration_error is not None else 0.0,
            "drift_detected": latest.drift_detected
        }

    trend = [
        {
            "date": s.snapshot_date.strftime("%Y-%m-%d"),
            "avg_confidence": float(s.avg_confidence),
            "drift_detected": s.drift_detected
        }
        for s in reversed(past_7d)
    ]

    return ModelHealthResponse(
        model_version=latest.model_version if latest else "v2.0-defense-calibrated",
        latest_snapshot=latest_data,
        trend_7d=trend
    )

@router.get("/metrics")
def get_model_metrics(
    current_user: User = Depends(require_role("admin", "welfare", "commander")),
):
    """
    Returns full training metrics, AUROC, PR-AUC, ECE, Brier score, and feature importance rankings
    for the active calibrated defense model.
    """
    from ml.predict import get_model_metadata
    return get_model_metadata()
