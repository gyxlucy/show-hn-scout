# Rounds so far (train numbers; pooled = 90 cases)
- Baseline (v3): train precision 69%, recall 84%; pooled 66% / 79%.
- v1 (rejected): removed the novelty sentence, added 'unless a Pass condition applies', rewrote criterion 1 ('better/faster/more private is not a fresh angle'), added a one-phrase-test Pass bullet. Train: 25 of 30 false-push rows removed, 44 of 68 true-push rows lost. Pooled recall 31%.
- v2 (no effect): baseline + two Pass bullets (product not released / empty demo; lead with speed/size/benchmark number). Train 72% / 90%, but pooled 65% / 78%; in rows, the pass-labelled train cases moved in both directions (3 cases lost pushes, 3 gained pushes), so the bullets were not a consistent effect.
- round2_proposal.md has the analysis behind v1/v2 (semantic wording does not separate lost true pushes from removed false pushes; near-identical pairs have opposite labels).
