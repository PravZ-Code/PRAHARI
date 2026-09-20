import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from services.sync_service import sync_broadcaster

client = TestClient(app)

def test_sync_status_endpoint():
    """Verify /api/sync/status returns sub-millisecond database telemetry and accurate record counts."""
    response = client.get("/api/sync/status")
    assert response.status_code == 200
    data = response.json()
    assert data["database_connected"] is True
    assert "read_latency_ms" in data
    assert data["read_latency_ms"] < 100.0  # Typically <0.5ms on SQLite WAL
    assert "record_counts" in data
    assert "personnel" in data["record_counts"]
    assert "grievances" in data["record_counts"]
    assert data["wal_checkpoint"] == "healthy"

def test_sync_delta_endpoint_and_etag(admin_headers):
    """Verify /api/sync/delta returns incremental records and respects HTTP 304 Not Modified."""
    since_fixed = "2026-09-01T00:00:00Z"
    response = client.get(f"/api/sync/delta?since={since_fixed}", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "cursor" in data
    assert "since" in data
    assert "etag" in data
    assert "counts" in data
    assert "delta" in data
    etag = response.headers.get("etag")
    assert etag is not None

    # Test conditional request with If-None-Match
    cond_headers = {**admin_headers, "If-None-Match": etag}
    cached_response = client.get(f"/api/sync/delta?since={since_fixed}", headers=cond_headers)
    assert cached_response.status_code == 304

def test_sync_push_batch_offline(personnel_headers):
    """Verify /api/sync/push atomically ingests offline-buffered mutations."""
    unique_assess_id = f"offline-assess-{uuid.uuid4()}"
    unique_grv_id = f"offline-grv-{uuid.uuid4()}"

    batch_payload = {
        "items": [
            {
                "queue_id": unique_assess_id,
                "action": "assessment",
                "body": {
                    "sleep_quality": 4,
                    "sleep_hours": 7.5,
                    "mood_score": 4,
                    "energy_level": 4,
                    "stress_level": 2,
                    "free_text": "Field patrol check-in while disconnected",
                }
            },
            {
                "queue_id": unique_grv_id,
                "action": "grievance",
                "body": {
                    "request_type": "leave",
                    "category": "Annual Leave Offline",
                    "description": "Submitted during remote tactical movement",
                    "start_date": "2026-10-01",
                    "end_date": "2026-10-10",
                }
            }
        ]
    }
    response = client.post("/api/sync/push", json=batch_payload, headers=personnel_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["synced_count"] >= 2
    assert len(data["results"]) == 2
    assert data["results"][0]["status"] == "synced"
    assert data["results"][1]["status"] == "synced"

    # Idempotent push of the exact same queue IDs
    re_response = client.post("/api/sync/push", json=batch_payload, headers=personnel_headers)
    assert re_response.status_code == 200
    re_data = re_response.json()
    assert re_data["results"][0]["status"] == "already_synced"
    assert re_data["results"][1]["status"] == "already_synced"

def test_sync_broadcaster_pub_sub():
    """Verify thread-safe DatabaseSyncBroadcaster delivers events to active subscribers."""
    queue = sync_broadcaster.subscribe()
    try:
        sync_broadcaster.publish("unit_test_event", {"metric": 42, "unit": "Echo Company"})
        assert not queue.empty()
        packet = queue.get_nowait()
        assert packet["event"] == "unit_test_event"
        assert packet["data"]["metric"] == 42
    finally:
        sync_broadcaster.unsubscribe(queue)

def test_sync_sse_stream_initial_handshake(admin_headers):
    """Verify /api/sync/stream yields initial sync_connected SSE event."""
    response = client.get("/api/sync/stream?max_events=1", headers=admin_headers)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
    content = response.text
    assert "event: sync_connected" in content
    assert "PRAHARI Live Database Sync Stream Active" in content
