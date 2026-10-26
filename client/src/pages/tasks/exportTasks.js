import XLSX from "xlsx-js-style";
import { taxonomyOfTask } from "../../constants/taxonomy";
import { npsType, taskDate } from "./taskUtils";

const list = (v) => (Array.isArray(v) ? v.filter(Boolean).join(", ") : v || "");
const day = (d) => (d ? new Date(d) : "");

export const TASK_COLUMNS = [
  ["SLID", (t) => t.slid],
  ["Request number", (t) => t.requestNumber],
  ["Tracker", (t) => taxonomyOfTask(t).label],
  ["Customer", (t) => t.customerName],
  ["Contact", (t) => t.contactNumber],
  ["Status", (t) => t.status],
  ["Priority", (t) => t.priority],
  ["Evaluation score", (t) => (t.evaluationScore ?? "")],
  ["NPS type", (t) => npsType(t.evaluationScore)?.label || ""],
  ["Interview date", (t) => day(taskDate(t))],
  ["PIS date", (t) => day(t.pisDate)],
  ["Field team", (t) => t.teamName],
  ["Team company", (t) => t.teamCompany],
  ["Assignees", (t) => (t.assignedTo || []).map((u) => u?.name).filter(Boolean).join(", ")],
  ["Governorate", (t) => t.governorate],
  ["District", (t) => t.district],
  ["Reason", (t) => list(t.reason)],
  ["Sub-reason", (t) => list(t.subReason)],
  ["Root cause", (t) => list(t.rootCause)],
  ["Accountability", (t) => list(t.teamAccountability)],
  ["Validation", (t) => t.validationStatus],
  ["Customer feedback", (t) => t.customerFeedback],
  ["GAIA tickets", (t) => t.ticketCount ?? t.tickets?.length ?? 0],
  ["Contract date", (t) => day(t.contractDate)],
  ["FE date", (t) => day(t.feDate || t.appDate)],
  ["Close date", (t) => day(t.closeDate)],
  ["Created", (t) => day(t.createdAt)],
  ["Record ID", (t) => t._id],
];

/** Styled XLSX (bold frozen header, autofilter, widths, date format) or CSV. */
export function exportTasks(tasks, { format = "xlsx", filename = "tasks" } = {}) {
  const header = TASK_COLUMNS.map((c) => c[0]);
  const rows = tasks.map((t) => TASK_COLUMNS.map(([, get]) => get(t) ?? ""));
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows], { cellDates: true });
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws, { dateNF: "yyyy-mm-dd" });
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }

  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let c = range.s.c; c <= range.e.c; c++) {
    const h = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (h) h.s = { font: { bold: true, color: { rgb: "131316" } }, fill: { fgColor: { rgb: "F3F0FF" } }, border: { bottom: { style: "thin", color: { rgb: "D4D4D8" } } } };
    for (let r = 1; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === "d") cell.z = "dd-mmm-yyyy";
    }
  }
  ws["!cols"] = header.map((h, i) => ({
    wch: Math.min(48, Math.max(h.length + 2, ...rows.slice(0, 300).map((r) => String(r[i] instanceof Date ? "00-Mmm-0000" : r[i] ?? "").length + 1))),
  }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r, c: range.e.c } }) };
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  ws["!views"] = [{ state: "frozen", ySplit: 1 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tasks");
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
}
