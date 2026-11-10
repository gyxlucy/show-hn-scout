# v1: v3 + v7 ranker

Status: RECORDED (adapted from existing runs, no new calls)

## What this variant is
second stage: listwise ranker with 700-char cards, top 10 of the ranking.

Stage 1 is always the v3 judge (see `baseline/system-prompt.md`); this variant changes stage 2 only. The prompt in `system-prompt.md` is the stage-2 prompt.

Model: claude-haiku-5-5. Source runs: day-1104: day-1104/haiku_v7; train60-sim: train60/haiku_v7; day-1109: day-1109/haiku_v7.

Original record: `.evals/show-hn-scout/v7/change.md`. train60: not adopted. day-1104: guardrails G1-G6 pass (narrowly on G6). day-1109 (real held-out, blind labels): G1-G6 pass again (G2 narrowly). Two real days.
