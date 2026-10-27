// Pure tests — no database. Run with: npm run test:local
import { rcaUsage } from "../../utils/rcaUsage.js";

const tasks = [
  { responsible: ["Reach", "Customer"], reason: ["Slow speed", "Billing"], subReason: ["Wi-Fi coverage", "Price"], rootCause: ["ONT placement", "Tariff"] },
  { responsible: ["Reach"], reason: ["slow  speed"], subReason: ["Wi-Fi coverage"], rootCause: ["ONT placement"] },
  { responsible: ["OJO"], reason: ["Slow speed"], subReason: ["Fiber bend"], rootCause: ["Bad splicing"] },
  { responsible: "Reach", reason: "No service", subReason: "Not specified", rootCause: "" }, // legacy strings
  { responsible: [], reason: ["N/A"], subReason: [], rootCause: [] },
];

describe("rcaUsage", () => {
  it("counts each RCA row, merges case/space variants and keeps the most common spelling", () => {
    const r = rcaUsage(tasks, "REASON");
    expect(r.map((x) => [x.value, x.count])).toEqual([["Slow speed", 3], ["Billing", 1], ["No service", 1]]);
    expect(r[0].variants).toEqual(["Slow speed", "slow speed"]);
  });
  it("ignores empty / Not specified / N/A values", () => {
    expect(rcaUsage(tasks, "REASON_SUB").map((x) => x.value)).toEqual(["Wi-Fi coverage", "Fiber bend", "Price"]);
    expect(rcaUsage(tasks, "ROOT_CAUSE").some((x) => x.value === "")).toBe(false);
  });
  it("suggests the parent it is paired with most in the same RCA row", () => {
    const reasons = rcaUsage(tasks, "REASON");
    expect(reasons.find((x) => x.value === "Slow speed")).toMatchObject({ parentValue: "Reach", parentShare: 67 });
    expect(reasons.find((x) => x.value === "Billing").parentValue).toBe("Customer"); // row 2 of task 1, not row 1
    expect(reasons.find((x) => x.value === "No service").parentValue).toBe("Reach"); // legacy single value
    expect(rcaUsage(tasks, "ROOT_CAUSE").find((x) => x.value === "ONT placement").parentValue).toBe("Wi-Fi coverage");
  });
  it("marks values already in the list, case-insensitively", () => {
    const r = rcaUsage(tasks, "REASON", ["SLOW SPEED"]);
    expect(r.find((x) => x.value === "Slow speed").exists).toBe(true);
    expect(r.find((x) => x.value === "Billing").exists).toBe(false);
  });
  it("rejects non-RCA lists", () => {
    expect(() => rcaUsage(tasks, "PRIORITY")).toThrow();
  });
});
