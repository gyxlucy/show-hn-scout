#!/usr/bin/env python3
"""Validate a ranker on one real full day (day-1104): cut at k=10 and count what she wanted.

usage: python3 day-rank-stats.py day-1104/haiku_v7
Gold = day-1104/tier.jsonl (her tiers; provenance human_reviewed_assistant_prediction).
Guardrails (declared before the run, 2026-11-10):
  G1 wanted (push+must) in top 10 > random AND > newest-10, ranker mean over 6 reps
  G2 must-read in top 10 >= random + 1
  G3 gold-pass in top 10 < random
  G4 valid 6/6, G5 position bias mean |rho| < 0.2, G6 top-10 overlap between reps >= 60%
Verdict is pass only if all of G1-G6 hold.
"""
import json, os, re, sys, itertools, statistics as st, random

ranker = sys.argv[1]
setdir = os.path.dirname(ranker)
K = 10
jl = lambda p: [json.loads(l) for l in open(p) if l.strip()] if os.path.exists(p) else []
tier = {r["id"]: r["tier"] for r in jl(f"{setdir}/tier.jsonl")}
cases = {r["id"]: r for r in jl(f"{setdir}/cases.jsonl")}
pool = sorted(tier)
n = len(pool)
wanted = {c for c in pool if tier[c] in ("push", "must_read")}
must = {c for c in pool if tier[c] == "must_read"}
bad = {c for c in pool if tier[c] == "pass"}
print(f"pool {n}: must {len(must)}, push {len(wanted) - len(must)}, pass {len(bad)}")

def metrics(top):
    s = set(top)
    return len(s & wanted), len(s & must), len(s & bad)

posted = {c: re.search(r"^Posted \(UTC\): (.*)$", cases[c]["prompt"], re.M).group(1) for c in pool}
newest = sorted(pool, key=lambda c: posted[c], reverse=True)[:K]
nw = metrics(newest)
rnd = (K * len(wanted) / n, K * len(must) / n, K * len(bad) / n)
print(f"top {K}      wanted / must / pass")
print(f"  random        {rnd[0]:.1f} / {rnd[1]:.1f} / {rnd[2]:.1f}")
print(f"  newest 10     {nw[0]} / {nw[1]} / {nw[2]}   (today's cap)")

rows = [r for r in jl(f"{ranker}/results.jsonl") if r.get("answer")]
allrows = jl(f"{ranker}/results.jsonl")
print(f"\n{ranker}: {len(allrows)} reps, {len(rows)} valid, {len(jl(ranker + '/errors.jsonl'))} error rows")
if not rows:
    sys.exit(1)
m = [metrics(r["answer"]["ranking"][:K]) for r in rows]
for name, idx in (("wanted", 0), ("must", 1), ("pass", 2)):
    v = [x[idx] for x in m]
    print(f"  top {K} {name:6s} mean {st.mean(v):.1f} (range {min(v)}-{max(v)}), per rep {v}")
for k in (5, 10, 15):
    v = [len(set(r["answer"]["ranking"][:k]) & wanted) / k for r in rows]
    print(f"  precision of wanted at k={k}: mean {st.mean(v):.0%}  (base rate {len(wanted) / n:.0%})")

# permutation null for the mean over reps: how often does a random top-10 reach this wanted count
random.seed(1)
mw = st.mean(x[0] for x in m)
null = [len(set(random.sample(pool, K)) & wanted) for _ in range(20000)]
print(f"  chance a random top 10 has >= {mw:.1f} wanted: {sum(x >= mw for x in null) / len(null):.3f}")

def spearman(x, y):
    rx = {v: i for i, v in enumerate(sorted(x))}; ry = {v: i for i, v in enumerate(sorted(y))}
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
bias = st.mean(abs(x) for x in rhos)
print(f"  position bias: per rep {[round(x, 2) for x in rhos]}, mean abs {bias:.2f}")
ov = [len(set(a["answer"]["ranking"][:K]) & set(b["answer"]["ranking"][:K])) / K for a, b in itertools.combinations(rows, 2)] if len(rows) > 1 else [0]
print(f"  top-10 overlap between reps: mean {st.mean(ov):.0%} (min {min(ov):.0%})")

cnt = {}
for r in rows:
    for c in r["answer"]["ranking"][:K]:
        cnt[c] = cnt.get(c, 0) + 1
print("  most frequent top-10 cases (gold tier):")
for c, v in sorted(cnt.items(), key=lambda x: -x[1])[:16]:
    t = re.search(r"^Title: (.*)$", cases[c]["prompt"], re.M).group(1)[:55]
    print(f"    {c} {v}/{len(rows)} {tier[c]:9s} {t}")

g = {
    "G1 wanted > random and > newest-10": mw > rnd[0] and mw > nw[0],
    "G2 must >= random+1": st.mean(x[1] for x in m) >= rnd[1] + 1,
    "G3 pass < random": st.mean(x[2] for x in m) < rnd[2],
    "G4 valid 6/6": len(rows) == 6 and len(allrows) == 6,
    "G5 position bias < 0.2": bias < 0.2,
    "G6 overlap >= 60%": st.mean(ov) >= 0.6,
}
print("\nGuardrails:")
for k, ok in g.items():
    print(f"  {'PASS' if ok else 'FAIL'}  {k}")
print("VERDICT:", "pass" if all(g.values()) else "fail (hypothesis not supported)")
