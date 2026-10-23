# Show HN Scout

发现 Show HN 中被忽略的、有具体想法的工作。第一阶段：真实材料采集与个人品味校准。

## 先阅读

- [第一批：10 个项目](review/batch-01.md)
- [第二批](review/batch-02.md) / [第三批](review/batch-03.md)
- [判断标准 v0](docs/rubric-v0.md)
- [助手初评（建议先盲评）](review/assistant-baseline.md)
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

还未运行自动模型筛选、定时监控或 Slack 发布。下一步由用户反馈建立初版评测，再根据质量决定接入发布。
