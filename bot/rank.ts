// Stage 2 of the daily push: the v7 listwise ranker orders every post judged push, and the top ones (at most the cap) go to Slack. Several ranking reps (different shuffles) are merged by mean position, which keeps
// the selection steadier than a single rep. Every ranking is logged so it can be compared later with her tiers on the
// same posts (see .evals/show-hn-scout/day-rank-stats.py). If no rep is valid the caller keeps the newest-first order.
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { RunTask } from "../.evals/show-hn-scout/cavia.ts";
import { finalText } from "../.evals/show-hn-scout/lib.ts";
import { buildRankPrompt, cardOf, parseRanking } from "../.evals/show-hn-scout/rank.ts";
import type { RankItem } from "./core.ts";

export type RankOpts = {
  agent: object;
  variant: string;
  model: string;
  reps: number;
  timeoutS: number;
  concurrency: number;
  runTask: RunTask;
  logPath: string | null; // null = print only (dry run)
  now: () => Date;
  log: (line: string) => void;
};

export type RankRep = {
  rep: number;
  seed: number;
  valid: boolean;
  /** case ids, best first (empty when invalid) */
  ranking: string[];
  top_reasons: Record<string, string>;
  error?: string;
  usage?: Record<string, number>;
  latency_s: number;
};

/** Merge valid reps by mean position (0 = best). Ties keep the order of `ids` (newest first). */
export function consensusOrder(ids: string[], reps: Pick<RankRep, "valid" | "ranking">[]): string[] | null {
  const valid = reps.filter((r) => r.valid && r.ranking.length === ids.length);
  if (!valid.length) return null;
  const mean = new Map(ids.map((id) => [id, valid.reduce((a, r) => a + r.ranking.indexOf(id), 0) / valid.length]));
  return [...ids].sort((a, b) => mean.get(a)! - mean.get(b)! || ids.indexOf(a) - ids.indexOf(b));
}

/** Rank `items` (newest first) and return the ids best first, or null when no rep produced a valid ranking. */
export async function rankPushes(items: RankItem[], cap: number, o: RankOpts): Promise<number[] | null> {
  const cards = items.map((i) => cardOf({ id: String(i.id), tags: [], prompt: i.prompt, meta: {} }));
  const reps: RankRep[] = new Array(o.reps);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(o.concurrency, o.reps) }, async () => {
      while (next < o.reps) {
        const rep = next++;
        const seed = rep + 1;
        const t0 = Date.now();
        const { prompt, labels } = buildRankPrompt(cards, seed);
        const fail = (error: string, usage?: Record<string, number>): RankRep => ({ rep, seed, valid: false, ranking: [], top_reasons: {}, error, usage, latency_s: (Date.now() - t0) / 1000 });
        try {
          const run = await o.runTask(o.agent, o.model, prompt, o.timeoutS * 1000);
          if (run.error) { reps[rep] = fail(`cavia: ${run.error}`, run.usage); continue; }
          const parsed = parseRanking(finalText(run.transcript), Object.keys(labels));
          reps[rep] = parsed.valid
            ? {
                rep, seed, valid: true,
                ranking: parsed.ranking.map((l) => labels[l]),
                top_reasons: Object.fromEntries(Object.entries(parsed.top_reasons).map(([l, r]) => [labels[l], r])),
                usage: run.usage, latency_s: (Date.now() - t0) / 1000,
              }
            : fail(`invalid ranking: ${parsed.error}`, run.usage);
        } catch (e) {
          reps[rep] = fail((e as Error).message);
        }
      }
    }),
  );

  const order = consensusOrder(items.map((i) => String(i.id)), reps);
  const row = {
    kind: "rank",
    at: o.now().toISOString(),
    variant: o.variant,
    model: o.model,
    cap,
    pool: items.map((i) => ({ id: i.id, title: i.title })),
    /** Merged order, best first; the first `cap` of it are the posts that go to Slack. null = no valid rep, newest-first used. */
    order: order ? order.map(Number) : null,
    reps,
  };
  const ok = reps.filter((r) => r.valid).length;
  o.log(`ranking: ${items.length} pushes, cap ${cap}, ${ok}/${o.reps} rankings valid${ok < o.reps ? ` (${reps.filter((r) => !r.valid).map((r) => r.error).join("; ").slice(0, 300)})` : ""}`);
  if (o.logPath) {
    mkdirSync(dirname(o.logPath), { recursive: true });
    appendFileSync(o.logPath, JSON.stringify(row) + "\n");
  } else {
    o.log(`[dry-run] rank row: ${JSON.stringify(row).slice(0, 400)}…`);
  }
  return order ? order.map(Number) : null;
}
