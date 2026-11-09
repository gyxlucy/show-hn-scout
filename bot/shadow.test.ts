import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RunTask } from "../.evals/show-hn-scout/cavia.ts";
import type { ShadowItem } from "./core.ts";
import { shadowRank } from "./shadow.ts";

const item = (id: number, posted = true): ShadowItem => ({
  id,
  title: `post ${id}`,
  posted,
  suppressed: !posted,
  prompt: `# Candidate Show HN post\n\nTitle: post ${id}\nProject URL: https://example.com/${id}\n\n## Project page text (fetch status: ok)\n\n\`\`\`text\npage of ${id}\n\`\`\`\n`,
});

// A fake ranker that returns the labels in the order they appear, except it can be told to break one rep.
const fake = (breakRep?: number): RunTask => {
  let n = 0;
  return async (_agent, _model, prompt) => {
    const rep = n++;
    const labels = [...prompt.matchAll(/"id": "(C\d+)"/g)].map((m) => m[1]);
    if (rep === breakRep) return { task_id: "t", model: "m", stop_reason: "stop", error: null, transcript: [{ role: "assistant", parts: [{ type: "text", text: "not json" }] }] };
    const text = JSON.stringify({ ranking: [...labels].reverse(), top_reasons: Object.fromEntries(labels.slice().reverse().slice(0, 10).map((l) => [l, "r"])) });
    return { task_id: "t", model: "m", stop_reason: "stop", error: null, usage: { input_tokens: 1, output_tokens: 1 }, transcript: [{ role: "assistant", parts: [{ type: "text", text }] }] };
  };
};

const opts = (runTask: RunTask, logPath: string | null) => ({
  agent: {}, variant: "v7", model: "m", reps: 3, timeoutS: 5, concurrency: 2, minPool: 3, runTask, logPath, now: () => new Date("2026-11-10T01:07:00Z"), log: () => {},
});

test("logs one row with the pool, posted/suppressed flags and a valid ranking in case ids per rep", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "shadow-")), "bot-state", "shadow-rank.jsonl");
  const items = [item(1), item(2), item(3, false), item(4)];
  const reps = await shadowRank(items, opts(fake(), path));
  expect(reps!.every((r) => r.valid)).toBe(true);
  const row = JSON.parse(readFileSync(path, "utf8").trim());
  expect(row.pool.map((p: any) => [p.id, p.posted, p.suppressed])).toEqual([[1, true, false], [2, true, false], [3, false, true], [4, true, false]]);
  for (const r of row.reps) expect([...r.ranking].sort()).toEqual(["1", "2", "3", "4"]); // every case once, real ids not labels
});

test("an invalid ranking is recorded as invalid, never completed, and does not drop the other reps", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "shadow-")), "s.jsonl");
  const reps = await shadowRank([item(1), item(2), item(3)], opts(fake(1), path));
  expect(reps!.map((r) => r.valid)).toEqual([true, false, true]);
  expect(reps![1].ranking).toEqual([]);
  expect(reps![1].error).toContain("invalid ranking");
});

test("too few pushes: nothing is called and nothing is written; dry run (no log path) writes no file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "shadow-"));
  const path = join(dir, "s.jsonl");
  let called = 0;
  const counting: RunTask = async (...a) => (called++, fake()(...a));
  expect(await shadowRank([item(1), item(2)], opts(counting, path))).toBeNull();
  expect(called).toBe(0);
  expect(existsSync(path)).toBe(false);
  await shadowRank([item(1), item(2), item(3)], opts(counting, null));
  expect(existsSync(path)).toBe(false);
});
