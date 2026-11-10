import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSystem, candidateMessage, loadRefs, parseAnchorAnswer, runAnchor, type Ref } from "./anchor.ts";

const refs: Ref[] = Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, title: `Ref ${i + 1}`, url: `https://r${i + 1}.example`, page_start: `text ${i + 1}` }));

describe("parseAnchorAnswer", () => {
  test("rank is 1 + references not beaten; beating none is rank 11", () => {
    expect(parseAnchorAnswer('{"stronger_than":[4,5,6,7,8,9,10],"reason":"接近第 4 名"}')).toMatchObject({ valid: true, rank: 4, inversions: 0 });
    expect(parseAnchorAnswer('{"stronger_than":[1,2,3,4,5,6,7,8,9,10],"reason":"x"}')).toMatchObject({ valid: true, rank: 1 });
    expect(parseAnchorAnswer('{"stronger_than":[],"reason":"x"}')).toMatchObject({ valid: true, rank: 11 });
  });
  test("a fenced single object is accepted; inconsistent answers count inversions", () => {
    const p = parseAnchorAnswer('```json\n{"stronger_than":[2,10],"reason":"x"}\n```');
    expect(p).toMatchObject({ valid: true, rank: 9 });
    expect((p as any).inversions).toBeGreaterThan(0);
  });
  test("anything else is no answer", () => {
    for (const bad of ["push", '{"stronger_than":[1,1],"reason":"x"}', '{"stronger_than":[0],"reason":"x"}', '{"stronger_than":[11],"reason":"x"}', '{"stronger_than":["1"],"reason":"x"}', '{"stronger_than":[1]}', '{"stronger_than":[1],"reason":" "}', 'prefix {"stronger_than":[1],"reason":"x"}', "[]"])
      expect(parseAnchorAnswer(bad).valid).toBe(false);
  });
});

describe("prompts", () => {
  test("system prompt lists the references in order and carries no labels", () => {
    const s = buildSystem(refs);
    expect(s.indexOf("Ref 1")).toBeLessThan(s.indexOf("Ref 10"));
    expect(s).toContain("rank 1 is the one she most wants pushed");
    expect(/must_read|tier|gold/i.test(s)).toBe(false);
  });
  test("candidate message holds only title, url and page start", () => {
    const m = candidateMessage({ id: "9", title: "T", url: "U", page_start: "P" });
    expect(m).toContain('"title": "T"');
    expect(m).not.toContain('"id"');
  });
  test("loadRefs refuses an unconfirmed order", () => {
    const d = mkdtempSync(join(tmpdir(), "anch-"));
    writeFileSync(join(d, "ranking.json"), JSON.stringify({ order: ["1"], confirmed: false }));
    expect(() => loadRefs(d, d)).toThrow(/not confirmed/);
  });
});

describe("runAnchor", () => {
  function setup() {
    const d = mkdtempSync(join(tmpdir(), "anch-"));
    mkdirSync(join(d, "v9"), { recursive: true });
    writeFileSync(join(d, "v9", "system-prompt.md"), buildSystem(refs));
    writeFileSync(join(d, "cases.jsonl"), ["a", "b"].map((id) => JSON.stringify({ id, tags: [], meta: {}, prompt: `Title: T${id}\nProject URL: u\n\n\`\`\`text\npage ${id}\n\`\`\`\n` })).join("\n") + "\n");
    writeFileSync(join(d, "gold.jsonl"), "");
    return d;
  }
  const fake = (calls: string[]) => async (_a: object, _m: string, prompt: string) => {
    calls.push(prompt);
    return { task_id: "t", transcript: [{ role: "assistant", parts: [{ type: "text", text: '{"stronger_than":[5,6,7,8,9,10],"reason":"接近第 5 名"}' }] }], usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: "stop" } as any;
  };
  test("writes one row per (post, rep) and resumes without re-calling", async () => {
    const d = setup();
    const calls: string[] = [];
    const o = { dir: d, agentDir: join(d, "v9"), variant: "v9", outName: "run", model: "m", reps: 2, timeoutS: 5, concurrency: 2, refs };
    const r1 = await runAnchor(o, { runTask: fake(calls) });
    expect(r1).toMatchObject({ ran: 4, rows: 4, errors: 0 });
    const rows = readFileSync(join(d, "run", "results.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows.every((r) => r.answer.rank === 5)).toBe(true);
    await runAnchor(o, { runTask: fake(calls) });
    expect(calls.length).toBe(4);
  });
  test("a system prompt that drifted from the anchors is refused", async () => {
    const d = setup();
    writeFileSync(join(d, "v9", "system-prompt.md"), buildSystem(refs) + "\nextra");
    await expect(runAnchor({ dir: d, agentDir: join(d, "v9"), variant: "v9", outName: "run", model: "m", reps: 1, timeoutS: 5, concurrency: 1, refs }, { runTask: fake([]) })).rejects.toThrow(/does not match/);
  });
});
