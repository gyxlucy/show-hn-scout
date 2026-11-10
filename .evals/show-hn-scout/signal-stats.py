"""Where does the judger's reading of the rubric part ways with the reader's labels?

Usage (from anywhere): python3 signal-stats.py <result-dir> [...]     e.g. train60/haiku_v5

Reads results.jsonl of a structured (v5-style) run, where each answer carries per-criterion `signals`
(P1-P5 push criteria, X1-X4 pass criteria). There are no human signal labels, so nothing here says whether the judger's
reading of a single criterion is right. It shows which criteria the judger leans on when it is wrong about the final
label, and whether its stated signals support its decision. Rows are reps of the same case: counts are rows, and reps
are correlated, so read small differences as noise.
"""
import collections
import json
import os
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = ["P1", "P2", "P3", "P4", "P5"]
X = ["X1", "X2", "X3", "X4"]
ALL = P + X


def load(d):
    return [json.loads(l) for l in open(os.path.join(d, "results.jsonl"))]


def fired(r):
    s = (r.get("answer") or {}).get("signals") or {}
    return {k for k in ALL if s.get(k, {}).get("present")}


def pct(a, b):
    return f"{a / b:.0%} ({a}/{b})" if b else "–"


def report(d):
    rows = [r for r in load(d) if r["status"] == "ok" and (r.get("answer") or {}).get("signals")]
    if not rows:
        print(f"{d}: no structured rows")
        return
    n = len(rows)
    gp = [r for r in rows if r["expected"] == "push"]
    gn = [r for r in rows if r["expected"] == "pass"]
    print(f"## {d}  ({n} structured rows, {len({r['prompt_id'] for r in rows})} cases; human push {len(gp)} rows, pass {len(gn)} rows)\n")

    print("### Per criterion\n")
    print("| criterion | fired | when fired, human said push | fired on human-push rows | fired on human-pass rows |")
    print("|---|---|---|---|---|")
    for k in ALL:
        f = [r for r in rows if k in fired(r)]
        print(f"| {k} | {pct(len(f), n)} | {pct(sum(r['expected'] == 'push' for r in f), len(f))} | {pct(sum(k in fired(r) for r in gp), len(gp))} | {pct(sum(k in fired(r) for r in gn), len(gn))} |")

    def decision(r):
        return r["answer"]["decision"]

    fp = [r for r in gn if decision(r) == "push"]
    fn = [r for r in gp if decision(r) == "pass"]
    print(f"\n### Over-pushes: the judger pushed, the reader said pass ({len(fp)} rows)\n")
    print("Criteria present on those rows (a row can have several). `only` = the sole P criterion, i.e. the one that carried the push:\n")
    c, only = collections.Counter(), collections.Counter()
    for r in fp:
        ps = [k for k in P if k in fired(r)]
        c.update(ps)
        if len(ps) == 1:
            only[ps[0]] += 1
    for k in P:
        print(f"- {k}: {c[k]} rows, {only[k]} as the only P")
    print("\nBy case (one entry per rep; criteria that fired):")
    byc = collections.defaultdict(list)
    for r in fp:
        byc[r["prompt_id"]].append(sorted(k for k in P if k in fired(r)))
    for cid, v in sorted(byc.items()):
        print(f"- {cid}: {len(v)} rows -> {' | '.join(','.join(x) or '-' for x in v)}")

    print(f"\n### Missed pushes: the reader said push, the judger passed ({len(fn)} rows)\n")
    c = collections.Counter()
    for r in fn:
        c.update(k for k in ALL if k in fired(r))
    print("Criteria present on those rows: " + (", ".join(f"{k} {c[k]}" for k in ALL if c[k]) or "none (no criterion fired at all)"))
    nothing = sum(1 for r in fn if not any(k in fired(r) for k in P))
    print(f"Rows where no P fired (the judger saw no push reason): {nothing} of {len(fn)}; rows where a P fired but an X was also present: {sum(1 for r in fn if any(k in fired(r) for k in P) and any(k in fired(r) for k in X))}")
    byc = collections.defaultdict(list)
    for r in fn:
        byc[r["prompt_id"]].append(sorted(fired(r)))
    for cid, v in sorted(byc.items()):
        print(f"- {cid}: {len(v)} rows -> {' | '.join(','.join(x) or '-' for x in v)}")

    gr = [r["grade"]["sig_grounded"] for r in rows if r["grade"].get("sig_grounded") is not None]
    co = [r["grade"]["sig_consistent"] for r in rows if r["grade"].get("sig_consistent") is not None]
    print("\n### Does the stated basis support the decision?\n")
    print(f"- quotes found verbatim in the evidence (all quotes on a row): {pct(sum(gr), len(gr))}")
    print(f"- decision follows from the signals (push has a P; pass with a P has an X): {pct(sum(co), len(co))}")
    bad = [r for r in rows if r["grade"].get("sig_consistent") == 0]
    for r in bad[:10]:
        print(f"  - inconsistent: case {r['prompt_id']} rep {r['rep']} decision {decision(r)}, fired {sorted(fired(r))}")
    print()


for d in sys.argv[1:]:
    report(d)
