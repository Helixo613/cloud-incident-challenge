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
