"""Authentication for non-browser telecom and air-gap integrations."""
import hashlib
import hmac
import time
from collections import OrderedDict
from fastapi import HTTPException, Request, status
from config import settings

_seen_nonces = OrderedDict()
_MAX_NONCES = 4096
_MAX_CLOCK_SKEW = 300

async def verify_gateway_request(request: Request) -> None:
    secret = settings.GATEWAY_SHARED_SECRET or settings.AIRGAP_SHARED_SECRET
    timestamp = request.headers.get("X-Prahari-Timestamp")
    nonce = request.headers.get("X-Prahari-Nonce")
    signature = request.headers.get("X-Prahari-Signature")
    # An explicit development escape hatch is restricted to loopback clients.
    client_host = request.client.host if request.client else None
    if (
        settings.ALLOW_INSECURE_LOCAL_GATEWAY
        and settings.APP_ENV in {"development", "test"}
        and (
            client_host in {"127.0.0.1", "::1", "localhost"}
            or (settings.APP_ENV == "test" and client_host == "testclient")
        )
        and not (timestamp or nonce or signature)
    ):
        return
    if not secret or not timestamp or not nonce or not signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Integration authentication required")
    try:
        ts = int(timestamp)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid integration timestamp")
    if abs(int(time.time()) - ts) > _MAX_CLOCK_SKEW:
        raise HTTPException(status_code=401, detail="Expired integration request")
    if nonce in _seen_nonces:
        raise HTTPException(status_code=401, detail="Replay detected")
    body = await request.body()
    expected = hmac.new(secret.encode(), f"{timestamp}.{nonce}.".encode() + body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Invalid integration signature")
    _seen_nonces[nonce] = ts
    while len(_seen_nonces) > _MAX_NONCES:
        _seen_nonces.popitem(last=False)
