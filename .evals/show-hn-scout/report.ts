#!/usr/bin/env bun
// Lite report builder: reads <variant>/results.jsonl (+ errors.jsonl, summary.json) and writes report.html and
// trajectory/scores.tsv. Run only after the runner has exited:  bun .evals/show-hn-scout/report.ts
// Every string from a case or a model reply is HTML-escaped; the page has no script and a CSP that forbids it.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { aggregate, DIR, METRICS, type Scored } from "./lib.ts";

// `--set heldout` reports DIR/heldout/<variant>/ results instead of the dev set.
const HELDOUT = process.argv.includes("--set") && process.argv[process.argv.indexOf("--set") + 1] === "heldout";
const OUT = HELDOUT ? join(DIR, "heldout") : DIR;
const jsonl = (p: string): any[] => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const state = JSON.parse(readFileSync(join(DIR, "_state.json"), "utf8"));
const metricDefs: { id: string; label: string; better?: string }[] = state.metrics;
const headline = (metricDefs.find((m: any) => m.kind === "binary") ?? metricDefs[0]).id;
// Variant dirs are `baseline`, `v<N>`, or `<label>_baseline` / `<label>_v<N>` for a second model run (`run.ts --out`).
const VARIANT_DIR = /^(?:([a-z][a-z-]*)_)?(baseline|v\d+)$/;
const rank = (n: string) => { const m = VARIANT_DIR.exec(n)!; return [m[1] ?? "", m[2] === "baseline" ? 0 : +m[2].slice(1)] as const; };
const variants = readdirSync(OUT, { withFileTypes: true }).filter((d) => d.isDirectory() && VARIANT_DIR.test(d.name)).map((d) => d.name).sort((a, b) => { const x = rank(a), y = rank(b); return x[0].localeCompare(y[0]) || x[1] - y[1]; });
const pct = (v: number | null | undefined) => (v == null ? "–" : (100 * v).toFixed(0) + "%");
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function metricCells(rows: Scored[]) {
  const a = aggregate(rows, metricDefs.map((m) => m.id));
  return metricDefs.map((m) => {
    const x = a[m.id];
    return `<td title="n=${x.n}">${pct(x.value)}${x.lo != null ? `<small> [${pct(x.lo)}–${pct(x.hi)}]</small>` : ""}<small> n=${x.n}</small></td>`;
  }).join("");
}

let body = "";
const scores = new Map<string, Record<string, number | null>>();
for (const v of variants) {
  const rows = jsonl(join(OUT, v, "results.jsonl"));
  const errors = jsonl(join(OUT, v, "errors.jsonl"));
  const summary = existsSync(join(OUT, v, "summary.json")) ? JSON.parse(readFileSync(join(OUT, v, "summary.json"), "utf8")) : {};
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const tok = (k: string) => rows.map((r) => r.usage?.[k]).filter((x): x is number => typeof x === "number");
  const groups = [...new Set(rows.map((r) => r.tags?.[0]))].filter(Boolean);
  const head = `<tr><th>group</th><th>rows</th>${metricDefs.map((m) => `<th>${esc(m.label)}</th>`).join("")}</tr>`;
  const groupRows = ["all", ...groups].map((g) => {
    const sel = g === "all" ? rows : rows.filter((r) => r.tags?.[0] === g);
    return `<tr><td>${esc(g)}</td><td>${sel.length}</td>${metricCells(sel)}</tr>`;
  }).join("");
  body += `<h2>${esc(v)}</h2>
<p>model <code>${esc(summary.model)}</code> · judge <code>${esc(summary.judge_model ?? "none")}</code> · ${esc(summary.description ?? "")}</p>
<p>${rows.length} rows (${count("ok")} ok, ${count("truncated")} truncated, ${count("refused")} refused) · ${errors.length} error records${errors.length ? ": " + esc([...new Set(errors.map((e) => e.failure_class))].join(", ")) : ""} ·
 latency median ${median(rows.map((r) => r.latency_s))?.toFixed(1) ?? "–"}s · tokens in/out total ${sum(tok("input_tokens"))}/${sum(tok("output_tokens"))} · tool calls ${sum(rows.map((r) => r.tool_calls ?? 0))} · cost not measured</p>
<table>${head}${groupRows}</table>
<p><small>Intervals are 95% case-clustered bootstrap. Only the <code>random</code> group approximates real traffic. ${HELDOUT ? "Held-out set: labeled blind after the v1 rubric was written. Prompts were not written from it, but it was used to choose between rounds of the haiku climb, so treat the haiku_v1 / haiku_v3 numbers as selection-biased." : "The 30 cases calibrated the rubric, so this is a dev set, not a held-out score."}</small></p>
<h3>Cases</h3><table><tr><th>case</th><th>tags</th><th>human</th><th>rep</th><th>agent</th><th>reason</th><th>grounded</th><th>specific</th><th>consistent</th><th>status</th><th>trace</th></tr>
${rows.sort((a, b) => a.prompt_id.localeCompare(b.prompt_id) || a.rep - b.rep).map((r) => {
    const cls = r.grade.agree === 1 ? "ok" : r.status === "ok" ? "bad" : "";
    const j = (k: string) => (r.grade[k] == null ? "–" : r.grade[k] ? "yes" : "no");
    return `<tr class="${cls}"><td>${esc(r.prompt_id)}</td><td>${esc(r.tags?.join(", "))}</td><td>${esc(r.expected)}</td><td>${r.rep}</td><td>${esc(r.answer?.decision ?? "(invalid)")}</td><td>${esc(r.answer?.reason ?? r.meta?.reply_error)}${r.explanation?.grounded ? `<br><small>judge: ${esc(r.explanation.grounded)}</small>` : ""}</td><td>${j("grounded")}</td><td>${j("specific")}</td><td>${j("consistent")}</td><td>${esc(r.status)}</td><td><a href="${esc(`${v}/traces/${r.prompt_id}_rep${r.rep}.json`)}">${esc(r.task_id)}</a></td></tr>`;
  }).join("\n")}</table>`;
  const byCase = new Map<string, number[]>();
  for (const r of rows) if (r.status === "ok" && r.grade[headline] != null) byCase.set(r.prompt_id, [...(byCase.get(r.prompt_id) ?? []), r.grade[headline]]);
  for (const [id, xs] of byCase) scores.set(id, { ...(scores.get(id) ?? {}), [v]: sum(xs) / xs.length });
}

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Show HN Scout eval</title><style>body{font:14px system-ui;margin:2rem;max-width:1400px}table{border-collapse:collapse;margin:.5rem 0}td,th{border:1px solid #ccc;padding:3px 7px;vertical-align:top;text-align:left}tr.ok{background:#eefbe9}tr.bad{background:#fdecec}small{color:#666}</style></head><body>
<h1>Show HN Scout eval · select_project</h1>
<p>${variants.length} variant(s) · headline metric <code>${esc(headline)}</code> (human decision match; unsure counts as a miss). Metric definitions: <a href="metrics.md">metrics.md</a>.</p>
${body || "<p>No results yet.</p>"}</body></html>`;
writeFileSync(join(OUT, "report.html"), html);
mkdirSync(join(OUT, "trajectory"), { recursive: true });
writeFileSync(join(OUT, "trajectory/scores.tsv"), ["prompt_id\t" + variants.join("\t"), ...[...scores].sort().map(([id, s]) => id + "\t" + variants.map((v) => (s[v] == null ? "" : s[v]!.toFixed(3))).join("\t"))].join("\n") + "\n");
console.log(`report.html written: ${variants.length} variant(s), ${scores.size} cases`);
