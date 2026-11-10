// Stage-1 judge hillclimb section for the daily-push report. Reads only ../stage1-judge/summary-report.json
// (written by `bun .evals/stage1-judge/report.ts`); makes no model call. Every case/model string is escaped.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const P = join(import.meta.dir, "../stage1-judge/summary-report.json");
export const hasStage1 = existsSync(P);
const D: any = hasStage1 ? JSON.parse(readFileSync(P, "utf8")) : null;

const esc = (s: unknown) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const pct = (x: number | null | undefined) => (x == null || Number.isNaN(x) ? "n/a" : `${(x * 100).toFixed(0)}%`);
const ci = (c: [number, number] | null) => (c ? `[${pct(c[0])}, ${pct(c[1])}]` : "n/a");
const dl = (d: number | null, c: [number, number] | null) => (d == null || !c ? "–" : `${d >= 0 ? "+" : ""}${(d * 100).toFixed(1)} [${(c[0] * 100).toFixed(1)}, ${(c[1] * 100).toFixed(1)}]`);
const th = (h: string[]) => `<tr>${h.map((x) => `<th>${esc(x)}</th>`).join("")}</tr>`;
const tbl = (h: string[], rows: string[][]) => `<table><thead>${th(h)}</thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

// One-line Chinese description per round (hand-written; the English change.md files are linked below).
const ZH: Record<string, string> = {
  baseline: "对照：现行 v3 提示词，不改动（同环境重跑）",
  v1: "要求“真正的新意”：删掉“不要求新颖”的句子，改写标准 1 和 5（更好 / 更快 / 更私密不算新角度），加一条“一句话测试”的 Pass",
  v2: "只加两条窄的 Pass：产品尚未真正发布 / 空 demo；页面开头先报速度、体积、基准数字而不是用户能做什么",
  v3: "改 Push 与 Pass 的优先关系：Pass 条件是“闸门”，优先于任何 Push 标准；“品类拥挤、产品大、点子不新”本身不算 Pass 理由",
};
const status = (v: any) => {
  const a = v.splits.all;
  if (v.id === "baseline") return "对照";
  if (a.recall < D.recall_floor) return "召回低于 80% 下限";
  const c = a.d_precision_ci as [number, number] | null;
  return c && c[0] > 0 ? "精确率提升超出噪声" : "精确率提升在噪声内";
};

export function stage1Tldr(): string {
  if (!hasStage1) return "";
  const b = D.variants[0].splits.all, best = D.variants.slice(1).filter((v: any) => v.splits.all.recall >= D.recall_floor).sort((x: any, y: any) => y.splits.all.precision - x.splits.all.precision)[0];
  const n = D.variants.length - 1;
  return `<li><b>Stage 1 judge 的提示词优化（${n} 轮 hillclimb）没有找到比现行 v3 更好的版本。</b>合并 ${D.sizes.train + D.sizes.test} 个标注 case 上，对照精确率 ${pct(b.precision)}、召回 ${pct(b.recall)}；${n} 个变体里要么召回掉到下限以下（v1 降到 ${pct(D.variants[1].splits.all.recall)}），要么精确率变化在噪声内${best ? `（召回守住 80% 的最好一个是 ${esc(best.id)}：${pct(best.splits.all.precision)} / ${pct(best.splits.all.recall)}，配对精确率差 ${dl(best.splits.all.d_precision, best.splits.all.d_precision_ci)} 个百分点）` : ""}。建议保持 v3 不变，详见第 9 节。</li>`;
}

export function stage1Main(): string {
  if (!hasStage1) return "";
  const V: any[] = D.variants;
  const rows = V.map((v) => {
    const a = v.splits.all, t = v.splits.test, r = v.splits.train;
    return [esc(v.id === "baseline" ? "对照 (v3)" : v.id), esc(ZH[v.id] ?? v.change), `${pct(a.precision)} <span class="small">${ci(a.precision_ci)}</span>`, `${pct(a.recall)} <span class="small">${ci(a.recall_ci)}</span>`, esc(dl(a.d_precision, a.d_precision_ci)), esc(dl(a.d_recall, a.d_recall_ci)), `${pct(r.precision)} / ${pct(r.recall)}`, `${pct(t.precision)} / ${pct(t.recall)}`, esc(status(v))];
  });
  const lat = V.map((v) => `${esc(v.id)} ${v.latency_s.toFixed(1)} s，${Math.round(v.tokens_in)} / ${Math.round(v.tokens_out)} tokens`).join("；");
  return `<h2>9. Stage 1 judge 的提示词优化（hillclimb，${V.length - 1} 轮）</h2>
<p><b>目标：</b>在 push 召回 ≥ ${D.recall_floor * 100}% 的前提下提高精确率（precision，judge 说 push 的帖子里你也想要的比例）。唯一的杠杆是 system prompt，模型固定为 ${esc(D.model)}，request.json 与对照完全相同。train = train60（${D.sizes.train} 个 case），test = fresh-test（${D.sizes.test} 个 case，其中 ${D.sizes.test_push} 个 push）；分析员只读过 train 的 trace。每个变体 ${D.sizes.train + D.sizes.test} 个 case × ${D.reps} 次 = ${(D.sizes.train + D.sizes.test) * D.reps} 次真实 Cavia 任务，共 ${V.length * (D.sizes.train + D.sizes.test) * D.reps} 次，全部有效（无错误行进入变体结果）。召回下限按合并 ${D.sizes.train + D.sizes.test} 个 case 判断，因为对照在 test 上的召回本来就只有 ${pct(V[0].splits.test.recall)}（11 个 push case 太少）。</p>
${tbl(["轮次", "改动", "合并精确率 [95% CI]", "合并召回 [95% CI]", "Δ精确率 vs 对照（百分点）", "Δ召回 vs 对照（百分点）", "train 精确率 / 召回", "test 精确率 / 召回", "状态"], rows)}
<p class="small">区间是按 case 聚类的 bootstrap（同一 case 的几次重复不独立）；Δ 用同一批重采样的 case 配对计算。成本只记 token 和延迟，不报价格：${lat}（每个任务）。</p>
<div class="tldr"><ul>
<li><b>没有任何一轮把精确率稳定提上去。</b>v1 精确率升到 ${pct(V[1].splits.all.precision)}，但召回只剩 ${pct(V[1].splits.all.recall)}（只推 ${pct(V[1].splits.all.pushes)} 的帖子）；v2 基本不变；v3 召回守住了下限，但合并精确率只差 ${dl(V[3].splits.all.d_precision, V[3].splits.all.d_precision_ci)} 个百分点，区间包含 0。</li>
<li><b>train 和 test 方向不一致。</b>v3 在 train 上精确率 ${pct(V[3].splits.train.precision)}（对照 ${pct(V[0].splits.train.precision)}），在 test 上 ${pct(V[3].splits.test.precision)}（对照 ${pct(V[0].splits.test.precision)}）；v2 同样是 train 升、test 降，这是噪声的样子，不是泛化的改进。</li>
<li><b>不是重复采样的噪声，而是系统性误判。</b>对照里 ${pct(V[0].splits.train.unanimity)}（train）/ ${pct(V[0].splits.test.unanimity)}（test）的 case 三次重复给出同一决定；对照 train 里有 11 个 case 三次都判错、5 个时对时错、44 个三次都对。分析员两次都发现，被误推的 case 和被漏推的 case 在模型的理由里用的是同一套说法，还有几对几乎相同的 case 标签相反，所以靠改措辞分不开。</li>
<li><b>建议：</b>保持现行 v3，不合并任何变体。要继续提高 stage 1，更可能有用的是增加标注（尤其是“像 push 的 pass”）、复盘一直判错的 train case 是否标签一致，或者把精力放在 stage 2 排序器，而不是继续改 stage 1 的措辞。</li></ul></div>
<p class="small">只能作为方向性结果：test 只有 ${D.sizes.test} 个 case（${D.sizes.test_push} 个 push），配对差的半宽约 ±13 个百分点；服务端实际模型 Cavia 不暴露，行里记录的是请求的模型 id。完整文件：<a href="../stage1-judge/report.html">stage1-judge/report.html</a> · <a href="../stage1-judge/narrative.md">narrative.md</a> · <a href="../stage1-judge/metrics.md">metrics.md</a>；各轮改动见 <a href="../stage1-judge/v1/change.md">v1</a> / <a href="../stage1-judge/v2/change.md">v2</a> / <a href="../stage1-judge/v3/change.md">v3</a> 的 change.md。</p>`;
}

export function stage1Details(): string {
  if (!hasStage1) return "";
  const V: any[] = D.variants;
  const color: Record<string, string> = { push: "#d9f2d9", pass: "#fbe0e0", unsure: "#fff0c9", invalid: "#eee" };
  const chip = (d: string) => `<span style="background:${color[d] ?? "#eee"};padding:0 3px">${esc(d)}</span>`;
  const splitRows = (name: string) => V.map((v) => { const s = v.splits[name]; return [esc(v.id), `${s.rows}`, `${pct(s.precision)} ${ci(s.precision_ci)} n=${s.n_precision}`, `${pct(s.recall)} ${ci(s.recall_ci)} n=${s.n_recall}`, pct(s.specificity), pct(s.pushes), pct(s.unanimity), esc(dl(s.d_precision, s.d_precision_ci)), esc(dl(s.d_recall, s.d_recall_ci))]; });
  const H = ["variant", "valid rows", "precision [95% CI]", "recall [95% CI]", "specificity", "pushes (share of rows)", "decision unanimity over reps", "Δprecision vs control", "Δrecall vs control"];
  const caseRows = D.cases.map((c: any) => [esc(c.id), esc(c.split), esc(c.tag), esc(c.title), `<b>${esc(c.gold)}</b>`, ...V.map((v) => (c.decisions[v.id] ?? []).map(chip).join(" · "))]);
  return `<h2>Stage 1 judge hillclimb (details)</h2><p class="small">Numbers from ../stage1-judge/summary-report.json (no model calls). Model ${esc(D.model)}; ${D.reps} reps per case; recall floor ${D.recall_floor * 100}% judged on the pooled ${D.sizes.train + D.sizes.test} cases.</p>
${["train", "test", "all"].map((n) => `<h3>${esc(n)}</h3>${tbl(H, splitRows(n))}`).join("")}
<h3>Per-case decisions (one chip per rep; bold = human label)</h3>${tbl(["id", "split", "tag", "title", "gold", ...V.map((v) => v.id)], caseRows)}`;
}
