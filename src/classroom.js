// Cloud Incident Challenge: one local run per browser tab, using the game's
// existing service, routing, economy, and monitoring simulation.
import { STATE } from "./state.js";
import { i18n } from "./i18n.js";
import { Service } from "./entities/Service.js";
import { createConnection, createService } from "./sim/topology.js";
import { getRollingGoodput } from "./core/metrics.js";
import { canStartTraffic, getChallengeGuide } from "./classroom-guide.js";
import { camera, cameraTarget, resetGame } from "../game.js";

const MAX_SECONDS = 420;
const PHASES = [
    { name: "Launch", goal: "Connect Compute → Database, place Monitoring, inspect traffic and metrics, then serve 4 requests.", hint: "Choose Primary Compute and Database below, press Connect, then start watching the READ requests." },
    { name: "Spike", goal: "Add capacity and serve 15 requests over at least 30 seconds with 65% availability.", hint: "Upgrade Compute, or add a backup Compute and connect Load Balancer → Backup → Database." },
    { name: "Incident", goal: "Use Monitoring to identify the failed service, restore it, and serve 8 more requests.", hint: "A service has gone offline. Inspect Monitoring before using Restore Database." },
];

const run = { active: false, live: false, phase: 0, phaseAt: 0, startProcessed: 0, startFailed: 0, inspectedTraffic: false, inspectedMonitor: false, restored: false, restoredAt: 0, lastPaint: -1, note: "", next: "" };
const el = (id) => document.getElementById(id);
const failed = () => Object.values(STATE.failures).reduce((sum, count) => sum + count, 0);
const node = (name) => STATE.services.find((service) => service.classroomName === name);
const linked = (from, to) => STATE.connections.some((edge) => edge.from === from && edge.to === to);
const availability = (served, dropped) => served + dropped ? Math.round(100 * served / (served + dropped)) : 0;

function refreshNodes() {
    const options = [["internet", "Internet"], ...STATE.services.filter((service) => service.type !== "monitor").map((service) => [service.id, service.classroomName])];
    for (const id of ["challenge-from", "challenge-to"]) {
        const select = el(id);
        const previous = select.value;
        select.replaceChildren(...options.map(([value, label]) => new Option(label, value)));
        if (options.some(([value]) => value === previous)) select.value = previous;
    }
}

function place(name, type, x, z) {
    const before = STATE.services.length;
    createService(type, new THREE.Vector3(x, 0, z));
    const service = STATE.services.at(-1);
    if (STATE.services.length === before) return false;
    service.classroomName = name;
    refreshNodes();
    return true;
}

function phaseStart(index) {
    run.phase = index;
    run.phaseAt = STATE.elapsedGameTime;
    run.startProcessed = STATE.requestsProcessed;
    run.startFailed = failed();
    run.inspectedMonitor = false;
    if (index === 1) STATE.currentRPS = 5;
    if (index === 2) {
        STATE.currentRPS = 2;
        const db = node("Database");
        db.isDisabled = true;
        db.mesh.material.opacity = 0.3;
        db.mesh.material.transparent = true;
        run.note = "MISSION 2 COMPLETE · Requests are failing. Inspect Monitoring to find the offline service.";
    } else {
        run.note = index === 1 ? "MISSION 1 COMPLETE · Traffic has surged to 5 requests per second. Add capacity." : "";
    }
    render();
}

function finish(timedOut = false) {
    run.active = false;
    STATE.timeScale = 0;
    const completed = timedOut ? run.phase : 3;
    const served = STATE.requestsProcessed;
    const dropped = failed();
    el("challenge-end-title").textContent = timedOut ? "Time is up — review your incident" : "Incident resolved";
    el("challenge-end-summary").innerHTML = `
        <p><strong>Availability:</strong> ${availability(served, dropped)}% (${served} served / ${served + dropped} requests)</p>
        <p><strong>Budget remaining:</strong> $${Math.floor(STATE.money)}</p>
        <p><strong>Objectives completed:</strong> ${completed}/3 — ${PHASES.slice(0, completed).map((p) => p.name).join(", ") || "none"}</p>${timedOut ? `<p><strong>You were stuck on:</strong> ${run.next}</p>` : ""}
        <p>Load balancing routes work to compute; the database serves reads. Monitoring exposes traffic and outages. Capacity absorbs a spike, and incident response restores a failed dependency. Availability counts successful requests against all attempts.</p>`;
    el("challenge-end").hidden = false;
}

function render() {
    if (!run.active) return;
    const phase = PHASES[run.phase];
    const served = STATE.requestsProcessed - run.startProcessed;
    const dropped = failed() - run.startFailed;
    const goodput = getRollingGoodput();
    const primary = node("Primary Compute");
    const backup = node("Backup Compute");
    const db = node("Database");
    const connected = linked(primary.id, db.id);
    const capacity = primary.tier > 1 || !!(backup && linked(node("Load Balancer").id, backup.id) && linked(backup.id, db.id));
    const guide = getChallengeGuide({ phase: run.phase, connected, monitoring: !!node("Monitoring"), inspectedMonitor: run.inspectedMonitor, live: run.live, inspectedTraffic: run.inspectedTraffic, served, capacity, backup: !!backup, backupFromLb: !!(backup && linked(node("Load Balancer").id, backup.id)), backupToDb: !!(backup && linked(backup.id, db.id)), restored: run.restored });
    run.next = guide.title;
    el("challenge-phase").textContent = `${run.phase + 1}/3 · ${phase.name}`;
    el("challenge-goal").textContent = phase.goal;
    el("challenge-step-title").textContent = guide.title;
    el("challenge-step-detail").textContent = guide.detail;
    el("challenge-step-count").textContent = `STEP ${Math.min(guide.progress + 1, guide.total)} OF ${guide.total}`;
    el("challenge-hint").hidden = !run.note;
    el("challenge-hint").textContent = run.note;
    el("challenge-clock").textContent = run.live ? `${Math.floor(STATE.elapsedGameTime / 60)}:${String(Math.floor(STATE.elapsedGameTime % 60)).padStart(2, "0")} / 7:00` : "PAUSED / 7:00";
    el("challenge-budget").textContent = `$${Math.floor(STATE.money)}`;
    el("challenge-cost-note").textContent = run.live ? "UPKEEP ACTIVE · REQUESTS EARN" : "SETUP PAUSED · NO UPKEEP";
    el("challenge-traffic").textContent = run.live ? `${STATE.currentRPS} RPS · ${served} served · ${dropped} failed` : "TRAFFIC OFFLINE · READY WHEN YOU ARE";
    el("challenge-availability").textContent = `Availability ${availability(served, dropped)}% · recent goodput ${goodput === null ? "—" : `${Math.round(goodput * 100)}%`}`;
    document.querySelectorAll(".challenge-mission-rail span").forEach((step, index) => { step.classList.toggle("is-current", index === run.phase); step.classList.toggle("is-complete", index < run.phase); });
    document.querySelectorAll("[data-challenge-focus]").forEach((control) => control.classList.toggle("is-next", control.dataset.challengeFocus === guide.focus));
    el("challenge-monitor").hidden = !run.inspectedMonitor;
    if (run.inspectedMonitor) {
        el("challenge-monitor").textContent = STATE.services.filter((service) => service.type !== "monitor")
            .map((service) => `${service.classroomName}: ${service.isDisabled ? "OFFLINE" : `${Math.round(service.totalLoad * 100)}% load`}`)
            .join(" · ");
    }
    el("challenge-restore").disabled = run.phase !== 2 || !run.inspectedMonitor || run.restored;
    el("challenge-restore").hidden = run.phase !== 2;
    el("challenge-add-monitor").disabled = !!node("Monitoring");
    el("challenge-add-monitor").hidden = run.phase !== 0 || !!node("Monitoring");
    el("challenge-add-backup").disabled = !!node("Backup Compute");
    el("challenge-add-backup").hidden = run.phase !== 1 || !!backup;
    el("challenge-upgrade").disabled = primary.tier > 1;
    el("challenge-upgrade").hidden = run.phase !== 1 || primary.tier > 1;
    el("challenge-link-controls").hidden = run.phase === 2 || (run.phase === 0 && connected) || (run.phase === 1 && (!backup || capacity));
    el("challenge-inspect-traffic").hidden = !run.live || (run.phase === 0 && run.inspectedTraffic);
    el("challenge-inspect-monitor").hidden = run.phase === 1 || run.inspectedMonitor;
    el("challenge-launch").hidden = run.phase !== 0 || run.live;
    el("challenge-launch").disabled = !canStartTraffic({ connected, monitoring: !!node("Monitoring"), inspectedMonitor: run.inspectedMonitor });
}

function challengeTick() {
    if (!run.active || STATE.timeScale === 0) return;
    if (STATE.elapsedGameTime >= MAX_SECONDS) return finish(true);
    const served = STATE.requestsProcessed - run.startProcessed;
    const dropped = failed() - run.startFailed;
    const primary = node("Primary Compute");
    const backup = node("Backup Compute");
    const db = node("Database");
    if (run.phase === 0 && linked(primary.id, db.id) && node("Monitoring") && run.inspectedTraffic && run.inspectedMonitor && served >= 4) phaseStart(1);
    else if (run.phase === 1 && (primary.tier > 1 || (backup && linked(node("Load Balancer").id, backup.id) && linked(backup.id, db.id))) && STATE.elapsedGameTime - run.phaseAt >= 30 && served >= 15 && availability(served, dropped) >= 65) phaseStart(2);
    else if (run.phase === 2 && run.restored && STATE.requestsProcessed - run.restoredAt >= 8 && STATE.elapsedGameTime - run.phaseAt >= 20) return finish();
    if (STATE.elapsedGameTime - run.lastPaint >= 0.5) {
        run.lastPaint = STATE.elapsedGameTime;
        render();
    }
}

function challengeStop() {
    run.active = false;
    document.title = i18n.t("title");
    document.body.classList.remove("challenge-active");
    el("challenge-shell")?.setAttribute("hidden", "");
    el("challenge-end")?.setAttribute("hidden", "");
}

function openChallenge() {
    document.title = "Cloud Incident Challenge — Server Survival";
    el("main-menu-modal").classList.add("hidden");
    el("challenge-intro").hidden = false;
}

function startChallenge() {
    resetGame("campaign");
    document.title = "Cloud Incident Challenge — Server Survival";
    window.campaign?.exit();
    STATE.campaign.currentLevelId = null;
    el("main-menu-modal").classList.add("hidden");
    el("challenge-intro").hidden = true;
    el("challenge-end").hidden = true;
    el("challenge-shell").hidden = false;
    document.body.classList.add("challenge-active");
    STATE.money = 250;
    STATE.currentRPS = 2;
    STATE.trafficDistribution = { STATIC: 0, READ: 1, WRITE: 0, UPLOAD: 0, SEARCH: 0, MALICIOUS: 0, INFERENCE: 0 };
    const built = [
        ["Load Balancer", "alb", -20, 0],
        ["Primary Compute", "compute", -8, 0],
        ["Database", "db", 12, 0],
    ];
    for (const [name, type, x, z] of built) {
        const service = new Service(type, new THREE.Vector3(x, 0, z));
        service.classroomName = name;
        STATE.services.push(service);
    }
    createConnection("internet", node("Load Balancer").id);
    createConnection(node("Load Balancer").id, node("Primary Compute").id);
    refreshNodes();
    // Desktop: slide the board right so the Internet node clears the left brief panel.
    // Absolute (not +=) so restarts don't drift; 40 = default isometric eye offset.
    const shift = window.innerWidth >= 1000 ? 6 : 0;
    cameraTarget.set(-shift, 0, shift);
    camera.position.set(cameraTarget.x + 40, 40, cameraTarget.z + 40);
    el("challenge-from").value = node("Primary Compute").id;
    el("challenge-to").value = node("Database").id;
    Object.assign(run, { active: true, live: false, phase: 0, phaseAt: 0, startProcessed: 0, startFailed: 0, inspectedTraffic: false, inspectedMonitor: false, restored: false, restoredAt: 0, lastPaint: -1, note: "" });
    window.setTimeScale(0);
    render();
}

function challengeAction(action) {
    if (!run.active) return;
    if (action === "launch" && !run.live) {
        const ready = canStartTraffic({ connected: linked(node("Primary Compute").id, node("Database").id), monitoring: !!node("Monitoring"), inspectedMonitor: run.inspectedMonitor });
        if (ready) {
            run.live = true;
            window.setTimeScale(1);
            run.note = "APP ONLINE · The clock and service upkeep have started. Watch the requests arrive.";
        }
    }
    if (action === "monitor") run.note = place("Monitoring", "monitor", 0, 14) ? "Monitoring placed. Inspect it to see service health." : "Not enough budget for Monitoring.";
    if (action === "backup") {
        if (place("Backup Compute", "compute", -8, -12)) {
            el("challenge-from").value = node("Load Balancer").id;
            el("challenge-to").value = node("Backup Compute").id;
            run.note = "Backup placed. Connect Load Balancer → Backup Compute → Database.";
        } else run.note = "Not enough budget for backup Compute.";
    }
    if (action === "connect") {
        const from = el("challenge-from").value;
        const to = el("challenge-to").value;
        const before = STATE.connections.length;
        createConnection(from, to);
        run.note = STATE.connections.length > before ? "Connection created. Traffic can use this route." : "No connection made. Check direction or choose a valid route.";
        if (run.phase === 1 && linked(node("Load Balancer").id, node("Backup Compute")?.id)) {
            el("challenge-from").value = node("Backup Compute").id;
            el("challenge-to").value = node("Database").id;
        }
    }
    if (action === "upgrade") {
        const compute = node("Primary Compute");
        const oldTier = compute.tier;
        compute.upgrade();
        run.note = compute.tier > oldTier ? "Primary Compute upgraded. Watch whether it handles the spike." : "Upgrade unavailable at this budget.";
    }
    if (action === "traffic") {
        if (run.live) {
            run.inspectedTraffic = true;
            run.note = `Traffic: ${STATE.currentRPS} READ requests/second; ${STATE.requestsProcessed} served and ${failed()} failed so far.`;
        } else run.note = "Traffic is paused. Complete the setup steps, then start traffic.";
    }
    if (action === "monitoring") {
        if (!node("Monitoring")) run.note = "Place Monitoring first to unlock service health.";
        else {
            run.inspectedMonitor = true;
            run.note = STATE.services.some((service) => service.isDisabled) ? "Monitoring alert: Database OFFLINE. Restore it to resume reads." : "Monitoring is live. Check service load and recent goodput below.";
        }
    }
    if (action === "restore" && run.phase === 2 && run.inspectedMonitor && !run.restored) {
        const db = node("Database");
        // ponytail: guided operator restart is free so a depleted team can always recover.
        db.isDisabled = false;
        db.mesh.material.opacity = 1;
        db.mesh.material.transparent = false;
        db.health = 100;
        db.updateHealthVisual();
        run.restored = true;
        run.restoredAt = STATE.requestsProcessed;
        run.note = "Database restored. Confirm that successful reads resume.";
    }
    render();
}

export { challengeTick, challengeStop, openChallenge, startChallenge, challengeAction };
