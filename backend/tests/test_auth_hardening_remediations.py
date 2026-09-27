"""Regression tests for auth/security hardening remediations:
1. JWTs in query strings must be rejected outside the sync streaming endpoints.
2. Revoked (blacklisted) tokens must be rejected by the WebSocket auth path.
3. JIT demo auto-provisioning must be gated and auditable.
4. Login service-number fallback must not perform a Python full-table scan.
"""
import hashlib
from datetime import datetime, timezone

import pytest


def _token_for(db_session, username: str) -> str:
    from models.user import User
    from middleware.rbac import create_access_token

    u = db_session.query(User).filter(User.username == username).first()
    assert u is not None, f"seeded user {username} missing"
    return create_access_token({
        "sub": u.id,
        "username": u.username,
        "role": u.role,
        "personnel_id": u.personnel_id,
        "unit_id": u.unit_id,
    })


def test_query_param_token_rejected_on_regular_endpoint(client, db):
    """JWT in ?token= must NOT authenticate regular REST routes (log-leak prevention)."""
    token = _token_for(db, "rajesh_kumar")
    resp = client.get(f"/api/grievance/my-requests?token={token}")
    assert resp.status_code == 401


def test_bearer_and_cookie_auth_still_work(client, db):
    """Normal auth channels must remain functional."""
    token = _token_for(db, "rajesh_kumar")
    resp = client.get("/api/grievance/my-requests", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    client.cookies.set("prahari_session", token)
    resp = client.get("/api/grievance/my-requests")
    assert resp.status_code == 200


def test_revoked_token_rejected_by_websocket(client, db, auth_db):
    """A logged-out token must fail WebSocket authentication (blacklist honored)."""
    from models.user import TokenBlacklist

    token = _token_for(db, "rajesh_kumar")
    # Blacklist the token the same way /api/auth/logout does
    t_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    auth_db.add(TokenBlacklist(
        token_hash=t_hash,
        token_jti=None,
        expires_at=datetime.now(timezone.utc),
    ))
    auth_db.commit()
    try:
        from starlette.websockets import WebSocketDisconnect
        with client.websocket_connect(f"/api/sync/ws?token={token}") as ws:
            msg = ws.receive_json()
            assert msg.get("type") == "error", (
                f"Revoked token must be rejected by WebSocket auth, got: {msg}"
            )
            # Server then closes the connection with policy-violation code
            with pytest.raises(WebSocketDisconnect):
                ws.receive_json()
    finally:
        auth_db.query(TokenBlacklist).filter(TokenBlacklist.token_hash == t_hash).delete()
        auth_db.commit()


def test_valid_token_accepted_by_websocket(client, db):
    """Sanity check: valid, non-revoked tokens still authenticate the WS endpoint."""
    token = _token_for(db, "rajesh_kumar")
    with client.websocket_connect(f"/api/sync/ws?token={token}") as ws:
        msg = ws.receive_json()
        assert msg.get("type") == "connected"


def test_jit_autoprovision_creates_audit_record(client, db, auth_db):
    """Demo JIT provisioning (dev-mode) must succeed but leave an audit trail."""
    from models.personnel import Personnel
    from models.user import User
    from models.audit import AuditLog

    personnel = db.query(Personnel).filter(Personnel.service_number.isnot(None)).first()
    assert personnel is not None

    # Preserve any pre-existing linked account so the test never mutates seed state
    existing = auth_db.query(User).filter(User.personnel_id == personnel.id).first()
    saved_existing = None
    if existing:
        saved_existing = {
            "id": existing.id,
            "username": existing.username,
            "password_hash": existing.password_hash,
            "role": existing.role,
            "personnel_id": existing.personnel_id,
            "unit_id": existing.unit_id,
            "is_active": existing.is_active,
        }
        auth_db.delete(existing)
        auth_db.commit()

    new_user = None
    try:
        resp = client.post("/api/auth/login", json={
            "service_number": personnel.service_number,
            "password": "demo123",
        })
        assert resp.status_code == 200

        new_user = auth_db.query(User).filter(User.personnel_id == personnel.id).first()
        assert new_user is not None
        jit_entry = db.query(AuditLog).filter(AuditLog.action == "JIT_ACCOUNT_PROVISIONED").first()
        assert jit_entry is not None, "JIT provisioning must emit an audit ledger record"
    finally:
        if new_user is not None:
            auth_db.delete(new_user)
        if saved_existing is not None:
            auth_db.add(User(**saved_existing))
        auth_db.commit()


def test_login_nonexistent_identifier_does_not_scan_all_rows(client, monkeypatch):
    """The punctuation-stripped fallback must execute in SQL, not iterate rows in Python."""
    from sqlalchemy.orm import Query

    original_all = Query.all

    def guarded_all(self, *a, **k):
        result = original_all(self, *a, **k)
        sql = str(self)
        if "FROM personnel" in sql and len(result) > 100:
            raise AssertionError(
                "Unbounded personnel table scan detected during login fallback "
                f"({len(result)} rows materialized)"
            )
        return result

    monkeypatch.setattr(Query, "all", guarded_all)
    resp = client.post("/api/auth/login", json={
        "service_number": "NONEXISTENT-999999",
        "password": "demo123",
    })
    assert resp.status_code == 401
