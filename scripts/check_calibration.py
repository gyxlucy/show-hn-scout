"""Verify sample provenance, frozen inputs and separation from human labels."""
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from hn_scout.collect import ROOT, DATA
from hn_scout.review import load_cases

cases = load_cases()
assert len(cases) == 30
assert len({c['case_id'] for c in cases}) == 30
assert Counter(c['sampling'] for c in cases) == {'random': 15, 'purposeful': 15}
assert Counter(c['batch'] for c in cases) == {1: 10, 2: 10, 3: 10}
for c in cases:
    assert c['split'] == 'calibration'
    assert c['label_source'] == 'not_yet_human_labeled'
    assert c['observation']['current_show'] == 'absent'
    assert c['observation']['history_before_first_seen'] == 'unknown'
    assert c['baseline_provenance']['not_ground_truth']
    for e in c['evidence']:
        path = ROOT / e['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == e['sha256'], path
        if e['kind'] == 'captured_packet':
            packet = json.loads(path.read_text())
            assert packet['id'] == c['id']
            for source in packet['sources']:
                if source['status'] == 'ok':
                    raw = ROOT / source['raw_path']
                    assert hashlib.sha256(raw.read_bytes()).hexdigest() == source['sha256'], raw
    for key in ['name', 'summary', 'mechanism', 'uncertainty', 'sources']:
        assert c[key]
for batch in [1, 2, 3]:
    text = (ROOT / 'review' / f'batch-{batch:02}.md').read_text()
    assert text.count('\n## ') == 10
    assert 'current_show' not in text and 'baseline_provenance' not in text
print(json.dumps({'cases': len(cases), 'sampling': dict(Counter(c['sampling'] for c in cases)),
                  'batches': 3, 'provenance': 'all hashes verified',
                  'assistant_initial_judgments': dict(Counter(c['baseline']['decision'] for c in cases)),
                  'human_labels_created_by_this_check': 0}, ensure_ascii=False, indent=2))
