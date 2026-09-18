import json
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from database import SessionLocal
from models.personnel import Personnel, Unit
from models.duty_roster import DutyRoster
from models.welfare_case import WelfareCase
from models.user import User
from services.command_attribution_service import compute_unit_welfare_debt
from tests.test_enterprise_features import _gateway_headers

def test_login_no_auto_registration_for_unonboarded_personnel(client: TestClient):
    """
    BUG-01: Verifies that an attacker cannot take over an unprovisioned soldier record
    by supplying their service number to /api/auth/login. Must return 401 Unauthorized.
    """
    db = SessionLocal()
    try:
        unit = db.query(Unit).first()
        if not unit:
            unit = Unit(name="Alpha Test Unit", operational_area="peace", authorized_strength=100)
            db.add(unit)
            db.commit()
            db.refresh(unit)

        # Create a personnel record that has NO corresponding User account
        test_srv = "TEST_UNPROVISIONED_999"
        existing = db.query(Personnel).filter(Personnel.service_number == test_srv).first()
        if not existing:
            p = Personnel(
                service_number=test_srv,
                name="Unonboarded Trooper",
                rank="Constable",
                unit_id=unit.id,
                date_of_joining=date.today(),
                current_posting_date=date.today()
            )
            db.add(p)
            db.commit()
    finally:
        db.close()

    # Attempt login with that service number and an arbitrary PIN
    res = client.post("/api/auth/login", json={"service_number": test_srv, "pin": "attacker_pin_123"})
    assert res.status_code == 401
    assert "Invalid username or password" in res.json()["detail"]

    # Verify no User account was secretly auto-created
    db2 = SessionLocal()
    try:
        created_user = db2.query(User).filter(User.username == test_srv.lower()).first()
        assert created_user is None
    finally:
        db2.close()

def test_ivr_unmapped_caller_emergency_case_created(client: TestClient):
    """
    BUG-02: Verifies that pressing DTMF digit 3 from an unknown caller phone
    creates a Priority RED emergency welfare case and returns DISPATCHED status.
    """
    body_data = {
        "call_sid": "CALL_UNMAPPED_911",
        "caller_phone": "+919999900000",
        "digits_pressed": "3"
    }
    raw_body = json.dumps(body_data, separators=(",", ":")).encode()
    res = client.post(
        "/api/gateway/ivr/dtmf",
        content=raw_body,
        headers={**_gateway_headers(raw_body), "Content-Type": "application/json"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "DISPATCHED"
    assert data["action_taken"] == "EMERGENCY_CALLBACK_TRIGGERED"
    assert data["case_created_id"] is not None

    db = SessionLocal()
    try:
        case = db.query(WelfareCase).filter(WelfareCase.id == data["case_created_id"]).first()
        assert case is not None
        assert case.risk_level_at_creation == "red"
        assert "+919999900000" in case.intervention_notes
    finally:
        db.close()

def test_rest_shifts_excluded_from_consecutive_duty_streaks():
    """
    BUG-04: Verifies that duty rosters marked as 'off' or 'rest' are excluded from
    calculating the 10+ consecutive day duty streak.
    """
    import uuid
    srv_num = f"TEST_REST_{uuid.uuid4().hex[:8]}"
    unit_name = f"Unit_{uuid.uuid4().hex[:8]}"
    db = SessionLocal()
    try:
        # Create an isolated unit and trooper
        test_unit = Unit(
            name=unit_name,
            operational_area="peace",
            authorized_strength=10
        )
        db.add(test_unit)
        db.commit()
        db.refresh(test_unit)

        trooper = Personnel(
            service_number=srv_num,
            name="Streak Test Soldier",
            rank="Constable",
            unit_id=test_unit.id,
            date_of_joining=date.today(),
            current_posting_date=date.today()
        )
        db.add(trooper)
        db.commit()
        db.refresh(trooper)

        # Insert 6 active duty days, followed by 1 REST day, then 6 active duty days
        # Total days = 13, but max continuous streak is only 6 (should NOT exceed 10)
        base_date = date.today() - timedelta(days=15)
        for i in range(6):
            r = DutyRoster(
                personnel_id=trooper.id,
                unit_id=test_unit.id,
                date=base_date + timedelta(days=i),
                shift_type="day",
                duty_type="patrol",
                hours=8.0
            )
            db.add(r)

        # Mandatory Rest day
        rest_day = DutyRoster(
            personnel_id=trooper.id,
            unit_id=test_unit.id,
            date=base_date + timedelta(days=6),
            shift_type="off",
            duty_type="rest",
            hours=0.0
        )
        db.add(rest_day)

        # Another 6 active duty days
        for i in range(7, 13):
            r = DutyRoster(
                personnel_id=trooper.id,
                unit_id=test_unit.id,
                date=base_date + timedelta(days=i),
                shift_type="day",
                duty_type="patrol",
                hours=8.0
            )
            db.add(r)
        db.commit()

        res = compute_unit_welfare_debt(db, test_unit.id)
        # Verify rest_deficit_pressure is minimal (base 15.0) and streaks_exceeded did not trigger (+12.0)
        assert "component_breakdown" in res
        assert res["component_breakdown"]["rest_deficit_pressure"] == 15.0
    finally:
        db.close()
