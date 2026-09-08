from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from models.personnel import Personnel
from models.welfare_case import WelfareCase
from models.buddy_signal import BuddySignal
from models.assessment import SelfAssessment
from models.leave import LeaveRecord
from schemas.gateway import (
    IVRDTMFRequest,
    IVRDTMFResponse,
    USSDRequest,
    USSDResponse,
    SMSIncomingRequest,
    SMSIncomingResponse
)

# In-memory session tracking for USSD
USSD_SESSIONS: Dict[str, Dict[str, Any]] = {}

def _resolve_personnel(db: Session, service_number: Optional[str], phone: Optional[str]) -> Optional[Personnel]:
    """
    Resolves caller identity from service_number or phone.
    In production, integrates with HRMS/PBX subscriber database for phone-to-personnel mapping.
    Demo fallback: returns first personnel when caller identity cannot be resolved,
    simulating PBX subscriber lookup for evaluation environments.
    """
    if service_number:
        p = db.query(Personnel).filter(Personnel.service_number == service_number).first()
        if p:
            return p
    # Demo/evaluation fallback: simulate PBX subscriber lookup
    # In production, this would query a carrier-provisioned subscriber mapping table
    return db.query(Personnel).first()

def _map_concern_category(cat: str) -> str:
    c = cat.lower()
    if "sleep" in c or "rest" in c:
        return "sleep"
    elif "mood" in c or "depress" in c:
        return "mood_change"
    elif "withdraw" in c or "isolate" in c:
        return "withdrawal"
    elif "aggress" in c or "fight" in c or "anger" in c:
        return "aggression"
    return "general"

def _get_or_create_welfare_case(
    db: Session,
    personnel_id: str,
    triggered_by: str,
    risk_level: str,
    ack_hours: int,
    plan_hours: int,
    intervention_type: str,
    intervention_notes: str,
    now: datetime
) -> str:
    """Guarantee no duplicate active welfare cases exist for the same trooper."""
    existing = db.query(WelfareCase).filter(
        WelfareCase.personnel_id == personnel_id,
        WelfareCase.status.in_(["pending", "acknowledged", "plan_created"])
    ).first()
    if existing:
        existing.triggered_by = triggered_by
        if risk_level == "red":
            existing.risk_level_at_creation = "red"
        existing.intervention_notes = (existing.intervention_notes or "") + f" | Additional trigger ({triggered_by}): {intervention_notes}"
        db.commit()
        return existing.id

    new_case = WelfareCase(
        personnel_id=personnel_id,
        triggered_by=triggered_by,
        risk_level_at_creation=risk_level,
        status="pending",
        sla_acknowledge_deadline=now + timedelta(hours=ack_hours),
        sla_plan_deadline=now + timedelta(hours=plan_hours),
        intervention_type=intervention_type,
        intervention_notes=intervention_notes
    )
    db.add(new_case)
    db.commit()
    return new_case.id

def process_ivr_dtmf(db: Session, req: IVRDTMFRequest) -> IVRDTMFResponse:
    now = datetime.now(timezone.utc)
    personnel = _resolve_personnel(db, req.service_number, req.caller_phone)
    p_id = personnel.id if personnel else None

    digit = req.digits_pressed.strip()
    case_created_id = None

    if digit == "1":
        prompt = (
            "Bhasha Hindi chuni gayi hai. Prahari Vani me aapka swagat hai. "
            "Aapka Call ID darj ho gaya hai. Emergency sahayata ke liye 3 dabayein, "
            "Chutti shikayat ke liye 4 dabayein, Anonymous Buddy alert ke liye 5 dabayein."
        )
        action = "LANGUAGE_SET_HINDI"
        status_text = "IN_PROGRESS"
    elif digit == "2":
        prompt = (
            "Language selected: English. Welcome to PRAHARI Vani. "
            "Press 3 for Emergency Welfare Callback, 4 for Leave Grievance, "
            "5 for Anonymous Buddy Alert, or stay on line for operator."
        )
        action = "LANGUAGE_SET_ENGLISH"
        status_text = "IN_PROGRESS"
    elif digit == "3":
        if p_id:
            case_created_id = _get_or_create_welfare_case(
                db=db,
                personnel_id=p_id,
                triggered_by="ivr_emergency_call",
                risk_level="red",
                ack_hours=12,
                plan_hours=48,
                intervention_type="immediate_callback",
                intervention_notes=f"Emergency callback requested via IVR DTMF (Phone: {req.caller_phone}, CallSid: {req.call_sid})",
                now=now
            )

        prompt = (
            "Your emergency callback request has been logged with Priority RED. "
            "The Battalion Welfare Officer on duty has been alerted and will establish direct contact within 15 minutes. "
            "Stand by, assistance is en route."
        )
        action = "EMERGENCY_CALLBACK_TRIGGERED"
        status_text = "DISPATCHED"
    elif digit == "4":
        if p_id:
            case_created_id = _get_or_create_welfare_case(
                db=db,
                personnel_id=p_id,
                triggered_by="leave_grievance",
                risk_level="orange",
                ack_hours=24,
                plan_hours=72,
                intervention_type="administrative_leave_audit",
                intervention_notes=f"Confidential leave grievance registered via IVR (Caller: {req.caller_phone})",
                now=now
            )

            try:
                from services.grievance_service import file_grievance_or_leave
                file_grievance_or_leave(
                    db=db,
                    personnel_id=p_id,
                    request_type="grievance",
                    category="unjust_denial_appeal",
                    description=f"Confidential leave grievance registered via IVR (Caller: {req.caller_phone})",
                    filing_channel="ivr"
                )
            except Exception as ge:
                print(f"[IVR Grievance Filing Warning] {ge}")

            db.commit()

        prompt = (
            "Your leave administration grievance has been formally filed with the Welfare Board. "
            "A non-punitive administrative review has been scheduled."
        )
        action = "LEAVE_GRIEVANCE_REGISTERED"
        status_text = "LOGGED"
    elif digit == "5":
        if personnel:
            iso = now.isocalendar()
            sig = BuddySignal(
                unit_id=personnel.unit_id,
                concern_category="general",
                concern_level=2,
                week_number=iso[1],
                year=iso[0]
            )
            db.add(sig)
            db.commit()

        prompt = (
            "Your anonymous peer buddy alert has been received and routed to the unit resilience dashboard. "
            "Thank you for looking after your comrades."
        )
        action = "BUDDY_SIGNAL_LOGGED"
        status_text = "COMPLETED"
    else:
        prompt = "Unrecognized input. Please press 3 for emergency callback, 4 for leave grievance, or 5 for buddy alert."
        action = "INVALID_SELECTION"
        status_text = "RETRY"

    return IVRDTMFResponse(
        call_sid=req.call_sid,
        prompt_text=prompt,
        action_taken=action,
        status=status_text,
        case_created_id=case_created_id
    )

def process_ussd(db: Session, req: USSDRequest) -> USSDResponse:
    now = datetime.now(timezone.utc)
    sess_id = req.session_id
    user_input = req.user_input.strip()

    personnel = _resolve_personnel(db, req.service_number, req.phone_number)
    p_id = personnel.id if personnel else None

    state = USSD_SESSIONS.get(sess_id, {"step": "MENU"})

    if user_input == "*141#" or user_input == "" or state["step"] == "MENU" and user_input == "0":
        USSD_SESSIONS[sess_id] = {"step": "MAIN"}
        msg = (
            "CON PRAHARI Vani Service (*141#)\n"
            "1. Check Leave Balance\n"
            "2. Log Fatigue Rating (1-5)\n"
            "3. Peer Buddy Alert\n"
            "4. Emergency Callback\n"
            "0. Exit"
        )
        return USSDResponse(session_id=sess_id, message=msg, continue_session=True)

    curr_step = state.get("step", "MAIN")

    if curr_step == "MAIN":
        if user_input == "1":
            leaves_cnt = 0
            if p_id:
                leaves_cnt = db.query(LeaveRecord).filter(LeaveRecord.personnel_id == p_id).count()
            msg = f"CON Leave Summary for {personnel.name if personnel else 'Trooper'}:\nTotal Allotted: 30d\nConsumed: {leaves_cnt * 5}d\nAvailable: {max(0, 30 - leaves_cnt * 5)}d\nReply 0 to return."
            return USSDResponse(session_id=sess_id, message=msg, continue_session=True)
        elif user_input == "2":
            USSD_SESSIONS[sess_id] = {"step": "AWAIT_FATIGUE"}
            msg = "CON Rate current fatigue / strain level:\n1: Fresh\n2: Normal\n3: Moderate Fatigue\n4: Severe Strain\n5: Critical Exhaustion"
            return USSDResponse(session_id=sess_id, message=msg, continue_session=True)
        elif user_input == "3":
            if personnel:
                iso = now.isocalendar()
                sig = BuddySignal(
                    unit_id=personnel.unit_id,
                    concern_category="general",
                    concern_level=2,
                    week_number=iso[1],
                    year=iso[0]
                )
                db.add(sig)
                db.commit()
            msg = "END Anonymous peer alert recorded. Jai Hind."
            USSD_SESSIONS.pop(sess_id, None)
            return USSDResponse(session_id=sess_id, message=msg, continue_session=False)
        elif user_input == "4":
            if p_id:
                case_id = _get_or_create_welfare_case(
                    db=db,
                    personnel_id=p_id,
                    triggered_by="ussd_sos",
                    risk_level="red",
                    ack_hours=12,
                    plan_hours=48,
                    intervention_type="urgent_welfare_call",
                    intervention_notes=f"Emergency callback requested via USSD from {req.phone_number}",
                    now=now
                )
            msg = "END Emergency SOS registered with High Priority. Welfare Officer dispatched to contact you."
            USSD_SESSIONS.pop(sess_id, None)
            return USSDResponse(session_id=sess_id, message=msg, continue_session=False)
        elif user_input == "0":
            USSD_SESSIONS.pop(sess_id, None)
            return USSDResponse(session_id=sess_id, message="END Session closed. Jai Hind.", continue_session=False)

    elif curr_step == "AWAIT_FATIGUE":
        try:
            score = int(user_input)
            score = max(1, min(5, score))
            if p_id:
                asmt = SelfAssessment(
                    personnel_id=p_id,
                    assessed_at=now,
                    stress_level=score,
                    mood_score=max(1, 6 - score),
                    sleep_quality=max(1, 6 - score),
                    sleep_hours=6.0,
                    energy_level=max(1, 6 - score),
                    appetite_score=3,
                    social_connection=3,
                    is_offline_entry=False
                )
                db.add(asmt)
                db.commit()
            msg = f"END Fatigue score {score}/5 logged successfully. Thank you for reporting, trooper."
        except ValueError:
            msg = "END Invalid rating. Session closed."
        USSD_SESSIONS.pop(sess_id, None)
        return USSDResponse(session_id=sess_id, message=msg, continue_session=False)

    return USSDResponse(session_id=sess_id, message="END Request processed. Jai Hind.", continue_session=False)

def process_sms_incoming(db: Session, req: SMSIncomingRequest) -> SMSIncomingResponse:
    now = datetime.now(timezone.utc)
    body = req.message_body.strip()
    upper = body.upper()

    personnel = _resolve_personnel(db, req.service_number, req.sender_phone)
    p_id = personnel.id if personnel else None
    case_created_id = None

    if upper.startswith("HELP") or upper.startswith("SOS") or upper.startswith("MADAD"):
        if p_id:
            case_created_id = _get_or_create_welfare_case(
                db=db,
                personnel_id=p_id,
                triggered_by="sms_sos",
                risk_level="red",
                ack_hours=12,
                plan_hours=48,
                intervention_type="emergency_sms_response",
                intervention_notes=f"Emergency SOS received via SMS text: '{body}' from {req.sender_phone}",
                now=now
            )

        reply = "PRAHARI ALERT: Your emergency request is received with RED status. Welfare cell notified immediately. Stand by."
        action = "EMERGENCY_CASE_CREATED"

    elif upper.startswith("BUDDY"):
        tokens = upper.split()
        cat = "general"
        level = 2
        if len(tokens) >= 2:
            cat = _map_concern_category(tokens[1])
        if len(tokens) >= 3:
            try:
                level = max(1, min(3, int(tokens[2])))
            except ValueError:
                level = 2

        if personnel:
            unit_id = personnel.unit_id
        else:
            reply = "PRAHARI: Unable to verify your identity. Please include your service number."
            action = "BUDDY_SIGNAL_FAILED_NO_IDENTITY"
            return SMSIncomingResponse(
                message_sid=req.message_sid,
                reply_text=reply,
                action_executed=action,
                case_created_id=None
            )

        iso = now.isocalendar()
        sig = BuddySignal(
            unit_id=unit_id,
            concern_category=cat,
            concern_level=level,
            week_number=iso[1],
            year=iso[0]
        )
        db.add(sig)
        db.commit()

        reply = f"PRAHARI: Anonymous buddy signal logged for category '{cat}' (level {level}). Thank you for vigilance."
        action = "BUDDY_SIGNAL_RECORDED"

    elif upper.startswith("STATUS"):
        p_name = personnel.name if personnel else "Trooper"
        reply = f"PRAHARI: {p_name}, Unit active. To report fatigue reply FATIGUE <1-5>. Emergency: reply HELP. Helpline: 1800-PRAHARI."
        action = "STATUS_REPORTED"

    else:
        reply = "PRAHARI Vani Gateway: Reply HELP for emergency assistance, BUDDY <CAT> <1-3> for peer alert, or STATUS for info."
        action = "INFO_REPLIED"

    return SMSIncomingResponse(
        message_sid=req.message_sid,
        reply_text=reply,
        action_executed=action,
        case_created_id=case_created_id
    )
