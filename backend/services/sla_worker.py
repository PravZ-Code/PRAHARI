import asyncio
from datetime import datetime, timezone
from database import SessionLocal
from models.welfare_case import WelfareCase, SLAEscalation

def to_naive(dt):
    if dt is None:
        return None
    return dt.replace(tzinfo=None) if hasattr(dt, "tzinfo") and dt.tzinfo is not None else dt

async def start_sla_worker():
    """
    Continuous background monitor checking SLA timers every 60 seconds.
    Escalates cases that breach acknowledgment (24h/4h) or action plan (72h/24h) limits.
    """
    print("[SLA] Welfare SLA Monitor Service initialized.")
    while True:
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc).replace(tzinfo=None)

            # 1. Check Acknowledgment SLA breaches
            pending_cases = db.query(WelfareCase).filter(
                WelfareCase.status == "pending",
                WelfareCase.sla_breached.is_(False)
            ).all()

            breached_ack = []
            for case in pending_cases:
                dl = to_naive(case.sla_acknowledge_deadline)
                if dl and dl < now:
                    case.sla_breached = True
                    case.status = "escalated"
                    case.escalation_level += 1
                    case.escalated_at = now

                    escalation = SLAEscalation(
                        case_id=case.id,
                        from_level=case.escalation_level - 1,
                        to_level=case.escalation_level,
                        reason="ack_timeout",
                        escalated_at=now
                    )
                    db.add(escalation)
                    breached_ack.append(case)

            # 2. Check Action Plan SLA breaches
            acked_cases = db.query(WelfareCase).filter(
                WelfareCase.status == "acknowledged",
                WelfareCase.sla_breached.is_(False)
            ).all()

            breached_plan = []
            for case in acked_cases:
                dl = to_naive(case.sla_plan_deadline)
                if dl and dl < now:
                    case.sla_breached = True
                    case.escalation_level += 1
                    case.escalated_at = now

                    escalation = SLAEscalation(
                        case_id=case.id,
                        from_level=case.escalation_level - 1,
                        to_level=case.escalation_level,
                        reason="plan_timeout",
                        escalated_at=now
                    )
                    db.add(escalation)
                    breached_plan.append(case)

            if breached_ack or breached_plan:
                db.commit()

            # 3. Check Grievance / Leave SLA breaches & auto-escalate
            try:
                from services.grievance_service import auto_scan_and_escalate
                auto_scan_and_escalate(db)
            except Exception as ge:
                print(f"[SLA Worker Error] Error scanning grievance SLAs: {ge}")


        except Exception as e:
            db.rollback()
            print(f"[SLA Worker Error] Error scanning welfare SLAs: {e}")
        finally:
            db.close()

        await asyncio.sleep(60)
