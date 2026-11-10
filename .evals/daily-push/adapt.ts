#!/usr/bin/env bun
// Adapter: turns the existing second-stage runs in .evals/show-hn-scout into the stable run contract of this flow
// (<variant>/{system-prompt.md,request.json,results.jsonl,errors.jsonl,summary.json,traces/,change.md,change.patch}).
// One row = one (day, rep). It makes no model call and is deterministic, so it regenerates the variant files from the
// recorded source rows every time. A source directory that does not exist yet (planned variants) is skipped.
//   bun .evals/daily-push/adapt.ts
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { poolFromRun } from "../show-hn-scout/rank.ts";
import { K, anchorPushSet, auc, mean, newestK, positionBias, selectionMetrics, topByRank, type Tier } from "./metrics.ts";

export const SRC = resolve(import.meta.dir, "../show-hn-scout");
export const OUT = import.meta.dir;
export const cfg = JSON.parse(readFileSync(join(OUT, "variants.json"), "utf8"));
export const jl = (p: string): any[] => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export type Day = { id: string; dir: string; kind: string; tier: Record<string, Tier>; posted: Record<string, string>; pool: string[]; stage1: { calls: number; input_tokens: number; output_tokens: number; latency_s: number; measured: boolean } };

export function loadDay(id: string): Day {
  const c = cfg.days[id], dir = join(SRC, c.dir);
  const tier = Object.fromEntries(jl(join(dir, "tier.jsonl")).map((t) => [t.id, t.tier as Tier]));
  const posted = Object.fromEntries(jl(join(dir, "cases.jsonl")).map((x) => [x.id, x.prompt.match(/^Posted \(UTC\): (.*)$/m)?.[1]?.trim() ?? ""]));
  const pool = poolFromRun(dir, cfg.stage1.pool_run);
  for (const p of pool) if (!(p in tier) || !posted[p]) throw new Error(`${id}: pool post ${p} lacks a tier or posting time`);
  // Stage-1 cost of the day: one call per post, averaged over the recorded reps. Live decisions carry no usage: unknown, not 0.
  const rows = jl(join(dir, cfg.stage1.pool_run, "results.jsonl")).filter((r) => r.status === "ok" && r.usage);
  const per = new Map<string, any[]>();
  for (const r of rows) per.set(r.prompt_id, [...(per.get(r.prompt_id) ?? []), r]);
  const stage1 = { calls: per.size, input_tokens: 0, output_tokens: 0, latency_s: 0, measured: per.size > 0 };
  for (const rs of per.values()) { stage1.input_tokens += mean(rs.map((r) => r.usage.input_tokens)); stage1.output_tokens += mean(rs.map((r) => r.usage.output_tokens)); stage1.latency_s += mean(rs.map((r) => r.latency_s ?? 0)); }
  return { id, dir, kind: c.kind, tier, posted, pool, stage1 };
}

const base = (v: string, day: Day, rep: number, extra: any) => ({ prompt_id: day.id, rep, ...extra, tags: [day.kind, cfg.variants[v].kind] });

function rankerRows(v: string, day: Day, srcDir: string) {
  const ok: any[] = [], err: any[] = [];
  const traces: [string, string][] = [];
  for (const r of jl(join(srcDir, "results.jsonl"))) {
    if (!(r.usage?.input_tokens > 0) || !(r.usage?.output_tokens > 0)) throw new Error(`${srcDir} rep ${r.rep}: usage missing or zero`);
    const common = { task_id: r.task_id, model: r.model, status: r.status, stop_reason: r.stop_reason, attempts: r.attempts, latency_s: r.latency_s, tool_calls: r.tool_calls, usage: r.usage };
    if (!r.answer) {
      ok.push(base(v, day, r.rep, { ...common, prompt: `Day ${day.id}: rank ${day.pool.length} pooled posts`, answer: null, grade: { valid: 0 }, meta: { source_run: srcDir, reply_error: r.meta?.reply_error ?? null } }));
      continue;
    }
    const ranking: string[] = r.answer.ranking, sel = ranking.slice(0, K), m = selectionMetrics(sel, day.tier);
    ok.push(base(v, day, r.rep, { ...common, prompt: `Day ${day.id}: rank ${day.pool.length} pooled posts, keep the top ${K}`, answer: { selected: sel, ranking }, grade: { wanted_p10: m.p_wanted, wanted_at10: m.wanted, must_at10: m.must, pass_at10: m.pass, pushes: m.n, valid: 1 }, meta: { source_run: srcDir, pool_size: ranking.length, position_bias: positionBias(r.labels, ranking), seed: r.seed } }));
    traces.push([join(srcDir, "traces", `pool_rep${r.rep}.json`), `${day.id}_rep${r.rep}.json`]);
  }
  for (const e of jl(join(srcDir, "errors.jsonl"))) err.push({ prompt_id: day.id, rep: e.rep, attempt: e.attempt, failure_class: e.failure_class, error: e.error, task_id: e.task_id, model: e.model, usage: e.usage, latency_s: e.latency_s, at: e.at });
  return { ok, err, traces, synthetic: [] as [string, any][] };
}

function anchorRows(v: string, day: Day, srcDir: string) {
  const pushRank: number = cfg.variants[v].push_rank;
  const reps = new Map<number, any[]>();
  for (const r of jl(join(srcDir, "results.jsonl"))) reps.set(r.rep, [...(reps.get(r.rep) ?? []), r]);
  const validRows = (rs: any[]) => rs.filter((r) => r.status === "ok" && typeof r.answer?.rank === "number");
  const meanRank: Record<string, number> = {};
  const all = [...reps.values()].flatMap(validRows);
  for (const id of day.pool) { const x = all.filter((r) => r.prompt_id === id).map((r) => r.answer.rank); if (x.length) meanRank[id] = mean(x); }
  const ok: any[] = [], synthetic: [string, any][] = [];
  const sysPrompt = readFileSync(join(SRC, cfg.variants[v].agent, "system-prompt.md"), "utf8");
  for (const [rep, rs] of [...reps].sort((a, b) => a[0] - b[0])) {
    const good = validRows(rs);
    for (const r of good) if (!(r.usage?.input_tokens > 0) || !(r.usage?.output_tokens > 0)) throw new Error(`${srcDir} ${r.prompt_id} rep ${rep}: usage missing or zero`);
    const complete = day.pool.every((id) => good.some((r) => r.prompt_id === id));
    const usage = { input_tokens: rs.reduce((a, r) => a + (r.usage?.input_tokens ?? 0), 0), output_tokens: rs.reduce((a, r) => a + (r.usage?.output_tokens ?? 0), 0) };
    const common = { task_id: rs[0].task_id, model: rs[0].model, status: complete ? "ok" : "incomplete", stop_reason: "stop", attempts: Math.max(...rs.map((r) => r.attempts ?? 1)), latency_s: rs.reduce((a, r) => a + (r.latency_s ?? 0), 0), tool_calls: 0, usage, prompt: `Day ${day.id}: ${day.pool.length} independent one-post calls against 10 references (usage and latency are sums over the calls)` };
    if (!complete) { ok.push(base(v, day, rep, { ...common, answer: null, grade: { valid: 0 }, meta: { source_run: srcDir, calls: rs.length } })); continue; }
    const rank: Record<string, number> = Object.fromEntries(good.map((r) => [r.prompt_id, r.answer.rank]));
    // Declared rule: push when the rank is within the bar, newest-first cap not needed unless more than K pass the bar.
    const rule = anchorPushSet(rank, pushRank), sel = topByRank(Object.fromEntries(rule.map((id) => [id, rank[id]])), K, meanRank);
    const m = selectionMetrics(sel, day.tier), top = selectionMetrics(topByRank(rank, K, meanRank), day.tier);
    ok.push(base(v, day, rep, { ...common, answer: { selected: sel, rank }, grade: { wanted_p10: m.p_wanted, wanted_at10: m.wanted, must_at10: m.must, pass_at10: m.pass, pushes: m.n, valid: 1, x_wanted_top10: top.wanted, x_must_top10: top.must, x_pass_top10: top.pass }, meta: { source_run: srcDir, calls: rs.length, task_ids: rs.map((r) => r.task_id), push_rank: pushRank, exploratory: "x_* = top 10 by this rep's rank, not the declared rule" } }));
    synthetic.push([`${day.id}_rep${rep}.json`, [
      { role: "system", content: sysPrompt, task_id: rs[0].task_id },
      { role: "user", content: `Stage 2 for ${day.id}, rep ${rep}: ${rs.length} independent one-post calls (post ids: ${good.map((r) => r.prompt_id).join(", ")}). Per-post transcripts: ${srcDir}/traces/<post>_rep${rep}.json` },
      { role: "assistant", content: JSON.stringify({ rank, selected: sel }) },
    ]]);
  }
  return { ok, err: jl(join(srcDir, "errors.jsonl")).map((e) => ({ prompt_id: day.id, ...e })), traces: [] as [string, string][], synthetic };
}

function baselineRows(day: Day) {
  const sel = newestK(day.pool, day.posted), m = selectionMetrics(sel, day.tier);
  return [{ prompt_id: day.id, rep: 0, task_id: null, model: cfg.stage1.model, status: "ok", stop_reason: null, attempts: 1, tags: [day.kind, "cap"], prompt: `Day ${day.id}: newest ${K} of ${day.pool.length} pushed posts (deterministic; no stage-2 call)`, answer: { selected: sel }, grade: { wanted_p10: m.p_wanted, wanted_at10: m.wanted, must_at10: m.must, pass_at10: m.pass, pushes: m.n, valid: 1 }, meta: { stage2_calls: 0, stage1: day.stage1, task_id_note: "no stage-2 task; stage-1 task ids are in the source run" } }];
}

function diffU(a: string, b: string): string {
  const r = Bun.spawnSync(["diff", "-u", a, b]);
  return r.stdout.toString();
}

function changeMd(v: string, c: any, doneDays: string[], notes: string) {
  return `# ${v}: ${c.label}\n\nStatus: ${doneDays.length ? "RECORDED (adapted from existing runs, no new calls)" : "PLANNED (no run yet)"}\n\n## What this variant is\n${c.description}.\n\nStage 1 is always the v3 judge (see \`baseline/system-prompt.md\`); this variant changes stage 2 only. The prompt in \`system-prompt.md\` is the stage-2 prompt${c.kind === "cap" ? " (here the stage-1 judge prompt, since the baseline has no stage 2)" : ""}.\n\nModel: ${c.model}. Source run${doneDays.length > 1 ? "s" : ""}: ${doneDays.map((d) => `${d}: ${c.sources[d]}`).join("; ") || "none"}.\n\n${notes}\n`;
}

const NOTES: Record<string, string> = {
  baseline: "The live product after commit 61cf759: the day's v3 pushes are capped at the newest 10. On train60-sim the posts are not from one day, so this row is a mock there.",
  v1: "Original record: `.evals/show-hn-scout/v7/change.md`. train60: not adopted. day-1104: guardrails G1-G6 pass (narrowly on G6). day-1109 (real held-out, blind labels): G1-G6 pass again (G2 narrowly). Two real days.",
  v2: "Original record: `.evals/show-hn-scout/v8/change.md`. Richer cards did not help on train60: not adopted. Not run on day-1104.",
  v3: "Original record: `.evals/show-hn-scout/v9/change.md`. Declared guardrails failed on day-1104: nothing reaches rank <= 3.",
  v4: "Original record: `.evals/show-hn-scout/v10/change.md`. Same guardrails as v9, failed; her reasons did not change the outcome.",
};

export function adapt() {
  const days: Record<string, Day> = Object.fromEntries(Object.keys(cfg.days).map((d) => [d, loadDay(d)]));
  const out: Record<string, { rows: number; days: string[] }> = {};
  for (const [v, c] of Object.entries<any>(cfg.variants)) {
    const vdir = join(OUT, v);
    const available = Object.keys(c.sources).filter((d) => existsSync(join(SRC, c.sources[d], "results.jsonl")));
    if (c.kind !== "cap" && !available.length) { out[v] = { rows: 0, days: [] }; continue; }
    rmSync(vdir, { recursive: true, force: true });
    mkdirSync(join(vdir, "traces"), { recursive: true });
    const agentDir = join(SRC, c.agent);
    copyFileSync(join(agentDir, "system-prompt.md"), join(vdir, "system-prompt.md"));
    copyFileSync(join(agentDir, "request.json"), join(vdir, "request.json"));
    const rows: any[] = [], errs: any[] = [];
    const doneDays = c.kind === "cap" ? Object.keys(days) : available;
    for (const d of doneDays) {
      if (c.kind === "cap") { rows.push(...baselineRows(days[d])); continue; }
      const r = c.kind === "ranker" ? rankerRows(v, days[d], join(SRC, c.sources[d])) : anchorRows(v, days[d], join(SRC, c.sources[d]));
      rows.push(...r.ok); errs.push(...r.err);
      for (const [from, name] of r.traces) if (existsSync(from)) copyFileSync(from, join(vdir, "traces", name));
      for (const [name, turns] of r.synthetic) writeFileSync(join(vdir, "traces", name), JSON.stringify(turns, null, 2));
    }
    writeFileSync(join(vdir, "results.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    writeFileSync(join(vdir, "errors.jsonl"), errs.map((r) => JSON.stringify(r)).join("\n") + (errs.length ? "\n" : ""));
    const prompt = readFileSync(join(vdir, "system-prompt.md"), "utf8");
    writeFileSync(join(vdir, "summary.json"), JSON.stringify({ description: c.description, label: v, target: "system_prompt", kind: c.kind, model: c.model, system_prompt_sha256: sha(prompt), days: doneDays, rows: rows.length, error_rows: errs.length, sources: Object.fromEntries(doneDays.map((d) => [d, c.sources[d] ?? null])), cost: "tokens and latency only; cost not measured (no pricing rule)", generated_by: "adapt.ts (no model calls)", generated_at: new Date().toISOString() }, null, 2));
    writeFileSync(join(vdir, "change.md"), changeMd(v, c, c.kind === "cap" ? [] : doneDays, NOTES[v] ?? ""));
    writeFileSync(join(vdir, "change.patch"), v === "baseline" ? "" : diffU(join(OUT, "baseline/system-prompt.md"), join(vdir, "system-prompt.md")));
    out[v] = { rows: rows.length, days: doneDays };
  }
  return out;
}

if (import.meta.main) console.log(JSON.stringify(adapt(), null, 1));
