import os
import sys
import uuid
import random

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session
from models.personnel import Unit, Personnel
from models.user import User
from models.deployment import DeploymentHistory
from models.leave import LeaveRecord
from models.duty_roster import DutyRoster
from models.assessment import SelfAssessment
from models.buddy_signal import BuddySignal
from middleware.rbac import get_password_hash

UNITS_CONFIG = [
    {"name": "4th Bn, Alpha Company", "location": "Srinagar, J&K", "area": "hard", "strength": 50},
    {"name": "12th Bn, Bravo Company", "location": "Sukma, Chhattisgarh", "area": "hard", "strength": 50},
    {"name": "7th Bn, Charlie Company", "location": "Hyderabad, Telangana", "area": "peace", "strength": 50},
    {"name": "21st Bn, Delta Company", "location": "Leh, Ladakh", "area": "hard", "strength": 50},
]

RANKS_DISTRIBUTION = [
    ("Constable", 0.50),
    ("Head Constable", 0.25),
    ("ASI", 0.10),
    ("SI", 0.08),
    ("Inspector", 0.05),
    ("DySP", 0.02)
]

FIRST_NAMES = [
    "Rajesh", "Vikram", "Ankit", "Suresh", "Ramesh", "Deepak", "Manoj", "Amit", "Pooja", "Sunil",
    "Ajay", "Vijay", "Dharmendra", "Sanjay", "Mahesh", "Mukesh", "Ravi", "Ashok", "Kishore", "Gopal",
    "Mohan", "Praveen", "Sachin", "Kuldeep", "Harpreet", "Manpreet", "Gurinder", "Jagdish", "Suraj", "Balwan"
]

LAST_NAMES = [
    "Kumar", "Singh", "Sharma", "Verma", "Patel", "Yadav", "Meena", "Rathore", "Chauhan", "Thakur",
    "Pandey", "Mishra", "Gupta", "Joshi", "Shukla", "Tiwari", "Rawat", "Bisht", "Negi", "Choudhary"
]

def pick_rank():
    r = random.random()
    cumulative = 0.0
    for rank, p in RANKS_DISTRIBUTION:
        cumulative += p
        if r <= cumulative:
            return rank
    return "Constable"

def generate_all_data(db: Session):
    print("[DATA] Commencing Synthetic Data Generation for SIH26186...")

    today = date(2026, 9, 1)
    start_date = today - timedelta(days=180)  # 6 months of data

    # 1. Seed Units
    created_units = []
    for u_conf in UNITS_CONFIG:
        unit = db.query(Unit).filter(Unit.name == u_conf["name"]).first()
        if not unit:
            unit = Unit(
                id=str(uuid.uuid4()),
                name=u_conf["name"],
                formation="Central Reserve Police Force",
                location=u_conf["location"],
                operational_area=u_conf["area"],
                authorized_strength=u_conf["strength"],
                current_strength=u_conf["strength"]
            )
            db.add(unit)
            db.flush()
        created_units.append(unit)

    alpha_unit = created_units[0]
    bravo_unit = created_units[1]

    # 2. Seed Personnel
    personnel_records = []
    total_created = 0

    # Ensure demo specific character: Rajesh Kumar (Constable, Unit 1)
    demo_rajesh = db.query(Personnel).filter(Personnel.service_number == "CRP-2019-45821").first()
    if not demo_rajesh:
        demo_rajesh = Personnel(
            id=str(uuid.uuid4()),
            service_number="CRP-2019-45821",
            name="Constable Rajesh Kumar",
            rank="Constable",
            unit_id=alpha_unit.id,
            date_of_joining=date(2019, 4, 15),
            current_posting_date=date(2024, 7, 1),
            hard_area_months=26,
            total_transfers=3
        )
        db.add(demo_rajesh)
        personnel_records.append((demo_rajesh, "high_risk"))
        total_created += 1

    # Ensure demo resilient character: Ankit Sharma (Constable, Unit 1)
    demo_ankit = db.query(Personnel).filter(Personnel.service_number == "CRP-2021-88412").first()
    if not demo_ankit:
        demo_ankit = Personnel(
            id=str(uuid.uuid4()),
            service_number="CRP-2021-88412",
            name="Constable Ankit Sharma",
            rank="Constable",
            unit_id=alpha_unit.id,
            date_of_joining=date(2021, 8, 10),
            current_posting_date=date(2025, 2, 1),
            hard_area_months=6,
            total_transfers=1
        )
        db.add(demo_ankit)
        personnel_records.append((demo_ankit, "resilient"))
        total_created += 1

    # Generate remaining personnel across units
    for unit in created_units:
        existing_count = db.query(Personnel).filter(Personnel.unit_id == unit.id).count()
        needed = 50 - existing_count
        for i in range(needed):
            # Profile assignment: 8% high_risk, 16% elevated, 54% normal, 22% resilient
            prof_roll = random.random()
            if prof_roll < 0.08:
                profile = "high_risk"
                hard_m = random.randint(18, 36)
                trans = random.randint(3, 6)
            elif prof_roll < 0.24:
                profile = "elevated"
                hard_m = random.randint(12, 24)
                trans = random.randint(2, 4)
            elif prof_roll < 0.78:
                profile = "normal"
                hard_m = random.randint(4, 16)
                trans = random.randint(1, 3)
            else:
                profile = "resilient"
                hard_m = random.randint(0, 10)
                trans = random.randint(0, 2)

            join_year = random.randint(2012, 2023)
            p = Personnel(
                id=str(uuid.uuid4()),
                service_number=f"CRP-{join_year}-{random.randint(10000, 99999)}",
                name=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                rank=pick_rank(),
                unit_id=unit.id,
                date_of_joining=date(join_year, random.randint(1, 12), random.randint(1, 28)),
                current_posting_date=today - timedelta(days=random.randint(60, 720)),
                hard_area_months=hard_m,
                total_transfers=trans
            )
            db.add(p)
            personnel_records.append((p, profile))
            total_created += 1

    db.commit()
    print(f"[OK] Seeded {len(personnel_records)} Personnel across 4 tactical formations.")

    # 3. Seed Deployments, Leaves, Rosters, Assessments
    for p, profile in personnel_records:
        # Deployments
        dep = DeploymentHistory(
            personnel_id=p.id,
            unit_id=p.unit_id,
            area_type=p.unit.operational_area,
            start_date=p.current_posting_date,
            end_date=None,
            duty_type="operational"
        )
        db.add(dep)

        # Leaves (over 6 months)
        num_leaves = random.randint(1, 4)
        for _ in range(num_leaves):
            l_type = random.choice(["annual", "casual", "medical", "emergency"])
            app_d = start_date + timedelta(days=random.randint(10, 170))

            # Leave denial probability based on profile
            if profile == "high_risk" or p.service_number == "CRP-2019-45821":
                denial_chance = 0.52
            elif profile == "elevated":
                denial_chance = 0.35
            elif profile == "normal":
                denial_chance = 0.15
            else:
                denial_chance = 0.08

            is_denied = random.random() < denial_chance
            status = "denied" if is_denied else "approved"
            reason = "Operational emergency manning shortage" if is_denied else None

            lr = LeaveRecord(
                personnel_id=p.id,
                leave_type=l_type,
                applied_date=app_d,
                start_date=app_d + timedelta(days=7) if not is_denied else None,
                end_date=app_d + timedelta(days=21) if not is_denied else None,
                status=status,
                denial_reason=reason
            )
            db.add(lr)

        # Duty Roster (last 30 days daily shifts)
        for day_offset in range(30, -1, -1):
            r_date = today - timedelta(days=day_offset)

            if profile == "high_risk":
                s_type = random.choices(["night", "split", "day", "off"], weights=[0.50, 0.20, 0.20, 0.10])[0]
            elif profile == "elevated":
                s_type = random.choices(["night", "split", "day", "off"], weights=[0.35, 0.20, 0.30, 0.15])[0]
            elif profile == "normal":
                s_type = random.choices(["night", "day", "off"], weights=[0.20, 0.55, 0.25])[0]
            else:
                s_type = random.choices(["night", "day", "off"], weights=[0.10, 0.60, 0.30])[0]

            d_type = "patrol" if s_type == "night" else ("guard" if s_type == "split" else ("standby" if s_type == "day" else "rest"))
            hrs = 10.0 if s_type == "night" else (12.0 if s_type == "split" else (8.0 if s_type == "day" else 0.0))

            roster = DutyRoster(
                personnel_id=p.id,
                unit_id=p.unit_id,
                date=r_date,
                shift_type=s_type,
                duty_type=d_type,
                hours=hrs
            )
            db.add(roster)

        # Self-Assessments (90 days history)
        compliance = 0.30 if profile == "high_risk" else (0.50 if profile == "elevated" else (0.75 if profile == "normal" else 0.90))
        for day_offset in range(90, -1, -1):
            if random.random() > compliance:
                continue

            a_date = today - timedelta(days=day_offset)
            assessed_dt = datetime.combine(a_date, datetime.min.time()).replace(tzinfo=timezone.utc) + timedelta(hours=7)

            # Temporal degradation simulation for high_risk and Rajesh
            degradation_factor = (90 - day_offset) / 90.0 if profile in ("high_risk", "elevated") else 0.0

            if profile == "high_risk":
                sq = int(np.clip(np.random.normal(2.5 - degradation_factor * 1.2, 0.5), 1, 5))
                sh = float(np.clip(np.random.normal(5.5 - degradation_factor * 1.5, 0.8), 3.0, 9.0))
                mood = int(np.clip(np.random.normal(2.6 - degradation_factor * 1.3, 0.5), 1, 5))
                energy = int(np.clip(np.random.normal(2.5 - degradation_factor * 1.2, 0.5), 1, 5))
                stress = int(np.clip(np.random.normal(3.2 + degradation_factor * 1.4, 0.5), 1, 5))
                app = int(np.clip(np.random.normal(2.8 - degradation_factor * 1.0, 0.5), 1, 5))
                soc = int(np.clip(np.random.normal(2.4 - degradation_factor * 1.2, 0.5), 1, 5))
            elif profile == "elevated":
                sq = int(np.clip(np.random.normal(2.8, 0.6), 1, 5))
                sh = float(np.clip(np.random.normal(6.0, 0.8), 3.5, 9.0))
                mood = int(np.clip(np.random.normal(2.8, 0.6), 1, 5))
                energy = int(np.clip(np.random.normal(2.8, 0.6), 1, 5))
                stress = int(np.clip(np.random.normal(3.5, 0.6), 1, 5))
                app = int(np.clip(np.random.normal(3.0, 0.6), 1, 5))
                soc = int(np.clip(np.random.normal(2.8, 0.6), 1, 5))
            elif profile == "normal":
                sq = int(np.clip(np.random.normal(3.4, 0.5), 1, 5))
                sh = float(np.clip(np.random.normal(6.8, 0.6), 4.5, 9.5))
                mood = int(np.clip(np.random.normal(3.5, 0.5), 1, 5))
                energy = int(np.clip(np.random.normal(3.4, 0.5), 1, 5))
                stress = int(np.clip(np.random.normal(2.4, 0.6), 1, 5))
                app = int(np.clip(np.random.normal(3.5, 0.5), 1, 5))
                soc = int(np.clip(np.random.normal(3.4, 0.5), 1, 5))
            else: # resilient
                sq = int(np.clip(np.random.normal(4.2, 0.4), 1, 5))
                sh = float(np.clip(np.random.normal(7.5, 0.5), 5.5, 10.0))
                mood = int(np.clip(np.random.normal(4.2, 0.4), 1, 5))
                energy = int(np.clip(np.random.normal(4.1, 0.4), 1, 5))
                stress = int(np.clip(np.random.normal(1.6, 0.4), 1, 5))
                app = int(np.clip(np.random.normal(4.1, 0.4), 1, 5))
                soc = int(np.clip(np.random.normal(4.2, 0.4), 1, 5))

            assessment = SelfAssessment(
                personnel_id=p.id,
                assessed_at=assessed_dt,
                sleep_quality=sq,
                sleep_hours=round(sh, 1),
                mood_score=mood,
                energy_level=energy,
                stress_level=stress,
                appetite_score=app,
                social_connection=soc,
                is_offline_entry=False,
                synced_at=assessed_dt
            )
            db.add(assessment)

    # 4. Seed Anonymous Buddy Signals (Over last 6 weeks)
    now_dt = datetime.now(timezone.utc)
    for w in range(6):
        w_time = now_dt - timedelta(weeks=w)
        wn = w_time.isocalendar()[1]
        yr = w_time.year

        # Alpha Unit (higher operational stress) gets 3-6 signals/week
        for _ in range(random.randint(3, 6)):
            sig = BuddySignal(
                unit_id=alpha_unit.id,
                submitted_at=w_time - timedelta(days=random.randint(0, 5)),
                concern_level=random.choices([1, 2, 3], weights=[0.2, 0.5, 0.3])[0],
                concern_category=random.choice(["withdrawal", "mood_change", "sleep", "aggression", "general"]),
                week_number=wn,
                year=yr
            )
            db.add(sig)

        # Charlie Unit (peace station) gets 0-1 signals/week
        for _ in range(random.randint(0, 1)):
            sig = BuddySignal(
                unit_id=created_units[2].id,
                submitted_at=w_time - timedelta(days=random.randint(0, 5)),
                concern_level=1,
                concern_category="sleep",
                week_number=wn,
                year=yr
            )
            db.add(sig)

    # 5. Seed Core Demo Users
    users_to_create = [
        ("cmd_vikram", "demo123", "commander", None, alpha_unit.id),
        ("cmd_sukma", "demo123", "commander", None, created_units[1].id),
        ("wo_meera", "demo123", "welfare", None, None),
        ("rajesh_kumar", "demo123", "personnel", demo_rajesh.id, alpha_unit.id),
        ("ankit_sharma", "demo123", "personnel", demo_ankit.id, alpha_unit.id),
        ("admin_sys", "demo123", "admin", None, None),
    ]

    for uname, pwd, role, pid, uid in users_to_create:
        u = db.query(User).filter(User.username == uname).first()
        if not u:
            u = User(
                username=uname,
                password_hash=get_password_hash(pwd),
                role=role,
                personnel_id=pid,
                unit_id=uid,
                is_active=True
            )
            db.add(u)

    db.commit()
    print("[OK] Completed Full Synthetic Dataset and Authentication Seeding.")

if __name__ == "__main__":
    from database import SessionLocal
    db = SessionLocal()
    try:
        generate_all_data(db)
    finally:
        db.close()
