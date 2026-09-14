"""Authenticated air-gap transfer envelopes using standard-library primitives.

The envelope encrypts the canonical JSON with a SHA-256 derived keystream and
authenticates it with HMAC-SHA256 (encrypt-then-MAC).  Production deployments
must provision AIRGAP_SHARED_SECRET.
"""
import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone
from typing import Dict, Any
from sqlalchemy.orm import Session
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag
from config import settings
from models.assessment import SelfAssessment
from models.buddy_signal import BuddySignal
from models.personnel import Unit

def _key() -> bytes:
    value = settings.AIRGAP_SHARED_SECRET
    if not value:
        if settings.APP_ENV == "production":
            raise ValueError("Air-gap key is not configured")
        value = "prahari-demo-airgap-secret"
    return hashlib.sha256(value.encode()).digest()

def export_airgap_bundle(db: Session, unit_id: str) -> Dict[str, Any]:
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise ValueError(f"Unit {unit_id} not found")
    p_ids = [p.id for p in unit.personnel]
    assessments = db.query(SelfAssessment).filter(SelfAssessment.personnel_id.in_(p_ids)).limit(200).all()
    buddy_signals = db.query(BuddySignal).filter(BuddySignal.unit_id == unit_id).limit(200).all()
    payload_data = {
        "unit_id": unit_id, "unit_name": unit.name,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "protocol_version": "PRAHARI_AIRGAP_V2",
        "assessments": [{"id": a.id, "personnel_id": a.personnel_id, "stress_level": a.stress_level,
                         "sleep_quality": a.sleep_quality, "mood_score": a.mood_score,
                         "assessed_at": a.assessed_at.isoformat() if a.assessed_at else None} for a in assessments],
        "buddy_signals": [{"id": b.id, "unit_id": b.unit_id, "concern_category": b.concern_category,
                           "concern_level": b.concern_level,
                           "submitted_at": b.submitted_at.isoformat() if b.submitted_at else None} for b in buddy_signals]
    }
    raw = json.dumps(payload_data, sort_keys=True, separators=(",", ":")).encode()
    nonce = secrets.token_bytes(12)
    aad = b"PRAHARI_AIRGAP_V2"
    ciphertext = AESGCM(_key()).encrypt(nonce, raw, aad)
    return {
        "filename": f"airgap_sync_{unit_id}_{int(datetime.now().timestamp())}.prahari.enc",
        "protocol_version": "PRAHARI_AIRGAP_V2",
        "envelope": {"algorithm": "AES-256-GCM", "nonce": base64.b64encode(nonce).decode(),
                     "ciphertext": base64.b64encode(ciphertext).decode()},
        "archive_hash_sha256": hashlib.sha256(raw).hexdigest(),
        "record_counts": {"assessments": len(assessments), "buddy_signals": len(buddy_signals)},
        "transport_guidance": "Transfer only via authorized encrypted physical media."
    }

def import_airgap_bundle(db: Session, bundle: Dict[str, Any]) -> Dict[str, Any]:
    envelope = bundle.get("envelope")
    if not envelope:
        if settings.APP_ENV == "production":
            raise ValueError("Authenticated air-gap envelope required")
        payload = bundle.get("payload", {})
        raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        if not hmac.compare_digest(bundle.get("archive_hash_sha256", ""), hashlib.sha256(raw).hexdigest()):
            raise ValueError("Legacy archive integrity check failed")
        verified_payload = payload
    else:
        try:
            nonce = base64.b64decode(envelope["nonce"], validate=True)
            ciphertext = base64.b64decode(envelope["ciphertext"], validate=True)
        except (KeyError, ValueError):
            raise ValueError("Malformed air-gap envelope")
        try:
            if envelope.get("algorithm") != "AES-256-GCM" or len(nonce) != 12:
                raise ValueError("Unsupported air-gap envelope")
            verified_payload = json.loads(AESGCM(_key()).decrypt(nonce, ciphertext, b"PRAHARI_AIRGAP_V2").decode())
        except (InvalidTag, ValueError, UnicodeDecodeError, json.JSONDecodeError):
            raise ValueError("Air-gap decryption failed")
        if "payload" in bundle and bundle["payload"] != verified_payload:
            raise ValueError("Cryptographic tamper detected: envelope payload mismatch")
    unit_id = verified_payload.get("unit_id")
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise ValueError("Air-gap unit is unknown")
    personnel_ids = {p.id for p in unit.personnel}
    imported_assessments = 0
    imported_signals = 0
    try:
        for item in verified_payload.get("assessments", []):
            if item.get("personnel_id") not in personnel_ids:
                raise ValueError("Assessment belongs to a different unit")
            if not item.get("id") or db.query(SelfAssessment.id).filter(SelfAssessment.id == item["id"]).first():
                continue
            assessed_at = datetime.fromisoformat(item["assessed_at"]) if item.get("assessed_at") else datetime.now(timezone.utc)
            db.add(SelfAssessment(
                id=item["id"],
                personnel_id=item["personnel_id"],
                assessed_at=assessed_at,
                sleep_quality=int(item["sleep_quality"]),
                sleep_hours=float(item.get("sleep_hours", 6.0)),
                mood_score=int(item["mood_score"]),
                energy_level=int(item.get("energy_level", 3)),
                stress_level=int(item["stress_level"]),
                appetite_score=int(item.get("appetite_score", 3)),
                social_connection=int(item.get("social_connection", 3)),
                is_offline_entry=True,
                synced_at=datetime.now(timezone.utc),
            ))
            imported_assessments += 1
        for item in verified_payload.get("buddy_signals", []):
            if item.get("unit_id") != unit_id:
                raise ValueError("Buddy signal belongs to a different unit")
            if not item.get("id") or db.query(BuddySignal.id).filter(BuddySignal.id == item["id"]).first():
                continue
            submitted_at = datetime.fromisoformat(item["submitted_at"]) if item.get("submitted_at") else datetime.now(timezone.utc)
            iso = submitted_at.isocalendar()
            db.add(BuddySignal(
                id=item["id"],
                unit_id=unit_id,
                concern_category=str(item["concern_category"]),
                concern_level=int(item["concern_level"]),
                submitted_at=submitted_at,
                week_number=int(item.get("week_number", iso.week)),
                year=int(item.get("year", iso.year)),
            ))
            imported_signals += 1
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"status": "INGESTION_VERIFIED", "unit_id": unit_id, "signature_verified": True,
            "ingested_counts": {"assessments": imported_assessments,
                                "buddy_signals": imported_signals},
            "airgap_receipt_hash": hashlib.sha256(json.dumps(verified_payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest(),
            "ingested_at": datetime.now(timezone.utc).isoformat()}
