// The model-visible prompt for one Show HN post. Shared by the eval (build-cases.ts) and the live bot (scout.ts)
// so that what the agent was scored on is byte-for-byte what it sees in production.
// Never put votes, ranking, sampling origin or any earlier verdict in here.

export type Comment = { id: string; by: string; is_author: boolean; text: string };
export type Source = { url: string; kind: string; status: string; error?: string; text?: string; comments?: Comment[] };
export type Packet = { id: number; title: string; url: string; item: { time: number; by: string }; sources: Source[] };

// A fence longer than any backtick run in the text, so untrusted page text cannot close it.
export function fence(text: string, lang = "text"): string {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const f = "`".repeat(Math.max(3, longest + 1));
  return `${f}${lang}\n${text}\n${f}`;
}

export const iso = (t: number) => new Date(t * 1000).toISOString().replace(".000Z", "Z");

export function buildPrompt(packet: Packet, snapshots: string[] = []): string {
  const page = packet.sources.find((s) => s.kind === "project_page");
  const hn = packet.sources.find((s) => s.kind === "hn_discussion");
  const comments = hn?.comments ?? [];
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
  return parts.join("\n") + "\n";
}
