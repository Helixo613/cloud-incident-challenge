import { CONFIG as C } from "./config.js";
import { ACTION_UI, DEBRIEF, HYPOTHESES, SHOP_UI, STARS } from "./content.js";
import { INCIDENTS } from "./incidents.js";
import { lockReason, shiftOver } from "./sim.js";
const $ = (s) => document.querySelector(s);
const money = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n));

export function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("is-active", s.id === `screen-${name}`));
}

export function renderHud({ budget, avail, label }) {
  const b = $("#hud-budget");
  b.textContent = money(budget);
  b.classList.toggle("neg", budget < 0);
  $("#hud-avail-num").textContent = `${Math.round(avail * 100)}%`;
  const m = $("#hud-meter i");
  m.style.width = `${Math.round(avail * 100)}%`;
  m.dataset.level = avail >= 0.95 ? "ok" : avail >= 0.6 ? "warn" : "bad";
  $("#hud-round").textContent = label;
}

export function setMenu(open) { $("#menu").hidden = !open; }

export function setMuteLabel(muted) {
  for (const id of ["#btn-mute", "#btn-mute-title"]) $(id).textContent = muted ? "Sound: off" : "Sound: on";
}

// One delegated click listener. Handlers are keyed by the data-* attribute name
// (buy, act, go, hyp, nav). A 350 ms per-target guard swallows accidental double taps.
const KEYS = ["buy", "act", "go", "hyp", "nav"];
const lastAt = {};
export function bind(handlers) {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-buy],[data-act],[data-go],[data-hyp],[data-nav]");
    if (!t || t.disabled) return;
    const key = KEYS.find((k) => t.dataset[k] !== undefined);
    const stamp = `${key}:${t.dataset[key]}`;
    const now = performance.now();
    if (now - (lastAt[stamp] ?? -1e9) < 350) return;
    lastAt[stamp] = now;
    handlers[key]?.(t.dataset[key], t);
  });
}

export function renderPrep(shift) {
  const sheet = $("#sheet");
  sheet.dataset.phase = "prep";
  delete sheet.dataset.incident;
  $("#sheet-title").textContent = `Round ${shift.round + 1} of 5 · Prep`;
  const body = $("#sheet-body");
  body.className = "";
  body.innerHTML = Object.entries(SHOP_UI).map(([id, u]) => {
    const s = C.shop[id], own = shift.owned[id];
    const maxed = own >= s.max, poor = shift.budget < s.cost;
    const tag = maxed ? "OWNED" : `$${s.cost}`;
    const count = id === "app" ? ` · ${own}/${s.max}` : "";
    return `<button class="card shop" data-buy="${id}" ${maxed || poor ? "disabled" : ""}><span class="tx"><b>${u.name}${count}</b><small>${u.note}</small></span><span class="price">${tag}</span></button>`;
  }).join("");
  $("#sheet-foot").innerHTML = `<button class="btn go" data-go="ready">Ready · start round ${shift.round + 1}</button>`;
}

export function renderLive(round, diagnosing = false) {
  const sheet = $("#sheet");
  sheet.dataset.phase = "live";
  sheet.dataset.incident = round.id;
  const body = $("#sheet-body"), foot = $("#sheet-foot");
  if (diagnosing) {
    $("#sheet-title").textContent = "Diagnose · what is the root cause?";
    body.className = "";
    body.innerHTML = round.hypOrder.map((h) => `<button class="card" data-hyp="${h}"><span class="tx"><b>${HYPOTHESES[h]}</b></span></button>`).join("");
    foot.innerHTML = `<button class="btn ghost" data-go="cancel">Back</button>`;
    return;
  }
  $("#sheet-title").textContent = round.onset ? "Incident · response" : "Monitoring traffic…";
  let chip = "";
  if (round.diagnosis) {
    const ok = round.diagnosis === INCIDENTS[round.id].correct;
    chip = `<div class="chip ${ok ? "good" : "bad"}"><b>${ok ? "Correct" : "Incorrect"}</b>${HYPOTHESES[round.diagnosis]}</div>`;
  }
  body.className = "two";
  body.innerHTML = Object.keys(C.actions).map((id) => {
    const u = ACTION_UI[id], why = lockReason(round, id), cost = C.actions[id].cost;
    return `<button class="card act" data-act="${id}" ${why ? "disabled" : ""}><span class="tx"><b>${u.name}</b><small>${why || u.note}</small></span><span class="price">${cost ? `$${cost}` : "free"}</span></button>`;
  }).join("");
  const canDiagnose = round.onset && !round.diagnosis;
  foot.innerHTML = chip + `<button class="btn alt" data-go="diagnose" ${canDiagnose ? "" : "disabled"}>Diagnose the cause</button>`;
}

let bannerTimer, coachTimer;
export function banner(text, ms = 2400) {
  const b = $("#banner");
  b.textContent = text; b.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { b.hidden = true; }, ms);
}
export function setAlarm(on) { $("#stage").classList.toggle("alarm", on); }
export function setTicker(text) { $("#ticker").textContent = text; }
document.addEventListener("click", (e) => { if (e.target.closest("#coach")) $("#coach").hidden = true; });
export function coach(text) {
  const c = $("#coach");
  clearTimeout(coachTimer);
  if (!text) { c.hidden = true; return; }
  c.textContent = text; c.hidden = false;
  coachTimer = setTimeout(() => { c.hidden = true; }, 6000);
}

export function hideBubble() { $("#bubble").hidden = true; }
export function showBubble(target, clue) {
  const b = $("#bubble"), stage = $("#stage").getBoundingClientRect(), r = target.getBoundingClientRect();
  const level = (v) => (v >= 1 ? "bad" : v >= 0.7 ? "warn" : "ok");
  b.innerHTML = clue.lines.map((l) => `<p>${l}</p>`).join("") +
    (clue.gauge ? `<div class="gauge" aria-label="${clue.gauge.label}"><i class="${clue.gauge.label === "Happy users" || clue.gauge.label === "Hit rate" ? (clue.gauge.value < 0.6 ? "bad" : clue.gauge.value < 0.95 ? "warn" : "ok") : level(clue.gauge.value)}" style="width:${Math.min(100, Math.round(clue.gauge.value * 100))}%"></i></div>` : "");
  b.hidden = false;
  const bw = Math.min(240, stage.width - 16);
  b.style.width = `${bw}px`;
  const cx = r.left + r.width / 2 - stage.left;
  b.style.left = `${Math.max(8, Math.min(stage.width - bw - 8, cx - bw / 2))}px`;
  const above = r.top - stage.top > b.offsetHeight + 12;
  b.style.top = `${above ? r.top - stage.top - b.offsetHeight - 6 : r.bottom - stage.top + 6}px`;
}

export function showResult(res, shift) {
  const d = DEBRIEF[res.id];
  $("#result-kicker").textContent = `Round ${res.n + 1} · ${d.title}`;
  $("#result-title").textContent = res.count === 3 ? "Flawless recovery" : res.count === 2 ? "Solid recovery" : res.count === 1 ? "Rough recovery" : "Major outage";
  $("#result-stars").innerHTML = STARS.map(([k, t]) => `<li data-on="${res.stars[k] ? 1 : 0}"><span class="star">★</span>${t}</li>`).join("");
  $("#result-body").innerHTML = `<p><b>What happened</b>${d.what}</p><p><b>What a pro does</b>${d.pro}</p>`;
  $("#result-money").textContent = `Earned ${money(res.earned)} · Spent on fixes ${money(res.spent)} · Budget ${money(shift.budget)}`;
  document.querySelector("#screen-result [data-nav=next]").textContent = shiftOver(shift) ? "See final grade" : "Next round";
  showScreen("result");
}

export function showFinal(shift, grade) {
  const stars = shift.results.reduce((n, x) => n + x.count, 0);
  $("#final-grade").textContent = grade;
  $("#final-summary").textContent = `${stars} of 15 stars · budget ${money(shift.budget)}${shift.budget < 0 ? " (in the red — costs a grade)" : ""}`;
  $("#final-rounds").innerHTML = shift.results.map((r) => `<li><span>${DEBRIEF[r.id].title}</span><span>${"★".repeat(r.count)}${"☆".repeat(3 - r.count)}</span></li>`).join("");
  $("#final-seed").textContent = shift.seed;
  showScreen("final");
}
