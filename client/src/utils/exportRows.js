import XLSX from "xlsx-js-style";

/**
 * Export rows as a styled XLSX (bold frozen header, autofilter, widths, dates)
 * or CSV. columns: [[header, (row) => value], ...]. Returns the file name; throws if it can't be built.
 */
export function exportRows(rows, columns, { format = "xlsx", filename = "export", sheet = "Sheet1" } = {}) {
  const header = columns.map((c) => c[0]);
  const body = rows.map((r) => columns.map(([, get]) => {
    const v = get(r);
    return v === undefined || v === null ? "" : v;
  }));
  const ws = XLSX.utils.aoa_to_sheet([header, ...body], { cellDates: true });
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws, { dateNF: "yyyy-mm-dd" });
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    return a.download;
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
    wch: Math.min(48, Math.max(h.length + 2, ...body.slice(0, 300).map((r) => String(r[i] instanceof Date ? "00-Mmm-0000" : r[i]).length + 1))),
  }));
  ws["!autofilter"] = { ref: ws["!ref"] };
  ws["!views"] = [{ state: "frozen", ySplit: 1 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  const name = `${filename}-${stamp}.xlsx`;
  XLSX.writeFile(wb, name);
  return name;
}
