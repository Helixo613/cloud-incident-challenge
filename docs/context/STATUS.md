# Handoff status — 2026-09-30

## Current state

The Cloud Crew redesign is implemented and validated **locally but not committed or published**. Changed files: `.gitignore`, `README.md`, `index.html`, `style.css`, `src/classroom.js`; new files: `src/classroom-guide.js`, `tests/classroom-guide.test.mjs`, and these context docs. The public Pages URL still serves the earlier classroom UI. Do not overwrite unrelated user changes.

## Validation done (2026-09-30)

- `npm run check`: ESLint clean, 63 files / 1,095 tests pass; `git diff --check` clean.
- Headless Chromium (Playwright) full runs, no console/page errors: upgrade path at 1280×800 and 390×844; backup path at 1280×800, 1024×768 and 375×667; time-out run at 768×1024 and 1280×800. All reach the expected report (3/3, or 1/3 on time-out) and Restart/Try again returns to a clean paused $250 setup.
- Fixes this session: desktop camera now shifts (absolute, no drift on restart) so the Internet node is not hidden under the brief panel; time-out report now says which step the team was stuck on.
- Intro `documentElement.scrollWidth` exceeds the viewport by 10–18px at 375/390 because of the hidden original toolbar behind the modal; `body` is `overflow:hidden`, screenshots show no clipping, and in-game overflow is 0.

## Known gaps

- Spike phase is gated on capacity, but at 5 RPS an un-upgraded Primary Compute still serves ~100% of requests, so the spike does not visibly hurt. Consider raising spike RPS if the lesson should be felt.
- Physical phones, real classroom Wi-Fi/CDN access, and slow-device frame rates are untested.

## Next work

1. User reviews the local preview (`python3 -m http.server 8766` in this directory, then `http://127.0.0.1:8766/?challenge=1`).
2. Only on explicit authorization: commit, push to the classroom GitHub repo, wait for the Pages build, then re-test the public URL.
