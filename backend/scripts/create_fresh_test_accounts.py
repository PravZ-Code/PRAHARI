"""
Script to create 3 completely fresh test accounts for PRAHARI manual end-to-end testing:
Account 1: Personnel (Constable Amit Verma)
Account 2: Welfare Officer (Inspector Sunita Rao)
Account 3: Commander (Major Arjun Rathore)

Guarantees 100% clean state with zero previous requests, notifications, assessments, or sessions.
"""

import os
import sys
import uuid
from datetime import date, datetime, timezone

# Ensure parent directory (prahari/backend) is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, AuthSessionLocal, create_all_tables
from models.user import User
from models.personnel import Personnel, Unit
from models.grievance import GrievanceRequest
from models.leave import LeaveRecord
from models.assessment import SelfAssessment
from models.prediction import RiskPrediction
from models.welfare_case import WelfareCase
from models.notification import Notification
from middleware.rbac import get_password_hash

PASSWORD_PLAIN = "Prahari@2026"
ALPHA_UNIT_ID = "6e0cec31-e7ed-4c19-9591-feb41570ae72"

def setup_fresh_accounts():
    create_all_tables()
    db = SessionLocal()
    auth_db = AuthSessionLocal()

    try:
        # Verify Alpha Unit exists
        alpha_unit = db.query(Unit).filter(Unit.id == ALPHA_UNIT_ID).first()
        if not alpha_unit:
            alpha_unit = db.query(Unit).filter(Unit.name.like("%Alpha%")).first()
        assert alpha_unit is not None, "Alpha Unit not found in prahari.db"
        unit_id = alpha_unit.id
        print(f"Using Unit: {alpha_unit.name} (ID: {unit_id})")

        # -------------------------------------------------------------
        # 1. CLEANUP PREVIOUS TEST ACCOUNTS IF THEY ALREADY EXIST
        # -------------------------------------------------------------
        usernames_to_clean = ["fresh_jawan", "fresh_welfare", "fresh_commander"]
        service_num_to_clean = "CRP-2026-99001"

        # Check existing Personnel
        existing_p = db.query(Personnel).filter(Personnel.service_number == service_num_to_clean).first()
        if existing_p:
            p_id = existing_p.id
            print(f"Cleaning existing records for personnel {p_id}...")
            db.query(GrievanceRequest).filter(GrievanceRequest.personnel_id == p_id).delete()
            db.query(LeaveRecord).filter(LeaveRecord.personnel_id == p_id).delete()
            db.query(SelfAssessment).filter(SelfAssessment.personnel_id == p_id).delete()
            db.query(RiskPrediction).filter(RiskPrediction.personnel_id == p_id).delete()
            db.query(WelfareCase).filter(WelfareCase.personnel_id == p_id).delete()
            db.query(Notification).filter(Notification.personnel_id == p_id).delete()
            db.delete(existing_p)
            db.commit()

        # Check existing Users in prahari_auth.db
        for uname in usernames_to_clean:
            existing_u = auth_db.query(User).filter(User.username == uname).first()
            if existing_u:
                print(f"Cleaning existing user account {uname}...")
                db.query(Notification).filter(Notification.user_id == existing_u.id).delete()
                auth_db.delete(existing_u)
        auth_db.commit()
        db.commit()

        # -------------------------------------------------------------
        # 2. CREATE ACCOUNT 1: FRESH PERSONNEL
        # -------------------------------------------------------------
        personnel_id = str(uuid.uuid4())
        fresh_personnel = Personnel(
            id=personnel_id,
            service_number=service_num_to_clean,
            name="Amit Verma",
            rank="Constable",
            trade="GD",
            company="Alpha Company",
            contact_number="+91 98765 43210",
            unit_id=unit_id,
            date_of_joining=date(2024, 1, 15),
            current_posting_date=date(2024, 6, 1),
            hard_area_months=6,
            total_transfers=1
        )
        db.add(fresh_personnel)
        db.commit()
        db.refresh(fresh_personnel)

        user_personnel = User(
            id=str(uuid.uuid4()),
            username="fresh_jawan",
            password_hash=get_password_hash(PASSWORD_PLAIN),
            role="personnel",
            personnel_id=fresh_personnel.id,
            unit_id=unit_id,
            is_active=True,
            last_login_at=None,
            previous_login_at=None
        )
        auth_db.add(user_personnel)
        auth_db.commit()
        print(f"[OK] Account 1 (Personnel) created: username='fresh_jawan', service_number='{service_num_to_clean}'")

        # -------------------------------------------------------------
        # 3. CREATE ACCOUNT 2: FRESH WELFARE OFFICER
        # -------------------------------------------------------------
        user_welfare = User(
            id=str(uuid.uuid4()),
            username="fresh_welfare",
            password_hash=get_password_hash(PASSWORD_PLAIN),
            role="welfare",
            personnel_id=None,
            unit_id=None,  # Battalion-wide oversight
            is_active=True,
            last_login_at=None,
            previous_login_at=None
        )
        auth_db.add(user_welfare)
        auth_db.commit()
        print("[OK] Account 2 (Welfare Officer) created: username='fresh_welfare'")

        # -------------------------------------------------------------
        # 4. CREATE ACCOUNT 3: FRESH COMMANDER
        # -------------------------------------------------------------
        user_commander = User(
            id=str(uuid.uuid4()),
            username="fresh_commander",
            password_hash=get_password_hash(PASSWORD_PLAIN),
            role="commander",
            personnel_id=None,
            unit_id=unit_id,  # Command of Alpha Company
            is_active=True,
            last_login_at=None,
            previous_login_at=None
        )
        auth_db.add(user_commander)
        auth_db.commit()
        print(f"[OK] Account 3 (Commander) created: username='fresh_commander' (Unit: {alpha_unit.name})")

        # -------------------------------------------------------------
        # 5. VERIFY ZERO DATA / CLEAN SLATE GUARANTEE
        # -------------------------------------------------------------
        notifs_p = db.query(Notification).filter(Notification.personnel_id == fresh_personnel.id).count()
        requests_p = db.query(GrievanceRequest).filter(GrievanceRequest.personnel_id == fresh_personnel.id).count()
        leaves_p = db.query(LeaveRecord).filter(LeaveRecord.personnel_id == fresh_personnel.id).count()
        assessments_p = db.query(SelfAssessment).filter(SelfAssessment.personnel_id == fresh_personnel.id).count()

        notifs_w = db.query(Notification).filter(Notification.user_id == user_welfare.id).count()
        notifs_c = db.query(Notification).filter(Notification.user_id == user_commander.id).count()

        print("\n" + "=" * 60)
        print("CLEAN SLATE VERIFICATION CHECK:")
        print(f"Personnel Requests: {requests_p} (expected 0)")
        print(f"Personnel Leaves: {leaves_p} (expected 0)")
        print(f"Personnel Assessments: {assessments_p} (expected 0)")
        print(f"Personnel Notifications: {notifs_p} (expected 0)")
        print(f"Welfare User Notifications: {notifs_w} (expected 0)")
        print(f"Commander User Notifications: {notifs_c} (expected 0)")
        print("=" * 60)

        assert requests_p == 0 and leaves_p == 0 and assessments_p == 0 and notifs_p == 0
        assert notifs_w == 0 and notifs_c == 0

        return {
            "personnel": {
                "username": "fresh_jawan",
                "service_number": service_num_to_clean,
                "password": PASSWORD_PLAIN,
                "role": "personnel",
                "name": "Amit Verma",
                "rank": "Constable",
                "unit": alpha_unit.name,
                "portal_url": "http://localhost:3000/portal"
            },
            "welfare": {
                "username": "fresh_welfare",
                "password": PASSWORD_PLAIN,
                "role": "welfare",
                "name": "Inspector Sunita Rao",
                "portal_url": "http://localhost:3000/welfare"
            },
            "commander": {
                "username": "fresh_commander",
                "password": PASSWORD_PLAIN,
                "role": "commander",
                "name": "Major Arjun Rathore",
                "unit": alpha_unit.name,
                "portal_url": "http://localhost:3000/commander"
            }
        }

    finally:
        db.close()
        auth_db.close()

if __name__ == "__main__":
    res = setup_fresh_accounts()
    print("\nSUCCESSFULLY CREATED ALL 3 FRESH ACCOUNTS!")
