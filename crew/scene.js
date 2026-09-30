// SVG scene: an isometric datacenter drawn from a sim snapshot. No game logic here — it only draws.
import { CONFIG as C } from "./config.js";

const NS = "http://www.w3.org/2000/svg";
const U = 42, KX = U * 0.866, KY = U / 2, OX = 182, OY = 118, VW = 360, VH = 388, VT = -18;   // VT: headroom so enlarged flags never clip
const VIEW = `0 ${VT} ${VW} ${VH}`;
const P = (gx, gy) => [OX + (gx - gy) * KX, OY + (gx + gy) * KY];

// Grid layout. Traffic enters on the left (users → firewall → balancer), fans out to four app
// slots, meets at hub J, then reaches the data tier (cache · database · replica).
const USERS = [-1.8, 1.8], FW = [-1.8, 0], LB = [0, 0];
const APPS = [[1.05, 4.15], [2.15, 3.05], [3.25, 1.95], [4.35, 0.85]];
const J = [4.35, 4.35], CACHE = [4.35, 6.35], DB = [5.35, 5.35], REPLICA = [6.35, 4.35];
const NODES = [
  ["users", "users", ...USERS], ["firewall", "firewall", ...FW], ["lb", "lb", ...LB],
  ...APPS.map(([x, y], i) => ["app", `app${i}`, x, y]),
  ["cache", "cache", ...CACHE], ["db", "db", ...DB], ["replica", "replica", ...REPLICA],
].sort((a, b) => a[2] + a[3] - (b[2] + b[3]));   // back to front

const NAME = { users: "USERS", firewall: "FIREWALL", lb: "BALANCER", cache: "CACHE", db: "DATABASE", replica: "REPLICA" };
const LABEL = { users: "Users", firewall: "Firewall", lb: "Load balancer", app: "App server", cache: "Cache", db: "Database", replica: "Replica" };
const REASON_TEXT = { "app-overload": "timeout", "bad-deploy": "HTTP 500", "db-down": "no DB", "db-overload": "DB slow", "rate-limit": "throttled", attack: "bot traffic" };
// Tap area per kind (viewBox units): half width, and how far below the anchor it reaches.
const HIT_W = { users: 36, firewall: 36, lb: 36, app: 39, cache: 38, db: 38, replica: 38 };
// Flag nudges and max widths (viewBox units) so neighbouring flags never touch.
const FLAG_DX = { users: -24, lb: 28, cache: -30, replica: 16 };
const FLAG_MAX = { users: 96, firewall: 96, lb: 110, app: 76, cache: 80, db: 92, replica: 80 };

// Cables as grid-aligned polylines (grid coords). Shared stretches start at equal distances so dashes line up.
const LINKS = [
  { id: "uf", pts: [USERS, FW] },
  { id: "fl", pts: [FW, LB] },
  ...APPS.flatMap(([x, y], i) => [
    { id: `a${i}`, app: i, pts: x > y ? [[0, 0], [x, 0], [x, y]] : [[0, 0], [0, y], [x, y]] },
    { id: `d${i}`, app: i, pts: x > y ? [[x, y], [J[0], y], J] : [[x, y], [x, J[1]], J] },
  ]),
  { id: "jd", pts: [J, DB] },
  { id: "jc", pts: [J, CACHE] },
  { id: "jr", pts: [J, REPLICA], replica: true },
];

const f1 = (n) => Math.round(n * 10) / 10;
const pts = (...p) => p.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");
const mk = (tag, attrs = {}, html = "") => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
};

// Isometric box centred on (cx, cy): a = half size along the grid x axis, b = along y, h = height.
// Three faces: .l (+y side, lit), .r (+x side, shade), .t (top). Returns svg markup and its corners.
function box(cx, cy, a, b, h, cls = "") {
  const F = [cx + 0.866 * (a - b), cy + 0.5 * (a + b)], R = [cx + 0.866 * (a + b), cy + 0.5 * (a - b)];
  const L = [cx - 0.866 * (a + b), cy + 0.5 * (b - a)], B = [cx - 0.866 * (a - b), cy - 0.5 * (a + b)];
  const up = ([x, y]) => [x, y - h];
  const svg = `<polygon class="l ${cls}" points="${pts(L, F, up(F), up(L))}"/><polygon class="r ${cls}" points="${pts(F, R, up(R), up(F))}"/><polygon class="t ${cls}" points="${pts(up(B), up(R), up(F), up(L))}"/>`;
  return { svg, L, F, R, top: cy - 0.5 * (a + b) - h, bottom: F[1] };
}
// Flat drawing on a plane: top face (grid x/y), left face (grid x, vertical) or right face (-grid y, vertical).
const onTop = (x, y, s) => `<g transform="matrix(.866 .5 -.866 .5 ${f1(x)} ${f1(y)})">${s}</g>`;
const onLeft = ([x, y], s) => `<g transform="matrix(.866 .5 0 1 ${f1(x)} ${f1(y)})">${s}</g>`;
const onRight = ([x, y], s) => `<g transform="matrix(.866 -.5 0 1 ${f1(x)} ${f1(y)})">${s}</g>`;
const diamond = (cx, cy, s) => pts([cx, cy - s], [cx + 1.732 * s, cy], [cx, cy + s], [cx - 1.732 * s, cy]);

function drum(cx, cy, rx, h) {
  const ry = rx / 2, t = cy - h;
  const band = (y) => `<path class="band" d="M${f1(cx - rx)} ${f1(y)}a${rx} ${ry} 0 0 0 ${2 * rx} 0"/>`;
  return {
    svg: `<path class="l" d="M${f1(cx - rx)} ${f1(t)}v${h}a${rx} ${ry} 0 0 0 ${rx} ${ry}v${-h}a${rx} ${ry} 0 0 1 ${-rx} ${-ry}z"/>` +
      `<path class="r" d="M${f1(cx)} ${f1(t + ry)}v${h}a${rx} ${ry} 0 0 0 ${rx} ${-ry}v${-h}a${rx} ${ry} 0 0 1 ${-rx} ${ry}z"/>` +
      band(t + h * 0.36) + band(t + h * 0.7) + `<ellipse class="t" cx="${f1(cx)}" cy="${f1(t)}" rx="${rx}" ry="${ry}"/>` +
      `<ellipse class="rim" cx="${f1(cx)}" cy="${f1(t)}" rx="${rx * 0.62}" ry="${ry * 0.62}"/>`,
    top: t - ry, bottom: cy + ry,
  };
}

// Each kind returns { svg, top, bottom, pad } — pad is the ground half-size used for the dashed slot and the glow.
const SHAPES = {
  users(x, y) {
    const b = box(x, y, 22, 22, 6);
    const people = [[-12, -10], [-3, -14], [8, -9], [-11, 4], [1, -1], [12, 6], [-2, 11], [10, -1]]
      .map(([u, v]) => { const px = x + 0.866 * (u - v), py = y - 6 + 0.5 * (u + v); return `<path class="fig" d="M${f1(px)} ${f1(py)}v-5"/><circle class="head" cx="${f1(px)}" cy="${f1(py - 6.5)}" r="2.2"/>`; }).join("");
    return { svg: b.svg + people, top: b.top - 9, bottom: b.bottom, pad: 22 };
  },
  firewall(x, y) {
    // A gate across the cable: two posts and a slatted wall between them.
    const back = box(x + 0.866 * 18, y - 9, 6, 6, 28, "post"), front = box(x - 0.866 * 18, y + 9, 6, 6, 28, "post");
    const wall = box(x, y, 3.5, 17, 21);
    const slats = onRight(wall.F, [0, 1, 2, 3, 4].map((i) => `<rect class="slat" x="${4 + i * 6.4}" y="-18" width="2.2" height="15"/>`).join(""));
    return { svg: back.svg + wall.svg + slats + front.svg, top: back.top, bottom: front.bottom, pad: 20 };
  },
  lb(x, y) {
    const b = box(x, y, 19, 19, 18);
    const fork = onTop(x, y - 18, `<path class="glyph" d="M-9 -9 L-1 -1 M-1 -1 L9 -6 M-1 -1 L6 6 M-1 -1 L-4 9"/><circle class="glyph-dot" cx="-9" cy="-9" r="2"/>`);
    const ports = onLeft(b.L, [0, 1, 2, 3, 4].map((i) => `<rect class="port" x="${6 + i * 5.6}" y="-11" width="3" height="4" rx=".6"/>`).join(""));
    return { svg: b.svg + fork + ports, top: b.top, bottom: b.bottom, pad: 19 };
  },
  app(x, y) {
    const a = 17, h = 38, b = box(x, y, a, a, h);
    const rows = [0, 1, 2, 3, 4];
    const left = onLeft(b.L, rows.map((i) => `<rect class="slit" x="4" y="${-h + 6 + i * 7.4}" width="${2 * a - 13}" height="2.4" rx=".8"/><circle class="led" cx="${2 * a - 4.5}" cy="${-h + 7.2 + i * 7.4}" r="1.5"/>`).join(""));
    const right = onRight(b.F, rows.map((i) => `<rect class="vent" x="5" y="${-h + 6 + i * 7.4}" width="${2 * a - 10}" height="1.6"/>`).join(""));
    return { svg: b.svg + left + right, top: b.top, bottom: b.bottom, pad: 17 };
  },
  cache(x, y) {
    const b = box(x, y, 17, 17, 18);
    const bolt = onTop(x, y - 18, `<path class="glyph-fill" d="M3 -10 L-6 1 L0 1 L-3 10 L7 -2 L1 -2 Z"/>`);
    const rows = onLeft(b.L, [0, 1].map((i) => `<rect class="slit" x="4" y="${-14 + i * 6}" width="21" height="2.2" rx=".8"/>`).join(""));
    return { svg: b.svg + bolt + rows, top: b.top, bottom: b.bottom, pad: 17 };
  },
  db(x, y) { return { ...drum(x, y, 25, 30), pad: 17 }; },
  replica(x, y) { return { ...drum(x, y, 22, 26), pad: 15 }; },
};

// Flag text by kind: [status word, colour level, number shown with Monitoring].
function flagState(kind, s, ctx) {
  const pct = (x) => `${Math.round(x * 100)}%`;
  const load = (x) => (x >= 1 ? ["OVERLOADED", "bad"] : x >= 0.7 ? ["BUSY", "warn"] : ["OK", "ok"]);
  switch (kind) {
    case "users": return [...(s.avail >= 0.95 ? ["OK", "ok"] : s.avail >= 0.6 ? ["DEGRADED", "warn"] : ["OUTAGE", "bad"]), pct(s.avail)];
    case "firewall": {
      const pass = s.block ? C.blockPass : C.firewallPass, blocked = s.badIn / pass - s.badIn;
      return [...(s.block ? ["BLOCKING", "ok"] : s.badIn > 1 ? ["BOTS PASSING", "warn"] : ["OK", "ok"]), `${Math.round(blocked)}/${Math.round(s.badIn)}`];
    }
    case "lb": return [...(s.rateLimit ? ["LIMITING", "warn"] : ["OK", "ok"]), `${Math.round(s.incoming)}/s`];
    case "app": return [...(ctx.m && s.deployBad ? ["ERRORS", "bad"] : load(s.appLoad)), pct(s.appLoad)];
    case "cache": return [...(s.hit < 0.1 ? ["COLD", "bad"] : s.hit < 0.5 ? ["WARMING", "warn"] : ["OK", "ok"]), pct(s.hit)];
    case "db": return s.dbDown ? ["OFFLINE", "bad", "—"] : [...load(s.dbLoad ?? 0), pct(s.dbLoad ?? 0)];
    case "replica": return !s.replica ? ["PROMOTED", "info", ""] : s.dbDown ? ["ACTIVE", "warn", ""] : ["STANDBY", "info", ""];
    default: return ["OK", "ok", ""];
  }
}

export function createScene(svg, { onTap }) {
  let nodes = {}, flags = {}, glows = {}, links = {}, fxG, owned = {}, K = 1;

  function setOff(key, off) {
    const g = nodes[key];
    if (!g) return;
    g.classList.toggle("off", off);
    g.setAttribute("tabindex", off ? "-1" : "0");
    flags[key].g.classList.toggle("off", off);
    glows[key].classList.toggle("off", off);
  }

  function applyServers(n) {
    for (let i = 0; i < 4; i++) setOff(`app${i}`, i >= n);
    for (const l of Object.values(links)) if (l.app !== undefined) l.g.classList.toggle("off", l.app >= n);
  }

  function build(o) {
    owned = o;
    svg.setAttribute("viewBox", VIEW);
    svg.replaceChildren();
    const grid = mk("g", { class: "grid", mask: "url(#crewFade)" }), floor = mk("g"), cables = mk("g"), objs = mk("g"), flagG = mk("g", { class: "flags" });
    fxG = mk("g", { class: "fx" });
    svg.append(mk("defs", {}, `<radialGradient id="crewFadeG" cx="50%" cy="48%" r="58%"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="crewFade"><rect y="${VT}" width="${VW}" height="${VH}" fill="url(#crewFadeG)"/></mask>`), grid, floor, cables, objs, flagG, fxG);
    let d = "";
    for (let i = -8; i <= 12; i++) d += `M${pts(P(i, -8))} L${pts(P(i, 12))} M${pts(P(-8, i))} L${pts(P(12, i))} `;
    grid.append(mk("path", { d }));
    nodes = {}; flags = {}; glows = {}; links = {};

    for (const l of LINKS) {
      const dd = "M" + l.pts.map((p) => pts(P(...p))).join(" L");
      const g = mk("g", { class: "link" });
      const pulse = mk("path", { d: dd, class: "pulse" });
      g.append(mk("path", { d: dd, class: "cable" }), pulse);
      if (l.replica && !o.replica) g.classList.add("off");
      cables.append(g);
      links[l.id] = { g, pulse, app: l.app };
    }

    for (const [kind, key, gx, gy] of NODES) {
      const [x, y] = P(gx, gy);
      const sh = SHAPES[kind](x, y);
      const hw = HIT_W[kind], hitTop = sh.top - 35;
      const name = kind === "app" ? `APP-${+key.slice(3) + 1}` : NAME[kind];
      const g = mk("g", { class: `cr k-${kind}`, "data-kind": kind, "data-key": key, "data-mood": "happy", "data-x": f1(x), "data-y": f1(sh.top), role: "button", tabindex: "0", "aria-label": LABEL[kind] },
        `<rect class="hit" x="${f1(x - hw)}" y="${f1(hitTop)}" width="${2 * hw}" height="${f1(sh.bottom + 3 - hitTop)}"/>` +
        `<polygon class="pad" points="${diamond(x, y, sh.pad + 4)}"/><g class="body">${sh.svg}</g>`);
      objs.append(g);
      nodes[key] = g;
      const glow = mk("ellipse", { class: "glow", cx: f1(x), cy: f1(y), rx: f1(sh.pad * 2.3), ry: f1(sh.pad * 1.15) });
      floor.append(glow);
      glows[key] = glow;
      const fg = mk("g", { class: "flag", "data-key": key, "data-level": "ok" },
        `<rect class="bg" height="26" rx="4"/><path class="notch"/><text class="nm" y="0">${name}</text><text class="nu"></text><text class="st"></text><rect class="strip" height="2"/>`);
      flagG.append(fg);
      flags[key] = { g: fg, key, kind, x, dx: FLAG_DX[kind] || 0, top: sh.top, name, last: "" };
    }
    setOff("firewall", !o.firewall);
    setOff("replica", !o.replica);
    if (o.monitoring) fxG.append(mk("text", { class: "mon", x: VW - 8, y: 16, "text-anchor": "end" }, "MONITORING ON"));
    applyServers(o.app);
  }

  // Lay out one flag: name (+ number with Monitoring) on line 1, status word on line 2.
  function drawFlag(f, state) {
    f.state = state;
    let [word, level, num] = state;
    let n = owned.monitoring ? num : "";
    // Tight screens: app flags are 50 px apart, so they drop to a short word (name over "OK 61%").
    if (f.kind === "app" && K > 1.1) word = { BUSY: "BSY", OVERLOADED: "MAX", ERRORS: "ERR" }[word] || word;
    if (K > 1.1 && n && word.length + n.length < 11) { word += ` ${n}`; n = ""; }   // compact: one short second line
    const sig = `${word}|${level}|${n}|${K}`;
    if (sig === f.last) return;
    f.last = sig;
    const [bg, notch, nm, nu, st, strip] = f.g.children;
    nu.textContent = n; st.textContent = word;
    // Measure, then squeeze text (textLength) that would push the flag past its slot width.
    const fit = (el, est, max) => {
      el.removeAttribute("textLength");
      const l = (el.getComputedTextLength && el.getComputedTextLength()) || est;
      if (l <= max) return l;
      el.setAttribute("textLength", f1(max)); el.setAttribute("lengthAdjust", "spacingAndGlyphs");
      return max;
    };
    const inner = (f.kind === "app" && K > 1.1 ? 60 : FLAG_MAX[f.kind]) - 13;
    const nuL = n ? fit(nu, n.length * 6.4, inner) + 8 : 0;
    const w = Math.round(Math.max(fit(nm, f.name.length * 6, inner - nuL) + nuL, fit(st, word.length * 6.2, inner)) + 13);
    // Flags are drawn at K x size around their notch tip so text stays legible when the scene is scaled down.
    const left = Math.max(3, Math.min(VW - 3 - w * K, f.x + (f.dx - w / 2) * K));
    const x = f.x + (left - f.x) / K, y = f.top - 34;
    f.g.setAttribute("transform", K === 1 ? "" : `translate(${f1(f.x)} ${f1(y + 30)}) scale(${K}) translate(${f1(-f.x)} ${f1(-y - 30)})`);
    f.g.dataset.level = level;
    bg.setAttribute("x", f1(x)); bg.setAttribute("y", f1(y)); bg.setAttribute("width", w);
    notch.setAttribute("d", `M${f1(f.x - 4)} ${f1(y + 26)} L${f1(f.x)} ${f1(y + 30)} L${f1(f.x + 4)} ${f1(y + 26)}Z`);
    nm.setAttribute("x", f1(x + 6.5)); nm.setAttribute("y", f1(y + 10.5));
    nu.setAttribute("x", f1(x + w - 6.5)); nu.setAttribute("y", f1(y + 10.5));
    st.setAttribute("x", f1(x + 6.5)); st.setAttribute("y", f1(y + 21.5));
    strip.setAttribute("x", f1(x + 1)); strip.setAttribute("y", f1(y + 24)); strip.setAttribute("width", w - 2);
    nodes[f.key].setAttribute("aria-label", `${LABEL[f.kind]}: ${word.toLowerCase()}`);
  }

  // Text target is ~9.2 px on screen: scale flags up by 1/scene-scale (max 1.9x) when the scene is small.
  function fit() {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const s = Math.min(r.width / VW, r.height / VH);
    const k = Math.round(Math.max(1, Math.min(1.9, 9.2 / (9 * s))) * 20) / 20;
    if (k === K) return;
    K = k;
    for (const [key, f] of Object.entries(flags)) if (f.state && !nodes[key].classList.contains("off")) drawFlag(f, f.state);
  }
  if (typeof ResizeObserver === "function") new ResizeObserver(fit).observe(svg);

  function burst(key, text) {
    const g = nodes[key];
    if (!g || !fxG || fxG.querySelector(`.pop[data-key="${key}"]`)) return;   // one label per object at a time
    const t = mk("text", { x: g.dataset.x, y: +g.dataset.y + 30, class: "pop", "data-key": key }, text);
    fxG.append(t);
    setTimeout(() => t.remove(), 1000);
  }

  function update(snap, { quiet = false } = {}) {
    const load = (x) => (x >= 1 ? "dizzy" : x >= 0.7 ? "sweat" : "happy");
    const mood = {
      users: snap.avail >= 0.95 ? "happy" : snap.avail >= 0.6 ? "sweat" : "dizzy",
      firewall: snap.badIn > 1 && !snap.block ? "sweat" : "happy",
      lb: "happy",
      db: snap.dbDown ? "dead" : load(snap.dbLoad ?? 0),
      cache: snap.hit < 0.1 ? "dizzy" : snap.hit < 0.5 ? "sweat" : "happy",
      replica: "happy",
    };
    applyServers(snap.servers);
    const ctx = { m: !!owned.monitoring };
    for (const [key, g] of Object.entries(nodes)) {
      const kind = g.dataset.kind, m = kind === "app" ? load(snap.appLoad) : mood[kind];
      g.dataset.mood = m;
      glows[key].dataset.mood = m;
      if (!g.classList.contains("off")) drawFlag(flags[key], flagState(kind, snap, ctx));
    }
    const state = (id, cls) => links[id] && links[id].pulse.setAttribute("class", `pulse ${cls}`);
    const pass = !owned.firewall ? 1 : snap.block ? C.blockPass : C.firewallPass;
    state("uf", snap.badIn / pass > 1 ? "hot" : "");
    state("fl", snap.badIn > 1 ? "hot" : "");
    for (let i = 0; i < 4; i++) {
      state(`a${i}`, snap.appLoad >= 1 ? "hot" : "");
      state(`d${i}`, snap.dbDown ? "dead" : (snap.dbLoad ?? 0) >= 1 ? "hot" : "");
    }
    state("jd", snap.dbDown ? "dead" : (snap.dbLoad ?? 0) >= 1 ? "hot" : "");
    state("jc", snap.hit < 0.1 ? "cold" : "");
    state("jr", snap.dbDown && snap.replica ? "" : "idle");
    svg.style.setProperty("--flow", `${Math.max(0.45, Math.min(1.4, 30 / Math.max(snap.good, 1))).toFixed(2)}s`);
    if (quiet) return;
    if (snap.onset && snap.top) {
      const target = { "app-overload": `app${Math.floor(Math.random() * snap.servers)}`, "bad-deploy": "app0", "db-down": "db", "db-overload": "db", "rate-limit": "lb", attack: snap.block ? "lb" : "firewall" }[snap.top];
      if (target && !nodes[target]?.classList.contains("off")) burst(target, REASON_TEXT[snap.top]);
      else if (target === "firewall") burst("lb", REASON_TEXT[snap.top]);
    }
  }

  svg.addEventListener("click", (e) => {
    const g = e.target.closest(".cr");
    if (g && !g.classList.contains("off")) onTap(g.dataset.kind, g.dataset.key, g);
    else onTap(null);
  });
  svg.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const g = e.target.closest(".cr");
    if (g && !g.classList.contains("off")) { e.preventDefault(); onTap(g.dataset.kind, g.dataset.key, g); }
  });

  return { build, update, el: (key) => nodes[key], burst };
}
