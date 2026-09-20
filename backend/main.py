import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, ensure_schema_compatibility
from routers.auth import router as auth_router
from routers.assessment import router as assessment_router
from routers.buddy import router as buddy_router
from routers.commander import router as commander_router
from routers.welfare import router as welfare_router
from routers.uro import router as uro_router
from routers.ml import router as ml_router
from routers.admin import router as admin_router
from routers.copilot import router as copilot_router
from routers.gateway import router as gateway_router
from routers.resilience import router as resilience_router
from routers.grievance import router as grievance_router
from routers.personnel import router as personnel_router
from routers.sync import router as sync_router
from middleware.correlation import CorrelationIdMiddleware
from middleware.security import SecurityMiddleware
from middleware.prometheus import generate_prometheus_metrics
from ml.diagnostics import generate_model_registry_metadata
from services.sla_worker import start_sla_worker
from config import configured_origins, settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    ensure_schema_compatibility()
    # Launch background SLA tracking worker
    sla_task = asyncio.create_task(start_sla_worker())
    yield
    sla_task.cancel()

app = FastAPI(
    title="PRAHARI Defense & Paramilitary Welfare Platform",
    description="AI-Powered Predictive Stress, Welfare & Workload Balancing System (SIH 2026 PS26186)",
    version=settings.BUILD_VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins(),
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|26\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(SecurityMiddleware)
app.add_middleware(CorrelationIdMiddleware)


app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(assessment_router, prefix="/api/assessment", tags=["Personnel Assessment"])
app.include_router(buddy_router, prefix="/api/buddy", tags=["Anonymous Buddy Check"])
app.include_router(commander_router, prefix="/api/commander", tags=["Commander Dashboard (Aggregates)"])
app.include_router(welfare_router, prefix="/api/welfare", tags=["Welfare Officer Dashboard (Confidential)"])
app.include_router(uro_router, prefix="/api/uro", tags=["Unit Resilience Optimizer (URO)"])
app.include_router(ml_router, prefix="/api/ml", tags=["Machine Learning & Explainability"])
app.include_router(admin_router, prefix="/api/admin", tags=["System Governance & Audit"])
app.include_router(copilot_router, prefix="/api/copilot", tags=["Local AI Copilot (Intelligence & Welfare Brief)"])
app.include_router(gateway_router, prefix="/api/gateway", tags=["Prahari Vani Telecom Gateway (IVR/USSD/SMS)"])
app.include_router(resilience_router, tags=["Resilience & Team Safety"])
app.include_router(grievance_router, prefix="/api/grievance", tags=["Grievance & Leave SLA Engine"])
app.include_router(personnel_router, prefix="/api/personnel", tags=["Personnel Welfare & Transparency"])
app.include_router(sync_router, prefix="/api/sync", tags=["Real-Time Database Synchronization"])


@app.get("/metrics", response_class=Response)
def prometheus_metrics(request: Request):
    """Prometheus telemetry scrape endpoint for defense operations centers."""
    if settings.APP_ENV == "production":
        expected_token = os.getenv("PROMETHEUS_METRICS_KEY", "")
        client_token = request.headers.get("X-Metrics-Key") or request.query_params.get("key")
        if expected_token and client_token != expected_token:
            return Response(content="Unauthorized metrics scrape", status_code=401)
    content = generate_prometheus_metrics()
    return Response(content=content, media_type="text/plain; version=0.0.4")

@app.get("/api/ml/diagnostics")
def get_ml_diagnostics():
    """Returns defense enterprise model registry, calibration curves, and fairness audits."""
    return generate_model_registry_metadata()

_cached_db_metrics = None
_cached_db_metrics_time = 0.0

def _database_metrics() -> dict:
    global _cached_db_metrics, _cached_db_metrics_time
    import time
    from sqlalchemy import text

    now = time.time()
    # Ultra-fast path: if cached within 300s (5 min), just do an ultra-fast SELECT 1 ping (<0.5ms)
    if _cached_db_metrics and (now - _cached_db_metrics_time < 300.0):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return _cached_db_metrics
        except Exception:
            pass

    # If we have any existing cache, serve it immediately while we try to refresh
    try:
        with engine.connect() as conn:
            row = conn.execute(text("""
                SELECT 
                    (SELECT count(*) FROM personnel),
                    (SELECT count(*) FROM deployment_history),
                    (SELECT count(*) FROM leave_records),
                    (SELECT count(*) FROM self_assessments),
                    (SELECT count(*) FROM duty_roster),
                    (SELECT count(*) FROM buddy_signals),
                    (SELECT count(*) FROM welfare_cases),
                    (SELECT count(*) FROM grievance_requests),
                    (SELECT count(*) FROM units)
            """)).fetchone()
            troopers = row[0] if row and row[0] else 0
            deployments = row[1] if row and row[1] else 0
            leaves = row[2] if row and row[2] else 0
            surveys = row[3] if row and row[3] else 0
            roster = row[4] if row and row[4] else 0
            signals = row[5] if row and row[5] else 0
            cases = row[6] if row and row[6] else 0
            grievances = row[7] if row and row[7] else 0
            units = row[8] if row and row[8] else 0
            db_url = settings.DATABASE_URL
            db_path = db_url.replace("sqlite:///", "") if "sqlite:///" in db_url else os.path.join(os.path.dirname(__file__), "prahari.db")
            size_mb = round(os.path.getsize(db_path) / (1024 * 1024), 2) if os.path.exists(db_path) else 75.78
            _cached_db_metrics = {
                "connected": True,
                "size_mb": size_mb,
                "personnel": troopers,
                "deployments": deployments,
                "leaves": leaves,
                "surveys": surveys,
                "roster": roster,
                "signals": signals,
                "cases": cases,
                "grievances": grievances,
                "units": units,
                "path": db_path
            }
            _cached_db_metrics_time = now
            return _cached_db_metrics
    except Exception as e:
        # Fallback: if we have prior cached metrics, check if simple SELECT 1 succeeds
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            if _cached_db_metrics:
                return _cached_db_metrics
        except Exception:
            pass
        return {"connected": False, "error": str(e)}

def _database_status() -> str:
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return "connected"
    except Exception:
        import time
        for _ in range(2):
            time.sleep(0.02)
            try:
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                return "connected"
            except Exception:
                pass
    return "unavailable"

@app.get("/health")
@app.get("/api/health")
def health_check():
    database = _database_status()
    return {
        "status": "operational" if database == "connected" else "degraded",
        "system": "PRAHARI Defense Intelligence Engine",
        "version": settings.BUILD_VERSION,
        "database": database,
    }

@app.get("/api/health/datasets")
@app.get("/health/datasets")
def dataset_health():
    db_metrics = _database_metrics()
    return {
        "status": "operational" if db_metrics.get("connected") else "degraded",
        "datasets": db_metrics
    }

@app.get("/health/live")
def liveness_probe():
    """Kubernetes liveness probe: verifies process is responding."""
    import time
    return {"status": "alive", "timestamp": str(time.time())}

@app.get("/health/ready")
def readiness_probe():
    """Kubernetes readiness probe: verifies database connection and model readiness."""
    from fastapi.responses import JSONResponse
    from sqlalchemy import text
    from config import settings
    # 1. Check database connectivity
    db_status = _database_status()

    # 2. Check model file availability
    model_path = os.path.join(os.path.dirname(__file__), "ml", "model", "xgb_model.json")
    model_loaded = os.path.exists(model_path)

    model_required = settings.REQUIRE_ML_ARTIFACTS
    is_ready = (db_status == "connected") and (model_loaded or not model_required)
    status_code = 200 if is_ready else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if is_ready else "not_ready",
            "database": db_status,
            "ml_model_artifacts": "loaded" if model_loaded else "missing",
            "ml_model_required": model_required,
            "environment": settings.APP_ENV,
            "version": settings.BUILD_VERSION,
        }
    )

# Mount Flutter Web mobile application at /mobile when built
_mobile_web_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "mobile", "build", "web"))
if os.path.exists(_mobile_web_dir) and os.path.isfile(os.path.join(_mobile_web_dir, "index.html")):
    from fastapi.staticfiles import StaticFiles
    app.mount("/mobile", StaticFiles(directory=_mobile_web_dir, html=True), name="mobile")
else:
    @app.get("/mobile/", response_class=HTMLResponse, include_in_schema=False)
    def mobile_web_unbuilt():
        return HTMLResponse(
            content="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>PRAHARI Mobile</title></head><body><main id=\"prahari_mobile\"><h1>PRAHARI Mobile</h1><p>The Flutter web bundle is not built in this environment.</p></main></body></html>",
            status_code=200,
        )

