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
  /** Compact card text kept while a push waits for the next digest, so it can be ranked with later posts. Dropped afterwards. */
  rank_prompt?: string;
};

export type State = { version: 1; items: Record<string, Record_>; /** ISO time of the last digest that was sent (or found empty) */ last_digest_at?: string };

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
   * Optional stage 2, run on digest days: ranking of every push waiting for the digest (newest first, possibly several days
   * of them). A post is only sent if stage 1 said push AND it is within the top `cap` here. A single push has nothing to be compared with and goes out as rank 1.
   * Returns every id once, best first. null, a throw or an invalid order means "could not rank": nothing is posted and the pushes stay pending.
   */
  rank?: (items: RankItem[], cap: number) => Promise<number[] | null>;
  save: (state: State) => void;
  /** Minimum hours between digests. 0 = a digest on every run. Stage 1 still runs on every run; pushes wait until a digest is due. */
  digestGapHours: number;
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
  /** True when stage 2 was on but failed: nothing was posted and the pushes stay pending for the next run. */
  rank_failed: boolean;
  /** Whether a digest was due in this run. */
  digest_due: boolean;
  /** Pushes still waiting for a digest after this run. */
  pending: number;
  errors: number;
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
  const s: Summary = { candidates: d.candidates.length, seeded: 0, judged: 0, push: 0, pass: 0, unsure: 0, posted: 0, suppressed: 0, ranked: false, rank_failed: false, digest_due: false, pending: 0, errors: 0 };
  const sid = (id: number) => String(id);

  const isPending = (r: Record_) => r.status === "judged" && r.decision === "push" && !r.posted;
  const countPending = () => Object.values(d.state.items).filter(isPending).length;

  // Digest: pushes pile up (stage 1 runs every day) and go out together, ranked as one pool, in ONE Slack message.
  // A post is sent only if stage 1 said push AND it is inside the ranker's top `maxPushes` of the whole pool.
  // Fewer pushes than the cap: only those are sent (never padded). The rest stay silent (marked suppressed).
  // If the ranker is on but cannot rank, nothing is sent and every push stays pending for the next run.
  const digest = async () => {
    const last = d.state.last_digest_at ? Date.parse(d.state.last_digest_at) : NaN;
    const sinceH = Number.isNaN(last) ? Infinity : (d.now().getTime() - last) / 3_600_000;
    s.digest_due = sinceH >= d.digestGapHours;
    if (!s.digest_due) {
      s.pending = countPending();
      d.log(`digest not due (${sinceH.toFixed(1)}h since the last one, gap ${d.digestGapHours}h); ${s.pending} pushes waiting`);
      return;
    }
    // Newest first: HN ids grow over time.
    const pending = Object.entries(d.state.items).filter(([, r]) => isPending(r)).sort((x, y) => Number(y[0]) - Number(x[0])).map(([id]) => Number(id));
    const stamp = () => {
      d.state.last_digest_at = d.now().toISOString();
      d.save(d.state);
    };
    if (!pending.length) {
      d.log("digest due, no pushes pending");
      stamp();
      return;
    }
    let order = pending;
    if (d.rank && pending.length > 1) {
      try {
        const items: RankItem[] = pending.map((id) => {
          const r = d.state.items[sid(id)];
          return { id, title: r.title, prompt: r.rank_prompt ?? compactPrompt(r.title, r.url, "") };
        });
        const ranked = await d.rank(items, d.maxPushes);
        if (ranked && ranked.length === pending.length && new Set(ranked).size === pending.length && ranked.every((id) => pending.includes(id))) {
          order = ranked;
          s.ranked = true;
        } else {
          s.rank_failed = true;
          d.log(`ranking failed (no valid ranking): nothing posted, ${pending.length} pushes stay pending`);
        }
      } catch (e) {
        s.rank_failed = true;
        d.log(`ranking failed (${(e as Error).message}): nothing posted, ${pending.length} pushes stay pending`);
      }
      if (s.rank_failed) {
        s.pending = pending.length;
        return;
      }
    }
    const chosen = order.slice(0, d.maxPushes);
    const outbox: Outgoing[] = chosen.map((id) => ({ id, record: d.state.items[sid(id)] }));
    try {
      await d.post(outbox, { ranked: s.ranked });
    } catch (e) {
      for (const o of outbox) o.record.last_error = `slack: ${(e as Error).message}`;
      d.log(`post failed for ${outbox.length} posts, they stay pending: ${(e as Error).message}`);
      d.save(d.state);
      s.pending = pending.length;
      return;
    }
    for (const o of outbox) {
      o.record.posted = true;
      delete o.record.rank_prompt;
      s.posted++;
    }
    // Posts outside the top of the pool are only marked suppressed in the state; the channel is not told about them.
    for (const id of order.slice(d.maxPushes)) {
      const r = d.state.items[sid(id)];
      r.status = "suppressed";
      delete r.rank_prompt;
      s.suppressed++;
    }
    stamp();
  };

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
    await digest();
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

  // Record every judgement first. Pushes stay pending until a digest is due.
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
    if (r.decision === "push") rec.rank_prompt = compactPrompt(c.title, c.url, pageTextOf(prompts.get(c.id) ?? ""));
    d.state.items[key] = rec;
    d.save(d.state);
  }

  await digest();
  s.pending = countPending();
  return s;
}

// ---- Slack message -------------------------------------------------------------------------------------------

/** What the ranker needs of a pushed post (title, URL, start of the page text), small enough to keep in the state file. */
export function compactPrompt(title: string, url: string, page: string): string {
  return `Title: ${title.replace(/\s+/g, " ")}\nProject URL: ${url}\n\n\`\`\`text\n${page}\n\`\`\`\n`;
}
function pageTextOf(prompt: string): string {
  const page = prompt.match(/```text\n([\s\S]*?)\n```/)?.[1] ?? "";
  return page.replace(/\s+/g, " ").replace(/`{3,}/g, "").trim().slice(0, 1500);
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

/** Slack allows 50 blocks per message; a header plus a divider and a section per post must fit. */
export const MAX_DIGEST_POSTS = 24;

/** Slack mrkdwn escaping matters: titles and reasons are untrusted text and must not make mentions or links. */
export function slackPayload(items: Outgoing[], meta: { ranked: boolean; now?: Date }) {
  if (items.length > MAX_DIGEST_POSTS) throw new Error(`too many posts for one Slack message: ${items.length}`);
  const hn = (id: number) => `https://news.ycombinator.com/item?id=${id}`;
  const blocks: unknown[] = [
    { type: "section", text: { type: "mrkdwn", text: `*Show HN 精选 · ${items.length} 条*${meta.ranked ? "(按排序从高到低)" : ""}` } },
  ];
  for (const [i, { id, record: r }] of items.entries()) {
    const link = /^https?:\/\/[^\s<>|]+$/.test(r.url) ? r.url : hn(id);
    const title = esc(clip(r.title.replace(/\s+/g, " "), 150));
    const reason = esc(clip((r.reason ?? "").replace(/\s+/g, " "), 600));
    // age_hours was measured when the post was judged; a post may have waited for the digest since.
    const waited = r.judged_at && meta.now ? Math.max(0, (meta.now.getTime() - Date.parse(r.judged_at)) / 3_600_000) : 0;
    const h = r.age_hours + (Number.isFinite(waited) ? waited : 0);
    const age = h < 1 ? `${Math.round(h * 60)} 分钟前` : h < 48 ? `${h.toFixed(1)} 小时前` : `${Math.round(h / 24)} 天前`;
    blocks.push({ type: "divider" });
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `*${i + 1}. <${link}|${title}>*\n${reason}\n<${hn(id)}|HN 讨论> · 发布于 ${age}` } });
  }
  // Notification fallback; Slack parses mrkdwn here too, so the title is escaped as well.
  const first = items[0] ? esc(clip(items[0].record.title.replace(/\s+/g, " "), 80)) : "";
  return { text: `Show HN 精选 ${items.length} 条:${first}${items.length > 1 ? " 等" : ""}`, blocks };
}
