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

__all__ = [
    "auth_router",
    "assessment_router",
    "buddy_router",
    "commander_router",
    "welfare_router",
    "uro_router",
    "ml_router",
    "admin_router",
    "copilot_router",
    "gateway_router",
    "resilience_router",
    "grievance_router"
]

