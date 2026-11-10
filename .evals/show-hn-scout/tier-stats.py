"""How many posts does a variant push, and how many of the reader's "must-read" ones does it keep?

Usage: python3 tier-stats.py <result-dir> [...]     e.g. train60/haiku_v6   (set dir is the parent of the result dir)

Reads <set>/tier.jsonl (human tiers: must_read | push | pass; must_read is the reader's own top pick among her pushes)
and the variant's results.jsonl. Counts are small (train60 has 6 must-reads), so numbers are counts, not percentages with
intervals, and a variant tuned on this set is only a feasibility check, not a measured improvement.
"""
import collections, json, os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def main(d):
    setdir = os.path.dirname(d.rstrip("/"))
    tier = {j["id"]: j["tier"] for j in map(json.loads, open(os.path.join(setdir, "tier.jsonl")))}
    rows = [json.loads(l) for l in open(os.path.join(d, "results.jsonl"))]
    by = collections.defaultdict(list)
    for r in rows:
        if r["status"] == "ok" and r["answer"]:
            by[r["prompt_id"]].append(r["answer"]["decision"] == "push")
    n = len(by)
    rate = {k: sum(v) / len(v) for k, v in by.items()}
    pushed = {k for k, v in rate.items() if v >= 0.5}  # case counts as pushed when at least half of its reps push
    allrows = [x for v in by.values() for x in v]
    core = {j["id"] for j in map(json.loads, open(os.path.join(setdir, "tier.jsonl"))) if j.get("core")}
    mr = [k for k, t in tier.items() if t == "must_read" and k in by]
    print(f"## {d}  ({n} cases, {len(allrows)} rows)")
    print(f"- push rate: {len(pushed)}/{n} cases ({len(pushed)/n:.0%}); rows {sum(allrows)}/{len(allrows)} ({sum(allrows)/len(allrows):.0%}). Scale: 105 posts/day x this rate = about {105*len(pushed)/n:.0f} pushes a day before the cap")
    print(f"- must-read kept: {sum(k in pushed for k in mr)}/{len(mr)}; of the {len(core)} she ticked herself first (core): {sum(k in pushed for k in core)}/{len(core)}")
    print("  per case push-rate over reps: " + ", ".join(f"{k}{'*' if k in core else ''}:{rate[k]:.2f}" for k in mr) + "  (* = core)")
    comp = collections.Counter(tier[k] for k in pushed if k in tier)
    print(f"- what it pushed: {comp['must_read']} must-read, {comp['push']} other reader-push, {comp['pass']} reader-pass")
    if pushed:
        print(f"- of the pushes, must-read share {comp['must_read']/len(pushed):.0%}, reader-wants-it (must-read + other push) {(comp['must_read']+comp['push'])/len(pushed):.0%}")
    missed = [k for k in tier if tier[k] == "push" and k in by and k not in pushed]
    print(f"- ordinary reader-push cases dropped: {len(missed)} of {sum(1 for t in tier.values() if t=='push')}")
    strength_part(d, tier, core)

def strength_part(d, tier, core):
    rows = [json.loads(l) for l in open(os.path.join(d, "results.jsonl"))]
    sc = collections.defaultdict(list)  # a case's score: strength of each rep's push, 0 for pass/unsure/no answer
    seen = False
    for r in rows:
        if r["status"] != "ok" or not r["answer"]:
            continue
        a = r["answer"]
        st = a.get("strength") if a["decision"] == "push" else 0
        seen = seen or a.get("strength") is not None
        sc[r["prompt_id"]].append(st or 0)
    if not seen:
        return
    score = {k: sum(v) / len(v) for k, v in sc.items()}
    n = len(score)
    group = lambda k: "core" if k in core else tier[k]
    print("- strength (case score = mean over reps; a pass counts 0):")
    for g, lab in (("core", "core must-read"), ("must_read", "other must-read"), ("push", "other reader-push"), ("pass", "reader-pass")):
        ks = [k for k in score if group(k) == g]
        if ks:
            print(f"    {lab:18s} n={len(ks):2d}  mean strength {sum(score[k] for k in ks)/len(ks):.2f}  ({sum(score[k]>=2 for k in ks)} with >=2, {sum(score[k]>=2.5 for k in ks)} with >=2.5)")
    target = {k for k in score if tier[k] == "must_read"}
    def top_k(k, hit):
        """Expected number of `hit` cases among the k best by score; ties split in proportion (no tie-break luck)."""
        order = sorted(score, key=lambda c: -score[c]); got = 0.0; i = 0; left = k
        while i < len(order) and left > 0:
            j = i
            while j < len(order) and score[order[j]] == score[order[i]]:
                j += 1
            grp = order[i:j]; take = min(left, len(grp))
            got += take * sum(c in hit for c in grp) / len(grp); left -= take; i = j
        return got
    hit_core = {k for k in score if k in core}
    print(f"- if a cap keeps the k best by strength (ties split evenly), base rate = random order:")
    for k in (6, 10, 13):
        print(f"    k={k:2d}: must-read {top_k(k, target):4.1f}/{k} (random {k*len(target)/n:.1f}), core {top_k(k, hit_core):3.1f} of {len(hit_core)} (random {k*len(hit_core)/n:.1f})")
    for th in (2, 2.5, 3):
        ps = {k for k in score if score[k] >= th}
        if ps:
            print(f"    push only when score >= {th}: {len(ps)}/{n} cases ({len(ps)/n:.0%}, about {105*len(ps)/n:.0f} a day), must-read {len(ps & target)}, other push {sum(tier[k]=='push' for k in ps)}, pass {sum(tier[k]=='pass' for k in ps)}")
    print()

for d in sys.argv[1:]:
    main(d)
