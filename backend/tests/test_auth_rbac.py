import pytest
from fastapi.testclient import TestClient
from models.user import User

def test_system_health(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "operational"
    assert "version" in data
    # Verify enterprise observability headers
    assert "X-Request-ID" in resp.headers
    assert "X-Process-Time" in resp.headers

def test_login_success_all_roles(client: TestClient):
    roles = [
        ("admin_sys", "admin"),
        ("wo_meera", "welfare"),
        ("cmd_vikram", "commander"),
        ("rajesh_kumar", "personnel")
    ]
    for username, expected_role in roles:
        resp = client.post("/api/auth/login", json={
            "username": username,
            "password": "demo123"
        })
        assert resp.status_code == 200, f"Login failed for {username}: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == username
        assert data["user"]["role"] == expected_role

def test_login_invalid_password(client: TestClient):
    resp = client.post("/api/auth/login", json={
        "username": "admin_sys",
        "password": "wrongpassword123"
    })
    assert resp.status_code == 401
    assert "Invalid username or password" in resp.json()["detail"]

def test_login_nonexistent_user(client: TestClient):
    resp = client.post("/api/auth/login", json={
        "username": "ghost_trooper_9999",
        "password": "somepassword"
    })
    assert resp.status_code == 401
    assert "Invalid username or password" in resp.json()["detail"]

def test_login_deactivated_user(client: TestClient, db):
    # Temporarily deactivate an account
    user = db.query(User).filter(User.username == "ankit_sharma").first()
    assert user is not None
    original_state = user.is_active
    try:
        user.is_active = False
        db.commit()

        resp = client.post("/api/auth/login", json={
            "username": "ankit_sharma",
            "password": "demo123"
        })
        assert resp.status_code == 403
        assert "deactivated" in resp.json()["detail"].lower()
    finally:
        user.is_active = original_state
        db.commit()

def test_get_me_endpoint(client: TestClient, welfare_headers):
    resp = client.get("/api/auth/me", headers=welfare_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "wo_meera"
    assert data["role"] == "welfare"

def test_unauthenticated_protected_route(client: TestClient):
    resp = client.get("/api/auth/me")
    assert resp.status_code in (401, 403)

def test_tampered_jwt_token(client: TestClient):
    bad_headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature"}
    resp = client.get("/api/auth/me", headers=bad_headers)
    assert resp.status_code in (401, 403)
