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
    assert last_after.signature is not None


def test_audit_external_anchor_and_kms_signature(client: TestClient, admin_headers):
    """Verifies that external Merkle checkpoint anchoring and KMS signatures succeed."""
    # 1. Trigger external anchor creation
    resp_anchor = client.post("/api/admin/audit/anchor-head", headers=admin_headers)
    assert resp_anchor.status_code == 200
    anchor_data = resp_anchor.json()
    assert anchor_data["status"] == "ANCHORED"
    assert len(anchor_data["merkle_root"]) == 64
    assert len(anchor_data["signature"]) == 64
    assert len(anchor_data["external_receipt_nonce"]) == 64

    # 2. List anchors
    resp_list = client.get("/api/admin/audit/anchors", headers=admin_headers)
    assert resp_list.status_code == 200
    list_data = resp_list.json()
    assert list_data["total_anchors"] >= 1

    # 3. Verify chain reflects valid signatures and anchors
    resp_verify = client.get("/api/admin/audit/verify-chain", headers=admin_headers)
    assert resp_verify.status_code == 200
    verify_data = resp_verify.json()
    assert verify_data["chain_status"] == "INTACT"
    assert verify_data["external_anchors_count"] >= 1
    assert verify_data["external_anchors_verified"] is True
    assert "Section 63(4)" in verify_data["evidentiary_standard"]


def test_admin_tamper_signature_failure(client: TestClient, admin_headers, db):
    """
    Simulates a rogue SysAdmin who alters an audit record AND recomputes the SHA-256
    hash chain, but cannot forge the KMS asymmetric signature.
    Verifies that the system detects adversarial admin tampering.
    """
    import json
    from middleware.audit import compute_audit_hash, format_iso_timestamp

    target = db.query(AuditLog).filter(AuditLog.sequence_number == 3).first()
    if not target:
        target = db.query(AuditLog).first()
    assert target is not None

    orig_action = target.action
    orig_hash = target.current_hash
    orig_sig = target.signature

    try:
        # Rogue admin modifies action AND recomputes raw SHA-256 hash
        target.action = "ROGUE_ADMIN_MODIFICATION"
        res_id_str = str(target.resource_id) if target.resource_id is not None else ""
        details_obj = target.details if isinstance(target.details, dict) else {}
        details_json = json.dumps(details_obj, sort_keys=True)
        ts_iso = format_iso_timestamp(target.timestamp)

        # Admin forges the SHA-256 hash
        forged_hash = compute_audit_hash(
            prev_hash=target.previous_hash,
            user_id=str(target.user_id),
            action=target.action,
            resource_type=target.resource_type,
            resource_id=res_id_str,
            endpoint=target.endpoint,
            timestamp_iso=ts_iso,
            details_json=details_json
        )
        target.current_hash = forged_hash
        # But admin does NOT have the KMS isolated key, so signature is invalid/unchanged
        db.commit()

        # Verify chain must detect forged/invalid signature!
        resp = client.get("/api/admin/audit/verify-chain", headers=admin_headers)
        data = resp.json()
        assert data["chain_status"] == "COMPROMISED"
        assert "KMS signature" in data.get("tamper_reason", "")
    finally:
        # Restore
        target.action = orig_action
        target.current_hash = orig_hash
        target.signature = orig_sig
        db.commit()


def test_production_guard_blocks_default_demo123(client: TestClient):
    """Verifies that default demo credentials are explicitly rejected in production mode."""
    from config import settings
    orig_env = settings.APP_ENV
    try:
        settings.APP_ENV = "production"
        resp = client.post("/api/auth/login", json={"username": "admin_sys", "password": "demo123"})
        assert resp.status_code == 403
        assert "Production Security Policy" in resp.json()["detail"]
    finally:
        settings.APP_ENV = orig_env

    assert last_after.signature is not None


def test_audit_external_anchor_and_kms_signature(client: TestClient, admin_headers):
    """Verifies that external Merkle checkpoint anchoring and KMS signatures succeed."""
    # 1. Trigger external anchor creation
    resp_anchor = client.post("/api/admin/audit/anchor-head", headers=admin_headers)
    assert resp_anchor.status_code == 200
    anchor_data = resp_anchor.json()
    assert anchor_data["status"] == "ANCHORED"
    assert len(anchor_data["merkle_root"]) == 64
    assert len(anchor_data["signature"]) == 64
    assert len(anchor_data["external_receipt_nonce"]) == 64

    # 2. List anchors
    resp_list = client.get("/api/admin/audit/anchors", headers=admin_headers)
    assert resp_list.status_code == 200
    list_data = resp_list.json()
    assert list_data["total_anchors"] >= 1

    # 3. Verify chain reflects valid signatures and anchors
    resp_verify = client.get("/api/admin/audit/verify-chain", headers=admin_headers)
    assert resp_verify.status_code == 200
    verify_data = resp_verify.json()
    assert verify_data["chain_status"] == "INTACT"
    assert verify_data["external_anchors_count"] >= 1
    assert verify_data["external_anchors_verified"] is True
    assert "Section 63(4)" in verify_data["evidentiary_standard"]


def test_admin_tamper_signature_failure(client: TestClient, admin_headers, db):
    """
    Simulates a rogue SysAdmin who alters an audit record AND recomputes the SHA-256
    hash chain, but cannot forge the KMS asymmetric signature.
    Verifies that the system detects adversarial admin tampering.
    """
    import json
    from middleware.audit import compute_audit_hash, format_iso_timestamp

    target = db.query(AuditLog).filter(AuditLog.sequence_number == 3).first()
    if not target:
        target = db.query(AuditLog).first()
    assert target is not None

    orig_action = target.action
    orig_hash = target.current_hash
    orig_sig = target.signature

    try:
        # Rogue admin modifies action AND recomputes raw SHA-256 hash
        target.action = "ROGUE_ADMIN_MODIFICATION"
        res_id_str = str(target.resource_id) if target.resource_id is not None else ""
        details_obj = target.details if isinstance(target.details, dict) else {}
        details_json = json.dumps(details_obj, sort_keys=True)
        ts_iso = format_iso_timestamp(target.timestamp)

        # Admin forges the SHA-256 hash
        forged_hash = compute_audit_hash(
            prev_hash=target.previous_hash,
            user_id=str(target.user_id),
            action=target.action,
            resource_type=target.resource_type,
            resource_id=res_id_str,
            endpoint=target.endpoint,
            timestamp_iso=ts_iso,
            details_json=details_json
        )
        target.current_hash = forged_hash
        # But admin does NOT have the KMS isolated key, so signature is invalid/unchanged
        db.commit()

        # Verify chain must detect forged/invalid signature!
        resp = client.get("/api/admin/audit/verify-chain", headers=admin_headers)
        data = resp.json()
        assert data["chain_status"] == "COMPROMISED"
        assert "KMS signature" in data.get("tamper_reason", "")
    finally:
        # Restore
        target.action = orig_action
        target.current_hash = orig_hash
        target.signature = orig_sig
        db.commit()


def test_production_guard_blocks_default_demo123(client: TestClient):
    """Verifies that default demo credentials are explicitly rejected in production mode."""
    from config import settings
    orig_env = settings.APP_ENV
    try:
        settings.APP_ENV = "production"
        resp = client.post("/api/auth/login", json={"username": "admin_sys", "password": "demo123"})
        assert resp.status_code == 403
        assert "Production Security Policy" in resp.json()["detail"]
    finally:
        settings.APP_ENV = orig_env

