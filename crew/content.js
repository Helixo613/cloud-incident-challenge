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
  scale: { icon: "➕", name: "Add app server", note: "+1 server for this round" },
  restart: { icon: "🔄", name: "Restart database", note: "≈20 s of downtime" },
  failover: { icon: "🛟", name: "Fail over to replica", note: "≈2 s blip, uses up the replica" },
  rollback: { icon: "⏪", name: "Roll back release", note: "Undo the latest deploy" },
  warm: { icon: "🔥", name: "Warm the cache", note: "Refills over ≈20 s" },
  ratelimit: { icon: "🚦", name: "Rate-limit", note: "Cap traffic at 80% of capacity" },
  block: { icon: "🛡️", name: "Block bad traffic", note: "The firewall drops the bots" },
};

export const SHOP_UI = {
  app: { icon: "🖥️", name: "App server", note: "+40 req/s of capacity" },
  replica: { icon: "📀", name: "DB replica", note: "Shares reads · backup if the DB dies" },
  monitoring: { icon: "📡", name: "Monitoring", note: "Exact numbers and logs" },
  firewall: { icon: "🧱", name: "Firewall", note: "Stops most bad traffic" },
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

// What a creature says when tapped. `s` is a sim snapshot, `m` = Monitoring owned.
export function clueFor(kind, s, m) {
  switch (kind) {
    case "users":
      return { lines: [s.avail >= 0.95 ? "Everything works!" : s.avail >= 0.6 ? "Pages are slow and some fail…" : "The site is DOWN!"], gauge: { label: "Happy users", value: s.avail } };
    case "firewall":
      return { lines: [m ? (s.badIn > 0.5 ? `Suspicious traffic: ${Math.round(s.badIn)} req/s got through` : "Nothing suspicious") : (s.badIn > 0.5 ? "Lots of weird visitors…" : "Quiet at the gate.")], gauge: null };
    case "lb":
      return { lines: [m ? `Routing ${Math.round(s.incoming)} req/s` : "Sending guests to the app servers."], gauge: null };
    case "app": {
      const a = s.appLoad;
      if (!m) return { lines: [a >= 1 ? "I can't keep up!" : a >= 0.7 ? "Getting hot in here…" : "Doing fine."], gauge: null };
      return { lines: [`CPU ${pct(a)}`, s.deployBad ? "Half my replies are errors — it started right after the release." : a >= 1 ? "Requests are queueing up." : "Error rate normal."], gauge: { label: "CPU", value: a } };
    }
    case "db": {
      if (s.dbDown) return { lines: m ? ["OFFLINE — connection refused", "Writes are failing."] : ["…"], gauge: null };
      const d = s.dbLoad;
      if (!m) return { lines: [d >= 1 ? "I'm drowning in queries!" : d >= 0.7 ? "Busy, busy…" : "Relaxed."], gauge: null };
      return { lines: [`Load ${pct(d)}`, s.hit < 0.3 ? "Almost no cache hits — every read lands on me." : "The cache absorbs most reads."], gauge: { label: "DB load", value: d } };
    }
    case "cache":
      return { lines: m ? [`Hit rate ${pct(s.hit)}`, s.hit < 0.3 ? "I was wiped. I'm empty!" : "Serving most reads."] : [s.hit < 0.3 ? "Brrr… I feel empty." : "Full of goodies."], gauge: m ? { label: "Hit rate", value: s.hit / 0.6 } : null };
    case "replica":
      return { lines: [s.dbDown ? "I'm the backup — I can still serve reads." : "Keeping a copy of the data."], gauge: null };
    default:
      return { lines: [], gauge: null };
  }
}

// One line under the scene: user complaints, or a log line when Monitoring is owned.
export function tickerLine(s, m, id) {
  if (!s.onset) return "All quiet…";
  if (!m) return s.avail >= 0.95 ? "Users: all good" : s.avail >= 0.6 ? "Users: \"It's slow and I get errors\"" : "Users: \"Your site is down!!\"";
  if (s.avail >= 0.95) return "LOG: all systems nominal";
  if (id === "bad-deploy") return "LOG: release v2.4.1 deployed · error rate 50%";
  if (id === "db-crash") return "LOG: db-primary connection refused";
  if (id === "cache-flush") return `LOG: cache hit rate ${pct(s.hit)}`;
  if (id === "bot-flood") return `LOG: ${Math.round(s.badIn)} req/s from 3 IP addresses`;
  return `LOG: ${Math.round(s.incoming)} req/s vs ${s.appCap} capacity`;
}
