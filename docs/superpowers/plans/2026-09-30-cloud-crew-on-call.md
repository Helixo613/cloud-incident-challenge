# Cloud Crew: On-Call — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3D "Cloud Incident Challenge" classroom overlay with a phone-first 2D game, "Cloud Crew: On-Call", at `crew/`.

**Architecture:** A pure, deterministic simulation module (`sim.js`, tunable via `config.js`, incident data in `incidents.js`) drives an SVG "crew of characters" scene plus a DOM bottom-sheet UI. A small state machine in `main.js` runs Prep → Incident → Result for 5 rounds. Vanilla ES modules, no build, no dependencies, no network.

**Tech Stack:** Vanilla JS (ES modules), SVG + CSS, Web Audio, Vitest (already in repo) for logic tests, Playwright-core (scratchpad only, not a repo dependency) for browser verification.

**Spec:** `docs/superpowers/specs/2026-09-30-cloud-crew-on-call-design.md` (read it first; the plan implements it and includes the amendments made while planning: built-in cache, `dbCap` 30, herd factor, `spikeMult` 2.4, `startBudget` 120, `income` 0.03).

## Global Constraints

- Phone-first: portrait at 360×640 works; every interactive element ≥ 48×48 px; no horizontal scroll at 320–1280 px wide; `100dvh`; safe-area insets; `touch-action: manipulation`.
- Zero runtime network dependencies: no CDN, no remote fonts, no audio files.
- No build step, no new dependencies in `package.json`.
- Shift = 5 rounds; round 1 is always `spike`, round 5 always `bot-flood`, rounds 2–4 are the shuffle of `bad-deploy`, `db-crash`, `cache-flush` by seed.
- Incident round is 75 s max; onset at 5 s ± 3 s; ends early after availability ≥ 95 % for 10 consecutive seconds.
- Start budget $120; income $0.03 per served request; actions are never blocked by low budget (budget may go negative; negative final budget drops the grade one band).
- Stars per round: ★ average availability ≥ 90 %; ★ availability back ≥ 95 % within 30 s of onset; ★ correct diagnosis made before the first fix action.
- Prefix shell commands with `rtk`. Serve locally on loopback only: `python3 -m http.server 8766 --bind 127.0.0.1` (binding to all interfaces is blocked by policy).
- **Commit steps are checkpoints.** The repo owner's standing rule is: no commit or push unless explicitly instructed. Run `git add` at each checkpoint; run `git commit` only if the owner has authorised commits in this session, otherwise leave the work staged and say so.
- Keep the upstream `LICENSE` and copyright notices.
- Code style: 2-space indent in tests, 4-space in existing `src/` files is upstream's; **`crew/` uses 2-space indent, double quotes, semicolons** (matches `tests/`).

## Review Focus

Inputs and conditions the spec implies but no happy-path test exercises; each has a test in the named task.

1. **Odd seeds** — `?seed=` empty, emoji, 500 characters, or numeric must still give a valid, deterministic shift (Task 2, Task 3).
2. **Double-tap on a phone** — tapping "Add app server" or a shop card twice quickly must not double-charge (Task 7 UI guard; verified in browser smoke).
3. **Refresh / back mid-round** — reload restarts cleanly, no orphaned timers or stale screens (Task 7 browser smoke).
4. **Blocked `localStorage`, missing `AudioContext`, throwing `navigator.vibrate`** — the game must still play (Task 8 hostile-environment smoke).
5. **320 px wide screen and `prefers-reduced-motion`** — no overflow, no shake/particles (Task 9 matrix).

## File Structure

| File | Responsibility | Created in |
|---|---|---|
| `crew/config.js` | Every tunable number | Task 2 |
| `crew/rng.js` | Seeded PRNG (`hashSeed`, `makeRng`) | Task 2 |
| `crew/incidents.js` | Incident data (`INCIDENTS`, `MIDDLE`) | Task 2 |
| `crew/content.js` | Text: hypotheses, action/shop labels, debriefs, clues, ticker | Task 2 |
| `crew/sim.js` | Pure simulation: shift, shop, tick, actions, diagnosis, scoring | Task 3 |
| `tests/helpers/crew-bots.mjs` | Simulated players used by balance tests | Task 4 |
| `crew/index.html`, `crew/style.css` | Page shell, screens, tokens, layout | Task 5 |
| `crew/ui.js` | HUD, sheet, bubble, banner, result/final screens, click delegation | Task 5 (grown in 7) |
| `crew/scene.js` | SVG characters, tubes, traffic dots, bursts | Task 6 |
| `crew/fx.js` | Audio, haptics, shake, coin-fly | Task 8 |
| `crew/main.js` | Round state machine | Task 5 (grown in 7) |
| `tests/browser/crew-smoke.mjs` | Playwright smoke/matrix (run from scratchpad) | Task 5 (grown after) |
| `tests/crew-*.test.mjs` | Vitest unit + balance tests | Tasks 2–4 |
| `crew/AGENTS.md`, `docs/context/*`, `README.md` | Docs | Task 9 |

Public function names used across tasks (keep exact):
- `sim.js`: `newShift(seed)`, `buy(shift, item)`, `startRound(shift)`, `preview(round)`, `tick(round, shift)`, `act(round, shift, actionId)`, `diagnose(round, hypothesisId)`, `lockReason(round, actionId)`, `finishRound(round, shift)`, `shiftOver(shift)`, `gradeFor(shift)`.
- `scene.js`: `createScene(svgEl, { onTap })` → `{ build(owned), update(snap, opts), el(key), burst(key, text) }`.
- `ui.js`: `showScreen`, `renderHud`, `renderPrep`, `renderLive`, `banner`, `setAlarm`, `setTicker`, `showBubble`, `hideBubble`, `coach`, `showResult`, `showFinal`, `setMenu`, `setMuteLabel`, `bind`.
- `fx.js`: `unlock`, `sfx`, `haptic`, `shake`, `flyCoin`, `isMuted`, `setMuted`, `reducedMotion`.

---

## Task 1: Retire the classroom layer (owner checkpoint)

**Files:**
- Restore to upstream baseline `f268e36`: `game.js`, `index.html`, `style.css`, `src/i18n.js`, `README.md`
- Delete: `src/classroom.js`, `src/classroom-guide.js`, `tests/classroom-guide.test.mjs`, `AGENTS.md`, `src/AGENTS.md`, `src/sim/AGENTS.md`, `docs/context/CLASSROOM.md`, `docs/context/OPERATIONS.md`, `docs/context/STATUS.md`
- Keep: `.gitignore` (its only change is ignoring `.superpowers/`), `docs/superpowers/**`

**Interfaces:** Produces a repo whose root is the untouched upstream game again.

- [ ] **Step 1: Show the owner exactly what will be discarded**

Run:
```bash
cd /home/arnavbansal/CLD/Activity/server-survival
rtk git diff f268e36 -- game.js src/i18n.js index.html style.css README.md | head -300
rtk git log --oneline f268e36..HEAD
```
Expected: the three classroom commits (`286ce32`, `a1c26d5`, `775f6ca`) and diffs that are all classroom-related (entry hook in `game.js`, a title tweak in `src/i18n.js`, overlay markup/CSS, README intro).

- [ ] **Step 2: STOP — ask the owner to confirm**

Ask: "This restores game.js, index.html, style.css, src/i18n.js and README.md to the upstream baseline and deletes the classroom files (list above). The changes exist in git history (commits 286ce32, a1c26d5, 775f6ca) except the uncommitted edits, which will be lost. Confirm?" Do not continue without an explicit yes. If the diff shows any non-classroom fix worth keeping, keep that hunk and tell the owner.

- [ ] **Step 3: Restore and delete**

```bash
cd /home/arnavbansal/CLD/Activity/server-survival
rtk git checkout f268e36 -- game.js index.html style.css src/i18n.js README.md
rtk git rm -f src/classroom.js
rm -f src/classroom-guide.js tests/classroom-guide.test.mjs AGENTS.md src/AGENTS.md src/sim/AGENTS.md
rm -f docs/context/CLASSROOM.md docs/context/OPERATIONS.md docs/context/STATUS.md
rmdir docs/context 2>/dev/null || true
rtk git status --short
```
Expected: only `.gitignore` modified plus staged restores/deletions; `docs/superpowers/` untracked/new.

- [ ] **Step 4: Verify the upstream game and the whole suite are green**

Run: `rtk npm run check`
Expected: ESLint clean; all remaining test files pass (63 files minus the deleted classroom test; the count printed by Vitest is the new baseline — write it down).

- [ ] **Step 5: Checkpoint**

```bash
rtk git add -A .gitignore game.js index.html style.css src README.md tests docs/superpowers
# only if the owner authorised commits:
# git commit -m "chore: retire classroom overlay, restore upstream game"
```

---

## Task 2: Config, RNG, incident data, content

**Files:**
- Create: `crew/config.js`, `crew/rng.js`, `crew/incidents.js`, `crew/content.js`
- Test: `tests/crew-rng.test.mjs`, `tests/crew-data.test.mjs`

**Interfaces:**
- Produces: `CONFIG`; `hashSeed(seed): number`, `makeRng(seed) → { next(), range(lo,hi), int(lo,hi), pick(arr), shuffle(arr) }`; `INCIDENTS[id] → { title, correct, fixes: string[], hypotheses: string[4] }`, `MIDDLE`; content exports `HYPOTHESES`, `ACTION_UI`, `SHOP_UI`, `DEBRIEF`, `STARS`, `clueFor(kind, snap, monitoring)`, `tickerLine(snap, monitoring, incidentId)`.

- [ ] **Step 1: Write the failing tests**

`tests/crew-rng.test.mjs`:
```js
import { describe, expect, it } from "vitest";
import { hashSeed, makeRng } from "../crew/rng.js";

describe("rng", () => {
  it("is deterministic per seed and differs between seeds", () => {
    const a = makeRng("abc"), b = makeRng("abc"), c = makeRng("abd");
    const xs = [a.next(), a.next(), a.next()];
    expect([b.next(), b.next(), b.next()]).toEqual(xs);
    expect([c.next(), c.next(), c.next()]).not.toEqual(xs);
  });
  it("stays in [0,1) and range/int respect bounds", () => {
    const r = makeRng("bounds");
    for (let i = 0; i < 1000; i++) {
      const x = r.next(); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1);
      const y = r.range(-3, 3); expect(y).toBeGreaterThanOrEqual(-3); expect(y).toBeLessThan(3);
      const z = r.int(2, 4); expect([2, 3, 4]).toContain(z);
    }
  });
  it("shuffle returns a permutation and does not mutate its input", () => {
    const input = [1, 2, 3, 4, 5]; const out = makeRng("s").shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it("accepts odd seeds: empty, emoji, numeric, 500 chars", () => {
    for (const s of ["", "🙂🙂", 12345, "x".repeat(500)]) {
      const v = makeRng(s).next();
      expect(Number.isFinite(v)).toBe(true);
      expect(makeRng(s).next()).toBe(v);
    }
    expect(hashSeed("")).toBeTypeOf("number");
  });
});
```

`tests/crew-data.test.mjs`:
```js
import { describe, expect, it } from "vitest";
import { CONFIG as C } from "../crew/config.js";
import { INCIDENTS, MIDDLE } from "../crew/incidents.js";
import { ACTION_UI, DEBRIEF, HYPOTHESES, SHOP_UI, clueFor, tickerLine } from "../crew/content.js";

describe("incident data", () => {
  it("every incident has 4 distinct hypotheses including the correct one, and only real fixes", () => {
    for (const [id, inc] of Object.entries(INCIDENTS)) {
      expect(new Set(inc.hypotheses).size, id).toBe(4);
      expect(inc.hypotheses, id).toContain(inc.correct);
      for (const h of inc.hypotheses) expect(HYPOTHESES[h], `${id}:${h}`).toBeTypeOf("string");
      for (const f of inc.fixes) expect(C.actions[f], `${id}:${f}`).toBeDefined();
      expect(DEBRIEF[id].what.length).toBeGreaterThan(10);
      expect(DEBRIEF[id].pro.length).toBeGreaterThan(10);
    }
    expect(MIDDLE.sort()).toEqual(["bad-deploy", "cache-flush", "db-crash"]);
  });
  it("every action and shop item has UI copy", () => {
    for (const id of Object.keys(C.actions)) expect(ACTION_UI[id].name, id).toBeTypeOf("string");
    for (const id of Object.keys(C.shop)) expect(SHOP_UI[id].name, id).toBeTypeOf("string");
  });
  it("clues never throw for any node kind, with or without monitoring", () => {
    const snap = { avail: 0.5, appLoad: 1.2, dbLoad: 0.4, dbDown: false, hit: 0, incoming: 50, appCap: 40, badIn: 10, deployBad: false, onset: true, top: "app-overload" };
    for (const kind of ["users", "firewall", "lb", "app", "cache", "db", "replica"]) {
      for (const m of [true, false]) {
        const c = clueFor(kind, snap, m);
        expect(c.lines.length, kind).toBeGreaterThan(0);
      }
    }
    expect(tickerLine({ ...snap, onset: false }, false, "spike")).toBeTypeOf("string");
    expect(tickerLine(snap, true, "spike")).toBeTypeOf("string");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `rtk npx vitest run tests/crew-rng.test.mjs tests/crew-data.test.mjs`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`crew/config.js`:
```js
// Every tunable number in the game. Balance work only edits this file.
export const CONFIG = {
  startBudget: 120,
  income: 0.03,          // $ per successfully served request
  roundSeconds: 75,
  onsetBase: 5,
  onsetJitter: 3,
  baseRps: [20, 24, 28, 32, 36],
  jitter: [0.9, 1.1],
  appCap: 40,            // rps per app server
  maxServers: 4,
  dbCap: 30,
  readShare: 0.8,
  cacheHit: 0.6,
  warmSeconds: 20,
  replicaShare: 0.5,     // share of cache-missing reads the replica takes
  spikeMult: 2.4,
  floodMult: 3,
  firewallPass: 0.1,
  blockPass: 0.01,
  rateLimitCap: 0.8,
  scaleDelay: 5,
  restartSeconds: 20,
  failoverSeconds: 2,
  rollbackSeconds: 3,
  blipSeconds: 5,        // rolling back when nothing is wrong causes a brief bad deploy
  stableAvail: 0.95,
  stableSeconds: 10,
  fastSeconds: 30,
  starAvail: 0.9,
  shop: {
    app: { cost: 40, max: 4 },
    replica: { cost: 80, max: 1 },
    monitoring: { cost: 30, max: 1 },
    firewall: { cost: 40, max: 1 },
  },
  actions: {
    scale: { cost: 30 },
    restart: { cost: 0 },
    failover: { cost: 0, needs: "replica" },
    rollback: { cost: 0 },
    warm: { cost: 20 },
    ratelimit: { cost: 15 },
    block: { cost: 0, needs: "firewall" },
  },
};
```

`crew/rng.js`:
```js
// Seeded PRNG (mulberry32 over an FNV-1a hash) so a class can replay the same shift via ?seed=.
export function hashSeed(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function makeRng(seed) {
  let a = hashSeed(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => Math.floor(lo + (hi - lo + 1) * next()),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle(arr) {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}
```

`crew/incidents.js`:
```js
// Incident definitions. `fixes` are the actions that actually resolve it;
// `hypotheses` are the four diagnosis choices (order is shuffled per round).
export const INCIDENTS = {
  spike: { title: "Traffic spike", correct: "capacity", fixes: ["scale"], hypotheses: ["capacity", "db-small", "network", "bad-release"] },
  "bad-deploy": { title: "Bad release", correct: "bad-release", fixes: ["rollback"], hypotheses: ["bad-release", "capacity", "db-crash", "network"] },
  "db-crash": { title: "Database down", correct: "db-crash", fixes: ["failover", "restart"], hypotheses: ["db-crash", "capacity", "bad-release", "network"] },
  "cache-flush": { title: "Cold cache", correct: "cache-cold", fixes: ["warm"], hypotheses: ["cache-cold", "db-small", "capacity", "attack"] },
  "bot-flood": { title: "Bot flood", correct: "attack", fixes: ["block"], hypotheses: ["attack", "capacity", "network", "db-small"] },
};
export const MIDDLE = ["bad-deploy", "db-crash", "cache-flush"];
```

`crew/content.js`:
```js
// All player-facing words. Clues are deliberately vague without Monitoring.
export const HYPOTHESES = {
  capacity: "We don't have enough app servers for this traffic",
  "db-small": "The database is too small",
  network: "The network between machines is failing",
  "bad-release": "The latest release is broken",
  "db-crash": "The database has crashed",
  "cache-cold": "The cache went cold and the database is drowning",
  attack: "Malicious bots are flooding us",
};

export const ACTION_UI = {
  scale: { icon: "➕", name: "Add app server", note: "+1 server for this round" },
  restart: { icon: "🔄", name: "Restart database", note: "≈20 s of downtime" },
  failover: { icon: "🛟", name: "Fail over to replica", note: "≈2 s blip, uses up the replica" },
  rollback: { icon: "⏪", name: "Roll back release", note: "Undo the latest deploy" },
  warm: { icon: "🔥", name: "Warm the cache", note: "Refills over ≈20 s" },
  ratelimit: { icon: "🚦", name: "Rate-limit", note: "Cap traffic at 80% of capacity" },
  block: { icon: "🛡️", name: "Block bad traffic", note: "The firewall drops the bots" },
};

export const SHOP_UI = {
  app: { icon: "🖥️", name: "App server", note: "+40 req/s of capacity" },
  replica: { icon: "📀", name: "DB replica", note: "Shares reads · backup if the DB dies" },
  monitoring: { icon: "📡", name: "Monitoring", note: "Exact numbers and logs" },
  firewall: { icon: "🧱", name: "Firewall", note: "Stops most bad traffic" },
};

export const STARS = [
  ["avail", "Stayed up (90%+ average)"],
  ["fast", "Fixed within 30 s"],
  ["diag", "Diagnosed before fixing"],
];

export const DEBRIEF = {
  spike: { title: "Traffic spike", what: "Traffic more than doubled and one app server couldn't keep up. The database was never the problem.", pro: "Scale out the app tier (or keep headroom before the rush). Check which tier is saturated before touching the others." },
  "bad-deploy": { title: "Bad release", what: "Errors jumped right after a release while load stayed normal, so capacity was not the issue.", pro: "Roll back first, investigate second. When errors rise but load doesn't, suspect the change, not the traffic." },
  "db-crash": { title: "Database down", what: "The primary database went offline: writes failed and every read that missed the cache failed too.", pro: "Fail over to a replica if you have one (seconds). A restart works but costs a long outage. Replicas are insurance." },
  "cache-flush": { title: "Cold cache", what: "The cache was wiped, so every read hit the database and its load exploded.", pro: "Warm the cache and protect the database. Adding app servers or guessing a bigger DB doesn't fix a cold cache." },
  "bot-flood": { title: "Bot flood", what: "Most of the traffic was malicious, eating capacity that real users needed.", pro: "Block at the edge with a firewall. Scaling up just pays to serve the attackers." },
};

const pct = (x) => `${Math.round(x * 100)}%`;

// What a creature says when tapped. `s` is a sim snapshot, `m` = Monitoring owned.
export function clueFor(kind, s, m) {
  switch (kind) {
    case "users":
      return { lines: [s.avail >= 0.95 ? "Everything works!" : s.avail >= 0.6 ? "Pages are slow and some fail…" : "The site is DOWN!"], gauge: { label: "Happy users", value: s.avail } };
    case "firewall":
      return { lines: [m ? (s.badIn > 0.5 ? `Suspicious traffic: ${Math.round(s.badIn)} req/s got through` : "Nothing suspicious") : (s.badIn > 0.5 ? "Lots of weird visitors…" : "Quiet at the gate.")], gauge: null };
    case "lb":
      return { lines: [m ? `Routing ${Math.round(s.incoming)} req/s` : "Sending guests to the app servers."], gauge: null };
    case "app": {
      const a = s.appLoad;
      if (!m) return { lines: [a >= 1 ? "I can't keep up!" : a >= 0.7 ? "Getting hot in here…" : "Doing fine."], gauge: null };
      return { lines: [`CPU ${pct(a)}`, s.deployBad ? "Half my replies are errors — it started right after the release." : a >= 1 ? "Requests are queueing up." : "Error rate normal."], gauge: { label: "CPU", value: a } };
    }
    case "db": {
      if (s.dbDown) return { lines: m ? ["OFFLINE — connection refused", "Writes are failing."] : ["…"], gauge: null };
      const d = s.dbLoad;
      if (!m) return { lines: [d >= 1 ? "I'm drowning in queries!" : d >= 0.7 ? "Busy, busy…" : "Relaxed."], gauge: null };
      return { lines: [`Load ${pct(d)}`, s.hit < 0.3 ? "Almost no cache hits — every read lands on me." : "The cache absorbs most reads."], gauge: { label: "DB load", value: d } };
    }
    case "cache":
      return { lines: m ? [`Hit rate ${pct(s.hit)}`, s.hit < 0.3 ? "I was wiped. I'm empty!" : "Serving most reads."] : [s.hit < 0.3 ? "Brrr… I feel empty." : "Full of goodies."], gauge: m ? { label: "Hit rate", value: s.hit / 0.6 } : null };
    case "replica":
      return { lines: [s.dbDown ? "I'm the backup — I can still serve reads." : "Keeping a copy of the data."], gauge: null };
    default:
      return { lines: [], gauge: null };
  }
}

// One line under the scene: user complaints, or a log line when Monitoring is owned.
export function tickerLine(s, m, id) {
  if (!s.onset) return "All quiet…";
  if (!m) return s.avail >= 0.95 ? "Users: all good" : s.avail >= 0.6 ? "Users: “It's slow and I get errors”" : "Users: “Your site is down!!”";
  if (s.avail >= 0.95) return "LOG: all systems nominal";
  if (id === "bad-deploy") return "LOG: release v2.4.1 deployed · error rate 50%";
  if (id === "db-crash") return "LOG: db-primary connection refused";
  if (id === "cache-flush") return `LOG: cache hit rate ${pct(s.hit)}`;
  if (id === "bot-flood") return `LOG: ${Math.round(s.badIn)} req/s from 3 IP addresses`;
  return `LOG: ${Math.round(s.incoming)} req/s vs ${s.appCap} capacity`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `rtk npx vitest run tests/crew-rng.test.mjs tests/crew-data.test.mjs`
Expected: PASS (all tests).

- [ ] **Step 5: Lint + checkpoint**

Run: `rtk npx eslint crew tests/crew-rng.test.mjs tests/crew-data.test.mjs` → clean.
```bash
rtk git add crew tests/crew-rng.test.mjs tests/crew-data.test.mjs
# commit only if authorised: "feat(crew): config, rng, incident data, content"
```

---

## Task 3: Simulation core

**Files:**
- Create: `crew/sim.js`
- Test: `tests/crew-sim.test.mjs`

**Interfaces:**
- Consumes: `CONFIG`, `INCIDENTS`, `MIDDLE`, `makeRng` (Task 2).
- Produces (exact):
  - `newShift(seed) → { seed:string, round:0, budget, owned:{app,replica,monitoring,firewall}, order:string[5], results:[] }`
  - `buy(shift, item) → { ok, reason? }`
  - `startRound(shift) → round` (fields incl. `id, n, t, done, onset, onsetAt, hypOrder, has:{replica,monitoring,firewall}, snap, diagnosis, mitigatedAt`)
  - `preview(round) → snap`, `tick(round, shift) → snap`
  - `snap = { t, onset, servers, good, incoming, appCap, appLoad, dbLoad|null, dbDown, hit, avail, served, reasons, top, deployBad, rateLimit, block, badIn, replica }`
  - `act(round, shift, id) → { ok, cost?, reason? }`, `lockReason(round, id) → string|null`
  - `diagnose(round, id) → { ok, correct?, reason? }`
  - `finishRound(round, shift) → { id, n, avg, stars:{avail,fast,diag}, count, earned, spent, diagnosis, mitigatedAt, onsetAt }`
  - `shiftOver(shift)`, `gradeFor(shift) → "S"|"A"|"B"|"C"|"D"`

- [ ] **Step 1: Write the failing tests**

`tests/crew-sim.test.mjs`:
```js
import { describe, expect, it } from "vitest";
import { CONFIG as C } from "../crew/config.js";
import { INCIDENTS } from "../crew/incidents.js";
import { act, buy, diagnose, finishRound, gradeFor, lockReason, newShift, preview, shiftOver, startRound, tick } from "../crew/sim.js";

// Play one round of `incident` as round index `n`. `owned` overrides the shop state.
// `fixes` are applied on the first tick after onset; `diag` is picked first if given.
function play(incident, { n = 0, owned = {}, fixes = [], diag = null, seed = "t" } = {}) {
  const shift = newShift(seed);
  shift.order[n] = incident;
  shift.round = n;
  Object.assign(shift.owned, owned);
  const r = startRound(shift);
  let acted = false;
  while (!r.done) {
    tick(r, shift);
    if (r.onset && !acted) {
      acted = true;
      if (diag) diagnose(r, diag);
      for (const f of fixes) act(r, shift, f);
    }
  }
  return { r, shift };
}

// [incident, round index, owned, right fixes]
const RIGHT = [
  ["spike", 0, {}, ["scale"]],
  ["bad-deploy", 1, {}, ["rollback"]],
  ["db-crash", 2, {}, ["restart"]],
  ["db-crash", 2, { replica: 1 }, ["failover"]],
  ["cache-flush", 1, {}, ["warm"]],
  ["bot-flood", 4, { firewall: 1, app: 2 }, ["block"]],
];
const WRONG_CASES = [
  ["spike", 0, {}], ["bad-deploy", 1, {}], ["db-crash", 2, {}], ["cache-flush", 1, {}], ["bot-flood", 4, { firewall: 1, app: 2 }],
];

describe("shift setup", () => {
  it("round 1 is spike, round 5 is bot-flood, the middle is a permutation", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      const { order } = newShift(seed);
      expect(order[0]).toBe("spike");
      expect(order[4]).toBe("bot-flood");
      expect([...order.slice(1, 4)].sort()).toEqual(["bad-deploy", "cache-flush", "db-crash"]);
    }
  });
  it("is deterministic per seed and varies across seeds", () => {
    expect(newShift("same").order).toEqual(newShift("same").order);
    const orders = new Set(Array.from({ length: 30 }, (_, i) => newShift(`s${i}`).order.join()));
    expect(orders.size).toBeGreaterThanOrEqual(3);
    const a = startRound(newShift("same")), b = startRound(newShift("same"));
    expect([a.onsetAt, a.jitter, a.hypOrder]).toEqual([b.onsetAt, b.jitter, b.hypOrder]);
  });
  it("handles odd seeds", () => {
    for (const seed of ["", "🙂", 42, "y".repeat(500)]) {
      const s = newShift(seed);
      expect(s.order).toHaveLength(5);
      expect(new Set(s.order).size).toBe(5);
    }
  });
});

describe("shop", () => {
  it("charges, enforces max and budget", () => {
    const s = newShift("x");
    expect(buy(s, "monitoring")).toEqual({ ok: true });
    expect(s.budget).toBe(C.startBudget - C.shop.monitoring.cost);
    expect(buy(s, "monitoring").ok).toBe(false);          // max 1
    expect(buy(s, "app").ok).toBe(true);
    expect(s.owned.app).toBe(2);
    s.budget = 10;
    expect(buy(s, "firewall")).toEqual({ ok: false, reason: "not enough money" });
    expect(buy(s, "nope").ok).toBe(false);
  });
  it("caps app servers at maxServers", () => {
    const s = newShift("x"); s.budget = 1000;
    for (let i = 0; i < 6; i++) buy(s, "app");
    expect(s.owned.app).toBe(C.maxServers);
  });
});

describe("simulation", () => {
  it("a quiet round is 100% available before the incident", () => {
    const s = newShift("q"); const r = startRound(s);
    expect(preview(r).avail).toBe(1);
    expect(preview(r).onset).toBe(false);
  });
  it.each(RIGHT)("%s (round %i, owned %j) is fixed by %j within the fast window", (id, n, owned, fixes) => {
    const { r } = play(id, { n, owned, fixes });
    expect(r.snap.avail).toBeGreaterThanOrEqual(C.stableAvail);
    expect(r.mitigatedAt - r.onsetAt).toBeLessThanOrEqual(C.fastSeconds);
  });
  it.each(WRONG_CASES)("%s (round %i) is never fixed by any wrong action", (id, n, owned) => {
    const wrong = Object.keys(C.actions).filter((a) => !INCIDENTS[id].fixes.includes(a));
    for (const a of wrong) {
      const { r } = play(id, { n, owned, fixes: [a] });
      expect(r.mitigatedAt, `${id} + ${a}`).toBeNull();
    }
  });
  it("doing nothing leaves every incident unresolved", () => {
    for (const [id, n, owned] of WRONG_CASES) expect(play(id, { n, owned }).r.mitigatedAt, id).toBeNull();
  });
  it("a replica or extra servers can prevent an incident (prevention is valid)", () => {
    const { r } = play("spike", { n: 0, owned: { app: 2 } });
    expect(r.mitigatedAt).toBe(r.onsetAt);
  });
  it("restarting a healthy DB causes an outage; rollback with nothing wrong causes a blip", () => {
    const a = play("spike", { n: 0, owned: { app: 2 }, fixes: ["restart"] });
    expect(Math.min(...[a.r.availSum / a.r.availN])).toBeLessThan(1);
    expect(a.r.availSum / a.r.availN).toBeLessThan(0.99);
    const b = play("spike", { n: 0, owned: { app: 2 }, fixes: ["rollback"] });
    expect(b.r.availSum / b.r.availN).toBeLessThan(0.999);
  });
  it("preemptive fixes do not defuse a later incident", () => {
    const shift = newShift("p"); shift.order[1] = "cache-flush"; shift.round = 1;
    const r = startRound(shift);
    act(r, shift, "warm");
    while (!r.done) tick(r, shift);
    expect(r.mitigatedAt).toBeNull();
  });
  it("does nothing after the round is done", () => {
    const { r, shift } = play("bad-deploy", { n: 1, fixes: ["rollback"] });
    const b = shift.budget, snap = r.snap;
    expect(tick(r, shift)).toBe(snap);
    expect(shift.budget).toBe(b);
    expect(act(r, shift, "scale").ok).toBe(false);
  });
});

describe("actions and money", () => {
  it("locks actions that need gear and caps servers", () => {
    const s = newShift("l"); const r = startRound(s);
    expect(lockReason(r, "failover")).toBe("needs replica");
    expect(lockReason(r, "block")).toBe("needs firewall");
    expect(lockReason(r, "scale")).toBeNull();
    for (let i = 0; i < 3; i++) act(r, s, "scale");
    expect(lockReason(r, "scale")).toBe("max servers");
    expect(act(r, s, "failover")).toEqual({ ok: false, reason: "needs replica" });
  });
  it("never blocks an action on low budget; a negative budget lowers the grade", () => {
    const s = newShift("neg"); s.budget = 0; const r = startRound(s);
    expect(act(r, s, "scale").ok).toBe(true);
    expect(s.budget).toBe(-C.actions.scale.cost);
    const good = newShift("g"); good.results = Array(5).fill({ count: 3 });
    expect(gradeFor(good)).toBe("S");
    good.budget = -1;
    expect(gradeFor(good)).toBe("A");
  });
  it("failing over consumes the replica for the rest of the shift", () => {
    const { shift } = play("db-crash", { n: 2, owned: { replica: 1 }, fixes: ["failover"] });
    expect(shift.owned.replica).toBe(0);
  });
});

describe("diagnosis and stars", () => {
  it("awards the diagnosis star only for a correct diagnosis made before the first fix", () => {
    const right = play("bad-deploy", { n: 1, diag: "bad-release", fixes: ["rollback"] });
    expect(finishRound(right.r, right.shift).stars.diag).toBe(true);

    const wrong = play("bad-deploy", { n: 1, diag: "capacity", fixes: ["rollback"] });
    expect(finishRound(wrong.r, wrong.shift).stars.diag).toBe(false);

    const shift = newShift("late"); shift.order[1] = "bad-deploy"; shift.round = 1;
    const r = startRound(shift);
    while (!r.onset) tick(r, shift);
    act(r, shift, "rollback");
    diagnose(r, "bad-release");                          // too late
    while (!r.done) tick(r, shift);
    expect(finishRound(r, shift).stars.diag).toBe(false);
  });
  it("allows one diagnosis, and only after the incident starts", () => {
    const shift = newShift("d"); const r = startRound(shift);
    expect(diagnose(r, "capacity").ok).toBe(false);      // nothing to diagnose yet
    while (!r.onset) tick(r, shift);
    expect(diagnose(r, "capacity")).toEqual({ ok: true, correct: true });
    expect(diagnose(r, "network").ok).toBe(false);
  });
  it("finishRound advances the shift and records the result", () => {
    const { r, shift } = play("bad-deploy", { n: 1, diag: "bad-release", fixes: ["rollback"] });
    const res = finishRound(r, shift);
    expect(shift.round).toBe(2);
    expect(shift.results).toHaveLength(1);
    expect(res.count).toBe(+res.stars.avail + +res.stars.fast + +res.stars.diag);
    expect(shiftOver(shift)).toBe(false);
    shift.round = 5;
    expect(shiftOver(shift)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `rtk npx vitest run tests/crew-sim.test.mjs`
Expected: FAIL (`../crew/sim.js` not found).

- [ ] **Step 3: Implement `crew/sim.js`**

```js
// Pure, deterministic simulation. One tick = one second. No DOM.
import { CONFIG as C } from "./config.js";
import { INCIDENTS, MIDDLE } from "./incidents.js";
import { makeRng } from "./rng.js";

export function newShift(seed) {
  const rng = makeRng(`${seed}:order`);
  return {
    seed: String(seed),
    round: 0,
    budget: C.startBudget,
    owned: { app: 1, replica: 0, monitoring: 0, firewall: 0 },
    order: ["spike", ...rng.shuffle(MIDDLE), "bot-flood"],
    results: [],
  };
}

export function buy(shift, item) {
  const s = C.shop[item];
  if (!s) return { ok: false, reason: "unknown item" };
  if (shift.owned[item] >= s.max) return { ok: false, reason: "already have it" };
  if (shift.budget < s.cost) return { ok: false, reason: "not enough money" };
  shift.owned[item] += 1;
  shift.budget -= s.cost;
  return { ok: true };
}

export function startRound(shift) {
  const id = shift.order[shift.round];
  const rng = makeRng(`${shift.seed}:r${shift.round}`);
  const o = shift.owned;
  return {
    n: shift.round, id, t: 0, done: false, onset: false,
    onsetAt: Math.round(C.onsetBase + rng.range(-C.onsetJitter, C.onsetJitter)),
    jitter: rng.range(C.jitter[0], C.jitter[1]),
    hypOrder: rng.shuffle(INCIDENTS[id].hypotheses),
    base: C.baseRps[shift.round],
    baseServers: o.app,
    extra: [],                                     // ready-times of temporary servers
    has: { replica: o.replica > 0, monitoring: o.monitoring > 0, firewall: o.firewall > 0 },
    flags: { deployBad: false, rollbackAt: null, dbDown: false, dbBackAt: null, cacheCold: false, warmFrom: null, rateLimit: false, block: false },
    stable: 0, mitigatedAt: null, availSum: 0, availN: 0,
    seq: 0, diagnosis: null, diagSeq: null, firstFixSeq: null,
    earned: 0, spent: 0, snap: null,
  };
}

function onsetEffect(r) {
  const f = r.flags;
  if (r.id === "bad-deploy") { f.deployBad = true; f.rollbackAt = null; }
  if (r.id === "db-crash") { f.dbDown = true; f.dbBackAt = null; }
  if (r.id === "cache-flush") { f.cacheCold = true; f.warmFrom = null; }
}

function hitRatio(r, t) {
  const f = r.flags;
  if (!f.cacheCold) return C.cacheHit;
  if (f.warmFrom == null) return 0;
  return C.cacheHit * Math.min(1, (t - f.warmFrom) / C.warmSeconds);
}

const top = (reasons) => {
  let best = null, v = 0.5;
  for (const [k, x] of Object.entries(reasons)) if (x > v) { best = k; v = x; }
  return best;
};

// Pure computation of one second of traffic given the round's current flags.
function step(r, t) {
  const f = r.flags;
  const servers = r.baseServers + r.extra.filter((at) => at <= t).length;
  const appCap = servers * C.appCap;
  const g = r.base * r.jitter;
  const good = g * (r.onset && r.id === "spike" ? C.spikeMult : 1);
  const bad = r.onset && r.id === "bot-flood" ? g * C.floodMult : 0;
  const badIn = bad * (r.has.firewall ? (f.block ? C.blockPass : C.firewallPass) : 1);
  const incoming = good + badIn;
  const admitted = Math.min(incoming, f.rateLimit ? appCap * C.rateLimitCap : Infinity);
  const passApp = Math.min(admitted, appCap);
  const appFrac = incoming > 0 ? passApp / incoming : 1;
  const goodPass = good * appFrac * (f.deployBad ? 0.5 : 1);

  const hit = hitRatio(r, t);
  const herd = f.cacheCold ? 2 - hit / C.cacheHit : 1;
  const replica = r.has.replica;
  const dbDemand = goodPass * ((1 - C.readShare) + C.readShare * (1 - hit) * herd * (replica ? C.replicaShare : 1));
  const dbFrac = f.dbDown ? 0 : Math.min(1, C.dbCap / Math.max(dbDemand, 1e-9));
  const readDb = f.dbDown ? (replica ? 1 : 0) : dbFrac;
  const served = goodPass * (C.readShare * (hit + (1 - hit) * readDb) + (1 - C.readShare) * dbFrac);
  const avail = incoming > 0 ? served / incoming : 1;

  const reasons = {
    "rate-limit": incoming - admitted,
    "app-overload": admitted - passApp,
    "bad-deploy": f.deployBad ? good * appFrac * 0.5 : 0,
    [f.dbDown ? "db-down" : "db-overload"]: goodPass - served,
    attack: badIn,
  };
  return {
    served,
    snap: {
      t, onset: r.onset, servers, good, incoming, appCap, appLoad: admitted / appCap,
      dbLoad: f.dbDown ? null : dbDemand / C.dbCap, dbDown: f.dbDown, hit, avail, served,
      reasons, top: top(reasons), deployBad: f.deployBad, rateLimit: f.rateLimit, block: f.block, badIn, replica,
    },
  };
}

export const preview = (r) => step(r, r.t).snap;

export function tick(r, shift) {
  if (r.done) return r.snap;
  const f = r.flags;
  const t = ++r.t;
  if (!r.onset && t >= r.onsetAt) { r.onset = true; onsetEffect(r); }
  if (f.rollbackAt != null && t >= f.rollbackAt) { f.deployBad = false; f.rollbackAt = null; }
  if (f.dbDown && f.dbBackAt != null && t >= f.dbBackAt) { f.dbDown = false; f.dbBackAt = null; }

  const { snap, served } = step(r, t);
  shift.budget += served * C.income;
  r.earned += served * C.income;
  if (r.onset) {
    r.availSum += snap.avail;
    r.availN += 1;
    r.stable = snap.avail >= C.stableAvail ? r.stable + 1 : 0;
    if (r.mitigatedAt == null && snap.avail >= C.stableAvail) r.mitigatedAt = t;
  }
  if (r.stable >= C.stableSeconds || t >= C.roundSeconds) r.done = true;
  r.snap = snap;
  return snap;
}

export function lockReason(r, id) {
  const a = C.actions[id];
  if (!a) return "unknown action";
  if (a.needs && !r.has[a.needs]) return `needs ${a.needs}`;
  if (id === "scale" && r.baseServers + r.extra.length >= C.maxServers) return "max servers";
  return null;
}

export function act(r, shift, id) {
  if (r.done) return { ok: false, reason: "round is over" };
  const why = lockReason(r, id);
  if (why) return { ok: false, reason: why };
  const a = C.actions[id], f = r.flags, t = r.t;
  shift.budget -= a.cost;
  r.spent += a.cost;
  if (r.firstFixSeq == null) r.firstFixSeq = ++r.seq;
  if (id === "scale") r.extra.push(t + C.scaleDelay);
  if (id === "restart") { f.dbDown = true; f.dbBackAt = t + C.restartSeconds; }
  if (id === "failover") { f.dbDown = true; f.dbBackAt = t + C.failoverSeconds; r.has.replica = false; shift.owned.replica = 0; }
  if (id === "rollback") {
    if (f.deployBad) f.rollbackAt = t + C.rollbackSeconds;
    else { f.deployBad = true; f.rollbackAt = t + C.blipSeconds; }
  }
  if (id === "warm") f.warmFrom = t;
  if (id === "ratelimit") f.rateLimit = true;
  if (id === "block") f.block = true;
  return { ok: true, cost: a.cost };
}

export function diagnose(r, id) {
  if (r.done) return { ok: false, reason: "round is over" };
  if (!r.onset) return { ok: false, reason: "nothing to diagnose yet" };
  if (r.diagnosis) return { ok: false, reason: "already diagnosed" };
  r.diagnosis = id;
  r.diagSeq = ++r.seq;
  return { ok: true, correct: id === INCIDENTS[r.id].correct };
}

export function finishRound(r, shift) {
  const inc = INCIDENTS[r.id];
  const avg = r.availN ? r.availSum / r.availN : 1;
  const stars = {
    avail: avg >= C.starAvail,
    fast: r.mitigatedAt != null && r.mitigatedAt - r.onsetAt <= C.fastSeconds,
    diag: r.diagnosis === inc.correct && (r.firstFixSeq == null || r.diagSeq < r.firstFixSeq),
  };
  const res = {
    id: r.id, n: r.n, avg, stars, count: +stars.avail + +stars.fast + +stars.diag,
    earned: r.earned, spent: r.spent, diagnosis: r.diagnosis, mitigatedAt: r.mitigatedAt, onsetAt: r.onsetAt,
  };
  shift.results.push(res);
  shift.round += 1;
  return res;
}

export const shiftOver = (shift) => shift.round >= shift.order.length;

export function gradeFor(shift) {
  const stars = shift.results.reduce((n, x) => n + x.count, 0);
  let i = stars >= 14 ? 0 : stars >= 12 ? 1 : stars >= 10 ? 2 : stars >= 7 ? 3 : 4;
  if (shift.budget < 0) i = Math.min(4, i + 1);
  return "SABCD"[i];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `rtk npx vitest run tests/crew-sim.test.mjs`
Expected: PASS. If a `RIGHT`/`WRONG_CASES` assertion fails, it is a balance issue in `config.js` or a modelling bug — fix the cause (do not loosen the assertion), re-run. Known arithmetic (for debugging): spike at round 0 has `good` = 43–53 vs 40 capacity; cache-flush at round 1 demands ≈1.8× good traffic against `dbCap` 30; bot-flood with the firewall but no Block gives availability ≈ 0.77.

- [ ] **Step 5: Lint + checkpoint**

`rtk npx eslint crew tests/crew-sim.test.mjs` → clean.
```bash
rtk git add crew/sim.js tests/crew-sim.test.mjs
# commit only if authorised: "feat(crew): deterministic simulation with incidents, actions, scoring"
```

---

## Task 4: Simulated players and balance tuning

**Files:**
- Create: `tests/helpers/crew-bots.mjs`, `tests/crew-balance.test.mjs`
- Modify (only if tuning is needed): `crew/config.js`

**Interfaces:**
- Consumes: everything exported by `sim.js`, `INCIDENTS`, `CONFIG`, `makeRng`.
- Produces: `playShift(seed, policy) → shift`, policies `pro` and `masher`.

- [ ] **Step 1: Write the bots and the failing balance tests**

`tests/helpers/crew-bots.mjs`:
```js
import { CONFIG as C } from "../../crew/config.js";
import { INCIDENTS } from "../../crew/incidents.js";
import { makeRng } from "../../crew/rng.js";
import { act, buy, diagnose, finishRound, newShift, shiftOver, startRound, tick } from "../../crew/sim.js";

export function playShift(seed, policy) {
  const shift = newShift(seed);
  const rng = makeRng(`bot:${seed}`);
  while (!shiftOver(shift)) {
    policy.prep(shift, rng);
    const r = startRound(shift);
    while (!r.done) { tick(r, shift); policy.live(r, shift, rng); }
    finishRound(r, shift);
  }
  return shift;
}

const SHOP = Object.keys(C.shop);

// Reads the evidence: buys sensibly as budget allows, diagnoses correctly, applies the right fix.
export const pro = {
  prep(shift) { for (const item of ["monitoring", "firewall", "app", "replica"]) buy(shift, item); },
  live(r, shift) {
    if (!r.onset || r.proDone) return;
    r.proDone = true;
    diagnose(r, INCIDENTS[r.id].correct);
    const options = [...INCIDENTS[r.id].fixes, "ratelimit"];
    for (const f of options) if (act(r, shift, f).ok) break;
  },
};

// Taps things at random: random shop buys, random diagnosis and actions.
export const masher = {
  prep(shift, rng) { for (let i = 0; i < 2; i++) buy(shift, rng.pick(SHOP)); },
  live(r, shift, rng) {
    if (!r.onset || rng.next() > 0.08) return;
    if (rng.next() < 0.25) diagnose(r, rng.pick(r.hypOrder));
    else act(r, shift, rng.pick(Object.keys(C.actions)));
  },
};
```

`tests/crew-balance.test.mjs`:
```js
import { describe, expect, it } from "vitest";
import { gradeFor } from "../crew/sim.js";
import { masher, playShift, pro } from "./helpers/crew-bots.mjs";

const SEEDS = Array.from({ length: 200 }, (_, i) => `seed-${i}`);
const stars = (shift) => shift.results.reduce((n, x) => n + x.count, 0);

describe("balance", () => {
  it("a reasonable player reaches grade B or better on every seed", () => {
    for (const seed of SEEDS) expect("SAB", seed).toContain(gradeFor(playShift(seed, pro)));
  });
  it("a button masher averages under 2 stars on at least 2 incident types", () => {
    const sum = {}, n = {};
    for (const seed of SEEDS) for (const res of playShift(seed, masher).results) {
      sum[res.id] = (sum[res.id] || 0) + res.count;
      n[res.id] = (n[res.id] || 0) + 1;
    }
    const low = Object.keys(sum).filter((id) => sum[id] / n[id] < 2);
    expect(low.length, JSON.stringify(Object.fromEntries(Object.keys(sum).map((k) => [k, +(sum[k] / n[k]).toFixed(2)])))).toBeGreaterThanOrEqual(2);
  });
  it("the reasonable player clearly out-scores the masher", () => {
    let p = 0, m = 0;
    for (const seed of SEEDS) { p += stars(playShift(seed, pro)); m += stars(playShift(seed, masher)); }
    expect(p / SEEDS.length).toBeGreaterThan(m / SEEDS.length + 4);
  });
});
```

- [ ] **Step 2: Run**

Run: `rtk npx vitest run tests/crew-balance.test.mjs`
Expected: it may pass immediately or fail with a message that prints per-incident masher averages.

- [ ] **Step 3: Tune only `crew/config.js` until all three pass**

Allowed knobs and what they do:
- Masher too successful (too many incident types with mean ≥ 2): lower `fastSeconds` (e.g. 30 → 20), raise `starAvail` (0.9 → 0.93), lengthen `restartSeconds`, raise `ratelimit`/`scale` costs.
- Pro not reaching B: raise `income` or lower shop costs, or lower `startBudget` less aggressively; check `pro.prep` can afford `monitoring` + `firewall` by round 1.
- After any change re-run **both** `tests/crew-sim.test.mjs` and `tests/crew-balance.test.mjs`; the sim tests are the guard that fixes still fix.
Record the final changed constants in the checkpoint message. Do not edit the assertions.

- [ ] **Step 4: Run all crew tests**

Run: `rtk npx vitest run tests/crew-*.test.mjs`
Expected: PASS.

- [ ] **Step 5: Lint + checkpoint**

`rtk npx eslint crew tests` → clean.
```bash
rtk git add crew/config.js tests/helpers/crew-bots.mjs tests/crew-balance.test.mjs
# commit only if authorised: "test(crew): simulated players and balance tuning"
```

---

## Task 5: Page shell, styles, HUD, title and how-to screens, browser smoke harness

**Files:**
- Create: `crew/index.html`, `crew/style.css`, `crew/ui.js`, `crew/main.js`, `tests/browser/crew-smoke.mjs`, `crew/fonts/` (optional font)
- Interfaces produced: `ui.showScreen(name)`, `ui.renderHud({ budget, avail, label })`, `ui.bind(handlers)`, `ui.setMenu(open)`, `ui.setMuteLabel(muted)`. Screens present in the HTML: `title`, `howto`, `play`, `result`, `final`.

- [ ] **Step 1: Set up the browser test runner (once)**

```bash
SCRATCH=/tmp/claude-1000/-home-arnavbansal-CLD-Activity/a0ebd600-a6ff-4480-ab16-0d9f097f18aa/scratchpad
cd $SCRATCH && (ls node_modules/playwright-core >/dev/null 2>&1 || npm i playwright-core)
ls ~/.cache/ms-playwright | grep '^chromium-'      # note the highest number → CHROME path
```
Use these in every browser run:
```
export PW_CORE=$SCRATCH/node_modules/playwright-core/index.mjs
export CHROME=$HOME/.cache/ms-playwright/<chromium-NNNN>/chrome-linux64/chrome
```
Start the loopback server in a separate background shell (do not bind 0.0.0.0): `cd /home/arnavbansal/CLD/Activity/server-survival && python3 -m http.server 8766 --bind 127.0.0.1`.

- [ ] **Step 2: Write the smoke harness (fails until the page exists)**

`tests/browser/crew-smoke.mjs`:
```js
// Browser smoke/matrix for crew/. Not part of `npm test` (needs playwright-core + Chromium).
// Usage: PW_CORE=… CHROME=… node tests/browser/crew-smoke.mjs <baseUrl> <mode> <width> <height> [hostile]
//   mode: title | pro | wrong
import { INCIDENTS } from "../../crew/incidents.js";

const { chromium } = await import(process.env.PW_CORE);
const [base = "http://127.0.0.1:8766/crew/", mode = "title", w = "390", h = "844", hostile] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, hasTouch: true, reducedMotion: process.env.REDUCED ? "reduce" : "no-preference" });
if (hostile) {
  await ctx.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
    window.AudioContext = undefined; window.webkitAudioContext = undefined;
    navigator.vibrate = () => { throw new Error("no vibrate"); };
  });
}
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
const tag = `${mode}-${w}x${h}${hostile ? "-hostile" : ""}`;
const shot = (n) => page.screenshot({ path: `${process.env.SHOTS || "."}/${tag}-${n}.png` });

async function checkLayout(where) {
  const r = await page.evaluate(() => {
    const small = [...document.querySelectorAll("button, a.btn, [data-nav], [data-buy], [data-act], [data-hyp], [data-go]")]
      .filter((e) => e.offsetParent !== null || e.getClientRects().length)
      .map((e) => [e, e.getBoundingClientRect()])
      .filter(([e, b]) => b.width > 0 && b.height > 0 && (b.width < 47.5 || b.height < 47.5))
      .map(([e, b]) => `${e.tagName}.${e.className}[${e.dataset ? Object.values(e.dataset)[0] : ""}] ${Math.round(b.width)}x${Math.round(b.height)}`);
    return { overflow: document.documentElement.scrollWidth - innerWidth, small };
  });
  if (r.overflow > 0) problems.push(`${where}: horizontal overflow ${r.overflow}px`);
  for (const s of r.small) problems.push(`${where}: tap target too small: ${s}`);
}

await page.goto(`${base}?seed=t1&speed=8`);
await page.waitForSelector("#screen-title.is-active");
await checkLayout("title"); await shot("title");
await page.click("[data-nav=start]");
await page.waitForSelector("#screen-howto.is-active");
await checkLayout("howto");
await page.click("[data-nav=play]");
await page.waitForSelector("#screen-play.is-active");
await checkLayout("prep"); await shot("prep");

if (mode !== "title") {
  const results = [];
  for (let round = 0; round < 5; round++) {
    await page.waitForSelector("#sheet[data-phase=prep]");
    if (mode === "pro") {
      for (const item of ["monitoring", "firewall", "app", "replica"]) {
        const b = page.locator(`[data-buy=${item}]:not([disabled])`);
        if (await b.count()) await b.first().click();
      }
    }
    await page.click("[data-go=ready]");
    await page.waitForSelector("#banner:not([hidden])", { timeout: 30000 });
    const id = await page.getAttribute("#sheet", "data-incident");
    await checkLayout(`live-${id}`);
    if (round === 0) await shot("incident");
    if (mode === "pro") {
      await page.click("[data-go=diagnose]");
      await page.click(`[data-hyp=${INCIDENTS[id].correct}]`);
      for (const f of [...INCIDENTS[id].fixes, "ratelimit"]) {
        const b = page.locator(`[data-act=${f}]:not([disabled])`);
        if (await b.count()) { await b.first().click(); break; }
      }
    } else {
      await page.click("[data-act=restart]");
    }
    await page.waitForSelector("#screen-result.is-active", { timeout: 60000 });
    const stars = await page.locator("#result-stars [data-on='1']").count();
    results.push(`${id}:${stars}`);
    await checkLayout(`result-${id}`);
    if (round === 0) await shot("result");
    await page.click("[data-nav=next]");
  }
  await page.waitForSelector("#screen-final.is-active");
  await checkLayout("final"); await shot("final");
  console.log("rounds:", results.join(" "), "| grade:", (await page.textContent("#final-grade")).trim());
}
console.log(tag, problems.length ? `PROBLEMS:\n - ${problems.join("\n - ")}` : "OK");
await browser.close();
process.exit(problems.length ? 1 : 0);
```

- [ ] **Step 3: Write the page shell**

`crew/index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0b1230">
  <title>Cloud Crew: On-Call</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
<main id="app">
  <section id="screen-title" class="screen is-active">
    <div class="panel center">
      <div class="logo" aria-hidden="true">☁️</div>
      <h1>CLOUD <span>CREW</span></h1>
      <p class="tag">On-Call</p>
      <p class="lede">Your app is live. Things will break. Keep the crew calm.</p>
      <button class="btn go" data-nav="start">Start shift</button>
      <button class="btn ghost" data-nav="mute" id="btn-mute-title">🔊 Sound on</button>
    </div>
  </section>

  <section id="screen-howto" class="screen">
    <div class="panel">
      <h2>How a shift works</h2>
      <ol class="steps">
        <li><b>1</b><div><strong>Prep</strong>Spend your budget on servers and safety gear.</div></li>
        <li><b>2</b><div><strong>Incident</strong>Something breaks! Tap the crew to hear what's wrong.</div></li>
        <li><b>3</b><div><strong>Diagnose &amp; fix</strong>Name the cause, then pick a fix. Wrong fixes cost you.</div></li>
      </ol>
      <p class="lede small">5 rounds · about 10 minutes · earn up to 15 stars.</p>
      <button class="btn go" data-nav="play">Let's go</button>
    </div>
  </section>

  <section id="screen-play" class="screen">
    <header id="hud">
      <div class="pill gold" id="hud-budget">$120</div>
      <div id="hud-avail"><span id="hud-meter" class="meter"><i></i></span><b id="hud-avail-num">100%</b></div>
      <div class="pill" id="hud-round">Round 1/5</div>
      <button class="icon-btn" data-nav="menu" aria-label="Menu">☰</button>
    </header>
    <div id="stage">
      <svg id="scene" viewBox="0 0 360 400" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Your app's crew"></svg>
      <div id="bubble" hidden></div>
      <div id="ticker">All quiet…</div>
      <div id="coach" hidden></div>
      <div id="banner" hidden></div>
    </div>
    <div id="sheet" data-phase="prep">
      <div id="sheet-title"></div>
      <div id="sheet-body"></div>
      <div id="sheet-foot"></div>
    </div>
  </section>

  <section id="screen-result" class="screen">
    <div class="panel">
      <p class="kicker" id="result-kicker"></p>
      <h2 id="result-title"></h2>
      <ul id="result-stars" class="stars"></ul>
      <div id="result-body" class="story"></div>
      <p id="result-money" class="money"></p>
      <button class="btn go" data-nav="next">Next round</button>
    </div>
  </section>

  <section id="screen-final" class="screen">
    <div class="panel center">
      <p class="kicker">Shift complete</p>
      <div id="final-grade" class="grade">A</div>
      <p id="final-summary" class="lede small"></p>
      <ul id="final-rounds" class="rounds"></ul>
      <p class="seed">Seed <b id="final-seed"></b></p>
      <button class="btn go" data-nav="copy" id="btn-copy">Copy result</button>
      <button class="btn" data-nav="again">Play again</button>
      <a class="btn ghost" href="../">Try the 3D sandbox</a>
    </div>
  </section>

  <div id="menu" class="modal" hidden>
    <div class="panel center">
      <h2>Paused</h2>
      <button class="btn go" data-nav="resume">Resume</button>
      <button class="btn" data-nav="restart">Restart shift</button>
      <button class="btn ghost" data-nav="mute" id="btn-mute">🔊 Sound on</button>
      <button class="btn ghost" data-nav="home">Quit to title</button>
    </div>
  </div>
</main>
<script type="module" src="main.js"></script>
</body>
</html>
```

`crew/style.css`:
```css
:root {
  --bg: #0b1230; --bg2: #141c4a; --card: #1d2766; --ink: #f6f4ff; --mute: #9aa3d6;
  --gold: #ffc83d; --green: #3ddc84; --red: #ff4d5e; --blue: #4cc3ff; --line: #05081c;
  --font: "Fredoka", "Baloo 2", "Nunito", ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; height: 100%; overscroll-behavior: none; }
body {
  background: radial-gradient(circle at 20% 10%, #24308a55, transparent 45%), radial-gradient(circle at 80% 90%, #7a2f9a44, transparent 45%), var(--bg);
  color: var(--ink); font: 600 16px/1.35 var(--font); touch-action: manipulation; user-select: none; -webkit-user-select: none;
}
#app { position: fixed; inset: 0; display: flex; flex-direction: column; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); overflow: hidden; }
.screen { display: none; flex: 1; min-height: 0; flex-direction: column; overflow-y: auto; }
.screen.is-active { display: flex; }
#screen-play.is-active { overflow: hidden; }
h1, h2 { margin: 0; font-weight: 800; letter-spacing: .02em; }
h1 { font-size: 44px; line-height: 1; } h1 span { color: var(--gold); }
h2 { font-size: 26px; }
.tag { margin: 4px 0 0; color: var(--blue); font-weight: 800; letter-spacing: .3em; text-transform: uppercase; }
.lede { color: var(--mute); margin: 12px 0 18px; } .lede.small { font-size: 14px; margin: 8px 0 14px; }
.kicker { margin: 0 0 6px; color: var(--gold); font-weight: 800; letter-spacing: .12em; text-transform: uppercase; font-size: 13px; }
.panel { margin: auto; width: min(440px, 100%); padding: 22px 18px; }
.panel.center { text-align: center; }
.logo { font-size: 64px; filter: drop-shadow(0 6px 0 #0006); animation: bob 2.4s ease-in-out infinite; }
.steps { list-style: none; padding: 0; margin: 16px 0; display: grid; gap: 10px; }
.steps li { display: flex; gap: 12px; align-items: center; background: var(--card); border: 3px solid var(--line); border-radius: 18px; padding: 12px; }
.steps b { flex: none; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; background: var(--gold); color: var(--line); border: 3px solid var(--line); font-size: 18px; }
.steps strong { display: block; } .steps div { color: var(--mute); }
.steps strong { color: var(--ink); }

/* Buttons */
.btn, .icon-btn { font: 800 18px var(--font); color: var(--ink); background: var(--card); border: 3px solid var(--line); border-radius: 16px; min-height: 52px; padding: 10px 18px; box-shadow: 0 5px 0 var(--line); cursor: pointer; display: block; width: 100%; margin: 12px 0 0; text-align: center; text-decoration: none; line-height: 1.2; }
.btn:active, .icon-btn:active, .card:active:not([disabled]) { transform: translateY(4px); box-shadow: 0 1px 0 var(--line); }
.btn.go { background: var(--green); color: var(--line); }
.btn.alt { background: var(--blue); color: var(--line); }
.btn.ghost { background: transparent; box-shadow: none; border-color: #ffffff33; color: var(--mute); }
.btn[disabled], .card[disabled] { opacity: .45; pointer-events: none; }
.icon-btn { width: 52px; margin: 0; padding: 0; font-size: 22px; flex: none; }

/* HUD */
#hud { flex: none; display: flex; gap: 8px; align-items: center; padding: 8px 10px; }
.pill { background: var(--card); border: 3px solid var(--line); border-radius: 999px; padding: 6px 14px; font-weight: 800; white-space: nowrap; }
.pill.gold { background: var(--gold); color: var(--line); } .pill.gold.neg { background: var(--red); color: #fff; }
#hud-avail { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
.meter { flex: 1; height: 16px; background: var(--line); border-radius: 999px; overflow: hidden; border: 3px solid var(--line); }
.meter i { display: block; height: 100%; width: 100%; background: var(--green); transition: width .4s, background .4s; }
.meter i[data-level=warn] { background: var(--gold); } .meter i[data-level=bad] { background: var(--red); }
#hud-avail-num { min-width: 3.2ch; text-align: right; }

/* Stage */
#stage { position: relative; flex: 1 1 0; min-height: 180px; overflow: hidden; }
#scene { width: 100%; height: 100%; display: block; }
#ticker { position: absolute; left: 8px; right: 8px; bottom: 6px; background: #05081ccc; border-radius: 12px; padding: 6px 10px; font-size: 13px; text-align: center; color: var(--mute); pointer-events: none; }
#stage.alarm::after { content: ""; position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 60px 8px #ff4d5e99; animation: siren 1s ease-in-out infinite; }
#banner { position: absolute; left: 50%; top: 36%; transform: translate(-50%, -50%) rotate(-4deg); background: var(--red); border: 4px solid var(--line); border-radius: 16px; padding: 8px 22px; font-size: 38px; font-weight: 900; letter-spacing: .05em; box-shadow: 0 6px 0 var(--line); animation: slam .45s cubic-bezier(.2, 1.6, .4, 1); pointer-events: none; z-index: 5; }
#bubble { position: absolute; z-index: 4; background: #fff; color: var(--line); border: 3px solid var(--line); border-radius: 16px; padding: 8px 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 0 #0006; }
#bubble p { margin: 2px 0; }
.gauge { height: 12px; margin-top: 6px; border-radius: 999px; background: #d9dcf2; border: 2px solid var(--line); overflow: hidden; }
.gauge i { display: block; height: 100%; background: var(--green); } .gauge i.warn { background: var(--gold); } .gauge i.bad { background: var(--red); }
#coach { position: absolute; left: 10px; right: 10px; top: 8px; z-index: 6; background: var(--gold); color: var(--line); border: 3px solid var(--line); border-radius: 14px; padding: 8px 12px; font-size: 14px; font-weight: 800; box-shadow: 0 4px 0 var(--line); }

/* Sheet */
#sheet { flex: none; max-height: 48%; overflow-y: auto; background: var(--bg2); border-top: 4px solid var(--line); border-radius: 22px 22px 0 0; padding: 10px 12px 14px; -webkit-overflow-scrolling: touch; }
#sheet-title { font-weight: 800; color: var(--gold); letter-spacing: .06em; text-transform: uppercase; font-size: 13px; margin-bottom: 8px; }
#sheet-body { display: grid; grid-template-columns: 1fr; gap: 8px; }
#sheet-body.two { grid-template-columns: 1fr 1fr; }
.card { display: flex; align-items: center; gap: 10px; text-align: left; font: 700 15px var(--font); color: var(--ink); background: var(--card); border: 3px solid var(--line); border-radius: 16px; min-height: 60px; padding: 8px 12px; box-shadow: 0 4px 0 var(--line); cursor: pointer; width: 100%; }
.card .ic { font-size: 26px; flex: none; }
.card .tx { flex: 1; min-width: 0; } .card b { display: block; font-size: 16px; } .card small { display: block; color: var(--mute); font-weight: 600; font-size: 12px; }
.card .price { flex: none; background: var(--gold); color: var(--line); border-radius: 999px; padding: 2px 10px; font-size: 13px; font-weight: 800; }
.chip { background: var(--card); border: 3px solid var(--line); border-radius: 999px; padding: 6px 12px; margin-bottom: 8px; font-size: 14px; }
.chip.good { border-color: var(--green); } .chip.bad { border-color: var(--red); }

/* Result / final */
.stars { list-style: none; padding: 0; margin: 14px 0; display: grid; gap: 8px; }
.stars li { display: flex; align-items: center; gap: 10px; background: var(--card); border: 3px solid var(--line); border-radius: 14px; padding: 8px 12px; opacity: .5; }
.stars li[data-on="1"] { opacity: 1; border-color: var(--gold); }
.star { font-size: 28px; color: #4a5490; } li[data-on="1"] .star { color: var(--gold); animation: starpop .5s cubic-bezier(.2, 1.8, .4, 1) both; }
.story { background: #0004; border-radius: 14px; padding: 10px 14px; } .story p { margin: 6px 0; } .story b { display: block; color: var(--gold); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.money { color: var(--mute); font-size: 14px; }
.grade { font-size: 110px; font-weight: 900; line-height: 1; color: var(--gold); text-shadow: 0 6px 0 var(--line); animation: starpop .6s cubic-bezier(.2, 1.8, .4, 1) both; }
.rounds { list-style: none; padding: 0; margin: 10px 0; display: grid; gap: 6px; text-align: left; }
.rounds li { background: var(--card); border: 3px solid var(--line); border-radius: 12px; padding: 8px 12px; display: flex; justify-content: space-between; gap: 8px; font-size: 14px; }
.seed { color: var(--mute); font-size: 13px; }
.modal { position: fixed; inset: 0; background: #05081ccc; display: flex; z-index: 20; }
.modal[hidden] { display: none; }

/* Crew characters */
.cr { cursor: pointer; outline: none; }
.cr .b { fill: var(--c, #5b7cff); stroke: #05081c; stroke-width: 4; stroke-linejoin: round; }
.k-users { --c: #ffb648; } .k-firewall { --c: #ff6b6b; } .k-lb { --c: #b06bff; } .k-app { --c: #4cc3ff; } .k-cache { --c: #3ddc84; } .k-db { --c: #ffc83d; } .k-replica { --c: #ffc83d; }
.cr .c2 { opacity: .85; } .cr .top { filter: brightness(1.2); } .k-replica .b { stroke-dasharray: 6 4; }
.cr .ln { stroke: #05081c; stroke-width: 4; stroke-linecap: round; fill: none; }
.cr .bolt { fill: #fff59a; stroke: #05081c; stroke-width: 3; }
.cr .w { fill: #fff; stroke: #05081c; stroke-width: 2.5; } .cr .p { fill: #05081c; }
.cr .m, .cr .x, .cr .sp { fill: none; stroke: #05081c; stroke-width: 3.5; stroke-linecap: round; }
.cr .drop { fill: #7fe3ff; stroke: #05081c; stroke-width: 1.5; }
.cr .hit { fill: transparent; }
.cr .e, .cr .m { display: none; }
.cr[data-mood=happy] .e-happy, .cr[data-mood=happy] .m-happy,
.cr[data-mood=sweat] .e-sweat, .cr[data-mood=sweat] .m-sweat,
.cr[data-mood=dizzy] .e-dizzy, .cr[data-mood=dizzy] .m-dizzy,
.cr[data-mood=dead] .e-dead, .cr[data-mood=dead] .m-dead { display: inline; }
.cr .lbl { font: 800 11px var(--font); fill: #c8ceff; text-anchor: middle; paint-order: stroke; stroke: #05081c; stroke-width: 3px; }
.cr .idle { transform-box: fill-box; transform-origin: center; animation: bob 2.4s ease-in-out infinite; }
.cr[data-mood=sweat] .idle { animation: jig .5s ease-in-out infinite; } .cr[data-mood=dizzy] .idle { animation: jig .22s ease-in-out infinite; }
.cr[data-mood=dead] .idle { animation: none; } .cr[data-mood=dead] .sh { filter: grayscale(1) brightness(.6); }
.cr.off { opacity: .25; pointer-events: none; } .cr.off .idle { animation: none; }
.tube { fill: none; stroke: #27327a; stroke-width: 14; stroke-linecap: round; } .tube.core { stroke: #3a49a8; stroke-width: 6; }
.tubeg.off { display: none; }
.dot { fill: #7fe3ff; stroke: #05081c; stroke-width: 1.5; } .dot.bad { fill: #ff4d5e; }
.pop { font: 900 13px var(--font); fill: #ff4d5e; text-anchor: middle; paint-order: stroke; stroke: #05081c; stroke-width: 3px; animation: pop 1s ease-out forwards; pointer-events: none; }
.radar { font-size: 22px; }

/* Motion */
@keyframes bob { 50% { transform: translateY(-3px); } }
@keyframes jig { 25% { transform: translate(-1.5px, 0) rotate(-2deg); } 75% { transform: translate(1.5px, 0) rotate(2deg); } }
@keyframes siren { 50% { opacity: .35; } }
@keyframes slam { from { transform: translate(-50%, -50%) rotate(-4deg) scale(2.4); opacity: 0; } }
@keyframes starpop { from { transform: scale(0); } }
@keyframes pop { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-26px); } }
@keyframes shake { 20% { transform: translate(-6px, 3px); } 40% { transform: translate(5px, -3px); } 60% { transform: translate(-4px, 2px); } 80% { transform: translate(3px, -1px); } }
.shake { animation: shake .4s; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; } }

/* Landscape / desktop: stage left, sheet right */
@media (orientation: landscape) and (min-width: 560px) {
  #screen-play.is-active { display: grid; grid-template-columns: 1fr minmax(300px, 40%); grid-template-rows: auto 1fr; }
  #hud { grid-column: 1 / -1; }
  #sheet { max-height: none; border-radius: 22px 0 0 0; border-top: 0; border-left: 4px solid var(--line); }
  #stage { grid-row: 2; }
}
```

`crew/ui.js` (shell subset; grown in Task 7):
```js
const $ = (s) => document.querySelector(s);
const money = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n));

export function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("is-active", s.id === `screen-${name}`));
}

export function renderHud({ budget, avail, label }) {
  const b = $("#hud-budget");
  b.textContent = money(budget);
  b.classList.toggle("neg", budget < 0);
  $("#hud-avail-num").textContent = `${Math.round(avail * 100)}%`;
  const m = $("#hud-meter i");
  m.style.width = `${Math.round(avail * 100)}%`;
  m.dataset.level = avail >= 0.95 ? "ok" : avail >= 0.6 ? "warn" : "bad";
  $("#hud-round").textContent = label;
}

export function setMenu(open) { $("#menu").hidden = !open; }

export function setMuteLabel(muted) {
  for (const id of ["#btn-mute", "#btn-mute-title"]) $(id).textContent = muted ? "🔇 Sound off" : "🔊 Sound on";
}

// One delegated click listener. Handlers are keyed by the data-* attribute name
// (buy, act, go, hyp, nav). A 350 ms per-target guard swallows accidental double taps.
const KEYS = ["buy", "act", "go", "hyp", "nav"];
const lastAt = {};
export function bind(handlers) {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-buy],[data-act],[data-go],[data-hyp],[data-nav]");
    if (!t || t.disabled) return;
    const key = KEYS.find((k) => t.dataset[k] !== undefined);
    const stamp = `${key}:${t.dataset[key]}`;
    const now = performance.now();
    if (now - (lastAt[stamp] ?? -1e9) < 350) return;
    lastAt[stamp] = now;
    handlers[key]?.(t.dataset[key], t);
  });
}
```

`crew/main.js` (shell subset; grown in Task 7):
```js
import * as ui from "./ui.js";

ui.bind({
  nav: (id) => {
    if (id === "start") ui.showScreen("howto");
    if (id === "play") ui.showScreen("play");
    if (id === "menu") ui.setMenu(true);
    if (id === "resume") ui.setMenu(false);
    if (id === "home") { ui.setMenu(false); ui.showScreen("title"); }
  },
});
ui.renderHud({ budget: 120, avail: 1, label: "Round 1/5" });
```

- [ ] **Step 4 (optional): self-host the font**

```bash
cd /home/arnavbansal/CLD/Activity/server-survival && mkdir -p crew/fonts && python3 - <<'EOF'
import urllib.request
url="https://github.com/google/fonts/raw/main/ofl/fredoka/Fredoka%5Bwdth%2Cwght%5D.ttf"
try:
    urllib.request.urlretrieve(url,"crew/fonts/Fredoka.ttf"); print("font ok")
except Exception as e: print("font skipped:", e)
EOF
```
If it succeeded, prepend to `crew/style.css`:
```css
@font-face { font-family: "Fredoka"; src: url("fonts/Fredoka.ttf") format("truetype"); font-weight: 300 700; font-display: swap; }
```
If it failed, skip — the rounded system-font stack is the fallback (spec allows this). The font is OFL-licensed; keep the file as downloaded.

- [ ] **Step 5: Verify the shell in the browser**

```bash
cd /home/arnavbansal/CLD/Activity/server-survival
SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ title 360 640
SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ title 1280 800
```
Expected: `title-360x640 OK` and `title-1280x800 OK`. Read `$SCRATCH/title-360x640-title.png` and `-prep.png` to confirm the look (dark navy, chunky green button, no text clipping). Fix any reported tap-target or overflow problem in `style.css`.

- [ ] **Step 6: Lint + checkpoint**

`rtk npx eslint crew tests/browser` → clean.
```bash
rtk git add crew tests/browser
# commit only if authorised: "feat(crew): page shell, styles, smoke harness"
```

---

## Task 6: The crew scene (SVG characters, tubes, traffic)

**Files:**
- Create: `crew/scene.js`
- Modify: `crew/main.js` (temporary scene demo, removed in Task 7), `tests/browser/crew-smoke.mjs` (scene assertions)
- Interfaces produced: `createScene(svg, { onTap })` → `{ build(owned), update(snap, opts), el(key), burst(key, text) }`. Node keys: `users, firewall, lb, app0..app3, cache, db, replica`. `data-kind` is one of `users, firewall, lb, app, cache, db, replica`. Moods: `happy | sweat | dizzy | dead` (attribute `data-mood`).
- Consumes: sim `snap` fields `avail, appLoad, dbLoad, dbDown, hit, badIn, deployBad, onset, servers, good, top`.

- [ ] **Step 1: Add scene assertions to the smoke harness (fail first)**

In `tests/browser/crew-smoke.mjs`, after `await checkLayout("prep"); await shot("prep");` add:
```js
const kinds = await page.$$eval("#scene .cr", (n) => n.map((x) => x.dataset.key));
for (const k of ["users", "lb", "app0", "app3", "cache", "db", "replica", "firewall"]) if (!kinds.includes(k)) problems.push(`scene missing ${k}`);
const active = await page.$$eval("#scene .cr:not(.off)", (n) => n.length);
if (active < 5) problems.push(`scene has only ${active} active creatures`);
```
Run the title-mode smoke: expected FAIL ("scene missing …") because no scene exists yet.

- [ ] **Step 2: Implement `crew/scene.js`**

```js
// SVG scene: the crew as characters joined by tubes. No game logic here — it only draws a sim snapshot.
const NS = "http://www.w3.org/2000/svg";
const APP_X = [60, 140, 220, 300];
const AY = 244;
const POS = { users: [180, 40], firewall: [180, 96], lb: [180, 152], cache: [70, 344], db: [190, 344], replica: [300, 344] };
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
  const l = [{ id: "ul", d: "M180 64 V128" }];
  APP_X.forEach((x, i) => {
    l.push({ id: `la${i}`, d: `M180 176 C180 206 ${x} 190 ${x} ${AY - 30}`, app: i });
    l.push({ id: `ad${i}`, d: `M${x} ${AY + 30} C${x} 300 190 290 190 316`, app: i });
    l.push({ id: `ac${i}`, d: `M${x} ${AY + 30} C${x} 300 70 290 70 316`, app: i });
  });
  l.push({ id: "dr", d: "M216 344 H274" });
  return l;
})();

export function createScene(svg, { onTap }) {
  let nodes = {}, tubes = {}, dotsG, fxG;

  function creature(kind, key, x, y) {
    const g = mk("g", { class: `cr k-${kind}`, "data-kind": kind, "data-key": key, "data-mood": "happy", "data-x": x, "data-y": y, transform: `translate(${x} ${y})`, role: "button", tabindex: "0", "aria-label": LABEL[kind] });
    g.innerHTML = `<circle class="hit" r="34"/><g class="idle"><g class="sh">${BODY[kind]}</g><g transform="translate(0 ${FACE_Y[kind]})">${FACE}</g></g><text class="lbl" y="${kind === "users" ? 44 : 50}">${LABEL[kind]}</text>`;
    return g;
  }

  function applyServers(n) {
    for (let i = 0; i < 4; i++) nodes[`app${i}`]?.classList.toggle("off", i >= n);
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
      if (!on) g.classList.add("off");
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
    fxG.append(mk("text", { x: g.dataset.x, y: +g.dataset.y - 40, class: "pop" }, text));
    setTimeout(() => fxG.lastElementChild?.remove(), 1000);
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
    if (g) { e.preventDefault(); onTap(g.dataset.kind, g.dataset.key, g); }
  });

  return { build, update, el: (key) => nodes[key], burst };
}
```

- [ ] **Step 3: Temporary demo wiring in `crew/main.js`**

Replace `ui.showScreen("play")` handler line with a version that builds the scene, and add a debug moods preview:
```js
import { createScene } from "./scene.js";
import { newShift, startRound, preview } from "./sim.js";
const scene = createScene(document.querySelector("#scene"), { onTap: () => {} });
// TEMP (removed in Task 7): draw an idle scene on entering play.
function demo() { const s = newShift("demo"); scene.build(s.owned); scene.update(preview(startRound(s)), { quiet: true }); }
```
and in the `nav` handler: `if (id === "play") { ui.showScreen("play"); demo(); }`.

- [ ] **Step 4: Verify**

```bash
SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ title 360 640
SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ title 1280 800
```
Expected: OK for both. Then read `$SCRATCH/title-360x640-prep.png`: the 7 characters should be readable, evenly spaced, nothing overlapping, labels visible, the empty app slots (3) and unowned firewall/replica ghosted. If characters look cramped or overlap, adjust `POS`/`APP_X` in `scene.js` (not the sim) and re-shoot. To eyeball the mood faces, temporarily call `scene.update({ ...preview(...), avail: 0.4, appLoad: 1.3, dbLoad: null, dbDown: true, hit: 0 }, { quiet: true })` in the demo, screenshot, then remove.

- [ ] **Step 5: Lint + checkpoint**

`rtk npx eslint crew tests/browser` → clean.
```bash
rtk git add crew tests/browser
# commit only if authorised: "feat(crew): SVG crew scene"
```

---

## Task 7: Full game loop (prep, incident, diagnose, result, final)

**Files:**
- Modify: `crew/ui.js` (add render functions), `crew/main.js` (replace with the real controller)
- Interfaces produced (ui): `renderPrep(shift)`, `renderLive(round, diagnosing=false)`, `banner(text, ms=1400)`, `setAlarm(on)`, `setTicker(text)`, `showBubble(targetEl, clue)`, `hideBubble()`, `coach(text|null)`, `showResult(result, shift)`, `showFinal(shift, grade)`. Required DOM contracts (used by `crew-smoke.mjs`): `#sheet[data-phase=prep|live]`, `#sheet[data-incident=<id>]`, `[data-buy]`, `[data-go=ready|diagnose|cancel]`, `[data-act]`, `[data-hyp]`, `#banner`, `#result-stars li[data-on]`, `[data-nav=next]`, `#final-grade`.
- Consumes: sim + content APIs (Tasks 2–3), `scene` (Task 6).

- [ ] **Step 1: Extend `crew/ui.js`**

Add these imports at the top and functions below the existing exports (keep everything from Task 5):
```js
import { CONFIG as C } from "./config.js";
import { ACTION_UI, DEBRIEF, HYPOTHESES, SHOP_UI, STARS } from "./content.js";
import { INCIDENTS } from "./incidents.js";
import { lockReason, shiftOver } from "./sim.js";
```
```js
export function renderPrep(shift) {
  const sheet = $("#sheet");
  sheet.dataset.phase = "prep";
  delete sheet.dataset.incident;
  $("#sheet-title").textContent = `Round ${shift.round + 1} · Prep — spend wisely`;
  const body = $("#sheet-body");
  body.className = "";
  body.innerHTML = Object.entries(SHOP_UI).map(([id, u]) => {
    const s = C.shop[id], own = shift.owned[id];
    const maxed = own >= s.max, poor = shift.budget < s.cost;
    const tag = maxed ? "OWNED" : `$${s.cost}`;
    const count = id === "app" ? ` · ${own}/${s.max}` : "";
    return `<button class="card shop" data-buy="${id}" ${maxed || poor ? "disabled" : ""}><span class="ic">${u.icon}</span><span class="tx"><b>${u.name}${count}</b><small>${u.note}</small></span><span class="price">${tag}</span></button>`;
  }).join("");
  $("#sheet-foot").innerHTML = `<button class="btn go" data-go="ready">Ready — start the round</button>`;
}

export function renderLive(round, diagnosing = false) {
  const sheet = $("#sheet");
  sheet.dataset.phase = "live";
  sheet.dataset.incident = round.id;
  const body = $("#sheet-body"), foot = $("#sheet-foot");
  if (diagnosing) {
    $("#sheet-title").textContent = "What's really going on?";
    body.className = "";
    body.innerHTML = round.hypOrder.map((h) => `<button class="card" data-hyp="${h}"><span class="tx"><b>${HYPOTHESES[h]}</b></span></button>`).join("");
    foot.innerHTML = `<button class="btn ghost" data-go="cancel">Back</button>`;
    return;
  }
  $("#sheet-title").textContent = round.onset ? "Incident — act fast" : "Traffic is flowing…";
  let chip = "";
  if (round.diagnosis) {
    const ok = round.diagnosis === INCIDENTS[round.id].correct;
    chip = `<div class="chip ${ok ? "good" : "bad"}">${ok ? "✅" : "✖"} Diagnosis: ${HYPOTHESES[round.diagnosis]}</div>`;
  }
  body.className = "two";
  body.innerHTML = Object.keys(C.actions).map((id) => {
    const u = ACTION_UI[id], why = lockReason(round, id), cost = C.actions[id].cost;
    return `<button class="card act" data-act="${id}" ${why ? "disabled" : ""}><span class="ic">${u.icon}</span><span class="tx"><b>${u.name}</b><small>${why || u.note}</small></span><span class="price">${cost ? `$${cost}` : "free"}</span></button>`;
  }).join("");
  const canDiagnose = round.onset && !round.diagnosis;
  foot.innerHTML = chip + `<button class="btn alt" data-go="diagnose" ${canDiagnose ? "" : "disabled"}>🔍 Diagnose</button>`;
}

let bannerTimer, coachTimer;
export function banner(text, ms = 1400) {
  const b = $("#banner");
  b.textContent = text; b.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { b.hidden = true; }, ms);
}
export function setAlarm(on) { $("#stage").classList.toggle("alarm", on); }
export function setTicker(text) { $("#ticker").textContent = text; }
export function coach(text) {
  const c = $("#coach");
  clearTimeout(coachTimer);
  if (!text) { c.hidden = true; return; }
  c.textContent = text; c.hidden = false;
  coachTimer = setTimeout(() => { c.hidden = true; }, 6000);
}

export function hideBubble() { $("#bubble").hidden = true; }
export function showBubble(target, clue) {
  const b = $("#bubble"), stage = $("#stage").getBoundingClientRect(), r = target.getBoundingClientRect();
  const level = (v) => (v >= 1 ? "bad" : v >= 0.7 ? "warn" : "ok");
  b.innerHTML = clue.lines.map((l) => `<p>${l}</p>`).join("") +
    (clue.gauge ? `<div class="gauge" aria-label="${clue.gauge.label}"><i class="${clue.gauge.label === "Happy users" || clue.gauge.label === "Hit rate" ? (clue.gauge.value < 0.6 ? "bad" : clue.gauge.value < 0.95 ? "warn" : "ok") : level(clue.gauge.value)}" style="width:${Math.min(100, Math.round(clue.gauge.value * 100))}%"></i></div>` : "");
  b.hidden = false;
  const bw = Math.min(240, stage.width - 16);
  b.style.width = `${bw}px`;
  const cx = r.left + r.width / 2 - stage.left;
  b.style.left = `${Math.max(8, Math.min(stage.width - bw - 8, cx - bw / 2))}px`;
  const above = r.top - stage.top > b.offsetHeight + 12;
  b.style.top = `${above ? r.top - stage.top - b.offsetHeight - 6 : r.bottom - stage.top + 6}px`;
}

export function showResult(res, shift) {
  const d = DEBRIEF[res.id];
  $("#result-kicker").textContent = `Round ${res.n + 1} · ${d.title}`;
  $("#result-title").textContent = res.count === 3 ? "Flawless!" : res.count === 2 ? "Nice work!" : res.count === 1 ? "Rough one." : "That hurt.";
  $("#result-stars").innerHTML = STARS.map(([k, t]) => `<li data-on="${res.stars[k] ? 1 : 0}"><span class="star">★</span>${t}</li>`).join("");
  $("#result-body").innerHTML = `<p><b>What happened</b>${d.what}</p><p><b>What a pro does</b>${d.pro}</p>`;
  $("#result-money").textContent = `Earned ${money(res.earned)} · Spent on fixes ${money(res.spent)} · Budget ${money(shift.budget)}`;
  document.querySelector("#screen-result [data-nav=next]").textContent = shiftOver(shift) ? "See final grade" : "Next round";
  showScreen("result");
}

export function showFinal(shift, grade) {
  const stars = shift.results.reduce((n, x) => n + x.count, 0);
  $("#final-grade").textContent = grade;
  $("#final-summary").textContent = `${stars} of 15 stars · budget ${money(shift.budget)}${shift.budget < 0 ? " (in the red — costs a grade)" : ""}`;
  $("#final-rounds").innerHTML = shift.results.map((r) => `<li><span>${DEBRIEF[r.id].title}</span><span>${"★".repeat(r.count)}${"☆".repeat(3 - r.count)}</span></li>`).join("");
  $("#final-seed").textContent = shift.seed;
  showScreen("final");
}
```

- [ ] **Step 2: Replace `crew/main.js` with the real controller**

```js
import { CONFIG as C } from "./config.js";
import { clueFor, tickerLine } from "./content.js";
import { createScene } from "./scene.js";
import { act, buy, diagnose, finishRound, gradeFor, newShift, preview, shiftOver, startRound, tick } from "./sim.js";
import * as ui from "./ui.js";

const params = new URLSearchParams(location.search);
const seedParam = (params.get("seed") || "").trim();
const speed = Math.min(16, Math.max(1, Number(params.get("speed")) || 1));   // ?speed=8 for tests
const stageEl = document.querySelector("#stage");

let shift = null, round = null, timer = null, snap = null, bubbleKey = null;
const scene = createScene(document.querySelector("#scene"), { onTap });

const randomSeed = () => Math.random().toString(36).slice(2, 7);
const hudState = () => ({
  budget: shift.budget,
  avail: snap ? snap.avail : 1,
  label: round && timer ? `R${shift.round + 1}/5 · ${Math.floor(round.t / 60)}:${String(round.t % 60).padStart(2, "0")}` : `Round ${Math.min(shift.round + 1, 5)}/5`,
});
const stop = () => { clearInterval(timer); timer = null; };

function newRun() {
  stop();
  shift = newShift(seedParam || randomSeed());
  prep();
}

function prep() {
  stop();
  round = null; snap = null; bubbleKey = null;
  ui.showScreen("play");
  ui.hideBubble(); ui.setAlarm(false); ui.banner("", 0); ui.setTicker("All quiet…");
  scene.build(shift.owned);
  scene.update(preview(startRound(shift)), { quiet: true });   // idle look; a throwaway round
  ui.renderHud(hudState());
  ui.renderPrep(shift);
  ui.coach(shift.round === 0 ? "Spend your budget, then tap Ready. Servers add capacity; Monitoring shows exact numbers." : null);
}

function ready() {
  round = startRound(shift);
  snap = preview(round);
  ui.coach(null);
  ui.renderLive(round);
  ui.renderHud(hudState());
  timer = setInterval(step, 1000 / speed);
}

function step() {
  if (document.hidden) return;
  const wasOnset = round.onset;
  snap = tick(round, shift);
  scene.update(snap);
  ui.renderHud(hudState());
  ui.setTicker(tickerLine(snap, round.has.monitoring, round.id));
  if (!wasOnset && round.onset) {
    ui.banner("INCIDENT!");
    ui.renderLive(round);
    if (shift.round === 0) ui.coach("Tap a crew member to hear what they say. Then hit Diagnose.");
  }
  ui.setAlarm(round.onset && snap.avail < C.stableAvail);
  if (bubbleKey) refreshBubble();
  if (round.done) end();
}

function end() {
  stop();
  ui.setAlarm(false);
  const res = finishRound(round, shift);
  setTimeout(() => ui.showResult(res, shift), 700);
}

function refreshBubble() {
  const g = scene.el(bubbleKey);
  if (g) ui.showBubble(g, clueFor(g.dataset.kind, snap, round.has.monitoring));
}

function onTap(kind, key) {
  if (!round || !timer || !kind) { bubbleKey = null; ui.hideBubble(); return; }
  bubbleKey = bubbleKey === key ? null : key;
  if (bubbleKey) { refreshBubble(); if (shift.round === 0) ui.coach("Good. Now open the fixes below — but pick the cause first (Diagnose)."); }
  else ui.hideBubble();
}

async function copyResult() {
  const stars = shift.results.reduce((n, x) => n + x.count, 0);
  const text = `Cloud Crew: On-Call · grade ${gradeFor(shift)} · ${stars}/15★ · seed ${shift.seed} · ${location.origin}${location.pathname}?seed=${encodeURIComponent(shift.seed)}`;
  try { await navigator.clipboard.writeText(text); document.querySelector("#btn-copy").textContent = "Copied!"; }
  catch { document.querySelector("#btn-copy").textContent = text; }
}

ui.bind({
  nav: (id) => {
    if (id === "start") ui.showScreen("howto");
    if (id === "play") newRun();
    if (id === "menu") ui.setMenu(true);
    if (id === "resume") ui.setMenu(false);
    if (id === "restart") { ui.setMenu(false); newRun(); }
    if (id === "home") { stop(); ui.setMenu(false); ui.showScreen("title"); }
    if (id === "next") { if (shiftOver(shift)) ui.showFinal(shift, gradeFor(shift)); else prep(); }
    if (id === "again") newRun();
    if (id === "copy") copyResult();
  },
  buy: (item) => {
    if (!buy(shift, item).ok) return;
    scene.build(shift.owned);
    scene.update(preview(startRound(shift)), { quiet: true });
    ui.renderHud(hudState());
    ui.renderPrep(shift);
  },
  go: (id) => {
    if (id === "ready") ready();
    if (id === "diagnose") ui.renderLive(round, true);
    if (id === "cancel") ui.renderLive(round);
  },
  hyp: (id) => {
    diagnose(round, id);
    ui.renderLive(round);
  },
  act: (id) => {
    if (!round || round.done) return;
    act(round, shift, id);
    ui.renderLive(round);
    ui.renderHud(hudState());
  },
});
```

- [ ] **Step 3: Verify the loop (browser)**

```bash
cd /home/arnavbansal/CLD/Activity/server-survival
SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ pro 390 844
SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ wrong 390 844
```
Expected: both print `rounds: …` and `OK`. `pro` should show mostly 3-star rounds and grade S/A/B; `wrong` (restart DB every round) low stars and grade C/D. Read `$SCRATCH/pro-390x844-incident.png` and `-result.png`; confirm the incident banner, faces, bottom-sheet cards and star result look like a game. Fix layout issues found (CSS only).

- [ ] **Step 4: Manual behaviour checks via a scripted Playwright one-off (double tap and refresh)**

Create `$SCRATCH/dbl.mjs`:
```js
const { chromium } = await import(process.env.PW_CORE);
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
await p.goto("http://127.0.0.1:8766/crew/?seed=t1&speed=1");
await p.click("[data-nav=start]"); await p.click("[data-nav=play]");
const money = async () => (await p.textContent("#hud-budget")).trim();
const m0 = await money();
await p.dblclick("[data-buy=monitoring]");            // two rapid taps
console.log("budget", m0, "->", await money(), "(expected one purchase: $120 -> $90)");
await p.click("[data-go=ready]");
await p.waitForTimeout(200);
await p.reload();                                       // refresh mid-round
await p.waitForSelector("#screen-title.is-active");
console.log("after reload: title screen shown, budget resets:", await money());
await b.close();
```
Run: `rtk node $SCRATCH/dbl.mjs` — Expected: `budget $120 -> $90` and the title screen after reload.

- [ ] **Step 5: Full lint + tests + checkpoint**

Run: `rtk npm run check` → clean and all green.
```bash
rtk git add crew tests
# commit only if authorised: "feat(crew): full round loop, diagnose, results, final grade"
```

---

## Task 7b: Restyle to the Isometric Datacenter look (owner-chosen, added after Task 7)

Not in the original plan: the owner reviewed the running game and the four demos and chose option C (isometric). Spec §7 was amended accordingly. Brief lives at `.superpowers/sdd/2026-09-30-cloud-crew-on-call/task-7b-brief.md` (controller-written; the text there is the requirement). Files: `crew/scene.js` (internals rewritten, API and node keys unchanged), `crew/style.css`, `crew/index.html`, `crew/ui.js`, `crew/content.js` (clue wording), remove `crew/fonts/Fredoka.ttf` and its `@font-face`. Verification: crew-smoke (pro/wrong at 360×640, 390×844, 1280×800), crew-menu, `npm run check`.

---

## Task 8: Sound, haptics, shake, coins (all failure-safe)

**Files:**
- Create: `crew/fx.js`
- Modify: `crew/main.js`, `crew/ui.js` (`setMuteLabel` already exists)
- Interfaces produced: `unlock()`, `sfx(name)`, `haptic(pattern)`, `shake(el)`, `flyCoin(fromEl, toEl)`, `isMuted()`, `setMuted(bool)`, `reducedMotion`. Sfx names: `tap, buy, deny, alarm, good, bad, star, win`.

- [ ] **Step 1: Confirm the hostile-environment smoke passes before adding fx (baseline)**

Run: `SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ pro 390 844 hostile`
Expected: `OK` (blocked `localStorage`, no `AudioContext`, throwing `vibrate` — nothing uses them yet). This is the guard that must still pass after this task.

- [ ] **Step 2: Implement `crew/fx.js`**

```js
// Optional sensory feedback. Every call is best-effort: a failure here must never break play.
export const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

let muted = false;
try { muted = localStorage.getItem("crew.muted") === "1"; } catch {}
let ac = null;

export const isMuted = () => muted;
export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem("crew.muted", muted ? "1" : "0"); } catch {}
}

// Browsers only allow audio after a user gesture.
export function unlock() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac ||= new AC();
    ac.resume?.();
  } catch {}
}

const TONES = {
  tap: [[520, 0.05]],
  buy: [[520, 0.06], [780, 0.09]],
  deny: [[200, 0.12]],
  alarm: [[440, 0.15], [330, 0.15], [440, 0.15], [330, 0.15]],
  good: [[660, 0.08], [880, 0.12]],
  bad: [[300, 0.1], [200, 0.18]],
  star: [[784, 0.08], [988, 0.08], [1175, 0.14]],
  win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]],
};

export function sfx(name) {
  if (muted || !ac) return;
  try {
    let t = ac.currentTime;
    for (const [freq, dur] of TONES[name] || []) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "square"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t); o.stop(t + dur);
      t += dur;
    }
  } catch {}
}

export function haptic(pattern) {
  if (muted) return;
  try { navigator.vibrate?.(pattern); } catch {}
}

export function shake(el) {
  if (reducedMotion || !el) return;
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
}

// A coin flies from a node to the budget pill.
export function flyCoin(fromEl, toEl) {
  if (reducedMotion || !fromEl || !toEl || !fromEl.getBoundingClientRect) return;
  try {
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    const c = document.createElement("div");
    c.textContent = "🪙";
    c.style.cssText = `position:fixed;left:${a.left + a.width / 2 - 10}px;top:${a.top + a.height / 2 - 10}px;font-size:20px;z-index:9;pointer-events:none`;
    document.body.append(c);
    const anim = c.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(.6)`, opacity: 0.2 }], { duration: 650, easing: "ease-in" });
    anim.onfinish = () => c.remove();
  } catch {}
}
```

- [ ] **Step 3: Wire fx into `crew/main.js`**

Add `import * as fx from "./fx.js";` and:
- After `ui.bind(...)`: `document.addEventListener("pointerdown", fx.unlock, { once: true }); ui.setMuteLabel(fx.isMuted());`
- In the `nav` handler add: `if (id === "mute") { fx.setMuted(!fx.isMuted()); ui.setMuteLabel(fx.isMuted()); }` and at its top `fx.sfx("tap");`
- In `buy`: `const r = buy(shift, item); fx.sfx(r.ok ? "buy" : "deny"); if (!r.ok) return;`
- In `step()`, on onset: `fx.sfx("alarm"); fx.haptic([120, 60, 120]); fx.shake(stageEl);`; after computing `snap`: `if (snap.served > 0.5 && !(round.t % 2)) fx.flyCoin(scene.el("lb"), document.querySelector("#hud-budget"));`
- In `hyp`: `const r = diagnose(round, id); fx.sfx(r.correct ? "good" : "bad");`
- In `act`: `const r = act(...); fx.sfx(r.ok ? "buy" : "deny");`
- In `end()` inside the timeout: `fx.sfx(res.count >= 2 ? "star" : "bad"); fx.haptic(res.count >= 2 ? 30 : [80, 40, 80]);` and in the `next`-to-final branch: `fx.sfx("win")`.
Also replace the earlier `act: (id) => {…}` body to use `r`. Keep all fx calls outside of any code path whose failure would abort game logic (the fx functions already swallow errors).

- [ ] **Step 4: Verify (normal + hostile + reduced motion)**

```bash
SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ pro 390 844
SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ pro 390 844 hostile
REDUCED=1 SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ pro 390 844
```
Expected: all `OK`; the hostile run proves the game plays with blocked storage, no audio and a throwing `vibrate`.

- [ ] **Step 5: Lint + checkpoint**

`rtk npm run check` → green.
```bash
rtk git add crew
# commit only if authorised: "feat(crew): audio, haptics, shake, coin feedback"
```

---

## Task 9: Verification matrix, documentation, final check

**Files:**
- Create: `crew/AGENTS.md`, `docs/context/STATUS.md`, `docs/context/PHONE_CHECKLIST.md`
- Modify: `README.md` (new top section), `AGENTS.md` (create at repo root; short pointer)

- [ ] **Step 1: Run the full device matrix**

For each size run the `pro` mode, and `wrong` on the two phone sizes:
```bash
cd /home/arnavbansal/CLD/Activity/server-survival
for s in "320 568" "360 640" "390 844" "768 1024" "1024 768" "1280 800" "667 375"; do
  set -- $s; SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ pro $1 $2
done
for s in "360 640" "390 844"; do set -- $s; SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ wrong $1 $2; done
REDUCED=1 SHOTS=$SCRATCH rtk node tests/browser/crew-smoke.mjs http://127.0.0.1:8766/crew/ pro 360 640
```
Expected: every line `OK`. `667×375` is phone landscape (uses the two-column layout). Fix any reported overflow / small tap target in `style.css` and re-run the failing size, then the whole matrix once more.

- [ ] **Step 2: Look at the screenshots**

Read at least: `pro-360x640-incident.png`, `pro-360x640-result.png`, `pro-360x640-final.png`, `pro-667x375-incident.png`, `pro-1280x800-incident.png`. Confirm: characters legible, sheet doesn't hide the scene, landscape shows stage left / sheet right, no clipped text. Fix defects you see (CSS/layout only).

- [ ] **Step 3: Write the docs**

`crew/AGENTS.md`:
```markdown
# crew/ — Cloud Crew: On-Call

Phone-first 2D classroom game. Spec: `../docs/superpowers/specs/2026-09-30-cloud-crew-on-call-design.md`. Plan: `../docs/superpowers/plans/2026-09-30-cloud-crew-on-call.md`.

- `sim.js` is pure and deterministic (no DOM). All numbers live in `config.js`; incident data in `incidents.js`; all player-facing text in `content.js`.
- `scene.js` only draws a sim snapshot. `ui.js` renders DOM and owns click delegation (`data-buy|act|go|hyp|nav`, 350 ms double-tap guard). `main.js` is the round state machine. `fx.js` is best-effort and must never throw into game code.
- Change balance in `config.js` only, then run `npx vitest run tests/crew-*.test.mjs` (the balance test is the guard).
- Browser matrix: `tests/browser/crew-smoke.mjs` (needs playwright-core + Chromium; see the plan, Task 5).
- No CDN, no build, no dependencies. Keep it that way.
```

`AGENTS.md` (repo root):
```markdown
# Cloud Crew — agent entry point

The classroom game lives in `crew/` (read `crew/AGENTS.md`). The rest of the repo is the upstream MIT-licensed Server Survival 3D game, unchanged; keep `LICENSE` and copyright notices.
Do not commit or push without an explicit instruction from the owner.
```

`docs/context/PHONE_CHECKLIST.md`:
```markdown
# Real-phone checklist (manual)

Open `…/crew/` on a physical phone, portrait then landscape.
- [ ] Title → How-to → first Prep shows without zooming or side-scrolling.
- [ ] Every button is easy to hit with a thumb; double-tapping a shop card buys once.
- [ ] Round 1: tap "Ready", the INCIDENT banner appears, tapping a character opens a speech bubble that stays on screen.
- [ ] Diagnose → pick a cause → pick a fix; the result screen shows stars.
- [ ] Sound plays after the first tap; mute works; phone vibrates on the incident (if supported).
- [ ] Rotate to landscape mid-round: nothing breaks, sheet moves to the right.
- [ ] Finish all 5 rounds: final grade, "Copy result" works, "Play again" starts a fresh shift.
- [ ] Airplane mode after loading: the game still works (no network needed).
Note the phone model, browser and anything odd.
```

`docs/context/STATUS.md`:
```markdown
# Status — Cloud Crew: On-Call

Implemented locally per the plan; see `crew/`. Verified: `npm run check`, balance tests, browser matrix (320–1280 px, landscape, hostile environment, reduced motion). Not yet verified: a physical phone (use `PHONE_CHECKLIST.md`).
Not published. Publishing = commit + push to the classroom GitHub repo (Pages from `main` root); the game URL is `https://helixo613.github.io/cloud-incident-challenge/crew/`. Only on the owner's explicit instruction.
```

`README.md`: replace the top classroom section with a short section, keeping the upstream text below it:
```markdown
# Cloud Crew: On-Call (classroom game)

A phone-first 2D game where you keep a small cloud app alive through five incidents: spend a budget, read the evidence, diagnose the cause, pick a fix. **Play:** open [`crew/`](crew/) (published at `https://helixo613.github.io/cloud-incident-challenge/crew/`). One shift is about 10 minutes; each browser tab is an independent run. Add `?seed=abc` so a whole class plays the same shift and compares grades. No accounts, no backend, no CDN, works offline once loaded.

Facilitator (2 min): "You're the on-call crew for a small app. Each round something breaks — tap your crew to hear what they see, name the cause, then choose a fix. Wrong fixes cost you money and uptime. Compare grades at the end." Debrief questions: Which incident looked like overload but wasn't? What did Monitoring change? Which prep purchase paid off? What would a replica or firewall have prevented?

Run locally: `python3 -m http.server 8000 --bind 127.0.0.1`, open `http://localhost:8000/crew/`. Contributors: `npm ci && npm run check`.

The original 3D **Server Survival** game (below) remains at the repo root.

---
```
(Then the upstream README content follows unchanged.)

- [ ] **Step 4: Final full check and diff hygiene**

```bash
rtk npm run check
rtk git diff --check
rtk git status --short
```
Expected: ESLint clean, all tests pass (upstream baseline from Task 1 plus the new `tests/crew-*.test.mjs`), no whitespace errors, only intended files changed. The `readme-claims` test must still pass with the new README top; if it fails, adjust only the new section's wording (do not weaken the test).

- [ ] **Step 5: Leave the preview running and hand back**

Ensure `python3 -m http.server 8766 --bind 127.0.0.1` is running, give the owner `http://localhost:8766/crew/`, and state clearly: verified headlessly on the matrix above; real-phone check is the owner's (`docs/context/PHONE_CHECKLIST.md`); nothing committed or pushed unless authorised.

```bash
rtk git add -A crew docs AGENTS.md README.md tests
# commit only if authorised: "feat(crew): docs, phone checklist, verified device matrix"
```

---

## Self-review notes (already applied)

- **Spec coverage:** §3 structure/shop/budget → Tasks 2–3, 7; §4 sim/actions → Task 3; §5 incidents/diagnosis/stars → Tasks 2–3; §6 evidence/bubbles → Tasks 2 (`clueFor`), 6–7; §7 look & feel → Tasks 5–8; §8 architecture + retiring old layer → Tasks 1, 5–9; §9 testing → Tasks 3, 4, 5, 9; §10 risks (balance, fallbacks, deletion guard) → Tasks 1, 4, 8.
- **Amendments recorded in the spec:** built-in cache (no Cache shop item), `dbCap` 30 with herd factor, `spikeMult` 2.4, `startBudget` 120, `income` 0.03, "fewer than 2 stars" definition of failure.
- **Names cross-checked:** `newShift/buy/startRound/preview/tick/act/diagnose/lockReason/finishRound/shiftOver/gradeFor` (sim), `createScene → build/update/el/burst` (scene), `renderPrep/renderLive/showResult/showFinal/bind/...` (ui), DOM contracts used by `crew-smoke.mjs` (`#sheet[data-phase|data-incident]`, `data-buy|act|go|hyp|nav`, `#banner`, `#result-stars li[data-on]`, `#final-grade`).
- **Known execution risks flagged inline:** balance constants may need one tuning pass (Task 4); the Fredoka download may fail (optional, fallback stack exists); the README-claims test may need the new README top adjusted (Task 9).
