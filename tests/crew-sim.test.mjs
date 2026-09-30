import { describe, expect, it } from "vitest";
import { CONFIG as C } from "../crew/config.js";
import { INCIDENTS } from "../crew/incidents.js";
import { act, buy, diagnose, finishRound, gradeFor, lockReason, newShift, preview, shiftOver, startRound, tick } from "../crew/sim.js";

// Play one round of `incident` as round index `n`. `owned` overrides the shop state.
// `fixes` are applied on the first tick after onset; `diag` is picked first if given.
function play(incident, { n = 0, owned = {}, fixes = [], diag = null, seed = "t" } = {}) {
  const shift = newShift(seed);
  shift.order[n] = incident;
  shift.round = n;
  Object.assign(shift.owned, owned);
  const r = startRound(shift);
  let acted = false;
  while (!r.done) {
    tick(r, shift);
    if (r.onset && !acted) {
      acted = true;
      if (diag) diagnose(r, diag);
      for (const f of fixes) act(r, shift, f);
    }
  }
  return { r, shift };
}

// [incident, round index, owned, right fixes]
const RIGHT = [
  ["spike", 0, {}, ["scale"]],
  ["bad-deploy", 1, {}, ["rollback"]],
  ["db-crash", 2, {}, ["restart"]],
  ["db-crash", 2, { replica: 1 }, ["failover"]],
  ["cache-flush", 1, {}, ["warm"]],
  ["bot-flood", 4, { firewall: 1, app: 2 }, ["block"]],
];
const WRONG_CASES = [
  ["spike", 0, {}], ["bad-deploy", 1, {}], ["db-crash", 2, {}], ["cache-flush", 1, {}], ["bot-flood", 4, { firewall: 1, app: 2 }],
];

describe("shift setup", () => {
  it("round 1 is spike, round 5 is bot-flood, the middle is a permutation", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      const { order } = newShift(seed);
      expect(order[0]).toBe("spike");
      expect(order[4]).toBe("bot-flood");
      expect([...order.slice(1, 4)].sort()).toEqual(["bad-deploy", "cache-flush", "db-crash"]);
    }
  });
  it("is deterministic per seed and varies across seeds", () => {
    expect(newShift("same").order).toEqual(newShift("same").order);
    const orders = new Set(Array.from({ length: 30 }, (_, i) => newShift(`s${i}`).order.join()));
    expect(orders.size).toBeGreaterThanOrEqual(3);
    const a = startRound(newShift("same")), b = startRound(newShift("same"));
    expect([a.onsetAt, a.jitter, a.hypOrder]).toEqual([b.onsetAt, b.jitter, b.hypOrder]);
  });
  it("handles odd seeds", () => {
    for (const seed of ["", "🙂", 42, "y".repeat(500)]) {
      const s = newShift(seed);
      expect(s.order).toHaveLength(5);
      expect(new Set(s.order).size).toBe(5);
    }
  });
});

describe("shop", () => {
  it("charges, enforces max and budget", () => {
    const s = newShift("x");
    expect(buy(s, "monitoring")).toEqual({ ok: true });
    expect(s.budget).toBe(C.startBudget - C.shop.monitoring.cost);
    expect(buy(s, "monitoring").ok).toBe(false);          // max 1
    expect(buy(s, "app").ok).toBe(true);
    expect(s.owned.app).toBe(2);
    s.budget = 10;
    expect(buy(s, "firewall")).toEqual({ ok: false, reason: "not enough money" });
    expect(buy(s, "nope").ok).toBe(false);
  });
  it("caps app servers at maxServers", () => {
    const s = newShift("x"); s.budget = 1000;
    for (let i = 0; i < 6; i++) buy(s, "app");
    expect(s.owned.app).toBe(C.maxServers);
  });
});

describe("simulation", () => {
  it("a quiet round is 100% available before the incident", () => {
    const s = newShift("q"); const r = startRound(s);
    expect(preview(r).avail).toBe(1);
    expect(preview(r).onset).toBe(false);
  });
  it.each(RIGHT)("%s (round %i, owned %j) is fixed by %j within the fast window", (id, n, owned, fixes) => {
    const { r } = play(id, { n, owned, fixes });
    expect(r.snap.avail).toBeGreaterThanOrEqual(C.stableAvail);
    expect(r.mitigatedAt - r.onsetAt).toBeLessThanOrEqual(C.fastSeconds);
  });
  it.each(WRONG_CASES)("%s (round %i) is never fixed by any wrong action", (id, n, owned) => {
    const wrong = Object.keys(C.actions).filter((a) => !INCIDENTS[id].fixes.includes(a));
    for (const a of wrong) {
      const { r } = play(id, { n, owned, fixes: [a] });
      expect(r.mitigatedAt, `${id} + ${a}`).toBeNull();
    }
  });
  it("doing nothing leaves every incident unresolved", () => {
    for (const [id, n, owned] of WRONG_CASES) expect(play(id, { n, owned }).r.mitigatedAt, id).toBeNull();
  });
  it("a replica or extra servers can prevent an incident (prevention is valid)", () => {
    const { r } = play("spike", { n: 0, owned: { app: 2 } });
    expect(r.mitigatedAt).toBe(r.onsetAt);
  });
  it("restarting a healthy DB causes an outage; rollback with nothing wrong causes a blip", () => {
    const a = play("spike", { n: 0, owned: { app: 2 }, fixes: ["restart"] });
    expect(Math.min(...[a.r.availSum / a.r.availN])).toBeLessThan(1);
    expect(a.r.availSum / a.r.availN).toBeLessThan(0.99);
    const b = play("spike", { n: 0, owned: { app: 2 }, fixes: ["rollback"] });
    expect(b.r.availSum / b.r.availN).toBeLessThan(0.999);
  });
  it("preemptive fixes do not defuse a later incident", () => {
    const shift = newShift("p"); shift.order[1] = "cache-flush"; shift.round = 1;
    const r = startRound(shift);
    act(r, shift, "warm");
    while (!r.done) tick(r, shift);
    expect(r.mitigatedAt).toBeNull();
  });
  it("does nothing after the round is done", () => {
    const { r, shift } = play("bad-deploy", { n: 1, fixes: ["rollback"] });
    const b = shift.budget, snap = r.snap;
    expect(tick(r, shift)).toBe(snap);
    expect(shift.budget).toBe(b);
    expect(act(r, shift, "scale").ok).toBe(false);
  });
});

describe("actions and money", () => {
  it("locks actions that need gear and caps servers", () => {
    const s = newShift("l"); const r = startRound(s);
    expect(lockReason(r, "failover")).toBe("needs replica");
    expect(lockReason(r, "block")).toBe("needs firewall");
    expect(lockReason(r, "scale")).toBeNull();
    for (let i = 0; i < 3; i++) act(r, s, "scale");
    expect(lockReason(r, "scale")).toBe("max servers");
    expect(act(r, s, "failover")).toEqual({ ok: false, reason: "needs replica" });
  });
  it("never blocks an action on low budget; a negative budget lowers the grade", () => {
    const s = newShift("neg"); s.budget = 0; const r = startRound(s);
    expect(act(r, s, "scale").ok).toBe(true);
    expect(s.budget).toBe(-C.actions.scale.cost);
    const good = newShift("g"); good.results = Array(5).fill({ count: 3 });
    expect(gradeFor(good)).toBe("S");
    good.budget = -1;
    expect(gradeFor(good)).toBe("A");
  });
  it("failing over consumes the replica for the rest of the shift", () => {
    const { shift } = play("db-crash", { n: 2, owned: { replica: 1 }, fixes: ["failover"] });
    expect(shift.owned.replica).toBe(0);
  });
});

describe("diagnosis and stars", () => {
  it("awards the diagnosis star only for a correct diagnosis made before the first fix", () => {
    const right = play("bad-deploy", { n: 1, diag: "bad-release", fixes: ["rollback"] });
    expect(finishRound(right.r, right.shift).stars.diag).toBe(true);

    const wrong = play("bad-deploy", { n: 1, diag: "capacity", fixes: ["rollback"] });
    expect(finishRound(wrong.r, wrong.shift).stars.diag).toBe(false);

    const shift = newShift("late"); shift.order[1] = "bad-deploy"; shift.round = 1;
    const r = startRound(shift);
    while (!r.onset) tick(r, shift);
    act(r, shift, "rollback");
    diagnose(r, "bad-release");                          // too late
    while (!r.done) tick(r, shift);
    expect(finishRound(r, shift).stars.diag).toBe(false);
  });
  it("records the actions taken, in order, and hands them to the result", () => {
    const shift = newShift("log"); const r = startRound(shift);
    while (!r.onset) tick(r, shift);
    act(r, shift, "rollback"); act(r, shift, "scale");
    expect(act(r, shift, "nonsense").ok).toBe(false);
    expect(r.log.map((x) => x.id)).toEqual(["rollback", "scale"]);
    while (!r.done) tick(r, shift);
    expect(finishRound(r, shift).log).toHaveLength(2);
  });
  it("allows one diagnosis, and only after the incident starts", () => {
    const shift = newShift("d"); const r = startRound(shift);
    expect(diagnose(r, "capacity").ok).toBe(false);      // nothing to diagnose yet
    while (!r.onset) tick(r, shift);
    expect(diagnose(r, "capacity")).toEqual({ ok: true, correct: true });
    expect(diagnose(r, "network").ok).toBe(false);
  });
  it("finishRound advances the shift and records the result", () => {
    const { r, shift } = play("bad-deploy", { n: 1, diag: "bad-release", fixes: ["rollback"] });
    const res = finishRound(r, shift);
    expect(shift.round).toBe(2);
    expect(shift.results).toHaveLength(1);
    expect(res.count).toBe(+res.stars.avail + +res.stars.fast + +res.stars.diag);
    expect(shiftOver(shift)).toBe(false);
    shift.round = 5;
    expect(shiftOver(shift)).toBe(true);
  });
});

describe("fair stars and stage reward", () => {
  it("holding above 90% for the whole round earns the uptime and fast stars", () => {
    const { r, shift } = play("spike", { n: 0, owned: { app: 2 } });
    const res = finishRound(r, shift);
    expect(res.stars.avail).toBe(true);
    expect(res.stars.fast).toBe(true);
  });
  it("uptime star is also granted when availability never dipped below the bar", () => {
    const { r, shift } = play("spike", { n: 0, owned: { app: 2 } });
    r.availSum = 0.5 * r.availN; r.minAvail = 0.95;      // low average, but never under 90%
    expect(finishRound(r, shift).stars.avail).toBe(true);
  });
  it("pays base + perStar * stars into the budget", () => {
    const { r, shift } = play("bad-deploy", { n: 1, diag: "bad-release", fixes: ["rollback"] });
    const before = shift.budget;
    const res = finishRound(r, shift);
    expect(res.reward).toBe(C.stageReward.base + C.stageReward.perStar * res.count);
    expect(shift.budget).toBe(before + res.reward);
  });
  it("a zero-star round still pays the base reward", () => {
    const { r, shift } = play("db-crash", { n: 2 });
    const res = finishRound(r, shift);
    expect(res.count).toBe(0);
    expect(res.reward).toBe(C.stageReward.base);
  });
  it("explains each missed star", () => {
    const wrong = play("bad-deploy", { n: 1, diag: "capacity", fixes: ["rollback"] });
    expect(finishRound(wrong.r, wrong.shift).why.diag).toBe("wrong");
    const none = play("db-crash", { n: 2 });
    const res = finishRound(none.r, none.shift);
    expect(res.why).toEqual({ avail: Math.round(res.avg * 100), fast: null, diag: "none" });
    expect(res.why.avail).toBeLessThan(90);
  });
  it("exposes DB restart progress (dbLeft counts down, dbTotal is the duration)", () => {
    const shift = newShift("t"); shift.order[2] = "db-crash"; shift.round = 2;
    const r = startRound(shift);
    while (!r.onset) tick(r, shift);
    expect(preview(r)).toMatchObject({ dbDown: true, dbLeft: 0, dbTotal: 0 });   // crash: no scheduled recovery
    act(r, shift, "restart");
    expect(preview(r)).toMatchObject({ dbLeft: C.restartSeconds, dbTotal: C.restartSeconds });
    let prev = C.restartSeconds;
    while (r.flags.dbDown) { const s = tick(r, shift); if (s.dbDown) { expect(s.dbLeft).toBe(prev - 1); prev = s.dbLeft; } }
    expect(tick(r, shift)).toMatchObject({ dbLeft: 0, dbTotal: 0 });
  });
  it("failover reports its own short total", () => {
    const shift = newShift("t"); shift.order[2] = "db-crash"; shift.round = 2; shift.owned.replica = 1;
    const r = startRound(shift);
    while (!r.onset) tick(r, shift);
    act(r, shift, "failover");
    expect(preview(r)).toMatchObject({ dbLeft: C.failoverSeconds, dbTotal: C.failoverSeconds });
  });
});
