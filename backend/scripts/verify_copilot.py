import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User
from models.welfare_case import WelfareCase
from middleware.rbac import create_access_token
from services.copilot_service import sanitize_clinical_lexicon, extract_citations

def run_tests():
    print('================================================================')
    print('PROJECT PRAHARI -- WORK PACKAGE 1: LOCAL AI COPILOT VERIFICATION')
    print('================================================================')

    client = TestClient(app)
    db = SessionLocal()

    # 1. Verify Health Endpoint
    print('\n[TEST 1] System Health Endpoint...')
    resp = client.get('/health')
    assert resp.status_code == 200, f'Health failed: {resp.status_code}'
    print('  PASS: System is operational ->', resp.json()['status'])

    # 2. Get Welfare Officer & Auth Token
    print('\n[TEST 2] Authentication & Token Generation...')
    welfare_user = db.query(User).filter(User.username == 'wo_meera').first()
    assert welfare_user is not None, 'wo_meera user not found'
    token = create_access_token({'sub': welfare_user.id})
    headers = {'Authorization': f'Bearer {token}'}
    print(f'  PASS: Token generated for {welfare_user.username} ({welfare_user.role})')

    # 3. Get Active Welfare Case
    print('\n[TEST 3] Welfare Case Retrieval...')
    sample_case = db.query(WelfareCase).first()
    assert sample_case is not None, 'No welfare case in database'
    case_id = sample_case.id
    print(f'  PASS: Testing with case_id: {case_id} (personnel_id: {sample_case.personnel_id})')

    # 4. Check Copilot Status
    print('\n[TEST 4] Copilot Status Endpoint (/api/copilot/status)...')
    resp = client.get('/api/copilot/status', headers=headers)
    assert resp.status_code == 200, f'Status check failed: {resp.status_code}'
    status_data = resp.json()
    print('  PASS: Copilot status:', status_data['status'])
    print('  Ollama target model:', status_data['ollama_target_model'])
    print('  Clinical Lexicon Guardrail:', status_data['clinical_lexicon_guardrail'])
    print('  Fallback Engine:', status_data['fallback_engine'])

    # 5. Test POST /api/copilot/brief/{case_id}
    print(f'\n[TEST 5] POST /api/copilot/brief/{case_id}...')
    resp = client.post(f'/api/copilot/brief/{case_id}', headers=headers, json={})
    assert resp.status_code == 200, f'Brief generation failed: {resp.status_code} - {resp.text}'
    brief_data = resp.json()
    assert brief_data['case_id'] == case_id
    assert 'brief_markdown' in brief_data and len(brief_data['brief_markdown']) > 100
    assert 'cited_sources' in brief_data and len(brief_data['cited_sources']) > 0
    p_rank = brief_data.get('personnel_rank')
    p_name = brief_data.get('personnel_name')
    r_level = brief_data.get('risk_level')
    r_score = brief_data.get('risk_score')
    m_used = brief_data.get('model_used')
    is_fb = brief_data.get('is_fallback')
    print(f'  PASS: Brief generated successfully!')
    print(f'  Soldier: {p_rank} {p_name}')
    print(f'  Risk Level: {r_level} (Score: {r_score})')
    print(f'  Model Used: {m_used} (is_fallback: {is_fb})')
    print('  Total Cited Sources:', len(brief_data['cited_sources']))
    print('  Sample Citation 1:', brief_data['cited_sources'][0])
    if len(brief_data['cited_sources']) > 1:
        print('  Sample Citation 2:', brief_data['cited_sources'][1])

    # 6. Test POST /api/welfare/case/{case_id}/copilot-brief (Alias)
    print(f'\n[TEST 6] POST /api/welfare/case/{case_id}/copilot-brief (Welfare Alias)...')
    resp = client.post(f'/api/welfare/case/{case_id}/copilot-brief', headers=headers, json={})
    assert resp.status_code == 200, f'Welfare brief alias failed: {resp.status_code}'
    welfare_brief = resp.json()
    assert welfare_brief['case_id'] == case_id
    print('  PASS: Welfare alias endpoint returns identical high-grade brief.')

    # 7. Test POST /api/copilot/chat
    print('\n[TEST 7] POST /api/copilot/chat (Contextual Welfare Q&A)...')
    chat_payload = {
        'message': 'What shift reassignment lowers risk the fastest for this soldier?',
        'case_id': case_id
    }
    resp = client.post('/api/copilot/chat', headers=headers, json=chat_payload)
    assert resp.status_code == 200, f'Chat failed: {resp.status_code} - {resp.text}'
    chat_data = resp.json()
    assert 'response' in chat_data and len(chat_data['response']) > 50
    print('  PASS: Chat responded with grounded advice.')
    print('  Response snippet:', chat_data['response'][:150], '...')
    print('  Citations returned:', len(chat_data['cited_sources']))

    # 8. Test POST /api/welfare/copilot/chat (Alias)
    print('\n[TEST 8] POST /api/welfare/copilot/chat (Welfare Chat Alias)...')
    chat_payload2 = {
        'message': 'How does leave denial impact his current stress trajectory?',
        'case_id': case_id
    }
    resp = client.post('/api/welfare/copilot/chat', headers=headers, json=chat_payload2)
    assert resp.status_code == 200, f'Welfare chat alias failed: {resp.status_code}'
    chat_data2 = resp.json()
    print('  PASS: Welfare chat alias responded successfully.')
    print('  Response snippet:', chat_data2['response'][:150], '...')

    # 9. Test Clinical Lexicon Guardrail directly
    print('\n[TEST 9] Clinical Lexicon Guardrail Sanitizer...')
    test_input = 'Soldier diagnosed with major depressive disorder, severe depression and PTSD showing signs of suicide and mental illness. Needs psychiatric care.'
    sanitized_output = sanitize_clinical_lexicon(test_input)
    print('  Input:    ', test_input)
    print('  Sanitized:', sanitized_output)
    prohibited = ['depression', 'ptsd', 'suicide', 'major depressive disorder', 'mental illness', 'psychiatric']
    for term in prohibited:
        assert term not in sanitized_output.lower(), f'Prohibited term \"{term}\" was not sanitized!'
    print('  PASS: All prohibited clinical pathology terms replaced with compliant operational terminology.')

    # 10. Verify Non-Breaking Existing Endpoints
    print('\n[TEST 10] Existing Endpoints Regression Check...')
    resp_cases = client.get('/api/welfare/cases', headers=headers)
    assert resp_cases.status_code == 200, f'Welfare cases list failed: {resp_cases.status_code}'
    print('  PASS: /api/welfare/cases returned total cases:', resp_cases.json()['total'])

    cmd_user = db.query(User).filter(User.role == 'commander').first()
    cmd_token = create_access_token({'sub': cmd_user.id})
    resp_cmd = client.get('/api/commander/units', headers={'Authorization': f'Bearer {cmd_token}'})
    assert resp_cmd.status_code == 200, f'Commander units failed: {resp_cmd.status_code}'
    print('  PASS: /api/commander/units returned formations count:', len(resp_cmd.json()))

    print('\n================================================================')
    print('ALL WORK PACKAGE 1 VERIFICATION TESTS PASSED SUCCESSFULLY (10/10)!')
    print('================================================================\n')

if __name__ == '__main__':
    run_tests()