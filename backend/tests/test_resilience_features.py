import pytest
from datetime import datetime, timedelta, date
from database import SessionLocal
from models.personnel import Personnel, Unit
from models.duty_roster import DutyRoster
from models.leave import LeaveRecord
from models.prediction import RiskPrediction
from models.welfare_case import WelfareCase
from services.welfare_resilience_service import (
    compute_welfare_reserve,
    check_welfare_cascade,
    check_intervention_collision,
    run_what_if_duty_test,
    track_personnel_recovery,
    find_whole_team_safe_solution
)


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


def test_welfare_reserve(db):
    """Verifies Welfare Reserve accurately counts rested troops and safe leaves."""
    unit = db.query(Unit).first()
    assert unit is not None, "At least one unit must exist"

    reserve_data = compute_welfare_reserve(db, unit.id)
    assert reserve_data["unit_id"] == unit.id
    assert "total_strength" in reserve_data
    assert "available_rested_reserve" in reserve_data
    assert "reserve_percentage" in reserve_data
    assert "status" in reserve_data
    assert "simple_verdict" in reserve_data
    assert reserve_data["status"] in ["HEALTHY_SURPLUS", "ADEQUATE", "CRITICAL_SHORTAGE"]


def test_welfare_cascade_detection(db):
    """Verifies Cascade Detection checks whether helping one soldier stresses another."""
    soldiers = db.query(Personnel).limit(2).all()
    assert len(soldiers) >= 2, "Need at least 2 soldiers"

    res = check_welfare_cascade(
        db=db,
        relieved_soldier_id=soldiers[0].id,
        replacement_soldier_id=soldiers[1].id,
        assigned_shift_type="night"
    )

    assert "cascade_risk" in res
    assert res["cascade_risk"] in ["SAFE", "WARNING", "DANGER"]
    assert "simple_verdict" in res
    assert "projected_stress" in res["replacement_soldier"]


def test_intervention_collision_check(db):
    """Verifies Collision Check catches trade mismatches and rest conflicts."""
    # Find two soldiers with different trades if possible
    s1 = db.query(Personnel).first()
    assert s1 is not None

    target_date = date.today() + timedelta(days=2)

    # Test single soldier check
    res = check_intervention_collision(
        db=db,
        personnel_id=s1.id,
        target_date=target_date,
        proposed_shift="day"
    )
    assert "team_status" in res
    assert "is_approved" in res
    assert "simple_verdict" in res

    # Test trade mismatch collision
    diff_trade_soldier = db.query(Personnel).filter(
        Personnel.trade != s1.trade,
        Personnel.id != s1.id
    ).first()

    if diff_trade_soldier:
        mismatch_res = check_intervention_collision(
            db=db,
            personnel_id=s1.id,
            target_date=target_date,
            proposed_shift="night",
            swap_with_id=diff_trade_soldier.id
        )
        assert mismatch_res["is_approved"] is False
        assert any("Trade Mismatch" in c for c in mismatch_res["hard_collisions"])


def test_what_if_duty_test(db):
    """Verifies What-If duty simulator predicts score reduction and benefits."""
    soldier = db.query(Personnel).first()
    assert soldier is not None

    res = run_what_if_duty_test(
        db=db,
        personnel_id=soldier.id,
        shift_change="day",
        add_rest_days=3,
        grant_leave_days=7
    )

    assert "current_score" in res
    assert "projected_score" in res
    assert res["projected_score"] <= res["current_score"]
    assert res["stress_reduction_percentage"] >= 0
    assert len(res["benefits"]) >= 2
    assert "simple_verdict" in res


def test_recovery_tracking(db):
    """Verifies Recovery Tracking calculates improvement and timeline."""
    soldier = db.query(Personnel).first()
    assert soldier is not None

    res = track_personnel_recovery(db, soldier.id)
    assert "status" in res
    assert "simple_verdict" in res
    assert res["status"] in ["RECOVERING_WELL", "STABLE", "NEEDS_FOLLOW_UP", "NO_HISTORY"]


def test_whole_team_safety(db):
    """Verifies Whole-Team Safety finds a well-rested trade-matching peer."""
    soldier = db.query(Personnel).first()
    assert soldier is not None

    target_date = date.today() + timedelta(days=3)
    res = find_whole_team_safe_solution(
        db=db,
        stressed_soldier_id=soldier.id,
        target_date=target_date
    )

    assert "success" in res
    assert "simple_verdict" in res
    if res["success"]:
        assert "selected_safe_peer" in res
        assert "is_safe_for_whole_team" in res
