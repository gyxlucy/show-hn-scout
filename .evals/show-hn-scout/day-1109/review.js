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
  $("hn").href = c.h;
  $("s").textContent = c.s ? "作者说明：" + c.s : "";
  $("s").style.display = c.s ? "" : "none";
  $("ex").textContent = c.x ? c.x : "（页面没有抓到文字）";
  $("meta").textContent = `评论数 ${c.n}`;
  document.querySelectorAll(".choices button").forEach((b) => b.classList.toggle("sel", a.tier === b.dataset.v));
  if (document.activeElement !== $("reason")) $("reason").value = a.reason || "";
  const done = cards.filter((x) => (state.a[x.i] || {}).tier).length;
  $("done").textContent = done;
  $("fill").style.width = (100 * done) / cards.length + "%";
  document.querySelectorAll(".dots button").forEach((b, k) => {
    b.classList.toggle("done", !!(state.a[cards[k].i] || {}).tier);
    b.classList.toggle("cur", k === state.i);
  });
}

function go(k) {
  state.i = Math.max(0, Math.min(cards.length - 1, k));
  $("reason").blur();
  render();
  save();
}

function choose(v) {
  patch({ tier: v });
  if (state.i < cards.length - 1) state.i += 1;
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
  document.querySelectorAll(".choices button").forEach((b) => b.addEventListener("click", () => choose(b.dataset.v)));
  $("reason").addEventListener("input", () => {
    patch({ reason: $("reason").value });
    save();
  });
  $("prev").addEventListener("click", () => go(state.i - 1));
  $("next").addEventListener("click", () => go(state.i + 1));
  document.addEventListener("keydown", (e) => {
    if (document.activeElement === $("reason")) return;
    if (e.key === "m") choose("must_read");
    else if (e.key === "p") choose("push");
    else if (e.key === "x") choose("pass");
    else if (e.key === "ArrowLeft") go(state.i - 1);
    else if (e.key === "ArrowRight") go(state.i + 1);
  });
  render();
}
init();
