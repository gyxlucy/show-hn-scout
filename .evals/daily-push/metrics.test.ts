import { describe, expect, test } from "bun:test";
import { K, anchorPushSet, auc, guardrails, hypergeomUpper, meanOverlap, newestK, positionBias, randomExpectation, selectionMetrics, spearman, topByRank, type Tier } from "./metrics.ts";

// 20 posts: p00-p03 must_read, p04-p09 push, p10-p19 pass.
const ids = Array.from({ length: 20 }, (_, i) => `p${String(i).padStart(2, "0")}`);
const tier: Record<string, Tier> = Object.fromEntries(ids.map((id, i) => [id, i < 4 ? "must_read" : i < 10 ? "push" : "pass"]));

describe("selection metrics", () => {
  test("oracle: wanted posts first fills the cap with wanted", () => {
    const m = selectionMetrics(ids.slice(0, K), tier);
    expect(m).toEqual({ n: 10, wanted: 10, must: 4, pass: 0, p_wanted: 1 });
  });
  test("null: reversed oracle picks the passes", () => {
    const m = selectionMetrics([...ids].reverse().slice(0, K), tier);
    expect(m.wanted).toBe(0);
    expect(m.pass).toBe(10);
  });
  test("an empty selection has undefined precision, never 0", () => {
    expect(selectionMetrics([], tier).p_wanted).toBeNull();
  });
  test("unknown posts and duplicates", () => {
    expect(() => selectionMetrics(["nope"], tier)).toThrow();
    expect(selectionMetrics(["p00", "p00"], tier).n).toBe(1);
  });
  test("random expectation equals the base rate times k", () => {
    const r = randomExpectation(ids, tier);
    expect(r.wanted).toBeCloseTo(5);
    expect(r.must).toBeCloseTo(2);
    expect(r.pass).toBeCloseTo(5);
  });
});

describe("hypergeometric tail", () => {
  test("P(X >= 0) is 1 and the oracle is rare", () => {
    expect(hypergeomUpper(20, 10, 10, 0)).toBeCloseTo(1);
    expect(hypergeomUpper(20, 10, 10, 10)).toBeCloseTo(1 / 184756, 8); // 1 / C(20,10)
  });
  test("matches a small hand count", () => {
    // N=4, K=2, n=2: P(X>=1) = 1 - C(2,0)C(2,2)/C(4,2) = 5/6
    expect(hypergeomUpper(4, 2, 2, 1)).toBeCloseTo(5 / 6);
  });
});

describe("baselines and bias", () => {
  test("newest-k sorts by posting time with a deterministic tie-break", () => {
    const posted = { a: "2026-11-04T01:00:00Z", b: "2026-11-04T03:00:00Z", c: "2026-11-04T03:00:00Z", d: "2026-11-04T02:00:00Z" };
    expect(newestK(["a", "b", "c", "d"], posted, 3)).toEqual(["b", "c", "d"]);
  });
  test("spearman of identity and reverse", () => {
    expect(spearman([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
    expect(spearman([1, 1, 1], [1, 2, 3])).toBe(0);
  });
  test("a ranker that copies the shown order has bias 1; a fixed content order has ~0", () => {
    const labels = { C01: "a", C02: "b", C03: "c", C04: "d" };
    expect(positionBias(labels, ["a", "b", "c", "d"])).toBeCloseTo(1);
    expect(positionBias(labels, ["b", "d", "a", "c"])).toBeCloseTo(0); // hand-computed: slots 1,2,3,4 vs ranks 2,0,3,1
  });
  test("overlap needs two reps", () => {
    expect(meanOverlap([["a", "b"]], 2)).toBeNull();
    expect(meanOverlap([["a", "b"], ["a", "c"], ["a", "b"]], 2)).toBeCloseTo((0.5 + 1 + 0.5) / 3);
  });
});

describe("anchor selection and AUC", () => {
  test("push set honours the declared bar and top-k breaks ties deterministically", () => {
    expect(anchorPushSet({ a: 2.9, b: 3, c: 3.1 }, 3)).toEqual(["a", "b"]);
    expect(anchorPushSet({ a: 5 }, 3)).toEqual([]);
    expect(topByRank({ a: 1, b: 1, c: 2 }, 2, { a: 5, b: 4 })).toEqual(["b", "a"]);
  });
  test("auc: perfect, reversed and tied", () => {
    expect(auc([1, 2], [3, 4])).toBe(1);
    expect(auc([3, 4], [1, 2])).toBe(0);
    expect(auc([1], [1])).toBe(0.5);
  });
});

describe("guardrails", () => {
  const base = { wanted: [9, 9], must: [3, 3], pass: [1, 1], random: { wanted: 5, must: 2, pass: 5 }, newest: { wanted: 4 }, valid: 2, reps: 2, bias: 0.1, overlap: 0.7 };
  test("all pass for a good ranker", () => expect(guardrails(base).every((g) => g.pass)).toBe(true));
  test("each guardrail can fail on its own", () => {
    expect(guardrails({ ...base, wanted: [4, 4] })[0].pass).toBe(false);
    expect(guardrails({ ...base, must: [2, 2] })[1].pass).toBe(false);
    expect(guardrails({ ...base, pass: [6, 6] })[2].pass).toBe(false);
    expect(guardrails({ ...base, valid: 1 })[3].pass).toBe(false);
    expect(guardrails({ ...base, bias: 0.3 })[4].pass).toBe(false);
    expect(guardrails({ ...base, overlap: null })[5].pass).toBe(false);
  });
});
