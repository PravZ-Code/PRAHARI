import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from models.uro import URORun
from models.personnel import Personnel, Unit
from models.prediction import RiskPrediction
from services.uro_service import reject_uro_run, get_cost_of_inaction_context


def test_reject_uro_proposal(client: TestClient, commander_alpha_headers, alpha_unit_id, db):
    """Verifies that an officer can decline/reject a proposed roster swap and activate inaction tracking."""
    # 1. Trigger an optimization
    opt_payload = {
        "roster_date_start": "2026-03-01",
        "roster_date_end": "2026-03-07",
        "max_swaps": 5
    }
    opt_resp = client.post(f"/api/uro/optimize/{alpha_unit_id}", headers=commander_alpha_headers, json=opt_payload)
    assert opt_resp.status_code == 200
    run_id = opt_resp.json()["run_id"]

    # 2. Reject the proposed intervention
    reject_payload = {"reason": "Operational patrol constraint"}
    rej_resp = client.put(f"/api/uro/result/{run_id}/reject", headers=commander_alpha_headers, json=reject_payload)
    assert rej_resp.status_code == 200
    rej_data = rej_resp.json()

    assert rej_data["status"] == "rejected"
    assert rej_data["declined_by_role"] == "commander"
    assert rej_data["decline_reason"] == "Operational patrol constraint"
    assert rej_data["cost_of_inaction_tracking_active"] is True
    assert rej_data["declined_at"] is not None

    # 3. Verify in DB
    run_db = db.query(URORun).filter(URORun.id == run_id).first()
    assert run_db is not None
    assert run_db.status == "rejected"
    assert run_db.declined_by_role == "commander"
    assert run_db.decline_reason == "Operational patrol constraint"


def test_cannot_reject_committed_uro(client: TestClient, admin_headers, alpha_unit_id, db):
    """Verifies that once swaps are committed to the live database, rejection is blocked."""
    opt_payload = {
        "roster_date_start": "2026-03-01",
        "roster_date_end": "2026-03-07",
        "max_swaps": 3
    }
    opt_resp = client.post(f"/api/uro/optimize/{alpha_unit_id}", headers=admin_headers, json=opt_payload)
    assert opt_resp.status_code == 200
    run_id = opt_resp.json()["run_id"]

    # Single-sign approval commits roster
    appr_resp = client.put(f"/api/uro/result/{run_id}/approve", headers=admin_headers, json={"single_sign": True})
    assert appr_resp.status_code == 200
    assert appr_resp.json()["roster_committed"] is True

    # Attempt rejection
    rej_resp = client.put(f"/api/uro/result/{run_id}/reject", headers=admin_headers, json={"reason": "Late rejection"})
    assert rej_resp.status_code == 400
    assert "already committed" in rej_resp.json()["detail"]


def test_cost_of_inaction_trajectory_tracking(client: TestClient, commander_alpha_headers, alpha_unit_id, db):
    """Verifies that longitudinal worsening post-rejection is surfaced as an objective institutional record."""
    trooper = db.query(Personnel).filter(Personnel.unit_id == alpha_unit_id).first()
    assert trooper is not None

    now = datetime.now(timezone.utc)
    t_minus_10 = now - timedelta(days=10)
    t_minus_2 = now - timedelta(days=2)

    pred_initial = RiskPrediction(
        personnel_id=trooper.id,
        predicted_at=t_minus_10,
        risk_score=0.45,
        risk_level="yellow",
        confidence_score=0.85,
        data_quality_score=0.90,
        baseline_type="cohort",
        model_version="v1.0",
        shap_values={"consecutive_night_shifts": 0.20}
    )
    db.add(pred_initial)

    rejected_run = URORun(
        unit_id=alpha_unit_id,
        run_at=t_minus_10,
        roster_date_start="2026-02-15",
        roster_date_end="2026-02-22",
        before_risk_summary={"yellow": 1},
        after_risk_summary={"green": 1},
        swaps_proposed=1,
        swaps=[{
            "swap_id": 1,
            "person_a": {
                "id": trooper.id,
                "name": trooper.name,
                "current_risk_score": 0.45,
                "trade": trooper.trade
            },
            "person_b": {
                "id": "synthetic-b",
                "name": "Cover Soldier",
                "current_risk_score": 0.15,
                "trade": trooper.trade
            },
            "date": "2026-02-18",
            "projected_risk_change_a": {"from": 0.45, "to": 0.25},
            "projected_risk_change_b": {"from": 0.15, "to": 0.20}
        }],
        risk_reduction_pct=15.0,
        status="rejected",
        declined_by_role="commander",
        declined_at=t_minus_10,
        decline_reason="Shortage of outpost guards"
    )
    db.add(rejected_run)

    pred_subsequent = RiskPrediction(
        personnel_id=trooper.id,
        predicted_at=t_minus_2,
        risk_score=0.68,
        risk_level="red",
        confidence_score=0.88,
        data_quality_score=0.92,
        baseline_type="cohort",
        model_version="v1.0",
        shap_values={"consecutive_night_shifts": 0.35, "accumulated_fatigue": 0.25}
    )
    db.add(pred_subsequent)
    db.commit()

    context = get_cost_of_inaction_context(db, alpha_unit_id)
    assert context["total_rejected_runs"] >= 1
    assert context["monitored_personnel_count"] >= 1
    assert context["escalations_count"] >= 1
    assert context["average_risk_delta"] > 0.10
    assert "Historical Inaction Record:" in context["historical_observation"]

    ctx_resp = client.get(f"/api/uro/unit/{alpha_unit_id}/cost-of-inaction", headers=commander_alpha_headers)
    assert ctx_resp.status_code == 200
    ctx_data = ctx_resp.json()
    assert ctx_data["monitored_personnel_count"] >= 1
    assert ctx_data["escalations_count"] >= 1

    res_resp = client.get(f"/api/uro/result/{rejected_run.id}", headers=commander_alpha_headers)
    assert res_resp.status_code == 200
    res_data = res_resp.json()
    assert res_data["status"] == "rejected"
    assert res_data["cost_of_inaction_context"] is not None
    assert res_data["cost_of_inaction_context"]["monitored_personnel_count"] >= 1
