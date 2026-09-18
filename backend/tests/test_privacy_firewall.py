import pytest
from fastapi.testclient import TestClient

def test_commander_blocked_from_welfare_cases(client: TestClient, commander_alpha_headers):
    """MHA Privacy Directive: Commanders must NEVER see clinical case rosters."""
    resp = client.get("/api/welfare/cases", headers=commander_alpha_headers)
    assert resp.status_code == 403
    assert "Access forbidden" in resp.json()["detail"]

def test_commander_blocked_from_welfare_case_detail(client: TestClient, commander_alpha_headers, sample_welfare_case_id):
    """MHA Privacy Directive: Commanders cannot query individual welfare dossiers."""
    if not sample_welfare_case_id:
        pytest.skip("No sample welfare case found in DB")
    resp = client.get(f"/api/welfare/case/{sample_welfare_case_id}", headers=commander_alpha_headers)
    assert resp.status_code == 403

def test_commander_blocked_from_exporting_dossier_pdf(client: TestClient, commander_alpha_headers, sample_welfare_case_id):
    """MHA Privacy Directive: Court of Inquiry medical/welfare dossiers are barred from commanders."""
    if not sample_welfare_case_id:
        pytest.skip("No sample welfare case found in DB")
    resp = client.get(f"/api/welfare/case/{sample_welfare_case_id}/export-dossier", headers=commander_alpha_headers)
    assert resp.status_code == 403

def test_commander_blocked_from_copilot_brief(client: TestClient, commander_alpha_headers, sample_welfare_case_id):
    """MHA Privacy Directive: AI Copilot clinical briefs contain confidential psych stress catalysts."""
    if not sample_welfare_case_id:
        pytest.skip("No sample welfare case found in DB")
    resp = client.post(f"/api/copilot/brief/{sample_welfare_case_id}", headers=commander_alpha_headers, json={})
    assert resp.status_code == 403

    resp_get = client.get(f"/api/copilot/brief/{sample_welfare_case_id}", headers=commander_alpha_headers)
    assert resp_get.status_code == 403

def test_commander_blocked_from_copilot_chat(client: TestClient, commander_alpha_headers, sample_welfare_case_id):
    """MHA Privacy Directive: Commanders cannot chat with Copilot regarding soldier stress cases."""
    resp = client.post("/api/copilot/chat", headers=commander_alpha_headers, json={
        "message": "What is the soldier's clinical stress level?",
        "case_id": sample_welfare_case_id
    })
    assert resp.status_code == 403

def test_welfare_officer_allowed_clinical_access(client: TestClient, welfare_headers, sample_welfare_case_id):
    """Welfare officers possess legitimate statutory clearance to access welfare cases."""
    resp = client.get("/api/welfare/cases", headers=welfare_headers)
    assert resp.status_code == 200
    assert "cases" in resp.json()

    if sample_welfare_case_id:
        resp_detail = client.get(f"/api/welfare/case/{sample_welfare_case_id}", headers=welfare_headers)
        assert resp_detail.status_code == 200

def test_bola_commander_cross_unit_forbidden(client: TestClient, commander_alpha_headers, bravo_unit_id):
    """BOLA / IDOR Protection: Commander assigned to Alpha cannot inspect Bravo unit."""
    assert bravo_unit_id is not None
    endpoints = [
        f"/api/commander/unit/{bravo_unit_id}/readiness",
        f"/api/commander/unit/{bravo_unit_id}/risk-distribution",
        f"/api/commander/unit/{bravo_unit_id}/workload-trends",
        f"/api/commander/unit/{bravo_unit_id}/fatigue"
    ]
    for ep in endpoints:
        resp = client.get(ep, headers=commander_alpha_headers)
        assert resp.status_code == 403, f"Expected 403 on {ep}, got {resp.status_code}"
        assert "outside assigned command" in resp.json()["detail"]

    # Also test URO cross-unit optimization trigger
    resp_opt = client.post(
        f"/api/uro/optimize/{bravo_unit_id}",
        headers=commander_alpha_headers,
        json={
            "roster_date_start": "2026-03-01",
            "roster_date_end": "2026-03-07",
            "max_swaps": 5
        }
    )
    assert resp_opt.status_code == 403
    assert "outside assigned command" in resp_opt.json()["detail"]

def test_commander_own_unit_allowed(client: TestClient, commander_alpha_headers, alpha_unit_id):
    """Commander querying their own command succeeds with operational aggregates."""
    assert alpha_unit_id is not None
    resp = client.get(f"/api/commander/unit/{alpha_unit_id}/readiness", headers=commander_alpha_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["unit_id"] == alpha_unit_id
    assert "readiness_score" in data
    assert "readiness_trend" in data

def test_admin_cross_unit_oversight_allowed(client: TestClient, admin_headers, bravo_unit_id):
    """Admin roles maintain multi-formation operational oversight."""
    resp = client.get(f"/api/commander/unit/{bravo_unit_id}/readiness", headers=admin_headers)
    assert resp.status_code == 200

def test_unauthenticated_audit_chain_verify_blocked(client: TestClient, admin_headers):
    """Ledger verification endpoint requires authentication."""
    resp_unauth = client.get("/api/admin/audit/verify-chain")
    assert resp_unauth.status_code in (401, 403)

    resp_auth = client.get("/api/admin/audit/verify-chain", headers=admin_headers)
    assert resp_auth.status_code == 200
    assert resp_auth.json()["chain_status"] in ("INTACT", "COMPROMISED")

def test_uro_clinical_redaction_for_commander(client: TestClient, commander_alpha_headers, welfare_headers, alpha_unit_id):
    """MHA Privacy Directive: URO Duty Swaps shown to Commander must redact clinical labels and percentages."""
    req_body = {
        "roster_date_start": "2026-03-01",
        "roster_date_end": "2026-03-07",
        "max_swaps": 5
    }
    # 1. Commander triggers or views URO
    resp_cmd = client.post(f"/api/uro/optimize/{alpha_unit_id}", headers=commander_alpha_headers, json=req_body)
    assert resp_cmd.status_code == 200
    data_cmd = resp_cmd.json()
    run_id = data_cmd["run_id"]

    for swap in data_cmd["swaps"]:
        # Clinical badges must be replaced with operational labels
        assert swap["person_a"]["risk_level"] == "rotation_due"
        assert swap["person_a"].get("clinical_redacted") is True
        assert swap["person_b"]["risk_level"] == "rest_compliant"
        assert swap["person_b"].get("clinical_redacted") is True
        # Percentages must be zeroed out
        assert swap["projected_risk_change_a"]["from"] == 0.0
        assert swap["projected_risk_change_a"]["to"] == 0.0
        assert swap["projected_risk_change_b"]["from"] == 0.0
        assert swap["projected_risk_change_b"]["to"] == 0.0

    # 2. Welfare officer views same URO run - clinical data is preserved for clinical casework
    resp_welfare = client.get(f"/api/uro/result/{run_id}", headers=welfare_headers)
    assert resp_welfare.status_code == 200
    data_welfare = resp_welfare.json()
    for swap in data_welfare["swaps"]:
        assert swap["person_a"]["risk_level"] in ("red", "orange")
        assert swap["person_b"]["risk_level"] in ("green", "yellow")
        assert swap["projected_risk_change_a"]["from"] > 0.0

