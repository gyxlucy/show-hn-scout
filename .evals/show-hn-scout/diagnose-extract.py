"""DIAGNOSTIC ONLY, not a graded metric. Extracts the last {"decision": ...} object from each raw reply (so replies wrapped in
<think>...</think> or stray tags still count) and prints agreement against gold with a case-clustered bootstrap.
Usage: python3 diagnose-extract.py heldout/<result-dir> [...]   (run from .evals/show-hn-scout)"""
import json, re, collections, random, os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
dec = json.JSONDecoder()

def extract(t):
    last = None
    for m in re.finditer(r'\{\s*"decision"', t):
        try:
            o, _ = dec.raw_decode(t[m.start():])
            last = o
        except Exception:
            pass
    return last['decision'] if last and last.get('decision') in ('push', 'pass', 'unsure') else None

gold = {json.loads(l)['id']: json.loads(l)['expected']['decision'] for l in open('heldout/gold.jsonl')}

def boot(rows, B=2000):
    by = collections.defaultdict(list)
    for r in rows:
        by[r[0]].append(r)
    ids = list(by)
    random.seed(1)
    vs = []
    for _ in range(B):
        s = [x for i in random.choices(ids, k=len(ids)) for x in by[i]]
        vs.append(sum(g == a for _, g, a in s) / len(s))
    vs.sort()
    return vs[int(.025 * B)], vs[int(.975 * B)]

for d in sys.argv[1:]:
    res = [json.loads(l) for l in open(d + '/results.jsonl')]
    errs = sum(1 for _ in open(d + '/errors.jsonl')) if os.path.exists(d + '/errors.jsonl') else 0
    rows = []
    strict = 0
    for r in res:
        raw = json.load(open(f"{d}/raw/{r['prompt_id']}_rep{r['rep']}.json"))['run']
        t = ''.join(p.get('text', '') for p in raw['transcript'][-1]['parts'] if p['type'] == 'text')
        rows.append((r['prompt_id'], gold[r['prompt_id']], extract(t)))
        strict += r['grade']['agree'] == 1
    n = len(rows)
    c = collections.Counter((g, a or 'none') for _, g, a in rows)
    ag = sum(g == a for _, g, a in rows)
    lo, hi = boot(rows)
    valid = sum(1 for r in res if r['answer'])
    P = sum(v for (g, a), v in c.items() if a == 'push')
    tp = c[('push', 'push')]
    G = sum(v for (g, a), v in c.items() if g == 'push')
    S = sum(v for (g, a), v in c.items() if g == 'pass')
    extracted = sum(1 for *_, a in rows if a)
    print(d, 'rows', n, 'errors', errs, '| strict valid', valid, 'strict agree', strict, f'{strict/n:.0%}',
          '| extracted', extracted, f'agree {ag/n:.0%} [{lo:.0%}-{hi:.0%}]')
    print('  confusion', dict(c))
    print(f'  pushes {P}  precision {tp}/{P}  recall {tp}/{G}  specificity {c[("pass","pass")]}/{S}')
    print('  tokens in/out', sum(r['usage']['input_tokens'] for r in res), sum(r['usage']['output_tokens'] for r in res),
          'latency med', sorted(r['latency_s'] for r in res)[n // 2], 'tools', sum(r['tool_calls'] for r in res))
    jr = [r['grade'] for r in res if r['grade'].get('grounded') is not None]
    print('  judged rows', len(jr), {k: sum(g[k] for g in jr) for k in ('grounded', 'specific', 'consistent')})
