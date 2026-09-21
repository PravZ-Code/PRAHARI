"""
PRAHARI Real-Time Database Synchronization Router
Exposes dual-mode transport:
- Full-duplex WebSockets (/sync/ws) with bi-directional heartbeats & instant catch-up
- Live Server-Sent Events (/sync/stream) with HTTP keep-alive
- Sub-millisecond delta queries (/sync/delta) with ETag caching
- Atomic batch offline queue ingestion (/sync/push)
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import (
    APIRouter, Depends, Request, Response, Query, Header, HTTPException,
    WebSocket, WebSocketDisconnect, status
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db, AuthSessionLocal
from models.user import User
from middleware.rbac import get_current_user, decode_access_token, ROLE_ALIASES
from config import settings
from services.sync_service import (
    sync_broadcaster,
    filter_event_for_user,
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
    Sub-millisecond probe measuring current connection latency,
    record counts, WAL status, current broadcast sequence, and cluster health.
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
    Enforces authentication & Section 21 of the Mental Healthcare Act privacy firewall.
    Supports HTTP ETag and 304 Not Modified to minimize payload transfers.
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


@router.get("/replay", summary="Replay Missed Events by Sequence Number")
def sync_replay_endpoint(
    since_seq: Optional[int] = Query(None, description="Monotonic sequence number to replay from"),
    since_timestamp: Optional[str] = Query(None, description="ISO timestamp to replay from"),
    current_user: User = Depends(get_current_user),
):
    """
    Instantly returns all broadcast events since a given sequence ID or timestamp.
    Filters every event against the user's role and Section 21 MHA privacy boundaries.
    """
    events = sync_broadcaster.get_events_since(since_seq=since_seq, since_timestamp=since_timestamp)
    authorized_events = [e for e in events if filter_event_for_user(e, current_user)]
    return {
        "current_sequence": sync_broadcaster.current_sequence,
        "count": len(authorized_events),
        "events": authorized_events
    }


@router.get("/stream", summary="Live Server-Sent Events (SSE) Database Stream")
async def sync_stream_endpoint(
    request: Request,
    unit_id: Optional[str] = Query(None, description="Optional unit filter"),
    since_seq: Optional[int] = Query(None, description="Replay missed events starting after this sequence"),
    max_events: Optional[int] = Query(None, description="Optional limit of events before stream completion"),
    current_user: User = Depends(get_current_user),
):
    """
    Real-time SSE event stream delivering live database mutation events
    (grievance created/approved, assessment submitted, emergency SOS, roster swap) to frontend clients.
    Enforces authentication and real-time subscriber authorization filtering with §21 MHA compliance.
    """
    queue = sync_broadcaster.subscribe()

    async def event_generator():
        sent_count = 0
        try:
            # 1. Yield initial connection handshake
            init_payload = {
                "status": "connected",
                "message": "PRAHARI Live Database Sync Stream Active",
                "active_clients": sync_broadcaster.active_subscribers_count,
                "current_sequence": sync_broadcaster.current_sequence,
                "cluster_mode": sync_broadcaster.is_cluster_mode,
            }
            yield format_sse("sync_connected", init_payload, event_id=str(sync_broadcaster.current_sequence))
            sent_count += 1
            if max_events and sent_count >= max_events:
                return

            # 2. Replay missed events if requested
            if since_seq is not None:
                missed = sync_broadcaster.get_events_since(since_seq=since_seq)
                for m_packet in missed:
                    if filter_event_for_user(m_packet, current_user):
                        yield format_sse(
                            m_packet.get("event", "database_mutation"),
                            m_packet,
                            event_id=str(m_packet.get("seq", ""))
                        )
                        sent_count += 1
                        if max_events and sent_count >= max_events:
                            return

            # 3. Stream live events
            while True:
                if await request.is_disconnected():
                    break
                try:
                    packet = await asyncio.wait_for(queue.get(), timeout=settings.SYNC_HEARTBEAT_INTERVAL)

                    # Filter by unit if requested
                    packet_unit = packet.get("unit_id")
                    if unit_id and packet_unit and packet_unit != unit_id:
                        continue

                    # Role-based statutory authorization and MHCA §21 firewall check
                    if not filter_event_for_user(packet, current_user):
                        continue

                    event_type = packet.get("event", "database_mutation")
                    seq_str = str(packet.get("seq", ""))
                    yield format_sse(event_type, packet, event_id=seq_str)
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


@router.websocket("/ws")
async def sync_websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Full-duplex WebSocket endpoint for real-time synchronization.
    Supports:
    - Bi-directional message exchange and heartbeat ping/pong
    - Immediate event push with Section 21 MHA confidentiality filtering
    - Reconnection event catch-up by sequence number
    - Client offline queue batch synchronization via WebSocket frame
    """
    await websocket.accept()

    # Authenticate token from query parameter or initial frame
    user = None
    if token:
        try:
            payload = decode_access_token(token)
            sub_val = payload.get("sub")
            if sub_val:
                auth_db = AuthSessionLocal()
                try:
                    user = auth_db.query(User).filter((User.id == sub_val) | (User.username == sub_val)).first()
                finally:
                    auth_db.close()
        except Exception:
            user = None

    if not user:
        # Wait for initial auth message if not provided in query param
        try:
            auth_msg = await asyncio.wait_for(websocket.receive_json(), timeout=10.0)
            if auth_msg.get("type") == "auth" and auth_msg.get("token"):
                payload = decode_access_token(auth_msg["token"])
                sub_val = payload.get("sub")
                if sub_val:
                    auth_db = AuthSessionLocal()
                    try:
                        user = auth_db.query(User).filter((User.id == sub_val) | (User.username == sub_val)).first()
                    finally:
                        auth_db.close()
        except Exception:
            user = None

    if not user:
        await websocket.send_json({"type": "error", "message": "Authentication failed: valid JWT token required"})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Send handshake confirmation
    await websocket.send_json({
        "type": "connected",
        "message": "PRAHARI Real-Time Sync WebSocket Established",
        "username": user.username,
        "role": user.role,
        "current_sequence": sync_broadcaster.current_sequence,
        "server_time": datetime.now(timezone.utc).isoformat()
    })

    queue = sync_broadcaster.subscribe()

    async def sender_loop():
        """Pushes broadcast packets to the connected WebSocket client."""
        try:
            while True:
                try:
                    packet = await asyncio.wait_for(queue.get(), timeout=settings.SYNC_HEARTBEAT_INTERVAL)
                    if filter_event_for_user(packet, user):
                        await websocket.send_json({
                            "type": "event",
                            "seq": packet.get("seq"),
                            "event": packet.get("event"),
                            "timestamp": packet.get("timestamp"),
                            "data": packet.get("data"),
                            "unit_id": packet.get("unit_id")
                        })
                except asyncio.TimeoutError:
                    # Send ping frame
                    await websocket.send_json({"type": "ping", "timestamp": asyncio.get_event_loop().time()})
        except Exception as e:
            logger.debug(f"WebSocket sender loop stopped: {e}")

    async def receiver_loop():
        """Handles incoming messages (pongs, replay requests, batch push) from client."""
        try:
            while True:
                data = await websocket.receive_json()
                msg_type = data.get("type", "")

                if msg_type in ("pong", "ping"):
                    if msg_type == "ping":
                        await websocket.send_json({"type": "pong", "timestamp": asyncio.get_event_loop().time()})

                elif msg_type == "replay":
                    since_seq = data.get("since_seq")
                    since_ts = data.get("since_timestamp")
                    missed = sync_broadcaster.get_events_since(since_seq=since_seq, since_timestamp=since_ts)
                    auth_missed = [m for m in missed if filter_event_for_user(m, user)]
                    await websocket.send_json({
                        "type": "replay_response",
                        "count": len(auth_missed),
                        "events": auth_missed
                    })

                elif msg_type == "push_batch":
                    # Handle batch offline sync directly over WebSocket
                    items = data.get("items", [])
                    db_gen = get_db()
                    db_session = next(db_gen)
                    try:
                        res = process_batch_push(db_session, items=items, current_user=user)
                        await websocket.send_json({"type": "push_batch_result", "data": res})
                    finally:
                        try:
                            next(db_gen)
                        except StopIteration:
                            pass
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.debug(f"WebSocket receiver loop closed: {e}")

    sender_task = asyncio.create_task(sender_loop())
    receiver_task = asyncio.create_task(receiver_loop())

    try:
        done, pending = await asyncio.wait(
            [sender_task, receiver_task],
            return_when=asyncio.FIRST_COMPLETED
        )
        for t in pending:
            t.cancel()
    finally:
        sync_broadcaster.unsubscribe(queue)


@router.post("/push", summary="Atomic Batch Ingestion for Offline Queues")
def sync_push_endpoint(
    request_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ingests an array of offline mutations buffered on client devices.
    Executes in an atomic transaction and dispatches sync events.
    Strictly enforces authentication and trooper self-identity constraints.
    """
    items = request_data.get("items", [])
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="Invalid request format: 'items' must be a list")

    return process_batch_push(db, items=items, current_user=current_user)
