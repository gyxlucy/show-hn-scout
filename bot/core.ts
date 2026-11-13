// Live Show HN Scout loop, free of I/O so it can be tested offline: dedupe, judge, post, remember.
// The judgement itself is the eval-selected agent (select_project); this file only wires it to Slack.

export type Decision = "push" | "pass" | "unsure";

export type Candidate = { id: number; title: string; url: string; age_hours: number; run_id: string };

export type Record_ = {
  decision?: Decision;
  reason?: string;
  title: string;
  url: string;
  age_hours: number;
  judged_at?: string;
  prompt_sha?: string;
  /** judged | backlog (seen at first run, never judged) | error (gave up) | suppressed (push over the cap) */
  status: "judged" | "backlog" | "error" | "suppressed";
  posted: boolean;
  attempts: number;
  last_error?: string;
};

export type State = { version: 1; items: Record<string, Record_> };

export type Judgement = { decision: Decision; reason: string };

/** A post judged push in this run, handed to the ranker when there are more of them than the cap allows. */
export type RankItem = { id: number; title: string; prompt: string };

export type Outgoing = { id: number; record: Record_ };

export type Deps = {
  state: State;
  /** True when no state existed before this run: seed the backlog instead of flooding the channel. */
  firstRun: boolean;
  candidates: Candidate[];
  /** Download evidence for these ids and return the prompt per id (missing id = could not build). */
  prepare: (ids: number[]) => Promise<Map<number, string>>;
  /** One select_project call. Throws or returns an error string on harness failure. */
  judge: (prompt: string) => Promise<Judgement | { error: string }>;
  /** One call per run: everything to announce goes out as a single message, best first. `ranked` says stage 2 ordered it. */
  post: (items: Outgoing[], meta: { ranked: boolean }) => Promise<void>;
  /**
   * Optional stage 2: ranking of every push of this run (newest first). A post is only sent if stage 1 said push AND it is
   * within the top `cap` here. A single push has nothing to be compared with and goes out as rank 1.
   * Returns every id once, best first. null, a throw or an invalid order means "could not rank": nothing is posted.
   */
  rank?: (items: RankItem[], cap: number) => Promise<number[] | null>;
  save: (state: State) => void;
  now: () => Date;
  promptSha: string;
  minAgeHours: number;
  /** First run only: judge (and post) unseen posts newer than this many hours instead of seeding them. 0 = seed everything. */
  backfillHours: number;
  maxPushes: number;
  maxJudgements: number;
  maxAttempts: number;
  concurrency: number;
  log: (line: string) => void;
};

export type Summary = {
  candidates: number;
  seeded: number;
  judged: number;
  push: number;
  pass: number;
  unsure: number;
  posted: number;
  suppressed: number;
  /** True when the posts that went out were chosen by the ranker rather than by recency. */
  ranked: boolean;
  /** True when stage 2 was on but failed, so none of this run's pushes were posted (they are marked suppressed). */
  rank_failed: boolean;
  errors: number;
  retried_posts: number;
};

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

export async function runScout(d: Deps): Promise<Summary> {
  const s: Summary = { candidates: d.candidates.length, seeded: 0, judged: 0, push: 0, pass: 0, unsure: 0, posted: 0, suppressed: 0, ranked: false, rank_failed: false, errors: 0, retried_posts: 0 };
  const sid = (id: number) => String(id);

  // First run ever: remember what is already there so we do not post the whole backlog at once.
  // With backfillHours > 0 the recent part of the backlog is judged normally and only the older part is seeded.
  if (d.firstRun) {
    for (const c of d.candidates) {
      if (d.backfillHours > 0 && c.age_hours <= d.backfillHours) continue;
      d.state.items[sid(c.id)] = { status: "backlog", title: c.title, url: c.url, age_hours: c.age_hours, posted: false, attempts: 0 };
      s.seeded++;
    }
    d.save(d.state);
    d.log(`first run: seeded ${s.seeded} existing posts${d.backfillHours > 0 ? `, backfilling the last ${d.backfillHours}h` : ", nothing judged or posted"}`);
    if (d.backfillHours <= 0) return s;
  }

  // Everything that is going out this run is collected here and sent as ONE Slack message at the end.
  let pushesLeft = d.maxPushes;
  const outbox: Outgoing[] = [];
  const retriedIds = new Set<number>();
  const take = (id: number, rec: Record_): boolean => {
    if (pushesLeft <= 0) {
      rec.status = "suppressed";
      s.suppressed++;
      d.save(d.state);
      return false;
    }
    pushesLeft--;
    outbox.push({ id, record: rec });
    return true;
  };
  const flush = async () => {
    if (!outbox.length) return;
    try {
      await d.post(outbox, { ranked: s.ranked });
    } catch (e) {
      for (const o of outbox) o.record.last_error = `slack: ${(e as Error).message}`;
      d.log(`post failed for ${outbox.length} posts: ${(e as Error).message}`);
      d.save(d.state);
      return;
    }
    for (const o of outbox) {
      o.record.posted = true;
      s.posted++;
      if (retriedIds.has(o.id)) s.retried_posts++;
    }
    d.save(d.state);
  };

  // Earlier pushes that Slack rejected go into the same message again, without calling the model again.
  // Newest first (HN ids grow over time).
  for (const [id, rec] of Object.entries(d.state.items).sort((x, y) => Number(y[0]) - Number(x[0]))) {
    if (rec.status === "judged" && rec.decision === "push" && !rec.posted) {
      if (take(Number(id), rec)) retriedIds.add(Number(id));
    }
  }

  const fresh = d.candidates
    .filter((c) => !d.state.items[sid(c.id)])
    .filter((c) => c.age_hours >= d.minAgeHours)
    .slice(0, d.maxJudgements);
  // Retry posts that failed judging earlier (attempt counter below), but only while under the attempt limit.
  const retry = d.candidates.filter((c) => {
    const r = d.state.items[sid(c.id)];
    return r && r.status === "judged" && !r.decision && r.attempts < d.maxAttempts;
  });
  const todo = [...new Map([...retry, ...fresh].map((c) => [c.id, c])).values()];
  if (!todo.length) {
    d.log("nothing new to judge");
    d.save(d.state);
    await flush();
    return s;
  }

  const prompts = await d.prepare(todo.map((c) => c.id));
  const results = new Map<number, Judgement | { error: string }>();
  await pool(todo, d.concurrency, async (c) => {
    const prompt = prompts.get(c.id);
    if (!prompt) {
      results.set(c.id, { error: "evidence could not be prepared" });
      return;
    }
    try {
      results.set(c.id, await d.judge(prompt));
    } catch (e) {
      results.set(c.id, { error: (e as Error).message });
    }
  });

  // Record every judgement first. Posting comes after, so the ranker sees the whole day's pushes at once.
  const pushed: number[] = [];
  for (const c of todo) {
    const key = sid(c.id);
    const prev = d.state.items[key];
    const attempts = (prev?.attempts ?? 0) + 1;
    const base = { title: c.title, url: c.url, age_hours: c.age_hours };
    const r = results.get(c.id)!;
    if ("error" in r) {
      s.errors++;
      // Never record a failure as pass. Keep it retryable until the attempt limit, then give up visibly.
      d.state.items[key] = attempts >= d.maxAttempts
        ? { ...base, status: "error", posted: false, attempts, last_error: r.error }
        : { ...base, status: "judged", posted: false, attempts, last_error: r.error };
      d.log(`judge failed for ${c.id} (attempt ${attempts}): ${r.error}`);
      d.save(d.state);
      continue;
    }
    s.judged++;
    s[r.decision]++;
    const rec: Record_ = { ...base, status: "judged", decision: r.decision, reason: r.reason, judged_at: d.now().toISOString(), prompt_sha: d.promptSha, posted: false, attempts };
    d.state.items[key] = rec;
    d.save(d.state);
    if (r.decision === "push") pushed.push(c.id);
  }

  // Which pushes go out, and in what order. A post must be a stage-1 push AND inside the ranker's top `cap`; they go out
  // best first, however few that is (nothing is added to fill the cap). If the ranker is on but cannot rank, nothing is
  // posted: an unranked post has not met the stage-2 condition. Without a ranker (--no-rank) the newest pushes go out.
  let order = pushed;
  const failRank = (why: string) => {
    s.rank_failed = true;
    order = [];
    for (const id of pushed) {
      const rec = d.state.items[sid(id)];
      rec.status = "suppressed";
      rec.last_error = `ranking failed: ${why}`;
      s.suppressed++;
    }
    d.save(d.state);
    d.log(`ranking failed, nothing posted from ${pushed.length} pushes: ${why}`);
  };
  if (d.rank && pushed.length > 1) {
    try {
      const items: RankItem[] = pushed.map((id) => ({ id, title: d.state.items[sid(id)].title, prompt: prompts.get(id)! }));
      const ranked = await d.rank(items, pushesLeft);
      const valid = ranked && ranked.length === pushed.length && new Set(ranked).size === pushed.length && ranked.every((id) => pushed.includes(id));
      if (valid) {
        order = ranked;
        s.ranked = true;
      } else {
        failRank("no valid ranking");
      }
    } catch (e) {
      failRank((e as Error).message);
    }
  }
  // Posts over the cap are only marked suppressed in the state; the channel is not told about them.
  for (const id of order) take(id, d.state.items[sid(id)]);
  await flush();

  return s;
}

// ---- Slack message -------------------------------------------------------------------------------------------

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

/** Slack allows 50 blocks per message; a header plus a divider and a section per post must fit. */
export const MAX_DIGEST_POSTS = 24;

/** Slack mrkdwn escaping matters: titles and reasons are untrusted text and must not make mentions or links. */
export function slackPayload(items: Outgoing[], meta: { ranked: boolean }) {
  if (items.length > MAX_DIGEST_POSTS) throw new Error(`too many posts for one Slack message: ${items.length}`);
  const hn = (id: number) => `https://news.ycombinator.com/item?id=${id}`;
  const blocks: unknown[] = [
    { type: "section", text: { type: "mrkdwn", text: `*Show HN 今日推荐 · ${items.length} 条*${meta.ranked ? "(按排序从高到低)" : ""}` } },
  ];
  for (const [i, { id, record: r }] of items.entries()) {
    const link = /^https?:\/\/[^\s<>|]+$/.test(r.url) ? r.url : hn(id);
    const title = esc(clip(r.title.replace(/\s+/g, " "), 150));
    const reason = esc(clip((r.reason ?? "").replace(/\s+/g, " "), 600));
    const age = r.age_hours < 1 ? `${Math.round(r.age_hours * 60)} 分钟前` : `${r.age_hours.toFixed(1)} 小时前`;
    blocks.push({ type: "divider" });
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `*${i + 1}. <${link}|${title}>*\n${reason}\n<${hn(id)}|HN 讨论> · 发布于 ${age}` } });
  }
  // Notification fallback; Slack parses mrkdwn here too, so the title is escaped as well.
  const first = items[0] ? esc(clip(items[0].record.title.replace(/\s+/g, " "), 80)) : "";
  return { text: `Show HN 今日推荐 ${items.length} 条:${first}${items.length > 1 ? " 等" : ""}`, blocks };
}
