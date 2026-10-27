// Pure SLA analytics tests — no database. Run with: npm run test:local
import { buildSlaAnalytics, classifySla, overrunHours, responseHours } from "../../utils/slaAnalytics.js";

const NOW = new Date("2026-10-27T12:00:00Z").getTime();
const h = (n) => new Date(NOW + n * 3600 * 1000);
const team = (id, teamName) => ({ _id: id, teamName, teamCode: id.toUpperCase(), teamCompany: "REACH" });
const sla = (o) => ({ _id: Math.random().toString(36).slice(2), target: { kind: "task", id: "t1" }, slaHours: 24, priority: "Medium", issueCategory: "DVOC", issueSubCategory: "Installation", status: "active", renewals: [], ...o });

describe("classifySla follows the existing team-performance rules", () => {
  it("met / exempt / breached / overdue-open / open / cancelled", () => {
    expect(classifySla(sla({ status: "met" }), NOW)).toBe("met");
    expect(classifySla(sla({ status: "active", teamExempt: true, targetDate: h(-50) }), NOW)).toBe("met");
    expect(classifySla(sla({ status: "breached" }), NOW)).toBe("breached");
    expect(classifySla(sla({ status: "met", noResponse: true }), NOW)).toBe("met"); // met wins, as before
    expect(classifySla(sla({ noResponse: true, status: "breached" }), NOW)).toBe("breached");
    expect(classifySla(sla({ status: "active", targetDate: h(-1) }), NOW)).toBe("breached");
    expect(classifySla(sla({ status: "active", targetDate: h(5) }), NOW)).toBe("open");
    expect(classifySla(sla({ status: "cancelled" }), NOW)).toBe("cancelled");
  });
});

describe("response and overrun hours", () => {
  it("measure from ticket creation to response, and past the deadline", () => {
    const s = sla({ ticketCreationDate: h(-40), responseDate: h(-10), status: "breached", slaHours: 24, targetDate: h(-16) });
    expect(responseHours(s)).toBe(30);
    expect(overrunHours(s, "breached", NOW)).toBe(6);
  });
  it("open overdue tickets overrun until now", () => {
    const s = sla({ status: "active", targetDate: h(-966.2), ticketCreationDate: h(-990.2) });
    expect(Math.round(overrunHours(s, "breached", NOW) * 10) / 10).toBe(966.2);
    expect(responseHours(s)).toBeNull();
  });
});

describe("buildSlaAnalytics", () => {
  const A = team("a", "Alpha");
  const B = team("b", "Bravo");
  const records = [
    // Alpha: 1 met (fast), 1 breached late, 1 open overdue, 1 exempt → met; 3 met-ish vs 2 breached
    sla({ fieldTeamId: A, status: "met", ticketCreationDate: h(-100), responseDate: h(-96), targetDate: h(-76) }),
    sla({ fieldTeamId: A, status: "breached", ticketCreationDate: h(-100), responseDate: h(-30), targetDate: h(-76), priority: "High" }),
    sla({ fieldTeamId: A, status: "active", ticketCreationDate: h(-60), targetDate: h(-36), slid: "S-OVER", title: "Late one" }),
    sla({ fieldTeamId: A, status: "active", teamExempt: true, ticketCreationDate: h(-60), targetDate: h(-36) }),
    // Bravo: 2 met, 1 open in time
    sla({ fieldTeamId: B, status: "met", ticketCreationDate: h(-50), responseDate: h(-40), targetDate: h(-26) }),
    sla({ fieldTeamId: B, status: "met", ticketCreationDate: h(-50), responseDate: h(-48), targetDate: h(-26) }),
    sla({ fieldTeamId: B, status: "active", ticketCreationDate: h(-2), targetDate: h(22), issueCategory: "OJO Snags", issueSubCategory: "Maintenance" }),
    // No team, cancelled (ignored)
    sla({ teamName: null, status: "cancelled" }),
  ];
  const r = buildSlaAnalytics(records, { now: NOW });
  const alpha = r.teams.find((t) => t.teamName === "Alpha");
  const bravo = r.teams.find((t) => t.teamName === "Bravo");

  it("counts outcomes per team and ranks the worst first", () => {
    expect(alpha).toMatchObject({ total: 4, met: 2, breached: 2, open: 0, overdueOpen: 1, exempt: 1, breachRate: 50, complianceRate: 50, rank: 1 });
    expect(bravo).toMatchObject({ total: 3, met: 2, breached: 0, open: 1, breachRate: 0, complianceRate: 100, rank: 2 });
    expect(r.teams).toHaveLength(2); // cancelled record skipped
  });
  it("measures responsiveness (response times exclude unanswered tickets)", () => {
    expect(alpha.avgResponseHours).toBe(37); // (4 + 70) / 2
    expect(alpha.medianResponseHours).toBe(37);
    expect(bravo.avgResponseHours).toBe(6); // (10 + 2) / 2
    expect(alpha.avgOverrunHours).toBe(41); // (46 h late + 36 h overdue now) / 2
    expect(alpha.worstOpenOverdueHours).toBe(36);
  });
  it("summarises overall, by category, priority, week and response bucket", () => {
    expect(r.summary).toMatchObject({ total: 7, met: 4, breached: 2, open: 1, closed: 6, complianceRate: 66.7, teamsWithBreaches: 1 });
    expect(r.byCategory.map((c) => c.label)).toEqual(["DVOC · Installation", "OJO Snags · Maintenance"]);
    expect(r.byPriority.find((p) => p.label === "High").breached).toBe(1);
    expect(r.responseBuckets.find((b) => b.key === "fast").count).toBe(3); // 4h, 10h, 2h vs 24h SLA
    expect(r.responseBuckets.find((b) => b.key === "late24").count).toBe(0);
    expect(r.responseBuckets.find((b) => b.key === "late72").count).toBe(1); // 70h vs 24h → 46h late
    expect(r.trend.reduce((n, w) => n + w.total, 0)).toBe(7);
  });
  it("lists open overdue tickets, longest first", () => {
    expect(r.overdueNow).toHaveLength(1);
    expect(r.overdueNow[0]).toMatchObject({ slid: "S-OVER", teamName: "Alpha", overdueHours: 36 });
  });
  it("flags teams with too few closed SLAs to compare fairly", () => {
    expect(alpha.lowVolume).toBe(false);
    expect(buildSlaAnalytics([records[0]], { now: NOW }).teams[0].lowVolume).toBe(true);
  });
});
