// Pure calculation tests — no database. Run with: npm run test:local
import { buildTeamTrends, isAccountable, isReachOwned, parseMonths, rankTeams, reachRows, summarize } from "../../utils/teamTrends.js";

const task = (teamName, acc, responsible = []) => ({ teamName, teamAccountability: acc, responsible });

describe("accountability rules", () => {
  it("counts a task accountable when any RCA row says Yes (array or legacy string)", () => {
    expect(isAccountable(task("A", ["No", "Yes"]))).toBe(true);
    expect(isAccountable(task("A", " yes "))).toBe(true);
    expect(isAccountable(task("A", ["No"]))).toBe(false);
    expect(isAccountable(task("A", []))).toBe(false);
  });
  it("detects REACH ownership from responsible", () => {
    expect(isReachOwned(task("A", [], ["Customer", "REACH"]))).toBe(true);
    expect(isReachOwned(task("A", [], "Reach"))).toBe(true);
    expect(isReachOwned(task("A", [], ["OJO"]))).toBe(false);
  });
  it("counts every REACH-owned RCA row, like the dashboard's Top owners", () => {
    expect(reachRows(task("A", ["Yes", "No"], ["Reach", "REACH"]))).toBe(2);
    expect(reachRows(task("A", [], "Reach, OJO"))).toBe(1); // legacy multi-owner string
    expect(reachRows(task("A", [], []))).toBe(0);
  });
});

describe("buildTeamTrends", () => {
  const teams = [
    { _id: "1", teamName: "Alpha", teamCompany: "REACH" },
    { _id: "2", teamName: "Bravo" },
    { _id: "3", teamName: "Gone", isTerminated: true },
  ];
  const tasks = [
    task("Alpha", ["Yes", "Yes"], ["Reach", "Reach"]), // two RCA rows → still one task
    task("alpha ", ["Yes"], ["OJO"]), // name differs only in case/space → same team
    task("Alpha", ["No"]),
    task("Bravo", ["No"], ["Reach"]), // not accountable, still a REACH-owned row
  ];
  const samples = [{ teamName: "Alpha", sampleSize: 30 }, { teamName: "ALPHA", sampleSize: 11 }];
  const online = [{ teamName: "Alpha", onlineTransactions: 400 }, { teamName: "Bravo", onlineTransactions: 0 }];

  const rows = buildTeamTrends({ tasks, samples, online, teams });
  const by = (n) => rows.find((r) => r.teamName === n);

  it("counts each task once per team", () => {
    expect(by("Alpha")).toMatchObject({ dvoc: 3, accountable: 2, notAccountable: 1 });
  });
  it("REACH ownership counts REACH-owned rows whether accountable or not", () => {
    expect(by("Alpha").reachOwned).toBe(2); // two REACH rows on one task
    expect(by("Bravo").reachOwned).toBe(1); // not accountable
    expect(by("Alpha").accountableNoReach).toBe(1); // the OJO-owned accountable task (data check)
  });
  it("uses the existing DVOC/Sample formula: accountable / (samples − non-accountable)", () => {
    expect(by("Alpha").samples).toBe(41);
    expect(by("Alpha").adjustedSamples).toBe(40);
    expect(by("Alpha").perSamplePct).toBe(5);
  });
  it("uses the existing DVOC/Online formula: accountable / online", () => {
    expect(by("Alpha").perOnlinePct).toBe(0.5);
  });
  it("keeps missing and zero denominators as null, never 0% or Infinity", () => {
    expect(by("Bravo").samples).toBeNull();
    expect(by("Bravo").perSamplePct).toBeNull();
    expect(by("Bravo").online).toBe(0);
    expect(by("Bravo").perOnlinePct).toBeNull();
  });
  it("drops terminated teams with no activity", () => {
    expect(by("Gone")).toBeUndefined();
  });
  it("gives no rates when the period isn't whole months", () => {
    const partial = buildTeamTrends({ tasks, samples, online, teams, ratesAvailable: false });
    expect(partial.every((r) => r.perSamplePct === null && r.perOnlinePct === null)).toBe(true);
    expect(partial.find((r) => r.teamName === "Alpha").accountable).toBe(2);
  });
});

describe("rankTeams", () => {
  const rows = [
    { teamName: "A", accountable: 1, perSamplePct: 2, reachOwned: 0 },
    { teamName: "B", accountable: 4, perSamplePct: 9, reachOwned: 3 },
    { teamName: "C", accountable: 2, perSamplePct: 2, reachOwned: 1 },
    { teamName: "D", accountable: 5, perSamplePct: null, reachOwned: 2 },
  ];
  it("ranks worst first, ties share a rank, rows without a value go last unranked", () => {
    const r = rankTeams(rows.map((x) => ({ ...x })), "perSample");
    expect(r.map((x) => [x.teamName, x.rank])).toEqual([["B", 1], ["C", 2], ["A", 2], ["D", null]]);
  });
  it("ranks by the selected metric only", () => {
    const r = rankTeams(rows.map((x) => ({ ...x })), "reach");
    expect(r.map((x) => x.teamName)).toEqual(["B", "D", "C", "A"]);
  });
});

describe("summarize", () => {
  it("pools rates from totals instead of averaging team percentages", () => {
    const s = summarize([
      { dvoc: 3, accountable: 2, notAccountable: 1, reachOwned: 1, samples: 41, adjustedSamples: 40, online: 400, perSamplePct: 5, perOnlinePct: 0.5 },
      { dvoc: 1, accountable: 0, notAccountable: 1, reachOwned: 0, samples: 9, adjustedSamples: 8, online: 100, perSamplePct: 0, perOnlinePct: 0 },
    ]);
    expect(s).toMatchObject({ dvoc: 4, accountable: 2, samples: 50, online: 500, perSamplePct: 4.2, perOnlinePct: 0.4 });
  });
});

describe("parseMonths", () => {
  it("parses year-month lists with optional month shares", () => {
    expect(parseMonths("2026-9, 2026-10:0.2258,bad,2026-13,2026-11:0,2026-12:1.5")).toEqual([
      { year: 2026, month: 9, weight: 1 },
      { year: 2026, month: 10, weight: 0.2258 },
    ]);
    expect(parseMonths("")).toEqual([]);
  });
});

describe("pro-rated samples for partial months (weeks)", () => {
  const rows = buildTeamTrends({
    tasks: [task("A", ["Yes"]), task("A", ["No"])],
    // A week of 7 days: 4 days in a 30-day month + 3 days in a 31-day month.
    samples: [{ teamName: "A", sampleSize: 60, weight: 4 / 30 }, { teamName: "A", sampleSize: 62, weight: 3 / 31 }],
    online: [{ teamName: "A", onlineTransactions: 310, weight: 3 / 31 }],
  });
  it("takes each month's share of samples and online", () => {
    expect(rows[0].samples).toBe(14); // 8 + 6
    expect(rows[0].online).toBe(30);
  });
  it("removes the period's non-accountable DVOC from the estimated samples", () => {
    expect(rows[0].adjustedSamples).toBe(13);
    expect(rows[0].perSamplePct).toBe(7.7); // 1 / 13
    expect(rows[0].perOnlinePct).toBe(3.33); // 1 / 30
  });
});
