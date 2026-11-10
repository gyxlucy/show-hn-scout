const $ = (id) => document.getElementById(id);
let cards = {};
let state = { order: [], ties: {}, notes: {}, confirmed: false };
let saveTimer = null;
let dragId = null;
const expanded = new Set();

function save() {
  $("saved").textContent = "保存中…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await fetch("/state", { method: "POST", body: JSON.stringify(state) });
    $("saved").textContent = "已保存";
  }, 200);
}

function change(fn) {
  fn();
  state.confirmed = false;
  render();
  save();
}

function move(id, to) {
  to = Math.max(0, Math.min(state.order.length - 1, to));
  const from = state.order.indexOf(id);
  if (from === to) return;
  change(() => {
    state.order.splice(from, 1);
    state.order.splice(to, 0, id);
  });
}

function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  kids.forEach((k) => e.append(k));
  return e;
}

function render() {
  const list = $("list");
  list.replaceChildren();
  state.order.forEach((id, k) => {
    const c = cards[id];
    if (k === 3) list.append(el("div", { className: "cut", textContent: "↑ 前三名：以后排进这里就“一定 push”（先放着，之后我们再商量）" }));
    const row = el("div", { className: "row", draggable: true });
    row.addEventListener("dragstart", () => { dragId = id; row.classList.add("drag"); });
    row.addEventListener("dragend", () => { dragId = null; row.classList.remove("drag"); });
    row.addEventListener("dragover", (e) => { e.preventDefault(); row.classList.add("over"); });
    row.addEventListener("dragleave", () => row.classList.remove("over"));
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("over");
      if (dragId && dragId !== id) move(dragId, state.order.indexOf(id));
    });
    const badge = el("div", { className: "badge", textContent: String(k + 1), title: "按住拖动" });
    const links = el("div", { className: "links" },
      el("a", { href: c.url, target: "_blank", rel: "noopener", textContent: c.url }),
      el("a", { href: `https://news.ycombinator.com/item?id=${c.hn}`, target: "_blank", rel: "noopener", textContent: "HN 讨论" }));
    const open = expanded.has(id);
    const ex = el("div", { className: "ex" + (open ? " full" : ""), textContent: (c.excerpt || "（页面没有抓到文字）") + (open && c.more ? " " + c.more : "") });
    const body = el("div", {}, el("div", { className: "title", textContent: c.title }), links, ex);
    if (c.more) {
      body.append(el("button", { className: "more", textContent: open ? "收起" : "展开更多", onclick: () => { open ? expanded.delete(id) : expanded.add(id); render(); } }));
    }
    if (k > 0) {
      const cb = el("input", { type: "checkbox", checked: !!state.ties[id] });
      cb.addEventListener("change", () => change(() => { state.ties[id] = cb.checked; }));
      body.append(el("div", {}, el("label", { className: "tie" }, cb, " 和上一条差不多")));
    }
    const note = el("input", { className: "note", placeholder: "备注：为什么放这里（可不写）", value: state.notes[id] || "" });
    note.addEventListener("input", () => { state.notes[id] = note.value; state.confirmed = false; save(); });
    body.append(note);
    const ctl = el("div", { className: "ctl" },
      el("button", { className: "mv", textContent: "↑ 上移", onclick: () => move(id, k - 1) }),
      el("button", { className: "mv", textContent: "↓ 下移", onclick: () => move(id, k + 1) }),
      el("button", { className: "mv", textContent: "置顶", onclick: () => move(id, 0) }));
    row.append(badge, body, ctl);
    list.append(row);
  });
  $("confirm").classList.toggle("on", !!state.confirmed);
  $("confirm").textContent = state.confirmed ? "已确认 ✓" : "排好了，确认";
  $("cstate").textContent = state.confirmed ? "最终顺序已保存，可以告诉我了" : "";
}

async function init() {
  const list = await (await fetch("/cards")).json();
  list.forEach((c) => (cards[c.id] = c));
  const saved = await (await fetch("/state")).json();
  if (saved && saved.order && saved.order.length === list.length) state = { ties: {}, notes: {}, confirmed: false, ...saved };
  else state.order = list.map((c) => c.id);
  $("confirm").addEventListener("click", () => { state.confirmed = true; render(); save(); });
  render();
  save();
}
init();
