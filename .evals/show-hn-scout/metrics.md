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
