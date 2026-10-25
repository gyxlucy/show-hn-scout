import { expect, test } from "bun:test";
import { runScout, slackPayload, type Candidate, type Deps, type Judgement, type State } from "./core.ts";
import { buildPrompt } from "./prompt.ts";

const cand = (id: number, age = 3): Candidate => ({ id, title: `post ${id}`, url: `https://example.com/${id}`, age_hours: age, run_id: "r1" });

function harness(over: Partial<Deps> & { answers?: Record<number, Judgement | { error: string }> } = {}) {
  const posted: number[] = [];
  const notes: string[] = [];
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
    post: async ({ id }) => void posted.push(id),
    postNote: async (t) => void notes.push(t),
    save: () => {},
    now: () => new Date("2026-10-25T00:00:00Z"),
    promptSha: "abc",
    minAgeHours: 0,
    maxPushes: 8,
    maxJudgements: 40,
    maxAttempts: 3,
    concurrency: 2,
    log: () => {},
    ...over,
  };
  return { deps, posted, notes, judged, state };
}

test("first run seeds the backlog and neither judges nor posts", async () => {
  const h = harness({ firstRun: true, candidates: [cand(1), cand(2)] });
  const s = await runScout(h.deps);
  expect(s.seeded).toBe(2);
  expect(h.judged).toHaveLength(0);
  expect(h.posted).toHaveLength(0);
  expect(h.state.items["1"].status).toBe("backlog");
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
    post: async ({ id }) => {
      if (fail) throw new Error("HTTP 500");
      posted.push(id);
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

test("the per-run cap keeps the newest posts, suppresses the rest, and says so once", async () => {
  const h = harness({ maxPushes: 2, candidates: [cand(5), cand(4), cand(3), cand(2)] });
  const s = await runScout(h.deps);
  expect(h.posted).toEqual([5, 4]);
  expect(s.suppressed).toBe(2);
  expect(h.state.items["3"].status).toBe("suppressed");
  expect(h.notes).toHaveLength(1);
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

test("Slack payload escapes untrusted text and only links real http(s) URLs", () => {
  const p = slackPayload(42, { title: "<!channel> A & B <script>", url: "javascript:alert(1)", reason: "<@U123> see <http://evil|click>", age_hours: 0.25 });
  const body = JSON.stringify(p);
  expect(body).not.toContain("<!channel>");
  expect(body).not.toContain("<@U123>");
  expect(body).not.toContain("javascript:");
  expect(body).toContain("https://news.ycombinator.com/item?id=42");
  expect(body).toContain("15 分钟前");
});

test("the notification text does not repeat a Show HN prefix the title already has", () => {
  const p = slackPayload(1, { title: "Show HN: Foo", url: "https://foo.dev", reason: "r", age_hours: 2 });
  expect(p.text).toBe("Show HN: Foo");
  expect(slackPayload(1, { title: "Foo", url: "https://foo.dev", reason: "r", age_hours: 2 }).text).toBe("Show HN: Foo");
});

test("the live prompt is the eval prompt: starts with the contract header and omits votes and verdicts", () => {
  const prompt = buildPrompt({ id: 1, title: "T", url: "https://x.y", item: { time: 1760000000, by: "a" }, sources: [] });
  expect(prompt.startsWith("# Candidate Show HN post\n")).toBe(true);
  expect(prompt).not.toMatch(/score|points|rank/i);
});
