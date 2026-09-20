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

def test_personnel_data_deletion_request_submission(client: TestClient, personnel_headers):
    """Jawans can submit an erasure/redaction request for voluntary self-reports under DPDP §12(3)."""
    payload = {
        "data_category": "voluntary_self_reports",
        "timeframe": "prior_to_last_30_days",
        "reason": "Requesting statutory erasure of past voluntary daily pulse notes under Section 12(3) DPDP Act 2023.",
        "affirmation": True
    }
    resp = client.post("/api/personnel/data-deletion", headers=personnel_headers, json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "tracking_id" in data
    assert data["status"] == "REGISTERED_UNDER_STATUTORY_REVIEW"
    assert data["sla_hours"] == 72
    assert "DPDP Act 2023" in data["message"]

    # Affirmation is required
    invalid_payload = {
        "data_category": "voluntary_self_reports",
        "reason": "Missing affirmation",
        "affirmation": False
    }
    resp_invalid = client.post("/api/personnel/data-deletion", headers=personnel_headers, json=invalid_payload)
    assert resp_invalid.status_code == 422

def test_confidentiality_boundary_contract(client: TestClient):
    """Publicly verifiable confidentiality boundary explaining role-based data firewalls."""
    resp = client.get("/api/personnel/confidentiality-boundary")
    assert resp.status_code == 200
    data = resp.json()
    assert "roles" in data
    assert "commander" in data["roles"]
    assert "strictly_firewalled_data" in data["roles"]["commander"]

def test_personnel_what_changed_telemetry(client: TestClient, personnel_headers):
    """Dedicated 'What Changed?' screen endpoint returns previous baseline, current state, changed factors, and direction."""
    resp = client.get("/api/personnel/what-changed", headers=personnel_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "personnel_id" in data
    assert "direction_of_change" in data
    assert data["direction_of_change"] in ["IMPROVING", "STABLE", "WORSENING_MODERATE", "WORSENING_CRITICAL"]
    assert "previous_baseline" in data
    assert "current_state" in data
    assert "changed_factors" in data
    assert len(data["changed_factors"]) >= 3
    for factor in data["changed_factors"]:
        assert "name" in factor
        assert "category" in factor
        assert "baseline_value" in factor
        assert "current_value" in factor
        assert "delta_numeric" in factor
        assert "explanation" in factor
    assert "summary" in data

def test_personnel_why_risk_changing_explainability(client: TestClient, personnel_headers):
    """Dedicated 'Why is my risk changing?' screen endpoint returns contributing factors, SHAP, baseline comparison, and statutory charter."""
    resp = client.get("/api/personnel/why-risk-changing", headers=personnel_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "personnel_id" in data
    assert "risk_score" in data
    assert "top_contributing_factors" in data
    assert len(data["top_contributing_factors"]) >= 3
    for factor in data["top_contributing_factors"]:
        assert "source_tag" in factor
        assert "contribution_score" in factor
        assert "impact_direction" in factor
    assert "shap_contributions" in data
    assert len(data["shap_contributions"]) >= 3
    assert "personal_baseline_comparison" in data
    for comp in data["personal_baseline_comparison"]:
        assert "metric" in comp
        assert "personal_baseline" in comp
        assert "current_observation" in comp
        assert "battalion_average" in comp
    assert "what_this_does_not_mean" in data
    assert len(data["what_this_does_not_mean"]) == 4
    # Check Section 21 statutory guarantees
    titles = [x["title"] for x in data["what_this_does_not_mean"]]
    assert any("Psychiatric" in t for t in titles)
    assert any("ACR" in t for t in titles)
    assert any("Firewall" in t for t in titles)

def test_personnel_recovery_timeline_lifecycle(client: TestClient, personnel_headers):
    """Dedicated recovery timeline endpoint returns structured 6-stage lifecycle."""
    resp = client.get("/api/personnel/recovery-timeline", headers=personnel_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "personnel_id" in data
    assert "current_stage" in data
    assert data["total_stages"] == 6
    assert "stages" in data
    assert len(data["stages"]) == 6
    stage_ids = [s["stage_id"] for s in data["stages"]]
    assert stage_ids == [
        "baseline",
        "risk_detected",
        "human_review",
        "intervention",
        "follow_up",
        "recovery_verified"
    ]
    for s in data["stages"]:
        assert "stage_number" in s
        assert "title" in s
        assert "status" in s
        assert s["status"] in ["completed", "current", "pending"]
        assert "authority" in s
        assert "statutory_seal" in s

