import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from ml.uro_optimizer import (
    are_trades_compatible,
    validate_rest_barrier,
    validate_fairness_cap,
    optimize_roster
)
from models.uro import URORun
from models.duty_roster import DutyRoster

def test_trade_compatibility_logic():
    assert are_trades_compatible("GD", "GD") is True
    assert are_trades_compatible("Armorer", "Armorer") is True
    assert are_trades_compatible("Radio Operator", "Radio Operator") is True
    assert are_trades_compatible("Medic", "Cook") is False
    assert are_trades_compatible("Armorer", "GD") is False
    assert are_trades_compatible(None, "GD") is True  # Default fallback

def test_rest_barrier_logic():
    # 2 shifts on same date without 8h rest
    d1 = date(2026, 3, 1)
    # Night shift ends at 06:00 on d1+1
    shift_night = {"date": d1, "shift_type": "night"}
    # Day shift starts at 08:00 on d1+1 -> 2 hours rest -> violates 8h barrier!
    shift_day_next = {"date": d1 + timedelta(days=1), "shift_type": "day"}
    assert validate_rest_barrier([shift_night, shift_day_next], min_rest_hours=8.0) is False

    # Day shift (08:00 - 16:00) followed by day shift next morning (08:00) -> 16 hours rest -> valid!
    shift_day_1 = {"date": d1, "shift_type": "day"}
    assert validate_rest_barrier([shift_day_1, shift_day_next], min_rest_hours=8.0) is True

def test_fairness_cap_logic():
    d = date(2026, 3, 1)
    # 3 heavy shifts within 7 days
    heavy_shifts_3 = [
        {"date": d, "shift_type": "night"},
        {"date": d + timedelta(days=2), "shift_type": "night"},
        {"date": d + timedelta(days=4), "shift_type": "split"}
    ]
    assert validate_fairness_cap(heavy_shifts_3, max_heavy_in_7d=2) is False

    # 2 heavy shifts within 7 days
    heavy_shifts_2 = [
        {"date": d, "shift_type": "night"},
        {"date": d + timedelta(days=3), "shift_type": "night"}
    ]
    assert validate_fairness_cap(heavy_shifts_2, max_heavy_in_7d=2) is True

def test_uro_optimization_endpoint_and_trade_matching(client: TestClient, admin_headers, alpha_unit_id):
    assert alpha_unit_id is not None

    req_body = {
        "roster_date_start": "2026-03-01",
        "roster_date_end": "2026-03-07",
        "max_swaps": 10,
        "protect_minimum_manning": True
    }
    resp = client.post(f"/api/uro/optimize/{alpha_unit_id}", headers=admin_headers, json=req_body)
    assert resp.status_code == 200, f"URO optimization failed: {resp.text}"
    data = resp.json()

    assert "run_id" in data
    assert data["unit_id"] == alpha_unit_id
    assert data["status"] == "proposed"
    assert "swaps" in data

    # Verify every swap matches trade MOS
    for swap in data["swaps"]:
        trade_a = swap["person_a"].get("trade")
        trade_b = swap["person_b"].get("trade")
        assert are_trades_compatible(trade_a, trade_b), f"Trade mismatch in swap: {trade_a} vs {trade_b}"

def test_uro_dual_signature_workflow(client: TestClient, commander_alpha_headers, welfare_headers, admin_headers, alpha_unit_id, db):
    # 1. Trigger run
    req_body = {
        "roster_date_start": "2026-03-01",
        "roster_date_end": "2026-03-07",
        "max_swaps": 5
    }
    resp_opt = client.post(f"/api/uro/optimize/{alpha_unit_id}", headers=commander_alpha_headers, json=req_body)
    assert resp_opt.status_code == 200
    run_id = resp_opt.json()["run_id"]

    # 2. First signature: Commander signs
    resp_sign1 = client.put(f"/api/uro/result/{run_id}/approve", headers=commander_alpha_headers, json={"role": "commander"})
    assert resp_sign1.status_code == 200
    data1 = resp_sign1.json()
    assert data1["commander_approved"] is True
    assert data1["welfare_approved"] is False
    assert data1["status"] == "partially_approved"
    assert data1["both_approved"] is False
    assert data1["roster_committed"] is False

    # 3. Second signature: Welfare Officer co-signs
    resp_sign2 = client.put(f"/api/uro/result/{run_id}/approve", headers=welfare_headers, json={"role": "welfare"})
    assert resp_sign2.status_code == 200
    data2 = resp_sign2.json()
    assert data2["commander_approved"] is True
    assert data2["welfare_approved"] is True
    assert data2["status"] == "approved"
    assert data2["both_approved"] is True
    assert data2["roster_committed"] is True

    # 4. Verify live database record
    run_db = db.query(URORun).filter(URORun.id == run_id).first()
    assert run_db is not None
    assert run_db.roster_committed is True
    assert run_db.status == "approved"

def test_uro_invalid_unit_not_found(client: TestClient, admin_headers):
    resp = client.post("/api/uro/optimize/non-existent-unit-uuid", headers=admin_headers, json={
        "roster_date_start": "2026-03-01",
        "roster_date_end": "2026-03-07"
    })
    assert resp.status_code == 404
