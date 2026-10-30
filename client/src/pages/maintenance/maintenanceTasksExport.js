import XLSX from "xlsx-js-style";
import { format } from "date-fns";
import { getTaskRcaRows } from "./maintenanceRca";

// Detailed .xlsx of the maintenance tasks list: one row per task, every recorded field, then each RCA row.

const fmt = (d) => (d ? format(new Date(d), "dd/MM/yyyy HH:mm") : "");

const duration = (start, end) => {
  if (!start || !end) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms)) return "";
  const mins = Math.round(Math.abs(ms) / 60000);
  const parts = [];
  if (mins >= 1440) parts.push(`${Math.floor(mins / 1440)}d`);
  if (mins % 1440 >= 60) parts.push(`${Math.floor((mins % 1440) / 60)}h`);
  parts.push(`${mins % 60}m`);
  return `${ms < 0 ? "-" : ""}${parts.join(" ")}`;
};

const classify = (score) => {
  if (score == null) return "";
  if (score <= 6) return "Detractor (1-6)";
  if (score <= 8) return "Neutral (7-8)";
  return "Promoter (9-10)";
};

const yesNo = (v) => (v ? "Yes" : "No");

export const exportMaintenanceTasks = (tasks, { filterNote = "" } = {}) => {
  const rcaCount = Math.max(1, ...tasks.map((t) => getTaskRcaRows(t).length));

  const rows = tasks.map((t) => {
    const created = t.creationDate || t.createdAt;
    const clearance = t.dueDate || t.closedAt;
    const score = t.evaluationScore ?? null;
    const row = {
      "Task #": t.taskNumber || "",
      SLID: t.slid || "",
      "Ticket #": t.ticketNumber || "",
      "Customer name": t.customerName || "",
      "Contact number": t.contactNumber || "",
      "Customer complaint": t.customerComplaint || "",
      Team: t.team?.teamName || "",
      "Team code": t.team?.teamCode || "",
      Governorate: t.governorate || "",
      District: t.district || "",
      "Fault type": t.faultType || "",
      "Fiber category": t.fiberCategory || "",
      NCF: yesNo(t.ncf),
      "HC responsibility": yesNo(t.hcResponsibility),
      "Resolved after visit": t.resolvedAfterVisit && t.resolvedAfterVisit !== "Not specified" ? t.resolvedAfterVisit : "",
      "Customer needs follow-up": t.customerFollowUp || "",
      "Satisfaction score": score ?? "",
      Classification: classify(score),
      "Customer feedback": t.customerFeedback || "",
      "Team feedback": t.teamFeedback || "",
      Status: t.status || "",
      Priority: t.priority || "",
      Steps: t.ticketCount || 0,
      "Installation date": fmt(t.installationDate),
      "Reporting date": fmt(t.faultDate),
      "Created date": fmt(created),
      "Clearance date": fmt(clearance),
      "Interview date": fmt(t.interviewDate),
      "Reporting → Created": duration(t.faultDate, created),
      "Reporting → Clearance": duration(t.faultDate, clearance),
      "Created → Clearance": duration(created, clearance),
    };
    const rcas = getTaskRcaRows(t);
    for (let i = 0; i < rcaCount; i++) {
      const r = rcas[i];
      row[`Reason ${i + 1}`] = r ? r.reason : "";
      row[`Sub-reason ${i + 1}`] = r ? r.subReason : "";
      row[`Root cause ${i + 1}`] = r?.hasRootCause ? r.rootCause : "";
      row[`Owner ${i + 1}`] = r ? r.responsible : "";
      row[`Team accountable ${i + 1}`] = r ? r.teamAccountability : "";
    }
    row.Notes = t.notes || "";
    row["Created by"] = t.createdBy?.name || "";
    row["Last updated"] = fmt(t.updatedAt);
    return row;
  });

  const headers = Object.keys(rows[0] || { "Task #": "" });
  const title = `Maintenance tasks · ${tasks.length} task${tasks.length === 1 ? "" : "s"} · exported ${format(new Date(), "dd/MM/yyyy HH:mm")}${filterNote ? ` · ${filterNote}` : ""}`;
  const ws = XLSX.utils.aoa_to_sheet([[title], []]);
  XLSX.utils.sheet_add_json(ws, rows, { origin: "A3", header: headers });

  const border = { style: "thin", color: { rgb: "D1D5DB" } };
  ws.A1.s = { font: { bold: true, sz: 13 } };
  headers.forEach((_, c) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 2, c })];
    if (cell) cell.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "374151" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: { top: border, bottom: border, left: border, right: border } };
  });
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.min(headers.length - 1, 12) } }];
  ws["!cols"] = headers.map((h) => ({ wch: /complaint|feedback|Notes|Root cause/i.test(h) ? 32 : Math.max(12, Math.min(24, h.length + 2)) }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2 + rows.length, c: headers.length - 1 } }) };
  ws["!freeze"] = { xSplit: 2, ySplit: 3 };
  ws["!views"] = [{ state: "frozen", xSplit: 2, ySplit: 3 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Maintenance tasks");
  XLSX.writeFile(wb, `Maintenance tasks - ${format(new Date(), "yyyy-MM-dd HHmm")}.xlsx`);
};
