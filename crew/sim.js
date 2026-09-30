// Pure, deterministic simulation. One tick = one second. No DOM.
import { CONFIG as C } from "./config.js";
import { INCIDENTS, MIDDLE } from "./incidents.js";
import { makeRng } from "./rng.js";

export function newShift(seed) {
  const rng = makeRng(`${seed}:order`);
  return {
    seed: String(seed),
    round: 0,
    budget: C.startBudget,
    owned: { app: 1, replica: 0, monitoring: 0, firewall: 0 },
    order: ["spike", ...rng.shuffle(MIDDLE), "bot-flood"],
    results: [],
  };
}

export function buy(shift, item) {
  const s = C.shop[item];
  if (!s) return { ok: false, reason: "unknown item" };
  if (shift.owned[item] >= s.max) return { ok: false, reason: "already have it" };
  if (shift.budget < s.cost) return { ok: false, reason: "not enough money" };
  shift.owned[item] += 1;
  shift.budget -= s.cost;
  return { ok: true };
}

export function startRound(shift) {
  const id = shift.order[shift.round];
  const rng = makeRng(`${shift.seed}:r${shift.round}`);
  const o = shift.owned;
  return {
    n: shift.round, id, t: 0, done: false, onset: false,
    onsetAt: Math.round(C.onsetBase + rng.range(-C.onsetJitter, C.onsetJitter)),
    jitter: rng.range(C.jitter[0], C.jitter[1]),
    hypOrder: rng.shuffle(INCIDENTS[id].hypotheses),
    base: C.baseRps[shift.round],
    baseServers: o.app,
    extra: [],                                     // ready-times of temporary servers
    has: { replica: o.replica > 0, monitoring: o.monitoring > 0, firewall: o.firewall > 0 },
    flags: { deployBad: false, rollbackAt: null, dbDown: false, dbBackAt: null, cacheCold: false, warmFrom: null, rateLimit: false, block: false },
    stable: 0, mitigatedAt: null, availSum: 0, availN: 0,
    seq: 0, diagnosis: null, diagSeq: null, firstFixSeq: null,
    earned: 0, spent: 0, snap: null,
  };
}

function onsetEffect(r) {
  const f = r.flags;
  if (r.id === "bad-deploy") { f.deployBad = true; f.rollbackAt = null; }
  if (r.id === "db-crash") { f.dbDown = true; f.dbBackAt = null; }
  if (r.id === "cache-flush") { f.cacheCold = true; f.warmFrom = null; }
}

function hitRatio(r, t) {
  const f = r.flags;
  if (!f.cacheCold) return C.cacheHit;
  if (f.warmFrom == null) return 0;
  return C.cacheHit * Math.min(1, (t - f.warmFrom) / C.warmSeconds);
}

const top = (reasons) => {
  let best = null, v = 0.5;
  for (const [k, x] of Object.entries(reasons)) if (x > v) { best = k; v = x; }
  return best;
};

// Pure computation of one second of traffic given the round's current flags.
function step(r, t) {
  const f = r.flags;
  const servers = r.baseServers + r.extra.filter((at) => at <= t).length;
  const appCap = servers * C.appCap;
  const g = r.base * r.jitter;
  const good = g * (r.onset && r.id === "spike" ? C.spikeMult : 1);
  const bad = r.onset && r.id === "bot-flood" ? g * C.floodMult : 0;
  const badIn = bad * (r.has.firewall ? (f.block ? C.blockPass : C.firewallPass) : 1);
  const incoming = good + badIn;
  const admitted = Math.min(incoming, f.rateLimit ? appCap * C.rateLimitCap : Infinity);
  const passApp = Math.min(admitted, appCap);
  const appFrac = incoming > 0 ? passApp / incoming : 1;
  const goodPass = good * appFrac * (f.deployBad ? 0.5 : 1);

  const hit = hitRatio(r, t);
  const herd = f.cacheCold ? 2 - hit / C.cacheHit : 1;
  const replica = r.has.replica;
  const dbDemand = goodPass * ((1 - C.readShare) + C.readShare * (1 - hit) * herd * (replica ? C.replicaShare : 1));
  const dbFrac = f.dbDown ? 0 : Math.min(1, C.dbCap / Math.max(dbDemand, 1e-9));
  const readDb = f.dbDown ? (replica ? 1 : 0) : dbFrac;
  const served = goodPass * (C.readShare * (hit + (1 - hit) * readDb) + (1 - C.readShare) * dbFrac);
  const avail = incoming > 0 ? served / incoming : 1;

  const reasons = {
    "rate-limit": incoming - admitted,
    "app-overload": admitted - passApp,
    "bad-deploy": f.deployBad ? good * appFrac * 0.5 : 0,
    [f.dbDown ? "db-down" : "db-overload"]: goodPass - served,
    attack: badIn,
  };
  return {
    served,
    snap: {
      t, onset: r.onset, servers, good, incoming, appCap, appLoad: admitted / appCap,
      dbLoad: f.dbDown ? null : dbDemand / C.dbCap, dbDown: f.dbDown, hit, avail, served,
      reasons, top: top(reasons), deployBad: f.deployBad, rateLimit: f.rateLimit, block: f.block, badIn, replica,
    },
  };
}

export const preview = (r) => step(r, r.t).snap;

export function tick(r, shift) {
  if (r.done) return r.snap;
  const f = r.flags;
  const t = ++r.t;
  if (!r.onset && t >= r.onsetAt) { r.onset = true; onsetEffect(r); }
  if (f.rollbackAt != null && t >= f.rollbackAt) { f.deployBad = false; f.rollbackAt = null; }
  if (f.dbDown && f.dbBackAt != null && t >= f.dbBackAt) { f.dbDown = false; f.dbBackAt = null; }

  const { snap, served } = step(r, t);
  shift.budget += served * C.income;
  r.earned += served * C.income;
  if (r.onset) {
    r.availSum += snap.avail;
    r.availN += 1;
    r.stable = snap.avail >= C.stableAvail ? r.stable + 1 : 0;
    if (r.mitigatedAt == null && snap.avail >= C.stableAvail) r.mitigatedAt = t;
  }
  if (r.stable >= C.stableSeconds || t >= C.roundSeconds) r.done = true;
  r.snap = snap;
  return snap;
}

export function lockReason(r, id) {
  const a = C.actions[id];
  if (!a) return "unknown action";
  if (a.needs && !r.has[a.needs]) return `needs ${a.needs}`;
  if (id === "scale" && r.baseServers + r.extra.length >= C.maxServers) return "max servers";
  return null;
}

export function act(r, shift, id) {
  if (r.done) return { ok: false, reason: "round is over" };
  const why = lockReason(r, id);
  if (why) return { ok: false, reason: why };
  const a = C.actions[id], f = r.flags, t = r.t;
  shift.budget -= a.cost;
  r.spent += a.cost;
  if (r.firstFixSeq == null) r.firstFixSeq = ++r.seq;
  if (id === "scale") r.extra.push(t + C.scaleDelay);
  if (id === "restart") { f.dbDown = true; f.dbBackAt = t + C.restartSeconds; }
  if (id === "failover") { f.dbDown = true; f.dbBackAt = t + C.failoverSeconds; r.has.replica = false; shift.owned.replica = 0; }
  if (id === "rollback") {
    if (f.deployBad) f.rollbackAt = t + C.rollbackSeconds;
    else { f.deployBad = true; f.rollbackAt = t + C.blipSeconds; }
  }
  if (id === "warm") f.warmFrom = t;
  if (id === "ratelimit") f.rateLimit = true;
  if (id === "block") f.block = true;
  return { ok: true, cost: a.cost };
}

export function diagnose(r, id) {
  if (r.done) return { ok: false, reason: "round is over" };
  if (!r.onset) return { ok: false, reason: "nothing to diagnose yet" };
  if (r.diagnosis) return { ok: false, reason: "already diagnosed" };
  r.diagnosis = id;
  r.diagSeq = ++r.seq;
  return { ok: true, correct: id === INCIDENTS[r.id].correct };
}

export function finishRound(r, shift) {
  const inc = INCIDENTS[r.id];
  const avg = r.availN ? r.availSum / r.availN : 1;
  const stars = {
    avail: avg >= C.starAvail,
    fast: r.mitigatedAt != null && r.mitigatedAt - r.onsetAt <= C.fastSeconds,
    diag: r.diagnosis === inc.correct && (r.firstFixSeq == null || r.diagSeq < r.firstFixSeq),
  };
  const res = {
    id: r.id, n: r.n, avg, stars, count: +stars.avail + +stars.fast + +stars.diag,
    earned: r.earned, spent: r.spent, diagnosis: r.diagnosis, mitigatedAt: r.mitigatedAt, onsetAt: r.onsetAt,
  };
  shift.results.push(res);
  shift.round += 1;
  return res;
}

export const shiftOver = (shift) => shift.round >= shift.order.length;

export function gradeFor(shift) {
  const stars = shift.results.reduce((n, x) => n + x.count, 0);
  let i = stars >= 14 ? 0 : stars >= 12 ? 1 : stars >= 10 ? 2 : stars >= 7 ? 3 : 4;
  if (shift.budget < 0) i = Math.min(4, i + 1);
  return "SABCD"[i];
}
