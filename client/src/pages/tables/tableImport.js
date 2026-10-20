import { IMPORTABLE, toImportField } from "./fieldTypes";
import { filesApi, tablesApi } from "./tablesApi";

/**
 * Import-wizard definition for one custom table. The real run stores the original
 * file, opens an import batch on the first chunk and closes it on the last, so the
 * batch shows up in Import history and can be rolled back.
 */
export const tableEntity = (table) => {
  const fields = table.fields.filter(IMPORTABLE).sort((a, b) => a.order - b.order);
  const keyFields = fields.filter((f) => f.validation?.unique || f.coreMapping === "customerId");
  const keys = (keyFields.length ? keyFields : fields.filter((f) => ["text", "phone", "number"].includes(f.type)).slice(0, 4)).map((f) => ({ value: f.key, label: f.label }));
  return {
    label: table.name,
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
      send: async (records, { mode, key, dryRun, run = {}, final }) => {
        const rows = records.map(({ __row, ...data }) => ({ __row, data }));
        const out = await tablesApi.importRows(table._id, { rows, mode, matchField: key, dryRun, batchId: run.batchId || undefined, fileId: run.fileId, sheet: run.sheet, mapping: run.mapping, final });
        if (!dryRun && out.batchId) run.batchId = out.batchId;
        return out;
      },
    },
  };
};
