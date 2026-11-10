# v3: v3 + v9 anchor

Status: RECORDED (adapted from existing runs, no new calls)

## What this variant is
second stage: each post compared with 10 references she ordered; push when its rank is <= 3 of 10.

Stage 1 is always the v3 judge (see `baseline/system-prompt.md`); this variant changes stage 2 only. The prompt in `system-prompt.md` is the stage-2 prompt.

Model: claude-haiku-5-5. Source run: day-1104: day-1104/haiku_v9.

Original record: `.evals/show-hn-scout/v9/change.md`. Declared guardrails failed on day-1104: nothing reaches rank <= 3.
