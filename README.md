# Show HN Scout

发现 Show HN 中被忽略的、有具体想法的工作。第一阶段：真实材料采集与个人品味校准。

## 先阅读

- [第一批：10 个项目](review/batch-01.md)
- [第二批](review/batch-02.md) / [第三批](review/batch-03.md)
- [判断标准 v0](docs/rubric-v0.md)
- [助手初评汇总](review/assistant-baseline.md)（每张阅读卡里也附有助手建议）
- [评测 skill 接入与当前边界](docs/eval-handoff.md)

可以直接在对话中回复 `01 值得推：原因；02 不值得推：原因`，由助手原样记录。

## 运行

Python 3.11+，唯一第三方依赖为 Beautiful Soup。创建虚拟环境后运行 `python3 -m pip install -r requirements.txt`。

```bash
python3 -m hn_scout collect --pages 4 --show-pages 12
python3 -m hn_scout candidates
python3 -m hn_scout enrich <HN_ID> <HN_ID>
python3 -m hn_scout render
python3 -m hn_scout label 01 push --reason '用户的实际反馈' --originality yes
python3 -m hn_scout feedback
python3 -m unittest discover -s tests -v
python3 scripts/check_calibration.py
```

若本机代理使用 198.18.0.0/15 合成 DNS，采集命令前显式加 `HN_SCOUT_PROXY_DNS=1`。默认拒绝非公网地址，仅在此开关下允许该代理地址段，仍不允许 localhost/私网目标。仅抓取公开 HTML/文本/JSON，不登录、不执行网页脚本或项目代码。

## 数据

SQLite 保存故事、逐次榜单位置和证据索引；原始响应按 SHA-256 落盘。复采不重建故事身份，榜单观察不覆盖。网络失败会记录错误，不变成负面评价。分页非原子、观察开始前历史未知等限制见 rubric。

这次采集与抽样的详情见 [首轮记录](docs/first-run.md)。材料由 `data/calibration/annotations.json` 中的阅读笔记生成；`scripts/build_calibration.py` 将它们与冻结的证据对应，`python3 -m hn_scout render` 重建阅读文档。

`cases.json` 中的 baseline 是助手定性初评。人类标签单独写入 append-only feedback.jsonl。当前 30 个案例都已用于校准，不能充当最终 held-out test。

## Slack 机器人

`bot/` 把评测选出的 v3 agent 接到 Slack:每天一次(GitHub Actions,北京时间约 09:07)采集 `/shownew` 最新约 120 条(4 页,覆盖约 40 小时),对没见过的帖子逐条调用 Cavia 上的 v3(`claude-haiku-5-5`),只把判为 `push` 的发到 Slack,`pass` / `unsure` 只记录不发。

- 提示词由 `bot/prompt.ts` 生成,评测(`build-cases.ts`)用的是同一份代码,`build-cases.ts --check` 保证逐字节一致。
- 去重状态在 `bot-state` 分支的 `seen.json`,不在 main 上。第一次运行只登记当前已有的帖子,不判断、不发送,避免一次刷屏。
- 第二阶段:v3 判成 push 的帖子(两条及以上)全部交给 v7 排序器(`bot/rank.ts`,3 次排序按平均名次合并),按名次从高到低发送,最多 10 条(`--max-pushes`),消息底部标"今日第 n 名"。push 不足 10 条就有多少发多少,不会凑数;当天没有 push 就什么都不发。超过 10 条的部分只在状态里标记为 suppressed,频道里不提示,也不显示总数。排序失败时退回到"最新优先"。判断失败不会记成 pass,最多重试 3 次;Slack 发送失败会在下次重发,不再调用模型。
- 每次排序都追加写入 `bot-state` 分支的 `rank-log.jsonl`(池、上限、合并后的顺序、每次排序的结果),用来和你以后的标注对照。`--no-rank` 可关闭第二阶段。注意:排序器只给顺序,不会把"不够好"的帖子剔掉,所以 push 不超过 10 条时排序只改变发送顺序。上线依据:v7 在两个真实日(day-1104、day-1109,后者标注时没有任何模型预测)的前 10 条里想看的帖子约 8.7 / 6.7 条,同日"最新 10 条"为 4 / 1 条,随机为 4.8 / 3.2 条;只有两天,第二天 pass 仍有 3.3 条。
- 需要一个仓库 secret:`SLACK_WEBHOOK_URL`(Incoming Webhook)。本地试跑:`bun bot/scout.ts --dry-run --no-seed --max-judgements 3`,只打印消息,不发送、不存状态。
- 测试:`bun test ./bot/core.test.ts`。

**已知限制**:v3 只在"发布满 12 小时、已不在 /show"的帖子上评测过;现在的候选范围是所有新帖,发布越早证据越少(没有评论),这个分布没有评测过。v3 对 pass 的识别只有约 64%,push 率偏高,上限是为此设的保护。没有 Slack 反馈按钮,所以目前不会自动积累新标签。
