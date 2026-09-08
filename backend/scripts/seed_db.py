import os
import sys

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from scripts.seed_battalion_1000 import seed_battalion

def seed_database():
    """
    Standard entry point to initialize and seed the complete 1,000-personnel
    paramilitary battalion across 5 tactical formations with full longitudinal
    duty rosters, administrative leaves, grievances, and cryptographic audit ledger.
    """
    seed_battalion()

if __name__ == "__main__":
    seed_database()
