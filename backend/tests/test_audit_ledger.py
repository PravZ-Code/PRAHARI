import pytest
from fastapi.testclient import TestClient
from models.audit import AuditLog

def test_audit_chain_baseline_intact(client: TestClient, admin_headers):
    resp = client.get("/api/admin/audit/verify-chain", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["chain_status"] == "INTACT"
    assert data["tampered_index"] is None
    assert data["total_blocks"] > 0

def test_audit_log_pagination(client: TestClient, admin_headers):
    resp = client.get("/api/admin/audit?page=1&per_page=10", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "logs" in data
    assert len(data["logs"]) <= 10
    if data["logs"]:
        first = data["logs"][0]
        assert "current_hash" in first
        assert "previous_hash" in first
        assert "sequence_number" in first

def test_tamper_detection_and_recovery(client: TestClient, admin_headers, db):
    # 1. Baseline
    resp1 = client.get("/api/admin/audit/verify-chain", headers=admin_headers)
    assert resp1.json()["chain_status"] == "INTACT"

    # 2. Tamper row with sequence_number 5 (or any existing row)
    target = db.query(AuditLog).filter(AuditLog.sequence_number == 5).first()
    if not target:
        target = db.query(AuditLog).first()
    assert target is not None

    orig_action = target.action
    target_seq = target.sequence_number

    try:
        target.action = "TAMPERED_ACTION_FOR_TESTING"
        db.commit()

        resp_tampered = client.get("/api/admin/audit/verify-chain", headers=admin_headers)
        tamper_data = resp_tampered.json()
        assert tamper_data["chain_status"] == "COMPROMISED"
        assert tamper_data["tampered_index"] == target_seq
    finally:
        # Revert
        target.action = orig_action
        db.commit()

    # 3. Post-revert verification
    resp_recovered = client.get("/api/admin/audit/verify-chain", headers=admin_headers)
    assert resp_recovered.json()["chain_status"] == "INTACT"
    assert resp_recovered.json()["tampered_index"] is None

def test_new_audit_entry_hash_chaining(client: TestClient, db):
    # Fetch current latest entry
    last_before = db.query(AuditLog).order_by(AuditLog.sequence_number.desc().nullslast()).first()
    prev_hash_expected = last_before.current_hash if last_before else "0" * 64

    # Trigger action that generates an audit log: e.g. login
    client.post("/api/auth/login", json={"username": "admin_sys", "password": "demo123"})

    # Query newly created log
    last_after = db.query(AuditLog).order_by(AuditLog.sequence_number.desc().nullslast()).first()
    assert last_after is not None
    assert last_after.id != (last_before.id if last_before else "")
    assert last_after.previous_hash == prev_hash_expected
    assert len(last_after.current_hash) == 64
