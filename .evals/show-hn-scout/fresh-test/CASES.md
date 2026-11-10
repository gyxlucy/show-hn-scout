# Show HN Scout eval cases (sign-off index)

30 cases, 30 human-labeled. Flow: given one Show HN post's evidence, answer `push` / `pass` / `unsure` with a reason.

- Model-visible input: `cases.jsonl` (`prompt`). Cards were `review/fresh-test/`. The cards carried assistant-suggested answers that you reviewed and edited (see data/fresh/assistant-suggestions.json), so these labels are not fully independent of the assistant.
- Gold: `gold.jsonl`, built only from your labels in `data/fresh/feedback-test.jsonl`. Nothing is inferred from an assistant verdict.
- Test set 2: drawn at random after v3 was written. LOCKED: never used to write or tune a prompt, analyzers must not read it, run it only for the final report.
- The prompt carries title, URL, post time, project page text, the HN comments that existed at capture time, and browser snapshots where used. It omits votes, ranking, sampling origin, and the assistant verdict.

| id | story | tags | evidence | prompt chars | expected |
|---|---|---|---|---|---|
| 91 | [50231567](https://news.ycombinator.com/item?id=50231567) | random, batch-10, page-text, no-author-reply | page ok, 0 comments | 2144 | push |
| 92 | [50229525](https://news.ycombinator.com/item?id=50229525) | random, batch-10, page-text, no-author-reply | page ok, 0 comments | 31155 | pass |
| 93 | [50218101](https://news.ycombinator.com/item?id=50218101) | random, batch-10, page-text, no-author-reply | page ok, 0 comments | 13720 | pass |
| 94 | [50215330](https://news.ycombinator.com/item?id=50215330) | random, batch-10, page-text, no-author-reply | page ok, 0 comments | 941 | pass |
| 95 | [50218772](https://news.ycombinator.com/item?id=50218772) | random, batch-10, no-page-text, author-replied | page ok, 2 comments | 503 | pass |
| 96 | [50223715](https://news.ycombinator.com/item?id=50223715) | random, batch-10, page-text, no-author-reply | page ok, 0 comments | 3317 | push |
| 97 | [50226501](https://news.ycombinator.com/item?id=50226501) | random, batch-10, page-text, no-author-reply | page ok, 0 comments | 6871 | pass |
| 98 | [50228301](https://news.ycombinator.com/item?id=50228301) | random, batch-10, no-page-text, author-replied | page ok, 3 comments | 723 | push |
| 99 | [50239457](https://news.ycombinator.com/item?id=50239457) | random, batch-10, page-text, no-author-reply | page ok, 0 comments | 2769 | pass |
| 100 | [50243029](https://news.ycombinator.com/item?id=50243029) | random, batch-10, page-text, no-author-reply | page ok, 1 comments | 1923 | pass |
| 101 | [50226623](https://news.ycombinator.com/item?id=50226623) | random, batch-11, page-text, no-author-reply | page ok, 1 comments | 9115 | push |
| 102 | [50217573](https://news.ycombinator.com/item?id=50217573) | random, batch-11, page-text, no-author-reply | page ok, 0 comments | 851 | pass |
| 103 | [50228239](https://news.ycombinator.com/item?id=50228239) | random, batch-11, page-text, no-author-reply | page ok, 0 comments | 1891 | push |
| 104 | [50221499](https://news.ycombinator.com/item?id=50221499) | random, batch-11, page-text, no-author-reply | page ok, 1 comments | 13564 | pass |
| 105 | [50237273](https://news.ycombinator.com/item?id=50237273) | random, batch-11, no-page-text, no-author-reply | page ok, 2 comments | 517 | push |
| 106 | [50232121](https://news.ycombinator.com/item?id=50232121) | random, batch-11, page-text, author-replied | page ok, 1 comments | 2265 | pass |
| 107 | [50229557](https://news.ycombinator.com/item?id=50229557) | random, batch-11, page-text, no-author-reply | page ok, 1 comments | 560 | push |
| 108 | [50231566](https://news.ycombinator.com/item?id=50231566) | random, batch-11, page-text, no-author-reply | page ok, 1 comments | 545 | pass |
| 109 | [50218188](https://news.ycombinator.com/item?id=50218188) | random, batch-11, page-text, no-author-reply | page ok, 0 comments | 279 | push |
| 110 | [50241871](https://news.ycombinator.com/item?id=50241871) | random, batch-11, no-page-text, no-author-reply | page ok, 0 comments | 314 | push |
| 111 | [50236627](https://news.ycombinator.com/item?id=50236627) | random, batch-12, page-text, no-author-reply | page ok, 0 comments | 3293 | push |
| 112 | [50241421](https://news.ycombinator.com/item?id=50241421) | random, batch-12, page-text, no-author-reply | page ok, 0 comments | 666 | pass |
| 113 | [50232415](https://news.ycombinator.com/item?id=50232415) | random, batch-12, no-page-text, author-replied | page ok, 7 comments | 3581 | push |
| 114 | [50234491](https://news.ycombinator.com/item?id=50234491) | random, batch-12, page-text, no-author-reply | page ok, 0 comments | 9616 | pass |
| 115 | [50222559](https://news.ycombinator.com/item?id=50222559) | random, batch-12, no-page-text, no-author-reply | page ok, 0 comments | 325 | pass |
| 116 | [50223763](https://news.ycombinator.com/item?id=50223763) | random, batch-12, no-page-text, no-author-reply | page ok, 0 comments | 358 | pass |
| 117 | [50229413](https://news.ycombinator.com/item?id=50229413) | random, batch-12, page-text, no-author-reply | page ok, 0 comments | 890 | pass |
| 118 | [50221066](https://news.ycombinator.com/item?id=50221066) | random, batch-12, page-text, no-author-reply | page ok, 9 comments | 14398 | pass |
| 119 | [50238873](https://news.ycombinator.com/item?id=50238873) | random, batch-12, page-text, no-author-reply | page ok, 0 comments | 678 | pass |
| 120 | [50236250](https://news.ycombinator.com/item?id=50236250) | random, batch-12, page-text, no-author-reply | page ok, 0 comments | 302 | pass |
