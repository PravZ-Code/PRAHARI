import pytest
from fastapi.testclient import TestClient
from main import app as fastapi_app

@pytest.fixture
def client():
    return TestClient(fastapi_app)

def test_personnel_multi_user_isolation_lifecycle(client):
    """
    Validates complete multi-user lifecycle:
    1. Login as Personnel A (rajesh_kumar)
    2. Read & update A's profile
    3. File a request for A
    4. Verify A sees A's data
    5. Logout A
    6. Login as Personnel B (ankit_sharma)
    7. Verify B sees ONLY B's profile and NOT A's profile/requests
    8. File request for B
    9. Logout B
    10. Re-login as A, verify A's data is still intact
    11. Verify strict authorization: A cannot access B's records
    """
    # 1. Login as Personnel A
    resp_a = client.post("/api/auth/login", json={"username": "rajesh_kumar", "password": "demo123"})
    assert resp_a.status_code == 200, f"Login failed for A: {resp_a.text}"
    token_a = resp_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Read A's profile
    prof_a = client.get("/api/personnel/me", headers=headers_a)
    assert prof_a.status_code == 200
    assert prof_a.json()["name"] == "Rajesh Kumar"

    # Update A's profile (e.g. contact phone & company)
    update_a = client.put("/api/personnel/me", headers=headers_a, json={
        "contact_number": "9111111111",
        "company": "Alpha Special Guard"
    })
    assert update_a.status_code == 200
    assert update_a.json()["contact_number"] == "9111111111"
    assert update_a.json()["company"] == "Alpha Special Guard"

    # 3. File a request for A
    req_a = client.post("/api/grievance/submit", headers=headers_a, json={
        "request_type": "leave",
        "category": "family_emergency",
        "description": "Personnel A urgent family crisis"
    })
    assert req_a.status_code == 200
    a_request_id = req_a.json()["id"]

    # 4. Check A's requests
    status_a = client.get("/api/grievance/my-status", headers=headers_a)
    assert status_a.status_code == 200
    a_req_ids = [r["id"] for r in status_a.json()]
    assert a_request_id in a_req_ids

    # 5. Logout A (simulate clearing token/session on client)
    headers_a = {}

    # 6. Login as Personnel B
    resp_b = client.post("/api/auth/login", json={"username": "ankit_sharma", "password": "demo123"})
    assert resp_b.status_code == 200
    token_b = resp_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 7. Verify B sees B's profile and NOT A's
    prof_b = client.get("/api/personnel/me", headers=headers_b)
    assert prof_b.status_code == 200
    assert prof_b.json()["name"] == "Ankit Sharma"
    assert prof_b.json()["contact_number"] != "9111111111"
    assert prof_b.json()["company"] != "Alpha Special Guard"

    # Verify B does NOT see A's request in my-status
    status_b = client.get("/api/grievance/my-status", headers=headers_b)
    assert status_b.status_code == 200
    b_req_ids = [r["id"] for r in status_b.json()]
    assert a_request_id not in b_req_ids

    # 8. File request for B
    req_b = client.post("/api/grievance/submit", headers=headers_b, json={
        "request_type": "welfare",
        "category": "family_crisis",
        "description": "Personnel B welfare assistance needed"
    })
    assert req_b.status_code == 200
    b_request_id = req_b.json()["id"]

    # Verify B cannot inspect A's private request details
    leak_check = client.get(f"/api/grievance/{a_request_id}", headers=headers_b)
    assert leak_check.status_code == 403, f"B was able to view A's request! Code: {leak_check.status_code}"

    # 9. Logout B
    headers_b = {}

    # 10. Re-login as Personnel A
    re_login_a = client.post("/api/auth/login", json={"username": "rajesh_kumar", "password": "demo123"})
    assert re_login_a.status_code == 200
    headers_a_new = {"Authorization": f"Bearer {re_login_a.json()['access_token']}"}

    # Verify A's original profile changes remain intact
    re_prof_a = client.get("/api/personnel/me", headers=headers_a_new)
    assert re_prof_a.status_code == 200
    assert re_prof_a.json()["contact_number"] == "9111111111"
    assert re_prof_a.json()["company"] == "Alpha Special Guard"

    # Verify A sees their own request and NOT B's request
    re_status_a = client.get("/api/grievance/my-status", headers=headers_a_new)
    assert re_status_a.status_code == 200
    re_a_ids = [r["id"] for r in re_status_a.json()]
    assert a_request_id in re_a_ids
    assert b_request_id not in re_a_ids
