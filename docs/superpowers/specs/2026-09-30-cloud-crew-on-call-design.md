# Cloud Crew: On-Call — game design

Date: 2026-09-30 · Status: draft for review · Replaces the "Cloud Incident Challenge" classroom overlay.

## 1. Why

The current classroom mode is a scripted checklist (connect → place Monitoring → inspect → restore) drawn over a 3D board. Players click highlighted buttons and finish; nothing is decided, the 3D scene is hard to read and hard to tap, the panels look like a presentation, and it is desktop-first. User feedback: "does not look viable", "not understandable, not good looking", "just clicking buttons", "not optimized for phones".

## 2. Goal and success criteria

A phone-first 2D game where beginners in a Cloud/DevOps class **diagnose incidents and make trade-offs**, then learn from a debrief.

- 10–12 min class activity: 1 min intro, one ~9 min shift, 2 min debrief. Everyone opens one URL; each tab is an independent run.
- **Success:**
  1. The game never says which fix to pick; a player who mashes buttons earns fewer than 2 stars on at least 2 of the 5 incident types (verified by simulated strategies, see §9).
  2. A player who reads the evidence and buys sensibly finishes with grade B or better (same verification).
  3. Playable and comfortable at 360×640 portrait: all targets ≥ 48 px, no horizontal scroll, no console errors.
  4. Zero external network dependencies at runtime (no CDN, no remote fonts/audio).
  5. Looks like a game, not a dashboard (§7).

**Non-goals:** multiplayer, accounts, backend, 3D, translations, changes to the upstream Server Survival game beyond removing the classroom layer, real cloud pricing accuracy.

## 3. Game structure

A **shift** = 5 rounds. Each round = Prep → Incident → Result.

- **Prep (untimed, ~30 s typical):** spend budget in the shop. Tap **Ready** to start the round.
- **Incident (75 s max):** traffic runs live. The incident starts 5 s (±3 s by seed) after Ready. The player investigates (tap creatures for clues), may make a **diagnosis**, and applies **fix actions**. The round ends early when availability stays ≥ 95 % for 10 consecutive seconds after onset, or at 75 s.
- **Result:** ★ ratings, money earned, and a card: *what happened / what a pro does / what you did*.
- **Shift end:** grade (S/A/B/C/D), per-incident debrief, the seed, and a "copy result" button (text with seed and grade so classmates can compare). Optional link to the upstream 3D sandbox.

No upkeep costs. Money only goes down when the player buys or acts and up when requests succeed. (Unexplained budget drain was a prior complaint.)

### Budget and shop
Start budget $120. Income per served request $0.03. Shop purchases persist across rounds. Every app starts with a cache (hit ratio 0.6), so the cache is not a shop item.

| Item | Cost | Max | Effect |
|---|---|---|---|
| App server | $40 | 4 total (starts with 1) | +40 rps app capacity each |
| DB replica | $80 | 1 | Takes 50 % of reads; can be failed-over to |
| Monitoring | $30 | 1 | Unlocks precise clues (§6) and the radar badge |
| Firewall | $40 | 1 | Drops 90 % of malicious traffic |

All numbers live in one `config` object and are tunable (see §9 balance tests).

## 4. Simulation (pure module `sim.js`)

Fixed tick `dt = 1 s`, deterministic given a seed. State per tick:

- `rps_good` = round base traffic (rounds 1–5: 20, 24, 28, 32, 36 rps) × seed jitter (0.9–1.1) × incident multiplier.
- `rps_bad` = malicious traffic (0 except bot flood: 3× `rps_good`).
- Firewall: `bad_passed = rps_bad × (firewall ? 0.1 : 1)`.
- `incoming = rps_good + bad_passed`. LB capacity 200 rps (never the bottleneck by design).
- App: `cap_app = servers × 40`; requests that pass = `min(incoming, cap_app)`. If a bad deploy is active, **50 %** of app responses fail regardless of load.
- Reads are 80 % of good traffic. `hit` = 0.6 normally. A cache flush sets `hit = 0`; it recovers linearly to 0.6 over 20 s only after the *warm cache* action (otherwise stays 0 for the round). While the cache is cold each read that misses costs up to 2 DB units (thundering herd): `herd = 2 − hit/0.6`, decaying to 1 as the cache warms.
- DB load = writes + reads × (1 − hit) × (replica ? 0.5 : 1). DB capacity 30 rps (with the built-in cache, normal DB load is about 0.5× the good traffic). If DB is down, every request that needs it fails (reads that hit a live replica during failover still succeed).
- `served` = requests completing all stages; `availability` = served / attempted (bad traffic counts as attempted, blocked bad traffic does not).
- Node load = demand / capacity. Mood: < 0.7 happy, 0.7–1.0 sweating, ≥ 1.0 dizzy, down → X eyes.
- Failed request records a **reason** (`app-overload`, `bad-deploy`, `db-down`, `db-overload`, `blocked`) used by the scene and the debrief.

### Actions (bottom sheet during Incident)

| Action | Cost | Effect / delay | Correct for |
|---|---|---|---|
| Scale up app (+1 temporary server for this round, 4 total max) | $30 | +40 rps, ready in 5 s | Spike |
| Restart DB | $0 | DB down for 20 s, then healthy | DB crash (no replica) |
| Fail over to replica (needs replica) | $0 | DB crash mitigated in 2 s | DB crash |
| Roll back deploy | $0 | Removes bad deploy in 3 s | Bad deploy |
| Warm cache | $20 | Hit ratio recovers over 20 s | Cache flush |
| Rate-limit | $15 | Caps `incoming` at 80 % of app capacity; good traffic dropped proportionally | Cache flush (partial), bot flood (partial) |
| Block bad traffic (needs firewall) | $0 | Firewall drops 99 % of malicious | Bot flood |

Actions are never blocked by low budget: the cost is charged and the budget may go negative (a negative final budget lowers the grade). Incident recovery must always be possible.

Unavailable actions show as locked cards with the reason ("needs a replica"). **Wrong actions have real side effects**: Restart DB on a healthy DB causes its 20 s outage; scaling during a bad deploy spends money with no effect; rate-limit costs good traffic.

## 5. Incidents (data in `incidents.js`)

| # | Id | Trigger | Symptoms | Correct diagnosis | Tempting wrong |
|---|---|---|---|---|---|
| 1 | `spike` | `rps_good` ×2.4 | App dizzy, DB fine, errors `app-overload` | "Not enough app capacity" | DB is slow |
| 2 | `bad-deploy` | 50 % app failures | Errors up, **load normal**, log shows new release | "Bad release" | Add servers |
| 3 | `db-crash` | DB down | DB X-eyes, writes fail (`db-down`), app idle | "Database crashed" | App overload |
| 4 | `cache-flush` | `hit` → 0 | DB dizzy (about 2× load), app fine | "Cache went cold" | DB too small |
| 5 | `bot-flood` | `rps_bad` = 3× | Odd traffic from few sources in log, app dizzy | "Malicious traffic" | Traffic spike |

A replica halves the DB's read load, so owning one softens `cache-flush` (prevention is a valid outcome).

Order: round 1 is always `spike`, round 5 is always `bot-flood`; rounds 2–4 are shuffled by seed. Every incident is solvable without any purchase except: `db-crash` without a replica costs a 20 s outage (acceptable, lower stars), `bot-flood` without a firewall can only be mitigated by rate-limit (partial).

### Diagnosis
Tap **Diagnose**, pick one of 4 hypotheses (one correct, three distractors from `content.js`). It is separate from fixing: fixes are never locked behind it (mitigate-first is realistic).

### Stars per round
- ★ Kept average availability ≥ 90 % over the round.
- ★ Mitigated within 30 s of onset (availability back ≥ 95 %).
- ★ Correct diagnosis made **before** the first fix action.

## 6. Evidence (not a dashboard)

Tap any creature → a **speech bubble** with 1–2 plain-language clues and one large gauge. Examples: "My CPU is at 98 %!", "Everything I serve is failing after the 14:02 release."

- Without Monitoring: vague clues only ("I feel slow…") plus a user-ticket ticker ("Users: the site is down!").
- With Monitoring: exact numbers, the request-error reason mix, and a one-line log ticker; a radar badge shows on the HUD.
- Max one gauge and two lines of text at a time. No multi-chart panels.

## 7. Look and feel

- **Style:** dark-navy backdrop, saturated flat colours, thick outlines, rounded shapes, sticker shadows. Self-hosted rounded display font (OFL, woff2) with a system-rounded fallback.
- **Nodes are characters** (machine bodies with eyes/mood, §4 mood thresholds) — not boxes, not bars. Upgrades add a visible accessory. Faces carry meaning (not colour alone) for colour-blind players.
- **Traffic** is visible: thick tube links, bouncing user blobs, red "!" bursts with the failure reason, coins flying to the budget counter.
- **Incident drama:** red vignette, slam-in "INCIDENT!" banner, screen shake on a death.
- **Controls:** chunky pressable buttons with a lip; choices are big cards; actions live in a bottom sheet.
- **Round map:** a 5-stop path shows shift progress; stars pop with a bounce.
- **Sound/haptics:** synthesized Web Audio effects and `navigator.vibrate` on hits, mute toggle; no audio files. Honor `prefers-reduced-motion` (no shake/particles). Audio starts only after the first tap (browser autoplay rules) and has a mute toggle.
- **HUD:** at most three items — budget, availability, round/timer. Everything else is on the board.
- **First-run coach:** three short tooltips that point at *controls* ("tap a creature to hear it out", "this is where fixes live"). They never name the diagnosis or the fix.

## 8. Architecture

Vanilla ES modules, SVG scene + DOM overlay, CSS transforms for animation, `requestAnimationFrame` for the tick display. **No build step, no dependencies, no network.** New folder `crew/`:

| File | Responsibility |
|---|---|
| `index.html`, `style.css` | Shell, screens, tokens, layout (portrait first, landscape two-column, `100dvh`, safe-area insets, `touch-action: manipulation`) |
| `sim.js` | Pure deterministic simulation (§4); no DOM |
| `incidents.js` | Incident definitions (data) |
| `content.js` | Clues, hypotheses, debrief text |
| `rng.js` | Seeded PRNG (`?seed=`), default seed random and shown at shift end |
| `scene.js` | SVG creatures, tubes, animation, bubbles |
| `ui.js` | HUD, shop, bottom sheet, screens |
| `fx.js` | Audio, haptics, particles (all optional; failures must not break play) |
| `main.js` | Round state machine: title → how-to → prep → incident → result → … → shift result |

Persistence: only the mute preference in `localStorage`, wrapped in try/catch. Refresh mid-run restarts the shift.

### Retiring the old classroom layer
Remove: `src/classroom.js`, `src/classroom-guide.js`, `tests/classroom-guide.test.mjs`, the `?challenge=` entry in `game.js`/`index.html`, the classroom overlay markup and CSS, and the classroom AGENTS/context docs that describe it (rewrite them for the new game). Restore the upstream game to its pre-classroom state; the exact diff against upstream is determined during planning and **confirmed with the owner before deleting** (some of it is uncommitted work). The upstream 3D game stays at the repo root with its `LICENSE`, linked from the end screen as an "advanced sandbox". The classroom URL becomes `…/crew/`; README and docs are updated accordingly.

## 9. Testing and verification

1. **Vitest (unit):** `sim.js` per stage (capacity, cache, replica, firewall, deploy), each incident's right fix restores availability ≥ 95 %, each wrong fix does not, seed determinism, actions' costs/locks, star rules.
2. **Balance tests (Vitest, simulated players):** a *button masher* (random actions) averages fewer than 2 stars on ≥ 2 of the 5 incident types across 200 seeds; a *reasonable player* (buys monitoring, firewall, replica and app servers as the budget allows, right diagnosis and fix) reaches grade ≥ B across 200 seeds. Constants tuned until both hold.
3. **Headless browser (Playwright from the session scratchpad, not a repo dependency):** at 360×640, 390×844, 768×1024, 1280×800 — no console/page errors, no horizontal scroll, every interactive element ≥ 48×48 px, a full shift plays through with correct choices and with wrong choices with differing outcomes, restart works, `prefers-reduced-motion` disables shake.
4. **`npm run check`** (ESLint + Vitest) passes for the whole repo, including the retained upstream tests.
5. **Manual, by the owner:** a real phone (portrait and landscape) using a short checklist supplied with the build; this is the one thing headless testing cannot cover.

## 10. Risks

- **Balance:** tuned by the §9.2 tests, but human feel still needs the owner's playtest; expect one tuning pass.
- **Font/audio on old phones:** fallbacks exist; failures in `fx.js` are swallowed.
- **Scope:** five incidents and one shift is the whole game. New incidents are data-only additions later.
- **Deleting old work:** guarded by the confirmation step in §8.
