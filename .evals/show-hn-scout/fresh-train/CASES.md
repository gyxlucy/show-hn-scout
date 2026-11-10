# Show HN Scout eval cases (sign-off index)

30 cases, 30 human-labeled. Flow: given one Show HN post's evidence, answer `push` / `pass` / `unsure` with a reason.

- Model-visible input: `cases.jsonl` (`prompt`). Cards were `review/fresh-train/`. The cards carried assistant-suggested answers that you reviewed and edited (see data/fresh/assistant-suggestions.json), so these labels are not fully independent of the assistant.
- Gold: `gold.jsonl`, built only from your labels in `data/fresh/feedback-train.jsonl`. Nothing is inferred from an assistant verdict.
- Train set 2: drawn at random after v3 was written. Analyzers may read it and it may be used to tune prompts.
- The prompt carries title, URL, post time, project page text, the HN comments that existed at capture time, and browser snapshots where used. It omits votes, ranking, sampling origin, and the assistant verdict.

| id | story | tags | evidence | prompt chars | expected |
|---|---|---|---|---|---|
| 61 | [50221588](https://news.ycombinator.com/item?id=50221588) | random, batch-07, page-text, no-author-reply | page ok, 0 comments | 5149 | pass |
| 62 | [50216053](https://news.ycombinator.com/item?id=50216053) | random, batch-07, page-text, author-replied | page ok, 2 comments | 3698 | push |
| 63 | [50219762](https://news.ycombinator.com/item?id=50219762) | random, batch-07, page-text, no-author-reply | page ok, 0 comments | 3257 | pass |
| 64 | [50223070](https://news.ycombinator.com/item?id=50223070) | random, batch-07, page-text, no-author-reply | page ok, 0 comments | 7634 | pass |
| 65 | [50241557](https://news.ycombinator.com/item?id=50241557) | random, batch-07, page-text, no-author-reply | page ok, 0 comments | 4626 | pass |
| 66 | [50243142](https://news.ycombinator.com/item?id=50243142) | random, batch-07, page-text, author-replied | page ok, 1 comments | 17578 | pass |
| 67 | [50232722](https://news.ycombinator.com/item?id=50232722) | random, batch-07, no-page-text, no-author-reply | page ok, 0 comments | 363 | pass |
| 68 | [50218601](https://news.ycombinator.com/item?id=50218601) | random, batch-07, page-text, no-author-reply | page ok, 1 comments | 2734 | push |
| 69 | [50224373](https://news.ycombinator.com/item?id=50224373) | random, batch-07, page-text, no-author-reply | page ok, 1 comments | 8745 | push |
| 70 | [50215612](https://news.ycombinator.com/item?id=50215612) | random, batch-07, page-text, no-author-reply | page ok, 0 comments | 813 | pass |
| 71 | [50215652](https://news.ycombinator.com/item?id=50215652) | random, batch-08, page-text, no-author-reply | page ok, 0 comments | 701 | pass |
| 72 | [50236286](https://news.ycombinator.com/item?id=50236286) | random, batch-08, no-page-text, no-author-reply | page ok, 0 comments | 303 | pass |
| 73 | [50233315](https://news.ycombinator.com/item?id=50233315) | random, batch-08, no-page-text, no-author-reply | page ok, 0 comments | 339 | pass |
| 74 | [50242510](https://news.ycombinator.com/item?id=50242510) | random, batch-08, page-text, no-author-reply | page ok, 0 comments | 11261 | pass |
| 75 | [50239793](https://news.ycombinator.com/item?id=50239793) | random, batch-08, page-text, no-author-reply | page ok, 0 comments | 3268 | push |
| 76 | [50215712](https://news.ycombinator.com/item?id=50215712) | random, batch-08, page-text, no-author-reply | page ok, 0 comments | 7556 | push |
| 77 | [50217369](https://news.ycombinator.com/item?id=50217369) | random, batch-08, no-page-text, no-author-reply | page ok, 0 comments | 305 | pass |
| 78 | [50233685](https://news.ycombinator.com/item?id=50233685) | random, batch-08, page-text, no-author-reply | page ok, 0 comments | 4992 | pass |
| 79 | [50224416](https://news.ycombinator.com/item?id=50224416) | random, batch-08, page-text, no-author-reply | page ok, 1 comments | 4259 | push |
| 80 | [50242526](https://news.ycombinator.com/item?id=50242526) | random, batch-08, page-text, no-author-reply | page ok, 0 comments | 7697 | pass |
| 81 | [50223635](https://news.ycombinator.com/item?id=50223635) | random, batch-09, page-text, author-replied | page ok, 1 comments | 4968 | pass |
| 82 | [50225165](https://news.ycombinator.com/item?id=50225165) | random, batch-09, page-text, no-author-reply | page ok, 0 comments | 2494 | pass |
| 83 | [50232061](https://news.ycombinator.com/item?id=50232061) | random, batch-09, page-text, no-author-reply | page ok, 0 comments | 11360 | pass |
| 84 | [50222321](https://news.ycombinator.com/item?id=50222321) | random, batch-09, page-text, no-author-reply | page ok, 0 comments | 8570 | pass |
| 85 | [50223617](https://news.ycombinator.com/item?id=50223617) | random, batch-09, page-text, no-author-reply | page ok, 0 comments | 7197 | push |
| 86 | [50236232](https://news.ycombinator.com/item?id=50236232) | random, batch-09, page-text, no-author-reply | page ok, 0 comments | 7960 | push |
| 87 | [50229591](https://news.ycombinator.com/item?id=50229591) | random, batch-09, page-text, no-author-reply | page ok, 0 comments | 7996 | pass |
| 88 | [50242875](https://news.ycombinator.com/item?id=50242875) | random, batch-09, page-text, no-author-reply | page ok, 0 comments | 5139 | push |
| 89 | [50243157](https://news.ycombinator.com/item?id=50243157) | random, batch-09, page-text, no-author-reply | page ok, 0 comments | 7610 | pass |
| 90 | [50225233](https://news.ycombinator.com/item?id=50225233) | random, batch-09, page-text, no-author-reply | page ok, 0 comments | 3346 | push |
