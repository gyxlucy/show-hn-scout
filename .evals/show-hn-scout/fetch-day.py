#!/usr/bin/env python3
"""Rebuild the evidence packets for one real bot day (the posts v3 pushed), without touching scout.sqlite3.

usage: python3 fetch-day.py 2026-11-04 /tmp/seen.json
Reads the bot's own record (`git show origin/bot-state:seen.json`), keeps the posts judged `push` on that UTC date
(posted to Slack and suppressed by the cap alike), re-fetches HN item, project page and HN discussion with the same
extraction as `hn_scout enrich`, and writes data/packets/day-<date>/<id>.json plus a manifest with the bot's record.
The page text and comments are fetched NOW, so they can differ from what the bot saw at judge time (comments grow).
"""
import json, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from bs4 import BeautifulSoup
from hn_scout.collect import API, DATA, HN, extract_text, fetch, now

date, seen_path = sys.argv[1], sys.argv[2]
tag = "day-" + date.replace("-", "")
items = json.load(open(seen_path))["items"]
day = {k: v for k, v in items.items() if (v.get("judged_at") or "")[:10] == date and v.get("decision") == "push"}
raw_dir = DATA / "raw" / tag
out_dir = DATA / "packets" / tag
out_dir.mkdir(parents=True, exist_ok=True)


def build(sid):
    cached = out_dir / f"{sid}.json"
    if cached.exists():
        return sid, "cached"
    r = fetch(f"{API}item/{sid}.json", raw_dir, retries=2)
    body = r.pop("body", "")
    try:
        item = json.loads(body) if r["status"] == "ok" else None
    except ValueError:
        item = None
    if not isinstance(item, dict) or item.get("id") != int(sid):
        return sid, f"item fetch failed: {r.get('error', 'invalid payload')}"
    if item.get("dead") or item.get("deleted"):
        return sid, "dead/deleted since"
    url = item.get("url", HN + f"item?id={sid}")
    sources = []
    page = fetch(url, raw_dir)
    body = page.pop("body", "")
    if body:
        page["text"] = extract_text(body)
    page["kind"] = "project_page"
    sources.append(page)
    disc = fetch(HN + f"item?id={sid}", raw_dir, retries=3)
    body = disc.pop("body", "")
    disc["kind"] = "hn_discussion"
    if body:
        soup = BeautifulSoup(body, "html.parser")
        disc["comments"] = []
        for c in soup.select("tr.comtr"):
            user, content = c.select_one(".hnuser"), c.select_one(".commtext")
            if user and content:
                disc["comments"].append({"id": c.get("id"), "by": user.get_text(), "is_author": user.get_text() == item.get("by"),
                                         "text": content.get_text(" ", strip=True)})
    sources.append(disc)
    packet = {"id": int(sid), "title": item.get("title"), "url": url, "run_id": tag, "item": item, "sources": sources}
    cached.write_text(json.dumps(packet, ensure_ascii=False, indent=2), encoding="utf-8")
    return sid, "ok"


with ThreadPoolExecutor(max_workers=3) as pool:
    results = list(pool.map(build, day))
manifest = {"date": date, "fetched_at": now(), "source": "bot-state/seen.json", "pool": {k: {kk: v.get(kk) for kk in ("title", "url", "age_hours", "status", "decision", "posted", "judged_at", "prompt_sha")} for k, v in day.items()}, "fetch": dict(results)}
(out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
bad = {k: v for k, v in results if v not in ("ok", "cached")}
print(json.dumps({"pool": len(day), "ok": sum(v in ("ok", "cached") for _, v in results), "problems": bad}, ensure_ascii=False))
