// Pure tests — no database. Run with: npm run test:local
import { matchedRates, monthKeyOf } from "../../utils/teamMonthlyRates.js";

describe("matchedRates", () => {
  // Samples entered for Jan only; DVOC in Jan, Feb and Mar.
  const r = matchedRates({
    "2026-01": { accountable: 2, notAccountable: 1, samples: 30, online: 400 },
    "2026-02": { accountable: 3, notAccountable: 2 },
    "2026-03": { accountable: 4, notAccountable: 0, online: 200 },
  });

  it("keeps cumulative totals for the whole period", () => {
    expect(r).toMatchObject({ dvoc: 12, accountable: 9, samplesToken: 30, onlineTotal: 600, dvocMonths: 3 });
  });
  it("computes DVOC / Sample % only over months that have samples", () => {
    // Jan: 2 / (30 − 1) — not 9 / (30 − 3), which the old cumulative formula gave (33.3%)
    expect(r).toMatchObject({ sampleMonths: 1, matchedAccountable: 2, matchedNonAccountable: 1, adjustedSamples: 29, dvocSamplePct: 6.9 });
    expect(r.unmatchedDvoc).toBe(9); // Feb + Mar DVOC had no samples to compare with
  });
  it("computes DVOC / Online % only over months that have online data", () => {
    expect(r).toMatchObject({ onlineMonths: 2, onlineMatchedAccountable: 6, dvocOnlinePct: 1, unmatchedOnlineDvoc: 5 });
  });
  it("gives no rate when no month has samples / online", () => {
    const none = matchedRates(new Map([["2026-05", { accountable: 3, notAccountable: 1 }]]));
    expect(none).toMatchObject({ dvocSamplePct: null, dvocOnlinePct: null, unmatchedDvoc: 4, sampleMonths: 0 });
  });
  it("buckets dates by UTC month, like the team detail page", () => {
    expect(monthKeyOf("2026-10-31T23:30:00Z")).toBe("2026-10");
  });
});
