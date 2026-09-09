from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import Optional
import httpx

from config import settings
from database import get_db
from models.user import User
from models.welfare_case import WelfareCase
from schemas.copilot import (
    CopilotBriefRequest,
    CopilotBriefResponse,
    CopilotChatRequest,
    CopilotChatResponse
)
from services.copilot_service import (
    generate_copilot_brief,
    chat_with_copilot,
    gather_trooper_dossier
)
from middleware.rbac import require_role
from middleware.audit import log_audit

router = APIRouter()

@router.get("/status")
async def get_copilot_status(
    current_user: User = Depends(require_role("welfare", "admin", "commander"))
):
    """
    Checks connection status with local Ollama AI engine.
    """
    ollama_online = False
    models_available = [settings.OLLAMA_MODEL]

    try:
        timeout = httpx.Timeout(2.0, connect=1.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags")
            if resp.status_code == 200:
                ollama_online = True
                data = resp.json()
                detected_models = [m.get("name") for m in data.get("models", [])]
                if detected_models:
                    models_available = detected_models
    except Exception:
        ollama_online = False

    return {
        "status": "operational",
        "primary_provider": settings.LLM_PROVIDER,
        "primary_model": settings.OLLAMA_MODEL,
        "ollama_base_url": settings.OLLAMA_BASE_URL,
        "ollama_target_model": settings.OLLAMA_MODEL,
        "ollama_connected": ollama_online,
        "available_models": models_available,
        "clinical_lexicon_guardrail": "ACTIVE (Mental Healthcare Act 2017 compliant)",
        "fallback_engine": "ACTIVE (Grounded Deterministic Defense Intelligence)"
    }

@router.post("/brief/{case_id}", response_model=CopilotBriefResponse)
@router.post("/case/{case_id}/copilot-brief", response_model=CopilotBriefResponse)
@router.post("/case/{case_id}/brief", response_model=CopilotBriefResponse)
async def create_case_brief(
    case_id: str,
    request: Request,
    req: Optional[CopilotBriefRequest] = None,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    """
    Generates a structured, evidence-grounded intelligence brief for a welfare case.
    Strictly follows defense clinical lexicon guardrails and includes [CITED: ...] tags.
    """
    # Verify case exists
    case = db.query(WelfareCase).filter(WelfareCase.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Welfare case '{case_id}' not found"
        )

    try:
        brief_data = await generate_copilot_brief(
            db=db,
            case_id=case_id,
            focus_areas=req.focus_areas if req else None,
            custom_instructions=req.custom_instructions if req else None
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Intelligence brief generation failure: {str(e)}"
        )

    log_audit(
        db=db,
        user=current_user,
        request=request,
        resource_type="copilot_brief",
        resource_id=case_id,
        details={"model_used": brief_data.get("model_used"), "is_fallback": brief_data.get("is_fallback")}
    )

    return brief_data

@router.get("/brief/{case_id}", response_model=CopilotBriefResponse)
@router.get("/case/{case_id}/copilot-brief", response_model=CopilotBriefResponse)
async def get_case_brief_alias(
    case_id: str,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    """
    GET alias for convenience in UI drawers and preview cards.
    """
    return await create_case_brief(case_id=case_id, request=request, req=None, current_user=current_user, db=db)

@router.post("/chat", response_model=CopilotChatResponse)
@router.post("/copilot/chat", response_model=CopilotChatResponse)
async def copilot_chat(
    req: CopilotChatRequest,
    request: Request,
    current_user: User = Depends(require_role("welfare", "admin")),
    db: Session = Depends(get_db)
):
    """
    Contextual Q&A with Local AI Copilot regarding soldier stress catalysts,
    URO roster shift swaps, leave friction resolution, and welfare regulations.
    """
    if req.case_id:
        case = db.query(WelfareCase).filter(WelfareCase.id == req.case_id).first()
        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Welfare case '{req.case_id}' not found"
            )

    try:
        chat_data = await chat_with_copilot(
            db=db,
            message=req.message,
            case_id=req.case_id,
            personnel_id=req.personnel_id,
            conversation_history=req.conversation_history
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Copilot chat execution error: {str(e)}"
        )

    log_audit(
        db=db,
        user=current_user,
        request=request,
        resource_type="copilot_chat",
        resource_id=req.case_id or req.personnel_id,
        details={"query_length": len(req.message), "is_fallback": chat_data.get("is_fallback")}
    )

    return chat_data