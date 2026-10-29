"""Pools the two labeled sets analyzers may read for the hill-climb: held-out 1 (31-60, already used to pick winners,
so no longer a clean test) + train2 (61-90). Writes train60/{cases,gold}.jsonl and, for any variant already run on both
parts with identical prompt+model, train60/<variant>/results.jsonl (reused rows, no new calls).
Usage: python3 build-train60.py   (test2 / fresh-test is never touched)"""
import json, os, shutil
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PARTS = ["heldout", "fresh-train"]
OUT = "train60"
os.makedirs(OUT, exist_ok=True)
def lines(p): return [l for l in open(p).read().split("\n") if l]
for name in ("cases.jsonl", "gold.jsonl"):
    rows = [l for part in PARTS for l in lines(f"{part}/{name}")]
    ids = [json.loads(l).get("id") for l in rows]
    assert len(ids) == len(set(ids)), f"duplicate ids in {name}"
    open(f"{OUT}/{name}", "w").write("\n".join(rows) + "\n")
    print(name, len(rows))
for v in sorted(set(os.listdir(f"{PARTS[0]}")) & set(os.listdir(PARTS[1]))):
    sums = [f"{p}/{v}/summary.json" for p in PARTS]
    if not v.startswith("haiku_") or not all(os.path.exists(s) for s in sums): continue
    S = [json.load(open(s)) for s in sums]
    if len({(s["system_prompt_sha256"], s["model"]) for s in S}) != 1:
        print("skip", v, "(prompt or model differ between parts)"); continue
    os.makedirs(f"{OUT}/{v}", exist_ok=True)
    rows = [l for p in PARTS for l in lines(f"{p}/{v}/results.jsonl")]
    open(f"{OUT}/{v}/results.jsonl", "w").write("\n".join(rows) + "\n")
    json.dump({**S[0], "pooled_from": PARTS, "rows": len(rows), "note": "rows reused from both parts, not a new run"}, open(f"{OUT}/{v}/summary.json", "w"), indent=2)
    print("pooled", v, len(rows), "rows")
