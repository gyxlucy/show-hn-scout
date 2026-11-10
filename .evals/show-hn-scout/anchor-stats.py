#!/usr/bin/env python3
"""Validate the anchor-comparison variant on the real day (day-1104).

usage: python3 anchor-stats.py day-1104/haiku_v9 [day-1104/haiku_v7]
Gold = day-1104/tier.jsonl (her tiers). The rule is fixed in advance: push when the post's mean rank over reps <= 3.
Guardrails (declared before the run, see v9/change.md):
  G1 valid: at least 97% of the calls return a valid answer, no post without a valid rep
  G2 selective: between 3 and 15 of the 54 posts are pushed
  G3 precision: wanted (push+must) >= 75% of the pushed posts (base rate 48%)
  G4 few passes: gold-pass <= 15% of the pushed posts
  G5 order: mean rank of must-read < push < pass
  G6 stable: all reps agree on push / not push for >= 80% of the posts
The threshold sweep is descriptive only; the threshold is not chosen from it.
"""
import json, os, re, sys, statistics as st, itertools, random

run = sys.argv[1]
v7 = sys.argv[2] if len(sys.argv) > 2 else None
setdir = os.path.dirname(run)
PUSH_RANK = 3
jl = lambda p: [json.loads(l) for l in open(p) if l.strip()] if os.path.exists(p) else []
tier = {r["id"]: r["tier"] for r in jl(f"{setdir}/tier.jsonl")}
cases = {r["id"]: r for r in jl(f"{setdir}/cases.jsonl")}
pool = sorted(tier)
n = len(pool)
wanted = {c for c in pool if tier[c] in ("push", "must_read")}
must = {c for c in pool if tier[c] == "must_read"}
bad = {c for c in pool if tier[c] == "pass"}
print(f"pool {n}: must {len(must)}, push {len(wanted) - len(must)}, pass {len(bad)}  (wanted base rate {len(wanted) / n:.0%})")

allrows = jl(f"{run}/results.jsonl")
rows = [r for r in allrows if r.get("answer") and r["grade"]["valid"] == 1]
errs = jl(f"{run}/errors.jsonl")
print(f"\n{run}: {len(allrows)} rows, {len(rows)} valid, {len(errs)} error rows")
by = {}
for r in rows:
    by.setdefault(r["prompt_id"], []).append(r["answer"]["rank"])
reps = max((len(v) for v in by.values()), default=0)
missing = [c for c in pool if c not in by]
mean = {c: st.mean(v) for c, v in by.items()}

def counts(s):
    s = set(s)
    return len(s & wanted), len(s & must), len(s & bad)

push = sorted((c for c in pool if c in mean and mean[c] <= PUSH_RANK), key=lambda c: mean[c])
N = len(push)
w, m, b = counts(push)
print(f"\nrule: push when mean rank over {reps} reps <= {PUSH_RANK}   ->  pushed {N} of {n}")
if N:
    print(f"  pushed: wanted {w} ({w / N:.0%}), must-read {m} of {len(must)}, gold-pass {b} ({b / N:.0%})")
    print(f"  recall of wanted {w / len(wanted):.0%}, of must-read {m / len(must):.0%}")
    posted = {c: re.search(r"^Posted \(UTC\): (.*)$", cases[c]["prompt"], re.M).group(1) for c in pool}
    nw = counts(sorted(pool, key=lambda c: posted[c], reverse=True)[:N])
    print(f"  same count N={N}: random {N * len(wanted) / n:.1f} wanted / {N * len(must) / n:.1f} must / {N * len(bad) / n:.1f} pass; newest-N {nw[0]} / {nw[1]} / {nw[2]}")
    if v7 and os.path.exists(f"{v7}/results.jsonl"):
        r7 = [r for r in jl(f"{v7}/results.jsonl") if r.get("answer")]
        c7 = [counts(r["answer"]["ranking"][:N]) for r in r7]
        print(f"  v7 top-{N} (mean over {len(r7)} reps): {st.mean(x[0] for x in c7):.1f} wanted / {st.mean(x[1] for x in c7):.1f} must / {st.mean(x[2] for x in c7):.1f} pass   (v7 sees the whole day, v9 sees each post alone)")
    random.seed(1)
    null = [len(set(random.sample(pool, N)) & wanted) for _ in range(20000)]
    print(f"  chance a random {N} has >= {w} wanted: {sum(x >= w for x in null) / len(null):.3f}")

print("\nmean rank by her tier (1 = strongest, 11 = beats none):")
tm = {}
for t in ("must_read", "push", "pass"):
    v = [mean[c] for c in pool if tier[c] == t and c in mean]
    tm[t] = st.mean(v) if v else float("nan")
    print(f"  {t:9s} {tm[t]:.2f}  (n={len(v)})")

print("\nthreshold sweep (descriptive only; threshold is NOT chosen from this):")
print("  rank<=k  pushed  wanted  must  pass  wanted-precision")
for k in range(1, 9):
    s = [c for c in pool if c in mean and mean[c] <= k]
    if not s: print(f"  {k:7d}  {0:6d}"); continue
    a, b2, c2 = counts(s)
    print(f"  {k:7d}  {len(s):6d}  {a:6d}  {b2:4d}  {c2:4d}  {a / len(s):.0%}")

per = {c: [x <= PUSH_RANK for x in v] for c, v in by.items()}
unan = [len(set(v)) == 1 for v in per.values()]
spread = [max(v) - min(v) for v in by.values()]
print(f"\nstability: all {reps} reps agree on push/not-push for {sum(unan) / len(unan):.0%} of posts; rank range over reps mean {st.mean(spread):.1f}, max {max(spread)}")
inv = [r["answer"]["inversions"] for r in rows]
print(f"inconsistent answers (beats a higher reference but not a lower one): {sum(x > 0 for x in inv)} of {len(inv)} calls, mean {st.mean(inv):.2f} pairs")
print(f"tokens per call: in {st.mean(r['usage']['input_tokens'] for r in rows):.0f}, out {st.mean(r['usage']['output_tokens'] for r in rows):.0f}")

print("\npushed posts (mean rank, tier):")
for c in push:
    t = re.search(r"^Title: (.*)$", cases[c]["prompt"], re.M).group(1)[:58]
    print(f"  {mean[c]:4.1f} {tier[c]:9s} {c} {t}")
print("must-read posts not pushed:")
for c in sorted(must - set(push), key=lambda c: mean.get(c, 99)):
    t = re.search(r"^Title: (.*)$", cases[c]["prompt"], re.M).group(1)[:58]
    print(f"  {mean.get(c, float('nan')):4.1f} {c} {t}")

g = {
    "G1 valid >= 97%, every post answered": len(rows) >= 0.97 * len(allrows) and not missing and len(allrows) == n * reps,
    "G2 3 <= pushed <= 15": 3 <= N <= 15,
    "G3 wanted >= 75% of pushed": N > 0 and w / N >= 0.75,
    "G4 gold-pass <= 15% of pushed": N > 0 and b / N <= 0.15,
    "G5 mean rank must < push < pass": tm["must_read"] < tm["push"] < tm["pass"],
    "G6 unanimous push/not-push >= 80%": sum(unan) / len(unan) >= 0.8,
}
print("\nGuardrails:")
for k, ok in g.items():
    print(f"  {'PASS' if ok else 'FAIL'}  {k}")
print("VERDICT:", "pass" if all(g.values()) else "fail (hypothesis not supported)")
