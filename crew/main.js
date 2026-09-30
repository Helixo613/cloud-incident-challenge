import * as ui from "./ui.js";

ui.bind({
  nav: (id) => {
    if (id === "start") ui.showScreen("howto");
    if (id === "play") ui.showScreen("play");
    if (id === "menu") ui.setMenu(true);
    if (id === "resume") ui.setMenu(false);
    if (id === "home") { ui.setMenu(false); ui.showScreen("title"); }
  },
});
ui.renderHud({ budget: 120, avail: 1, label: "Round 1/5" });
