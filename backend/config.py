import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    APP_ENV: str = os.getenv("APP_ENV", "development")
    BUILD_VERSION: str = os.getenv("BUILD_VERSION", "1.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    MAX_REQUEST_BODY_BYTES: int = int(os.getenv("MAX_REQUEST_BODY_BYTES", str(2 * 1024 * 1024)))
    ENABLE_SECURITY_HEADERS: bool = os.getenv("ENABLE_SECURITY_HEADERS", "true").lower() == "true"
    REQUIRE_ML_ARTIFACTS: bool = os.getenv("REQUIRE_ML_ARTIFACTS", "true").lower() == "true"
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "prahari")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "prahari_db")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prahari.db')}"
    )
    AUTH_DATABASE_URL: str = os.getenv(
        "AUTH_DATABASE_URL",
        f"sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prahari_auth.db')}"
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "prahari-dev-secret-key-mha-defense-grid-2026-secure")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRY_HOURS: int = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
    # LLM Settings (Local Ollama Intelligence Engine)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen3:0.6b")

    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    # Integration and ledger keys must be explicitly provisioned in production.
    GATEWAY_SHARED_SECRET: str = os.getenv("GATEWAY_SHARED_SECRET", "")
    AIRGAP_SHARED_SECRET: str = os.getenv("AIRGAP_SHARED_SECRET", "")
    ALLOW_INSECURE_LOCAL_GATEWAY: bool = os.getenv("ALLOW_INSECURE_LOCAL_GATEWAY", "false").lower() == "true"
    LEDGER_SIGNING_KEY: str = os.getenv("LEDGER_SIGNING_KEY", "")

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()

# Resolve relative SQLite URLs from the backend directory rather than the
# process working directory. This keeps the launcher, Uvicorn, and tests on
# the same database file.
if settings.DATABASE_URL.startswith("sqlite:///./"):
    settings.DATABASE_URL = "sqlite:///" + os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        settings.DATABASE_URL.removeprefix("sqlite:///./"),
    )

if settings.AUTH_DATABASE_URL.startswith("sqlite:///./"):
    settings.AUTH_DATABASE_URL = "sqlite:///" + os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        settings.AUTH_DATABASE_URL.removeprefix("sqlite:///./"),
    )

if settings.APP_ENV == "production":
    if not settings.JWT_SECRET_KEY or settings.JWT_SECRET_KEY == "prahari-dev-secret-key-mha-defense-grid-2026-secure":
        raise ValueError(
            "FATAL SECURITY ERROR: Insecure or default JWT_SECRET_KEY detected in production environment! "
            "Set a cryptographically strong JWT_SECRET_KEY of at least 32 characters in your environment."
        )
    if len(settings.JWT_SECRET_KEY) < 32:
        raise ValueError(
            "FATAL SECURITY ERROR: JWT_SECRET_KEY is too short (must be at least 32 characters). "
            "Generate a strong key using: openssl rand -hex 32"
        )
    for name, value in (
        ("GATEWAY_SHARED_SECRET", settings.GATEWAY_SHARED_SECRET),
        ("AIRGAP_SHARED_SECRET", settings.AIRGAP_SHARED_SECRET),
        ("LEDGER_SIGNING_KEY", settings.LEDGER_SIGNING_KEY),
    ):
        if not value or len(value) < 32:
            raise ValueError(f"FATAL SECURITY ERROR: {name} must be a strong 32+ character secret in production.")


def configured_origins() -> list[str]:
    """Return normalized CORS origins without leaking unrelated environment values."""
    origins = [origin.strip().rstrip("/") for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
    legacy_origin = os.getenv("FRONTEND_ORIGIN", "").strip().rstrip("/")
    if legacy_origin and legacy_origin not in origins:
        origins.append(legacy_origin)
    return origins
