# Metrics (stage-1 judge)

Goal: raise **precision** while **push recall stays ≥ 80%** (and valid replies ≥ 98%). The floor is judged on the pooled 90 cases (114 push rows): the control already has only 67% recall on the 30 test cases, which hold 11 push cases, so a test-only floor would be decided by a handful of posts. Test recall is still reported every round. Every ratio is the pooled mean over the rows where its denominator exists (lib.ts `gradeAnswer`); status `ok` rows only. Intervals are case-clustered bootstrap (reps of one case are not independent); deltas versus the control use the same resampled cases. **All results are directional**: the test set is 30 cases (11 push, 19 pass) at 3 reps.

| metric | definition | direction |
|---|---|---|
| precision (headline) | among rows where the agent pushed: share where the human label is push | higher |
| recall | among rows labelled push: share the agent pushed | higher, floor 0.8 |
| specificity | among rows labelled pass: share the agent did not push | higher |
| agree | decision equals the human label (unsure counts as a miss) | higher |
| unsure | share of rows answered unsure | lower |
| valid | reply met the strict JSON output contract | higher |
| pushes | share of rows with decision push (context, not a goal) | context |
| decision unanimity | share of cases whose 3 reps all gave the same decision (rep-to-rep stability) | higher |
| tokens, latency | mean per task; no $ figure (cost not measured) | lower |

## train (60 cases)

| variant | valid rows / planned (+err) | precision [95% CI] | per-rep precision | recall [95% CI] | per-rep recall | specificity | agree | unsure | pushes (share of rows) | decision unanimity over reps | Δprecision vs control [95% CI] | Δrecall vs control [95% CI] |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline (v3 control) | 180/180 (+1 err) | 69% [53%, 84%] n=98 | 69%–71% | 84% [69%, 96%] n=81 | 81%–89% | 70% | 76% | 0% | 54% | 92% | – | – |
| v1 | 180/180 | 83% [57%, 100%] n=29 | 80%–88% | 30% [14%, 47%] n=81 | 26%–33% | 95% | 66% | 0% | 16% | 92% | +13.4 [-7.5, 34.4] | -54.3 [-70.6, -36.9] |
| v2 | 180/180 | 72% [56%, 86%] n=102 | 71%–73% | 90% [77%, 100%] n=81 | 89%–93% | 71% | 79% | 0% | 57% | 97% | +2.2 [-5.9, 10.5] | +6.2 [-1.6, 16.7] |
| v3 | 180/180 | 72% [56%, 86%] n=104 | 71%–74% | 93% [81%, 100%] n=81 | 93%–93% | 71% | 81% | 0% | 58% | 97% | +2.7 [-1.7, 8.3] | +8.6 [-5.0, 22.7] |

## test (30 cases)

| variant | valid rows / planned (+err) | precision [95% CI] | per-rep precision | recall [95% CI] | per-rep recall | specificity | agree | unsure | pushes (share of rows) | decision unanimity over reps | Δprecision vs control [95% CI] | Δrecall vs control [95% CI] |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline (v3 control) | 90/90 (+1 err) | 56% [29%, 81%] n=39 | 50%–64% | 67% [39%, 90%] n=33 | 64%–73% | 70% | 69% | 0% | 43% | 83% | – | – |
| v1 | 90/90 | 100% [100%, 100%] n=11 | 100%–100% | 33% [7%, 63%] n=33 | 27%–36% | 100% | 76% | 0% | 12% | 97% | +43.6 [19.0, 69.6] | -33.3 [-58.3, -10.0] |
| v2 | 90/90 | 47% [18%, 74%] n=34 | 45%–50% | 48% [19%, 76%] n=33 | 45%–55% | 68% | 61% | 0% | 38% | 90% | -9.4 [-23.4, 0.0] | -18.2 [-42.4, 3.7] |
| v3 | 90/90 | 52% [21%, 78%] n=33 | 45%–55% | 52% [21%, 80%] n=33 | 45%–55% | 72% | 64% | 0% | 37% | 83% | -4.9 [-19.2, 4.8] | -15.2 [-38.1, 0.0] |

## all (90 cases)

| variant | valid rows / planned (+err) | precision [95% CI] | per-rep precision | recall [95% CI] | per-rep recall | specificity | agree | unsure | pushes (share of rows) | decision unanimity over reps | Δprecision vs control [95% CI] | Δrecall vs control [95% CI] |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline (v3 control) | 270/270 (+2 err) | 66% [52%, 78%] n=137 | 63%–67% | 79% [66%, 91%] n=114 | 76%–84% | 70% | 74% | 0% | 51% | 89% | – | – |
| v1 | 270/270 | 88% [68%, 100%] n=40 | 86%–92% | 31% [18%, 44%] n=114 | 29%–32% | 97% | 69% | 0% | 15% | 93% | +21.8 [5.2, 38.5] | -48.2 [-62.4, -34.2] |
| v2 | 270/270 | 65% [51%, 79%] n=136 | 65%–66% | 78% [65%, 90%] n=114 | 76%–79% | 70% | 73% | 0% | 50% | 94% | -0.3 [-6.2, 5.7] | -0.9 [-10.8, 9.2] |
| v3 | 270/270 | 67% [54%, 80%] n=137 | 67%–67% | 81% [68%, 92%] n=114 | 79%–82% | 71% | 75% | 0% | 51% | 92% | +1.5 [-3.2, 6.4] | +1.8 [-10.6, 14.0] |

## Status table

| round | change (one line) | test precision | test recall | train precision | train recall | valid | s/turn | tokens in / out per task | status |
|---|---|---|---|---|---|---|---|---|---|
| 0 | v3 control (unchanged production prompt) | 56% | 67% | 69% | 84% | 100% | 5.1 | 5031 / 271 | control |
| 1 | Push gate needs a real twist: a better/faster/more private version of a known job, or a clear page alone, no longer counts (criteria 1 and 5) | 100% | 33% | 83% | 30% | 100% | 4.7 | 5183 / 255 | pooled recall below the 80% floor |
| 2 | Two narrow Pass bullets: product not actually offered yet, and a page that leads with a speed/size/benchmark number instead of what the user can do | 47% | 48% | 72% | 90% | 100% | 4.7 | 5154 / 318 | pooled recall below the 80% floor |
| 3 | Pass conditions become gates that outrank the Push criteria; a conceded Pass-kind reservation means pass (precedence, not new wording about novelty) | 52% | 52% | 72% | 93% | 100% | 4.6 | 5178 / 308 | precision gain inside noise |
