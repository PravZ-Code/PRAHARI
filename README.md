# 🛡️ PRAHARI // Personnel Welfare & Duty Optimization Platform

> **System Overview & Deployment Documentation**  
> **Smart India Hackathon 2026** | **Problem Statement PS26186**  
> **Nodal Ministry:** Ministry of Home Affairs (MHA) | **Target Forces:** Central Armed Police Forces (CRPF, BSF, ITBP, CISF, SSB)

<div align="center">

[![SIH 2026](https://img.shields.io/badge/SIH%202026-PS26186-orange.svg?style=flat-square)](https://www.sih.gov.in/)
[![Ministry](https://img.shields.io/badge/Ministry-Home%20Affairs%20%2F%20CRPF-003366.svg?style=flat-square)](https://www.mha.gov.in/)
[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-134%2F134%20Passed-2ea44f.svg?style=flat-square&logo=pytest&logoColor=white)](#-verification--system-integrity-scorecard)
[![Mobile Tests](https://img.shields.io/badge/Mobile%20Tests-14%2F14%20Passed-02569B.svg?style=flat-square&logo=flutter&logoColor=white)](#-verification--system-integrity-scorecard)
[![Code Quality](https://img.shields.io/badge/Static%20Analysis-0%20Issues-brightgreen.svg?style=flat-square)](#-verification--system-integrity-scorecard)
[![Compliance](https://img.shields.io/badge/Statutory%20Standard-MHCA%202017%20%7C%20BSA%202023%20%7C%20DPDP%202023-blueviolet.svg?style=flat-square)](#-statutory--governance-framework)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg?style=flat-square)](LICENSE)

</div>

---

## 🧭 Operational Context & Overview

**PRAHARI** is an enterprise decision-support and personnel welfare platform designed for high-tempo, forward-deployed formations in the Central Armed Police Forces. Uniformed personnel routinely navigate demanding operating environments characterized by continuous operational readiness, irregular shifts, and prolonged separation from families.

The platform supports force readiness and personnel welfare across two primary operational domains:

1. **Structured Grievance & Leave Redressal**: Provides transparent tracking and clear resolution timelines for personnel requests and urgent administrative matters, ensuring prompt escalation and oversight across command echelons.
2. **Operational Duty & Readiness Support**: Delivers analytical decision support to help commanders plan sustainable shift rosters, maintain balanced workload distribution, and uphold mission-critical readiness.

---

## ⚙️ Core Architecture & Capabilities

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FIELD & CLIENT TOUCHPOINTS                      │
│        Mobile Interfaces  •  Voice Telephony  •  Web Portals           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SECURE ENTERPRISE INTEGRATION                     │
│          Statutory Access Control  •  Role Isolation Governance        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PRAHARI CORE ANALYTICS & SERVICES                    │
│      Operational Rostering  •  Workflow Support  •  Audit Ledger       │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Leave Redressal & Administrative Tracking
* **Predictable Resolution Windows**: Urgent personal matters and standard administrative requests follow defined processing tracks with clear visibility for personnel.
* **Accountability & Escalation**: Timely notifications and hierarchical awareness ensure pending matters receive prompt attention at appropriate command levels.
* **Operational Readiness Alignment**: Helps leadership evaluate requests against current unit commitments and essential mission requirements.

### 2. Operational Rostering & Duty Balancing
* **Equitable Duty Distribution**: Assists leadership in allocating operational duties across available personnel to sustain overall unit endurance.
* **Readiness & Recovery Maintenance**: Encourages sustainable shift cycles that support personnel alertness during active duty.
* **Command Oversight**: Provides analytical recommendations while preserving full human discretion and authority for all scheduling decisions.

### 3. Resilient Multi-Channel Access
* **Frontline Mobile Interface**: Self-service application designed to function reliably in forward locations with varying network conditions.
* **Alternative Communication Ingress**: Supports interaction via standard voice telephony for personnel using basic feature phones.
* **Remote Deployment Support**: Enables secure data portability and exchange protocols tailored for isolated or radio-restricted operating outposts.

### 4. Governance & Statutory Compliance
* **Verifiable Administrative Records**: Maintains a reliable chronological record of administrative reviews, approvals, and decisions for transparency and institutional accountability.
* **Legal & Statutory Alignment**: Establishes auditable documentation conforming to relevant Indian statutory standards, including Bharatiya Sakshya Adhiniyam (BSA) 2023 and the Mental Healthcare Act (MHCA) 2017.

---

## 🔒 Privacy Architecture & Role Governance

PRAHARI maintains strict information separation between administrative command duties and personnel welfare support:

| Role | Intended User | Scope of Access | Information Boundaries |
| :--- | :--- | :--- | :--- |
| **Frontline Personnel** | Constables & Non-Commissioned Officers | Personal leave filings, self-service tracking, emergency assistance, personal access logs | No access to peer records or broader unit rosters |
| **Company Commander** | Unit & Company Leadership | Aggregated unit readiness indices, duty rosters, schedule recommendations | No access to private counseling notes or individual personal disclosures |
| **Welfare Officer** | Designated Welfare & Medical Staff | Confidential welfare casework, support tracking, recovery follow-ups | No access to tactical deployment orders |
| **System Administrator** | IT & Technical Support Officers | System health monitoring, audit log integrity verification | No access to individual personal requests or private casework |

> **Mental Healthcare Act (MHCA) 2017 (§21) Compliance**: Personal welfare and supportive interactions are strictly firewalled from administrative personnel files. Operational leadership receives non-stigmatizing, aggregate readiness indicators only.

---

## 🧪 Verification & System Integrity Scorecard

The repository is continuously verified through comprehensive automated test suites across backend, mobile, and web modules:

| Subsystem | Test Command | Scope | Result | Status |
| :--- | :--- | :--- | :---: | :---: |
| **Backend Core** | `pytest tests/` | Concurrency, SLA workers, access control, audit ledger, APIs | **134 / 134** | ✅ 100% Passed |
| **Mobile Client** | `flutter test` | Local storage, security store, state synchronization, data models | **14 / 14** | ✅ 100% Passed |
| **Mobile Linter** | `flutter analyze` | Static code analysis, type safety, null safety | **0 Issues** | ✅ Clean |
| **Web Portal** | `npm run build` | Application router compilation and type safety | **0 Errors** | ✅ Clean Build |
| **Accessibility** | Audit Suite | GIGW 3.0 / WCAG 2.2 AA government standard | **Passed** | ✅ Verified |
| **Audit Integrity** | Integrity Audit | Ledger continuity and record verification | **Intact** | ✅ Verified |

---

## 💻 Repository Structure & Technology Stack

```
prahari/
├── backend/                  # FastAPI service core, database models, and decision services
├── frontend/                 # Next.js web application for command, welfare, and administration
├── mobile/                   # Flutter cross-platform mobile client for frontline personnel
├── PRAHARI_Launcher.exe      # Windows desktop process orchestrator
└── launcher.py               # Process orchestrator source code
```

| Layer | Component | Technologies |
| :--- | :--- | :--- |
| **Backend API** | High-Performance Server | Python 3.11+, FastAPI, SQLAlchemy, Pydantic |
| **Web Portal** | Command & Administration Console | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, UX4G |
| **Mobile Client** | Frontline Personnel Client | Flutter, Dart, Local Encrypted SQLite |
| **Desktop Orchestrator** | Service Management | Native Windows GUI subsystem, Tkinter, Pystray |
| **Data Persistence** | Edge & Central Data Stores | SQLite (Edge) / PostgreSQL (Central) |
| **Governance** | Statutory Compliance | MHCA 2017 §21, BSA 2023 §63/65B, DPDP Act 2023, GIGW 3.0 |

---

## 🚀 Deployment & Local Prototype Setup

### Method 1: Desktop Orchestrator (Windows)
Double-click **`PRAHARI_Launcher.exe`** in the root directory.
* Automatically launches the backend (port 8000), web portal (port 3000), and mobile asset distribution (port 8080).
* Operates in the background with zero intrusive command-line windows.
* Includes system tray integration and service status monitoring.

### Method 2: Manual Development Execution

#### 1. Backend Service
```bash
cd backend
python -m pip install -r requirements.txt
python scripts/seed_db.py --battalion 1000
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*API Documentation:* `http://localhost:8000/docs`

#### 2. Web Portal
```bash
cd frontend
npm install
npm run dev
```
*Web Dashboard:* `http://localhost:3000`

#### 3. Frontline Mobile Client
```bash
cd mobile
flutter pub get
flutter run
```

---

## 🔑 Demo Access

Demo access is available for authorized evaluators. Credentials are provided separately.

---

## 📜 Statutory & Governance Framework

* **Mental Healthcare Act (MHCA) 2017 (Section 21)**: Protects confidentiality of personnel mental health casework and prohibits discriminatory administrative outcomes.
* **Bharatiya Sakshya Adhiniyam (BSA) 2023 (Sections 63 & 65B)**: Governs the electronic record integrity and evidentiary admissibility of administrative records.
* **Digital Personal Data Protection (DPDP) Act 2023**: Enforces purpose-bound processing, access transparency, and data redressal mechanisms.
* **Guidelines for Indian Government Websites (GIGW 3.0)**: Establishes standards for government digital interface accessibility and visual hierarchy.

---

## 📄 License & Attribution
Developed for the **Smart India Hackathon (SIH 2026)** under the auspices of the **Ministry of Home Affairs (MHA)** & **Central Reserve Police Force (CRPF)**.  
Licensed under the **MIT License**.
