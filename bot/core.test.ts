import { expect, test } from "bun:test";
import { runScout, slackPayload, type Candidate, type Deps, type Judgement, type Outgoing, type Record_, type State } from "./core.ts";
import { buildPrompt } from "./prompt.ts";

const cand = (id: number, age = 3): Candidate => ({ id, title: `post ${id}`, url: `https://example.com/${id}`, age_hours: age, run_id: "r1" });

function harness(over: Partial<Deps> & { answers?: Record<number, Judgement | { error: string }> } = {}) {
  const posted: number[] = [];
  const batches: number[][] = [];
  const judged: string[] = [];
  const state: State = over.state ?? { version: 1, items: {} };
  const deps: Deps = {
    state,
    firstRun: false,
    candidates: [],
    prepare: async (ids) => new Map(ids.map((i) => [i, `prompt:${i}`])),
    judge: async (p) => {
      judged.push(p);
      const id = Number(p.split(":")[1]);
      return over.answers?.[id] ?? { decision: "push", reason: "有意思" };
    },
    post: async (items) => void (batches.push(items.map((i) => i.id)), posted.push(...items.map((i) => i.id))),
    save: () => {},
    now: () => new Date("2026-10-25T00:00:00Z"),
    promptSha: "abc",
    minAgeHours: 0,
    backfillHours: 0,
    maxPushes: 8,
    maxJudgements: 40,
    maxAttempts: 3,
    concurrency: 2,
    log: () => {},
    ...over,
  };
  return { deps, posted, batches, judged, state };
}

test("first run seeds the backlog and neither judges nor posts", async () => {
  const h = harness({ firstRun: true, candidates: [cand(1), cand(2)] });
  const s = await runScout(h.deps);
  expect(s.seeded).toBe(2);
  expect(h.judged).toHaveLength(0);
  expect(h.posted).toHaveLength(0);
  expect(h.state.items["1"].status).toBe("backlog");
});

test("first run with backfill judges and posts the recent posts and seeds only the older ones", async () => {
  const h = harness({ firstRun: true, backfillHours: 24, candidates: [cand(3, 1), cand(2, 20), cand(1, 30)] });
  const s = await runScout(h.deps);
  expect(h.posted).toEqual([3, 2]);
  expect(s.seeded).toBe(1);
  expect(h.state.items["1"].status).toBe("backlog");
  expect(h.judged).toHaveLength(2);
});

test("only push is posted; pass and unsure are recorded but silent", async () => {
  const h = harness({
    candidates: [cand(1), cand(2), cand(3)],
    answers: { 1: { decision: "push", reason: "a" }, 2: { decision: "pass", reason: "b" }, 3: { decision: "unsure", reason: "c" } },
  });
  const s = await runScout(h.deps);
  expect(h.posted).toEqual([1]);
  expect([s.push, s.pass, s.unsure]).toEqual([1, 1, 1]);
  expect(h.state.items["2"].decision).toBe("pass");
  expect(h.state.items["1"].prompt_sha).toBe("abc");
});

test("a post is never judged or posted twice", async () => {
  const h = harness({ candidates: [cand(1)] });
  await runScout(h.deps);
  await runScout({ ...h.deps });
  expect(h.judged).toHaveLength(1);
  expect(h.posted).toEqual([1]);
});

test("a judge failure is retried, never recorded as pass, and gives up visibly after the attempt limit", async () => {
  const h = harness({ candidates: [cand(1)], answers: { 1: { error: "timeout" } } });
  for (let i = 0; i < 3; i++) await runScout({ ...h.deps });
  expect(h.judged).toHaveLength(3);
  expect(h.state.items["1"].status).toBe("error");
  expect(h.state.items["1"].decision).toBeUndefined();
  await runScout({ ...h.deps });
  expect(h.judged).toHaveLength(3); // gave up, no fourth call
  expect(h.posted).toHaveLength(0);
});

test("a Slack failure keeps the push and retries the post without calling the model again", async () => {
  let fail = true;
  const posted: number[] = [];
  const h = harness({
    candidates: [cand(1)],
    post: async (items) => {
      if (fail) throw new Error("HTTP 500");
      posted.push(...items.map((i) => i.id));
    },
  });
  await runScout(h.deps);
  expect(h.state.items["1"].posted).toBe(false);
  fail = false;
  const s = await runScout({ ...h.deps });
  expect(posted).toEqual([1]);
  expect(s.retried_posts).toBe(1);
  expect(h.judged).toHaveLength(1);
});

test("without a ranker the per-run cap keeps the newest posts and silently suppresses the rest", async () => {
  const h = harness({ maxPushes: 2, candidates: [cand(5), cand(4), cand(3), cand(2)] });
  const s = await runScout(h.deps);
  expect(h.posted).toEqual([5, 4]);
  expect(s.suppressed).toBe(2);
  expect(h.state.items["3"].status).toBe("suppressed");
  await runScout({ ...h.deps });
  expect(h.posted).toEqual([5, 4]); // suppressed posts do not come back
});

test("min age skips too-fresh posts until they age in", async () => {
  const h = harness({ minAgeHours: 2, candidates: [cand(1, 0.5), cand(2, 3)] });
  await runScout(h.deps);
  expect(h.posted).toEqual([2]);
  expect(h.state.items["1"]).toBeUndefined();
});

test("evidence that could not be built counts as a failed attempt, not a pass", async () => {
  const h = harness({ candidates: [cand(1)], prepare: async () => new Map() });
  const s = await runScout(h.deps);
  expect(s.errors).toBe(1);
  expect(h.state.items["1"].decision).toBeUndefined();
});

const out = (id: number, r: Partial<Record_> = {}): Outgoing => ({ id, record: { title: "t", url: "https://e.com", reason: "r", age_hours: 2, status: "judged", posted: false, attempts: 1, ...r } });

test("Slack payload escapes untrusted text and only links real http(s) URLs", () => {
  const p = slackPayload([out(42, { title: "<!channel> A & B <script>", url: "javascript:alert(1)", reason: "<@U123> see <http://evil|click>", age_hours: 0.25 })], { ranked: false });
  const body = JSON.stringify(p);
  expect(body).not.toContain("<!channel>");
  expect(body).not.toContain("<@U123>");
  expect(body).not.toContain("javascript:");
  expect(body).toContain("https://news.ycombinator.com/item?id=42");
  expect(body).toContain("15 分钟前");
});

test("all posts of a run go out as one message, numbered in the given order, without revealing how many were held back", () => {
  const p = slackPayload([out(3, { title: "Third" }), out(1, { title: "First" })], { ranked: true });
  const body = JSON.stringify(p);
  expect(body).toContain("今日推荐 · 2 条");
  expect(body.indexOf("1. <")).toBeLessThan(body.indexOf("2. <"));
  expect(body.indexOf("Third")).toBeLessThan(body.indexOf("First"));
  expect(p.blocks.length).toBe(1 + 2 * 2);
  expect(() => slackPayload(Array.from({ length: 25 }, (_, i) => out(i)), { ranked: true })).toThrow();
  expect(slackPayload(Array.from({ length: 24 }, (_, i) => out(i)), { ranked: true }).blocks.length).toBeLessThanOrEqual(50);
});

test("the live prompt is the eval prompt: starts with the contract header and omits votes and verdicts", () => {
  const prompt = buildPrompt({ id: 1, title: "T", url: "https://x.y", item: { time: 1760000000, by: "a" }, sources: [] });
  expect(prompt.startsWith("# Candidate Show HN post\n")).toBe(true);
  expect(prompt).not.toMatch(/score|points|rank/i);
});

test("with more pushes than the cap the ranker chooses and the winners are posted best first, with their rank; the rest stay silent", async () => {
  const seen: number[][] = [];
  const caps: number[] = [];
  const metas: any[] = [];
  const posted: number[] = [];
  const h = harness({
    maxPushes: 2,
    candidates: [cand(5), cand(4), cand(3), cand(2)],
    answers: { 4: { decision: "pass", reason: "x" } },
    post: async (items, meta) => void (posted.push(...items.map((i) => i.id)), metas.push(meta)),
    rank: async (items, cap) => {
      seen.push(items.map((i) => i.id));
      caps.push(cap);
      return [2, 5, 3];
    },
  });
  const s = await runScout(h.deps);
  expect(seen).toEqual([[5, 3, 2]]); // only this run's pushes, newest first, prompts attached
  expect(caps).toEqual([2]);
  expect(posted).toEqual([2, 5]);
  expect(metas).toEqual([{ ranked: true }]);
  expect(s.ranked).toBe(true);
  expect(s.suppressed).toBe(1);
  expect(h.state.items["3"].status).toBe("suppressed");
});

test("every push goes through the ranker even under the cap; only as many as there are pushes are posted, in ranked order", async () => {
  let called = 0;
  const h = harness({
    maxPushes: 10,
    candidates: [cand(3), cand(2), cand(1)],
    rank: async (items) => (called++, [1, 3, 2]),
  });
  const s = await runScout(h.deps);
  expect(called).toBe(1);
  expect(h.posted).toEqual([1, 3, 2]); // not padded to 10, nothing suppressed
  expect(s.ranked).toBe(true);
  expect(s.suppressed).toBe(0);
});

test("a single push has nothing to be ranked against and is posted as it is; no push means no post and no ranking", async () => {
  let called = 0;
  const rank = async () => (called++, null);
  const one = harness({ candidates: [cand(2), cand(1)], answers: { 1: { decision: "pass", reason: "x" } }, rank });
  await runScout(one.deps);
  expect(one.posted).toEqual([2]);
  const none = harness({ candidates: [cand(1)], answers: { 1: { decision: "pass", reason: "x" } }, rank });
  const s = await runScout(none.deps);
  expect(none.posted).toEqual([]);
  expect(s.posted).toBe(0);
  expect(called).toBe(0);
});

test("if the ranker fails (throw, null or a bad order) nothing is posted: unranked posts have not met stage 2", async () => {
  for (const rank of [async () => { throw new Error("ranker down"); }, async () => null, async () => [5, 5, 3], async () => [5, 3]]) {
    const h = harness({ maxPushes: 2, candidates: [cand(5), cand(3), cand(2)], rank });
    const s = await runScout(h.deps);
    expect(h.posted).toEqual([]);
    expect(s.ranked).toBe(false);
    expect(s.rank_failed).toBe(true);
    expect(["5", "3", "2"].map((k) => h.state.items[k].status)).toEqual(["suppressed", "suppressed", "suppressed"]);
    expect(h.state.items["5"].last_error).toContain("ranking failed");
    await runScout({ ...h.deps });
    expect(h.posted).toEqual([]); // they do not come back on the next run
  }
});

test("one run sends exactly one Slack message, and a failed send retries them all together next run", async () => {
  let fail = true;
  const h = harness({
    candidates: [cand(3), cand(2), cand(1)],
    post: async (items) => {
      if (fail) throw new Error("HTTP 500");
      h.batches.push(items.map((i) => i.id));
    },
  });
  await runScout(h.deps);
  expect(h.batches).toEqual([]);
  fail = false;
  const s = await runScout({ ...h.deps });
  expect(h.batches).toEqual([[3, 2, 1]]);
  expect(s.retried_posts).toBe(3);
  const h2 = harness({ candidates: [cand(3), cand(2), cand(1)] });
  await runScout(h2.deps);
  expect(h2.batches).toEqual([[3, 2, 1]]);
});
