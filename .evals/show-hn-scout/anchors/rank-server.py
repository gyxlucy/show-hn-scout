#!/usr/bin/env python3
"""Local page for ordering the 10 anchor posts. Every change is saved to disk.

Run:  python3 rank-server.py   then open http://localhost:8766
Writes: ranking.json (UI state) and ranking.jsonl ({rank, id, hn, title, tie_with_prev, note}), rank 1 = strongest push.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
CARDS = os.path.join(HERE, "candidates.json")
STATE = os.path.join(HERE, "ranking.json")
JSONL = os.path.join(HERE, "ranking.jsonl")


def load_state():
    if os.path.exists(STATE):
        with open(STATE, encoding="utf-8") as f:
            return json.load(f)
    return None


def write_jsonl(state):
    with open(CARDS, encoding="utf-8") as f:
        cards = {c["id"]: c for c in json.load(f)}
    with open(JSONL, "w", encoding="utf-8") as f:
        for k, i in enumerate(state["order"], 1):
            c = cards[i]
            f.write(json.dumps({
                "rank": k, "id": i, "hn": c["hn"], "title": c["title"],
                "tie_with_prev": bool(state.get("ties", {}).get(i)),
                "note": state.get("notes", {}).get(i, ""),
                "confirmed": bool(state.get("confirmed")),
            }, ensure_ascii=False) + "\n")


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _file(self, name, ctype):
        with open(os.path.join(HERE, name), "rb") as f:
            self._send(200, f.read(), ctype)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self._file("rank.html", "text/html; charset=utf-8")
        elif self.path == "/rank.js":
            self._file("rank.js", "text/javascript; charset=utf-8")
        elif self.path == "/cards":
            self._file("candidates.json", "application/json; charset=utf-8")
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
        write_jsonl(state)
        self._send(200, '{"ok":true}', "application/json")

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print("Open http://localhost:8766  (Ctrl+C to stop)")
    HTTPServer(("127.0.0.1", 8766), Handler).serve_forever()
