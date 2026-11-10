#!/usr/bin/env python3
"""Build docs/judger-metrics-report.html: a self-contained, script-free explainer of how the Show HN Scout eval is scored,
with every number recomputed from the results.jsonl files (same strict stats as climb-stats.py).
Usage: python3 .evals/show-hn-scout/build-metrics-report.py"""
import html, json, os, re, collections, sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
sys.path.insert(0, HERE)
from importlib import import_module
cs = import_module('climb-stats')
OUT = os.path.abspath(os.path.join(HERE, '..', '..', 'docs', 'judger-metrics-report.html'))
esc = html.escape

# ---------------------------------------------------------------- data
SETS = [  # (key, title, note, [(variant label, dir)])
    ('dev', 'dev', '30 条 × 3 次 · 写 rubric 时用过，已污染', [('baseline', 'baseline'), ('v1', 'haiku_v1'), ('v3', 'haiku_v3')]),
    ('heldout', 'held-out 1', '30 条 × 3 次 · 选过两次 winner', [('baseline', 'heldout/haiku_baseline'), ('v1', 'heldout/haiku_v1'), ('v3', 'heldout/haiku_v3')]),
    ('train2', 'train2', '30 条 × 3 次 · 新抽样', [('baseline', 'fresh-train/haiku_baseline'), ('v1', 'fresh-train/haiku_v1'), ('v3', 'fresh-train/haiku_v3')]),
    ('train60', 'train60', '60 条 · hill-climb 训练集（v4 只跑 2 次）', [('baseline', 'train60/haiku_baseline'), ('v1', 'train60/haiku_v1'), ('v3', 'train60/haiku_v3'), ('v4', 'train60/haiku_v4')]),
    ('test2', 'test2', '30 条 × 2 次 · 锁定，只跑一次', [('baseline', 'fresh-test/haiku_baseline'), ('v3', 'fresh-test/haiku_v3')]),
]
COLORS = {'baseline': '#9aa4b2', 'v1': '#5b8def', 'v3': '#1f9d7a', 'v4': '#e08a2c'}


def load(d):
    return [json.loads(l) for l in open(d + '/results.jsonl')]


STAT = {}
for key, title, note, variants in SETS:
    for label, d in variants:
        rows = [r for r in load(d) if r['status'] == 'ok']
        st = cs.stats(rows)
        lo, hi = cs.boot(rows, lambda x: cs.stats(x)['agree'])
        gold = {}
        for r in rows:
            gold[r['prompt_id']] = r['expected']
        gpush = sum(v == 'push' for v in gold.values())
        jr = [r['grade'] for r in rows if r['grade'].get('grounded') is not None]
        STAT[(key, label)] = dict(st=st, lo=lo, hi=hi, n_cases=len(gold), gpush=gpush, jr=jr, rows=rows)

# ---------------------------------------------------------------- svg helpers


def pct(x, d=0):
    return '–' if x is None else f'{x * 100:.{d}f}%'


def bar_chart_agree():
    W, left, right = 900, 270, 70
    plot_w = W - left - right
    x = lambda v: left + v * plot_w
    y = 10
    parts = []
    for key, title, note, variants in SETS:
        base = STAT[(key, variants[0][0])]
        ap = base['gpush'] / base['n_cases']
        top = y
        h = 22 * len(variants) + 34
        parts.append(f'<rect x="0" y="{top}" width="{W}" height="{h}" fill="{"#f6f8fa" if SETS.index((key, title, note, variants)) % 2 == 0 else "#ffffff"}"/>')
        parts.append(f'<text x="10" y="{top + 20}" font-size="14" font-weight="700" fill="#1f2328">{esc(title)}</text>')
        parts.append(f'<text x="10" y="{top + 38}" font-size="11" fill="#57606a">{esc(note)}</text>')
        parts.append(f'<text x="10" y="{top + 54}" font-size="11" fill="#57606a">全推 {pct(ap)} · 全 pass {pct(1 - ap)}</text>')
        for i, (label, d) in enumerate(variants):
            s = STAT[(key, label)]
            by = top + 28 + i * 22
            v = s['st']['agree']
            parts.append(f'<text x="{left - 10}" y="{by + 12}" font-size="12" text-anchor="end" fill="#1f2328">{label}</text>')
            parts.append(f'<rect x="{x(0)}" y="{by}" width="{x(v) - x(0):.1f}" height="16" fill="{COLORS[label]}" rx="2"/>')
            parts.append(f'<line x1="{x(s["lo"]):.1f}" x2="{x(s["hi"]):.1f}" y1="{by + 8}" y2="{by + 8}" stroke="#1f2328" stroke-width="1.5"/>')
            parts.append(f'<line x1="{x(s["lo"]):.1f}" x2="{x(s["lo"]):.1f}" y1="{by + 3}" y2="{by + 13}" stroke="#1f2328" stroke-width="1.5"/>')
            parts.append(f'<line x1="{x(s["hi"]):.1f}" x2="{x(s["hi"]):.1f}" y1="{by + 3}" y2="{by + 13}" stroke="#1f2328" stroke-width="1.5"/>')
            parts.append(f'<text x="{x(s["hi"]) + 8:.1f}" y="{by + 12}" font-size="12" font-weight="700" fill="#1f2328">{pct(v)}</text>')
        # trivial baselines
        parts.append(f'<line x1="{x(ap):.1f}" x2="{x(ap):.1f}" y1="{top + 22}" y2="{top + h - 4}" stroke="#d1642b" stroke-width="1.5" stroke-dasharray="4 3"/>')
        parts.append(f'<line x1="{x(1 - ap):.1f}" x2="{x(1 - ap):.1f}" y1="{top + 22}" y2="{top + h - 4}" stroke="#8250df" stroke-width="1.5" stroke-dasharray="4 3"/>')
        y += h
    # axis
    axis = []
    for t in range(0, 101, 20):
        axis.append(f'<line x1="{x(t / 100):.1f}" x2="{x(t / 100):.1f}" y1="6" y2="{y}" stroke="#d0d7de" stroke-width="0.6"/>')
        axis.append(f'<text x="{x(t / 100):.1f}" y="{y + 16}" font-size="11" text-anchor="middle" fill="#57606a">{t}%</text>')
    legend = (f'<line x1="{left}" x2="{left + 28}" y1="{y + 38}" y2="{y + 38}" stroke="#d1642b" stroke-width="1.5" stroke-dasharray="4 3"/>'
              f'<text x="{left + 34}" y="{y + 42}" font-size="12" fill="#1f2328">全推（always-push）</text>'
              f'<line x1="{left + 190}" x2="{left + 218}" y1="{y + 38}" y2="{y + 38}" stroke="#8250df" stroke-width="1.5" stroke-dasharray="4 3"/>'
              f'<text x="{left + 224}" y="{y + 42}" font-size="12" fill="#1f2328">全 pass（always-pass）</text>'
              f'<text x="{left + 400}" y="{y + 42}" font-size="12" fill="#57606a">黑线 = 95% 区间（按 case 聚类 bootstrap）</text>')
    H = y + 56
    return f'<svg viewBox="0 0 {W} {H}" width="100%" role="img" aria-label="各集合上 agree 对比">' + ''.join(parts) + ''.join(axis) + legend + '</svg>'


def grouped_bars(groups, series, width=860, height=300, title_y=None):
    """groups: [(label, [v1, v2, ...])]; series: [(name, color)]. Values in 0..1 (None = no bar)."""
    left, right, top, bottom = 44, 10, 20, 56
    pw, ph = width - left - right, height - top - bottom
    gw = pw / len(groups)
    bw = min(34, (gw - 22) / len(series))
    parts = []
    for t in range(0, 101, 20):
        yy = top + ph * (1 - t / 100)
        parts.append(f'<line x1="{left}" x2="{width - right}" y1="{yy:.1f}" y2="{yy:.1f}" stroke="#d0d7de" stroke-width="0.6"/>')
        parts.append(f'<text x="{left - 6}" y="{yy + 4:.1f}" font-size="11" text-anchor="end" fill="#57606a">{t}%</text>')
    for gi, (label, vals) in enumerate(groups):
        gx = left + gi * gw + (gw - bw * len(series)) / 2
        for si, v in enumerate(vals):
            if v is None:
                continue
            bh = ph * v
            bx = gx + si * bw
            parts.append(f'<rect x="{bx:.1f}" y="{top + ph - bh:.1f}" width="{bw - 3:.1f}" height="{bh:.1f}" fill="{series[si][1]}" rx="2"/>')
            parts.append(f'<text x="{bx + (bw - 3) / 2:.1f}" y="{top + ph - bh - 4:.1f}" font-size="11" text-anchor="middle" fill="#1f2328">{v * 100:.0f}</text>')
        parts.append(f'<text x="{left + gi * gw + gw / 2:.1f}" y="{top + ph + 18}" font-size="12" text-anchor="middle" fill="#1f2328">{esc(label)}</text>')
    lx = left
    for name, color in series:
        parts.append(f'<rect x="{lx}" y="{height - 22}" width="12" height="12" fill="{color}" rx="2"/><text x="{lx + 18}" y="{height - 12}" font-size="12" fill="#1f2328">{esc(name)}</text>')
        lx += 18 + 9 * len(name) + 26
    return f'<svg viewBox="0 0 {width} {height}" width="100%">' + ''.join(parts) + '</svg>'


def confusion_svg(c, highlight):
    """c = dict {(human, agent): n}; highlight in {'agree','precision','recall'}"""
    W, H = 300, 250
    cw, ch, ox, oy = 100, 72, 100, 60
    cells = {('push', 'push'): (0, 0), ('push', 'pass'): (1, 0), ('pass', 'push'): (0, 1), ('pass', 'pass'): (1, 1)}
    # cell -> role
    fills = {}
    for (h, a), (cx, cy) in cells.items():
        if highlight == 'agree':
            fills[(h, a)] = '#2da44e' if h == a else '#eaeef2'
        elif highlight == 'precision':
            fills[(h, a)] = ('#2da44e' if h == 'push' else '#e5534b') if a == 'push' else '#eaeef2'
        else:
            fills[(h, a)] = ('#2da44e' if a == 'push' else '#e5534b') if h == 'push' else '#eaeef2'
    p = [f'<text x="{ox + cw}" y="20" font-size="12" text-anchor="middle" fill="#57606a">agent 的判断</text>',
         f'<text x="{ox + cw / 2}" y="46" font-size="12" text-anchor="middle" fill="#1f2328">push</text>',
         f'<text x="{ox + cw * 1.5}" y="46" font-size="12" text-anchor="middle" fill="#1f2328">pass</text>',
         f'<text x="14" y="{oy + ch}" font-size="12" fill="#57606a" transform="rotate(-90 14 {oy + ch})" text-anchor="middle">你的标签</text>',
         f'<text x="{ox - 8}" y="{oy + ch / 2 + 4}" font-size="12" text-anchor="end" fill="#1f2328">push</text>',
         f'<text x="{ox - 8}" y="{oy + ch * 1.5 + 4}" font-size="12" text-anchor="end" fill="#1f2328">pass</text>']
    for (h, a), (cx, cy) in cells.items():
        col = fills[(h, a)]
        txt = '#ffffff' if col in ('#2da44e', '#e5534b') else '#57606a'
        p.append(f'<rect x="{ox + cx * cw}" y="{oy + cy * ch}" width="{cw - 4}" height="{ch - 4}" fill="{col}" rx="6"/>')
        p.append(f'<text x="{ox + cx * cw + (cw - 4) / 2}" y="{oy + cy * ch + ch / 2 + 6}" font-size="22" font-weight="700" text-anchor="middle" fill="{txt}">{c.get((h, a), 0)}</text>')
    return f'<svg viewBox="0 0 {W} {H - 30}" width="100%">' + ''.join(p) + '</svg>'


# ---------------------------------------------------------------- numbers used in the text
v3 = STAT[('train60', 'v3')]
conf = {k: v for k, v in v3['st']['confusion'].items()}
TP, FN, FP, TN = conf.get(('push', 'push'), 0), conf.get(('push', 'pass'), 0), conf.get(('pass', 'push'), 0), conf.get(('pass', 'pass'), 0)
N = TP + FN + FP + TN

# voting analysis (free, from existing reps)


def voting(d, reps):
    gold, r = {}, collections.defaultdict(list)
    for row in load(d):
        gold[row['prompt_id']] = row['expected']
        r[row['prompt_id']].append((row['answer'] or {}).get('decision'))
    P = sum(v == 'push' for v in gold.values())
    out = []
    for k in range(1, reps + 1):
        sel = [c for c in gold if r[c].count('push') >= k]
        tp = sum(gold[c] == 'push' for c in sel)
        out.append((f'≥{k}/{reps}' if k < reps else f'{k}/{reps}（全票）', len(sel) / len(gold), tp / len(sel) if sel else None, tp / P))
    return out


vote60 = voting('train60/haiku_v3', 3)
vote2 = voting('fresh-test/haiku_v3', 2)

# judge pass rates over all haiku rows
jr_all = [g for (k, l), s in STAT.items() for g in s['jr']]
jn = len(jr_all)
jrate = {m: sum(g[m] for g in jr_all) / jn for m in ('grounded', 'specific', 'consistent')}

# non-haiku models: lenient re-extraction (descriptive only)


def lenient(rawdir, row):
    f = f"{rawdir}/raw/{row['prompt_id']}_rep{row['rep']}.json"
    if not os.path.exists(f):
        return None
    d = json.load(open(f))['run']
    msgs = [m for m in d.get('transcript', []) if m['role'] == 'assistant']
    if not msgs:
        return None
    t = ''.join(p.get('text', '') for p in msgs[-1]['parts'] if p['type'] == 'text')
    t = re.sub(r'<think>.*?</think>', '', t, flags=re.S).strip()
    m = re.search(r'\{.*\}', t, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0)).get('decision')
    except Exception:
        return None


OTHER = []
for model, label, d, setname in [('bright-rain', 'v1', 'v1', 'dev'), ('bright-rain', 'baseline', 'heldout/baseline', 'held-out 1'), ('bright-rain', 'v1', 'heldout/v1', 'held-out 1'),
                                 ('washed-bacon', 'baseline', 'heldout/washed-bacon_baseline', 'held-out 1'), ('washed-bacon', 'v1', 'heldout/washed-bacon_v1', 'held-out 1')]:
    rows = load(d)
    valid = sum(1 for r in rows if r['grade'].get('valid') == 1)
    strict = sum(1 for r in rows if r['grade'].get('agree') == 1)
    ext = [(r, (r['answer'] or {}).get('decision') or lenient(d, r)) for r in rows]
    got = [(r, x) for r, x in ext if x]
    ag = sum(x == r['expected'] for r, x in got)
    c = collections.Counter((r['expected'], x) for r, x in got)
    P = sum(v for (g, a), v in c.items() if a == 'push')
    G = sum(v for (g, a), v in c.items() if g == 'push')
    S = sum(v for (g, a), v in c.items() if g == 'pass')
    ls = [r['latency_s'] for r in rows if r.get('latency_s')]
    OTHER.append(dict(model=model, label=label, set=setname, valid=valid, n=len(rows), strict=strict / len(rows), got=len(got), lag=ag / len(rows),
                      prec=c[('push', 'push')] / P if P else None, rec=c[('push', 'push')] / G, prate=c[('pass', 'pass')] / S, lat=sum(ls) / len(ls)))

# ---------------------------------------------------------------- figures

FIG1 = '''<svg viewBox="0 0 900 340" width="100%" role="img" aria-label="评分流程">
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#57606a"/></marker></defs>
<g font-size="13" fill="#1f2328">
<rect x="10" y="120" width="150" height="84" rx="10" fill="#eef2f7" stroke="#b6c0cc"/>
<text x="85" y="150" text-anchor="middle" font-weight="700">一条 Show HN</text><text x="85" y="170" text-anchor="middle" font-size="12" fill="#57606a">标题 · 页面文字</text><text x="85" y="187" text-anchor="middle" font-size="12" fill="#57606a">HN 评论（证据）</text>
<rect x="205" y="120" width="170" height="84" rx="10" fill="#e8f1ff" stroke="#7aa5e8"/>
<text x="290" y="148" text-anchor="middle" font-weight="700">被测 agent</text><text x="290" y="168" text-anchor="middle" font-size="12" fill="#57606a">claude-haiku-5-5 + prompt</text><text x="290" y="185" text-anchor="middle" font-size="12" fill="#57606a">一次调用 = 结果里的一行</text>
<rect x="420" y="120" width="160" height="84" rx="10" fill="#fff6e5" stroke="#e0b455"/>
<text x="500" y="148" text-anchor="middle" font-weight="700">agent 的回复</text><text x="500" y="170" text-anchor="middle" font-size="12" font-family="monospace" fill="#57606a">{decision, reason}</text><text x="500" y="187" text-anchor="middle" font-size="12" fill="#57606a">push / pass / unsure</text>
<rect x="420" y="12" width="160" height="56" rx="10" fill="#fdecef" stroke="#e08a99"/>
<text x="500" y="38" text-anchor="middle" font-weight="700">你的标签</text><text x="500" y="56" text-anchor="middle" font-size="12" fill="#57606a">push / pass（gold）</text>
<rect x="650" y="20" width="240" height="108" rx="10" fill="#e6f6ee" stroke="#6cc09a"/>
<text x="770" y="46" text-anchor="middle" font-weight="700">① 决策分（headline）</text><text x="770" y="68" text-anchor="middle" font-size="12" fill="#57606a">回复里的 decision 和你的标签比</text><text x="770" y="88" text-anchor="middle" font-size="12" fill="#1f2328">agree · precision · recall</text><text x="770" y="106" text-anchor="middle" font-size="12" fill="#1f2328">pass 识别率 · unsure · valid</text>
<rect x="650" y="206" width="240" height="108" rx="10" fill="#f1ebfb" stroke="#b79be3"/>
<text x="770" y="232" text-anchor="middle" font-weight="700">② 理由分</text><text x="770" y="254" text-anchor="middle" font-size="12" fill="#57606a">Opus 裁判：看证据 + 回复，</text><text x="770" y="271" text-anchor="middle" font-size="12" fill="#57606a">不看标签，不评对错</text><text x="770" y="296" text-anchor="middle" font-size="12" fill="#1f2328">grounded · specific · consistent</text>
</g>
<g stroke="#57606a" stroke-width="1.6" fill="none" marker-end="url(#ar)">
<path d="M160 162 H203"/><path d="M375 162 H418"/>
<path d="M580 36 H648" /><path d="M580 150 L648 100"/>
<path d="M580 176 L648 240"/>
<path d="M85 204 V325 H648" stroke-dasharray="5 4"/>
</g>
<text x="330" y="318" font-size="12" fill="#57606a">证据也原样交给裁判，用来核对理由有没有编造</text>
</svg>'''

# worked example rows (case 35, train60 v3 = held-out 1 v3 rows)
ex_rows = sorted([r for r in load('train60/haiku_v3') if r['prompt_id'] == '35'], key=lambda r: r['rep'])
ex_judge = []
for r in ex_rows:
    raw = json.load(open(f'heldout/haiku_v3/raw/35_rep{r["rep"]}.json'))
    ex_judge.append(raw['judge']['verdict'])


def chip(v, good=None):
    cls = {'push': 'push', 'pass': 'pass', 'unsure': 'unsure'}.get(v, '')
    return f'<span class="chip {cls}">{esc(str(v))}</span>'


def mark(v):
    if v is None:
        return '<span class="na">—</span>'
    return '<span class="ok">✓ 1</span>' if v == 1 else '<span class="bad">✗ 0</span>'


ex_html = ['<table class="grid"><thead><tr><th>第几次</th><th>agent 判断</th><th>agree</th><th>precision</th><th>recall</th><th>pass 识别率</th><th>unsure</th><th>valid</th></tr></thead><tbody>']
for r in ex_rows:
    g = r['grade']
    ex_html.append(f'<tr><td>rep {r["rep"] + 1}</td><td>{chip(r["answer"]["decision"])}</td><td>{mark(g["agree"])}</td><td>{mark(g["precision"])}</td><td>{mark(g["recall"])}</td>'
                   f'<td>{mark(g["specificity"])}</td><td>{g["unsure"]}</td><td>{mark(g["valid"])}</td></tr>')
ex_html.append('</tbody></table>')

# the four sample cases for the confusion matrix
CASE_TABLE = [
    ('34', 'Unspin – 给 Claude Code 的 shell 命令显示逐步进度', 'push', 'push ×3', 'TP（左上）', '3 行都算 agree，3 行进 precision 分子，3 行进 recall 分子'),
    ('33', 'shapcn – 感知形状的图标变形', 'pass', 'push ×3', 'FP（左下）', '3 行都 agree=0；3 行进 precision 分母但不进分子；3 行进 pass 识别率分母但记 0'),
    ('36', 'Finance Toolkit MCP – 500 个金融指标', 'push', 'pass ×3', 'FN（右上）', '3 行 agree=0；3 行进 recall 分母但记 0；不进 precision'),
    ('35', 'PDT – 在自己的云上部署定时任务', 'pass', 'push ×1，pass ×2', '混合：1 行 FP + 2 行 TN', '一个 case 会同时落在两个格子里，所以我们按“行”而不是按“case”数'),
]
case_html = ['<table class="grid"><thead><tr><th>case</th><th>标题</th><th>你的标签</th><th>agent 3 次</th><th>落在哪个格子</th><th>各指标怎么用到它</th></tr></thead><tbody>']
for cid, t, g, a, cell, note in CASE_TABLE:
    case_html.append(f'<tr><td>{cid}</td><td>{esc(t)}</td><td>{chip(g)}</td><td>{esc(a)}</td><td>{esc(cell)}</td><td class="small">{esc(note)}</td></tr>')
case_html.append('</tbody></table>')

# bootstrap schematic
boot_rows = [('A', 'ggg'), ('B', 'ggx'), ('C', 'xxx'), ('D', 'ggg'), ('E', 'gxg'), ('F', 'ggg')]
res = ['A', 'A', 'C', 'F', 'D', 'C']
colors = {'g': '#2da44e', 'x': '#e5534b'}


def deck(items, x0, y0):
    out = []
    for i, (name, dots) in enumerate(items):
        cx = x0 + i * 58
        out.append(f'<rect x="{cx}" y="{y0}" width="48" height="84" rx="8" fill="#ffffff" stroke="#b6c0cc"/>')
        out.append(f'<text x="{cx + 24}" y="{y0 + 20}" font-size="14" font-weight="700" text-anchor="middle" fill="#1f2328">{name}</text>')
        for j, ch in enumerate(dots):
            out.append(f'<circle cx="{cx + 24}" cy="{y0 + 36 + j * 17}" r="6" fill="{colors[ch]}"/>')
    return ''.join(out)


orig = deck(boot_rows, 10, 34)
lookup = dict(boot_rows)
resampled = deck([(n, lookup[n]) for n in res], 470, 34)
FIG4 = f'''<svg viewBox="0 0 900 190" width="100%">
<text x="10" y="20" font-size="13" font-weight="700" fill="#1f2328">原始：6 个 case，每个 3 次（绿 = agree，红 = 不 agree）</text>
{orig}
<text x="470" y="20" font-size="13" font-weight="700" fill="#1f2328">一次重抽样：按 case 有放回地抽 6 个</text>
{resampled}
<defs><marker id="ar2" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#57606a"/></marker></defs>
<path d="M370 76 H452" stroke="#57606a" stroke-width="1.6" marker-end="url(#ar2)"/>
<text x="410" y="66" font-size="11" text-anchor="middle" fill="#57606a">重抽样</text>
<text x="10" y="148" font-size="12" fill="#57606a">A 被抽到两次、B/E 没被抽到——但 A 的 3 次永远一起进出。</text>
<text x="10" y="166" font-size="12" fill="#57606a">这一次的 agree = 12/18 ≈ 67%。重复 2000 次，把这 2000 个 agree 排序，取第 2.5% 和第 97.5% 位 = 95% 区间。</text>
</svg>'''

GROUPS_TRAIN60 = [(label, [STAT[('train60', label)]['st']['precision'], STAT[('train60', label)]['st']['recall'], STAT[('train60', label)]['st']['pass_recall']]) for label in ('baseline', 'v1', 'v3', 'v4')]
FIG6 = grouped_bars(GROUPS_TRAIN60, [('precision（推出来的有多准）', '#1f9d7a'), ('recall（想推的有多少被推）', '#5b8def'), ('pass 识别率（不想推的有多少被拦住）', '#e08a2c')], height=300)

FIG7a = grouped_bars([(lab, [pre, rec]) for lab, share, pre, rec in vote60], [('precision', '#1f9d7a'), ('recall', '#5b8def')], width=420, height=250)
FIG7b = grouped_bars([(lab, [pre, rec]) for lab, share, pre, rec in vote2], [('precision', '#1f9d7a'), ('recall', '#5b8def')], width=420, height=250)

FIG_JUDGE = grouped_bars([('grounded\n有证据支持', [jrate['grounded']]), ('specific\n足够具体', [jrate['specific']]), ('consistent\n与决策一致', [jrate['consistent']])],
                         [('全部 haiku 行的通过率', '#7d5bd0')], width=520, height=230).replace('\n', ' ')

# audit probes table
audit = json.load(open('judge-audit.json'))['probes']
audit_html = ['<table class="grid"><thead><tr><th>探针（故意构造的坏回复）</th><th>应该扣掉</th><th>裁判实际给的</th></tr></thead><tbody>']
names = {'grounded and specific (positive control)': '好回复（对照）', 'empty reason': '空理由', "I don't know": '“I don\'t know”', 'answer about a different project': '回答的是另一个项目',
         'fabricated claim': '编造了一个说法', 'reason contradicts decision': '理由和决策相反'}
for p in audit:
    exp = ' / '.join(k for k, v in p['expect'].items() if not v) or '（都应通过）'
    got = ' / '.join(k for k in ('grounded', 'specific', 'consistent') if not p['got'][k]) or '（都通过）'
    audit_html.append(f'<tr><td>{esc(names.get(p["name"], p["name"]))}</td><td>{esc(exp)}</td><td>{esc(got)}</td></tr>')
audit_html.append('</tbody></table>')

# result table
res_rows = ['<table class="grid"><thead><tr><th>集合</th><th>prompt</th><th>行数</th><th>agree [95% 区间]</th><th>precision</th><th>recall</th><th>pass 识别率</th><th>unsure</th><th>理由分 (grounded/specific/consistent)</th></tr></thead><tbody>']
for key, title, note, variants in SETS:
    for i, (label, d) in enumerate(variants):
        s = STAT[(key, label)]
        st = s['st']
        jr = s['jr']
        jtxt = ' / '.join(f"{sum(g[m] for g in jr)}" for m in ('grounded', 'specific', 'consistent')) + f' of {len(jr)}'
        bold = ' class="hl"' if (key, label) in (('train60', 'v3'), ('test2', 'v3')) else ''
        res_rows.append(f'<tr{bold}><td>{esc(title) if i == 0 else ""}</td><td>{label}</td><td>{st["n"]}</td><td>{pct(st["agree"])} [{pct(s["lo"])}–{pct(s["hi"])}]</td>'
                        f'<td>{pct(st["precision"])}</td><td>{pct(st["recall"])}</td><td>{pct(st["pass_recall"])}</td><td>{pct(st["unsure"])}</td><td>{jtxt}</td></tr>')
res_rows.append('</tbody></table>')

other_rows = ['<table class="grid"><thead><tr><th>模型</th><th>集合 / prompt</th><th>严格有效回复</th><th>严格 agree</th><th>宽松 agree（去掉 &lt;think&gt; 后）</th><th>宽松 precision</th><th>宽松 recall</th><th>pass 识别率</th><th>平均耗时</th></tr></thead><tbody>']
for o in OTHER:
    other_rows.append(f'<tr><td>{o["model"]}</td><td>{o["set"]} / {o["label"]}</td><td>{o["valid"]}/{o["n"]}</td><td>{pct(o["strict"])}</td><td>{pct(o["lag"])}</td><td>{pct(o["prec"])}</td><td>{pct(o["rec"])}</td><td>{pct(o["prate"])}</td><td>{o["lat"]:.1f}s</td></tr>')
other_rows.append('</tbody></table>')

ho_h = STAT[('heldout', 'v1')]['st']['agree']
t2_v3, t2_b = STAT[('test2', 'v3')], STAT[('test2', 'baseline')]

CSS = '''
:root{color-scheme:light}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#1f2328;font:16px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",Arial,sans-serif}
main{max-width:980px;margin:0 auto;padding:32px 24px 80px}
h1{font-size:30px;line-height:1.25;margin:0 0 8px}
h2{font-size:22px;margin:48px 0 12px;padding-top:12px;border-top:1px solid #d0d7de}
h3{font-size:17px;margin:28px 0 8px}
p{margin:10px 0}
.lead{color:#57606a;font-size:17px}
.fig{margin:18px 0 8px;padding:14px 14px 6px;border:1px solid #d0d7de;border-radius:12px;background:#fff}
.cap{color:#57606a;font-size:13px;margin:4px 0 14px}
table.grid{border-collapse:collapse;width:100%;font-size:14px;margin:12px 0}
table.grid th,table.grid td{border:1px solid #d0d7de;padding:6px 9px;text-align:left;vertical-align:top}
table.grid th{background:#f6f8fa}
table.grid tr.hl td{background:#e6f6ee;font-weight:600}
.small{font-size:13px;color:#57606a}
.chip{display:inline-block;padding:1px 9px;border-radius:99px;font-size:13px;font-weight:600}
.chip.push{background:#d8f3e5;color:#15704f}.chip.pass{background:#e8ebf0;color:#44505e}.chip.unsure{background:#fff0c9;color:#7a5600}
.ok{color:#15803d;font-weight:600}.bad{color:#c62828;font-weight:600}.na{color:#8c959f}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}
.card{border:1px solid #d0d7de;border-radius:12px;padding:12px 14px;background:#fff}
.card h4{margin:0 0 4px;font-size:15px}
.formula{font-family:ui-monospace,Menlo,monospace;font-size:14px;background:#f6f8fa;border-radius:8px;padding:8px 10px;margin:6px 0}
.callout{border-left:4px solid #1f9d7a;background:#f0faf6;padding:10px 14px;border-radius:0 8px 8px 0;margin:14px 0}
.warn{border-left-color:#e08a2c;background:#fff8ec}
.quote{border-left:3px solid #b6c0cc;padding:2px 12px;color:#44505e;font-size:14px;margin:8px 0;background:#fafbfc}
ul{padding-left:22px}li{margin:4px 0}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:760px){.two{grid-template-columns:1fr}}
code{font-family:ui-monospace,Menlo,monospace;font-size:13px;background:#f0f2f5;padding:1px 5px;border-radius:4px}
'''

page = f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Show HN Scout：评分指标怎么算</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<style>{CSS}</style></head><body><main>

<h1>Show HN Scout：评分指标怎么算，以及各模型的分数对比</h1>
<p class="lead">一个 agent 判断一条 Show HN 要不要打扰你。这份报告讲清楚：我们怎么给它打分、每个数字是怎么来的、现在到底考得怎么样。所有数字都是从各目录的 <code>results.jsonl</code> 重新计算的（生成脚本：<code>.evals/show-hn-scout/build-metrics-report.py</code>）。</p>

<div class="callout"><b>先看结论</b>
<ul>
<li>有<b>两层评分</b>：① 决策分（agent 的 push/pass 和你的标签比，唯一用来选 prompt 的指标）；② 理由分（Opus 只评理由有没有编造，不评对错）。</li>
<li>能有效比较的模型只有 <b>claude-haiku-5-5</b>。另外两个模型（bright-rain、washed-bacon）回复带 &lt;think&gt; 块，通不过严格解析，没法直接比；<b>同一个 v3 prompt 换更强模型的对比还没做过</b>。</li>
<li>haiku 从 baseline → v1 → v3 稳定上升；train60 上 v3 为 <b>{pct(v3['st']['agree'])}</b>。最终一次性测试 test2 上 v3 为 <b>{pct(t2_v3['st']['agree'])}</b>，baseline <b>{pct(t2_b['st']['agree'])}</b>，而“全 pass”就有 <b>{pct(1 - t2_v3['gpush'] / t2_v3['n_cases'])}</b>——v3 只比什么都不推略高。</li>
<li>v3 推得偏多、不够准：train60 上 precision {pct(v3['st']['precision'])}，test2 上 {pct(t2_v3['st']['precision'])}。</li>
</ul></div>

<h2>1. 整体流程：两条评分线</h2>
<div class="fig">{FIG1}</div>
<p class="cap">图 1　每一行结果 = 一条帖子 × 一次运行（rep）。同一条回复同时走两条线：左上和你的标签比（决策分），下面交给 Opus 核对理由（理由分）。</p>
<ul>
<li><b>被测 agent</b>：一次 Cavia 调用，输入是一条 Show HN 的证据，输出一个 JSON <code>{{decision, reason}}</code>。</li>
<li><b>标准答案（gold）</b>：你自己写的 push / pass 标签。</li>
<li><b>数据集</b>：dev（30，已污染）、held-out 1（30）、train2（30）、train60 = held-out 1 + train2（60，hill-climb 训练集）、test2（30，锁定，只跑了一次）。</li>
</ul>

<h2>2. 决策分：一条一条怎么打分</h2>
<h3>2.1 先过格式关</h3>
<p>回复必须<b>正好是一个 JSON 对象</b>，<code>decision</code> 是 push / pass / unsure 之一，<code>reason</code> 非空（外面包一层 ```json 代码块可以）。不合格就是“无效回复”——<b>它不会被当成 pass</b>，只是没有答案（valid = 0，agree = 0）。</p>

<h3>2.2 一个具体例子：case 35（PDT，在自己的云上部署定时任务）</h3>
<p>你对这条的标签是 <span class="chip pass">pass</span>。同一个 prompt（v3）跑了 3 次，agent 的回答不完全一致：</p>
<div class="quote">页面摘要：“pdt – process deploy tool. Turn any script into a scheduled job in your cloud. 部署到 AWS / Azure / Google Cloud / Windows Task Scheduler……”</div>
{''.join(ex_html)}
<p class="cap">表 1　case 35 的 3 行打分。“—” 表示这个指标在这一行没有定义（分母不含这一行）。</p>
<ul>
<li><b>agree</b>：决策 == 你的标签才得 1。第 1 次推了，和你的 pass 不一致 → 0；第 2、3 次 pass → 1。所以这个 case 贡献 2/3。</li>
<li><b>precision</b>：只在“agent 推了”的行里有定义。第 1 次推了而你没推 → 0；其他两行没推，不进分母。</li>
<li><b>recall</b>：只在“你标了 push”的行里有定义。你标的是 pass，所以三行都是 “—”。</li>
<li><b>pass 识别率</b>：只在“你标了 pass”的行里有定义：agent 判 pass 得 1，推了得 0。</li>
</ul>
<p>因为每个指标只在自己的分母行里才有值，<b>把所有行直接取平均，就是合并计数的比例</b>——不存在按 case 或按 rep 加权的问题。</p>

<h3>2.3 汇总成混淆矩阵（train60，v3，60 条 × 3 次 = {N} 行）</h3>
<div class="fig two" style="grid-template-columns:repeat(3,1fr)">
<div>{confusion_svg(conf, 'agree')}<p class="small"><b>agree</b> = 对角线 / 全部<br><code>({TP}+{TN})/{N} = {(TP + TN) / N * 100:.1f}%</code></p></div>
<div>{confusion_svg(conf, 'precision')}<p class="small"><b>precision</b> = agent 推了的那一列里，你也想推的<br><code>{TP}/({TP}+{FP}) = {TP / (TP + FP) * 100:.1f}%</code></p></div>
<div>{confusion_svg(conf, 'recall')}<p class="small"><b>recall</b> = 你想推的那一行里，agent 推了的<br><code>{TP}/({TP}+{FN}) = {TP / (TP + FN) * 100:.0f}%</code></p></div>
</div>
<p class="cap">图 2　同一个混淆矩阵，三种读法：绿色 = 分子，红色 = 只进分母。pass 识别率 = {TN}/({FP}+{TN}) = {TN / (FP + TN) * 100:.1f}%。v3 没有 unsure，所以 specificity 与它相同。</p>

<p>这四个格子里的每一行，都来自像下面这样的 case：</p>
{''.join(case_html)}
<p class="cap">表 2　四个真实 case 落在混淆矩阵的位置（train60 v3）。</p>

<div class="callout"><b>“少推、更准”对应哪个指标？</b> 就是 <b>precision</b>（图 2 中间）：减少红色的 {FP}（你不想看但被推了的），同时不要让 {FN}（你想看却被漏掉的）涨太多。</div>

<h3>2.4 两个细节</h3>
<ul>
<li><b>unsure 永远算错</b>（agree 里记 0）。baseline 会大量 unsure（train60 上 {pct(STAT[('train60', 'baseline')]['st']['unsure'])}），所以它的 agree 很低；v1/v3/v4 的 prompt 要求“很少用 unsure”，三者都是 0%。</li>
<li><b>失败的调用不算 0 分</b>：超时、网络错误写进 <code>errors.jsonl</code>，重跑直到有结果；只有 <code>status = ok</code> 的行进平均。</li>
</ul>

<h2>3. 不确定性：置信区间怎么来的</h2>
<div class="fig">{FIG4}</div>
<p class="cap">图 3　按 case 聚类的 bootstrap（示意）。</p>
<p>同一条帖子跑 3 次，几乎总是给同一个答案（30 条里有 26 条 3 次完全一致），所以这 3 次<b>不是 3 个独立样本</b>。我们按 case 抽样：每次有放回地抽整批 case（带着它的全部 rep），算一次 agree，重复 2000 次，取 2.5% 和 97.5% 分位。</p>
<p>结果：<b>30 条的区间约 ±15 个点，60 条约 ±8 个点</b>。比较两个 prompt 时用<b>配对差</b>（对同一批 case 逐条相减再 bootstrap），区间更窄。想要更准，加 case，不要加 rep。</p>
<p>每个集合还会放两条“什么都不想”的参考线：<b>全推</b>（你的 push 比例）和<b>全 pass</b>。你的标签不平衡（push 比例 33%–57%），一个 agent 如果不明显高于这两条里较大的那个，就还不能说它学到了什么。</p>

<h2>4. 所有 haiku 结果</h2>
<div class="fig">{bar_chart_agree()}</div>
<p class="cap">图 4　agree 对比（越高越好）。橙色虚线 = 全推，紫色虚线 = 全 pass。dev 上的 v3 已污染（prompt 里点名了 4 个 dev case）。test2 只跑了一次，没有拿来调任何东西。</p>
{''.join(res_rows)}
<p class="cap">表 3　完整数字。“行数” = 有效行数（case × rep）。pass 识别率是严格的 pass→pass（unsure 算错）。绿色行 = 当前保留的 v3 在 train60 / test2 上。</p>

<h3>4.1 prompt 之间：precision 和 recall 的取舍（train60）</h3>
<div class="fig">{FIG6}</div>
<p class="cap">图 5　baseline 太保守：几乎不推，也常说 unsure；v1 把你的口味写进去后几乎什么都推（recall 高，但 pass 识别率低）；v3 多加一条“太底层的技术组件 pass”后，拦住的变多；v4 再加“agent 基础设施 pass”，precision 略升，但 recall 掉到 76%（超出护栏，被否）。</p>

<h3>4.2 配对差和结论</h3>
<table class="grid"><thead><tr><th>比较</th><th>集合</th><th>agree 差</th><th>95% 区间</th><th>结论</th></tr></thead><tbody>
<tr><td>v1 − baseline</td><td>held-out 1</td><td>+47 pts</td><td>+20 ~ +70</td><td>显著；主要来自换成你的 rubric</td></tr>
<tr><td>v3 − v1</td><td>held-out 1</td><td>+5.6</td><td>−5.6 ~ +17.8</td><td>在噪声内</td></tr>
<tr><td>v3 − v1</td><td>train60</td><td>+5.6</td><td>SE 3.9</td><td>小幅提升</td></tr>
<tr><td>v4 − v3</td><td>train60</td><td>+0.6</td><td>−6.9 ~ +8.6</td><td>无提升，push 召回 84%→76%，被否</td></tr>
<tr><td>v3 − baseline</td><td>test2</td><td>+25.0</td><td>+1.7 ~ +48.3</td><td>显著，但区间很宽</td></tr>
</tbody></table>

<h2>5. 想少推一点：多跑几次取多数票有用吗？</h2>
<p>用已有的重复运行免费算出来的（没有新调用）：只在“≥k 次都推”时才推。</p>
<div class="two">
<div class="fig">{FIG7a}<p class="cap">train60 v3（3 次）：推的帖子占 {pct(vote60[0][1])} → {pct(vote60[1][1])} → {pct(vote60[2][1])}</p></div>
<div class="fig">{FIG7b}<p class="cap">test2 v3（2 次）：推的帖子占 {pct(vote2[0][1])} → {pct(vote2[1][1])}</p></div>
</div>
<p>推送少了，precision 几乎不变（66% → 69%；test2 上 53% → 50%），recall 却明显下降。说明 v3 的误推是<b>系统性</b>的（每次都推错同一批），不是随机波动，所以靠“多跑几次”解决不了。</p>

<h2>6. 理由分：Opus 裁判在查什么</h2>
<p>裁判只读证据和 agent 的回复，给三个布尔值：</p>
<div class="cards">
<div class="card"><h4>grounded</h4>理由里关于项目、页面、作者、评论的说法，都能在证据里找到。编造、夸大（“首个”“已验证”）→ 假。</div>
<div class="card"><h4>specific</h4>理由点到了这条帖子的具体功能、机制或用户；放到任何帖子都成立的套话（“有意思的想法”）→ 假。</div>
<div class="card"><h4>consistent</h4>理由支持它的决策。理由在论证相反的结论，或 unsure 却没说缺什么 → 假。</div>
</div>
<p>以 case 35 为例，裁判对 3 次回复的评语（节选）：</p>
<div class="quote">第 1 次（push）：“理由里的说法都和页面一致：PowerShell 脚本部署为定时任务、M365 许可证浪费、Entra 异地登录告警……并且支持 push 的决策。” → <b>grounded / specific / consistent 全部为真</b></div>
<p><b>注意：第 1 次的决策其实和你不一致，但裁判给了满分。</b>裁判只评“这段话说得对不对、具不具体、前后一致”，<b>不评 push 对不对</b>。决策对错只在决策分里体现。</p>
<div class="fig two"><div>{FIG_JUDGE}<p class="cap">图 6　全部 haiku 行（{jn} 行）的理由分通过率。</p></div>
<div><p class="small">裁判上线前用 6 条故意构造的坏回复做过审计：</p>{''.join(audit_html)}</div></div>
<div class="callout warn"><b>局限：</b>理由分几乎都在 {pct(min(jrate.values()))}–{pct(max(jrate.values()))}，所以它只能抓明显的编造和空话，<b>区分不了两个都还不错的 prompt</b>，也不衡量“对你有没有价值”。那只能靠你的标签。</div>

<h2>7. 其他模型</h2>
<p>bright-rain 和 washed-bacon 只在 dev / held-out 1 上用 baseline 和 v1 跑过。它们会先输出 <code>&lt;think&gt;…&lt;/think&gt;</code> 块，严格解析器按约定判为无效，所以严格分接近 0。下面的宽松分是我另外“去掉 think 块再取 JSON”算的，<b>只是描述，没有拿来选 prompt</b>。</p>
{''.join(other_rows)}
<p class="cap">表 4　对照：held-out 1 上 haiku v1 严格 agree {pct(ho_h)}，全推 57%。这两个模型放宽格式后也没有超过 haiku，并且几乎什么都推（pass 识别率 8%–21%）。haiku 平均耗时约 5 秒，bright-rain 12–18 秒。（更正：旧 narrative 里 bright-rain 宽松分写 57%，重算为 54%。）</p>

<h2>8. 读数字前要知道的局限</h2>
<ul>
<li><b>标签被我的预填建议锚定</b>：fresh-train / fresh-test 的卡片带我的预填建议，你保留了 54/60（90%），所以 agree 偏乐观。</li>
<li><b>dev 已污染</b>，held-out 1 选过两次 winner，只能当训练集；真正没被调过的只有 test2（30 条，单次运行）。</li>
<li>你改掉的 6 条（61、64、75、83、99、110）都是个人口味，不是规则能学出来的。</li>
<li>没有做过“同一个 v3 prompt、更强模型”的对比；成本没有测，只记了 token 数（每行输入约 5K、输出约 0.3K）。</li>
<li>HN 自发帖会把 “N points by user” 带进页面文字（case 62、63、71、119），没有修。</li>
</ul>

<h2>9. 复现</h2>
<pre style="background:#f6f8fa;padding:12px;border-radius:8px;overflow:auto;font-size:13px">cd .evals/show-hn-scout
python3 climb-stats.py train60/haiku_v3          # 决策分 + bootstrap（任一结果目录）
python3 build-train60.py                          # 重建 train60
bun report.ts --set train60                       # 生成每个集合的 HTML 报告
python3 build-metrics-report.py                   # 重新生成本页
# 付费跑（必须先得到批准）
JUDGE_PROVIDER=anthropic JUDGE_MODEL=claude-opus-5-5 bun run.ts --model claude-haiku-5-5 \\
  --variant v3 --out haiku_v3 --set train60 --reps 2 --approved</pre>
<p class="small">代码：<code>lib.ts</code>（解析、逐行打分、聚合）· <code>judge.ts</code> + <code>rubric-reason.md</code>（理由裁判）· <code>climb-stats.py</code>（严格统计）· <code>run.ts</code>（跑 agent 和裁判）。</p>
</main></body></html>'''

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w').write(page)
print('wrote', OUT, len(page), 'bytes')
