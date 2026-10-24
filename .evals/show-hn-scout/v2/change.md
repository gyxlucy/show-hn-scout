# v2: output-format reinforcement (v1 criteria unchanged)

Hypothesis: with the v1 prompt, bright-rain wrote visible `<think>...</think>` / `</reasoning-trace>` blocks before the JSON on 83/90 held-out and 87/90 dev replies, so strict parsing rejected them. An explicit ban on reasoning text and tags, with "first character `{`, last `}`", should make the reply parse as a single JSON object.

Change: one added sentence pair in the output-format paragraph (see change.patch). Screening criteria, Chinese reason, and everything else are identical to v1.

Evidence base: the failure is in the v1 held-out/dev traces (`heldout/v1/raw/`, `v1/raw/`). Nothing from held-out labels was used. The v1 criteria were written before the held-out set was labeled.
Status: smoke-tested on held-out cases 31, 33, 41 (1 rep each) on bright-rain: 0/3 replies parsed; the model still wrote a `<think>...</think>` block before the JSON. Hypothesis not supported, so the full 30 x 3 run was NOT done. The 3 rows are kept in `heldout/v2/results.jsonl`.
