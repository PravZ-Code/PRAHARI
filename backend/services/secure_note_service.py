"""F5 — Provable crypto-erasure of welfare notes ('scribble-and-burn').

Design: envelope encryption. Each note is AES-256-GCM encrypted under a fresh
random 256-bit Data Encryption Key (DEK); the DEK is wrapped with the system
Key Encryption Key (KEK). Lawful erasure destroys the wrapped DEK, rendering
the ciphertext unrecoverable (crypto-shredding). The audit ledger keeps only a
SHA-256 *existence proof* of the ciphertext plus lifecycle events, so the
system can prove 'a protected record existed and was destroyed' without ever
exposing content (DPDP 2023 §12(3), MHCA 2017 §21/§23).
"""
import base64
import hashlib
import hmac
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy.orm import Session

from config import settings
from middleware.audit import log_audit
from models.welfare_case import WelfareCase
from models.welfare_note import WelfareNote

logger = logging.getLogger(__name__)


def _kek() -> bytes:
    """Production: dedicated KEK only (enforced at startup by config validation).
    Non-production: WELFARE_NOTE_KEK -> LEDGER_SIGNING_KEY -> deterministic dev literal.

    Key-rotation note: notes encrypted under an earlier KEK cannot be decrypted with a
    newer one (their wrapped DEKs are unreadable). Such rows should be lawfully destroyed
    and re-created, not migrated in place.
    """
    if getattr(settings, "APP_ENV", "development") == "production":
        if not settings.WELFARE_NOTE_KEK:
            raise RuntimeError("Welfare-note KEK is not configured (production)")
        return hashlib.sha256(settings.WELFARE_NOTE_KEK.encode("utf-8")).digest()

    key = settings.WELFARE_NOTE_KEK or settings.LEDGER_SIGNING_KEY
    if not key:
        key = "prahari-dev-welfare-note-kek-not-for-production"
    return hashlib.sha256(key.encode("utf-8")).digest()


def _wrap_dek(dek: bytes) -> bytes:
    # KEK-keyed AES-GCM wrapping of the raw DEK
    nonce = os.urandom(12)
    return nonce + AESGCM(_kek()).encrypt(nonce, dek, None)


def _unwrap_dek(wrapped: bytes) -> bytes:
    nonce, ct = wrapped[:12], wrapped[12:]
    return AESGCM(_kek()).decrypt(nonce, ct, None)


def _existence_hmac(note_id: str, ciphertext_b64: str, created_iso: str) -> str:
    return hashlib.sha256(f"{note_id}|{ciphertext_b64}|{created_iso}".encode("utf-8")).hexdigest()


def create_note(db: Session, case: WelfareCase, author_user_id: str, plaintext: str) -> WelfareNote:
    dek = AESGCM.generate_key(bit_length=256)
    nonce = os.urandom(12)
    ciphertext = AESGCM(dek).encrypt(nonce, plaintext.encode("utf-8"), None)
    created_iso = datetime.now(timezone.utc).isoformat()
    note = WelfareNote(
        case_id=case.id,
        personnel_id=case.personnel_id,
        author_user_id=author_user_id,
        ciphertext_b64=base64.b64encode(ciphertext).decode(),
        nonce_b64=base64.b64encode(nonce).decode(),
        wrapped_dek_b64=base64.b64encode(_wrap_dek(dek)).decode(),
        content_hmac="",  # filled next line
    )
    ct = base64.b64encode(ciphertext).decode()
    note.content_hmac = _existence_hmac("PENDING", ct, created_iso)
    db.add(note)
    db.flush()  # obtain note.id before finalizing proof
    note.content_hmac = _existence_hmac(note.id, ct, created_iso)
    db.commit()
    log_audit(db=db, user=None, resource_type="welfare_note", resource_id=note.id, endpoint="welfare_notes",
              action="WELFARE_NOTE_CREATED", details={"existence_hmac": note.content_hmac, "case_id": case.id})
    return note


def read_note(db: Session, note_id: str, user) -> str:
    """Returns plaintext for welfare/admin. Destroyed notes are cryptographically
    unrecoverable — there is no access-control bypass, the key is gone."""
    note = db.query(WelfareNote).filter(WelfareNote.id == note_id).first()
    if not note:
        raise ValueError("Note not found")
    if note.status != "active" or not note.wrapped_dek_b64:
        raise PermissionError("Note was lawfully erased; content is cryptographically unrecoverable.")
    dek = _unwrap_dek(base64.b64decode(note.wrapped_dek_b64))
    plaintext = AESGCM(dek).decrypt(base64.b64decode(note.nonce_b64), base64.b64decode(note.ciphertext_b64), None)
    log_audit(db=db, user=user, resource_type="welfare_note", resource_id=note.id, endpoint="welfare_notes",
              action="WELFARE_NOTE_READ", details={"case_id": note.case_id})
    return plaintext.decode("utf-8")


def destroy_note(db: Session, note_id: str, user, reason: str) -> WelfareNote:
    note = db.query(WelfareNote).filter(WelfareNote.id == note_id).first()
    if not note:
        raise ValueError("Note not found")
    if note.status == "destroyed":
        return note
    note.wrapped_dek_b64 = None  # crypto-shred: DEK irrecoverable
    note.status = "destroyed"
    note.destroyed_at = datetime.now(timezone.utc)
    note.destroyed_reason = reason[:60]
    db.commit()
    log_audit(db=db, user=user, resource_type="welfare_note", resource_id=note.id, endpoint="welfare_notes",
              action="WELFARE_NOTE_DESTROYED", details={"existence_hmac": note.content_hmac, "reason": reason})
    try:
        from services.sync_service import sync_broadcaster
        sync_broadcaster.publish(
            "welfare_note_destroyed",
            {"note_id": note.id, "existence_hmac": note.content_hmac, "reason": reason},
            unit_id=None,
        )
    except Exception as e:  # pragma: no cover
        logger.debug(f"note-destroyed event publish skipped: {e}")
    return note


def sweep_expired(db: Session) -> int:
    """Destroys notes attached to cases resolved longer than the retention window.
    Active/pending cases are never touched by the sweep."""
    retention = int(settings.WELFARE_NOTE_RETENTION_DAYS)
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention)
    destroyed = 0
    notes = db.query(WelfareNote).filter(WelfareNote.status == "active").all()
    for n in notes:
        case = db.query(WelfareCase).filter(WelfareCase.id == n.case_id).first()
        if not case or case.status != "resolved" or not case.resolved_at:
            continue
        resolved = case.resolved_at
        if resolved.tzinfo is None:
            resolved = resolved.replace(tzinfo=timezone.utc)
        if resolved <= cutoff:
            destroy_note(db, n.id, user=None, reason="retention_expired")
            destroyed += 1
    if destroyed:
        logger.info(f"[F5] Crypto-erasure sweep destroyed {destroyed} expired welfare note(s).")
    return destroyed


def erasure_proof(db: Session, note_id: str) -> Dict[str, Any]:
    """Court-verifiable existence/destruction proof — content-free."""
    note = db.query(WelfareNote).filter(WelfareNote.id == note_id).first()
    if not note:
        raise ValueError("Note not found")
    return {
        "note_id": note.id,
        "case_id": note.case_id,
        "existence_hmac": note.content_hmac,
        "created_at": note.created_at.isoformat() if note.created_at else None,
        "status": note.status,
        "destroyed_at": note.destroyed_at.isoformat() if note.destroyed_at else None,
        "destroyed_reason": note.destroyed_reason,
        "proof_method": "SHA-256 existence HMAC over ciphertext + audit-ledger lifecycle entries; plaintext was envelope-encrypted with a per-note DEK that no longer exists."
        if note.status == "destroyed" else "SHA-256 existence HMAC over ciphertext; content remains encrypted at rest under per-note DEK.",
    }


def list_case_notes(db: Session, case_id: str) -> List[Dict[str, Any]]:
    notes = db.query(WelfareNote).filter(WelfareNote.case_id == case_id).order_by(WelfareNote.created_at.asc()).all()
    return [
        {
            "id": n.id,
            "author_user_id": n.author_user_id,
            "status": n.status,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "destroyed_at": n.destroyed_at.isoformat() if n.destroyed_at else None,
            "destroyed_reason": n.destroyed_reason,
            "existence_hmac": n.content_hmac,
        }
        for n in notes
    ]
