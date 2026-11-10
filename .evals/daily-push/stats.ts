// Aggregates the recorded rows of one variant on one day into the product-level numbers the report and metrics.md show.
// Pure over files: no model calls. Every number carries its n; an undefined number is null, never 0.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { K, auc, guardrails, hypergeomUpper, mean, meanOverlap, newestK, randomExpectation, selectionMetrics } from "./metrics.ts";
import { OUT, SRC, cfg, jl, loadDay, type Day } from "./adapt.ts";

const range = (xs: number[]) => (xs.length ? { min: Math.min(...xs), max: Math.max(...xs) } : null);
const nul = (x: number) => (Number.isNaN(x) ? null : x);

export type DayStats = ReturnType<typeof dayFacts>;
export function dayFacts(day: Day) {
  const N = day.pool.length, Kw = day.pool.filter((id) => day.tier[id] !== "pass").length;
  const must = day.pool.filter((id) => day.tier[id] === "must_read").length;
  const rnd = randomExpectation(day.pool, day.tier);
  const newest = selectionMetrics(newestK(day.pool, day.posted), day.tier);
  // SD of the wanted count in a random top-10 (hypergeometric variance): the noise floor for any difference in counts.
  const k = Math.min(K, N), p = Kw / N, sd = Math.sqrt(k * p * (1 - p) * ((N - k) / (N - 1)));
  return { id: day.id, kind: day.kind, pool: N, wanted: Kw, must, pass: N - Kw, base_rate: p, random: rnd, newest, random_sd_wanted_at10: sd, stage1: day.stage1 };
}

export function variantDay(v: string, day: Day) {
  const c = cfg.variants[v], dir = join(OUT, v);
  const rows = jl(join(dir, "results.jsonl")).filter((r) => r.prompt_id === day.id);
  const errs = jl(join(dir, "errors.jsonl")).filter((r) => r.prompt_id === day.id);
  if (!rows.length && !errs.length) return null;
  const sumPath = c.sources[day.id] ? join(SRC, c.sources[day.id], "summary.json") : null;
  const planned: number | null = sumPath && existsSync(sumPath) ? JSON.parse(readFileSync(sumPath, "utf8")).reps ?? null : c.kind === "cap" ? 1 : null;
  const valid = rows.filter((r) => r.grade?.valid === 1 && r.status === "ok");
  const g = (k: string) => valid.map((r) => r.grade[k] as number);
  const facts = dayFacts(day);
  const sets = valid.map((r) => r.answer.selected as string[]);
  const pvals = valid.map((r) => (r.grade.pushes > 0 ? hypergeomUpper(facts.pool, facts.wanted, r.grade.pushes, r.grade.wanted_at10) : null));
  const bias = valid.map((r) => r.meta?.position_bias).filter((x) => typeof x === "number") as number[];
  const useful = (key: string) => rows.map((r) => r.usage?.[key]).filter((x) => typeof x === "number") as number[];
  let anchor: any = null;
  if (c.kind === "anchor") {
    const rank = valid.map((r) => r.answer.rank as Record<string, number>);
    const mr: Record<string, number> = {};
    for (const id of day.pool) mr[id] = mean(rank.map((x) => x[id]));
    const w = day.pool.filter((id) => day.tier[id] !== "pass").map((id) => mr[id]), p = day.pool.filter((id) => day.tier[id] === "pass").map((id) => mr[id]);
    const m = day.pool.filter((id) => day.tier[id] === "must_read").map((id) => mr[id]), rest = day.pool.filter((id) => day.tier[id] !== "must_read").map((id) => mr[id]);
    anchor = { auc_wanted_vs_pass: auc(w, p), auc_must_vs_rest: auc(m, rest), best_mean_rank: Math.min(...Object.values(mr)), posts_at_bar: Object.values(mr).filter((x) => x <= c.push_rank).length, x_wanted_top10: g("x_wanted_top10"), x_must_top10: g("x_must_top10"), x_pass_top10: g("x_pass_top10") };
  }
  const ov = meanOverlap(sets);
  const gr = c.kind === "ranker" && ["day-1104", "day-1109"].includes(day.id) && planned
    ? guardrails({ wanted: g("wanted_at10"), must: g("must_at10"), pass: g("pass_at10"), random: facts.random, newest: facts.newest, valid: valid.length, reps: planned, bias: mean(bias.map(Math.abs)), overlap: ov })
    : null;
  return {
    variant: v, day: day.id, kind: c.kind, model: c.model, planned_reps: planned, rows: rows.length, valid: valid.length, error_rows: errs.length,
    wanted_at10: { mean: nul(mean(g("wanted_at10"))), ...range(g("wanted_at10")), per_rep: g("wanted_at10") },
    must_at10: { mean: nul(mean(g("must_at10"))), ...range(g("must_at10")) },
    pass_at10: { mean: nul(mean(g("pass_at10"))), ...range(g("pass_at10")) },
    pushes: { mean: nul(mean(g("pushes"))), ...range(g("pushes")) },
    wanted_p10: valid.length && g("pushes").some((n) => n > 0) ? mean(valid.filter((r) => r.grade.pushes > 0).map((r) => r.grade.wanted_p10)) : null,
    p_vs_random: { median: pvals.filter((x) => x != null).length ? [...(pvals as number[]).filter((x) => x != null)].sort((a, b) => a - b)[Math.floor(pvals.filter((x) => x != null).length / 2)] : null, worst: pvals.filter((x) => x != null).length ? Math.max(...(pvals as number[]).filter((x) => x != null)) : null },
    overlap: ov, position_bias_mean_abs: bias.length ? mean(bias.map(Math.abs)) : null, anchor, guardrails: gr,
    usage: { input_tokens_per_rep: nul(mean(useful("input_tokens"))), output_tokens_per_rep: nul(mean(useful("output_tokens"))), rows_with_usage: useful("input_tokens").length },
    latency_s_per_rep: nul(mean(rows.map((r) => r.latency_s).filter((x) => typeof x === "number"))),
    calls_per_rep: c.kind === "anchor" ? day.pool.length : c.kind === "ranker" ? 1 : 0,
  };
}

export function allStats() {
  const days = Object.keys(cfg.days).map(loadDay);
  const facts = Object.fromEntries(days.map((d) => [d.id, dayFacts(d)]));
  const per: Record<string, Record<string, ReturnType<typeof variantDay>>> = {};
  for (const v of Object.keys(cfg.variants)) per[v] = Object.fromEntries(days.map((d) => [d.id, variantDay(v, d)]));
  return { days, facts, per };
}
