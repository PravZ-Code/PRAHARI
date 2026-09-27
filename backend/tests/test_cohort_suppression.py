import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models.personnel import Unit, Personnel

def test_cohort_suppression_on_small_unit(client: TestClient, admin_headers, db: Session):
    """
    SAHAJ-AI Architecture: When unit sample size < 5 personnel,
    individual welfare/strain metrics and granular distributions must be suppressed
    to prevent re-identification through small group query reconstruction.
    """
    # 1. Create a tiny test unit with only 2 personnel
    tiny_unit = Unit(
        id="unit-tiny-cohort-test",
        name="Specialized Tiny Outpost (N=2)",
        location="Forward Border Post",
        operational_area="hard"
    )
    db.add(tiny_unit)
    db.flush()

    from datetime import date
    p1 = Personnel(id="p-tiny-1", service_number="CRPF-TINY-01", name="Trooper One", rank="Constable", trade="GD", unit_id=tiny_unit.id, date_of_joining=date(2022, 1, 1), current_posting_date=date(2025, 1, 1))
    p2 = Personnel(id="p-tiny-2", service_number="CRPF-TINY-02", name="Trooper Two", rank="Constable", trade="GD", unit_id=tiny_unit.id, date_of_joining=date(2022, 1, 1), current_posting_date=date(2025, 1, 1))
    db.add_all([p1, p2])
    db.commit()

    try:
        # 2. Query readiness detail
        resp_readiness = client.get(f"/api/commander/unit/{tiny_unit.id}/readiness", headers=admin_headers)
        assert resp_readiness.status_code == 200
        data_readiness = resp_readiness.json()
        assert data_readiness["personnel_count"] == 2
        assert data_readiness["cohort_suppression_active"] is True
        assert "small" in data_readiness["suppression_reason"].lower()
        # Granular distribution must be suppressed to zeros
        assert data_readiness["risk_distribution"] == {"green": 0, "yellow": 0, "orange": 0, "red": 0}
        assert data_readiness["readiness_trend"] == []

        # 3. Query risk distribution
        resp_dist = client.get(f"/api/commander/unit/{tiny_unit.id}/risk-distribution", headers=admin_headers)
        assert resp_dist.status_code == 200
        data_dist = resp_dist.json()
        assert data_dist["cohort_suppression_active"] is True
        assert data_dist["current"] == {"green": 0, "yellow": 0, "orange": 0, "red": 0}
        assert data_dist["trend_7d"] == []

        # 4. Query fatigue heatmap
        resp_fatigue = client.get(f"/api/commander/unit/{tiny_unit.id}/fatigue", headers=admin_headers)
        assert resp_fatigue.status_code == 200
        data_fatigue = resp_fatigue.json()
        assert data_fatigue["cohort_suppression_active"] is True
        assert data_fatigue["troopers"] == []

    finally:
        # Clean up
        db.query(Personnel).filter(Personnel.unit_id == tiny_unit.id).delete()
        db.query(Unit).filter(Unit.id == tiny_unit.id).delete()
        db.commit()
