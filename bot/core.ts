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

export type Deps = {
  state: State;
  /** True when no state existed before this run: seed the backlog instead of flooding the channel. */
  firstRun: boolean;
  candidates: Candidate[];
  /** Download evidence for these ids and return the prompt per id (missing id = could not build). */
  prepare: (ids: number[]) => Promise<Map<number, string>>;
  /** One select_project call. Throws or returns an error string on harness failure. */
  judge: (prompt: string) => Promise<Judgement | { error: string }>;
  post: (c: { id: number; record: Record_; rank?: { pos: number; of: number } }) => Promise<void>;
  postNote?: (text: string) => Promise<void>;
  /**
   * Optional ranking of this run's pushes (newest first). Called only when more posts were pushed than the cap lets through.
   * Returns every id once, best first; null or a throw means "could not rank" and the newest-first order is kept.
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
  const s: Summary = { candidates: d.candidates.length, seeded: 0, judged: 0, push: 0, pass: 0, unsure: 0, posted: 0, suppressed: 0, ranked: false, errors: 0, retried_posts: 0 };
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

  let pushesLeft = d.maxPushes;
  let overflow = 0;
  const postOne = async (id: number, rec: Record_, rank?: { pos: number; of: number }): Promise<boolean> => {
    if (pushesLeft <= 0) {
      rec.status = "suppressed";
      overflow++;
      s.suppressed++;
      d.save(d.state);
      return false;
    }
    try {
      await d.post({ id, record: rec, rank });
      pushesLeft--;
      rec.posted = true;
      s.posted++;
      d.save(d.state);
      return true;
    } catch (e) {
      rec.last_error = `slack: ${(e as Error).message}`;
      d.log(`post failed for ${id}: ${rec.last_error}`);
      d.save(d.state);
      return false;
    }
  };

  // Earlier pushes that Slack rejected are retried without calling the model again.
  for (const [id, rec] of Object.entries(d.state.items)) {
    if (rec.status === "judged" && rec.decision === "push" && !rec.posted) {
      if (await postOne(Number(id), rec)) s.retried_posts++;
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

  // Which pushes go out. With more pushes than the cap, the ranker picks the best ones and they go out best first.
  // If it cannot rank, fall back to the newest-first order (candidates are newest-first), which keeps the freshest posts.
  let order = pushed;
  if (d.rank && pushed.length > pushesLeft && pushed.length > 1) {
    try {
      const items: RankItem[] = pushed.map((id) => ({ id, title: d.state.items[sid(id)].title, prompt: prompts.get(id)! }));
      const ranked = await d.rank(items, pushesLeft);
      const valid = ranked && ranked.length === pushed.length && new Set(ranked).size === pushed.length && ranked.every((id) => pushed.includes(id));
      if (valid) {
        order = ranked;
        s.ranked = true;
      } else {
        d.log("ranking unavailable: posting the newest pushes first");
      }
    } catch (e) {
      d.log(`ranking failed, posting the newest pushes first: ${(e as Error).message}`);
    }
  }
  const useRank = s.ranked;
  for (const [i, id] of order.entries()) await postOne(id, d.state.items[sid(id)], useRank ? { pos: i + 1, of: order.length } : undefined);

  if (overflow && d.postNote) {
    try {
      await d.postNote(`另有 ${overflow} 条 push 因单次上限(${d.maxPushes})未发送${useRank ? ",已按排序保留最靠前的" : ",保留了最新的"},已在状态里标记为 suppressed。`);
    } catch (e) {
      d.log(`note failed: ${(e as Error).message}`);
    }
  }
  return s;
}

// ---- Slack message -------------------------------------------------------------------------------------------

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

/** Slack mrkdwn escaping matters: titles and reasons are untrusted text and must not make mentions or links. */
export function slackPayload(id: number, r: Pick<Record_, "title" | "url" | "reason" | "age_hours">, rank?: { pos: number; of: number }) {
  const hn = `https://news.ycombinator.com/item?id=${id}`;
  const link = /^https?:\/\/[^\s<>|]+$/.test(r.url) ? r.url : hn;
  const title = esc(clip(r.title.replace(/\s+/g, " "), 150));
  const reason = esc(clip((r.reason ?? "").replace(/\s+/g, " "), 600));
  const age = r.age_hours < 1 ? `${Math.round(r.age_hours * 60)} 分钟前` : `${r.age_hours.toFixed(1)} 小时前`;
  return {
    text: /^show hn/i.test(title) ? title : `Show HN: ${title}`, // notification fallback; Slack parses mrkdwn here too, so it is escaped as well
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*<${link}|${title}>*\n${reason}` } },
      { type: "context", elements: [{ type: "mrkdwn", text: `<${hn}|HN 讨论> · 发布于 ${age} · scout v3${rank ? ` · 今日排序 ${rank.pos}/${rank.of}` : ""}` }] },
    ],
  };
}
