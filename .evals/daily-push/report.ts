#!/usr/bin/env bun
// Report builder for the daily-push flow. Reads only recorded files (variant dirs, cases/registry.jsonl) via stats.ts; no model calls.
// Writes report.html (self-contained, no script, CSP, every case/model string escaped), metrics.md, narrative.md, trajectory/scores.tsv.
//   bun .evals/daily-push/report.ts
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { allStats } from "./stats.ts";
import { OUT, SRC, cfg, jl } from "./adapt.ts";
import { stage1Details, stage1Main, stage1Tldr } from "./stage1.ts";

const esc = (s: unknown) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
type Cell = string | number | null | { h: string };
const raw = (h: string) => ({ h });
const f = (x: number | null | undefined, d = 1) => (x == null || Number.isNaN(x) ? "n/a" : x.toFixed(d));
const pct = (x: number | null | undefined) => (x == null ? "n/a" : `${(x * 100).toFixed(0)}%`);
const pv = (x: number | null | undefined) => (x == null ? "n/a" : x < 0.001 ? "<0.001" : x.toFixed(3));
const rng = (m: { mean: number | null; min?: number; max?: number } | undefined, d = 1) => (!m || m.mean == null ? "n/a" : `${f(m.mean, d)} [${m.min}\u2013${m.max}]`);

const S = allStats();
const reg = new Map<number, any>(jl(join(OUT, "cases/registry.jsonl")).map((r) => [r.story_id, r]));
const cards1109: any[] = existsSync(join(SRC, "day-1109/review-cards.json")) ? JSON.parse(readFileSync(join(SRC, "day-1109/review-cards.json"), "utf8")) : [];
for (const c of cards1109) if (!reg.has(Number(c.i))) reg.set(Number(c.i), { title: c.t });
const days = S.days.map((d) => d.id);
const vars = Object.keys(cfg.variants);
const label = (v: string) => `${v} \u00b7 ${cfg.variants[v].label}`;

function cellHtml(c: Cell) { return c && typeof c === "object" ? c.h : esc(c ?? ""); }
function table(head: string[], rows: Cell[][], cls = "") {
  return `<table class="${cls}"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${cellHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
const mdTable = (head: string[], rows: Cell[][]) => [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map((c) => (c && typeof c === "object" ? c.h.replace(/<[^>]+>/g, "") : String(c ?? "")).replace(/\|/g, "\\|")).join(" | ")} |`)].join("\n");

// ---------- headline rows ----------
function headRow(v: string, d: string): Cell[] {
  const x: any = S.per[v][d];
  const c = cfg.variants[v];
  if (!x) return [label(v), c.model, !c.sources[d] ? "not run on this day (never run)" : "NOT RUN (planned, no spend approved)", ...Array(9).fill("")];
  const g = x.guardrails as { id: string; pass: boolean }[] | null;
  return [
    label(v), c.model, `${x.valid}/${x.planned_reps ?? "?"}${x.error_rows ? ` (+${x.error_rows} err)` : ""}`,
    rng(x.wanted_at10), rng(x.must_at10), rng(x.pass_at10), rng(x.pushes, 1), pct(x.wanted_p10),
    x.p_vs_random.median == null ? "n/a" : `${pv(x.p_vs_random.median)} / ${pv(x.p_vs_random.worst)}`,
    x.overlap == null ? "n/a" : pct(x.overlap), x.position_bias_mean_abs == null ? "n/a" : f(x.position_bias_mean_abs, 2),
    g ? (x.overlap == null ? `G6 n/a (1 rep); other 5: ${g.filter((y) => y.id !== "G6").every((y) => y.pass) ? "all pass" : "fail " + g.filter((y) => y.id !== "G6" && !y.pass).map((y) => y.id).join(",")}` : `${g.filter((y) => y.pass).length}/6${g.every((y) => y.pass) ? " all pass" : " fail: " + g.filter((y) => !y.pass).map((y) => y.id).join(",")}`) : "n/a",
  ];
}
const HEAD = ["variant", "model", "valid reps / planned", "wanted@10 mean [min\u2013max]", "must@10", "pass@10", "pushes", "precision (pushes)", "P(random \u2265 obs) median / worst", "top-10 overlap", "position bias |\u03c1|", "guardrails G1\u2013G6"];
function headlineRows(d: string): Cell[][] {
  const F = S.facts[d];
  const rows: Cell[][] = [
    ["random top-10 (expectation)", "none", "n/a", `${f(F.random.wanted)} (SD ${f(F.random_sd_wanted_at10, 2)})`, f(F.random.must), f(F.random.pass), "10", pct(F.base_rate), "\u2013", "\u2013", "\u2013", "\u2013"],
  ];
  for (const v of vars) rows.push(headRow(v, d));
  return rows;
}

// ---------- graded examples (day-1104 ids are HN story ids) ----------
function example(v: string, d: string, rep: number): string {
  const row = jl(join(OUT, v, "results.jsonl")).find((r) => r.prompt_id === d && r.rep === rep);
  if (!row?.answer?.selected) return "";
  const tier = S.days.find((x) => x.id === d)!.tier;
  const lis = (row.answer.selected as string[]).map((id, i) => {
    const r = reg.get(Number(id));
    return `<tr><td>${i + 1}</td><td class="t-${esc(tier[id])}">${esc(tier[id])}</td><td>${esc(r?.title ?? `post ${id}`)}</td></tr>`;
  }).join("");
  const tr = existsSync(join(OUT, v, "traces", `${d}_rep${rep}.json`)) ? ` &middot; <a href="${esc(v)}/traces/${esc(d)}_rep${rep}.json">trace</a>` : "";
  return `<h4>${esc(label(v))} \u00b7 ${esc(d)} \u00b7 rep ${rep} (wanted ${row.grade.wanted_at10}, must ${row.grade.must_at10}, pass ${row.grade.pass_at10})${tr}</h4><table><thead><tr><th>#</th><th>gold tier</th><th>title</th></tr></thead><tbody>${lis}</tbody></table>`;
}

// ---------- per-rep rows ----------
const perRepRows: Cell[][] = [];
const tsv: string[] = ["variant\tprompt_id\trep\twanted_p10\twanted_at10\tmust_at10\tpass_at10\tpushes\tvalid\tlatency_s\tinput_tokens\toutput_tokens"];
for (const v of vars) {
  const rows = jl(join(OUT, v, "results.jsonl")), errs = jl(join(OUT, v, "errors.jsonl"));
  for (const r of rows) {
    const g = r.grade ?? {};
    const tr = existsSync(join(OUT, v, "traces", `${r.prompt_id}_rep${r.rep}.json`)) ? raw(`<a href="${esc(v)}/traces/${esc(r.prompt_id)}_rep${r.rep}.json">trace</a>`) : "no trace (deterministic cap)";
    perRepRows.push([v, r.prompt_id, r.rep, r.status, g.valid ? g.wanted_at10 : "invalid", g.valid ? g.must_at10 : "", g.valid ? g.pass_at10 : "", g.valid ? g.pushes : "", r.latency_s == null ? "n/a" : f(r.latency_s), r.usage ? `${r.usage.input_tokens} / ${r.usage.output_tokens}` : "n/a", tr]);
    tsv.push([v, r.prompt_id, r.rep, g.wanted_p10 ?? "", g.wanted_at10 ?? "", g.must_at10 ?? "", g.pass_at10 ?? "", g.pushes ?? "", g.valid ?? 0, r.latency_s ?? "", r.usage?.input_tokens ?? "", r.usage?.output_tokens ?? ""].join("\t"));
  }
  for (const e of errs) perRepRows.push([v, e.prompt_id, e.rep, `ERROR attempt ${e.attempt ?? "?"}`, esc(e.failure_class ?? ""), "", "", "", e.latency_s == null ? "n/a" : f(e.latency_s), e.usage ? `${e.usage.input_tokens ?? 0} / ${e.usage.output_tokens ?? 0}` : "n/a", e.error ? String(e.error).slice(0, 80) : ""]);
}

// ---------- cost and latency (tokens + latency only; no $) ----------
function costRows(): Cell[][] {
  const out: Cell[][] = [];
  for (const d of days) {
    const F: any = S.facts[d];
    const s1 = F.stage1;
    out.push([d, "stage 1 (v3 judge, one call per post)", s1.measured ? `${s1.calls} posts` : "unknown", s1.measured ? `${Math.round(s1.input_tokens)} / ${Math.round(s1.output_tokens)}` : "not recorded (live decisions)", s1.measured ? f(s1.latency_s) : "not recorded"]);
    for (const v of vars) {
      const x: any = S.per[v][d];
      if (!x || cfg.variants[v].kind === "cap") continue;
      out.push([d, `stage 2 \u00b7 ${label(v)}`, `${x.calls_per_rep} call${x.calls_per_rep > 1 ? "s" : ""}/rep`, x.usage.rows_with_usage ? `${Math.round(x.usage.input_tokens_per_rep ?? 0)} / ${Math.round(x.usage.output_tokens_per_rep ?? 0)}` : "n/a", f(x.latency_s_per_rep)]);
    }
  }
  return out;
}

// ---------- narrative / metrics.md ----------
function line(v: string, d: string) {
  const x: any = S.per[v][d];
  return x ? `${v} wanted@10 ${rng(x.wanted_at10)} over ${x.valid} valid rep(s)` : `${v} not run`;
}
function narrative(): string {
  const F1 = S.facts["day-1104"], F2 = S.facts["train60-sim"];
  const v1: any = S.per.v1["day-1104"], v1t: any = S.per.v1["train60-sim"], v2t: any = S.per.v2["train60-sim"], v3: any = S.per.v3["day-1104"], v4: any = S.per.v4["day-1104"], b: any = S.per.baseline["day-1104"];
  const g = v1.guardrails as { id: string; pass: boolean }[];
  const H = S.facts["day-1109"], h1: any = S.per.v1["day-1109"], hb: any = S.per.baseline["day-1109"], g5 = (S.per.v5["day-1109"] as any).guardrails, g6 = (S.per.v6["day-1109"] as any).guardrails;
  return `# Daily push quality: what the recorded runs say

Scope: the flow that decides which posts are pushed in one day (stage-1 v3 judge, optional stage-2 ranker, at most 10 pushes). Gold is existing data only; nothing new was labelled and no model call was made to build this report.

## Day-1104 (real day, pool ${F1.pool}, ${F1.wanted} wanted of which ${F1.must} must-read)
- A random top-10 holds ${f(F1.random.wanted)} wanted posts (SD ${f(F1.random_sd_wanted_at10, 2)}). The live cap (newest 10) holds ${b.wanted_at10.mean}: ${b.wanted_at10.mean <= F1.random.wanted ? "no better than random" : "above random"} on this day (n=1 selection, deterministic).
- ${line("v1", "day-1104")}; must@10 ${rng(v1.must_at10)}, pass@10 ${rng(v1.pass_at10)}. Guardrails G1\u2013G6: ${g.filter((x) => x.pass).length}/6 pass. P(random \u2265 observed) is ${pv(v1.p_vs_random.median)} median but ${pv(v1.p_vs_random.worst)} for the worst rep, so single reps overlap the noise; the top-10 overlap between reps is ${pct(v1.overlap)}, so the selection changes from rep to rep.
- Anchor variants fail: ${line("v3", "day-1104")} with ${f(v3.pushes.mean)} pushes per rep on average (rank bar \u2264 3); ${line("v4", "day-1104")} with ${f(v4.pushes.mean)} pushes. Their ranking AUC is ${f(v3.anchor.auc_wanted_vs_pass, 2)} and ${f(v4.anchor.auc_wanted_vs_pass, 2)} (0.5 = chance, lower rank = better), i.e. at or below chance at separating wanted from pass (the AUC is the probability that a wanted post gets a better rank than a pass post).

## Day-1109 (real held-out day, pool ${H.pool}, ${H.wanted} wanted of which ${H.must} must-read; labels blind to every model; never tuned on)
- A random top-10 holds ${f(H.random.wanted)} wanted posts (SD ${f(H.random_sd_wanted_at10, 2)}) and ${f(H.random.must)} must-read. The live cap (newest 10) holds ${hb.wanted_at10.mean} wanted and ${hb.pass_at10.mean} pass posts (n=1 selection).
- ${line("v1", "day-1109")}; must@10 ${rng(h1.must_at10)}, pass@10 ${rng(h1.pass_at10)}, precision ${pct(h1.wanted_p10)}. Guardrails G1\u2013G6: ${h1.guardrails.filter((x: any) => x.pass).length}/6 pass${h1.guardrails.every((x: any) => x.pass) ? "" : " (fail: " + h1.guardrails.filter((x: any) => !x.pass).map((x: any) => x.id).join(",") + ")"}. P(random \u2265 observed) is ${pv(h1.p_vs_random.median)} median and ${pv(h1.p_vs_random.worst)} for the worst rep; top-10 overlap ${pct(h1.overlap)}, position bias ${f(h1.position_bias_mean_abs, 2)}. G2 (must@10 \u2265 random + 1 = ${f(H.random.must + 1)}) passes only narrowly.
- The ranker gave the same kind of lift on a day it was never tuned on, with labels that were not shaped by any model prediction. Fewer posts are wanted on this day (${pct(H.base_rate)} of the pool) so the ceiling is lower; the lift over the live cap is large (${hb.wanted_at10.mean} \u2192 ${f(h1.wanted_at10.mean)}).
- Caution on comparing days: day-1104 labels were anchored on assistant predictions, day-1109 labels are blind, and all three models score lower here (opus ${f((S.per.v5["day-1109"] as any).wanted_at10.mean)} vs ${f((S.per.v5["day-1104"] as any).wanted_at10.mean)} on day-1104). The drop mixes a harder, lower-base-rate day with the removal of label anchoring; this data cannot separate the two. Also stage 1 is weak on this day: the v3 judge pushed ${H.pool} posts and ${pct(H.base_rate)} are wanted (day-1104: ${pct(S.facts["day-1104"].base_rate)}).

## Train60-sim (simulated: 60 posts from many days, pool ${F2.pool}; v5\u2013v8 were designed on it)
- Random expectation ${f(F2.random.wanted)} wanted (SD ${f(F2.random_sd_wanted_at10, 2)}); newest-10 mock ${S.per.baseline["train60-sim"] ? (S.per.baseline["train60-sim"] as any).wanted_at10.mean : "n/a"}.
- ${line("v1", "train60-sim")} (${v1t.error_rows} of ${v1t.planned_reps} planned reps errored); ${line("v2", "train60-sim")}. The richer cards of v2 do not beat v1 here.

## Model comparison (v5 = claude-opus-5-5, v6 = deepseek-4.1-flash, same v7 prompt and haiku pool; 6 reps planned on each of the 3 days; the valid count is shown per row)
${["v5", "v6"].map((v) => days.map((d) => { const x: any = S.per[v][d]; return x ? `- ${v} on ${d} (${x.valid} valid rep(s)): wanted@10 ${rng(x.wanted_at10)}, must@10 ${f(x.must_at10.mean)}, pass@10 ${f(x.pass_at10.mean)}; ${Math.round(x.usage.input_tokens_per_rep ?? 0)} in / ${Math.round(x.usage.output_tokens_per_rep ?? 0)} out tokens, ${f(x.latency_s_per_rep)} s (random expects ${f(S.facts[d].random.wanted)} wanted, SD ${f(S.facts[d].random_sd_wanted_at10, 2)}).` : `- ${v} on ${d}: not run`; }).join("\n")).join("\n")}
- Each cell has 6 planned reps. Opus lost one rep on day-1104 and one on train60-sim to a reply that did not parse (a missing JSON object; an empty reason string), deepseek none. On day-1109 G1\u2013G6: v5 ${g5.filter((x: any) => x.pass).length}/6 pass (fail: ${g5.filter((x: any) => !x.pass).map((x: any) => x.id).join(",") || "none"}), v6 ${g6.filter((x: any) => x.pass).length}/6 pass (fail: ${g6.filter((x: any) => !x.pass).map((x: any) => x.id).join(",") || "none"}); both miss G2 (must@10 below random + 1). No deepseek reply failed to parse (no <think> failure seen). Output tokens differ a lot (opus about 0.7K, deepseek 5\u20136.6K, haiku about 2.5\u20133.4K), so latency and tokens are not comparable by prompt alone.

## What this cannot tell you
- Recall: no label exists for posts the judge dropped, so good posts that never reach the pool are invisible.
- Only 3 days: one simulated and tuned on (train60-sim), one real and looked at (day-1104), one real held-out day (day-1109, 38 posts). Intervals here show ranker rep-to-rep noise only, not day-to-day variation.
- Labels: day-1104 tiers are anchored (a review of an assistant prediction); day-1109 tiers are blind human labels, but one labeller.
- Model comparison: all 3 days have 6 planned reps per model, but the reps of one model are almost the same ranking (top-10 overlap 61-93%), so they are not independent evidence of how the model does on another day. Differences of 1 wanted post between models are inside the rep noise. Cost is reported as tokens and latency only; no price is claimed.
`;
}

function metricsMd(): string {
  const parts: string[] = [`# Metrics

All metrics are computed over the top 10 of a day's pushes (K=10), per rep, from the recorded rows; every table says how many valid reps stand behind it. A metric that is undefined is shown as n/a, never 0.

| metric | definition | direction | caveat |
|---|---|---|---|
| wanted_p10 (headline) | wanted (tier push or must_read) posts among the pushed posts, divided by the number pushed; undefined with no pushes | higher | tiers are anchored labels; one real day |
| wanted@10 | count of wanted posts in the top 10 | higher | noise floor: SD of a random top-10 is shown per day |
| must@10 | count of must_read posts in the top 10 | higher | small counts (8 must on day-1104) |
| pass@10 | count of gold-pass posts in the top 10 (the push-noise a reader would see) | lower | |
| pushes | number of posts pushed (anchors can push fewer than 10) | context | |
| valid | rep produced a gradable ranking (1/0); counted as a float so it does not become the headline | higher | |
| P(random \u2265 obs) | hypergeometric tail: chance a random pick of the same size contains at least as many wanted posts | lower | reps of one day are not independent days |
| top-10 overlap | mean pairwise overlap of the selected sets across reps | higher | needs \u2265 2 reps |
| position bias | Spearman correlation between the slot a post was shown in and the rank it received | near 0 | |
| G1\u2013G6 | guardrails declared before the rankers ran on each real day (day-1104 on 2026-11-10; day-1109 in day-1109/PREREGISTERED.md before any label); apply to rankers on those two days only | all pass | G6 needs \u2265 2 reps; shown n/a for 1-rep rows |
| tokens, latency | tokens in/out and wall seconds per rep (anchors: sums over 54 calls) | lower | no $ figure: cost not measured |
`];
  for (const d of days) {
    const F = S.facts[d];
    parts.push(`## ${d} (pool ${F.pool}, wanted ${F.wanted}, must ${F.must}, pass ${F.pass}; random wanted@10 = ${f(F.random.wanted)}, SD ${f(F.random_sd_wanted_at10, 2)})\n`, mdTable(HEAD, headlineRows(d)), "");
  }
  parts.push("## Tokens and latency\n", mdTable(["day", "stage", "calls", "tokens in / out per rep", "latency s per rep"], costRows()), "");
  return parts.join("\n");
}

const CSS = `body{font:14px/1.45 system-ui,sans-serif;margin:24px auto;max-width:1280px;padding:0 16px;color:#1b1b1b}h1{margin-bottom:4px}h2{margin-top:32px;border-bottom:1px solid #ddd;padding-bottom:4px}h4{margin:16px 0 4px}table{border-collapse:collapse;margin:8px 0;font-size:13px}th,td{border:1px solid #d5d5d5;padding:3px 8px;text-align:left;vertical-align:top}th{background:#f3f3f3}.warn{background:#fff6e0;border:1px solid #e7c768;padding:8px 12px}.t-must_read{background:#d9f2d9}.t-push{background:#eef7d9}.t-pass{background:#fbe0e0}.small{color:#555;font-size:12px}code{background:#f3f3f3;padding:0 3px}`;

function detailsHtml(): string {
  const sec: string[] = [];
  sec.push(`<h1>Daily push quality — details</h1><div class="small"><a href="report.html">← 精简报告 report.html</a> · v3 judge \u2192 optional stage-2 ranker \u2192 at most ${10} pushes per day. Generated from recorded files; no model calls. Inputs: <a href="cases.md">cases.md</a> (sign-off pending) \u00b7 definitions: <a href="metrics.md">metrics.md</a> \u00b7 <a href="narrative.md">narrative.md</a></div>`);
  sec.push(`<div class="warn"><b>Read these before the numbers.</b><ul><li>Only 3 scored days: day-1104 is real but was looked at, train60-sim is simulated (posts from many days) and v5\u2013v8 were designed on it, day-1109 is a real held-out day with blind labels and a pre-declared check.</li><li>No recall: posts the judge dropped have no label, so a missed good post cannot be seen here.</li><li>Labels: day-1104 is anchored (reviews of an assistant prediction); day-1109 is blind but from one labeller.</li><li>Ranges and p-values reflect ranker rep-to-rep noise only, not day-to-day variation; every row shows n.</li><li>Cost is tokens and latency only; no $ figure (cost not measured).</li></ul></div>`);
  for (const d of days) {
    const F = S.facts[d];
    sec.push(`<h2>${esc(d)} <span class="small">(${esc(F.kind)}; pool ${F.pool}: ${F.wanted} wanted incl. ${F.must} must-read, ${F.pass} pass)</span></h2>`);
    sec.push(`<p class="small">Noise floor: a random top-10 holds ${f(F.random.wanted)} wanted posts with SD ${f(F.random_sd_wanted_at10, 2)}; treat count differences smaller than about 2 SD (${f(2 * F.random_sd_wanted_at10, 1)}) between single reps as noise.${d === "train60-sim" ? " The newest-10 row is only a mock here: these posts are not from one day." : ""}</p>`);
    sec.push(table(HEAD, headlineRows(d)));
  }
  sec.push(`<h2>Tokens and latency per rep</h2><p class="small">Stage-1 usage on day-1104 and day-1109 was not recorded (the live decisions carry no usage): unknown, not 0. Train60 stage-1 is the sum over the 60 posts, averaged over reps. Anchor rows are sums over 54 independent calls.</p>`, table(["day", "stage", "calls", "tokens in / out", "latency s"], costRows()));
  sec.push(`<h2>Graded examples (day-1104 top-10, gold tier on each post)</h2><p class="small">Open them and say whether you would have graded any differently. Titles come from the case registry.</p>`, example("baseline", "day-1104", 0), example("v1", "day-1104", 0), `<h2>Graded examples (day-1109 held-out, gold tier on each post)</h2>`, example("baseline", "day-1109", 0), example("v1", "day-1109", 0));
  sec.push(stage1Details());
  sec.push(`<h2>Variants</h2>` + vars.map((v) => {
    const p = join(OUT, v, "change.md");
    const text = existsSync(p) ? readFileSync(p, "utf8") : "";
    return `<h4>${esc(label(v))} \u00b7 ${esc(cfg.variants[v].model)}</h4><pre class="small" style="white-space:pre-wrap">${esc(text.slice(0, 1400))}</pre>${v === "baseline" ? "" : text ? `<div class="small"><a href="${esc(v)}/change.patch">change.patch</a> \u00b7 <a href="${esc(v)}/system-prompt.md">system-prompt.md</a></div>` : `<div class="small">PLANNED: no files yet</div>`}`;
  }).join(""));
  sec.push(`<h2>Per-rep rows</h2>`, table(["variant", "day", "rep", "status", "wanted@10", "must@10", "pass@10", "pushes", "latency s", "tokens in / out", "trace"], perRepRows));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><title>Daily push quality</title><style>${CSS}</style></head><body>${sec.join("\n")}</body></html>`;
}

// ======================= simplified main report (Chinese) =======================
const X = (v: string, d: string): any => S.per[v][d];
const FD = (d: string): any => S.facts[d];
const g6 = (x: any) => (x?.guardrails ? `${x.guardrails.filter((y: any) => y.pass).length}/6${x.guardrails.every((y: any) => y.pass) ? " \u5168\u8fc7" : "\uff08\u672a\u8fc7 " + x.guardrails.filter((y: any) => !y.pass).map((y: any) => y.id).join(",") + "\uff09"}` : "\u2013");

const SVG_CSS = `.bx{fill:#f6f8fb;stroke:#9aa7b8;stroke-width:1.5}.bx.dash{stroke-dasharray:6 4;fill:#fffdf3}.bx.gold{fill:#e8f6e8;stroke:#6aa86a}.bx.warn2{fill:#fdeeee;stroke:#c66}.bt{font:600 14px system-ui,sans-serif;fill:#1b1b1b}.bs{font:12.5px system-ui,sans-serif;fill:#444}.ar{stroke:#667;stroke-width:1.6;fill:none}.zone{fill:none;stroke-width:1.6;stroke-dasharray:7 5}.zl{font:600 13px system-ui,sans-serif}`;
function sbox(x: number, y: number, w: number, h: number, lines: string[], cls = "") {
  const y0 = y + (h - (lines.length - 1) * 17) / 2 + 5;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="bx ${cls}"/>` + lines.map((l, i) => `<text x="${x + w / 2}" y="${y0 + i * 17}" text-anchor="middle" class="${i === 0 ? "bt" : "bs"}">${esc(l)}</text>`).join("");
}
const sarrow = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="ar" marker-end="url(#ah)"/>`;
const sdefs = `<defs><marker id="ah" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#667"/></marker></defs>`;

function flowDiagram(): string {
  return `<svg viewBox="0 0 1160 330" width="100%" role="img" aria-label="\u6bcf\u65e5\u63a8\u9001\u6d41\u7a0b\u548c\u8bc4\u6d4b\u8303\u56f4">${sdefs}
<rect x="435" y="55" width="722" height="250" rx="12" class="zone" stroke="#4a9a4a"/><text x="447" y="76" class="zl" fill="#2f7a2f">\u672c\u8bc4\u6d4b\u8bc4\u4f30\u7684\u8303\u56f4\uff1a\u4ece pool \u5230\u6700\u7ec8\u63a8\u9001\u7684 10 \u6761</text>
<rect x="2" y="55" width="420" height="145" rx="12" class="zone" stroke="#c66"/><text x="14" y="76" class="zl" fill="#b33">\u8bc4\u6d4b\u76f2\u533a\uff1a\u88ab judge \u4e22\u6389\u7684\u597d\u5e16\u6ca1\u6709\u6807\u7b7e</text>
${sbox(14, 100, 150, 80, ["Show HN \u65b0\u5e16", "\u6bcf\u5929\u7ea6 120 \u6761"])}
${sbox(210, 100, 200, 80, ["Stage 1 \u00b7 v3 judge", "\u6bcf\u5e16 1 \u6b21\u8c03\u7528", "\u8f93\u51fa push / pass"])}
${sbox(455, 100, 160, 80, ["\u5f53\u5929 pool", "= \u88ab push \u7684\u5e16\u5b50", "38\u201354 \u6761"])}
${sbox(660, 100, 220, 80, ["Stage 2 \u00b7 v7 ranker\uff08\u53ef\u9009\uff09", "1 \u6b21\u8c03\u7528\uff0c\u7ed9\u6574\u4e2a pool \u6392\u5e8f", "\u53d6\u524d 10"], "dash")}
${sbox(925, 100, 225, 80, ["\u6700\u591a 10 \u6761\u63a8\u9001\u5230 Slack"])}
${sbox(660, 225, 220, 60, ["\u73b0\u884c\u4e0a\u7ebf\u7248\u672c\uff08cap\uff09", "\u4e0d\u6392\u5e8f\uff0c\u53d6\u6700\u65b0 10 \u6761"])}
${sarrow(164, 140, 208, 140)}${sarrow(410, 140, 453, 140)}${sarrow(615, 140, 658, 140)}${sarrow(880, 140, 923, 140)}
${sarrow(560, 180, 658, 250)}${sarrow(880, 255, 1000, 182)}
<text x="14" y="232" class="bs" fill="#b33">pool \u4e4b\u5916\u6ca1\u6709\u4eba\u5de5\u6807\u7b7e\uff0c\u6240\u4ee5 recall\uff08\u597d\u5e16\u6709\u6ca1\u6709\u88ab\u4e22\uff09\u65e0\u6cd5\u6d4b\u91cf\u3002</text>
<text x="14" y="252" class="bs" fill="#b33">\u8fd9\u91cc\u53ea\u80fd\u56de\u7b54\uff1a\u201cpool \u5df2\u7ecf\u7ed9\u5b9a\uff0c\u6700\u540e\u9009\u7684 10 \u6761\u597d\u4e0d\u597d\u201d\u3002</text>
</svg>`;
}

function evalDiagram(): string {
  return `<svg viewBox="0 0 1180 330" width="100%" role="img" aria-label="\u8bc4\u6d4b\u903b\u8f91">${sdefs}
${sbox(10, 30, 190, 90, ["\u56fa\u5b9a\u7684 pool", "\uff08\u5f53\u5929 judge \u63a8\u51fa\u7684\u5e16\u5b50\uff09", "\u6bcf\u6b21\u7528\u540c\u4e00\u4e2a pool"])}
${sbox(245, 30, 210, 90, ["Ranker \u00d7 6 \u6b21", "\u6bcf\u6b21\u968f\u673a\u6253\u4e71\u5c55\u793a\u987a\u5e8f", "\u8f93\u51fa\u5b8c\u6574\u6392\u5e8f"])}
${sbox(500, 30, 190, 90, ["\u53d6 top 10", "= \u5f53\u5929\u4f1a\u63a8\u9001\u7684 10 \u6761"])}
${sbox(735, 30, 200, 90, ["\u5bf9\u7167\u4eba\u5de5\u91d1\u6807\u6253\u5206", "wanted@10 \u00b7 must@10", "pass@10 \u00b7 \u7cbe\u5ea6"])}
${sbox(980, 30, 190, 90, ["\u5bf9\u6bd4 + \u5224\u5b9a", "\u9884\u5148\u58f0\u660e\u7684 6 \u6761\u62a4\u680f", "G1\u2013G6"])}
${sbox(735, 200, 200, 100, ["\u4eba\u5de5\u91d1\u6807 tier", "must_read / push / pass", "wanted = must_read + push"], "gold")}
${sbox(980, 200, 190, 100, ["\u57fa\u7ebf", "\u2460 \u968f\u673a top-10 \u7684\u671f\u671b", "\uff08\u5176 SD = \u566a\u58f0\u5e95\u7ebf\uff09", "\u2461 \u73b0\u884c newest-10"])}
${sbox(245, 200, 445, 100, ["\u540c\u65f6\u68c0\u67e5\uff08\u4e0d\u9700\u8981\u91d1\u6807\uff09", "\u7a33\u5b9a\u6027\uff1a6 \u6b21 top-10 \u7684\u5e73\u5747\u91cd\u53e0", "\u4f4d\u7f6e\u504f\u5dee\uff1a\u5c55\u793a\u4f4d\u7f6e\u4e0e\u540d\u6b21\u7684 |Spearman \u03c1|", "\u6709\u6548\u6027\uff1a6 \u6b21\u91cc\u6709\u51e0\u6b21\u7ed9\u51fa\u53ef\u89e3\u6790\u7684\u6392\u5e8f"], "dash")}
${sarrow(200, 75, 243, 75)}${sarrow(455, 75, 498, 75)}${sarrow(690, 75, 733, 75)}${sarrow(935, 75, 978, 75)}
${sarrow(835, 198, 835, 122)}${sarrow(1075, 198, 1075, 122)}${sarrow(350, 198, 350, 122)}
</svg>`;
}

function barChart(d: string): string {
  const F = FD(d), W = 330, rows: { label: string; mean: number; lo: number; hi: number; txt: string; col: string }[] = [];
  rows.push({ label: "\u968f\u673a top-10", mean: F.random.wanted, lo: F.random.wanted - F.random_sd_wanted_at10, hi: F.random.wanted + F.random_sd_wanted_at10, txt: `${f(F.random.wanted)} \u00b1${f(F.random_sd_wanted_at10, 1)} (SD)`, col: "#b8b8b8" });
  const b = X("baseline", d); if (b) rows.push({ label: d === "train60-sim" ? "newest-10\uff08\u6a21\u62df\uff09" : "\u73b0\u884c newest-10", mean: b.wanted_at10.mean, lo: b.wanted_at10.mean, hi: b.wanted_at10.mean, txt: `${f(b.wanted_at10.mean)}`, col: "#d98c8c" });
  for (const [v, nm, col] of [["v1", "v7 \u00b7 haiku", "#4a90d9"], ["v5", "v7 \u00b7 opus", "#6aa86a"], ["v6", "v7 \u00b7 deepseek", "#c9a227"]] as const) {
    const x = X(v, d); if (!x || !x.valid) continue;
    rows.push({ label: nm, mean: x.wanted_at10.mean, lo: x.wanted_at10.min, hi: x.wanted_at10.max, txt: `${f(x.wanted_at10.mean)}${x.valid > 1 ? ` [${x.wanted_at10.min}\u2013${x.wanted_at10.max}]` : ""} \u00b7 ${x.valid} \u6b21`, col });
  }
  const sx = W / 10, x0 = 150, H = rows.length * 30 + 34;
  const bars = rows.map((r, i) => `<text x="${x0 - 8}" y="${i * 30 + 22}" text-anchor="end" class="bs">${esc(r.label)}</text><rect x="${x0}" y="${i * 30 + 8}" width="${Math.max(r.mean * sx, 1)}" height="18" fill="${r.col}"/>${r.hi > r.lo ? `<line x1="${x0 + r.lo * sx}" x2="${x0 + r.hi * sx}" y1="${i * 30 + 17}" y2="${i * 30 + 17}" stroke="#222" stroke-width="2"/><line x1="${x0 + r.lo * sx}" x2="${x0 + r.lo * sx}" y1="${i * 30 + 12}" y2="${i * 30 + 22}" stroke="#222" stroke-width="2"/><line x1="${x0 + r.hi * sx}" x2="${x0 + r.hi * sx}" y1="${i * 30 + 12}" y2="${i * 30 + 22}" stroke="#222" stroke-width="2"/>` : ""}<text x="${x0 + Math.max(r.hi, r.mean) * sx + 8}" y="${i * 30 + 22}" class="bs">${esc(r.txt)}</text>`).join("");
  const ticks = [0, 5, 10].map((t) => `<text x="${x0 + t * sx}" y="${H - 6}" text-anchor="middle" class="bs">${t}</text><line x1="${x0 + t * sx}" x2="${x0 + t * sx}" y1="0" y2="${rows.length * 30 + 4}" stroke="#ddd"/>`).join("");
  return `<svg viewBox="0 0 640 ${H}" width="640" role="img" aria-label="wanted@10 ${esc(d)}">${ticks}${bars}</svg>`;
}

function coreRows(d: string): Cell[][] {
  const F = FD(d), rows: Cell[][] = [["\u968f\u673a top-10\uff08\u671f\u671b\uff09", `${f(F.random.wanted)} \u00b1${f(F.random_sd_wanted_at10, 1)}`, f(F.random.must), f(F.random.pass), "\u2013", "\u2013", "\u2013"]];
  const b = X("baseline", d); if (b) rows.push([d === "train60-sim" ? "newest-10\uff08\u6a21\u62df\uff09" : "\u73b0\u884c newest-10", f(b.wanted_at10.mean), f(b.must_at10.mean), f(b.pass_at10.mean), "1 \u6b21\uff08\u786e\u5b9a\u6027\uff09", "\u2013", "\u2013"]);
  for (const [v, nm] of [["v1", "v7 ranker \u00b7 haiku"], ["v5", "v7 ranker \u00b7 opus"], ["v6", "v7 ranker \u00b7 deepseek"]] as const) {
    const x = X(v, d); if (!x) continue;
    rows.push([nm, rng(x.wanted_at10), f(x.must_at10.mean), f(x.pass_at10.mean), `${x.valid}${x.planned_reps ? "/" + x.planned_reps : ""}${x.error_rows ? ` (+${x.error_rows} \u9519)` : ""}`, x.overlap == null ? "n/a\uff081 \u6b21\uff09" : pct(x.overlap), x.guardrails && x.valid > 1 ? g6(x) : "\u2013"]);
  }
  return rows;
}

function mainHtml(): string {
  const d4 = "day-1104", d9 = "day-1109", t6 = "train60-sim";
  const F4 = FD(d4), F9 = FD(d9), F6 = FD(t6);
  const b4 = X("baseline", d4), b9 = X("baseline", d9), a4 = X("v1", d4), a9 = X("v1", d9), o9 = X("v5", d9), s9 = X("v6", d9);
  const v2t = X("v2", t6), v1t = X("v1", t6), v3 = X("v3", d4), v4 = X("v4", d4);
  const sec: string[] = [];
  sec.push(`<h1>\u6bcf\u65e5\u63a8\u9001\u8d28\u91cf\u8bc4\u6d4b</h1><div class="small">Show HN Scout \u00b7 \u8be6\u7ec6\u8868\u683c\u548c\u9010\u6b21\u8bb0\u5f55\u89c1 <a href="report-details.html">report-details.html</a> \u00b7 \u6307\u6807\u5b9a\u4e49 <a href="metrics.md">metrics.md</a> \u00b7 \u6807\u6ce8\u96c6\u8bf4\u660e <a href="cases.md">cases.md</a></div>`);

  sec.push(`<h2>\u4e00\u53e5\u8bdd\u7ed3\u8bba</h2><div class="tldr"><ul>
<li><b>\u73b0\u884c\u7684\u201c\u53d6\u6700\u65b0 10 \u6761\u201d\u4e0d\u6bd4\u968f\u673a\u597d\u3002</b>\u4e24\u4e2a\u771f\u5b9e\u65e5\u91cc\u5b83\u5206\u522b\u6709 ${f(b4.wanted_at10.mean, 0)} \u6761\uff08\u968f\u673a ${f(F4.random.wanted)}\uff09\u548c ${f(b9.wanted_at10.mean, 0)} \u6761\uff08\u968f\u673a ${f(F9.random.wanted)}\uff09\u4f60\u60f3\u8981\u7684\u5e16\u5b50\u3002</li>
<li><b>v7 \u5217\u8868\u6392\u5e8f\uff08haiku\uff09\u660e\u663e\u66f4\u597d\u4e14\u7a33\u5b9a\u3002</b>wanted@10 \u5728 day-1104 \u662f ${f(a4.wanted_at10.mean)}\uff0c\u5728\u4ece\u672a\u8c03\u53c2\u3001\u76f2\u6807\u7684\u7559\u51fa\u65e5 day-1109 \u662f ${f(a9.wanted_at10.mean)}\uff0c\u7ea6\u4e3a\u968f\u673a\u7684 2 \u500d\uff1b\u4e24\u5929\u90fd\u901a\u8fc7\u9884\u5148\u58f0\u660e\u7684 G1\u2013G6\u3002</li>
<li><b>\u6362\u66f4\u5f3a\u6216\u66f4\u4fbf\u5b9c\u7684\u6a21\u578b\u6ca1\u6709\u660e\u663e\u6536\u76ca\u3002</b>\u4e09\u4e2a\u6a21\u578b\u7684 wanted@10 \u5728\u6bcf\u4e00\u5929\u90fd\u76f8\u5dee\u4e0d\u5230 1 \u4e2a\u5e16\u5b50\uff0c\u5c0f\u4e8e\u968f\u673a top-10 \u7684 SD\uff1aopus \u6bd4 haiku \u5728 day-1104 / train60 \u9ad8 ${f(X("v5", d4).wanted_at10.mean - a4.wanted_at10.mean)} / ${f(X("v5", t6).wanted_at10.mean - v1t.wanted_at10.mean)}\uff0c\u5728 day-1109 \u4f4e ${f(a9.wanted_at10.mean - o9.wanted_at10.mean)}\u3002\u65b9\u5411\u4e0d\u4e00\u81f4\uff0c\u6240\u4ee5\u4e0d\u80fd\u8bf4\u8c01\u66f4\u597d\u3002</li>
<li><b>\u74f6\u9888\u5728 stage 1 \u548c\u6807\u6ce8\u76f2\u533a\u3002</b>pool \u91cc\u53ea\u6709 ${pct(F4.base_rate)}\uff08day-1104\uff09\u548c ${pct(F9.base_rate)}\uff08day-1109\uff09\u662f\u4f60\u60f3\u8981\u7684\uff1branker \u53ea\u80fd\u5728 pool \u91cc\u6311\uff0c\u88ab judge \u4e22\u6389\u7684\u597d\u5e16\u6211\u4eec\u6d4b\u4e0d\u5230\u3002</li>${stage1Tldr()}</ul></div>`);

  sec.push(`<h2>1. \u8fd9\u4e2a\u8bc4\u6d4b\u5728\u505a\u4ec0\u4e48</h2>
<p>\u4ea7\u54c1\u6bcf\u5929\u6293\u53d6\u65b0\u7684 Show HN \u5e16\u5b50\uff0c\u7531 <b>stage 1 \u7684 v3 judge</b> \u9010\u5e16\u5224\u65ad push / pass\uff0c\u6700\u540e<b>\u6700\u591a\u63a8 10 \u6761</b>\u5230 Slack\u3002\u76ee\u524d\u7ebf\u4e0a\u662f\u628a\u88ab push \u7684\u5e16\u5b50\u201c\u53d6\u6700\u65b0 10 \u6761\u201d\uff1b\u6211\u4eec\u60f3\u77e5\u9053\uff1a\u5728 judge \u4e4b\u540e\u52a0\u4e00\u4e2a <b>stage 2 \u7684\u5217\u8868\u6392\u5e8f\u5668\uff08ranker\uff09</b>\uff0c\u8ba9\u5b83\u4ece pool \u91cc\u6311\u6700\u503c\u5f97\u770b\u7684 10 \u6761\uff0c\u662f\u4e0d\u662f\u771f\u7684\u6bd4\u201c\u6700\u65b0 10 \u6761\u201d\u548c\u201c\u968f\u673a 10 \u6761\u201d\u66f4\u597d\u3002</p>${flowDiagram()}
<p class="small">stage 1 judge \u81ea\u8eab\u7684\u8bc4\u6d4b\uff08push/pass \u91d1\u6807\u4e0a\u7684 precision / recall\uff09\u5728\u65e9\u5148\u7684\u62a5\u544a\u91cc\uff1a<a href="../../docs/judger-metrics-report.html">docs/judger-metrics-report.html</a>\u3002\u672c\u62a5\u544a\u8bc4\u7684\u662f judge \u4e4b\u540e\u7684\u201c\u6bcf\u65e5\u63a8\u9001\u201d\u8fd9\u4e00\u6bb5\u3002</p>`);

  sec.push(`<h2>2. \u600e\u4e48\u6d4b\uff1a\u8bc4\u6d4b\u903b\u8f91</h2>${evalDiagram()}
<ul>
<li><b>\u91d1\u6807</b>\uff1a\u4f60\u5bf9 pool \u91cc\u6bcf\u6761\u5e16\u5b50\u6807\u7684 tier\uff08<code>must_read</code> / <code>push</code> / <code>pass</code>\uff09\u3002<b>wanted</b> = must_read + push\u3002</li>
<li><b>\u6838\u5fc3\u6307\u6807</b>\uff1a\u9009\u51fa\u7684 top 10 \u91cc\u6709\u51e0\u6761 wanted\uff08<b>wanted@10</b>\uff0c\u8d8a\u9ad8\u8d8a\u597d\uff09\u3001\u51e0\u6761 must_read\uff08must@10\uff09\u3001\u51e0\u6761\u4f60\u4f1a\u5f53\u566a\u97f3\u7684 pass\uff08pass@10\uff0c\u8d8a\u4f4e\u8d8a\u597d\uff09\u3002</li>
<li><b>\u4e3a\u4ec0\u4e48\u8981\u57fa\u7ebf</b>\uff1a\u201c10 \u6761\u91cc\u6709 6 \u6761\u597d\u201d\u672c\u8eab\u6ca1\u6709\u610f\u4e49\uff0c\u8981\u548c<b>\u968f\u673a\u9009 10 \u6761\u7684\u671f\u671b</b>\u548c<b>\u73b0\u884c\u7684\u6700\u65b0 10 \u6761</b>\u6bd4\u3002\u968f\u673a\u9009\u7684\u7ed3\u679c\u672c\u8eab\u4e5f\u6709\u6ce2\u52a8\uff08\u62a5\u544a\u91cc\u7684 SD\uff09\uff0c\u5dee\u8ddd\u5c0f\u4e8e\u7ea6 2 \u4e2a SD \u5c31\u5f53\u566a\u58f0\u3002</li>
<li><b>\u4e3a\u4ec0\u4e48\u8dd1 6 \u6b21</b>\uff1aranker \u6bcf\u6b21\u7684\u8f93\u51fa\u4e0d\u5b8c\u5168\u4e00\u6837\uff0c6 \u6b21\u624d\u80fd\u770b\u6ce2\u52a8\u3001\u7a33\u5b9a\u6027\u548c\u4f4d\u7f6e\u504f\u5dee\u3002\u62a5\u544a\u91cc\u7684\u8303\u56f4 [min\u2013max] \u53ea\u53cd\u6620\u8fd9 6 \u6b21\u7684\u6ce2\u52a8\uff0c<b>\u4e0d\u5305\u542b\u5929\u4e0e\u5929\u4e4b\u95f4\u7684\u5dee\u5f02</b>\u3002</li>
<li><b>\u62a4\u680f G1\u2013G6</b>\uff08\u5728\u8dd1\u7ed3\u679c\u4e4b\u524d\u5199\u597d\uff0c\u4e0d\u518d\u4e8b\u540e\u8c03\uff09\uff1a</li></ul>
${table(["\u7f16\u53f7", "\u5185\u5bb9"], [["G1", "wanted@10 \u9ad8\u4e8e\u968f\u673a\uff0c\u4e5f\u9ad8\u4e8e\u73b0\u884c newest-10"], ["G2", "must@10 \u2265 \u968f\u673a\u671f\u671b + 1"], ["G3", "pass@10 \u4f4e\u4e8e\u968f\u673a\u671f\u671b"], ["G4", "\u8ba1\u5212\u7684\u6bcf\u4e00\u6b21 rep \u90fd\u7ed9\u51fa\u4e86\u53ef\u89e3\u6790\u7684\u6392\u5e8f"], ["G5", "\u4f4d\u7f6e\u504f\u5dee |\u03c1| < 0.2\uff08\u540d\u6b21\u4e0d\u8be5\u8ddf\u5c55\u793a\u987a\u5e8f\u76f8\u5173\uff09"], ["G6", "6 \u6b21\u7684 top-10 \u5e73\u5747\u91cd\u53e0 \u2265 60%"]])}`);

  sec.push(`<h2>3. \u7528\u4e86\u54ea\u4e9b\u6570\u636e</h2>
${table(["\u8bc4\u6d4b\u65e5", "\u6027\u8d28", "pool", "wanted\uff08\u5176\u4e2d must\uff09", "\u968f\u673a top-10 \u671f\u671b wanted", "\u6807\u6ce8", "\u72b6\u6001"], [
    [d4, "\u771f\u5b9e\u65e5 2026-11-04", F4.pool, `${F4.wanted}\uff08${F4.must}\uff09`, `${f(F4.random.wanted)} \u00b1${f(F4.random_sd_wanted_at10, 1)}`, "\u5728\u52a9\u624b\u9884\u6d4b\u4e0a\u590d\u6838\uff08\u9501\u5b9a\u5f0f\u6807\u6ce8\uff09", "\u770b\u8fc7 3 \u6b21\uff0c\u4e0d\u7b97\u7559\u51fa"],
    [t6, "\u6a21\u62df\u65e5\uff1a60 \u6761\u6765\u81ea\u591a\u5929", F6.pool, `${F6.wanted}\uff08${F6.must}\uff09`, `${f(F6.random.wanted)} \u00b1${f(F6.random_sd_wanted_at10, 1)}`, "\u4eba\u5de5 tier\uff08\u6765\u6e90\u89c1 cases.md\uff09", "\u8bbe\u8ba1 ranker \u65f6\u7528\u8fc7\uff0c\u4ec5\u4f9b\u53c2\u8003"],
    [d9, "\u771f\u5b9e\u65e5 2026-11-09\uff08\u7559\u51fa\uff09", F9.pool, `${F9.wanted}\uff08${F9.must}\uff09`, `${f(F9.random.wanted)} \u00b1${f(F9.random_sd_wanted_at10, 1)}`, "\u76f2\u6807\uff08\u6ca1\u770b\u5230\u4efb\u4f55\u6a21\u578b\u9884\u6d4b\uff0c\u987a\u5e8f\u6253\u4e71\uff09", "\u4ece\u672a\u8c03\u53c2\uff1b\u8fd0\u884c\u548c\u62a4\u680f\u90fd\u5728\u6807\u6ce8\u524d\u5199\u597d"],
  ])}
<p class="small">day-1109 \u7684 pool \u662f\u4eca\u5929 bot \u6ca1\u8dd1\u524d\u7528\u6628\u5929\u7ebf\u4e0a\u5b9e\u9645\u8bb0\u5f55\u7684 v3 \u51b3\u5b9a\u91cd\u5efa\u7684\uff0c\u4e0d\u91cd\u8dd1 stage 1\uff0c\u548c day-1104 \u53e3\u5f84\u4e00\u81f4\u3002\u58f0\u660e\u89c1 <code>.evals/show-hn-scout/day-1109/PREREGISTERED.md</code>\u3002</p>`);

  sec.push(`<h2>4. \u6838\u5fc3\u7ed3\u679c\uff1awanted@10</h2>
<p>\u6bcf\u6761\u7ebf = \u8fd9 6 \u6b21 rep \u7684 [min\u2013max]\uff0c\u7070\u6761\u7684\u9ed1\u7ebf = \u968f\u673a\u9009\u7684 \u00b11 SD\uff1b\u201c1 \u6b21\u201d\u8868\u793a\u53ea\u6709 1 \u6b21 rep\uff0c\u6ca1\u6709\u6ce2\u52a8\u4fe1\u606f\u3002</p>
<h4>${d9}\uff08\u771f\u5b9e\u7559\u51fa\u65e5\uff0cpool ${F9.pool}\uff0cwanted ${F9.wanted}\uff09</h4>${barChart(d9)}
<h4>${d4}\uff08\u771f\u5b9e\u65e5\uff0cpool ${F4.pool}\uff0cwanted ${F4.wanted}\uff09</h4>${barChart(d4)}
<h3>\u8be6\u7ec6\u6570\u5b57</h3>
${[d9, d4, t6].map((d) => `<h4>${d}${d === t6 ? "\uff08\u6a21\u62df\uff0c\u8bbe\u8ba1\u65f6\u7528\u8fc7\uff0c\u53ea\u4f9b\u53c2\u8003\uff09" : ""}</h4>${table(["\u65b9\u6848", "wanted@10", "must@10", "pass@10", "\u6709\u6548 rep", "top-10 \u91cd\u53e0", "\u62a4\u680f G1\u2013G6"], coreRows(d))}`).join("")}
<p class="small">\u62a4\u680f\u53ea\u5728\u4e24\u4e2a\u771f\u5b9e\u65e5\u3001\u4e14\u81f3\u5c11 2 \u6b21 rep \u7684\u884c\u4e0a\u663e\u793a\uff0c\u201c\u2013\u201d\u8868\u793a\u4e0d\u9002\u7528\uff0c\u4e0d\u662f 0\u3002\u6bcf\u4e2a\u6a21\u578b\u6bcf\u5929\u8ba1\u5212\u8dd1 6 \u6b21 rep\uff1b\u6709\u6548 rep \u6570\u89c1\u8868\uff08opus \u5728 day-1104 \u548c train60 \u5404\u6709 1 \u6b21\u56de\u590d\u89e3\u6790\u5931\u8d25\uff09\u3002</p>`);

  sec.push(`<h2>5. \u6ca1\u6709\u6210\u529f\u7684\u5c1d\u8bd5</h2>${table(["\u65b9\u6848", "\u60f3\u6cd5", "\u7ed3\u679c"], [
    ["v2 \u00b7 v8 ranker", "\u5361\u7247\u5185\u5bb9\u66f4\u4e30\u5bcc\uff082,500 \u5b57\u9875\u9762 + 800 \u5b57\u8ba8\u8bba\uff09", `\u5728 ${t6} \u4e0a wanted@10 ${rng(v2t.wanted_at10)}\uff0c\u6ca1\u6709\u8d85\u8fc7 v7\uff08${rng(v1t.wanted_at10)}\uff09\uff0c\u800c\u4e14\u8bf7\u6c42\u66f4\u5927\u3001\u66f4\u6162`],
    ["v3 \u00b7 v9 anchor", "\u628a\u6bcf\u6761\u548c\u4f60\u6392\u597d\u5e8f\u7684 10 \u6761\u53c2\u8003\u5e16\u5bf9\u6bd4\uff0c\u6392\u540d \u2264 3 \u624d push", `day-1104 \u4e0a\u6bcf\u6b21\u53ea\u63a8 ${f(v3.pushes.mean)} \u6761\uff0cwanted@10 ${f(v3.wanted_at10.mean)}\uff1b\u6392\u5e8f AUC ${f(v3.anchor.auc_wanted_vs_pass, 2)}\uff080.5 = \u968f\u673a\uff09`],
    ["v4 \u00b7 v10 anchor", "v9 \u4e4b\u4e0a\u518d\u52a0\u5165\u4f60\u5199\u7684\u7406\u7531", `wanted@10 ${f(v4.wanted_at10.mean)}\uff0cAUC ${f(v4.anchor.auc_wanted_vs_pass, 2)}\uff0c\u7ed3\u679c\u6ca1\u53d8\u597d`],
  ])}`);

  sec.push(`<h2>6. \u6210\u672c\uff1atoken \u548c\u5ef6\u8fdf\uff08\u6bcf\u6b21 rep\uff0c6 \u6b21\u7684\u5e73\u5747\uff09</h2>
${table(["\u65e5", "\u6a21\u578b", "\u8f93\u5165 token", "\u8f93\u51fa token", "\u5ef6\u8fdf"], [d9, d4, t6].flatMap((d) => [["haiku\uff08v1\uff09", X("v1", d)], ["opus\uff08v5\uff09", X("v5", d)], ["deepseek\uff08v6\uff09", X("v6", d)]].map(([n, x]: any) => [d, n, Math.round(x.usage.input_tokens_per_rep), Math.round(x.usage.output_tokens_per_rep), `${f(x.latency_s_per_rep)} s`])))}
<p class="small">\u53ea\u62a5 token \u548c\u5ef6\u8fdf\uff0c\u6ca1\u6709\u4ef7\u683c\uff08\u6ca1\u6709\u6279\u51c6\u7684\u5b9a\u4ef7\u89c4\u5219\uff09\u3002stage 1 \u7684\u7528\u91cf\u5728\u4e24\u4e2a\u771f\u5b9e\u65e5\u90fd\u6ca1\u8bb0\u5f55\uff08\u7ebf\u4e0a\u51b3\u5b9a\u4e0d\u5e26 usage\uff09\uff0c\u662f\u201c\u672a\u77e5\u201d\uff0c\u4e0d\u662f 0\u3002</p>`);

  sec.push(`<h2>7. Learnings</h2><ul>
<li><b>\u4e00\u5b9a\u8981\u6709\u968f\u673a\u57fa\u7ebf\u3002</b>\u6bd4\u5982 day-1109 \u4e0a\u201c10 \u6761\u91cc 6.7 \u6761\u597d\u201d\u770b\u8d77\u6765\u4e00\u822c\uff0c\u4f46\u968f\u673a\u53ea\u6709 ${f(F9.random.wanted)}\uff0c\u73b0\u884c\u53ea\u6709 ${f(b9.wanted_at10.mean, 0)}\u3002\u53cd\u8fc7\u6765\u201c\u6700\u65b0 10 \u6761\u201d\u770b\u4e0a\u53bb\u50cf\u4e00\u4e2a\u7b56\u7565\uff0c\u5b9e\u9645\u4e0a\u548c\u968f\u673a\u6ca1\u5dee\u522b\u3002</li>
<li><b>\u5217\u8868\u6392\u5e8f\u6bd4\u9010\u6761\u6bd4\u8f83\u66f4\u7a33\u3002</b>\u8ba9\u6a21\u578b\u4e00\u6b21\u770b\u5230\u6574\u4e2a pool \u518d\u6392\u5e8f\uff0c\u6bd4\u201c\u548c 10 \u6761\u53c2\u8003\u9010\u6761\u5bf9\u6bd4\u201d\u7684 anchor \u8def\u7ebf\u597d\u5f97\u591a\uff08\u540e\u8005\u51e0\u4e4e\u63a8\u4e0d\u51fa\u4e1c\u897f\uff09\u3002\u66f4\u4e30\u5bcc\u7684\u5361\u7247\u548c\u8ba9\u4f60\u5199\u7406\u7531\u90fd\u6ca1\u6709\u5e2e\u52a9\u3002</li>
<li><b>ranker \u5728\u4ece\u672a\u8c03\u8fc7\u53c2\u7684\u4e00\u5929\u4e5f\u6709\u6548\u3002</b>day-1109 \u76f2\u6807\uff0cG1\u2013G6 \u5168\u8fc7\uff0c\u4e14\u8fd9\u4e00\u5929 6 \u6b21\u7684 top-10 \u91cd\u53e0 ${pct(a9.overlap)}\uff08day-1104 \u662f ${pct(a4.overlap)}\uff09\uff0c\u9009\u62e9\u6bd4\u4e4b\u524d\u66f4\u7a33\u5b9a\u3002</li>
<li><b>\u6a21\u578b\u4e4b\u95f4\u5dee\u5f02\u5f88\u5c0f\u3002</b>\u4e09\u4e2a\u6a21\u578b\u5728 day-1109 \u7684 wanted@10 \u90fd\u5728 6\u20136.7\uff0c\u5728 day-1104 \u90fd\u5728 8.7\u20139.2\uff1bopus \u8f93\u51fa token \u6700\u5c11\u3001\u6700\u5feb\uff0cdeepseek \u6700\u6162\uff0c\u4f46\u8c01\u4e5f\u6ca1\u5728\u6548\u679c\u4e0a\u660e\u663e\u9886\u5148\u3002</li>
<li><b>\u201chaiku \u6bd4 opus \u597d\u201d\u53ea\u662f day-1109 \u4e00\u4e2a\u5e16\u5b50\u7684\u5dee\u522b\u3002</b>\u90a3\u5929 haiku \u7684 must@10 \u6bd4 opus \u9ad8 ${f(a9.must_at10.mean - o9.must_at10.mean)}\uff0c\u51e0\u4e4e\u90fd\u6765\u81ea\u4e24\u6761 must_read\uff08Recto \u548c Codenames \u6d4b\u8bc4\uff09\u88ab haiku \u9009\u4e2d\u7684\u6b21\u6570\u66f4\u591a\uff1b\u5728\u4e24\u4e2a\u6709\u951a\u5b9a\u6807\u6ce8\u7684\u5929\u91cc opus \u53cd\u800c\u7565\u9ad8\u3002\u540c\u4e00\u4e2a\u6a21\u578b\u7684 6 \u6b21\u6392\u5e8f\u51e0\u4e4e\u4e00\u6837\uff08\u91cd\u53e0 61\u201393%\uff09\uff0c\u6240\u4ee5 6 \u6b21 rep \u4e0d\u7b49\u4e8e 6 \u4efd\u72ec\u7acb\u8bc1\u636e\u3002</li>
<li><b>\u5206\u6570\u4e0d\u80fd\u8de8\u5929\u76f4\u63a5\u6bd4\u3002</b>opus \u5728 day-1104 \u662f ${f(X("v5", d4).wanted_at10.mean)}\uff0c\u5728 day-1109 \u662f ${f(o9.wanted_at10.mean)}\u3002\u8fd9\u91cc\u6df7\u4e86\u4e24\u4ef6\u4e8b\uff1a\u8fd9\u5929\u66f4\u96be\uff08wanted \u5360\u6bd4\u66f4\u4f4e\uff09\uff0c\u4ee5\u53ca day-1104 \u7684\u6807\u6ce8\u53c2\u8003\u8fc7\u52a9\u624b\u9884\u6d4b\u3002\u8fd9\u4efd\u6570\u636e\u5206\u4e0d\u5f00\u3002</li>
<li><b>stage 1 \u9650\u5236\u4e86\u5929\u82b1\u677f\u3002</b>pool \u91cc\u4ecd\u6709 ${pct(1 - F4.base_rate)}\uff08day-1104\uff09\u548c ${pct(1 - F9.base_rate)}\uff08day-1109\uff09\u7684\u5e16\u5b50\u4e0d\u662f\u4f60\u60f3\u8981\u7684\uff0cranker \u518d\u597d\u4e5f\u53ea\u80fd\u5728 pool \u91cc\u6311\u3002</li></ul>`);

  sec.push(`<h2>8. Take-away</h2><ol>
<li><b>\u503c\u5f97\u7528 v7 ranker\uff08haiku\uff09\u53d6\u4ee3\u201c\u6700\u65b0 10 \u6761\u201d\u7684\u622a\u65ad\u3002</b>\u4e24\u4e2a\u771f\u5b9e\u65e5\u90fd\u660e\u663e\u9ad8\u4e8e\u968f\u673a\u548c\u73b0\u884c\uff0c\u5e76\u901a\u8fc7\u9884\u5148\u58f0\u660e\u7684\u62a4\u680f\uff1b\u73b0\u884c\u622a\u65ad\u5728\u8fd9\u4e24\u5929\u91cc\u5e76\u6ca1\u6709\u4ec0\u4e48\u7b5b\u9009\u4f5c\u7528\u3002\uff08\u8bc1\u636e\u4ec5\u6765\u81ea 2 \u4e2a\u771f\u5b9e\u65e5\uff0c\u6240\u4ee5\u5efa\u8bae\u5148\u7ee7\u7eed\u7528 shadow \u8bb0\u5f55\uff0c\u518d\u79ef\u7d2f\u51e0\u5929\u76f2\u6807\u540e\u5207\u6362\u3002\uff09</li>
<li><b>\u6682\u65f6\u6ca1\u6709\u7406\u7531\u6362\u6a21\u578b\u3002</b>opus / deepseek \u5728\u6548\u679c\u4e0a\u6ca1\u6709\u7a33\u5b9a\u4f18\u52bf\uff0copus \u8fd8\u5404\u6709 1 \u6b21\u56de\u590d\u89e3\u6790\u5931\u8d25\uff08haiku \u5728 train60 \u4e5f\u6709 1 \u6b21\uff09\uff0cday-1109 \u7684 must@10 \u6ca1\u8fc7 G2\u3002\u5982\u679c\u8981\u6bd4\u8f83\u7aef\u5230\u7aef\u7684\u6210\u672c\uff0c\u9700\u8981\u5148\u786e\u5b9a\u4ef7\u683c\u89c4\u5219\u3002</li>
<li><b>\u4e0d\u7528\u518d\u6295\u5165 anchor \u548c\u66f4\u4e30\u5bcc\u5361\u7247\u8fd9\u4e24\u6761\u8def\u3002</b></li>
<li><b>\u4e0b\u4e00\u6b65\uff08\u90fd\u9700\u8981\u4f60\u786e\u8ba4\u518d\u6267\u884c\uff09</b>\uff1a\u2460 \u6bcf\u5929\u591a\u79ef\u7d2f\u4e00\u4e2a\u76f2\u6807\u7684\u771f\u5b9e\u65e5\uff08\u76ee\u524d\u53ea\u6709 3 \u5929\uff09\uff1b\u2461 \u6d4b recall\uff1a\u7ed9 judge \u4e22\u6389\u7684\u4e00\u6279\u5e16\u5b50\u4e5f\u6807\u7b7e\uff1b\u2462 \u6a21\u578b\u5404\u81ea\u8dd1 stage 1 \u7684\u7aef\u5230\u7aef\u5bf9\u6bd4\u3002</li></ol>`);

  sec.push(stage1Main());
  sec.push(`<h2>10. \u8fd9\u4efd\u62a5\u544a\u4e0d\u80fd\u8bf4\u660e\u4ec0\u4e48</h2><ul>
<li>recall\uff1apool \u4e4b\u5916\u7684\u5e16\u5b50\u6ca1\u6709\u6807\u7b7e\uff0c\u6f0f\u6389\u7684\u597d\u5e16\u770b\u4e0d\u5230\u3002</li>
<li>\u53ea\u6709 3 \u5929\uff0c\u53ea\u6709 1 \u4e2a\u6807\u6ce8\u8005\uff1b\u533a\u95f4\u53ea\u53cd\u6620 rep \u566a\u58f0\uff0c\u4e0d\u5305\u542b\u5929\u4e0e\u5929\u4e4b\u95f4\u7684\u5dee\u5f02\u3002</li>
<li>\u4e0d\u540c\u6a21\u578b\u7528\u7684\u662f\u540c\u4e00\u4e2a haiku \u751f\u6210\u7684 pool\uff0c\u6240\u4ee5\u6a21\u578b\u5bf9\u6bd4\u53ea\u662f stage 2\u3002</li>
<li>\u6210\u672c\u53ea\u62a5 token \u548c\u5ef6\u8fdf\uff0c\u4e0d\u62a5\u4ef7\u683c\u3002</li></ul>`);
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><title>\u6bcf\u65e5\u63a8\u9001\u8d28\u91cf\u8bc4\u6d4b</title><style>${CSS}${SVG_CSS}.tldr{background:#eef5ff;border:1px solid #a9c4ec;padding:6px 14px;border-radius:6px}h3{margin:18px 0 0}ul,ol{padding-left:22px}svg{display:block;margin:8px 0}</style></head><body>${sec.join("\n")}</body></html>`;
}

mkdirSync(join(OUT, "trajectory"), { recursive: true });
writeFileSync(join(OUT, "trajectory/scores.tsv"), tsv.join("\n") + "\n");
writeFileSync(join(OUT, "metrics.md"), metricsMd());
writeFileSync(join(OUT, "narrative.md"), narrative());
writeFileSync(join(OUT, "report-details.html"), detailsHtml());
writeFileSync(join(OUT, "report.html"), mainHtml());
console.log("wrote report.html report-details.html metrics.md narrative.md trajectory/scores.tsv");
