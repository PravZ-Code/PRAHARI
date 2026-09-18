import os
import json
import pytest
import numpy as np
import pandas as pd
from ml.predict import predict_batch, get_model_metadata
from ml.feature_engineering import FEATURE_COLUMNS

def test_model_meta_provenance_and_comparison():
    """Verifies that model_meta.json contains genuine zero-leakage benchmark comparison."""
    meta = get_model_metadata()
    assert "dataset" in meta
    assert meta["dataset"]["validation_strategy"] == "5-Fold StratifiedGroupKFold (Zero Soldier Leakage)"
    assert "model_comparison" in meta
    comp = meta["model_comparison"]
    for required_model in ["Logistic_Regression", "Random_Forest", "XGBoost_Standard", "Calibrated_XGBoost"]:
        assert required_model in comp
        assert "auroc" in comp[required_model]
        assert "pr_auc" in comp[required_model]
        assert "ece" in comp[required_model]
        assert "brier_score" in comp[required_model]

    # Calibrated XGBoost should have superior ECE (Expected Calibration Error)
    assert comp["Calibrated_XGBoost"]["ece"] <= 0.05

def test_predict_batch_multi_horizon_and_trajectory():
    """Verifies multi-horizon risk predictions, trajectory output, and source attribution tags."""
    # Synthetic complete record
    rec = {col: 1.0 for col in FEATURE_COLUMNS}
    rec["stress_level_avg_7d"] = 4.2
    rec["stress_level_avg_14d"] = 2.5
    rec["stress_level_trend"] = 0.25
    rec["night_shift_density_14d"] = 5.0
    rec["consecutive_duty_days"] = 12

    results = predict_batch([rec])
    assert len(results) == 1
    res = results[0]

    assert "risk_score" in res
    assert "prob_7d" in res
    assert "prob_14d" in res
    assert "prob_30d" in res
    assert "trajectory" in res
    assert res["trajectory"] in ["STABLE", "IMPROVING", "RISING", "RISING_RAPIDLY", "RECOVERING"]
    assert "what_changed" in res
    assert "summary" in res["what_changed"]
    assert "signal_reliability" in res
    assert res["abstention_flag"] is False

    # Check source attribution in SHAP factors
    assert "shap_values" in res
    assert len(res["shap_values"]) > 0
    for factor in res["shap_values"]:
        assert "source_category" in factor
        assert factor["source_category"] in ["HR", "Self-Report", "Wellness", "Peer Signal", "Operational"]
        assert "[" in factor["display_name"]  # Contains [HR], [Self-Report], etc.

def test_model_abstention_on_insufficient_data():
    """MHA Directive: Model must abstain when data completeness < 40% to prevent false-negative low-risk."""
    sparse_rec = {col: np.nan for col in FEATURE_COLUMNS}
    # Provide only 3 non-null features (< 15% completeness)
    sparse_rec["hard_area_months"] = 12.0
    sparse_rec["total_transfers"] = 2.0
    sparse_rec["rank_encoded"] = 1.0

    results = predict_batch([sparse_rec])
    assert len(results) == 1
    res = results[0]

    assert res["abstention_flag"] is True
    assert res["risk_level"] == "insufficient_evidence"
    assert "INSUFFICIENT_EVIDENCE" in res["abstention_reason"]
    assert res["data_quality_score"] < 0.40
