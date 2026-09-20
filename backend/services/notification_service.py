from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from models.notification import Notification
from models.user import User
from services.sync_service import sync_broadcaster


def create_notification(
    db: Session,
    title: str,
    message: str,
    recipient_role: Optional[str] = None,
    user_id: Optional[str] = None,
    personnel_id: Optional[str] = None,
    unit_id: Optional[str] = None,
    link: Optional[str] = None,
    priority: str = "normal",
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    commit: bool = True
) -> Notification:
    """
    Creates and persists an official notification record in prahari.db,
    then broadcasts a real-time event to connected clients.
    """
    notif = Notification(
        recipient_role=recipient_role,
        user_id=user_id,
        personnel_id=personnel_id,
        unit_id=unit_id,
        title=title,
        message=message,
        link=link,
        priority=priority.lower(),
        entity_type=entity_type,
        entity_id=entity_id,
        is_read=False,
    )
    db.add(notif)
    if commit:
        db.commit()
        db.refresh(notif)

    # Publish real-time event
    payload = {
        "id": notif.id,
        "recipient_role": notif.recipient_role,
        "user_id": notif.user_id,
        "personnel_id": notif.personnel_id,
        "unit_id": notif.unit_id,
        "title": notif.title,
        "message": notif.message,
        "link": notif.link,
        "priority": notif.priority,
        "entity_type": notif.entity_type,
        "entity_id": notif.entity_id,
        "created_at": notif.created_at.isoformat() if notif.created_at else datetime.now(timezone.utc).isoformat(),
    }
    sync_broadcaster.publish("notification_created", payload, unit_id=unit_id)
    return notif


def _build_user_filter(current_user: User):
    """
    Builds authorization filter so users only receive notifications authorized for their role & unit.
    """
    role = (current_user.role or "").lower()
    user_id = current_user.id
    pid = current_user.personnel_id
    unit_id = current_user.unit_id

    if role == "admin":
        return True  # Admins see system-wide alerts

    conditions = []
    # Always include notifications specifically directed to this user account
    conditions.append(Notification.user_id == user_id)

    if pid:
        conditions.append(Notification.personnel_id == pid)

    if role in ("personnel", "jawan", "soldier"):
        conditions.append(Notification.recipient_role.in_(["personnel", "all"]))
    elif role in ("welfare", "welfare_officer"):
        welfare_cond = Notification.recipient_role.in_(["welfare", "welfare_officer", "all"])
        if unit_id:
            welfare_cond = and_(welfare_cond, or_(Notification.unit_id.is_(None), Notification.unit_id == unit_id))
        conditions.append(welfare_cond)
    elif role == "commander":
        cmd_cond = Notification.recipient_role.in_(["commander", "all"])
        if unit_id:
            cmd_cond = and_(cmd_cond, or_(Notification.unit_id.is_(None), Notification.unit_id == unit_id))
        conditions.append(cmd_cond)

    return or_(*conditions)


def get_user_notifications(
    db: Session,
    current_user: User,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0
) -> List[Notification]:
    query = db.query(Notification).filter(_build_user_filter(current_user))
    if unread_only:
        query = query.filter(Notification.is_read == False)
    return query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()


def get_notification_summary(db: Session, current_user: User) -> Dict[str, Any]:
    """
    Computes total unread notifications and the 'Since Previous Login' count.
    """
    user_filter = _build_user_filter(current_user)
    base_query = db.query(Notification).filter(user_filter, Notification.is_read == False)
    total_unread = base_query.count()

    prev_login = current_user.previous_login_at
    since_prev_count = 0
    if prev_login:
        since_prev_count = base_query.filter(Notification.created_at > prev_login).count()
    else:
        # First-ever session: all unread notifications are considered new since login
        since_prev_count = total_unread

    return {
        "unread_count": total_unread,
        "since_previous_login_count": since_prev_count,
        "previous_login_at": prev_login.isoformat() if prev_login else None,
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
    }


def mark_notification_as_read(db: Session, notification_id: str, current_user: User) -> Optional[Notification]:
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        _build_user_filter(current_user)
    ).first()
    if not notif:
        return None

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notif)

    sync_broadcaster.publish("notification_read", {
        "id": notif.id,
        "user_id": current_user.id,
    }, unit_id=notif.unit_id)
    return notif


def mark_all_notifications_as_read(db: Session, current_user: User) -> int:
    unreads = db.query(Notification).filter(
        _build_user_filter(current_user),
        Notification.is_read == False
    ).all()
    now = datetime.now(timezone.utc)
    count = len(unreads)
    for n in unreads:
        n.is_read = True
        n.read_at = now
    db.commit()

    sync_broadcaster.publish("notification_read_all", {
        "user_id": current_user.id,
        "count": count
    }, unit_id=current_user.unit_id)
    return count


def clear_all_notifications(db: Session, current_user: User) -> int:
    """
    Permanently deletes all notifications matching the user's role and unit boundary.
    """
    notifs = db.query(Notification).filter(_build_user_filter(current_user)).all()
    count = len(notifs)
    for n in notifs:
        db.delete(n)
    db.commit()

    sync_broadcaster.publish("notifications_cleared", {
        "user_id": current_user.id,
        "cleared_count": count
    }, unit_id=current_user.unit_id)
    return count


def delete_notification(db: Session, notification_id: str, current_user: User) -> bool:
    """
    Permanently deletes a single notification matching user authorization.
    """
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        _build_user_filter(current_user)
    ).first()
    if not notif:
        return False

    unit_id = notif.unit_id
    db.delete(notif)
    db.commit()

    sync_broadcaster.publish("notification_deleted", {
        "id": notification_id,
        "user_id": current_user.id,
    }, unit_id=unit_id)
    return True

