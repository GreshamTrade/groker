"""Vercel entrypoint. Define the handler before loading application code."""
import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path


class handler(BaseHTTPRequestHandler):
    def json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _dispatch(self):
        try:
            for root in (Path(__file__).resolve().parents[1], Path.cwd()):
                if (root / "server.py").is_file():
                    sys.path.insert(0, str(root))
                    break
            from server import handle_api
        except Exception as exc:
            self.json_response({"error": f"GROKER could not load its inspection engine ({type(exc).__name__}). Check the function bundle."}, 500)
            return
        handle_api(self)

    def do_GET(self):
        self._dispatch()

    def do_POST(self):
        self._dispatch()

    def do_OPTIONS(self):
        self.json_response({"error": "Use the GROKER application on this domain."}, 405)
