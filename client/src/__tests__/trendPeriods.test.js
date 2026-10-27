import { describe, expect, it } from "vitest";
import { effectiveMetric, monthShares, monthsCovered, trendQuery } from "../pages/teams/trendPeriods";
import { resolvePeriod } from "../pages/dashboard/npsPeriods";

const d = (y, m, day, end = false) => (end ? new Date(y, m - 1, day, 23, 59, 59, 999) : new Date(y, m - 1, day));

describe("monthsCovered", () => {
  it("returns the whole months a period tiles", () => {
    expect(monthsCovered(d(2026, 9, 1), d(2026, 9, 30, true))).toEqual(["2026-9"]);
    expect(monthsCovered(d(2026, 11, 1), d(2027, 1, 31, true))).toEqual(["2026-11", "2026-12", "2027-1"]);
  });
  it("returns nothing for partial months (weeks, mid-month custom ranges)", () => {
    expect(monthsCovered(d(2026, 9, 7), d(2026, 9, 13, true))).toEqual([]);
    expect(monthsCovered(d(2026, 9, 1), d(2026, 10, 15, true))).toEqual([]);
    expect(monthsCovered(d(2026, 9, 2), d(2026, 9, 30, true))).toEqual([]);
  });
});

describe("Trends periods use the dashboard's period rules", () => {
  const now = new Date(2026, 9, 27, 12); // 27 Oct 2026
  it("last month / current month are whole months, so rates are available", () => {
    const last = resolvePeriod("lastMonth", {}, {}, now).current;
    expect(trendQuery(last, "perSample").months).toBe("2026-9");
    const cur = resolvePeriod("month", {}, {}, now).current;
    expect(trendQuery(cur, "perSample").months).toBe("2026-10");
  });
  it("weeks send their share of the month so samples can be pro-rated", () => {
    const week = resolvePeriod("lastWeek", {}, {}, now).current;
    const q = trendQuery(week, "perSample");
    expect(q.months).toMatch(/^2026-10:0.2258$/); // 7 of October's 31 days
    expect(effectiveMetric("perSample", ["2026-10"]).value).toBe("perSample");
    expect(effectiveMetric("perSample", []).value).toBe("accountable");
  });
  it("a week across two months takes a share of each", () => {
    const shares = monthShares(d(2026, 9, 28), d(2026, 10, 4, true));
    expect(shares.map((m) => [m.key, m.days, m.daysInMonth])).toEqual([["2026-9", 3, 30], ["2026-10", 4, 31]]);
    expect(trendQuery({ start: d(2026, 9, 28), end: d(2026, 10, 4) }, "perSample").months).toBe("2026-9:0.1000,2026-10:0.1290");
  });
  it("sends the end of the last day as `to`", () => {
    const cur = resolvePeriod("month", {}, {}, now).current;
    expect(new Date(trendQuery(cur, "reach").to).getDate()).toBe(31);
    expect(new Date(trendQuery(cur, "reach").to).getHours()).toBe(23);
  });
});
