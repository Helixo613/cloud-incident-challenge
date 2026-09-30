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
