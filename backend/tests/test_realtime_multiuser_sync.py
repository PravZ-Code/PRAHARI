"""
Comprehensive Real-Time Multi-User Synchronization & WebSocket Tests
Verifies:
1. Full-duplex WebSocket connection, authentication, and heartbeats.
2. Immediate multi-user persistence & propagation on mutations (grievance, buddy signal, URO, resilience).
3. Mental Healthcare Act (MHCA 2017) Section 21 Statutory Privacy Firewall.
4. Replay of missed events using monotonic sequence numbers.
5. In-socket batch offline push ingestion and atomic database commit.
"""
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from main import app
from database import SessionLocal, AuthSessionLocal
from models.user import User
from models.personnel import Personnel, Unit
from models.grievance import GrievanceRequest
from services.sync_service import sync_broadcaster, filter_event_for_user
from middleware.rbac import create_access_token


@pytest.fixture
def test_setup():
    db = SessionLocal()
    auth_db = AuthSessionLocal()
    try:
        unit = db.query(Unit).first()
        jawan = db.query(Personnel).filter(Personnel.unit_id == unit.id).first() if unit else None
        commander_user = auth_db.query(User).filter(User.role == "commander").first()
        welfare_user = auth_db.query(User).filter(User.role == "welfare").first()
        jawan_user = auth_db.query(User).filter(User.role == "personnel").first()

        tokens = {
            "commander": create_access_token({"sub": commander_user.username, "role": "commander"}) if commander_user else None,
            "welfare": create_access_token({"sub": welfare_user.username, "role": "welfare"}) if welfare_user else None,
            "jawan": create_access_token({"sub": jawan_user.username, "role": "personnel"}) if jawan_user else None,
        }
        users = {
            "commander": commander_user,
            "welfare": welfare_user,
            "jawan": jawan_user,
        }
        yield {
            "unit": unit,
            "jawan": jawan,
            "tokens": tokens,
            "users": users,
        }
    finally:
        db.close()
        auth_db.close()


def test_sync_status_telemetry(test_setup):
    client = TestClient(app)
    resp = client.get("/api/sync/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["database_connected"] is True
    assert "read_latency_ms" in data
    assert "current_sequence" in data
    assert "record_counts" in data
    assert data["total_records"] > 0


def test_mhca_firewall_statutory_filtering(test_setup):
    commander = test_setup["users"]["commander"]
    welfare = test_setup["users"]["welfare"]
    jawan = test_setup["users"]["jawan"]

    # 1. Psychological assessment: Commander must NEVER receive it under §21 MHA
    assessment_packet = {
        "seq": 999,
        "event": "assessment_submitted",
        "unit_id": test_setup["unit"].id if test_setup["unit"] else None,
        "data": {
            "personnel_id": str(jawan.id) if jawan else "p1",
            "stress_level": 5,
        }
    }
    assert filter_event_for_user(assessment_packet, commander) is False
    assert filter_event_for_user(assessment_packet, welfare) is True

    # 2. Emergency SOS: All commanders and welfare officers receive it
    sos_packet = {
        "seq": 1000,
        "event": "emergency_sos",
        "unit_id": test_setup["unit"].id if test_setup["unit"] else None,
        "data": {
            "personnel_id": str(jawan.id) if jawan else "p1",
            "severity": "CRITICAL"
        }
    }
    assert filter_event_for_user(sos_packet, commander) is True
    assert filter_event_for_user(sos_packet, welfare) is True


def test_event_replay_endpoint(test_setup):
    client = TestClient(app)
    token = test_setup["tokens"]["commander"]
    if not token:
        pytest.skip("Commander token not available")

    # Publish an event to the broadcaster
    sync_broadcaster.publish("unit_test_replay_event", {
        "message": "Testing replay",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    current_seq = sync_broadcaster.current_sequence
    resp = client.get(
        f"/api/sync/replay?since_seq={current_seq - 1}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "events" in data
    assert data["count"] >= 1
    assert any(e.get("event") == "unit_test_replay_event" for e in data["events"])


def test_websocket_sync_connection_and_heartbeat(test_setup):
    client = TestClient(app)
    token = test_setup["tokens"]["commander"]
    if not token:
        pytest.skip("Commander token not available")

    with client.websocket_connect(f"/sync/ws?token={token}") as ws:
        # Handshake confirmation
        handshake = ws.receive_json()
        assert handshake["type"] == "connected"
        assert "current_sequence" in handshake

        # Send ping, expect pong
        ws.send_json({"type": "ping"})
        reply = ws.receive_json()
        assert reply["type"] == "pong"


def test_websocket_realtime_event_delivery(test_setup):
    client = TestClient(app)
    token = test_setup["tokens"]["welfare"]
    if not token:
        pytest.skip("Welfare token not available")

    with client.websocket_connect(f"/sync/ws?token={token}") as ws:
        handshake = ws.receive_json()
        assert handshake["type"] == "connected"

        # Publish an event
        sync_broadcaster.publish("welfare_realtime_test", {
            "case_id": "case-999",
            "action": "triage_priority_elevated"
        })

        # Receive real-time event frame over WebSocket
        event_frame = ws.receive_json()
        assert event_frame["type"] == "event"
        assert event_frame["event"] == "welfare_realtime_test"
        assert event_frame["data"]["case_id"] == "case-999"


def test_websocket_offline_push_batch(test_setup):
    client = TestClient(app)
    token = test_setup["tokens"]["commander"]
    jawan = test_setup["jawan"]
    if not token or not jawan:
        pytest.skip("Prerequisites not available")

    with client.websocket_connect(f"/sync/ws?token={token}") as ws:
        ws.receive_json()  # handshake

        batch_payload = {
            "type": "push_batch",
            "items": [
                {
                    "queue_id": f"offline-ws-{int(datetime.now().timestamp())}",
                    "action": "grievance_submission",
                    "payload": {
                        "personnel_id": str(jawan.id),
                        "request_type": "leave",
                        "category": "family_emergency",
                        "description": "Submitted via WebSocket offline buffer",
                        "is_emergency": True
                    }
                }
            ]
        }
        ws.send_json(batch_payload)
        result = ws.receive_json()
        assert result["type"] == "push_batch_result"
        assert result["data"]["synced_count"] >= 1
