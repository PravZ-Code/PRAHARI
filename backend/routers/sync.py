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
    db: Session = Depends(get_db)
):
    """
    Returns only records modified or created since the provided cursor/timestamp.
    Supports HTTP ETag and 304 Not Modified to eliminate unnecessary payload transfers.
    """
    delta_result = compute_sync_delta(db, since=since, unit_id=unit_id)
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
):
    """
    Real-time SSE event stream delivering live database mutation events
    (grievance created/approved, assessment submitted, emergency SOS) to frontend clients.
    """
    queue = sync_broadcaster.subscribe()

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

                    # Optional unit filtering
                    if unit_id and packet.get("unit_id") and packet.get("unit_id") != unit_id:
                        continue

                    event_type = packet.get("event", "database_mutation")
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
):
    """
    Ingests an array of offline mutations buffered on client devices.
    Executes in an atomic SQLite transaction and publishes real-time sync events.
    """
    items = request_data.get("items", [])
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="Invalid request format: 'items' must be a list")

    return process_batch_push(db, items=items)
