"""Regression tests for PRAHARI's safe and honest decision-support behavior."""

import numpy as np

from database import SessionLocal
from ml.feature_engineering import FEATURE_COLUMNS
from ml.outcome_monitoring import compute_observed_ece
from ml.predict import predict_batch
from ml.uro_optimizer import optimize_roster
from models.model_health import ModelHealthSnapshot
from models.personnel import Personnel
from routers.ml import get_model_health
import services.what_if_simulator_service as what_if


def test_none_features_are_normalized_and_abstain_safely():
    """External JSON nulls must not crash the predictor or become a risk score."""
    record = {feature: None for feature in FEATURE_COLUMNS}
    record.update({"hard_area_months": 12, "total_transfers": 2, "rank_encoded": 1})

    result = predict_batch([record])[0]

    assert result["abstention_flag"] is True
    assert result["risk_level"] == "insufficient_evidence"
    assert result["prediction_status"] == "abstained"


def test_missing_model_abstains_instead_of_emitting_a_fabricated_alert(tmp_path):
    """A missing artifact must be visible to users, never silently replaced with a guess."""
    record = {feature: np.nan for feature in FEATURE_COLUMNS}
    record.update({"hard_area_months": 12.0, "total_transfers": 2.0, "rank_encoded": 1.0})

    result = predict_batch([record], model_path=str(tmp_path / "missing-model.json"))[0]

    assert result["abstention_flag"] is True
    assert result["risk_level"] == "insufficient_evidence"
    assert result["prediction_status"] == "model_unavailable"
    assert result["confidence_score"] == 0.0


def test_counterfactual_never_overrides_an_unfavorable_model_result(monkeypatch):
    """The simulator must expose a no-benefit result instead of forcing an improvement."""
    db = SessionLocal()
    try:
        soldier = db.query(Personnel).first()
        assert soldier is not None

        predictions = iter([
            {
                "risk_score": 0.50, "risk_level": "yellow", "prob_7d": 0.50,
                "prob_14d": 0.50, "prob_30d": 0.50, "trajectory": "STABLE",
                "shap_values": [], "prediction_status": "ok",
            },
            {
                "risk_score": 0.80, "risk_level": "red", "prob_7d": 0.80,
                "prob_14d": 0.80, "prob_30d": 0.80, "trajectory": "RISING",
                "shap_values": [], "prediction_status": "ok",
            },
        ])
        monkeypatch.setattr(what_if, "predict_batch", lambda _: [next(predictions)])

        result = what_if.run_flagship_counterfactual_simulation(
            db=db, personnel_id=soldier.id, add_rest_days=1
        )

        assert result["projected_score"] == 0.80
        assert result["recommendation_status"] == "NO_MODELED_BENEFIT"
        assert result["stress_reduction_percentage"] == -60.0
    finally:
        db.close()


def test_roster_projection_preserves_the_replacement_baseline_score():
    """A proposal must show the replacement's real before-and-after values."""
    roster_date = "2026-09-20"
    result = optimize_roster(
        personnel_list=[
            {"id": "high", "name": "High", "trade": "GD", "risk_score": 0.70, "risk_level": "orange"},
            {"id": "low", "name": "Low", "trade": "GD", "risk_score": 0.20, "risk_level": "green"},
        ],
        roster_entries=[
            {"id": "shift-high", "personnel_id": "high", "date": roster_date, "shift_type": "night", "duty_type": "patrol", "hours": 10.0},
        ],
    )

    replacement_change = result["swaps"][0]["projected_risk_change_b"]
    assert replacement_change == {"from": 0.20, "to": 0.26}


def test_unmeasured_live_calibration_is_not_presented_as_an_ece():
    """Live health must distinguish a missing outcome measurement from a zero error."""
    db = SessionLocal()
    try:
        db.add(ModelHealthSnapshot(
            model_version="integrity-test",
            total_predictions=1,
            risk_distribution={"green": 1, "yellow": 0, "orange": 0, "red": 0},
            avg_confidence=0.80,
            avg_data_quality=0.80,
            calibration_error=None,
            drift_detected=False,
        ))
        db.flush()

        response = get_model_health(current_user=None, db=db)

        assert response.latest_snapshot.calibration_error is None
    finally:
        db.rollback()
        db.close()


def test_observed_ece_uses_matured_outcomes_not_confidence_or_data_quality():
    """Calibration is zero only when observed outcomes match their predicted probabilities."""
    assert compute_observed_ece([(0.0, 0), (1.0, 1)]) == 0.0
    assert compute_observed_ece([(0.0, 1), (1.0, 0)]) == 1.0
    assert compute_observed_ece([]) is None
