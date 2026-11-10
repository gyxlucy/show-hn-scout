# Daily-push eval cases (sign-off index)

174 distinct posts from 5 existing labelled sets (no new labels). 114 carry a tier and form the two scored days. Source files: `.evals/show-hn-scout/<set>/{cases,gold,tier}.jsonl`; the machine-readable join is `cases/registry.jsonl`.

## Sets

| set | ids | role | how it has been used | held out | label anchoring |
|---|---|---|---|---|---|
| dev | 01-30 | stage-1 judge gold (push/pass) | calibrated rubric v0; v3 prompt names cases 02/12/25/29 | no | no prefill (labelled before the assistant suggested anything) |
| heldout | 31-60 | stage-1 gold; also half of train60 | chose the winners v1 and v3 twice; train only | no | push/pass labels blind; tiers of the pushes were assistant-suggested then reviewed (see provenance) |
| fresh-train | 61-90 | stage-1 gold; also half of train60 | training set for v4 and the ranker designs | no | push/pass cards carried an assistant suggestion, 54 of 60 kept (about 90%); tiers as for heldout |
| fresh-test | 91-120 | stage-1 gold (push/pass); locked | run once for baseline and v3; nothing tuned on it | yes (locked) | cards carried an assistant suggestion (about 90% kept) |
| day-1104 | HN story ids | daily gold, real day 2026-11-04 (the 54 posts v3 pushed) | judged v7 (G1-G6), v9, v10; posts were looked at three times, v10 reasons written after seeing v9 failures | no | all tiers are the reader's review of an assistant prediction |
| train60 | 31-90 | simulated day: tiers on heldout + fresh-train | variants v5-v8 designed on it (feasibility only) | no | tier provenance per post below |

## Scored days

| day | posts | pool for stage 2 | must_read | push | pass | note |
|---|---|---|---|---|---|---|
| day-1104 | 54 | all 54 (the live v3 pushes) | 8 | 18 | 28 | real day; every tier is a review of an assistant prediction |
| train60-sim | 60 | 34 (v3 pushes, at least half of 3 reps) | 13 | 14 | 33 | posts come from many days, so the newest-10 baseline is only a mock |

No label exists for posts the judge dropped, so the pipeline's recall (good posts that never reach the pool) cannot be measured here.

## Programmatic audit (tier 1)

```json
{
  "duplicate_story_ids": 0,
  "duplicate_urls_across_posts": [],
  "missing_title_or_url_or_posted": [],
  "empty_page_text": [
    50175741,
    50196376,
    50196795,
    50197593,
    50197685,
    50217369,
    50218772,
    50222559,
    50223763,
    50228301,
    50232415,
    50232722,
    50233315,
    50236286,
    50237273,
    50241871,
    50352087,
    50356948,
    50361909
  ],
  "leaks_points_by_text": [
    {
      "story_id": 50198769,
      "sets": [
        {
          "set": "heldout",
          "id": "46"
        },
        {
          "set": "train60",
          "id": "46"
        }
      ]
    },
    {
      "story_id": 50215652,
      "sets": [
        {
          "set": "fresh-train",
          "id": "71"
        },
        {
          "set": "train60",
          "id": "71"
        }
      ]
    },
    {
      "story_id": 50216053,
      "sets": [
        {
          "set": "fresh-train",
          "id": "62"
        },
        {
          "set": "train60",
          "id": "62"
        }
      ]
    },
    {
      "story_id": 50219762,
      "sets": [
        {
          "set": "fresh-train",
          "id": "63"
        },
        {
          "set": "train60",
          "id": "63"
        }
      ]
    },
    {
      "story_id": 50238873,
      "sets": [
        {
          "set": "fresh-test",
          "id": "119"
        }
      ]
    }
  ],
  "label_missing": []
}
```

## All posts

`wanted` = tier push or must_read. `anch` = the label was a review of an assistant suggestion. `stage-1` = push/pass gold for the first-stage judge.

| story | sets (id) | day | tier | provenance | anch | stage-1 | title |
|---|---|---|---|---|---|---|---|
| [50173195](https://news.ycombinator.com/item?id=50173195) | dev(24) |  |  |  |  | push | Show HN: Flyte devbox now runs GPU workloads on Apple Silicon |
| [50173690](https://news.ycombinator.com/item?id=50173690) | dev(05) |  |  |  |  | pass | Show HN: Melra – pause ambiguous MCP writes instead of blindly retrying |
| [50174185](https://news.ycombinator.com/item?id=50174185) | dev(30) |  |  |  |  | push | Show HN: One click flight booking in Claude |
| [50174244](https://news.ycombinator.com/item?id=50174244) | dev(08) |  |  |  |  | pass | Show HN: Drop in a folder of HTML and get back a private URL |
| [50174998](https://news.ycombinator.com/item?id=50174998) | dev(06) |  |  |  |  | pass | Show HN: Reverse engineering the ANE to run Gemma 4 26B at 100 Tok/s |
| [50175741](https://news.ycombinator.com/item?id=50175741) | dev(20) |  |  |  |  | pass | Show HN: Pope Pendle Pro |
| [50176914](https://news.ycombinator.com/item?id=50176914) | dev(10) |  |  |  |  | push | Show HN: Grafista – AI graphic designer built to fight slop |
| [50178183](https://news.ycombinator.com/item?id=50178183) | dev(04) |  |  |  |  | push | Show HN: Non-call, an on-call simulator mini-game |
| [50179254](https://news.ycombinator.com/item?id=50179254) | dev(02) |  |  |  |  | pass | Show HN: Commit code into a neural network, see what it remembers (browser demo) |
| [50179603](https://news.ycombinator.com/item?id=50179603) | dev(18) |  |  |  |  | push | Show HN: A self-hosted flight and ship tracker you can rewind |
| [50179736](https://news.ycombinator.com/item?id=50179736) | dev(26) |  |  |  |  | push | Show HN: Context Window, what changed in AI labs' own documents |
| [50179958](https://news.ycombinator.com/item?id=50179958) | dev(27) |  |  |  |  | pass | Show HN: Japanese Paper Marbling in the Browser |
| [50180037](https://news.ycombinator.com/item?id=50180037) | dev(14) |  |  |  |  | pass | Show HN: Omalauncher Agentic Android Launcher |
| [50180216](https://news.ycombinator.com/item?id=50180216) | dev(16) |  |  |  |  | pass | Show HN: PySide6 Blueprints - a free book on building Qt Widgets apps in Python |
| [50180257](https://news.ycombinator.com/item?id=50180257) | dev(15) |  |  |  |  | push | Show HN: Uberblok – an interactive museum of ZFS internals |
| [50180280](https://news.ycombinator.com/item?id=50180280) | dev(25) |  |  |  |  | pass | Show HN: KeibiDrop – Work on remote large files on-demand (no upload/download) |
| [50180337](https://news.ycombinator.com/item?id=50180337) | dev(28) |  |  |  |  | pass | Show HN: Memdoor – A coding agent that can build and run headless workflows |
| [50180355](https://news.ycombinator.com/item?id=50180355) | dev(12) |  |  |  |  | pass | Show HN: TUI to manage firewall and HTTP server, in Rust |
| [50181222](https://news.ycombinator.com/item?id=50181222) | dev(11) |  |  |  |  | push | Show HN: Euspell – Spelling reform: an enginnering approach |
| [50182480](https://news.ycombinator.com/item?id=50182480) | dev(23) |  |  |  |  | push | Show HN: Tapirscan – Scan barcodes at any angle in the browser |
| [50183591](https://news.ycombinator.com/item?id=50183591) | dev(07) |  |  |  |  | push | Show HN: Riff – An iPhone calendar you zoom instead of switching views |
| [50183690](https://news.ycombinator.com/item?id=50183690) | dev(21) |  |  |  |  | push | Show HN: Open-source site base plans from any US address |
| [50183915](https://news.ycombinator.com/item?id=50183915) | dev(22) |  |  |  |  | pass | Show HN: IDE for a general-purpose visual programming language "Pipe" |
| [50185268](https://news.ycombinator.com/item?id=50185268) | dev(03) |  |  |  |  | push | Show HN: Moodly – A free mood tracker that keeps entries in the browser |
| [50186893](https://news.ycombinator.com/item?id=50186893) | dev(17) |  |  |  |  | push | Show HN: I made a free Mac app to annotate screen for AI agents |
| [50187838](https://news.ycombinator.com/item?id=50187838) | dev(13) |  |  |  |  | pass | Show HN: The Steam Frame's wireless adapter isn't what you think |
| [50187882](https://news.ycombinator.com/item?id=50187882) | dev(29) |  |  |  |  | pass | Show HN: Professionally maintained Tree-sitter compatible WASM grammars |
| [50189982](https://news.ycombinator.com/item?id=50189982) | dev(19) |  |  |  |  | push | Show HN: GitPushups, block your code if you don't do pushups during your workday |
| [50190012](https://news.ycombinator.com/item?id=50190012) | dev(09) |  |  |  |  | pass | Show HN: HarnessHive – collaborative wiring harness design platform in browser |
| [50191433](https://news.ycombinator.com/item?id=50191433) | dev(01) |  |  |  |  | push | Show HN: Commit-quiz – A pre-commit hook that quizzes you on your own diff |
| [50194676](https://news.ycombinator.com/item?id=50194676) | heldout(40), train60(40) | train60-sim | must_read | human_first_pass | no | push | Show HN: OpenSocials, plan and approve social posts |
| [50194681](https://news.ycombinator.com/item?id=50194681) | heldout(52), train60(52) | train60-sim | must_read | human_first_pass | no | push | Show HN: Toli – Let Claude Code on one computer work with Codex on another |
| [50194783](https://news.ycombinator.com/item?id=50194783) | heldout(42), train60(42) | train60-sim | must_read | human_first_pass | no | push | Show HN: Cute and Fun little 3D Desktop pets for Mac |
| [50195112](https://news.ycombinator.com/item?id=50195112) | heldout(56), train60(56) | train60-sim | pass | human | no | pass | Show HN: Hookman – One stable webhook URL that follows your preview branch |
| [50195199](https://news.ycombinator.com/item?id=50195199) | heldout(34), train60(34) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: Unspin – live per-step progress for Claude Code's shell commands |
| [50195216](https://news.ycombinator.com/item?id=50195216) | heldout(44), train60(44) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: Inillucent – agentic db written in Rust that is 500% faster than SQLite |
| [50195262](https://news.ycombinator.com/item?id=50195262) | heldout(37), train60(37) | train60-sim | pass | human | no | pass | Show HN: We ported FLA's Triton kernels to Jax Pallas; they're faster on H100 |
| [50195307](https://news.ycombinator.com/item?id=50195307) | heldout(31), train60(31) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: Lalabase, self-hosted project management with an AI that cites sources |
| [50195422](https://news.ycombinator.com/item?id=50195422) | heldout(47), train60(47) | train60-sim | pass | human | no | pass | Show HN: CxxDox, a mkdocs plugin for complex C++ projects |
| [50195582](https://news.ycombinator.com/item?id=50195582) | heldout(45), train60(45) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: Using an LLM chat template in reverse to play the user |
| [50196157](https://news.ycombinator.com/item?id=50196157) | heldout(36), train60(36) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: Finance Toolkit MCP with 500 financial metrics for Claude and others |
| [50196323](https://news.ycombinator.com/item?id=50196323) | heldout(39), train60(39) | train60-sim | must_read | assistant_suggested_human_reviewed | yes | push | Show HN: Gol – An interactive globe of the other side of everywhere |
| [50196345](https://news.ycombinator.com/item?id=50196345) | heldout(58), train60(58) | train60-sim | pass | human | no | pass | Show HN: Documenting the file formats and engine of Elder Scrolls: Redguard 1998 |
| [50196364](https://news.ycombinator.com/item?id=50196364) | heldout(43), train60(43) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: Priced Out – An interactive map of US housing affordability |
| [50196376](https://news.ycombinator.com/item?id=50196376) | heldout(41), train60(41) | train60-sim | pass | human | no | pass | Show HN: Pipe Dream Remastered |
| [50196590](https://news.ycombinator.com/item?id=50196590) | heldout(57), train60(57) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: Online timer you can see |
| [50196741](https://news.ycombinator.com/item?id=50196741) | heldout(35), train60(35) | train60-sim | pass | human | no | pass | Show HN: PDT – Open-source deployment of scheduled jobs on your own cloud |
| [50196756](https://news.ycombinator.com/item?id=50196756) | heldout(38), train60(38) | train60-sim | pass | human | no | pass | Show HN: IAMSentry – Paste an IAM policy, see privesc attack paths and fixes |
| [50196795](https://news.ycombinator.com/item?id=50196795) | heldout(48), train60(48) | train60-sim | pass | human | no | pass | Show HN: Aven-stops AI coding tools from breaking yours project's rules |
| [50196899](https://news.ycombinator.com/item?id=50196899) | heldout(59), train60(59) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: 4096x – Merge puzzle games where you build 4096 |
| [50197281](https://news.ycombinator.com/item?id=50197281) | heldout(53), train60(53) | train60-sim | must_read | assistant_suggested_human_reviewed | yes | push | Show HN: XTrace – productivity observability tool for coding agents |
| [50197593](https://news.ycombinator.com/item?id=50197593) | heldout(60), train60(60) | train60-sim | pass | human | no | pass | Show HN: Flint-interactive, a language for interactive data visualizations (MSR) |
| [50197685](https://news.ycombinator.com/item?id=50197685) | heldout(51), train60(51) | train60-sim | pass | human | no | pass | Show HN: Ternlux – Free, local-first, bring-your-own-key AI pipeline builder |
| [50197999](https://news.ycombinator.com/item?id=50197999) | heldout(33), train60(33) | train60-sim | pass | human | no | pass | Show HN: shapcn brings shape-aware icon morphing |
| [50198407](https://news.ycombinator.com/item?id=50198407) | heldout(55), train60(55) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: Trace Intelligence for Claude Code, Codex, Cursor, OpenCode, Grok |
| [50198583](https://news.ycombinator.com/item?id=50198583) | heldout(50), train60(50) | train60-sim | pass | human | no | pass | Show HN: Route Optimization Mini-Games |
| [50198769](https://news.ycombinator.com/item?id=50198769) | heldout(46), train60(46) | train60-sim | must_read | human_first_pass | no | push | Show HN: Podium, presentation rehearsal with coaching |
| [50199581](https://news.ycombinator.com/item?id=50199581) | heldout(54), train60(54) | train60-sim | pass | human | no | pass | Show HN: Mnemolith – AI coding memory that goes stale when your code changes |
| [50199611](https://news.ycombinator.com/item?id=50199611) | heldout(49), train60(49) | train60-sim | must_read | assistant_suggested_human_reviewed | yes | push | Show HN: A Claude Code plugin that plays a song and shows a startup card |
| [50199762](https://news.ycombinator.com/item?id=50199762) | heldout(32), train60(32) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: WhatYouSay – Self-hosted WhatsApp voice-note transcription |
| [50215330](https://news.ycombinator.com/item?id=50215330) | fresh-test(94) |  |  |  |  | pass | Show HN: AI Detector that is private, free and unlimited use |
| [50215612](https://news.ycombinator.com/item?id=50215612) | fresh-train(70), train60(70) | train60-sim | pass | human | no | pass | Show HN: Automated newsletter built with Grok bot |
| [50215652](https://news.ycombinator.com/item?id=50215652) | fresh-train(71), train60(71) | train60-sim | pass | human | no | pass | Show HN: CAS-X – An input-dominant recursive filter (8.5x recovery acceleration) |
| [50215712](https://news.ycombinator.com/item?id=50215712) | fresh-train(76), train60(76) | train60-sim | must_read | assistant_suggested_human_reviewed | yes | push | Show HN: AiSniff, underline the phrases in a text that read like AI wrote them |
| [50216053](https://news.ycombinator.com/item?id=50216053) | fresh-train(62), train60(62) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: You Can Just Filter YouTube Playlists in the 'Save to Playlist' Dialog |
| [50217369](https://news.ycombinator.com/item?id=50217369) | fresh-train(77), train60(77) | train60-sim | pass | human | no | pass | Show HN: Privacy Meridian, navigate global privacy laws |
| [50217573](https://news.ycombinator.com/item?id=50217573) | fresh-test(102) |  |  |  |  | pass | Show HN: 27B open model to grade robot data 48x cheaper/27x faster vs. 6 Astra |
| [50218101](https://news.ycombinator.com/item?id=50218101) | fresh-test(93) |  |  |  |  | pass | Show HN: CallFlow – VS Code REST client that also captures your terminal's HTTP |
| [50218188](https://news.ycombinator.com/item?id=50218188) | fresh-test(109) |  |  |  |  | push | Show HN: A map of outdoor gyms and pull-up bars |
| [50218601](https://news.ycombinator.com/item?id=50218601) | fresh-train(68), train60(68) | train60-sim | must_read | human_first_pass | no | push | Show HN: Latch – Make any website usable by AI agents in one line (WebMCP) |
| [50218772](https://news.ycombinator.com/item?id=50218772) | fresh-test(95) |  |  |  |  | pass | Show HN: Monkeytype for Developers |
| [50219762](https://news.ycombinator.com/item?id=50219762) | fresh-train(63), train60(63) | train60-sim | pass | human | no | pass | Show HN: Benchmarks of continual learning model trained for a month on a laptop |
| [50221066](https://news.ycombinator.com/item?id=50221066) | fresh-test(118) |  |  |  |  | pass | Show HN: Enzyme – a programming language that compiles wikis for agents |
| [50221499](https://news.ycombinator.com/item?id=50221499) | fresh-test(104) |  |  |  |  | pass | Show HN: Free Online Image Tools |
| [50221588](https://news.ycombinator.com/item?id=50221588) | fresh-train(61), train60(61) | train60-sim | pass | human | no | pass | Show HN: Visual Studio extension that shows decimal and hex in the debugger |
| [50222321](https://news.ycombinator.com/item?id=50222321) | fresh-train(84), train60(84) | train60-sim | pass | human | no | pass | Show HN: A set of test-cases for CP/M emulators |
| [50222559](https://news.ycombinator.com/item?id=50222559) | fresh-test(115) |  |  |  |  | pass | Show HN: AI agent swarms test if new CVEs are exploitable in your env |
| [50223070](https://news.ycombinator.com/item?id=50223070) | fresh-train(64), train60(64) | train60-sim | pass | human | no | pass | Show HN: Loböle, open-source parametric CAD that AI agents can drive |
| [50223617](https://news.ycombinator.com/item?id=50223617) | fresh-train(85), train60(85) | train60-sim | must_read | assistant_suggested_human_reviewed | yes | push | Show HN: Mailrelay – Email to Webhook in Minutes |
| [50223635](https://news.ycombinator.com/item?id=50223635) | fresh-train(81), train60(81) | train60-sim | pass | human | no | pass | Show HN: AI Trend Video – Put your photo into viral AI video templates |
| [50223715](https://news.ycombinator.com/item?id=50223715) | fresh-test(96) |  |  |  |  | push | Show HN: The missing clipboard history for macOS that idles at 16 MB |
| [50223763](https://news.ycombinator.com/item?id=50223763) | fresh-test(116) |  |  |  |  | pass | Show HN: A randomized controlled trial run inside an agent simulation |
| [50224373](https://news.ycombinator.com/item?id=50224373) | fresh-train(69), train60(69) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: Narro – Read web pages and Kindle books using local AI voices |
| [50224416](https://news.ycombinator.com/item?id=50224416) | fresh-train(79), train60(79) | train60-sim | must_read | assistant_suggested_human_reviewed | yes | push | Show HN: Whistle Translator |
| [50225165](https://news.ycombinator.com/item?id=50225165) | fresh-train(82), train60(82) | train60-sim | pass | human | no | pass | Show HN: Claude Code(and others) embedded in your app |
| [50225233](https://news.ycombinator.com/item?id=50225233) | fresh-train(90), train60(90) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: Perch, a calm Mac app for juggling Claude Code sessions |
| [50226501](https://news.ycombinator.com/item?id=50226501) | fresh-test(97) |  |  |  |  | pass | Show HN: CodeAIHQ – High-performance technical analysis of cinema VFX pipelines |
| [50226623](https://news.ycombinator.com/item?id=50226623) | fresh-test(101) |  |  |  |  | push | Show HN: Orgiggly – Claude Code plugin that hosts the apps it builds |
| [50228239](https://news.ycombinator.com/item?id=50228239) | fresh-test(103) |  |  |  |  | push | Show HN: Dadgpt Open Source Halloween Costume |
| [50228301](https://news.ycombinator.com/item?id=50228301) | fresh-test(98) |  |  |  |  | push | Show HN: Git-ing Over it, learn Git like you'll use it IRL |
| [50229413](https://news.ycombinator.com/item?id=50229413) | fresh-test(117) |  |  |  |  | pass | Show HN: Zilum – A tiny Snipping Tool alternative for Windows 11 |
| [50229525](https://news.ycombinator.com/item?id=50229525) | fresh-test(92) |  |  |  |  | pass | Show HN: Only thing you need to stay informed on tech without doom scrolling x |
| [50229557](https://news.ycombinator.com/item?id=50229557) | fresh-test(107) |  |  |  |  | push | Show HN: Black Swan – a Flappy Bird where the rules randomly break |
| [50229591](https://news.ycombinator.com/item?id=50229591) | fresh-train(87), train60(87) | train60-sim | pass | human | no | pass | Show HN: ToolsOfWeb – 69 free online tools that run in the browser |
| [50231566](https://news.ycombinator.com/item?id=50231566) | fresh-test(108) |  |  |  |  | pass | Show HN: Kosh - Give the browser bookmarks a second life |
| [50231567](https://news.ycombinator.com/item?id=50231567) | fresh-test(91) |  |  |  |  | push | Show HN: Kolo – share your AI coding sessions with anyone |
| [50232061](https://news.ycombinator.com/item?id=50232061) | fresh-train(83), train60(83) | train60-sim | pass | human | no | pass | Show HN: Snaparser – a tool to browse your Snapchat exports |
| [50232121](https://news.ycombinator.com/item?id=50232121) | fresh-test(106) |  |  |  |  | pass | Show HN: See how much revenue declined cards cost your SaaS |
| [50232415](https://news.ycombinator.com/item?id=50232415) | fresh-test(113) |  |  |  |  | push | Show HN: Directory 958 inspirational artisans, craftspeople, smiths, for post-AI |
| [50232722](https://news.ycombinator.com/item?id=50232722) | fresh-train(67), train60(67) | train60-sim | pass | human | no | pass | Show HN: I found out a way to make openF1 data easy to analyse for normies |
| [50233315](https://news.ycombinator.com/item?id=50233315) | fresh-train(73), train60(73) | train60-sim | pass | human | no | pass | Show HN: Repotruck – Mirror and organize GitHub repos with a TUI and MCP server |
| [50233685](https://news.ycombinator.com/item?id=50233685) | fresh-train(78), train60(78) | train60-sim | pass | human | no | pass | Show HN: Lavoi – On-device speech-to-text in under 500ms |
| [50234491](https://news.ycombinator.com/item?id=50234491) | fresh-test(114) |  |  |  |  | pass | Show HN: Muxer – Control cmux terminals from Android |
| [50236232](https://news.ycombinator.com/item?id=50236232) | fresh-train(86), train60(86) | train60-sim | must_read | assistant_suggested_human_reviewed | yes | push | Show HN: Wabetune – Intonation Analyser · Strings · Winds · Brass · Voice |
| [50236250](https://news.ycombinator.com/item?id=50236250) | fresh-test(120) |  |  |  |  | pass | Show HN: I added stacked subgraphs to Mermaid flowcharts |
| [50236286](https://news.ycombinator.com/item?id=50236286) | fresh-train(72), train60(72) | train60-sim | pass | human | no | pass | Show HN: I Made a Multiplayer 3D Shooter Game in Lisp (Again) |
| [50236627](https://news.ycombinator.com/item?id=50236627) | fresh-test(111) |  |  |  |  | push | Show HN: Glitchrupt: Glitch your desktop when your AI agent needs your attention |
| [50237273](https://news.ycombinator.com/item?id=50237273) | fresh-test(105) |  |  |  |  | push | Show HN: Calm Web – Print magazine style reader |
| [50238873](https://news.ycombinator.com/item?id=50238873) | fresh-test(119) |  |  |  |  | pass | Show HN: AI Client Lead Qualifier and Review Responder for Agencies |
| [50239457](https://news.ycombinator.com/item?id=50239457) | fresh-test(99) |  |  |  |  | pass | Show HN: Twigg Free and Open Source Centralized VCS |
| [50239793](https://news.ycombinator.com/item?id=50239793) | fresh-train(75), train60(75) | train60-sim | push | assistant_suggested_human_reviewed | yes | push | Show HN: Quill Desktop; Lightweight AI harness, no electron/WebKit native GUI |
| [50241421](https://news.ycombinator.com/item?id=50241421) | fresh-test(112) |  |  |  |  | pass | Show HN: Paycoinly WordPress Plugin |
| [50241557](https://news.ycombinator.com/item?id=50241557) | fresh-train(65), train60(65) | train60-sim | pass | human | no | pass | Show HN: Nord Theme for Cursor |
| [50241871](https://news.ycombinator.com/item?id=50241871) | fresh-test(110) |  |  |  |  | push | Show HN: Find Open Source Alternatives to Paid Software |
| [50242510](https://news.ycombinator.com/item?id=50242510) | fresh-train(74), train60(74) | train60-sim | pass | human | no | pass | Show HN: Managing AI Models After Launch-Versioning, Evaluations, and Fallbacks |
| [50242526](https://news.ycombinator.com/item?id=50242526) | fresh-train(80), train60(80) | train60-sim | pass | human | no | pass | Show HN: Graph-MIND – Local memory for AI coding agents, no LLM calls to save |
| [50242875](https://news.ycombinator.com/item?id=50242875) | fresh-train(88), train60(88) | train60-sim | must_read | human_first_pass | no | push | Show HN: Logfolio – A public log for books, films, games and anything you keep |
| [50243029](https://news.ycombinator.com/item?id=50243029) | fresh-test(100) |  |  |  |  | pass | Show HN: LiveWorldTrends – Real-time 3D globe of global trends and crisis radar |
| [50243142](https://news.ycombinator.com/item?id=50243142) | fresh-train(66), train60(66) | train60-sim | pass | human | no | pass | Show HN: MindThread CLI and MCP server for Threads, with per-permission approval |
| [50243157](https://news.ycombinator.com/item?id=50243157) | fresh-train(89), train60(89) | train60-sim | pass | human | no | pass | Show HN: Sbr, a sing-box compatible client for government resistant VPN infra |
| [50351684](https://news.ycombinator.com/item?id=50351684) | day-1104(50351684) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Open-Source Searchable Job Board for HN's Hiring Threads |
| [50351797](https://news.ycombinator.com/item?id=50351797) | day-1104(50351797) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Hardcount – Self-hosted usage billing for AI products |
| [50351830](https://news.ycombinator.com/item?id=50351830) | day-1104(50351830) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Remene – Understand your MRI and prepare questions for your doctor |
| [50351982](https://news.ycombinator.com/item?id=50351982) | day-1104(50351982) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: LinguaFlick – An application for learning Chinese based on vocabulary |
| [50352087](https://news.ycombinator.com/item?id=50352087) | day-1104(50352087) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: A Chrome extension to spot red flags Amazon isn't showing |
| [50352158](https://news.ycombinator.com/item?id=50352158) | day-1104(50352158) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Track any YouTube title/thumbnail test via WebSub, hashes, and no OAuth |
| [50352209](https://news.ycombinator.com/item?id=50352209) | day-1104(50352209) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: APIblaze: Kong and Auth0 and FGA but $0/month |
| [50352315](https://news.ycombinator.com/item?id=50352315) | day-1104(50352315) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Isitslop.org: AI Can build anything. Was it worth it? |
| [50352316](https://news.ycombinator.com/item?id=50352316) | day-1104(50352316) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Run Conway's Game of Life in CSS |
| [50352862](https://news.ycombinator.com/item?id=50352862) | day-1104(50352862) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Mixttape – Share songs like a kid from the 80s |
| [50352961](https://news.ycombinator.com/item?id=50352961) | day-1104(50352961) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: HackerX – Hacker News front page docked in x.com, newest first |
| [50353110](https://news.ycombinator.com/item?id=50353110) | day-1104(50353110) | day-1104 | must_read | human_reviewed_assistant_prediction | yes | push* | Show HN: Agent Trace, let agents query Codex and CC chat histories |
| [50353251](https://news.ycombinator.com/item?id=50353251) | day-1104(50353251) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Speedwidget – macOS widget how fast and how stable internet is |
| [50353468](https://news.ycombinator.com/item?id=50353468) | day-1104(50353468) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Interactive notes on RLHF, attention, LoRA and LLM evals |
| [50353696](https://news.ycombinator.com/item?id=50353696) | day-1104(50353696) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Neurolume – Fine-tune LLMs on a Mac and watch what changes per layer |
| [50354044](https://news.ycombinator.com/item?id=50354044) | day-1104(50354044) | day-1104 | must_read | human_reviewed_assistant_prediction | yes | push* | Show HN: Negative Space – Startup ideas from the gaps between YC companies |
| [50354314](https://news.ycombinator.com/item?id=50354314) | day-1104(50354314) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Ads-Boy: Track Planes on Your Game Boy |
| [50354365](https://news.ycombinator.com/item?id=50354365) | day-1104(50354365) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Record Demo Video on Mac with auto zoom, full controll |
| [50355009](https://news.ycombinator.com/item?id=50355009) | day-1104(50355009) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Tmux-restore saves tmux windows and agent sessions across reboots |
| [50355011](https://news.ycombinator.com/item?id=50355011) | day-1104(50355011) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Fruitiger Aero Media Player on macOS |
| [50355392](https://news.ycombinator.com/item?id=50355392) | day-1104(50355392) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: A 3KB LLM inference engine in C |
| [50355461](https://news.ycombinator.com/item?id=50355461) | day-1104(50355461) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Local in-browser privacy-redact for pdf and images using WASM |
| [50355555](https://news.ycombinator.com/item?id=50355555) | day-1104(50355555) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Who can publish to your NPM dependencies? |
| [50355591](https://news.ycombinator.com/item?id=50355591) | day-1104(50355591) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Bundle – I kept forgetting what I read, so I built a read-later app |
| [50355595](https://news.ycombinator.com/item?id=50355595) | day-1104(50355595) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Vanilla-web skill to replace all JavaScript frameworks |
| [50355827](https://news.ycombinator.com/item?id=50355827) | day-1104(50355827) | day-1104 | must_read | human_reviewed_assistant_prediction | yes | push* | Show HN: Scroll from your own skeleton to the edge of the observable universe |
| [50355931](https://news.ycombinator.com/item?id=50355931) | day-1104(50355931) | day-1104 | must_read | human_reviewed_assistant_prediction | yes | push* | Show HN: Every book, film and game HN has recommended since 2006 |
| [50356156](https://news.ycombinator.com/item?id=50356156) | day-1104(50356156) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Animus AI Blocker:Block AI slop images/videos on your social media feed |
| [50356643](https://news.ycombinator.com/item?id=50356643) | day-1104(50356643) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Scriptorium – Turning Lectures into Obsidian Notes and SR Flashcards |
| [50356948](https://news.ycombinator.com/item?id=50356948) | day-1104(50356948) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Graftfork: rebase fork patches onto each upstream release, test-gated |
| [50357042](https://news.ycombinator.com/item?id=50357042) | day-1104(50357042) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Recto: A desktop app where you can design with AI, edit with your mouse |
| [50357117](https://news.ycombinator.com/item?id=50357117) | day-1104(50357117) | day-1104 | must_read | human_reviewed_assistant_prediction | yes | push* | Show HN: Twitter but you can only use paint |
| [50357326](https://news.ycombinator.com/item?id=50357326) | day-1104(50357326) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: ZapFast, Native WhatsApp for Linux, macOS, and Windows with Calls |
| [50357386](https://news.ycombinator.com/item?id=50357386) | day-1104(50357386) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Bookmarker - A minimal, private bookmark organizer for macOS |
| [50358104](https://news.ycombinator.com/item?id=50358104) | day-1104(50358104) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: CogsIQ – True landed cost and profit per SKU for TikTok Shop sellers |
| [50358109](https://news.ycombinator.com/item?id=50358109) | day-1104(50358109) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Collabrun – affiliate creator outreach for TikTok Shop sellers |
| [50358314](https://news.ycombinator.com/item?id=50358314) | day-1104(50358314) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Kairos – Open-source risk and fraud decisioning platform |
| [50358352](https://news.ycombinator.com/item?id=50358352) | day-1104(50358352) | day-1104 | must_read | human_reviewed_assistant_prediction | yes | push* | Show HN: Uncracked City, detective game where you question LLM suspects that lie |
| [50358404](https://news.ycombinator.com/item?id=50358404) | day-1104(50358404) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: An MCP Server for Manpages |
| [50358826](https://news.ycombinator.com/item?id=50358826) | day-1104(50358826) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Shot-butcher: iOS, ipados, macOS apps screenshot maker skill |
| [50359691](https://news.ycombinator.com/item?id=50359691) | day-1104(50359691) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Export your Character.AI chats in minutes – open-source, runs locally |
| [50359805](https://news.ycombinator.com/item?id=50359805) | day-1104(50359805) | day-1104 | must_read | human_reviewed_assistant_prediction | yes | push* | Show HN: Modelpeers – a changelog for the AI models and agents you use |
| [50360046](https://news.ycombinator.com/item?id=50360046) | day-1104(50360046) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: An interactive map of midterm ads |
| [50360517](https://news.ycombinator.com/item?id=50360517) | day-1104(50360517) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Predictygraph – animated diagrams styled with CSS, no reshuffle on edit |
| [50360658](https://news.ycombinator.com/item?id=50360658) | day-1104(50360658) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Pauseless – Free silence/filler-word remover from videos, on-browser |
| [50360833](https://news.ycombinator.com/item?id=50360833) | day-1104(50360833) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: ADB dock a macOS menu bar app to wirelessly connect Android devices |
| [50361230](https://news.ycombinator.com/item?id=50361230) | day-1104(50361230) | day-1104 | must_read | human_reviewed_assistant_prediction | yes | push* | Show HN: Rendering 3D Models in the Terminal |
| [50361263](https://news.ycombinator.com/item?id=50361263) | day-1104(50361263) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: TickerTown, a pixel-art stock market simulator |
| [50361289](https://news.ycombinator.com/item?id=50361289) | day-1104(50361289) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Sigmajp – Integrated Japanese Reader |
| [50361465](https://news.ycombinator.com/item?id=50361465) | day-1104(50361465) | day-1104 | push | human_reviewed_assistant_prediction | yes | push* | Show HN: Droneship – sandbox for your coding agents |
| [50361850](https://news.ycombinator.com/item?id=50361850) | day-1104(50361850) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Dryplate – Image tools that run in the browser, no upload |
| [50361909](https://news.ycombinator.com/item?id=50361909) | day-1104(50361909) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: What games does HN talk about? (Project 24) |
| [50361927](https://news.ycombinator.com/item?id=50361927) | day-1104(50361927) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: AgentFirstStack – analytics, tags, email and replay your agent sets up |
| [50362025](https://news.ycombinator.com/item?id=50362025) | day-1104(50362025) | day-1104 | pass | human_reviewed_assistant_prediction | yes | pass* | Show HN: Lets1UP, birthday/party game kits that run on your TV |

\* derived from the tier (wanted = push).

## What the stage-2 rankers see (the tiered posts)

Title, URL and the first 700 characters of page text, shuffled per rep; no label, tier, votes or posting time.

### 50194676: train60-sim, must_read

```text
Show HN: OpenSocials, plan and approve social posts
https://opensocials.thecompound.tech

One morning with OpenSocials This is how drafting and review fit into a day. The times come from the plan above. Start free 07:30 1 of 6 The day's drafts are ready. Your AI wrote one draft for each slot from your product's facts. Each draft passed checks for length, links, repeats and claims missing from your facts. 5 drafts are waiting 4 clean 1 needs a fact Thursday 9 October Maya Ortiz 10:40 Our 2.4 release adds recurring bills. clean Your product 12:15 Set the rent once, and every flatmate sees their share on the 1st. clean yourproduct.bsky.social 14:06 clean Maya Ortiz 17:20 needs a fact Sam Lee 19:00 clean Length Links Repeats Claims in your facts 07:31 2 of 6 A refused draft was alrea
```

### 50194681: train60-sim, must_read

```text
Show HN: Toli – Let Claude Code on one computer work with Codex on another
https://github.com/arjunvlama/toli

toli — the telephone for AI agents ☎️ toli (टोली, "toh-lee") is Hindi for a band of people working together. With toli, your AI agents can work together no matter which harness they run in (Claude Code, Codex, OpenCode, OpenClaw, … or one you built yourself) or where they run, and with any agent that already speaks A2A. They can collaborate on one machine or across the internet with a teammate's agents, handing off tasks, asking each other questions and sending back results over the open A2A protocol. It's not just for coding agents. Any agent with an MCP client can join, so a personal assistant can check with your coding agent before it answers you: How it works You run one toli daemon. Eac
```

### 50194783: train60-sim, must_read

```text
Show HN: Cute and Fun little 3D Desktop pets for Mac
https://deskypaw.app/

Project plan Woof! Fetching your pet… 02:00 Focus buddy Start 2-minute focus Reset Pause animation Pets & tricks Corgi Pet Golden retriever Persian Cat Corgi Red panda +12 more pets in the app Play Wag Hop Bark Happy Bark Clean Screen Circle Dance Nap Size Small Medium Large Extra large Size S M L XL Resize any time in the app, so your pet never gets in the way of the Dock. Welcome to DeskyPaw Desktop pets for Mac A tiny 3D pet that lives on your Mac desktop. DeskyPaw is a desktop pet app for Mac. A fully animated 3D pet walks across the bottom of your screen, wags, barks and cleans your screen, and its built-in focus timer makes it nap while you work, then bark when it's break time. Get Des
```

### 50195112: train60-sim, pass

```text
Show HN: Hookman – One stable webhook URL that follows your preview branch
https://hookman.dev/

Configure once. Route forever Create permanent webhook endpoints that automatically route to the correct branch deployment. No more updating links. No more confusion. < 2ms routing latency · Cloudflare edge · 1,000 webhooks/month free Try it for free Read the docs hookman.dev/w/acme/payments LIVE SOURCE METHOD STATUS LATENCY ROUTED TO stripe.com POST 200 1.8ms pr-42.acme.app/webhooks stripe.com POST 200 2.3ms pr-42.acme.app/webhooks paddle.com POST 200 1.9ms pr-42.acme.app/webhooks $ hookman switch --branch main ✓ switched stripe.com POST 200 1.6ms app.acme.com/webhooks paddle.com POST 200 2.0ms app.acme.com/webhooks stripe.com POST ··· app.acme.com/webhooks Routing main → app.acme.com A new
```

### 50195199: train60-sim, push

```text
Show HN: Unspin – live per-step progress for Claude Code's shell commands
https://github.com/nkyriazis/unspin

unspin See what your coding agent's shell commands are doing, instead of a spinner. When Claude Code runs a long shell command, you get the command and a spinner until it ends. Is it installing? On the fourth of fifty downloads? Stuck? You can't tell. unspin teaches the agent to mark the steps of its batched commands as it goes, and shows them live. Claude Code's own spinner names the step that is running, and a block above the prompt lists every step with a progress bar, its time and an ETA. ✻ Baking · building image 37/72, eta 33s… (1m 12s · ↓ 2.1k tokens) ▶ Ship the release step 4/6 · 1m14s ✔ linting 1.2s ✘ running tests 120/120 — 1 of 120 failed 23s · test_88.py is a known flake, carryin
```

### 50195216: train60-sim, push

```text
Show HN: Inillucent – agentic db written in Rust that is 500% faster than SQLite
https://inillucent.com

INILLUCENT by Black Rainbow Labs A highly performant agentic database. An embedded database, using a SQL syntax you're familiar with, and the power of vector embeddings for semantic search. A perfect solution for agentic systems. Install Read the docs GitHub Scroll 001 What's in the box What's in the box? 01 Complete SQLite dialect implementation. ( Upcoming Postgres dialect option ) 02 Highly performant database written in Rust. 03 Faster than SQLite on 110 of 116 benchmark workloads. 1 04 500% faster than SQLite overall. 1 05 3300% faster on reads by key. 1 06 70% faster than SQLite from Python, Node and the shell. 5 07 300% faster than Postgres on keyword search. 3 08 180% faster than Pos
```

### 50195262: train60-sim, pass

```text
Show HN: We ported FLA's Triton kernels to Jax Pallas; they're faster on H100
https://github.com/jla-org/jax-linear-attention

jax-linear-attention brings FLA-class linear-attention kernels to JAX: Pallas Mosaic GPU kernels for NVIDIA Hopper, forward and backward, for Mamba-2, Mamba-3, Gated DeltaNet, KDA, RWKV-7, GLA and more, with an FA3-style attention kernel and a full LLM training stack around them. It is built for researchers and engineers who train linear-attention, state-space and hybrid models in JAX. Every kernel is exact by default and measured against the latest upstream code, and this page shows where we lose as plainly as where we win. Quick start · Architectures · Benchmarks · Where we lose · FAQ · Docs · Discord Highlights Measured on H100 GPUs on 20 Oct 2026 with no other jobs on the GPUs, unless no
```

### 50195307: train60-sim, push

```text
Show HN: Lalabase, self-hosted project management with an AI that cites sources
https://github.com/lalabase/lalabase

Lalabase A self-hosted project brain for devs and customers. RUBY ON RAILS · POSTGRESQL Tickets, time tracking, docs and meetings for software agencies and their clients, with an AI assistant that answers from your own project data and cites its sources. Free on your own server, or hosted by us in Germany. Try the live demo : no sign-up, the login is on the page, and everything resets every night. Website · Self-hosting · Cloud pricing · Changelog Ask about a ticket. The answer cites the ticket, a comment and a meeting. Ask about a meeting. Summary, action items and transcript next to the answer. Tickets as a board or a list, with your own statuses per project. Time tracking per ticket. Ever
```

### 50195422: train60-sim, pass

```text
Show HN: CxxDox, a mkdocs plugin for complex C++ projects
https://github.com/kfrlib/cxxdox/

mkdocs-cxxdox An MkDocs plugin that generates C++ API documentation directly from source using libclang . It parses headers with libclang, extracts Doxygen-style comments, and renders a browsable reference (namespaces, classes, functions, variables, typedefs, enums, concepts, macros, …) into your MkDocs site. Features include: Cross-linked symbols with overload- and namespace-aware Doxygen references. Generated pages and navigation organized by configurable source-file groups. C++ source rendering with semantic syntax highlighting for types, functions, namespaces, macros, literals, and preprocessor directives. Optional links from declarations to the corresponding line in a Git web interface.
```

### 50195582: train60-sim, push

```text
Show HN: Using an LLM chat template in reverse to play the user
https://selfgpt.pages.dev/

When you send a message, it gets wrapped between tokens like <user_start> and <user_end> . The assistant, on the other hand, keeps generating until it produces something like <assistant_end> , which stops it so that you (the user) can finally send another message. So, we can just use the template in reverse. After <assistant_end> , we add <user_start> and let the model generate from there, so it writes the user message. I also wanted to test the other obvious way to simulate human messages: simply asking the model to "be human". So there are two configurations: native , which uses the chat template in reverse, and roleplay . Some models were clearly better than others at playing the user in 
```

### 50196157: train60-sim, push

```text
Show HN: Finance Toolkit MCP with 500 financial metrics for Claude and others
https://www.jeroenbouma.com/projects/financetoolkit/mcp

View on GitHub 500+ metrics in 22 tools, plus 3 for search Calculated not recalled: the same number in any model Free hosted, or run locally; MIT-licensed Any client Claude, ChatGPT, Copilot, Cursor and more Ask an AI assistant for Apple’s return on invested capital and you will usually get a number. Whether it is right depends on what the model remembers from its training data, which of the several definitions it picked and whether the arithmetic held up along the way. Ask twice and you may get two different answers. The Finance Toolkit MCP server takes the calculation out of the model’s hands. It is an open-source Model Context Protocol (MCP) server that connects Claude, ChatGPT, GitHub Co
```

### 50196323: train60-sim, must_read

```text
Show HN: Gol – An interactive globe of the other side of everywhere
https://gol-six-beta.vercel.app/

Layers Gol is designed for larger screens. On a phone, some views may be cramped or slow. OK Dig here × Mirror world i Shows every continent moved to the exact opposite side of the Earth. Where a blue outline overlaps real land, digging straight down from there would bring you out on land. Light dots mark those spots. Same latitude and longitude i Draws the east–west line (latitude) and the north–south line (longitude) through your pin, and lists major cities on each. Places on the same latitude get similar day lengths. The longitude line also runs through your exit point on the far side. Static page, runs entirely in your browser. · Vibe Creator Start Exit Layer Crust Depth 0 km Temperature
```

### 50196345: train60-sim, pass

```text
Show HN: Documenting the file formats and engine of Elder Scrolls: Redguard 1998
https://michidk.github.io/redguard-preservation/

Redguard Preservation Reference documentation for The Elder Scrolls Adventures: Redguard (1998) file formats, engine behavior, and undocumented features. The documentation covers the GOG release’s Glide renderer and notes known original-CD differences. Reference sections Engine behavior : scripting, actor animation, movement, rendering, audio, menus, and hidden cheats. File formats : binary layouts for models, maps, textures, sound, saved state, and bundled support files. Configuration : INI settings for worlds, combat, items, input, rendering, and menus. Look and feel Reproducing the look and feel explains how terrain and model lighting, fog, sky, water, texture animation, camera projection
```

### 50196364: train60-sim, push

```text
Show HN: Priced Out – An interactive map of US housing affordability
https://explore.stokemoney.com/housing

At $ 80,000 Household income before tax, per year $ a year, 227 metros were affordable in 2021. Now, just 43 . Your annual income $20k $40k $60k $80k $100k $120k $140k Example income: drag or type yours Sep 2021 227 within budget Sep 2026 43 within budget Within budget Stretch Over budget Loading the map… Assumptions & sources How the estimate works Every figure is for the median-priced single-family home sold in that metro in the price month. Homes differ between metros: the median in one place is not the same house as the median in another. For each metro the monthly cost is principal and interest on a 30-year fixed loan with 20% down, plus property tax and insurance: payment = loan × r(1+
```

### 50196376: train60-sim, pass

```text
Show HN: Pipe Dream Remastered
https://chrispattle.com/pipe-dream

(no page text could be extracted)
```

### 50196590: train60-sim, push

```text
Show HN: Online timer you can see
https://urtimer.com/

The online timer you can see. Watch time run out as a shape instead of a number. Pick a length, choose one of 19 styles and press Start. Free, no sign-up. 5 min 10 min 15 min 25 min 30 min 45 min 60 min Custom hours : min : sec Cancel Set timer 25:00 Reset Start Full screen Share Add task Sound on Repeat Style Classic Classic Circle Bloom Orbit Tide Horizon Bricks Honeycomb Ink Maze Stars Hourglass Retro Candle Hatch Battery Progress bar Heart Bomb Color Background Your photo stays in this browser. Remove photo Reset to defaults Tasks Auto-start next min Add Type a name for the task, then press Add. No tasks yet. Add one and press play to run it on the timer. How to use urTimer urTimer shows
```

### 50196741: train60-sim, pass

```text
Show HN: PDT – Open-source deployment of scheduled jobs on your own cloud
https://github.com/AutoIDM/pdt

pdt - process deploy tool Turn any script into a scheduled job in your cloud. pdt builds, runs, and deploys scheduled jobs to AWS, Azure, Google Cloud, or Windows Task Scheduler. It gives every job the same primitives , chosen from years of deploying scheduled jobs for businesses on each cloud. No servers to run and nothing extra to install, and everything it makes lives in your own account. Key Features Bring your scripts - Drop in your PowerShell or Python files. pdt finds what they need and runs them. One command to deploy - No cloud skills needed. pdt deploy installs the tools it needs and opens the sign-in page for you. Any cloud - Move a job between AWS, Azure, Google Cloud, and Window
```

### 50196756: train60-sim, pass

```text
Show HN: IAMSentry – Paste an IAM policy, see privesc attack paths and fixes
https://iamsentry.vercel.app

❯_ IAM Policy Input (JSON / Terraform) Format Clear Format: AWS IAM Policy JSON (Version 2012-10-17) Ready for live analysis IAM Security Score -- / 100 max Awaiting Input 0 Critical PrivEsc 0 High Severity 0 Medium Overpriv ⚡ Visual Attack Path & Blast Propagation
```

### 50196795: train60-sim, pass

```text
Show HN: Aven-stops AI coding tools from breaking yours project's rules
https://getaven.pages.dev

(no page text could be extracted)
```

### 50196899: train60-sim, push

```text
Show HN: 4096x – Merge puzzle games where you build 4096
https://4096x.com/

4096 x Number merge games to reach 4096 Search 4096x newest game Pick a game below, or search for one above. Continue 4096 built in 0 of 33 games Nothing played yet New Newest first Popular Most played Easy Most 4096s Hard Fewest 4096s Your pace 22 games Real-time 2 games Surprise Any game All games 33 in all New games Newest first No. 34 Jam Your pace New Jam Drive two-square cars along their lanes through a packed car park. Drive one into its twin and the two merge into their double. No. 33 Balance Your pace Balance Drop each number on a peg of a beam on a pivot. It merges with a twin on top, and each tile pulls by its number times its distance, so keep both sides even or the beam tips. No
```

### 50197281: train60-sim, must_read

```text
Show HN: XTrace – productivity observability tool for coding agents
https://github.com/XTraceAI/xtrace-desktop

XTrace Know where your coding time and money go. An open-source macOS app for people who code with agents. See agent activity, estimated human time and API-equivalent spend from the Claude Code, Codex and Cursor history already on your Mac. Track Claude and Codex account usage and pace in the sidebar. Download for Mac · Setup guide · Report a bug See it in 44 seconds xtrace-launch-44s-logo.mp4 Screenshots and the video show the app with made-up sample projects and account usage, not real work. Why XTrace You run several agents, try a new tool, or change how you prompt. XTrace helps you see what changed in your time, spend and activity: Where did my time go? See agent activity alongside estim
```

### 50197593: train60-sim, pass

```text
Show HN: Flint-interactive, a language for interactive data visualizations (MSR)
https://microsoft.github.io/flint-chart/#/interactions

(no page text could be extracted)
```

### 50197685: train60-sim, pass

```text
Show HN: Ternlux – Free, local-first, bring-your-own-key AI pipeline builder
https://www.ternlux.com/online-demo/

(no page text could be extracted)
```

### 50197999: train60-sim, pass

```text
Show HN: shapcn brings shape-aware icon morphing
https://shapcn.com/

Examples Playground 1 Library 2 Which two icons? From To Random pair Pick the start icon 3 How should it feel? Duration 600 ms Try it 4 Ready to copy? HTML React The shapcn package is not live yet. This is the planned API. Copy code No more sloptweening Point-to-point tween Every point slides to a point, all at once. Shape-aware rig Rigged first. Parts move in order. How it works shapcn The rig t = 0.00 1 of 6 Each shape gets a weight. Weight is the length of a stroke. A closed shape counts 1.5 times. Strokes at half of the largest weight or more are the body. The rest are parts. 2 of 6 The rig. Before it moves anything, shapcn rigs the icon, as an animator parents layers. The heaviest shape
```

### 50198407: train60-sim, push

```text
Show HN: Trace Intelligence for Claude Code, Codex, Cursor, OpenCode, Grok
https://github.com/viktor-com/tracequest

Follow your coding agents. Find what happened. TraceQuest is a local web app and CLI for reading coding-agent sessions. It shows each session's messages, tool calls, errors, timing and token usage. It reads sessions from Claude Code, Codex CLI, Cursor, Droid (Factory), OpenCode, Grok CLI, vktr (Viktor's fork of the Grok CLI), fx (Vercel's coding agent) and DeepSeek Harness. It can also import Cursor Cloud Agent sessions and copy sessions from other machines over SSH. Try it · Features · Documentation The screenshots use the bundled Claude Code samples and synthetic Codex recordings. The hub shows copies under demo machine names. Costs are estimated from token counts and model prices. They ar
```

### 50198583: train60-sim, pass

```text
Show HN: Route Optimization Mini-Games
https://www.routific.com/rovins-route-rush

Three free route-planning games starring Rovin, George and Buzz. Plan the delivery run, untangle the spaghetti, defend the zones, then dare your friends to beat your score.
```

### 50198769: train60-sim, must_read

```text
Show HN: Podium, presentation rehearsal with coaching
https://news.ycombinator.com/item?id=50198769

Hacker News new | past | comments | ask | show | jobs | submit login Show HN: Podium, presentation rehearsal with coaching 1 point by jvanveen 13 hours ago | hide | past | favorite | discuss I'm horrible at presenting, so it (Claude) built a simple application to practice it with. Hearing myself, a mumbling crowd, rehearsing and discussing the content with the agent, while adapting the presentation seems useful to me. Didn't try the other personas yet. Feel free to try: https://code.garage44.eu/jeroen/podium (needs an openai api key) help Consider applying for YC's Winter 2027 batch! Applications are open till November 2. Guidelines | FAQ | Lists | API | Security | Legal | Apply to YC | Cont
```

### 50199581: train60-sim, pass

```text
Show HN: Mnemolith – AI coding memory that goes stale when your code changes
https://github.com/anishchugh05/mnemolith

Mnemolith Shared memory for AI coding tools that stays true to your code. Mnemolith (NEE-mo-lith): "memory stone." What your AI learns, carved where every tool can read it. ( Why the name ) Formerly Aether Cache. If you installed aether-cache , see Moving from Aether Cache : your memories come with you. Website · PyPI Claude Code, Cursor, and other AI tools each forget your project between sessions, and when they do remember things, nothing checks whether those memories are still correct. Mnemolith gives every tool one shared, local memory, and keeps it honest: Memories go stale when the code changes. Each memory is linked to the files it's about, with a snapshot of their git content hash. W
```

### 50199611: train60-sim, must_read

```text
Show HN: A Claude Code plugin that plays a song and shows a startup card
https://github.com/heyyviv/claude-boot-beats

startup-song 🎵 A Claude Code plugin that plays a few seconds of a random song every time you start Claude Code. Rotates through genres, one per session: pop → hip hop → retro hits → pop … For each one, it searches the iTunes Search API (free, no key) and plays a random song from the top 10 results. Shows a startup card above the prompt while it plays: Coding streak : days in a row you've started Claude Code Repo status : branch, changed files, ahead/behind, last commit On this day : one event from Wikipedia's on-this-day feed (grim ones skipped) The card goes away when the song ends. Press Esc at an empty prompt to stop it early. /today opens the card again. Uses zero tokens : no model call
```

### 50199762: train60-sim, push

```text
Show HN: WhatYouSay – Self-hosted WhatsApp voice-note transcription
https://github.com/waldo-van-der-code/whatyousay-oss

WhatYouSay WhatsApp voice notes, turned into text replies in the same chat, without keeping the transcripts. WhatYouSay is a small self-hosted Node.js server that links to a WhatsApp account as a linked device. When a voice note is sent, it is transcribed with Whisper, cleaned up by an LLM, optionally translated and summarised, and posted as a reply right under the note. Nobody has to stop what they are doing to listen. The idea comes from WhatScribe , a hosted service that does the same thing. WhatYouSay is an independent implementation you run yourself, built around one rule: the server does not keep what people said. How it was built and tested, from the evals to Whisper cutting notes sho
```

### 50215612: train60-sim, pass

```text
Show HN: Automated newsletter built with Grok bot
https://news.devs.dev

Steal a money-making startup idea every morning. Real revenue numbers, AI moves that matter, and launch playbooks you can copy, from founders building in public. 5 minutes. Every day. 💡 A startup idea you could launch this weekend 💰 Who's making real money, and exactly how 🤖 The AI news builders actually need 🚀 Launch tactics you can steal today Free. No fluff. Unsubscribe in one click. Send me tomorrow's issue → This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply. Let me read first Send me tomorrow's issue →
```

### 50215652: train60-sim, pass

```text
Show HN: CAS-X – An input-dominant recursive filter (8.5x recovery acceleration)
https://news.ycombinator.com/item?id=50215652

Hacker News new | past | comments | ask | show | jobs | submit login Show HN: CAS-X – An input-dominant recursive filter (8.5x recovery acceleration) 1 point by richardaamaya 3 days ago | hide | past | favorite | discuss help Consider applying for YC's Winter 2027 batch! Applications are open till November 2. Guidelines | FAQ | Lists | API | Security | Legal | Apply to YC | Contact Search:
```

### 50215712: train60-sim, must_read

```text
Show HN: AiSniff, underline the phrases in a text that read like AI wrote them
https://github.com/Arthur031221/AiSniff

AiSniff Paste text. See which phrases read like AI wrote them. English | Traditional Chinese | Simplified Chinese | Japanese | Korean | Spanish | French | German | Portuguese (BR) Live demo | Docs | MIT AiSniff marks phrases in English and Chinese text that match documented AI-writing patterns. Each mark names its rule, cites a public source and suggests a plain rewrite. The web editor, the CLI and the agent skill all run from one set of JSON rules, with no server and no model call. It reports patterns and says nothing about who wrote the text. A clean result doesn't prove a person wrote it, and a hit doesn't prove a model did. What it does to a text Before After In today's fast-paced world,
```

### 50216053: train60-sim, push

```text
Show HN: You Can Just Filter YouTube Playlists in the 'Save to Playlist' Dialog
https://news.ycombinator.com/item?id=50216053

Hacker News new | past | comments | ask | show | jobs | submit login Show HN: You Can Just Filter YouTube Playlists in the 'Save to Playlist' Dialog 3 points by ydoc5212 3 days ago | hide | past | favorite | 2 comments Hi HN, I'm Cody, I have 847 YouTube playlists, and always hated that YouTube failed to provide basic playlist management tools. Ctrl+F was never convenient and breaks past 200 playlists. So I built & shipped my first Chrome extension. It replaces the Save dialog with a native-feeling searchable one that fetches all your playlists (and whether the current video is saved there) directly from YouTube's InnerTube API. It works robustly across every current save surface (watch page
```

### 50217369: train60-sim, pass

```text
Show HN: Privacy Meridian, navigate global privacy laws
https://privacymeridian.org/

(no page text could be extracted)
```

### 50218601: train60-sim, must_read

```text
Show HN: Latch – Make any website usable by AI agents in one line (WebMCP)
https://latch.tools/

WebMCP · W3C standard · Chrome 149 origin trial · Edge 147 · Atlas · Comet One line makes your site work inside AI browsers. AI agents are already clicking through your site — and failing on your buttons and forms. Latch exposes your search, cart, and contact forms as WebMCP tools an agent can actually use. No server. No rewrite. <script src = "https://latch.tools/latch.js" defer ></script> Copy Drop it before </body> . Zero dependencies · ~6 KB · degrades silently where WebMCP isn't present. What Latch does It reads your page (read-only) and registers the actions an agent needs — nothing else. 🔎 search_site Finds your search box, types the query, and submits — so an agent can look things u
```

### 50219762: train60-sim, pass

```text
Show HN: Benchmarks of continual learning model trained for a month on a laptop
https://news.ycombinator.com/item?id=50219762

Hacker News new | past | comments | ask | show | jobs | submit login Show HN: Benchmarks of continual learning model trained for a month on a laptop 2 points by volotat 2 days ago | hide | past | favorite | discuss A month ago, I shared mini-AGI, an experiment in training a byte-level, continually learning language model from scratch on a single 8 GB laptop GPU (an RTX 3070). To recap the setup briefly: it completely decouples model size from VRAM by paging experts to and from an NVMe drive (currently 397 experts / 1.26B total parameters on disk, with only 32 resident / ~109M active in 5.1 GB of VRAM). It trains on a single stream at batch 1, with the attention/embedding trunk learning rate 
```

### 50221588: train60-sim, pass

```text
Show HN: Visual Studio extension that shows decimal and hex in the debugger
https://github.com/JochenBaier/AlwaysHex

AlwaysHex - Visual Studio Extension Show variable values in decimal and hex together while you debug in Visual Studio. Visual Studio's debugger shows numbers either in decimal or in hex. Which one depends on the Hexadecimal Display toggle, so you keep switching back and forth. AlwaysHex shows both: Without AlwaysHex With AlwaysHex int a = 100 100 100 (0x00000064) int neg = -1 -1 -1 (0xffffffff) int16_t i = 42 42 42 (0x002a) char ch = 'a' 97 'a' 97 (0x61) 'a' POINT pt {x=1655 y=222} {x=1655 (0x00000677) y=222 (0x000000de)} The radix you picked with Hexadecimal Display always comes first. With hex display on, 100 is shown as 0x00000064 (100) . Where it works Languages: C and C++ (native code) 
```

### 50222321: train60-sim, pass

```text
Show HN: A set of test-cases for CP/M emulators
https://github.com/skx/cpm-test

cpm-test This repository contains some simple programs to test CP/M 2.x emulators. To ease usage the tests are supplied as both Z80 assembly source files, and compiled binaries. The supplied Makefile can compile each example with the pasmo compiler if you wish to extend or rebuild them. The following table shows the syscalls which are exercised, note that we exclude system calls relating to reading console/auxiliary input, and those that refer to tracks, sectors and cylinders. With the exception of CONOUT.Z80 all the test programs are targeted at the CP/M BDOS interface. # Hex BDOS call Test coverage? 0 00h System Reset ( P_TERMCPM ) 1 01h Console Input ( C_READ ) 2 02h Console Output ( C_WR
```

### 50223070: train60-sim, pass

```text
Show HN: Loböle, open-source parametric CAD that AI agents can drive
https://github.com/eliasaronson/lobole

Loböle Open-source parametric CAD: B-Rep modeling on OpenCASCADE, a Vulkan viewport, and one command layer that the GUI, Python scripts and AI agents all drive. Linux first; Windows builds exist, macOS is untested. Version 0.1: so expect some rough edges. Issues are welcome. What it does Parametric modeling: a constraint sketcher, features that survive upstream edits (stable topological naming), variables and expressions, configurations, sheet metal, bent tube. Assemblies: mates, sub-assemblies, motion studies with clash checks, exploded views, a BOM, standard fasteners. Drawings: sheets with projected views, dimensions and tables, out to SVG and PDF. Simulation: static and modal FEM, and to
```

### 50223617: train60-sim, must_read

```text
Show HN: Mailrelay – Email to Webhook in Minutes
https://github.com/gowthamgts/mailrelay

mailrelay Turn incoming email into webhooks. A small, self-hosted SMTP server that checks each email against your rules and sends the matches to your webhooks, with a web UI to see what arrived and how each webhook responded. Point an MX record (or a forwarding rule) at mailrelay and wire email into the things that only speak HTTP: Bank and card alerts → your budgeting app (Firefly III, Actual) Receipts and invoices → Paperless-ngx or your accounting tool Monitoring alerts → ntfy, Slack, Discord, PagerDuty A support address → your helpdesk (Zammad, Linear, a custom API) Shipping notifications → Home Assistant Anything else → n8n, Zapier-style automations, your own service Quick start All you
```

### 50223635: train60-sim, pass

```text
Show HN: AI Trend Video – Put your photo into viral AI video templates
https://aitrendvideo.net

TRENDING NOW AI Trend Video Generator Pick a viral AI trend, add your photo and get a ready-to-post video in minutes — or upload any clip and turn it into your own template. No prompts, no editing. 6 viral trend templates · dance, rap, memes and cars · upload a photo, no prompt · 9:16 for TikTok, Reels and Shorts · custom templates from your own clips · credit cost shown before you create Hot right now HOT AI Rap Duo Two photos, one orange-room rap performance. 2 photos 15s HOT Bulin 47 Freestyle Step into the viral street freestyle. 1 photo 15s NEW Flying Car Stunt Your car up the ramp, upside down and airborne. 1 photo 8s CREATOR PLANS Turn any clip into your own template. Saw a video you 
```

### 50224373: train60-sim, push

```text
Show HN: Narro – Read web pages and Kindle books using local AI voices
https://github.com/swrdfish/narro

Narro Read any web page aloud with on device AI voices. Supports Kindle online reader. Features · Privacy · Report an issue Narro is a Chrome extension that reads the page you're on and highlights each sentence as it's spoken. Use a cloud voice with your own API key, or a voice that runs entirely in your browser, with no account and no server. It also supports Kindle Online Reader. Watch a demo Sentence highlighting and the floating player The popup: controls and settings Features Voices Engine Notes Cloud OpenAI gpt-4o-mini-tts with style instructions, tts-1 , tts-1-hd ElevenLabs Your own voices, listed with your key Google Gemini Gemini TTS voices OpenRouter One key for speech models from 
```

### 50224416: train60-sim, must_read

```text
Show HN: Whistle Translator
https://mahmoud.sh/whistle-translator/

Private by design, fast by default Speech recognition and translation both run on your computer's processor. After a one-time model download, it works on a plane, in a basement, or with Wi-Fi switched off. Dictate into any app Hold ⌥ Space ( Alt+Space on Windows) in Mail, Slack or a browser, speak, release, and your words are typed at the cursor. Translate as you type Hold ⌥ ⇧ Space ( Alt+Shift+Space ) to speak in one language and type in another. A floating pill shows your words as you speak. Live translation See the transcript appear as you talk. Each sentence is translated the moment you finish it. Nothing leaves your computer No account, no cloud, no telemetry. Your audio and text are pr
```

### 50225165: train60-sim, pass

```text
Show HN: Claude Code(and others) embedded in your app
https://github.com/gtanczyk/genaicode

One API and one CLI for the coding agents you already have. Claude Code · Codex · Copilot CLI · Cursor · Gemini CLI · opencode · Muse · Mistral Vibe · Antigravity Recorded live with Claude Code and Codex. Full video (87 s) . Quick start npx genaicode # chat with your agent in this terminal npx genaicode ui # the same chat in your browser npx genaicode run --verify " npm test " " fix the failing tests " npx genaicode embed # let your agent wire genaicode into your app run --verify runs the first agent CLI it finds, then your check; a failing check goes back to the agent for another try. -a codex (or claude , copilot , opencode ...) picks the agent, and the command stays the same. Node.js 20+;
```

### 50225233: train60-sim, push

```text
Show HN: Perch, a calm Mac app for juggling Claude Code sessions
https://perchfocus.com/

Do one thing. Perch watches the rest. A calm Mac home for your Claude Code work, with every session, PR, and link in one place. Perch stays quiet while you're in flow, and tells you when something needs you. Download for Mac Free beta · Apple Silicon · Notarized by Apple Works with the tools you already use Claude Code Runs the real Claude Code CLI with your own login. GitHub PR reviews, CI, and who you’re waiting on, through your gh login. GitLab Merge requests, approvals, and threads, through your glab login. Jira Ticket status and new comments, through Atlassian’s own sign-in. Azure Boards Work item status and new comments, through Microsoft’s own az sign-in. Links come along too. When a 
```

### 50229591: train60-sim, pass

```text
Show HN: ToolsOfWeb – 69 free online tools that run in the browser
https://www.toolsofweb.com/

69 free browser-based tools Free Online Tools for Everyday Tasks Fast, private tools for PDFs, images, text, developers, calculators, and more — everything runs right in your browser. ✓ 100% free ✓ No signup ✓ Private — files stay on your device Explore tools Browse categories Pro — coming soon Browse by category Jump straight to the tools you need. View all 69 tools → Image Tools 18 PDF & Documents 10 Text & Writing 11 Developer Tools 20 Calculators 4 Design & CSS 2 SEO Tools 2 File Utilities 2 Popular tools The most-used tools on ToolsOfWeb. Pick one to start. View all 69 tools → PDF Merge Combine multiple PDFs into a single file. Popular PDF Client-side • No sign-up Open → Image Compresso
```

### 50232061: train60-sim, pass

```text
Show HN: Snaparser – a tool to browse your Snapchat exports
https://github.com/vanillaiice/snaparser

Snaparser Snaparser turns Snapchat exports into a searchable local archive. The parser, SQLite database, and HTMX frontend run in one Go binary. Existing solution Snapchat already provides a static website when downloading your data . It can be used to view your login history, account info, snap & chat history metadata and a bunch of other useful stuff. However, there is no search or filtering. If you want to use it, run the command below: $ python3 -m http.server --directory data/ with data holding the content of your unzipped data If you want a more powerful ui, continue reading... Installation Install with go: $ go install github.com/vanillaiice/snaparser/v2/cmd/snaparser@latest Or downlo
```

### 50232722: train60-sim, pass

```text
Show HN: I found out a way to make openF1 data easy to analyse for normies
https://pitwall.plusminushalf.com/session/11392?t=4144&drivers=12,3

(no page text could be extracted)
```

### 50233315: train60-sim, pass

```text
Show HN: Repotruck – Mirror and organize GitHub repos with a TUI and MCP server
https://sametcn99.github.io/repotruck/

(no page text could be extracted)
```

### 50233685: train60-sim, pass

```text
Show HN: Lavoi – On-device speech-to-text in under 500ms
https://lavoi.app/

Lavoi Dictation that keeps up with your thoughts. Download for Mac Free · Apple silicon, macOS 14 or later Everyone talks faster than they type. Lavoi types into every app on your Mac, like Messages WhatsApp Gmail Google Docs Notion ChatGPT Claude Code Cursor and every other app Anywhere you can type: a browser, a terminal, a form, a chat. 4× faster than typing, just as accurate 225 min saved a week, for an hour of typing a workday Examples written for this page Messages To Mom Landed safe, I’ll call you once I’m at the hotel. Gmail To Ana Lima Hi Ana, can we move the review to Thursday at 2 pm? WhatsApp Family Who’s bringing dessert on Sunday? I can do the salad. ChatGPT New chat Plan three
```

### 50236232: train60-sim, must_read

```text
Show HN: Wabetune – Intonation Analyser · Strings · Winds · Brass · Voice
https://wabetune.com/

Intonation analyser · Strings · Winds · Brass · Voice Is your F♯ better than it was in March ? A tuner answers for the note you play now. wabetune measures how in tune you play and keeps the measurements, session after session, so the notes that drift show up as a pattern. Start playing See what it measures Eight tuning systems Fifteen sessions free No account until you save The audio never leaves your browser For any instrument where you place the pitch: a violin, a cello, a horn, a flute. The piano is out, because the note is decided before you arrive. The.instant Each cell is a note, across the octaves your instrument reaches. The colour shows how far off you were, in cents. A tuner does 
```

### 50236286: train60-sim, pass

```text
Show HN: I Made a Multiplayer 3D Shooter Game in Lisp (Again)
https://wizardos.io/

(no page text could be extracted)
```

### 50239793: train60-sim, push

```text
Show HN: Quill Desktop; Lightweight AI harness, no electron/WebKit native GUI
https://github.com/alshlabs/quill

Quill The lightweight, native desktop harness for every LLM Native Desktop UI APIs (No Electron) Minimal resource footprint, under 70mb of ram Extremely fast Rust core Supports every LLM provider, no lock down Based on VSCode's design Downloads Download from Github releases and run. Uses portable executables so no install is required. To uninstall delete the executable and the config under $HOME/.config/quill . Platform Link Windows quill.exe Windows Arm64 quill.exe MacOS Quill.app Linux Quill.AppImage Linux Arm64 Quill.AppImage Note: the MacOS build is unsigned because I am not spending US$99/year for an Apple developer account Demo recording-2026-10-25.mp4 How does this work? Quill uses th
```

### 50241557: train60-sim, pass

```text
Show HN: Nord Theme for Cursor
https://github.com/willio/nord-theme-for-cursor

Nord Theme for Cursor Nord (Polar Night) for the Cursor editor's UI chrome — a custom glass theme written into Cursor's theme store, plus the official Nord VS Code extension for editor syntax colors. No Cursor binaries are patched; this only writes theme records and settings. Main window — sidebar, chrome, and canvas in Polar Night. Settings → Appearance with the glass theme's Nord record active: Hue 220, Intensity 0, Reduce Transparency on — exactly the values apply.sh writes. What gets themed Surface Value Sidebar, chrome (title/toolbar), panes #2e3440 (nord0) Elevated surfaces — menus, dropdowns, meta panels #3b4252 (nord1) Base foreground #d8dee9 (nord4) Accent / focus ring #88c0d0 (nord
```

### 50242510: train60-sim, pass

```text
Show HN: Managing AI Models After Launch-Versioning, Evaluations, and Fallbacks
https://geekyants.com/blog/how-geekyants-manages-ai-models-after-launch-to-maintain-security-control-and-flexibility

Oct 19, 2026 How GeekyAnts Manages AI Models After Launch to Maintain Security, Control, and Flexibility AI models don’t stay predictable forever. Discover how GeekyAnts’ documented projects keep model changes in check, catch performance issues, protect sensitive data, and switch providers when requirements change or issues arise. Business Artificial Intelligence Author Harrini Harrini Content Writer Subject Matter Expert Ankit Kumar Pandit Tech Lead - II Selecting an AI coding assistant does not settle how it will behave six months later. Model versions, prompts, and configurations can change, and without version control and repeatable evaluations , those changes can affect development work
```

### 50242526: train60-sim, pass

```text
Show HN: Graph-MIND – Local memory for AI coding agents, no LLM calls to save
https://github.com/goyohan0611-png/graph-mind

Graph-MIND Your AI forgets everything when the session ends. This one remembers, and it never calls an LLM to do it. 88.8% on LongMemEval. Zero model tokens spent saving memory. Runs on your own PC. Decide something with one agent on Monday. Ask another on Wednesday. It knows. English · 한국어 Recorded live on one PC: Claude Code (Opus 5.5, effort high) and Codex (GPT-6.1-Sol, effort high) sharing one Graph-MIND memory. Model thinking time is fast-forwarded. Install Windows: download Graph-MIND-Setup.cmd and double-click it, or in PowerShell: irm https: // raw.githubusercontent.com / goyohan0611 - png / graph - mind / main / scripts / install.ps1 | iex macOS / Linux: curl -LsSf https://raw.gith
```

### 50242875: train60-sim, must_read

```text
Show HN: Logfolio – A public log for books, films, games and anything you keep
https://logfolio.co/

📖 Books 🎬 Films 📺 TV 🎮 Games 💿 Albums 📝 Notes 💬 Quotes 🔖 Bookmarks 📷 Photos 🧩 Custom types 📖 Books 🎬 Films 📺 TV 🎮 Games 💿 Albums 📝 Notes 💬 Quotes 🔖 Bookmarks 📷 Photos 🧩 Custom types Everything you read, watch, play, collect, build, and love on one page. Everything you love read watch play collect build love on one page. Log the books, films, shows, games, and albums you love. Share them on one page. Claim your username See a sample profile Import from Goodreads Letterboxd Spotify IMDb Steam GitHub + 11 more What a page looks like · See Naeem's profile → N Naeem @naeem · 48 photos · 92 books · 158 films · 49 games 📖 Books 92 🎬 Films 158 More than what you read and watch 
```

### 50243142: train60-sim, pass

```text
Show HN: MindThread CLI and MCP server for Threads, with per-permission approval
https://github.com/ppcvote/mindthread-mcp

MindThread MCP: the Threads scheduler built for AI agents Let Claude, Cursor or any MCP client write, schedule and publish Threads posts, review drafted replies and read insights for your accounts, through Meta's official Threads API. 40+ tools, a free sandbox key, and permission controls so the agent asks before it posts. claude mcp add --transport http mindthread https://mindthread.tw/api/mcp --header " Authorization: Bearer mt_live_your_key " 繁體中文說明在下方 What your agent can do Write : generate 1 to 5 drafts in the account's voice (persona, brand material, content formulas), or threads of 2 to 10 parts. Schedule and publish : text, single image, carousel (2 to 10 images) or video, now or at 
```

### 50243157: train60-sim, pass

```text
Show HN: Sbr, a sing-box compatible client for government resistant VPN infra
https://sbr.blit.cc/benchmarks/

benchmarks Measured on 2026-10-26. Both cores were given the same config file and run as clients of servers on loopback, so most of these figures are the cost of the client itself rather than of a network; one section measures a real server over a home connection. Each figure is the lowest and highest of three rounds. The solid part of a bar reaches the lowest, the faint part the highest. The machines were loopback-only and some were shared with other builds, as noted under each chart, so a difference of a few percent is a tie. The raw tables and method are in BENCHMARKS.md . proxy throughput, linux OrbStack Linux VM with 8 vCPUs on an Apple M1 Pro, four streams for 5 s, three rounds. sing-b
```

### 50351684: day-1104, pass

```text
Show HN: Open-Source Searchable Job Board for HN's Hiring Threads
https://flaviaouyang.github.io/hackerjobs/hiring/

Search Location Arrangement Remote 0 Hybrid 0 Onsite 0 Minimum pay per year (USD) Hides posts without yearly pay Seniority Intern Junior Mid Senior Staff Principal Lead Manager Director Executive Technologies Industry Any industry More Visa sponsorship 0 Offers equity 0 New companies only 0 Hide closed 0 Hide reposts 0 Clear filters … jobs Details are read from each post by rules and AI, which can make mistakes. Check the original post before you apply or reach out. Filters Sort Newest Highest pay Loading…
```

### 50351797: day-1104, pass

```text
Show HN: Hardcount – Self-hosted usage billing for AI products
https://github.com/gethardcount/hardcount

Usage billing for AI products, on your own servers. Price tokens per model, sell prepaid credit, and see what each customer costs you. Hardcount makes the invoices, and Stripe charges the card. Your billing data stays in your own Postgres. An open-source alternative to Stripe Billing and Lago: no Stripe Billing fee, no paid edition, and light enough to run yourself. Why Hardcount → What it looks like One month of AI usage for one customer, from the demo in test mode: one invoice line per model and token type, $5.73 due. Your margin on it is 51.9% (Sonnet 67.1%, Haiku 20.0%), shown only to you. ▶ Watch the 65-second walkthrough , narrated, with captions. Quick start Try Hardcount on your own 
```

### 50351830: day-1104, push

```text
Show HN: Remene – Understand your MRI and prepare questions for your doctor
https://remene.si

Your MRI, in words you understand. Upload the folder you got from radiology and find out what your images show, what your report says and what to ask your doctor. Upload your MRI Viewing your images is free. Nothing to install. IMG 7 / 16 Real knee MRI images, de-identified and published with the person’s consent. You got a CD, a report full of words you’ve never heard and an appointment three weeks away. Remene helps you make sense of them before then. It shows you exactly where. The analysis reads your images and explains each structure in turn: what it is, what can be seen and what you could ask. Every explanation points to the slice and the area of the image it comes from. 1 IMG 16 / 16 
```

### 50351982: day-1104, push

```text
Show HN: LinguaFlick – An application for learning Chinese based on vocabulary
https://linguaflick.com/

Bring Words to Life Provide a set of words or phrases, and LinguaFlick will create a memorable, scenario-based video for you. Get Started Watch the demo (~30 sec) AM MT SO NA LE SA Join 700+ language learners using LinguaFlick Turn the words you want to learn into a story Add words like 今天 (today) and 旅行 (travel), then pick a setting and difficulty. In Hotel Lobby Pause, two cousins catch up in Mandarin after a long trip. Watch the story, then read the conversation Follow two voices and bilingual subtitles, then open the full transcript to see how the words fit into each sentence. Replay a line or look up a word Slow down and replay the line you missed. Select a word in the subtitles to see 
```

### 50352087: day-1104, push

```text
Show HN: A Chrome extension to spot red flags Amazon isn't showing
https://chromewebstore.google.com/detail/hi-arthur/phbcjeeganjjjdkgohknifkmdbplhfeo

(no page text could be extracted)
```

### 50352158: day-1104, pass

```text
Show HN: Track any YouTube title/thumbnail test via WebSub, hashes, and no OAuth
https://scoutyt.com

Stop Missing Competitor A/B Tests Track any YouTube channel’s A B tests in real time. Steal the thumbnails and titles that win. When competitor channels swap thumbnails or rewrite titles to boost views, ScoutYT alerts you immediately. See what changed and when, before their video blows up. Start Tracking No YouTube login needed No credit card to start 100% automated alerts Works with any channel in your niche MrBeast 340M subscribers • Entertainment Swapped Thumbnail | +184% views Andrew Huberman 6.2M subscribers • Health & Science Changed Title | +112% views MKBHD 19.5M subscribers • Tech Changed Title | +64% views Ali Abdaal 5.8M subscribers • Productivity Changed Title | +146% views Verit
```

### 50352209: day-1104, pass

```text
Show HN: APIblaze: Kong and Auth0 and FGA but $0/month
https://www.apiblaze.com

npx apiblaze@latest skills · no signup Serverless MCP & API Gateway Everything built-in for human and agent traffic Secured MCP Multi-tenant Self-serve API keys OAuth sign-in Authorization Throttling & quotas Localhost tunneling Custom domains One prompt. No sign-up needed. Your MCP & API ready. Your app goes behind a proxy and an MCP that bring everything production needs: multi-tenant , authentication (self-service API keys and OAuth), authorization with users and groups. In seconds. Copy prompt Ask your agent to use APIblaze to ready your backend for launch Copy prompt ~/code/mybackend $ npm run dev ⚡️ My app: A restaurant table booking app, running on localhost:3000 GET /reservations/{id
```

### 50352315: day-1104, pass

```text
Show HN: Isitslop.org: AI Can build anything. Was it worth it?
https://isitslop.org

AI can build anything. Was it worth it? How sloppy is it, 0% to 100%, for anything built with AI (so everything). Read from the owner's analytics and repo by open rules the community can read and change . Search Claim Loading… 1. Claim it. Sign in with GitHub and prove the URL or repo is yours. Nothing is listed until you do. 2. Connect. GitHub for Quality, your own Google Analytics for Popularity: read-only access, used only to count your new and returning users. 3. Get graded. Public rules, public result, public appeals. The rules are a pull request away. One public file. No model, no secret weighting. Fix a rule and it changes for everyone. Change the rules github.com/jayjaychicago/isitsl
```

### 50352316: day-1104, push

```text
Show HN: Run Conway's Game of Life in CSS
https://bucket.svc.moe/uploads/wss/life.html

The required CSS features are not supported by your browser. Please try an up-to-date Chromium-based browser. Esc ` ~ 1 ! 2 @ 3 # 4 $ 5 % 6 ^ 7 & 8 * 9 ( 0 ) - _ = + Bksp Tab q Q w W e E r R t T y Y u U i I o O p P [ { ] } \ | a A s S d D f F g G h H j J k K l L ; : ' " Enter Shift z Z x X c C v V b B n N m M , < . > / ? Space PC
```

### 50352862: day-1104, push

```text
Show HN: Mixttape – Share songs like a kid from the 80s
https://mixttape.app/

Build playlists, share memories, insights, humor, secrets, feelings memories insights humor secrets feelings Pull songs from Spotify to create a playlist for someone, then include the reason you think they'll like it. Start a mixttape No account needed. Ready to share as soon as you make it. How it works 01 Search Spotify and pick your songs 02 Add a short note on why each one matters 03 Share the link — they just press play Keep your mixttapes across devices. Sign in with Google Why sign in?
```

### 50352961: day-1104, pass

```text
Show HN: HackerX – Hacker News front page docked in x.com, newest first
https://mllearnerakash.github.io/HackerX/

What it does Hacker News is the highest-signal filter on the web. x.com is where the argument happens. This connects the two without scraping either one. Ordering Newest first, like x.com Rows sort by HN post time by default, and each one opens /search?f=live — X's own live tab, its native renderer, its native order. Speed One click to the thread Titles are reduced to a 2–3 term X query by a deterministic scorer that keeps versions, C++ -style operators and proper nouns. Context Badges on your timeline Posts that match a live topic get a small HN · N pts chip linking to that search. Toggle it off in the popup. Control Filter, sort, move, hide Filter the list, switch to most-points order, dra
```

### 50353110: day-1104, must_read

```text
Show HN: Agent Trace, let agents query Codex and CC chat histories
https://github.com/wcook04/agent-trace-mechanism

Agent Trace Desktop app preview. You can install the history reader and agent tools today. The desktop app and its in-Codex interface aren't packaged yet; both would also be free and open source. Let an agent read your earlier Codex and Claude Code conversations. Agent Trace reads the session files that Codex and Claude Code save on your computer. An agent in either app can read chats from both sources, including messages and recorded tool activity from a chat that is still running. You choose which session files it can access. The MCP (Model Context Protocol) server runs locally and gives your agent tools for finding and reading those histories. The package also includes the underlying Pyth
```

### 50353251: day-1104, push

```text
Show HN: Speedwidget – macOS widget how fast and how stable internet is
https://github.com/franzenzenhofer/speedwidget

speedwidget A macOS desktop widget that tells you how fast and how stable your internet is - while using almost no data. Built for laptops that live on phone hotspots and hotel Wi-Fi. (screenshot rendered from fictional example data) Why Normal speed tests download tens to hundreds of megabytes per run. On a metered hotspot that hurts. speedwidget measures continuously and spends only a few kilobytes per hour: What How Data Real traffic reads the kernel's interface byte counters every 2 s 0 bytes Ping bare TCP handshake to 1.1.1.1:443 once a minute (every 10 s while down) ~250 bytes each, ~0.36 MB/day Speed test one 256 KB download from speed.cloudflare.com ; automatic at most every 3 h, ski
```

### 50353468: day-1104, push

```text
Show HN: Interactive notes on RLHF, attention, LoRA and LLM evals
https://concepts.laxmena.com/

Concepts Engineering ideas you understand by changing the inputs. This page needs JavaScript.
```

### 50353696: day-1104, push

```text
Show HN: Neurolume – Fine-tune LLMs on a Mac and watch what changes per layer
https://github.com/Yiteng-CHEN/neurolume

Neurolume Watch your model learn. Fine-tune an LLM on your Mac in a few clicks — and see, layer by layer, what training actually changed. ▶ Try the online demo (no install; replays a real recorded run) · English · 简体中文 Real data, not a mock-up: one answer from Devstral Small 2 on an M5 Max (per-layer activity, logit lens, per-token confidence) and a real adapter's ΔW, replayed in the online demo · video Most fine-tuning tools stop at "training finished, loss = 1.23". Most interpretability tools show a model you cannot change. Neurolume puts both in one local app: you train the model, and you watch its insides while you do it. Status: early alpha. Server, UI and tooling are unit-tested (110+ 
```

### 50354044: day-1104, must_read

```text
Show HN: Negative Space – Startup ideas from the gaps between YC companies
https://nh66.ai/negative-space/

ネガティブ・スペース Negative Space A map of the startups that exist, and a search for the ones that don't yet. YC companies · dimensions of meaning · clusters, none labelled by hand Good artists copy. Great artists steal. Master artists create embeddings, find the farthest distance, and then eat a sandwich about it. Probably not Picasso See the generated ideas How it works Built by NH66.ai , an AI engineering studio. // READ A description becomes a location An embedding model reads each company's description and turns it into numbers. Those numbers work like coordinates, so companies that sound alike land near each other. FIRST 12 OF NUMBERS SIMILARITY TO // GROUP Neighborhoods form on their own Nobo
```

### 50354314: day-1104, pass

```text
Show HN: Ads-Boy: Track Planes on Your Game Boy
https://www.bjmalicoat.com/projects/adsboy

← Older Home ADS-Boy Lately I’ve been building a jukebox for Game Boy cartridges and I’ve become fascinated by some of the more obscure “games” like the Bandai Pocket Sonar that mostly didn’t leave Japan. The great thing about cartridges is that we can add whatever chips we want, allowing us to bring this 40-year-old hardware into modern times. With Game Boy on the brain, I set out to build an offline flight radar cartridge that works on the original Game Boy. After the hardware worked, I took it further with a “Lemonade Stand meets StreetPass” Airline Simulator. ADS-B Background Most aircraft broadcast a steady stream of information about themselves at 1090 MHz via a system called Automatic
```

### 50354365: day-1104, push

```text
Show HN: Record Demo Video on Mac with auto zoom, full controll
https://rescreen.studio

Native macOS screen recorder & editor Screen recordings people actually watch Record your screen, and ReScreen does the part you dread: it zooms into every click, makes your cursor readable, drops the whole thing on a background worth sharing, and exports up to 4K — without your footage ever leaving the Mac. Download for macOS See how it works macOS 13 Ventura or later · Apple Silicon and Intel · from $12 Zooms into every click Built from your real clicks A cursor people can follow Sized, smoothed, clicks shown Nothing leaves your Mac Zero frames uploaded Export up to 4K MP4 or MOV · 30 or 60 FPS frames uploaded anywhere 0 export at 30 or 60 FPS 4K separate tracks in every take 4 payment for
```

### 50355009: day-1104, push

```text
Show HN: Tmux-restore saves tmux windows and agent sessions across reboots
https://github.com/andrewboldi/tmux-restore

tmux-restore Reboot-proof tmux. Your coding agents pick up mid-conversation. What it does · Install · How it works · Agents · Caveats · Contributing Ever rebooted and lost a dozen tmux windows, along with the agent conversations running in them? tmux-restore saves everything every minute and right before shutdown, and puts it back when tmux starts. Panes running Claude Code, Codex, Gemini CLI, opencode or pi reopen the exact conversation they were in. What it does Everything comes back. Sessions, windows, splits, working directories and scrollback. Agents resume mid-conversation. Each one reopens its own conversation, with the same flags. Saved at shutdown, not just on a timer. Every minute,
```

### 50355011: day-1104, push

```text
Show HN: Fruitiger Aero Media Player on macOS
https://github.com/xdaedalusx/icarus

iCarus: A Transcendental Approach to Music Streaming A skinnable media player for macOS 13+, built with SwiftUI. Download music and video with yt-dlp, play it with an equalizer and live visualizer, and dress the player in skins, including Windows Media Player skins ( .wmz ). Run it Open iCarus.xcodeproj in Xcode, choose the iCarus scheme with destination My Mac , and press ⌘R. Get needs yt-dlp and ffmpeg: brew install yt-dlp ffmpeg . If downloads start failing later, brew upgrade yt-dlp usually fixes it. What it does Two modes (⌘1 Play, ⌘2 Get). Get Paste a link and download audio or video with yt-dlp. Finished files go to ~/Music/iCarus (changeable) and appear in Play automatically. Cover a
```

### 50355392: day-1104, pass

```text
Show HN: A 3KB LLM inference engine in C
https://github.com/utsav1033/bytesized

bytesized: a 2,946-byte LLM engine How small can a program be and still talk? A C program that runs SmolLM2-135M , a real LLM, and produces exactly the same greedy tokens as Hugging Face transformers. It reads the original model.safetensors and tokenizer.json with no converter. The binary is 2,946 bytes (Linux arm64), small enough to fit in a single QR code (max 2,953 bytes). Left: decode the QR code, compare sizes, run it ( video , real speed). Right: the QR code is the whole program (click it for full size). To get it back: zbarimg --raw --oneshot -Sbinary qr.png > final && chmod +x final Most phone camera apps treat QR codes as text and will mangle the binary, so use zbarimg (from zbar) o
```

### 50355461: day-1104, pass

```text
Show HN: Local in-browser privacy-redact for pdf and images using WASM
https://github.com/gitcommitshow/privacy-redact

privacy-redact Detect and redact private data in text, screenshots, and PDFs. It runs locally, and nothing is uploaded. npm i privacy-redact Requires Node.js 24 or later. Browser components need Chrome or Edge 119+, Firefox 121+, or Safari 17.4+. Features Supported media types: Server side ( privacy-redact ): text, including OCR output from your own engine Browser side ( privacy-redact/ui , privacy-redact/react ): PNG, JPG, WebP, GIF, BMP, AVIF, and pasted screenshots, plus PDFs. HEIC is not supported Ways to use it: Server only: call redactDocument for text. No browser code is needed. Server for text, React for the UI: use redactDocument on the server, and mount PrivacyRedactReview only whe
```

### 50355555: day-1104, pass

```text
Show HN: Who can publish to your NPM dependencies?
https://www.whosthere.dev/

Who's There? See who can push code to your app Who's There? is a free security tool for software teams. It reads a project's npm lockfile in your browser and lists every person who can publish code into the project's dependencies, then flags the accounts an attacker might take over: maintainer email domains anyone can buy, new maintainers, releases that skip CI, and code that runs on install. Scanning needs no account. Signing in with Google is optional: it lets you save projects, watch them for changes and get alerts. We use only your name, email address and profile picture to identify your account, and never sell or share them. Privacy policy
```

### 50355591: day-1104, push

```text
Show HN: Bundle – I kept forgetting what I read, so I built a read-later app
https://bundle.ink/

Remember what you read Bundle saves what you read, asks you a few questions about it, and files the answers as cards you keep. tap Share in any app, then Bundle it files it under a topic for you a clean page, with the summary on top hold a line to highlight it ask anything, it answers from the article a few questions when you finish keep the good ones as cards three days later… a nudge right before you'd forget remembered, so it waits longer next time 9:41 NIH News in Health APRIL 2013 Sleep On It How Snoozing Strengthens Memories When you learn something new, the best way to remember it is to sleep on it. That’s because sleeping helps strengthen memories you’ve formed throughout the day. “W
```

### 50355595: day-1104, push

```text
Show HN: Vanilla-web skill to replace all JavaScript frameworks
https://github.com/baalimago/skills/tree/main/skills/vanilla-web

vanilla-web A styleguide skill for building web apps with HTML, CSS and JavaScript only: no framework, no bundler, no server logic. It targets coding agents, but the conventions are the same ones a human team would adopt. This skill was developed agentically. A coordinating agent ran five parallel research agents, a report writer, and five reference writers, with a human reviewing and steering between rounds. The chain of evidence is kept: every rule in references/ carries the link it was derived from. It was manually reviewed though. Look here is a speling error as proof. How it was made Research. Five agents each took one subtopic: semantic HTML and accessibility, custom elements, module a
```

### 50355827: day-1104, must_read

```text
Show HN: Scroll from your own skeleton to the edge of the observable universe
https://vatsaltanna.com/traveltoinfinity/

Start scrolling Welcome home And the end of all our exploring Will be to arrive where we started And know the place for the first time – T. S. Eliot Distance from your body 0 m Travel to infinity and back Scroll to travel from the pyramids of Giza to the edge of the observable universe and back. Start scrolling For small creatures such as we the vastness is bearable only through love – Carl Sagan Take me back home Credits
```

### 50355931: day-1104, must_read

```text
Show HN: Every book, film and game HN has recommended since 2006
https://hn-recommends.vercel.app/

Twenty years of Hacker News recommendations. Every book, film, album, game and place HN commenters have told each other about since 2006, ranked by how many different people recommended it. Books Ranked by score: one point per person who recommended it, plus half a point if they called it a favorite. From a thread about the item itself, at most 5 people count, so one viral discussion can’t outrank years of steady recommendations. How it works Show more How it works How items are ranked What to keep in mind Credits Made by Joshua Fonseca Rivera ( @jfonsecarivera on X). Inspired by Andrej Karpathy's HackerTube , which does the same for YouTube videos. Comments come from the open-index/hacker-n
```

### 50356156: day-1104, pass

```text
Show HN: Animus AI Blocker:Block AI slop images/videos on your social media feed
https://chromewebstore.google.com/detail/animus-ai-blocker/ofpjilegndibkndcacajdgmkjicjgbck

Animus AI Blocker Share Extension Social Networking 9 users Add to Chrome Overview Hide images and videos labeled as AI-generated on supported social websites. Reveal filtered content anytime. Hide declared AI images and videos on supported social feeds. Animus AI Blocker Early Access replaces matching media with a reversible notice when it finds an explicit generation declaration, trusted synthetic Content Credentials when available, or one of your saved filtering choices. You stay in control: - Select Show once to reveal filtered content. - After revealing a post, select Not AI to save a local correction. - Enable or disable protection for each supported website, or turn it off everywhere.
```

### 50356643: day-1104, pass

```text
Show HN: Scriptorium – Turning Lectures into Obsidian Notes and SR Flashcards
https://github.com/alessiocelentano/scriptorium

Scriptorium Warning This repository is still unstable, though your notes are safe. Take precautions and please report bugs. The operating system for students who care about details and their own time. Scriptorium, although highly customizable, is written with a few pillars in mind: Obsidian Vault : by default, the generated notes use outgoing links to connect notes to one another. Spaced Repetition : by default, drafted flashcards [1] are generated at the end of each note using a custom syntax for this Obsidian plugin . Recorded Lessons : Scriptorium is at its best when loading recordings or audio files. Extensibility : Scriptorium exposes its own API for creating custom panes. See Extending
```

### 50356948: day-1104, pass

```text
Show HN: Graftfork: rebase fork patches onto each upstream release, test-gated
https://graftfork.com/try

(no page text could be extracted)
```

### 50357042: day-1104, push

```text
Show HN: Recto: A desktop app where you can design with AI, edit with your mouse
https://recto.design

the visual canvas for coding agents build ui, motion and 3D with Claude Code, Codex, Cursor and more. recto runs locally, giving your coding agent a visual workspace to build in, while you see every change, edit anything directly, or simply reprompt. all without leaving recto. Free download recto. see how it works Your browser does not support embedded video. Watch the Recto software demo. one canvas. more ways to create. UI SVG 3D Motion 01 Create with AI AI builds. You direct. your agent can code. now it can design with you. coding agents are great at building. but designing with them still means jumping between terminals, browser previews, screen shots and prompts like: ● Update(pages/ind
```

### 50357117: day-1104, must_read

```text
Show HN: Twitter but you can only use paint
https://peck.pikju.com/

Create an account to paint 80 × 40 pixels, 16 colors, no words Remix of @ romain Remix of @ kyr04i Remix of @ dcbuilder Remix of @ asdfghjkl Remix of @ lojvuongw Remix of @ dcbuilder Remix of @ sunny_heron Older paintings
```

### 50357326: day-1104, pass

```text
Show HN: ZapFast, Native WhatsApp for Linux, macOS, and Windows with Calls
https://zapfast.rocks/

Skip to content Search documentation Esc ZapFast WhatsApp, native and fast A lightweight WhatsApp app for Linux, macOS, and Windows. Chat, send voice messages, and share files. Download What is ZapFast? GitHub ⚡ Lightweight Opens in under a second and uses about 200MB of RAM. No browser engine. 🦀 Native, in Rust Built with egui and fastframe , the framework behind a family of native desktop apps. No browser engine inside. 🎤 Voice messages Play, seek, and record voice messages in the chat. OGG/Opus support is built in. 🖼️ Attachments Photos, GIFs, stickers, documents, polls, locations, and link previews appear in the chat. Add captions before sending files. 🔔 Background mode Closing the w
```

### 50357386: day-1104, pass

```text
Show HN: Bookmarker - A minimal, private bookmark organizer for macOS
https://github.com/meraccos/bookmarker

Bookmarker Tired of bloated and paid bookmark organizers? A minimal , private bookmark library built natively for macOS. Save pages from Safari, read clean offline copies, search downloaded text, and keep your library in iCloud Drive. Features Minimal interface that stays focused on saving, organizing, and reading. Save the current webpage from Safari's context menu. Search titles, URLs, descriptions, topics, comments, and downloaded article text. Read clean local copies offline. Organize bookmarks with an inbox, topics, favorites, and read status. Store each bookmark as portable JSON in iCloud Drive or any folder you choose. Keep seven daily local backups automatically. Install Download the
```

### 50358104: day-1104, pass

```text
Show HN: CogsIQ – True landed cost and profit per SKU for TikTok Shop sellers
https://www.cogsiq.io/

For TikTok Shop sellers Landed cost and true profit for TikTok Shop sellers. CogsIQ works out what each unit cost you to land, freight and duty included, costs every sale against the batch it came from, and brings in TikTok's orders, settlements, fees, ads and payouts. Then it shows what each SKU, batch and shop actually kept. Start free for 30 days See pricing 30 days free with one shop and 5 purchase orders. No card needed. Net margin, example shop, Mar to Jul 2026 Illustration +6.9% Revenue $66,380.00, net profit $4,550.80, accrual basis −20% 0 +20% Mar $8,240.00 620 units −13.6% Apr $11,480.00 890 units +7.3% May $6,910.00 520 units −4.6% Jun $18,300.00 1,430 units +11.7% Jul $21,450.00 
```

### 50358109: day-1104, pass

```text
Show HN: Collabrun – affiliate creator outreach for TikTok Shop sellers
https://www.collabrun.com/

For TikTok Shop sellers TikTok Shop affiliate invites on autopilot. Affiliate creators that actually earn you money. Collabrun connects to your TikTok Shop, finds creators who fit it, sends them collab invites in the background and handles their sample requests. Then it shows what each creator and campaign made after every cost. Start free for 30 days See pricing Try everything free for 30 days. No card needed. Profit after every cost, this month Illustration $2,000 C1 @creator_one Sales $4,000 $1,300 profit C2 @creator_two Sales $2,500 $900 profit C3 @creator_three Sales $6,000 −$200 loss An illustration, not real shop data. The creator who sold the most made a loss once every cost came out
```

### 50358314: day-1104, pass

```text
Show HN: Kairos – Open-source risk and fraud decisioning platform
https://github.com/finic-ai/kairos

Kairos Cloud · Docs · Discord · Finic Kairos is open-source, real-time fraud and risk decisioning Kairos decides every sign-up, login, order, payment and payout as it happens, and keeps each decision with the signals behind it. It is an open-source alternative to Sardine, Sift, Riskified and SEON, with two things they don't have: your coding agent tunes it , and decision models catch fraud before you have the labels to train on. Decisioning Real-time decisions : one call returns approve, step up, review or block, with a risk score and the reasons, from the subject's history, the devices, cards and addresses it shares with others, and the session. Workflows : ask a decision model, score with 
```

### 50358352: day-1104, must_read

```text
Show HN: Uncracked City, detective game where you question LLM suspects that lie
https://uncracked.city

Unsolved case files Uncracked City The cases nobody has cracked. A detective game set in real cities. Search the places, question the suspects, catch the lie, and write the report nobody has managed to write yet. Coming to the App Store Get it on Google Play Watch with sound on YouTube Halloween case The Thirteenth Step Salem, 2025 Salem, the morning after Halloween. Meg Ashcombe, the last of her family, lies at the foot of her grand staircase, one slipper on the thirteenth step, the front door bolted from the inside. Half the town says the Gray Captain finally took her. Four suspects. One of them lies. Nobody has cracked it yet Watch the teaser on YouTube How you investigate 01 Search the p
```

### 50358404: day-1104, pass

```text
Show HN: An MCP Server for Manpages
https://www.chainguard.dev/unchained/every-manual-page-in-chainguard-os-now-readable-by-your-agent

Subscribe to our newsletter All articles November 3, 2026 It’s a man’s, man’s, man’s world: Every manual page in Chainguard OS, now readable by your agent Dustin Kirkland SVP, Engineering Chainguard View all articles Dustin Kirkland SVP, Engineering 20 years of manual pages on the web In 2008, I was a brand-new engineer on the Ubuntu Server Team at Canonical, and my starter project was the Ubuntu Manpage Repository: a website that rendered every manual page in all of Ubuntu as static, searchable HTML. It is still live today, at manpages.ubuntu.com . That site was built for the era of search engine optimization. The reader we had in mind was a developer typing a question into a search box, an
```

### 50358826: day-1104, pass

```text
Show HN: Shot-butcher: iOS, ipados, macOS apps screenshot maker skill
https://graphicmeat.com/shot-butcher

25 styles True bento to risograph, every one rendered below Store sizes iPhone 1320×2868, iPad 2064×2752, Mac 2880×1800 One prompt Printed under each style, reproduces the look Real captures Your app's screens, never a mocked UI How it works Install it. Point it at your app. Shot Butcher is a skill for Claude Code. Your captures go in, finished store PNGs with no alpha channel come out. HTML, CSS and a headless browser do the drawing, so a set renders the same way next month. /plugin marketplace add GraphicMeat/shot-butcher /plugin install shot-butcher@shot-butcher Capture Bring your own PNGs, or use the included scripts for the iOS simulator, Mac windows and web builds. Pick Choose a style 
```

### 50359691: day-1104, pass

```text
Show HN: Export your Character.AI chats in minutes – open-source, runs locally
https://github.com/anima-universe/character-ai-chat-exporter

Chat Exporter for Character.AI Save your own Character.AI chats, the characters you talked to and made, your personas and memory boxes to one file on your computer. It takes minutes, where the official export can take 3 to 4 weeks . The file stays on your device; nothing is uploaded anywhere. Read it anywhere. One JSON file, plus plain text if you want it. Both sides labelled. Every line says who wrote it and when, which the official export does not. Your own characters with their definitions. Characters made by other people come with what the site shows publicly. Stop any time. Stop saves every chat read so far. Open the file in the free viewer: amavie.ai/character-ai-export . It reads the 
```

### 50359805: day-1104, must_read

```text
Show HN: Modelpeers – a changelog for the AI models and agents you use
https://modelpeers.com

Follow AI agents and models like you follow people Know when a new version ships, and when something you rely on changes. Tools you use Claude Code OpenAI Codex Cursor GitHub Copilot Antigravity Grok Bot Meta Muse ChatGPT Work DeepSeek Harness Claude Cowork OpenClaw OpenAI dots Grok Build Gemini Spark Gemini CLI Muse Code Kimi Code Antigravity CLI Copilot Cowork Gemini Code Assist Claude Security Codex Security Gemini agent OpenAI Presence ChatGPT workspace agents Jules ZCode Antigravity Agent (Gemini Managed Agents) Gemini Deep Research agent Vibe Code Claude Duet + 24 more Models you build on Claude Opus GPT-6 Claude Sonnet Gemini DeepSeek V4 Kimi GLM Muse Grok Claude Fable GPT-5.x GPT Ima
```

### 50360046: day-1104, pass

```text
Show HN: An interactive map of midterm ads
https://admap.org/

Back to map Details Report this ad Previous Next ad All states Ads per race 1–4 5–19 20–49 50+ None found No race Made by Panagiotis Vorvolakos Sources Privacy
```

### 50360517: day-1104, push

```text
Show HN: Predictygraph – animated diagrams styled with CSS, no reshuffle on edit
https://predictygraph.github.io/

predictygraph ¶ Predictable graphs. Diagrams as readable text, laid out the way you said, styled with plain CSS. Start here Install, write your first diagram, render it. Getting started Learn the language Layouts, edges, styling, annotations, themes and animation, one page each. Guide See what it can do Architecture diagrams, flowcharts and the usual Mermaid diagram types. Gallery Look something up The full language spec, every command-line option, editor setup. Reference Mermaid and Graphviz rearrange your whole picture when you change one box. predictygraph doesn't: each group picks its own layout , so a change stays where you made it. A taste ¶ # SPDX-FileCopyrightText: 2026 Hulk Predicty
```

### 50360658: day-1104, push

```text
Show HN: Pauseless – Free silence/filler-word remover from videos, on-browser
https://tahaygun.github.io/pauseless/

Free · Open source · Runs in your browser Cut the silence out of your videos in seconds Pauseless finds every pause in your recording and removes it. Send the result to Final Cut Pro, DaVinci Resolve, Premiere Pro or CapCut, or export the finished video. Your files never leave your computer. No upload No account No watermark No limits Drop a video here Choose a video MP4, MOV, M4A or WAV · Chrome or Edge on Windows and macOS ~5 s to analyze a 1 hour video 3 ms to update cuts when you move a slider 0 MB uploaded to any server Measured on a 1 hour, 2.7 GB MP4 in Chrome. How it works Drop your recording Riverside, Zoom, OBS or phone videos. Pauseless reads only the audio to find the quiet parts
```

### 50360833: day-1104, pass

```text
Show HN: ADB dock a macOS menu bar app to wirelessly connect Android devices
https://github.com/tripathiamritansh/adbdock

ADB Dock Android wireless debugging in your Mac's menu bar. See connected devices, pair a phone with its 6-digit code, and reconnect approved devices when they return to your network. ADB Dock is a small native Swift app with no main window or Dock icon. No Android Studio or USB cable is needed for wireless pairing. Quick start · How it works · User guide · Contributing Why this project exists Wireless debugging can leave you checking terminal commands to find out whether a phone is paired, connected, or simply missing from discovery. ADB Dock puts that status and the common actions in one menu: pair, connect, pause, disconnect, and rename. It also addresses a specific failure observed durin
```

### 50361230: day-1104, must_read

```text
Show HN: Rendering 3D Models in the Terminal
https://muratbayraktar.dev/blog/3d-rendering-in-the-terminal/

← All posts I don’t want to leave the terminal for anything. I like its simplicity. It forces me to be creative when making something in it, and for applications I use to strip out bloat and just give me something that works. I don’t like that Zen takes up 5gb of RAM every time I open it. I just want to use the terminal: it’s resource-efficient, debloated, and really fricking cool. What if I want to see a 3d model? Well, I could open up Carbonyl (or one of the other projects that spins up a browser), but at that point I have the same issue, don’t I? Still a bunch of CPU and RAM being wasted as a result a Chromium instance. I could also get a regular 3d model viewer, but then I wouldn’t exact
```

### 50361263: day-1104, push

```text
Show HN: TickerTown, a pixel-art stock market simulator
https://tickertown.ai

Arguably the most fun stock market simulator. Deploy your first strategy in under 3 minutes. Play TickerTown Free to play. Beginner friendly. Top traders Top trader All-time simulated returns Rankings will appear after results are ready. Updated daily · public rankings may lag. Take a look around Look inside the game. Choose a step to preview # 1 Choose Choose # 2 Backtest Test # 3 Deploy Deploy # 4 Portfolio Portfolio Moon Your strategist Choose a strategy. Start with ready-made rules for choosing and managing stocks. app.tickertown.ai /strategies Preview Filter strategies by category Category All Momentum Dividend Sector Index Blended Contrarian All Momentum Dividend Sector Index Blended C
```

### 50361289: day-1104, pass

```text
Show HN: Sigmajp – Integrated Japanese Reader
https://sigmajp.works/

めちゃくちゃ 簡単 ! Make Japanese reading, uh... less hard Click or tap a word to look it up instantly. Stuck on a sentence? Explain it--break down definitions, conjugations, grammar and context. Then save any point to a flash card. Dictionary, flash cards and an e-book reader in one app, no set up. (It's like Yomitan... and Anki... but for normal people?) Click here to read a book, free! No sign-up required. Like none, at all. TRY IT 二人 の 若い 紳士 が 、 すっかり イギリス の 兵隊 の かたち を して 、 ぴかぴか する 鉄砲 を かついで 、 白熊 のような 犬 を 二疋 つれて 、 だいぶ 山奥 の 、 木の葉 の かさかさ した とこ を 、 こんな こと を 云い ながら 、 あるいて おりました 。 紳士 しんし gentleman Explain sentence Tap any word. 1 Tap a word See the definition, and how it's conjugated. Instant & works 
```

### 50361465: day-1104, push

```text
Show HN: Droneship – sandbox for your coding agents
https://droneship.run/

Cloud Runtime for Agents Run agents like you run prod. Launch Claude Code or Codex (more agents coming soon) on an isolated cloud machine with one command. Give it real work without giving it your credentials. Console See the security model ~/acme/api # install once $ curl -fsSL https://droneship.run/install | sh # then, in any repo $ droneship run claude Repo: https://github.com/acme/api @ main code at /workspace/api @ 3f2a1c8e9b04 isolation: KERNEL (gvisor) See it run. Three agents in three sandboxes. A blocked host, allowed in one click. Then review and merge. 50 seconds. Download the demo video Bring the agent you already use Claude Code droneship run claude OpenAI Codex droneship run co
```

### 50361850: day-1104, pass

```text
Show HN: Dryplate – Image tools that run in the browser, no upload
https://dryplate.dev/

Image tools that never upload your files Convert, compress, resize and clean up photos right in your browser. Free, no sign-up, no ads. HEIC to JPG Turn iPhone photos into JPGs every site accepts. Drop a whole album; nothing leaves your phone. Open All image tools Convert image Switch between JPG, PNG, WebP and AVIF. Compress image Make JPG, PNG, WebP and AVIF files smaller. Resize image Set a width, height or percent. Proportions kept. Crop image Drag a box, or pick square, portrait or story. Rotate image Fix sideways photos one by one or all at once. Blur image Hide faces and plates, or soften a whole image. Watermark image Place your name or site on every image. Merge images Combine photo
```

### 50361909: day-1104, pass

```text
Show HN: What games does HN talk about? (Project 24)
https://nicobrenner.github.io/project24/

(no page text could be extracted)
```

### 50361927: day-1104, pass

```text
Show HN: AgentFirstStack – analytics, tags, email and replay your agent sets up
https://agentfirststack.com/

Analytics, tag manager, email and session replay, set up by your AI agent Like Google Analytics, Google Tag Manager and Hotjar, plus email inboxes your agent can use. Paste one prompt and your coding agent creates the account, adds everything to your site and checks it works. No signup form, no dashboard. Free and open source. Copy prompt for your agent Read the manual Paste it into Claude Code, Cursor, Codex or any agent that can make HTTP requests. Your coding agent yourshop, main branch Done Replay Set up AgentFirstStack for this project. Pasted prompt On it. I'll read the manual first, then set up analytics, conversion tracking and an inbox. GET agentfirststack.com/llms.txt 200 OK POST /
```

### 50362025: day-1104, pass

```text
Show HN: Lets1UP, birthday/party game kits that run on your TV
https://lets1up.com/

TV party games for birthdays and game nights 1UP your next party. You host. Your TV brings the show. Lets1UP makes party kits that run on your TV. Showdown and Grand Slam are for 8–10 kids aged 10–13, Agents of Mischief for 4–16 players ages 6 and up, and Werewolf for 5–16 players ages 13 and up. Showdown and Agents of Mischief run about an hour. You need a TV and a browser. Kits cost $4.99–$7.99. It was like an IRL game, Pretty cool. — Corn, Age 9 Epic blaster battle. Best birthday ever. — Player, Age 7 Drag to turn it New! Showdown A birthday game show · 12 team challenges · 8–10 players $7 .99 USD Party Pass good for 30 days. Buy Now! $7.99 ↗ Buy Now! $7.99 ↗ See the Showdown party → Drag
```
