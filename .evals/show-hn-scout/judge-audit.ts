#!/usr/bin/env bun
// Paid, tiny: feed the real reason judge known positives and known negatives (eval-audit.md). Needs JUDGE_* env.
//   JUDGE_PROVIDER=anthropic JUDGE_MODEL=<id> bun .evals/show-hn-scout/judge-audit.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { DIR, loadCases } from "./lib.ts";
import { judgeFromEnv } from "./judge.ts";

const { judge, model } = judgeFromEnv();
const ev = loadCases().find((c) => c.id === "01")!.prompt; // commit-quiz: a pre-commit hook that quizzes you on your diff
const T = true, F = false;
// `target` = the criterion this probe must fail (or, for the positive control, all must pass). The other criteria are
// informational: after the first real run, two over-strict secondary expectations (consistency of an off-topic reason,
// specificity of a generic reason) were relaxed this way. The first run's raw verdicts are in judge-audit.json.
const probes: { name: string; answer: { decision: string; reason: string }; expect: { grounded: boolean; specific: boolean; consistent: boolean } }[] = [
  { name: "grounded and specific (positive control)", answer: { decision: "pass", reason: "页面说明它在提交时让 AI CLI 生成 2 句真、2 句假的 diff 描述并要求答对,机制清楚,但只是已有 AI CLI 之上的一层封装,没有证据显示独特洞察。" }, expect: { grounded: T, specific: T, consistent: T } },
  { name: "empty reason", answer: { decision: "push", reason: "" }, expect: { grounded: F, specific: F, consistent: F } },
  { name: "I don't know", answer: { decision: "unsure", reason: "I don't know." }, expect: { grounded: F, specific: F, consistent: F } },
  { name: "answer about a different project", answer: { decision: "push", reason: "它是一个用 Rust 写的数据库引擎,用新的 B 树结构把查询吞吐翻倍。" }, expect: { grounded: F, specific: F, consistent: T } },
  { name: "fabricated claim", answer: { decision: "push", reason: "独立基准测试显示 commit-quiz 能拦下 90% 未审查的 AI 代码缺陷,是同类工具里的第一个。" }, expect: { grounded: F, specific: T, consistent: T } },
  { name: "reason contradicts decision", answer: { decision: "push", reason: "只是已有 AI CLI 的薄封装,没有任何新意,不值得打扰读者。" }, expect: { grounded: T, specific: T, consistent: F } },
];
const out = [];
for (const p of probes) {
  const r = await judge(ev, p.answer);
  const got = r.verdict;
  const targets = p.name.startsWith("grounded and specific") ? (["grounded", "specific", "consistent"] as const) : p.name.startsWith("reason contradicts") ? (["consistent"] as const) : p.name.startsWith("answer about") || p.name.startsWith("fabricated") ? (["grounded"] as const) : (["grounded", "specific", "consistent"] as const);
  const match = got ? targets.every((k) => got[k] === p.expect[k]) : false;
  out.push({ name: p.name, expect: p.expect, got, match, failure_class: r.failure_class, judge_model: r.judge_model, judge_usage: r.judge_usage });
  console.log(`${match ? "OK  " : "FAIL"} ${p.name}: ${got ? JSON.stringify({ g: got.grounded, s: got.specific, c: got.consistent }) : r.failure_class + " " + r.error}`);
}
writeFileSync(join(DIR, "judge-audit.json"), JSON.stringify({ judge_model: model, probes: out }, null, 2));
process.exit(0);
