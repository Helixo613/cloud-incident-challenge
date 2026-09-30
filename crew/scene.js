// SVG scene: the crew as characters joined by tubes. No game logic here — it only draws a sim snapshot.
const NS = "http://www.w3.org/2000/svg";
const APP_X = [60, 140, 220, 300];
const AY = 246;
const POS = { users: [180, 34], firewall: [180, 94], lb: [180, 154], cache: [70, 338], db: [190, 338], replica: [300, 338] };
const LABEL = { users: "Users", firewall: "Firewall", lb: "Balancer", app: "App", cache: "Cache", db: "Database", replica: "Replica" };
const REASON_TEXT = { "app-overload": "too busy!", "bad-deploy": "error!", "db-down": "no DB!", "db-overload": "DB slow!", "rate-limit": "throttled", attack: "bot!" };
const FACE_Y = { users: -2, firewall: -4, lb: -2, app: -4, cache: -4, db: 2, replica: 2 };

const BODY = {
  users: `<circle cx="-22" cy="4" r="15" class="b c2"/><circle cx="22" cy="4" r="15" class="b c2"/><circle cx="0" cy="-2" r="20" class="b"/>`,
  firewall: `<path class="b" d="M-26 -22 H26 V6 Q26 26 0 34 Q-26 26 -26 6 Z"/>`,
  lb: `<rect class="b" x="-34" y="-20" width="68" height="40" rx="14"/><path class="ln" d="M-22 -28 V-20 M0 -28 V-20 M22 -28 V-20"/>`,
  app: `<rect class="b" x="-26" y="-26" width="52" height="52" rx="12"/><path class="ln" d="M-16 20 H16"/>`,
  cache: `<rect class="b" x="-28" y="-20" width="56" height="40" rx="12"/><path class="bolt" d="M4 -30 L-6 -10 H2 L-4 4 L10 -16 H2 Z"/>`,
  db: `<path class="b" d="M-26 -18 V18 Q0 32 26 18 V-18 Z"/><ellipse class="b top" cx="0" cy="-18" rx="26" ry="9"/>`,
};
BODY.replica = BODY.db;
// Glossy highlight per body so the crew reads as toys, not boxes.
const SHINE = {
  users: `<ellipse class="shine" cx="-7" cy="-13" rx="8" ry="4" transform="rotate(-25 -7 -13)"/>`,
  firewall: `<path class="shine" d="M-19 -16 H-6 M-19 -8 V0"/>`,
  lb: `<path class="shine" d="M-24 -12 Q-24 -15 -18 -15 H-4"/>`,
  app: `<path class="shine" d="M-18 -19 H-4 M-18 -19 V-9"/>`,
  cache: `<path class="shine" d="M-21 -12 Q-21 -14 -16 -14 H-2"/>`,
  db: `<path class="shine" d="M-19 -4 V8"/>`,
};
SHINE.replica = SHINE.db;
const CHEEKS = `<circle class="cheek" cx="-17" cy="8" r="3.5"/><circle class="cheek" cx="17" cy="8" r="3.5"/>`;
// Labels: stacked column sits beside its character, the rest below it.
const SIDE = { users: 44, firewall: 34, lb: 42 };

const FACE = `<g class="face">
  <g class="e e-happy"><circle cx="-9" r="6" class="w"/><circle cx="9" r="6" class="w"/><circle cx="-8" cy="1" r="2.8" class="p"/><circle cx="10" cy="1" r="2.8" class="p"/></g>
  <g class="e e-sweat"><circle cx="-9" r="6" class="w"/><circle cx="9" r="6" class="w"/><circle cx="-9" cy="-1" r="2.8" class="p"/><circle cx="9" cy="-1" r="2.8" class="p"/><path class="drop" d="M20 -12 q4 6 0 9 q-4 -3 0 -9z"/></g>
  <g class="e e-dizzy"><circle cx="-9" r="6" class="w"/><circle cx="9" r="6" class="w"/><path class="sp" d="M-12 0 a3 3 0 1 1 3 3 M6 0 a3 3 0 1 1 3 3"/></g>
  <g class="e e-dead"><path class="x" d="M-14 -5 l10 10 m0 -10 l-10 10 M4 -5 l10 10 m0 -10 l-10 10"/></g>
  <path class="m m-happy" d="M-7 10 Q0 17 7 10"/><path class="m m-sweat" d="M-6 12 Q0 9 6 12"/><path class="m m-dizzy" d="M-7 12 q3.5 -5 7 0 t7 0"/><path class="m m-dead" d="M-6 12 H6"/>
</g>`;

const mk = (tag, attrs = {}, html = "") => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
};

const LINKS = (() => {
  const l = [{ id: "ul", d: "M180 58 V134" }];
  APP_X.forEach((x, i) => {
    l.push({ id: `la${i}`, d: `M180 176 C180 204 ${x} 186 ${x} ${AY - 28}`, app: i });
    l.push({ id: `ad${i}`, d: `M${x} ${AY + 28} C${x} 300 190 286 190 312`, app: i });
    l.push({ id: `ac${i}`, d: `M${x} ${AY + 28} C${x} 300 70 286 70 312`, app: i });
  });
  l.push({ id: "dr", d: "M218 338 H272" });
  return l;
})();

export function createScene(svg, { onTap }) {
  let nodes = {}, tubes = {}, dotsG, fxG;

  function creature(kind, key, x, y) {
    const g = mk("g", { class: `cr k-${kind}`, "data-kind": kind, "data-key": key, "data-mood": "happy", "data-x": x, "data-y": y, transform: `translate(${x} ${y})`, role: "button", tabindex: "0", "aria-label": LABEL[kind] });
    const side = SIDE[kind];
    const lx = side ?? 0, ly = side ? 4 : 47, w = LABEL[kind].length * 7 + 12;
    g.innerHTML = `<circle class="hit" r="34"/><ellipse class="gr" cx="0" cy="34" rx="26" ry="5"/><g class="idle"><g class="sh">${BODY[kind]}${SHINE[kind]}</g><g transform="translate(0 ${FACE_Y[kind]})">${FACE}${CHEEKS}</g></g><g class="lg"><rect class="pill" x="${side ? lx - 4 : -w / 2}" y="${ly - 12}" width="${w}" height="17" rx="8.5"/><text class="lbl" x="${side ? lx - 4 + w / 2 : 0}" y="${ly}">${LABEL[kind]}</text></g>`;
    return g;
  }

  function setOff(g, off) {
    if (!g) return;
    g.classList.toggle("off", off);
    g.setAttribute("tabindex", off ? "-1" : "0");
  }

  function applyServers(n) {
    for (let i = 0; i < 4; i++) setOff(nodes[`app${i}`], i >= n);
    for (const t of Object.values(tubes)) if (t.l.app !== undefined) t.g.classList.toggle("off", t.l.app >= n);
  }

  function build(owned) {
    svg.replaceChildren();
    const tubeG = mk("g"), cr = mk("g");
    dotsG = mk("g"); fxG = mk("g");
    svg.append(tubeG, dotsG, cr, fxG);
    nodes = {}; tubes = {};
    for (const l of LINKS) {
      const g = mk("g", { class: "tubeg" });
      g.append(mk("path", { d: l.d, class: "tube" }), mk("path", { d: l.d, class: "tube core" }));
      tubeG.append(g);
      tubes[l.id] = { g, l };
    }
    const add = (kind, key, x, y, on = true) => {
      const g = creature(kind, key, x, y);
      if (!on) setOff(g, true);
      cr.append(g);
      nodes[key] = g;
    };
    add("users", "users", ...POS.users);
    add("firewall", "firewall", ...POS.firewall, !!owned.firewall);
    add("lb", "lb", ...POS.lb);
    APP_X.forEach((x, i) => add("app", `app${i}`, x, AY, i < owned.app));
    add("cache", "cache", ...POS.cache);
    add("db", "db", ...POS.db);
    add("replica", "replica", ...POS.replica, !!owned.replica);
    if (owned.monitoring) fxG.append(mk("text", { x: 334, y: 30, class: "radar", "text-anchor": "middle" }, "📡"));
    applyServers(owned.app);
  }

  const spawn = (id, n, cls = "") => {
    if (!tubes[id] || tubes[id].g.classList.contains("off") || document.hidden) return;
    for (let k = 0; k < n; k++) {
      const c = mk("circle", { r: 4.5, class: `dot ${cls}` });
      const a = mk("animateMotion", { dur: "1.1s", path: tubes[id].l.d, begin: "indefinite", fill: "freeze" });
      c.append(a);
      dotsG.append(c);
      setTimeout(() => { try { a.beginElement(); } catch {} }, (k * 900) / n);
      setTimeout(() => c.remove(), 900 / n * k + 1300);
    }
  };

  function burst(key, text) {
    const g = nodes[key];
    if (!g) return;
    const t = mk("text", { x: g.dataset.x, y: +g.dataset.y - 40, class: "pop" }, text);
    fxG.append(t);
    setTimeout(() => t.remove(), 1000);
  }

  function update(snap, { quiet = false } = {}) {
    const mood = (key, m) => { if (nodes[key]) nodes[key].dataset.mood = m; };
    const load = (x) => (x >= 1 ? "dizzy" : x >= 0.7 ? "sweat" : "happy");
    mood("users", snap.avail >= 0.95 ? "happy" : snap.avail >= 0.6 ? "sweat" : "dizzy");
    mood("firewall", snap.badIn > 1 ? "sweat" : "happy");
    mood("lb", "happy");
    applyServers(snap.servers);
    for (let i = 0; i < 4; i++) mood(`app${i}`, load(snap.appLoad));
    mood("db", snap.dbDown ? "dead" : load(snap.dbLoad ?? 0));
    mood("cache", snap.hit < 0.1 ? "dizzy" : snap.hit < 0.5 ? "sweat" : "happy");
    mood("replica", "happy");
    if (quiet) return;
    const n = Math.max(1, Math.min(4, Math.round(snap.good / 12)));
    spawn("ul", n, snap.badIn > 1 ? "bad" : "");
    for (let i = 0; i < snap.servers; i++) { spawn(`la${i}`, 1); spawn(`ad${i}`, 1); spawn(`ac${i}`, 1); }
    if (snap.onset && snap.top) {
      const target = { "app-overload": `app${Math.floor(Math.random() * snap.servers)}`, "bad-deploy": "app0", "db-down": "db", "db-overload": "db", "rate-limit": "lb", attack: snap.block ? "lb" : "firewall" }[snap.top];
      burst(target, REASON_TEXT[snap.top]);
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
