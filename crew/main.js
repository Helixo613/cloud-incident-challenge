import * as ui from "./ui.js";
import { createScene } from "./scene.js";
import { newShift, startRound, preview } from "./sim.js";

const scene = createScene(document.querySelector("#scene"), { onTap: () => {} });
// TEMP (removed in Task 7): draw an idle scene on entering play.
function demo() { const s = newShift("demo"); scene.build(s.owned); scene.update(preview(startRound(s)), { quiet: true }); }

ui.bind({
  nav: (id) => {
    if (id === "start") ui.showScreen("howto");
    if (id === "play") { ui.showScreen("play"); demo(); }
    if (id === "menu") ui.setMenu(true);
    if (id === "resume") ui.setMenu(false);
    if (id === "home") { ui.setMenu(false); ui.showScreen("title"); }
  },
});
ui.renderHud({ budget: 120, avail: 1, label: "Round 1/5" });
