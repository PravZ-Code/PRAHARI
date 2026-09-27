# 📱 PRAHARI Bandhu — Frontline Personnel Mobile Client

> **Frontline Mobile Application for Central Armed Police Forces (CRPF, BSF, ITBP, CISF, SSB)**  
> Built with **Flutter 3.47 / Dart** • Offline-First Architecture • Strict MHCA 2017 §21 Privacy Fence

---

## 🧭 Purpose & Governing Principle

The **PRAHARI Bandhu** mobile client is designed strictly around the frontline soldier-centric governing rule:
> *The app exists so a soldier can ask for help himself, easily, without being flagged, watched, or judged.*

- **100% Non-Stigmatizing Interface**: Troopers see transparent request statuses and recovery timelines. Numeric stress risk scores, surveillance terms, and clinical labels are strictly barred from the frontline UI.
- **Offline-First Resilience**: Local encrypted SQLite database (`prahari_soldier.db`) caches active duty schedules, requests, and self-assessments with an automatic FIFO sync queue.
- **3-Tap Request Flow**:
  1. **12h Family Crisis Fast-Lane**: High-priority emergency leave with direct countdown tracker.
  2. **Standard Leave & Administrative Grievance**: Transparent 72h SLA with automatic command escalation.
  3. **Confidential Welfare Officer Contact**: 1-tap direct talk without mandatory justification.
- **Voluntary 3-Question Wellbeing Pulse**: Daily voluntary check-in on sleep, workload, and energy routed confidentially to designated Welfare Officers under Section 21 of the Mental Healthcare Act, 2017.
- **Emergency Tele-MANAS SOS**: Persistent direct dial modal to the National Tele-Mental Health Programme (**14416**) and the 24/7 Battalion Welfare Desk.
- **Trilingual Localization**: Complete native interface support for English, Hindi (हिन्दी), and Tamil (தமிழ்).

---

## 🧪 Verification & Automated Testing

The mobile application is fully verified through automated unit and widget test suites:

| Suite | Tests | Result | Status |
| :--- | :---: | :---: | :---: |
| **Data Models & Serialization** | 4 | 4 / 4 | ✅ Passed |
| **Local Storage & Encrypted PIN Cache** | 3 | 3 / 3 | ✅ Passed |
| **FIFO Synchronization Queue** | 3 | 3 / 3 | ✅ Passed |
| **UI Widgets & Screen State** | 4 | 4 / 4 | ✅ Passed |
| **Total Automated Tests** | **14** | **14 / 14** | ✅ **100% Passed** |

Static code analysis:
```bash
flutter analyze
# Result: 0 issues found (Clean)
```

---

## 🚀 Running the Mobile Application

### 1. Web Preview Distribution (Port 8080)
The mobile application is pre-compiled into a release web bundle (`build/web`) and served locally via `mobile_server.py` on port 8080:
```powershell
python mobile_server.py
# Available at: http://localhost:8080
```
*Note: Backend CORS explicitly permits `http://localhost:8080` alongside port 3000.*

### 2. Native Android / iOS Emulator
```bash
# Get dependencies
flutter pub get

# Run test suite
flutter test

# Launch on connected emulator
flutter run --dart-define=PRAHARI_API_URL=http://10.0.2.2:8000/api
```

---

## 🔑 Demo Trooper Credentials

- **Constable Rajesh Kumar**: Username `rajesh_kumar` | Service No `CRP-2019-45821` | PIN/Password `demo123`
- **Constable Ankit Sharma**: Username `ankit_sharma` | Service No `CRP-2021-88412` | PIN/Password `demo123`
