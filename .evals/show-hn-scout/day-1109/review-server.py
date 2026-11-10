#!/usr/bin/env python3
"""Blind local labeling page for day-1109. Every click is saved to disk.

Run:  python3 .evals/show-hn-scout/day-1109/review-server.py   then open http://localhost:8766
Writes: labels.json (raw UI state) and tier.jsonl ({id, tier, label_source, provenance, reason}) for labelled posts only.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
CARDS = os.path.join(HERE, "review-cards.json")
STATE = os.path.join(HERE, "labels.json")
TIER = os.path.join(HERE, "tier.jsonl")


def load_state():
    if os.path.exists(STATE):
        with open(STATE, encoding="utf-8") as f:
            return json.load(f)
    return {"i": 0, "a": {}}


def write_tier(state):
    with open(CARDS, encoding="utf-8") as f:
        cards = json.load(f)
    with open(TIER, "w", encoding="utf-8") as f:
        for c in cards:
            a = state.get("a", {}).get(c["i"], {})
            if a.get("tier"):
                f.write(json.dumps({"id": c["i"], "tier": a["tier"], "label_source": "human", "provenance": "human_blind_no_prediction", "reason": a.get("reason", "")}, ensure_ascii=False) + "\n")


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
        files = {"/": ("review.html", "text/html"), "/index.html": ("review.html", "text/html"), "/review.js": ("review.js", "text/javascript"), "/cards": ("review-cards.json", "application/json")}
        if self.path in files:
            name, ctype = files[self.path]
            with open(os.path.join(HERE, name), "rb") as f:
                self._send(200, f.read(), ctype + "; charset=utf-8")
        elif self.path == "/state":
            self._send(200, json.dumps(load_state(), ensure_ascii=False), "application/json; charset=utf-8")
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
        write_tier(state)
        self._send(200, '{"ok":true}', "application/json")

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print("Open http://localhost:8766  (Ctrl+C to stop)")
    HTTPServer(("127.0.0.1", 8766), Handler).serve_forever()
