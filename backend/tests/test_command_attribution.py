import pytest
from fastapi.testclient import TestClient
from models.personnel import Unit
from services.command_attribution_service import compute_structural_stress_attribution


def test_command_attribution_service(db):
    """Verifies that the Structural Stress Attribution Index (SSAI) runs against peer baselines."""
    unit = db.query(Unit).first()
    assert unit is not None

    res = compute_structural_stress_attribution(db, unit.id)
    assert res["unit_id"] == unit.id
    assert "structural_stress_attribution_index" in res
    assert 0.0 <= res["structural_stress_attribution_index"] <= 1.0
    assert "metrics" in res
    assert "leave_denial_ratio_vs_peers" in res["metrics"]
    assert "private_commander_insight" in res
    assert "actionable_self_correction_recommendations" in res
    assert isinstance(res["actionable_self_correction_recommendations"], list)
    assert "battalion_oversight_escalation_required" in res


def test_command_attribution_endpoint(client: TestClient, commander_alpha_headers, alpha_unit_id):
    """Verifies that Company Commanders can access their own unit's attribution index via API."""
    resp = client.get(f"/api/commander/unit/{alpha_unit_id}/command-attribution", headers=commander_alpha_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["unit_id"] == alpha_unit_id
    assert "structural_stress_attribution_index" in data
    assert "Command Practice Insight" in data["private_commander_insight"]
