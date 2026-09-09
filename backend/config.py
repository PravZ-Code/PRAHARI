import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    APP_ENV: str = os.getenv("APP_ENV", "development")
    BUILD_VERSION: str = os.getenv("BUILD_VERSION", "1.0.0")
    MAX_REQUEST_BODY_BYTES: int = int(os.getenv("MAX_REQUEST_BODY_BYTES", str(2 * 1024 * 1024)))
    ENABLE_SECURITY_HEADERS: bool = os.getenv("ENABLE_SECURITY_HEADERS", "true").lower() == "true"
    REQUIRE_ML_ARTIFACTS: bool = os.getenv("REQUIRE_ML_ARTIFACTS", "true").lower() == "true"
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001,http://localhost:8080,http://127.0.0.1:8080",
    )
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "prahari")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "prahari_dev_2026")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "prahari_db")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prahari.db')}"
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "prahari-jwt-secret-key-sih-2026-hackathon-secure-tokens")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRY_HOURS: int = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
    # LLM Settings (Local Ollama Intelligence Engine)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen3:0.6b")

    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()

if settings.APP_ENV == "production":
    if (
        settings.JWT_SECRET_KEY == "prahari-jwt-secret-key-sih-2026-hackathon-secure-tokens"
        or len(settings.JWT_SECRET_KEY) < 32
    ):
        raise ValueError(
            "FATAL SECURITY ERROR: Insecure or default JWT_SECRET_KEY detected in production environment! "
            "Set a cryptographically strong JWT_SECRET_KEY of at least 32 characters in your environment."
        )


def configured_origins() -> list[str]:
    """Return normalized CORS origins without leaking unrelated environment values."""
    origins = [origin.strip().rstrip("/") for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
    legacy_origin = os.getenv("FRONTEND_ORIGIN", "").strip().rstrip("/")
    if legacy_origin and legacy_origin not in origins:
        origins.append(legacy_origin)
    return origins
