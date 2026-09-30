import { describe, expect, it } from "vitest";
import { canStartTraffic, getChallengeGuide } from "../src/classroom-guide.js";

describe("Cloud Crew mission guide", () => {
    it("walks beginners through the paused launch before traffic starts", () => {
        const state = { phase: 0, connected: false, monitoring: false, inspectedMonitor: false, live: false, inspectedTraffic: false, served: 0 };
        expect(getChallengeGuide(state).focus).toBe("connect");
        state.connected = true;
        expect(getChallengeGuide(state).focus).toBe("monitor");
        state.monitoring = true;
        expect(getChallengeGuide(state).focus).toBe("monitoring");
        state.inspectedMonitor = true;
        expect(getChallengeGuide(state).focus).toBe("launch");
        state.live = true;
        expect(getChallengeGuide(state).focus).toBe("traffic");
        state.inspectedTraffic = true;
        expect(getChallengeGuide(state).title).toContain("4 requests");
    });

    it("points to capacity, diagnosis, and recovery in later missions", () => {
        expect(getChallengeGuide({ phase: 1, capacity: false }).focus).toBe("upgrade");
        expect(getChallengeGuide({ phase: 1, capacity: true }).focus).toBe("traffic");
        expect(getChallengeGuide({ phase: 2, inspectedMonitor: false }).focus).toBe("monitoring");
        expect(getChallengeGuide({ phase: 2, inspectedMonitor: true, restored: false }).focus).toBe("restore");
        expect(getChallengeGuide({ phase: 2, inspectedMonitor: true, restored: true }).focus).toBe("traffic");
    });

    it("guides teams who choose backup Compute instead of an upgrade", () => {
        expect(getChallengeGuide({ phase: 1, capacity: false, backup: true, backupFromLb: false }).title).toContain("Load Balancer");
        expect(getChallengeGuide({ phase: 1, capacity: false, backup: true, backupFromLb: true, backupToDb: false }).title).toContain("Database");
    });

    it("does not start the clock until the route and Monitoring are ready", () => {
        expect(canStartTraffic({ connected: false, monitoring: true, inspectedMonitor: true })).toBe(false);
        expect(canStartTraffic({ connected: true, monitoring: false, inspectedMonitor: true })).toBe(false);
        expect(canStartTraffic({ connected: true, monitoring: true, inspectedMonitor: false })).toBe(false);
        expect(canStartTraffic({ connected: true, monitoring: true, inspectedMonitor: true })).toBe(true);
    });
});
