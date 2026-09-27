import os
import json
import pytest
import numpy as np
import pandas as pd
from ml.predict import predict_batch, get_model, get_model_metadata
from ml.feature_engineering import FEATURE_COLUMNS
from ml.train import MONOTONE_CONSTRAINTS, MONOTONE_CONSTRAINTS_TUPLE
from ml.cohort_builder import get_cached_cohort_templates, match_personnel_to_cohort, blend_baseline

def test_xgboost_monotonic_constraints_configuration():
    """Verify that the trained XGBoost model booster enforces monotonic constraints."""
    model, _ = get_model()
    assert model is not None, "Trained model must be available."
    
    # Check parameters on the XGBClassifier
    params = model.get_params()
    mono = params.get("monotone_constraints")
    assert mono is not None, "monotone_constraints must be configured on the XGBClassifier."
    
    # Check JSON metadata
    meta = get_model_metadata()
    assert "monotone_constraints" in meta, "monotone_constraints dictionary must be recorded in model_meta.json"
    assert meta["monotone_constraints"]["leave_denial_rate_6m"] == 1
    assert meta["monotone_constraints"]["consecutive_duty_days"] == 1
    assert meta["monotone_constraints"]["sleep_quality_avg_7d"] == -1
    assert meta["monotone_constraints"]["mood_score_avg_7d"] == -1

def test_monotonic_risk_drivers_increase_risk():
    """
    Empirical behavioral check: Increasing risk drivers must never decrease the predicted probability
    when all other factors are held constant.
    """
    base_rec = {col: 2.5 for col in FEATURE_COLUMNS}
    base_rec["valid_historical_days"] = 14
    
    # 1. leave_denial_rate_6m: 0.0 -> 0.2 -> 0.4 -> 0.6 -> 0.8 -> 1.0
    denial_rates = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]
    records = []
    for r in denial_rates:
        c = dict(base_rec)
        c["leave_denial_rate_6m"] = r
        records.append(c)
    
    preds = predict_batch(records)
    scores = [p["risk_score"] for p in preds]
    for idx in range(len(scores) - 1):
        assert scores[idx] <= scores[idx + 1] + 1e-5, (
            f"leave_denial_rate_6m monotonicity violated: {scores[idx]} > {scores[idx + 1]}"
        )

    # 2. consecutive_duty_days: 0 -> 4 -> 8 -> 12 -> 16 -> 20
    duty_days = [0, 4, 8, 12, 16, 20]
    records = []
    for d in duty_days:
        c = dict(base_rec)
        c["consecutive_duty_days"] = d
        records.append(c)
    
    preds = predict_batch(records)
    scores = [p["risk_score"] for p in preds]
    for idx in range(len(scores) - 1):
        assert scores[idx] <= scores[idx + 1] + 1e-5, (
            f"consecutive_duty_days monotonicity violated: {scores[idx]} > {scores[idx + 1]}"
        )

def test_monotonic_protective_factors_decrease_risk():
    """
    Empirical behavioral check: Increasing protective factors must never increase the predicted probability
    when all other factors are held constant.
    """
    base_rec = {col: 2.5 for col in FEATURE_COLUMNS}
    base_rec["valid_historical_days"] = 14
    
    # 1. sleep_quality_avg_7d: 1.0 -> 2.0 -> 3.0 -> 4.0 -> 5.0
    sleep_quals = [1.0, 2.0, 3.0, 4.0, 5.0]
    records = []
    for s in sleep_quals:
        c = dict(base_rec)
        c["sleep_quality_avg_7d"] = s
        records.append(c)
    
    preds = predict_batch(records)
    scores = [p["risk_score"] for p in preds]
    for idx in range(len(scores) - 1):
        assert scores[idx] >= scores[idx + 1] - 1e-5, (
            f"sleep_quality_avg_7d inverse monotonicity violated: {scores[idx]} < {scores[idx + 1]}"
        )

    # 2. mood_score_avg_7d: 1.0 -> 2.0 -> 3.0 -> 4.0 -> 5.0
    mood_scores = [1.0, 2.0, 3.0, 4.0, 5.0]
    records = []
    for m in mood_scores:
        c = dict(base_rec)
        c["mood_score_avg_7d"] = m
        records.append(c)
    
    preds = predict_batch(records)
    scores = [p["risk_score"] for p in preds]
    for idx in range(len(scores) - 1):
        assert scores[idx] >= scores[idx + 1] - 1e-5, (
            f"mood_score_avg_7d inverse monotonicity violated: {scores[idx]} < {scores[idx + 1]}"
        )

def test_confidence_and_data_quality_tiers():
    """Verify confidence score, data quality score, valid historical days, and confidence tiers."""
    # Complete high-history record
    full_rec = {col: 2.0 for col in FEATURE_COLUMNS}
    full_rec["valid_historical_days"] = 14
    
    res_high = predict_batch([full_rec])[0]
    assert res_high["valid_historical_days"] == 14
    assert res_high["history_confidence_tier"] == "HIGH"
    assert res_high["data_quality_score"] == 1.0
    assert res_high["confidence_score"] >= 0.75
    assert res_high["what_changed"]["valid_historical_days"] == 14
    assert res_high["what_changed"]["history_confidence_tier"] == "HIGH"

    # Moderate history (10 days)
    mid_rec = dict(full_rec)
    mid_rec["valid_historical_days"] = 10
    res_mid = predict_batch([mid_rec])[0]
    assert res_mid["valid_historical_days"] == 10
    assert res_mid["history_confidence_tier"] == "MEDIUM"

    # Low history (5 days)
    low_rec = dict(full_rec)
    low_rec["valid_historical_days"] = 5
    res_low = predict_batch([low_rec])[0]
    assert res_low["valid_historical_days"] == 5
    assert res_low["history_confidence_tier"] == "LOW"

    # Insufficient history (2 days)
    sparse_rec = dict(full_rec)
    sparse_rec["valid_historical_days"] = 2
    res_sparse = predict_batch([sparse_rec])[0]
    assert res_sparse["valid_historical_days"] == 2
    assert res_sparse["history_confidence_tier"] == "INSUFFICIENT"

def test_cold_start_cohort_system():
    """Verify that cold start cohort clustering produces valid templates and fallback blending."""
    cohorts = get_cached_cohort_templates()
    assert isinstance(cohorts, list), "Cached cohort templates must be a list."
    assert len(cohorts) == 6, "Expected 6 clustered operational cohort templates."
    
    sample_template = cohorts[0]
    assert "cohort_id" in sample_template
    assert "cohort_name" in sample_template
    assert "centroid" in sample_template
    assert "baseline_stats" in sample_template

    # Test matching a cold start profile to a cohort
    cold_start_profile = {
        "trade": "GD",
        "rank": "CT",
        "hard_area_months": 18,
        "total_transfers": 3,
        "age": 28
    }
    matched = match_personnel_to_cohort(cold_start_profile, cohorts)
    assert matched is not None
    assert "cohort_id" in matched

    # Test blending baseline across cold start maturation
    cohort_means = {"sleep_quality_avg_7d": 3.0, "stress_level_avg_7d": 2.5}
    personal_means = {"sleep_quality_avg_7d": 4.0, "stress_level_avg_7d": 1.5}

    # Day 0: 100% cohort template prior
    blended_0, conf_0, b_type_0 = blend_baseline(cohort_means, personal_means, days_active=0)
    assert b_type_0 == "cohort"
    assert blended_0["sleep_quality_avg_7d"] == 3.0
    assert conf_0 == 0.60

    # Day 45: 50% cohort, 50% individual (mixed)
    blended_45, conf_45, b_type_45 = blend_baseline(cohort_means, personal_means, days_active=45)
    assert b_type_45 == "mixed"
    assert blended_45["sleep_quality_avg_7d"] == 3.5
    assert conf_45 == pytest.approx(0.775, abs=0.01)

    # Day 90: 100% personalized baseline
    blended_90, conf_90, b_type_90 = blend_baseline(cohort_means, personal_means, days_active=90)
    assert b_type_90 == "personalized"
    assert blended_90["sleep_quality_avg_7d"] == 4.0
    assert conf_90 == 0.95
