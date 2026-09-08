from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.buddy_signal import BuddySignal
from models.welfare_case import WelfareCase
from models.personnel import Unit

def record_buddy_signal(db: Session, unit_id: str, concern_level: int, concern_category: str) -> BuddySignal:
    now = datetime.now(timezone.utc)
    week_num = now.isocalendar()[1]
    year = now.year

    signal = BuddySignal(
        unit_id=unit_id,
        concern_level=concern_level,
        concern_category=concern_category,
        week_number=week_num,
        year=year
    )
    db.add(signal)
    db.commit()
    db.refresh(signal)

    # Check threshold: if > 5 signals this week with avg >= 2.0, flag unit welfare case
    week_signals = db.query(BuddySignal).filter(
        BuddySignal.unit_id == unit_id,
        BuddySignal.week_number == week_num,
        BuddySignal.year == year
    ).all()

    if len(week_signals) >= 5:
        avg_concern = sum(s.concern_level for s in week_signals) / len(week_signals)
        if avg_concern >= 2.0:
            # Check if active buddy case already exists for unit
            unit = db.query(Unit).filter(Unit.id == unit_id).first()
            if unit and unit.personnel:
                # Target first available personnel or commanding constable for welfare check
                representative_p = unit.personnel[0]
                existing_case = db.query(WelfareCase).filter(
                    WelfareCase.personnel_id == representative_p.id,
                    WelfareCase.triggered_by == "buddy_signal",
                    WelfareCase.status.in_(["pending", "acknowledged", "plan_created"])
                ).first()

                if not existing_case:
                    case = WelfareCase(
                        personnel_id=representative_p.id,
                        triggered_by="buddy_signal",
                        risk_level_at_creation="orange",
                        status="pending",
                        sla_acknowledge_deadline=now + timedelta(hours=24),
                        sla_plan_deadline=now + timedelta(hours=72),
                        intervention_notes=f"Auto-triggered: Unit {unit.name} received {len(week_signals)} anonymous buddy signals this week (Avg severity {avg_concern:.1f}/3)."
                    )
                    db.add(case)
                    db.commit()

    return signal

def get_unit_buddy_summary(db: Session, unit_id: str, num_weeks: int = 4) -> dict:
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    unit_name = unit.name if unit else "Unit"

    now = datetime.now(timezone.utc)
    current_week = now.isocalendar()[1]
    current_year = now.year

    weeks_data = []
    for offset in range(num_weeks):
        target_week = current_week - offset
        target_year = current_year
        if target_week <= 0:
            target_week += 52
            target_year -= 1

        signals = db.query(BuddySignal).filter(
            BuddySignal.unit_id == unit_id,
            BuddySignal.week_number == target_week,
            BuddySignal.year == target_year
        ).all()

        by_cat = {"withdrawal": 0, "mood_change": 0, "sleep": 0, "aggression": 0, "general": 0}
        total = len(signals)
        avg_concern = 0.0

        if total > 0:
            for s in signals:
                by_cat[s.concern_category] = by_cat.get(s.concern_category, 0) + 1
            avg_concern = round(sum(s.concern_level for s in signals) / total, 2)

        weeks_data.append({
            "week_number": target_week,
            "year": target_year,
            "total_signals": total,
            "by_category": by_cat,
            "avg_concern_level": avg_concern
        })

    return {
        "unit_id": unit_id,
        "unit_name": unit_name,
        "weeks": weeks_data
    }
