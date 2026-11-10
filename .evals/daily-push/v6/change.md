# v6: v7 on deepseek-4.1-flash

Status: RECORDED (adapted from existing runs, no new calls)

## What this variant is
the v7 ranker prompt on a cheaper model, same pool from haiku_v3.

Stage 1 is always the v3 judge (see `baseline/system-prompt.md`); this variant changes stage 2 only. The prompt in `system-prompt.md` is the stage-2 prompt.

Model: deepseek-4.1-flash. Source runs: day-1104: day-1104/deepseek_v7; train60-sim: train60/deepseek_v7; day-1109: day-1109/deepseek_v7.


