// Every tunable number in the game. Balance work only edits this file.
export const CONFIG = {
  startBudget: 120,
  income: 0.03,          // $ per successfully served request
  roundSeconds: 75,
  onsetBase: 5,
  onsetJitter: 3,
  baseRps: [20, 24, 28, 32, 36],
  jitter: [0.9, 1.1],
  appCap: 40,            // rps per app server
  maxServers: 4,
  dbCap: 30,
  readShare: 0.8,
  cacheHit: 0.6,
  warmSeconds: 20,
  replicaShare: 0.5,     // share of cache-missing reads the replica takes
  spikeMult: 2.4,
  floodMult: 3,
  firewallPass: 0.1,
  blockPass: 0.01,
  rateLimitCap: 0.8,
  scaleDelay: 5,
  restartSeconds: 20,
  failoverSeconds: 2,
  rollbackSeconds: 3,
  blipSeconds: 5,        // rolling back when nothing is wrong causes a brief bad deploy
  stableAvail: 0.95,
  stableSeconds: 10,
  fastSeconds: 30,
  starAvail: 0.9,
  shop: {
    app: { cost: 40, max: 4 },
    replica: { cost: 80, max: 1 },
    monitoring: { cost: 30, max: 1 },
    firewall: { cost: 40, max: 1 },
  },
  actions: {
    scale: { cost: 30 },
    restart: { cost: 0 },
    failover: { cost: 0, needs: "replica" },
    rollback: { cost: 0 },
    warm: { cost: 20 },
    ratelimit: { cost: 15 },
    block: { cost: 0, needs: "firewall" },
  },
};
