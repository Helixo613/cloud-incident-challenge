// Optional sensory feedback. Every call is best-effort: a failure here must never break play.
export const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

let muted = false;
try { muted = localStorage.getItem("crew.muted") === "1"; } catch {}
let ac = null;

export const isMuted = () => muted;
export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem("crew.muted", muted ? "1" : "0"); } catch {}
}

// Browsers only allow audio after a user gesture.
export function unlock() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac ||= new AC();
    ac.resume?.();
  } catch {}
}

// [freq Hz, seconds, peak gain]: soft sine/triangle blips; alarm is a low double pulse.
const TONES = {
  tap: [[600, 0.04, 0.03]],
  buy: [[520, 0.05, 0.04], [700, 0.08, 0.04]],
  deny: [[180, 0.1, 0.05]],
  alarm: [[196, 0.22, 0.07], [196, 0.22, 0.07]],
  good: [[560, 0.07, 0.04], [740, 0.1, 0.04]],
  bad: [[260, 0.1, 0.05], [190, 0.16, 0.05]],
  star: [[660, 0.07, 0.04], [830, 0.07, 0.04], [990, 0.12, 0.04]],
  win: [[440, 0.1, 0.05], [554, 0.1, 0.05], [659, 0.1, 0.05], [880, 0.22, 0.05]],
};

export function sfx(name) {
  if (muted || !ac || document.hidden) return;
  try {
    let t = ac.currentTime;
    for (const [freq, dur, vol] of TONES[name] || []) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = name === "alarm" || name === "deny" || name === "bad" ? "triangle" : "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t); o.stop(t + dur);
      t += dur + (name === "alarm" ? 0.08 : 0);
    }
  } catch {}
}

export function haptic(pattern) {
  if (muted) return;
  try { navigator.vibrate?.(pattern); } catch {}
}

export function shake(el) {
  if (reducedMotion || !el) return;
  try {
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  } catch {}
}

// A small orange coin drifts from a node to the budget pill.
export function flyCoin(fromEl, toEl) {
  if (reducedMotion || !fromEl || !toEl || !fromEl.getBoundingClientRect || !toEl.getBoundingClientRect) return;
  try {
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    const c = document.createElement("div");
    c.style.cssText = `position:fixed;left:${a.left + a.width / 2 - 6}px;top:${a.top + a.height / 2 - 6}px;width:12px;height:12px;border-radius:50%;background:#f5a524;border:2px solid #ffd27a;box-sizing:border-box;z-index:9;pointer-events:none`;
    document.body.append(c);
    const anim = c.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(.6)`, opacity: 0.2 }], { duration: 650, easing: "ease-in" });
    anim.onfinish = () => c.remove();
  } catch {}
}
