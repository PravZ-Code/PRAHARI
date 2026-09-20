# 🛠️ PRAHARI Backend — Team USHARP Developer Guide

Welcome to the **PRAHARI Backend** service. This backend powers the entire platform: statutory privacy firewall, 72-hour emergency leave SLA worker, Unit Resilience Optimizer (Hungarian shift matcher), and cryptographic audit logging.

---

## ⚡ Quick Run

The repository uses standard Python scripts; use the manual commands below to configure and launch.

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

### 2. Mobile App (Flutter)
Use the build-time `PRAHARI_API_URL` or `API_BASE_URL` value when the default host is not suitable:
```bash
flutter run --dart-define=PRAHARI_API_URL=http://10.0.2.2:8000/api
```
For a physical device, replace the host with your development machine's LAN IP. iOS simulators can use `http://localhost:8000/api`.

---

## 🧭 Key API Endpoints Overview

All endpoints are documented interactively at: **[http://localhost:8000/docs](http://localhost:8000/docs)**

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/login` | Login with username/password (returns JWT `access_token` and an HttpOnly session cookie) |
| **Auth** | `GET` | `/api/auth/me` | Returns profile of currently authenticated user |
| **Commander** | `GET` | `/api/commander/dashboard` | Returns operational readiness, circadian strain, and duty rosters |
| **Welfare** | `GET` | `/api/welfare/cases` | Lists all active confidential welfare cases |
| **Welfare** | `GET` | `/api/welfare/case/{id}` | Detailed case dossier (clinical attributions, SHAP factors) |
| **Welfare** | `GET` | `/api/welfare/case/{id}/export-dossier` | Generates official Court of Inquiry PDF |
| **URO** | `POST` | `/api/uro/run` | Runs the Hungarian shift swap optimizer with 8h rest barriers |
| **URO** | `PUT` | `/api/uro/result/{id}/approve` | Co-signs and commits optimized swaps to the live database |
| **Grievance** | `POST` | `/api/grievance/file` | Submits a leave or grievance request with SLA tracking |
| **Grievance** | `GET` | `/api/grievance/my-requests` | Trooper checks their own requests |
| **Audit** | `GET` | `/api/admin/audit/verify-chain` | One-click cryptographic verification of the SHA-256 block ledger |

---

## 🧪 Optional: Running Verification Tests

To verify the backend test suite:
```bash
pytest tests/ -v
```

---

**Team USHARP — Project PRAHARI**
