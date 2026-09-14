import pytest
from fastapi.testclient import TestClient


def test_mobile_login_endpoint(client: TestClient):
    """Verifies POST /api/auth/login directly matching mobile ApiService.login()"""
    resp = client.post("/api/auth/login", json={"username": "rajesh_kumar", "password": "demo123"})
    if resp.status_code == 429:
        pytest.skip("Rate limit cooldown active on /api/auth/login")
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "user" in data
    assert data["user"]["username"] == "rajesh_kumar"
    assert data["user"]["role"] in ("personnel", "soldier")


def test_mobile_personnel_me_endpoints(client: TestClient, personnel_headers: dict):
    """Verifies GET and PUT /api/personnel/me matching ApiService.getPersonnelProfile() and updatePersonnelProfile()"""
    headers = personnel_headers

    # 1. GET /api/personnel/me
    resp = client.get("/api/personnel/me", headers=headers)
    assert resp.status_code == 200
    profile = resp.json()
    assert "id" in profile
    assert "service_number" in profile
    assert "name" in profile
    assert "rank" in profile
    assert "trade" in profile
    assert "company" in profile
    assert "unit_id" in profile
    assert "unit_name" in profile
    assert "hard_area_months" in profile
    assert "total_transfers" in profile

    # 2. PUT /api/personnel/me
    updated_name = "Rajesh Kumar (Bandhu)"
    put_resp = client.put("/api/personnel/me", json={"name": updated_name, "trade": "Armorer"}, headers=headers)
    assert put_resp.status_code == 200
    updated_profile = put_resp.json()
    assert updated_profile["name"] == updated_name
    assert updated_profile["trade"] == "Armorer"

    # Reset back
    client.put("/api/personnel/me", json={"name": "Rajesh Kumar", "trade": "GD"}, headers=headers)


def test_mobile_assessment_endpoints(client: TestClient, personnel_headers: dict):
    """Verifies assessment dashboard, submission, and SOS help request"""
    headers = personnel_headers

    # 1. GET /api/assessment/my-dashboard
    resp = client.get("/api/assessment/my-dashboard", headers=headers)
    assert resp.status_code == 200
    dash = resp.json()
    assert isinstance(dash, dict)

    # 2. POST /api/assessment/submit (matches mobile AssessmentModel.toJson())
    submit_resp = client.post("/api/assessment/submit", json={
        "sleep_quality": 4,
        "sleep_hours": 7.0,
        "mood_score": 4,
        "energy_level": 4,
        "stress_level": 2,
        "appetite_score": 4,
        "social_connection": 4,
        "free_text": "Decompressed after 8-hour mandatory rest cycle",
        "is_offline_entry": False
    }, headers=headers)
    assert submit_resp.status_code in (200, 201)

    # 3. POST /api/assessment/help-request
    sos_resp = client.post("/api/assessment/help-request", json={
        "message": "Immediate peer assistance requested from Mobile App test."
    }, headers=headers)
    assert sos_resp.status_code in (200, 201)


def test_mobile_grievance_and_leave_endpoints(client: TestClient, personnel_headers: dict):
    """Verifies /api/grievance/submit, /my-status, and /history"""
    headers = personnel_headers

    # 1. POST /api/grievance/submit (alias)
    submit_resp = client.post("/api/grievance/submit", json={
        "request_type": "leave",
        "category": "family_emergency",
        "description": "Urgent family medical visit requested via mobile bandhu integration test.",
        "start_date": "2026-10-01",
        "end_date": "2026-10-10",
        "filing_channel": "mobile_prahari_bandhu"
    }, headers=headers)
    assert submit_resp.status_code in (200, 201)
    req_data = submit_resp.json()
    assert "id" in req_data
    assert req_data["category"] == "family_emergency"
    assert req_data["is_fast_lane"] is True
    assert req_data["sla_deadline_hours"] in (12, 24, 48, 72)

    # 2. GET /api/grievance/my-status (alias)
    status_resp = client.get("/api/grievance/my-status", headers=headers)
    assert status_resp.status_code == 200
    my_requests = status_resp.json()
    assert isinstance(my_requests, list)
    assert len(my_requests) > 0

    # 3. GET /api/grievance/history
    history_resp = client.get("/api/grievance/history", headers=headers)
    assert history_resp.status_code == 200
    history_items = history_resp.json()
    assert isinstance(history_items, list)


def test_mobile_buddy_and_copilot(client: TestClient, personnel_headers: dict):
    """Verifies anonymous buddy check signal and AI copilot interaction"""
    headers = personnel_headers

    # 1. POST /api/buddy/signal
    buddy_resp = client.post("/api/buddy/signal", json={
        "concern_level": 2,
        "concern_category": "sleep_deprivation"
    }, headers=headers)
    assert buddy_resp.status_code in (200, 201)

    # 2. POST /api/copilot/chat
    copilot_resp = client.post("/api/copilot/chat", json={
        "message": "What is the mandatory 8-hour rest rule under MHA Standing Order SO-04?",
        "conversation_history": []
    }, headers=headers)
    assert copilot_resp.status_code == 200
    chat_data = copilot_resp.json()
    assert "reply" in chat_data


def test_mobile_uro_roster_and_swaps(client: TestClient, personnel_headers: dict):
    """Verifies URO duty roster, pending swaps, and approval from mobile client"""
    headers = personnel_headers

    # 1. GET /api/uro/roster/alpha-srinagar-01
    roster_resp = client.get("/api/uro/roster/alpha-srinagar-01", headers=headers)
    assert roster_resp.status_code == 200
    roster_data = roster_resp.json()
    assert isinstance(roster_data, list)
    assert len(roster_data) > 0
    first_shift = roster_data[0]
    assert "id" in first_shift
    assert "personnel_id" in first_shift
    assert "personnel_name" in first_shift
    assert "shift_name" in first_shift
    assert "is_rest_compliant" in first_shift
    assert "risk_tag" in first_shift

    # 2. GET /api/uro/swaps/pending/alpha-srinagar-01
    swaps_resp = client.get("/api/uro/swaps/pending/alpha-srinagar-01", headers=headers)
    assert swaps_resp.status_code == 200
    swaps_data = swaps_resp.json()
    assert isinstance(swaps_data, list)
    assert len(swaps_data) > 0
    first_swap = swaps_data[0]
    assert "id" in first_swap
    assert "trade" in first_swap
    assert "person_a" in first_swap
    assert "person_b" in first_swap
    assert "risk_reduction_pct" in first_swap

    # 3. PUT /api/uro/result/{swap_id}/approve
    swap_id = first_swap["id"]
    approve_resp = client.put(f"/api/uro/result/{swap_id}/approve", json={"single_sign": True}, headers=headers)
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "approved"


def test_mobile_admin_audit_endpoints(client: TestClient, admin_headers: dict):
    """Verifies cryptographic audit chain verification and logs pagination"""
    headers = admin_headers

    # 1. GET /api/admin/audit/verify-chain
    chain_resp = client.get("/api/admin/audit/verify-chain", headers=headers)
    assert chain_resp.status_code == 200
    chain_data = chain_resp.json()
    assert chain_data["chain_status"] in ("INTACT", "COMPROMISED")
    assert "total_blocks" in chain_data
    assert "genesis_hash" in chain_data
    assert "current_tip_hash" in chain_data

    # 2. GET /api/admin/audit
    audit_resp = client.get("/api/admin/audit?page=1&per_page=10", headers=headers)
    assert audit_resp.status_code == 200
    audit_data = audit_resp.json()
    assert "logs" in audit_data
    assert "items" in audit_data
    assert isinstance(audit_data["items"], list)


def test_mobile_static_web_mount(client: TestClient):
    """Verifies that the compiled Flutter mobile web bundle is served directly at /mobile/"""
    resp = client.get("/mobile/")
    assert resp.status_code == 200
    assert "text/html" in resp.headers.get("content-type", "")
    assert "flutter.js" in resp.text or "prahari_mobile" in resp.text

