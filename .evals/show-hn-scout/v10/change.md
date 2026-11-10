# v10: v9 plus her own reasons on the references

Status: RUN, hypothesis not supported by the declared guardrails (see "Result" at the end).

## Hypothesis (one)
v9 failed because the 10 references carried no stated reason, so the model guessed that she values serious developer infrastructure and ranks playful posts last (AUC of wanted over pass 0.38, 0 of 54 posts in the top 3). Adding her own one-line reasons to five of the references lets the model read her taste instead of guessing it, so the same rule ("push when it ranks in the top 3 of the 10") separates her wanted posts from the passes.

Only one thing changes versus v9: the `her_reason` field on the references that she annotated, plus one sentence in the system prompt saying what that field is. Same model, same cards, same rule, same threshold, same guardrails.

## Her reasons (`anchors/ranking.json`, her words, verbatim, added 2026-11-10 after she saw the v9 result)
- 1 Toli: tools for Claude Code and Codex working together, tightly tied to my daily workflow.
- 2 Logfolio: a useful everyday tool, fairly complete product, nicely designed, worth learning from, and also usable.
- 3 Gol: a very simple product you can just try, and a creative idea.
- 4 Triton kernels: low-level LLM technology, worth learning.
- 10 Online timer: a very small product that is not very useful, and this kind of idea is common.
Positions 5-9 (Podium, Mnemolith, Priced Out, Route games, 4096x) have no stated reason; the prompt tells the model not to guess one.

## What is built
- `anchor.ts --build --variant v10 --notes` writes `v10/system-prompt.md`; the runner with `--notes --variant v10` refuses to run if the file differs from what the confirmed order and notes produce. `v9/system-prompt.md` is unchanged (sha 5233ba54..., the one that was run).
- `v10/change.patch`: diff of the system prompt against v9.
- Tests: `bun test anchor.test.ts` (8 pass).

## Plan
Same as v9: day-1104, 54 posts x 3 reps = 162 calls, claude-haiku-5-5, no tools, about 5.8k input and 0.6k output tokens per call as measured in v9 (the reasons add a little). Cost not measured (no approved pricing rule). Rule fixed in advance: push when the mean rank over the 3 reps is <= 3.

## Guardrails (declared before the run, identical to v9)
1. Valid: at least 97% of the 162 calls valid, every post answered.
2. Selective: between 3 and 15 of the 54 posts pushed.
3. Precision: wanted (push + must) at least 75% of the pushed posts.
4. Few passes: gold-pass at most 15% of the pushed posts.
5. Order: mean rank of her must-reads < push < pass.
6. Stable: all 3 reps agree on push / not push for at least 80% of the posts.
Any one failing means the hypothesis is not supported. The threshold is not moved afterwards; the sweep is descriptive.

## Caveats stated up front
- Day-1104 is now used for the third time (v7, v9, v10) and its 54 posts have been looked at. I told her the v9 failure pattern (developer tools ranked high, playful posts low) before she wrote the reasons, so her reasons may have been shaped by it. That is legitimate input from her, but it means a pass here is weaker evidence than a first run. The confirmation would be a fresh labelled day (shadow-mode days she labels).
- Her reasons for 3 and 4 and 10 were written for the references, not for the day-1104 posts. If the posts she tiered as must-read on that day (paint-Twitter, skeleton scroll, detective game, Negative Space) are not covered by any stated reason, v10 may still fail; that would say the 10 references do not span her taste.
- Still a second stage on v3 pushes only; replacing v3 is not tested.
- One day, 54 posts, 8 must-reads: a difference of one or two posts is not a result.

## Result (day-1104, claude-haiku-5-5, 54 posts x 3 reps, cost not measured)
162 of 162 calls valid, 0 errors. Input 6,041 tokens and output 661 per call.

Verdict: FAIL, same guardrails as v9. G1 and G6 pass; G2, G3, G4, G5 fail.
- 0 of 54 posts reach a mean rank <= 3 (best 3.7, identical to v9). G3 and G4 fail because nothing is pushed.
- Mean rank: must-read 7.42, push 6.69, pass 6.87 (v9: 7.54 / 7.15 / 6.79). Order is still not must < push < pass.
- AUC of wanted ranking above pass: 0.45 (v9 0.38), must-read vs the rest 0.33 (v9 0.34). Both at or below chance; the reasons moved wanted-vs-pass slightly but did not fix it.
- Stable but wrong: 98% of posts get the same decision in all 3 reps (v9 93%). Inconsistent answers 46 of 162.
- Her four playful must-reads (paint-Twitter 8.3, Negative Space 8.0, skeleton scroll 8.0, Uncracked City 7.0) still sit near the bottom.

Conclusion: giving the model her own reasons for 5 references did not change the outcome. Two rounds of the anchor idea (10 references, with and without reasons) do not separate her wanted posts from her passes among v3 pushes on day-1104, and with a "top 3 of 10" bar nothing is pushed. The threshold was not moved. v7 (rank inside the day's pool) remains the only ranker with supporting evidence.
