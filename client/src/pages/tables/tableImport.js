import { IMPORTABLE, toImportField } from "./fieldTypes";
import { filesApi, tablesApi } from "./tablesApi";

/**
 * Import-wizard definition for one custom table. The real run stores the original
 * file, opens an import batch on the first chunk and closes it on the last, so the
 * batch shows up in Import history and can be rolled back.
 */
export const tableEntity = (table, group = null) => {
  const fields = table.fields.filter(IMPORTABLE).sort((a, b) => a.order - b.order);
  // the SLID (or another id-like field) identifies a row: duplicates are matched on it
  const keyFields = [...fields.filter((f) => f.coreMapping === "slid"), ...fields.filter((f) => f.coreMapping !== "slid" && (f.validation?.unique || f.coreMapping === "customerId"))];
  const keys = (keyFields.length ? keyFields : fields.filter((f) => ["text", "phone", "number"].includes(f.type)).slice(0, 4)).map((f) => ({ value: f.key, label: f.label }));
  return {
    label: group ? `${table.name} · ${group.name}` : table.name,
    // the wizard asks what to do with rows that already exist (update, fill blanks, keep, add)
    reviewDuplicates: true,
    tableName: table.name,
    short: table.name.length > 24 ? `${table.name.slice(0, 22)}…` : table.name,
    keys,
    fields: fields.map(toImportField),
    importer: {
      start: async ({ file, sheet, mapping, header }) => {
        let fileId;
        try {
          fileId = (await filesApi.upload(file, { tableId: table._id, purpose: "import" }))._id;
        } catch {
          fileId = undefined; // storing the file is best-effort; the import still runs
        }
        const named = Object.fromEntries(mapping.map((k, i) => [header[i] || `Column ${i + 1}`, k]).filter(([, k]) => k));
        return { fileId, sheet, mapping: named, batchId: null };
      },
      send: async (records, { mode, key, dryRun, run = {}, final, columnsToUpdate }) => {
        const rows = records.map(({ __row, __action, ...data }) => ({ __row, data, ...(__action ? { action: __action } : {}) }));
        const out = await tablesApi.importRows(table._id, { rows, mode, matchField: key, dryRun, batchId: run.batchId || undefined, fileId: run.fileId, sheet: run.sheet, mapping: run.mapping, final, columnsToUpdate, ...(group ? { groups: [group.key] } : {}) });
        if (!dryRun && out.batchId) run.batchId = out.batchId;
        return out;
      },
    },
  };
};
