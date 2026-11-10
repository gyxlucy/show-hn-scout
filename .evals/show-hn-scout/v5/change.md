# v5: per-criterion signals before the decision (measurement variant, derived from v3)

Purpose: the headline metric only says whether the judger's final decision matches the reader's. The reader wants an automated judger to label data later, so we also need to see how the judger applies the rubric. v5 keeps v3's rubric wording and changes only the output contract: the judger first marks each push criterion (P1-P5) and each pass criterion (X1-X4) as present or not, quoting the evidence, then decides.

Hypothesis (to test, not assume): forcing explicit per-criterion output exposes which criterion drives the false pushes (v3 pushes about 56% of posts against the reader's 45%) and which criterion is missing when a push is missed. It is a measurement variant. Decisions may shift because the model now reasons before answering, so v5's decision metrics are compared with v3 on the same cases as a sanity check; v5 is not proposed as a replacement unless it also holds or improves agree.

Change vs v3 (rubric text unchanged):
- Criteria labelled P1-P5 (push) and X1-X4 (pass cases); the cross-reference "(3)" became "(P3)".
- New paragraph asking for `signals` (present + exact quote from the evidence, max 200 chars) before the decision, and for the reason to name the winner when a P and an X are both present.
- Output is `{"signals": {...9 ids...}, "decision": ..., "reason": ...}`, signals first.

Harness support: `run.ts --structured` (strict: a reply with missing or malformed signals is no answer, never a pass), `lib.ts` `gradeSignals` adds `sig_grounded` (every quoted passage appears verbatim in the evidence) and `sig_consistent` (push has at least one P; pass with a P has an X). `signal-stats.py` reports per-criterion firing against the reader's decision.

What these numbers are NOT: there are no human labels for individual criteria, so nothing measures whether the judger's reading of P1 or X2 on a post is right. We see only (a) which criteria it relies on when it is wrong about the final label, (b) whether its quotes are real, (c) whether its decision follows from its own signals.

Sources: the criteria text is v3's; nothing new is taken from the reader's labels. The X2 examples in v3 name four dev cases (02, 12, 25, 29), so do not run v5 on dev.

Status: RUN (approved by Lucy). train60, 60 cases x 2 reps = 120 rows, claude-haiku-5-5, no reason judge; 0 errors, 0 invalid replies. Cost not measured; output tokens per row 728 vs 295 for v3.
Result: agree 75.8% (v3, same reps 0-1: 75.8%); push recall 94% vs 84%; pass recall 61% vs 67%; precision 66% vs 67%; push share 64% of cases vs 58% for v3 and 45% for the reader. Decisions did not improve; the over-push is not fixed (and v5 pushes slightly more). Not proposed as a replacement for v3; it stays a measurement variant.
Signals: P1 fires on 68% of rows and on 100% of the reader's push rows but also on 41% of her pass rows; P5 on 57% (44% of her pass rows); P2-P4 fire rarely (14-15%) and are close to the base rate (65-72% when fired). X1 and X4 never fire on a reader-push row; X2 fires on all 3 missed pushes (cases 44, 52). Of 26 over-push rows, P1 is present on 23 and P5 on 19; one P alone carried the push on only 3. 108/117 rows have all quotes verbatim in the evidence (9 rows with a non-verbatim quote, e.g. joined with "..." or cut short; not checked one by one). Decision follows from the signals on 120/120 rows.
