// Builds the eval dataset for the Show HN Scout push/pass/unsure judgment.
//
//   bun .evals/show-hn-scout/build-cases.ts          # (re)build cases.jsonl, gold.jsonl, CASES.md, audit.json
//   bun .evals/show-hn-scout/build-cases.ts --check  # fail if the files on disk differ from a rebuild
//
// Inputs : data/calibration/cases.json (30 frozen cases), the frozen evidence packets/snapshots they
//          point at (SHA-256 verified), data/review/feedback.jsonl (the user's human labels, may not exist).
// Outputs: cases.jsonl  model-visible input only. No assistant verdict, votes, ranking, or sampling origin.
//          gold.jsonl   human labels only, one row per labeled case. Never read by the agent under test.
//          CASES.md     sign-off index for the user.
//          audit.json   tier-1 programmatic checks (eval-audit.md section 1).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const HERE = import.meta.dir;
const ROOT = resolve(HERE, "../..");
const CASES_SRC = join(ROOT, "data/calibration/cases.json");
const FEEDBACK = join(ROOT, "data/review/feedback.jsonl");
const check = process.argv.includes("--check");

type Comment = { id: string; by: string; is_author: boolean; text: string };
type Source = { url: string; kind: string; status: string; error?: string; text?: string; comments?: Comment[] };
type Packet = { id: number; title: string; url: string; item: { time: number; by: string }; sources: Source[] };
type Evidence = { path: string; sha256: string; kind: string };
type SrcCase = {
  id: number; case_id: string; batch: number; split: string; sampling: string; name: string;
  evidence: Evidence[]; observation: { run_id: string; posted_at: number };
  baseline: { decision: string; reason: string; next_check: string };
};

const sha256 = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");
function readVerified(e: Evidence): Buffer {
  const buf = readFileSync(join(ROOT, e.path));
  if (sha256(buf) !== e.sha256) throw new Error(`Evidence hash mismatch: ${e.path}`);
  return buf;
}
// A fence longer than any backtick run in the text, so untrusted page text cannot close it.
function fence(text: string, lang = "text"): string {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const f = "`".repeat(Math.max(3, longest + 1));
  return `${f}${lang}\n${text}\n${f}`;
}
const iso = (t: number) => new Date(t * 1000).toISOString().replace(".000Z", "Z");

const srcCases: SrcCase[] = JSON.parse(readFileSync(CASES_SRC, "utf8"));
const rows: any[] = [];
const audit: any = { problems: [] as string[] };

for (const c of srcCases) {
  const packetEv = c.evidence.find((e) => e.kind === "captured_packet");
  if (!packetEv) throw new Error(`No packet for case ${c.case_id}`);
  const packet: Packet = JSON.parse(readVerified(packetEv).toString("utf8"));
  const browserEv = c.evidence.filter((e) => e.kind !== "captured_packet");
  const page = packet.sources.find((s) => s.kind === "project_page");
  const hn = packet.sources.find((s) => s.kind === "hn_discussion");
  const comments = hn?.comments ?? [];
  const snapshots = browserEv.map((e) => readVerified(e).toString("utf8"));

  const parts: string[] = [
    "# Candidate Show HN post",
    "",
    `Title: ${packet.title}`,
    `Project URL: ${packet.url}`,
    `Posted (UTC): ${iso(packet.item.time)}`,
    "",
    `## Project page text (fetch status: ${page?.status ?? "missing"}${page?.error ? `, ${page.error}` : ""})`,
    "",
    page?.text ? fence(page.text) : "(no text could be extracted from the project page)",
    "",
    `## HN discussion (${comments.length} comment${comments.length === 1 ? "" : "s"})`,
    "",
    ...(comments.length
      ? comments.map((m) => `- ${m.is_author ? "[author]" : "[other]"} ${m.by}: ${m.text.replace(/\s+/g, " ")}`)
      : ["(no comments)"]),
  ];
  snapshots.forEach((s, i) => {
    parts.push("", `## Browser reading snapshot${snapshots.length > 1 ? ` ${i + 1}` : ""} (accessibility tree, read in a browser)`, "", fence(s));
  });
  const prompt = parts.join("\n") + "\n";

  const pageOk = page?.status === "ok" && !!page.text;
  const tags = [
    c.sampling, // tags[0]: random vs purposeful. Never pool the two in one accuracy figure.
    `batch-${String(c.batch).padStart(2, "0")}`,
    snapshots.length ? "browser-snapshot" : pageOk ? "page-text" : "no-page-text",
    comments.some((m) => m.is_author) ? "author-replied" : "no-author-reply",
  ];

  // Leak check: nothing from the assistant's verdict may appear in the model-visible prompt.
  for (const leak of [c.baseline.reason, c.baseline.next_check]) {
    if (leak && prompt.includes(leak)) audit.problems.push(`case ${c.case_id}: assistant baseline text appears in prompt`);
  }

  rows.push({
    id: c.case_id,
    tags,
    prompt,
    meta: {
      story_id: c.id,
      split: c.split,
      run_id: c.observation.run_id,
      evidence: c.evidence.map(({ path, sha256 }) => ({ path, sha256 })),
      page_status: page?.status ?? "missing",
      page_chars: page?.text?.length ?? 0,
      comments: comments.length,
    },
  });
}

// Gold: the user's own labels only, latest label per case wins. Absence means "not yet labeled", never "pass".
const latest = new Map<string, any>();
if (existsSync(FEEDBACK)) {
  for (const line of readFileSync(FEEDBACK, "utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(line);
    if (r.label_source !== "human") throw new Error(`Non-human label in feedback.jsonl: ${line}`);
    latest.set(r.case_id, r);
  }
}
const known = new Set(rows.map((r) => r.id));
for (const id of latest.keys()) if (!known.has(id)) audit.problems.push(`feedback for unknown case ${id}`);
const gold = rows
  .filter((r) => latest.has(r.id))
  .map((r) => {
    const l = latest.get(r.id);
    return {
      id: r.id,
      expected: { decision: l.decision, originality: l.originality, interest: l.interest },
      reason: l.reason,
      label_source: "human",
      recorded_at: l.recorded_at,
      rubric_version: l.rubric_version,
    };
  });

// Tier-1 audit (eval-audit.md section 1): duplicates, balance, length, schema.
const count = (xs: string[]) => xs.reduce<Record<string, number>>((a, x) => ((a[x] = (a[x] ?? 0) + 1), a), {});
const lengths = rows.map((r) => r.prompt.length).sort((a, b) => a - b);
const dupe = (xs: (string | number)[]) => xs.length - new Set(xs).size;
Object.assign(audit, {
  cases: rows.length,
  labeled: gold.length,
  unlabeled: rows.length - gold.length,
  duplicate_ids: dupe(rows.map((r) => r.id)),
  duplicate_story_ids: dupe(rows.map((r) => r.meta.story_id)),
  duplicate_prompts: dupe(rows.map((r) => r.prompt)),
  by_primary_tag: count(rows.map((r) => r.tags[0])),
  by_evidence_tag: count(rows.map((r) => r.tags[2])),
  by_gold_decision: count(gold.map((g) => g.expected.decision)),
  prompt_chars: { min: lengths[0], median: lengths[Math.floor(lengths.length / 2)], max: lengths[lengths.length - 1] },
  note:
    gold.length === 0
      ? "No human labels yet: gold.jsonl is empty. Majority-class baseline, precision and recall are undefined until labels exist."
      : "Report precision/recall per tags[0] group; the random group is the only one that approximates real traffic.",
});
if (audit.duplicate_ids || audit.duplicate_story_ids || audit.duplicate_prompts) audit.problems.push("duplicate cases");
if (rows.some((r) => !r.id || !r.prompt || r.tags.length === 0)) audit.problems.push("malformed row");

const labelOf = (id: string) => (latest.has(id) ? latest.get(id).decision : "pending");
const md = [
  "# Show HN Scout eval cases (sign-off index)",
  "",
  `${rows.length} cases, ${gold.length} human-labeled. Flow: given one Show HN post's evidence, answer \`push\` / \`pass\` / \`unsure\` with a reason.`,
  "",
  "- Model-visible input: `cases.jsonl` (`prompt`). Read it as rendered cards in `review/batch-01.md` to `batch-03.md`.",
  "- Gold: `gold.jsonl`, built only from your labels in `data/review/feedback.jsonl`. Nothing is inferred from the assistant baseline.",
  "- All 30 cases were already used to calibrate the rubric, so this is a development set, not a held-out test.",
  "- The prompt carries title, URL, post time, project page text, the HN comments that existed at capture time, and browser snapshots where used. It omits votes, ranking, sampling origin, and the assistant verdict.",
  "",
  "| id | story | tags | evidence | prompt chars | expected |",
  "|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.id} | [${r.meta.story_id}](https://news.ycombinator.com/item?id=${r.meta.story_id}) | ${r.tags.join(", ")} | page ${r.meta.page_status}, ${r.meta.comments} comments | ${r.prompt.length} | ${labelOf(r.id)} |`),
  "",
].join("\n");

const outputs: Record<string, string> = {
  "cases.jsonl": rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
  "gold.jsonl": gold.map((g) => JSON.stringify(g)).join("\n") + (gold.length ? "\n" : ""),
  "CASES.md": md,
  "audit.json": JSON.stringify(audit, null, 2) + "\n",
};

if (audit.problems.length) {
  console.error("Audit problems:\n" + audit.problems.join("\n"));
  process.exit(1);
}
let stale = 0;
for (const [name, content] of Object.entries(outputs)) {
  const path = join(HERE, name);
  if (check) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== content) (stale++, console.error(`stale: ${name}`));
  } else writeFileSync(path, content);
}
if (check && stale) process.exit(1);
console.log(JSON.stringify(audit, null, 2));
