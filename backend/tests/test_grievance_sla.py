import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from models.personnel import Personnel, Unit
from models.leave import LeaveRecord
from models.grievance import GrievanceRequest
from services.grievance_service import auto_scan_and_escalate

def test_file_standard_leave_request(client: TestClient, personnel_headers, db):
    trooper = db.query(Personnel).first()
    assert trooper is not None

    payload = {
        "personnel_id": trooper.id,
        "request_type": "leave",
        "category": "annual_leave",
        "description": "Routine home visit for domestic affairs",
        "start_date": "2026-04-10",
        "end_date": "2026-04-20",
        "filing_channel": "pwa"
    }
    resp = client.post("/api/grievance/file", headers=personnel_headers, json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["personnel_id"] == trooper.id
    assert data["is_fast_lane"] is False
    assert data["sla_deadline_hours"] == 48
    assert data["status"] in ["filed", "safe"]
    assert data["collision_status"] in ["safe", "warning", "blocked"]
    assert "hours_remaining" in data
    assert data["hours_remaining"] > 40.0


def test_file_fast_lane_family_emergency(client: TestClient, personnel_headers, db):
    trooper = db.query(Personnel).first()
    assert trooper is not None

    payload = {
        "personnel_id": trooper.id,
        "request_type": "family_crisis",
        "category": "family_emergency",
        "description": "Father admitted to hospital with acute cardiac distress",
        "start_date": "2026-03-15",
        "end_date": "2026-03-22",
        "filing_channel": "pwa"
    }
    resp = client.post("/api/grievance/file", headers=personnel_headers, json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["personnel_id"] == trooper.id
    assert data["is_fast_lane"] is True
    assert data["sla_deadline_hours"] == 12
    assert data["status"] == "fast_tracked"
    assert data["hours_remaining"] <= 12.0


def test_sla_countdown_endpoint(client: TestClient, personnel_headers, db):
    trooper = db.query(Personnel).first()
    assert trooper is not None

    # File request first
    payload = {
        "personnel_id": trooper.id,
        "request_type": "grievance",
        "category": "administrative_delay",
        "description": "Previous leave sanction unaddressed for 14 days"
    }
    file_resp = client.post("/api/grievance/file", headers=personnel_headers, json=payload)
    assert file_resp.status_code == 200
    req_id = file_resp.json()["id"]

    # Check countdown
    cnt_resp = client.get(f"/api/grievance/{req_id}/countdown", headers=personnel_headers)
    assert cnt_resp.status_code == 200
    cnt_data = cnt_resp.json()
    assert cnt_data["request_id"] == req_id
    assert cnt_data["is_expired"] is False
    assert "Company Commander" in cnt_data["current_escalation_tier"]
    assert "SLA Active" in cnt_data["simple_summary"]


def test_auto_escalation_on_sla_breach(client: TestClient, admin_headers, db):
    trooper = db.query(Personnel).first()
    assert trooper is not None

    now = datetime.now(timezone.utc)
    # Create request with expired deadline in the past
    past_req = GrievanceRequest(
        personnel_id=trooper.id,
        request_type="family_crisis",
        category="family_emergency",
        description="Expired urgent emergency",
        is_fast_lane=True,
        status="fast_tracked",
        filed_at=now - timedelta(hours=14),
        sla_deadline_hours=12,
        sla_deadline=now - timedelta(hours=2),
        sla_breached=False,
        escalation_level=0,
        escalation_history=[]
    )
    db.add(past_req)
    db.commit()

    # Trigger scan
    scan_resp = client.post("/api/grievance/scan-escalations", headers=admin_headers)
    assert scan_resp.status_code == 200
    assert scan_resp.json()["escalated_count"] >= 1

    # Verify escalation in DB
    db.refresh(past_req)
    assert past_req.sla_breached is True
    assert past_req.escalation_level == 1
    assert past_req.status == "escalated"
    assert "SLA resolution timer expired" in past_req.escalation_reason


def test_dual_approval_workflow(client: TestClient, commander_alpha_headers, welfare_headers, db):
    trooper = db.query(Personnel).first()
    assert trooper is not None

    payload = {
        "personnel_id": trooper.id,
        "request_type": "leave",
        "category": "casual_leave",
        "start_date": "2026-05-01",
        "end_date": "2026-05-05"
    }
    file_resp = client.post("/api/grievance/file", headers=commander_alpha_headers, json=payload)
    assert file_resp.status_code == 200
    req_id = file_resp.json()["id"]

    # Commander approves first
    appr1 = client.put(f"/api/grievance/{req_id}/approve", headers=commander_alpha_headers, json={"role": "commander"})
    assert appr1.status_code == 200
    assert appr1.json()["commander_approved"] is True
    assert appr1.json()["both_approved"] is False

    # Welfare approves second
    appr2 = client.put(f"/api/grievance/{req_id}/approve", headers=welfare_headers, json={"role": "welfare"})
    assert appr2.status_code == 200
    assert appr2.json()["both_approved"] is True
    assert appr2.json()["status"] == "approved"

    # Verify LeaveRecord was generated in DB
    leave = db.query(LeaveRecord).filter(
        LeaveRecord.personnel_id == trooper.id,
        LeaveRecord.status == "approved"
    ).order_by(LeaveRecord.applied_date.desc()).first()
    assert leave is not None


def test_rejection_activates_cost_of_inaction(client: TestClient, commander_alpha_headers, db):
    trooper = db.query(Personnel).first()
    assert trooper is not None

    payload = {
        "personnel_id": trooper.id,
        "request_type": "leave",
        "category": "annual_leave"
    }
    file_resp = client.post("/api/grievance/file", headers=commander_alpha_headers, json=payload)
    req_id = file_resp.json()["id"]

    rej_resp = client.put(f"/api/grievance/{req_id}/reject", headers=commander_alpha_headers, json={
        "reason": "Border high-alert mobilization"
    })
    assert rej_resp.status_code == 200
    assert rej_resp.json()["status"] == "rejected"
    assert rej_resp.json()["cost_of_inaction_active"] is True

    # Verify LeaveRecord denial created
    denial = db.query(LeaveRecord).filter(
        LeaveRecord.personnel_id == trooper.id,
        LeaveRecord.status == "denied"
    ).order_by(LeaveRecord.applied_date.desc()).first()
    assert denial is not None
    assert denial.denial_reason == "Border high-alert mobilization"


def test_unit_queue_fast_lane_priority(client: TestClient, commander_alpha_headers, alpha_unit_id):
    queue_resp = client.get(f"/api/grievance/unit/{alpha_unit_id}/queue", headers=commander_alpha_headers)
    assert queue_resp.status_code == 200
    data = queue_resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
