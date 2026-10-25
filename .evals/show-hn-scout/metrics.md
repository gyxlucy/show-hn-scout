# Metrics: Show HN Scout `select_project`

Gold is Lucy's own push/pass labels (`gold.jsonl`, rubric v0-draft). All 30 cases calibrated the rubric, so scores are dev-set numbers, not held-out.

| metric | definition |
|---|---|
| Agree (headline) | decision equals the human label. `unsure` counts as a miss. |
| Precision | of the rows where the agent pushed, share the human also marked push. Undefined (shown –) when the agent never pushes, not 100%. |
| Recall | of the rows the human marked push, share the agent pushed. |
| Specificity | of the rows the human marked pass, share the agent did not push (`unsure` does not interrupt the reader). |
| Unsure rate | share of valid replies that were `unsure`. Coverage = 1 - unsure rate. |
| Valid format | reply was exactly one JSON object `{decision, reason}`. An invalid reply is "no answer", never scored as a pass. |
| Grounded / Specific / Consistent | reason judge (`rubric-reason.md`), 1/0 per reply. Grades the written reason only, never the decision. |

Rows with status `truncated` or `refused` are counted and listed but left out of every mean. Failed attempts are in `errors.jsonl`, never scored 0.
Intervals are 95% bootstrap over cases (reps of a case are not independent).
Report precision and recall per `tags[0]` group: `random` approximates real traffic, `purposeful` does not. Cost: tokens are recorded; cost is "not measured" until a pricing rule is approved.

## Per-variant comparison (claude-haiku-5-5, strict parser, 30 cases x 3 reps = 90 rows per cell)

Test = held-out set (30 cases, 17 push / 13 pass, always-push 57%). Train = dev set (30 cases, 15/15, always-push 50%). Agree intervals are 95% case-clustered bootstrap. Precision denominator is the pushes made. Train numbers for v3 are contaminated (the prompt names dev cases 02, 12, 25, 29). Test was used to choose between rounds, so it is selection-biased.

| variant | set | agree | precision | push recall | pass recall | unsure | valid | judge grounded / specific / consistent |
|---|---|---|---|---|---|---|---|---|
| baseline | test | 23% [10-38] | 43% (6/14) | 12% (6/51) | 38% (15/39) | 20% | 100% | 80 / 88 / 90 of 90 |
| v1 | test | 70% [53-86] | 68% (45/66) | 88% (45/51) | 46% (18/39) | 0% | 100% | 89 / 85 / 90 of 90 |
| v3 | test | 76% [61-89] | 75% (43/57) | 84% (43/51) | 64% (25/39) | 0% | 100% | 85 / 87 / 88 of 89 |
| baseline | train | 32% [17-49] | 29% (5/17) | 11% (5/45) | 53% (24/45) | 24% | 100% | 85 / 89 / 89 of 89 |
| v1 | train | 57% [39-73] | 54% (39/72) | 87% (39/45) | 27% (12/45) | 0% | 100% | 89 / 90 / 90 of 90 |
| v3 | train (contaminated) | 70% [54-84] | 69% (33/48) | 73% (33/45) | 67% (30/45) | 0% | 100% | 89 / 89 / 90 of 90 |

Paired case-clustered deltas on test: v1 vs baseline +47 pts agree (CI +20 to +70); v3 vs v1 +5.6 (CI -5.6 to +17.8); v3 vs baseline +52 (CI +29 to +72); v3 vs always-push +19. v3 vs v1 pass recall +18 (CI 0 to +36), push recall -4 (CI -18 to +6).
Cost is not measured; tokens only (test, input/output: baseline 454K/24K, v1 463K/25K, v3 475K/29K).
