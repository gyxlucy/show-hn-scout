# claude-api eval 接入

使用用户指定的 [文章](https://claude.dev/blog/automating-eval-design-and-hillclimbing/) 及其链接的官方 [SKILL.md](https://github.com/anthropics/skills/blob/main/skills/claude-api/SKILL.md)。本轮阅读了 [build-eval](https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/evals/build-eval.md) 和 [eval-audit](https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/evals/eval-audit.md)，尚未安装、执行 Claude Code 子命令或调用付费模型 API。

build-eval.md 检索版本 SHA：`ba875b712ba63135c60aaba4710bf84681ddf34b`。

## 已有输入

- `data/calibration/cases.json`：30 个真实案例、来源、材料摘要、采样理由和助手初评。
- `data/packets/<run>/<HN id>.json`：项目页面提取文本、HN 原文及作者回复、来源抓取状态与哈希。同一轮的材料不覆盖，重新 collect 后可获取新版本。
- `data/browser/<run>/<HN id>.txt`：4 个动态页面的浏览器阅读快照。
- `data/raw/<run>/`：原始 HTML / JSON 与采集清单。
- `data/review/feedback.jsonl`：用户实际反馈，尚未标注时文件不存在。
- `review/batch-*.md`：隐藏票数的审阅材料，每张卡附助手建议判断与理由（供快速审阅，不是标签，也不进入模型输入）。
- `review/assistant-baseline.md`：助手的定性初评，不是用户 gold，不是模型 API 基线分数。

## 后续执行顺序

1. 用户审阅并标注首批，修订 rubric-v0；完成各批后确认输入具有代表性。
2. 把助手初评和抽样元数据从模型输入中剥离。固定证据快照；禁止模型通过本地文件或工具读取 human labels。
3. 实现真正的 `select_project(evidence, preferences)` 入口及结构化输出。由同一入口供未来监控与 eval 调用；不在 runner 里重写一套判断逻辑。
4. 推荐/不推荐判断可先与人类标签作确定性比较；解释是否有证据支撑可另用人工审阅或经过校准的 judge。用户验证 5–10 个判例后确定 grader。
5. 在 Claude Code 中使用 `/claude-api build-eval`，交付这些已有输入与反馈，复用官方 runner/report 流程。先确认实际可用模型和调用方式，再做经同意的试跑；记录 response model、usage、stop_reason、完整轨迹、错误 sidecar。
6. 输入、评分方式与实测调用预算落实后才启动 `/claude-api hillclimb`。冻结 judge 与 rubric，只允许单轮变更一个筛选因素。保留开发/验证集，以及后续新帖最终测试集；最终测试不用于逐轮选版本。

## 当前明确未完成

没有用户标签，不能计算 precision/recall；没有模型 API 调用，不报告模型质量、延迟或费用。没有 Slack 凭据、频道与发布规则，不设置持续发送。当前命令支持手动增量采集，尚未启用定时任务。

官方 skill 的必要检查点："There are two sign-offs you always need - the inputs and the grading method." 本轮先把实际材料交给用户点评，不把预设的评价冒充用户确认。
