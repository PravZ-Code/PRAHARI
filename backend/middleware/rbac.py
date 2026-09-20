import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from config import settings
from database import get_db, get_auth_db
import hashlib
from models.user import User, TokenBlacklist

security = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def blacklist_token(auth_db: Session, token: str):
    """
    Records revoked JWT in the persistent TokenBlacklist table.
    """
    try:
        t_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        existing = auth_db.query(TokenBlacklist).filter(TokenBlacklist.token_hash == t_hash).first()
        if not existing:
            payload = None
            try:
                payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM], options={"verify_exp": False})
            except Exception:
                pass
            jti = payload.get("jti") if payload else None
            exp_ts = payload.get("exp") if payload else None
            exp_dt = datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts else None
            bl = TokenBlacklist(token_hash=t_hash, token_jti=jti, expires_at=exp_dt)
            auth_db.add(bl)
            auth_db.commit()
    except Exception:
        auth_db.rollback()

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_db: Session = Depends(get_auth_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials.credentials if credentials else (
        request.cookies.get("prahari_session") or request.query_params.get("token")
    )
    if not token:
        raise credentials_exception

    # Verify token is not in server-side blacklist
    t_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    if auth_db.query(TokenBlacklist).filter(TokenBlacklist.token_hash == t_hash).first():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been terminated / token revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = auth_db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or not found")
    return user

async def get_optional_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_db: Session = Depends(get_auth_db)
) -> Optional[User]:
    token = credentials.credentials if credentials else (
        request.cookies.get("prahari_session") or request.query_params.get("token")
    )
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user = auth_db.query(User).filter(User.id == user_id).first()
        if user is None or not user.is_active:
            return None
        return user
    except Exception:
        return None

ROLE_ALIASES = {
    "welfare_officer": "welfare",
    "soldier": "personnel",
    "jawan": "personnel",
}

def require_role(*allowed_roles: str):
    """
    Dependency that ensures the authenticated user possesses one of the allowed roles.
    Example: Depends(require_role('welfare', 'admin'))
    """
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        user_role = (user.role or "").lower()
        canonical_role = ROLE_ALIASES.get(user_role, user_role)
        allowed_lower = [r.lower() for r in allowed_roles]
        if user_role not in allowed_lower and canonical_role not in allowed_lower:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Role '{user.role}' is not authorized. Required: {list(allowed_roles)}"
            )
        return user
    return role_checker
