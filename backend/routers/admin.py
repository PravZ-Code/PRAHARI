import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.audit import AuditLog
from middleware.rbac import require_role
from middleware.audit import format_iso_timestamp, compute_audit_hash

router = APIRouter()

@router.get("/audit/verify-chain")
def verify_audit_chain(
    current_user: User = Depends(require_role("admin", "welfare")),
    db: Session = Depends(get_db)
):
    """
    Reads all AuditLog rows ordered by sequence_number/timestamp,
    recomputes SHA-256 block hashes, and verifies ledger chain integrity.
    """
    logs = db.query(AuditLog).order_by(
        AuditLog.sequence_number.asc().nullslast(),
        AuditLog.timestamp.asc()
    ).all()

    if not logs:
        return {
            "chain_status": "INTACT",
            "total_blocks": 0,
            "tampered_index": None
        }

    expected_prev_hash = "0" * 64

    for idx, log in enumerate(logs):
        # 1. Verify previous_hash link
        if log.previous_hash != expected_prev_hash:
            return {
                "chain_status": "COMPROMISED",
                "total_blocks": len(logs),
                "tampered_index": log.sequence_number if log.sequence_number is not None else idx + 1
            }

        # 2. Recompute current_hash
        res_id_str = str(log.resource_id) if log.resource_id is not None else ""
        details_obj = log.details if isinstance(log.details, dict) else {}
        details_json = json.dumps(details_obj, sort_keys=True)
        ts_iso = format_iso_timestamp(log.timestamp)

        computed_hash = compute_audit_hash(
            prev_hash=expected_prev_hash,
            user_id=str(log.user_id),
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
                "tampered_index": log.sequence_number if log.sequence_number is not None else idx + 1
            }

        expected_prev_hash = log.current_hash

    return {
        "chain_status": "INTACT",
        "total_blocks": len(logs),
        "tampered_index": None
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
            "user": u.username if u else "system",
            "role": u.role if u else "system",
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "endpoint": l.endpoint,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "ip_address": l.ip_address,
            "details": l.details
        })

    return {"total": total, "page": page, "logs": items}
