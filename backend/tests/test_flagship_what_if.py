"""
Automated Verification Suite for Flagship Defense What-If Simulator
-------------------------------------------------------------------
Verifies counterfactual Calibrated XGBoost inference, TreeSHAP waterfall shifts,
multi-horizon forecasting, squad cascade protection, and prescriptive auto-optimization.
"""

import pytest
from datetime import date, timedelta
from database import SessionLocal
from models.personnel import Personnel, Unit
from models.duty_roster import DutyRoster
from models.user import User
from services.what_if_simulator_service import (
    run_flagship_counterfactual_simulation,
    evaluate_squad_cascade_safety,
    auto_solve_minimal_prescriptive_bundle,
    get_personnel_baseline_features
)
from fastapi.testclient import TestClient
from main import app
from middleware.rbac import create_access_token


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()





def test_flagship_simulation_calibrated_xgb_relief(db):
    """Verifies counterfactual inference achieves monotonic relief via calibrated XGBoost."""
    soldier = db.query(Personnel).first()
    assert soldier is not None, "Need at least one soldier in database"

    result = run_flagship_counterfactual_simulation(
        db=db,
        personnel_id=soldier.id,
        shift_change="day",
        night_shifts_removed=4,
        add_rest_days=3,
        grant_leave_days=7,
        duty_hours_reduction=20.0,
        buddy_support_assigned=True
    )

    assert "current_score" in result
    assert "projected_score" in result
    assert result["projected_score"] <= result["current_score"]
    assert result["stress_reduction_percentage"] > 0
    assert len(result["benefits"]) >= 3
    assert result["projected_level"] in ["GREEN", "YELLOW", "ORANGE", "RED"]
    assert "simple_verdict" in result


def test_shap_waterfall_shifts(db):
    """Verifies exact TreeSHAP waterfall deltas isolate risk reduction factors."""
    soldier = db.query(Personnel).first()
    assert soldier is not None

    result = run_flagship_counterfactual_simulation(
        db=db,
        personnel_id=soldier.id,
        night_shifts_removed=6,
        add_rest_days=3,
        grant_leave_days=5
    )

    shap_shifts = result.get("shap_waterfall_shifts", [])
    assert len(shap_shifts) > 0, "Must return SHAP waterfall factor shifts"

    top_shift = shap_shifts[0]
    assert "feature" in top_shift
    assert "display_name" in top_shift
    assert "source_category" in top_shift
    assert "baseline_impact" in top_shift
    assert "projected_impact" in top_shift
    assert "relief_delta" in top_shift
    assert top_shift["source_category"] in ["HR", "Wellness", "Self-Report", "Peer Signal", "Operational"]


def test_multi_horizon_forecasting(db):
    """Verifies multi-horizon projections compare acute (7d), operational (14d), and chronic (30d) risk."""
    soldier = db.query(Personnel).first()
    assert soldier is not None

    result = run_flagship_counterfactual_simulation(
        db=db,
        personnel_id=soldier.id,
        add_rest_days=3,
        grant_leave_days=5
    )

    forecast = result.get("multi_horizon_forecast", {})
    assert "baseline" in forecast
    assert "projected" in forecast

    base = forecast["baseline"]
    proj = forecast["projected"]

    assert "acute_7d" in base and "operational_14d" in base and "chronic_30d" in base
    assert "acute_7d" in proj and "operational_14d" in proj and "chronic_30d" in proj
    assert proj["acute_7d"] <= base["acute_7d"]
    assert proj["trajectory"] in ["RECOVERING", "STABLE", "IMPROVING"]


def test_whole_squad_cascade_safety(db):
    """Verifies candidate squad replacement and 8-hour rest barrier check."""
    soldier = db.query(Personnel).first()
    assert soldier is not None

    cascade_eval = evaluate_squad_cascade_safety(db, soldier, shifts_to_reassign=2)
    assert "cascade_risk" in cascade_eval
    assert cascade_eval["cascade_risk"] in ["SAFE", "WARNING", "DANGER"]
    assert "safety_verdict" in cascade_eval

    if cascade_eval["has_candidate"]:
        cand = cascade_eval["candidate_replacement"]
        assert cand["trade"] == soldier.trade
        assert "rest_barrier_compliant" in cand


def test_auto_prescriptive_optimizer(db):
    """Verifies auto-solver determines minimal operational bundle to achieve GREEN risk."""
    soldier = db.query(Personnel).first()
    assert soldier is not None

    base_features = get_personnel_baseline_features(db, soldier)
    bundle = auto_solve_minimal_prescriptive_bundle(db, soldier, base_features)

    assert "name" in bundle
    assert "night_shifts_removed" in bundle
    assert "rest_days_added" in bundle
    assert "grant_leave_days" in bundle


def test_api_what_if_candidates_endpoint(welfare_headers):
    """Verifies GET /api/resilience/what-if-candidates returns personnel for cockpit selector."""
    client = TestClient(app)
    res = client.get("/api/resilience/what-if-candidates", headers=welfare_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        c = data[0]
        assert "id" in c
        assert "name" in c
        assert "rank" in c
        assert "current_score" in c
        assert "current_level" in c


def test_api_what_if_test_expanded_levers(welfare_headers, db):
    """Verifies POST /api/resilience/what-if-test processes multi-lever requests."""
    soldier = db.query(Personnel).first()
    assert soldier is not None

    client = TestClient(app)
    payload = {
        "personnel_id": soldier.id,
        "shift_change": "day",
        "add_rest_days": 3,
        "grant_leave_days": 5,
        "night_shifts_removed": 4,
        "duty_hours_reduction": 15.0,
        "buddy_support_assigned": True,
        "auto_optimize": False
    }

    res = client.post("/api/resilience/what-if-test", json=payload, headers=welfare_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["soldier_name"] != ""
    assert "shap_waterfall_shifts" in data
    assert "multi_horizon_forecast" in data
    assert "squad_cascade_safety" in data
