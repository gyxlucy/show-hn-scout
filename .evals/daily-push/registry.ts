#!/usr/bin/env bun
// Builds the case registry for the daily-push eval from the existing, already labelled sets in .evals/show-hn-scout.
// Nothing here labels anything new: it joins the sets, records where each label came from and how far each set has been
// used, and writes the sign-off file cases.md plus a programmatic audit. Run: bun .evals/daily-push/registry.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { cardOf } from "../show-hn-scout/rank.ts";
import type { Tier } from "./metrics.ts";

const SRC = resolve(import.meta.dir, "../show-hn-scout");
const OUT = import.meta.dir;
const jl = (p: string): any[] => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

/** How each source set has been used. Taken from change.md files, narrative.md and docs/judger-metrics-report.md. */
export const SETS: Record<string, { dir: string; ids: string; role: string; use: string; held_out: boolean; anchored: string }> = {
  dev: { dir: ".", ids: "01-30", role: "stage-1 judge gold (push/pass)", use: "calibrated rubric v0; v3 prompt names cases 02/12/25/29", held_out: false, anchored: "no prefill (labelled before the assistant suggested anything)" },
  heldout: { dir: "heldout", ids: "31-60", role: "stage-1 gold; also half of train60", use: "chose the winners v1 and v3 twice; train only", held_out: false, anchored: "push/pass labels blind; tiers of the pushes were assistant-suggested then reviewed (see provenance)" },
  "fresh-train": { dir: "fresh-train", ids: "61-90", role: "stage-1 gold; also half of train60", use: "training set for v4 and the ranker designs", held_out: false, anchored: "push/pass cards carried an assistant suggestion, 54 of 60 kept (about 90%); tiers as for heldout" },
  "fresh-test": { dir: "fresh-test", ids: "91-120", role: "stage-1 gold (push/pass); locked", use: "run once for baseline and v3; nothing tuned on it", held_out: true, anchored: "cards carried an assistant suggestion (about 90% kept)" },
  "day-1104": { dir: "day-1104", ids: "HN story ids", role: "daily gold, real day 2026-11-04 (the 54 posts v3 pushed)", use: "judged v7 (G1-G6), v9, v10; posts were looked at three times, v10 reasons written after seeing v9 failures", held_out: false, anchored: "all tiers are the reader's review of an assistant prediction" },
};

type Reg = {
  story_id: number; sets: { set: string; id: string }[]; title: string; url: string; posted: string; prompt_chars: number;
  stage1_label: "push" | "pass" | null; stage1_label_source: string | null; stage1_label_derived: boolean;
  tier: Tier | null; tier_provenance: string | null; anchored: boolean | null;
  daily_day: "day-1104" | "train60-sim" | null; held_out: boolean; status: string; leak_points_by: boolean; card: string;
};

export function buildRegistry() {
  const byStory = new Map<number, Reg>();
  const get = (c: any, set: string): Reg => {
    const sid = c.meta.story_id as number;
    let r = byStory.get(sid);
    if (!r) {
      const card = cardOf(c, { pageChars: 700 });
      r = {
        story_id: sid, sets: [], title: card.title, url: card.url, posted: c.prompt.match(/^Posted \(UTC\): (.*)$/m)?.[1]?.trim() ?? "",
        prompt_chars: c.prompt.length, stage1_label: null, stage1_label_source: null, stage1_label_derived: false, tier: null, tier_provenance: null,
        anchored: null, daily_day: null, held_out: false, status: "", leak_points_by: /\b\d+ points?\s+by\s+\S+/.test(c.prompt), card: card.page_start,
      };
      byStory.set(sid, r);
    }
    if (!r.sets.some((s) => s.set === set)) r.sets.push({ set, id: c.id });
    return r;
  };
  const stage1 = ["dev", "heldout", "fresh-train", "fresh-test"];
  for (const set of stage1) {
    const dir = join(SRC, SETS[set].dir);
    const gold = new Map(jl(join(dir, "gold.jsonl")).map((g) => [g.id, g]));
    for (const c of jl(join(dir, "cases.jsonl"))) {
      const r = get(c, set), g = gold.get(c.id);
      if (!g) throw new Error(`${set}/${c.id} has no gold row`);
      r.stage1_label = g.expected.decision; r.stage1_label_source = g.label_source ?? null;
    }
  }
  // train60 = heldout + fresh-train, with a tier on every post: the simulated day.
  const t60 = new Map(jl(join(SRC, "train60/tier.jsonl")).map((t) => [t.id, t]));
  for (const c of jl(join(SRC, "train60/cases.jsonl"))) {
    const r = get(c, "train60"), t = t60.get(c.id);
    if (!t) throw new Error(`train60/${c.id} has no tier`);
    r.tier = t.tier; r.tier_provenance = t.provenance ?? "human"; r.anchored = /^assistant_suggested/.test(t.provenance ?? ""); r.daily_day = "train60-sim";
  }
  const d1104 = new Map(jl(join(SRC, "day-1104/tier.jsonl")).map((t) => [t.id, t]));
  for (const c of jl(join(SRC, "day-1104/cases.jsonl"))) {
    const r = get(c, "day-1104"), t = d1104.get(c.id);
    if (!t) throw new Error(`day-1104/${c.id} has no tier`);
    r.tier = t.tier; r.tier_provenance = t.provenance; r.anchored = true; r.daily_day = "day-1104";
    r.stage1_label = t.tier === "pass" ? "pass" : "push"; r.stage1_label_source = "derived from tier"; r.stage1_label_derived = true;
  }
  for (const r of byStory.values()) {
    const names = r.sets.map((s) => s.set);
    r.held_out = names.length === 1 && names[0] === "fresh-test";
    r.status = names.map((n) => `${n}: ${SETS[n]?.use ?? "tier overlay of heldout + fresh-train; tuned on (v5-v8 designed on it)"}`).join(" | ");
  }
  return [...byStory.values()].sort((a, b) => a.story_id - b.story_id);
}

export function audit(rows: Reg[]) {
  const tiered = rows.filter((r) => r.tier);
  const urls = new Map<string, number[]>();
  for (const r of rows) urls.set(r.url, [...(urls.get(r.url) ?? []), r.story_id]);
  const dupUrls = [...urls].filter(([u, v]) => u && v.length > 1);
  const count = (xs: (string | null)[]) => xs.reduce<Record<string, number>>((a, x) => ((a[String(x)] = (a[String(x)] ?? 0) + 1), a), {});
  const bySet = (set: string) => rows.filter((r) => r.sets.some((s) => s.set === set));
  return {
    posts: rows.length, tiered: tiered.length,
    per_set: Object.fromEntries(Object.keys(SETS).concat("train60").map((s) => [s, { n: bySet(s).length, stage1: count(bySet(s).map((r) => r.stage1_label)), tier: count(bySet(s).map((r) => r.tier)), anchored: count(bySet(s).map((r) => (r.anchored == null ? null : String(r.anchored)))) }])),
    problems: {
      duplicate_story_ids: 0, // keyed by story id, so impossible by construction
      duplicate_urls_across_posts: dupUrls,
      missing_title_or_url_or_posted: rows.filter((r) => !r.title || !r.url || !r.posted).map((r) => r.story_id),
      empty_page_text: rows.filter((r) => r.card.startsWith("(no page text")).map((r) => r.story_id),
      leaks_points_by_text: rows.filter((r) => r.leak_points_by).map((r) => ({ story_id: r.story_id, sets: r.sets })),
      label_missing: rows.filter((r) => !r.stage1_label).map((r) => r.story_id),
    },
    notes: [
      "day-1104 shares no story id or URL with any other set (checked here by story id and URL).",
      "train60 is a tier overlay on heldout + fresh-train, so those 60 posts are counted once.",
      "A daily 'day' needs tiers: only day-1104 and train60 have them. fresh-test has push/pass only and a first-stage pool of about 17 posts, too few for a top-10 cap.",
    ],
  };
}

const fenceFor = (s: string) => "`".repeat(Math.max(3, ...(s.match(/`+/g) ?? []).map((m) => m.length + 1)));
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

export function casesMd(rows: Reg[], a: ReturnType<typeof audit>) {
  const L: string[] = ["# Daily-push eval cases (sign-off index)", ""];
  L.push(`${rows.length} distinct posts from ${Object.keys(SETS).length} existing labelled sets (no new labels). ${a.tiered} carry a tier and form the two scored days. Source files: \`.evals/show-hn-scout/<set>/{cases,gold,tier}.jsonl\`; the machine-readable join is \`cases/registry.jsonl\`.`, "");
  L.push("## Sets", "", "| set | ids | role | how it has been used | held out | label anchoring |", "|---|---|---|---|---|---|");
  for (const [k, s] of Object.entries(SETS)) L.push(`| ${k} | ${s.ids} | ${cell(s.role)} | ${cell(s.use)} | ${s.held_out ? "yes (locked)" : "no"} | ${cell(s.anchored)} |`);
  L.push(`| train60 | 31-90 | simulated day: tiers on heldout + fresh-train | variants v5-v8 designed on it (feasibility only) | no | tier provenance per post below |`, "");
  L.push("## Scored days", "", "| day | posts | pool for stage 2 | must_read | push | pass | note |", "|---|---|---|---|---|---|---|");
  for (const d of ["day-1104", "train60-sim"] as const) {
    const r = rows.filter((x) => x.daily_day === d), c = (t: Tier) => r.filter((x) => x.tier === t).length;
    L.push(`| ${d} | ${r.length} | ${d === "day-1104" ? "all 54 (the live v3 pushes)" : "34 (v3 pushes, at least half of 3 reps)"} | ${c("must_read")} | ${c("push")} | ${c("pass")} | ${d === "day-1104" ? "real day; every tier is a review of an assistant prediction" : "posts come from many days, so the newest-10 baseline is only a mock"} |`);
  }
  L.push("", "No label exists for posts the judge dropped, so the pipeline's recall (good posts that never reach the pool) cannot be measured here.", "");
  L.push("## Programmatic audit (tier 1)", "", "```json", JSON.stringify(a.problems, null, 2), "```", "");
  L.push("## All posts", "", "`wanted` = tier push or must_read. `anch` = the label was a review of an assistant suggestion. `stage-1` = push/pass gold for the first-stage judge.", "", "| story | sets (id) | day | tier | provenance | anch | stage-1 | title |", "|---|---|---|---|---|---|---|---|");
  for (const r of rows) L.push(`| [${r.story_id}](https://news.ycombinator.com/item?id=${r.story_id}) | ${r.sets.map((s) => `${s.set}(${s.id})`).join(", ")} | ${r.daily_day ?? ""} | ${r.tier ?? ""} | ${r.tier_provenance ?? ""} | ${r.anchored == null ? "" : r.anchored ? "yes" : "no"} | ${r.stage1_label ?? ""}${r.stage1_label_derived ? "*" : ""} | ${cell(r.title).slice(0, 90)} |`);
  L.push("", "\\* derived from the tier (wanted = push).", "", "## What the stage-2 rankers see (the tiered posts)", "", "Title, URL and the first 700 characters of page text, shuffled per rep; no label, tier, votes or posting time.", "");
  for (const r of rows.filter((x) => x.tier)) {
    const body = `${r.title}\n${r.url}\n\n${r.card}`;
    const f = fenceFor(body);
    L.push(`### ${r.story_id}: ${r.daily_day}, ${r.tier}`, "", `${f}text`, body, f, "");
  }
  return L.join("\n");
}

if (import.meta.main) {
  const rows = buildRegistry(), a = audit(rows);
  mkdirSync(join(OUT, "cases"), { recursive: true });
  writeFileSync(join(OUT, "cases/registry.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  writeFileSync(join(OUT, "cases/audit.json"), JSON.stringify(a, null, 2));
  writeFileSync(join(OUT, "cases.md"), casesMd(rows, a));
  console.log(`registry: ${rows.length} posts, ${a.tiered} tiered; problems: ${JSON.stringify(a.problems).slice(0, 600)}`);
}
