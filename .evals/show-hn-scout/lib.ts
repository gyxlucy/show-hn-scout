// Pure helpers for the Show HN Scout eval: case/gold loading, answer parsing, grading, aggregation, traces.
// No network and no model calls here, so everything in this file is testable offline.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Message } from "./cavia.ts";

export const DIR = import.meta.dir;
export type Decision = "push" | "pass" | "unsure";
export const DECISIONS: readonly Decision[] = ["push", "pass", "unsure"];

export type Case = { id: string; tags: string[]; prompt: string; meta: Record<string, any> };
export type Gold = { id: string; expected: { decision: Decision }; reason: string };

const jsonl = <T>(path: string): T[] =>
  existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

export const loadCases = (dir = DIR) => jsonl<Case>(join(dir, "cases.jsonl"));
export function loadGold(dir = DIR): Map<string, Decision> {
  const m = new Map<string, Decision>();
  for (const g of jsonl<Gold>(join(dir, "gold.jsonl"))) {
    if (!DECISIONS.includes(g.expected.decision)) throw new Error(`bad gold decision for ${g.id}`);
    m.set(g.id, g.expected.decision);
  }
  return m;
}

/** The text of the agent's final assistant message (text parts only; digest and tool parts are never read). */
export function finalText(transcript: Message[]): string {
  const last = transcript.findLast((m) => m.role === "assistant");
  return (last?.parts ?? []).filter((p) => p.type === "text").map((p) => p.text as string).join("").trim();
}

export type Parsed = { valid: true; decision: Decision; reason: string } | { valid: false; error: string };

/** Strict contract: one JSON object {decision, reason}. A single ```json fence around it is tolerated. No answer is never a pass. */
export function parseAnswer(text: string): Parsed {
  let t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  if (fenced) t = fenced[1].trim();
  if (!t) return { valid: false, error: "empty reply" };
  let obj: any;
  try {
    obj = JSON.parse(t);
  } catch {
    return { valid: false, error: "reply is not a single JSON object" };
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { valid: false, error: "JSON is not an object" };
  if (!DECISIONS.includes(obj.decision)) return { valid: false, error: `decision must be push|pass|unsure, got ${JSON.stringify(obj.decision)}` };
  if (typeof obj.reason !== "string" || !obj.reason.trim()) return { valid: false, error: "reason must be a non-empty string" };
  return { valid: true, decision: obj.decision, reason: obj.reason.trim() };
}

export const METRICS = ["agree", "precision", "recall", "specificity", "unsure", "valid"] as const;
export type Grade = Record<(typeof METRICS)[number], number | null>;

/**
 * Per-row grade. Ratio metrics are only defined where their denominator row exists, so the mean over the
 * non-null rows IS the pooled ratio:
 *   agree        1 if decision == human label (unsure counts as a miss)
 *   precision    among rows where the agent pushed: 1 if the human also said push
 *   recall       among rows the human said push: 1 if the agent pushed
 *   specificity  among rows the human said pass: 1 if the agent did not push (unsure does not interrupt)
 *   unsure       1 if the agent said unsure (coverage = 1 - unsure)
 *   valid        1 if the reply met the output contract
 * An invalid reply is "no answer": it is not scored as a pass, so only agree/valid are defined for it.
 */
export function gradeAnswer(p: Parsed, gold: Decision): Grade {
  if (!p.valid) return { agree: 0, precision: null, recall: gold === "push" ? 0 : null, specificity: null, unsure: null, valid: 0 };
  const pushed = p.decision === "push";
  return {
    agree: p.decision === gold ? 1 : 0,
    precision: pushed ? (gold === "push" ? 1 : 0) : null,
    recall: gold === "push" ? (pushed ? 1 : 0) : null,
    specificity: gold === "pass" ? (pushed ? 0 : 1) : null,
    unsure: p.decision === "unsure" ? 1 : 0,
    valid: 1,
  };
}

// ---------- aggregation (case-clustered bootstrap, so reps of one case never count as independent) ----------

export type Scored = { prompt_id: string; tags: string[]; status: string; grade: Record<string, number | null> };
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function rng(seed: number) {
  // mulberry32: seeded so the same rows always give the same interval
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rows that count toward means: status ok only (truncated / refused rows are reported but not averaged in). */
export function aggregate(rows: Scored[], metrics: readonly string[] = METRICS, resamples = 2000) {
  const scored = rows.filter((r) => r.status === "ok");
  const byCase = new Map<string, Scored[]>();
  for (const r of scored) byCase.set(r.prompt_id, [...(byCase.get(r.prompt_id) ?? []), r]);
  const cases = [...byCase.values()];
  const point = (cs: Scored[][], m: string) => mean(cs.flat().map((r) => r.grade[m]).filter((v): v is number => v != null));
  const rand = rng(20261023);
  const out: Record<string, { value: number | null; lo: number | null; hi: number | null; n: number }> = {};
  for (const m of metrics) {
    const value = point(cases, m);
    const n = scored.filter((r) => r.grade[m] != null).length;
    const draws: number[] = [];
    if (cases.length > 1)
      for (let i = 0; i < resamples; i++) {
        const v = point(Array.from({ length: cases.length }, () => cases[Math.floor(rand() * cases.length)]), m);
        if (v != null) draws.push(v);
      }
    draws.sort((a, b) => a - b);
    out[m] = {
      value,
      lo: draws.length > 20 ? draws[Math.floor(0.025 * draws.length)] : null,
      hi: draws.length > 20 ? draws[Math.ceil(0.975 * draws.length) - 1] : null,
      n,
    };
  }
  return out;
}

// ---------- traces ----------

export type Turn = { role: "system" | "user" | "assistant" | "tool_call" | "tool_result"; content: string; thinking?: string; name?: string };
const pretty = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));

/** Cavia UIMessage[] -> the report's trace turns. Digest parts are presentation only and are dropped. */
export function toTrace(systemPrompt: string, transcript: Message[]): { turns: Turn[]; tool_calls: number; tool_errors: number; steps: number } {
  const turns: Turn[] = [{ role: "system", content: systemPrompt }];
  let tool_calls = 0, tool_errors = 0, steps = 0;
  for (const m of transcript) {
    if (m.role === "system") continue;
    let thinking = "";
    for (const p of m.parts ?? []) {
      if (p.type === "text") turns.push({ role: m.role as Turn["role"], content: p.text, ...(thinking ? { thinking } : {}) }), (thinking = "");
      else if (p.type === "reasoning") thinking += (thinking ? "\n" : "") + (p.text ?? "");
      else if (p.type === "dynamic-tool" || String(p.type).startsWith("tool-")) {
        tool_calls++;
        const name = p.type === "dynamic-tool" ? p.toolName : String(p.type).slice(5);
        turns.push({ role: "tool_call", name, content: pretty(p.input ?? {}), ...(thinking ? { thinking } : {}) });
        thinking = "";
        if (p.state === "output-error") tool_errors++;
        if (p.output !== undefined || p.errorText) turns.push({ role: "tool_result", content: pretty(p.output ?? p.errorText) });
      } else if (p.type === "step-start") steps++;
    }
  }
  return { turns, tool_calls, tool_errors, steps };
}
