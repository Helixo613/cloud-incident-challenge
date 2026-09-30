// The tutorial follows the actual simulation state, so an action never leaves
// the player staring at an obsolete instruction.
export const canStartTraffic = ({ connected, monitoring, inspectedMonitor }) => !!(connected && monitoring && inspectedMonitor);

export function getChallengeGuide(state) {
    if (state.phase === 0) {
        if (!state.connected) return { title: "Repair the missing route", detail: "Select Primary Compute → Database below, then press Connect. Requests need this path to reach the data.", focus: "connect", progress: 0, total: 5 };
        if (!state.monitoring) return { title: "Add your lookout", detail: "Place Monitoring. It shows whether your services are healthy when trouble arrives.", focus: "monitor", progress: 1, total: 5 };
        if (!state.inspectedMonitor) return { title: "Check the network", detail: "Inspect Monitoring to learn what a healthy service looks like.", focus: "monitoring", progress: 2, total: 5 };
        if (!state.live) return { title: "Open for traffic", detail: "Your route is ready. Start traffic when your team is ready; only then do the clock and running costs begin.", focus: "launch", progress: 3, total: 5 };
        if (!state.inspectedTraffic) return { title: "Watch your customers", detail: "Inspect traffic to see the requests flowing through the app.", focus: "traffic", progress: 4, total: 5 };
        return { title: "Serve 4 requests", detail: "Watch the served count rise. A working route turns incoming requests into successful responses.", focus: "traffic", progress: 4, total: 5 };
    }
    if (state.phase === 1) {
        if (!state.capacity && state.backup && !state.backupFromLb) return { title: "Connect Load Balancer → Backup", detail: "Select Load Balancer as From and Backup Compute as To, then connect the route.", focus: "connect", progress: 0, total: 2 };
        if (!state.capacity && state.backup && !state.backupToDb) return { title: "Connect Backup → Database", detail: "Now connect Backup Compute to Database so it can answer reads.", focus: "connect", progress: 0, total: 2 };
        if (!state.capacity) return { title: "The traffic spike is here", detail: "Upgrade Primary Compute to handle the rush. A backup Compute is an optional alternative.", focus: "upgrade", progress: 0, total: 2 };
        return { title: "Hold the line", detail: "Keep serving traffic for 30 seconds. Watch availability; the target is 65% or better.", focus: "traffic", progress: 1, total: 2 };
    }
    if (!state.inspectedMonitor) return { title: "Find the failed service", detail: "Requests are failing. Inspect Monitoring to identify which service went offline.", focus: "monitoring", progress: 0, total: 3 };
    if (!state.restored) return { title: "Bring the database back", detail: "Monitoring found the outage. Restore Database to recover the app; recovery is free.", focus: "restore", progress: 1, total: 3 };
    return { title: "Confirm the recovery", detail: "Watch for 8 more successful requests to prove the app is serving customers again.", focus: "traffic", progress: 2, total: 3 };
}
