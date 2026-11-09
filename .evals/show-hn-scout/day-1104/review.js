const NAMES = { must_read: "必读", push: "push", pass: "pass" };
const $ = (id) => document.getElementById(id);
let cards = [];
let state = { i: 0, a: {} };
let saveTimer = null;

function save() {
  $("saved").textContent = "保存中…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await fetch("/state", { method: "POST", body: JSON.stringify(state) });
    $("saved").textContent = "已保存";
  }, 200);
}

function tierOf(c) {
  const a = state.a[c.i];
  return a && a.tier ? a.tier : c.p;
}

function patch(change) {
  const c = cards[state.i];
  state.a[c.i] = { ...(state.a[c.i] || {}), ...change };
}

function render() {
  const c = cards[state.i];
  const a = state.a[c.i] || {};
  $("total").textContent = cards.length;
  $("pos").textContent = `第 ${state.i + 1} / ${cards.length} 条`;
  $("title").textContent = c.t;
  $("url").textContent = c.u;
  $("url").href = c.u;
  $("ex").textContent = c.x ? c.x : "（页面没有抓到文字）";
  $("meta").textContent = `评论数 ${c.n}`;
  $("pred").textContent = `${NAMES[c.p]}（置信度 ${c.c}）— ${c.r}`;
  const cur = tierOf(c);
  document.querySelectorAll(".choices button").forEach((b) => {
    const v = b.dataset.v === "agree" ? c.p : b.dataset.v;
    b.classList.toggle("sel", !!a.reviewed && v === cur && (b.dataset.v !== "agree" || cur === c.p));
  });
  if (document.activeElement !== $("reason")) $("reason").value = a.reason !== undefined ? a.reason : c.r;
  const done = cards.filter((x) => (state.a[x.i] || {}).reviewed).length;
  const chg = cards.filter((x) => (state.a[x.i] || {}).reviewed && tierOf(x) !== x.p).length;
  $("done").textContent = done;
  $("chg").textContent = chg;
  $("fill").style.width = (100 * done) / cards.length + "%";
  document.querySelectorAll(".dots button").forEach((b, k) => {
    b.classList.toggle("done", !!(state.a[cards[k].i] || {}).reviewed);
    b.classList.toggle("cur", k === state.i);
  });
}

function go(k) {
  state.i = Math.max(0, Math.min(cards.length - 1, k));
  $("reason").blur();
  render();
  save();
}

async function init() {
  cards = await (await fetch("/cards")).json();
  state = await (await fetch("/state")).json();
  cards.forEach((_, k) => {
    const b = document.createElement("button");
    b.textContent = k + 1;
    b.addEventListener("click", () => go(k));
    $("dots").appendChild(b);
  });
  document.querySelectorAll(".choices button").forEach((b) =>
    b.addEventListener("click", () => {
      const c = cards[state.i];
      patch({ tier: b.dataset.v === "agree" ? c.p : b.dataset.v, reviewed: true });
      if (state.i < cards.length - 1) state.i += 1;
      render();
      save();
    })
  );
  $("reason").addEventListener("input", () => {
    patch({ reason: $("reason").value });
    save();
  });
  $("prev").addEventListener("click", () => go(state.i - 1));
  $("next").addEventListener("click", () => go(state.i + 1));
  render();
}
init();
