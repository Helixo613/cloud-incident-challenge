// All player-facing words. Clues are deliberately vague without Monitoring.
export const HYPOTHESES = {
  capacity: "We don't have enough app servers for this traffic",
  "db-small": "The database is too small",
  network: "The network between machines is failing",
  "bad-release": "The latest release is broken",
  "db-crash": "The database has crashed",
  "cache-cold": "The cache went cold and the database is drowning",
  attack: "Malicious bots are flooding us",
};

export const ACTION_UI = {
  scale: { name: "Add app server", note: "+1 server for this round" },
  restart: { name: "Restart database", note: "≈20 s of downtime" },
  failover: { name: "Fail over to replica", note: "≈2 s blip, uses up the replica" },
  rollback: { name: "Roll back release", note: "Undo the latest deploy" },
  warm: { name: "Warm the cache", note: "Refills over ≈20 s" },
  ratelimit: { name: "Rate-limit", note: "Cap traffic at 80% of capacity" },
  block: { name: "Block bad traffic", note: "The firewall drops the bots" },
};

export const SHOP_UI = {
  app: { name: "App server", note: "+40 req/s of capacity" },
  replica: { name: "DB replica", note: "Shares reads · backup if the DB dies" },
  monitoring: { name: "Monitoring", note: "Exact numbers and logs" },
  firewall: { name: "Firewall", note: "Stops most bad traffic" },
};

export const STARS = [
  ["avail", "Stayed up (90%+ average)"],
  ["fast", "Fixed within 30 s"],
  ["diag", "Diagnosed before fixing"],
];

export const DEBRIEF = {
  spike: { title: "Traffic spike", what: "Traffic more than doubled and one app server couldn't keep up. The database was never the problem.", pro: "Scale out the app tier (or keep headroom before the rush). Check which tier is saturated before touching the others." },
  "bad-deploy": { title: "Bad release", what: "Errors jumped right after a release while load stayed normal, so capacity was not the issue.", pro: "Roll back first, investigate second. When errors rise but load doesn't, suspect the change, not the traffic." },
  "db-crash": { title: "Database down", what: "The primary database went offline: writes failed and every read that missed the cache failed too.", pro: "Fail over to a replica if you have one (seconds). A restart works but costs a long outage. Replicas are insurance." },
  "cache-flush": { title: "Cold cache", what: "The cache was wiped, so every read hit the database and its load exploded.", pro: "Warm the cache and protect the database. Adding app servers or guessing a bigger DB doesn't fix a cold cache." },
  "bot-flood": { title: "Bot flood", what: "Most of the traffic was malicious, eating capacity that real users needed.", pro: "Block at the edge with a firewall. Scaling up just pays to serve the attackers." },
};

const pct = (x) => `${Math.round(x * 100)}%`;

// Status lines for a tapped service. `s` is a sim snapshot, `m` = Monitoring owned (numbers only with it).
export function clueFor(kind, s, m) {
  switch (kind) {
    case "users":
      return { lines: [m ? `USERS: ${pct(s.avail)} of requests succeed` : s.avail >= 0.95 ? "USERS: pages load normally" : s.avail >= 0.6 ? "USERS: slow pages, some requests fail" : "USERS: site unreachable for most users"], gauge: { label: "Happy users", value: s.avail } };
    case "firewall":
      return { lines: [m ? (s.badIn > 0.5 ? `FIREWALL: ${Math.round(s.badIn)} req/s of suspicious traffic getting through` : "FIREWALL: no suspicious traffic") : (s.badIn > 0.5 ? "FIREWALL: unusual traffic pattern at the edge" : "FIREWALL: quiet")], gauge: null };
    case "lb":
      return { lines: [m ? `BALANCER: routing ${Math.round(s.incoming)} req/s` : "BALANCER: spreading requests across the app servers"], gauge: null };
    case "app": {
      const a = s.appLoad;
      if (!m) return { lines: [a >= 1 ? "APP: saturated, requests queueing" : a >= 0.7 ? "APP: running hot" : "APP: healthy"], gauge: null };
      return { lines: [`APP: CPU ${pct(a)}`, s.deployBad ? "≈50% of responses are HTTP 500 since the last release" : a >= 1 ? "CPU saturated, requests queueing" : "Error rate normal"], gauge: { label: "CPU", value: a } };
    }
    case "db": {
      if (s.dbDown) return { lines: m ? ["DATABASE: OFFLINE, connection refused", "Writes are failing"] : ["DATABASE: not responding"], gauge: null };
      const d = s.dbLoad;
      if (!m) return { lines: [d >= 1 ? "DATABASE: overwhelmed by queries" : d >= 0.7 ? "DATABASE: busy" : "DATABASE: healthy"], gauge: null };
      return { lines: [`DATABASE: load ${pct(d)}`, s.hit < 0.3 ? "Almost no cache hits, every read reaches the database" : "The cache absorbs most reads"], gauge: { label: "DB load", value: d } };
    }
    case "cache":
      return { lines: m ? [`CACHE: hit rate ${pct(s.hit)}`, s.hit < 0.3 ? "Cold: hit rate collapsed" : "Serving most reads"] : [s.hit < 0.3 ? "CACHE: cold, hit rate collapsed" : "CACHE: warm, serving most reads"], gauge: m ? { label: "Hit rate", value: s.hit / 0.6 } : null };
    case "replica":
      return { lines: [s.dbDown ? "REPLICA: standby copy, can still serve reads" : "REPLICA: in sync with the primary"], gauge: null };
    default:
      return { lines: [], gauge: null };
  }
}

// One line under the scene: user reports, or a log line when Monitoring is owned.
export function tickerLine(s, m, id) {
  if (!s.onset) return "All quiet…";
  if (!m) return s.avail >= 0.95 ? "Support: no complaints" : s.avail >= 0.6 ? "Support: users report slow pages and errors" : "Support: users report the site is down";
  if (s.avail >= 0.95) return "LOG: all systems nominal";
  if (id === "bad-deploy") return "LOG: release v2.4.1 deployed · error rate 50%";
  if (id === "db-crash") return "LOG: db-primary connection refused";
  if (id === "cache-flush") return `LOG: cache hit rate ${pct(s.hit)}`;
  if (id === "bot-flood") return `LOG: ${Math.round(s.badIn)} req/s from 3 IP addresses`;
  return `LOG: ${Math.round(s.incoming)} req/s vs ${s.appCap} capacity`;
}
