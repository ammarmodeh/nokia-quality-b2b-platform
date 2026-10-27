// SLA analytics: team responsiveness from SLA records (sla_records).
//
// Outcome rules are the existing ones (slaController.getTeamSlaPerformance):
// - met:      status "met", or the team is exempt (customer-requested reschedule)
// - breached: no response, status "breached", or still active past its deadline (not exempt)
// - open:     active and still within its deadline
// Compliance = met ÷ (met + breached). Cancelled / rescheduled-without-outcome records are open or excluded
// as the status says; cancelled records are not counted.

const H = 3600 * 1000;
const round1 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);

/** "met" | "breached" | "open" | "cancelled" */
export const classifySla = (s, now = Date.now()) => {
  if (s.status === "cancelled") return "cancelled";
  if (s.status === "met" || s.teamExempt) return "met";
  if (s.noResponse || s.status === "breached") return "breached";
  if (s.status === "active" || s.status === "rescheduled") return new Date(s.targetDate).getTime() < now ? "breached" : "open";
  return "open";
};

/** Hours from ticket creation to the team's response (null while there is none). */
export const responseHours = (s) => {
  const start = s.ticketCreationDate || s.startDate;
  if (s.responseDate && start) return (new Date(s.responseDate) - new Date(start)) / H;
  if (typeof s.slaDifferenceHours === "number" && Number.isFinite(s.slaDifferenceHours)) return s.slaDifferenceHours;
  return null;
};

/** Hours past the deadline: for answered tickets response − SLA; for open overdue ones now − deadline. */
export const overrunHours = (s, outcome, now = Date.now()) => {
  if (outcome !== "breached") return 0;
  const resp = responseHours(s);
  if (resp != null && !s.noResponse) return Math.max(0, resp - (Number(s.slaHours) || 24));
  const end = s.noResponse ? new Date(s.resolvedAt || now).getTime() : now;
  return Math.max(0, (end - new Date(s.targetDate).getTime()) / H);
};

const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const p90 = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.ceil(0.9 * s.length) - 1)];
};
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

// Response time relative to the SLA allowance, for the distribution chart.
export const RESPONSE_BUCKETS = [
  { key: "fast", label: "Within half the SLA", test: (r, sla) => r <= sla / 2 },
  { key: "onTime", label: "Within the SLA", test: (r, sla) => r <= sla },
  { key: "late24", label: "Up to 24 h late", test: (r, sla) => r <= sla + 24 },
  { key: "late72", label: "1–3 days late", test: (r, sla) => r <= sla + 72 },
  { key: "late", label: "More than 3 days late", test: () => true },
];
const bucketOf = (resp, slaHours) => RESPONSE_BUCKETS.find((b) => b.test(resp, slaHours)).key;

const emptyStats = () => ({ total: 0, met: 0, breached: 0, open: 0, overdueOpen: 0, noResponse: 0, exempt: 0, renewals: 0, responses: [], overruns: [], worstOpenOverdueHours: 0 });

const addTo = (st, s, outcome, now) => {
  st.total++;
  st[outcome]++;
  if (s.noResponse) st.noResponse++;
  if (s.teamExempt) st.exempt++;
  st.renewals += s.renewals?.length || 0;
  const resp = responseHours(s);
  if (resp != null && !s.noResponse) st.responses.push(resp);
  if (outcome === "breached") {
    const over = overrunHours(s, outcome, now);
    st.overruns.push(over);
    const openOverdue = (s.status === "active" || s.status === "rescheduled") && !s.noResponse;
    if (openOverdue) {
      st.overdueOpen++;
      st.worstOpenOverdueHours = Math.max(st.worstOpenOverdueHours, over);
    }
  }
};

const finish = (st) => {
  const closed = st.met + st.breached;
  const { responses, overruns, ...rest } = st;
  return {
    ...rest,
    closed,
    breachRate: pct(st.breached, closed),
    complianceRate: pct(st.met, closed),
    avgResponseHours: round1(responses.length ? responses.reduce((a, b) => a + b, 0) / responses.length : null),
    medianResponseHours: round1(median(responses)),
    p90ResponseHours: round1(p90(responses)),
    avgOverrunHours: round1(overruns.length ? overruns.reduce((a, b) => a + b, 0) / overruns.length : null),
    maxOverrunHours: round1(overruns.length ? Math.max(...overruns) : null),
    totalOverrunHours: round1(overruns.reduce((a, b) => a + b, 0)),
    worstOpenOverdueHours: round1(st.worstOpenOverdueHours),
  };
};

const teamKeyOf = (s) => (s.fieldTeamId ? String(s.fieldTeamId._id || s.fieldTeamId) : s.teamName ? `name:${String(s.teamName).trim().toLowerCase()}` : "none");

/** Monday-based week start (local) for the trend chart. */
const weekStart = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

/**
 * @param records SLA records (fieldTeamId may be populated with { teamName, teamCode, teamCompany })
 * @param now     reference time for "still open past its deadline"
 */
export const buildSlaAnalytics = (records, { now = Date.now(), minVolume = 3 } = {}) => {
  const overall = emptyStats();
  const teams = new Map();
  const byCategory = new Map();
  const byPriority = new Map();
  const trend = new Map();
  const buckets = Object.fromEntries(RESPONSE_BUCKETS.map((b) => [b.key, 0]));
  const overdueNow = [];

  for (const s of records) {
    const outcome = classifySla(s, now);
    if (outcome === "cancelled") continue;
    addTo(overall, s, outcome, now);

    const key = teamKeyOf(s);
    if (!teams.has(key)) {
      const ft = s.fieldTeamId && typeof s.fieldTeamId === "object" ? s.fieldTeamId : null;
      teams.set(key, { key, teamId: ft?._id ? String(ft._id) : s.fieldTeamId ? String(s.fieldTeamId) : null, teamName: ft?.teamName || s.teamName || "No team", teamCode: ft?.teamCode || s.teamCode || null, teamCompany: ft?.teamCompany || null, stats: emptyStats() });
    }
    addTo(teams.get(key).stats, s, outcome, now);

    const cat = [s.issueCategory || "Other", s.issueSubCategory].filter(Boolean).join(" · ");
    if (!byCategory.has(cat)) byCategory.set(cat, emptyStats());
    addTo(byCategory.get(cat), s, outcome, now);
    const pr = s.priority || "Medium";
    if (!byPriority.has(pr)) byPriority.set(pr, emptyStats());
    addTo(byPriority.get(pr), s, outcome, now);

    const wk = weekStart(s.ticketCreationDate || s.startDate || s.createdAt).toISOString();
    if (!trend.has(wk)) trend.set(wk, emptyStats());
    addTo(trend.get(wk), s, outcome, now);

    const resp = responseHours(s);
    if (resp != null && !s.noResponse) buckets[bucketOf(resp, Number(s.slaHours) || 24)]++;

    if (outcome === "breached" && (s.status === "active" || s.status === "rescheduled") && !s.noResponse) {
      overdueNow.push({
        id: String(s._id),
        target: s.target,
        slid: s.slid,
        title: s.title,
        teamName: teams.get(key).teamName,
        teamKey: key,
        category: cat,
        priority: pr,
        slaHours: s.slaHours,
        targetDate: s.targetDate,
        overdueHours: round1(overrunHours(s, outcome, now)),
      });
    }
  }

  const teamRows = [...teams.values()].map((t) => ({ ...t, stats: undefined, ...finish(t.stats), lowVolume: t.stats.met + t.stats.breached < minVolume }));
  // Worst first: breach rate, then breach count, then the longest current overdue.
  teamRows.sort((a, b) => (b.breachRate ?? -1) - (a.breachRate ?? -1) || b.breached - a.breached || b.worstOpenOverdueHours - a.worstOpenOverdueHours || a.teamName.localeCompare(b.teamName));
  let rank = 0;
  teamRows.forEach((t) => (t.rank = t.closed > 0 ? ++rank : null));

  const toList = (m) => [...m.entries()].map(([label, st]) => ({ label, ...finish(st) })).sort((a, b) => b.total - a.total);
  return {
    summary: { ...finish(overall), teams: teamRows.length, teamsWithBreaches: teamRows.filter((t) => t.breached > 0).length },
    teams: teamRows,
    byCategory: toList(byCategory),
    byPriority: toList(byPriority),
    trend: [...trend.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, st]) => ({ week, ...finish(st) })),
    responseBuckets: RESPONSE_BUCKETS.map((b) => ({ key: b.key, label: b.label, count: buckets[b.key] })),
    overdueNow: overdueNow.sort((a, b) => b.overdueHours - a.overdueHours),
  };
};
