# v1: calibrate the screening criteria to Lucy's stated taste

Hypothesis: the baseline prompt (from `docs/rubric-v0.md`) asks for a concrete mechanism and a reusable insight. Lucy's own reasons for push are "interesting small product / product idea / vertical product", and she says novelty is not needed. Replacing the main criterion with "interesting small product idea" should raise agreement with her labels, mainly by pushing the gold-push cases the baseline passes (recall 0/15).

Changes (one calibration bundle, all taken from Lucy's answers in `docs/rubric-v1-draft.md`):
1. Main criterion: interesting small product idea; P1-P5 each enough to push. Novelty not required.
2. Narrow-geek audience and cluttered/slop pages are pass reasons (her cases 14, 22).
3. Unreadable page or jargon-only: `pass`, not `unsure` (her case 20). `unsure` is reserved for unresolvable contradictions.
4. Author claims need no independent confirmation to push.
Unchanged: output format, Chinese reason, no browsing, untrusted-evidence handling, ignoring votes/stars/revenue.

Evidence base and its limit: every rule comes from her reasons on the same 30 labeled cases, which are the dev set. Results on those 30 are not evidence of improvement (the rules were written after seeing them). Only a newly labeled held-out set can support a claim. Rules she called coincidences (dev infra, tutorials, pure experiments, visual toys) were dropped and are not in the prompt. The prompt contains no case titles or examples.

Status: drafted, not run. A run needs separate approval.
