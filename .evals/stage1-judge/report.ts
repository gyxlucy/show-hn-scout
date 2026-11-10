#!/usr/bin/env bun
// Report builder for the stage-1 judge hillclimb. Reads only recorded files (variant dirs + _state.json); makes no model call.
// Writes report.html (self-contained, no script, CSP, all strings escaped), metrics.md, trajectory/scores.tsv and the status table
// block at the top of narrative.md (between the STATUS markers; the prose below the block is authored by hand each round).
//   bun .evals/stage1-judge/report.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HERE = import.meta.dir;
const state = JSON.parse(readFileSync(join(HERE, "_state.json"), "utf8"));
const jl = (p: string): any[] => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const esc = (s: unknown) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const f = (x: number | null | undefined, d = 3) => (x == null || Number.isNaN(x) ? "n/a" : x.toFixed(d));
const pct = (x: number | null | undefined) => (x == null || Number.isNaN(x) ? "n/a" : `${(x * 100).toFixed(0)}%`);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

const variants = readdirSync(HERE).filter((d) => /^(baseline|v\d+)$/.test(d) && existsSync(join(HERE, d, "results.jsonl"))).sort((a, b) => (a === "baseline" ? -1 : b === "baseline" ? 1 : +a.slice(1) - +b.slice(1)));
const TRAIN = new Set<string>(state.train_ids), TEST = new Set<string>(state.test_ids);
const cases = new Map<string, any>(jl(join(HERE, "cases.jsonl")).map((c) => [c.id, c]));
const gold = new Map<string, string>(jl(join(HERE, "gold.jsonl")).map((g) => [g.id, g.expected.decision]));
const titleOf = (id: string) => String(cases.get(id)?.prompt?.match(/^Title: (.*)$/m)?.[1] ?? `case ${id}`);

type Row = any;
const data: Record<string, { rows: Row[]; errs: Row[]; summary: any }> = {};
for (const v of variants) data[v] = { rows: jl(join(HERE, v, "results.jsonl")), errs: jl(join(HERE, v, "errors.jsonl")), summary: existsSync(join(HERE, v, "summary.json")) ? JSON.parse(readFileSync(join(HERE, v, "summary.json"), "utf8")) : {} };

// ratio metrics: mean over the non-null rows (see lib.ts gradeAnswer), status ok only
const ok = (rows: Row[]) => rows.filter((r) => r.status === "ok");
const metric = (rows: Row[], m: string) => mean(ok(rows).map((r) => r.grade[m]).filter((x) => x != null));
const nOf = (rows: Row[], m: string) => ok(rows).filter((r) => r.grade[m] != null).length;
const inSet = (rows: Row[], set: Set<string> | null) => (set ? rows.filter((r) => set.has(r.prompt_id)) : rows);

function rng(seed: number) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const byCase = (rows: Row[]) => { const m = new Map<string, Row[]>(); for (const r of rows) m.set(r.prompt_id, [...(m.get(r.prompt_id) ?? []), r]); return m; };

/** Case-clustered bootstrap; the same resampled cases are used for every variant so deltas are paired. */
function bootstrap(set: Set<string>, ms: string[], B = 2000) {
  const ids = [...set], rand = rng(20261111);
  const per = Object.fromEntries(variants.map((v) => [v, byCase(inSet(data[v].rows, set))]));
  const out: Record<string, Record<string, number[]>> = Object.fromEntries(variants.map((v) => [v, Object.fromEntries(ms.map((m) => [m, [] as number[]]))]));
  const delta: Record<string, Record<string, number[]>> = Object.fromEntries(variants.map((v) => [v, Object.fromEntries(ms.map((m) => [m, [] as number[]]))]));
  for (let b = 0; b < B; b++) {
    const draw = Array.from({ length: ids.length }, () => ids[Math.floor(rand() * ids.length)]);
    const val: Record<string, Record<string, number>> = {};
    for (const v of variants) { const rows = draw.flatMap((id) => per[v].get(id) ?? []); val[v] = Object.fromEntries(ms.map((m) => [m, metric(rows, m)])); }
    for (const v of variants) for (const m of ms) {
      if (!Number.isNaN(val[v][m])) out[v][m].push(val[v][m]);
      if (v !== "baseline" && variants.includes("baseline") && !Number.isNaN(val[v][m]) && !Number.isNaN(val.baseline[m])) delta[v][m].push(val[v][m] - val.baseline[m]);
    }
  }
  const ci = (xs: number[]) => { if (xs.length < 50) return null; const s = [...xs].sort((a, b) => a - b); return [s[Math.floor(0.025 * s.length)], s[Math.ceil(0.975 * s.length) - 1]] as [number, number]; };
  return { ci: (v: string, m: string) => ci(out[v][m]), dci: (v: string, m: string) => ci(delta[v][m]) };
}
const MS = ["precision", "recall", "specificity", "agree", "unsure", "valid"];
const splits: [string, Set<string>][] = [["train", TRAIN], ["test", TEST], ["all", new Set([...TRAIN, ...TEST])]];
const boot = Object.fromEntries(splits.map(([n, s]) => [n, bootstrap(s, MS)]));

function stats(v: string, set: Set<string>) {
  const rows = inSet(data[v].rows, set), o = ok(rows);
  const perRep = [...new Set(o.map((r) => r.rep))].sort().map((k) => metric(o.filter((r) => r.rep === k), "precision"));
  const perRepRecall = [...new Set(o.map((r) => r.rep))].sort().map((k) => metric(o.filter((r) => r.rep === k), "recall"));
  // unanimity: share of cases whose reps all gave the same decision (rep-to-rep stability)
  const unan = [...byCase(o).values()].filter((rs) => rs.length > 1).map((rs) => (new Set(rs.map((r) => r.answer?.decision ?? "invalid")).size === 1 ? 1 : 0));
  return {
    rows: rows.length, ok: o.length, expected: set.size * (state.reps ?? 3), errors: inSet(data[v].errs, set).length,
    precision: metric(o, "precision"), nPrec: nOf(o, "precision"), recall: metric(o, "recall"), nRec: nOf(o, "recall"), specificity: metric(o, "specificity"), agree: metric(o, "agree"), unsure: metric(o, "unsure"), valid: metric(o, "valid"),
    pushes: mean(o.map((r) => (r.answer?.decision === "push" ? 1 : 0))), perRepPrec: perRep, perRepRec: perRepRecall, unanimity: mean(unan),
    latency: mean(rows.map((r) => r.latency_s).filter((x) => typeof x === "number")), tin: mean(rows.map((r) => r.usage?.input_tokens).filter((x) => typeof x === "number")), tout: mean(rows.map((r) => r.usage?.output_tokens).filter((x) => typeof x === "number")),
    models: [...new Set(rows.map((r) => r.model))].join(","),
  };
}
const rg = (xs: number[]) => (xs.length ? `${pct(Math.min(...xs))}\u2013${pct(Math.max(...xs))}` : "n/a");
const ciS = (c: [number, number] | null) => (c ? `[${pct(c[0])}, ${pct(c[1])}]` : "n/a");
const dS = (c: [number, number] | null, d: number) => (c ? `${d >= 0 ? "+" : ""}${(d * 100).toFixed(1)} [${(c[0] * 100).toFixed(1)}, ${(c[1] * 100).toFixed(1)}]` : "n/a");
const sig = (c: [number, number] | null) => (c ? (c[0] > 0 ? "clears 0 (+)" : c[1] < 0 ? "clears 0 (\u2212)" : "includes 0") : "n/a");

// ---------- tables ----------
type Cell = string | number;
const th = (h: string[]) => `<tr>${h.map((x) => `<th>${esc(x)}</th>`).join("")}</tr>`;
const tbl = (h: string[], rs: Cell[][]) => `<table><thead>${th(h)}</thead><tbody>${rs.map((r) => `<tr>${r.map((c) => `<td>${typeof c === "string" && c.startsWith("\u0000") ? c.slice(1) : esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const mdt = (h: string[], rs: Cell[][]) => [`| ${h.join(" | ")} |`, `|${h.map(() => "---").join("|")}|`, ...rs.map((r) => `| ${r.map((c) => String(typeof c === "string" ? c.replace(/^\u0000/, "").replace(/<[^>]+>/g, "") : c).replace(/\|/g, "\\|")).join(" | ")} |`)].join("\n");
const raw = (h: string) => "\u0000" + h;

const HEAD = ["variant", "valid rows / planned (+err)", "precision [95% CI]", "per-rep precision", "recall [95% CI]", "per-rep recall", "specificity", "agree", "unsure", "pushes (share of rows)", "decision unanimity over reps", "\u0394precision vs control [95% CI]", "\u0394recall vs control [95% CI]"];
function splitRows(name: string, set: Set<string>): Cell[][] {
  const B = boot[name];
  return variants.map((v) => {
    const s = stats(v, set), b = variants.includes("baseline") ? stats("baseline", set) : null;
    const dp = v !== "baseline" && b ? dS(B.dci(v, "precision"), s.precision - b.precision) : "\u2013", dr = v !== "baseline" && b ? dS(B.dci(v, "recall"), s.recall - b.recall) : "\u2013";
    return [v === "baseline" ? "baseline (v3 control)" : v, `${s.ok}/${s.expected}${s.errors ? ` (+${s.errors} err)` : ""}`, `${pct(s.precision)} ${ciS(B.ci(v, "precision"))} n=${s.nPrec}`, rg(s.perRepPrec), `${pct(s.recall)} ${ciS(B.ci(v, "recall"))} n=${s.nRec}`, rg(s.perRepRec), pct(s.specificity), pct(s.agree), pct(s.unsure), pct(s.pushes), pct(s.unanimity), dp, dr];
  });
}

// ---------- verdict logic (goal: precision up with recall >= 0.80 on test; directional) ----------
const RECALL_FLOOR = 0.8;
function verdictRows() {
  return variants.map((v) => {
    const tr = stats(v, TRAIN), te = stats(v, TEST);
    const dte = v !== "baseline" ? boot.test.dci(v, "precision") : null;
    // Floor declared after the control run (test recall of the control is already 67% on only 11 push cases): judged on the pooled 90 cases.
    const al = stats(v, new Set([...TRAIN, ...TEST]));
    const holds = al.recall >= RECALL_FLOOR && al.valid >= 0.98;
    return { v, tr, te, holds, dte, status: v === "baseline" ? "control" : holds ? (dte && dte[0] > 0 ? "precision gain clears 0 on test" : "precision gain inside noise") : (al.valid < 0.98 ? "validity below 98%" : "pooled recall below the 80% floor") };
  });
}

function statusTable(): string {
  const rs = verdictRows();
  const head = ["round", "change (one line)", "test precision", "test recall", "train precision", "train recall", "valid", "s/turn", "tokens in / out per task", "status"];
  const rows: Cell[][] = rs.map((x, i) => {
    const ch = x.v === "baseline" ? "v3 control (unchanged production prompt)" : (existsSync(join(HERE, x.v, "change.md")) ? readFileSync(join(HERE, x.v, "change.md"), "utf8").split("\n")[0].replace(/^#\s*/, "") : "");
    return [i, ch, pct(x.te.precision), pct(x.te.recall), pct(x.tr.precision), pct(x.tr.recall), pct(stats(x.v, new Set([...TRAIN, ...TEST])).valid), f(stats(x.v, new Set([...TRAIN, ...TEST])).latency, 1), `${Math.round(stats(x.v, new Set([...TRAIN, ...TEST])).tin)} / ${Math.round(stats(x.v, new Set([...TRAIN, ...TEST])).tout)}`, x.status];
  });
  return mdt(head, rows);
}

function metricsMd(): string {
  const parts = [`# Metrics (stage-1 judge)

Goal: raise **precision** while **push recall stays \u2265 ${RECALL_FLOOR * 100}%** (and valid replies \u2265 98%). The floor is judged on the pooled 90 cases (114 push rows): the control already has only 67% recall on the 30 test cases, which hold 11 push cases, so a test-only floor would be decided by a handful of posts. Test recall is still reported every round. Every ratio is the pooled mean over the rows where its denominator exists (lib.ts \`gradeAnswer\`); status \`ok\` rows only. Intervals are case-clustered bootstrap (reps of one case are not independent); deltas versus the control use the same resampled cases. **All results are directional**: the test set is 30 cases (11 push, 19 pass) at 3 reps.

| metric | definition | direction |
|---|---|---|
| precision (headline) | among rows where the agent pushed: share where the human label is push | higher |
| recall | among rows labelled push: share the agent pushed | higher, floor ${RECALL_FLOOR} |
| specificity | among rows labelled pass: share the agent did not push | higher |
| agree | decision equals the human label (unsure counts as a miss) | higher |
| unsure | share of rows answered unsure | lower |
| valid | reply met the strict JSON output contract | higher |
| pushes | share of rows with decision push (context, not a goal) | context |
| decision unanimity | share of cases whose 3 reps all gave the same decision (rep-to-rep stability) | higher |
| tokens, latency | mean per task; no $ figure (cost not measured) | lower |
`];
  for (const [name, set] of splits) parts.push(`## ${name} (${set.size} cases)\n`, mdt(HEAD, splitRows(name, set)), "");
  parts.push("## Status table\n", statusTable(), "");
  return parts.join("\n");
}

// ---------- scores.tsv: per-case mean agreement, one column per round (train rows are what the analyzer may see; test rows are marked) ----------
function scoresTsv(): string {
  const ids = [...TRAIN, ...TEST];
  const lines = [["case", "split", "gold", ...variants.map((v) => `${v}_agree`), ...variants.map((v) => `${v}_push_share`)].join("\t")];
  for (const id of ids) {
    const cell = (v: string, fn: (r: Row) => number) => { const rs = ok(data[v].rows.filter((r) => r.prompt_id === id)); return rs.length ? f(mean(rs.map(fn)), 2) : ""; };
    lines.push([id, TRAIN.has(id) ? "train" : "test", gold.get(id) ?? "", ...variants.map((v) => cell(v, (r) => r.grade.agree)), ...variants.map((v) => cell(v, (r) => (r.answer?.decision === "push" ? 1 : 0)))].join("\t"));
  }
  return lines.join("\n") + "\n";
}

const CSS = `body{font:14px/1.45 system-ui,sans-serif;margin:24px auto;max-width:1320px;padding:0 16px;color:#1b1b1b}h1{margin-bottom:4px}h2{margin-top:32px;border-bottom:1px solid #ddd;padding-bottom:4px}table{border-collapse:collapse;margin:8px 0;font-size:12.5px}th,td{border:1px solid #d5d5d5;padding:3px 7px;text-align:left;vertical-align:top}th{background:#f3f3f3}.warn{background:#fff6e0;border:1px solid #e7c768;padding:8px 12px}.small{color:#555;font-size:12px}pre{white-space:pre-wrap;background:#f7f7f7;padding:8px;font-size:12px}.push{background:#d9f2d9}.pass{background:#fbe0e0}.unsure{background:#fff0c9}`;

function caseRows(): Cell[][] {
  const ids = [...TRAIN, ...TEST];
  return ids.map((id) => {
    const cells: Cell[] = [id, TRAIN.has(id) ? "train" : "test", String(cases.get(id)?.tags?.[0] ?? ""), titleOf(id), raw(`<span class="${esc(gold.get(id))}">${esc(gold.get(id))}</span>`)];
    for (const v of variants) {
      const rs = data[v].rows.filter((r) => r.prompt_id === id).sort((a, b) => a.rep - b.rep);
      cells.push(raw(rs.map((r) => { const d = r.answer?.decision ?? "invalid"; const t = existsSync(join(HERE, v, "traces", `${id}_rep${r.rep}.json`)) ? `<a href="${esc(v)}/traces/${esc(id)}_rep${r.rep}.json">${esc(d)}</a>` : esc(d); return `<span class="${esc(d)}">${t}</span>`; }).join(" \u00b7 ") || "n/a"));
    }
    return cells;
  });
}

function html(): string {
  const sec: string[] = [];
  const rs = verdictRows();
  sec.push(`<h1>Stage-1 v3 judge: precision hillclimb</h1><div class="small">claude-haiku-5-5 \u00b7 system prompt is the only lever \u00b7 train = train60 (60 cases), test = fresh-test (30 cases) \u00b7 generated from recorded files, no model calls \u00b7 <a href="metrics.md">metrics.md</a> \u00b7 <a href="narrative.md">narrative.md</a> \u00b7 <a href="trajectory/scores.tsv">scores.tsv</a></div>`);
  sec.push(`<div class="warn"><b>Read first.</b><ul><li>Goal: precision up with push recall \u2265 ${pct(RECALL_FLOOR)}. All numbers are <b>directional</b>: the test set is 30 cases (11 push / 19 pass); a paired test delta has a half-width of roughly \u00b113 points.</li><li>Winner's curse: the best of ${variants.length} variants picked on the same 30 test cases is optimistic. The control (baseline) was re-run in the same environment; older v3 runs are not used for comparison.</li><li>Train and test do not have the same base rate or difficulty (train v3 precision differs from test); the split is the user's fixed choice, not a stratified draw.</li><li>The served model is not exposed by the Cavia API; the requested id is recorded on every row. Reason judge off. Cost: tokens and latency only.</li></ul></div>`);
  for (const [name, set] of splits) sec.push(`<h2>${esc(name)} (${set.size} cases \u00d7 ${state.reps ?? 3} reps)</h2>`, tbl(HEAD, splitRows(name, set)));
  sec.push(`<h2>Per round</h2>`, tbl(["variant", "test precision", "test recall", "pooled recall (floor judged here)", "recall floor held", "test \u0394precision [95% CI]", "train precision", "train recall", "status"], rs.map((x) => [x.v, pct(x.te.precision), pct(x.te.recall), pct(stats(x.v, new Set([...TRAIN, ...TEST])).recall), x.holds ? "yes" : "NO", x.v === "baseline" || !x.dte ? "\u2013" : `${dS(x.dte, x.te.precision - rs[0].te.precision)} (${sig(x.dte)})`, pct(x.tr.precision), pct(x.tr.recall), x.status])));
  sec.push(`<h2>Tokens and latency per task</h2>`, tbl(["variant", "tasks", "latency s (mean)", "input tokens", "output tokens", "error attempts", "model on rows"], variants.map((v) => { const s = stats(v, new Set([...TRAIN, ...TEST])); return [v, s.rows, f(s.latency, 1), Math.round(s.tin), Math.round(s.tout), s.errors, s.models]; })));
  sec.push(`<h2>Variants</h2>` + variants.map((v) => { const p = join(HERE, v, "change.md"); const t = existsSync(p) ? readFileSync(p, "utf8") : ""; const sus = data[v].summary?.suspicious; return `<h4>${esc(v)}</h4><pre>${esc(t.slice(0, 2500))}</pre>${sus ? `<div class="warn">${esc(sus)}</div>` : ""}${v === "baseline" ? "" : `<div class="small"><a href="${esc(v)}/change.patch">change.patch</a> \u00b7 <a href="${esc(v)}/system-prompt.md">system-prompt.md</a></div>`}`; }).join(""));
  sec.push(`<h2>Per-case decisions (one chip per rep; gold = human label)</h2>`, tbl(["id", "split", "tag", "title", "gold", ...variants], caseRows()));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><title>Stage-1 judge hillclimb</title><style>${CSS}</style></head><body>${sec.join("\n")}</body></html>`;
}

mkdirSync(join(HERE, "trajectory"), { recursive: true });
writeFileSync(join(HERE, "trajectory/scores.tsv"), scoresTsv());
writeFileSync(join(HERE, "metrics.md"), metricsMd());
writeFileSync(join(HERE, "report.html"), html());

// summary.json: machine-readable numbers for other reports (the daily-push report embeds a stage-1 section from this file)
function summaryJson() {
  const all = new Set([...TRAIN, ...TEST]);
  return {
    generated_from: "stage1-judge variant dirs; no model calls", recall_floor: RECALL_FLOOR, reps: state.reps ?? 3, model: "claude-haiku-5-5",
    sizes: { train: TRAIN.size, test: TEST.size, test_push: [...TEST].filter((id) => gold.get(id) === "push").length, train_push: [...TRAIN].filter((id) => gold.get(id) === "push").length },
    variants: variants.map((v) => {
      const out: any = { id: v, change: v === "baseline" ? "v3 control (unchanged production prompt)" : (existsSync(join(HERE, v, "change.md")) ? readFileSync(join(HERE, v, "change.md"), "utf8").split("\n")[0].replace(/^#\s*/, "") : ""), splits: {} };
      for (const [name, set] of splits) {
        const s = stats(v, set), B = boot[name];
        out.splits[name] = { rows: s.ok, precision: s.precision, n_precision: s.nPrec, precision_ci: B.ci(v, "precision"), recall: s.recall, n_recall: s.nRec, recall_ci: B.ci(v, "recall"), specificity: s.specificity, pushes: s.pushes, valid: s.valid, unanimity: s.unanimity,
          d_precision: v === "baseline" ? null : s.precision - stats("baseline", set).precision, d_precision_ci: v === "baseline" ? null : B.dci(v, "precision"), d_recall: v === "baseline" ? null : s.recall - stats("baseline", set).recall, d_recall_ci: v === "baseline" ? null : B.dci(v, "recall") };
      }
      const a = stats(v, all); out.latency_s = a.latency; out.tokens_in = a.tin; out.tokens_out = a.tout;
      return out;
    }),
    cases: [...TRAIN, ...TEST].map((id) => ({ id, split: TRAIN.has(id) ? "train" : "test", tag: String(cases.get(id)?.tags?.[0] ?? ""), title: titleOf(id), gold: gold.get(id), decisions: Object.fromEntries(variants.map((v) => [v, data[v].rows.filter((r) => r.prompt_id === id).sort((a, b) => a.rep - b.rep).map((r) => r.answer?.decision ?? "invalid")])) })),
  };
}
writeFileSync(join(HERE, "summary-report.json"), JSON.stringify(summaryJson(), null, 1));
// narrative.md: regenerate the status block, keep the hand-written prose below the END marker
const np = join(HERE, "narrative.md"), prior = existsSync(np) ? readFileSync(np, "utf8") : "";
const prose = prior.includes("<!-- STATUS-END -->") ? prior.split("<!-- STATUS-END -->")[1] : "\n(no narrative yet)\n";
writeFileSync(np, `# Stage-1 judge hillclimb: status\n\n<!-- STATUS-START -->\n${statusTable()}\n<!-- STATUS-END -->${prose}`);
console.log(`wrote report.html metrics.md narrative.md trajectory/scores.tsv for ${variants.join(", ")}`);
