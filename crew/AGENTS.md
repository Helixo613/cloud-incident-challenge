# crew/ — Cloud Crew: On-Call

Phone-first 2D classroom game with an isometric-datacenter look (no images, no fonts, no audio files: everything is SVG/CSS/WebAudio). Spec: `../docs/superpowers/specs/2026-09-30-cloud-crew-on-call-design.md`. Plan: `../docs/superpowers/plans/2026-09-30-cloud-crew-on-call.md`.

- `sim.js` is pure and deterministic (no DOM). All numbers live in `config.js`; incident data in `incidents.js`; all player-facing text in `content.js`.
- `scene.js` only draws a sim snapshot (isometric objects, cables, status flags). Flags show a status word; the numbers appear only when Monitoring is owned. Flags are scaled by 1/scene-scale so text stays about 9 px on screen; on small screens they switch to a compact two-line form.
- `ui.js` renders DOM and owns click delegation (`data-buy|act|go|hyp|nav`, 350 ms double-tap guard). `main.js` is the round state machine. `fx.js` (sound, haptics) is best-effort and must never throw into game code.
- The INCIDENT banner lives inside `#hud` so it never covers scene flags.
- Change balance in `config.js` only, then run `npx vitest run tests/crew-*.test.mjs` (the balance test is the guard).
- URL: `?seed=abc` makes a class play the identical shift. `?speed=` is a test-only accelerator; do not advertise it.
- Browser matrix: `tests/browser/crew-smoke.mjs` and `crew-menu.mjs` (need playwright-core + Chromium via `PW_CORE`/`CHROME`; not part of `npm test`). Lint: `./node_modules/.bin/eslint crew tests/browser`.
- No CDN, no build, no dependencies. Keep it that way.
