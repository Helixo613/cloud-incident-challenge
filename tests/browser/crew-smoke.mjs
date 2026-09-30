// Browser smoke/matrix for crew/. Not part of `npm test` (needs playwright-core + Chromium).
// Usage: PW_CORE=… CHROME=… node tests/browser/crew-smoke.mjs <baseUrl> <mode> <width> <height> [hostile]
//   mode: title | pro | wrong
import { INCIDENTS } from "../../crew/incidents.js";

const { chromium } = await import(process.env.PW_CORE);
const [base = "http://127.0.0.1:8766/crew/", mode = "title", w = "390", h = "844", hostile] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, hasTouch: true, reducedMotion: process.env.REDUCED ? "reduce" : "no-preference" });
if (hostile) {
  await ctx.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
    window.AudioContext = undefined; window.webkitAudioContext = undefined;
    navigator.vibrate = () => { throw new Error("no vibrate"); };
  });
}
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
const tag = `${mode}-${w}x${h}${hostile ? "-hostile" : ""}`;
const shot = (n) => page.screenshot({ path: `${process.env.SHOTS || "."}/${tag}-${n}.png` });

async function checkLayout(where) {
  const r = await page.evaluate(() => {
    const small = [...document.querySelectorAll("button, a.btn, [data-nav], [data-buy], [data-act], [data-hyp], [data-go]")]
      .filter((e) => e.offsetParent !== null || e.getClientRects().length)
      .map((e) => [e, e.getBoundingClientRect()])
      .filter(([e, b]) => b.width > 0 && b.height > 0 && (b.width < 47.5 || b.height < 47.5))
      .map(([e, b]) => `${e.tagName}.${e.className}[${e.dataset ? Object.values(e.dataset)[0] : ""}] ${Math.round(b.width)}x${Math.round(b.height)}`);
    return { overflow: document.documentElement.scrollWidth - innerWidth, small };
  });
  if (r.overflow > 0) problems.push(`${where}: horizontal overflow ${r.overflow}px`);
  for (const s of r.small) problems.push(`${where}: tap target too small: ${s}`);
}

await page.goto(`${base}?seed=t1&speed=8`);
await page.waitForSelector("#screen-title.is-active");
await checkLayout("title"); await shot("title");
await page.click("[data-nav=start]");
await page.waitForSelector("#screen-howto.is-active");
await checkLayout("howto");
await page.click("[data-nav=play]");
await page.waitForSelector("#screen-play.is-active");
await checkLayout("prep"); await shot("prep");
const kinds = await page.$$eval("#scene .cr", (n) => n.map((x) => x.dataset.key));
for (const k of ["users", "lb", "app0", "app3", "cache", "db", "replica", "firewall"]) if (!kinds.includes(k)) problems.push(`scene missing ${k}`);
const active = await page.$$eval("#scene .cr:not(.off)", (n) => n.length);
if (active < 5) problems.push(`scene has only ${active} active creatures`);

if (mode !== "title") {
  const results = [];
  for (let round = 0; round < 5; round++) {
    await page.waitForSelector("#sheet[data-phase=prep]");
    if (mode === "pro") {
      for (const item of ["monitoring", "firewall", "app", "replica"]) {
        const b = page.locator(`[data-buy=${item}]:not([disabled])`);
        if (await b.count()) await b.first().click();
      }
    }
    await page.click("[data-go=ready]");
    await page.waitForSelector("#banner:not([hidden])", { timeout: 30000 });
    const id = await page.getAttribute("#sheet", "data-incident");
    await checkLayout(`live-${id}`);
    if (round === 0) await shot("incident");
    if (mode === "pro") {
      await page.click("[data-go=diagnose]");
      await page.click(`[data-hyp=${INCIDENTS[id].correct}]`);
      for (const f of [...INCIDENTS[id].fixes, "ratelimit"]) {
        const b = page.locator(`[data-act=${f}]:not([disabled])`);
        if (await b.count()) { await b.first().click(); break; }
      }
    } else {
      await page.click("[data-act=restart]");
    }
    await page.waitForSelector("#screen-result.is-active", { timeout: 60000 });
    const stars = await page.locator("#result-stars [data-on='1']").count();
    results.push(`${id}:${stars}`);
    await checkLayout(`result-${id}`);
    if (round === 0) { await page.waitForTimeout(900); await shot("result"); }
    await page.click("[data-nav=next]");
  }
  await page.waitForSelector("#screen-final.is-active");
  await checkLayout("final"); await page.waitForTimeout(900); await shot("final");
  console.log("rounds:", results.join(" "), "| grade:", (await page.textContent("#final-grade")).trim());
}
console.log(tag, problems.length ? `PROBLEMS:\n - ${problems.join("\n - ")}` : "OK");
await browser.close();
process.exit(problems.length ? 1 : 0);
