#!/usr/bin/env python3
"""Local review page for day-1104. Every click is saved to disk, so nothing needs copy-paste.

Run:  python3 review-server.py   then open http://localhost:8765
Writes: labels.json (raw UI state) and labels.jsonl ({id, pred, tier, reviewed, reason}).
"""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
CARDS = os.path.join(HERE, "review-cards.json")
STATE = os.path.join(HERE, "labels.json")
JSONL = os.path.join(HERE, "labels.jsonl")


def load_state():
    if os.path.exists(STATE):
        with open(STATE, encoding="utf-8") as f:
            return json.load(f)
    return {"i": 0, "a": {}}


def write_jsonl(state):
    with open(CARDS, encoding="utf-8") as f:
        cards = json.load(f)
    with open(JSONL, "w", encoding="utf-8") as f:
        for c in cards:
            a = state.get("a", {}).get(c["i"], {})
            row = {
                "id": c["i"],
                "pred": c["p"],
                "tier": a.get("tier", c["p"]),
                "reviewed": bool(a.get("reviewed")),
                "reason": a.get("reason", c["r"]),
            }
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            with open(os.path.join(HERE, "review.html"), "rb") as f:
                self._send(200, f.read(), "text/html; charset=utf-8")
        elif self.path == "/review.js":
            with open(os.path.join(HERE, "review.js"), "rb") as f:
                self._send(200, f.read(), "text/javascript; charset=utf-8")
        elif self.path == "/cards":
            with open(CARDS, "rb") as f:
                self._send(200, f.read(), "application/json; charset=utf-8")
        elif self.path == "/state":
            self._send(200, json.dumps(load_state(), ensure_ascii=False), "application/json; charset=utf-8")
        elif self.path == "/export":
            write_jsonl(load_state())
            with open(JSONL, "rb") as f:
                self._send(200, f.read(), "text/plain; charset=utf-8")
        else:
            self._send(404, "not found", "text/plain")

    def do_POST(self):
        if self.path != "/state":
            self._send(404, "not found", "text/plain")
            return
        n = int(self.headers.get("Content-Length", "0"))
        state = json.loads(self.rfile.read(n).decode("utf-8"))
        with open(STATE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False)
        write_jsonl(state)
        self._send(200, '{"ok":true}', "application/json")

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print("Open http://localhost:8765  (Ctrl+C to stop)")
    HTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
