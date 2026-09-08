@echo off
title PRAHARI Backend Server - Team USHARP
cd /d "%~dp0"

echo ==========================================================
echo [PRAHARI] Starting Backend Server (Team USHARP)
echo ==========================================================
echo.

REM 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in PATH.
    echo Please install Python 3.10+ from python.org and check "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

REM 2. Check / Create Virtual Environment
if not exist ".venv" (
    echo [1/4] Creating virtual environment (.venv)...
    python -m venv .venv
)

REM 3. Activate Virtual Environment
call .venv\Scripts\activate.bat

REM 4. Install / Verify Dependencies
echo [2/4] Verifying Python dependencies...
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

REM 5. Setup Configuration
if not exist ".env" (
    echo [3/4] Initializing default .env configuration...
    copy .env.example .env >nul
) else (
    echo [3/4] Configuration file .env ready.
)

REM 6. Seed Database on First Run
if not exist "prahari.db" (
    echo [4/4] First-time setup: Initializing database and demo data...
    python scripts\seed_db.py
) else (
    echo [4/4] Database prahari.db ready.
)

echo.
echo ==========================================================
echo [SUCCESS] PRAHARI Backend is running!
echo ----------------------------------------------------------
echo * Swagger API Docs:  http://localhost:8000/docs
echo * Alternative Docs:  http://localhost:8000/redoc
echo.
echo Team Demo Logins:
echo   - Commander:  cmd_vikram   / demo123
echo   - Welfare:    wo_meera     / demo123
echo   - Soldier:    rajesh_kumar / demo123
echo   - Admin:      admin_sys    / demo123
echo ==========================================================
echo.

REM Open browser to Swagger docs
start "" http://localhost:8000/docs

REM Start server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
