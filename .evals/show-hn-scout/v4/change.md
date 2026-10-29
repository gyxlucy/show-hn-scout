# v4: pass agent-building infrastructure unless it has a concrete non-developer angle (haiku hillclimb round 3, starting from v3)

Hypothesis: v3 still pushes thin MCP wrappers, memory layers and SDKs for coding agents because nothing says the "AI agent" topic is not by itself a reason to push. On the 60 pooled train cases (held-out 1 + train2) v3 has 11 majority false pushes, 5 of them in this category (54, 66, 80, 82; 78 is a neighbouring crowded-track case, not touched). A category rule should cut those without removing pushes for daily-use tools around coding agents (34, 49, 52, 53, 55, 90 are gold pushes that v3 gets right 3/3, so the carve-out is part of the rule).

Change: one pass bullet added to v3, no case named as an example (naming train cases inflates the train score, which was the contamination problem in v3).

Sources: [她说] 66 "another MCP wrapper for agents, no new product angle", 80 "memory for coding agents, developer infrastructure, I would not use it", 82 "unified API/CLI over coding agents, developer infrastructure". [推断] the carve-out for daily-use tools, from her pushes of 34, 49, 52, 53, 55, 90; case 54 has no recorded reason.

Not changed (one hypothesis per round): the speech-to-text / crowded-track false push (78), personal-familiarity labels (61, 64, 83, unlearnable), and the 4 missed pushes (36, 44, 75, 88).

Guardrails: push recall must not fall outside noise vs v3 (84% on 180 rows); unsure stays ~0.

Status: RUN (approved by Lucy). train60, 60 cases x 2 reps = 120 rows, claude-haiku-5-5, judge claude-opus-5-5; 0 errors in rows (the first launch aborted on certificate errors before producing results; resumed with the same command).
Result vs v3 (3 reps pooled, same cases): agree 75.0% vs 74.4% (paired delta +0.6 pts, bootstrap CI [-6.9, +8.6]); push recall 76% vs 84% (13 push->pass rows); pass recall 74% vs 67%; precision 70.7% vs 67.3%; unsure 0.
Targeted cases moved as hoped (66, 80, 82 pass 0->1; 54 0->0.5) but pushes were lost on 52, 68, 75 (and 61 got worse), so net zero. Verdict: not an improvement; v3 stays the best variant. Rule kept as attempted variant (do not delete).
