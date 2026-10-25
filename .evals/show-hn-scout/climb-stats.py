"""Strict (signed-off parser) decision stats with case-clustered bootstrap. Usage: python3 climb-stats.py <result-dir> [...]"""
import json, sys, os, random, collections
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def load(d): return [json.loads(l) for l in open(d + '/results.jsonl')]
def stats(rows):
    c = collections.Counter((r['expected'], (r['answer'] or {}).get('decision', 'invalid')) for r in rows)
    n = len(rows); ag = sum(r['grade']['agree'] == 1 for r in rows)
    P = sum(v for (g, a), v in c.items() if a == 'push'); tp = c[('push', 'push')]
    G = sum(v for (g, a), v in c.items() if g == 'push'); S = sum(v for (g, a), v in c.items() if g == 'pass')
    return dict(n=n, agree=ag / n, pushes=P, precision=(tp / P if P else None), recall=tp / G, pass_recall=c[('pass', 'pass')] / S,
                unsure=sum(v for (g, a), v in c.items() if a == 'unsure') / n, invalid=sum(v for (g, a), v in c.items() if a == 'invalid') / n, confusion=dict(c))
def boot(rows, f, B=2000, seed=1):
    by = collections.defaultdict(list)
    for r in rows: by[r['prompt_id']].append(r)
    ids = list(by); random.seed(seed); vs = []
    for _ in range(B):
        s = [x for i in random.choices(ids, k=len(ids)) for x in by[i]]
        v = f(s)
        if v is not None: vs.append(v)
    vs.sort(); return vs[int(.025 * len(vs))], vs[int(.975 * len(vs))]
if __name__ == '__main__':
    for d in sys.argv[1:]:
        rows = load(d); s = stats(rows)
        lo, hi = boot(rows, lambda x: stats(x)['agree'])
        jr = [r['grade'] for r in rows if r['grade'].get('grounded') is not None]
        by = collections.defaultdict(set)
        for r in rows: by[r['prompt_id']].add((r['answer'] or {}).get('decision', 'invalid'))
        print(d, {k: (round(v, 3) if isinstance(v, float) else v) for k, v in s.items() if k != 'confusion'}, f'CI [{lo:.0%}-{hi:.0%}]')
        print('  confusion', s['confusion'])
        print('  judge', len(jr), {k: sum(g[k] for g in jr) for k in ('grounded', 'specific', 'consistent')}, '| cases with identical decision on all reps', sum(len(v) == 1 for v in by.values()), '/', len(by))
