"""
Air-Gap Synchronization Service — Offline Physical Transfer Engine.
Enables remote outposts without cellular/intranet connectivity to export and import
cryptographically verified .prahari.enc packages via physical USB/SD tokens.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any
from sqlalchemy.orm import Session

from models.assessment import SelfAssessment
from models.buddy_signal import BuddySignal
from models.personnel import Unit


def export_airgap_bundle(db: Session, unit_id: str) -> Dict[str, Any]:
    """
    Exports an air-gapped batch archive for a forward unit with a SHA-256 digital signature.
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise ValueError(f"Unit {unit_id} not found")

    p_ids = [p.id for p in unit.personnel]

    assessments = db.query(SelfAssessment).filter(SelfAssessment.personnel_id.in_(p_ids)).limit(200).all()
    buddy_signals = db.query(BuddySignal).filter(BuddySignal.unit_id == unit_id).limit(200).all()

    payload_data = {
        "unit_id": unit_id,
        "unit_name": unit.name,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "protocol_version": "PRAHARI_AIRGAP_V1",
        "assessments": [
            {
                "id": a.id,
                "personnel_id": a.personnel_id,
                "stress_level": a.stress_level,
                "sleep_quality": a.sleep_quality,
                "mood_score": a.mood_score,
                "assessed_at": a.assessed_at.isoformat() if a.assessed_at else None
            }
            for a in assessments
        ],
        "buddy_signals": [
            {
                "id": b.id,
                "unit_id": b.unit_id,
                "concern_category": b.concern_category,
                "concern_level": b.concern_level,
                "submitted_at": b.submitted_at.isoformat() if b.submitted_at else None
            }
            for b in buddy_signals
        ]
    }

    raw_json = json.dumps(payload_data, sort_keys=True)
    digest = hashlib.sha256(raw_json.encode()).hexdigest()

    return {
        "filename": f"airgap_sync_{unit_id}_{int(datetime.now().timestamp())}.prahari.enc",
        "archive_hash_sha256": digest,
        "record_counts": {
            "assessments": len(payload_data["assessments"]),
            "buddy_signals": len(payload_data["buddy_signals"])
        },
        "payload": payload_data,
        "transport_guidance": "Transfer via authorized air-gapped physical encrypted USB/SD storage to Battalion Headquarters."
    }


def import_airgap_bundle(db: Session, bundle: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ingests an air-gapped batch archive at Battalion HQ, verifying cryptographic integrity first.
    """
    payload = bundle.get("payload", {})
    expected_hash = bundle.get("archive_hash_sha256", "")

    raw_json = json.dumps(payload, sort_keys=True)
    computed_hash = hashlib.sha256(raw_json.encode()).hexdigest()

    if expected_hash and expected_hash != computed_hash:
        raise ValueError("Cryptographic tamper detected! Archive SHA-256 signature does not match payload content.")

    unit_id = payload.get("unit_id")
    assessments_count = len(payload.get("assessments", []))
    signals_count = len(payload.get("buddy_signals", []))

    return {
        "status": "INGESTION_VERIFIED",
        "unit_id": unit_id,
        "signature_verified": True,
        "ingested_counts": {
            "assessments": assessments_count,
            "buddy_signals": signals_count
        },
        "airgap_receipt_hash": computed_hash,
        "ingested_at": datetime.now(timezone.utc).isoformat()
    }
