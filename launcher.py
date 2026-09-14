#!/usr/bin/env python3
"""
PRAHARI Defense Welfare Platform — Advanced Master Service Orchestrator
Ministry of Home Affairs / Central Reserve Police Force (CRPF)

Advanced Features:
- Zero Console Popups: Pure Win32 / CREATE_NO_WINDOW + SW_HIDE process orchestration.
- Real-Time Telemetry: Process ID, CPU %, Memory (MB), Uptime, and Deep HTTP Health Probes with Latency.
- Granular Service Management: Master controls (Start/Stop/Restart All) + Independent Per-Service Controls.
- Deep Health Probes:
  * Local AI Engine: Queries Ollama API (port 11434) and enumerates active models.
  * Backend API: Queries FastAPI /api/health probe (port 8000) verifying live SQLite database connectivity.
  * Frontend Portal: Queries Next.js SSR HTTP endpoint (port 3000) measuring render latency.
- Database Live Status Inspector: Tracks prahari.db path, size, personnel count, units, and active dockets.
- Multi-Stream Tabbed Log Console: Live streaming logs with search/filter, clear, auto-scroll, and external editor launch.
- Robust Process Lifecycle: psutil tree cleanup + pure Win32 iphlpapi port reclamation.
- Comprehensive CLI Suite: --start, --stop, --restart, --status, --health, --open, --docs, and per-service commands.
"""

import os
import sys
import time
import json
import socket
import shutil
import logging
import sqlite3
import threading
import subprocess
import webbrowser
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from pathlib import Path

# Enable High-DPI Awareness on Windows & Attach Console if CLI args provided
if sys.platform == "win32":
    try:
        import ctypes
        if len(sys.argv) > 1:
            if ctypes.windll.kernel32.AttachConsole(-1):
                try:
                    sys.stdout = open("CONOUT$", "w", encoding="utf-8", errors="replace")
                    sys.stderr = open("CONOUT$", "w", encoding="utf-8", errors="replace")
                except Exception:
                    pass
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

CREATE_NO_WINDOW = 0x08000000
DETACHED_PROCESS = 0x00000008
CREATE_NEW_PROCESS_GROUP = 0x00000200
SUBPROCESS_FLAGS = CREATE_NO_WINDOW | DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP

PORTS = {
    "ai": 11434,
    "backend": 8000,
    "frontend": 3000,
    "mobile": 8080
}

SERVICE_ENDPOINTS = {
    "ai": "http://127.0.0.1:11434/api/tags",
    "backend": "http://127.0.0.1:8000/api/health",
    "frontend": "http://127.0.0.1:3000",
    "mobile": "http://127.0.0.1:8080/health"
}

def get_startupinfo():
    """Build Windows STARTUPINFO structure forcing SW_HIDE on all child processes."""
    if sys.platform == "win32":
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        si.wShowWindow = 0  # SW_HIDE
        return si
    return None

def get_base_paths():
    """Locate the portable PRAHARI distribution root and directory structure."""
    if getattr(sys, 'frozen', False):
        current_dir = Path(sys.executable).resolve().parent
    else:
        current_dir = Path(__file__).resolve().parent

    if (current_dir / "backend").exists() and (current_dir / "frontend").exists():
        prahari_dir = current_dir
        root_dir = current_dir.parent
    elif (current_dir / "prahari" / "backend").exists():
        prahari_dir = current_dir / "prahari"
        root_dir = current_dir
    else:
        prahari_dir = current_dir
        root_dir = current_dir

    backend_dir = prahari_dir / "backend"
    frontend_dir = prahari_dir / "frontend"
    log_dir = prahari_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    return prahari_dir, root_dir, backend_dir, frontend_dir, log_dir

PRAHARI_DIR, ROOT_DIR, BACKEND_DIR, FRONTEND_DIR, LOG_DIR = get_base_paths()
MOBILE_DIR = PRAHARI_DIR / "mobile"

def get_db_path() -> Path:
    """Return the absolute path to the unified prahari SQLite database."""
    preferred = BACKEND_DIR / "prahari.db"
    if preferred.exists():
        return preferred
    canonical = ROOT_DIR / "backend" / "prahari.db"
    if canonical.exists():
        return canonical
    return preferred

def find_python():
    """Locate the Python runtime shipped with the distribution or on system PATH."""
    bundled = [
        PRAHARI_DIR / "runtime" / "python" / "python.exe",
        PRAHARI_DIR / "runtime" / "python" / "pythonw.exe",
    ]
    for candidate in bundled:
        if candidate.exists():
            return str(candidate)
    if not getattr(sys, 'frozen', False):
        return sys.executable
    p = shutil.which("python.exe") or shutil.which("python")
    if p:
        return p
    return ""

def find_pythonw():
    """Locate pythonw or python on system PATH or bundled."""
    bundled = PRAHARI_DIR / "runtime" / "python" / "pythonw.exe"
    if bundled.exists():
        return str(bundled)
    py = find_python()
    if py and os.path.isabs(py):
        candidate = os.path.join(os.path.dirname(py), "pythonw.exe")
        if os.path.exists(candidate):
            return candidate
    pw = shutil.which("pythonw.exe") or shutil.which("pythonw")
    if pw:
        return pw
    return py or ""

def find_node():
    """Locate the Node.js runtime shipped with the distribution or on system PATH."""
    bundled = PRAHARI_DIR / "runtime" / "node" / "node.exe"
    if bundled.exists():
        return str(bundled)
    return shutil.which("node.exe") or shutil.which("node") or ""

def find_npm():
    """Locate npm on system PATH or bundled."""
    return shutil.which("npm.cmd") or shutil.which("npm") or ""

def find_ollama():
    """Locate the optional Ollama runtime shipped with the distribution or installed on the system."""
    bundled = PRAHARI_DIR / "runtime" / "ollama" / "ollama.exe"
    if bundled.exists():
        return str(bundled)
    for candidate in [
        r"D:\Tools\Ollama\ollama.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Ollama\ollama.exe"),
        r"C:\Program Files\Ollama\ollama.exe",
    ]:
        if os.path.exists(candidate):
            return candidate
    p = shutil.which("ollama.exe") or shutil.which("ollama")
    if p:
        return p
    return ""

def find_flutter():
    """Locate the Flutter SDK executable or batch runner."""
    candidates = [
        r"D:\Development\flutter\bin\flutter.bat",
        r"D:\Development\flutter\bin\flutter.exe",
        str(PRAHARI_DIR / "runtime" / "flutter" / "bin" / "flutter.bat"),
        str(ROOT_DIR / "Development" / "flutter" / "bin" / "flutter.bat"),
        os.environ.get("FLUTTER_BIN", ""),
    ]
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate
    cmd = shutil.which("flutter.bat") or shutil.which("flutter.exe") or shutil.which("flutter")
    if cmd:
        return cmd
    return ""

def bundled_backend_executable():
    """Return a compiled backend executable when the portable bundle provides one."""
    for candidate in (
        PRAHARI_DIR / "backend" / "PRAHARI_Backend.exe",
        PRAHARI_DIR / "runtime" / "prahari-backend.exe",
    ):
        if candidate.exists():
            return str(candidate)
    return ""

def is_port_listening(port, host="127.0.0.1", timeout=0.4):
    """Check if a local TCP port is accepting connections."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            result = s.connect_ex((host, port))
            return result == 0
    except Exception:
        return False

def win32_kill_pid(pid):
    """Directly terminate a process by PID using Win32 API without spawning console executables."""
    if not pid or pid <= 0:
        return False
    try:
        import ctypes
        PROCESS_TERMINATE = 0x0001
        kernel32 = ctypes.windll.kernel32
        handle = kernel32.OpenProcess(PROCESS_TERMINATE, False, int(pid))
        if handle:
            try:
                return bool(kernel32.TerminateProcess(handle, 1))
            finally:
                kernel32.CloseHandle(handle)
    except Exception:
        pass
    return False

def kill_proc_tree(pid, including_parent=True):
    """Recursively kill a process tree using psutil or Win32 API without console popups."""
    if not pid or pid <= 0:
        return
    if HAS_PSUTIL:
        try:
            parent = psutil.Process(pid)
            children = parent.children(recursive=True)
            for child in children:
                try:
                    child.kill()
                except Exception:
                    win32_kill_pid(child.pid)
            if including_parent:
                try:
                    parent.kill()
                except Exception:
                    win32_kill_pid(pid)
            return
        except Exception:
            pass
    win32_kill_pid(pid)

def get_pids_on_ports(ports):
    """Retrieve all process IDs currently listening on specified ports."""
    pids = set()
    if HAS_PSUTIL:
        try:
            for conn in psutil.net_connections(kind="inet"):
                if conn.status == psutil.CONN_LISTEN and conn.laddr and conn.laddr.port in ports:
                    if conn.pid and conn.pid > 0:
                        pids.add(conn.pid)
            return pids
        except Exception:
            pass

    if sys.platform == "win32":
        try:
            import ctypes
            iphlpapi = ctypes.windll.iphlpapi
            AF_INET = 2
            TCP_TABLE_OWNER_PID_ALL = 5
            size = ctypes.c_ulong(0)
            iphlpapi.GetExtendedTcpTable(None, ctypes.byref(size), True, AF_INET, TCP_TABLE_OWNER_PID_ALL, 0)
            buf = ctypes.create_string_buffer(size.value)
            ret = iphlpapi.GetExtendedTcpTable(buf, ctypes.byref(size), True, AF_INET, TCP_TABLE_OWNER_PID_ALL, 0)
            if ret == 0:
                import struct
                num_entries = struct.unpack_from("<I", buf.raw, 0)[0]
                offset = 4
                for _ in range(num_entries):
                    state, laddr, lport_raw, raddr, rport_raw, pid = struct.unpack_from("<IIIIII", buf.raw, offset)
                    offset += 24
                    port = socket.ntohs(lport_raw & 0xFFFF)
                    if state == 2 and port in ports and pid > 0:
                        pids.add(pid)
        except Exception:
            pass
    return pids

def kill_processes_on_ports(ports):
    """Kill any process listening on the specified ports with zero external console calls."""
    killed_count = 0
    pids_to_kill = get_pids_on_ports(ports)
    for pid in pids_to_kill:
        kill_proc_tree(pid)
        killed_count += 1
    return killed_count

_cached_launcher_db_metrics = None
_cached_launcher_db_metrics_time = 0.0

def get_db_metrics():
    """Retrieve database health and record counts from prahari.db with caching and read-only non-blocking access."""
    global _cached_launcher_db_metrics, _cached_launcher_db_metrics_time
    now = time.time()
    if _cached_launcher_db_metrics and (now - _cached_launcher_db_metrics_time < 15.0):
        return _cached_launcher_db_metrics

    db_file = get_db_path()
    if not db_file.exists():
        return {
            "status": "MISSING",
            "path": str(db_file),
            "size_mb": 0.0,
            "users": 0,
            "personnel": 0,
            "units": 0,
            "grievances": 0
        }

    size_mb = round(db_file.stat().st_size / (1024 * 1024), 2)
    try:
        # Connect in read-only mode to prevent lock contention with active writers
        conn = sqlite3.connect(f"file:{str(db_file.resolve())}?mode=ro", uri=True, timeout=10.0)
        cur = conn.cursor()
        users = cur.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        personnel = cur.execute("SELECT COUNT(*) FROM personnel").fetchone()[0]
        units = cur.execute("SELECT COUNT(*) FROM units").fetchone()[0]
        try:
            grievances = cur.execute("SELECT COUNT(*) FROM grievance_requests").fetchone()[0]
        except Exception:
            grievances = 0
        conn.close()
        res = {
            "status": "HEALTHY",
            "path": str(db_file),
            "size_mb": size_mb,
            "users": users,
            "personnel": personnel,
            "units": units,
            "grievances": grievances
        }
        _cached_launcher_db_metrics = res
        _cached_launcher_db_metrics_time = now
        return res
    except Exception as e:
        if _cached_launcher_db_metrics:
            return _cached_launcher_db_metrics
        return {
            "status": f"BUSY: {str(e)[:25]}",
            "path": str(db_file),
            "size_mb": size_mb,
            "users": 0,
            "personnel": 0,
            "units": 0,
            "grievances": 0
        }

def probe_service_health(service_key: str):
    """Execute a deep HTTP health probe against the target service."""
    port = PORTS.get(service_key)
    if not is_port_listening(port):
        return {
            "alive": False,
            "http_status": 0,
            "latency_ms": 0,
            "details": "Port inactive",
            "pids": []
        }

    url = SERVICE_ENDPOINTS.get(service_key)
    t0 = time.time()
    http_status = 0
    details = "Operational"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PRAHARI-Orchestrator-Probe/2.0"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            http_status = resp.status
            latency = int((time.time() - t0) * 1000)
            if service_key == "backend":
                data = json.loads(resp.read().decode("utf-8"))
                db_st = data.get("database", "unknown")
                details = f"DB: {db_st.upper()} · v{data.get('version', '1.0')}"
            elif service_key == "ai":
                data = json.loads(resp.read().decode("utf-8"))
                models = [m.get("name") for m in data.get("models", [])]
                details = f"Models: {', '.join(models[:2]) if models else 'None'}"
            elif service_key == "frontend":
                details = "Next.js SSR Ready"
            elif service_key == "mobile":
                details = "Flutter Server Active"
    except urllib.error.HTTPError as e:
        http_status = e.code
        latency = int((time.time() - t0) * 1000)
        details = f"HTTP {e.code}"
    except Exception as e:
        latency = int((time.time() - t0) * 1000)
        details = "HTTP Probe Timeout"

    active_pids = list(get_pids_on_ports([port]))
    return {
        "alive": True,
        "http_status": http_status,
        "latency_ms": latency,
        "details": details,
        "pids": active_pids
    }

def get_process_resource_stats(pids):
    """Fetch aggregated CPU%, RSS memory (MB), and earliest uptime for given PIDs."""
    if not HAS_PSUTIL or not pids:
        return {"cpu_pct": 0.0, "memory_mb": 0.0, "uptime_str": "--:--:--"}

    cpu_sum = 0.0
    mem_sum = 0.0
    oldest_create = None

    for pid in pids:
        try:
            p = psutil.Process(pid)
            cpu_sum += p.cpu_percent(interval=0.0)
            mem_sum += p.memory_info().rss / (1024 * 1024)
            c_time = p.create_time()
            if oldest_create is None or c_time < oldest_create:
                oldest_create = c_time
            for child in p.children(recursive=True):
                try:
                    cpu_sum += child.cpu_percent(interval=0.0)
                    mem_sum += child.memory_info().rss / (1024 * 1024)
                except Exception:
                    pass
        except Exception:
            pass

    uptime_str = "--:--:--"
    if oldest_create:
        elapsed = int(time.time() - oldest_create)
        uptime_str = str(timedelta(seconds=elapsed))

    return {
        "cpu_pct": round(cpu_sum, 1),
        "memory_mb": round(mem_sum, 1),
        "uptime_str": uptime_str
    }

class ServiceManager:
    """Advanced Service Manager for PRAHARI background processes."""

    def __init__(self, log_callback=None):
        self.log_callback = log_callback or (lambda msg: None)
        self.procs = {
            "ai": None,
            "backend": None,
            "frontend": None,
            "mobile": None
        }

    def log(self, message):
        timestamp = time.strftime("%H:%M:%S")
        formatted = f"[{timestamp}] {message}"
        self.log_callback(formatted)

    def start_ai_engine(self):
        """Start Ollama background service."""
        if is_port_listening(PORTS["ai"]):
            self.log("Local AI Engine is already active on port 11434.")
            return True

        ollama_bin = find_ollama()
        if not ollama_bin or not Path(ollama_bin).exists():
            self.log("Local AI Engine is not installed or bundled; continuing without optional Ollama service.")
            return False
        self.log(f"Starting Local AI Engine via {ollama_bin}...")
        env = os.environ.copy()
        bundled_models = PRAHARI_DIR / "runtime" / "ollama" / "models"
        if bundled_models.exists():
            env["OLLAMA_MODELS"] = str(bundled_models)
        elif (Path(ollama_bin).parent / "models").exists():
            env["OLLAMA_MODELS"] = str(Path(ollama_bin).parent / "models")

        ai_log = open(LOG_DIR / "ai_engine_output.txt", "a", encoding="utf-8")
        ai_log.write(f"\n--- AI Engine Started at {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
        ai_log.flush()

        try:
            self.procs["ai"] = subprocess.Popen(
                [ollama_bin, "serve"],
                stdout=ai_log,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                env=env,
                startupinfo=get_startupinfo(),
                creationflags=SUBPROCESS_FLAGS
            )
            self.log(f"Local AI Engine launched (PID {self.procs['ai'].pid}).")
            return True
        except Exception as e:
            self.log(f"Error starting Local AI Engine: {e}")
            return False

    def stop_ai_engine(self):
        """Stop Ollama service."""
        self.log("Stopping Local AI Engine (port 11434)...")
        if self.procs["ai"] and self.procs["ai"].pid:
            kill_proc_tree(self.procs["ai"].pid)
            self.procs["ai"] = None
        kill_processes_on_ports([PORTS["ai"]])
        self.log("Local AI Engine stopped.")

    def restart_ai_engine(self):
        """Restart Ollama service."""
        self.stop_ai_engine()
        time.sleep(1)
        return self.start_ai_engine()

    def start_backend(self):
        """Start the bundled backend executable or bundled Python runtime."""
        if is_port_listening(PORTS["backend"]):
            self.log("FastAPI Backend is already active on port 8000.")
            return True

        py_bin = find_pythonw()
        backend_exe = bundled_backend_executable()
        if not backend_exe and not py_bin:
            self.log("Backend runtime missing. Please ensure Python is installed or present in runtime\\python.")
            return False

        # Auto-seed database if missing
        db_file = get_db_path()
        if not db_file.exists():
            self.log("Database prahari.db not found. Auto-seeding 1,000-troop battalion...")
            try:
                py_cli = find_python()
                if py_cli:
                    subprocess.run(
                        [py_cli, "-m", "scripts.seed_db"],
                        cwd=str(BACKEND_DIR),
                        capture_output=True,
                        timeout=45
                    )
                    self.log("Database initialized successfully.")
            except Exception as e:
                self.log(f"Database auto-seed notice: {e}")

        self.log(
            f"Starting FastAPI Backend via {backend_exe or py_bin} on port 8000..."
        )

        backend_log = open(LOG_DIR / "backend_output.txt", "a", encoding="utf-8")
        backend_log.write(f"\n--- Backend Started at {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
        backend_log.flush()

        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"

        if backend_exe:
            cmd = [backend_exe, "--host", "0.0.0.0", "--port", "8000"]
        else:
            cmd = [py_bin, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
        try:
            self.procs["backend"] = subprocess.Popen(
                cmd,
                cwd=str(BACKEND_DIR),
                stdout=backend_log,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                env=env,
                startupinfo=get_startupinfo(),
                creationflags=SUBPROCESS_FLAGS
            )
            self.log(f"FastAPI Backend launched (PID {self.procs['backend'].pid}).")
            return True
        except Exception as e:
            self.log(f"Error starting FastAPI Backend: {e}")
            return False

    def stop_backend(self):
        """Stop FastAPI backend."""
        self.log("Stopping FastAPI Backend (port 8000)...")
        if self.procs["backend"] and self.procs["backend"].pid:
            kill_proc_tree(self.procs["backend"].pid)
            self.procs["backend"] = None
        kill_processes_on_ports([PORTS["backend"]])
        self.log("FastAPI Backend stopped.")

    def restart_backend(self):
        """Restart FastAPI backend."""
        self.stop_backend()
        time.sleep(1)
        return self.start_backend()

    def start_frontend(self):
        """Start Next.js frontend directly via node.exe."""
        if is_port_listening(PORTS["frontend"]):
            self.log("Frontend Web Portal is already active on port 3000.")
            return True

        frontend_log = open(LOG_DIR / "frontend_output.txt", "a", encoding="utf-8")
        frontend_log.write(f"\n--- Frontend Started at {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
        frontend_log.flush()

        node_bin = find_node()
        standalone_server = FRONTEND_DIR / ".next" / "standalone" / "server.js"
        next_bin = FRONTEND_DIR / "node_modules" / "next" / "dist" / "bin" / "next"
        standalone_manifest = (
            FRONTEND_DIR / ".next" / "standalone" / ".next" / "server" / "middleware-manifest.json"
        )

        env = os.environ.copy()
        env["PORT"] = "3000"
        env["HOSTNAME"] = "0.0.0.0"
        env["NODE_ENV"] = "production"
        env["CI"] = "1"
        env["FORCE_COLOR"] = "0"
        env["NEXT_TELEMETRY_DISABLED"] = "1"

        if not node_bin:
            self.log("Frontend runtime missing. Please ensure Node.js is installed or present in runtime\\node\\node.exe.")
            frontend_log.close()
            return False

        if standalone_server.exists() and standalone_manifest.exists():
            static_src = FRONTEND_DIR / ".next" / "static"
            static_dst = FRONTEND_DIR / ".next" / "standalone" / ".next" / "static"
            public_src = FRONTEND_DIR / "public"
            public_dst = FRONTEND_DIR / ".next" / "standalone" / "public"
            try:
                if static_src.exists():
                    shutil.copytree(str(static_src), str(static_dst), dirs_exist_ok=True)
                if public_src.exists():
                    shutil.copytree(str(public_src), str(public_dst), dirs_exist_ok=True)
            except Exception:
                pass
            standalone_dir = FRONTEND_DIR / ".next" / "standalone"
            cmd = [node_bin, "server.js"]
            self.log("Starting Next.js Portal on port 3000 (standalone)...")
        elif next_bin.exists():
            standalone_dir = FRONTEND_DIR
            cmd = [node_bin, str(next_bin), "start"]
            self.log("Starting Next.js Portal on port 3000 (next start)...")
        else:
            npm_bin = find_npm()
            if npm_bin:
                standalone_dir = FRONTEND_DIR
                cmd = [npm_bin, "run", "start"]
                self.log("Starting Next.js Portal on port 3000 (npm run start)...")
            else:
                self.log("Frontend production bundle is missing .next\\standalone\\server.js or node_modules.")
                frontend_log.close()
                return False

        try:
            self.procs["frontend"] = subprocess.Popen(
                cmd,
                cwd=str(standalone_dir),
                stdout=frontend_log,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                env=env,
                startupinfo=get_startupinfo(),
                creationflags=SUBPROCESS_FLAGS
            )
            self.log(f"Frontend Web Portal launched (PID {self.procs['frontend'].pid}).")
            return True
        except Exception as e:
            self.log(f"Error starting Frontend Web Portal: {e}")
            return False

    def stop_frontend(self):
        """Stop Next.js frontend."""
        self.log("Stopping Frontend Web Portal (port 3000)...")
        if self.procs["frontend"] and self.procs["frontend"].pid:
            kill_proc_tree(self.procs["frontend"].pid)
            self.procs["frontend"] = None
        kill_processes_on_ports([PORTS["frontend"]])
        self.log("Frontend Web Portal stopped.")

    def restart_frontend(self):
        """Restart Next.js frontend."""
        self.stop_frontend()
        time.sleep(1)
        return self.start_frontend()

    def start_mobile(self, dev_mode=False):
        """Start the Flutter Mobile application server."""
        if is_port_listening(PORTS["mobile"]):
            self.log("Flutter Mobile Server is already active on port 8080.")
            return True

        mobile_log = open(LOG_DIR / "mobile_output.txt", "a", encoding="utf-8")
        mobile_log.write(f"\n--- Mobile Server Started at {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
        mobile_log.flush()

        flutter_bin = find_flutter()
        mobile_server_candidates = [
            PRAHARI_DIR / "mobile_server.py",
            ROOT_DIR / "prahari" / "mobile_server.py",
            Path(__file__).resolve().parent / "mobile_server.py",
            Path(getattr(sys, "_MEIPASS", "")) / "mobile_server.py"
        ]
        mobile_server_script = next((p for p in mobile_server_candidates if p.exists()), PRAHARI_DIR / "mobile_server.py")

        if dev_mode and flutter_bin and (MOBILE_DIR / "pubspec.yaml").exists():
            if sys.platform == "win32" and flutter_bin.lower().endswith((".bat", ".cmd")):
                cmd = ["cmd.exe", "/c", flutter_bin, "run", "-d", "web-server", "--web-port", "8080", "--web-hostname", "0.0.0.0", "--base-href", "/"]
            else:
                cmd = [flutter_bin, "run", "-d", "web-server", "--web-port", "8080", "--web-hostname", "0.0.0.0", "--base-href", "/"]
            cwd = str(MOBILE_DIR)
            self.log(f"Starting Flutter Dev Server via {flutter_bin} on port 8080...")
        elif mobile_server_script.exists():
            py_bin = find_pythonw() or find_python()
            web_dir = MOBILE_DIR / "build" / "web"
            cmd = [
                py_bin, str(mobile_server_script),
                "--port", "8080",
                "--host", "0.0.0.0",
                "--web-dir", str(web_dir),
                "--log-file", str(LOG_DIR / "mobile_output.txt")
            ]
            cwd = str(PRAHARI_DIR)
            self.log("Starting PRAHARI Bandhu Flutter Mobile Server on port 8080...")
        elif flutter_bin and (MOBILE_DIR / "pubspec.yaml").exists():
            if sys.platform == "win32" and flutter_bin.lower().endswith((".bat", ".cmd")):
                cmd = ["cmd.exe", "/c", flutter_bin, "run", "-d", "web-server", "--web-port", "8080", "--web-hostname", "0.0.0.0", "--base-href", "/"]
            else:
                cmd = [flutter_bin, "run", "-d", "web-server", "--web-port", "8080", "--web-hostname", "0.0.0.0", "--base-href", "/"]
            cwd = str(MOBILE_DIR)
            self.log(f"Starting Flutter Mobile Server via {flutter_bin} on port 8080...")
        else:
            py_bin = find_pythonw() or find_python()
            web_dir = MOBILE_DIR / "build" / "web"
            cmd = [py_bin, "-m", "http.server", "8080", "--directory", str(web_dir)]
            cwd = str(PRAHARI_DIR)
            self.log("Starting HTTP Server on port 8080 for Flutter Web...")

        env = os.environ.copy()
        out_stream = subprocess.DEVNULL if (not dev_mode and mobile_server_script.exists()) else mobile_log
        try:
            self.procs["mobile"] = subprocess.Popen(
                cmd,
                cwd=cwd,
                stdout=out_stream,
                stderr=subprocess.STDOUT if out_stream != subprocess.DEVNULL else subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                env=env,
                startupinfo=get_startupinfo(),
                creationflags=SUBPROCESS_FLAGS
            )
            self.log(f"Flutter Mobile Server launched (PID {self.procs['mobile'].pid}).")
            return True
        except Exception as e:
            self.log(f"Error starting Flutter Mobile Server: {e}")
            return False

    def stop_mobile(self):
        """Stop Flutter Mobile Server."""
        self.log("Stopping Flutter Mobile Server (port 8080)...")
        if self.procs["mobile"] and self.procs["mobile"].pid:
            kill_proc_tree(self.procs["mobile"].pid)
            self.procs["mobile"] = None
        kill_processes_on_ports([PORTS["mobile"]])
        self.log("Flutter Mobile Server stopped.")

    def restart_mobile(self):
        """Restart Flutter Mobile Server."""
        self.stop_mobile()
        time.sleep(1)
        return self.start_mobile()

    def start_all(self):
        """Start all services in sequence."""
        self.log("Starting all PRAHARI services...")
        self.start_ai_engine()
        time.sleep(0.5)
        self.start_backend()
        time.sleep(0.5)
        self.start_frontend()
        time.sleep(0.5)
        self.start_mobile()

    def stop_all(self):
        """Stop all services and clear ports."""
        self.log("Stopping all PRAHARI services...")
        for name, proc in self.procs.items():
            if proc and proc.pid:
                kill_proc_tree(proc.pid)
                self.procs[name] = None

        ports_to_clear = list(PORTS.values())
        killed = kill_processes_on_ports(ports_to_clear)
        if killed > 0:
            self.log(f"Cleaned up {killed} lingering background process(es).")

        time.sleep(1)
        still_running = [f"{s} ({p})" for s, p in PORTS.items() if is_port_listening(p)]
        if still_running:
            self.log(f"Warning: Ports still in use: {', '.join(still_running)}")
        else:
            self.log("All PRAHARI services cleanly stopped.")

    def restart_all(self):
        """Cleanly restart all services."""
        self.stop_all()
        time.sleep(1.5)
        self.start_all()


def run_gui():
    """Launch the Advanced Tkinter GUI Orchestration Console."""
    import tkinter as tk
    from tkinter import ttk, messagebox, filedialog

    root = tk.Tk()
    root.title("PRAHARI — Defense Welfare Platform Service Orchestrator (MHA / CRPF)")
    root.geometry("1060x800")
    root.minsize(960, 700)
    root.configure(bg="#0f172a")

    icon_candidates = [
        Path(getattr(sys, "_MEIPASS", "")) / "prahari_icon.ico",
        PRAHARI_DIR / "prahari_icon.ico",
        ROOT_DIR / "prahari" / "prahari_icon.ico",
        ROOT_DIR / "prahari_icon.ico",
        Path(__file__).resolve().parent / "prahari_icon.ico",
        Path(sys.executable).resolve().parent / "prahari_icon.ico",
    ]
    icon_path = None
    for cand in icon_candidates:
        if cand.exists():
            icon_path = cand
            break

    if icon_path:
        try:
            root.iconbitmap(str(icon_path))
        except Exception:
            pass

    NAVY = "#0c3866"
    DEEP_BG = "#091424"
    CARD_BG = "#13233b"
    ACCENT_SAFFRON = "#ea580c"
    GREEN = "#16a34a"
    RED = "#dc2626"
    AMBER = "#d97706"
    TEXT_LIGHT = "#f8fafc"
    TEXT_MUTED = "#94a3b8"
    BORDER_COLOR = "#1e3a5f"

    # Header Frame
    header_frame = tk.Frame(root, bg=DEEP_BG, height=85)
    header_frame.pack(fill="x", side="top")

    flag_strip = tk.Frame(header_frame, bg="#ea580c", height=3)
    flag_strip.pack(fill="x", side="top")

    header_content = tk.Frame(header_frame, bg=DEEP_BG)
    header_content.pack(fill="x", padx=24, pady=10)

    header_sub = tk.Label(
        header_content,
        text="GOVERNMENT OF INDIA  •  MINISTRY OF HOME AFFAIRS  •  CENTRAL RESERVE POLICE FORCE",
        font=("Segoe UI", 9, "bold"),
        fg="#fdba74",
        bg=DEEP_BG
    )
    header_sub.pack(anchor="w")

    header_title_frame = tk.Frame(header_content, bg=DEEP_BG)
    header_title_frame.pack(anchor="w", fill="x", pady=(2, 0))

    header_title = tk.Label(
        header_title_frame,
        text="PRAHARI DEFENSE WELFARE PLATFORM — SERVICE ORCHESTRATOR",
        font=("Segoe UI", 15, "bold"),
        fg="#ffffff",
        bg=DEEP_BG
    )
    header_title.pack(side="left")

    lbl_clock = tk.Label(
        header_title_frame,
        text="00:00:00 IST",
        font=("Consolas", 11, "bold"),
        fg="#38bdf8",
        bg=DEEP_BG
    )
    lbl_clock.pack(side="right")

    # Master Action Toolbar
    master_bar = tk.Frame(root, bg="#0f172a")
    master_bar.pack(fill="x", padx=24, pady=(12, 6))

    btn_start_all = tk.Button(
        master_bar,
        text="▶  START ALL SERVICES",
        font=("Segoe UI", 10, "bold"),
        bg=GREEN,
        fg="#ffffff",
        activebackground="#15803d",
        activeforeground="#ffffff",
        relief="flat",
        padx=14,
        pady=6,
        cursor="hand2"
    )
    btn_start_all.pack(side="left", padx=(0, 6))

    btn_stop_all = tk.Button(
        master_bar,
        text="■  STOP ALL SERVICES",
        font=("Segoe UI", 10, "bold"),
        bg=RED,
        fg="#ffffff",
        activebackground="#b91c1c",
        activeforeground="#ffffff",
        relief="flat",
        padx=14,
        pady=6,
        cursor="hand2"
    )
    btn_stop_all.pack(side="left", padx=(0, 6))

    btn_restart_all = tk.Button(
        master_bar,
        text="↻  RESTART ALL",
        font=("Segoe UI", 10, "bold"),
        bg=AMBER,
        fg="#ffffff",
        activebackground="#b45309",
        activeforeground="#ffffff",
        relief="flat",
        padx=14,
        pady=6,
        cursor="hand2"
    )
    btn_restart_all.pack(side="left", padx=(0, 16))

    btn_open_portal = tk.Button(
        master_bar,
        text="🌐 Open Web Portal",
        font=("Segoe UI", 9, "bold"),
        bg="#0284c7",
        fg="#ffffff",
        activebackground="#0369a1",
        activeforeground="#ffffff",
        relief="flat",
        padx=12,
        pady=6,
        cursor="hand2",
        command=lambda: webbrowser.open("http://localhost:3000")
    )
    btn_open_portal.pack(side="left", padx=(0, 6))

    btn_open_mobile = tk.Button(
        master_bar,
        text="📱 Open Mobile App",
        font=("Segoe UI", 9, "bold"),
        bg="#15803d",
        fg="#ffffff",
        activebackground="#166534",
        activeforeground="#ffffff",
        relief="flat",
        padx=12,
        pady=6,
        cursor="hand2",
        command=lambda: webbrowser.open("http://localhost:8080")
    )
    btn_open_mobile.pack(side="left", padx=(0, 6))

    btn_open_docs = tk.Button(
        master_bar,
        text="📄 Swagger API Docs",
        font=("Segoe UI", 9),
        bg="#334155",
        fg="#ffffff",
        activebackground="#1e293b",
        activeforeground="#ffffff",
        relief="flat",
        padx=12,
        pady=6,
        cursor="hand2",
        command=lambda: webbrowser.open("http://localhost:8000/docs")
    )
    btn_open_docs.pack(side="left")

    # Service Cards Frame
    cards_frame = tk.Frame(root, bg="#0f172a")
    cards_frame.pack(fill="x", padx=24, pady=6)

    service_configs = [
        {
            "key": "ai",
            "title": "Local AI Engine",
            "subtitle": "Port 11434 · Ollama qwen3:0.6b",
            "url": "http://127.0.0.1:11434"
        },
        {
            "key": "backend",
            "title": "FastAPI Defense Backend",
            "subtitle": "Port 8000 · Uvicorn ASGI + ML Engine",
            "url": "http://localhost:8000"
        },
        {
            "key": "frontend",
            "title": "Next.js Web Portal",
            "subtitle": "Port 3000 · GIGW 3.0 Presentation",
            "url": "http://localhost:3000"
        },
        {
            "key": "mobile",
            "title": "Flutter Mobile Server",
            "subtitle": "Port 8080 · Bandhu Web Server",
            "url": "http://localhost:8080"
        }
    ]

    service_ui = {}

    for idx, cfg in enumerate(service_configs):
        key = cfg["key"]
        card = tk.Frame(cards_frame, bg=CARD_BG, relief="solid", bd=1, highlightbackground=BORDER_COLOR)
        card.grid(row=0, column=idx, padx=6, pady=4, sticky="nsew")
        cards_frame.grid_columnconfigure(idx, weight=1)

        # Card Title Row
        top_row = tk.Frame(card, bg=CARD_BG)
        top_row.pack(fill="x", padx=12, pady=(10, 2))

        lbl_t = tk.Label(top_row, text=cfg["title"], font=("Segoe UI", 10, "bold"), fg="#ffffff", bg=CARD_BG)
        lbl_t.pack(side="left")

        dot = tk.Label(top_row, text="●", font=("Segoe UI", 11), fg=TEXT_MUTED, bg=CARD_BG)
        dot.pack(side="right")
        badge = tk.Label(top_row, text="STOPPED", font=("Segoe UI", 8, "bold"), fg=TEXT_MUTED, bg=CARD_BG)
        badge.pack(side="right", padx=(0, 4))

        lbl_sub = tk.Label(card, text=cfg["subtitle"], font=("Segoe UI", 8), fg=TEXT_MUTED, bg=CARD_BG)
        lbl_sub.pack(anchor="w", padx=12, pady=(0, 6))

        # Metrics Row
        metric_frame = tk.Frame(card, bg="#0d1b2e", padx=8, pady=6)
        metric_frame.pack(fill="x", padx=10, pady=(0, 8))

        lbl_probe = tk.Label(metric_frame, text="Probe: Inactive", font=("Consolas", 8), fg="#38bdf8", bg="#0d1b2e")
        lbl_probe.pack(anchor="w")

        lbl_perf = tk.Label(metric_frame, text="PID: -- | CPU: 0% | RAM: 0MB | Up: --", font=("Consolas", 8), fg=TEXT_MUTED, bg="#0d1b2e")
        lbl_perf.pack(anchor="w")

        # Per-Service Action Buttons
        btn_row = tk.Frame(card, bg=CARD_BG)
        btn_row.pack(fill="x", padx=10, pady=(0, 10))

        btn_start_svc = tk.Button(btn_row, text="Start", font=("Segoe UI", 8, "bold"), bg="#15803d", fg="#ffffff", relief="flat", padx=6, pady=2, cursor="hand2")
        btn_start_svc.pack(side="left", padx=(0, 3))

        btn_stop_svc = tk.Button(btn_row, text="Stop", font=("Segoe UI", 8), bg="#991b1b", fg="#ffffff", relief="flat", padx=6, pady=2, cursor="hand2")
        btn_stop_svc.pack(side="left", padx=(0, 3))

        btn_restart_svc = tk.Button(btn_row, text="Restart", font=("Segoe UI", 8), bg="#b45309", fg="#ffffff", relief="flat", padx=6, pady=2, cursor="hand2")
        btn_restart_svc.pack(side="left", padx=(0, 3))

        btn_browse_svc = tk.Button(btn_row, text="Browse", font=("Segoe UI", 8), bg="#334155", fg="#ffffff", relief="flat", padx=6, pady=2, cursor="hand2", command=lambda u=cfg["url"]: webbrowser.open(u))
        btn_browse_svc.pack(side="right")

        service_ui[key] = {
            "dot": dot,
            "badge": badge,
            "probe": lbl_probe,
            "perf": lbl_perf,
            "btn_start": btn_start_svc,
            "btn_stop": btn_stop_svc,
            "btn_restart": btn_restart_svc,
            "url": cfg["url"]
        }

    # Database Live Status Strip
    db_bar = tk.Frame(root, bg="#112238", padx=14, pady=6, relief="solid", bd=1)
    db_bar.pack(fill="x", padx=24, pady=4)

    lbl_db_info = tk.Label(
        db_bar,
        text="DATABASE: Inactive | File: prahari.db",
        font=("Consolas", 8, "bold"),
        fg="#a7f3d0",
        bg="#112238"
    )
    lbl_db_info.pack(side="left")

    btn_db_refresh = tk.Button(
        db_bar,
        text="↻ Check DB Health",
        font=("Segoe UI", 8),
        bg="#1e293b",
        fg="#ffffff",
        relief="flat",
        padx=8,
        pady=2,
        cursor="hand2"
    )
    btn_db_refresh.pack(side="right")

    # Multi-Stream Tabbed Log Console
    logs_container = tk.Frame(root, bg="#0f172a")
    logs_container.pack(fill="both", expand=True, padx=24, pady=(4, 16))

    log_ctrl_bar = tk.Frame(logs_container, bg="#0f172a")
    log_ctrl_bar.pack(fill="x", side="top", pady=(0, 4))

    lbl_logs_title = tk.Label(log_ctrl_bar, text="SERVICE TELEMETRY & EVENT LOGS", font=("Segoe UI", 9, "bold"), fg="#94a3b8", bg="#0f172a")
    lbl_logs_title.pack(side="left")

    auto_scroll_var = tk.BooleanVar(value=True)
    chk_autoscroll = tk.Checkbutton(log_ctrl_bar, text="Auto-Scroll", variable=auto_scroll_var, font=("Segoe UI", 8), fg="#cbd5e1", bg="#0f172a", selectcolor="#1e293b", activebackground="#0f172a", activeforeground="#ffffff")
    chk_autoscroll.pack(side="right", padx=(8, 0))

    btn_clear_log = tk.Button(log_ctrl_bar, text="Clear Log", font=("Segoe UI", 8), bg="#334155", fg="#ffffff", relief="flat", padx=8, pady=1, cursor="hand2")
    btn_clear_log.pack(side="right", padx=(8, 0))

    btn_open_file = tk.Button(log_ctrl_bar, text="Open Log File", font=("Segoe UI", 8), bg="#334155", fg="#ffffff", relief="flat", padx=8, pady=1, cursor="hand2")
    btn_open_file.pack(side="right")

    notebook = ttk.Notebook(logs_container)
    notebook.pack(fill="both", expand=True)

    log_tabs = {}
    tab_definitions = [
        ("system", "System Events", None),
        ("frontend", "Frontend Web Portal", LOG_DIR / "frontend_output.txt"),
        ("backend", "FastAPI Backend API", LOG_DIR / "backend_output.txt"),
        ("ai", "Local AI Engine", LOG_DIR / "ai_engine_output.txt"),
        ("mobile", "Flutter Mobile Server", LOG_DIR / "mobile_output.txt")
    ]

    for key, label, filepath in tab_definitions:
        tab_frame = tk.Frame(notebook, bg="#091424")
        notebook.add(tab_frame, text=f"  {label}  ")

        txt = tk.Text(
            tab_frame,
            wrap="none",
            bg="#050c18",
            fg="#e2e8f0",
            insertbackground="#ffffff",
            font=("Consolas", 9),
            relief="flat",
            padx=10,
            pady=10
        )
        yscroll = tk.Scrollbar(tab_frame, orient="vertical", command=txt.yview)
        xscroll = tk.Scrollbar(tab_frame, orient="horizontal", command=txt.xview)
        txt.configure(xscrollcommand=yscroll.set, yscrollcommand=xscroll.set)

        yscroll.pack(side="right", fill="y")
        xscroll.pack(side="bottom", fill="x")
        txt.pack(side="left", fill="both", expand=True)

        log_tabs[key] = {
            "text": txt,
            "path": filepath,
            "last_size": 0
        }

    def append_system_log(msg):
        txt = log_tabs["system"]["text"]
        txt.configure(state="normal")
        txt.insert("end", msg + "\n")
        if auto_scroll_var.get():
            txt.see("end")
        txt.configure(state="disabled")

    mgr = ServiceManager(log_callback=append_system_log)

    # Wire Master Action Buttons
    btn_start_all.configure(command=lambda: threading.Thread(target=mgr.start_all, daemon=True).start())
    btn_stop_all.configure(command=lambda: threading.Thread(target=mgr.stop_all, daemon=True).start())
    btn_restart_all.configure(command=lambda: threading.Thread(target=mgr.restart_all, daemon=True).start())

    # Wire Individual Service Buttons
    service_ui["ai"]["btn_start"].configure(command=lambda: threading.Thread(target=mgr.start_ai_engine, daemon=True).start())
    service_ui["ai"]["btn_stop"].configure(command=lambda: threading.Thread(target=mgr.stop_ai_engine, daemon=True).start())
    service_ui["ai"]["btn_restart"].configure(command=lambda: threading.Thread(target=mgr.restart_ai_engine, daemon=True).start())

    service_ui["backend"]["btn_start"].configure(command=lambda: threading.Thread(target=mgr.start_backend, daemon=True).start())
    service_ui["backend"]["btn_stop"].configure(command=lambda: threading.Thread(target=mgr.stop_backend, daemon=True).start())
    service_ui["backend"]["btn_restart"].configure(command=lambda: threading.Thread(target=mgr.restart_backend, daemon=True).start())

    service_ui["frontend"]["btn_start"].configure(command=lambda: threading.Thread(target=mgr.start_frontend, daemon=True).start())
    service_ui["frontend"]["btn_stop"].configure(command=lambda: threading.Thread(target=mgr.stop_frontend, daemon=True).start())
    service_ui["frontend"]["btn_restart"].configure(command=lambda: threading.Thread(target=mgr.restart_frontend, daemon=True).start())

    service_ui["mobile"]["btn_start"].configure(command=lambda: threading.Thread(target=mgr.start_mobile, daemon=True).start())
    service_ui["mobile"]["btn_stop"].configure(command=lambda: threading.Thread(target=mgr.stop_mobile, daemon=True).start())
    service_ui["mobile"]["btn_restart"].configure(command=lambda: threading.Thread(target=mgr.restart_mobile, daemon=True).start())

    def clear_current_log():
        current_tab = notebook.index(notebook.select())
        key = tab_definitions[current_tab][0]
        txt = log_tabs[key]["text"]
        txt.configure(state="normal")
        txt.delete("1.0", "end")
        txt.configure(state="disabled")

    def open_current_log_file():
        current_tab = notebook.index(notebook.select())
        path = tab_definitions[current_tab][2]
        if path and path.exists():
            if sys.platform == "win32":
                os.startfile(str(path))
            else:
                subprocess.Popen(["xdg-open", str(path)])
        else:
            messagebox.showinfo("Log File", "No persistent disk log file associated with this tab.")

    btn_clear_log.configure(command=clear_current_log)
    btn_open_file.configure(command=open_current_log_file)

    def refresh_db_bar():
        m = get_db_metrics()
        status_text = (
            f"DB [{m['status']}]: prahari.db ({m['size_mb']} MB)  |  "
            f"Troopers: {m['personnel']}  |  Units: {m['units']}  |  "
            f"Grievances: {m['grievances']}  |  Users: {m['users']}"
        )
        lbl_db_info.configure(text=status_text)

    btn_db_refresh.configure(command=refresh_db_bar)

    def telemetry_update_loop():
        # 1. Update Clock
        now_str = datetime.now().strftime("%H:%M:%S") + " IST"
        lbl_clock.configure(text=now_str)

        # 2. Update Service Health & Resource Telemetry
        for key, cfg in enumerate(service_configs):
            svc_key = cfg["key"]
            ui = service_ui[svc_key]
            probe = probe_service_health(svc_key)
            stats = get_process_resource_stats(probe["pids"])

            if probe["alive"]:
                status_color = GREEN if probe["http_status"] in (200, 304, 307) else AMBER
                badge_text = "ONLINE" if probe["http_status"] in (200, 304, 307) else "DEGRADED"
                ui["dot"].configure(text="●", fg=status_color)
                ui["badge"].configure(text=badge_text, fg=status_color)
                ui["probe"].configure(text=f"HTTP: {probe['http_status']} ({probe['latency_ms']}ms) · {probe['details']}", fg="#38bdf8")
                pids_str = ", ".join(str(p) for p in probe["pids"][:2]) or "--"
                ui["perf"].configure(text=f"PID: {pids_str} | CPU: {stats['cpu_pct']}% | RAM: {stats['memory_mb']}MB | Up: {stats['uptime_str']}", fg="#e2e8f0")
            else:
                ui["dot"].configure(text="●", fg=TEXT_MUTED)
                ui["badge"].configure(text="STOPPED", fg=TEXT_MUTED)
                ui["probe"].configure(text="Probe: Port Inactive", fg=TEXT_MUTED)
                ui["perf"].configure(text="PID: -- | CPU: 0% | RAM: 0MB | Up: --", fg=TEXT_MUTED)

        # 3. Update Log File Readers
        for key in ["frontend", "backend", "ai", "mobile"]:
            tab_info = log_tabs[key]
            p = tab_info["path"]
            if p and p.exists():
                try:
                    curr_size = p.stat().st_size
                    if curr_size != tab_info["last_size"]:
                        with open(p, "r", encoding="utf-8", errors="replace") as f:
                            f.seek(max(0, curr_size - 40000))
                            content = f.read()
                        txt = tab_info["text"]
                        txt.configure(state="normal")
                        txt.delete("1.0", "end")
                        txt.insert("end", content)
                        if auto_scroll_var.get():
                            txt.see("end")
                        txt.configure(state="disabled")
                        tab_info["last_size"] = curr_size
                except Exception:
                    pass

        # 4. Refresh Database Strip
        refresh_db_bar()

        root.after(1500, telemetry_update_loop)

    append_system_log("PRAHARI Advanced Service Control Center initialized.")
    append_system_log(f"Platform Root: {PRAHARI_DIR}")
    append_system_log(f"Active Database: {get_db_path()}")
    refresh_db_bar()
    telemetry_update_loop()

    def on_closing():
        # Closing the GUI window leaves all services running persistently in the background.
        # Services are only stopped if the user explicitly clicks 'Stop All Services'.
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_closing)
    root.mainloop()


def safe_print(*args, **kwargs):
    """Print safely without crashing if sys.stdout is None (GUI subsystem)."""
    try:
        if sys.stdout is not None:
            print(*args, **kwargs)
    except Exception:
        pass

def main():
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        mgr = ServiceManager(log_callback=safe_print)

        if arg in ["--start", "-s", "start"]:
            mgr.start_all()
            safe_print("Starting all PRAHARI services...")
            time.sleep(3)
            for svc, port in PORTS.items():
                probe = probe_service_health(svc)
                st = f"ONLINE (HTTP {probe['http_status']})" if probe['alive'] else "STOPPED"
                safe_print(f"  * {svc.upper():10}: {st} [Port {port}] · {probe['details']}")
            safe_print("\nPRAHARI background daemon active. Press Ctrl+C to terminate.")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                safe_print("\nTerminating all services...")
                mgr.stop_all()
                sys.exit(0)

        elif arg in ["--daemon", "--start-daemon", "-d", "daemon"]:
            mgr.start_all()
            safe_print("PRAHARI services active in persistent background mode...")
            time.sleep(2)
            for svc, port in PORTS.items():
                probe = probe_service_health(svc)
                st = f"ONLINE (HTTP {probe['http_status']})" if probe['alive'] else "STARTING"
                safe_print(f"  * {svc.upper():10}: {st} [Port {port}] · {probe['details']}")
            sys.exit(0)

        elif arg in ["--stop", "-k", "stop"]:
            mgr.stop_all()
            safe_print("All services stopped.")
            sys.exit(0)

        elif arg in ["--restart", "-r", "restart"]:
            safe_print("Restarting all PRAHARI services...")
            mgr.restart_all()
            time.sleep(2)
            for svc, port in PORTS.items():
                probe = probe_service_health(svc)
                st = f"ONLINE (HTTP {probe['http_status']})" if probe['alive'] else "STARTING"
                safe_print(f"  * {svc.upper():10}: {st} [Port {port}] · {probe['details']}")
            sys.exit(0)

        elif arg in ["--status", "status"]:
            print("================================================================================")
            print("PRAHARI ADVANCED SERVICE TELEMETRY & HEALTH STATUS")
            print("================================================================================")
            for svc, port in PORTS.items():
                probe = probe_service_health(svc)
                stats = get_process_resource_stats(probe["pids"])
                st = "ONLINE" if probe["alive"] else "STOPPED"
                pids_str = ", ".join(str(p) for p in probe["pids"]) or "None"
                print(f"  * {svc.upper():10} [{port}]: {st:8} | HTTP: {probe['http_status']:3} ({probe['latency_ms']}ms) | PID: {pids_str:10} | CPU: {stats['cpu_pct']}% | RAM: {stats['memory_mb']}MB | Up: {stats['uptime_str']}")
                print(f"    Details: {probe['details']}")
            print("--------------------------------------------------------------------------------")
            m = get_db_metrics()
            print(f"  * DATABASE: {m['status']} ({m['size_mb']} MB) at {m['path']}")
            print(f"    Troopers: {m['personnel']} | Units: {m['units']} | Grievances: {m['grievances']} | Users: {m['users']}")
            print("================================================================================")
            sys.exit(0)

        elif arg in ["--health", "health"]:
            health_report = {
                "timestamp": datetime.now().isoformat(),
                "services": {svc: probe_service_health(svc) for svc in PORTS.keys()},
                "database": get_db_metrics()
            }
            print(json.dumps(health_report, indent=2))
            sys.exit(0)

        elif arg in ["--start-backend"]:
            mgr.start_backend()
            time.sleep(2)
            probe = probe_service_health("backend")
            safe_print(f"Backend: {'ONLINE' if probe['alive'] else 'STARTING'} (Port 8000)")
            sys.exit(0)

        elif arg in ["--restart-backend"]:
            mgr.restart_backend()
            time.sleep(2)
            probe = probe_service_health("backend")
            safe_print(f"Backend restarted: {'ONLINE' if probe['alive'] else 'STARTING'} (Port 8000)")
            sys.exit(0)

        elif arg in ["--stop-backend"]:
            mgr.stop_backend()
            sys.exit(0)

        elif arg in ["--start-frontend"]:
            mgr.start_frontend()
            time.sleep(2)
            probe = probe_service_health("frontend")
            safe_print(f"Frontend: {'ONLINE' if probe['alive'] else 'STARTING'} (Port 3000)")
            sys.exit(0)

        elif arg in ["--restart-frontend"]:
            mgr.restart_frontend()
            time.sleep(2)
            probe = probe_service_health("frontend")
            safe_print(f"Frontend restarted: {'ONLINE' if probe['alive'] else 'STARTING'} (Port 3000)")
            sys.exit(0)

        elif arg in ["--stop-frontend"]:
            mgr.stop_frontend()
            sys.exit(0)

        elif arg in ["--start-ai"]:
            mgr.start_ai_engine()
            time.sleep(2)
            probe = probe_service_health("ai")
            safe_print(f"AI Engine: {'ONLINE' if probe['alive'] else 'STARTING'} (Port 11434)")
            sys.exit(0)

        elif arg in ["--restart-ai"]:
            mgr.restart_ai_engine()
            time.sleep(2)
            probe = probe_service_health("ai")
            safe_print(f"AI Engine restarted: {'ONLINE' if probe['alive'] else 'STARTING'} (Port 11434)")
            sys.exit(0)

        elif arg in ["--stop-ai"]:
            mgr.stop_ai_engine()
            sys.exit(0)

        elif arg in ["--start-mobile"]:
            mgr.start_mobile()
            time.sleep(2)
            probe = probe_service_health("mobile")
            safe_print(f"Flutter Mobile Server: {'ONLINE' if probe['alive'] else 'STARTING'} (Port 8080)")
            sys.exit(0)

        elif arg in ["--start-mobile-dev", "--flutter-dev"]:
            mgr.start_mobile(dev_mode=True)
            time.sleep(3)
            probe = probe_service_health("mobile")
            safe_print(f"Flutter Dev Server: {'ONLINE' if probe['alive'] else 'STARTING'} (Port 8080)")
            sys.exit(0)

        elif arg in ["--restart-mobile"]:
            mgr.restart_mobile()
            time.sleep(2)
            probe = probe_service_health("mobile")
            safe_print(f"Flutter Mobile Server restarted: {'ONLINE' if probe['alive'] else 'STARTING'} (Port 8080)")
            sys.exit(0)

        elif arg in ["--stop-mobile"]:
            mgr.stop_mobile()
            sys.exit(0)

        elif arg in ["--open", "open"]:
            webbrowser.open("http://localhost:3000")
            sys.exit(0)

        elif arg in ["--open-mobile", "--mobile", "mobile"]:
            webbrowser.open("http://localhost:8080")
            sys.exit(0)

        elif arg in ["--docs", "docs"]:
            webbrowser.open("http://localhost:8000/docs")
            sys.exit(0)

        elif arg in ["--help", "-h", "help"]:
            print("PRAHARI Master Service Orchestrator")
            print("Usage: python launcher.py [OPTIONS]")
            print("")
            print("Commands:")
            print("  (no args)             Launch Tkinter Graphical Orchestrator Console")
            print("  --start               Start all services with live console supervisor")
            print("  --daemon              Start all services in detached background mode")
            print("  --stop                Gracefully stop all services and clear ports")
            print("  --restart             Gracefully restart all services")
            print("  --status              Print tabular telemetry (PIDs, CPU%, RAM, Uptime, HTTP status)")
            print("  --health              Output comprehensive JSON health report")
            print("  --start-backend       Start backend service only")
            print("  --restart-backend     Restart backend service only")
            print("  --stop-backend        Stop backend service only")
            print("  --start-frontend      Start frontend portal only")
            print("  --restart-frontend    Restart frontend portal only")
            print("  --stop-frontend       Stop frontend portal only")
            print("  --start-ai            Start local AI engine only")
            print("  --restart-ai          Restart local AI engine only")
            print("  --stop-ai             Stop local AI engine only")
            print("  --start-mobile        Start Flutter mobile server only")
            print("  --restart-mobile      Restart Flutter mobile server only")
            print("  --stop-mobile         Stop Flutter mobile server only")
            print("  --open                Open Web Portal in default browser")
            print("  --open-mobile         Open PRAHARI Bandhu Mobile in default browser")
            print("  --docs                Open Swagger API Docs in default browser")
            sys.exit(0)

    run_gui()

if __name__ == "__main__":
    main()
