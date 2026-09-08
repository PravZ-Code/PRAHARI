# 🛡️ PRAHARI (प्रहारी)
### Smart Personnel Welfare & Fatigue Management Platform for Paramilitary Forces
#### Developed by Team USHARP for Smart India Hackathon (SIH) 2026 | Problem Statement PS26186

<div align="center">

[![SIH 2026](https://img.shields.io/badge/SIH-2026-orange?style=for-the-badge&logo=target)](https://www.sih.gov.in/)
[![Problem Statement](https://img.shields.io/badge/Problem%20Statement-PS26186-blue?style=for-the-badge)](https://www.sih.gov.in/)
[![Ministry](https://img.shields.io/badge/Ministry-Home%20Affairs%20%2F%20CRPF-red?style=for-the-badge)](https://www.mha.gov.in/)
[![Team](https://img.shields.io/badge/Team-USHARP-brightgreen?style=for-the-badge)](#-team-usharp)
[![Python](https://img.shields.io/badge/Python-3.10%20--%203.14-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Smart India Hackathon 2026 Project Overview

| Details | Description |
| :--- | :--- |
| **Hackathon** | **Smart India Hackathon (SIH) 2026** |
| **Problem Statement ID** | **PS26186** |
| **Organization / Ministry** | **Ministry of Home Affairs (MHA)** / **Central Reserve Police Force (CRPF)** |
| **Category** | Software Edition |
| **Theme** | Security & Defense / Healthcare & Welfare Automation |
| **Team Name** | **Team USHARP** |
| **Project Title** | **PRAHARI (प्रहारी)** — Proactive Soldier Welfare & Rest Balancing System |

---

## 🌍 The Challenge: Understanding What Our Jawans Face

Soldiers in India's paramilitary forces (CRPF, BSF, ITBP, CISF, SSB) serve in some of the most challenging conditions on earth — from dense remote jungles and high-altitude mountain posts to round-the-clock counter-insurgency operations.

While they are physically tough and well-trained, everyday human friction often takes a quiet toll:

1. **Delayed Emergency Leave**: When an urgent family crisis happens back home, paperwork and manual approvals can take days or weeks. This delay causes intense worry and helplessness.
2. **Exhausting Duty Shifts**: Long night guard duties, irregular sleep cycles, and lack of continuous rest lead to cumulative physical and mental exhaustion.
3. **Fear of Speaking Up**: Troops often avoid reporting personal stress because they worry about being judged, facing stigma, losing their weapons, or hurting their promotion chances.
4. **Existing Systems Are Reactive**: Traditional administrative portals only record information after an incident or casualty happens. What our troops need is proactive care before exhaustion sets in.

---

## 💡 The Solution: How PRAHARI Helps

**PRAHARI** is designed with a simple, human-first philosophy: **take care of the soldier's practical problems first, protect their privacy completely, and ensure they get adequate rest.**

Instead of treating soldiers like numbers, PRAHARI works across two supportive pillars:

* **Pillar 1 — Fast Support for Everyday Needs (Primary Line of Defense)**:
  Urgent leave requests (such as family medical emergencies) are put on a guaranteed **72-hour priority countdown**. If an emergency request is stuck, the system gently escalates it up the chain of command so no soldier is left waiting in silence.

* **Pillar 2 — Fair Rest Balancing & Early Relief (Safety Net)**:
  PRAHARI monitors duty rosters and consecutive night shifts to spot fatigue early. When a soldier is overworked, it automatically suggests safe, fair duty swaps with well-rested peers — making sure perimeter security stays 100% intact while giving exhausted soldiers the sleep they need.

---

## 🏛️ System Architecture

PRAHARI connects soldiers in the field, welfare officers, and company commanders through a safe and easy-to-use flow:

```mermaid
flowchart TB
    subgraph FieldAccess["📡 Field Access (Works Anywhere)"]
        A1["📱 Smartphone App (Offline-Ready)"]
        A2["📞 Basic 2G Phone (Keypad / IVR Call)"]
        A3["💾 Pen-Drive Sync (For Zero-Network Outposts)"]
    end

    subgraph PrivacyShield["🛡️ Soldier Privacy Shield"]
        B1["Secure Web Gateway"]
        B2["Strict Role Separation\n(Commanders only see duty rest — never private health info)"]
    end

    subgraph CorePlatform["⚙️ PRAHARI Core Engine"]
        C1["📋 72-Hour Fast-Track Leave Resolver"]
        C2["⚖️ Smart Duty Swap Optimizer"]
        C3["🧠 Fatigue & Readiness Assessment"]
        C4["🔗 Secure, Tamper-Proof Audit Log"]
    end

    subgraph Roles["👥 Clear, Simple Dashboards"]
        D1["🎖️ Company Commander Dashboard\n(Roster readiness & fatigue alerts only)"]
        D2["🩺 Welfare Officer Console\n(Confidential support & case assistance)"]
    end

    FieldAccess --> PrivacyShield
    PrivacyShield --> CorePlatform
    CorePlatform --> D1
    CorePlatform --> D2
```

---

## 🥊 Why PRAHARI? (Comparison with Traditional Portals)

| Everyday Need | Traditional HRMS Portals | PRAHARI (Team USHARP) |
| :--- | :--- | :--- |
| **Handling Emergency Leave** | Slow manual paperwork with no guaranteed time limit | **Guaranteed 72-Hour fast-track with automatic alerts** |
| **Soldier Privacy & Dignity** | Personal mental health labels can cause stigma | **Strict privacy firewall: Commanders only see rest and fatigue status** |
| **Shift Swapping** | Done manually, often causing unfair workloads | **Smart swap helper that matches equal skills and guarantees 8 hours of rest** |
| **Record Security & Auditing** | Standard database records vulnerable to silent editing | **Cryptographic SHA-256 hash chaining: Any tampering is immediately detectable through verification** |
| **Poor / Zero Internet Areas** | Apps stop working without high-speed internet | **Works on 2G keypad phones, offline mobile apps, and USB drives** |

---

## ✨ Key Features Explained in Simple Terms

### 1. 📋 72-Hour Emergency Leave Fast-Lane
When a soldier applies for leave due to a family medical emergency, PRAHARI starts an automated 72-hour countdown timer. If no action is taken, the system gently escalates the request to higher welfare authorities. This ensures no urgent request is lost in red tape.

### 2. 🛡️ 100% Confidentiality & Stigma-Free Design
Under Section 21 of the Mental Healthcare Act 2017, a soldier's personal well-being is private. PRAHARI ensures company commanders only see operational fatigue tags (like *"Needs Rest Rotation"* or *"Rest Compliant"*). Sensitive personal details remain strictly confidential between the soldier and the welfare counselor.

### 3. ⚖️ Smart Duty Swap Optimizer
When a soldier has worked multiple night watches in a row, PRAHARI suggests fair duty swaps. Crucially:
* It matches soldiers with identical trades (for example: an Armorer is only swapped with another qualified Armorer).
* It enforces a mandatory **8-hour continuous rest window** before any soldier is assigned back to post.
* Both the field commander and welfare officer review and approve the roster before it goes live.

### 4. 🔗 Tamper-Evident Record Keeping
Every shift change, leave decision, and welfare action is saved in a cryptographically chained digital log (SHA-256). Any tampering is immediately detectable through hash-chain verification. If a formal Court of Inquiry is required, an official, verifiable electronic dossier can be generated with a single click.

### 5. 📡 Multi-Modal Access (Made for Real Paramilitary Conditions)
* **Mobile App (Prahari Bandhu)**: Works completely offline in remote operating bases and syncs automatically when connection returns.
* **Keypad Phone Support (Prahari Vani)**: Troops can dial an automated helpline from any basic 2G feature phone and use simple keypad numbers to check leave or request support.
* **Air-Gap USB Sync**: In high-security or radio-silent areas, welfare reports can be transferred securely using encrypted USB files.

---

## 📸 Application Screenshots & Demos

*(Placeholder slots reserved for Frontend and Mobile client teams to attach interface walkthroughs)*

| Web Command Console (Next.js) | Soldier Field App (Prahari Bandhu Mobile) |
| :---: | :---: |
| **Company Commander Rest & Fatigue Roster**<br><br>*(Screenshot to be uploaded by Frontend Team)*<br><br> | **Trooper Home & Emergency Leave Portal**<br><br>*(Screenshot to be uploaded by Mobile App Team)*<br><br> |
| **Welfare Officer Confidential Casework & 72h SLA**<br><br>*(Screenshot to be uploaded by Frontend Team)*<br><br> | **Offline Mode & Tactical Base Sync**<br><br>*(Screenshot to be uploaded by Mobile App Team)*<br><br> |
| **Unit Resilience Optimizer (Smart Duty Swaps)**<br><br>*(Screenshot to be uploaded by Frontend Team)*<br><br> | **Prahari Vani (2G Keypad Phone Interface)**<br><br>*(Screenshot to be uploaded by Mobile App Team)*<br><br> |

---

## 🛠️ Technology Stack

* **Backend API**: Python 3.10+ with FastAPI (fast, lightweight, and modern)
* **Database**: SQLite (local, instant setup) / PostgreSQL (production scalable)
* **Intelligent Optimization**: SciPy & Scikit-Learn (smart, fair shift swapping)
* **Security & Verification**: SHA-256 cryptographic hash chaining, JWT token authentication
* **Reports**: Automated PDF generation with verification QR codes
* **Clients**: Next.js Web Console, Offline Progressive Web App (PWA), 2G Keypad IVR

---

## 📂 Project Structure

```
PRAHARI/
├── backend/
│   ├── middleware/        # User roles, security checks, and audit logging
│   ├── ml/                # Duty swap optimizer and fatigue models
│   ├── models/            # Database tables (Personnel, Roster, Grievances, Logs)
│   ├── routers/           # Web API endpoints (Commander, Welfare, Grievance, Admin)
│   ├── schemas/           # Data structures and input validation
│   ├── scripts/           # Seeding scripts (seed_db.py for 202 demo, seed_battalion_1000.py for 1k)
│   ├── services/          # Business logic (72h timer, duty optimizer, offline sync)
│   ├── config.py          # Easy configuration settings
│   ├── database.py        # Database connection setup
│   ├── Dockerfile         # Container setup for production
│   ├── main.py            # Main server entry point
│   ├── requirements.txt   # Python packages list
│   └── .env.example       # Example settings file
│
├── frontend/              # Web Command Console (Collaborator Module)
├── mobile/                # Mobile App for Troops (Collaborator Module)
├── .gitignore             # Git ignore rules
├── LICENSE                # MIT Open Source License
└── README.md              # Project documentation
```

---

## 🚀 Easy Setup Guide (How to Run Locally)

You can set up and explore the backend in just a few minutes:

### Step 1: Clone the Repository
```bash
git clone https://github.com/PravZ-Code/PRAHARI.git
cd PRAHARI/backend
```

### Step 2: Install Required Packages
```bash
pip install -r requirements.txt
```

### Step 3: Set Up Configuration
```bash
cp .env.example .env
```
*(The default configuration is ready to use immediately without any extra setup).*

### Step 4: Populate Sample Demonstration Data
Run the database seed script to populate a realistic demonstration setup:
```bash
python scripts/seed_db.py
```
*Seeds an initial demonstration dataset of **202 personnel across 4 tactical bases** (Srinagar, Sukma, Leh, and Hyderabad), initializes duty rosters, and prepares active welfare cases in ~15 seconds.*

> **Optional (Full-Scale 1,000-Troop Battalion)**:
> If you want to simulate a full battalion of 1,000 troops across 5 tactical formations (including Battalion HQ in New Delhi) with 90 days of longitudinal duty shifts, you can run:
> ```bash
> python scripts/seed_battalion_1000.py
> ```

### Step 5: Start the PRAHARI Server
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 6: Open the Interactive Web API
Open your browser and visit:
* 🌐 **Interactive API Portal (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* 📖 **Alternative API Documentation (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 👥 Team USHARP

Proudly designed and developed with 🇮🇳 for the welfare, resilience, and dignity of our nation's brave paramilitary forces.

| Team Member | Role | Key Contribution |
| :--- | :--- | :--- |
| **Praveen Raj P** | **Team Leader & Backend / AI-ML Lead** | System Architecture, Statutory Privacy Firewall, Backend Services, Optimization Engine |
| **Mohammed Usman** | **QA, Testing & Debugging Lead** | Code Quality, System Debugging, API Validation & Security Testing |
| **Steffy J P** | **Pitch Lead & Presentation Specialist** | Problem Research, Solution Pitching, Presentation Design & User Flow |
| **Hariharan** | **Frontend & UI/UX Lead** | Web Command Console, Tactical Interface Design & Visual Dashboards |
| **Akhila Pynam** | **Mobile Application Developer** | Soldier Mobile App, Offline Data Storage & Field Experience |
| **Ragul N S** | **Mobile Application Developer** | Mobile Client Implementation, Local Sync & Soldier Interface |

---

## 📄 License & Fair Use

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details. Built to align with Ministry of Home Affairs operational welfare guidelines and Section 21 of the Mental Healthcare Act 2017.

---

<div align="center">

**Project PRAHARI — Caring for Those Who Protect Our Nation.**  
*Smart India Hackathon 2026 | Problem Statement PS26186 | Team USHARP*

</div>
