import { describe, expect, it } from "vitest";
import { ENTITIES } from "../components/dataio/entities";
import { autoMap, buildRecords, convert, detectHeaderRow, parseDate, parseTaxonomy, toApiRow } from "../components/dataio/parse";

const snagFields = ENTITIES.snags.fields;

// Header row and first rows as they appear in "TCRM Quality Reach (TCRM & TRC).xlsx"
const tcrm = [
  ["CASE_MSISDN", "Customer", "Case Number", "Complaint", "SC. Name", "PIS Date", "Type ", "Received Date", "Status", "R.C", "Responsibility", "Action Taken", "Closed Date", "Team Name"],
  ["ORNG26010007", "محمود سعد علي ابورمان", "ORNG26010007", "قمت بالاتصال على الشركه", "Reach", "N/A", "TRC", 46030, "Closed", "", "", "Based on the geographical area", 46030, "Unknown"],
  ["INT0419303", "SUDEEP SUDEEP", "CAS-12742633-J9D6Z0", "المشترك يريد الشكوى", "Reach", 46027, "TCRM", 46035, "Closed", "", "", "تم زيارة الموقع", 46034, "أحمد ابوصفية"],
];

describe("import parsing", () => {
  it("finds the header row even with a title row above it", () => {
    expect(detectHeaderRow([["Quality report Aug.26"], ...tcrm], snagFields)).toBe(1);
  });

  it("auto-maps messy TCRM headers to snag fields", () => {
    const m = autoMap(tcrm[0], snagFields);
    const at = (h) => m[tcrm[0].indexOf(h)];
    expect(at("CASE_MSISDN")).toBe("slid");
    expect(at("Customer")).toBe("customerName");
    expect(at("Case Number")).toBe("ticketId");
    expect(at("Complaint")).toBe("reporterNote");
    expect(at("SC. Name")).toBe("teamCompany");
    expect(at("PIS Date")).toBe("pisDate");
    expect(at("Type ")).toBe("fromSub");
    expect(at("Received Date")).toBe("date");
    expect(at("Status")).toBe("solved");
    expect(at("Action Taken")).toBe("resolutionDetails");
    expect(at("Closed Date")).toBe("resolveDate");
    expect(at("Team Name")).toBe("teamName");
  });

  it("parses Excel serials, dd/mm/yyyy and ISO dates", () => {
    expect(parseDate(46030).toISOString().slice(0, 10)).toBe("2026-01-08");
    expect(parseDate("19/10/2026").toISOString().slice(0, 10)).toBe("2026-10-19");
    expect(parseDate("2026-10-19").toISOString().slice(0, 10)).toBe("2026-10-19");
    expect(parseDate("not a date")).toBeUndefined();
    expect(convert({ type: "date" }, "N/A")).toEqual({ value: undefined });
    expect(convert({ type: "date" }, "Pending")).toEqual({ value: undefined });
    expect(convert({ type: "date" }, "31/02/x").error).toMatch(/not a recognised date/);
  });

  it("builds records and reports bad cells per row", () => {
    const mapping = autoMap(tcrm[0], snagFields);
    const { records, problems } = buildRecords(tcrm, 0, mapping, snagFields);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ slid: "ORNG26010007", fromSub: "TRC", solved: "yes" });
    expect(problems).toEqual([]);
    expect(records[0].pisDate).toBeUndefined(); // "N/A" placeholder treated as empty
    const api = toApiRow("snags", records[1]);
    expect(api.solved).toBe("yes");
    expect(api.date.slice(0, 10)).toBe("2026-01-13");
  });

  it("matches free-text trackers onto the taxonomy", () => {
    expect(parseTaxonomy("DVOC · Installation")).toMatchObject({ category: "DVOC", sub: "Installation" });
    expect(parseTaxonomy("OJO Snags - Maintenance")).toMatchObject({ category: "OJO Snags", sub: "Maintenance" });
    expect(parseTaxonomy("Closure Call")).toMatchObject({ category: "Closure Call", sub: "Installation" });
    expect(parseTaxonomy("TCRM")).toMatchObject({ category: "TCRM", sub: null });
    expect(convert({ type: "taxonomy" }, "OJO Snags").error).toMatch(/needs a sub-category/);
    expect(convert({ type: "taxonomy" }, "Something else").error).toMatch(/doesn't match/);
  });

  it("keeps commas inside quiz options but splits tag lists", () => {
    const opt = ENTITIES.quiz.fields.find((f) => f.key === "options");
    expect(convert(opt, "1, 2 and 3 | none").value).toEqual(["1, 2 and 3", "none"]);
    const reason = ENTITIES.tasks.fields.find((f) => f.key === "reason");
    expect(convert(reason, "Speed, QoS").value).toEqual(["Speed", "QoS"]);
  });
});
