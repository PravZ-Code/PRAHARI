"""
Career-Data Firewall Middleware (SAARTHI & MHCA §21 Architecture)

Enforces strict statutory and architectural separation between confidential
personnel welfare intelligence and administrative career systems:
- Annual Confidential Reports (ACR / APAR)
- Departmental Promotion Committees (DPC)
- Cadre Postings & Transfer Boards
- Disciplinary Proceedings & Courts of Inquiry

Under Section 21 of the Mental Healthcare Act 2017 and CRPF Welfare Doctrine,
predictive operational strain scores and counseling records are legally protected
decision-support artifacts and CANNOT be weaponized into career-ranking or punitive inputs.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import logging

logger = logging.getLogger("prahari.career_firewall")

FORBIDDEN_CAREER_PURPOSES = {
    "appraisal",
    "acr",
    "apar",
    "promotion",
    "promotion_board",
    "dpc",
    "posting",
    "posting_board",
    "transfer_board",
    "disciplinary",
    "disciplinary_proceedings",
    "punishment",
    "court_martial",
    "court_of_inquiry"
}

PROTECTED_WELFARE_PREFIXES = (
    "/api/welfare",
    "/api/copilot",
    "/api/assessment",
    "/api/personnel/why-risk-changing",
    "/api/personnel/what-changed",
    "/api/resilience/recovery-tracking",
)

class CareerDataFirewallMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        req_path = request.url.path

        # Only inspect protected welfare endpoints
        if any(req_path.startswith(prefix) for prefix in PROTECTED_WELFARE_PREFIXES):
            # Inspect purpose headers and query parameters
            purpose_hdr = (request.headers.get("X-Request-Purpose") or "").lower().strip()
            system_origin = (request.headers.get("X-System-Origin") or "").lower().strip()
            context_param = (request.query_params.get("purpose") or "").lower().strip()

            detected_violations = []
            for p in FORBIDDEN_CAREER_PURPOSES:
                if p in purpose_hdr or p in system_origin or p in context_param:
                    detected_violations.append(p)

            if detected_violations:
                reason = ", ".join(detected_violations)
                logger.warning(
                    f"[CAREER FIREWALL VIOLATION] Blocked attempt to query welfare data for career purpose '{reason}' "
                    f"from client {request.client.host if request.client else 'unknown'} at path {req_path}"
                )
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": (
                            f"CAREER_FIREWALL_BLOCK: Under Section 21 of the Mental Healthcare Act 2017 and "
                            f"CRPF Welfare Governance Doctrine, individual predictive welfare scores, counseling notes, "
                            f"and self-assessments are strictly barred from career appraisals, promotion boards, "
                            f"cadre postings, and disciplinary actions (Detected purpose: {reason})."
                        ),
                        "firewall_rule": "MHCA-2017-SEC21-CAREER-ISOLATION",
                        "status": "FAIL_CLOSED_PROTECTED"
                    }
                )

        return await call_next(request)
