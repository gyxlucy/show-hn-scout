#!/usr/bin/env bun
// Listwise ranker eval (variant v7): one real Cavia task per rep. Each task reads one simulated day, i.e. the
// posts a first-stage judge pushed (the pool), as compact cards in a seeded random order, and returns all of them
// ranked best first. A daily cap then keeps the top of that ranking.
//
//   bun .evals/show-hn-scout/rank.ts --model <model> --variant v7 [--out haiku_v7] [--set train60]
//        [--pool-from haiku_v3] [--reps 6] [--concurrency 3] [--timeout-s 300] --approved
//
// Appends results.jsonl as reps finish, resumes by rep, writes failures to errors.jsonl. `--approved` is the consent
// gate for paid calls. The model sees title, URL and the start of the page text only: no decision, no votes, no labels,
// no posting time, and the card order is shuffled per rep so list position carries no information.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { loadAgent, runCaviaTask, type RunTask } from "./cavia.ts";
import { DIR, finalText, loadCases, toTrace, type Case } from "./lib.ts";

export type Card = { id: string; title: string; url: string; page_start: string; hn_discussion?: string };
export type RankOpts = {
  dir?: string; agentDir?: string; variant: string; outName?: string; model: string; reps: number; timeoutS: number; concurrency: number;
  poolFrom: string; maxAttempts?: number; backoffMs?: number; topN?: number;
  pageChars?: number; commentChars?: number; // card size: page text kept, and HN discussion kept (0 = not shown)
};

const jsonl = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const append = (path: string, row: unknown) => appendFileSync(path, JSON.stringify(row) + "\n");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const PAGE_CHARS = 700;
const squeeze = (x: string) => x.replace(/\s+/g, " ").trim();

/** The posts a first-stage run pushed: a case is in the pool when at least half of its reps pushed. */
export function poolFromRun(dir: string, runName: string): string[] {
  const by = new Map<string, boolean[]>();
  for (const r of jsonl(join(dir, runName, "results.jsonl"))) {
    if (r.status !== "ok" || !r.answer) continue;
    by.set(r.prompt_id, [...(by.get(r.prompt_id) ?? []), r.answer.decision === "push"]);
  }
  return [...by].filter(([, v]) => v.filter(Boolean).length * 2 >= v.length).map(([k]) => k).sort();
}

/** Compact evidence for the ranker, cut from the same prompt the judge saw (no decision, no label, no posting time). */
export function cardOf(c: Case, size: { pageChars?: number; commentChars?: number } = {}): Card {
  const title = c.prompt.match(/^Title: (.*)$/m)?.[1]?.trim() ?? "";
  const url = c.prompt.match(/^Project URL: (.*)$/m)?.[1]?.trim() ?? "";
  const page = c.prompt.match(/```text\n([\s\S]*?)\n```/)?.[1] ?? "";
  const squeezed = squeeze(page);
  const card: Card = { id: c.id, title, url, page_start: squeezed ? squeezed.slice(0, size.pageChars ?? PAGE_CHARS) : "(no page text could be extracted)" };
  if (size.commentChars) {
    const disc = c.prompt.match(/^## HN discussion[^\n]*\n([\s\S]*)$/m)?.[1] ?? "";
    const body = squeeze(disc.replace(/^\(no comments\)\s*$/m, ""));
    card.hn_discussion = body ? body.slice(0, size.commentChars) : "(no comments)";
  }
  return card;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffled<T>(xs: T[], seed: number): T[] {
  const r = mulberry32(seed), a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** One rep's message: opaque labels C01.. in a seeded random order; labels map back to case ids via `labels`. */
export function buildRankPrompt(cards: Card[], seed: number): { prompt: string; labels: Record<string, string> } {
  const order = shuffled(cards, seed);
  const labels: Record<string, string> = {};
  const items = order.map((c, i) => {
    const label = `C${String(i + 1).padStart(2, "0")}`;
    labels[label] = c.id;
    return { id: label, title: c.title, url: c.url, page_start: c.page_start, ...(c.hn_discussion != null ? { hn_discussion: c.hn_discussion } : {}) };
  });
  const prompt = `# Candidate posts (${items.length})\n\nEvery card below already passed a first screen. Rank all of them, best first. The cards are in random order; the order carries no information.\n\n\`\`\`json\n${JSON.stringify(items, null, 2)}\n\`\`\`\n`;
  return { prompt, labels };
}

export type Ranking = { valid: true; ranking: string[]; top_reasons: Record<string, string> } | { valid: false; error: string };

/**
 * Strict contract: one JSON object {ranking, top_reasons}. `ranking` lists every label exactly once, best first.
 * `top_reasons` has a non-empty string for each of the first `topN` labels. A single ```json fence is tolerated.
 * Anything else is "no answer": a partial ranking is never completed or guessed.
 */
export function parseRanking(text: string, labels: string[], topN = 10): Ranking {
  let t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  if (fenced) t = fenced[1].trim();
  let obj: any;
  try { obj = JSON.parse(t); } catch { return { valid: false, error: "reply is not a single JSON object" }; }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { valid: false, error: "JSON is not an object" };
  const r = obj.ranking;
  if (!Array.isArray(r) || r.some((x) => typeof x !== "string")) return { valid: false, error: "ranking must be an array of strings" };
  const want = new Set(labels), got = new Set(r as string[]);
  if (got.size !== r.length) return { valid: false, error: "ranking repeats a label" };
  const missing = labels.filter((l) => !got.has(l)), extra = (r as string[]).filter((l) => !want.has(l));
  if (missing.length || extra.length) return { valid: false, error: `ranking must list every label once (missing ${missing.length}, unknown ${extra.length})` };
  const tr = obj.top_reasons;
  if (!tr || typeof tr !== "object" || Array.isArray(tr)) return { valid: false, error: "top_reasons must be an object" };
  const top_reasons: Record<string, string> = {};
  for (const l of (r as string[]).slice(0, Math.min(topN, r.length))) {
    if (typeof tr[l] !== "string" || !tr[l].trim()) return { valid: false, error: `top_reasons.${l} must be a non-empty string` };
    top_reasons[l] = tr[l].trim();
  }
  return { valid: true, ranking: r as string[], top_reasons };
}

export async function runRank(o: RankOpts, deps: { runTask: RunTask }) {
  const dir = o.dir ?? DIR;
  const vdir = join(dir, o.outName ?? o.variant);
  const { agent } = loadAgent(o.agentDir ?? vdir);
  const cases = new Map(loadCases(dir).map((c) => [c.id, c]));
  const pool = poolFromRun(dir, o.poolFrom);
  if (!pool.length) throw new Error(`empty pool from ${o.poolFrom}`);
  const pageChars = o.pageChars ?? PAGE_CHARS, commentChars = o.commentChars ?? 0;
  const cards = pool.map((id) => cardOf(cases.get(id)!, { pageChars, commentChars }));
  mkdirSync(join(vdir, "traces"), { recursive: true });
  mkdirSync(join(vdir, "raw"), { recursive: true });
  const resultsPath = join(vdir, "results.jsonl"), errorsPath = join(vdir, "errors.jsonl"), summaryPath = join(vdir, "summary.json");
  const prev = existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath, "utf8")) : null;
  const promptSha = sha(agent.system_prompt);
  if (prev && (prev.model !== o.model || prev.system_prompt_sha256 !== promptSha || prev.pool_from !== o.poolFrom || prev.kind !== "ranker" || (prev.page_chars ?? PAGE_CHARS) !== pageChars || (prev.comment_chars ?? 0) !== commentChars))
    throw new Error(`${summaryPath} was written for a different model, system prompt, pool or kind; use a new variant directory`);
  writeFileSync(summaryPath, JSON.stringify({
    description: prev?.description ?? "listwise ranker", label: prev?.label ?? o.variant, target: "system_prompt", kind: "ranker",
    model: o.model, system_prompt_sha256: promptSha, pool_from: o.poolFrom, pool_size: pool.length, page_chars: pageChars, comment_chars: commentChars, reps: o.reps,
    started_at: prev?.started_at ?? new Date().toISOString(), cost: "cost not measured (no approved pricing rule)",
  }, null, 2));

  const done = new Set<number>(jsonl(resultsPath).map((r: any) => r.rep));
  const jobs = Array.from({ length: o.reps }, (_, rep) => rep).filter((r) => !done.has(r));
  const maxAttempts = o.maxAttempts ?? 3, backoffMs = o.backoffMs ?? 3000;
  let aborted: string | null = null;

  async function attempt(rep: number) {
    const { prompt, labels } = buildRankPrompt(cards, rep + 1);
    for (let n = 1; n <= maxAttempts && !aborted; n++) {
      const t0 = Date.now();
      const fail = (cls: string, message: string, run?: any, retry = false) => {
        append(errorsPath, { prompt_id: "pool", rep, attempt: n, failure_class: cls, error: message, task_id: run?.task_id ?? null, model: o.model, usage: run?.usage ?? null, latency_s: (Date.now() - t0) / 1000, at: new Date().toISOString() });
        return retry;
      };
      let run;
      try { run = await deps.runTask(agent, o.model, prompt, o.timeoutS * 1000); }
      catch (e: any) { if (fail("harness_error", String(e?.message ?? e), undefined, true) && n < maxAttempts) { await sleep(backoffMs * 2 ** (n - 1)); continue; } return; }
      if (run.error) { if (fail(run.error === "timeout" ? "timeout" : "harness_error", run.error, run, run.error !== "timeout") && n < maxAttempts) { await sleep(backoffMs * 2 ** (n - 1)); continue; } return; }
      const u = run.usage ?? {};
      if (!(u.input_tokens > 0) || !(u.output_tokens > 0)) { fail("usage_missing", `completed task reported usage ${JSON.stringify(run.usage)}`, run); return; }
      const status = run.stop_reason === "length" ? "truncated" : run.stop_reason === "content-filter" ? "refused" : "ok";
      const parsed = parseRanking(finalText(run.transcript), Object.keys(labels), o.topN ?? 10);
      const trace = toTrace(agent.system_prompt, run.transcript);
      trace.turns[0] = { ...trace.turns[0], task_id: run.task_id } as any;
      writeFileSync(join(vdir, "traces", `pool_rep${rep}.json`), JSON.stringify(trace.turns, null, 2));
      writeFileSync(join(vdir, "raw", `pool_rep${rep}.json`), JSON.stringify({ run, labels }, null, 2));
      append(resultsPath, {
        prompt_id: "pool", rep, seed: rep + 1, task_id: run.task_id, model: o.model, status, stop_reason: run.stop_reason, attempts: n,
        pool: pool, labels, // label -> case id for this rep's shuffle
        answer: parsed.valid ? { ranking: parsed.ranking.map((l) => labels[l]), top_reasons: Object.fromEntries(Object.entries(parsed.top_reasons).map(([l, r]) => [labels[l], r])) } : null,
        grade: { valid: parsed.valid && status === "ok" ? 1 : 0 }, latency_s: (Date.now() - t0) / 1000, tool_calls: trace.tool_calls,
        usage: { input_tokens: u.input_tokens, output_tokens: u.output_tokens, ...(u.cached_tokens != null ? { cache_read_input_tokens: u.cached_tokens } : {}) },
        meta: { steps: trace.steps, tool_errors: trace.tool_errors, reply_error: parsed.valid ? null : parsed.error },
      });
      return;
    }
  }
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(o.concurrency, jobs.length) }, async () => { while (next < jobs.length && !aborted) await attempt(jobs[next++]); }));
  const results = jsonl(resultsPath), errors = jsonl(errorsPath);
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  writeFileSync(summaryPath, JSON.stringify({ ...summary, finished_at: new Date().toISOString(), rows: results.length, error_rows: errors.length, aborted }, null, 2));
  return { planned: o.reps, ran: jobs.length, rows: results.length, errors: errors.length, pool_size: pool.length };
}

if (import.meta.main) {
  const { values: v } = parseArgs({ options: {
    model: { type: "string" }, variant: { type: "string", default: "v7" }, out: { type: "string" }, set: { type: "string", default: "train60" },
    "pool-from": { type: "string", default: "haiku_v3" }, reps: { type: "string", default: "6" }, concurrency: { type: "string", default: "3" },
    "timeout-s": { type: "string", default: "300" }, approved: { type: "boolean", default: false },
    "page-chars": { type: "string", default: "700" }, "comment-chars": { type: "string", default: "0" },
  } });
  if (!v.model) throw new Error("--model is required (it is recorded on every row)");
  if (!["fresh-train", "fresh-test", "train60", "heldout", "day-1104", "day-1109"].includes(v.set!)) throw new Error(`unknown --set ${v.set}`);
  const setDir = join(DIR, v.set!);
  const opts: RankOpts = { dir: setDir, agentDir: join(DIR, v.variant!), variant: v.variant!, outName: v.out, model: v.model, reps: +v.reps!, timeoutS: +v["timeout-s"]!, concurrency: +v.concurrency!, poolFrom: v["pool-from"]!, pageChars: +v["page-chars"]!, commentChars: +v["comment-chars"]! };
  console.log(`Plan: ${opts.reps} reps x 1 ranking call on ${opts.model} (variant ${opts.variant}, set ${v.set}), pool ${poolFromRun(setDir, opts.poolFrom).length} cases from ${opts.poolFrom}, cards: ${opts.pageChars} page chars + ${opts.commentChars} discussion chars`);
  if (!v.approved) { console.log("Dry plan only. Pass --approved after the user approves paid calls."); process.exit(0); }
  console.log(JSON.stringify(await runRank(opts, { runTask: runCaviaTask }), null, 2));
  process.exit(0);
}
