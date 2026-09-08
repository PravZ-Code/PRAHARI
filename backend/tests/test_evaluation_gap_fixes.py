import pytest
import numpy as np
from fastapi.testclient import TestClient
from models.personnel import Unit, Personnel
from services.conflict_service import analyze_evidence_conflict
from services.welfare_resilience_service import check_battalion_exhaustion_escalation
from services.gateway_service import process_sms_incoming
from schemas.gateway import SMSIncomingRequest


def test_telecom_gateway_offline_sms_triage(db):
    """Verifies feature phone SMS gateway triage for remote forward base personnel without smartphone connectivity."""
    req = SMSIncomingRequest(
        message_sid="SMS_TEST_12345",
        sender_phone="+919876543210",
        message_body="SOS Need urgent welfare officer support"
    )
    res = process_sms_incoming(db, req)
    assert res.action_executed == "EMERGENCY_CASE_CREATED"
    assert "ALERT" in res.reply_text or "RED" in res.reply_text or "emergency" in res.reply_text.lower()
    assert res.message_sid == "SMS_TEST_12345"


def test_commander_command_briefing_chain_of_command(client: TestClient, commander_alpha_headers, alpha_unit_id):
    """Verifies Company Commander Command Briefing enforces operational authority and platoon visibility."""
    resp = client.get(f"/api/commander/unit/{alpha_unit_id}/command-briefing", headers=commander_alpha_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["unit_id"] == alpha_unit_id
    assert "EXCLUSIVE_OPERATIONAL_AUTHORITY" in data["command_authority"]
    assert "Mental Healthcare Act 2017" in data["statutory_compliance"]
    assert "operational_readiness_pct" in data
    assert len(data["platoon_status"]) == 3
    assert "commander_executive_summary" in data
    assert len(data["recommended_command_actions"]) >= 2


def test_stoic_masking_smdi_and_cold_start(db):
    """Verifies SMDI mathematical deception index and Bayesian cold-start imputation."""
    p = db.query(Personnel).first()
    assert p is not None

    report = analyze_evidence_conflict(db, p.id)
    assert report.stoic_masking_deception_index is not None
    assert 0.0 <= report.stoic_masking_deception_index <= 1.0
    assert isinstance(report.cold_start_imputed, bool)


def test_battalion_exhaustion_escalation(db):
    """Verifies Battalion Exhaustion & Macro-Reserve Escalation (BEMRE) notice generation."""
    unit = db.query(Unit).first()
    assert unit is not None

    res = check_battalion_exhaustion_escalation(db, unit.id)
    assert res["unit_id"] == unit.id
    assert "welfare_reserve_percentage" in res
    assert "escalation_level" in res
    assert "recommended_tactical_actions" in res
    assert len(res["recommended_tactical_actions"]) >= 2


def test_airgap_export_and_import(client: TestClient, db):
    """Verifies offline air-gapped export, cryptographic signature check, and tamper rejection."""
    unit = db.query(Unit).first()
    assert unit is not None

    # 1. Export signed bundle
    exp_resp = client.post(f"/api/gateway/airgap/export/{unit.id}")
    assert exp_resp.status_code == 200
    bundle = exp_resp.json()

    assert bundle["filename"].endswith(".prahari.enc")
    assert "archive_hash_sha256" in bundle
    assert "payload" in bundle

    # 2. Clean Import at Battalion HQ
    imp_resp = client.post("/api/gateway/airgap/import", json=bundle)
    assert imp_resp.status_code == 200
    imp_data = imp_resp.json()
    assert imp_data["status"] == "INGESTION_VERIFIED"
    assert imp_data["signature_verified"] is True

    # 3. Tamper detection test (modify payload in transit)
    tampered_bundle = dict(bundle)
    tampered_bundle["payload"] = dict(bundle["payload"])
    tampered_bundle["payload"]["unit_name"] = "TAMPERED_PIRATED_UNIT"

    bad_imp = client.post("/api/gateway/airgap/import", json=tampered_bundle)
    assert bad_imp.status_code == 400
    assert "Cryptographic tamper detected" in bad_imp.json()["detail"]
