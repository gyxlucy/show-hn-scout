# day-1109 held-out check (declared before any ranker call and before any label)

- Pool: 38 posts the live v3 bot pushed on 2026-11-09 (recorded decisions, no stage-1 re-run). Evidence fetched on 2026-11-10.
- Labels: blind human tiers (must_read / push / pass) from `review-server.py`; no model prediction shown, shuffled order. Written to `tier.jsonl`.
- Runs approved: v7 ranker, 6 reps each, on claude-haiku-5-5, claude-opus-5-5, deepseek-4.1-flash (18 calls). Tokens and latency only.
- Ranker results are not read until labelling is finished.
- Guardrails reused unchanged from day-1104 (G1-G6 in `.evals/daily-push/metrics.ts`): wanted@10 above random and above newest-10; must@10 >= random + 1; pass@10 below random; all planned reps valid; position bias < 0.2; top-10 overlap >= 60%.
- Generalisation reading: v7 haiku generalises if G1-G6 pass here too. One day only; no recall.
