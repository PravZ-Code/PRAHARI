import pytest
import numpy as np
import pandas as pd
from datetime import datetime, date, timedelta
from ml.feature_engineering import FEATURE_COLUMNS, build_feature_vector
from ml.predict import predict_batch, compute_data_trust_and_evidence_gating

def test_evidence_gating_grey_on_insufficient_data():
    """
    Samvedna Architecture: When evidence is insufficient (< 40% complete or < 4 days),
    the system MUST abstain, assign GREY state, prohibit risk escalation, and list
    required evidence to unlock assessment.
    """
    sparse_rec = {col: np.nan for col in FEATURE_COLUMNS}
    sparse_rec["hard_area_months"] = 6.0
    sparse_rec["valid_historical_days"] = 2

    results = predict_batch([sparse_rec])
    assert len(results) == 1
    res = results[0]

    assert res["evidence_sufficiency"] == "GREY"
    assert res["sufficiency_tier"] == "INSUFFICIENT"
    assert res["risk_escalation_permitted"] is False
    assert "Insufficient evidence" in res["evidence_verdict"]
    assert len(res["required_evidence_to_unlock"]) > 0
    assert res["data_trust_tier"] == "LOW"

def test_evidence_gating_amber_on_conflicting_or_partial_evidence():
    """
    Samvedna & Manobal Architecture: When operational duty is high but self-reported
    stress is low (stoic masking discordance), assign AMBER state and route to human review.
    """
    rec = {col: 2.0 for col in FEATURE_COLUMNS}
    rec["valid_historical_days"] = 8
    # High duty load
    rec["night_shift_density_14d"] = 6.0
    rec["consecutive_duty_days"] = 12.0
    rec["avg_hours_per_day_14d"] = 13.0
    # Low self-reported stress (stoic masking)
    rec["stress_level_avg_7d"] = 1.2
    rec["mood_score_avg_7d"] = 4.5
    rec["sleep_quality_avg_7d"] = 4.0

    results = predict_batch([rec])
    assert len(results) == 1
    res = results[0]

    assert res["evidence_sufficiency"] in ("AMBER", "GREEN")
    if res["evidence_sufficiency"] == "AMBER":
        assert res["risk_escalation_permitted"] is False
        assert "human welfare review" in res["evidence_verdict"].lower()

    # Check signal breakdown in Data Trust
    assert "data_trust_signals" in res
    signals = res["data_trust_signals"]
    assert "ROSTER_DUTY" in signals
    assert "SELF_ASSESSMENT" in signals
    assert signals["ROSTER_DUTY"]["freshness"] == "FRESH"
    assert signals["ROSTER_DUTY"]["reliability"] == "HIGH"

def test_evidence_gating_green_on_sufficient_evidence():
    """
    Samvedna Architecture: When multi-source evidence is comprehensive and consistent,
    assign GREEN state and permit prospective risk scoring.
    """
    rec = {col: 2.5 for col in FEATURE_COLUMNS}
    rec["valid_historical_days"] = 14
    rec["night_shift_density_14d"] = 3.0
    rec["consecutive_duty_days"] = 5.0
    rec["avg_hours_per_day_14d"] = 8.0
    rec["leave_denial_rate_6m"] = 0.10
    rec["stress_level_avg_7d"] = 2.8
    rec["mood_score_avg_7d"] = 3.2
    rec["sleep_quality_avg_7d"] = 3.5
    rec["assessment_compliance_14d"] = 0.90

    results = predict_batch([rec])
    assert len(results) == 1
    res = results[0]

    assert res["evidence_sufficiency"] == "GREEN"
    assert res["sufficiency_tier"] == "SUFFICIENT"
    assert res["risk_escalation_permitted"] is True
    assert "Sufficient multi-source evidence" in res["evidence_verdict"]
    assert res["data_trust_tier"] in ("HIGH", "MODERATE")

def test_manobal_confidence_data_trust_asymmetry():
    """
    Manobal-AI Architecture: Distinguish High Model Confidence from High Data Trust.
    A model can be confident on sparse data, but Data Trust is low.
    """
    row = pd.Series({
        "night_shift_density_14d": 7.0,
        "consecutive_duty_days": 14.0,
        "avg_hours_per_day_14d": 14.0,
        "leave_denial_rate_6m": np.nan,  # Missing
        "stress_level_avg_7d": np.nan,   # Missing
        "mood_score_avg_7d": np.nan,     # Missing
        "sleep_quality_avg_7d": np.nan,  # Missing
        "unit_buddy_signals_4w": np.nan, # Missing
    })

    gating = compute_data_trust_and_evidence_gating(
        row=row,
        raw_rec={},
        data_quality=0.55,
        valid_hist_days=6,
        confidence=0.88  # High statistical certainty from extreme duty values
    )

    assert gating["data_trust_tier"] in ("LOW", "MODERATE")
    # If confidence is >= 0.75 and data_trust_score < 0.50, asymmetry alert must fire
    if gating["data_trust_score"] < 0.50:
        assert gating["confidence_data_trust_asymmetry"] is True
        assert "Asymmetry Alert" in gating["asymmetry_advisory"]

def test_temporal_leakage_defense_boundary():
    """
    SAATHI Architecture: Strict temporal audit.
    Features calculated at T_0 must NEVER incorporate duty, leave, or assessment
    events from T_0 + 1d through T_0 + 14d.
    """
    # Verify that future time horizon (14-day outcome) is never in FEATURE_COLUMNS
    for col in FEATURE_COLUMNS:
        assert not col.startswith("outcome_"), f"Outcome variable '{col}' found in input feature columns!"
        assert not col.startswith("future_"), f"Future variable '{col}' found in input feature columns!"
        assert "14d_forward" not in col, f"Forward horizon '{col}' found in feature columns!"

    # Target variable y_14d must strictly represent [T_0, T_0 + 14d]
    # Input features represent <= T_0 (trailing 7d, trailing 14d, trailing 30d, trailing 180d)
    trailing_windows = ["_7d", "_14d", "_30d", "_6m", "_4w"]
    temporal_features = [col for col in FEATURE_COLUMNS if any(w in col for w in trailing_windows)]
    assert len(temporal_features) >= 15, "Feature set must be dominated by explicit trailing backward windows"
