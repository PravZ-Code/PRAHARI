"""
PRAHARI Real-Time Database Synchronization Router
Exposes SSE live streaming, sub-millisecond delta sync, database telemetry, and batch offline queue ingestion.
"""
import asyncio
import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Request, Response, Query, Header, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from middleware.rbac import get_current_user, ROLE_ALIASES
from services.sync_service import (
    sync_broadcaster,
    format_sse,
    get_sync_status,
    compute_sync_delta,
    process_batch_push,
)

logger = logging.getLogger("prahari.sync.router")

router = APIRouter()


@router.get("/status", summary="Real-time Database Telemetry & Latency Probe")
def sync_status_endpoint(db: Session = Depends(get_db)):
    """
    Sub-millisecond probe measuring current SQLite connection latency,
    record counts, WAL status, and version epoch.
    """
    return get_sync_status(db)


@router.get("/delta", summary="Incremental Delta Synchronization")
def sync_delta_endpoint(
    since: Optional[str] = Query(None, description="ISO timestamp or unix epoch to query delta from"),
    unit_id: Optional[str] = Query(None, description="Optional unit filter"),
    if_none_match: Optional[str] = Header(None, alias="If-None-Match"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns only records modified or created since the provided cursor/timestamp.
    Requires authentication. Frontline jawans only receive their own records; commanders
    are protected by the Mental Healthcare Act §21 firewall from viewing individual self-assessments.
    Supports HTTP ETag and 304 Not Modified to eliminate unnecessary payload transfers.
    """
    delta_result = compute_sync_delta(db, since=since, unit_id=unit_id, current_user=current_user)
    etag = delta_result.get("etag")

    if if_none_match and etag:
        inm_clean = if_none_match.strip('W/" ')
        etag_clean = etag.strip('W/" ')
        if inm_clean == etag_clean or if_none_match == etag:
            return Response(status_code=304, headers={"ETag": etag})

    return Response(
        content=json.dumps(delta_result),
        media_type="application/json",
        headers={"ETag": etag or ""},
    )


@router.get("/stream", summary="Live Server-Sent Events (SSE) Database Stream")
async def sync_stream_endpoint(
    request: Request,
    unit_id: Optional[str] = Query(None, description="Optional unit filter"),
    max_events: Optional[int] = Query(None, description="Optional limit of events before stream completion"),
    current_user: User = Depends(get_current_user),
):
    """
    Real-time SSE event stream delivering live database mutation events
    (grievance created/approved, assessment submitted, emergency SOS) to frontend clients.
    Enforces authentication and real-time subscriber authorization filtering.
    """
    queue = sync_broadcaster.subscribe()

    raw_role = getattr(current_user, "role", "") or ""
    role = ROLE_ALIASES.get(raw_role.lower(), raw_role.lower())
    user_pid = getattr(current_user, "personnel_id", None)
    user_unit = getattr(current_user, "unit_id", None)

    async def event_generator():
        sent_count = 0
        try:
            # Yield initial connection handshake
            init_payload = {
                "status": "connected",
                "message": "PRAHARI Live Database Sync Stream Active",
                "active_clients": sync_broadcaster.active_subscribers_count,
            }
            yield format_sse("sync_connected", init_payload)
            sent_count += 1
            if max_events and sent_count >= max_events:
                return

            while True:
                if await request.is_disconnected():
                    break
                try:
                    # Wait up to 15 seconds for a published database event
                    packet = await asyncio.wait_for(queue.get(), timeout=15.0)

                    # Optional unit filtering: non-admin/welfare users cannot listen across units
                    packet_unit = packet.get("unit_id")
                    if user_unit and role not in ("admin", "welfare"):
                        if packet_unit and packet_unit != user_unit:
                            continue
                    elif unit_id and packet_unit and packet_unit != unit_id:
                        continue

                    # Role-based event confidentiality & MHCA §21 firewall filtering
                    event_type = packet.get("event", "database_mutation")
                    event_data = packet.get("data", {})
                    event_pid = event_data.get("personnel_id")

                    if event_type == "assessment_submitted":
                        if role == "personnel":
                            if not user_pid or event_pid != user_pid:
                                continue
                        elif role == "commander":
                            # MHCA §21 Firewall: Company commanders must NEVER receive individual psychological self-assessments
                            continue
                    elif event_type in ("grievance_created", "grievance_approved", "grievance_rejected"):
                        if role == "personnel":
                            if not user_pid or event_pid != user_pid:
                                continue
                    elif event_type == "emergency_sos":
                        if role == "personnel":
                            if not user_pid or event_pid != user_pid:
                                continue
                    elif event_type == "notification_created":
                        target_role = (event_data.get("recipient_role") or "").lower()
                        target_uid = event_data.get("user_id")
                        target_pid = event_data.get("personnel_id")
                        if role == "personnel":
                            if target_role not in ("personnel", "all") and target_uid != current_user.id and target_pid != user_pid:
                                continue
                        elif role == "commander":
                            if target_role not in ("commander", "all") and target_uid != current_user.id:
                                continue
                        elif role in ("welfare", "welfare_officer"):
                            if target_role not in ("welfare", "welfare_officer", "all") and target_uid != current_user.id:
                                continue

                    yield format_sse(event_type, packet)
                    sent_count += 1
                    if max_events and sent_count >= max_events:
                        break

                except asyncio.TimeoutError:
                    # Keep-alive heartbeat comment to prevent proxy/socket termination
                    yield f": heartbeat {int(asyncio.get_event_loop().time())}\n\n"

        except asyncio.CancelledError:
            pass
        finally:
            sync_broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/push", summary="Atomic Batch Ingestion for Offline Queues")
def sync_push_endpoint(
    request_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ingests an array of offline mutations buffered on client devices.
    Executes in an atomic SQLite transaction and publishes real-time sync events.
    Strictly enforces authentication and trooper self-identity constraints.
    """
    items = request_data.get("items", [])
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="Invalid request format: 'items' must be a list")

    return process_batch_push(db, items=items, current_user=current_user)
