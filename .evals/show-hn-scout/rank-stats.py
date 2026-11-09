#!/usr/bin/env python3
"""Ordering of one simulated day: the posts a first-stage run pushed (the pool), ranked, then cut at k.

usage: python3 rank-stats.py [train60/haiku_v7] [--pool-from haiku_v3]
Reads <set>/tier.jsonl (human tiers). Without a ranker dir, prints only the baselines on the same pool:
  random, newest first (what the live cap does today), v6 mean strength, v5 mean count of P signals present.
With a ranker dir: per rep (one shuffle of the cards each) must-read / core among the top k, mean and range over reps,
position bias (Spearman between a card's slot in the prompt and its rank), and top-10 overlap between reps.
Uncertainty: the range over reps covers shuffle noise only; the pool is 34 posts, so case-sampling noise is large.
"""
import json, os, re, sys, itertools, statistics as st

args = [a for a in sys.argv[1:] if not a.startswith("--")]
pf = "haiku_v3"
if "--pool-from" in sys.argv:
    pf = sys.argv[sys.argv.index("--pool-from") + 1]
    args = [a for a in args if a != pf]
ranker = args[0] if args else None
setdir = os.path.dirname(ranker) if ranker else "train60"
setdir = setdir or "."
KS = (6, 10, 13)

def jl(p):
    return [json.loads(l) for l in open(p) if l.strip()] if os.path.exists(p) else []

tier = {r["id"]: r for r in jl(f"{setdir}/tier.jsonl")}
cases = {r["id"]: r for r in jl(f"{setdir}/cases.jsonl")}
by = {}
for r in jl(f"{setdir}/{pf}/results.jsonl"):
    if r.get("status") == "ok" and r.get("answer"):
        by.setdefault(r["prompt_id"], []).append(r["answer"]["decision"] == "push")
pool = sorted(k for k, v in by.items() if sum(v) * 2 >= len(v))
must = {k for k in pool if tier[k]["tier"] == "must_read"}
core = {k for k in pool if tier[k].get("core")}
n = len(pool)
print(f"pool {n} posts pushed by {pf}: must-read {len(must)}, core {len(core)} (human tiers)")

def topk(score, k, hit):
    """expected hits among the k best by score, ties split evenly"""
    order = sorted(pool, key=lambda c: -score[c])
    got, i, left = 0.0, 0, k
    while i < len(order) and left > 0:
        j = i
        while j < len(order) and score[order[j]] == score[order[i]]:
            j += 1
        g = order[i:j]
        take = min(left, len(g))
        got += take * sum(c in hit for c in g) / len(g)
        left -= take
        i = j
    return got

def table(name, score):
    print(f"  {name:34s}" + "".join(f" k={k:<2d} {topk(score, k, must):4.1f} / core {topk(score, k, core):3.1f} |" for k in KS))

print(f"baselines on this pool (must-read in top k / core in top k):")
print(f"  {'random':34s}" + "".join(f" k={k:<2d} {k*len(must)/n:4.1f} / core {k*len(core)/n:3.1f} |" for k in KS))
posted = {c: re.search(r"^Posted \(UTC\): (.*)$", cases[c]["prompt"], re.M).group(1) for c in pool}
table("newest first (today's cap)", {c: int(re.sub(r"\D", "", posted[c])) for c in pool})
v6 = {}
for r in jl(f"{setdir}/haiku_v6/results.jsonl"):
    a = r["answer"]
    v6.setdefault(r["prompt_id"], []).append(a["strength"] if a and a["decision"] == "push" else 0)
if v6:
    table("v6 mean strength", {c: sum(v6[c]) / len(v6[c]) for c in pool})
v5 = {}
for r in jl(f"{setdir}/haiku_v5/results.jsonl"):
    a = r["answer"]
    v5.setdefault(r["prompt_id"], []).append(sum(a["signals"][p]["present"] for p in ["P1", "P2", "P3", "P4", "P5"]) if a and a["decision"] == "push" else 0)
if v5:
    table("v5 mean count of P signals", {c: sum(v5[c]) / len(v5[c]) for c in pool})

if not ranker:
    sys.exit(0)

rows = [r for r in jl(f"{ranker}/results.jsonl") if r.get("answer")]
allrows = jl(f"{ranker}/results.jsonl")
print(f"\n{ranker}: {len(allrows)} reps, {len(rows)} valid, {len(jl(ranker + '/errors.jsonl'))} error rows")
if not rows:
    sys.exit(0)
for k in KS:
    mh = [len(set(r["answer"]["ranking"][:k]) & must) for r in rows]
    ch = [len(set(r["answer"]["ranking"][:k]) & core) for r in rows]
    print(f"  top {k:2d}: must-read mean {st.mean(mh):.1f} (range {min(mh)}-{max(mh)}; random {k*len(must)/n:.1f}), core mean {st.mean(ch):.1f} (range {min(ch)}-{max(ch)}; random {k*len(core)/n:.1f})")

def spearman(x, y):
    rx = {v: i for i, v in enumerate(sorted(x))}
    ry = {v: i for i, v in enumerate(sorted(y))}
    a = [rx[v] for v in x]; b = [ry[v] for v in y]
    ma, mb = st.mean(a), st.mean(b)
    num = sum((p - ma) * (q - mb) for p, q in zip(a, b))
    den = (sum((p - ma) ** 2 for p in a) * sum((q - mb) ** 2 for q in b)) ** 0.5
    return num / den if den else 0.0

rhos = []
for r in rows:
    slot = {cid: int(lab[1:]) for lab, cid in r["labels"].items()}
    rank = {cid: i for i, cid in enumerate(r["answer"]["ranking"])}
    rhos.append(spearman([slot[c] for c in pool], [rank[c] for c in pool]))
print(f"  position bias: Spearman(slot in prompt, rank) per rep {[round(x, 2) for x in rhos]}, mean abs {st.mean(abs(x) for x in rhos):.2f}")
if len(rows) > 1:
    ov = [len(set(a["answer"]["ranking"][:10]) & set(b["answer"]["ranking"][:10])) / 10 for a, b in itertools.combinations(rows, 2)]
    print(f"  top-10 overlap between reps: mean {st.mean(ov):.0%} (min {min(ov):.0%})")
cnt = {}
for r in rows:
    for c in r["answer"]["ranking"][:10]:
        cnt[c] = cnt.get(c, 0) + 1
print("  cases in the top 10 most often (share of reps; M=must-read, C=core):")
for c, v in sorted(cnt.items(), key=lambda x: -x[1])[:14]:
    print(f"    {c}  {v}/{len(rows)}  {'C' if c in core else 'M' if c in must else tier[c]['tier']}")
ok = [r for r in allrows]
if ok:
    print(f"  output tokens per rep: mean {st.mean(r['usage']['output_tokens'] for r in ok):.0f}, input {st.mean(r['usage']['input_tokens'] for r in ok):.0f}")
