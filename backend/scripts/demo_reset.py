import os
import sys

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from database import engine, Base
from models import *
from scripts.seed_db import seed_database

def reset_demo_environment():
    print("Resetting PRAHARI demonstration environment...")
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    print("Existing tables removed.")
    # Re-run seed
    seed_database()
    print("Demonstration environment restored to its standard state.")

if __name__ == "__main__":
    reset_demo_environment()
