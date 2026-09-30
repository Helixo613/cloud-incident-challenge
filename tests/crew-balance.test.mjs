import { describe, expect, it } from "vitest";
import { gradeFor } from "../crew/sim.js";
import { masher, playShift, pro, slowPro } from "./helpers/crew-bots.mjs";

const SEEDS = Array.from({ length: 200 }, (_, i) => `seed-${i}`);
const stars = (shift) => shift.results.reduce((n, x) => n + x.count, 0);

describe("balance", () => {
  it("a reasonable player reaches grade B or better on every seed", () => {
    for (const seed of SEEDS) expect("SAB", seed).toContain(gradeFor(playShift(seed, pro)));
  });
  it("a human-speed player (10 s slower than pro) still reaches grade B or better on every seed", () => {
    for (const seed of SEEDS) expect("SAB", seed).toContain(gradeFor(playShift(seed, slowPro)));
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
