// Shadow ranking: after the daily run has judged and posted, rank that run's pushes with the v7 ranker and log the
// result. It never changes what was posted. The log is the evidence for deciding whether ranking should replace the
// newest-first cap: compare it later with her tiers on the same posts (see .evals/show-hn-scout/day-rank-stats.py).
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { RunTask } from "../.evals/show-hn-scout/cavia.ts";
import { finalText } from "../.evals/show-hn-scout/lib.ts";
import { buildRankPrompt, cardOf, parseRanking } from "../.evals/show-hn-scout/rank.ts";
import type { ShadowItem } from "./core.ts";

export type ShadowOpts = {
  agent: object;
  variant: string;
  model: string;
  reps: number;
  timeoutS: number;
  concurrency: number;
  /** Fewer pushes than this are not worth ranking. */
  minPool: number;
  runTask: RunTask;
  logPath: string | null; // null = print only (dry run)
  now: () => Date;
  log: (line: string) => void;
};

export type ShadowRep = {
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

export async function shadowRank(items: ShadowItem[], o: ShadowOpts): Promise<ShadowRep[] | null> {
  if (items.length < o.minPool) {
    o.log(`shadow ranking skipped: ${items.length} pushes (< ${o.minPool})`);
    return null;
  }
  const cards = items.map((i) => cardOf({ id: String(i.id), tags: [], prompt: i.prompt, meta: {} }));
  const reps: ShadowRep[] = new Array(o.reps);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(o.concurrency, o.reps) }, async () => {
      while (next < o.reps) {
        const rep = next++;
        const seed = rep + 1;
        const t0 = Date.now();
        const { prompt, labels } = buildRankPrompt(cards, seed);
        const fail = (error: string, usage?: Record<string, number>): ShadowRep => ({ rep, seed, valid: false, ranking: [], top_reasons: {}, error, usage, latency_s: (Date.now() - t0) / 1000 });
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

  const row = {
    kind: "shadow-rank",
    at: o.now().toISOString(),
    variant: o.variant,
    model: o.model,
    // The 10 the live cap actually posted are the `posted` ones; `suppressed` ones were pushes over the cap.
    pool: items.map((i) => ({ id: i.id, title: i.title, posted: i.posted, suppressed: i.suppressed })),
    reps,
  };
  const ok = reps.filter((r) => r.valid).length;
  o.log(`shadow ranking: ${items.length} pushes, ${ok}/${o.reps} rankings valid${ok < o.reps ? ` (${reps.filter((r) => !r.valid).map((r) => r.error).join("; ").slice(0, 300)})` : ""}`);
  if (o.logPath) {
    mkdirSync(dirname(o.logPath), { recursive: true });
    appendFileSync(o.logPath, JSON.stringify(row) + "\n");
  } else {
    o.log(`[dry-run] shadow row: ${JSON.stringify(row).slice(0, 400)}…`);
  }
  return reps;
}
