import { CONFIG as C } from "./config.js";
import { clueFor, tickerLine } from "./content.js";
import { createScene } from "./scene.js";
import { act, buy, diagnose, finishRound, gradeFor, newShift, preview, shiftOver, startRound, tick } from "./sim.js";
import * as ui from "./ui.js";

const params = new URLSearchParams(location.search);
const seedParam = (params.get("seed") || "").trim();
const speed = Math.min(16, Math.max(1, Number(params.get("speed")) || 1));   // ?speed=8 for tests
const stageEl = document.querySelector("#stage");

let shift = null, round = null, timer = null, snap = null, bubbleKey = null, resultTimer = null, menuOpen = false;
const scene = createScene(document.querySelector("#scene"), { onTap });

const randomSeed = () => Math.random().toString(36).slice(2, 7);
const hudState = () => ({
  budget: shift.budget,
  avail: snap ? snap.avail : 1,
  label: round && timer ? `R${shift.round + 1}/5 · ${Math.floor(round.t / 60)}:${String(round.t % 60).padStart(2, "0")}` : `Round ${Math.min(shift.round + 1, 5)}/5`,
});
const stop = () => { clearInterval(timer); timer = null; clearTimeout(resultTimer); resultTimer = null; };

function newRun() {
  stop();
  shift = newShift(seedParam || randomSeed());
  prep();
}

function prep() {
  stop();
  round = null; snap = null; bubbleKey = null;
  ui.showScreen("play");
  ui.hideBubble(); ui.setAlarm(false); ui.banner("", 0); ui.setTicker("All quiet…");
  scene.build(shift.owned);
  scene.update(preview(startRound(shift)), { quiet: true });   // idle look; a throwaway round
  ui.renderHud(hudState());
  ui.renderPrep(shift);
  ui.coach(shift.round === 0 ? "Spend your budget, then tap Ready. Servers add capacity; Monitoring shows exact numbers." : null);
}

function ready() {
  round = startRound(shift);
  snap = preview(round);
  ui.coach(null);
  ui.renderLive(round);
  ui.renderHud(hudState());
  timer = setInterval(step, 1000 / speed);
}

function step() {
  if (document.hidden || menuOpen) return;   // paused while the menu is open
  const wasOnset = round.onset;
  snap = tick(round, shift);
  scene.update(snap);
  ui.renderHud(hudState());
  ui.setTicker(tickerLine(snap, round.has.monitoring, round.id));
  if (!wasOnset && round.onset) {
    ui.banner(`INCIDENT · ROUND ${shift.round + 1}`);
    ui.renderLive(round);
    if (shift.round === 0) ui.coach("Tap a service in the datacenter to inspect it. Then press Diagnose.");
  }
  ui.setAlarm(round.onset && snap.avail < C.stableAvail);
  if (bubbleKey) refreshBubble();
  if (round.done) end();
}

function end() {
  stop();
  ui.setAlarm(false);
  const res = finishRound(round, shift);
  resultTimer = setTimeout(() => { resultTimer = null; ui.showResult(res, shift); }, 700);
}

function refreshBubble() {
  const g = scene.el(bubbleKey);
  if (g) ui.showBubble(g, clueFor(g.dataset.kind, snap, round.has.monitoring));
}

function onTap(kind, key) {
  if (!round || !timer || !kind) { bubbleKey = null; ui.hideBubble(); return; }
  bubbleKey = bubbleKey === key ? null : key;
  if (bubbleKey) { refreshBubble(); if (shift.round === 0) ui.coach("Good. Now open the fixes below — but pick the cause first (Diagnose)."); }
  else ui.hideBubble();
}

async function copyResult() {
  const stars = shift.results.reduce((n, x) => n + x.count, 0);
  const text = `Cloud Crew: On-Call · grade ${gradeFor(shift)} · ${stars}/15★ · seed ${shift.seed} · ${location.origin}${location.pathname}?seed=${encodeURIComponent(shift.seed)}`;
  try { await navigator.clipboard.writeText(text); document.querySelector("#btn-copy").textContent = "Copied!"; }
  catch { document.querySelector("#btn-copy").textContent = text; }
}

ui.bind({
  nav: (id) => {
    if (id === "start") ui.showScreen("howto");
    if (id === "play") newRun();
    if (id === "menu") { menuOpen = true; ui.setMenu(true); }
    if (id === "resume") { menuOpen = false; ui.setMenu(false); }
    if (id === "restart") { menuOpen = false; ui.setMenu(false); newRun(); }
    if (id === "home") { stop(); menuOpen = false; ui.setMenu(false); ui.showScreen("title"); }
    if (id === "next") { if (shiftOver(shift)) ui.showFinal(shift, gradeFor(shift)); else prep(); }
    if (id === "again") newRun();
    if (id === "copy") copyResult();
  },
  buy: (item) => {
    if (!buy(shift, item).ok) return;
    scene.build(shift.owned);
    scene.update(preview(startRound(shift)), { quiet: true });
    ui.renderHud(hudState());
    ui.renderPrep(shift);
  },
  go: (id) => {
    if (id === "ready") ready();
    if (!round) return;
    if (id === "diagnose") ui.renderLive(round, true);
    if (id === "cancel") ui.renderLive(round);
  },
  hyp: (id) => {
    if (!round || round.done) return;
    diagnose(round, id);
    ui.renderLive(round);
  },
  act: (id) => {
    if (!round || round.done) return;
    act(round, shift, id);
    ui.renderLive(round);
    ui.renderHud(hudState());
  },
});
