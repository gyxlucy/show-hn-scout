# Stage-1 judge hillclimb: status

<!-- STATUS-START -->
| round | change (one line) | test precision | test recall | train precision | train recall | valid | s/turn | tokens in / out per task | status |
|---|---|---|---|---|---|---|---|---|---|
| 0 | v3 control (unchanged production prompt) | 56% | 67% | 69% | 84% | 100% | 5.1 | 5031 / 271 | control |
| 1 | Push gate needs a real twist: a better/faster/more private version of a known job, or a clear page alone, no longer counts (criteria 1 and 5) | 100% | 33% | 83% | 30% | 100% | 4.7 | 5183 / 255 | pooled recall below the 80% floor |
| 2 | Two narrow Pass bullets: product not actually offered yet, and a page that leads with a speed/size/benchmark number instead of what the user can do | 47% | 48% | 72% | 90% | 100% | 4.7 | 5154 / 318 | pooled recall below the 80% floor |
| 3 | Pass conditions become gates that outrank the Push criteria; a conceded Pass-kind reservation means pass (precedence, not new wording about novelty) | 52% | 52% | 72% | 93% | 100% | 4.6 | 5178 / 308 | precision gain inside noise |
<!-- STATUS-END -->

## Round 0 (control)
v3 prompt re-run in the same environment: train precision 69% / recall 84%, test 56% / 67%, pooled 66% / 79%. Test recall of the control is already below 80% (only 11 push cases), so the recall floor is judged on the pooled 90 cases (declared after the control run).

## Round 1: v1 (rejected)
Hypothesis: the model treats any differentiator the page states for a tool in a crowded category as a fresh angle, and lets "professional page" stand alone. Change: removed the novelty sentence, "unless a Pass condition applies", rewrote criterion 1, added a one-phrase-test Pass bullet.
Result: pushes fell from 51% to 15% of rows. Precision rose (train 83%, test 100% on n=11 pushes) but pooled recall fell to 31% [18%, 44%], far below the 80% floor. Train: removed 25 of 30 false-push rows, lost 44 of 68 true-push rows. Analyzer r2 (train traces only) attributes the loss mainly to the criterion-1 rewrite: the same wording describes both the lost true pushes and the removed false pushes. Reverted; round 2 starts from the baseline prompt.

## Round 2: v2 (no effect)
Hypothesis: the false pushes that can be told apart by evidence-level signatures: the page says the product is not released / empty demo, or leads with a speed/size/benchmark number. Change: two narrow Pass bullets on top of the baseline prompt (analyzer r2, train traces).
Result: pooled precision 65% [51%, 79%] vs 66% control, pooled recall 78% [65%, 90%] vs 79%; paired delta pooled precision -0.3 [-6.2, +5.7], recall -0.9 [-10.8, +9.2]. Train looked slightly better (precision 72%, recall 90%) and test slightly worse (47% / 48%; paired test precision delta -9.4 [-23.4, 0.0]); that opposite sign is what noise on 60 vs 30 cases looks like. Per case, pushes moved in both directions on pass-labelled train cases (3 cases lost pushes, 3 gained pushes), so the two bullets did not do one consistent thing. Pooled recall 78% is below the 80% floor (the control's is 79%).

## Round 3: v3 (no effect)
Hypothesis: the baseline says "any one is enough" for Push and the model treats a Pass-kind drawback it names (too low-level, narrow audience, thin page) as a footnote to a push; making the Pass list a gate that outranks Push should flip those rows. Change: precedence wording plus one exemption sentence (crowded / large / not-new are not Pass conditions). Analyzer r3 (train traces only).
Result: pooled precision 67% [54%, 80%] vs 66% control (paired +1.5 [-3.2, +6.4]); pooled recall 81% [68%, 92%] vs 79% (paired +1.8 [-10.6, +14.0]); the 80% floor holds, but there is no precision gain outside noise. Train precision 72% (+2.7 [-1.7, 8.3]), recall 93%; test precision 52% (-4.9 [-19.2, 4.8]), recall 52% (-15.2 [-38.1, 0.0]). Pushes did not fall (train 58% vs 54% of rows), so the gate wording did not make the model more conservative; the sign difference between train and test again looks like noise.

## Step 4.5 reading (no new model calls)
- Variance is not the issue: in the control 92% (train) / 83% (test) of cases give the same decision in all 3 reps. Train: 11 of 60 cases wrong in all 3 reps, 5 mixed, 44 right; test: 7 all-wrong, 5 mixed, 18 right. The false pushes are systematic.
- Analyzer r2 found that the lost true pushes and the removed false pushes are described by the same wording in the model's reasons, with pairs of near-identical cases carrying opposite labels. Analyzer r3 found the same (misses sit next to false pushes with the same description). The remaining errors look like label/preference ambiguity that a system-prompt rule does not separate. Each of the three levers (wording about novelty, evidence-signature bullets, rule precedence) either broke recall (v1) or stayed within noise (v2, v3).

## Final summary
**Recommended change:** none. Keep the v3 prompt (the production one); do not merge the round-1, round-2 or round-3 variants.
**Versus baseline (test, 30 cases, 3 reps):** control precision 56% [29%, 81%], recall 67% [39%, 90%]. v1: precision 100% (n=11 pushes), recall 33%. v2: precision 47% [18%, 74%], recall 48% [19%, 76%]; paired test precision delta -9.4 [-23.4, 0.0]. Round-3 variant: precision 52% [21%, 78%], recall 52% [21%, 80%]; paired test precision delta -4.9 [-19.2, 4.8]. Pooled 90 cases: control 66% / 79%, round-1 variant 88% / 31%, round-2 variant 65% / 78%, round-3 variant 67% / 81%.
**Why trust this:** control re-run in the same environment, same cases for all variants, case-clustered bootstrap with paired deltas, 270/270 valid rows per variant (no errors for the three variants; 2 error attempts in the control, retried), model recorded on every row (served model is not exposed by Cavia). Directional only: 30 test cases, 11 push-labelled.
**What else was tried:** the three rounds above (spend: control 270 + 3 x 270 tasks, the full approved budget). Winner's curse does not apply because nothing won.
**What to try next:** (1) more labelled cases, especially pass-labelled cases that look like pushes, to make a 5-point precision gain visible; (2) review the ~11 consistently misjudged train cases with Lucy to see whether the labels are consistent; (3) use the stage-2 ranker (already measured in daily-push) to improve what reaches the 10 daily pushes instead of tightening stage 1; (4) a model/prompt pairing not yet tried (not run here).
