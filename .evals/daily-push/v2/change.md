# v2: v3 + v8 ranker

Status: RECORDED (adapted from existing runs, no new calls)

## What this variant is
second stage: v7 with richer cards (2,500 page chars + 800 discussion chars).

Stage 1 is always the v3 judge (see `baseline/system-prompt.md`); this variant changes stage 2 only. The prompt in `system-prompt.md` is the stage-2 prompt.

Model: claude-haiku-5-5. Source run: train60-sim: train60/haiku_v8.

Original record: `.evals/show-hn-scout/v8/change.md`. Richer cards did not help on train60: not adopted. Not run on day-1104.
