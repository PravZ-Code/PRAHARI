#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "[PRAHARI] Starting Backend Server (Team USHARP)"
echo "=========================================================="
echo ""

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 is not installed or not in PATH. Please install Python 3.10+."
    exit 1
fi

# 2. Virtual Environment
if [ ! -d ".venv" ]; then
    echo "[1/4] Creating virtual environment (.venv)..."
    python3 -m venv .venv
fi

source .venv/bin/activate

# 3. Install Dependencies
echo "[2/4] Verifying Python dependencies..."
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

# 4. Configuration
if [ ! -f ".env" ]; then
    echo "[3/4] Initializing default .env configuration..."
    cp .env.example .env
else
    echo "[3/4] Configuration file .env ready."
fi

# 5. Database Initialization
if [ ! -f "prahari.db" ]; then
    echo "[4/4] First-time setup: Initializing database and demo data..."
    python scripts/seed_db.py
else
    echo "[4/4] Database prahari.db ready."
fi

echo ""
echo "=========================================================="
echo "[SUCCESS] PRAHARI Backend is running!"
echo "----------------------------------------------------------"
echo "* Swagger API Docs:  http://localhost:8000/docs"
echo "* Alternative Docs:  http://localhost:8000/redoc"
echo ""
echo "Team Demo Logins:"
echo "  - Commander:  cmd_vikram   / demo123"
echo "  - Welfare:    wo_meera     / demo123"
echo "  - Soldier:    rajesh_kumar / demo123"
echo "  - Admin:      admin_sys    / demo123"
echo "=========================================================="
echo ""

# Start server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
