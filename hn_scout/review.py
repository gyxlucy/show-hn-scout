"""Human labels are append-only and kept apart from assistant suggestions."""
import json
from pathlib import Path
from .collect import DATA, ROOT, now

CASES = DATA / "calibration" / "cases.json"
FEEDBACK = DATA / "review" / "feedback.jsonl"
DECISIONS = {"push", "pass", "unsure"}
ATTRIBUTES = {"yes", "no", "unclear"}


def load_cases(path=CASES):
    cases = json.loads(path.read_text(encoding="utf-8"))
    ids = [c["id"] for c in cases]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate case ids")
    return cases


def record_label(case_id, decision, reason, originality="unclear", interest="unclear", path=FEEDBACK, cases_path=CASES):
    cases = load_cases(cases_path)
    matches = [c for c in cases if str(c["id"]) == str(case_id) or c["case_id"] == str(case_id)]
    if len(matches) != 1:
        raise ValueError(f"Unknown or ambiguous case: {case_id}")
    if decision not in DECISIONS or originality not in ATTRIBUTES or interest not in ATTRIBUTES:
        raise ValueError("Invalid feedback label")
    if not reason.strip():
        raise ValueError("A reason is required; it distinguishes taste from novelty")
    row = {"case_id": matches[0]["case_id"], "story_id": matches[0]["id"], "decision": decision,
           "originality": originality, "interest": interest, "reason": reason.strip(),
           "label_source": "human", "recorded_at": now(), "rubric_version": "v0-draft"}
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(row, ensure_ascii=False) + "\n")
    return row


def latest_labels(path=FEEDBACK):
    result = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            row = json.loads(line)
            result[row["case_id"]] = row
    return result


def escape(value):
    # Case summaries are plain text, not trusted Markdown/HTML.
    value = str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    for c in ["\\", "[", "]", "*", "_", "`", "#"]:
        value = value.replace(c, "\\" + c)
    return value.replace("\n", " ")


def link(label, url):
    from urllib.parse import urlsplit, quote
    if urlsplit(url).scheme not in {"http", "https"}:
        raise ValueError("Only HTTP(S) evidence links allowed")
    return f"[{escape(label)}]({quote(url, safe=':/?=&%#@+~-._')})"


def render():
    cases = load_cases()
    out = ROOT / "review"
    out.mkdir(exist_ok=True)
    for batch in sorted({c["batch"] for c in cases}):
        selected = [c for c in cases if c["batch"] == batch]
        lines = [f"# Show HN · 第 {batch} 批品味校准", "",
            "每个项目只需要回复：**值得推 / 不值得推 / 信息不足**，加一句原因。也可以补充“有原创性，但我不感兴趣”。", "",
            "本页隐藏票数、榜单状态和助手推荐结论。以下是来源材料的摘要，作者的性能与效果主张尚未独立验证。第一轮用于校准品味，不是已确认未上榜的推送名单。", "",
            "例如：`01 值得推：这个约束下的做法让我想到新的应用。02 不值得推：只是已有工具的组合。`", ""]
        for c in selected:
            lines += [f"## {c['case_id']} · {escape(c['name'])}", "", f"**做什么：** {escape(c['summary'])}", "",
                      f"**具体做法：** {escape(c['mechanism'])}", "", f"**材料边界：** {escape(c['uncertainty'])}", "",
                      "**来源：** " + " · ".join(link(s['label'], s['url']) for s in c['sources']), "",
                      "**你的判断：** 值得推 / 不值得推 / 信息不足　　**原因：**", "", "---", ""]
        (out / f"batch-{batch:02}.md").write_text("\n".join(lines), encoding="utf-8")
    lines = ["# 助手初步判断 · v0", "", "这是 Codex 在当前对话中阅读材料后的初评，不是用户标签，也不是可重复的 API 模型评测。建议先读盲评材料，再看本页，避免被结论影响。", "",
             "所有案例都属于 calibration，不能再冒充未见过的测试集。未完成同类项目检索的案例不宣称原创性已核实。", ""]
    for c in cases:
        b = c['baseline']
        lines += [f"## {c['case_id']} · {escape(c['name'])}", "", f"**初评：** {escape(b['decision'])}", "",
                  f"**理由：** {escape(b['reason'])}", "", f"**待验证：** {escape(b['next_check'])}", ""]
    (out / "assistant-baseline.md").write_text("\n".join(lines), encoding="utf-8")
    return {"cases": len(cases), "batches": len({c['batch'] for c in cases}), "output": str(out)}

