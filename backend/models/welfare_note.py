import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class WelfareNote(Base):
    """F5: Provably erasable welfare note ('scribble-and-burn').

    Plaintext is encrypted under a per-note random DEK (AES-GCM); the DEK is
    wrapped with the system KEK. Erasure = destruction of the wrapped DEK, which
    renders the ciphertext cryptographically unrecoverable (crypto-shredding).
    The audit ledger retains only an existence HMAC + lifecycle events, so a
    court can verify 'a protected record existed and was lawfully destroyed'
    without ever accessing content (DPDP 2023 §12(3); MHCA 2017 §21/§23).
    """
    __tablename__ = "welfare_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("welfare_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    author_user_id = Column(String(36), nullable=False, index=True)
    ciphertext_b64 = Column(String, nullable=False)
    nonce_b64 = Column(String, nullable=False)
    wrapped_dek_b64 = Column(String, nullable=True)  # NULL after destruction (key irreversibly gone)
    content_hmac = Column(String(64), nullable=False)  # sha256 existence proof of ciphertext
    status = Column(String(15), nullable=False, default="active", index=True)  # active | destroyed
    destroyed_reason = Column(String(60), nullable=True)  # trooper_erasure_request | retention_expired | officer_manual
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    destroyed_at = Column(DateTime(timezone=True), nullable=True)
