"""Bounded public-web collection. Never executes project code or page scripts."""
from __future__ import annotations

import hashlib
import ipaddress
import json
import os
import socket
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
HN = "https://news.ycombinator.com/"
API = "https://hacker-news.firebaseio.com/v0/"


def now():
    return datetime.now(timezone.utc).isoformat()


def public_url(url):
    parts = urllib.parse.urlsplit(url)
    if parts.scheme not in {"https", "http"} or not parts.hostname or parts.username or parts.password:
        raise ValueError("Only public HTTP(S) URLs without credentials are allowed")
    if parts.port not in {None, 80, 443}:
        raise ValueError("Nonstandard ports are not fetched")
    addresses = socket.getaddrinfo(parts.hostname, parts.port or (443 if parts.scheme == "https" else 80))
    def allowed(address):
        ip = ipaddress.ip_address(address)
        # Some local proxies return synthetic benchmarking addresses. Explicit opt-in only;
        # private, loopback and link-local destinations remain blocked.
        proxy_ip = ipaddress.ip_address(int(ip) & 0xffffffff) if str(ip).startswith("::ffff:0:") else ip
        proxy_dns = os.environ.get("HN_SCOUT_PROXY_DNS") == "1" and proxy_ip in ipaddress.ip_network("198.18.0.0/15")
        return ip.is_global or proxy_dns
    if not addresses or any(not allowed(row[4][0]) for row in addresses):
        raise ValueError("Non-public address blocked")
    return url


class PublicRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        public_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(url, raw_dir, retries=1):
    """Keep exact response bytes and the extraction time, including errors."""
    result = {"url": url, "fetched_at": now(), "status": "error"}
    try:
        public_url(url)
        opener = urllib.request.build_opener(PublicRedirect())
        for attempt in range(retries + 1):
            try:
                request = urllib.request.Request(url, headers={"User-Agent": "HNScoutResearch/0.1", "Accept": "text/html,application/json,text/plain"})
                with opener.open(request, timeout=15) as response:
                    body = response.read(2_000_001)
                    if len(body) > 2_000_000:
                        raise ValueError("Response exceeds 2 MB; not silently truncated")
                    mime = response.headers.get_content_type()
                    if mime not in {"text/html", "application/json", "text/plain", "application/xhtml+xml"}:
                        raise ValueError(f"Unsupported content type: {mime}")
                    raw_dir.mkdir(parents=True, exist_ok=True)
                    digest = hashlib.sha256(body).hexdigest()
                    suffix = ".json" if mime == "application/json" else ".html" if "html" in mime else ".txt"
                    path = raw_dir / (digest + suffix)
                    path.write_bytes(body)
                    result.update(status="ok", http_status=response.status, final_url=response.url,
                                  sha256=digest, raw_path=str(path.relative_to(ROOT)),
                                  content_type=mime, body=body.decode(response.headers.get_content_charset() or "utf-8", errors="replace"))
                    return result
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                if attempt == retries:
                    raise exc
                time.sleep(1.5 * (attempt + 1))
    except Exception as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
    return result


def parse_listing(html):
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for row in soup.select("tr.athing[id]"):
        title = row.select_one(".titleline > a")
        if not title or not row.get("id", "").isdigit():
            continue
        rows.append({"id": int(row["id"]), "title": title.get_text(" ", strip=True),
                     "url": urllib.parse.urljoin(HN, title.get("href", ""))})
    more = soup.select_one("a.morelink")
    return rows, urllib.parse.urljoin(HN, more["href"]) if more else None


def open_db(path=None):
    DATA.mkdir(exist_ok=True)
    db = sqlite3.connect(path or DATA / "scout.sqlite3")
    db.row_factory = sqlite3.Row
    db.executescript("""
    CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT,
        show_complete INTEGER NOT NULL DEFAULT 0, manifest TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS stories (
        id INTEGER PRIMARY KEY, title TEXT, url TEXT, first_seen TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS membership (
        run_id TEXT NOT NULL, surface TEXT NOT NULL, story_id INTEGER NOT NULL, position INTEGER NOT NULL,
        PRIMARY KEY(run_id, surface, story_id));
    CREATE TABLE IF NOT EXISTS evidence (
        run_id TEXT NOT NULL, story_id INTEGER NOT NULL, source_key TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(run_id, story_id, source_key));
    """)
    return db


def collect(pages=4, show_pages=12):
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    raw_dir = DATA / "raw" / run_id
    raw_dir.mkdir(parents=True, exist_ok=True)
    manifest = {"id": run_id, "started_at": now(), "surfaces": {}, "errors": []}
    db = open_db()
    candidates = {}
    for surface, limit in [("shownew", pages), ("show", show_pages)]:
        url = HN + surface
        seen_urls, positions, page_records = set(), {}, []
        complete = False
        for _ in range(limit):
            if url in seen_urls:
                manifest["errors"].append(f"Repeated pagination URL: {surface}")
                break
            seen_urls.add(url)
            response = fetch(url, raw_dir)
            body = response.pop("body", "")
            page_records.append(response)
            if response["status"] != "ok":
                manifest["errors"].append(response.get("error", "Fetch failed"))
                break
            items, next_url = parse_listing(body)
            if not items:
                manifest["errors"].append(f"Empty/unrecognized listing: {surface}")
                break
            for item in items:
                candidates[item["id"]] = item
                positions.setdefault(item["id"], len(positions) + 1)
            if not next_url:
                complete = True
                break
            parts = urllib.parse.urlsplit(next_url)
            if parts.hostname != "news.ycombinator.com" or parts.path != "/" + surface:
                manifest["errors"].append(f"Unexpected pagination: {next_url}")
                break
            url = next_url
            time.sleep(0.3)
        manifest["surfaces"][surface] = {"complete": complete, "pages": page_records, "ids": list(positions)}
        db.executemany("INSERT INTO membership VALUES (?, ?, ?, ?)",
                       [(run_id, surface, sid, position) for sid, position in positions.items()])
    # Fetch item metadata for the new-post window only. /show membership does not need item calls.
    ids = manifest["surfaces"]["shownew"]["ids"]

    def item(sid):
        response = fetch(f"{API}item/{sid}.json", raw_dir)
        body = response.pop("body", "")
        try:
            payload = json.loads(body) if response["status"] == "ok" else None
        except ValueError:
            payload = None
        return sid, response, payload

    with ThreadPoolExecutor(max_workers=4) as pool:
        for sid, source, payload in pool.map(item, ids):
            if not isinstance(payload, dict) or payload.get("id") != sid:
                manifest["errors"].append(f"Item {sid}: {source.get('error', 'invalid payload')}")
                continue
            if payload.get("deleted") or payload.get("dead"):
                continue
            first_seen = db.execute("SELECT first_seen FROM stories WHERE id=?", (sid,)).fetchone()
            db.execute("INSERT OR REPLACE INTO stories VALUES (?, ?, ?, ?, ?)",
                       (sid, payload.get("title"), payload.get("url", HN + f"item?id={sid}"),
                        first_seen[0] if first_seen else manifest["started_at"], json.dumps(payload)))
            db.execute("INSERT OR REPLACE INTO evidence VALUES (?, ?, ?, ?)",
                       (run_id, sid, "hn_item", json.dumps({**source, "item": payload})))
    manifest["finished_at"] = now()
    db.execute("INSERT INTO runs VALUES (?, ?, ?, ?, ?)",
               (run_id, manifest["started_at"], manifest["finished_at"], int(manifest["surfaces"]["show"]["complete"]), json.dumps(manifest)))
    db.commit()
    (raw_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"run_id": run_id, "new_items": len(ids), "show_items": len(manifest['surfaces']['show']['ids']),
                      "show_complete": manifest['surfaces']['show']['complete'], "errors": manifest['errors']}, indent=2))
    return run_id


def candidates():
    db = open_db()
    run = db.execute("SELECT * FROM runs ORDER BY started_at DESC LIMIT 1").fetchone()
    if not run:
        return []
    current_show = {r[0] for r in db.execute("SELECT story_id FROM membership WHERE run_id=? AND surface='show'", (run['id'],))}
    ever_show = {r[0] for r in db.execute("SELECT DISTINCT story_id FROM membership WHERE surface='show'")}
    result = []
    for row in db.execute("SELECT s.* FROM stories s JOIN membership m ON s.id=m.story_id WHERE m.run_id=? AND m.surface='shownew' ORDER BY m.position", (run['id'],)):
        data = dict(row)
        payload = json.loads(data.pop("payload"))
        data.update(posted_at=payload.get("time"), score=payload.get("score"),
                    age_hours=round((datetime.fromisoformat(run['started_at']).timestamp() - payload.get('time', 0)) / 3600, 1),
                    current_show="present" if row['id'] in current_show else "absent" if run['show_complete'] else "unknown",
                    observed_ever_show=row['id'] in ever_show, history_before_first_seen="unknown", run_id=run['id'])
        result.append(data)
    return result


def extract_text(body):
    soup = BeautifulSoup(body, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "nav", "footer", "header"]):
        tag.decompose()
    main = soup.select_one("article.markdown-body") or soup.select_one("main") or soup.body or soup
    return "\n".join(line.strip() for line in main.get_text("\n", strip=True).splitlines() if line.strip())


def enrich(ids):
    db = open_db()
    run = db.execute("SELECT id FROM runs ORDER BY started_at DESC LIMIT 1").fetchone()
    if not run:
        raise ValueError("Run collect first")
    run_id = run['id']
    raw_dir = DATA / "raw" / run_id
    inputs = []
    for sid in ids:
        cached = DATA / "packets" / run_id / f"{sid}.json"
        if cached.exists():
            print(json.dumps({"id": sid, "status": "cached", "path": str(cached.relative_to(ROOT))}), flush=True)
            continue
        row = db.execute("SELECT * FROM stories WHERE id=?", (sid,)).fetchone()
        if not row:
            raise ValueError(f"Unknown story {sid}")
        inputs.append(dict(row))

    def build_packet(row):
        sid = row['id']
        item = json.loads(row['payload'])
        sources = []
        response = fetch(row['url'], raw_dir)
        body = response.pop('body', '')
        if body:
            response['text'] = extract_text(body)
        response['kind'] = 'project_page'
        sources.append(response)
        # Visit the complete HN discussion HTML too; preserves nested author replies.
        response = fetch(HN + f"item?id={sid}", raw_dir)
        body = response.pop('body', '')
        response['kind'] = 'hn_discussion'
        if body:
            soup = BeautifulSoup(body, 'html.parser')
            response['comments'] = []
            for comment in soup.select('tr.comtr'):
                user, content = comment.select_one('.hnuser'), comment.select_one('.commtext')
                if user and content:
                    response['comments'].append({'id': comment.get('id'), 'by': user.get_text(),
                        'is_author': user.get_text() == item.get('by'), 'text': content.get_text(' ', strip=True)})
        sources.append(response)
        packet = {"id": sid, "title": row['title'], "url": row['url'], "run_id": run_id,
                  "item": item, "sources": sources}
        return packet

    with ThreadPoolExecutor(max_workers=4) as pool:
        for packet in pool.map(build_packet, inputs):
            sid, sources = packet['id'], packet['sources']
            output = DATA / "packets" / run_id / f"{sid}.json"
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(packet, ensure_ascii=False, indent=2), encoding='utf-8')
            for source in sources:
                db.execute('INSERT OR REPLACE INTO evidence VALUES (?, ?, ?, ?)', (run_id, sid, source['kind'], json.dumps(source)))
            db.commit()
            print(json.dumps({"id": sid, "sources": [{"kind": s['kind'], "status": s['status'], "characters": len(s.get('text', '')), "comments": len(s.get('comments', [])), "error": s.get('error')} for s in sources]}), flush=True)

