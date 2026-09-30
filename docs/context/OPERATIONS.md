# Run, test, and publish

## Local

From the repository root, run `rtk python3 -m http.server 8000` and open `http://localhost:8000/?challenge=1`. The app is static HTML/CSS/ES modules; students do not need Node or an install. Contributor checks require `npm ci` once, then `rtk npm run check` (ESLint plus Vitest). The focused guide test is `rtk npx vitest run tests/classroom-guide.test.mjs`.

## Browser validation checklist

- Fresh intro at 375×667 and 390×844: start button visible, no horizontal overflow, touch targets at least 44px.
- Paused setup: clock and upkeep do not advance; placing Monitoring costs $75.
- Full success with Primary Compute upgrade; full success with Backup Compute and both directional connections.
- Incident alert, Monitoring diagnosis, free restoration, eight post-recovery successes, report, and restart.
- Delayed/time-out run; report should show incomplete objectives without locking the team out.
- Check 768px tablet and 1024px/1280px desktop layouts, browser errors, and independent tabs.

## Publication

The public repository is `https://github.com/Helixo613/cloud-incident-challenge`; GitHub Pages is `https://helixo613.github.io/cloud-incident-challenge/?challenge=1`. Pages deploys from `main` at repository root. **The current Cloud Crew redesign is local and uncommitted until explicitly authorized; do not describe the public URL as updated yet.** After authorization: run checks and browser validation, review diff and license, commit, push to the classroom repository, wait for Pages build, then test the public URL again.

## Remaining risks

Three.js and Tailwind load from public CDNs, so classroom Wi-Fi/content filters matter. Physical phones have not been tested; browser mobile viewports have. Low-end frame rates may make simulated time run slower than wall time. The activity is English-only. A negative budget is reported rather than eliminating a team mid-run.
