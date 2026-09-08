import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User
from models.personnel import Unit, Personnel
from models.welfare_case import WelfareCase
from middleware.rbac import create_access_token

@pytest.fixture(scope="session", autouse=True)
def ensure_database_seeded():
    """Guarantees a clean, reproducible test suite on fresh clone even without manual seeding."""
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            from scripts.seed_db import seed_database
            seed_database()
    finally:
        db.close()

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="session")
def users_map():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        return {u.username: u for u in users}
    finally:
        db.close()

@pytest.fixture(scope="session")
def units_map():
    db = SessionLocal()
    try:
        units = db.query(Unit).all()
        return {u.name: u for u in units}
    finally:
        db.close()

def _make_headers_for(username: str) -> dict:
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.username == username).first()
        if not u:
            raise ValueError(f"User {username} not found")
        token = create_access_token({
            "sub": u.id,
            "username": u.username,
            "role": u.role,
            "personnel_id": u.personnel_id,
            "unit_id": u.unit_id
        })
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()

@pytest.fixture(scope="session")
def admin_headers():
    return _make_headers_for("admin_sys")

@pytest.fixture(scope="session")
def welfare_headers():
    return _make_headers_for("wo_meera")

@pytest.fixture(scope="session")
def commander_alpha_headers():
    return _make_headers_for("cmd_vikram")

@pytest.fixture(scope="session")
def commander_bravo_headers():
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.username == "cmd_sukma").first()
        if u:
            token = create_access_token({
                "sub": u.id,
                "username": u.username,
                "role": u.role,
                "personnel_id": u.personnel_id,
                "unit_id": u.unit_id
            })
        else:
            b_unit = db.query(Unit).filter(Unit.name.like("%Bravo%")).first()
            token = create_access_token({
                "sub": "mock-cmd-bravo-id",
                "username": "cmd_sukma",
                "role": "commander",
                "personnel_id": None,
                "unit_id": b_unit.id if b_unit else "bravo-unit-fallback-id"
            })
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()

@pytest.fixture(scope="session")
def personnel_headers():
    return _make_headers_for("rajesh_kumar")

@pytest.fixture(scope="session")
def alpha_unit_id():
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.username == "cmd_vikram").first()
        if u and u.unit_id:
            return u.unit_id
        unit = db.query(Unit).filter(Unit.name.like("%Alpha%")).first()
        return unit.id if unit else "alpha-unit-fallback-id"
    finally:
        db.close()

@pytest.fixture(scope="session")
def bravo_unit_id():
    db = SessionLocal()
    try:
        b_unit = db.query(Unit).filter(Unit.name.like("%Bravo%")).first()
        if b_unit:
            return b_unit.id
        u = db.query(User).filter(User.username == "cmd_sukma").first()
        if u and u.unit_id:
            return u.unit_id
        a_unit = db.query(Unit).filter(Unit.name.like("%Alpha%")).first()
        other_unit = db.query(Unit).filter(Unit.id != a_unit.id).first() if a_unit else None
        return other_unit.id if other_unit else "bravo-unit-fallback-id"
    finally:
        db.close()

@pytest.fixture(scope="session")
def sample_welfare_case_id():
    db = SessionLocal()
    try:
        case = db.query(WelfareCase).first()
        return case.id if case else None
    finally:
        db.close()
