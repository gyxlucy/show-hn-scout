#!/usr/bin/env bun
// Runner for the stage-1 judge hillclimb: thin wrapper around runEval (../show-hn-scout/run.ts).
// Lever: system prompt only. Model is fixed; request.json must equal baseline's. One real Cavia task per (case, rep).
// Cases = train60 (60) + fresh-test (30) in one set; the split lives in _state.json (train_ids / test_ids).
//
//   bun .evals/stage1-judge/run.ts --variant baseline|v1|v2|v3 [--reps 3] [--concurrency 6] [--cases 31,32] --approved
//
// Without --approved it prints the resolved scope only. Resumes by (case, rep). Reason judge is OFF (not needed for precision/recall).
// Harness gate: the first approved run pins sha256 of `harness_paths` into _state.json; any later change stops the run until the
// user passes --approve-harness (a prompt-only round never touches those files).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { runEval, type Opts } from "../show-hn-scout/run.ts";
import { runCaviaTask } from "../show-hn-scout/cavia.ts";
import { loadCases, loadGold } from "../show-hn-scout/lib.ts";

const HERE = import.meta.dir;
export const MODEL = "claude-haiku-5-5";
const statePath = join(HERE, "_state.json");
const state = JSON.parse(readFileSync(statePath, "utf8"));

const { values: v } = parseArgs({ options: {
  variant: { type: "string" }, reps: { type: "string", default: "3" }, concurrency: { type: "string", default: "6" }, cases: { type: "string" },
  "timeout-s": { type: "string", default: "300" }, approved: { type: "boolean", default: false }, "approve-harness": { type: "boolean", default: false },
} });
if (!v.variant || !/^(baseline|v\d+)$/.test(v.variant)) throw new Error("--variant baseline|vN is required");
const vdir = join(HERE, v.variant);
if (!existsSync(join(vdir, "system-prompt.md"))) throw new Error(`${vdir}/system-prompt.md missing`);
if (v.variant !== "baseline" && !existsSync(join(vdir, "change.md"))) throw new Error(`${v.variant}/change.md missing: record the hypothesis before running`);

// Lever guard: only system-prompt.md may differ from baseline.
const reqOf = (d: string) => JSON.stringify(JSON.parse(existsSync(join(d, "request.json")) ? readFileSync(join(d, "request.json"), "utf8") : "{}"));
if (reqOf(vdir) !== reqOf(join(HERE, "baseline"))) throw new Error("request.json differs from baseline: the lever is the system prompt only");

// Harness gate.
const harnessSha = createHash("sha256").update(state.harness_paths.map((p: string) => `${p}\n${readFileSync(resolve(HERE, "../..", p), "utf8")}`).join("\n--\n")).digest("hex");
if (v.approved) {
  if (!state.harness_sha || v["approve-harness"]) { state.harness_sha = harnessSha; writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n"); }
  else if (state.harness_sha !== harnessSha) throw new Error("harness_paths changed since the pinned hash; show the diff to the user and re-run with --approve-harness after their OK");
}

const opts: Opts = {
  dir: HERE, agentDir: vdir, variant: v.variant, model: MODEL, reps: +v.reps!, timeoutS: +v["timeout-s"]!, concurrency: +v.concurrency!, only: v.cases?.split(","),
};
const gold = loadGold(HERE), cases = loadCases(HERE).filter((c) => gold.has(c.id) && (!opts.only || opts.only.includes(c.id)));
const tr = cases.filter((c) => state.train_ids.includes(c.id)).length, te = cases.filter((c) => state.test_ids.includes(c.id)).length;
console.log(`Resolved: ${cases.length} cases (train ${tr}, test ${te}) x ${opts.reps} reps = ${cases.length * opts.reps} tasks on ${MODEL}, variant ${v.variant}, judge off, concurrency ${opts.concurrency}`);
if (cases.length !== tr + te) throw new Error("a case is in neither train_ids nor test_ids");
if (!v.approved) { console.log("Dry plan only. Pass --approved after the user approves paid calls."); process.exit(0); }
if (!existsSync(join(vdir, "summary.json"))) {
  const desc = existsSync(join(vdir, "change.md")) ? readFileSync(join(vdir, "change.md"), "utf8").split("\n")[0].replace(/^#\s*/, "") : "v3 control re-run";
  writeFileSync(join(vdir, "summary.json"), JSON.stringify({ description: desc, label: v.variant, target: "system_prompt", model: MODEL, system_prompt_sha256: createHash("sha256").update(readFileSync(join(vdir, "system-prompt.md"), "utf8")).digest("hex"), structured: false, strength: false }, null, 2));
}
console.log(JSON.stringify(await runEval(opts, { runTask: runCaviaTask }), null, 2));
process.exit(0);
