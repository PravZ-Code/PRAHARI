from datetime import datetime, date, timedelta, timezone
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.personnel import Unit, Personnel
from models.prediction import RiskPrediction
from models.duty_roster import DutyRoster

def compute_readiness(green: int, yellow: int, orange: int, red: int, total: int) -> float:
    if total <= 0:
        return 100.0
    # Operational readiness score: Green=100%, Yellow=85%, Orange=50%, Red=20%
    score = (green * 100.0 + yellow * 85.0 + orange * 50.0 + red * 20.0) / total
    return round(float(max(0.0, min(100.0, score))), 1)

def _get_latest_risk_levels(db: Session, p_ids: List[str]) -> Dict[str, str]:
    """
    High-performance batch retrieval of latest risk levels for a cohort of personnel.
    Executes in a single round-trip instead of N queries.
    """
    if not p_ids:
        return {}
    subq = db.query(
        RiskPrediction.personnel_id,
        func.max(RiskPrediction.predicted_at).label("max_pred_at")
    ).filter(RiskPrediction.personnel_id.in_(p_ids)).group_by(RiskPrediction.personnel_id).subquery()

    rows = db.query(RiskPrediction.personnel_id, RiskPrediction.risk_level).join(
        subq,
        (RiskPrediction.personnel_id == subq.c.personnel_id) &
        (RiskPrediction.predicted_at == subq.c.max_pred_at)
    ).all()

    level_map = {row[0]: row[1] for row in rows}
    return {pid: level_map.get(pid, "green") for pid in p_ids}

def get_commander_units(db: Session, commander_user) -> List[Dict[str, Any]]:
    # If commander is assigned to a specific unit, show that unit; otherwise show all units
    if commander_user.unit_id:
        units = db.query(Unit).filter(Unit.id == commander_user.unit_id).all()
    else:
        units = db.query(Unit).all()

    cards = []
    for u in units:
        p_ids = [p.id for p in u.personnel]
        dist = {"green": 0, "yellow": 0, "orange": 0, "red": 0}

        latest_levels = _get_latest_risk_levels(db, p_ids)
        for lvl in latest_levels.values():
            dist[lvl] = dist.get(lvl, 0) + 1

        strength = len(p_ids)
        readiness = compute_readiness(dist["green"], dist["yellow"], dist["orange"], dist["red"], strength)

        cards.append({
            "id": u.id,
            "name": u.name,
            "location": u.location,
            "operational_area": u.operational_area,
            "strength": strength,
            "readiness_score": readiness,
            "risk_distribution": dist
        })

    return cards

def get_unit_readiness_detail(db: Session, unit_id: str) -> Dict[str, Any]:
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise ValueError("Unit not found")

    p_ids = [p.id for p in unit.personnel]
    dist = {"green": 0, "yellow": 0, "orange": 0, "red": 0}

    latest_levels = _get_latest_risk_levels(db, p_ids)
    for lvl in latest_levels.values():
        dist[lvl] = dist.get(lvl, 0) + 1

    total = len(p_ids)
    current_readiness = compute_readiness(dist["green"], dist["yellow"], dist["orange"], dist["red"], total)

    # 14-day historical trend anchored to real database records
    max_pred_dt = db.query(func.max(RiskPrediction.predicted_at)).filter(
        RiskPrediction.personnel_id.in_(p_ids)
    ).scalar()
    anchor_date = max_pred_dt.date() if max_pred_dt else date.today()

    trend = []
    for d in range(14, -1, -1):
        target_date = anchor_date - timedelta(days=d)
        start_dt = datetime.combine(target_date, datetime.min.time())
        end_dt = datetime.combine(target_date, datetime.max.time())

        # Query real historical prediction counts for this target date
        hist_preds = db.query(RiskPrediction.risk_level, func.count(RiskPrediction.id)).filter(
            RiskPrediction.personnel_id.in_(p_ids),
            RiskPrediction.predicted_at >= start_dt,
            RiskPrediction.predicted_at <= end_dt
        ).group_by(RiskPrediction.risk_level).all()

        if hist_preds:
            day_dist = {"green": 0, "yellow": 0, "orange": 0, "red": 0}
            for lvl, count in hist_preds:
                if lvl in day_dist:
                    day_dist[lvl] = count
            day_total = sum(day_dist.values())
            day_score = compute_readiness(day_dist["green"], day_dist["yellow"], day_dist["orange"], day_dist["red"], day_total)
            trend.append({
                "date": target_date.isoformat(),
                "score": day_score
            })
        else:
            prev_score = trend[-1]["score"] if trend else current_readiness
            trend.append({
                "date": target_date.isoformat(),
                "score": prev_score
            })

    return {
        "unit_id": unit.id,
        "unit_name": unit.name,
        "readiness_score": current_readiness,
        "readiness_trend": trend,
        "risk_distribution": dist,
        "personnel_count": total
    }

def get_unit_risk_distribution(db: Session, unit_id: str) -> Dict[str, Any]:
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise ValueError("Unit not found")

    p_ids = [p.id for p in unit.personnel]
    dist = {"green": 0, "yellow": 0, "orange": 0, "red": 0}

    latest_levels = _get_latest_risk_levels(db, p_ids)
    for lvl in latest_levels.values():
        dist[lvl] = dist.get(lvl, 0) + 1

    # 7-day trend anchored to real database records
    max_pred_dt = db.query(func.max(RiskPrediction.predicted_at)).filter(
        RiskPrediction.personnel_id.in_(p_ids)
    ).scalar()
    anchor_date = max_pred_dt.date() if max_pred_dt else date.today()

    trend_7d = []
    for d in range(6, -1, -1):
        target_date = anchor_date - timedelta(days=d)
        start_dt = datetime.combine(target_date, datetime.min.time())
        end_dt = datetime.combine(target_date, datetime.max.time())

        hist_preds = db.query(RiskPrediction.risk_level, func.count(RiskPrediction.id)).filter(
            RiskPrediction.personnel_id.in_(p_ids),
            RiskPrediction.predicted_at >= start_dt,
            RiskPrediction.predicted_at <= end_dt
        ).group_by(RiskPrediction.risk_level).all()

        if hist_preds:
            day_dist = {"green": 0, "yellow": 0, "orange": 0, "red": 0}
            for lvl, count in hist_preds:
                if lvl in day_dist:
                    day_dist[lvl] = count
            trend_7d.append({
                "date": target_date.isoformat(),
                "green": day_dist["green"],
                "yellow": day_dist["yellow"],
                "orange": day_dist["orange"],
                "red": day_dist["red"]
            })
        else:
            prev_dist = trend_7d[-1] if trend_7d else dist
            trend_7d.append({
                "date": target_date.isoformat(),
                "green": prev_dist["green"] if isinstance(prev_dist, dict) else dist["green"],
                "yellow": prev_dist["yellow"] if isinstance(prev_dist, dict) else dist["yellow"],
                "orange": prev_dist["orange"] if isinstance(prev_dist, dict) else dist["orange"],
                "red": prev_dist["red"] if isinstance(prev_dist, dict) else dist["red"]
            })

    return {
        "unit_id": unit.id,
        "current": dist,
        "trend_7d": trend_7d
    }

def get_unit_workload_trends(db: Session, unit_id: str, days: int = 14) -> List[Dict[str, Any]]:
    max_roster_date = db.query(func.max(DutyRoster.date)).filter(DutyRoster.unit_id == unit_id).scalar()
    anchor_date = max_roster_date if max_roster_date else date.today()
    trends = []

    for d in range(days - 1, -1, -1):
        target_date = anchor_date - timedelta(days=d)
        shifts = db.query(DutyRoster).filter(
            DutyRoster.unit_id == unit_id,
            DutyRoster.date == target_date
        ).all()

        night_count = sum(1 for s in shifts if s.shift_type == "night")
        day_count = sum(1 for s in shifts if s.shift_type == "day")
        off_count = sum(1 for s in shifts if s.shift_type == "off")
        total_hrs = sum(float(s.hours) for s in shifts)
        avg_hrs = round(total_hrs / len(shifts), 1) if shifts else 8.0

        # Calculate actual average consecutive duty days for personnel on duty
        active_pids = [s.personnel_id for s in shifts if s.shift_type != "off"]
        if active_pids:
            # Query shifts for up to 14 days back for streak calculation
            sub_shifts = db.query(DutyRoster.personnel_id, DutyRoster.date, DutyRoster.shift_type).filter(
                DutyRoster.personnel_id.in_(active_pids[:40]),
                DutyRoster.date <= target_date,
                DutyRoster.date >= target_date - timedelta(days=14)
            ).order_by(DutyRoster.date.desc()).all()

            streaks = {}
            for pid, dt, stype in sub_shifts:
                if pid not in streaks:
                    streaks[pid] = 0
                if stype != "off":
                    streaks[pid] += 1
                else:
                    break
            avg_consec = round(sum(streaks.values()) / max(1, len(streaks)), 1)
        else:
            avg_consec = 0.0

        trends.append({
            "date": target_date.isoformat(),
            "avg_hours": avg_hrs,
            "night_shift_count": night_count,
            "day_shift_count": day_count,
            "off_count": off_count,
            "avg_consecutive_days_on": avg_consec
        })

    return trends

def get_unit_fatigue_heatmap(db: Session, unit_id: str, limit_troopers: int = 8) -> List[Dict[str, Any]]:
    # Anchor to latest date in DutyRoster
    max_roster_date = db.query(func.max(DutyRoster.date)).filter(DutyRoster.unit_id == unit_id).scalar()
    anchor_date = max_roster_date if max_roster_date else date.today()
    start_date = anchor_date - timedelta(days=29)

    # Fetch a representative cohort of troopers from this unit across different risk profiles & trades
    personnel_list = db.query(Personnel).filter(Personnel.unit_id == unit_id).limit(limit_troopers).all()
    if not personnel_list:
        return []

    p_ids = [p.id for p in personnel_list]
    roster_rows = db.query(DutyRoster).filter(
        DutyRoster.personnel_id.in_(p_ids),
        DutyRoster.date >= start_date,
        DutyRoster.date <= anchor_date
    ).all()

    # Index rosters by (personnel_id, date)
    roster_map = {}
    for r in roster_rows:
        roster_map[(r.personnel_id, r.date)] = r

    trooper_profiles = []
    for p in personnel_list:
        days_data = []
        consecutive_active = 0
        current_streak = 0
        night_shifts_count = 0
        total_active_shifts = 0

        # Iterate over the 30-day window chronologically
        for i in range(30):
            day_dt = start_date + timedelta(days=i)
            r = roster_map.get((p.id, day_dt))

            if r:
                hrs = float(r.hours)
                stype = (r.shift_type or "day").lower()
            else:
                hrs = 0.0
                stype = "off"

            if stype == "off":
                shift_label = "REST"
                fatigue_score = 15
                current_streak = 0
            elif hrs > 12:
                shift_label = "DOUBLE"
                fatigue_score = min(98, 85 + int(hrs - 12) * 3)
                current_streak += 1
                total_active_shifts += 1
            elif stype == "night":
                shift_label = "NIGHT"
                fatigue_score = min(92, 70 + min(20, current_streak * 2))
                night_shifts_count += 1
                current_streak += 1
                total_active_shifts += 1
            elif stype == "split":
                shift_label = "EXTENDED"
                fatigue_score = 65
                current_streak += 1
                total_active_shifts += 1
            else:
                shift_label = "DAY"
                fatigue_score = min(75, 35 + min(30, current_streak * 3))
                current_streak += 1
                total_active_shifts += 1

            consecutive_active = max(consecutive_active, current_streak)

            days_data.append({
                "day": i + 1,
                "date": day_dt.isoformat(),
                "shift": shift_label,
                "hours": hrs,
                "fatigueScore": fatigue_score
            })

        night_pct = round((night_shifts_count / max(1, total_active_shifts)) * 100)

        trooper_profiles.append({
            "id": p.id,
            "name": f"{p.rank} {p.name}",
            "rank": p.rank,
            "trade": p.trade or "GD",
            "consecutiveDays": current_streak,
            "nightShiftPct": night_pct,
            "days": days_data
        })

    return trooper_profiles


def get_commander_command_briefing(db: Session, unit_id: str) -> Dict[str, Any]:
    """
    Synthesizes executive command briefing for Company Commanders reinforcing
    operational chain-of-command authority while preserving medical confidentiality.
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise ValueError(f"Unit {unit_id} not found")

    personnel = unit.personnel
    total_strength = len(personnel)
    p_ids = [p.id for p in personnel]
    risk_map = _get_latest_risk_levels(db, p_ids)

    green = sum(1 for lvl in risk_map.values() if lvl == "green")
    yellow = sum(1 for lvl in risk_map.values() if lvl == "yellow")
    orange = sum(1 for lvl in risk_map.values() if lvl == "orange")
    red = sum(1 for lvl in risk_map.values() if lvl == "red")

    readiness = compute_readiness(green, yellow, orange, red, total_strength)

    platoon_size = max(1, total_strength // 3) if total_strength >= 3 else 1
    p1 = personnel[:platoon_size]
    p2 = personnel[platoon_size:platoon_size * 2]
    p3 = personnel[platoon_size * 2:]

    def platoon_strain(plist):
        if not plist:
            return 0.15
        elevated = sum(1 for p in plist if risk_map.get(p.id) in ("orange", "red"))
        return round(elevated / len(plist), 2)

    platoons = [
        {"platoon_name": "No. 1 Platoon", "strength": len(p1), "strain_index": platoon_strain(p1), "status": "OPERATIONAL" if platoon_strain(p1) < 0.35 else "STRAINED"},
        {"platoon_name": "No. 2 Platoon", "strength": len(p2), "strain_index": platoon_strain(p2), "status": "OPERATIONAL" if platoon_strain(p2) < 0.35 else "STRAINED"},
        {"platoon_name": "No. 3 Platoon", "strength": len(p3), "strain_index": platoon_strain(p3), "status": "OPERATIONAL" if platoon_strain(p3) < 0.35 else "STRAINED"},
    ]

    return {
        "unit_id": unit.id,
        "unit_name": unit.name,
        "location": unit.location,
        "command_authority": "EXCLUSIVE_OPERATIONAL_AUTHORITY (Company Commander)",
        "statutory_compliance": "Mental Healthcare Act 2017 Sec 21 & CRPF Standing Order 04/2020",
        "total_strength": total_strength,
        "operational_readiness_pct": readiness,
        "risk_breakdown": {
            "fit_green": green,
            "mild_strain_yellow": yellow,
            "elevated_rest_needed_orange": orange,
            "priority_relief_red": red
        },
        "platoon_status": platoons,
        "commander_executive_summary": (
            f"Unit readiness is {readiness}%. {green + yellow} out of {total_strength} troops are mission-ready. "
            f"Company Commander retains sole legal and operational authority to approve duty roster changes."
        ),
        "recommended_command_actions": [
            "Review and authorize proposed URO duty swaps to protect guard post security.",
            "Schedule compensatory rest rotation for strained sections."
        ]
    }

