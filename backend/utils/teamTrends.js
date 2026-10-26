// Teams Trends: per-team accountable DVOC for a period, using the app's existing rules.
//
// Rules reused (not new):
// - Accountable: any RCA row's teamAccountability is "Yes" (client utils/accountability.js,
//   onlineDataController.onlineSummary).
// - DVOC / Sample %  = accountable / (team samples − non-accountable DVOC) × 100   (onlineSummary)
// - DVOC / Online %  = accountable / online transactions × 100                      (onlineSummary)
// - REACH ownership: the task's `responsible` contains "reach" (FieldTeamPortal "Owner Reach").
// Each task counts once per team, whatever the number of RCA rows.

const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);

export const isAccountable = (task) => list(task?.teamAccountability).some((x) => String(x).trim().toLowerCase() === "yes");
export const isReachOwned = (task) => list(task?.responsible).some((x) => String(x ?? "").toLowerCase().includes("reach"));
export const teamKey = (name) => String(name || "").trim().toLowerCase();

const pct = (num, den, digits) => (den > 0 ? +((num / den) * 100).toFixed(digits) : null);

/**
 * @param tasks    DVOC tasks in the period: { teamName, teamAccountability, responsible }
 * @param samples  team monthly samples for the period's full months: { teamName, sampleSize }
 * @param online   team monthly online rows for the period's full months: { teamName, onlineTransactions }
 * @param teams    field teams to include even without activity: { _id, teamName, teamCompany, teamCode, isTerminated }
 * @param ratesAvailable false when the period isn't whole months (denominators are stored per month)
 */
export const buildTeamTrends = ({ tasks = [], samples = [], online = [], teams = [], ratesAvailable = true }) => {
  const rows = new Map();
  const row = (name) => {
    const key = teamKey(name);
    if (!key) return null;
    if (!rows.has(key)) {
      rows.set(key, { key, teamName: String(name).trim(), teamId: null, teamCompany: null, teamCode: null, isTerminated: false, dvoc: 0, accountable: 0, notAccountable: 0, reachAccountable: 0, samples: null, online: null });
    }
    return rows.get(key);
  };

  for (const t of teams) {
    const r = row(t.teamName);
    if (!r) continue;
    Object.assign(r, { teamName: t.teamName.trim(), teamId: t._id ? String(t._id) : null, teamCompany: t.teamCompany || null, teamCode: t.teamCode || null, isTerminated: Boolean(t.isTerminated) });
  }
  for (const t of tasks) {
    const r = row(t.teamName);
    if (!r) continue;
    r.dvoc++;
    if (isAccountable(t)) {
      r.accountable++;
      if (isReachOwned(t)) r.reachAccountable++;
    } else r.notAccountable++;
  }
  // Denominators are summed only when present, so "no data entered" (null) stays distinct from 0.
  for (const s of samples) {
    const r = row(s.teamName);
    if (r) r.samples = (r.samples || 0) + (Number(s.sampleSize) || 0);
  }
  for (const o of online) {
    const r = row(o.teamName);
    if (r) r.online = (r.online || 0) + (Number(o.onlineTransactions) || 0);
  }

  const out = [];
  for (const r of rows.values()) {
    // Terminated teams with nothing in the period are noise.
    if (r.isTerminated && !r.dvoc && !r.samples && !r.online) continue;
    const adjustedSamples = r.samples == null ? null : Math.max(0, r.samples - r.notAccountable);
    out.push({
      ...r,
      adjustedSamples,
      perSamplePct: ratesAvailable && adjustedSamples != null ? pct(r.accountable, adjustedSamples, 1) : null,
      perOnlinePct: ratesAvailable && r.online != null ? pct(r.accountable, r.online, 2) : null,
    });
  }
  return out;
};

export const METRICS = {
  perSample: { field: "perSamplePct", label: "Accountable DVOC / survey sample %" },
  perOnline: { field: "perOnlinePct", label: "Accountable DVOC / online %" },
  reach: { field: "reachAccountable", label: "Accountable DVOC · REACH ownership" },
  accountable: { field: "accountable", label: "Accountable DVOC" },
};

/** Worst first. Rows without a value for the metric (no denominator) go last, unranked. */
export const rankTeams = (rows, metric = "perSample") => {
  const field = (METRICS[metric] || METRICS.perSample).field;
  const ranked = rows.filter((r) => r[field] != null).sort((a, b) => b[field] - a[field] || b.accountable - a.accountable || a.teamName.localeCompare(b.teamName));
  const unranked = rows.filter((r) => r[field] == null).sort((a, b) => b.accountable - a.accountable || a.teamName.localeCompare(b.teamName));
  let rank = 0;
  let prev;
  ranked.forEach((r, i) => {
    if (r[field] !== prev) rank = i + 1; // ties share a rank
    prev = r[field];
    r.rank = rank;
  });
  unranked.forEach((r) => (r.rank = null));
  return [...ranked, ...unranked];
};

export const summarize = (rows) => {
  const sum = (f) => rows.reduce((n, r) => n + (r[f] || 0), 0);
  const hasSamples = rows.some((r) => r.adjustedSamples != null);
  const hasOnline = rows.some((r) => r.online != null);
  const accountable = sum("accountable");
  const adjusted = sum("adjustedSamples");
  const online = sum("online");
  return {
    teams: rows.length,
    activeTeams: rows.filter((r) => r.dvoc > 0).length,
    dvoc: sum("dvoc"),
    accountable,
    notAccountable: sum("notAccountable"),
    reachAccountable: sum("reachAccountable"),
    samples: hasSamples ? sum("samples") : null,
    online: hasOnline ? online : null,
    perSamplePct: hasSamples && rows.some((r) => r.perSamplePct != null) ? pct(accountable, adjusted, 1) : null,
    perOnlinePct: hasOnline && rows.some((r) => r.perOnlinePct != null) ? pct(accountable, online, 2) : null,
  };
};

/** "2026-9,2026-10" → [{year:2026, month:9}, …]; invalid entries dropped. */
export const parseMonths = (s) =>
  String(s || "")
    .split(",")
    .map((x) => x.trim().split("-").map(Number))
    .filter(([y, m]) => Number.isInteger(y) && y > 2000 && Number.isInteger(m) && m >= 1 && m <= 12)
    .map(([year, month]) => ({ year, month }));
