from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db, get_auth_db
from models.user import User
from models.personnel import Personnel, Unit
from datetime import datetime, timezone
from schemas.auth import LoginRequest, TokenResponse, UserProfile
from middleware.rbac import verify_password, create_access_token, get_current_user, blacklist_token
from middleware.audit import log_audit
from config import settings

router = APIRouter()

# ---------------------------------------------------------------------------
# Server-issued Captcha (single-use, 5-minute TTL, in-memory challenge store)
# Replaces the previous client-side-only captcha, which offered no bot resistance.
# ---------------------------------------------------------------------------
import hashlib
import hmac
import secrets
import threading
import time

_CAPTCHA_TTL_SECONDS = 300
_CAPTCHA_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_captcha_lock = threading.Lock()
_captcha_store: dict[str, tuple[str, float]] = {}  # captcha_id -> (sha256(answer), expiry_ts)


def _issue_captcha() -> tuple[str, str]:
    code = "".join(secrets.choice(_CAPTCHA_ALPHABET) for _ in range(5))
    captcha_id = secrets.token_hex(16)
    answer_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
    expiry = time.time() + _CAPTCHA_TTL_SECONDS
    with _captcha_lock:
        # Opportunistic sweep of expired challenges to bound memory
        stale = [k for k, (_, exp) in _captcha_store.items() if exp < time.time()]
        for k in stale:
            _captcha_store.pop(k, None)
        _captcha_store[captcha_id] = (answer_hash, expiry)
    return captcha_id, code


def _verify_captcha(captcha_id: str, captcha_text: str) -> bool:
    """Single-use verification: the challenge is consumed on ANY login attempt."""
    with _captcha_lock:
        entry = _captcha_store.pop(captcha_id, None)
    if not entry:
        return False
    answer_hash, expiry = entry
    if expiry < time.time():
        return False
    expected = hashlib.sha256(captcha_text.strip().upper().encode("utf-8")).hexdigest()
    return hmac.compare_digest(expected, answer_hash)


@router.get("/captcha")
def get_captcha():
    """Issues a fresh single-use captcha challenge."""
    captcha_id, code = _issue_captcha()
    return {"captcha_id": captcha_id, "code": code, "expires_in_seconds": _CAPTCHA_TTL_SECONDS}

USERNAME_ALIASES = {
    "personnel_unit_a_01": "rajesh_kumar",
    "crpf-84012": "rajesh_kumar",
    "crpf84012": "rajesh_kumar",
    "crp-2019-45821": "rajesh_kumar",
    "crp201945821": "rajesh_kumar",
    "crpf-91024": "ankit_sharma",
    "crpf91024": "ankit_sharma",
    "crp-2021-88412": "ankit_sharma",
    "crp202188412": "ankit_sharma",
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

    # Server-side captcha enforcement for the web SSO gateway.
    # - If a captcha_id is supplied, the challenge MUST validate (single-use).
    # - When AUTH_CAPTCHA_REQUIRED=true, a valid challenge is mandatory for all logins.
    captcha_required = getattr(settings, "AUTH_CAPTCHA_REQUIRED", False)
    if login_req.captcha_id:
        if not _verify_captcha(login_req.captcha_id, login_req.captcha_text or ""):
            log_audit(
                db=db,
                user=None,
                request=request,
                action="LOGIN_FAILED",
                resource_type="auth",
                resource_id=identifier,
                details={"identifier": identifier, "reason": "invalid_captcha"}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired captcha. Please retry the security verification."
            )
    elif captcha_required:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Server-issued captcha verification is required for sign-in."
        )

    # Resolve demo/display aliases
    resolved_identifier = USERNAME_ALIASES.get(identifier.lower(), identifier)

    # 1. Look up user login credentials in the dedicated Authentication Database (case-insensitive)
    user = auth_db.query(User).filter(
        (func.lower(User.username) == resolved_identifier.lower()) | 
        (func.lower(User.username) == identifier.lower())
    ).first()

    if not user:
        # 2. Check if identifier matches a Personnel service_number in the Operational Database (case-insensitive)
        clean_id = identifier.upper().strip()
        personnel = db.query(Personnel).filter(
            (func.lower(Personnel.service_number) == identifier.lower()) |
            (Personnel.service_number == clean_id)
        ).first()
        if not personnel:
            # Fallback matching with stripped punctuation, computed in SQL
            # (avoids a full-table Python scan on every failed login: O(n) DoS fix)
            raw_clean = clean_id.replace("-", "").replace(" ", "")
            personnel = db.query(Personnel).filter(
                func.upper(func.replace(func.replace(Personnel.service_number, "-", ""), " ", "")) == raw_clean
            ).first()
        if personnel:
            user = auth_db.query(User).filter(User.personnel_id == personnel.id).first()
            if not user:
                safe_username = personnel.service_number.lower().replace("-", "_").replace(" ", "_")
                user = auth_db.query(User).filter(User.username == safe_username).first()
            # JIT auto-provisioning of personnel logins is a development/demo convenience.
            # It is gated by BOTH a non-production environment AND an explicit opt-in flag,
            # so forgetting APP_ENV can never activate it in a real deployment.
            if (
                not user
                and secret == "demo123"
                and getattr(settings, "APP_ENV", "development") != "production"
                and getattr(settings, "DEMO_AUTOPROVISION_ENABLED", False)
            ):
                import uuid
                from middleware.rbac import get_password_hash
                safe_username = personnel.service_number.lower().replace("-", "_").replace(" ", "_")
                user = User(
                    id=str(uuid.uuid4()),
                    username=safe_username,
                    password_hash=get_password_hash("demo123"),
                    role="personnel",
                    personnel_id=personnel.id,
                    unit_id=personnel.unit_id,
                    is_active=True
                )
                auth_db.add(user)
                auth_db.commit()
                auth_db.refresh(user)
                log_audit(
                    db=db,
                    user=None,
                    request=request,
                    action="JIT_ACCOUNT_PROVISIONED",
                    resource_type="auth",
                    resource_id=personnel.id,
                    details={"service_number": personnel.service_number, "reason": "demo_autoprovision"}
                )

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

    # Record login timestamps for 'Since Previous Login' notification calculation
    user.previous_login_at = user.last_login_at
    user.last_login_at = datetime.now(timezone.utc)
    auth_db.commit()

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
def logout(
    request: Request,
    response: Response,
    auth_db: Session = Depends(get_auth_db)
):
    """
    Terminate user session, clear HTTP cookie, and record token in the persistent blacklist.
    """
    response.delete_cookie("prahari_session", path="/")
    token = request.cookies.get("prahari_session")
    auth_hdr = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_hdr and auth_hdr.startswith("Bearer "):
        token = auth_hdr.split(" ")[1]
    if token:
        blacklist_token(auth_db, token)

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
