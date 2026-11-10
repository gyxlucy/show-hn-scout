# v9: compare each post with 10 reference posts she ordered

Status: RUN, hypothesis not supported by the declared guardrails (see "Result" at the end).

## Hypothesis (one)
A post judged on its own against 10 reference posts that the reader herself put in order, with the fixed rule "push when it would rank in the top 3 of those 10", keeps what she wants and drops what she does not better than the newest-10 cap, at a stable daily rate that does not depend on the day's pool (v7 ranks inside the day's pool, so it always fills the cut).

Only the source of taste changes versus v7: her ordered examples instead of written up/down rules. v9 has no up/down list; the model has to read her taste from where she placed the references.

## The references (`anchors/ranking.json`, confirmed 2026-11-10, provenance: her own ordering)
Drawn from train60 (real feed, random sample), stratified by her earlier tiers and by topic, shown to her in random order with no label and no assistant prediction. Her order, strongest first:
1 Toli, 2 Logfolio, 3 Gol, 4 Triton kernels port, 5 Podium, 6 Mnemolith, 7 Priced Out, 8 Route Optimization Mini-Games, 9 4096x, 10 Online timer you can see.

Her order disagrees with her earlier tiers on 9 of 33 comparable pairs: three earlier-pass posts (Triton 4, Mnemolith 6, Route games 8) sit above earlier-push posts (Priced Out, 4096x, timer), and Triton sits above Podium. She confirmed this is her current view. Earlier tiers were mostly assistant-suggested and human-reviewed; this order is hers alone.

## What is built
- `anchor.ts`: `--build` writes `v9/system-prompt.md` from `anchors/ranking.json` (the runner refuses to run if the file drifted); the runner makes one real Cavia task per (post, rep); `--approved` is the consent gate; resumes by (post, rep); same results layout. The agent replies `{stronger_than: [reference ranks it beats], reason}`; rank = 1 + references not beaten; push when rank <= 3 (beats at least 8 of the 10).
- `anchor-stats.py`: metrics, same-N baselines, threshold sweep (descriptive), guardrails G1-G6.
- `anchor.test.ts`: 8 tests (strict parse, rank and inversions, prompt carries no labels, unconfirmed order refused, resume, drift refused).
- Input to the model: references' title, URL, first 700 chars of page text; candidate's title, URL, first 700 chars. No votes, decision, tier, label or posting time.

## Plan
- Set day-1104: the 54 posts v3 pushed on 2026-11-04, with her tiers (must 8, push 18, pass 28). No reference comes from this day (checked by HN id). Model claude-haiku-5-5, no tools, 3 reps per post = 162 calls. Each call was estimated at about 3k input tokens (measured: 5,798 in, 590 out) (10 reference cards in the system prompt plus one card) and a short output. Cost not measured (no approved pricing rule).
- Rule fixed in advance: a post is pushed when its mean rank over the 3 reps is <= 3.

## Baselines on the same day (free, already computed)
Top 10 wanted / must / pass: random 4.8 / 1.5 / 5.2; newest 10 (today's cap) 4 / 1 / 6; v7 6-rep mean 8.7 / 2.5 / 1.3. Base rate of wanted among the 54: 48%.

## Guardrails (declared before the run)
1. Valid: at least 97% of the 162 calls return a valid answer and every post has an answer.
2. Selective: between 3 and 15 of the 54 posts are pushed.
3. Precision: wanted (push + must) is at least 75% of the pushed posts.
4. Few passes: gold-pass is at most 15% of the pushed posts.
5. Order: mean rank of her must-reads < push < pass.
6. Stable: all 3 reps agree on push / not push for at least 80% of the posts.
Fail on any one means the hypothesis is not supported. The threshold (3) is not tuned afterwards; the sweep over 1-8 is shown for information only. If fewer than 3 posts clear the bar, that is reported as "bar too strict for this prompt", not fixed by moving it.

## Caveats stated up front
- This tests v9 as a second stage on the posts v3 already pushed (that is all her tiers cover). Whether it could replace v3 on the raw feed is not tested: we have no labels for the posts v3 passed on that day.
- Only one day, 54 posts, 8 must-reads: a difference of one or two posts is not a result. The same day validated v7, so its numbers are comparable, but v9 sees each post alone and v7 sees the whole day.
- The 10 references are one sample of her taste. Sensitivity to which 10 (for example leave-one-reference-out) is not tested in this round.
- References come from train60, which also fed v3-v8 design, so train60 style posts may look familiar; day-1104 is the independent check.
- Her tiers on day-1104 were edited from the assistant's predictions (provenance human_reviewed_assistant_prediction), and the model family is the same, which can inflate agreement.
- Page start is the first 700 characters, like v7; pages that open with navigation text are judged on little.

## Result (day-1104, claude-haiku-5-5, 54 posts x 3 reps, cost not measured)
162 of 162 calls valid, 0 errors. Input 5,798 tokens and output 590 per call (the estimate of 3k input was too low).

Verdict: FAIL. G1 and G6 pass; G2, G3, G4, G5 fail.
- G2: 0 of 54 posts reach a mean rank <= 3 (best mean rank 3.7). The bar is not reachable with these references.
- G5 inverted: mean rank must-read 7.5, push 7.2, pass 6.8. AUC of "wanted ranks above pass" 0.38 (below chance 0.5); must-read vs the rest 0.34.
- Stable but wrong: 93% of posts get the same push/not-push in all 3 reps. 48 of 162 answers were inconsistent (beat a higher reference but not a lower one).
- Beaten share per reference rank: 1: 0%, 2: 4%, 3: 10%, 4: 1%, 5: 33%, 6: 12%, 7: 46%, 8: 95%, 9: 98%, 10: 100%. Almost every candidate lands at ranks 6-9, below the top 6 and above the bottom 3.

What the reasons show (descriptive, from reading the replies): the model read her order as "serious developer infrastructure first, games, timers and maps last". The posts it ranked highest were developer / infra tools that she tiered pass (Kairos 3.7, npm publish check 4.7, Hardcount 4.7), while her must-reads on that day that are playful or personal (paint-Twitter 8.3, skeleton scroll 8.0, Uncracked City 8.0, Negative Space 8.0) landed near the bottom. So her day-1104 tiers and the order she gave the 10 references point in different directions, and the references carry no stated reason (her notes were empty) for the model to correct that guess.

Two candidate explanations, neither tested: (1) her order of the 10 measures something other than "push for her" (for example how substantial or impressive a post is), while her tiers on day-1104 measure what she would enjoy; (2) 10 references with no reasons are too few for the model to recover her taste. A third piece of evidence is already known: her earlier tiers and this order disagree on 9 of 33 pairs, mostly about playful posts ranked at the bottom.

The threshold (3) was not moved and not tuned afterwards. v7 stays the better-supported ranker on this day (top-10 wanted 8.7 vs 4.8 random).
