from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class CopilotBriefRequest(BaseModel):
    case_id: Optional[str] = Field(None, description="Welfare case ID to generate brief for")
    personnel_id: Optional[str] = Field(None, description="Optional soldier personnel ID")
    focus_areas: Optional[List[str]] = Field(None, description="Optional areas of focus e.g. ['leave', 'duty', 'shap', 'peer']")
    custom_instructions: Optional[str] = Field(None, description="Optional instructions to tailor brief")

class CopilotBriefResponse(BaseModel):
    case_id: str
    personnel_id: str
    personnel_name: str
    personnel_rank: str
    unit_name: str
    risk_level: str
    risk_score: float
    brief_markdown: str
    cited_sources: List[str]
    is_fallback: bool
    model_used: str
    generated_at: str
    evidence_summary: Optional[Dict[str, Any]] = None

class CopilotChatRequest(BaseModel):
    message: str = Field(..., description="Welfare Officer query or operational question")
    case_id: Optional[str] = Field(None, description="Target welfare case ID")
    personnel_id: Optional[str] = Field(None, description="Target soldier personnel ID")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Previous messages in chat")

class CopilotChatResponse(BaseModel):
    response: str
    case_id: Optional[str] = None
    personnel_id: Optional[str] = None
    cited_sources: List[str] = []
    is_fallback: bool = False
    model_used: str = "qwen3:8b"
    generated_at: str