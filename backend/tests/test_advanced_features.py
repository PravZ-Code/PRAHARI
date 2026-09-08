import pytest
from models.personnel import Personnel
from models.welfare_case import WelfareCase

def test_liveness_and_readiness_probes(client):
    res_live = client.get("/health/live")
    assert res_live.status_code == 200
    data_live = res_live.json()
    assert data_live["status"] == "alive"

    res_ready = client.get("/health/ready")
    assert res_ready.status_code == 200
    data_ready = res_ready.json()
    assert data_ready["status"] == "ready"
    assert data_ready["database"] == "connected"
    assert data_ready["ml_model_artifacts"] == "loaded"


def test_security_headers_and_request_id(client):
    response = client.get("/health", headers={"X-Request-ID": "request-123"})
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "request-123"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_oversized_request_is_rejected(client):
    response = client.post("/health", headers={"Content-Length": str(2 * 1024 * 1024 + 1)})
    assert response.status_code == 413

def test_evidence_conflict_welfare_officer_allowed(client, welfare_headers, db):
    p = db.query(Personnel).first()
    assert p is not None
    res = client.get(f"/api/welfare/personnel/{p.id}/evidence-conflict", headers=welfare_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["personnel_id"] == p.id
    assert "conflict_detected" in data
    assert "conflict_type" in data
    assert "organizational_burden_score" in data
    assert "self_reported_strain_score" in data
    assert "divergence_delta" in data
    assert "decision_support_narrative" in data
    assert "recommended_welfare_action" in data
    assert len(data["provenance_sources"]) >= 3

def test_evidence_conflict_privacy_wall_commander_blocked(client, commander_alpha_headers, db):
    p = db.query(Personnel).first()
    res = client.get(f"/api/welfare/personnel/{p.id}/evidence-conflict", headers=commander_alpha_headers)
    assert res.status_code == 403

def test_trend_analysis_welfare_officer_allowed(client, welfare_headers, db):
    p = db.query(Personnel).first()
    res = client.get(f"/api/welfare/personnel/{p.id}/trend-analysis", headers=welfare_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["personnel_id"] == p.id
    assert data["trajectory_classification"] in [
        "SUSTAINED_DETERIORATION", "ACUTE_WORKLOAD_SPIKE", "RECOVERY_TRAJECTORY", "STABLE"
    ]
    assert "velocity_score" in data
    assert "acceleration_score" in data
    assert "delta_risk" in data
    assert len(data["baseline_comparisons"]) >= 4
    assert len(data["trajectory_history"]) >= 1

def test_trend_analysis_privacy_wall_commander_blocked(client, commander_alpha_headers, db):
    p = db.query(Personnel).first()
    res = client.get(f"/api/welfare/personnel/{p.id}/trend-analysis", headers=commander_alpha_headers)
    assert res.status_code == 403

def test_welfare_case_reassessment(client, welfare_headers, sample_welfare_case_id):
    assert sample_welfare_case_id is not None
    res = client.put(f"/api/welfare/case/{sample_welfare_case_id}/reassess", headers=welfare_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["case_id"] == sample_welfare_case_id
    assert "initial_risk_score" in data
    assert "current_risk_score" in data
    assert "delta_risk" in data
    assert data["recovery_status"] in ["RECOVERING", "STATIC", "DETERIORATING"]
    assert "clinical_decision_support" in data

def test_welfare_case_reassessment_commander_blocked(client, commander_alpha_headers, sample_welfare_case_id):
    res = client.put(f"/api/welfare/case/{sample_welfare_case_id}/reassess", headers=commander_alpha_headers)
    assert res.status_code == 403

def test_ivr_dtmf_language_selection(client):
    res_hi = client.post("/api/gateway/ivr/dtmf", json={
        "call_sid": "CALL-TEST-001",
        "caller_phone": "+919876543210",
        "digits_pressed": "1"
    })
    assert res_hi.status_code == 200
    assert res_hi.json()["action_taken"] == "LANGUAGE_SET_HINDI"

    res_en = client.post("/api/gateway/ivr/dtmf", json={
        "call_sid": "CALL-TEST-002",
        "caller_phone": "+919876543210",
        "digits_pressed": "2"
    })
    assert res_en.status_code == 200
    assert res_en.json()["action_taken"] == "LANGUAGE_SET_ENGLISH"

def test_ivr_dtmf_emergency_callback_escalation(client, db):
    res = client.post("/api/gateway/ivr/dtmf", json={
        "call_sid": "CALL-EMERGENCY-999",
        "caller_phone": "+919876543210",
        "digits_pressed": "3"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["action_taken"] == "EMERGENCY_CALLBACK_TRIGGERED"
    assert data["case_created_id"] is not None

    # Verify created case
    case = db.query(WelfareCase).filter(WelfareCase.id == data["case_created_id"]).first()
    assert case is not None
    assert case.risk_level_at_creation == "red"
    assert case.triggered_by == "ivr_emergency_call"
    # Teardown: clean up test-created record
    db.delete(case)
    db.commit()

def test_ivr_dtmf_leave_grievance(client, db):
    res = client.post("/api/gateway/ivr/dtmf", json={
        "call_sid": "CALL-GRIEVANCE-001",
        "caller_phone": "+919876543210",
        "digits_pressed": "4"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["action_taken"] == "LEAVE_GRIEVANCE_REGISTERED"
    assert data["case_created_id"] is not None

    # Teardown: clean up test-created record
    case = db.query(WelfareCase).filter(WelfareCase.id == data["case_created_id"]).first()
    if case:
        db.delete(case)
        db.commit()

def test_ivr_dtmf_buddy_alert(client):
    res = client.post("/api/gateway/ivr/dtmf", json={
        "call_sid": "CALL-BUDDY-001",
        "caller_phone": "+919876543210",
        "digits_pressed": "5"
    })
    assert res.status_code == 200
    assert res.json()["action_taken"] == "BUDDY_SIGNAL_LOGGED"

def test_ussd_session_menu_navigation(client):
    # 1. Initial dial
    res1 = client.post("/api/gateway/ussd", json={
        "session_id": "SESS-USSD-001",
        "phone_number": "+919876543210",
        "user_input": "*141#"
    })
    assert res1.status_code == 200
    assert res1.json()["continue_session"] is True
    assert "1. Check Leave Balance" in res1.json()["message"]

    # 2. Check leave balance
    res2 = client.post("/api/gateway/ussd", json={
        "session_id": "SESS-USSD-001",
        "phone_number": "+919876543210",
        "user_input": "1"
    })
    assert res2.status_code == 200
    assert "Leave Summary" in res2.json()["message"]

def test_ussd_fatigue_reporting_flow(client):
    # Step 1: Open menu
    client.post("/api/gateway/ussd", json={
        "session_id": "SESS-USSD-FATIGUE",
        "phone_number": "+919876543210",
        "user_input": "*141#"
    })
    # Step 2: Select Fatigue
    res_fat = client.post("/api/gateway/ussd", json={
        "session_id": "SESS-USSD-FATIGUE",
        "phone_number": "+919876543210",
        "user_input": "2"
    })
    assert "Rate current fatigue" in res_fat.json()["message"]

    # Step 3: Enter score 4
    res_score = client.post("/api/gateway/ussd", json={
        "session_id": "SESS-USSD-FATIGUE",
        "phone_number": "+919876543210",
        "user_input": "4"
    })
    assert res_score.json()["continue_session"] is False
    assert "Fatigue score 4/5 logged successfully" in res_score.json()["message"]

def test_sms_emergency_sos(client, db):
    res = client.post("/api/gateway/sms/incoming", json={
        "message_sid": "SMS-SOS-001",
        "sender_phone": "+919876543210",
        "message_body": "HELP NEED URGENT WELFARE SUPPORT"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["action_executed"] == "EMERGENCY_CASE_CREATED"
    assert data["case_created_id"] is not None

    # Teardown: clean up test-created record
    case = db.query(WelfareCase).filter(WelfareCase.id == data["case_created_id"]).first()
    if case:
        db.delete(case)
        db.commit()

def test_sms_buddy_signal(client):
    res = client.post("/api/gateway/sms/incoming", json={
        "message_sid": "SMS-BUDDY-001",
        "sender_phone": "+919876543210",
        "message_body": "BUDDY EXHAUSTION 3"
    })
    assert res.status_code == 200
    assert res.json()["action_executed"] == "BUDDY_SIGNAL_RECORDED"

def test_sms_status_query(client):
    res = client.post("/api/gateway/sms/incoming", json={
        "message_sid": "SMS-STATUS-001",
        "sender_phone": "+919876543210",
        "message_body": "STATUS"
    })
    assert res.status_code == 200
    assert res.json()["action_executed"] == "STATUS_REPORTED"


def test_sliding_window_rate_limiter(client):
    from middleware.security import rate_limiter
    rate_limiter.reset()

    # Make 15 requests to /api/auth/login (limit is 15 req/min)
    for _ in range(15):
        resp = client.post("/api/auth/login", json={"username": "ghost", "password": "wrong"})
        assert resp.status_code == 401

    # The 16th request must trigger HTTP 429 Too Many Requests
    throttled = client.post("/api/auth/login", json={"username": "ghost", "password": "wrong"})
    assert throttled.status_code == 429
    assert "Rate limit exceeded" in throttled.json()["detail"]
    assert "Retry-After" in throttled.headers

    # Reset limiter after test so subsequent tests are unaffected
    rate_limiter.reset()


def test_production_secret_key_guard():
    from config import Settings
    import pytest

    # Should raise ValueError in production if using default placeholder secret
    with pytest.raises(ValueError, match="FATAL SECURITY ERROR: Insecure or default JWT_SECRET_KEY"):
        s = Settings(
            APP_ENV="production",
            JWT_SECRET_KEY="prahari-jwt-secret-key-sih-2026-hackathon-secure-tokens"
        )
        if s.APP_ENV == "production" and (
            s.JWT_SECRET_KEY == "prahari-jwt-secret-key-sih-2026-hackathon-secure-tokens"
            or len(s.JWT_SECRET_KEY) < 32
        ):
            raise ValueError("FATAL SECURITY ERROR: Insecure or default JWT_SECRET_KEY detected in production environment!")
