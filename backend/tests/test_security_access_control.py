import pytest
from models.user import User
from models.personnel import Personnel, Unit
from models.grievance import GrievanceRequest
from middleware.rbac import create_access_token
from datetime import datetime, timezone, timedelta

def test_unauthenticated_request_is_denied(client):
    """CASE A: Unauthenticated requests to private endpoints must return 401 Unauthorized."""
    endpoints = [
        "/api/grievance/dummy-req-123",
        "/api/grievance/dummy-req-123/countdown",
        "/api/grievance/personnel/dummy-personnel-123/history",
        "/api/resilience/what-if-plans/dummy-personnel-123",
        "/api/resilience/recovery-tracking/dummy-personnel-123",
        "/api/grievance/my-requests",
        "/api/welfare/cases",
        "/api/commander/units"
    ]
    for ep in endpoints:
        resp = client.get(ep)
        assert resp.status_code in (401, 403), f"Endpoint {ep} did not require authentication: {resp.status_code}"

def test_legitimate_authenticated_user_access(client, db, personnel_headers):
    """CASE C: Authenticated User 1 can access their own private resources."""
    u1 = db.query(User).filter(User.username == "rajesh_kumar").first()
    assert u1 is not None and u1.personnel_id is not None
    p1 = db.query(Personnel).filter(Personnel.id == u1.personnel_id).first()
    assert p1 is not None

    # Ensure a grievance exists for User 1
    req = db.query(GrievanceRequest).filter(GrievanceRequest.personnel_id == p1.id).first()
    if not req:
        req = GrievanceRequest(
            personnel_id=p1.id,
            request_type="leave",
            category="family_emergency",
            reason="Mother hospitalized",
            is_fast_lane=True,
            status="filed",
            filed_at=datetime.now(timezone.utc),
            sla_deadline=datetime.now(timezone.utc) + timedelta(hours=12)
        )
        db.add(req)
        db.commit()
        db.refresh(req)

    # 1. User 1 views their own grievance
    resp = client.get(f"/api/grievance/{req.id}", headers=personnel_headers)
    assert resp.status_code == 200, f"User 1 failed to view own grievance: {resp.text}"
    assert resp.json()["id"] == req.id

    # 2. User 1 views their own history
    resp = client.get(f"/api/grievance/personnel/{p1.id}/history", headers=personnel_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1

    # 3. User 1 views their own what-if duty plan
    resp = client.get(f"/api/resilience/what-if-plans/{p1.id}", headers=personnel_headers)
    assert resp.status_code == 200
    assert resp.json()["personnel_id"] == p1.id

def test_cross_user_idor_access_denied(client, db, personnel_headers):
    """CASE B & D: User 2 requesting User 1's private records is strictly denied with 403 Forbidden."""
    u1 = db.query(User).filter(User.username == "rajesh_kumar").first()
    p1_id = u1.personnel_id

    # Create or find a distinct User 2
    u2 = db.query(User).filter(User.username == "user2_jawan_test").first()
    if not u2:
        from datetime import date
        p2 = Personnel(
            service_number="TEST-JAWAN-9999",
            name="Constable User Two",
            rank="Constable",
            trade="GD",
            unit_id=u1.unit_id,
            date_of_joining=date(2022, 1, 15),
            current_posting_date=date(2024, 6, 1),
            hard_area_months=6,
            total_transfers=2
        )
        db.add(p2)
        db.commit()
        db.refresh(p2)

        u2 = User(
            username="user2_jawan_test",
            password_hash="mockhash",
            role="personnel",
            personnel_id=p2.id,
            unit_id=u1.unit_id,
            is_active=True
        )
        db.add(u2)
        db.commit()
        db.refresh(u2)

    user2_token = create_access_token({
        "sub": u2.id,
        "username": u2.username,
        "role": u2.role,
        "personnel_id": u2.personnel_id,
        "unit_id": u2.unit_id
    })
    user2_headers = {"Authorization": f"Bearer {user2_token}"}

    # Find User 1's grievance
    req1 = db.query(GrievanceRequest).filter(GrievanceRequest.personnel_id == p1_id).first()
    assert req1 is not None

    # IDOR Test 1: User 2 tries to read User 1's grievance by ID
    resp = client.get(f"/api/grievance/{req1.id}", headers=user2_headers)
    assert resp.status_code == 403, f"IDOR Vulnerability! User 2 read User 1's grievance: {resp.status_code}"

    # IDOR Test 2: User 2 tries to read User 1's SLA countdown
    resp = client.get(f"/api/grievance/{req1.id}/countdown", headers=user2_headers)
    assert resp.status_code == 403, f"IDOR Vulnerability! User 2 read User 1's countdown: {resp.status_code}"

    # IDOR Test 3: User 2 tries to dump User 1's entire personnel grievance history
    resp = client.get(f"/api/grievance/personnel/{p1_id}/history", headers=user2_headers)
    assert resp.status_code == 403, f"IDOR Vulnerability! User 2 dumped User 1's history: {resp.status_code}"

    # IDOR Test 4: User 2 tries to query User 1's what-if duty schedule and fatigue
    resp = client.get(f"/api/resilience/what-if-plans/{p1_id}", headers=user2_headers)
    assert resp.status_code == 403, f"IDOR Vulnerability! User 2 queried User 1's what-if plan: {resp.status_code}"

    # IDOR Test 5: User 2 tries to track User 1's recovery
    resp = client.get(f"/api/resilience/recovery-tracking/{p1_id}", headers=user2_headers)
    assert resp.status_code == 403, f"IDOR Vulnerability! User 2 tracked User 1's recovery: {resp.status_code}"

def test_commander_cross_unit_boundary_denied(client, db, commander_bravo_headers):
    """Commander Bravo cannot access grievances or what-if plans of troops in Company Alpha."""
    u1 = db.query(User).filter(User.username == "rajesh_kumar").first()
    p1_id = u1.personnel_id
    req1 = db.query(GrievanceRequest).filter(GrievanceRequest.personnel_id == p1_id).first()

    # Commander Bravo tries to access Alpha soldier's grievance
    resp = client.get(f"/api/grievance/{req1.id}", headers=commander_bravo_headers)
    assert resp.status_code == 403, f"Cross-unit leak! Commander Bravo accessed Alpha grievance: {resp.status_code}"

    # Commander Bravo tries to dump Alpha soldier's history
    resp = client.get(f"/api/grievance/personnel/{p1_id}/history", headers=commander_bravo_headers)
    assert resp.status_code == 403, f"Cross-unit leak! Commander Bravo dumped Alpha history: {resp.status_code}"

    # Commander Bravo tries to access Alpha soldier's what-if plan
    resp = client.get(f"/api/resilience/what-if-plans/{p1_id}", headers=commander_bravo_headers)
    assert resp.status_code == 403, f"Cross-unit leak! Commander Bravo accessed Alpha what-if plan: {resp.status_code}"

def test_unlinked_user_my_requests_never_leaks_other_troops(client, db):
    """Ensure that calling /my-requests for an unlinked user returns [] and never defaults to Personnel.first()."""
    unlinked_user = db.query(User).filter(User.username == "unlinked_test_user").first()
    if not unlinked_user:
        unlinked_user = User(
            username="unlinked_test_user",
            password_hash="mockhash",
            role="personnel",
            personnel_id=None,
            unit_id=None,
            is_active=True
        )
        db.add(unlinked_user)
        db.commit()
        db.refresh(unlinked_user)

    token = create_access_token({
        "sub": unlinked_user.id,
        "username": unlinked_user.username,
        "role": unlinked_user.role,
        "personnel_id": None,
        "unit_id": None
    })
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/grievance/my-requests", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == [], f"Data leakage! Unlinked user received records: {resp.json()}"

def test_anti_caching_headers_present(client, personnel_headers):
    """Verify sensitive authenticated API responses set Cache-Control: no-store, no-cache, private."""
    resp = client.get("/api/grievance/my-requests", headers=personnel_headers)
    assert resp.status_code == 200
    cache_control = resp.headers.get("Cache-Control", "")
    assert "no-store" in cache_control, f"Cache-Control header missing 'no-store': {cache_control}"
    assert "private" in cache_control, f"Cache-Control header missing 'private': {cache_control}"
    assert resp.headers.get("Pragma") == "no-cache"
