import time
from collections import defaultdict
from threading import Lock
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import settings


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding window rate limiter per client IP."""

    def __init__(self):
        self._lock = Lock()
        self._requests = defaultdict(list)

    def is_allowed(self, client_ip: str, path: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
        now = time.time()
        key = f"{client_ip}:{path}"
        with self._lock:
            cutoff = now - window_seconds
            timestamps = [t for t in self._requests[key] if t > cutoff]
            if len(timestamps) >= limit:
                retry_after = max(1, int(timestamps[0] + window_seconds - now))
                self._requests[key] = timestamps
                return False, retry_after
            timestamps.append(now)
            self._requests[key] = timestamps
            return True, 0

    def reset(self):
        with self._lock:
            self._requests.clear()


rate_limiter = SlidingWindowRateLimiter()


class SecurityMiddleware(BaseHTTPMiddleware):
    """Apply low-cost HTTP hardening, body limits, and sliding-window rate limiting."""

    # Path prefixes with (request_limit, window_seconds)
    RATE_LIMITS = {
        "/api/auth/login": (15, 60),      # 15 req/min per IP (defense against brute force)
        "/api/gateway": (120, 60),        # 120 req/min per IP (high-throughput field sync)
    }

    async def dispatch(self, request, call_next):
        # 1. Rate Limiting Check
        if getattr(settings, "RATE_LIMIT_ENABLED", True):
            client_ip = request.client.host if request.client else "unknown"
            req_path = request.url.path
            for path_prefix, (limit, window_s) in self.RATE_LIMITS.items():
                if req_path.startswith(path_prefix):
                    allowed, retry_after = rate_limiter.is_allowed(client_ip, path_prefix, limit, window_s)
                    if not allowed:
                        return JSONResponse(
                            status_code=429,
                            content={
                                "detail": f"Rate limit exceeded ({limit} req/{window_s}s). Try again in {retry_after} seconds."
                            },
                            headers={"Retry-After": str(retry_after)},
                        )
                    break

        # 2. Content-Length Limit Check
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                body_size = int(content_length)
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header"})
            if body_size > settings.MAX_REQUEST_BODY_BYTES:
                return JSONResponse(status_code=413, content={"detail": "Request body is too large"})

        # 3. Process Request and Apply Hardened Headers
        response = await call_next(request)
        if settings.ENABLE_SECURITY_HEADERS:
            response.headers.setdefault("X-Content-Type-Options", "nosniff")
            response.headers.setdefault("X-Frame-Options", "DENY")
            response.headers.setdefault("Referrer-Policy", "no-referrer")
            response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
            response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        return response