# baseline: live cap

Status: PLANNED (no run yet)

## What this variant is
today's product: v3 judge pushes, the newest 10 are posted.

Stage 1 is always the v3 judge (see `baseline/system-prompt.md`); this variant changes stage 2 only. The prompt in `system-prompt.md` is the stage-2 prompt (here the stage-1 judge prompt, since the baseline has no stage 2).

Model: claude-haiku-5-5. Source run: none.

The live product after commit 61cf759: the day's v3 pushes are capped at the newest 10. On train60-sim the posts are not from one day, so this row is a mock there.
