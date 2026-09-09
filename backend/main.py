import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
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
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
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

@app.get("/metrics", response_class=Response)
def prometheus_metrics():
    """Prometheus telemetry scrape endpoint for defense operations centers."""
    content = generate_prometheus_metrics()
    return Response(content=content, media_type="text/plain; version=0.0.4")

@app.get("/api/ml/diagnostics")
def get_ml_diagnostics():
    """Returns defense enterprise model registry, calibration curves, and fairness audits."""
    return generate_model_registry_metadata()

@app.get("/health")
def health_check():
    return {"status": "operational", "system": "PRAHARI Defense Intelligence Engine", "version": settings.BUILD_VERSION}

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
    db_status = "unhealthy"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

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

