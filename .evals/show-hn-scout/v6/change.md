# v6: every push carries a strength (1-3), so a daily cap keeps the best pushes (derived from v3)

## Why
She wants at most 10 pushes a day. On random posts she labels about 45% push (27/60 on train60), v3 pushes about 57% (about 50 a day live), and the live cap keeps the newest 15, not the best. Cards review (train60/tier.jsonl): of her 27 pushes, 13 are must-read (22% of posts, about 23 a day if matched exactly), of which 6 (`core`: 40, 42, 46, 52, 68, 88) she ticked herself before seeing any suggestion. A yes/no gate cannot reach 10 a day; an ordering inside the pushes can.

## Hypothesis
Asking the judge to rate each push 1-3 (3 = must-read, about one push in five) lets a cap keep the strongest, so the top 6-10 of 60 contain far more must-read cases than a random 6-10 (random: 22%), and `core` ones come out as 3.

## Change vs v3
- The five push signals and the pass rules are unchanged, so the push decision should stay close to v3.
- New section: strength scale and what raises or lowers it. Output contract: `{decision, strength, reason}`; `strength` is 1-3 on a push and null otherwise (run with `--strength`; a push without it is no answer).
- No case is named. Sources: [她说] her reasons for the 13 must-reads and her rejection of 90 (the five raisers and the two lowerers are her words generalised); [推断] my generalisation from about 13 examples, in particular "companion-style app" and "AI coding assistants" reflect her current projects and tools. The prompt is in a public repo, so it states these.
- Known tension: v3 says "do not use UI polish as a measure of quality"; her reason on 90 was a crude site. The lowerer is worded "looks thin or unfinished, judge the product, not the page design" to avoid contradicting v3.
- Not included: her single hobby reason (86, learns an instrument); one example is not a rule.

## Guardrails (declared before the run; counts, since there are only 13 must-reads)
Measured with `tier-stats.py` on train60 x 2 reps:
1. Decision quality close to v3: push decisions on at least as many gold pushes as v3 keeps minus one case; unsure about 0; no invalid replies.
2. Ordering: the 6 best by mean strength hold at least 4 must-read cases (random 1.3), the 13 best at least 8 (random 2.8); at least 3 of the 6 `core` are among the 6 best.
3. Strength is used, not collapsed: all of 1, 2, 3 occur; strength 3 on no more than a third of pushes.
4. Offline cutoff (free, same rows): report push rate and composition for "push only when score >= 2 / 2.5 / 3".

## Limits
train60 is where the labels and the wording came from, so a good result is a feasibility check. The reader tiered 7 of the 13 against my suggestion (possible anchoring), so `core` (6) is reported separately. Real test: after v6 is frozen she tiers the 11 pushes of the locked test2 set (labelling only), then one run on test2.

## Status: RUN, hypothesis not supported (train60, haiku, 60 cases x 2 reps, `--strength --no-judge`, 120 rows, 0 errors, 0 invalid)

Cost not measured; output tokens per row 333 (v3 295, v5 728).

Decisions (guardrail 1: met). agree 78.3% [68-88] (v3 same reps 75.8%), precision 71%, push recall 89%, pass recall 70%, unsure 0. Pushes 36/60 cases (60%), about 63 a day before any cap, so the volume problem is untouched. Must-read kept 13/13, core 6/6.

Ordering (guardrail 2: NOT met). Cap keeps the k best by mean strength, ties split evenly:

| k | must-read in top k | needed | random | core in top k | needed | random |
|---|---|---|---|---|---|---|
| 6 | 2.4 | 4 | 1.3 | 1.0 | 3 | 0.6 |
| 10 | 4.0 | | 2.2 | 1.6 | | 1.0 |
| 13 | 5.2 | 8 | 2.8 | 2.1 | | 1.3 |

Strength used (guardrail 3: NOT met). Strength 3 was never given; of 68 push rows 52 are 2 and 16 are 1. By group (push rows): core 8 at 2 and 4 at 1; other must-read 13 at 2 and 1 at 1; other reader-push 17 / 5; reader-pass 14 / 6. Strength is stable across reps (30 of 32 cases) but does not separate the groups: mean strength core 1.67, other must-read 1.93, other reader-push 1.39, reader-pass 0.52 (pass counts 0).

Cutoff (guardrail 4). "Push only when score >= 2": 25/60 cases (42%, about 44 a day), must-read 10, other push 8, reader-pass 7. Nothing reaches 2.5, so there is no stricter cutoff to offer.

Why it fails (from the replies):
- The "raisers" are keyed to her tools and projects, so the model gives 2 to reader-pass posts that mention them (54, 66, 78, 80: "fits what she uses every day").
- The "lowerers" hit her own picks: core 40 and 42 got 1 ("a common category", "thin").
- "Use 3 for about one in five" was ignored; absolute 1-3 scoring collapsed to 2 for everything, a known weakness of absolute ratings.

Reference (free, same train60, v5 rows, not a v6 result): ordering the pushes by the mean number of P signals present gives must-read 3.3 / 5.1 / 6.0 in the top 6 / 10 / 13, a bit better than v6's strength (still below the guardrails), at 2.5x the tokens.

Verdict: do not adopt v6; keep as a negative result. Absolute strength from a single post is not the way to order; try comparing posts to each other (a listwise ranker) in a separate round.
