import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RunTask } from "../.evals/show-hn-scout/cavia.ts";
import type { RankItem } from "./core.ts";
import { consensusOrder, rankPushes } from "./rank.ts";

const item = (id: number): RankItem => ({
  id,
  title: `post ${id}`,
  prompt: `# Candidate Show HN post\n\nTitle: post ${id}\nProject URL: https://example.com/${id}\n\n## Project page text (fetch status: ok)\n\n\`\`\`text\npage of ${id}\n\`\`\`\n`,
});

// A fake ranker that returns the labels in the order they appear, except it can be told to break one rep.
const fake = (breakCall?: number): RunTask => {
  let n = 0;
  return async (_agent, _model, prompt) => {
    const rep = n++;
    const labels = [...prompt.matchAll(/"id": "(C\d+)"/g)].map((m) => m[1]);
    if (rep === breakCall) return { task_id: "t", model: "m", stop_reason: "stop", error: null, transcript: [{ role: "assistant", parts: [{ type: "text", text: "not json" }] }] };
    const text = JSON.stringify({ ranking: [...labels].reverse(), top_reasons: Object.fromEntries(labels.slice().reverse().slice(0, 10).map((l) => [l, "r"])) });
    return { task_id: "t", model: "m", stop_reason: "stop", error: null, usage: { input_tokens: 1, output_tokens: 1 }, transcript: [{ role: "assistant", parts: [{ type: "text", text }] }] };
  };
};

const opts = (runTask: RunTask, logPath: string | null) => ({
  agent: {}, variant: "v7", model: "m", reps: 3, timeoutS: 5, concurrency: 2, runTask, logPath, now: () => new Date("2026-11-10T01:07:00Z"), log: () => {},
});

test("returns the merged order in real ids and logs one row with the pool, the cap and a valid ranking per rep", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "rank-")), "bot-state", "rank-log.jsonl");
  const order = await rankPushes([item(1), item(2), item(3), item(4)], 2, opts(fake(), path));
  expect([...order!].sort()).toEqual([1, 2, 3, 4]); // every post once, real ids not labels
  const row = JSON.parse(readFileSync(path, "utf8").trim());
  expect(row.kind).toBe("rank");
  expect(row.cap).toBe(2);
  expect(row.pool.map((p: any) => p.id)).toEqual([1, 2, 3, 4]);
  expect(row.order).toEqual(order);
  expect(row.reps.every((r: any) => r.valid)).toBe(true);
  for (const r of row.reps) expect([...r.ranking].sort()).toEqual(["1", "2", "3", "4"]);
});

test("an invalid answer is asked again once; if the retry is also invalid the rep is recorded invalid, never completed, and the other reps still decide", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "rank-")), "s.jsonl");
  let calls = 0;
  const ok = fake();
  // call 1 and its retry (the 2nd call of that rep) both fail; the others succeed
  const flaky: RunTask = async (a, m, p, t) => { const n = calls++; return n === 1 || n === 2 ? fake(0)(a, m, p, t) : ok(a, m, p, t); };
  const order = await rankPushes([item(1), item(2), item(3)], 1, { ...opts(flaky, path), concurrency: 1 });
  expect(order).not.toBeNull();
  const row = JSON.parse(readFileSync(path, "utf8").trim());
  expect(row.reps.map((r: any) => r.valid)).toEqual([true, false, true]);
  expect(row.reps[1].ranking).toEqual([]);
  expect(row.reps[1].error).toContain("invalid ranking");
});

test("when every rep is invalid there is no order, so the caller keeps newest-first", async () => {
  const bad: RunTask = async () => ({ task_id: "t", model: "m", stop_reason: "stop", error: null, transcript: [{ role: "assistant", parts: [{ type: "text", text: "nope" }] }] });
  const path = join(mkdtempSync(join(tmpdir(), "rank-")), "s.jsonl");
  expect(await rankPushes([item(1), item(2), item(3)], 1, opts(bad, path))).toBeNull();
  expect(JSON.parse(readFileSync(path, "utf8").trim()).order).toBeNull();
});

test("a dry run (no log path) writes no file", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "rank-")), "s.jsonl");
  await rankPushes([item(1), item(2), item(3)], 1, opts(fake(), null));
  expect(existsSync(path)).toBe(false);
});

test("consensus: mean position over valid reps, ties keep the newest-first order, invalid reps are ignored", () => {
  const ids = ["a", "b", "c", "d"];
  const reps = [
    { valid: true, ranking: ["c", "a", "b", "d"] },
    { valid: true, ranking: ["c", "b", "a", "d"] },
    { valid: false, ranking: [] },
  ];
  expect(consensusOrder(ids, reps)).toEqual(["c", "a", "b", "d"]); // a and b tie at 1.5, a comes first
  expect(consensusOrder(ids, [{ valid: false, ranking: [] }])).toBeNull();
  expect(consensusOrder(ids, [{ valid: true, ranking: ["a"] }])).toBeNull(); // wrong length is not a valid ranking
});

test("a retry rescues an invalid first answer", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "rank-")), "s.jsonl");
  let calls = 0;
  const ok = fake();
  const once: RunTask = async (a, m, p, t) => (calls++ === 1 ? fake(0)(a, m, p, t) : ok(a, m, p, t));
  await rankPushes([item(1), item(2), item(3)], 1, { ...opts(once, path), concurrency: 1 });
  const row = JSON.parse(readFileSync(path, "utf8").trim());
  expect(row.reps.map((r: any) => r.valid)).toEqual([true, true, true]);
  expect(row.reps.map((r: any) => r.attempts)).toEqual([1, 2, 1]);
  expect(calls).toBe(4);
});

test("a ranking with a missing reason is still usable; a wrong label set is not", async () => {
  const noReasons: RunTask = async (_a, _m, prompt) => {
    const labels = [...prompt.matchAll(/"id": "(C\d+)"/g)].map((m) => m[1]);
    return { task_id: "t", model: "m", stop_reason: "stop", error: null, transcript: [{ role: "assistant", parts: [{ type: "text", text: JSON.stringify({ ranking: labels, top_reasons: {} }) }] }] };
  };
  expect(await rankPushes([item(1), item(2), item(3)], 1, opts(noReasons, null))).not.toBeNull();
  const wrong: RunTask = async () => ({ task_id: "t", model: "m", stop_reason: "stop", error: null, transcript: [{ role: "assistant", parts: [{ type: "text", text: JSON.stringify({ ranking: ["C01", "C99", "C03"], top_reasons: {} }) }] }] });
  expect(await rankPushes([item(1), item(2), item(3)], 1, opts(wrong, null))).toBeNull();
});
