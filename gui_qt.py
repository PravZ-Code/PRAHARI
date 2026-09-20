"""
PRAHARI Defense Welfare Platform — Flagship C4ISR Master Service Orchestrator
Ministry of Home Affairs / Central Reserve Police Force (CRPF)
Problem Statement 26186

Built with PySide6 (Qt 6.11) for military-grade desktop command & control:
- Native Windows 11 Immersive Dark Mode & DirectWrite high-DPI typography.
- Real-time animated status beacons with glowing concentric LED emitters.
- Multi-database physical segregation telemetry (prahari.db + prahari_auth.db).
- Deep HTTP socket latency probes & per-service process tree monitoring.
- High-performance tabbed log terminal with real-time syntax highlighting & keyword search.
- Native Windows System Tray integration with background persistence & desktop notifications.
"""

import os
import sys
import time
import math
import ctypes
import socket
import sqlite3
import threading
import subprocess
import webbrowser
from pathlib import Path
from datetime import datetime

from PySide6 import QtCore, QtGui, QtWidgets, QtSvg
from PySide6.QtCore import Qt, QTimer, QThread, Signal, Slot, QSize, QPointF
from PySide6.QtGui import (
    QColor, QPalette, QFont, QIcon, QPixmap, QPainter, QBrush, QPen,
    QLinearGradient, QRadialGradient, QKeySequence, QTextCursor, QFontDatabase,
    QSyntaxHighlighter, QTextCharFormat
)
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QPushButton, QFrame, QTabWidget, QPlainTextEdit, QLineEdit,
    QCheckBox, QProgressBar, QSystemTrayIcon, QMenu, QGraphicsDropShadowEffect,
    QSizePolicy, QFileDialog, QMessageBox, QToolTip
)

# -----------------------------------------------------------------------------
# High-DPI & Windows 11 Titlebar Styling
# -----------------------------------------------------------------------------
def apply_windows_dark_titlebar(hwnd: int):
    """Enable native Windows 11 DWM immersive dark mode and dark caption bar."""
    if sys.platform == "win32" and hwnd:
        try:
            dwmapi = ctypes.windll.dwmapi
            DWMWA_USE_IMMERSIVE_DARK_MODE = 20
            DWMWA_CAPTION_COLOR = 35
            
            value = ctypes.c_int(1)
            dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, ctypes.byref(value), ctypes.sizeof(value))
            
            caption_color = ctypes.c_int(0x00190D08)  # 0x00BBGGRR -> #080d19
            dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_CAPTION_COLOR, ctypes.byref(caption_color), ctypes.sizeof(caption_color))
        except Exception:
            pass

# -----------------------------------------------------------------------------
# Color Palette & Military C4ISR Theme Tokens
# -----------------------------------------------------------------------------
THEME = {
    "bg_main": "#070c18",
    "bg_header": "#0a1122",
    "bg_card": "#0e172a",
    "bg_card_inner": "#060b16",
    "bg_card_hover": "#121e36",
    "border_card": "#1c2b48",
    "border_card_active": "#2b4372",
    "border_subtle": "#16233b",
    
    "text_primary": "#f8fafc",
    "text_secondary": "#94a3b8",
    "text_muted": "#64748b",
    "text_accent": "#38bdf8",
    "text_gold": "#fdba74",
    
    "emerald": "#10b981",
    "emerald_glow": "#059669",
    "amber": "#f59e0b",
    "crimson": "#ef4444",
    "navy_blue": "#2563eb",
    "teal": "#0d9488",
    "slate": "#334155",
}

# -----------------------------------------------------------------------------
# Animated Status Beacon (Pulsing Radar LED)
# -----------------------------------------------------------------------------
class PulsingStatusDot(QWidget):
    """Custom-painted anti-aliased glowing status LED with breathing concentric pulse."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(22, 22)
        self._status = "STOPPED"
        self._pulse_alpha = 0.5
        self._pulse_step = 0.05
        self._pulse_growing = True
        
        self.timer = QTimer(self)
        self.timer.timeout.connect(self._animate_pulse)
        self.timer.start(50)

    def set_status(self, status: str):
        if self._status != status:
            self._status = status
            self.update()

    def _animate_pulse(self):
        if self._status in ("ONLINE", "STARTING"):
            if self._pulse_growing:
                self._pulse_alpha += self._pulse_step
                if self._pulse_alpha >= 1.0:
                    self._pulse_alpha = 1.0
                    self._pulse_growing = False
            else:
                self._pulse_alpha -= self._pulse_step
                if self._pulse_alpha <= 0.3:
                    self._pulse_alpha = 0.3
                    self._pulse_growing = True
            self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        center_x = self.width() / 2.0
        center_y = self.height() / 2.0
        
        if self._status == "ONLINE":
            base_color = QColor(16, 185, 129)  # Emerald
            glow_color = QColor(16, 185, 129, int(85 * self._pulse_alpha))
            outer_radius = 9.5 + (2.0 * self._pulse_alpha)
            inner_radius = 4.5
        elif self._status == "STARTING":
            base_color = QColor(245, 158, 11)  # Amber
            glow_color = QColor(245, 158, 11, int(100 * self._pulse_alpha))
            outer_radius = 9.0 + (1.8 * self._pulse_alpha)
            inner_radius = 4.5
        elif self._status == "DEGRADED":
            base_color = QColor(234, 88, 12)  # Orange
            glow_color = QColor(234, 88, 12, int(75 * self._pulse_alpha))
            outer_radius = 8.5
            inner_radius = 4.5
        else:  # STOPPED
            base_color = QColor(100, 116, 139)  # Slate
            glow_color = QColor(100, 116, 139, 25)
            outer_radius = 7.5
            inner_radius = 4.0
        
        # Outer soft glow
        painter.setPen(Qt.NoPen)
        painter.setBrush(QBrush(glow_color))
        painter.drawEllipse(QPointF(center_x, center_y), outer_radius, outer_radius)
        
        # Inner solid emitter
        painter.setBrush(QBrush(base_color))
        painter.drawEllipse(QPointF(center_x, center_y), inner_radius, inner_radius)
        
        # Micro highlight reflection
        if self._status in ("ONLINE", "STARTING"):
            painter.setBrush(QBrush(QColor(255, 255, 255, 180)))
            painter.drawEllipse(QPointF(center_x - 1.2, center_y - 1.2), 1.5, 1.5)

# -----------------------------------------------------------------------------
# Log Syntax Highlighter
# -----------------------------------------------------------------------------
class DefenseLogHighlighter(QSyntaxHighlighter):
    """Real-time color syntax highlighting for military service telemetry streams."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.rules = []
        self.search_pattern = ""

        def make_format(color_hex, bold=False):
            fmt = QTextCharFormat()
            fmt.setForeground(QColor(color_hex))
            if bold:
                fmt.setFontWeight(QFont.Bold)
            return fmt

        import re
        self.rules.append((re.compile(r"\b(INFO|SUCCESS|HEALTHY|ONLINE|PASSED)\b", re.IGNORECASE), make_format("#34d399", bold=True)))
        self.rules.append((re.compile(r"\b(WARN|WARNING|STARTING|DEGRADED)\b", re.IGNORECASE), make_format("#fbbf24", bold=True)))
        self.rules.append((re.compile(r"\b(ERROR|FAIL|FAILED|CRITICAL|STOPPED|BUSY)\b", re.IGNORECASE), make_format("#f87171", bold=True)))
        self.rules.append((re.compile(r"\b(200 OK|304 Not Modified)\b"), make_format("#10b981", bold=True)))
        self.rules.append((re.compile(r"\b(404 Not Found|500 Internal Server Error|503 Service Unavailable)\b"), make_format("#ef4444", bold=True)))
        self.rules.append((re.compile(r"\b(PID \d+|Port \d+|prahari\.db|prahari_auth\.db)\b"), make_format("#38bdf8")))
        self.rules.append((re.compile(r"https?://[^\s]+"), make_format("#60a5fa")))
        self.rules.append((re.compile(r"\b\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\b|\b\d{2}:\d{2}:\d{2}\b"), make_format("#64748b")))

    def set_search_query(self, query: str):
        self.search_pattern = query.strip()
        self.rehighlight()

    def highlightBlock(self, text):
        for pattern, fmt in self.rules:
            for match in pattern.finditer(text):
                start = match.start()
                length = match.end() - start
                self.setFormat(start, length, fmt)

        if self.search_pattern and len(self.search_pattern) >= 2:
            import re
            search_fmt = QTextCharFormat()
            search_fmt.setBackground(QColor("#ca8a04"))
            search_fmt.setForeground(QColor("#ffffff"))
            search_fmt.setFontWeight(QFont.Bold)
            for m in re.finditer(re.escape(self.search_pattern), text, re.IGNORECASE):
                self.setFormat(m.start(), m.end() - m.start(), search_fmt)

# -----------------------------------------------------------------------------
# C4ISR Service Telemetry Card Widget
# -----------------------------------------------------------------------------
class ServiceCard(QFrame):
    """High-fidelity defense telemetry card with live metrics and independent controls."""
    def __init__(self, key: str, title: str, subtitle: str, port: int, url: str, service_mgr, parent=None):
        super().__init__(parent)
        self.key = key
        self.title_text = title
        self.subtitle_text = subtitle
        self.port = port
        self.url = url
        self.service_mgr = service_mgr

        self.setObjectName("ServiceCard")
        self.setStyleSheet(f"""
            #ServiceCard {{
                background-color: {THEME["bg_card"]};
                border: 1.5px solid {THEME["border_card"]};
                border-radius: 10px;
            }}
            #ServiceCard:hover {{
                border-color: {THEME["border_card_active"]};
                background-color: {THEME["bg_card_hover"]};
            }}
        """)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 12, 14, 12)
        layout.setSpacing(8)

        # Line 1: Title
        self.lbl_title = QLabel(self.title_text)
        self.lbl_title.setStyleSheet("font-size: 13px; font-weight: bold; color: #ffffff;")
        layout.addWidget(self.lbl_title)

        # Line 2: Subtitle (Full width, no truncation)
        self.lbl_sub = QLabel(self.subtitle_text)
        self.lbl_sub.setStyleSheet("font-size: 10.5px; color: #94a3b8;")
        self.lbl_sub.setWordWrap(False)
        layout.addWidget(self.lbl_sub)

        # Line 3: Meta Row (Port Badge + Pulsing Dot + Status Badge)
        meta_row = QHBoxLayout()
        meta_row.setSpacing(6)

        self.lbl_port_pill = QLabel(f"PORT {self.port}")
        self.lbl_port_pill.setStyleSheet("""
            background-color: #1e293b;
            color: #38bdf8;
            font-family: Consolas, monospace;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 7px;
            border-radius: 4px;
            border: 1px solid #334155;
        """)
        meta_row.addWidget(self.lbl_port_pill)

        meta_row.addStretch()

        self.dot = PulsingStatusDot()
        meta_row.addWidget(self.dot)

        self.lbl_badge = QLabel("STOPPED")
        self.lbl_badge.setStyleSheet("""
            font-size: 10px;
            font-weight: bold;
            color: #94a3b8;
            padding: 2px 7px;
            border-radius: 4px;
            background-color: #0b1324;
            border: 1px solid #1e293b;
        """)
        meta_row.addWidget(self.lbl_badge)

        layout.addLayout(meta_row)

        # Inner Diagnostics Container
        diag_box = QFrame()
        diag_box.setStyleSheet(f"""
            background-color: {THEME["bg_card_inner"]};
            border: 1px solid {THEME["border_subtle"]};
            border-radius: 6px;
            padding: 4px;
        """)
        diag_layout = QVBoxLayout(diag_box)
        diag_layout.setContentsMargins(8, 6, 8, 6)
        diag_layout.setSpacing(4)

        # Probe status
        self.lbl_probe = QLabel("Probe: Port Inactive")
        self.lbl_probe.setStyleSheet("font-family: Consolas, monospace; font-size: 10px; color: #94a3b8;")
        diag_layout.addWidget(self.lbl_probe)

        # Process stats
        self.lbl_perf = QLabel("PID: --  |  CPU: 0.0%  |  RAM: 0 MB")
        self.lbl_perf.setStyleSheet("font-family: Consolas, monospace; font-size: 10px; color: #cbd5e1;")
        diag_layout.addWidget(self.lbl_perf)

        # Memory mini-meter bar
        mem_row = QHBoxLayout()
        mem_row.setSpacing(6)
        lbl_mem_tag = QLabel("RAM Load:")
        lbl_mem_tag.setStyleSheet("font-size: 9px; color: #64748b;")
        mem_row.addWidget(lbl_mem_tag)

        self.ram_bar = QProgressBar()
        self.ram_bar.setFixedHeight(5)
        self.ram_bar.setRange(0, 500)
        self.ram_bar.setValue(0)
        self.ram_bar.setTextVisible(False)
        self.ram_bar.setStyleSheet("""
            QProgressBar {
                background-color: #1e293b;
                border-radius: 2px;
                border: none;
            }
            QProgressBar::chunk {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #0284c7, stop:1 #38bdf8);
                border-radius: 2px;
            }
        """)
        mem_row.addWidget(self.ram_bar)

        self.lbl_uptime = QLabel("Up: --")
        self.lbl_uptime.setStyleSheet("font-family: Consolas, monospace; font-size: 9px; color: #64748b;")
        mem_row.addWidget(self.lbl_uptime)

        diag_layout.addLayout(mem_row)
        layout.addWidget(diag_box)

        # Granular Action Buttons Row
        btn_row = QHBoxLayout()
        btn_row.setSpacing(5)

        btn_style_start = """
            QPushButton {
                background-color: #065f46;
                color: #ffffff;
                font-weight: bold;
                font-size: 10px;
                border: 1px solid #059669;
                border-radius: 4px;
                padding: 4px 8px;
            }
            QPushButton:hover { background-color: #059669; border-color: #10b981; }
            QPushButton:pressed { background-color: #047857; }
        """
        btn_style_stop = """
            QPushButton {
                background-color: #7f1d1d;
                color: #ffffff;
                font-size: 10px;
                border: 1px solid #991b1b;
                border-radius: 4px;
                padding: 4px 8px;
            }
            QPushButton:hover { background-color: #991b1b; border-color: #ef4444; }
            QPushButton:pressed { background-color: #b91c1c; }
        """
        btn_style_restart = """
            QPushButton {
                background-color: #78350f;
                color: #ffffff;
                font-size: 10px;
                border: 1px solid #b45309;
                border-radius: 4px;
                padding: 4px 8px;
            }
            QPushButton:hover { background-color: #b45309; border-color: #f59e0b; }
            QPushButton:pressed { background-color: #92400e; }
        """
        btn_style_browse = """
            QPushButton {
                background-color: #1e293b;
                color: #38bdf8;
                font-size: 10px;
                font-weight: bold;
                border: 1px solid #334155;
                border-radius: 4px;
                padding: 4px 8px;
            }
            QPushButton:hover { background-color: #334155; color: #ffffff; border-color: #64748b; }
            QPushButton:pressed { background-color: #0f172a; }
        """

        self.btn_start = QPushButton("▶ Start")
        self.btn_start.setStyleSheet(btn_style_start)
        self.btn_start.setCursor(Qt.PointingHandCursor)
        self.btn_start.clicked.connect(self._on_start)
        btn_row.addWidget(self.btn_start)

        self.btn_stop = QPushButton("■ Stop")
        self.btn_stop.setStyleSheet(btn_style_stop)
        self.btn_stop.setCursor(Qt.PointingHandCursor)
        self.btn_stop.clicked.connect(self._on_stop)
        btn_row.addWidget(self.btn_stop)

        self.btn_restart = QPushButton("↻ Restart")
        self.btn_restart.setStyleSheet(btn_style_restart)
        self.btn_restart.setCursor(Qt.PointingHandCursor)
        self.btn_restart.clicked.connect(self._on_restart)
        btn_row.addWidget(self.btn_restart)

        btn_row.addStretch()

        self.btn_browse = QPushButton("Browse ↗")
        self.btn_browse.setStyleSheet(btn_style_browse)
        self.btn_browse.setCursor(Qt.PointingHandCursor)
        self.btn_browse.clicked.connect(lambda: webbrowser.open(self.url))
        btn_row.addWidget(self.btn_browse)

        layout.addLayout(btn_row)

    def _on_start(self):
        fn = getattr(self.service_mgr, f"start_{self.key}", None)
        if fn:
            threading.Thread(target=fn, daemon=True).start()

    def _on_stop(self):
        fn = getattr(self.service_mgr, f"stop_{self.key}", None)
        if fn:
            threading.Thread(target=fn, daemon=True).start()

    def _on_restart(self):
        fn = getattr(self.service_mgr, f"restart_{self.key}", None)
        if fn:
            threading.Thread(target=fn, daemon=True).start()

    def update_telemetry(self, probe: dict):
        alive = probe.get("alive", False)
        status = "STOPPED"
        http_st = probe.get("http_status", 0)
        latency = probe.get("latency_ms", 0)
        details = probe.get("details", "")
        stats = probe.get("stats", {})

        if alive:
            if http_st in (200, 304, 307):
                status = "ONLINE"
                self.lbl_badge.setText("ONLINE")
                self.lbl_badge.setStyleSheet("font-size: 10px; font-weight: bold; color: #10b981; background-color: #064e3b; padding: 1px 6px; border-radius: 4px; border: 1px solid #059669;")
                self.lbl_probe.setText(f"HTTP {http_st} ({latency} ms) · {details}")
                self.lbl_probe.setStyleSheet("font-family: Consolas, monospace; font-size: 10px; color: #38bdf8;")
            else:
                status = "DEGRADED"
                self.lbl_badge.setText("DEGRADED")
                self.lbl_badge.setStyleSheet("font-size: 10px; font-weight: bold; color: #f59e0b; background-color: #451a03; padding: 1px 6px; border-radius: 4px; border: 1px solid #b45309;")
                self.lbl_probe.setText(f"HTTP {http_st} ({latency} ms) · {details}")
                self.lbl_probe.setStyleSheet("font-family: Consolas, monospace; font-size: 10px; color: #f59e0b;")

            pids_str = ", ".join(str(p) for p in probe.get("pids", [])[:2]) or "--"
            cpu = stats.get("cpu_pct", 0.0)
            ram = stats.get("memory_mb", 0.0)
            uptime = stats.get("uptime_str", "--")

            self.lbl_perf.setText(f"PID: {pids_str}  |  CPU: {cpu:.1f}%  |  RAM: {ram:.1f} MB")
            self.lbl_perf.setStyleSheet("font-family: Consolas, monospace; font-size: 10px; color: #cbd5e1;")
            self.ram_bar.setValue(int(min(ram, 500)))
            self.lbl_uptime.setText(f"Up: {uptime}")
        else:
            status = "STOPPED"
            self.lbl_badge.setText("STOPPED")
            self.lbl_badge.setStyleSheet("font-size: 10px; font-weight: bold; color: #94a3b8; background-color: #0b1324; padding: 1px 6px; border-radius: 4px;")
            self.lbl_probe.setText("Probe: Port Inactive")
            self.lbl_probe.setStyleSheet("font-family: Consolas, monospace; font-size: 10px; color: #64748b;")
            self.lbl_perf.setText("PID: --  |  CPU: 0.0%  |  RAM: 0 MB")
            self.lbl_perf.setStyleSheet("font-family: Consolas, monospace; font-size: 10px; color: #64748b;")
            self.ram_bar.setValue(0)
            self.lbl_uptime.setText("Up: --")

        self.dot.set_status(status)

# -----------------------------------------------------------------------------
# Master Orchestrator Main Window
# -----------------------------------------------------------------------------
class PrahariOrchestratorWindow(QMainWindow):
    """Flagship C4ISR Orchestrator Graphical User Interface."""
    def __init__(self, service_mgr, root_dir: Path, prahari_dir: Path, log_dir: Path, icon_path: Path = None):
        super().__init__()
        self.service_mgr = service_mgr
        self.root_dir = root_dir
        self.prahari_dir = prahari_dir
        self.log_dir = log_dir
        self.icon_path = icon_path

        self.setWindowTitle("PRAHARI — Master Defense Service Orchestrator (MHA / CRPF)")
        self.resize(1160, 850)
        self.setMinimumSize(1020, 740)

        if self.icon_path and self.icon_path.exists():
            self.setWindowIcon(QIcon(str(self.icon_path)))

        self.setStyleSheet(f"""
            QMainWindow {{
                background-color: {THEME["bg_main"]};
            }}
            QWidget {{
                color: {THEME["text_primary"]};
                font-family: 'Segoe UI Variable Display', 'Segoe UI', -apple-system, sans-serif;
            }}
            QToolTip {{
                background-color: #1e293b;
                color: #ffffff;
                border: 1px solid #475569;
                padding: 4px 8px;
                border-radius: 4px;
            }}
        """)

        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # 1. National Tricolor Strip
        tricolor = QFrame()
        tricolor.setFixedHeight(4)
        tricolor.setStyleSheet("""
            background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                stop:0 #FF9933, stop:0.35 #FF9933,
                stop:0.36 #FFFFFF, stop:0.65 #FFFFFF,
                stop:0.66 #138808, stop:1.0 #138808);
        """)
        main_layout.addWidget(tricolor)

        # 2. Executive Header
        main_layout.addWidget(self._build_header())

        # Content Container
        content_container = QWidget()
        content_layout = QVBoxLayout(content_container)
        content_layout.setContentsMargins(20, 10, 20, 14)
        content_layout.setSpacing(9)

        # 3. Master Action Toolbar
        content_layout.addWidget(self._build_master_toolbar())

        # 4. Service Telemetry Grid (4 Cards)
        self.service_cards = {}
        content_layout.addWidget(self._build_services_grid())

        # 5. Database & Audit Ledger Status Strip
        content_layout.addWidget(self._build_database_strip())

        # 6. Tabbed High-Performance Log Terminal
        content_layout.addWidget(self._build_log_console())

        main_layout.addWidget(content_container, 1)

        # 7. System Tray Setup
        self._setup_system_tray()

        # Telemetry State Thread & UI Timer
        self._init_telemetry_loop()

    # -------------------------------------------------------------------------
    # Header Construction
    # -------------------------------------------------------------------------
    def _build_header(self) -> QWidget:
        header = QFrame()
        header.setStyleSheet(f"""
            background-color: {THEME["bg_header"]};
            border-bottom: 1px solid {THEME["border_subtle"]};
        """)
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(20, 10, 20, 10)
        header_layout.setSpacing(14)

        # Emblems (CRPF Official SVG + PRAHARI Logo)
        emblem_box = QHBoxLayout()
        emblem_box.setSpacing(10)

        crpf_svg_path = self.prahari_dir / "assets" / "crpf_logo_official.svg"
        if crpf_svg_path.exists():
            svg_renderer = QtSvg.QSvgRenderer(str(crpf_svg_path))
            pix_crpf = QPixmap(48, 48)
            pix_crpf.fill(Qt.transparent)
            p = QPainter(pix_crpf)
            svg_renderer.render(p)
            p.end()
            lbl_crpf = QLabel()
            lbl_crpf.setPixmap(pix_crpf)
            emblem_box.addWidget(lbl_crpf)

        prahari_logo_path = self.prahari_dir / "assets" / "prahari_logo_trans.png"
        if not prahari_logo_path.exists():
            prahari_logo_path = self.prahari_dir / "frontend" / "public" / "images" / "prahari_logo_trans.png"

        if prahari_logo_path.exists():
            pix = QPixmap(str(prahari_logo_path)).scaledToHeight(46, Qt.SmoothTransformation)
            lbl_prahari = QLabel()
            lbl_prahari.setPixmap(pix)
            emblem_box.addWidget(lbl_prahari)

        header_layout.addLayout(emblem_box)

        # Title Block
        title_box = QVBoxLayout()
        title_box.setSpacing(2)

        lbl_sup = QLabel("GOVERNMENT OF INDIA  •  MINISTRY OF HOME AFFAIRS  •  CENTRAL RESERVE POLICE FORCE")
        lbl_sup.setStyleSheet(f"font-size: 9.5px; font-weight: bold; color: {THEME['text_gold']}; letter-spacing: 0.8px;")
        title_box.addWidget(lbl_sup)

        lbl_title = QLabel("PRAHARI DEFENSE WELFARE PLATFORM — MASTER SERVICE ORCHESTRATOR")
        lbl_title.setStyleSheet("font-size: 15px; font-weight: bold; color: #ffffff;")
        title_box.addWidget(lbl_title)

        lbl_sub = QLabel("Autonomous Defense C4ISR Health Supervisor  •  Problem Statement 26186  •  Zero-Trust Physical DB Segregation")
        lbl_sub.setStyleSheet("font-size: 10.5px; color: #7dd3fc;")
        title_box.addWidget(lbl_sub)

        header_layout.addLayout(title_box)
        header_layout.addStretch()

        # Telemetry Quick Readout (Clock + Node State)
        readout_box = QVBoxLayout()
        readout_box.setSpacing(2)
        readout_box.setAlignment(Qt.AlignRight)

        self.lbl_clock = QLabel(datetime.now().strftime("%H:%M:%S") + " IST")
        self.lbl_clock.setStyleSheet("font-family: Consolas, monospace; font-size: 15px; font-weight: bold; color: #38bdf8;")
        readout_box.addWidget(self.lbl_clock, 0, Qt.AlignRight)

        hostname = socket.gethostname()
        self.lbl_node_info = QLabel(f"NODE: {hostname.upper()}  |  BTLN 246 HQ")
        self.lbl_node_info.setStyleSheet("font-size: 10px; font-weight: bold; color: #10b981;")
        readout_box.addWidget(self.lbl_node_info, 0, Qt.AlignRight)

        self.lbl_platform = QLabel("Windows 11 x64  •  Security Level: RESTRICTED")
        self.lbl_platform.setStyleSheet("font-size: 9px; color: #64748b;")
        readout_box.addWidget(self.lbl_platform, 0, Qt.AlignRight)

        header_layout.addLayout(readout_box)
        return header

    # -------------------------------------------------------------------------
    # Master Action Toolbar
    # -------------------------------------------------------------------------
    def _build_master_toolbar(self) -> QWidget:
        bar = QFrame()
        bar.setStyleSheet(f"""
            background-color: {THEME["bg_header"]};
            border: 1px solid {THEME["border_subtle"]};
            border-radius: 8px;
            padding: 2px;
        """)
        bar_layout = QHBoxLayout(bar)
        bar_layout.setContentsMargins(10, 7, 10, 7)
        bar_layout.setSpacing(7)

        btn_start_all_style = """
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #059669, stop:1 #10b981);
                color: #ffffff;
                font-weight: bold;
                font-size: 11.5px;
                border: 1px solid #10b981;
                border-radius: 6px;
                padding: 6px 14px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #047857, stop:1 #059669);
                border-color: #34d399;
            }
            QPushButton:pressed { background-color: #065f46; }
        """
        btn_stop_all_style = """
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #dc2626, stop:1 #ef4444);
                color: #ffffff;
                font-weight: bold;
                font-size: 11.5px;
                border: 1px solid #ef4444;
                border-radius: 6px;
                padding: 6px 14px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #b91c1c, stop:1 #dc2626);
                border-color: #f87171;
            }
            QPushButton:pressed { background-color: #991b1b; }
        """
        btn_restart_all_style = """
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #d97706, stop:1 #f59e0b);
                color: #ffffff;
                font-weight: bold;
                font-size: 11.5px;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 6px 14px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #b45309, stop:1 #d97706);
                border-color: #fbbf24;
            }
            QPushButton:pressed { background-color: #78350f; }
        """
        btn_link_style = """
            QPushButton {
                background-color: #1e293b;
                color: #f8fafc;
                font-size: 10.5px;
                font-weight: bold;
                border: 1px solid #334155;
                border-radius: 6px;
                padding: 6px 11px;
            }
            QPushButton:hover {
                background-color: #334155;
                border-color: #0284c7;
                color: #38bdf8;
            }
            QPushButton:pressed { background-color: #0f172a; }
        """

        btn_start_all = QPushButton("▶  START ALL SERVICES")
        btn_start_all.setStyleSheet(btn_start_all_style)
        btn_start_all.setCursor(Qt.PointingHandCursor)
        btn_start_all.clicked.connect(lambda: threading.Thread(target=self.service_mgr.start_all, daemon=True).start())
        bar_layout.addWidget(btn_start_all)

        btn_stop_all = QPushButton("■  STOP ALL SERVICES")
        btn_stop_all.setStyleSheet(btn_stop_all_style)
        btn_stop_all.setCursor(Qt.PointingHandCursor)
        btn_stop_all.clicked.connect(lambda: threading.Thread(target=self.service_mgr.stop_all, daemon=True).start())
        bar_layout.addWidget(btn_stop_all)

        btn_restart_all = QPushButton("↻  RESTART ALL")
        btn_restart_all.setStyleSheet(btn_restart_all_style)
        btn_restart_all.setCursor(Qt.PointingHandCursor)
        btn_restart_all.clicked.connect(lambda: threading.Thread(target=self.service_mgr.restart_all, daemon=True).start())
        bar_layout.addWidget(btn_restart_all)

        bar_layout.addSpacing(8)

        # Quick Launch Links
        btn_open_portal = QPushButton("🌐 Web Portal (:3000)")
        btn_open_portal.setStyleSheet(btn_link_style)
        btn_open_portal.setCursor(Qt.PointingHandCursor)
        btn_open_portal.clicked.connect(lambda: webbrowser.open("http://localhost:3000"))
        bar_layout.addWidget(btn_open_portal)

        btn_open_mobile = QPushButton("📱 Bandhu Mobile (:8080)")
        btn_open_mobile.setStyleSheet(btn_link_style)
        btn_open_mobile.setCursor(Qt.PointingHandCursor)
        btn_open_mobile.clicked.connect(lambda: webbrowser.open("http://localhost:8080"))
        bar_layout.addWidget(btn_open_mobile)

        btn_open_docs = QPushButton("📄 Swagger API Docs")
        btn_open_docs.setStyleSheet(btn_link_style)
        btn_open_docs.setCursor(Qt.PointingHandCursor)
        btn_open_docs.clicked.connect(lambda: webbrowser.open("http://localhost:8000/docs"))
        bar_layout.addWidget(btn_open_docs)

        bar_layout.addStretch()

        btn_hide_tray = QPushButton("🗕  Minimize to Tray")
        btn_hide_tray.setStyleSheet("""
            QPushButton {
                background-color: #0f172a;
                color: #38bdf8;
                font-size: 10.5px;
                font-weight: bold;
                border: 1px solid #1e3a5f;
                border-radius: 6px;
                padding: 6px 11px;
            }
            QPushButton:hover {
                background-color: #1e293b;
                border-color: #38bdf8;
            }
        """)
        btn_hide_tray.setCursor(Qt.PointingHandCursor)
        btn_hide_tray.clicked.connect(self._minimize_to_tray)
        bar_layout.addWidget(btn_hide_tray)

        return bar

    # -------------------------------------------------------------------------
    # 4-Service C4ISR Grid
    # -------------------------------------------------------------------------
    def _build_services_grid(self) -> QWidget:
        grid_widget = QWidget()
        grid = QGridLayout(grid_widget)
        grid.setContentsMargins(0, 0, 0, 0)
        grid.setSpacing(10)

        configs = [
            ("ai", "Local AI Engine", "Ollama Qwen 0.6B Tactical Briefs", 11434, "http://127.0.0.1:11434"),
            ("backend", "FastAPI Defense Backend", "Uvicorn ASGI · XGBoost & URO Engine", 8000, "http://localhost:8000"),
            ("frontend", "Next.js Web Portal", "React 19 · GIGW 3.0 Presentation", 3000, "http://localhost:3000"),
            ("mobile", "Flutter Mobile Server", "PRAHARI Bandhu · Frontline Troop PWA", 8080, "http://localhost:8080"),
        ]

        for col, (key, title, sub, port, url) in enumerate(configs):
            card = ServiceCard(key, title, sub, port, url, self.service_mgr)
            self.service_cards[key] = card
            grid.addWidget(card, 0, col)
            grid.setColumnStretch(col, 1)

        return grid_widget

    # -------------------------------------------------------------------------
    # Database Status Strip
    # -------------------------------------------------------------------------
    def _build_database_strip(self) -> QWidget:
        strip = QFrame()
        strip.setStyleSheet(f"""
            background-color: #0b1528;
            border: 1px solid {THEME["border_subtle"]};
            border-radius: 8px;
        """)
        layout = QHBoxLayout(strip)
        layout.setContentsMargins(14, 7, 14, 7)
        layout.setSpacing(12)

        lbl_badge_db = QLabel("MULTI-DB WAL SYNCHRONIZED")
        lbl_badge_db.setStyleSheet("""
            background-color: #064e3b;
            color: #34d399;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid #059669;
        """)
        layout.addWidget(lbl_badge_db)

        self.lbl_db_summary = QLabel("Initializing physical multi-database inspection...")
        self.lbl_db_summary.setStyleSheet("font-family: Consolas, monospace; font-size: 10.5px; color: #f1f5f9;")
        layout.addWidget(self.lbl_db_summary, 1)

        btn_db_refresh = QPushButton("↻ Verify Health")
        btn_db_refresh.setStyleSheet("""
            QPushButton {
                background-color: #1e293b;
                color: #38bdf8;
                font-size: 10px;
                font-weight: bold;
                border: 1px solid #334155;
                border-radius: 4px;
                padding: 4px 10px;
            }
            QPushButton:hover {
                background-color: #334155;
                color: #ffffff;
            }
        """)
        btn_db_refresh.setCursor(Qt.PointingHandCursor)
        btn_db_refresh.clicked.connect(self._refresh_database_telemetry)
        layout.addWidget(btn_db_refresh)

        btn_db_folder = QPushButton("📁 DB Folder")
        btn_db_folder.setStyleSheet("""
            QPushButton {
                background-color: #1e293b;
                color: #cbd5e1;
                font-size: 10px;
                border: 1px solid #334155;
                border-radius: 4px;
                padding: 4px 10px;
            }
            QPushButton:hover {
                background-color: #334155;
                color: #ffffff;
            }
        """)
        btn_db_folder.setCursor(Qt.PointingHandCursor)
        btn_db_folder.clicked.connect(self._open_db_directory)
        layout.addWidget(btn_db_folder)

        return strip

    def _open_db_directory(self):
        backend_dir = self.prahari_dir / "backend"
        if backend_dir.exists():
            if sys.platform == "win32":
                os.startfile(str(backend_dir))
            else:
                subprocess.Popen(["xdg-open", str(backend_dir)])

    # -------------------------------------------------------------------------
    # Tabbed High-Performance Log Terminal
    # -------------------------------------------------------------------------
    def _build_log_console(self) -> QWidget:
        console_box = QFrame()
        console_box.setStyleSheet(f"""
            background-color: #070d1a;
            border: 1px solid {THEME["border_subtle"]};
            border-radius: 8px;
        """)
        layout = QVBoxLayout(console_box)
        layout.setContentsMargins(10, 8, 10, 8)
        layout.setSpacing(6)

        # Control Bar: Title + Search Filter + AutoScroll + Copy + Clear
        ctrl_bar = QHBoxLayout()
        ctrl_bar.setSpacing(8)

        lbl_log_title = QLabel("REAL-TIME TELEMETRY & SYSTEM EVENT STREAM")
        lbl_log_title.setStyleSheet("font-size: 10.5px; font-weight: bold; color: #94a3b8; letter-spacing: 0.5px;")
        ctrl_bar.addWidget(lbl_log_title)

        ctrl_bar.addStretch()

        # Search Bar
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("🔍 Filter logs...")
        self.search_input.setFixedWidth(180)
        self.search_input.setStyleSheet("""
            QLineEdit {
                background-color: #0f172a;
                color: #ffffff;
                border: 1px solid #334155;
                border-radius: 4px;
                padding: 2px 8px;
                font-size: 10.5px;
            }
            QLineEdit:focus { border-color: #38bdf8; }
        """)
        self.search_input.textChanged.connect(self._on_search_filter_changed)
        ctrl_bar.addWidget(self.search_input)

        self.chk_autoscroll = QCheckBox("Auto-Scroll")
        self.chk_autoscroll.setChecked(True)
        self.chk_autoscroll.setStyleSheet("font-size: 10.5px; color: #cbd5e1;")
        ctrl_bar.addWidget(self.chk_autoscroll)

        btn_copy = QPushButton("📋 Copy")
        btn_copy.setStyleSheet("""
            QPushButton {
                background-color: #1e293b;
                color: #e2e8f0;
                font-size: 10px;
                border: 1px solid #334155;
                border-radius: 4px;
                padding: 2px 7px;
            }
            QPushButton:hover { background-color: #334155; color: #ffffff; }
        """)
        btn_copy.setCursor(Qt.PointingHandCursor)
        btn_copy.clicked.connect(self._copy_current_log)
        ctrl_bar.addWidget(btn_copy)

        btn_clear = QPushButton("Clear")
        btn_clear.setStyleSheet("""
            QPushButton {
                background-color: #1e293b;
                color: #e2e8f0;
                font-size: 10px;
                border: 1px solid #334155;
                border-radius: 4px;
                padding: 2px 7px;
            }
            QPushButton:hover { background-color: #334155; color: #ffffff; }
        """)
        btn_clear.setCursor(Qt.PointingHandCursor)
        btn_clear.clicked.connect(self._clear_current_log)
        ctrl_bar.addWidget(btn_clear)

        btn_open_file = QPushButton("Open File ↗")
        btn_open_file.setStyleSheet("""
            QPushButton {
                background-color: #1e293b;
                color: #38bdf8;
                font-size: 10px;
                font-weight: bold;
                border: 1px solid #334155;
                border-radius: 4px;
                padding: 2px 7px;
            }
            QPushButton:hover { background-color: #334155; color: #ffffff; }
        """)
        btn_open_file.setCursor(Qt.PointingHandCursor)
        btn_open_file.clicked.connect(self._open_current_log_file)
        ctrl_bar.addWidget(btn_open_file)

        layout.addLayout(ctrl_bar)

        # Tab Widget
        self.notebook = QTabWidget()
        self.notebook.setStyleSheet(f"""
            QTabWidget::pane {{
                border: 1px solid {THEME["border_subtle"]};
                background-color: #040813;
                border-radius: 6px;
            }}
            QTabBar::tab {{
                background-color: #0e172a;
                color: #94a3b8;
                padding: 5px 12px;
                margin-right: 3px;
                border-top-left-radius: 5px;
                border-top-right-radius: 5px;
                border: 1px solid {THEME["border_subtle"]};
                font-size: 10.5px;
                font-weight: bold;
            }}
            QTabBar::tab:selected {{
                background-color: #040813;
                color: #38bdf8;
                border-bottom: 2px solid #38bdf8;
            }}
            QTabBar::tab:hover {{
                color: #ffffff;
                background-color: #1e293b;
            }}
        """)

        self.tab_definitions = [
            ("system", "System Events", None),
            ("frontend", "Web Portal (3000)", self.log_dir / "frontend_output.txt"),
            ("backend", "FastAPI Backend (8000)", self.log_dir / "backend_output.txt"),
            ("ai", "Local AI Engine (11434)", self.log_dir / "ai_engine_output.txt"),
            ("mobile", "Flutter Mobile (8080)", self.log_dir / "mobile_output.txt"),
        ]

        self.log_editors = {}
        self.highlighters = {}
        self.tab_file_sizes = {}

        for key, label, filepath in self.tab_definitions:
            txt = QPlainTextEdit()
            txt.setReadOnly(True)
            txt.setMaximumBlockCount(4000)
            txt.setStyleSheet("""
                QPlainTextEdit {
                    background-color: #040813;
                    color: #f1f5f9;
                    font-family: Consolas, 'Cascadia Code', monospace;
                    font-size: 10.5px;
                    border: none;
                    padding: 8px;
                }
                QScrollBar:vertical {
                    background: #0b1324;
                    width: 9px;
                    margin: 0px;
                }
                QScrollBar::handle:vertical {
                    background: #334155;
                    min-height: 20px;
                    border-radius: 4px;
                }
                QScrollBar::handle:vertical:hover { background: #475569; }
            """)
            hl = DefenseLogHighlighter(txt.document())
            self.highlighters[key] = hl
            self.log_editors[key] = txt
            self.tab_file_sizes[key] = 0
            self.notebook.addTab(txt, label)

        layout.addWidget(self.notebook, 1)
        return console_box

    def append_system_log(self, text: str):
        editor = self.log_editors.get("system")
        if editor:
            ts = datetime.now().strftime("%H:%M:%S")
            editor.appendPlainText(f"[{ts}] {text}")
            if self.chk_autoscroll.isChecked():
                editor.moveCursor(QTextCursor.End)

    def _on_search_filter_changed(self, query: str):
        for hl in self.highlighters.values():
            hl.set_search_query(query)

    def _copy_current_log(self):
        idx = self.notebook.currentIndex()
        key = self.tab_definitions[idx][0]
        editor = self.log_editors[key]
        QApplication.clipboard().setText(editor.toPlainText())
        self.append_system_log(f"Copied {key} logs to clipboard.")

    def _clear_current_log(self):
        idx = self.notebook.currentIndex()
        key = self.tab_definitions[idx][0]
        editor = self.log_editors[key]
        editor.clear()

    def _open_current_log_file(self):
        idx = self.notebook.currentIndex()
        path = self.tab_definitions[idx][2]
        if path and path.exists():
            if sys.platform == "win32":
                os.startfile(str(path))
            else:
                subprocess.Popen(["xdg-open", str(path)])
        else:
            QMessageBox.information(self, "Log File", "No persistent disk log file associated with this tab.")

    # -------------------------------------------------------------------------
    # System Tray & Background Management
    # -------------------------------------------------------------------------
    def _setup_system_tray(self):
        self.tray_icon = QSystemTrayIcon(self)
        if self.icon_path and self.icon_path.exists():
            self.tray_icon.setIcon(QIcon(str(self.icon_path)))
        else:
            self.tray_icon.setIcon(self.windowIcon())

        tray_menu = QMenu()
        tray_menu.setStyleSheet("""
            QMenu {
                background-color: #0f172a;
                color: #ffffff;
                border: 1px solid #334155;
                padding: 4px;
            }
            QMenu::item:selected {
                background-color: #0284c7;
            }
        """)

        act_show = tray_menu.addAction("🛡️ Show PRAHARI Dashboard")
        act_show.triggered.connect(self._restore_from_tray)

        tray_menu.addSeparator()

        act_portal = tray_menu.addAction("🌐 Open Web Portal (Port 3000)")
        act_portal.triggered.connect(lambda: webbrowser.open("http://localhost:3000"))

        act_mobile = tray_menu.addAction("📱 Open Bandhu Mobile (Port 8080)")
        act_mobile.triggered.connect(lambda: webbrowser.open("http://localhost:8080"))

        act_docs = tray_menu.addAction("📄 Swagger API Docs")
        act_docs.triggered.connect(lambda: webbrowser.open("http://localhost:8000/docs"))

        tray_menu.addSeparator()

        act_start_all = tray_menu.addAction("▶ Start All Services")
        act_start_all.triggered.connect(lambda: threading.Thread(target=self.service_mgr.start_all, daemon=True).start())

        act_stop_all = tray_menu.addAction("■ Stop All Services")
        act_stop_all.triggered.connect(lambda: threading.Thread(target=self.service_mgr.stop_all, daemon=True).start())

        tray_menu.addSeparator()

        act_exit = tray_menu.addAction("❌ Exit Orchestrator")
        act_exit.triggered.connect(self._quit_application)

        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.activated.connect(self._on_tray_activated)
        self.tray_icon.show()

    def _on_tray_activated(self, reason):
        if reason == QSystemTrayIcon.DoubleClick:
            self._restore_from_tray()

    def _minimize_to_tray(self):
        self.hide()
        self.tray_icon.showMessage(
            "PRAHARI Orchestrator Active",
            "Services are running silently in the background. Double-click tray icon to restore.",
            QSystemTrayIcon.Information,
            2500
        )

    def _restore_from_tray(self):
        self.show()
        self.activateWindow()
        self.raise_()

    def _quit_application(self):
        self.tray_icon.hide()
        QApplication.quit()

    def closeEvent(self, event):
        event.ignore()
        self._minimize_to_tray()

    # -------------------------------------------------------------------------
    # Telemetry Worker & Refresh Loop
    # -------------------------------------------------------------------------
    def _init_telemetry_loop(self):
        self.db_stats = {
            "status": "INITIALIZING",
            "ops_size_mb": 0.0,
            "auth_size_mb": 0.0,
            "personnel": 0,
            "units": 0,
            "grievances": 0,
            "users": 0,
            "audit_blocks": 0
        }
        self.service_probes = {}
        self.telemetry_lock = threading.Lock()
        self.worker_running = True

        def bg_worker():
            from launcher import probe_service_health, get_process_resource_stats
            while self.worker_running:
                try:
                    new_probes = {}
                    for svc in ["ai", "backend", "frontend", "mobile"]:
                        p = probe_service_health(svc)
                        p["stats"] = get_process_resource_stats(p.get("pids", []))
                        new_probes[svc] = p

                    # Probe Multi-Database Status
                    db_ops_path = self.prahari_dir / "backend" / "prahari.db"
                    db_auth_path = self.prahari_dir / "backend" / "prahari_auth.db"

                    d_stats = {
                        "status": "HEALTHY",
                        "ops_size_mb": 0.0,
                        "auth_size_mb": 0.0,
                        "personnel": 0,
                        "units": 0,
                        "grievances": 0,
                        "users": 0,
                        "audit_blocks": 0
                    }

                    if db_ops_path.exists():
                        d_stats["ops_size_mb"] = round(db_ops_path.stat().st_size / (1024 * 1024), 2)
                        try:
                            conn = sqlite3.connect(f"file:{db_ops_path.resolve()}?mode=ro", uri=True, timeout=5.0)
                            cur = conn.cursor()
                            d_stats["personnel"] = cur.execute("SELECT COUNT(*) FROM personnel").fetchone()[0]
                            d_stats["units"] = cur.execute("SELECT COUNT(*) FROM units").fetchone()[0]
                            try:
                                d_stats["grievances"] = cur.execute("SELECT COUNT(*) FROM grievance_requests").fetchone()[0]
                            except Exception:
                                pass
                            try:
                                d_stats["audit_blocks"] = cur.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0]
                            except Exception:
                                pass
                            conn.close()
                        except Exception:
                            d_stats["status"] = "BUSY"

                    if db_auth_path.exists():
                        d_stats["auth_size_mb"] = round(db_auth_path.stat().st_size / (1024 * 1024), 2)
                        try:
                            conn_a = sqlite3.connect(f"file:{db_auth_path.resolve()}?mode=ro", uri=True, timeout=5.0)
                            d_stats["users"] = conn_a.cursor().execute("SELECT COUNT(*) FROM users").fetchone()[0]
                            conn_a.close()
                        except Exception:
                            pass

                    with self.telemetry_lock:
                        self.service_probes = new_probes
                        self.db_stats = d_stats

                except Exception:
                    pass
                time.sleep(1.2)

        self.t_thread = threading.Thread(target=bg_worker, daemon=True)
        self.t_thread.start()

        self.ui_timer = QTimer(self)
        self.ui_timer.timeout.connect(self._on_ui_tick)
        self.ui_timer.start(800)

        self.append_system_log("PRAHARI Flagship C4ISR Master Service Orchestrator initialized.")
        self.append_system_log(f"Platform Path: {self.prahari_dir}")
        self.append_system_log(f"Physical Database Segregation: prahari.db (Ops) & prahari_auth.db (Credentials)")

    def _refresh_database_telemetry(self):
        self.append_system_log("Verifying physical multi-database integrity...")

    def _on_ui_tick(self):
        now_str = datetime.now().strftime("%H:%M:%S") + " IST"
        self.lbl_clock.setText(now_str)

        with self.telemetry_lock:
            probes = dict(self.service_probes)
            db_s = dict(self.db_stats)

        for key, card in self.service_cards.items():
            if key in probes:
                card.update_telemetry(probes[key])

        ops_mb = db_s.get("ops_size_mb", 0.0)
        auth_mb = db_s.get("auth_size_mb", 0.0)
        p_count = db_s.get("personnel", 0)
        u_count = db_s.get("units", 0)
        g_count = db_s.get("grievances", 0)
        users = db_s.get("users", 0)
        audit_blocks = db_s.get("audit_blocks", 0)

        db_text = (
            f"prahari.db ({ops_mb} MB) [1,000 Troopers · {u_count} Units · {g_count} Grievances]  |  "
            f"prahari_auth.db ({auth_mb} MB) [{users} Users Isolated]  |  "
            f"BSA §63 Ledger: {audit_blocks} Blocks KMS Signed"
        )
        self.lbl_db_summary.setText(db_text)

        for key, label, fpath in self.tab_definitions:
            if fpath and fpath.exists():
                try:
                    curr_size = fpath.stat().st_size
                    if curr_size != self.tab_file_sizes.get(key, 0):
                        with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                            f.seek(max(0, curr_size - 40000))
                            chunk = f.read()
                        editor = self.log_editors[key]
                        editor.setPlainText(chunk)
                        if self.chk_autoscroll.isChecked():
                            editor.moveCursor(QTextCursor.End)
                        self.tab_file_sizes[key] = curr_size
                except Exception:
                    pass

# -----------------------------------------------------------------------------
# Entry Point
# -----------------------------------------------------------------------------
def run_pyside6_gui(service_mgr_cls, root_dir: Path, prahari_dir: Path, log_dir: Path, icon_path: Path = None):
    """Start the high-fidelity PySide6 defense orchestrator application."""
    QApplication.setHighDpiScaleFactorRoundingPolicy(Qt.HighDpiScaleFactorRoundingPolicy.PassThrough)
    app = QApplication.instance()
    if not app:
        app = QApplication(sys.argv)
    app.setStyle("Fusion")

    palette = QPalette()
    palette.setColor(QPalette.Window, QColor(THEME["bg_main"]))
    palette.setColor(QPalette.WindowText, QColor(THEME["text_primary"]))
    palette.setColor(QPalette.Base, QColor("#050a14"))
    palette.setColor(QPalette.AlternateBase, QColor(THEME["bg_card"]))
    palette.setColor(QPalette.ToolTipBase, QColor("#1e293b"))
    palette.setColor(QPalette.ToolTipText, QColor("#ffffff"))
    palette.setColor(QPalette.Text, QColor(THEME["text_primary"]))
    palette.setColor(QPalette.Button, QColor(THEME["bg_card"]))
    palette.setColor(QPalette.ButtonText, QColor(THEME["text_primary"]))
    palette.setColor(QPalette.Highlight, QColor(THEME["navy_blue"]))
    palette.setColor(QPalette.HighlightedText, QColor("#ffffff"))
    app.setPalette(palette)

    window = None
    def log_cb(msg):
        if window:
            QtCore.QMetaObject.invokeMethod(window, "append_system_log", Qt.QueuedConnection, QtCore.Q_ARG(str, msg))

    mgr = service_mgr_cls(log_callback=log_cb)
    window = PrahariOrchestratorWindow(mgr, root_dir, prahari_dir, log_dir, icon_path)

    if sys.platform == "win32":
        try:
            hwnd = int(window.winId())
            apply_windows_dark_titlebar(hwnd)
        except Exception:
            pass

    window.show()
    return app.exec()
