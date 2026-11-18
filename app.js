// ============================================================================
// Cano's Trucking: app.js
// A trip logger for one truck. Everything runs in the browser (no server).
// Read this file top to bottom: each "STEP" block builds on the one before it.
// ============================================================================

// STEP 1 - TOOLBOX: tiny helper functions used everywhere below.
// $ finds one element on the page; iso/add handle dates; $$ formats dollars;
// esc makes user-typed text safe to show; sum adds up a list of numbers.
const $ = (s) => document.querySelector(s),
  K = "cano-mvp2",
  CATS = ["Fuel", "Tolls", "Repairs", "Insurance", "Parking", "Other"];
const iso = (d) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 6e4)
      .toISOString()
      .slice(0, 10),
  add = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return iso(d);
  },
  today = add(0);
const $$ = (n) => "$" + Math.round(n).toLocaleString("en-US"),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    ),
  uid = () => Date.now() + Math.random();
const fd = (d) =>
    new Date(d + "T12:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
  tm = (h) => {
    if (!h) return "";
    let [a, b] = h.split(":");
    a = +a;
    return (a % 12 || 12) + ":" + b + (a < 12 ? " AM" : " PM");
  };
const sum = (a, f) => a.reduce((s, x) => s + (+f(x) || 0), 0);
// STEP 2 - SAMPLE DATA: fake loads and expenses so the app isn't empty on first open.
// A "load" is one job. An "expense" is a receipt not tied to a load.
function seed() {
  const y = ["Joliet Yard", "Bedford Park", "Elwood", "Chicago 47th St"],
    C = ["Client A", "Client B", "Client C", "Client D"],
    L = [],
    E = [];
  for (let i = 1; i <= 30; i++) {
    if (i % 6 == 0) continue;
    const m = 90 + ((i * 37) % 140);
    L.push({
      id: i,
      date: add(-i),
      due: "0" + (5 + (i % 4)) + ":30",
      client: C[i % 4],
      container: "MSCU" + (4810000 + i * 113),
      pickup: "P" + (2200 + i),
      from: y[i % 4],
      to: y[(i + 1) % 4],
      pay: Math.round(m * 3.1 + 140),
      miles: i == 3 ? 0 : m,
      fuel: i == 3 ? 0 : Math.round((m / 6.8) * 3.95),
      tolls: i % 4 == 0 ? 18 : 0,
      other: 0,
      status: "done",
    });
  }
  [
    [
      0,
      "06:30",
      "Client A",
      "TGHU6620418",
      "P2301",
      "Joliet Yard",
      "Bedford Park",
      385,
    ],
    [
      0,
      "13:30",
      "Client B",
      "MSCU4890114",
      "P2303",
      "Bedford Park",
      "Elwood",
      360,
    ],
    [
      1,
      "07:00",
      "Client D",
      "HLXU3300981",
      "P2304",
      "Joliet Yard",
      "Elwood",
      410,
    ],
    [
      3,
      "06:00",
      "Client A",
      "TGHU6620999",
      "P2310",
      "Elwood",
      "Joliet Yard",
      395,
    ],
    [
      5,
      "08:00",
      "Client B",
      "CMAU5500321",
      "P2311",
      "Chicago 47th St",
      "Bedford Park",
      430,
    ],
  ].forEach(([d, t, c, n, p, f, o, m], i) =>
    L.push({
      id: 100 + i,
      date: add(d),
      due: t,
      client: c,
      container: n,
      pickup: p,
      from: f,
      to: o,
      pay: m,
      miles: 0,
      fuel: 0,
      tolls: 0,
      other: 0,
      status: "up",
    }),
  );
  [
    [-6, "Repairs", 420, "Oil change"],
    [-12, "Repairs", 860, "2 steer tires"],
    [-20, "Insurance", 640, "Monthly premium"],
    [-9, "Parking", 35, "Overnight"],
  ].forEach(([d, c, a, n], i) =>
    E.push({ id: 200 + i, date: add(d), cat: c, amt: a, note: n }),
  );
  return { L, E };
}
// STEP 3 - STATE: S holds ALL the data ({L: loads, E: expenses}).
// We load it from the browser's localStorage, or fall back to the sample data.
// The "ui" object remembers what is on screen (which mode, which tab, etc.).
let S;
try {
  S = JSON.parse(localStorage.getItem(K));
} catch (e) {}
if (!S || !S.L) S = seed();
let ui = {
  mode: "road",
  tab: "overview",
  per: "month",
  q: "",
  rv: "L",
  n: 30,
  edit: null,
  ex: null,
  del: 0,
  rev: null,
  busy: 0,
};
try {
  ui.mode = localStorage.getItem(K + "m") || "road";
} catch (e) {}
let SM = null,
  DL = null,
  ctl = null;
const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme:dark)").matches;
};
try {
  const t = localStorage.getItem(K + "t");
  if (t) document.documentElement.dataset.theme = t;
} catch (e) {}
const save = () => {
    try {
      localStorage.setItem(K, JSON.stringify(S));
    } catch (e) {}
  },
  toast = (m) => {
    const t = $("#toast");
    t.textContent = m;
    t.style.display = "block";
    // Restart the timer so a new message isn't hidden early by an old one.
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.style.display = "none"), 3200);
  };
// STEP 4 - SMALL RULES: how to total a load's costs, and how to decide a load's
// status (done / upcoming / needs info). Change these to change the app's logic.
const cost = (x) => (+x.fuel || 0) + (+x.tolls || 0) + (+x.other || 0),
  st = (x) =>
    x.status === "done"
      ? x.miles > 0
        ? "done"
        : "need"
      : x.date < today
        ? "need"
        : "up",
  LB = { done: "✔ DONE", up: "📅 UPCOMING", need: "⚠ NEEDS INFO" },
  chip = (s) => `<span class="chip ${s}">${LB[s]}</span>`;
const money = (x) => {
  const d = x.status === "done";
  return `<div class="mn"><span class="t-in">Earned ${$$(x.pay)}</span>${d ? `<span class="t-mi">${x.miles || 0} miles</span><span class="t-out">Spent ${$$(cost(x))}</span>` : ""}</div>`;
};
// STEP 5 - SCREENS: each function below returns a string of HTML for one screen.
// The app never edits the page piece by piece; it rebuilds the whole screen from
// the data every time something changes (see render()).
const scanBtn = () =>
  SM
    ? '<button class="b soft" data-a="scan">📷 Scan a document — Claude fills it in</button>'
    : "";
const card = (x) => {
  const s = st(x);
  return `<div class="ld ${s}"><div class="hd"><span class="tm">${x.due ? tm(x.due) : "Any time"}</span>${chip(s)}</div><div class="cl">${esc(x.client) || "No client"}</div><div class="rt"><span><small>FROM</small>${esc(x.from) || "—"}</span><b>→</b><span><small>TO</small>${esc(x.to) || "—"}</span></div><div class="ids"><span><small>CONTAINER</small>${esc(x.container) || "—"}</span><span><small>PICKUP #</small>${esc(x.pickup) || "—"}</span></div>${money(x)}${s === "done" ? "" : `<button class="b in" data-a="fin" data-id="${x.id}">✔ Finish this load</button>`}<button class="b" data-a="edit" data-id="${x.id}">✏ Change details</button></div>`;
};
// --- ON THE ROAD screen: today, next 7 days, and anything that needs info.
function road() {
  const L = [...S.L].sort((a, b) =>
      (a.date + (a.due || "")).localeCompare(b.date + (b.due || "")),
    ),
    td = L.filter((x) => x.date === today),
    nx = L.filter((x) => x.date > today && x.date <= add(7)),
    nd = L.filter((x) => st(x) === "need");
  return `${nd.length ? `<div class="alert">⚠ ${nd.length} load${nd.length > 1 ? "s" : ""} need info — scroll down</div>` : ""}${scanBtn()}<div class="band up">📅 TODAY — ${fd(today)}</div>${td.map(card).join("") || '<div class="empty">No loads today. 🎉</div>'}
<button class="b up" data-a="new">＋ Add a load</button><button class="b ghost" data-a="newx">＋ Add an expense (fuel, tolls, repairs…)</button>
<div class="band mi">COMING UP — next 7 days</div>${nx.map((x) => `<div style="font-weight:800;margin:6px 0">${fd(x.date)}</div>${card(x)}`).join("") || '<div class="empty">Nothing scheduled yet.</div>'}
${nd.length ? `<div class="band need">⚠ NEEDS INFO</div>${nd.map(card).join("")}` : ""}`;
}
// --- Date ranges for the Office overview buttons (this month, last year, ...).
function rng() {
  const y = new Date().getFullYear(),
    p = (n) => String(n).padStart(2, "0"),
    d = new Date(),
    m = d.getMonth(),
    l = new Date(y, m - 1, 1),
    a = `${y}-${p(m + 1)}-01`;
  return {
    month: [a, "9999"],
    last: [`${l.getFullYear()}-${p(l.getMonth() + 1)}-01`, a],
    year: [`${y}-01-01`, "9999"],
    ly: [`${y - 1}-01-01`, `${y}-01-01`],
    all: ["", "9999"],
  }[ui.per];
}
// --- OFFICE screen: three tabs (Overview, Coming up, Records).
function office() {
  return (
    `<div class="tabs">${[
      ["overview", "📊 Overview"],
      ["coming", "📅 Coming up"],
      ["records", "📁 Records"],
    ]
      .map(
        ([k, l]) =>
          `<button class="${ui.tab === k ? "on" : ""}" data-a="tab" data-id="${k}">${l}</button>`,
      )
      .join("")}</div>` + { overview, coming, records }[ui.tab]()
  );
}
// --- OVERVIEW tab: money earned/spent, profit, miles, 6-month chart (drawn as SVG).
function overview() {
  const [a, b] = rng(),
    ok = (x) => x.date >= a && x.date < b,
    D = S.L.filter((x) => x.status === "done" && ok(x)),
    X = S.E.filter(ok),
    I = sum(D, (x) => x.pay),
    fu =
      sum(D, (x) => x.fuel) +
      sum(
        X.filter((x) => x.cat === "Fuel"),
        (x) => x.amt,
      ),
    to =
      sum(D, (x) => x.tolls) +
      sum(
        X.filter((x) => x.cat === "Tolls"),
        (x) => x.amt,
      ),
    ot =
      sum(D, (x) => x.other) +
      sum(
        X.filter((x) => x.cat !== "Fuel" && x.cat !== "Tolls"),
        (x) => x.amt,
      ),
    O = fu + to + ot,
    P = I - O,
    mi = sum(D, (x) => x.miles);
  const mo = [...Array(6)].map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - 5 + i, 1);
      return iso(d).slice(0, 7);
    }),
    R = mo.map((k) =>
      sum(
        S.L.filter((x) => x.status === "done" && x.date.startsWith(k)),
        (x) => x.pay,
      ),
    ),
    E = mo.map(
      (k) =>
        sum(
          S.L.filter((x) => x.status === "done" && x.date.startsWith(k)),
          cost,
        ) +
        sum(
          S.E.filter((x) => x.date.startsWith(k)),
          (x) => x.amt,
        ),
    ),
    mx = Math.max(100, ...R, ...E);
  const chart =
    '<svg viewBox="0 0 600 210" width="100%" role="img" aria-label="Money in and out by month">' +
    mo
      .map((k, i) => {
        const x = 20 + i * 95,
          h1 = (R[i] / mx) * 150,
          h2 = (E[i] / mx) * 150;
        return `<rect x="${x}" y="${170 - h1}" width="30" height="${h1}" rx="4" fill="var(--in)"/><rect x="${x + 34}" y="${170 - h2}" width="30" height="${h2}" rx="4" fill="var(--out)"/><text x="${x + 32}" y="195" font-size="15" font-weight="700" text-anchor="middle" fill="var(--mut)">${new Date(k + "-15").toLocaleDateString("en-US", { month: "short" })}</text>`;
      })
      .join("") +
    "</svg>";
  const sm = (l, v) =>
    `<div class="k out s"><small style="color:inherit">${l}</small><div class="v">${$$(v)}</div></div>`;
  return `<div class="seg" style="margin-top:12px">${[
    ["month", "This month"],
    ["last", "Last month"],
    ["year", "This year"],
    ["ly", "Last year"],
    ["all", "All time"],
  ]
    .map(
      ([k, l]) =>
        `<button class="${ui.per === k ? "on" : ""}" data-a="per" data-id="${k}">${l}</button>`,
    )
    .join("")}</div>
<div class="kp"><div class="k in"><small style="color:inherit">💰 MONEY EARNED</small><div class="v">${$$(I)}</div></div><div class="k out"><small style="color:inherit">⛽ MONEY SPENT</small><div class="v">${$$(O)}</div></div><div class="k pf"><small>PROFIT (kept)</small><div class="v ${P >= 0 ? "t-in" : "t-out"}">${$$(P)}</div><small>${mi ? "$" + (P / mi).toFixed(2) + " per mile" : ""}</small></div><div class="k mi"><small style="color:inherit">🛣 MILES DRIVEN</small><div class="v">${mi.toLocaleString()}</div></div></div>
<div class="band out">Where the money went</div><div class="kp">${sm("⛽ FUEL", fu)}${sm("🛣 TOLLS", to)}${sm("🔧 REPAIRS &amp; OTHER", ot)}</div>
<div class="card"><h2 style="font-size:18px">Last 6 months</h2>${chart}<div class="key"><span class="chip in">■ Earned</span><span class="chip out">■ Spent</span></div></div>
<details class="card"><summary>🎨 What do the colors mean?</summary><div class="key"><span class="chip in">Green = money earned</span><span class="chip out">Red = money spent</span><span class="chip mi">Blue = miles</span><span class="chip up">Teal = coming up</span><span class="chip need">Orange = needs your info</span></div></details>`;
}
// --- RECORDS and COMING UP tabs: lists of loads and expenses.
const rec = (x) => {
  const s = st(x);
  return `<div class="rec ${s}" data-a="edit" data-id="${x.id}"><div class="a"><b>${fd(x.date)} ${x.due ? "· " + tm(x.due) : ""}</b><span>${x.scan ? '<span class="chip mi">📷 scanned</span> ' : ""}${chip(s)}</span></div><div>${esc(x.client)} · ${esc(x.from)} → ${esc(x.to)}</div><div class="m"><span><small>CONTAINER</small>${esc(x.container) || "—"}</span><span><small>PICKUP #</small>${esc(x.pickup) || "—"}</span><span class="t-in">Earned ${$$(x.pay)}</span>${x.status === "done" ? `<span class="t-mi">${x.miles || 0} mi</span><span class="t-out">Spent ${$$(cost(x))}</span>` : ""}</div></div>`;
};
const recX = (x) =>
  `<div class="rec ex" data-a="editx" data-id="${x.id}"><div class="a"><b>${fd(x.date)}</b><span class="chip out">${esc(x.cat)}</span></div><div>${esc(x.note) || "—"}</div><div class="m"><span class="t-out">Spent ${$$(x.amt)}</span>${x.scan ? '<span class="chip mi">📷 scanned</span>' : ""}</div></div>`;
function coming() {
  const U = S.L.filter((x) => x.status === "up" && x.date >= today).sort(
    (a, b) => (a.date + (a.due || "")).localeCompare(b.date + (b.due || "")),
  );
  let h =
      scanBtn() + '<button class="b up" data-a="new">＋ Add a load</button>',
    last = "";
  U.forEach((x) => {
    if (x.date !== last) {
      h += `<div class="band up">${x.date === today ? "TODAY — " : ""}${fd(x.date)}</div>`;
      last = x.date;
    }
    h += rec(x);
  });
  return h + (U.length ? "" : '<div class="empty">No upcoming loads.</div>');
}
function records() {
  const q = ui.q.toLowerCase(),
    isL = ui.rv === "L",
    R = isL
      ? S.L.filter((x) => x.status === "done" || x.date < today)
          .filter(
            (x) =>
              !q ||
              [x.client, x.container, x.pickup, x.from, x.to, x.date]
                .join(" ")
                .toLowerCase()
                .includes(q),
          )
          .sort((a, b) => b.date.localeCompare(a.date))
      : S.E.filter(
          (x) =>
            !q || [x.cat, x.note, x.date].join(" ").toLowerCase().includes(q),
        ).sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="seg" style="margin-top:12px"><button class="${isL ? "on" : ""}" data-a="rv" data-id="L">🚚 Loads</button><button class="${isL ? "" : "on"}" data-a="rv" data-id="E">🧾 Expenses</button></div><div style="margin-top:10px"><input id="q" placeholder="🔍 Search…" value="${esc(ui.q)}"></div>${scanBtn()}${isL ? "" : '<button class="b ghost" data-a="newx">＋ Add an expense</button>'}
<p style="color:var(--mut)">${R.length} record${R.length == 1 ? "" : "s"}</p>${
    R.slice(0, ui.n)
      .map(isL ? rec : recX)
      .join("") || '<div class="empty">Nothing found.</div>'
  }${R.length > ui.n ? '<button class="b" data-a="more">Show more</button>' : ""}<button class="b" data-a="csv">⬇ Save everything for my accountant (spreadsheet)</button><button class="b out" data-a="clear">Delete sample data &amp; start fresh</button>`;
}
// --- FORMS: pop-up sheets for adding/editing a load or an expense.
const f = (k, l, v, t = "text") =>
    `<label>${l}<input data-f="${k}" type="${t}" value="${esc(v ?? "")}" ${t == "number" ? 'inputmode="decimal" step="any"' : ""}></label>`,
  num = (k, l, v, c) =>
    `<label class="${c}">${l}<input data-f="${k}" type="number" inputmode="decimal" step="any" value="${v || ""}"></label>`;
const catSel = (v) =>
  `<label>Type<select data-f="cat">${CATS.map((c) => `<option ${v === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>`;
function form() {
  const n = ui.edit === "new",
    x = n ? { date: today } : S.L.find((y) => y.id == ui.edit);
  if (!x) return "";
  return `<div class="sheet"><div class="sin"><h2>${n ? "Add a load" : "Load details"}</h2><div class="band up" style="margin-top:4px">1 · The job</div><div class="g2">${f("date", "Date", x.date, "date")}${f("due", "Pickup time", x.due, "time")}</div>${f("client", "Client", x.client)}${f("container", "Container ID", x.container)}${f("pickup", "Pickup number", x.pickup)}<div class="g2">${f("from", "From (yard)", x.from)}${f("to", "To (yard)", x.to)}</div>${num("pay", "💰 Pay for this load ($)", x.pay, "t-in")}
<div class="band mi">2 · After the trip</div>${num("miles", "🛣 Miles driven", x.miles, "t-mi")}<div class="g2">${num("fuel", "⛽ Fuel ($)", x.fuel, "t-out")}${num("tolls", "🛣 Tolls ($)", x.tolls, "t-out")}</div>${num("other", "🔧 Repairs / other ($)", x.other, "t-out")}
<button class="b in" data-a="done">✔ Save — this load is DONE</button><button class="b up" data-a="saveit">Save changes</button><button class="b" data-a="close">Cancel</button>${n ? "" : `<button class="b out" data-a="del">${ui.del ? "Tap again to delete for good" : "🗑 Delete this load"}</button>`}</div></div>`;
}
function formX() {
  const n = ui.ex === "new",
    x = n ? { date: today, cat: "Fuel" } : S.E.find((y) => y.id == ui.ex);
  if (!x) return "";
  return `<div class="sheet"><div class="sin"><h2>${n ? "Add an expense" : "Expense details"}</h2>${f("date", "Date", x.date, "date")}${catSel(x.cat)}${num("amt", "Amount ($)", x.amt, "t-out")}${f("note", "Note (where / what for)", x.note)}<button class="b in" data-a="savex">Save expense</button><button class="b" data-a="close">Cancel</button>${n ? "" : `<button class="b out" data-a="delx">${ui.del ? "Tap again to delete for good" : "🗑 Delete"}</button>`}</div></div>`;
}
// --- SCAN review sheet: shows what Claude read so YOU confirm before saving.
function review() {
  const r = ui.rev;
  return `<div class="sheet"><div class="sin"><h2>📷 Here’s what Claude read</h2><div class="alert" style="margin-top:4px">⚠ Please check every number before saving. Claude can make mistakes.</div>
${r.L.map((x, i) => `<div class="sc" data-k="L"><b>Load ${i + 1}</b><div class="g2">${f("date", "Date", x.date, "date")}${f("due", "Pickup time", x.due, "time")}</div>${f("client", "Client", x.client)}${f("container", "Container ID", x.container)}${f("pickup", "Pickup number", x.pickup)}<div class="g2">${f("from", "From", x.from)}${f("to", "To", x.to)}</div>${num("pay", "💰 Pay ($)", x.pay, "t-in")}</div>`).join("")}
${r.E.map((x, i) => `<div class="sc" data-k="E"><b>Expense ${i + 1}</b>${f("date", "Date", x.date, "date")}${catSel(x.cat)}${num("amt", "Amount ($)", x.amt, "t-out")}${f("note", "Note", x.note)}</div>`).join("")}
<button class="b in" data-a="addscan">✔ Looks right — add to my records</button><button class="b" data-a="close">Throw away</button></div></div>`;
}
function busy() {
  return `<div class="sheet"><div class="sin" style="text-align:center"><h2>📷 Claude is reading your document…</h2><p class="m">This can take up to a minute.</p><button class="b" data-a="stop">Cancel</button></div></div>`;
}
// STEP 6 - RENDER: the heart of the app. Builds the header, the current screen,
// and any open pop-up sheet, then puts it on the page.
function render() {
  const r = ui.mode === "road";
  $("#app").innerHTML =
    `<header><div class="brand"><span>🚛 Cano’s Trucking</span><button class="th" data-a="theme" aria-label="Switch between light and dark mode">${isDark() ? "☀️ Light" : "🌙 Dark"}</button></div><div class="modes"><button class="md ${r ? "on" : ""}" data-a="mode" data-id="road">🚛 On the Road</button><button class="md off ${r ? "" : "on"}" data-a="mode" data-id="office">🏢 Office</button></div></header>${r ? road() : office()}${ui.busy ? busy() : ui.rev ? review() : ui.ex ? formX() : ui.edit ? form() : ""}`;
  if (ui.focus) {
    const e = document.querySelector(`[data-f="${ui.focus}"]`);
    if (e) setTimeout(() => e.focus(), 50);
    ui.focus = null;
  }
  const q = $("#q");
  if (q)
    q.oninput = (e) => {
      ui.q = e.target.value;
      const p = e.target.selectionStart;
      render();
      const n = $("#q");
      n.focus();
      n.setSelectionRange(p, p);
    };
}
// STEP 7 - SAVING: read what the user typed, then store it.
const rd = (el) => {
  const o = {};
  el.querySelectorAll("[data-f]").forEach(
    (e) => (o[e.dataset.f] = e.value.trim()),
  );
  return o;
};
function commit(done) {
  const o = rd(document.querySelector(".sheet"));
  ["pay", "miles", "fuel", "tolls", "other"].forEach(
    (k) => (o[k] = +o[k] || 0),
  );
  if (!o.date) return toast("Please pick a date");
  if (ui.edit === "new")
    S.L.push({ id: uid(), status: done ? "done" : "up", ...o });
  else {
    const x = S.L.find((y) => y.id == ui.edit);
    Object.assign(x, o);
    if (done) x.status = "done";
  }
  ui.edit = null;
  ui.del = 0;
  save();
  render();
  // A load only counts as finished once it has miles (see st() in STEP 4).
  toast(
    !done ? "Saved ✔" : o.miles > 0 ? "Saved as done ✔" : "Saved — add the miles to finish it",
  );
}
const dOk = (d) => (/^\d{4}-\d\d-\d\d$/.test(d || "") ? d : today),
  tOk = (t) =>
    /^\d{1,2}:\d\d$/.test(t || "") ? String(t).padStart(5, "0") : "";
// STEP 8 - DOCUMENT SCAN: sends a photo to Claude and asks for JSON back.
// This only works inside Claude's published page (it needs Claude's permission
// system). When you run the app on your own computer the button is hidden.
async function doScan(file) {
  ctl = new AbortController();
  ui.busy = 1;
  render();
  const P = `You are reading a photo or scan of a trucking document (dispatch sheet, rate confirmation, bill of lading, fuel receipt, toll receipt, or repair/other receipt). Today is ${today}. Extract what is clearly readable and return ONLY JSON, no other text, in this shape:
{"loads":[{"date":"YYYY-MM-DD","due":"HH:MM 24-hour","client":"","container":"","pickup":"","from":"","to":"","pay":0}],"expenses":[{"date":"YYYY-MM-DD","cat":"Fuel|Tolls|Repairs|Insurance|Parking|Other","amt":0,"note":""}]}
Rules: one entry per load or per receipt. Use "" or 0 for anything you cannot read; never guess. If a date has no year, use the nearest sensible year. "pay" is the amount the truck is paid for the load. Container IDs look like 4 letters then 7 digits.`;
  try {
    const j = await SM.json(P, {
      images: [file],
      modelTier: "default",
      signal: ctl.signal,
    });
    const L = (j.loads || []).map((x) => ({
        date: dOk(x.date),
        due: tOk(x.due),
        client: x.client || "",
        container: x.container || "",
        pickup: x.pickup || "",
        from: x.from || "",
        to: x.to || "",
        pay: +x.pay || 0,
      })),
      E = (j.expenses || []).map((x) => ({
        date: dOk(x.date),
        cat: CATS.includes(x.cat) ? x.cat : "Other",
        amt: +x.amt || 0,
        note: x.note || "",
      }));
    ui.busy = 0;
    if (!L.length && !E.length) {
      render();
      toast("Claude couldn’t find a load or receipt. Try a clearer photo.");
    } else {
      ui.rev = { L, E };
      render();
    }
  } catch (e) {
    ui.busy = 0;
    render();
    if (e.code !== "cancelled")
      toast(
        e.code === "not_granted"
          ? "Please allow Claude to read documents to use this."
          : e.code === "rate_limited"
            ? "Too many tries. Wait a minute and try again."
            : "Couldn’t read that document. Try a clearer photo.",
      );
  }
}
// STEP 9 - ACTIONS: every button in the app has data-a="name". When clicked, the
// function with that name inside A runs. Add a button + add a function = new feature.
const A = {
  theme() {
    const t = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem(K + "t", t);
    } catch (e) {}
    render();
  },
  mode(id) {
    ui.mode = id;
    try {
      localStorage.setItem(K + "m", id);
    } catch (e) {}
    render();
    scrollTo(0, 0);
  },
  tab(id) {
    ui.tab = id;
    render();
  },
  per(id) {
    ui.per = id;
    render();
  },
  rv(id) {
    ui.rv = id;
    ui.q = "";
    ui.n = 30;
    render();
  },
  more() {
    ui.n += 30;
    render();
  },
  new() {
    ui.edit = "new";
    render();
  },
  edit(id) {
    ui.edit = id;
    ui.del = 0;
    render();
  },
  fin(id) {
    ui.edit = id;
    ui.focus = "miles";
    render();
  },
  newx() {
    ui.ex = "new";
    render();
  },
  editx(id) {
    ui.ex = id;
    ui.del = 0;
    render();
  },
  close() {
    ui.edit = ui.ex = ui.rev = null;
    ui.del = 0;
    render();
  },
  saveit() {
    commit(false);
  },
  done() {
    commit(true);
  },
  savex() {
    const o = rd(document.querySelector(".sheet"));
    o.amt = +o.amt || 0;
    if (!o.amt) return toast("Please enter an amount");
    if (ui.ex === "new") S.E.push({ id: uid(), ...o });
    else
      Object.assign(
        S.E.find((y) => y.id == ui.ex),
        o,
      );
    ui.ex = null;
    save();
    render();
    toast("Saved ✔");
  },
  del() {
    if (!ui.del) {
      ui.del = 1;
      return render();
    }
    S.L = S.L.filter((x) => x.id != ui.edit);
    ui.edit = null;
    ui.del = 0;
    save();
    render();
    toast("Deleted");
  },
  delx() {
    if (!ui.del) {
      ui.del = 1;
      return render();
    }
    S.E = S.E.filter((x) => x.id != ui.ex);
    ui.ex = null;
    ui.del = 0;
    save();
    render();
    toast("Deleted");
  },
  scan() {
    $("#scanIn").click();
  },
  stop() {
    ctl && ctl.abort();
  },
  addscan() {
    document.querySelectorAll(".sc").forEach((c) => {
      const o = rd(c);
      if (c.dataset.k === "L")
        S.L.push({
          id: uid(),
          status: "up",
          miles: 0,
          fuel: 0,
          tolls: 0,
          other: 0,
          scan: 1,
          ...o,
          pay: +o.pay || 0,
        });
      else S.E.push({ id: uid(), scan: 1, ...o, amt: +o.amt || 0 });
    });
    ui.rev = null;
    save();
    render();
    toast("Added ✔ — check the Needs Info items");
  },
  clear() {
    if (ui.clr !== 1) {
      ui.clr = 1;
      event.target.textContent = "Tap again to delete everything";
      return;
    }
    S = { L: [], E: [] };
    ui.clr = 0;
    save();
    render();
    toast("All records cleared");
  },
  async csv() {
    const q = (s) => '"' + String(s ?? "").replace(/"/g, '""') + '"',
      H =
        "type,date,time,client,container,pickup,from,to,category,paid,miles,fuel,tolls,other,amount,status,note",
      // Same status words the app shows on screen.
      SW = { done: "done", up: "upcoming", need: "needs info" },
      r = [
        ...S.L.map((x) => [
          "load",
          x.date,
          x.due,
          x.client,
          x.container,
          x.pickup,
          x.from,
          x.to,
          "",
          x.pay,
          x.miles,
          x.fuel,
          x.tolls || 0,
          x.other,
          "",
          SW[st(x)],
          "",
        ]),
        ...S.E.map((x) => [
          "expense",
          x.date,
          "",
          "",
          "",
          "",
          "",
          "",
          x.cat,
          "",
          "",
          "",
          "",
          "",
          x.amt,
          "",
          x.note,
        ]),
      ]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map((a) => a.map(q).join(","));
    const data = [H, ...r].join("\n");
    try {
      if (DL) {
        await DL.save({ filename: "cano-trucking-records.csv", data });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
        a.download = "cano-trucking-records.csv";
        a.click();
      }
      toast("Saved ✔");
    } catch (e) {
      toast("Save was cancelled");
    }
  },
};
// STEP 10 - EVENTS: ONE click listener for the whole page finds which action to run.
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b || !A[b.dataset.a]) return;
  A[b.dataset.a](b.dataset.id);
});
$("#scanIn").addEventListener("change", (e) => {
  const fl = e.target.files[0];
  e.target.value = "";
  if (fl && SM) doScan(fl);
});
matchMedia("(prefers-color-scheme:dark)").addEventListener("change", () =>
  render(),
);
render();
(async () => {
  try {
    if (!window.claude) return;
    SM = await claude.use("sample");
    if (SM) {
      const l = await SM.limits().catch(() => null);
      if (l && l.images) {
        $("#scanIn").accept = l.images.mediaTypes.join(",");
      } else SM = null;
    }
    DL = await claude.use("downloads");
  } catch (e) {
    SM = SM && 0;
  }
  render();
})();
