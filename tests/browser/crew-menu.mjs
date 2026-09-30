// Menu pause / stale-result / reachability checks. Usage: PW_CORE=… CHROME=… node tests/browser/crew-menu.mjs <baseUrl> [w] [h]
const { chromium } = await import(process.env.PW_CORE);
const [base = "http://127.0.0.1:8766/crew/", w = "360", h = "640"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: true })).newPage();
const bad = [];
p.on("pageerror", (e) => bad.push(e.message));
await p.goto(`${base}?seed=t1&speed=8`);
await p.click("[data-nav=start]"); await p.click("[data-nav=play]");
// reachability: every card fully visible after scrolling, foot never overlaps body
const reach = async (label) => {
  const r = await p.evaluate(() => {
    const body = document.querySelector("#sheet-body").getBoundingClientRect(), foot = document.querySelector("#sheet-foot").getBoundingClientRect();
    const stage = document.querySelector("#stage").getBoundingClientRect();
    return { overlap: body.bottom > foot.top + 0.5, stageH: Math.round(stage.height), scrollable: [...document.querySelectorAll("#sheet-body > *")].length };
  });
  if (r.overlap) bad.push(`${label}: body overlaps foot`);
  for (const el of await p.$$("#sheet-body > *")) { await el.scrollIntoViewIfNeeded(); const bb = await el.boundingBox(); const foot = await (await p.$("#sheet-foot")).boundingBox(); if (bb.y + bb.height > foot.y + 1) bad.push(`${label}: card hidden behind foot`); }
  console.log(label, "stage height", r.stageH, "cards", r.scrollable);
};
await reach("prep");
await p.click("[data-go=ready]");
await p.waitForSelector("#banner:not([hidden])", { timeout: 30000 });
await reach("live");
// pause: open menu, clock must not advance
const clock = async () => p.textContent("#hud-round");
await p.click("[data-nav=menu]");
const c0 = await clock(); await p.waitForTimeout(2500);
if (c0 !== (await clock())) bad.push("sim ticked while menu open");
await p.click("[data-nav=resume]"); await p.waitForTimeout(1500);
if (c0 === (await clock())) bad.push("sim did not resume");
// stale result: fix the round, then open Menu -> Restart inside the 700 ms window before the result screen
await p.click("[data-go=diagnose]"); await p.click("[data-hyp=capacity]").catch(() => {});
await p.click("[data-act=scale]").catch(() => {});
let caught = false, last = "", same = 0;
for (let i = 0; i < 4000 && !caught; i++) {
  if (await p.locator("#screen-result.is-active").count()) break;
  const c = await clock();
  same = c === last ? same + 1 : 0; last = c;
  if (same >= 3) caught = true;
  else await p.waitForTimeout(25);
}
if (caught) {
  await p.click("[data-nav=menu]"); await p.click("[data-nav=restart]");
  await p.waitForTimeout(1500);
  if (await p.locator("#screen-result.is-active").count()) bad.push("stale result screen after restart");
  console.log("stale-result window hit: restart left the play screen active");
} else console.log("stale-result window not hit (round ended before it could be caught)");
console.log(bad.length ? `PROBLEMS:\n - ${bad.join("\n - ")}` : "OK");
await b.close();
process.exit(bad.length ? 1 : 0);
