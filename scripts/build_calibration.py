"""Freeze this session's editorial annotations against captured evidence.

This builds review materials, not a model eval or human gold labels.
"""
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from hn_scout.collect import DATA, ROOT, now
from hn_scout.review import render

sampling = json.loads((DATA / 'calibration/sampling.json').read_text())
annotations = json.loads((DATA / 'calibration/annotations.json').read_text())
observations = {r['id']: r for r in json.loads((DATA / 'candidates.json').read_text())}
selected_ids = set(sampling['random_ids'] + sampling['purposeful_ids'])
if len(annotations) != 30 or {a['id'] for a in annotations} != selected_ids:
    raise ValueError('Annotations must match the exact 30 selected stories')

browser_urls = {
    50178183: 'https://serum.sh/non-call/',
    50180257: 'https://uberblok.storagebits.workers.dev/en/',
    50179958: 'https://suminagashi.georgestrakhov.com/',
    50179736: 'https://agentwire.thecompound.tech/context-window',
}
cases = []
for i, annotation in enumerate(annotations, 1):
    sid = annotation['id']
    packet_path = DATA / 'packets' / sampling['run_id'] / f'{sid}.json'
    # One-time migration from the initial collector's flat layout.
    if not packet_path.exists():
        original = DATA / 'packets' / f'{sid}.json'
        packet_path.parent.mkdir(parents=True, exist_ok=True)
        packet_path.write_bytes(original.read_bytes())
    packet = json.loads(packet_path.read_text())
    if packet['run_id'] != sampling['run_id']:
        raise ValueError(f'Wrong evidence run for {sid}')
    observation = observations[sid]
    sources = [{'label': '项目 / README', 'url': packet['url']},
               {'label': 'HN 原帖与作者说明', 'url': f'https://news.ycombinator.com/item?id={sid}'}]
    evidence = [{'path': str(packet_path.relative_to(ROOT)), 'sha256': hashlib.sha256(packet_path.read_bytes()).hexdigest(),
                 'kind': 'captured_packet'}]
    if sid in browser_urls:
        original = DATA / 'browser' / f'{sid}.txt'
        frozen = DATA / 'browser' / sampling['run_id'] / f'{sid}.txt'
        if not frozen.exists():
            frozen.parent.mkdir(parents=True, exist_ok=True)
            frozen.write_bytes(original.read_bytes())
        evidence.append({'path': str(frozen.relative_to(ROOT)), 'sha256': hashlib.sha256(frozen.read_bytes()).hexdigest(),
                         'kind': 'browser_accessibility_snapshot', 'url': browser_urls[sid],
                         'captured_at': __import__('datetime').datetime.fromtimestamp(original.stat().st_mtime, __import__('datetime').timezone.utc).isoformat()})
        if packet['url'] != browser_urls[sid]:
            sources.append({'label': '浏览器阅读页面', 'url': browser_urls[sid]})
    cases.append({**annotation, 'case_id': f'{i:02}', 'batch': (i - 1) // 10 + 1,
                  'split': 'calibration', 'label_source': 'not_yet_human_labeled',
                  'sampling': 'random' if sid in sampling['random_ids'] else 'purposeful',
                  'observation': observation, 'sources': sources, 'evidence': evidence,
                  'baseline_provenance': {'author': 'Codex assistant in this conversation', 'kind': 'qualitative_editorial_judgment',
                                          'repeatable_model_run': False, 'not_ground_truth': True}})

(DATA / 'calibration/cases.json').write_text(json.dumps(cases, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(render(), ensure_ascii=False))

