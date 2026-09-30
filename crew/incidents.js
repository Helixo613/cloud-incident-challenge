// Incident definitions. `fixes` are the actions that actually resolve it;
// `hypotheses` are the four diagnosis choices (order is shuffled per round).
export const INCIDENTS = {
  spike: { title: "Traffic spike", correct: "capacity", fixes: ["scale"], hypotheses: ["capacity", "db-small", "network", "bad-release"] },
  "bad-deploy": { title: "Bad release", correct: "bad-release", fixes: ["rollback"], hypotheses: ["bad-release", "capacity", "db-crash", "network"] },
  "db-crash": { title: "Database down", correct: "db-crash", fixes: ["failover", "restart"], hypotheses: ["db-crash", "capacity", "bad-release", "network"] },
  "cache-flush": { title: "Cold cache", correct: "cache-cold", fixes: ["warm"], hypotheses: ["cache-cold", "db-small", "capacity", "attack"] },
  "bot-flood": { title: "Bot flood", correct: "attack", fixes: ["block"], hypotheses: ["attack", "capacity", "network", "db-small"] },
};
export const MIDDLE = ["bad-deploy", "db-crash", "cache-flush"];
