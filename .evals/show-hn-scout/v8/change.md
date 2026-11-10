# v8: listwise ranker, richer cards

Status: RUN, hypothesis not supported (see Result at the end).

## Hypothesis (one)
v7 ranked from the title and the first 700 characters of the page. It missed most of her must-reads that are not about her own tools (new angle, widens product view, hobby), and ranked two core picks 18th and 24th. If the ranker sees a longer excerpt (2,500 characters) and the start of the HN discussion (800 characters), the same ranking question puts more must-reads in the top 10.

Only the evidence changes versus v7. The ranker's rules are the same except one sentence that says the card has a longer excerpt and a discussion field. Pool, reps, shuffles (seeds 1-6), model and guardrails are the same as v7, so the two runs are directly comparable.

## What changed in the code
- `rank.ts`: `--page-chars` (default 700) and `--comment-chars` (default 0) set the card size; both are recorded in `summary.json` and a resume with different sizes is refused. The default card is the v7 card. 31 tests pass (new: bigger card keeps more page text and adds the discussion; default unchanged).
- `v8/system-prompt.md` and `v8/change.patch` (diff against v7).
- Daily limit in `.github/workflows/scout.yml` changed from 15 to 10 pushes (README updated). Not committed, so not live yet.

## Plan
Set train60, claude-haiku-5-5, pool = the 34 posts v3 pushed, 6 reps (6 calls), run with `--page-chars 2500 --comment-chars 800 --timeout-s 600`. About 25k input tokens per call (estimate, v7 was 13.8k for 700 chars), output about 2.5k. Cost not measured.

## Guardrails (the same as v7, declared before the run)
1. 6 of 6 reps valid, no errors (timeout ceiling raised to 600 s because one v7 rep hit 300 s).
2. Mean over reps: must-read in top 6 >= 4 and top 10 >= 6; core in top 6 >= 2; also above the v5 P-count baseline at k=6 and k=10 (3.5, 5.5).
3. Position bias: mean |Spearman| < 0.2.
4. Top-10 overlap between reps >= 60%.
Reference from v7 (5 reps): must-read top 6 / 10 / 13 = 3.0 / 4.8 / 6.0, core top 6 = 2.8, bias 0.16, overlap 68%.

## Caveats
- Same circularity as v7: the reader description came from the same labels, so a pass on train60 is "worth confirming on a tiered fresh set".
- Longer cards also give the model more chances to favour a long page or an enthusiastic author comment.
- 34 posts, 12 must-reads: a difference of one or two posts is not a result.

## Result (train60, claude-haiku-5-5, pool of 34 from haiku_v3, cost not measured)
6 of 6 calls valid, 0 errors. Input 35,233 tokens per call (estimate was 25k), output 3,139 on average.

| order | k=6 must-read / core | k=10 | k=13 |
|---|---|---|---|
| random | 2.1 / 0.9 | 3.5 / 1.5 | 4.6 / 1.9 |
| v5 P count | 3.5 / 1.5 | 5.5 / 2.7 | 6.0 / 3.0 |
| v7 ranker, 700 chars (5 reps) | 3.0 / 2.8 | 4.8 / 3.2 | 6.0 / 3.4 |
| **v8 ranker, 2,500 chars + discussion (6 reps)** | **3.2 / 2.8** (range 2-4 / 2-4) | **4.7 / 3.2** (4-6 / 3-4) | **5.8 / 3.7** (5-8 / 3-5) |

Guardrails: 1 valid 6/6: met. 2 ordering: NOT met (must-read top 6 = 3.2 < 4, top 10 = 4.7 < 6, below v5 P count; core in top 6 = 2.8 >= 2 met). 3 position bias 0.15: met (one rep 0.44). 4 top-10 overlap 69%: met.

Versus v7 the differences are 0.2, 0.1 and 0.2 posts, far inside the range over reps: a longer excerpt and the HN discussion changed nothing. Top 10 most often: core 46, 42 (6/6), 40 (5/6), non-must 34, 45 (6/6), 90 (4/6), and 66, which she labelled pass (6/6). The other must-reads (49 4/6, 53 and 76 2/6) stay scattered, as in v7.

Reading: the missing information is not on the page. What puts her non-core must-reads above other pushes is her own taste ("opens thinking", "email has many possibilities", "I study an instrument"), which neither the excerpt nor the discussion carries. The ranker finds the posts that match her stated tools and projects, which is what its description says.

Verdict: not adopted. No further evidence-size round is planned.
