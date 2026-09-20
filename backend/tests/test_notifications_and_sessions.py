import pytest
from fastapi.testclient import TestClient
from database import SessionLocal, AuthSessionLocal
from models.user import User, TokenBlacklist
from models.personnel import Personnel
from models.notification import Notification
from services.notification_service import create_notification


def test_login_updates_history(client: TestClient, auth_db):
    user = auth_db.query(User).filter(User.username == "cmd_vikram").first()
    assert user is not None

    # First login
    resp1 = client.post("/api/auth/login", json={"username": "cmd_vikram", "password": "demo123"})
    assert resp1.status_code == 200

    auth_db.refresh(user)
    first_login = user.last_login_at
    assert first_login is not None

    # Second login
    resp2 = client.post("/api/auth/login", json={"username": "cmd_vikram", "password": "demo123"})
    assert resp2.status_code == 200

    auth_db.refresh(user)
    assert user.previous_login_at == first_login
    assert user.last_login_at >= first_login


def test_notification_creation_and_summary(client: TestClient, welfare_headers, db):
    # Create notification for welfare
    notif = create_notification(
        db=db,
        title="Urgent Welfare Escalation",
        message="Trooper medical assistance review requested.",
        recipient_role="welfare",
        priority="high",
        entity_type="grievance"
    )
    assert notif.id is not None

    # Fetch summary as welfare officer
    summary_resp = client.get("/api/notifications/summary", headers=welfare_headers)
    assert summary_resp.status_code == 200
    data = summary_resp.json()
    assert "unread_count" in data
    assert data["unread_count"] >= 1
    assert "since_previous_login_count" in data


def test_notification_read_state_persistence(client: TestClient, welfare_headers, db):
    notif = create_notification(
        db=db,
        title="Shift Trade Notice",
        message="Hungarian bipartite swap proposal generated.",
        recipient_role="welfare",
        priority="normal"
    )

    # Read single notification
    read_resp = client.put(f"/api/notifications/{notif.id}/read", headers=welfare_headers)
    assert read_resp.status_code == 200
    res_data = read_resp.json()
    assert res_data["is_read"] is True
    assert res_data["read_at"] is not None

    # Verify directly in database
    db.refresh(notif)
    assert notif.is_read is True
    assert notif.read_at is not None


def test_notification_mark_all_read(client: TestClient, welfare_headers, db):
    create_notification(db=db, title="Test 1", message="Alert 1", recipient_role="welfare")
    create_notification(db=db, title="Test 2", message="Alert 2", recipient_role="welfare")

    resp = client.put("/api/notifications/read-all", headers=welfare_headers)
    assert resp.status_code == 200

    summary = client.get("/api/notifications/summary", headers=welfare_headers).json()
    assert summary["unread_count"] == 0


def test_token_blacklisting_on_logout(client: TestClient):
    # 1. Login
    login_res = client.post("/api/auth/login", json={"username": "wo_meera", "password": "demo123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify token works
    me_res1 = client.get("/api/auth/me", headers=headers)
    assert me_res1.status_code == 200
    assert me_res1.json()["username"] == "wo_meera"

    # 3. Logout with token
    logout_res = client.post("/api/auth/logout", headers=headers)
    assert logout_res.status_code == 204

    # 4. Attempt to use revoked token -> Must be rejected with 401
    me_res2 = client.get("/api/auth/me", headers=headers)
    assert me_res2.status_code == 401
    assert "Session has been terminated / token revoked" in me_res2.json()["detail"]


def test_grievance_filing_creates_live_notifications(client: TestClient, personnel_headers, db):
    trooper = db.query(Personnel).first()
    assert trooper is not None

    payload = {
        "personnel_id": trooper.id,
        "request_type": "leave",
        "category": "emergency_medical",
        "description": "Urgent family hospitalization leave request.",
        "start_date": "2026-06-01",
        "end_date": "2026-06-10"
    }
    file_resp = client.post("/api/grievance/file", headers=personnel_headers, json=payload)
    assert file_resp.status_code == 200
    g_id = file_resp.json()["id"]

    # Verify notification was inserted into the database
    notif = db.query(Notification).filter(
        Notification.entity_id == g_id,
        Notification.recipient_role == "welfare"
    ).first()
    assert notif is not None
    assert "emergency_medical" in notif.message
    assert notif.priority == "normal" or notif.priority == "urgent"


def test_delete_single_notification(client: TestClient, welfare_headers, db):
    # 1. Fetch welfare notifications
    res = client.get("/api/notifications?limit=5", headers=welfare_headers)
    assert res.status_code == 200
    notifs = res.json()
    if not notifs:
        # Create a test notification
        from services.notification_service import create_notification
        create_notification(db=db, title="Test Notification", message="Test Message", recipient_role="welfare")
        res = client.get("/api/notifications?limit=5", headers=welfare_headers)
        notifs = res.json()
    
    target_id = notifs[0]["id"]
    # 2. Delete notification
    del_res = client.delete(f"/api/notifications/{target_id}", headers=welfare_headers)
    assert del_res.status_code == 200
    assert del_res.json()["id"] == target_id

    # 3. Verify it cannot be deleted again (404)
    del_res2 = client.delete(f"/api/notifications/{target_id}", headers=welfare_headers)
    assert del_res2.status_code == 404


def test_clear_all_notifications(client: TestClient, personnel_headers, db):
    # 1. Ensure at least one notification exists for personnel
    from services.notification_service import create_notification
    create_notification(db=db, title="Clear Me 1", message="To be deleted", recipient_role="personnel")
    create_notification(db=db, title="Clear Me 2", message="To be deleted", recipient_role="personnel")

    # 2. Call clear-all
    clear_res = client.delete("/api/notifications/clear-all", headers=personnel_headers)
    assert clear_res.status_code == 200
    assert clear_res.json()["cleared_count"] >= 2

    # 3. Verify list is now empty (or 0 unread)
    list_res = client.get("/api/notifications", headers=personnel_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0

