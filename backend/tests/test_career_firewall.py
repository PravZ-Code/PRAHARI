import pytest
from fastapi.testclient import TestClient

def test_career_firewall_blocks_appraisal_context(client: TestClient, welfare_headers, sample_welfare_case_id):
    """
    Statutory Privacy: Mental Healthcare Act 2017 §21.
    Individual welfare cases and psychological assessments cannot be queried for ACR/APAR career appraisals.
    """
    if not sample_welfare_case_id:
        pytest.skip("No sample welfare case found in DB")

    headers_with_career = dict(welfare_headers)
    headers_with_career["X-Request-Purpose"] = "annual_confidential_appraisal"

    resp = client.get(f"/api/welfare/case/{sample_welfare_case_id}", headers=headers_with_career)
    assert resp.status_code == 403
    data = resp.json()
    assert "CAREER_FIREWALL_BLOCK" in data["detail"]
    assert "MHCA-2017-SEC21-CAREER-ISOLATION" in data["firewall_rule"]

def test_career_firewall_blocks_promotion_board(client: TestClient, welfare_headers, sample_welfare_case_id):
    """Departmental Promotion Committee (DPC) is legally barred from querying soldier stress files."""
    if not sample_welfare_case_id:
        pytest.skip("No sample welfare case found in DB")

    headers_with_dpc = dict(welfare_headers)
    headers_with_dpc["X-System-Origin"] = "crpf_dpc_promotion_portal"

    resp = client.get(f"/api/welfare/case/{sample_welfare_case_id}", headers=headers_with_dpc)
    assert resp.status_code == 403
    assert "promotion" in resp.json()["detail"].lower()

def test_career_firewall_blocks_disciplinary_inquiry(client: TestClient, welfare_headers, sample_welfare_case_id):
    """Disciplinary inquiries and courts of inquiry cannot access predictive strain files."""
    if not sample_welfare_case_id:
        pytest.skip("No sample welfare case found in DB")

    headers_with_disc = dict(welfare_headers)
    headers_with_disc["X-Request-Purpose"] = "disciplinary_proceedings"

    resp = client.get(f"/api/welfare/case/{sample_welfare_case_id}", headers=headers_with_disc)
    assert resp.status_code == 403
    assert "disciplinary" in resp.json()["detail"].lower()

def test_career_firewall_allows_legitimate_welfare_care(client: TestClient, welfare_headers, sample_welfare_case_id):
    """Legitimate welfare support queries without career tags are permitted for authorized officers."""
    if not sample_welfare_case_id:
        pytest.skip("No sample welfare case found in DB")

    headers_legit = dict(welfare_headers)
    headers_legit["X-Request-Purpose"] = "welfare_support_consultation"

    resp = client.get(f"/api/welfare/case/{sample_welfare_case_id}", headers=headers_legit)
    assert resp.status_code == 200

def test_career_firewall_status_endpoint(client: TestClient, admin_headers):
    """Admin endpoint confirms career firewall operational policy and active state."""
    resp = client.get("/api/admin/career-firewall/status", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["firewall_active"] is True
    assert data["boundary_state"] == "FAIL_CLOSED_ACTIVE"
    assert "Mental Healthcare Act 2017 Section 21" in data["policy"]

def test_career_firewall_verify_boundary_probe(client: TestClient, admin_headers):
    """Admin probe endpoint verifies interception of career queries."""
    resp = client.post("/api/admin/career-firewall/verify-boundary", headers=admin_headers, json={"purpose": "dpc_promotion_review"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["firewall_interception_result"] == "BLOCKED_403_FORBIDDEN"
    assert data["audit_event_logged"] is True
