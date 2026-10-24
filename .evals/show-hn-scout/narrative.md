# Show HN Scout `select_project`: status

| round | variant | model | judge | cases x reps | Agree | Precision | Recall | Unsure | notes |
|---|---|---|---|---|---|---|---|---|---|
| 0 | baseline | claude-haiku-5-5 | claude-opus-5-5 | 30 x 1 (pilot) | 27% [13-43] | 0% (4 pushes) | 0% (0/15) | 27% | tokens in/out 174,670 / 10,634; cost not measured |

Pilot, one rep, dev set (all 30 cases calibrated the rubric): directional only.

**Reading.** The baseline agrees with Lucy's labels on 8 of 30 cases, below the 50% a constant answer would get (gold is 15 push / 15 pass). It never pushed a post Lucy labeled push (0 of 15), pushed 4 posts she passed, and answered `unsure` on 8. Its pushes are 3 of 15 in the random group and 1 of 15 in the purposeful group, so it is far stricter than Lucy: 9 of her 15 pushes sit in the purposeful group and the agent passes or hedges on nearly all of them. The prompt comes from `docs/rubric-v0.md`, not from her labels, so this gap says the written rubric does not yet express what she pushes. Nothing was tuned on these results.

**Judge.** claude-opus-5-5 rates 28/29 reasons grounded and 29/29 specific and consistent. The audit probes (empty, "I don't know", wrong project, fabricated claim, contradiction) were each failed on the intended criterion, but a judge that passes nearly everything has little room to separate good from bad reasons until Lucy has graded some by hand.

**Caveats.** 11 of 30 reasons are in English although the prompt asks for Chinese. `errors.jsonl` holds one `timeout` row that is a runner bug (task ct_1653cbbced0c4ecab9aad1ff049df93c finished normally); it is not agent behavior. Case 01 rep 0 comes from the smoke run, so it has no judge verdict (judge n = 29).
