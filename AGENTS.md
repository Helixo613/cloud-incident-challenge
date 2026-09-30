# Cloud Incident Challenge — agent entry point

Read this file first. Before editing under `src/`, read [`src/AGENTS.md`](src/AGENTS.md); before editing simulation internals, also read [`src/sim/AGENTS.md`](src/sim/AGENTS.md).

## What this repository is

A static-browser fork of the MIT-licensed Server Survival game. Its classroom entry point is `?challenge=1`; separate browser tabs run independent local state. There is no backend, account system, room code, or paid service. Keep the original `LICENSE` and copyright notices.

## Intent Layer

- Gameplay and learner-facing design: [`docs/context/CLASSROOM.md`](docs/context/CLASSROOM.md).
- Local run, tests, release, and risks: [`docs/context/OPERATIONS.md`](docs/context/OPERATIONS.md).
- Current uncommitted work and exact next steps: [`docs/context/STATUS.md`](docs/context/STATUS.md).
- Facilitator script and debrief: [`README.md`](README.md), first section.

## Guardrails

- Preserve the existing simulation; the classroom mode is a thin guided layer over it.
- Use `apply_patch` for local edits and prefix shell commands with `rtk` (workspace policy).
- Test changed behavior and check mobile layouts before claiming success.
- Do not commit or push without an explicit user instruction. The published Pages site can lag behind local changes; check `docs/context/STATUS.md`.
