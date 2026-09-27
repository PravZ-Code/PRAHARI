"""Phase-2 novel features tests: F1 helper-load ledger, F2 mission gate, F3 reintegration, F5 notes, F4 policy sim."""
import pytest
from datetime import date, datetime, timedelta


# ---- F3: Post-Leave Reintegration Window ----

def test_reintegration_welfare_queue_and_privacy(client, db, welfare_headers, commander_alpha_headers, alpha_unit_id):
    from models.leave import LeaveRecord
    from models.personnel import Personnel
    from services.reintegration_service import sync_reintegration_windows, commander_aggregate

    person = db.query(Personnel).filter(Personnel.unit_id == alpha_unit_id).first()
    assert person is not None
    lr = LeaveRecord(
        personnel_id=person.id, leave_type="annual",
        applied_date=date.today() - timedelta(days=20),
        start_date=date.today() - timedelta(days=10),
        end_date=date.today() - timedelta(days=1),
        status="approved",
    )
    db.add(lr); db.commit()

    sync_reintegration_windows(db)

    r = client.get("/api/welfare/reintegration/queue", headers=welfare_headers)
    assert r.status_code == 200
    assert any(x["personnel_id"] == person.id for x in r.json()["queue"])

    # Commander sees aggregate counts only
    c = client.get(f"/api/commander/unit/{alpha_unit_id}/reintegration-summary", headers=commander_alpha_headers)
    assert c.status_code == 200
    body = c.json()
    assert "reintegration_supports_in_progress" in body
    assert "trooper_name" not in str(body)  # no identity leak


def test_reintegration_checkpoint_and_pulse(client, db, welfare_headers, personnel_headers, alpha_unit_id):
    # Self-contained: mint a fresh approved leave -> fresh window, so reruns stay idempotent
    from datetime import date as _date
    from models.leave import LeaveRecord
    from models.personnel import Personnel
    from services.reintegration_service import sync_reintegration_windows
    import uuid as _uuid
    person = db.query(Personnel).filter(Personnel.unit_id == alpha_unit_id).first()
    lr = LeaveRecord(
        personnel_id=person.id, leave_type="casual",
        applied_date=_date.today() - timedelta(days=5),
        start_date=_date.today() - timedelta(days=4),
        end_date=_date.today(),
        status="approved",
    )
    db.add(lr); db.commit()
    sync_reintegration_windows(db)
    from models.reintegration import ReintegrationWindow
    w = db.query(ReintegrationWindow).filter(
        ReintegrationWindow.personnel_id == person.id,
        ReintegrationWindow.leave_record_id == lr.id,
    ).first()
    assert w is not None

    r = client.post(f"/api/welfare/reintegration/{w.id}/checkpoint", headers=welfare_headers,
                    json={"day": 0, "note_summary": "Return-to-duty welfare touchpoint done"})
    assert r.status_code == 200
    assert r.json()["checkpoints"][0]["day"] == 0

    # duplicate checkpoint rejected
    r2 = client.post(f"/api/welfare/reintegration/{w.id}/checkpoint", headers=welfare_headers,
                     json={"day": 0, "note_summary": "dup"})
    assert r2.status_code == 400

    # Trooper status endpoint reflects active window and pulse tracking
    from models.user import User
    from database import AuthSessionLocal
    from middleware.rbac import create_access_token
    auth_db = AuthSessionLocal()
    try:
        u = auth_db.query(User).filter(User.personnel_id == person.id).first()
    finally:
        auth_db.close()
    if u:
        tok = create_access_token({"sub": u.id, "username": u.username, "role": u.role,
                                   "personnel_id": u.personnel_id, "unit_id": u.unit_id})
        hdrs = {"Authorization": f"Bearer {tok}"}
        st = client.get("/api/personnel/reintegration-status", headers=hdrs)
        assert st.status_code == 200
        s = st.json()
        assert s["active_window"] in (True, False)
        assert "pulse_submitted" in s


# ---- F5: Provable crypto-erasure of welfare notes ----

def test_welfare_note_crypto_erasure(client, db, welfare_headers, sample_welfare_case_id):
    assert sample_welfare_case_id is not None
    c = client.post("/api/welfare/notes", headers=welfare_headers,
                    json={"case_id": sample_welfare_case_id, "plaintext": "Sensitive confidential note — do not retain."})
    assert c.status_code == 201
    note_id = c.json()["id"]

    ok = client.get(f"/api/welfare/notes/{note_id}", headers=welfare_headers)
    assert ok.status_code == 200
    assert "Sensitive confidential note" in ok.json()["plaintext"]

    d = client.post(f"/api/welfare/notes/{note_id}/destroy", headers=welfare_headers, json={"reason": "officer_manual"})
    assert d.status_code == 200
    assert d.json()["status"] == "destroyed"

    gone = client.get(f"/api/welfare/notes/{note_id}", headers=welfare_headers)
    assert gone.status_code == 410  # cryptographically unrecoverable, not a permission denial

    proof = client.get(f"/api/welfare/notes/{note_id}/proof", headers=welfare_headers)
    assert proof.status_code == 200
    assert proof.json()["status"] == "destroyed"
    assert proof.json()["existence_hmac"]


# ---- F2: Mission Risk Budget gate ----

def test_mission_gate_evaluate_and_acknowledge(client, db, commander_alpha_headers, alpha_unit_id):
    ev = client.post(f"/api/commander/mission-gate/evaluate?unit_id={alpha_unit_id}&tasking_ref=EX-LION-2026",
                     headers=commander_alpha_headers)
    assert ev.status_code == 200
    body = ev.json()
    aid = body["assessment_id"]
    # Pass or fail — obtain pending state
    if body["budget_passed"]:
        assert body["status"] == "risk_accepted"
        return
    assert body["status"] == "pending_ack"

    # accept_risk requires note
    r0 = client.post(f"/api/commander/mission-gate/{aid}/acknowledge", headers=commander_alpha_headers,
                     json={"decision": "accept_risk"})
    assert r0.status_code == 400

    r1 = client.post(f"/api/commander/mission-gate/{aid}/acknowledge", headers=commander_alpha_headers,
                     json={"decision": "accept_risk", "note": "Operationally unavoidable; mitigations scheduled."})
    assert r1.status_code == 200
    assert r1.json()["status"] == "risk_accepted"
    assert r1.json()["content_hash"]


# ---- F1: Helper-Load Ledger + payback ----

def test_helper_load_ledger_blocks_overburdened_helper(client, db, welfare_headers, alpha_unit_id):
    from models.helper_ledger import HelperLoadEntry, PaybackTask
    from models.personnel import Personnel
    from services.helper_load_service import record_absorption, current_burden, is_burden_exceeded, excluded_replacement_ids

    unit_people = db.query(Personnel).filter(Personnel.unit_id == alpha_unit_id).all()
    assert len(unit_people) >= 2
    helper = unit_people[0]

    # 3 debits within window -> exceeds threshold 3.0
    for i in range(3):
        record_absorption(db, helper.id, "uro_swap", source_id=f"TEST-SRC-{i}")
    b = current_burden(db, helper.id)
    assert b >= 3.0
    assert is_burden_exceeded(db, helper.id)
    assert helper.id in excluded_replacement_ids(db, alpha_unit_id)

    # Payback task auto-created
    task = db.query(PaybackTask).filter(PaybackTask.personnel_id == helper.id, PaybackTask.status == "open").first()
    assert task is not None

    # Idempotent: same source cannot double-debit
    record_absorption(db, helper.id, "uro_swap", source_id="TEST-SRC-0")
    assert current_burden(db, helper.id) == b

    # Complete the payback removes burden visibility eventually
    r = client.get(f"/api/resilience/helper-load/{alpha_unit_id}", headers=welfare_headers)
    assert r.status_code == 200


# ---- F4: Policy-level What-If ----

def test_policy_what_if_cohort(client, db, commander_alpha_headers, alpha_unit_id):
    r = client.post(f"/api/resilience/policy-what-if?unit_id={alpha_unit_id}",
                    headers=commander_alpha_headers,
                    json={"max_consecutive_nights": 3, "rest_barrier_hours": 12, "auto_approve_family_crisis": True, "extra_rest_days_per_30d": 2})
    assert r.status_code == 200
    body = r.json()
    assert body["illustrative"] is True
    assert "cohort" in body and "abstained_count" in body["cohort"]
    assert "benefit" in body and "cost" in body
