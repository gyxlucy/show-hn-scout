# Daily push quality: what the recorded runs say

Scope: the flow that decides which posts are pushed in one day (stage-1 v3 judge, optional stage-2 ranker, at most 10 pushes). Gold is existing data only; nothing new was labelled and no model call was made to build this report.

## Day-1104 (real day, pool 54, 26 wanted of which 8 must-read)
- A random top-10 holds 4.8 wanted posts (SD 1.44). The live cap (newest 10) holds 4: no better than random on this day (n=1 selection, deterministic).
- v1 wanted@10 8.7 [6–10] over 6 valid rep(s); must@10 2.5 [1–4], pass@10 1.3 [0–4]. Guardrails G1–G6: 6/6 pass. P(random ≥ observed) is 0.004 median but 0.316 for the worst rep, so single reps overlap the noise; the top-10 overlap between reps is 61%, so the selection changes from rep to rep.
- Anchor variants fail: v3 wanted@10 0.3 [0–1] over 3 valid rep(s) with 1.3 pushes per rep on average (rank bar ≤ 3); v4 wanted@10 0.7 [0–1] over 3 valid rep(s) with 0.7 pushes. Their ranking AUC is 0.38 and 0.45 (0.5 = chance, lower rank = better), i.e. at or below chance at separating wanted from pass (the AUC is the probability that a wanted post gets a better rank than a pass post).

## Day-1109 (real held-out day, pool 38, 12 wanted of which 5 must-read; labels blind to every model; never tuned on)
- A random top-10 holds 3.2 wanted posts (SD 1.28) and 1.3 must-read. The live cap (newest 10) holds 1 wanted and 9 pass posts (n=1 selection).
- v1 wanted@10 6.7 [6–7] over 6 valid rep(s); must@10 2.3 [2–3], pass@10 3.3 [3–4], precision 67%. Guardrails G1–G6: 6/6 pass. P(random ≥ observed) is 0.005 median and 0.034 for the worst rep; top-10 overlap 92%, position bias 0.14. G2 (must@10 ≥ random + 1 = 2.3) passes only narrowly.
- The ranker gave the same kind of lift on a day it was never tuned on, with labels that were not shaped by any model prediction. Fewer posts are wanted on this day (32% of the pool) so the ceiling is lower; the lift over the live cap is large (1 → 6.7).
- Caution on comparing days: day-1104 labels were anchored on assistant predictions, day-1109 labels are blind, and all three models score lower here (opus 6.5 vs 9.2 on day-1104). The drop mixes a harder, lower-base-rate day with the removal of label anchoring; this data cannot separate the two. Also stage 1 is weak on this day: the v3 judge pushed 38 posts and 32% are wanted (day-1104: 48%).

## Train60-sim (simulated: 60 posts from many days, pool 34; v5–v8 were designed on it)
- Random expectation 6.8 wanted (SD 1.26); newest-10 mock 5.
- v1 wanted@10 8.8 [8–10] over 5 valid rep(s) (1 of 6 planned reps errored); v2 wanted@10 8.0 [7–9] over 6 valid rep(s). The richer cards of v2 do not beat v1 here.

## Model comparison (v5 = claude-opus-5-5, v6 = deepseek-4.1-flash, same v7 prompt and haiku pool; 6 reps planned on each of the 3 days; the valid count is shown per row)
- v5 on day-1104 (5 valid rep(s)): wanted@10 9.2 [9–10], must@10 3.2, pass@10 0.8; 19026 in / 739 out tokens, 11.7 s (random expects 4.8 wanted, SD 1.44).
- v5 on train60-sim (5 valid rep(s)): wanted@10 9.2 [8–10], must@10 6.0, pass@10 0.8; 13812 in / 713 out tokens, 17.0 s (random expects 6.8 wanted, SD 1.26).
- v5 on day-1109 (6 valid rep(s)): wanted@10 6.5 [6–7], must@10 1.5, pass@10 3.5; 14901 in / 704 out tokens, 11.9 s (random expects 3.2 wanted, SD 1.28).
- v6 on day-1104 (6 valid rep(s)): wanted@10 9.0 [8–10], must@10 3.3, pass@10 1.0; 12858 in / 5941 out tokens, 44.1 s (random expects 4.8 wanted, SD 1.44).
- v6 on train60-sim (6 valid rep(s)): wanted@10 8.7 [8–9], must@10 5.7, pass@10 1.3; 9432 in / 4909 out tokens, 38.2 s (random expects 6.8 wanted, SD 1.26).
- v6 on day-1109 (6 valid rep(s)): wanted@10 6.0 [5–7], must@10 2.0, pass@10 4.0; 10111 in / 4332 out tokens, 35.5 s (random expects 3.2 wanted, SD 1.28).
- Each cell has 6 planned reps. Opus lost one rep on day-1104 and one on train60-sim to a reply that did not parse (a missing JSON object; an empty reason string), deepseek none. On day-1109 G1–G6: v5 5/6 pass (fail: G2), v6 5/6 pass (fail: G2); both miss G2 (must@10 below random + 1). No deepseek reply failed to parse (no <think> failure seen). Output tokens differ a lot (opus about 0.7K, deepseek 5–6.6K, haiku about 2.5–3.4K), so latency and tokens are not comparable by prompt alone.

## What this cannot tell you
- Recall: no label exists for posts the judge dropped, so good posts that never reach the pool are invisible.
- Only 3 days: one simulated and tuned on (train60-sim), one real and looked at (day-1104), one real held-out day (day-1109, 38 posts). Intervals here show ranker rep-to-rep noise only, not day-to-day variation.
- Labels: day-1104 tiers are anchored (a review of an assistant prediction); day-1109 tiers are blind human labels, but one labeller.
- Model comparison: all 3 days have 6 planned reps per model, but the reps of one model are almost the same ranking (top-10 overlap 61-93%), so they are not independent evidence of how the model does on another day. Differences of 1 wanted post between models are inside the rep noise. Cost is reported as tokens and latency only; no price is claimed.
