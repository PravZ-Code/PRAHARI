from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from schemas.gateway import (
    IVRDTMFRequest,
    IVRDTMFResponse,
    USSDRequest,
    USSDResponse,
    SMSIncomingRequest,
    SMSIncomingResponse
)
from services.gateway_service import (
    process_ivr_dtmf,
    process_ussd,
    process_sms_incoming
)

router = APIRouter()

@router.post("/ivr/dtmf", response_model=IVRDTMFResponse)
def handle_ivr_dtmf(
    req: IVRDTMFRequest,
    db: Session = Depends(get_db)
):
    """
    Ingests touch-tone DTMF digits from 1800-PRAHARI telecom gateway.
    Handles language selection, emergency callback escalation, leave grievance, and buddy alerts.
    """
    return process_ivr_dtmf(db=db, req=req)

@router.post("/ussd", response_model=USSDResponse)
def handle_ussd_session(
    req: USSDRequest,
    db: Session = Depends(get_db)
):
    """
    Manages low-bandwidth GSM USSD (*141#) sessions for button phones in remote border outposts.
    Supports multi-turn menus, fatigue reporting, and emergency SOS.
    """
    return process_ussd(db=db, req=req)

@router.post("/sms/incoming", response_model=SMSIncomingResponse)
def handle_incoming_sms(
    req: SMSIncomingRequest,
    db: Session = Depends(get_db)
):
    """
    Parses structured SMS commands (HELP/SOS, BUDDY <CAT> <LVL>, STATUS) from 2G SMS gateways.
    """
    return process_sms_incoming(db=db, req=req)


@router.post("/airgap/export/{unit_id}", summary="Export signed air-gap sync bundle for physical USB/SD transport")
def export_airgap(
    unit_id: str,
    db: Session = Depends(get_db)
):
    from services.airgap_sync_service import export_airgap_bundle
    try:
        return export_airgap_bundle(db=db, unit_id=unit_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/airgap/import", summary="Ingest signed air-gap sync bundle from physical USB/SD transport")
def import_airgap(
    bundle: dict,
    db: Session = Depends(get_db)
):
    from services.airgap_sync_service import import_airgap_bundle
    try:
        return import_airgap_bundle(db=db, bundle=bundle)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

