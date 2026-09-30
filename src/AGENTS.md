# Source context

`game.js` owns the render/tick loop, input integration, and `window` entry points. `src/state.js` holds mutable run state. `src/classroom.js` owns only the classroom scenario: starting architecture, phase transitions, allowed actions, report, and DOM updates. `src/classroom-guide.js` is the pure next-move selector; keep its behavior covered by `tests/classroom-guide.test.mjs`. `index.html` and `style.css` own the classroom overlay and responsive presentation.

## Classroom contracts

- `?challenge=1` opens the Cloud Crew intro; `startChallenge()` creates a fresh local run.
- Setup is paused (`STATE.timeScale = 0`) until a valid Compute → Database route, Monitoring placement, and Monitoring inspection are complete. Only `Start traffic` begins the seven-minute clock and service upkeep. Purchases still cost money during setup.
- Spike capacity is satisfied by either upgrading Primary Compute or connecting Load Balancer → Backup Compute → Database. Incident recovery must remain possible even with a low budget.
- Phase completion uses real request counts, availability, connection state, and service health. Do not replace these with a scripted win button.
- The classroom UI hides unrelated actions by phase; `getChallengeGuide()` must track both upgrade and backup paths.

For simulation internals, read [`sim/AGENTS.md`](sim/AGENTS.md). For the learner flow, read [`../docs/context/CLASSROOM.md`](../docs/context/CLASSROOM.md).
