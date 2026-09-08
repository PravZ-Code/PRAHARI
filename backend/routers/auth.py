from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.auth import LoginRequest, TokenResponse, UserProfile
from middleware.rbac import verify_password, create_access_token, get_current_user
from middleware.audit import log_audit

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(login_req: LoginRequest, request: Request, db: Session = Depends(get_db)):
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

    log_audit(
        db=db,
        user=user,
        request=request,
        action="LOGIN_SUCCESS",
        resource_type="auth",
        resource_id=user.id,
        details={"username": user.username, "role": user.role}
    )

    profile = UserProfile(
        id=user.id,
        username=user.username,
        role=user.role,
        personnel_id=user.personnel_id,
        unit_id=user.unit_id
    )

    return TokenResponse(access_token=token, token_type="bearer", user=profile)

@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        personnel_id=current_user.personnel_id,
        unit_id=current_user.unit_id
    )
