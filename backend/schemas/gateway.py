from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class IVRDTMFRequest(BaseModel):
    call_sid: str = Field(..., description="Unique carrier telephony call identifier")
    caller_phone: str = Field(..., description="Caller mobile number")
    digits_pressed: str = Field(..., description="DTMF tone entered by user")
    service_number: Optional[str] = Field(None, description="Optional service number if authenticated")

class IVRDTMFResponse(BaseModel):
    call_sid: str
    prompt_text: str
    action_taken: str
    status: str
    case_created_id: Optional[str] = None

class USSDRequest(BaseModel):
    session_id: str
    phone_number: str
    user_input: str
    service_number: Optional[str] = None

class USSDResponse(BaseModel):
    session_id: str
    message: str
    continue_session: bool

class SMSIncomingRequest(BaseModel):
    message_sid: str
    sender_phone: str
    message_body: str
    service_number: Optional[str] = None

class SMSIncomingResponse(BaseModel):
    message_sid: str
    reply_text: str
    action_executed: str
    case_created_id: Optional[str] = None
