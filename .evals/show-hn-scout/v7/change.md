# v7: listwise ranker (second stage, rank then cut)

Status: RUN, hypothesis not supported by the declared guardrails (see "Result" at the end).

## Hypothesis (one)
Ranking the day's pushed posts against each other puts her must-reads at the top of the list better than the absolute per-post scoring that failed in v6, so a cap of 10 applied to the ranking keeps more of what she wants than a cap applied to arrival order.

Only the question changes versus v6: the same reader description, raisers and lowerers as v6, but asked as "order these cards" instead of "score this post 1-3". The first stage stays v3, unchanged.

## What is built
- `v7/system-prompt.md`, `v7/request.json`: ranker agent. Input: cards (opaque id, title, URL, first 700 chars of page text), in a seeded random order. Output: `{ranking: [every id once], top_reasons: {first 10 ids}}`. Strict parse: a partial or repeated ranking is no answer.
- `rank.ts`: one real Cavia task per rep; `--approved` gate; resumes by rep; same results layout (`results.jsonl`, `traces/pool_rep<k>.json`, `raw/`, `errors.jsonl`, `summary.json`).
- `rank-stats.py`: baselines on the same pool and ranker metrics.
- Tests: 30 pass (`bun test selftest.test.ts`), including strict ranking parse, seeded shuffle, label mapping, resume.

## Plan
- Set train60, model claude-haiku-5-5, no tools. Pool = the 34 posts v3 pushed (a post is in when at least half of its 3 reps pushed): 12 must-read (5 of the 6 she ticked first), 22 others. This is one simulated day; the live pool is about 50.
- 6 reps = 6 calls, each a different shuffle of the cards. About 10k input tokens per call. Cost not measured (no approved pricing rule).
- Cards hold no decision, vote, label or posting time.

## Baselines on the same pool (free, computed before the run)
Must-read / core in the top k:

| order | k=6 | k=10 | k=13 |
|---|---|---|---|
| random | 2.1 / 0.9 | 3.5 / 1.5 | 4.6 / 1.9 |
| newest first (today's cap) | 1.0 / 0.0 | 3.0 / 0.0 | 4.0 / 1.0 |
| v6 mean strength | 2.2 / 0.8 | 3.8 / 1.2 | 4.9 / 1.6 |
| v5 count of P signals | 3.5 / 1.5 | 5.5 / 2.7 | 6.0 / 3.0 |

## Guardrails (declared before the run)
1. Valid: 6 of 6 reps return a valid ranking, no errors.
2. Ordering, mean over reps: must-read in top 6 >= 4 and top 10 >= 6; core in top 6 >= 2. Also above the v5 count baseline at k=6 and k=10 (3.5, 5.5).
3. Position bias: mean |Spearman(slot in prompt, rank)| < 0.2.
4. Stability: mean top-10 overlap between reps >= 60%.
Fail on any of 1-3 means the hypothesis is not supported. Guardrail 4 failing means the ranking is too noisy to trust a daily cut.

## Caveats stated up front
- The reader description and the up/down rules were written from the same 13 must-reads, so train60 flatters the ranker. Passing means "worth confirming", not "works". The confirmation is a tiered fresh set: she tiers test2's 11 pushes (labelling only), then the locked test2 is run once.
- 34 posts and 12 must-reads is small; the range over reps covers shuffle noise only, not case noise. A difference of one or two posts is not a result.
- The ranker sees only the start of the page, less than v3 saw; a good post whose page starts with navigation text can be ranked low.
- Not wired into the bot; this needs a `bot/core.ts` change (collect the day's pushes, rank, send the top 10) only after the evidence holds.

## Result (train60, claude-haiku-5-5, pool of 34 from haiku_v3, cost not measured)
5 of 6 calls returned a valid ranking; rep 5 hit the 300 s ceiling (timeout, not retried by design) and is not in the numbers. Input 13,812 tokens per call, output 2,078-3,295 (mean 2,506, most of it the 10 reasons).

| order | k=6 must-read / core | k=10 | k=13 |
|---|---|---|---|
| random | 2.1 / 0.9 | 3.5 / 1.5 | 4.6 / 1.9 |
| newest first (today's cap) | 1.0 / 0.0 | 3.0 / 0.0 | 4.0 / 1.0 |
| v6 strength | 2.2 / 0.8 | 3.8 / 1.2 | 4.9 / 1.6 |
| v5 P count | 3.5 / 1.5 | 5.5 / 2.7 | 6.0 / 3.0 |
| **v7 ranker (mean of 5 reps)** | **3.0 / 2.8** (range 3-3 / 2-3) | **4.8 / 3.2** (4-6 / 3-4) | **6.0 / 3.4** (5-7 / 3-5) |

Guardrails: 1 valid 6/6: NOT met (5/6, one timeout). 2 ordering: NOT met (must-read top 6 = 3.0 < 4, top 10 = 4.8 < 6, below v5 P count at k=6 and k=10); core in top 6 >= 2: met (2.8). 3 position bias mean |rho| 0.16 < 0.2: met (one rep 0.39). 4 stability top-10 overlap 68% >= 60%: met.

What it did: it put core 42, 40, 46 at mean ranks 2.2, 3.2, 3.8 (top 10 in 5 of 5 reps), but core 52 (rank 18.6) and 68 (23.8) and the other must-reads were spread out (49 at 8.6, 76 at 10.8, 39 at 14, 79 at 16, 86 at 19.8, 53 at 20, 85 at 29.2). Top 10 held 1.2 posts she labelled pass on average (0-2). Her rejected 90 ranked 6.4 and non-must pushes 34, 57, 45 ranked 5.2, 8.0, 8.6.

Reading: the reader description came from the same labels, so the three core picks it nailed are the ones it was written around, and train60 flatters it; the rest of her must-reads (new angle, widens product view, hobby) are not found from title plus 700 chars. Ordering is clearly better than newest-first and than random on core, but only about 1.4x random on must-read overall, and no better than counting P signals.

Verdict: not adopted. Do not run on test2.

## Validation on one real day (day-1104, run 2026-11-10)
Prompt unchanged from the train60 run. Set: the 54 posts v3 pushed on 2026-11-04, her tiers (provenance `human_reviewed_assistant_prediction`: she edited my pre-filled predictions, 6 of 54 changed). Gold: must 8, push 18, pass 28. Guardrails G1-G6 declared in `day-rank-stats.py` before the run. claude-haiku-5-5, 6 reps, 700-char cards, ~19k input / ~2.7k output tokens per call. Cost not measured.

| top 10 | wanted | must | pass |
|---|---|---|---|
| random | 4.8 | 1.5 | 5.2 |
| newest 10 (today's cap) | 4 | 1 | 6 |
| v7 mean of 6 reps | 8.7 (6-10) | 2.5 (1-4) | 1.3 (0-4) |

All six guardrails pass, but narrowly on three: must-read lift is exactly +1.0 over random (needed +1), top-10 overlap between reps is 61% (needed 60%, min pair 40%), one rep has position bias -0.20. Caveats: one day, one labeller, and her labels were anchored on my predictions (same model family as the ranker).
