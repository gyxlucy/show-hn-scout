# Show HN Scout eval cases (sign-off index)

30 cases, 0 human-labeled. Flow: given one Show HN post's evidence, answer `push` / `pass` / `unsure` with a reason.

- Model-visible input: `cases.jsonl` (`prompt`). Read it as rendered cards in `review/batch-01.md` to `batch-03.md`.
- Gold: `gold.jsonl`, built only from your labels in `data/review/feedback.jsonl`. Nothing is inferred from the assistant baseline.
- All 30 cases were already used to calibrate the rubric, so this is a development set, not a held-out test.
- The prompt carries title, URL, post time, project page text, the HN comments that existed at capture time, and browser snapshots where used. It omits votes, ranking, sampling origin, and the assistant verdict.

| id | story | tags | evidence | prompt chars | expected |
|---|---|---|---|---|---|
| 01 | [50191433](https://news.ycombinator.com/item?id=50191433) | purposeful, batch-01, page-text, no-author-reply | page ok, 0 comments | 7183 | pending |
| 02 | [50179254](https://news.ycombinator.com/item?id=50179254) | random, batch-01, page-text, no-author-reply | page ok, 0 comments | 2083 | pending |
| 03 | [50185268](https://news.ycombinator.com/item?id=50185268) | purposeful, batch-01, page-text, no-author-reply | page ok, 0 comments | 1712 | pending |
| 04 | [50178183](https://news.ycombinator.com/item?id=50178183) | random, batch-01, browser-snapshot, no-author-reply | page ok, 0 comments | 1846 | pending |
| 05 | [50173690](https://news.ycombinator.com/item?id=50173690) | purposeful, batch-01, page-text, no-author-reply | page ok, 0 comments | 30414 | pending |
| 06 | [50174998](https://news.ycombinator.com/item?id=50174998) | random, batch-01, page-text, no-author-reply | page ok, 0 comments | 23092 | pending |
| 07 | [50183591](https://news.ycombinator.com/item?id=50183591) | purposeful, batch-01, page-text, no-author-reply | page ok, 1 comments | 3520 | pending |
| 08 | [50174244](https://news.ycombinator.com/item?id=50174244) | random, batch-01, page-text, no-author-reply | page ok, 0 comments | 2747 | pending |
| 09 | [50190012](https://news.ycombinator.com/item?id=50190012) | purposeful, batch-01, page-text, no-author-reply | page ok, 0 comments | 5033 | pending |
| 10 | [50176914](https://news.ycombinator.com/item?id=50176914) | random, batch-01, page-text, no-author-reply | page ok, 0 comments | 1446 | pending |
| 11 | [50181222](https://news.ycombinator.com/item?id=50181222) | purposeful, batch-02, page-text, no-author-reply | page ok, 1 comments | 2675 | pending |
| 12 | [50180355](https://news.ycombinator.com/item?id=50180355) | random, batch-02, page-text, author-replied | page ok, 4 comments | 20371 | pending |
| 13 | [50187838](https://news.ycombinator.com/item?id=50187838) | purposeful, batch-02, page-text, no-author-reply | page ok, 0 comments | 12481 | pending |
| 14 | [50180037](https://news.ycombinator.com/item?id=50180037) | random, batch-02, page-text, no-author-reply | page ok, 0 comments | 4125 | pending |
| 15 | [50180257](https://news.ycombinator.com/item?id=50180257) | purposeful, batch-02, browser-snapshot, no-author-reply | page ok, 0 comments | 18226 | pending |
| 16 | [50180216](https://news.ycombinator.com/item?id=50180216) | random, batch-02, page-text, no-author-reply | page ok, 0 comments | 10298 | pending |
| 17 | [50186893](https://news.ycombinator.com/item?id=50186893) | purposeful, batch-02, page-text, no-author-reply | page ok, 0 comments | 9400 | pending |
| 18 | [50179603](https://news.ycombinator.com/item?id=50179603) | random, batch-02, page-text, no-author-reply | page ok, 0 comments | 40305 | pending |
| 19 | [50189982](https://news.ycombinator.com/item?id=50189982) | purposeful, batch-02, page-text, no-author-reply | page ok, 0 comments | 3273 | pending |
| 20 | [50175741](https://news.ycombinator.com/item?id=50175741) | random, batch-02, no-page-text, no-author-reply | page error, 0 comments | 327 | pending |
| 21 | [50183690](https://news.ycombinator.com/item?id=50183690) | purposeful, batch-03, page-text, no-author-reply | page ok, 0 comments | 2453 | pending |
| 22 | [50183915](https://news.ycombinator.com/item?id=50183915) | random, batch-03, page-text, no-author-reply | page ok, 0 comments | 10135 | pending |
| 23 | [50182480](https://news.ycombinator.com/item?id=50182480) | purposeful, batch-03, page-text, author-replied | page ok, 1 comments | 3654 | pending |
| 24 | [50173195](https://news.ycombinator.com/item?id=50173195) | random, batch-03, page-text, no-author-reply | page ok, 1 comments | 10454 | pending |
| 25 | [50180280](https://news.ycombinator.com/item?id=50180280) | purposeful, batch-03, page-text, no-author-reply | page ok, 0 comments | 10579 | pending |
| 26 | [50179736](https://news.ycombinator.com/item?id=50179736) | random, batch-03, browser-snapshot, no-author-reply | page error, 0 comments | 26017 | pending |
| 27 | [50179958](https://news.ycombinator.com/item?id=50179958) | purposeful, batch-03, browser-snapshot, author-replied | page ok, 2 comments | 1572 | pending |
| 28 | [50180337](https://news.ycombinator.com/item?id=50180337) | random, batch-03, page-text, author-replied | page ok, 2 comments | 8827 | pending |
| 29 | [50187882](https://news.ycombinator.com/item?id=50187882) | purposeful, batch-03, page-text, no-author-reply | page ok, 0 comments | 5554 | pending |
| 30 | [50174185](https://news.ycombinator.com/item?id=50174185) | random, batch-03, page-text, author-replied | page ok, 2 comments | 1054 | pending |
