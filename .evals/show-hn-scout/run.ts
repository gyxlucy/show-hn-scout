#!/usr/bin/env bun
// Runner: one real Cavia task per (case, rep), graded against the human label, optionally with the reason judge.
//
//   bun .evals/show-hn-scout/run.ts --model <model> [--variant baseline] [--reps 3] [--timeout-s 300]
//        [--concurrency 4] [--cases 01,02] [--no-judge] [--set dev|heldout|fresh-train|fresh-test|train60] --approved
//
// Appends results.jsonl as cases finish and resumes by (case, rep). Attempts that never produced a scorable
// output go to errors.jsonl (never into results.jsonl, so resume re-runs them). `--approved` is the consent
// gate for paid calls: it must be passed explicitly after the user says go.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { loadAgent, runCaviaTask, type RunTask } from "./cavia.ts";
import { DIR, finalText, gradeAnswer, loadCases, loadGold, parseAnswer, toTrace, type Case } from "./lib.ts";
import { judgeFromEnv, type JudgeFn } from "./judge.ts";

export type Opts = {
  dir?: string; agentDir?: string; variant: string; model: string; reps: number; timeoutS: number; concurrency: number;
  outName?: string; only?: string[]; maxAttempts?: number; backoffMs?: number;
};
export type Deps = { runTask: RunTask; judge?: JudgeFn; judgeModel?: string };

const jsonl = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const append = (path: string, row: unknown) => appendFileSync(path, JSON.stringify(row) + "\n");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function classify(message: string): { cls: string; retry: boolean } {
  if (message === "timeout") return { cls: "timeout", retry: false }; // the ceiling fired; do not pay for it twice
  if (/rate.?limit|429|overload|capacity|too many/i.test(message)) return { cls: "rate_limit", retry: true };
  if (/model/i.test(message) && /unknown|not found|unsupported|invalid|not supported|unavailable/i.test(message)) return { cls: "config_error", retry: false };
  return { cls: "harness_error", retry: true };
}

export async function runEval(o: Opts, deps: Deps) {
  const dir = o.dir ?? DIR;
  const vdir = join(dir, o.outName ?? o.variant); // outName lets a second model write to its own dir while reading the same agent files
  const { agent } = loadAgent(o.agentDir ?? vdir); // held-out runs read the agent from DIR/<variant> but write under DIR/heldout/<variant>
  const gold = loadGold(dir);
  const all = loadCases(dir);
  const cases = all.filter((c) => gold.has(c.id) && (!o.only || o.only.includes(c.id)));
  const skipped = all.filter((c) => !gold.has(c.id)).map((c) => c.id);

  mkdirSync(join(vdir, "traces"), { recursive: true });
  mkdirSync(join(vdir, "raw"), { recursive: true });
  const resultsPath = join(vdir, "results.jsonl");
  const errorsPath = join(vdir, "errors.jsonl");
  const summaryPath = join(vdir, "summary.json");
  const prev = existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath, "utf8")) : null;
  const promptSha = sha(agent.system_prompt);
  if (prev && (prev.model !== o.model || prev.system_prompt_sha256 !== promptSha))
    throw new Error(`${summaryPath} was written for a different model or system prompt; use a new variant directory`);
  writeFileSync(summaryPath, JSON.stringify({
    description: prev?.description ?? "baseline", label: prev?.label ?? o.variant, target: "system_prompt",
    model: o.model, system_prompt_sha256: promptSha, reps: o.reps, judge_model: deps.judgeModel ?? null,
    started_at: prev?.started_at ?? new Date().toISOString(), cost: "cost not measured (no approved pricing rule)",
  }, null, 2));

  const done = new Set<string>(jsonl(resultsPath).map((r: any) => `${r.prompt_id}#${r.rep}`));
  const jobs: { c: Case; rep: number }[] = [];
  for (const c of cases) for (let rep = 0; rep < o.reps; rep++) if (!done.has(`${c.id}#${rep}`)) jobs.push({ c, rep });
  const maxAttempts = o.maxAttempts ?? 3;
  const backoffMs = o.backoffMs ?? 3000;
  let aborted: string | null = null;
  let recent: string[] = [];

  async function attempt(c: Case, rep: number) {
    for (let n = 1; n <= maxAttempts && !aborted; n++) {
      const t0 = Date.now();
      const fail = (cls: string, message: string, run?: any, retry = false) => {
        append(errorsPath, { prompt_id: c.id, rep, attempt: n, failure_class: cls, error: message, task_id: run?.task_id ?? null, model: o.model, usage: run?.usage ?? null, latency_s: (Date.now() - t0) / 1000, at: new Date().toISOString() });
        recent = [...recent.slice(-2), `${cls}:${message}`];
        if (recent.length === 3 && new Set(recent).size === 1) aborted = `3 consecutive identical failures: ${recent[0]}`;
        return retry;
      };
      let run;
      try {
        run = await deps.runTask(agent, o.model, c.prompt, o.timeoutS * 1000);
      } catch (e: any) {
        const k = classify(String(e?.message ?? e));
        if (fail(k.cls, String(e?.message ?? e), undefined, k.retry) && n < maxAttempts) { await sleep(backoffMs * 2 ** (n - 1) * (0.5 + Math.random())); continue; }
        return;
      }
      if (run.error) {
        const k = classify(run.error);
        if (fail(k.cls, run.error, run, k.retry) && n < maxAttempts) { await sleep(backoffMs * 2 ** (n - 1) * (0.5 + Math.random())); continue; }
        return;
      }
      const latency_s = (Date.now() - t0) / 1000;
      const u = run.usage ?? {};
      if (!(u.input_tokens > 0) || !(u.output_tokens > 0)) { fail("usage_missing", `completed task reported usage ${JSON.stringify(run.usage)}`, run); return; }
      const status = run.stop_reason === "length" ? "truncated" : run.stop_reason === "content-filter" ? "refused" : "ok";
      const text = finalText(run.transcript);
      const parsed = parseAnswer(text);
      const expected = gold.get(c.id)!;
      const nullGrade = { agree: null, precision: null, recall: null, specificity: null, unsure: null, valid: null };
      let grade: Record<string, number | null> = status === "ok" ? gradeAnswer(parsed, expected) : nullGrade;
      let judgeRec = null;
      let explanation: Record<string, string> | undefined;
      if (status === "ok" && parsed.valid && deps.judge) {
        judgeRec = await deps.judge(c.prompt, { decision: parsed.decision, reason: parsed.reason });
        const v = judgeRec.verdict;
        grade = { ...grade, grounded: v ? +v.grounded : null, specific: v ? +v.specific : null, consistent: v ? +v.consistent : null };
        if (v) explanation = { grounded: v.reasoning };
        else append(errorsPath, { prompt_id: c.id, rep, attempt: n, failure_class: judgeRec.failure_class, error: judgeRec.error, task_id: run.task_id, model: judgeRec.judge_model, usage: judgeRec.judge_usage, role: "judge", at: new Date().toISOString() });
      }
      const trace = toTrace(agent.system_prompt, run.transcript);
      trace.turns[0] = { ...trace.turns[0], task_id: run.task_id } as any;
      writeFileSync(join(vdir, "traces", `${c.id}_rep${rep}.json`), JSON.stringify(trace.turns, null, 2));
      writeFileSync(join(vdir, "raw", `${c.id}_rep${rep}.json`), JSON.stringify({ run, judge: judgeRec }, null, 2));
      // Written last: a row at (case, rep) means this attempt is complete, trace and grade from the same task.
      append(resultsPath, {
        prompt_id: c.id, rep, prompt: c.prompt, tags: c.tags, task_id: run.task_id, model: o.model, status,
        stop_reason: run.stop_reason, attempts: n, expected, answer: parsed.valid ? { decision: parsed.decision, reason: parsed.reason } : null,
        grade, ...(explanation ? { explanation } : {}), latency_s, tool_calls: trace.tool_calls,
        usage: { input_tokens: u.input_tokens, output_tokens: u.output_tokens, ...(u.cached_tokens != null ? { cache_read_input_tokens: u.cached_tokens } : {}) },
        judge_model: judgeRec?.judge_model ?? null, judge_usage: judgeRec?.judge_usage ?? null,
        meta: { steps: trace.steps, tool_errors: trace.tool_errors, reply_error: parsed.valid ? null : parsed.error, judge_failure: judgeRec?.failure_class ?? null },
      });
      recent = [];
      return;
    }
  }

  let next = 0;
  await Promise.all(Array.from({ length: Math.min(o.concurrency, jobs.length) }, async () => {
    while (next < jobs.length && !aborted) { const j = jobs[next++]; await attempt(j.c, j.rep); }
  }));
  const results = jsonl(resultsPath);
  const errors = jsonl(errorsPath);
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  writeFileSync(summaryPath, JSON.stringify({ ...summary, finished_at: new Date().toISOString(), rows: results.length, error_rows: errors.length, aborted }, null, 2));
  if (aborted) throw new Error(`run aborted: ${aborted}`);
  return { planned: cases.length * o.reps, ran: jobs.length, rows: results.length, errors: errors.length, skipped_unlabeled: skipped };
}

if (import.meta.main) {
  const { values: v } = parseArgs({ options: {
    model: { type: "string" }, variant: { type: "string", default: "baseline" }, reps: { type: "string", default: "3" },
    "timeout-s": { type: "string", default: "300" }, concurrency: { type: "string", default: "4" }, cases: { type: "string" },
    "no-judge": { type: "boolean", default: false }, set: { type: "string", default: "dev" }, approved: { type: "boolean", default: false }, out: { type: "string" },
  } });
  if (!v.model) throw new Error("--model is required (it is recorded on every row)");
  if (!["dev", "heldout", "fresh-train", "fresh-test", "train60"].includes(v.set!)) throw new Error(`unknown --set ${v.set}`);
  const setDir = v.set === "dev" ? DIR : join(DIR, v.set!);
  const opts: Opts = { dir: setDir, agentDir: join(DIR, v.variant!), variant: v.variant!, outName: v.out, model: v.model, reps: +v.reps!, timeoutS: +v["timeout-s"]!, concurrency: +v.concurrency!, only: v.cases?.split(",") };
  const nCases = loadCases(setDir).filter((c) => loadGold(setDir).has(c.id) && (!opts.only || opts.only.includes(c.id))).length;
  console.log(`Plan: ${nCases} cases x ${opts.reps} reps on ${opts.model} (variant ${opts.variant}, set ${v.set}), judge ${v["no-judge"] ? "off" : "on"}`);
  if (!v.approved) { console.log("Dry plan only. Pass --approved after the user approves paid calls."); process.exit(0); }
  const j = v["no-judge"] ? undefined : judgeFromEnv();
  console.log(JSON.stringify(await runEval(opts, { runTask: runCaviaTask, judge: j?.judge, judgeModel: j?.model }), null, 2));
  process.exit(0);
}
