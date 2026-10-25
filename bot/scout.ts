// Show HN Scout, live: collect new Show HN posts, judge each with the eval-selected agent, push the keepers to Slack.
//
//   bun bot/scout.ts --dry-run --no-seed --max-judgements 3   # judge a few, print Slack payloads, post and save nothing
//   bun bot/scout.ts                                          # one real run (what the GitHub Actions cron does)
//
// Env: SLACK_WEBHOOK_URL (required unless --dry-run), PYTHON (default python3), CAVIA_BASE_URL (optional).
// The agent is `.evals/show-hn-scout/<variant>` (system-prompt.md + request.json), called as a real Cavia task,
// with the same prompt builder the eval used (bot/prompt.ts).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadAgent, runCaviaTask } from "../.evals/show-hn-scout/cavia.ts";
import { finalText, parseAnswer } from "../.evals/show-hn-scout/lib.ts";
import { runScout, slackPayload, type Candidate, type State } from "./core.ts";
import { buildPrompt, type Packet } from "./prompt.ts";

const ROOT = resolve(import.meta.dir, "..");
const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const opt = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};

const DRY = flag("dry-run");
const MODEL = opt("model", "claude-haiku-5-5");
const VARIANT = opt("variant", "v3");
const STATE_PATH = resolve(ROOT, opt("state", "bot-state/seen.json"));
const PYTHON = process.env.PYTHON ?? "python3";
const WEBHOOK = process.env.SLACK_WEBHOOK_URL ?? "";

if (!DRY && !/^https:\/\/hooks\.slack\.com\/services\/[\w/]+$/.test(WEBHOOK)) {
  console.error("SLACK_WEBHOOK_URL is missing or not a hooks.slack.com webhook URL (use --dry-run to test without Slack)");
  process.exit(2);
}

function py(args: string[]): string {
  const p = Bun.spawnSync([PYTHON, "-m", "hn_scout", ...args], { cwd: ROOT, env: { ...process.env } });
  if (p.exitCode !== 0) throw new Error(`hn_scout ${args[0]} failed: ${p.stderr.toString().slice(-500)}`);
  return p.stdout.toString();
}

function loadState(): { state: State; firstRun: boolean } {
  if (!existsSync(STATE_PATH)) return { state: { version: 1, items: {} }, firstRun: !flag("no-seed") };
  const s = JSON.parse(readFileSync(STATE_PATH, "utf8")) as State;
  if (s.version !== 1) throw new Error(`unknown state version ${s.version}`);
  return { state: s, firstRun: false };
}

function saveState(s: State) {
  if (DRY) return;
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  const tmp = `${STATE_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(s, null, 1) + "\n");
  renameSync(tmp, STATE_PATH);
}

async function webhook(body: object) {
  const res = await fetch(WEBHOOK, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 100)}`); // the URL itself is never logged
}

const { agent, files } = loadAgent(join(ROOT, ".evals/show-hn-scout", VARIANT));
const promptSha = createHash("sha256")
  .update(files.map((f) => readFileSync(join(ROOT, ".evals/show-hn-scout", VARIANT, f))).join("\n--\n"))
  .digest("hex")
  .slice(0, 12);

if (!flag("skip-collect")) {
  // Two pages of /shownew (the newest ~60 posts) are enough for a half-hourly cron. One /show page is only needed
  // because collect always records it; this bot ignores /show membership.
  const c = JSON.parse(py(["collect", "--pages", opt("pages", "2"), "--show-pages", "1"]));
  console.log(`collect: ${c.new_items} new-feed items, ${c.errors.length} errors${c.errors.length ? ` (${JSON.stringify(c.errors).slice(0, 300)})` : ""}`);
  // A collection that fetched nothing must fail the run loudly, not look like "nothing new".
  if (!c.new_items) throw new Error(`collect fetched no items: ${JSON.stringify(c.errors).slice(0, 300)}`);
}
const candidates: Candidate[] = JSON.parse(py(["candidates"])).map((c: any) => ({
  id: Number(c.id), title: String(c.title ?? ""), url: String(c.url ?? ""), age_hours: Number(c.age_hours ?? 0), run_id: String(c.run_id),
}));
const runOf = new Map(candidates.map((c) => [c.id, c.run_id]));

const { state, firstRun } = loadState();
const summary = await runScout({
  state,
  firstRun,
  candidates,
  prepare: async (ids) => {
    py(["enrich", ...ids.map(String)]);
    const out = new Map<number, string>();
    for (const id of ids) {
      const path = join(ROOT, "data/packets", runOf.get(id)!, `${id}.json`);
      if (existsSync(path)) out.set(id, buildPrompt(JSON.parse(readFileSync(path, "utf8")) as Packet));
    }
    return out;
  },
  judge: async (prompt) => {
    const run = await runCaviaTask(agent, MODEL, prompt, Number(opt("timeout-s", "300")) * 1000);
    if (run.error) return { error: `cavia: ${run.error}` };
    const parsed = parseAnswer(finalText(run.transcript));
    return parsed.valid ? { decision: parsed.decision, reason: parsed.reason } : { error: `invalid answer: ${parsed.error}` };
  },
  post: async ({ id, record }) => {
    const payload = slackPayload(id, record);
    if (DRY) {
      console.log(`[dry-run] would post ${id}: ${JSON.stringify(payload)}`);
      return;
    }
    await webhook(payload);
  },
  postNote: async (text) => (DRY ? console.log(`[dry-run] note: ${text}`) : webhook({ text })),
  save: saveState,
  now: () => new Date(),
  promptSha,
  minAgeHours: Number(opt("min-age-hours", "0")),
  maxPushes: Number(opt("max-pushes", "8")),
  maxJudgements: Number(opt("max-judgements", "40")),
  maxAttempts: 3,
  concurrency: Number(opt("concurrency", "3")),
  log: (l) => console.log(l),
});
console.log(JSON.stringify({ variant: VARIANT, model: MODEL, prompt_sha: promptSha, dry_run: DRY, ...summary }));
