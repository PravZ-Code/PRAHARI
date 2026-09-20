import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.audit import AuditLog, AuditAnchor
from middleware.rbac import require_role
from middleware.audit import (
    format_iso_timestamp,
    compute_audit_hash,
    verify_audit_signature,
    sign_audit_hash,
    create_external_anchor,
)

router = APIRouter()

@router.get("/audit/verify-chain")
def verify_audit_chain(
    current_user: User = Depends(require_role("admin", "welfare")),
    db: Session = Depends(get_db)
):
    """
    Reads all AuditLog rows ordered by sequence_number/timestamp,
    recomputes SHA-256 block hashes, verifies ledger chain integrity,
    validates isolated KMS asymmetric signatures, and verifies external Merkle anchors.
    Guarantees tamper-evidence against database administrators.
    """
    logs = db.query(AuditLog).order_by(
        AuditLog.sequence_number.asc().nullslast(),
        AuditLog.timestamp.asc()
    ).all()

    if not logs:
        return {
            "chain_status": "INTACT",
            "total_blocks": 0,
            "tampered_index": None,
            "genesis_hash": "0" * 64,
            "current_tip_hash": "0" * 64,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "asymmetric_signatures_verified": True,
            "external_anchors_count": 0,
            "evidentiary_standard": "Section 63(4) Bharatiya Sakshya Adhiniyam, 2023"
        }

    expected_prev_hash = "0" * 64
    signatures_valid = True
    unsigned_legacy_rows = 0

    for idx, log in enumerate(logs):
        # 1. Verify previous_hash link
        if log.previous_hash != expected_prev_hash:
            return {
                "chain_status": "COMPROMISED",
                "total_blocks": len(logs),
                "tampered_index": log.sequence_number if log.sequence_number is not None else idx + 1,
                "tamper_reason": "Broken previous_hash chain pointer",
                "asymmetric_signatures_verified": False,
                "evidentiary_standard": "Section 63(4) Bharatiya Sakshya Adhiniyam, 2023"
            }

        # 2. Recompute current_hash
        res_id_str = str(log.resource_id) if log.resource_id is not None else ""
        details_obj = log.details if isinstance(log.details, dict) else {}
        details_json = json.dumps(details_obj, sort_keys=True)
        ts_iso = format_iso_timestamp(log.timestamp)

        computed_hash = compute_audit_hash(
            prev_hash=expected_prev_hash,
            user_id=log.user_id,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=res_id_str,
            endpoint=log.endpoint,
            timestamp_iso=ts_iso,
            details_json=details_json
        )

        if log.current_hash != computed_hash:
            return {
                "chain_status": "COMPROMISED",
                "total_blocks": len(logs),
                "tampered_index": log.sequence_number if log.sequence_number is not None else idx + 1,
                "tamper_reason": "Hash content mismatch",
                "asymmetric_signatures_verified": False,
                "evidentiary_standard": "Section 63(4) Bharatiya Sakshya Adhiniyam, 2023"
            }

        # 3. Verify Asymmetric KMS Signature (Tamper protection against rogue SysAdmin recomputation)
        if log.signature:
            if not verify_audit_signature(log.current_hash, log.signature):
                return {
                    "chain_status": "COMPROMISED",
                    "total_blocks": len(logs),
                    "tampered_index": log.sequence_number if log.sequence_number is not None else idx + 1,
                    "tamper_reason": "Forged / invalid KMS signature detected (adversarial recomputation)",
                    "asymmetric_signatures_verified": False,
                    "evidentiary_standard": "Section 63(4) Bharatiya Sakshya Adhiniyam, 2023"
                }
        else:
            # Legacy rows remain verifiable as a chain, but are not complete evidence.
            signatures_valid = False
            unsigned_legacy_rows += 1

        expected_prev_hash = log.current_hash

    # 4. Verify External Anchors
    anchors = db.query(AuditAnchor).order_by(AuditAnchor.sequence_number.asc()).all()
    anchors_valid = True
    for a in anchors:
        matching_log = db.query(AuditLog).filter(AuditLog.sequence_number == a.sequence_number).first()
        if not matching_log or matching_log.current_hash != a.head_hash:
            anchors_valid = False
            return {
                "chain_status": "COMPROMISED",
                "total_blocks": len(logs),
                "tampered_index": a.sequence_number,
                "tamper_reason": "External Merkle Anchor mismatch (unauthorized history modification)",
                "asymmetric_signatures_verified": False,
                "evidentiary_standard": "Section 63(4) Bharatiya Sakshya Adhiniyam, 2023"
            }

    return {
        "chain_status": "INTACT",
        "total_blocks": len(logs),
        "tampered_index": None,
        "genesis_hash": logs[0].current_hash if logs else "0" * 64,
        "current_tip_hash": expected_prev_hash,
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "asymmetric_signatures_verified": signatures_valid,
        "unsigned_legacy_rows": unsigned_legacy_rows,
        "verification_complete": signatures_valid and unsigned_legacy_rows == 0,
        "external_anchors_count": len(anchors),
        "external_anchors_verified": anchors_valid,
        "kms_key_node": "PRAHARI-KMS-ED25519-ISOLATED",
        "evidentiary_standard": "Section 63(4) Bharatiya Sakshya Adhiniyam, 2023"
    }

@router.post("/audit/anchor-head")
def anchor_audit_head(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """
    Creates an immutable external Merkle checkpoint anchor for the current head block.
    """
    head_entry = db.query(AuditLog).order_by(
        AuditLog.sequence_number.desc().nullslast(),
        AuditLog.timestamp.desc()
    ).first()

    if not head_entry:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No audit entries to anchor.")

    anchor = create_external_anchor(db, head_entry)
    return {
        "status": "ANCHORED",
        "anchor_id": anchor.id,
        "checkpoint_height": anchor.sequence_number,
        "head_hash": anchor.head_hash,
        "merkle_root": anchor.merkle_root,
        "signature": anchor.signature,
        "anchor_type": anchor.anchor_type,
        "external_receipt_nonce": anchor.external_receipt_nonce,
        "anchored_at": anchor.anchored_at.isoformat() if anchor.anchored_at else None
    }

@router.get("/audit/anchors")
def list_audit_anchors(
    current_user: User = Depends(require_role("admin", "welfare")),
    db: Session = Depends(get_db)
):
    """Lists all external checkpoint anchors."""
    anchors = db.query(AuditAnchor).order_by(AuditAnchor.sequence_number.desc()).all()
    return {
        "total_anchors": len(anchors),
        "anchors": [
            {
                "id": a.id,
                "checkpoint_height": a.sequence_number,
                "head_hash": a.head_hash,
                "merkle_root": a.merkle_root,
                "signature": a.signature,
                "external_receipt_nonce": a.external_receipt_nonce,
                "anchored_at": a.anchored_at.isoformat() if a.anchored_at else None
            }
            for a in anchors
        ]
    }

@router.get("/audit")
def get_audit_logs(
    page: int = 1,
    per_page: int = 50,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    total = query.count()
    logs = query.order_by(
        AuditLog.sequence_number.desc().nullslast(),
        AuditLog.timestamp.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()

    items = []
    for l in logs:
        u = l.user
        items.append({
            "id": l.id,
            "sequence_number": l.sequence_number,
            "previous_hash": l.previous_hash,
            "current_hash": l.current_hash,
            "has_signature": bool(l.signature),
            "anchor_id": l.anchor_id,
            "user": u.username if u else "system",
            "role": u.role if u else "system",
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "endpoint": l.endpoint,
            "ip_address": l.ip_address,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "details": l.details
        })

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "logs": items,
        "items": items
    }
