# Hillclimb on claude-haiku-5-5 (goal: raise agree, hold pass recognition)

Train = dev set (rubric v1 was written from it). Test = held-out set (labels never shown to analyzers). Strict parser, 30 cases x 3 reps each. Cost not measured; tokens only.

| round | change | test agree | train agree | test pass-recall | test push-precision | unsure (test) | tokens in/out per run (test) |
|---|---|---|---|---|---|---|---|
| 0 | baseline (rubric v0 prompt) | 23% [10-38] | 32% [17-49] | 38% (15/39) | 43% (6/14) | 20% | 5.0K / 0.26K |
| 1 | v1 prompt (user-confirmed rubric: product idea is interesting), same model | 70% [53-86] | 57% [39-73] | 46% (18/39) | 68% (45/66) | 0% | see summary |
| 2 | v3 = v1 + pass rule "too low-level/technical for the reader" (her reasons for 02, 12, 25, 29) | 76% [61-89] | 70% [54-84]* | 64% (25/39) | 75% (43/57) | 0% | 5.3K / 0.32K (v1: 5.1K / 0.28K) |

Always-push scores 57% on test and 50% on train. Baseline is below it on both.

Round 1 (v1 on haiku): test agree +47 pts vs baseline (paired case-clustered 95% CI +20 to +70). Versus always-push the lead is +13 pts, CI -3 to +31, so it is not shown to beat the trivial answer. Test pass-recall 38% -> 46% (paired CI -39 to +54, no change shown). Train pass-recall fell 53% -> 27% (paired CI -51 to +2). 28/30 cases give the same decision on all 3 reps in both sets, so reps add little; the case count is the limit. Results: `haiku_v1/` (train), `heldout/haiku_v1/` (test), prompt in `v1/`.

Round 2 (v3 on haiku): test agree 70% -> 76%, paired delta vs v1 +5.6 pts (95% CI -5.6 to +17.8), below the +15 gate, so not an actionable improvement. Test pass-recall 46% -> 64% (+18, CI 0 to +36), push-recall 88% -> 84% (-4, CI -18 to +6). Versus baseline +52 pts (CI +29 to +72); versus always-push +19 pts. Per-case movement on test: 35, 38, 47 (pass) now mostly correct; 44 (push) went 3/3 to 0/3; 40 (push) 1/3 to 2/3. Zero invalid, zero unsure, 0 tool calls, served model claude-haiku-5-5. Judge on test: grounded 85/89, specific 87/89, consistent 88/89 (one row has no judge scores after a judge_error; the row is kept and excluded from the judge counts only). Test run hit 4 transient certificate errors in the agent call and 1 judge error; resume completed all 90 rows. *Train agree is contaminated: the prompt names four dev cases as examples (02, 12, 25, 29).

## Recommended change

Use `v3/system-prompt.md` (v1 plus one pass rule: a low-level or highly technical component the reader would not use herself is a pass, even when the page is clear). Prefer it to v1, not because it is proven better but because it kept v1's push recall within noise (88% to 84%) while raising pass recognition (46% to 64%) at no extra prompt-design cost. The v3 minus v1 difference on agree is +5.6 pts, CI -5.6 to +17.8, below the +15 gate, so treat v3 as a candidate, not a result. Every rule in v3 except one clause comes from Lucy's own reasons; the clause "a creative presentation of a technical subject still counts" is my inference from her push of case 15.

## Versus baseline

Held-out test, claude-haiku-5-5, 30 cases x 3 reps, strict parser:

| | baseline | v1 | v3 |
|---|---|---|---|
| agree | 23% [10-38] | 70% [53-86] | 76% [61-89] |
| push precision | 43% (6/14) | 68% (45/66) | 75% (43/57) |
| push recall | 12% | 88% | 84% |
| pass recall | 38% | 46% | 64% |
| unsure | 20% | 0% | 0% |

v3 minus baseline: +52 pts agree, paired case-clustered CI +29 to +72. v3 minus always-push (57%): +19 pts, CI 0 to +39, so it is only borderline above the trivial answer. The large gain over the baseline comes mostly from replacing the baseline's technical-mechanism bar (rubric v0) with Lucy's actual taste (rubric v1), which is round 1, not round 2.

## Why trust this

- Gold is Lucy's own labels only. Held-out labels were written blind (cards without the assistant's verdict) and rubric v1 was not written from them.
- Real Cavia tasks, one per row, served model recorded as claude-haiku-5-5, strict one-JSON-object parser, 100% valid, 0 tool calls. Headline recomputed from raw replies matches the stored grades.
- Judge is claude-opus-5-5, never the model under test; it grades the reason only, and its audit probes were failed on the intended criteria.
- Analyzer read only dev traces and dev feedback; it never saw held-out labels or traces. I did not read held-out case content to tune round 2.

## What limits the claim

- The held-out set picked the winner in rounds 1 and 2, so its numbers are selection-biased; a fresh blind batch labeled by Lucy is needed for the final number.
- Noise floor is about +/-14 pts for 30 cases; reps add little (26 of 30 cases give the same decision on all three reps). Case count is the limit.
- Train (dev) is contaminated for v3: the prompt names dev cases 02, 12, 25, 29.
- One v3 test row has no judge scores (judge_error); it stays in the decision metrics and is left out of the judge counts. The test run also hit 4 transient certificate errors; resuming completed all 90 rows.
- Case 44 (push) went from 3/3 correct with v1 to 0/3 with v3; I did not inspect it, because the held-out set must not guide tuning.
- Cost is not measured; tokens only.

## What else tried

- Round 1: v1 prompt (user-confirmed rubric) on haiku, +47 pts over baseline on test.
- The same v1 prompt on bright-rain and washed-bacon (descriptive only; both emit `<think>` blocks that fail the strict parser, so strict agree was 7% and 2%; post-hoc extraction gave 57% and 64%).
- Analyzer proposal for v3 (drop "any one is enough", add "state the hook in plain words", reword criteria 1, 4, 5): not run. It estimated a gain inside the noise floor, and most of its rules were my inference rather than her words. Replaced by a rule built from her own pass reasons.
- v2 (v1 plus a format sentence): unsupported; only smoke run, not carried forward.
- Not tried: few-shot examples of pushes, pass reasons for more cases (05, 08, 09, 27, 28 still lack them), a fresh blind test batch.

---

# Show HN Scout `select_project`: status

| round | variant | model | judge | cases x reps | Agree | Precision | Recall | Unsure | notes |
|---|---|---|---|---|---|---|---|---|---|
| 0 | baseline | claude-haiku-5-5 | claude-opus-5-5 | 30 x 1 (pilot) | 27% [13-43] | 0% (4 pushes) | 0% (0/15) | 27% | tokens in/out 174,670 / 10,634; cost not measured |

Pilot, one rep, dev set (all 30 cases calibrated the rubric): directional only.

**Reading.** The baseline agrees with Lucy's labels on 8 of 30 cases, below the 50% a constant answer would get (gold is 15 push / 15 pass). It never pushed a post Lucy labeled push (0 of 15), pushed 4 posts she passed, and answered `unsure` on 8. Its pushes are 3 of 15 in the random group and 1 of 15 in the purposeful group, so it is far stricter than Lucy: 9 of her 15 pushes sit in the purposeful group and the agent passes or hedges on nearly all of them. The prompt comes from `docs/rubric-v0.md`, not from her labels, so this gap says the written rubric does not yet express what she pushes. Nothing was tuned on these results.

**Judge.** claude-opus-5-5 rates 28/29 reasons grounded and 29/29 specific and consistent. The audit probes (empty, "I don't know", wrong project, fabricated claim, contradiction) were each failed on the intended criterion, but a judge that passes nearly everything has little room to separate good from bad reasons until Lucy has graded some by hand.

**Caveats.** 11 of 30 reasons are in English although the prompt asks for Chinese. `errors.jsonl` holds one `timeout` row that is a runner bug (task ct_1653cbbced0c4ecab9aad1ff049df93c finished normally); it is not agent behavior. Case 01 rep 0 comes from the smoke run, so it has no judge verdict (judge n = 29).

## Round 3 (v4, train60): agent-infra pass rule. Delta vs v3 +0.6 pts CI [-6.9,+8.6], push recall 84->76%. No improvement; v3 retained.

## Final test2 run (fresh-test, single run, 30 cases x 2 reps, claude-haiku-5-5, judge claude-opus-5-5; 60 rows each, 0 errors)
baseline agree 40% [23-57] (0 pushes, 35% unsure); v3 agree 65% [48-82], push precision 52%, recall 64%, pass recall 66%, unsure 0. Paired v3 - baseline +25.0 pts, CI [+1.7, +48.3]. Always-pass reference 63% (19/30). v3 does NOT beat always-pass on test2.
Caveat: labels were reviewed from assistant-prefilled suggestions (Lucy kept 54/60), so agreement is inflated and test2 is assistant-anchored; the test2 run was done once and not used to change any prompt.
