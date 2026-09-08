# 🛠️ PRAHARI Backend — Team USHARP Developer Guide

Welcome to the **PRAHARI Backend** service. This backend powers the entire platform: statutory privacy firewall, 72-hour emergency leave SLA worker, Unit Resilience Optimizer (Hungarian shift matcher), and cryptographic audit logging.

---

## ⚡ One-Click Run (Easiest Way for Team Members)

We have created one-click start scripts so you don't need to manually configure anything:

### 🪟 On Windows:
Simply **double-click** `run.bat` (or run it from terminal):
```cmd
run.bat
```

### 🍎 / 🐧 On Mac / Linux:
Make it executable and run:
```bash
chmod +x run.sh
./run.sh
```

**What the script does automatically for you:**
1. Creates a Python virtual environment (`.venv`)
2. Installs all required packages from `requirements.txt`
3. Copies `.env.example` to `.env`
4. Creates the database and seeds demonstration troops, rosters, and cases
5. Starts the FastAPI server on `http://localhost:8000`
6. Opens your web browser directly to the interactive Swagger API documentation

---

## ⌨️ Manual Run Steps (Alternative)

If you prefer running commands manually in your terminal:

```bash
# 1. Enter the backend directory
cd backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create default configuration
cp .env.example .env

# 4. Initialize database and demo data
python scripts/seed_db.py

# 5. Start the API server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔑 Demo Login Accounts (For Testing Frontend & Mobile)

Use these accounts to test login flows, role permissions, and dashboards:

| Role | Username | Password | Purpose & Access Level |
| :--- | :--- | :--- | :--- |
| **Company Commander (Srinagar)** | `cmd_vikram` | `demo123` | Operational duty rosters, sentry fatigue tags, URO shift swap review (No clinical psychological scores visible) |
| **Company Commander (Sukma)** | `cmd_sukma` | `demo123` | Second operational company commander |
| **Battalion Welfare Officer** | `wo_meera` | `demo123` | Confidential casework, 72h emergency leave SLA review, statutory dossier export (Section 61 BSA 2023) |
| **Field Soldier (Trooper)** | `rajesh_kumar` | `demo123` | Mobile app user: submit emergency leave, view duty shifts, self-assessment |
| **Field Soldier (Trooper)** | `ankit_sharma` | `demo123` | Second trooper account |
| **System Administrator** | `admin_sys` | `demo123` | System oversight, cryptographic audit chain verification |

---

## 🌐 Connecting Frontend & Mobile App

### 1. Web Frontend (Next.js)
In `frontend/.env.local`, set:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 2. Mobile App (Flutter / React Native)
* **Android Emulator**: In Android emulators, `localhost` refers to the device itself. Use `10.0.2.2`:
  ```dart
  const String apiBaseUrl = "http://10.0.2.2:8000/api";
  ```
* **iOS Simulator**:
  ```dart
  const String apiBaseUrl = "http://localhost:8000/api";
  ```
* **Physical Device (via Wi-Fi)**:
  Connect both your PC and phone to the same Wi-Fi network and find your PC's IP address (`ipconfig` on Windows):
  ```dart
  const String apiBaseUrl = "http://192.168.x.x:8000/api";
  ```

---

## 🧭 Key API Endpoints Overview

All endpoints are documented interactively at: **[http://localhost:8000/docs](http://localhost:8000/docs)**

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/token` | Login with username/password (returns JWT `access_token`) |
| **Auth** | `GET` | `/api/auth/me` | Returns profile of currently authenticated user |
| **Commander** | `GET` | `/api/commander/dashboard` | Returns operational readiness, circadian strain, and duty rosters |
| **Welfare** | `GET` | `/api/welfare/cases` | Lists all active confidential welfare cases |
| **Welfare** | `GET` | `/api/welfare/case/{id}` | Detailed case dossier (clinical attributions, SHAP factors) |
| **Welfare** | `GET` | `/api/welfare/case/{id}/export-dossier` | Generates official Court of Inquiry PDF |
| **URO** | `POST` | `/api/uro/run` | Runs the Hungarian shift swap optimizer with 8h rest barriers |
| **URO** | `PUT` | `/api/uro/result/{id}/approve` | Co-signs and commits optimized swaps to the live database |
| **Grievance** | `POST` | `/api/grievance/submit` | Submits emergency domestic leave with 72h SLA timer |
| **Grievance** | `GET` | `/api/grievance/my-status` | Trooper checks status of their leave request |
| **Audit** | `GET` | `/api/admin/audit/verify-chain` | One-click cryptographic verification of the SHA-256 block ledger |

---

## 🧪 Optional: Running Verification Tests

To verify all 85 backend test cases:
```bash
pytest tests/ -v
```

---

**Team USHARP — Project PRAHARI**
