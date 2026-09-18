import os
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool, NullPool
from config import settings

database_url = settings.DATABASE_URL
connect_args = {}

if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 60}

engine_kwargs = {"pool_pre_ping": True, "connect_args": connect_args}
if database_url.startswith("sqlite"):
    engine_kwargs["poolclass"] = QueuePool
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 15
    engine_kwargs["pool_timeout"] = 30
    engine_kwargs["pool_recycle"] = 1800

engine = create_engine(database_url, **engine_kwargs)

if database_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.execute("PRAGMA cache_size=-64000")
        cursor.execute("PRAGMA mmap_size=268435456")
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.execute("PRAGMA wal_autocheckpoint=1000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def ensure_schema_compatibility():
    """Ensure newly added columns and sync indexes exist in SQLite or relational backend without destructive resets."""
    from sqlalchemy import inspect, text
    try:
        inspector = inspect(engine)
        table_names = set(inspector.get_table_names())
        if "personnel" in table_names:
            cols = [c["name"] for c in inspector.get_columns("personnel")]
            with engine.begin() as conn:
                if "company" not in cols:
                    conn.execute(text("ALTER TABLE personnel ADD COLUMN company VARCHAR(100)"))
                if "contact_number" not in cols:
                    conn.execute(text("ALTER TABLE personnel ADD COLUMN contact_number VARCHAR(50)"))
                # Create composite synchronization indexes for sub-millisecond queries
                if "grievance_requests" in table_names:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_grievance_sync ON grievance_requests (filed_at, status, personnel_id)"))
                if "self_assessments" in table_names:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_assessment_sync ON self_assessments (assessed_at, personnel_id)"))
                if "buddy_signals" in table_names:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_buddy_sync ON buddy_signals (submitted_at, unit_id)"))
                if "welfare_cases" in table_names:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_welfare_case_sync ON welfare_cases (created_at, unit_id, risk_level)"))
    except Exception:
        pass


