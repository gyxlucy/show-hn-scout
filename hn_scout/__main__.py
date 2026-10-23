import argparse
import json
from .collect import collect, candidates, enrich
from .review import record_label, latest_labels, render

parser = argparse.ArgumentParser(description="Show HN evidence collection and calibration")
commands = parser.add_subparsers(dest="command", required=True)
p = commands.add_parser("collect")
p.add_argument("--pages", type=int, default=4)
p.add_argument("--show-pages", type=int, default=12)
commands.add_parser("candidates")
p = commands.add_parser("enrich")
p.add_argument("ids", nargs="+", type=int)
commands.add_parser("render")
commands.add_parser("feedback")
p = commands.add_parser("label", help="Record the user's actual feedback, never an inferred label")
p.add_argument("case_id")
p.add_argument("decision", choices=["push", "pass", "unsure"])
p.add_argument("--reason", required=True)
p.add_argument("--originality", choices=["yes", "no", "unclear"], default="unclear")
p.add_argument("--interest", choices=["yes", "no", "unclear"], default="unclear")
args = parser.parse_args()
if args.command == "collect":
    if not 1 <= args.pages <= 20 or not 1 <= args.show_pages <= 30:
        parser.error("Page limits must be between 1 and 20 (30 for show)")
    collect(args.pages, args.show_pages)
elif args.command == "candidates":
    print(json.dumps(candidates(), ensure_ascii=False, indent=2))
elif args.command == "enrich":
    enrich(args.ids)
elif args.command == "render":
    print(json.dumps(render(), ensure_ascii=False))
elif args.command == "label":
    print(json.dumps(record_label(args.case_id, args.decision, args.reason, args.originality, args.interest), ensure_ascii=False))
elif args.command == "feedback":
    print(json.dumps(latest_labels(), ensure_ascii=False, indent=2))
