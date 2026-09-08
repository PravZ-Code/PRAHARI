import pytest
from fastapi.testclient import TestClient

def test_prometheus_metrics_endpoint(client: TestClient):
    res = client.get('/metrics')
    assert res.status_code == 200
    assert 'prahari_personnel_total' in res.text
    assert 'prahari_welfare_cases_active' in res.text
    assert 'prahari_audit_ledger_blocks_total' in res.text
    assert 'prahari_ml_pipeline_status 1' in res.text

def test_ml_enterprise_diagnostics_endpoint(client: TestClient):
    res = client.get('/api/ml/diagnostics')
    assert res.status_code == 200
    data = res.json()
    assert data['model_id'] == 'PRAHARI-XGB-V2-DEFENSE'
    assert data['primary_metrics']['auroc'] >= 0.80
    assert data['primary_metrics']['brier_score'] <= 0.15
    assert len(data['calibration_bins']) == 4
    assert 'subgroup_fairness_audit' in data
    assert len(data['top_global_shap_factors']) >= 5

def test_gateway_ivr_submission(client: TestClient):
    res = client.post('/api/gateway/ivr/dtmf', json={
        'call_sid': 'CALL_TEST_123',
        'caller_phone': '+919876543210',
        'digits_pressed': '3'
    })
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'DISPATCHED'
    assert 'action_taken' in data

def test_security_headers_present(client: TestClient):
    res = client.get('/health')
    assert res.status_code == 200
    assert 'x-content-type-options' in res.headers
    assert res.headers['x-content-type-options'] == 'nosniff'

def test_statutory_privacy_firewall(client: TestClient, commander_alpha_headers):
    # Mental Healthcare Act 2017 Sec 21 non-stigmatization principle:
    # Company Commanders are strictly forbidden from accessing individual clinical dossiers or assessments
    res = client.get('/api/welfare/cases', headers=commander_alpha_headers)
    assert res.status_code == 403
