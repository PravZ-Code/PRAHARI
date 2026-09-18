import pytest
from fastapi.testclient import TestClient

def test_full_mission_lifecycle_e2e(client: TestClient, db, welfare_headers, commander_alpha_headers, admin_headers, alpha_unit_id):
    # -------------------------------------------------------------------------
    # STEP 1: Welfare Officer Case Inspection
    # -------------------------------------------------------------------------
    resp_cases = client.get("/api/welfare/cases", headers=welfare_headers)
    assert resp_cases.status_code == 200
    cases_data = resp_cases.json()
    assert cases_data["total"] > 0
    test_case = cases_data["cases"][0]
    case_id = test_case["id"]
    trooper_id = test_case["personnel_id"]

    # -------------------------------------------------------------------------
    # STEP 2: Copilot Intelligence Brief Generation
    # -------------------------------------------------------------------------
    resp_brief = client.post(f"/api/copilot/brief/{case_id}", headers=welfare_headers, json={})
    assert resp_brief.status_code == 200
    brief_data = resp_brief.json()
    assert brief_data["case_id"] == case_id
    assert len(brief_data["brief_markdown"]) > 50
    assert len(brief_data["cited_sources"]) > 0

    # -------------------------------------------------------------------------
    # STEP 3: Case SLA Lifecycle (Acknowledge -> Plan)
    # -------------------------------------------------------------------------
    # Acknowledge
    resp_ack = client.put(f"/api/welfare/case/{case_id}/acknowledge", headers=welfare_headers)
    assert resp_ack.status_code == 200

    # Plan
    resp_plan = client.put(f"/api/welfare/case/{case_id}/plan", headers=welfare_headers, json={
        "intervention_type": "roster_relief",
        "intervention_notes": "Night shift relief authorized via URO optimization."
    })
    assert resp_plan.status_code == 200

    # -------------------------------------------------------------------------
    # STEP 4: What-If Roster & Leave Simulation
    # -------------------------------------------------------------------------
    resp_whatif = client.post("/api/welfare/what-if", headers=welfare_headers, json={
        "personnel_id": trooper_id,
        "scenario": {
            "shift_type": "day",
            "add_rest_days": 3,
            "grant_leave": True
        }
    })
    assert resp_whatif.status_code == 200
    whatif_data = resp_whatif.json()
    assert "projected" in whatif_data
    assert "risk_score" in whatif_data["projected"]
    assert "risk_reduction_pct" in whatif_data

    # -------------------------------------------------------------------------
    # STEP 5: Statutory Court of Inquiry Dossier (PDF Export)
    # -------------------------------------------------------------------------
    resp_pdf = client.get(f"/api/welfare/case/{case_id}/export-dossier", headers=welfare_headers)
    assert resp_pdf.status_code == 200
    assert resp_pdf.headers.get("content-type") == "application/pdf"
    # Verify PDF magic bytes
    assert resp_pdf.content.startswith(b"%PDF-")

    # -------------------------------------------------------------------------
    # STEP 6: Tactical URO Roster Rebalancing & Dual-Signature
    # -------------------------------------------------------------------------
    resp_uro = client.post(f"/api/uro/optimize/{alpha_unit_id}", headers=commander_alpha_headers, json={
        "roster_date_start": "2026-03-01",
        "roster_date_end": "2026-03-07",
        "max_swaps": 4
    })
    assert resp_uro.status_code == 200
    uro_run_id = resp_uro.json()["run_id"]

    # Commander approves
    resp_cmd_sign = client.put(f"/api/uro/result/{uro_run_id}/approve", headers=commander_alpha_headers, json={"role": "commander"})
    assert resp_cmd_sign.status_code == 200
    assert resp_cmd_sign.json()["commander_approved"] is True

    # Welfare officer co-signs
    resp_wo_sign = client.put(f"/api/uro/result/{uro_run_id}/approve", headers=welfare_headers, json={"role": "welfare"})
    assert resp_wo_sign.status_code == 200
    assert resp_wo_sign.json()["both_approved"] is True
    assert resp_wo_sign.json()["roster_committed"] is True

    # -------------------------------------------------------------------------
    # STEP 7: Section 65B Cryptographic Audit Chain Verification
    # -------------------------------------------------------------------------
    resp_chain = client.get("/api/admin/audit/verify-chain", headers=admin_headers)
    assert resp_chain.status_code == 200
    chain_data = resp_chain.json()
    assert chain_data["chain_status"] == "INTACT"
    assert chain_data["tampered_index"] is None
    assert chain_data["total_blocks"] > 10
