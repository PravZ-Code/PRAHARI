"""
Unit and Integration Test Suite for Features 25 through 35:
- Feature 25: Structural Stress Attribution Index (SSAI / Reverse Lens)
- Feature 26: Personal Baseline & Deviation Detection
- Feature 27: 7/14/30-Day Welfare Trajectory
- Feature 28: Intervention Equity Audit
- Feature 29: Welfare Debt
- Feature 30: Welfare Resilience Reserve
- Feature 31: Intervention Effectiveness Registry
- Feature 32: Recovery Tracking / Recovery Guarantee
- Feature 33: Signal Discordance Detection (SMDI / SDI)
- Feature 34: Welfare Intervention Matching (URO Constraint Satisfaction)
- Feature 35: Macro Early-Warning Layer (Battalion Exhaustion & Macro-Reserve Escalation)
"""

import pytest
from datetime import date, timedelta
from database import SessionLocal
from models.personnel import Personnel, Unit
from services.command_attribution_service import (
    compute_structural_stress_attribution,
    compute_unit_welfare_debt
)
from services.welfare_resilience_service import (
    compute_welfare_reserve,
    compute_intervention_equity_audit,
    compute_intervention_effectiveness_registry,
    track_personnel_recovery,
    check_battalion_exhaustion_escalation
)
from services.conflict_service import analyze_evidence_conflict
from services.trend_service import analyze_personnel_trend
from ml.predict import predict_batch
from ml.uro_optimizer import optimize_roster, validate_rest_barrier, are_trades_compatible


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


def test_feature_25_ssai_calculation(db):
    """Feature 25: Structural Stress Attribution Index produces valid bounded score and insight."""
    unit = db.query(Unit).first()
    if not unit:
        pytest.skip("No unit in DB")
    res = compute_structural_stress_attribution(db, unit.id)
    assert 0.0 <= res["structural_stress_attribution_index"] <= 1.0
    assert res["status"] in ("BALANCED_COMMAND_PRACTICE", "SELF_CORRECTION_RECOMMENDED", "INSUFFICIENT_DATA")
    assert "private_commander_insight" in res
    assert "metrics" in res
    assert "unit_leave_denial_rate" in res["metrics"]


def test_feature_26_personal_baseline(db):
    """Feature 26: Personal Baseline & Deviation Detection."""
    p = db.query(Personnel).first()
    if not p:
        pytest.skip("No personnel in DB")
    res = analyze_personnel_trend(db, p.id)
    assert res.personnel_id == p.id
    assert len(res.baseline_comparisons) > 0
    # Verify baseline metrics contain deviation calculations
    for point in res.baseline_comparisons:
        assert hasattr(point, "metric_name")
        assert hasattr(point, "current_value")
        assert hasattr(point, "z_score_cohort")
        assert hasattr(point, "status")


def test_feature_27_welfare_trajectory():
    """Feature 27: 7/14/30-Day Welfare Trajectory calculation."""
    sample_records = [
        {
            "night_shift_density_14d": 4,
            "consecutive_duty_days": 6,
            "avg_hours_per_day_14d": 9.5,
            "leave_denial_rate_6m": 0.25,
            "days_since_last_leave": 120,
            "hard_area_months": 18,
            "stress_level_avg_7d": 3.8,
            "stress_level_avg_14d": 2.2,
            "stress_level_trend": 0.12,
            "sleep_quality_avg_7d": 2.1,
            "sentiment_score_avg_7d": -0.4,
            "grievance_count_3m": 1,
            "peer_conflict_reports_3m": 0,
            "emergency_leave_requests_6m": 1,
            "valid_historical_days": 14,
            "data_quality_score": 0.95
        }
    ]
    preds = predict_batch(sample_records)
    assert len(preds) == 1
    p = preds[0]
    assert "prob_7d" in p
    assert "prob_14d" in p
    assert "prob_30d" in p
    assert "trajectory" in p
    assert 0.0 <= p["prob_7d"] <= 1.0
    assert 0.0 <= p["prob_14d"] <= 1.0
    assert 0.0 <= p["prob_30d"] <= 1.0
    assert p["trajectory"] in ("RISING_RAPIDLY", "RISING", "STABLE", "IMPROVING", "RECOVERING", "INDETERMINATE")


def test_feature_28_intervention_equity_audit(db):
    """Feature 28: Intervention Equity Audit detects helper burden skew."""
    unit = db.query(Unit).first()
    if not unit:
        pytest.skip("No unit in DB")
    res = compute_intervention_equity_audit(db, unit.id)
    assert "is_equity_alert" in res
    assert "equity_disparity_ratio" in res
    assert "overburdened_count" in res
    assert "available_rested_count" in res
    assert "full_roster_distribution" in res


def test_feature_29_welfare_debt(db):
    """Feature 29: Welfare Debt composite computation."""
    unit = db.query(Unit).first()
    if not unit:
        pytest.skip("No unit in DB")
    res = compute_unit_welfare_debt(db, unit.id)
    assert 0.0 <= res["welfare_debt_score"] <= 100.0
    assert res["welfare_debt_level"] in ("LOW", "MODERATE", "HIGH", "CRITICAL")
    assert "primary_contributors" in res


def test_feature_30_welfare_reserve(db):
    """Feature 30: Welfare Reserve calculates ready reserve and safe leaves."""
    unit = db.query(Unit).first()
    if not unit:
        pytest.skip("No unit in DB")
    res = compute_welfare_reserve(db, unit.id)
    assert res["available_rested_reserve"] >= 0
    assert 0.0 <= res["reserve_percentage"] <= 100.0
    assert "safe_emergency_leaves_possible" in res
    assert res["status"] in ("HEALTHY_SURPLUS", "ADEQUATE", "CRITICAL_SHORTAGE")


def test_feature_31_intervention_effectiveness(db):
    """Feature 31: Intervention Effectiveness Registry returns standardized categories."""
    res = compute_intervention_effectiveness_registry(db)
    assert len(res["registry"]) == 5
    assert "top_performing_intervention" in res
    assert "data_maturity_notice" in res
    # Verify each entry in the registry contains required performance keys
    for entry in res["registry"]:
        assert "intervention_id" in entry
        assert "name" in entry
        assert "improvement_percentage" in entry
        assert "avg_recovery_time_days" in entry


def test_feature_32_recovery_tracking(db):
    """Feature 32: Recovery tracking returns delta and status."""
    p = db.query(Personnel).first()
    if not p:
        pytest.skip("No personnel in DB")
    res = track_personnel_recovery(db, p.id)
    assert res["status"] in ("RECOVERING_WELL", "STABLE", "NEEDS_FOLLOW_UP", "NO_HISTORY")
    assert "recovery_percentage" in res
    assert "simple_verdict" in res


def test_feature_33_signal_discordance(db):
    """Feature 33: Signal Discordance Index (SMDI) calculation."""
    p = db.query(Personnel).first()
    if not p:
        pytest.skip("No personnel in DB")
    res = analyze_evidence_conflict(db, p.id)
    assert res.signal_discordance_index is not None
    assert 0.0 <= res.signal_discordance_index <= 1.0
    assert res.conflict_type in (
        "CONCORDANT_WELLNESS",
        "CONCORDANT_ACUTE_STRAIN",
        "DISCORDANT_LOW_SELF_REPORT",
        "DISCORDANT_HIGH_SUBJECTIVE_STRAIN"
    )
    assert 0.0 <= res.organizational_burden_score <= 1.0


def test_feature_34_uro_constraints():
    """Feature 34: URO strictly respects trade compatibility and 8h rest barrier."""
    # 1. Trade compatibility
    assert are_trades_compatible("Armorer", "Armorer") is True
    assert are_trades_compatible("Armorer", "Radio Operator") is False
    assert are_trades_compatible("GD", "GD") is True

    # 2. Rest barrier: 2h rest between night shift ending 06:00 and day shift starting 08:00
    shifts_bad = [
        {"date": "2026-10-01", "shift_type": "night"},
        {"date": "2026-10-02", "shift_type": "day"}
    ]
    assert validate_rest_barrier(shifts_bad, min_rest_hours=8.0) is False

    # 3. Rest barrier: 26h rest between day shift ending 16:00 and night shift starting next day 20:00
    shifts_good = [
        {"date": "2026-10-01", "shift_type": "day"},
        {"date": "2026-10-02", "shift_type": "night"}
    ]
    assert validate_rest_barrier(shifts_good, min_rest_hours=8.0) is True


def test_feature_35_battalion_exhaustion_escalation(db):
    """Feature 35: Battalion exhaustion check returns escalation policy."""
    unit = db.query(Unit).first()
    if not unit:
        pytest.skip("No unit in DB")
    res = check_battalion_exhaustion_escalation(db, unit.id)
    assert "systemic_exhaustion_flag" in res
    assert "escalation_level" in res
    assert "recommended_tactical_actions" in res
    assert len(res["recommended_tactical_actions"]) >= 1
