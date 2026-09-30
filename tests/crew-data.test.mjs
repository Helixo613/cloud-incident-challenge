import { describe, expect, it } from "vitest";
import { CONFIG as C } from "../crew/config.js";
import { INCIDENTS, MIDDLE } from "../crew/incidents.js";
import { ACTION_UI, DEBRIEF, HYPOTHESES, SHOP_UI, clueFor, tickerLine } from "../crew/content.js";

describe("incident data", () => {
  it("every incident has 4 distinct hypotheses including the correct one, and only real fixes", () => {
    for (const [id, inc] of Object.entries(INCIDENTS)) {
      expect(new Set(inc.hypotheses).size, id).toBe(4);
      expect(inc.hypotheses, id).toContain(inc.correct);
      for (const h of inc.hypotheses) expect(HYPOTHESES[h], `${id}:${h}`).toBeTypeOf("string");
      for (const f of inc.fixes) expect(C.actions[f], `${id}:${f}`).toBeDefined();
      expect(DEBRIEF[id].what.length).toBeGreaterThan(10);
      expect(DEBRIEF[id].pro.length).toBeGreaterThan(10);
    }
    expect(MIDDLE.sort()).toEqual(["bad-deploy", "cache-flush", "db-crash"]);
  });
  it("every action and shop item has UI copy", () => {
    for (const id of Object.keys(C.actions)) expect(ACTION_UI[id].name, id).toBeTypeOf("string");
    for (const id of Object.keys(C.shop)) expect(SHOP_UI[id].name, id).toBeTypeOf("string");
  });
  it("clues never throw for any node kind, with or without monitoring", () => {
    const snap = { avail: 0.5, appLoad: 1.2, dbLoad: 0.4, dbDown: false, hit: 0, incoming: 50, appCap: 40, badIn: 10, deployBad: false, onset: true, top: "app-overload" };
    for (const kind of ["users", "firewall", "lb", "app", "cache", "db", "replica"]) {
      for (const m of [true, false]) {
        const c = clueFor(kind, snap, m);
        expect(c.lines.length, kind).toBeGreaterThan(0);
      }
    }
    expect(tickerLine({ ...snap, onset: false }, false, "spike")).toBeTypeOf("string");
    expect(tickerLine(snap, true, "spike")).toBeTypeOf("string");
  });
});
