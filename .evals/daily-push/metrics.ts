// Pure metric functions for the daily-push eval. No I/O, no model calls: everything here is deterministic and unit-tested.
// A "day" is a pool of posts (what the first-stage judge pushed) with the reader's tiers; a variant turns the pool into
// at most K selected posts; these functions score that selection.
export type Tier = "pass" | "push" | "must_read";
export const K = 10; // the daily cap

export const isWanted = (t: Tier) => t !== "pass";

export type Selection = { n: number; wanted: number; must: number; pass: number; p_wanted: number | null };

/** Score one selected set against the tiers. `p_wanted` is null for an empty selection (undefined, never 0). */
export function selectionMetrics(selected: string[], tier: Record<string, Tier>): Selection {
  const s = [...new Set(selected)];
  for (const id of s) if (!(id in tier)) throw new Error(`selected post ${id} has no tier`);
  const wanted = s.filter((id) => isWanted(tier[id])).length;
  const must = s.filter((id) => tier[id] === "must_read").length;
  return { n: s.length, wanted, must, pass: s.length - wanted, p_wanted: s.length ? wanted / s.length : null };
}

/** What a random top-k would contain on average (hypergeometric mean). */
export function randomExpectation(pool: string[], tier: Record<string, Tier>, k = K) {
  const n = pool.length, kk = Math.min(k, n);
  const share = (f: (t: Tier) => boolean) => (kk * pool.filter((id) => f(tier[id])).length) / n;
  return { wanted: share(isWanted), must: share((t) => t === "must_read"), pass: share((t) => t === "pass"), k: kk };
}

const lchoose = (n: number, k: number) => {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
};
/** P(X >= k) when drawing `n` posts without replacement from `N` posts of which `K_` are wanted (exact, one-sided). */
export function hypergeomUpper(N: number, K_: number, n: number, k: number): number {
  let p = 0;
  for (let x = Math.max(k, 0); x <= Math.min(n, K_); x++) {
    if (n - x > N - K_) continue;
    p += Math.exp(lchoose(K_, x) + lchoose(N - K_, n - x) - lchoose(N, n));
  }
  return Math.min(1, p);
}

/** The live cap: the newest `k` posts of the pool (ISO timestamps compare as strings). Ties break by id for determinism. */
export function newestK(pool: string[], posted: Record<string, string>, k = K): string[] {
  return [...pool].sort((a, b) => (posted[b] < posted[a] ? -1 : posted[b] > posted[a] ? 1 : a < b ? -1 : 1)).slice(0, k);
}

export function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

/** Spearman correlation with average ranks for ties. */
export function spearman(x: number[], y: number[]): number {
  const rk = (v: number[]) => {
    const idx = v.map((_, i) => i).sort((a, b) => v[a] - v[b]);
    const r = new Array(v.length).fill(0);
    for (let i = 0; i < idx.length; ) {
      let j = i;
      while (j + 1 < idx.length && v[idx[j + 1]] === v[idx[i]]) j++;
      for (let t = i; t <= j; t++) r[idx[t]] = (i + j) / 2;
      i = j + 1;
    }
    return r;
  };
  const a = rk(x), b = rk(y), ma = mean(a), mb = mean(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

/** Position bias of one ranked rep: correlation between the slot a post was shown in (C01..) and the rank it received. */
export function positionBias(labels: Record<string, string>, ranking: string[]): number {
  const slot: Record<string, number> = {};
  for (const [lab, id] of Object.entries(labels)) slot[id] = Number(lab.slice(1));
  const rank: Record<string, number> = {};
  ranking.forEach((id, i) => (rank[id] = i));
  const ids = ranking.slice().sort();
  return spearman(ids.map((id) => slot[id]), ids.map((id) => rank[id]));
}

/** Mean pairwise overlap of the selected sets across reps, as a share of k. Null with fewer than two reps. */
export function meanOverlap(sets: string[][], k = K): number | null {
  if (sets.length < 2) return null;
  const v: number[] = [];
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
    const a = new Set(sets[i]);
    v.push(sets[j].filter((x) => a.has(x)).length / k);
  }
  return mean(v);
}

/** Probability that a random wanted post has a better (lower) score than a random pass; ties count half. */
export function auc(wantedScores: number[], passScores: number[]): number {
  let w = 0;
  for (const a of wantedScores) for (const b of passScores) w += a < b ? 1 : a === b ? 0.5 : 0;
  return w / (wantedScores.length * passScores.length);
}

/** Selection of an anchor variant: posts whose mean rank over reps is within the declared bar (rank <= pushRank). */
export function anchorPushSet(meanRank: Record<string, number>, pushRank: number): string[] {
  return Object.keys(meanRank).filter((id) => meanRank[id] <= pushRank).sort();
}

/** Top-k posts by rank (lower is better). Ties break by the secondary score then id, so the result is deterministic. */
export function topByRank(rank: Record<string, number>, k = K, tie: Record<string, number> = {}): string[] {
  return Object.keys(rank)
    .sort((a, b) => rank[a] - rank[b] || (tie[a] ?? 0) - (tie[b] ?? 0) || (a < b ? -1 : 1))
    .slice(0, k);
}

export type Guardrail = { id: string; text: string; pass: boolean };
/** G1-G6, declared 2026-11-10 before the day-1104 ranker runs (see .evals/show-hn-scout/day-rank-stats.py). Rankers only. */
export function guardrails(a: { wanted: number[]; must: number[]; pass: number[]; random: { wanted: number; must: number; pass: number }; newest: { wanted: number }; valid: number; reps: number; bias: number; overlap: number | null }): Guardrail[] {
  const w = mean(a.wanted);
  return [
    { id: "G1", text: "wanted in top 10 > random and > newest-10 (mean over reps)", pass: w > a.random.wanted && w > a.newest.wanted },
    { id: "G2", text: "must-read in top 10 >= random + 1", pass: mean(a.must) >= a.random.must + 1 },
    { id: "G3", text: "gold-pass in top 10 < random", pass: mean(a.pass) < a.random.pass },
    { id: "G4", text: "every planned rep valid", pass: a.valid === a.reps },
    { id: "G5", text: "position bias mean |rho| < 0.2", pass: a.bias < 0.2 },
    { id: "G6", text: "top-10 overlap between reps >= 60%", pass: a.overlap != null && a.overlap >= 0.6 },
  ];
}
