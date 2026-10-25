# v3: pass products that are too low-level or technical for the reader (haiku hillclimb round 2)

Hypothesis: with v1, claude-haiku-5-5 pushes most of the cases Lucy passes (dev: 33 of 45 gold-pass rows pushed) because nothing in the prompt tells it that a deep technical component she would not use is a pass. Adding that rule, with her own reasons, should raise pass recognition and raise agree without losing many pushes.

Change (one rule added to the pass list of v1):
- Pass when the product is a low-level or highly technical component or tool at a depth the reader would not use herself. A clear, well-made page does not change it. A creative presentation of a technical subject still counts (criterion 3).

Sources:
- [她说] case 02 "too deep into neural-network internals", 12 "firewall etc. too technical, I will not use it", 29 "tree-sitter and wasm too niche and detailed, I do not need it", 25 "also too detailed, and I rarely have this scenario". These are dev cases, so dev results are contaminated for them (the prompt names four of them as examples). Judge the round on the held-out set only.
- [推断] the carve-out "creative presentation of a technical subject still counts" is inferred from her push of case 15 (ZFS explained from source); she did not state it. It is there so the rule does not overturn that kind of push.

Not taken from the analyzer proposal (one hypothesis per round): dropping "Any one is enough", the "state the hook in plain words" step, and the reworded criteria 1, 4, 5.

Status: drafted, awaiting approval to run (30 cases x 3 reps x 2 sets = 180 tasks on claude-haiku-5-5, about 5 minutes).
