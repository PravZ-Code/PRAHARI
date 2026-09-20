import os
import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.personnel import Personnel
from models.user import User
from models.welfare_case import WelfareCase
from middleware.rbac import create_access_token

client = TestClient(app)


def test_sync_delta_unauthenticated_returns_401():
    """Verify anonymous access to /api/sync/delta is blocked with HTTP 401."""
    response = client.get("/api/sync/delta")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_sync_push_unauthenticated_returns_401():
    """Verify anonymous mutation injection via /api/sync/push is blocked with HTTP 401."""
    response = client.post("/api/sync/push", json={"items": []})
    assert response.status_code == 401


def test_sync_stream_unauthenticated_returns_401():
    """Verify anonymous connection to /api/sync/stream is blocked with HTTP 401."""
    response = client.get("/api/sync/stream?max_events=1")
    assert response.status_code == 401


def test_sync_stream_query_token_authentication(admin_headers):
    """Verify EventSource can authenticate via query parameter ?token=..."""
    auth_header = admin_headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip()
    response = client.get(f"/api/sync/stream?max_events=1&token={token}")
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
    assert "sync_connected" in response.text


def test_sync_delta_mental_healthcare_act_firewall_for_commander(commander_alpha_headers):
    """
    MHCA §21 Statutory Privacy Firewall:
    Commanders must NEVER receive individual psychological self-assessments or confidential welfare cases.
    """
    response = client.get("/api/sync/delta?since=2026-01-01T00:00:00Z", headers=commander_alpha_headers)
    assert response.status_code == 200
    data = response.json()
    # Assessments must be zero / empty for commanders
    assert data["counts"]["assessments"] == 0
    assert data["delta"]["assessments"] == []
    # Welfare cases must be zero / empty for commanders
    assert data["counts"]["welfare_cases"] == 0
    assert data["delta"]["welfare_cases"] == []


def test_sync_delta_personnel_isolation(personnel_headers):
    """
    Troopers can ONLY see their own records, and zero peer surveillance / buddy signals.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "rajesh_kumar").first()
        my_pid = user.personnel_id
    finally:
        db.close()

    response = client.get("/api/sync/delta?since=2026-01-01T00:00:00Z", headers=personnel_headers)
    assert response.status_code == 200
    data = response.json()

    # Assessments: all returned must belong to this trooper
    for a in data["delta"]["assessments"]:
        assert a["personnel_id"] == my_pid

    # Grievances: all returned must belong to this trooper
    for g in data["delta"]["grievances"]:
        assert g["personnel_id"] == my_pid

    # Buddy signals: forbidden for frontline soldiers
    assert data["counts"]["buddy_signals"] == 0
    assert data["delta"]["buddy_signals"] == []

    # Welfare cases: forbidden for frontline soldiers
    assert data["counts"]["welfare_cases"] == 0
    assert data["delta"]["welfare_cases"] == []


def test_sync_push_prevents_personnel_spoofing(personnel_headers):
    """
    When a frontline trooper attempts to submit an item under another personnel ID,
    the server must bind it strictly to the authenticated trooper's personnel ID.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "rajesh_kumar").first()
        my_pid = user.personnel_id
        # Find another soldier
        other_trooper = db.query(Personnel).filter(Personnel.id != my_pid).first()
        victim_pid = other_trooper.id if other_trooper else "victim-personnel-id"
    finally:
        db.close()

    unique_id = f"test-spoof-{uuid.uuid4()}"
    payload = {
        "items": [
            {
                "queue_id": unique_id,
                "action": "assessment",
                "body": {
                    "personnel_id": victim_pid,  # Attempted spoof!
                    "stress_level": 5,
                    "mood_score": 1,
                    "sleep_quality": 1,
                    "sleep_hours": 3.0,
                    "energy_level": 1,
                }
            }
        ]
    }

    response = client.post("/api/sync/push", json=payload, headers=personnel_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["synced_count"] == 1

    # Verify in DB that it was assigned to my_pid, NOT victim_pid
    from models.assessment import SelfAssessment
    db = SessionLocal()
    try:
        record = db.query(SelfAssessment).filter(SelfAssessment.id == unique_id).first()
        assert record is not None
        assert record.personnel_id == my_pid
        assert record.personnel_id != victim_pid
    finally:
        db.close()


def test_cors_rejects_arbitrary_private_subnets():
    """
    Verify that arbitrary private subnet origins (e.g. 192.168.1.55:9999)
    are no longer permitted by default via overly permissive regex.
    """
    untrusted_origin = "http://192.168.1.55:9999"
    response = client.options(
        "/api/sync/status",
        headers={
            "Origin": untrusted_origin,
            "Access-Control-Request-Method": "GET",
        }
    )
    # Origin must NOT be echoed in Access-Control-Allow-Origin
    assert response.headers.get("access-control-allow-origin") != untrusted_origin


def test_cors_allows_configured_origins():
    """
    Verify that explicitly configured origins (e.g. http://localhost:3000) are permitted.
    """
    trusted_origin = "http://localhost:3000"
    response = client.options(
        "/api/sync/status",
        headers={
            "Origin": trusted_origin,
            "Access-Control-Request-Method": "GET",
        }
    )
    assert response.headers.get("access-control-allow-origin") == trusted_origin


def test_welfare_dossier_temp_cleanup(welfare_headers, sample_welfare_case_id):
    """
    Verify that exporting Court of Inquiry PDF dossier cleans up the temporary file.
    """
    if not sample_welfare_case_id:
        pytest.skip("No sample welfare case found in database")

    response = client.get(
        f"/api/welfare/case/{sample_welfare_case_id}/export-dossier",
        headers=welfare_headers
    )
    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/pdf"
    assert len(response.content) > 100
