Push gate needs a real twist: a better/faster/more private version of a known job, or a clear page alone, no longer counts (criteria 1 and 5)

Round 1 hypothesis (from train traces only, trajectory/analyzer-r1/proposal.md): the model treats any differentiator the author's page states for a tool in a crowded category as a "fresh angle" under criterion 1, and lets criterion 5 (professional page) stand alone. "Any one is enough" and "even when the idea is not new" let it push even when its own reason concedes a Pass condition. Evidence: 30 of 98 train push rows are false pushes on 11 pass-labelled cases; 8 of those are pushed in 3/3 reps; 12 of the 30 false-push reasons contain a caveat and push anyway (10 of 68 correct-push rows do).

Change (system prompt only, request.json identical to baseline), [TUNE]:
1. Intro: drop "even when the idea is not new. Novelty is not required."
2. "Any one is enough, unless a Pass condition below also applies".
3. Criterion 1: a fresh angle is a different kind of product (new use, user, situation, form); doing an existing job better/faster/more private/more integrated/more controllable is not one.
4. New Pass bullet with a one-phrase test: if the idea can only be stated by its implementation or its advantage over alternatives (or only by the page looking complete), pass.

Expected recoveries (train, gold pass currently pushed): 54, 80, 56, 64, 66, 78, 35, 61 likely; 38, 33, 83 possible. Best-case precision 69% -> ~81%, expected 73-77% (inside the noise on train; paired train half-width about 9 pts).
Expected regressions (gold push currently pushed 3/3): 36, 53, 55 most exposed; 32, 31, 88 also. Pooled recall floor 80% allows roughly 3 push rows lost of the 81 train push rows; two of 36/53/55 flipping on all reps would break it -> reject.
Output contract unchanged. Tokens: prompt about +120 tokens.
