from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    username: Optional[str] = None
    service_number: Optional[str] = None
    password: Optional[str] = None
    pin: Optional[str] = None

class UserProfile(BaseModel):
    id: str
    username: str
    role: str
    personnel_id: Optional[str] = None
    unit_id: Optional[str] = None
    service_number: Optional[str] = None
    name: Optional[str] = None
    rank: Optional[str] = None
    unit_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
