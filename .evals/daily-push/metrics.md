# Metrics

All metrics are computed over the top 10 of a day's pushes (K=10), per rep, from the recorded rows; every table says how many valid reps stand behind it. A metric that is undefined is shown as n/a, never 0.

| metric | definition | direction | caveat |
|---|---|---|---|
| wanted_p10 (headline) | wanted (tier push or must_read) posts among the pushed posts, divided by the number pushed; undefined with no pushes | higher | tiers are anchored labels; one real day |
| wanted@10 | count of wanted posts in the top 10 | higher | noise floor: SD of a random top-10 is shown per day |
| must@10 | count of must_read posts in the top 10 | higher | small counts (8 must on day-1104) |
| pass@10 | count of gold-pass posts in the top 10 (the push-noise a reader would see) | lower | |
| pushes | number of posts pushed (anchors can push fewer than 10) | context | |
| valid | rep produced a gradable ranking (1/0); counted as a float so it does not become the headline | higher | |
| P(random ≥ obs) | hypergeometric tail: chance a random pick of the same size contains at least as many wanted posts | lower | reps of one day are not independent days |
| top-10 overlap | mean pairwise overlap of the selected sets across reps | higher | needs ≥ 2 reps |
| position bias | Spearman correlation between the slot a post was shown in and the rank it received | near 0 | |
| G1–G6 | guardrails declared before the rankers ran on each real day (day-1104 on 2026-11-10; day-1109 in day-1109/PREREGISTERED.md before any label); apply to rankers on those two days only | all pass | G6 needs ≥ 2 reps; shown n/a for 1-rep rows |
| tokens, latency | tokens in/out and wall seconds per rep (anchors: sums over 54 calls) | lower | no $ figure: cost not measured |

## day-1104 (pool 54, wanted 26, must 8, pass 28; random wanted@10 = 4.8, SD 1.44)

| variant | model | valid reps / planned | wanted@10 mean [min–max] | must@10 | pass@10 | pushes | precision (pushes) | P(random ≥ obs) median / worst | top-10 overlap | position bias |ρ| | guardrails G1–G6 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| random top-10 (expectation) | none | n/a | 4.8 (SD 1.44) | 1.5 | 5.2 | 10 | 48% | – | – | – | – |
| baseline · live cap | claude-haiku-5-5 | 1/1 | 4.0 [4–4] | 1.0 [1–1] | 6.0 [6–6] | 10.0 [10–10] | 40% | 0.821 / 0.821 | n/a | n/a | n/a |
| v1 · v3 + v7 ranker | claude-haiku-5-5 | 6/6 | 8.7 [6–10] | 2.5 [1–4] | 1.3 [0–4] | 10.0 [10–10] | 87% | 0.004 / 0.316 | 61% | 0.10 | 6/6 all pass |
| v2 · v3 + v8 ranker | claude-haiku-5-5 | not run on this day (never run) |  |  |  |  |  |  |  |  |  |
| v3 · v3 + v9 anchor | claude-haiku-5-5 | 3/3 | 0.3 [0–1] | 0.0 [0–0] | 1.0 [0–3] | 1.3 [0–3] | 50% | 1.000 / 1.000 | 0% | n/a | n/a |
| v4 · v3 + v10 anchor | claude-haiku-5-5 | 3/3 | 0.7 [0–1] | 0.0 [0–0] | 0.0 [0–0] | 0.7 [0–1] | 100% | 0.481 / 0.481 | 3% | n/a | n/a |
| v5 · v7 on claude-opus-5-5 | claude-opus-5-5 | 5/6 | 9.2 [9–10] | 3.2 [3–4] | 0.8 [0–1] | 10.0 [10–10] | 92% | 0.004 / 0.004 | 86% | 0.11 | 5/6 fail: G4 |
| v6 · v7 on deepseek-4.1-flash | deepseek-4.1-flash | 6/6 | 9.0 [8–10] | 3.3 [2–4] | 1.0 [0–2] | 10.0 [10–10] | 90% | 0.004 / 0.029 | 75% | 0.12 | 6/6 all pass |

## train60-sim (pool 34, wanted 23, must 12, pass 11; random wanted@10 = 6.8, SD 1.26)

| variant | model | valid reps / planned | wanted@10 mean [min–max] | must@10 | pass@10 | pushes | precision (pushes) | P(random ≥ obs) median / worst | top-10 overlap | position bias |ρ| | guardrails G1–G6 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| random top-10 (expectation) | none | n/a | 6.8 (SD 1.26) | 3.5 | 3.2 | 10 | 68% | – | – | – | – |
| baseline · live cap | claude-haiku-5-5 | 1/1 | 5.0 [5–5] | 3.0 [3–3] | 5.0 [5–5] | 10.0 [10–10] | 50% | 0.964 / 0.964 | n/a | n/a | n/a |
| v1 · v3 + v7 ranker | claude-haiku-5-5 | 5/6 (+1 err) | 8.8 [8–10] | 4.8 [4–6] | 1.2 [0–2] | 10.0 [10–10] | 88% | 0.077 / 0.283 | 68% | 0.16 | n/a |
| v2 · v3 + v8 ranker | claude-haiku-5-5 | 6/6 | 8.0 [7–9] | 4.7 [4–6] | 2.0 [1–3] | 10.0 [10–10] | 80% | 0.283 / 0.591 | 69% | 0.15 | n/a |
| v3 · v3 + v9 anchor | claude-haiku-5-5 | not run on this day (never run) |  |  |  |  |  |  |  |  |  |
| v4 · v3 + v10 anchor | claude-haiku-5-5 | not run on this day (never run) |  |  |  |  |  |  |  |  |  |
| v5 · v7 on claude-opus-5-5 | claude-opus-5-5 | 5/6 | 9.2 [8–10] | 6.0 [5–7] | 0.8 [0–2] | 10.0 [10–10] | 92% | 0.077 / 0.283 | 80% | 0.14 | n/a |
| v6 · v7 on deepseek-4.1-flash | deepseek-4.1-flash | 6/6 | 8.7 [8–9] | 5.7 [5–6] | 1.3 [1–2] | 10.0 [10–10] | 87% | 0.077 / 0.283 | 68% | 0.17 | n/a |

## day-1109 (pool 38, wanted 12, must 5, pass 26; random wanted@10 = 3.2, SD 1.28)

| variant | model | valid reps / planned | wanted@10 mean [min–max] | must@10 | pass@10 | pushes | precision (pushes) | P(random ≥ obs) median / worst | top-10 overlap | position bias |ρ| | guardrails G1–G6 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| random top-10 (expectation) | none | n/a | 3.2 (SD 1.28) | 1.3 | 6.8 | 10 | 32% | – | – | – | – |
| baseline · live cap | claude-haiku-5-5 | 1/1 | 1.0 [1–1] | 1.0 [1–1] | 9.0 [9–9] | 10.0 [10–10] | 10% | 0.989 / 0.989 | n/a | n/a | n/a |
| v1 · v3 + v7 ranker | claude-haiku-5-5 | 6/6 | 6.7 [6–7] | 2.3 [2–3] | 3.3 [3–4] | 10.0 [10–10] | 67% | 0.005 / 0.034 | 92% | 0.14 | 6/6 all pass |
| v2 · v3 + v8 ranker | claude-haiku-5-5 | not run on this day (never run) |  |  |  |  |  |  |  |  |  |
| v3 · v3 + v9 anchor | claude-haiku-5-5 | not run on this day (never run) |  |  |  |  |  |  |  |  |  |
| v4 · v3 + v10 anchor | claude-haiku-5-5 | not run on this day (never run) |  |  |  |  |  |  |  |  |  |
| v5 · v7 on claude-opus-5-5 | claude-opus-5-5 | 6/6 | 6.5 [6–7] | 1.5 [1–2] | 3.5 [3–4] | 10.0 [10–10] | 65% | 0.034 / 0.034 | 93% | 0.13 | 5/6 fail: G2 |
| v6 · v7 on deepseek-4.1-flash | deepseek-4.1-flash | 6/6 | 6.0 [5–7] | 2.0 [2–2] | 4.0 [3–5] | 10.0 [10–10] | 60% | 0.034 / 0.144 | 79% | 0.15 | 5/6 fail: G2 |

## Tokens and latency

| day | stage | calls | tokens in / out per rep | latency s per rep |
|---|---|---|---|---|
| day-1104 | stage 1 (v3 judge, one call per post) | unknown | not recorded (live decisions) | not recorded |
| day-1104 | stage 2 · v1 · v3 + v7 ranker | 1 call/rep | 19026 / 3429 | 20.5 |
| day-1104 | stage 2 · v3 · v3 + v9 anchor | 54 calls/rep | 313104 / 31843 | 296.4 |
| day-1104 | stage 2 · v4 · v3 + v10 anchor | 54 calls/rep | 326226 / 35713 | 324.4 |
| day-1104 | stage 2 · v5 · v7 on claude-opus-5-5 | 1 call/rep | 19026 / 739 | 11.7 |
| day-1104 | stage 2 · v6 · v7 on deepseek-4.1-flash | 1 call/rep | 12858 / 5941 | 44.1 |
| train60-sim | stage 1 (v3 judge, one call per post) | 60 posts | 292959 / 17681 | 281.5 |
| train60-sim | stage 2 · v1 · v3 + v7 ranker | 1 call/rep | 13812 / 2506 | 16.4 |
| train60-sim | stage 2 · v2 · v3 + v8 ranker | 1 call/rep | 35233 / 3139 | 51.8 |
| train60-sim | stage 2 · v5 · v7 on claude-opus-5-5 | 1 call/rep | 13812 / 713 | 17.0 |
| train60-sim | stage 2 · v6 · v7 on deepseek-4.1-flash | 1 call/rep | 9432 / 4909 | 38.2 |
| day-1109 | stage 1 (v3 judge, one call per post) | unknown | not recorded (live decisions) | not recorded |
| day-1109 | stage 2 · v1 · v3 + v7 ranker | 1 call/rep | 14901 / 2667 | 17.4 |
| day-1109 | stage 2 · v5 · v7 on claude-opus-5-5 | 1 call/rep | 14901 / 704 | 11.9 |
| day-1109 | stage 2 · v6 · v7 on deepseek-4.1-flash | 1 call/rep | 10111 / 4332 | 35.5 |
