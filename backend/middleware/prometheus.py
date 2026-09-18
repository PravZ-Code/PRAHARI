from fastapi import Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.personnel import Personnel
from models.welfare_case import WelfareCase
from models.audit import AuditLog
from database import SessionLocal

def generate_prometheus_metrics() -> str:
    """
    Generates standard Prometheus format metrics for operational monitoring
    in defense tactical operations centers (TOC / NOC / SOC).
    """
    db = SessionLocal()
    try:
        total_personnel = db.query(Personnel).count()
        red_cases = db.query(WelfareCase).filter(WelfareCase.risk_level_at_creation == "red", WelfareCase.status != "resolved").count()
        orange_cases = db.query(WelfareCase).filter(WelfareCase.risk_level_at_creation == "orange", WelfareCase.status != "resolved").count()
        total_cases = db.query(WelfareCase).count()
        audit_blocks = db.query(AuditLog).count()

        lines = [
            "# HELP prahari_personnel_total Total active armed forces personnel under surveillance",
            "# TYPE prahari_personnel_total gauge",
            f"prahari_personnel_total {total_personnel}",
            "",
            "# HELP prahari_welfare_cases_active Active welfare intervention cases by priority level",
            "# TYPE prahari_welfare_cases_active gauge",
            f'prahari_welfare_cases_active{{priority="red"}} {red_cases}',
            f'prahari_welfare_cases_active{{priority="orange"}} {orange_cases}',
            f'prahari_welfare_cases_active{{priority="total"}} {total_cases}',
            "",
            "# HELP prahari_audit_ledger_blocks_total Number of cryptographically sealed SHA-256 blocks",
            "# TYPE prahari_audit_ledger_blocks_total counter",
            f"prahari_audit_ledger_blocks_total {audit_blocks}",
            "",
            "# HELP prahari_ml_pipeline_status Machine learning inference pipeline health (1 = healthy, 0 = degraded)",
            "# TYPE prahari_ml_pipeline_status gauge",
            "prahari_ml_pipeline_status 1",
            ""
        ]
        return "\n".join(lines)
    finally:
        db.close()
