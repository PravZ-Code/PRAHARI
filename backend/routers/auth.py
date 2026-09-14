from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.auth import LoginRequest, TokenResponse, UserProfile
from middleware.rbac import verify_password, create_access_token, get_current_user
from middleware.audit import log_audit
from config import settings

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(login_req: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_req.username).first()
    if not user or not verify_password(login_req.password, user.password_hash):
        log_audit(
            db=db,
            user=None,
            request=request,
            action="LOGIN_FAILED",
            resource_type="auth",
            resource_id=login_req.username,
            details={"username": login_req.username, "reason": "invalid_credentials"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # Production Hardening Guard: Strictly reject default demonstration passwords in production environment
    if getattr(settings, "APP_ENV", "development") == "production" and login_req.password == "demo123":
        log_audit(
            db=db,
            user=user,
            request=request,
            action="LOGIN_REJECTED_PRODUCTION_GUARD",
            resource_type="auth",
            resource_id=user.id,
            details={"username": user.username, "reason": "default_demo_password_blocked_in_production"}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Production Security Policy: Default demonstration credentials ('demo123') are strictly disabled. Please use authorized PKI / CAC credentials."
        )

    if not user.is_active:
        log_audit(
            db=db,
            user=user,
            request=request,
            action="LOGIN_BLOCKED",
            resource_type="auth",
            resource_id=user.id,
            details={"username": user.username, "reason": "account_deactivated"}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated or suspended"
        )

    token_data = {
        "sub": user.id,
        "username": user.username,
        "role": user.role,
        "personnel_id": user.personnel_id,
        "unit_id": user.unit_id
    }
    token = create_access_token(token_data)
    is_https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    response.set_cookie(
        key="prahari_session",
        value=token,
        max_age=int(settings.JWT_EXPIRY_HOURS * 3600),
        httponly=True,
        secure=is_https,
        samesite="lax",
        path="/",
    )

    log_audit(
        db=db,
        user=user,
        request=request,
        action="LOGIN_SUCCESS",
        resource_type="auth",
        resource_id=user.id,
        details={"username": user.username, "role": user.role}
    )

    profile = _build_user_profile(user)
    return TokenResponse(access_token=token, token_type="bearer", user=profile)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie("prahari_session", path="/")

def _build_user_profile(user: User) -> UserProfile:
    service_number = user.personnel.service_number if user.personnel else None
    name = user.personnel.name if user.personnel else None
    rank = user.personnel.rank if user.personnel else None
    unit_name = user.unit.name if user.unit else (user.personnel.unit.name if user.personnel and user.personnel.unit else None)
    return UserProfile(
        id=user.id,
        username=user.username,
        role=user.role,
        personnel_id=user.personnel_id,
        unit_id=user.unit_id,
        service_number=service_number,
        name=name,
        rank=rank,
        unit_name=unit_name
    )

@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    return _build_user_profile(current_user)
