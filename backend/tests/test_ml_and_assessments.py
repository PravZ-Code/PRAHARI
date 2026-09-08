import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from models.assessment import SelfAssessment
from models.buddy_signal import BuddySignal

def test_model_health_endpoint(client: TestClient, welfare_headers):
    resp = client.get("/api/ml/health", headers=welfare_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "model_version" in data
    assert "latest_snapshot" in data
    if data["latest_snapshot"]:
        snap = data["latest_snapshot"]
        assert "calibration_error" in snap
        assert isinstance(snap["calibration_error"], (int, float))
        assert "avg_confidence" in snap
        assert "avg_data_quality" in snap

def test_model_metrics_endpoint(client: TestClient, welfare_headers):
    resp = client.get("/api/ml/metrics", headers=welfare_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "model_version" in data
    assert "metrics" in data
    metrics = data["metrics"]
    assert "auroc" in metrics and metrics["auroc"] >= 0.80
    assert "ece" in metrics and metrics["ece"] <= 0.05
    assert "brier_score" in metrics
    assert "top_predictive_features" in data or "feature_importances" in data or "metrics" in data

def test_assessment_submit_and_idempotency(client: TestClient, personnel_headers, db):
    client_uuid = str(uuid.uuid4())
    payload = {
        "id": client_uuid,
        "sleep_quality": 3,
        "sleep_hours": 6.5,
        "mood_score": 3,
        "energy_level": 4,
        "stress_level": 2,
        "appetite_score": 4,
        "social_connection": 3,
        "free_text": "Routine night patrol completed without incident.",
        "is_offline_entry": False
    }

    # 1. First submission -> 201 Created
    resp1 = client.post("/api/assessment/submit", headers=personnel_headers, json=payload)
    assert resp1.status_code == 201
    assert resp1.json()["id"] == client_uuid

    # 2. Re-submission with same client UUID -> Idempotent success (no duplicate row)
    resp2 = client.post("/api/assessment/submit", headers=personnel_headers, json=payload)
    assert resp2.status_code in (200, 201)
    assert "idempotent" in resp2.json()["message"].lower()

    # Verify DB has exactly one row with client_uuid
    rows = db.query(SelfAssessment).filter(SelfAssessment.id == client_uuid).all()
    assert len(rows) == 1

def test_assessment_bulk_sync(client: TestClient, personnel_headers, db):
    uuid_1 = str(uuid.uuid4())
    uuid_2 = str(uuid.uuid4())
    payload = {
        "assessments": [
            {
                "id": uuid_1,
                "sleep_quality": 4,
                "sleep_hours": 7.0,
                "mood_score": 4,
                "energy_level": 3,
                "stress_level": 2,
                "appetite_score": 4,
                "social_connection": 4,
                "is_offline_entry": True
            },
            {
                "id": uuid_2,
                "sleep_quality": 2,
                "sleep_hours": 4.5,
                "mood_score": 2,
                "energy_level": 2,
                "stress_level": 4,
                "appetite_score": 3,
                "social_connection": 2,
                "is_offline_entry": True
            }
        ]
    }

    # First sync
    resp1 = client.post("/api/assessment/bulk-sync", headers=personnel_headers, json=payload)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["synced"] == 2
    assert data1["skipped"] == 0

    # Re-sync same batch -> All skipped idempotently
    resp2 = client.post("/api/assessment/bulk-sync", headers=personnel_headers, json=payload)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["synced"] == 0
    assert data2["skipped"] == 2

def test_assessment_my_history(client: TestClient, personnel_headers):
    resp = client.get("/api/assessment/my-history?days=30", headers=personnel_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "personnel_id" in data
    assert "assessments" in data
    assert isinstance(data["assessments"], list)

def test_buddy_signal_anonymous_submission(client: TestClient, personnel_headers, db):
    count_before = db.query(BuddySignal).count()

    payload = {
        "concern_level": 2,
        "concern_category": "sleep"
    }
    resp = client.post("/api/buddy/signal", headers=personnel_headers, json=payload)
    assert resp.status_code == 201
    assert "anonymous concern recorded" in resp.json()["message"].lower()

    count_after = db.query(BuddySignal).count()
    assert count_after == count_before + 1

    # Verify latest signal does not contain personnel identity
    latest_sig = db.query(BuddySignal).order_by(BuddySignal.submitted_at.desc()).first()
    assert not hasattr(latest_sig, "personnel_id")
    assert not hasattr(latest_sig, "user_id")

def test_buddy_unit_summary_endpoint(client: TestClient, welfare_headers, alpha_unit_id):
    assert alpha_unit_id is not None
    resp = client.get(f"/api/buddy/unit-summary/{alpha_unit_id}?weeks=4", headers=welfare_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["unit_id"] == alpha_unit_id
    assert "weeks" in data
    assert len(data["weeks"]) == 4
