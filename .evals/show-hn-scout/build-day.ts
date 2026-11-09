#!/usr/bin/env bun
// Builds an eval set from one real bot day (packets written by fetch-day.py): the posts the live v3 bot pushed that day.
//
//   bun .evals/show-hn-scout/build-day.ts 2026-11-04 [--seen /tmp/seen.json]
//
// Outputs in .evals/show-hn-scout/day-<MMDD>/ :
//   cases.jsonl           model-visible input only, built by the same buildPrompt as the live bot (case id = HN story id)
//   haiku_v3/results.jsonl  the bot's own recorded decision for each post (one live rep, NOT a new model call),
//                         so `rank.ts --pool-from haiku_v3` pools exactly the posts the bot pushed
//   order.json            feed order (newest first) and which posts the live bot actually posted to Slack
// No human labels here: tiers go to tier.jsonl later, from the user's cards.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildPrompt, type Packet } from "../../bot/prompt.ts";

const ROOT = resolve(import.meta.dir, "../..");
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new Error("usage: build-day.ts YYYY-MM-DD [--seen path]");
const seenArg = process.argv.indexOf("--seen");
const seenPath = seenArg >= 0 ? process.argv[seenArg + 1] : "/tmp/seen.json";
const tag = "day-" + date.replaceAll("-", "");
const outDir = join(import.meta.dir, "day-" + date.slice(5).replace("-", ""));
const packetDir = join(ROOT, "data/packets", tag);
const manifest = JSON.parse(readFileSync(join(packetDir, "manifest.json"), "utf8"));
const seen = JSON.parse(readFileSync(seenPath, "utf8")).items as Record<string, any>;

mkdirSync(join(outDir, "haiku_v3"), { recursive: true });
const ids = Object.keys(manifest.pool).sort((a, b) => manifest.pool[a].age_hours - manifest.pool[b].age_hours);
const cases: string[] = [], results: string[] = [];
const order: { id: string; age_hours: number; posted: boolean }[] = [];
for (const id of ids) {
  const p = join(packetDir, `${id}.json`);
  if (!existsSync(p)) throw new Error(`missing packet ${id}`);
  const packet: Packet = JSON.parse(readFileSync(p, "utf8"));
  const page = packet.sources.find((s) => s.kind === "project_page");
  const hn = packet.sources.find((s) => s.kind === "hn_discussion");
  const rec = seen[id];
  cases.push(JSON.stringify({
    id, tags: ["real-day", date], prompt: buildPrompt(packet),
    meta: { story_id: Number(id), split: tag, page_status: page?.status ?? "missing", page_chars: page?.text?.length ?? 0, comments: hn?.comments?.length ?? 0, fetched_at: manifest.fetched_at },
  }));
  results.push(JSON.stringify({
    prompt_id: id, rep: 0, status: "ok", model: "claude-haiku-5-5", source: "bot-state/seen.json (live run, not re-run)",
    prompt_sha: rec.prompt_sha, judged_at: rec.judged_at, answer: { decision: rec.decision, reason: rec.reason },
  }));
  order.push({ id, age_hours: rec.age_hours, posted: !!rec.posted });
}
writeFileSync(join(outDir, "cases.jsonl"), cases.join("\n") + "\n");
writeFileSync(join(outDir, "haiku_v3", "results.jsonl"), results.join("\n") + "\n");
writeFileSync(join(outDir, "order.json"), JSON.stringify({ date, newest_first: order }, null, 1));
console.log(`${cases.length} cases -> ${outDir}; posted to Slack that day: ${order.filter((o) => o.posted).length}`);
