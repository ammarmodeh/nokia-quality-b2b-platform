import { describe, expect, it } from "vitest";
import { effectiveMetric, monthsCovered, trendQuery } from "../pages/teams/trendPeriods";
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
  it("weeks have no whole months, so a rate metric falls back to the accountable count", () => {
    const week = resolvePeriod("lastWeek", {}, {}, now).current;
    const q = trendQuery(week, "perSample");
    expect(q.months).toBe("");
    expect(effectiveMetric("perSample", []).value).toBe("accountable");
    expect(effectiveMetric("reach", []).value).toBe("reach");
    expect(effectiveMetric("perOnline", ["2026-9"]).value).toBe("perOnline");
  });
  it("sends the end of the last day as `to`", () => {
    const cur = resolvePeriod("month", {}, {}, now).current;
    expect(new Date(trendQuery(cur, "reach").to).getDate()).toBe(31);
    expect(new Date(trendQuery(cur, "reach").to).getHours()).toBe(23);
  });
});
