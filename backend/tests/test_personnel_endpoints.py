import pytest
from fastapi.testclient import TestClient

def test_personnel_access_log_allowed(client: TestClient, personnel_headers):
    """Jawans must be able to view their personal data access transparency log (Section 21)."""
    resp = client.get("/api/personnel/access-log", headers=personnel_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "personnel_id" in data
    assert "access_logs" in data
    assert "ledger_integrity_verified" in data
    assert data["ledger_integrity_verified"] is True
    assert "privacy_firewall_status" in data

def test_personnel_my_wellbeing_trajectory(client: TestClient, personnel_headers):
    """Jawans can inspect their own forward trajectory and 'What Changed?' summary."""
    resp = client.get("/api/personnel/my-wellbeing", headers=personnel_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "trajectory" in data
    assert data["trajectory"] in ["STABLE", "IMPROVING", "RISING", "RISING_RAPIDLY", "RECOVERING"]
    assert "multi_horizon_forecast" in data
    assert "prob_7d" in data["multi_horizon_forecast"]
    assert "prob_14d" in data["multi_horizon_forecast"]
    assert "prob_30d" in data["multi_horizon_forecast"]
    assert "what_changed" in data
    assert "statutory_confidentiality" in data

def test_personnel_data_correction_submission(client: TestClient, personnel_headers):
    """Jawans can submit a factual discrepancy dispute for duty roster or leave record."""
    payload = {
        "record_type": "duty_roster",
        "record_date": "2026-09-10",
        "disputed_field": "shift_type",
        "reported_value": "night",
        "claimed_value": "rest",
        "reason": "I was on approved rest cycle following 48h checkpoint duty as authorized by Coy 2IC."
    }
    resp = client.post("/api/personnel/data-correction", headers=personnel_headers, json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "tracking_id" in data
    assert data["status"] == "FILED_UNDER_REVIEW"
    assert "sla_deadline" in data

def test_confidentiality_boundary_contract(client: TestClient):
    """Publicly verifiable confidentiality boundary explaining role-based data firewalls."""
    resp = client.get("/api/personnel/confidentiality-boundary")
    assert resp.status_code == 200
    data = resp.json()
    assert "roles" in data
    assert "commander" in data["roles"]
    assert "strictly_firewalled_data" in data["roles"]["commander"]
