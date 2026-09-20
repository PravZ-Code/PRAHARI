from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from database import get_db, get_auth_db
from models.user import User
from models.personnel import Personnel, Unit
from schemas.auth import LoginRequest, TokenResponse, UserProfile
from middleware.rbac import verify_password, create_access_token, get_current_user
from middleware.audit import log_audit
from config import settings

router = APIRouter()

USERNAME_ALIASES = {
    "personnel_unit_a_01": "rajesh_kumar",
    "commander_unit_a": "cmd_vikram",
    "welfare_officer_01": "wo_meera",
    "system_admin": "admin_sys",
}

@router.post("/login", response_model=TokenResponse)
def login(
    login_req: LoginRequest,
    request: Request,
    response: Response,
    auth_db: Session = Depends(get_auth_db),
    db: Session = Depends(get_db)
):
    identifier = (login_req.service_number or login_req.username or "").strip()
    secret = (login_req.pin or login_req.password or "").strip()
    if not identifier or not secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service number/username and PIN/password are required"
        )

    # Resolve demo/display aliases
    resolved_identifier = USERNAME_ALIASES.get(identifier.lower(), identifier)

    # 1. Look up user login credentials in the dedicated Authentication Database
    user = auth_db.query(User).filter(
        (User.username == resolved_identifier) | (User.username == identifier)
    ).first()

    if not user:
        # 2. Check if identifier matches a Personnel service_number in the Operational Database
        clean_id = identifier.upper().strip()
        personnel = db.query(Personnel).filter(
            (Personnel.service_number == clean_id) | (Personnel.service_number == identifier)
        ).first()
        if not personnel:
            # Fallback matching with stripped punctuation
            raw_clean = clean_id.replace("-", "").replace(" ", "")
            all_p = db.query(Personnel).filter(Personnel.service_number.isnot(None)).all()
            for p in all_p:
                if p.service_number and p.service_number.replace("-", "").replace(" ", "").upper() == raw_clean:
                    personnel = p
                    break

        if personnel:
            user = auth_db.query(User).filter(User.personnel_id == personnel.id).first()
            if not user:
                safe_username = personnel.service_number.lower().replace("-", "_").replace(" ", "_")
                user = auth_db.query(User).filter(User.username == safe_username).first()

    if not user or not verify_password(secret, user.password_hash):
        log_audit(
            db=db,
            user=None,
            request=request,
            action="LOGIN_FAILED",
            resource_type="auth",
            resource_id=identifier,
            details={"identifier": identifier, "reason": "invalid_credentials"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password (or invalid service number/PIN)"
        )

    # Production Hardening Guard: Strictly reject default demonstration passwords in production environment
    if getattr(settings, "APP_ENV", "development") == "production" and secret == "demo123":
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

    profile = _build_user_profile(user, db=db)
    return TokenResponse(access_token=token, token_type="bearer", user=profile)

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refresh authentication token with extended expiry for field personnel.
    """
    token_data = {
        "sub": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "personnel_id": current_user.personnel_id,
        "unit_id": current_user.unit_id
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
    profile = _build_user_profile(current_user, db=db)
    return TokenResponse(access_token=token, token_type="bearer", user=profile)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie("prahari_session", path="/")

def _build_user_profile(user: User, db: Session = None) -> UserProfile:
    """Build rich UserProfile by resolving people information from the Operational/Personnel DB."""
    personnel = None
    unit = None
    if db is not None:
        if user.personnel_id:
            personnel = db.query(Personnel).filter(Personnel.id == user.personnel_id).first()
        if user.unit_id:
            unit = db.query(Unit).filter(Unit.id == user.unit_id).first()
    else:
        personnel = user.personnel
        unit = user.unit

    service_number = personnel.service_number if personnel else None
    name = personnel.name if personnel else None
    rank = personnel.rank if personnel else None
    unit_name = unit.name if unit else (personnel.unit.name if personnel and personnel.unit else None)
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
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _build_user_profile(current_user, db=db)
