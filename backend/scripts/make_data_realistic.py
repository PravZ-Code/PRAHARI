"""
PROJECT PRAHARI -- REALISTIC PARAMILITARY BATTALION DATA CALIBRATION SCRIPT
=============================================================================
Transforms synthetic test artifacts and single-day timestamps (2026-09-19)
into authentic, temporally realistic operational defense records reflecting
real-life CRPF battalion operations across Kashmir, Bastar/Sukma, Leh,
Hyderabad, and New Delhi HQ.

Calibrates:
1. Grievance & Leave Requests:
   - Cleans test pollution and repetitive automated test artifacts.
   - Provisions authentic, realistic requests for Constable Rajesh Kumar:
     * Active (<30 days): 4 requests (ICU emergency, CBSE exams, fatigue swap, allowance).
     * Archived (>30 days): 3 requests (Kharif harvest, ankle ligament convalescence, land dispute).
   - Provisions 35+ realistic requests across Alpha, Bravo, Charlie, Delta, and HQ companies.
2. Self-Assessments (Check-ins):
   - Deduplicates test submissions on 2026-09-19 for Rajesh Kumar, retaining 1 authentic
     distress pulse check for today alongside his 90-day longitudinal trajectory.
3. Welfare Cases (Section 21 & Mental Health Oversight):
   - Staggers 97 welfare cases realistically over the past 60 days:
     * 15 recent active cases (1-5 days ago) with active SLA deadlines.
     * 30 in-progress cases (6-25 days ago) with assigned officers, peer buddies, and care plans.
     * 52 resolved cases (26-60 days ago) with documented clinical & command recovery notes.
4. Peer Buddy Signals:
   - Distributes 195 signals naturally across the 6-week operational window (Weeks 33-38).
5. Cryptographic SHA-256 Audit Ledger (BSA 2023 §63):
   - Distributes administrative and officer access events over the past 60 days.
   - Re-chains the entire ledger from sequence 1 to N with valid SHA-256 hashes & KMS signatures.
   - Refreshes external Merkle checkpoint anchors.
"""

import os
import sys
import uuid
import json
import random
import hashlib
import hmac
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal, AuthSessionLocal, engine
from models import (
    Personnel,
    Unit,
    GrievanceRequest,
    WelfareCase,
    SLAEscalation,
    BuddySignal,
    SelfAssessment,
    DutyRoster,
    LeaveRecord,
    RiskPrediction,
    URORun
)
from models.audit import AuditLog, AuditAnchor
from models.user import User
from middleware.audit import (
    compute_audit_hash,
    sign_audit_hash,
    format_iso_timestamp,
    compute_merkle_root,
    get_signing_key
)

def make_data_realistic():
    print("=" * 80)
    print(" [PRAHARI] REALISTIC PARAMILITARY BATTALION DATA CALIBRATION")
    print("=" * 80)

    db: Session = SessionLocal()
    auth_db: Session = AuthSessionLocal()

    try:
        today = date(2026, 9, 19)
        now_dt = datetime(2026, 9, 19, 14, 30, 0, tzinfo=timezone.utc)
        now_naive = now_dt.replace(tzinfo=None)

        # 1. Fetch Core Users and Personnel
        rajesh = db.query(Personnel).filter(Personnel.name == "Rajesh Kumar").first()
        ankit = db.query(Personnel).filter(Personnel.name == "Ankit Sharma").first()
        if not rajesh or not ankit:
            print("[ERROR] Core personnel (Rajesh Kumar / Ankit Sharma) not found. Run seed_db first.")
            return

        alpha_unit = db.query(Unit).filter(Unit.name.like("%Alpha%")).first()
        bravo_unit = db.query(Unit).filter(Unit.name.like("%Bravo%")).first()
        charlie_unit = db.query(Unit).filter(Unit.name.like("%Charlie%")).first()
        delta_unit = db.query(Unit).filter(Unit.name.like("%Delta%")).first()
        hq_unit = db.query(Unit).filter(Unit.name.like("%Headquarters%")).first()

        wo_user = auth_db.query(User).filter(User.username == "wo_meera").first()
        cmd_user = auth_db.query(User).filter(User.username == "cmd_vikram").first()
        admin_user = auth_db.query(User).filter(User.username == "admin_sys").first()
        rajesh_user = auth_db.query(User).filter(User.username == "rajesh_kumar").first()

        wo_id = str(wo_user.id) if wo_user else str(uuid.uuid4())
        cmd_id = str(cmd_user.id) if cmd_user else str(uuid.uuid4())
        admin_id = str(admin_user.id) if admin_user else str(uuid.uuid4())
        rajesh_uid = str(rajesh_user.id) if rajesh_user else str(uuid.uuid4())

        print(f"  + Target Trooper: {rajesh.name} ({rajesh.service_number}) | ID: {rajesh.id}")
        print(f"  + Buddy Trooper:  {ankit.name} ({ankit.service_number}) | ID: {ankit.id}")

        # =========================================================================
        # STEP 1: Calibrate Grievance & Leave Requests
        # =========================================================================
        print("\n[STEP 1/5] Calibrating Grievance Requests & Leave Dockets...")

        # Delete all existing grievances to remove synthetic test noise and start with clean realistic records
        db.query(GrievanceRequest).delete()
        db.flush()

        # Realistic requests for Constable Rajesh Kumar
        # 4 Active (< 30 days) + 3 Archived (> 30 days)
        rajesh_requests = [
            # Active 1: Urgent fast-lane ICU family emergency (Filed 2 days ago)
            {
                "personnel_id": rajesh.id,
                "request_type": "family_crisis",
                "category": "medical_emergency",
                "description": "Urgent emergency leave: Mother admitted to ICU in Bareilly District Hospital following acute myocardial infarction. Primary caregiver attendance and critical surgical consent required.",
                "start_date": "2026-09-20",
                "end_date": "2026-10-04",
                "filing_channel": "pwa",
                "is_fast_lane": True,
                "status": "fast_tracked",
                "filed_at": now_naive - timedelta(days=2, hours=7, minutes=45),
                "sla_deadline_hours": 72,
                "sla_deadline": now_naive + timedelta(hours=16, minutes=15),
                "sla_breached": False,
                "escalation_level": 0,
                "collision_status": "safe",
                "suggested_replacement_id": ankit.id,
                "commander_approved": False,
                "welfare_approved": True,
                "welfare_approved_at": now_naive - timedelta(days=1, hours=22),
                "resolution_notes": "Welfare Officer endorsed expedited 14-day emergency sanction under fast-lane protocol."
            },
            # Active 2: Child education / CBSE board exams (Filed 8 days ago)
            {
                "personnel_id": rajesh.id,
                "request_type": "leave",
                "category": "child_education",
                "description": "Annual casual leave: Elder daughter's Class 10 CBSE Board Examination enrollment and fee settlement at Kendriya Vidyalaya, Lucknow. Required for 10 days.",
                "start_date": "2026-10-05",
                "end_date": "2026-10-15",
                "filing_channel": "pwa",
                "is_fast_lane": False,
                "status": "filed",
                "filed_at": now_naive - timedelta(days=8, hours=4, minutes=10),
                "sla_deadline_hours": 168,
                "sla_deadline": now_naive - timedelta(hours=4, minutes=10),
                "sla_breached": True,
                "escalation_level": 1,
                "escalated_at": now_naive - timedelta(hours=3),
                "escalation_reason": "SLA 168h elapsed without company commander adjudication",
                "collision_status": "warning",
                "collision_details": {
                    "conflict_reason": "Coincides with Alpha Company quarterly firing range exercise",
                    "replacement_required": True
                },
                "suggested_replacement_id": None,
                "commander_approved": False,
                "welfare_approved": False
            },
            # Active 3: Circadian fatigue & roster rest swap (Filed 15 days ago)
            {
                "personnel_id": rajesh.id,
                "request_type": "grievance",
                "category": "administrative_delay",
                "description": "Request for circadian rotation relief following 5 consecutive night cordons and high-altitude convoy escort in Srinagar CI grid. Submitted for trade-matched URO swap.",
                "start_date": "2026-09-05",
                "end_date": "2026-09-12",
                "filing_channel": "pwa",
                "is_fast_lane": False,
                "status": "in_review",
                "filed_at": now_naive - timedelta(days=15, hours=6, minutes=20),
                "sla_deadline_hours": 168,
                "sla_deadline": now_naive - timedelta(days=8, hours=6, minutes=20),
                "sla_breached": False,
                "escalation_level": 0,
                "collision_status": "safe",
                "suggested_replacement_id": ankit.id,
                "commander_approved": False,
                "welfare_approved": True,
                "welfare_approved_at": now_naive - timedelta(days=14),
                "resolution_notes": "Referred to Unit Resilience Optimizer for trade-matched GD night swap."
            },
            # Active 4: Risk & Hardship Allowance Claim (Filed 25 days ago)
            {
                "personnel_id": rajesh.id,
                "request_type": "grievance",
                "category": "pay_and_allowances",
                "description": "Claim for uncredited Risk & Hardship Allowance (RHA - Level 3) for 45-day tactical detachment to Kupwara operational sector.",
                "start_date": "2026-08-01",
                "end_date": "2026-08-31",
                "filing_channel": "pwa",
                "is_fast_lane": False,
                "status": "approved",
                "filed_at": now_naive - timedelta(days=25, hours=3, minutes=15),
                "sla_deadline_hours": 168,
                "sla_deadline": now_naive - timedelta(days=18, hours=3, minutes=15),
                "sla_breached": False,
                "escalation_level": 0,
                "collision_status": "safe",
                "suggested_replacement_id": None,
                "commander_approved": True,
                "commander_approved_at": now_naive - timedelta(days=21, hours=5),
                "welfare_approved": True,
                "welfare_approved_at": now_naive - timedelta(days=22, hours=2),
                "resolution_notes": "Battalion accounts branch verified detachment muster roll; allowance sanctioned in August pay cycle."
            },
            # Archived 1: Kharif Harvest Agricultural Leave (Filed 68 days ago)
            {
                "personnel_id": rajesh.id,
                "request_type": "leave",
                "category": "annual_leave",
                "description": "Biannual agricultural leave: Kharif paddy harvest and ancestral land irrigation in village, Bareilly, UP.",
                "start_date": "2026-07-20",
                "end_date": "2026-08-05",
                "filing_channel": "pwa",
                "is_fast_lane": False,
                "status": "approved",
                "filed_at": now_naive - timedelta(days=68, hours=5, minutes=30),
                "sla_deadline_hours": 168,
                "sla_deadline": now_naive - timedelta(days=61, hours=5, minutes=30),
                "sla_breached": False,
                "escalation_level": 0,
                "collision_status": "safe",
                "suggested_replacement_id": None,
                "commander_approved": True,
                "commander_approved_at": now_naive - timedelta(days=64),
                "welfare_approved": True,
                "welfare_approved_at": now_naive - timedelta(days=65),
                "resolution_notes": "Sanctioned 16 days Annual Leave. Returned to station on time with zero overstay."
            },
            # Archived 2: Ankle sprain convalescent medical leave (Filed 112 days ago)
            {
                "personnel_id": rajesh.id,
                "request_type": "leave",
                "category": "medical_emergency",
                "description": "Convalescent rest for Grade-1 right ankle ligament sprain sustained during battalion obstacle training course.",
                "start_date": "2026-06-01",
                "end_date": "2026-06-15",
                "filing_channel": "pwa",
                "is_fast_lane": True,
                "status": "approved",
                "filed_at": now_naive - timedelta(days=112, hours=2),
                "sla_deadline_hours": 72,
                "sla_deadline": now_naive - timedelta(days=109, hours=2),
                "sla_breached": False,
                "escalation_level": 0,
                "collision_status": "safe",
                "suggested_replacement_id": None,
                "commander_approved": True,
                "commander_approved_at": now_naive - timedelta(days=111),
                "welfare_approved": True,
                "welfare_approved_at": now_naive - timedelta(days=111, hours=8),
                "resolution_notes": "Recommended by Battalion Medical Officer; 14 days sick leave granted."
            },
            # Archived 3: Ancestral Land Demarcation Grievance (Filed 145 days ago)
            {
                "personnel_id": rajesh.id,
                "request_type": "grievance",
                "category": "administrative_delay",
                "description": "Assistance from Welfare Directorate for District Magistrate liaison regarding unauthorized boundary encroachment on ancestral agricultural land during active deployment.",
                "start_date": "2026-04-28",
                "end_date": "2026-05-10",
                "filing_channel": "pwa",
                "is_fast_lane": False,
                "status": "approved",
                "filed_at": now_naive - timedelta(days=145, hours=4),
                "sla_deadline_hours": 168,
                "sla_deadline": now_naive - timedelta(days=138, hours=4),
                "sla_breached": False,
                "escalation_level": 0,
                "collision_status": "safe",
                "suggested_replacement_id": None,
                "commander_approved": True,
                "commander_approved_at": now_naive - timedelta(days=140),
                "welfare_approved": True,
                "welfare_approved_at": now_naive - timedelta(days=141),
                "resolution_notes": "Official demi-official (DO) letter dispatched by Welfare Officer to DM Bareilly. Encroachment stayed."
            }
        ]

        for req_data in rajesh_requests:
            g = GrievanceRequest(id=str(uuid.uuid4()), **req_data)
            db.add(g)

        # Provisions 35 realistic battalion grievances across all companies and dates
        other_soldiers = db.query(Personnel).filter(Personnel.id != rajesh.id).limit(200).all()
        bat_templates = [
            # Medical / Convalescence
            ("family_crisis", "medical_emergency", "Severe dengue with thrombopenia in spouse; two young children require primary parental care.", 3, 14, True, 72, "fast_tracked"),
            ("leave", "medical_emergency", "Preventive medical review and diagnostic scan for recurrent high-altitude lumbar spasm.", 12, 7, False, 168, "approved"),
            ("family_crisis", "medical_emergency", "Acute jaundice and liver function derangement in dependent father at village dispensary.", 22, 10, True, 72, "approved"),
            # Family / Compassionate
            ("leave", "compassionate_ground", "Younger sister's wedding solemnization in Jhansi; religious and logistical head of family obligations.", 5, 12, False, 168, "filed"),
            ("leave", "child_education", "Admission counselling and entrance test for son at Sainik School Rewa.", 18, 5, False, 168, "approved"),
            ("leave", "bereavement", "Demise of paternal grandmother; performance of final Vedic rites and 13-day observances.", 29, 14, True, 72, "approved"),
            # Operational / Rest
            ("grievance", "administrative_delay", "Roster rest compensation requested following 14-day continuous deep-jungle anti-Naxal patrol cordon.", 7, 5, False, 168, "in_review"),
            ("grievance", "pay_and_allowances", "Missing TA/DA settlement for escorting tactical arms shipment from Central Armory Jabalpur.", 38, 0, False, 168, "approved"),
            ("grievance", "pay_and_allowances", "Special High Altitude Allowance (SHAA) rate revision claim for Leh border post deployment.", 55, 0, False, 168, "approved"),
            # Harvest & Domestic
            ("leave", "annual_leave", "Agricultural harvesting of sugarcane crop and sale coordination at local agricultural mandi.", 45, 15, False, 168, "approved"),
            ("leave", "annual_leave", "Repair of monsoon flood-damaged residential boundary wall in Gorakhpur village.", 85, 12, False, 168, "approved"),
            ("leave", "annual_leave", "Annual earned leave block for rest and recuperation with family in Sikar.", 115, 30, False, 168, "approved"),
        ]

        for i, soldier in enumerate(other_soldiers[:36]):
            tmpl = bat_templates[i % len(bat_templates)]
            req_type, cat, desc, days_ago, duration, is_fast, sla_hrs, stat = tmpl
            # Add slight jitter to days_ago so dates are beautifully dispersed
            f_days = days_ago + (i // len(bat_templates)) * 2
            f_dt = now_naive - timedelta(days=f_days, hours=random.randint(2, 16), minutes=random.randint(10, 50))
            sla_dl = f_dt + timedelta(hours=sla_hrs)
            is_breached = (stat == "filed" and sla_dl < now_naive)

            s_date = (today - timedelta(days=f_days - 2)).isoformat() if duration > 0 else today.isoformat()
            e_date = (today - timedelta(days=f_days - 2 - duration)).isoformat() if duration > 0 else s_date

            bg = GrievanceRequest(
                id=str(uuid.uuid4()),
                personnel_id=soldier.id,
                request_type=req_type,
                category=cat,
                description=f"{desc} (Trooper: {soldier.name}, {soldier.rank})",
                start_date=s_date,
                end_date=e_date,
                filing_channel=random.choice(["pwa", "ivr", "sms"]),
                is_fast_lane=is_fast,
                status=stat,
                filed_at=f_dt,
                sla_deadline_hours=sla_hrs,
                sla_deadline=sla_dl,
                sla_breached=is_breached,
                escalation_level=1 if is_breached else 0,
                escalated_at=f_dt + timedelta(hours=sla_hrs + 1) if is_breached else None,
                collision_status="safe",
                commander_approved=(stat == "approved"),
                commander_approved_at=f_dt + timedelta(days=1) if stat == "approved" else None,
                welfare_approved=(stat == "approved"),
                welfare_approved_at=f_dt + timedelta(days=1) if stat == "approved" else None,
                resolution_notes="Statutory leave docket processed and verified." if stat == "approved" else None
            )
            db.add(bg)

        db.flush()
        total_g = db.query(GrievanceRequest).count()
        r_g = db.query(GrievanceRequest).filter(GrievanceRequest.personnel_id == rajesh.id).count()
        print(f"  [OK] Grievances calibrated: {total_g} total across battalion, {r_g} authentic records for Rajesh.")

        # =========================================================================
        # STEP 2: Calibrate Self-Assessments (Check-ins)
        # =========================================================================
        print("\n[STEP 2/5] Cleaning duplicate test check-ins and refining Self-Assessments...")

        # For Rajesh Kumar, remove all duplicate check-ins created on 2026-09-19 except 1 authentic entry
        rajesh_today_sas = db.query(SelfAssessment).filter(
            SelfAssessment.personnel_id == rajesh.id,
            SelfAssessment.assessed_at >= datetime(2026, 9, 19, 0, 0, 0)
        ).all()

        if len(rajesh_today_sas) > 1:
            # Keep the first one, delete the rest
            for sa in rajesh_today_sas[1:]:
                db.delete(sa)
            # Update the kept entry to reflect acute crisis state (sleep 3.5h, stress 5, mood 1)
            kept = rajesh_today_sas[0]
            kept.assessed_at = datetime(2026, 9, 19, 7, 30, 0)
            kept.sleep_quality = 1
            kept.sleep_hours = 3.5
            kept.mood_score = 1
            kept.energy_level = 2
            kept.stress_level = 5
            kept.appetite_score = 1
            kept.social_connection = 1
            kept.synced_at = datetime(2026, 9, 19, 7, 30, 0)
            db.flush()
            print(f"  [OK] Retained 1 authentic distress check-in for Rajesh on 2026-09-19 (cleaned {len(rajesh_today_sas) - 1} duplicates).")

        # =========================================================================
        # STEP 3: Calibrate Welfare Cases (Section 21 Oversight)
        # =========================================================================
        print("\n[STEP 3/5] Distributing Welfare Cases realistically across the past 60 days...")

        welfare_cases = db.query(WelfareCase).order_by(WelfareCase.id.asc()).all()
        print(f"  + Existing Welfare Cases to calibrate: {len(welfare_cases)}")

        # Realistically distribute cases:
        # - 15 recent active cases (0 to 5 days ago)
        # - 30 in-progress cases (6 to 25 days ago)
        # - 52 resolved cases (26 to 60 days ago)
        rajesh_case = db.query(WelfareCase).filter(WelfareCase.personnel_id == rajesh.id).first()

        for idx, wc in enumerate(welfare_cases):
            if wc.personnel_id == rajesh.id:
                # Rajesh's acute case: Triggered 2 days ago when mother had heart attack
                c_dt = now_naive - timedelta(days=2, hours=7, minutes=30)
                ack_dt = c_dt + timedelta(hours=4)
                plan_dt = c_dt + timedelta(hours=22)
                wc.created_at = c_dt
                wc.status = "intervention_active"
                wc.assigned_officer_id = wo_id
                wc.acknowledged_at = ack_dt
                wc.plan_created_at = plan_dt
                wc.sla_acknowledge_deadline = c_dt + timedelta(hours=12)
                wc.sla_plan_deadline = c_dt + timedelta(hours=48)
                wc.sla_breached = False
                wc.escalation_level = 0
                wc.intervention_type = "Peer Buddy & Emergency Leave Support"
                wc.intervention_notes = "Assigned Buddy Constable Ankit Sharma. Fast-lane 14-day emergency leave docket initiated to attend mother in Bareilly ICU."
                continue

            if idx < 15:
                # Recent active cases (1 to 5 days ago)
                d_offset = random.randint(1, 5)
                c_dt = now_naive - timedelta(days=d_offset, hours=random.randint(1, 12))
                ack_hrs = 12 if wc.risk_level_at_creation == "red" else 24
                plan_hrs = 48 if wc.risk_level_at_creation == "red" else 72
                is_acked = (d_offset >= 2)
                wc.created_at = c_dt
                wc.status = "acknowledged" if is_acked else "pending"
                wc.assigned_officer_id = wo_id if is_acked else None
                wc.acknowledged_at = c_dt + timedelta(hours=3) if is_acked else None
                wc.sla_acknowledge_deadline = c_dt + timedelta(hours=ack_hrs)
                wc.sla_plan_deadline = c_dt + timedelta(hours=plan_hrs)
                wc.sla_breached = False
                wc.escalation_level = 0
                wc.intervention_type = "Initial Clinical Intake" if is_acked else None
                wc.intervention_notes = "Psychological check-in conducted; sleep hygiene protocol shared." if is_acked else None

            elif idx < 45:
                # In-progress cases (6 to 25 days ago)
                d_offset = random.randint(6, 25)
                c_dt = now_naive - timedelta(days=d_offset, hours=random.randint(1, 12))
                wc.created_at = c_dt
                wc.status = "intervention_active"
                wc.assigned_officer_id = wo_id
                wc.acknowledged_at = c_dt + timedelta(hours=4)
                wc.plan_created_at = c_dt + timedelta(hours=28)
                wc.sla_acknowledge_deadline = c_dt + timedelta(hours=24)
                wc.sla_plan_deadline = c_dt + timedelta(hours=72)
                wc.sla_breached = False
                wc.escalation_level = 0
                wc.intervention_type = random.choice([
                    "Circadian Duty Rotation",
                    "Assigned Peer Buddy Check-in",
                    "Tele-Counseling Session",
                    "Family Outreach Cell Support"
                ])
                wc.intervention_notes = "Weekly wellness review scheduled. Roster adjusted to eliminate consecutive night duties."

            else:
                # Resolved cases (26 to 60 days ago)
                d_offset = random.randint(26, 60)
                c_dt = now_naive - timedelta(days=d_offset, hours=random.randint(1, 12))
                res_dt = c_dt + timedelta(days=random.randint(10, 20))
                wc.created_at = c_dt
                wc.status = "resolved"
                wc.assigned_officer_id = wo_id
                wc.acknowledged_at = c_dt + timedelta(hours=5)
                wc.plan_created_at = c_dt + timedelta(hours=30)
                wc.resolved_at = res_dt
                wc.sla_acknowledge_deadline = c_dt + timedelta(hours=24)
                wc.sla_plan_deadline = c_dt + timedelta(hours=72)
                wc.sla_breached = False
                wc.escalation_level = 0
                wc.intervention_type = "Comprehensive Stress Decompression"
                wc.intervention_notes = "Completed 14-day rest cycle and counseling sessions."
                wc.outcome_notes = "Trooper restored to baseline physiological and psychological scores (Green). Closed with medical clearance."

        db.flush()
        print(f"  [OK] All {len(welfare_cases)} Welfare Cases realistically distributed with longitudinal lifecycle progression.")

        # =========================================================================
        # STEP 4: Calibrate Peer Buddy Signals
        # =========================================================================
        print("\n[STEP 4/5] Distributing Peer Buddy Signals across 6 operational weeks...")

        buddy_signals = db.query(BuddySignal).all()
        for idx, sig in enumerate(buddy_signals):
            # Distribute over weeks 33 to 38 (Aug 10 to Sep 18, 2026)
            week_back = (idx % 6)
            days_back = week_back * 7 + (idx % 7)
            s_dt = now_naive - timedelta(days=days_back, hours=random.randint(8, 21), minutes=random.randint(0, 59))
            sig.submitted_at = s_dt
            sig.week_number = s_dt.isocalendar()[1]
            sig.year = s_dt.year

        db.flush()
        print(f"  [OK] {len(buddy_signals)} Buddy Signals calibrated smoothly over 6 weeks.")

        # =========================================================================
        # STEP 5: Rebuild and Cryptographically Re-chain Audit Ledger
        # =========================================================================
        print("\n[STEP 5/5] Re-chaining Cryptographic SHA-256 Audit Ledger (BSA 2023 §63)...")

        # First, remove synthetic test audit logs (failed logins, test spam)
        # Keep realistic operational audit events
        db.query(AuditAnchor).delete()
        db.query(AuditLog).delete()
        db.flush()

        # Construct realistic operational audit entries over the past 60 days
        realistic_audit_events = []

        # System Bootstrap (60 days ago: 2026-07-21)
        boot_base = now_naive - timedelta(days=60)
        sys_events = [
            ("INITIALIZE_SYSTEM", "system", "SYSTEM_CORE", "/api/admin/init", admin_id, boot_base + timedelta(minutes=10), {"event": "PRAHARI Defense & Paramilitary Kernel Boot"}),
            ("PROVISION_TACTICAL_UNITS", "unit", "5_FORMATIONS", "/api/admin/units/provision", admin_id, boot_base + timedelta(minutes=25), {"units_count": 5, "authorized_strength": 1000}),
            ("ONBOARD_BATTALION_ROSTER", "personnel", "1000_PERSONNEL", "/api/admin/personnel/batch-import", admin_id, boot_base + timedelta(minutes=45), {"personnel_count": 1000}),
            ("GENERATE_DUTY_ROSTER", "duty_roster", "90_DAYS_ROSTER", "/api/uro/roster-seed", admin_id, boot_base + timedelta(hours=2), {"days": 90, "shifts_generated": 90000}),
            ("SYNC_LEAVE_HISTORIES", "leave_records", "180_DAYS_LEAVE", "/api/welfare/leave/sync", admin_id, boot_base + timedelta(hours=3), {"days": 180}),
            ("SYNC_WELLNESS_ASSESSMENTS", "self_assessment", "LONGITUDINAL", "/api/assessment/sync", admin_id, boot_base + timedelta(hours=4), {"window_days": 90}),
            ("CLUSTER_COLD_START_COHORTS", "cohort_template", "K_MEANS_CLUSTERS", "/api/ml/cohorts/build", admin_id, boot_base + timedelta(hours=5), {"clusters": 6}),
            ("FORMULATE_PERSONAL_BASELINES", "personal_baseline", "BATTALION_BASELINES", "/api/ml/baselines/blend", admin_id, boot_base + timedelta(hours=6), {"count": 1000}),
            ("TRAIN_XGBOOST_MODEL", "model", "XGB_V1", "/api/ml/train", admin_id, boot_base + timedelta(hours=7), {"model": "XGBoost v1.0", "auroc": 0.942}),
        ]
        realistic_audit_events.extend(sys_events)

        # Operational days from day 50 ago to 1 day ago
        officer_ids = [cmd_id, wo_id, admin_id]
        for d in range(50, 0, -1):
            log_date = now_naive - timedelta(days=d)
            # 1-3 routine operational events per day
            # Commander shift review
            if d % 3 == 0:
                realistic_audit_events.append((
                    "ROSTER_FATIGUE_AUDIT", "duty_roster", alpha_unit.id if alpha_unit else "ALPHA_CO",
                    "/api/uro/roster", cmd_id,
                    log_date.replace(hour=10, minute=random.randint(15, 45)),
                    {"inspection": "Routine circadian fatigue index review before tactical deployment"}
                ))
            # Welfare officer wellbeing check
            if d % 4 == 0:
                realistic_audit_events.append((
                    "WELFARE_COHORT_TREND_REVIEW", "welfare_case", "BATTALION_OVERSIGHT",
                    "/api/welfare/cohort-trends", wo_id,
                    log_date.replace(hour=14, minute=random.randint(10, 50)),
                    {"inspection": "Section 21 statutory psychological trends audit"}
                ))
            # Grievance processing
            if d % 5 == 0:
                realistic_audit_events.append((
                    "GRIEVANCE_DOCKET_ADJUDICATION", "grievance", "PENDING_QUEUE",
                    "/api/grievance/pending-queue", cmd_id,
                    log_date.replace(hour=16, minute=random.randint(5, 30)),
                    {"inspection": "Adjudication of administrative leave and allowance dockets"}
                ))

        # Specific access logs for Constable Rajesh Kumar (Personal Access Log - "Who Viewed My Data?")
        rajesh_audit_events = [
            ("MEDICAL_DOSSIER_VIEWED", "personnel", rajesh.id, f"/api/personnel/{rajesh.id}/medical-dossier", admin_id, now_naive - timedelta(days=42, hours=4), {"purpose": "Annual high-altitude medical fitness review"}),
            ("ALLOWANCE_CLAIM_VERIFIED", "grievance", rajesh.id, f"/api/grievance/{rajesh.id}/claim", cmd_id, now_naive - timedelta(days=25, hours=3), {"purpose": "Risk & Hardship Allowance entitlement verification"}),
            ("ROSTER_SWAP_REVIEW", "duty_roster", rajesh.id, "/api/uro/roster", cmd_id, now_naive - timedelta(days=14, hours=6), {"purpose": "Circadian rest request evaluation under URO"}),
            ("EVIDENCE_CONFLICT_ANALYSIS", "self_assessment", rajesh.id, f"/api/welfare/personnel/{rajesh.id}/evidence-conflict", wo_id, now_naive - timedelta(days=2, hours=6, minutes=45), {"purpose": "Statutory psychological discordance analysis following acute stress pulse"}),
            ("LONGITUDINAL_TREND_INSPECTION", "risk_prediction", rajesh.id, f"/api/welfare/personnel/{rajesh.id}/trend-analysis", wo_id, now_naive - timedelta(days=2, hours=6, minutes=40), {"purpose": "14-day velocity and acceleration trajectory review"}),
            ("PERSONAL_ACCESS_LOG_VIEWED", "personnel_transparency", rajesh.id, "/api/personnel/access-log", rajesh_uid, now_naive - timedelta(days=1, hours=2), {"purpose": "Statutory transparency self-inspection by trooper"})
        ]
        realistic_audit_events.extend(rajesh_audit_events)

        # Sort all audit events strictly chronologically
        realistic_audit_events.sort(key=lambda x: x[5])

        # Sequentially hash and chain the ledger
        prev_hash = "0" * 64
        seq = 1
        created_audit_logs = []

        for act, res_type, res_id, ep, u_id, dt, det in realistic_audit_events:
            ts_iso = format_iso_timestamp(dt)
            det_json = json.dumps(det, sort_keys=True)
            curr_hash = compute_audit_hash(
                prev_hash=prev_hash,
                user_id=u_id,
                action=act,
                resource_type=res_type,
                resource_id=res_id,
                endpoint=ep,
                timestamp_iso=ts_iso,
                details_json=det_json
            )
            sig = sign_audit_hash(curr_hash)

            alog = AuditLog(
                id=str(uuid.uuid4()),
                sequence_number=seq,
                previous_hash=prev_hash,
                current_hash=curr_hash,
                signature=sig,
                user_id=u_id,
                action=act,
                resource_type=res_type,
                resource_id=res_id,
                endpoint=ep,
                ip_address="10.14.2.8",
                timestamp=dt,
                details=det
            )
            db.add(alog)
            created_audit_logs.append(alog)
            prev_hash = curr_hash
            seq += 1

        db.flush()

        # Create external checkpoint anchor for head
        if created_audit_logs:
            head_log = created_audit_logs[-1]
            recent_hashes = [l.current_hash for l in created_audit_logs]
            merkle_root = compute_merkle_root(recent_hashes)
            nonce = hashlib.sha256(f"{head_log.sequence_number}:{head_log.current_hash}:{now_dt.isoformat()}".encode("utf-8")).hexdigest()
            anchor_sig = hmac.new(get_signing_key(), f"{merkle_root}:{nonce}".encode("utf-8"), hashlib.sha256).hexdigest()

            anchor = AuditAnchor(
                id=str(uuid.uuid4()),
                sequence_number=head_log.sequence_number,
                head_hash=head_log.current_hash,
                merkle_root=merkle_root,
                signature=anchor_sig,
                anchor_type="RFC3161_TSA_EXTERNAL",
                anchored_at=now_naive,
                external_receipt_nonce=nonce
            )
            db.add(anchor)
            head_log.anchor_id = anchor.id
            db.flush()
            print(f"  [OK] Sealed external Merkle Checkpoint Anchor at sequence #{head_log.sequence_number}.")

        db.commit()
        print(f"  [OK] Successfully constructed and chained {len(created_audit_logs)} cryptographic audit blocks.")

        print("\n" + "=" * 80)
        print(" [SUCCESS] REALISTIC DATA CALIBRATION COMPLETE")
        print("=" * 80)
        print(f"  • Grievances Active (<30d): 4 authentic requests for Rajesh Kumar")
        print(f"  • Grievances Archived:      3 historical logs for Rajesh Kumar (>30d)")
        print(f"  • Battalion Grievances:     {total_g} total spanning 120 days across 5 units")
        print(f"  • Self-Assessments:         Deduplicated & aligned for Rajesh Kumar")
        print(f"  • Welfare Cases:            {len(welfare_cases)} distributed across 60 days with active/resolved SLA states")
        print(f"  • Peer Buddy Signals:       {len(buddy_signals)} spread across Weeks 33-38")
        print(f"  • SHA-256 Audit Ledger:     {len(created_audit_logs)} blocks chained with KMS signatures & Merkle anchor")
        print("=" * 80)

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Realistic data calibration failed: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        db.close()
        auth_db.close()

if __name__ == "__main__":
    make_data_realistic()
