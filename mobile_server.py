#!/usr/bin/env python3
"""
PRAHARI Bandhu — Mobile Web Server
Serves the Flutter Web distribution with SPA fallback routing, CORS, and health probes.
Windows GUI/pythonw friendly: safely handles detached processes, log redirection, and dynamic path discovery.
"""

import os
import sys
import json
import mimetypes
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
import argparse

# Ensure proper mime types
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("image/x-icon", ".ico")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("font/woff", ".woff")
mimetypes.add_type("font/ttf", ".ttf")

_log_fp = None

def setup_logging(log_path: str):
    global _log_fp
    if log_path:
        try:
            p = Path(log_path)
            p.parent.mkdir(parents=True, exist_ok=True)
            _log_fp = open(p, "a", encoding="utf-8", buffering=1)
            sys.stdout = _log_fp
            sys.stderr = _log_fp
            return
        except Exception:
            pass

    if sys.stdout is None:
        try:
            sys.stdout = open(os.devnull, "w", encoding="utf-8")
        except Exception:
            pass
    if sys.stderr is None:
        try:
            sys.stderr = open(os.devnull, "w", encoding="utf-8")
        except Exception:
            pass

def safe_log(msg: str):
    try:
        if _log_fp and not _log_fp.closed:
            _log_fp.write(msg + "\n")
            _log_fp.flush()
        elif sys.stdout is not None:
            sys.stdout.write(msg + "\n")
            sys.stdout.flush()
    except Exception:
        pass

def resolve_web_dir(explicit_dir: str = "") -> Path:
    """Find the authentic Flutter Web build directory across various execution contexts."""
    if explicit_dir and Path(explicit_dir).exists():
        return Path(explicit_dir).resolve()

    env_dir = os.environ.get("PRAHARI_MOBILE_WEB_DIR")
    if env_dir and Path(env_dir).exists():
        return Path(env_dir).resolve()

    candidates = [
        Path.cwd() / "mobile" / "build" / "web",
        Path.cwd() / "prahari" / "mobile" / "build" / "web",
        Path(r"D:\Projects\SIH\prahari\mobile\build\web"),
        Path(r"D:\Projects\SIH\mobile\build\web"),
        Path(__file__).resolve().parent / "mobile" / "build" / "web",
        Path(__file__).resolve().parent / "prahari" / "mobile" / "build" / "web",
        Path(__file__).resolve().parent.parent / "mobile" / "build" / "web",
        Path(__file__).resolve().parent.parent / "prahari" / "mobile" / "build" / "web",
    ]

    for cand in candidates:
        if cand.exists() and (cand / "index.html").exists():
            return cand.resolve()

    for cand in candidates:
        if cand.exists():
            return cand.resolve()

    return (Path(__file__).resolve().parent / "mobile" / "build" / "web").resolve()

# Default web directory, updated dynamically in main()
ACTIVE_WEB_DIR = resolve_web_dir()

class FlutterWebHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ACTIVE_WEB_DIR), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        clean_path = self.path.split("?")[0].split("#")[0]

        # Health probe endpoints
        if clean_path in ("/health", "/api/health", "/mobile/health", "/mobile/api/health"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = json.dumps({
                "status": "operational",
                "service": "PRAHARI Bandhu Flutter Mobile Server",
                "web_dir": str(ACTIVE_WEB_DIR),
                "web_dir_exists": ACTIVE_WEB_DIR.exists(),
                "index_exists": (ACTIVE_WEB_DIR / "index.html").exists()
            })
            self.wfile.write(resp.encode("utf-8"))
            return

        # Favicon fallback
        if clean_path in ("/favicon.ico", "/favicon.png"):
            for icon_name in ("favicon.png", "icons/Icon-192.png", "favicon.ico"):
                icon_file = ACTIVE_WEB_DIR / icon_name
                if icon_file.is_file():
                    content = icon_file.read_bytes()
                    mime_type = "image/png" if icon_name.endswith(".png") else "image/x-icon"
                    self.send_response(200)
                    self.send_header("Content-Type", mime_type)
                    self.send_header("Content-Length", str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
                    return

        # Strip /mobile prefix if requested
        rel_path = clean_path.lstrip("/")
        if rel_path.startswith("mobile/"):
            rel_path = rel_path[7:]
        elif rel_path == "mobile":
            rel_path = ""

        target_file = ACTIVE_WEB_DIR / rel_path

        # If file exists and is a file, serve it directly
        if target_file.is_file():
            self.path = "/" + rel_path
            return super().do_GET()

        # If directory with index.html, serve it
        if target_file.is_dir() and (target_file / "index.html").is_file():
            self.path = "/" + (rel_path + "/" if rel_path and not rel_path.endswith("/") else rel_path) + "index.html"
            return super().do_GET()

        # SPA fallback: For any other path (or /), serve index.html
        index_file = ACTIVE_WEB_DIR / "index.html"
        if index_file.exists():
            try:
                content = index_file.read_bytes()
                if not self.path.startswith("/mobile"):
                    content = content.replace(b'<base href="/mobile/">', b'<base href="/">')
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            except Exception:
                pass

        return super().do_GET()

    def log_message(self, format, *args):
        safe_log(f"[Mobile Server] {format % args}")

def main():
    global ACTIVE_WEB_DIR

    parser = argparse.ArgumentParser(description="PRAHARI Bandhu Mobile Web Server")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on (default 8080)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host interface (default 0.0.0.0)")
    parser.add_argument("--web-dir", type=str, default="", help="Path to Flutter Web build directory")
    parser.add_argument("--log-file", type=str, default="", help="Log output file path")
    args = parser.parse_args()

    setup_logging(args.log_file)

    ACTIVE_WEB_DIR = resolve_web_dir(args.web_dir)

    if not ACTIVE_WEB_DIR.exists() or not (ACTIVE_WEB_DIR / "index.html").exists():
        safe_log(f"[Mobile Server] Warning: Flutter Web directory or index.html not found at {ACTIVE_WEB_DIR}")
    else:
        safe_log(f"[Mobile Server] Flutter Web build verified at {ACTIVE_WEB_DIR}")

    server = HTTPServer((args.host, args.port), FlutterWebHandler)
    safe_log(f"[Mobile Server] Serving PRAHARI Bandhu at http://{args.host}:{args.port}/ (Root: {ACTIVE_WEB_DIR})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        safe_log("[Mobile Server] Shutting down...")
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
