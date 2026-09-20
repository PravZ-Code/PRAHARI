import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.pool import QueuePool
from config import settings

logger = logging.getLogger("prahari.database")


def _create_engine(db_url: str) -> Engine:
    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False, "timeout": 60}

    engine_kwargs = {"pool_pre_ping": True, "connect_args": connect_args}
    if db_url.startswith("sqlite"):
        engine_kwargs["poolclass"] = QueuePool
        engine_kwargs["pool_size"] = 10
        engine_kwargs["max_overflow"] = 15
        engine_kwargs["pool_timeout"] = 30
        engine_kwargs["pool_recycle"] = 1800

    eng = create_engine(db_url, **engine_kwargs)

    if db_url.startswith("sqlite"):
        @event.listens_for(eng, "connect")
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
    return eng


# 1. Operational & Personnel Database Engine (Personnel, Units, Rosters, Cases, Predictions)
engine = _create_engine(settings.DATABASE_URL)

# 2. Authentication & Identity Database Engine (Users, Credentials, Passwords, Roles)
auth_engine = _create_engine(settings.AUTH_DATABASE_URL)

# Base classes for declarative models
Base = declarative_base()      # Personnel / Operational models
AuthBase = declarative_base()  # Authentication / Identity models


class MultiDBSession(Session):
    """
    Multi-database session router: transparently binds AuthBase models to auth_engine,
    and Base models to the operational engine.
    """
    def get_bind(self, mapper=None, clause=None, bind=None, **kw):
        if mapper is not None:
            try:
                entity = getattr(mapper, "class_", None)
                if entity and issubclass(entity, AuthBase):
                    return auth_engine
            except Exception:
                pass
        return super().get_bind(mapper=mapper, clause=clause, bind=bind, **kw)


# Dual sessionmakers
SessionLocal = sessionmaker(autocommit=False, autoflush=False, class_=MultiDBSession, bind=engine)
AuthSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=auth_engine)


def get_db():
    """Dependency providing operational & personnel database session (with multi-DB routing)."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_auth_db():
    """Dependency providing dedicated identity & authentication database session."""
    db = AuthSessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _ensure_prediction_outcome_schema():
    """Apply the prediction outcome migration independently of other migrations."""
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "risk_predictions" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("risk_predictions")}
    migrations = (
        ("outcome_14d", "ALTER TABLE risk_predictions ADD COLUMN outcome_14d INTEGER"),
        ("outcome_observed_at", "ALTER TABLE risk_predictions ADD COLUMN outcome_observed_at DATETIME"),
        ("outcome_definition", "ALTER TABLE risk_predictions ADD COLUMN outcome_definition VARCHAR(64)"),
    )
    for column_name, statement in migrations:
        if column_name not in columns:
            try:
                with engine.begin() as connection:
                    connection.execute(text(statement))
                logger.info("Applied risk_predictions migration: %s", column_name)
            except Exception:
                logger.exception("Failed to apply risk_predictions migration: %s", column_name)
                raise

    with engine.begin() as connection:
        connection.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_prediction_outcome_maturity "
            "ON risk_predictions (outcome_14d, predicted_at)"
        ))


def create_all_tables():
    """Create all tables in their respective physical databases."""
    import models  # Ensure all declarative models are registered on Base / AuthBase
    AuthBase.metadata.create_all(bind=auth_engine)
    Base.metadata.create_all(bind=engine)
    _ensure_prediction_outcome_schema()


def ensure_schema_compatibility():
    """Ensure newly added columns, sync indexes, and multi-DB user migrations exist without destructive resets."""
    from sqlalchemy import inspect, text

    # Ensure tables exist in both physical databases
    create_all_tables()

    # Migrate legacy users if prahari_auth.db is empty
    try:
        inspector_auth = inspect(auth_engine)
        if "users" in inspector_auth.get_table_names():
            cols_auth = [c["name"] for c in inspector_auth.get_columns("users")]
            with auth_engine.begin() as auth_conn:
                if "last_login_at" not in cols_auth:
                    auth_conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at DATETIME"))
                if "previous_login_at" not in cols_auth:
                    auth_conn.execute(text("ALTER TABLE users ADD COLUMN previous_login_at DATETIME"))

            with auth_engine.connect() as auth_conn:
                user_cnt = auth_conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
                if user_cnt == 0:
                    inspector_ops = inspect(engine)
                    if "users" in inspector_ops.get_table_names():
                        with engine.connect() as ops_conn:
                            legacy_users = ops_conn.execute(
                                text("SELECT id, username, password_hash, role, personnel_id, unit_id, is_active, created_at FROM users")
                            ).fetchall()
                            if legacy_users:
                                insert_sql = text(
                                    "INSERT INTO users (id, username, password_hash, role, personnel_id, unit_id, is_active, created_at) "
                                    "VALUES (:id, :username, :password_hash, :role, :personnel_id, :unit_id, :is_active, :created_at)"
                                )
                                with auth_engine.begin() as tx:
                                    for r in legacy_users:
                                        tx.execute(insert_sql, {
                                            "id": r[0],
                                            "username": r[1],
                                            "password_hash": r[2],
                                            "role": r[3],
                                            "personnel_id": r[4],
                                            "unit_id": r[5],
                                            "is_active": bool(r[6]),
                                            "created_at": r[7]
                                        })
                                print(f"[MIGRATION] Migrated {len(legacy_users)} user accounts to prahari_auth.db")
                                with engine.begin() as ops_tx:
                                    ops_tx.execute(text("DROP TABLE IF EXISTS users"))
                                print("[MIGRATION] Dropped legacy users table from prahari.db")
    except Exception as e:
        print(f"[MIGRATION NOTICE] Multi-DB user migration check: {e}")

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
                if "notifications" in table_names:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_notifications_sync ON notifications (recipient_role, is_read, created_at)"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read)"))
                if "risk_predictions" in table_names:
                    prediction_cols = [c["name"] for c in inspector.get_columns("risk_predictions")]
                    if "outcome_14d" not in prediction_cols:
                        conn.execute(text("ALTER TABLE risk_predictions ADD COLUMN outcome_14d INTEGER"))
                    if "outcome_observed_at" not in prediction_cols:
                        conn.execute(text("ALTER TABLE risk_predictions ADD COLUMN outcome_observed_at DATETIME"))
                    if "outcome_definition" not in prediction_cols:
                        conn.execute(text("ALTER TABLE risk_predictions ADD COLUMN outcome_definition VARCHAR(64)"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prediction_outcome_maturity ON risk_predictions (outcome_14d, predicted_at)"))
    except Exception:
        pass
