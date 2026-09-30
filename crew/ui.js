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
  for (const id of ["#btn-mute", "#btn-mute-title"]) $(id).textContent = muted ? "🔇 Sound off" : "🔊 Sound on";
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
