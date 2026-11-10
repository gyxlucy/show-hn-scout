#!/usr/bin/env python3
"""Build BLIND review cards for day-1109: title, url, page excerpt, comment count. No model prediction, no v3 decision,
no ranker output, shuffled with a fixed seed (not newest-first, not by any model's order)."""
import json, random, pathlib
HERE = pathlib.Path(__file__).resolve().parent
PK = HERE.parents[2] / "data" / "packets" / "day-20261109"
man = json.load(open(PK / "manifest.json"))
ids = sorted(man["pool"])
random.Random(1109).shuffle(ids)
cards = []
for sid in ids:
    p = json.load(open(PK / f"{sid}.json"))
    page = next((s for s in p["sources"] if s["kind"] == "project_page"), {})
    hn = next((s for s in p["sources"] if s["kind"] == "hn_discussion"), {})
    item = p.get("item") or {}
    cards.append({"i": sid, "t": p["title"], "u": p["url"], "h": f"https://news.ycombinator.com/item?id={sid}",
                  "x": " ".join((page.get("text") or "").split())[:700], "s": (item.get("text") or "")[:600] if isinstance(item, dict) else "",
                  "n": len(hn.get("comments") or [])})
json.dump(cards, open(HERE / "review-cards.json", "w"), ensure_ascii=False)
print(len(cards), "cards")
