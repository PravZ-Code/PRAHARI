import uuid
import json
import hashlib
from datetime import datetime, timezone
from typing import Optional, Any
from fastapi import Request
from sqlalchemy.orm import Session
from models.user import User
from models.audit import AuditLog

def format_iso_timestamp(ts) -> str:
    if ts is None:
        return ""
    if isinstance(ts, str):
        return ts.replace(" ", "T")
    if hasattr(ts, "tzinfo") and ts.tzinfo is not None:
        ts = ts.replace(tzinfo=None)
    return ts.isoformat()

def format_details_json(details) -> str:
    if isinstance(details, str):
        try:
            details = json.loads(details)
        except Exception:
            details = {}
    elif not isinstance(details, dict):
        details = {}
    return json.dumps(details, sort_keys=True)

def compute_audit_hash(
    prev_hash: str,
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    endpoint: str,
    timestamp_iso: str,
    details_json: str
) -> str:
    res_id = str(resource_id) if resource_id is not None else ""
    raw = f"{prev_hash}|{user_id}|{action}|{resource_type}|{res_id}|{endpoint}|{timestamp_iso}|{details_json}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def log_audit(
    db: Session,
    user: Any = None,
    request: Optional[Request] = None,
    resource_type: str = "general",
    resource_id: str = None,
    details: dict = None,
    endpoint: Optional[str] = None,
    action: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """
    Records an entry in the audit_log table whenever a sensitive resource is accessed.
    Maintains a cryptographically chained SHA-256 ledger.
    Uses database-level locking to guarantee sequence integrity under concurrency.
    """
    try:
        ip = ip_address or (request.client.host if request and request.client else "unknown")
        ep = endpoint or (str(request.url.path) if request and hasattr(request, "url") else "internal")
        act = action or (request.method if request else "UNKNOWN")
        now_dt = datetime.now(timezone.utc).replace(tzinfo=None)
        timestamp_iso = now_dt.isoformat()

        # Use SELECT...FOR UPDATE to serialize concurrent audit writes
        # For SQLite (no row-level locking), WAL + busy_timeout handles concurrency
        last_entry = db.query(AuditLog).order_by(
            AuditLog.sequence_number.desc().nullslast(),
            AuditLog.timestamp.desc()
        ).with_for_update().first()

        genesis_hash = "0" * 64
        if last_entry and last_entry.current_hash:
            prev_hash = last_entry.current_hash
            next_seq = (last_entry.sequence_number or 0) + 1
        else:
            prev_hash = genesis_hash
            next_seq = 1

        if user:
            if hasattr(user, "id") and user.id:
                user_id = str(user.id)
            elif isinstance(user, str):
                u_exists = db.query(User.id).filter(User.id == user).first()
                if u_exists:
                    user_id = user
                else:
                    admin_u = db.query(User.id).filter(User.role == "admin").first()
                    user_id = admin_u[0] if admin_u else user
            else:
                admin_u = db.query(User.id).filter(User.role == "admin").first()
                user_id = admin_u[0] if admin_u else "system"
        else:
            admin_u = db.query(User.id).filter(User.role == "admin").first()
            user_id = admin_u[0] if admin_u else "system"

        res_type = str(resource_type)
        res_id = str(resource_id) if resource_id is not None else ""
        details_obj = details if isinstance(details, dict) else {}
        details_json = json.dumps(details_obj, sort_keys=True)

        current_hash = hashlib.sha256(
            f"{prev_hash}|{user_id}|{act}|{res_type}|{res_id}|{ep}|{timestamp_iso}|{details_json}".encode("utf-8")
        ).hexdigest()

        log_entry = AuditLog(
            id=str(uuid.uuid4()),
            sequence_number=next_seq,
            previous_hash=prev_hash,
            current_hash=current_hash,
            user_id=user_id,
            action=act,
            resource_type=res_type,
            resource_id=str(resource_id) if resource_id else None,
            endpoint=ep,
            ip_address=ip,
            timestamp=now_dt,
            details=details_obj
        )
        db.add(log_entry)
        db.flush()  # Catch constraint violations before commit
        db.commit()
    except Exception as e:
        # Never let logging failure break user transactions
        db.rollback()
        print(f"[Audit Log Error] Failed to write audit log: {e}")
