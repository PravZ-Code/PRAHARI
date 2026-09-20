from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from models.personnel import Personnel, Unit
from models.prediction import RiskPrediction, PersonalBaseline
from models.welfare_case import WelfareCase
from models.model_health import ModelHealthSnapshot
from ml.feature_engineering import build_feature_vector
from ml.predict import predict_batch
from ml.drift_detector import compute_distribution_drift
from ml.outcome_monitoring import (
    MIN_CALIBRATION_SAMPLE_SIZE,
    compute_observed_ece,
    refresh_matured_prediction_outcomes,
)

def run_batch_predictions(db: Session, unit_id: Optional[str] = None, model_version: Optional[str] = None) -> Dict[str, Any]:
    if model_version is None:
        from ml.predict import get_model_metadata
        model_version = get_model_metadata().get("model_version", "unknown")
    query = db.query(Personnel)
    if unit_id:
        query = query.filter(Personnel.unit_id == unit_id)
    personnel_list = query.all()

    now = datetime.now(timezone.utc)
    feature_dicts = []
    for p in personnel_list:
        feat = build_feature_vector(p, db)
        feature_dicts.append(feat)

    predictions = predict_batch(feature_dicts)

    distribution = {"green": 0, "yellow": 0, "orange": 0, "red": 0}
    cases_created = 0
    confidence_sum = 0.0
    quality_sum = 0.0

    for p, pred in zip(personnel_list, predictions):
        lvl = pred["risk_level"]
        distribution[lvl] = distribution.get(lvl, 0) + 1
        confidence_sum += pred["confidence_score"]
        quality_sum += pred["data_quality_score"]

        # Check existing baseline
        baseline = db.query(PersonalBaseline).filter(PersonalBaseline.personnel_id == p.id).first()
        b_type = baseline.baseline_type if baseline else "cohort"

        db_pred = RiskPrediction(
            personnel_id=p.id,
            predicted_at=now,
            risk_score=pred["risk_score"],
            risk_level=lvl,
            confidence_score=pred["confidence_score"],
            data_quality_score=pred["data_quality_score"],
            baseline_type=b_type,
            model_version=model_version,
            shap_values=pred["shap_values"],
            trajectory=pred.get("trajectory", "STABLE"),
            prob_7d=pred.get("prob_7d", pred["risk_score"]),
            prob_14d=pred.get("prob_14d", pred["risk_score"]),
            prob_30d=pred.get("prob_30d", pred["risk_score"]),
            abstention_flag=1 if pred.get("abstention_flag") else 0,
            abstention_reason=pred.get("abstention_reason"),
            signal_reliability=pred.get("signal_reliability", "high"),
            what_changed=pred.get("what_changed", {})
        )
        db.add(db_pred)

        # Auto-create welfare case for Orange or Red if none active
        if lvl in ("orange", "red"):
            active_case = db.query(WelfareCase).filter(
                WelfareCase.personnel_id == p.id,
                WelfareCase.status.in_(["pending", "acknowledged", "plan_created", "intervention_active", "escalated"])
            ).first()

            if not active_case:
                ack_hours = 12 if lvl == "red" else 24
                plan_hours = 48 if lvl == "red" else 72
                new_case = WelfareCase(
                    personnel_id=p.id,
                    triggered_by="model_alert",
                    trigger_prediction=db_pred,
                    risk_level_at_creation=lvl,
                    status="pending",
                    sla_acknowledge_deadline=now + timedelta(hours=ack_hours),
                    sla_plan_deadline=now + timedelta(hours=plan_hours)
                )
                db.add(new_case)
                cases_created += 1

    total_pred = len(personnel_list)
    avg_conf = (confidence_sum / total_pred) if total_pred > 0 else 0.8
    avg_qual = (quality_sum / total_pred) if total_pred > 0 else 0.85

    # Check drift against earlier snapshot if present
    earlier_snap = db.query(ModelHealthSnapshot).order_by(ModelHealthSnapshot.snapshot_date.asc()).first()
    drift_result = {"drift_detected": False, "drift_details": "Initial calibration baseline set."}
    if earlier_snap and earlier_snap.risk_distribution:
        drift_result = compute_distribution_drift(distribution, earlier_snap.risk_distribution)

    # ECE requires matured predicted-probability/outcome pairs from this exact model version.
    refresh_matured_prediction_outcomes(db, now)
    matured = db.query(RiskPrediction).filter(
        RiskPrediction.model_version == model_version,
        RiskPrediction.outcome_14d.is_not(None),
        RiskPrediction.abstention_flag == 0,
    ).all()
    outcome_pairs = [(float(item.prob_14d or item.risk_score), int(item.outcome_14d)) for item in matured]
    ece = compute_observed_ece(outcome_pairs) if len(outcome_pairs) >= MIN_CALIBRATION_SAMPLE_SIZE else None

    snapshot = ModelHealthSnapshot(
        snapshot_date=now,
        model_version=model_version,
        total_predictions=total_pred,
        risk_distribution=distribution,
        avg_confidence=avg_conf,
        avg_data_quality=avg_qual,
        calibration_error=ece,
        drift_detected=drift_result["drift_detected"],
        drift_details=drift_result["drift_details"]
    )
    db.add(snapshot)
    db.commit()

    return {
        "total_predicted": total_pred,
        "distribution": distribution,
        "cases_created": cases_created,
        "model_version": model_version,
        "matured_outcome_count": len(outcome_pairs),
    }
