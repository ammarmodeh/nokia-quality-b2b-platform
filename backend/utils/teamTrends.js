// Teams Trends: per-team accountable DVOC for a period, using the app's existing rules.
//
// Rules reused (not new):
// - Accountable: any RCA row's teamAccountability is "Yes" (client utils/accountability.js,
//   onlineDataController.onlineSummary).
// - DVOC / Sample %  = accountable / (team samples − non-accountable DVOC) × 100   (onlineSummary)
// - DVOC / Online %  = accountable / online transactions × 100                      (onlineSummary)
// - REACH ownership: every RCA row whose owner (`responsible`) is REACH, accountable or not — the same
//   count as the dashboard's "Top owners" (a task with two REACH rows counts twice). User rule 2026-10-28.
// Each task counts once per team, whatever the number of RCA rows.
// Samples and online volumes are stored per team per month and are used as whole monthly figures
// (user rule 2026-10-27: a week uses its month's full samples, never a pro-rated fraction). The client
// picks the months (see client trendPeriods.sampleMonths). An optional per-month `weight` is still
// accepted by the API but the app always sends whole months (weight 1).

const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);

export const isAccountable = (task) => list(task?.teamAccountability).some((x) => String(x).trim().toLowerCase() === "yes");
// Owner values per RCA row; legacy single strings may hold several owners ("Reach, OJO").
const owners = (task) => list(task?.responsible).flatMap((x) => String(x ?? "").split(/[,;|]/)).map((x) => x.trim()).filter(Boolean);
/** Number of RCA rows owned by REACH. */
export const reachRows = (task) => owners(task).filter((x) => x.toLowerCase().includes("reach")).length;
export const isReachOwned = (task) => reachRows(task) > 0;
/**
 * Name key that ignores case, extra spaces and common Arabic spelling variants
 * (أ/إ/آ→ا, ة→ه, ى→ي, diacritics and tatweel removed), so "أحمد  محمود" and "احمد محمود" match.
 */
export const teamKey = (name) =>
  String(name || "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // harakat, superscript alef, tatweel
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627") // أ إ آ ٱ → ا
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/\u0649/g, "\u064A") // ى → ي
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
const codeKey = (c) => String(c ?? "").trim().toUpperCase();

const pct = (num, den, digits) => (den > 0 ? +((num / den) * 100).toFixed(digits) : null);

/**
 * @param tasks    DVOC tasks in the period: { teamId?, teamName, teamAccountability, responsible }
 * @param samples  team monthly samples for the period's months: { teamId?, teamName, sampleSize, weight? }
 * @param online   team monthly online rows for the period's months: { teamCode?, teamName, onlineTransactions, weight? }
 *                 weight = share of that month inside the period (default 1)
 * @param teams    field teams: { _id, teamName, teamCompany, teamCode, isTerminated }
 * @param ratesAvailable false when no sample months are given
 *
 * Each record is matched to a field team by id, then team code, then normalised name. Records that
 * match none keep a row of their own, marked `unlinked` with the sources they came from, so names
 * missing from Field Teams are visible instead of silently inflating the team count.
 */
export const buildTeamTrends = ({ tasks = [], samples = [], online = [], teams = [], ratesAvailable = true }) => {
  const rows = new Map();
  const byId = new Map();
  const byCode = new Map();
  const byName = new Map();
  const blank = (key, teamName) => ({ key, teamName, teamId: null, teamCompany: null, teamCode: null, isTerminated: false, unlinked: false, sources: [], dvoc: 0, accountable: 0, notAccountable: 0, reachOwned: 0, accountableNoReach: 0, samples: null, online: null });

  for (const t of teams) {
    if (!t.teamName && !t._id) continue;
    const key = t._id ? `id:${t._id}` : `name:${teamKey(t.teamName)}`;
    const r = { ...blank(key, String(t.teamName || "").trim()), teamId: t._id ? String(t._id) : null, teamCompany: t.teamCompany || null, teamCode: t.teamCode || null, isTerminated: Boolean(t.isTerminated) };
    rows.set(key, r);
    if (t._id) byId.set(String(t._id), r);
    if (codeKey(t.teamCode)) byCode.set(codeKey(t.teamCode), r);
    if (teamKey(t.teamName) && !byName.has(teamKey(t.teamName))) byName.set(teamKey(t.teamName), r);
  }

  const resolve = (rec, source) => {
    const hit = (rec.teamId && byId.get(String(rec.teamId))) || (codeKey(rec.teamCode) && byCode.get(codeKey(rec.teamCode))) || byName.get(teamKey(rec.teamName));
    if (hit) return hit;
    const nk = teamKey(rec.teamName);
    if (!nk) return null;
    const key = `unlinked:${nk}`;
    if (!rows.has(key)) rows.set(key, { ...blank(key, String(rec.teamName).trim()), unlinked: true });
    const r = rows.get(key);
    if (!r.sources.includes(source)) r.sources.push(source);
    return r;
  };

  for (const t of tasks) {
    const r = resolve(t, "DVOC tasks");
    if (!r) continue;
    r.dvoc++;
    r.reachOwned += reachRows(t);
    if (isAccountable(t)) {
      r.accountable++;
      if (!isReachOwned(t)) r.accountableNoReach++; // data check: accountable but no REACH owner
    } else r.notAccountable++;
  }
  // Denominators are summed only when present, so "no data entered" (null) stays distinct from 0.
  for (const s of samples) {
    const r = resolve(s, "team samples");
    if (r) r.samples = (r.samples || 0) + (Number(s.sampleSize) || 0) * (s.weight ?? 1);
  }
  for (const o of online) {
    const r = resolve(o, "online data");
    if (r) r.online = (r.online || 0) + (Number(o.onlineTransactions) || 0) * (o.weight ?? 1);
  }

  const out = [];
  for (const r of rows.values()) {
    // Terminated teams with nothing in the period are noise.
    if (r.isTerminated && !r.dvoc && !r.samples && !r.online) continue;
    const adjustedSamples = r.samples == null ? null : Math.max(0, r.samples - r.notAccountable);
    const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
    out.push({
      ...r,
      samples: round1(r.samples),
      online: round1(r.online),
      adjustedSamples: round1(adjustedSamples),
      perSamplePct: ratesAvailable && adjustedSamples != null ? pct(r.accountable, adjustedSamples, 1) : null,
      perOnlinePct: ratesAvailable && r.online != null ? pct(r.accountable, r.online, 2) : null,
    });
  }
  return out;
};

export const METRICS = {
  perSample: { field: "perSamplePct", label: "Accountable DVOC / survey sample %" },
  perOnline: { field: "perOnlinePct", label: "Accountable DVOC / online %" },
  reach: { field: "reachOwned", label: "REACH-owned RCA rows" },
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
    fieldTeams: rows.filter((r) => !r.unlinked).length,
    unlinked: rows.filter((r) => r.unlinked).length,
    activeTeams: rows.filter((r) => r.dvoc > 0).length,
    dvoc: sum("dvoc"),
    accountable,
    notAccountable: sum("notAccountable"),
    reachOwned: sum("reachOwned"),
    accountableNoReach: sum("accountableNoReach"),
    samples: hasSamples ? sum("samples") : null,
    online: hasOnline ? online : null,
    perSamplePct: hasSamples && rows.some((r) => r.perSamplePct != null) ? pct(accountable, adjusted, 1) : null,
    perOnlinePct: hasOnline && rows.some((r) => r.perOnlinePct != null) ? pct(accountable, online, 2) : null,
  };
};

/**
 * "2026-9,2026-10:0.2258" → [{year:2026, month:9, weight:1}, {year:2026, month:10, weight:0.2258}].
 * weight = share of the month inside the period (0 < w ≤ 1, default 1); invalid entries dropped.
 */
export const parseMonths = (s) =>
  String(s || "")
    .split(",")
    .map((x) => {
      const [ym, w] = x.trim().split(":");
      const [y, m] = String(ym).split("-").map(Number);
      return { year: y, month: m, weight: w === undefined ? 1 : Number(w) };
    })
    .filter(({ year, month, weight }) => Number.isInteger(year) && year > 2000 && Number.isInteger(month) && month >= 1 && month <= 12 && weight > 0 && weight <= 1);
