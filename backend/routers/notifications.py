from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from database import get_db
from models.user import User
from middleware.rbac import get_current_user
from services.notification_service import (
    get_user_notifications,
    get_notification_summary,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    create_notification,
    clear_all_notifications,
    delete_notification,
)

router = APIRouter()


class NotificationResponse(BaseModel):
    id: str
    recipient_role: Optional[str] = None
    user_id: Optional[str] = None
    personnel_id: Optional[str] = None
    unit_id: Optional[str] = None
    title: str
    message: str
    link: Optional[str] = None
    priority: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationSummaryResponse(BaseModel):
    unread_count: int
    since_previous_login_count: int
    previous_login_at: Optional[str] = None
    last_login_at: Optional[str] = None


@router.get("", response_model=List[NotificationResponse])
@router.get("/", response_model=List[NotificationResponse])
def list_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns live database-backed notifications for the authenticated user,
    filtered by their authorization role and unit boundary.
    """
    notifs = get_user_notifications(
        db=db,
        current_user=current_user,
        unread_only=unread_only,
        limit=limit,
        offset=offset
    )
    return notifs


@router.get("/summary", response_model=NotificationSummaryResponse)
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Computes total unread count and notifications arrived specifically 'Since Previous Login'.
    """
    return get_notification_summary(db=db, current_user=current_user)


@router.put("/read-all")
def read_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Marks all unread notifications matching the user's role and unit as read.
    """
    count = mark_all_notifications_as_read(db=db, current_user=current_user)
    return {"message": f"Marked {count} notifications as read", "marked_count": count}


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def read_single_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Marks an individual notification as read in the database.
    """
    notif = mark_notification_as_read(db=db, notification_id=notification_id, current_user=current_user)
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access unauthorized"
        )
    return notif


@router.delete("", status_code=status.HTTP_200_OK)
@router.delete("/clear-all", status_code=status.HTTP_200_OK)
def clear_all_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently clears/deletes all notifications matching user role and unit boundary.
    """
    count = clear_all_notifications(db=db, current_user=current_user)
    return {"message": f"Successfully cleared {count} notifications", "cleared_count": count}


@router.delete("/{notification_id}", status_code=status.HTTP_200_OK)
def delete_single_notification_endpoint(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently deletes a single notification by ID from the database.
    """
    deleted = delete_notification(db=db, notification_id=notification_id, current_user=current_user)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access unauthorized"
        )
    return {"message": "Notification deleted successfully", "id": notification_id}

