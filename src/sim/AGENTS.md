# Simulation internals

This area owns service topology, routing, traffic, and related handlers. Classroom code should call existing APIs in `topology.js` (`createService`, `createConnection`) and use existing `Service` behavior rather than inventing a parallel simulator.

## Invariants for classroom work

- A link is directional; Load Balancer → Compute → Database is not equivalent to the reverse path.
- `Service.update()` charges upkeep when `STATE.upkeepEnabled` is true and game time advances. Pausing with `STATE.timeScale = 0` stops simulated-time upkeep; buying a service still has an upfront cost.
- Request success and failure counts come from the simulation. The classroom report derives availability from them; do not overwrite counters to force phase completion.
- Changes here have broad impact on survival and campaign modes. Prefer fixes in `src/classroom.js` for classroom-only behavior and run the complete suite after any shared simulation edit.
