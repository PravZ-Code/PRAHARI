"""F5 — Provably erasable welfare notes (welfare/admin only; trooper via own erasure channel)."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from middleware.audit import log_audit
from middleware.rbac import require_role
from models.user import User
from models.welfare_case import WelfareCase
from services import secure_note_service

router = APIRouter()


class NoteIn(BaseModel):
    case_id: str
    plaintext: str


class DestroyIn(BaseModel):
    reason: Optional[str] = None


@router.post("/notes", status_code=201)
def create_note(
    body: NoteIn,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db),
):
    case = db.query(WelfareCase).filter(WelfareCase.id == body.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Welfare case not found")
    note = secure_note_service.create_note(db, case, author_user_id=current_user.id, plaintext=body.plaintext)
    log_audit(db=db, user=current_user, request=request, resource_type="welfare_note",
              resource_id=note.id, action="WELFARE_NOTE_CREATED_VIA_API", details={"case_id": case.id})
    return {"id": note.id, "case_id": note.case_id, "status": note.status, "existence_hmac": note.content_hmac}


@router.get("/notes/{note_id}")
def read_note(
    note_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db),
):
    try:
        text = secure_note_service.read_note(db, note_id, current_user)
    except PermissionError as e:
        raise HTTPException(status_code=410, detail=str(e))
    except ValueError:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"id": note_id, "plaintext": text}


@router.post("/notes/{note_id}/destroy")
def destroy_note(
    note_id: str,
    body: DestroyIn,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db),
):
    reason = (body.reason or "officer_manual")[:60]
    try:
        note = secure_note_service.destroy_note(db, note_id, current_user, reason)
    except ValueError:
        raise HTTPException(status_code=404, detail="Note not found")
    log_audit(db=db, user=current_user, request=request, resource_type="welfare_note",
              resource_id=note.id, action="WELFARE_NOTE_DESTROYED_VIA_API", details={"reason": reason})
    return {"id": note.id, "status": note.status, "existence_hmac": note.content_hmac}


@router.get("/notes/{note_id}/proof")
def erasure_proof(
    note_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin", "commander")),
    db: Session = Depends(get_db),
):
    try:
        proof = secure_note_service.erasure_proof(db, note_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Note not found")
    log_audit(db=db, user=current_user, request=request, resource_type="welfare_note",
              resource_id=note_id, action="WELFARE_NOTE_PROOF_VIEW", details={})
    return proof


@router.get("/case/{case_id}/notes")
def list_case_notes(
    case_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db),
):
    return {"case_id": case_id, "notes": secure_note_service.list_case_notes(db, case_id)}


@router.post("/notes/sweep", status_code=200)
def sweep_expired_notes(
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    destroyed = secure_note_service.sweep_expired(db)
    log_audit(db=db, user=current_user, request=request, resource_type="welfare_note",
              resource_id="sweep", action="WELFARE_NOTE_SWEEP", details={"destroyed": destroyed})
    return {"destroyed": destroyed}
