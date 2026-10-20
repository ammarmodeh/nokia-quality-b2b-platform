import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Checkbox, CircularProgress, FormControlLabel, MenuItem, TextField, Typography } from "@mui/material";
import CheckCircle from "@mui/icons-material/CheckCircle";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import AddBoxOutlined from "@mui/icons-material/AddBoxOutlined";
import DashboardCustomizeOutlined from "@mui/icons-material/DashboardCustomizeOutlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import Badge from "../../components/ui/Badge";
import AppDialog from "../../components/ui/AppDialog";
import ProgressPanel from "../../components/ui/ProgressPanel";
import { readWorkbook, downloadWorkbook } from "../../components/dataio/parse";
import { TAXONOMY } from "../../constants/taxonomy";
import { FIELD_TYPES, READ_ONLY, inferFields, parseInput } from "./fieldTypes";
import { filesApi, tablesApi, templatesApi } from "./tablesApi";
import { errText } from "./useTable";

const SOURCES = [
  { value: "blank", label: "Blank table", hint: "Start with one field and build it up", icon: AddBoxOutlined },
  { value: "template", label: "From a template", hint: "Built-in or saved by your team", icon: DashboardCustomizeOutlined },
  { value: "file", label: "From an Excel / CSV file", hint: "Fields inferred from the sheet; rows optional", icon: UploadFileOutlined },
  { value: "duplicate", label: "Duplicate a table", hint: "Same fields, optionally the rows", icon: ContentCopyOutlined },
];
const TYPE_CHOICES = Object.entries(FIELD_TYPES).filter(([t]) => !READ_ONLY.includes(t) && !["attachment", "linkedTask", "user", "fieldTeam"].includes(t));

const headerRowOf = (rows) => {
  let best = 0;
  let score = -1;
  rows.slice(0, 10).forEach((r, i) => {
    const s = r.filter((v) => typeof v === "string" && v.trim()).length;
    if (s > score) { score = s; best = i; }
  });
  return best;
};

const CategoryPicker = ({ value, onChange }) => (
  <TextField select label="Tracker" value={`${value.category}|${value.sub || ""}`} onChange={(e) => { const [category, sub] = e.target.value.split("|"); onChange({ category, sub: sub || null }); }} sx={{ minWidth: 240 }}>
    {TAXONOMY.flatMap((t) => (t.subs.length ? t.subs.map((s) => <MenuItem key={`${t.label}|${s}`} value={`${t.label}|${s}`}>{t.label} · {s}</MenuItem>) : [<MenuItem key={t.label} value={`${t.label}|`}>{t.label}</MenuItem>]))}
  </TextField>
);

/** Field list editor for a sheet: include, rename and retype each inferred column. */
const SheetFields = ({ sheet, onChange }) => (
  <Box sx={{ border: "1px solid var(--border)", borderRadius: "10px", maxHeight: 300, overflowY: "auto" }}>
    {sheet.fields.map((f, i) => (
      <Box key={i} sx={{ display: "grid", gridTemplateColumns: "32px minmax(0,1.3fr) 170px minmax(0,1fr)", gap: 1, alignItems: "center", px: 1, py: 0.5, borderBottom: "1px solid var(--border)", "&:last-of-type": { borderBottom: 0 } }}>
        <Checkbox size="small" checked={f.include !== false} onChange={(e) => onChange(i, { include: e.target.checked })} inputProps={{ "aria-label": `Include ${f.label}` }} />
        <TextField size="small" value={f.label} onChange={(e) => onChange(i, { label: e.target.value })} disabled={f.include === false} inputProps={{ dir: "auto", "aria-label": "Field name" }} />
        <TextField select size="small" value={f.type} onChange={(e) => onChange(i, { type: e.target.value })} disabled={f.include === false} slotProps={{ htmlInput: { "aria-label": "Field type" } }}>
          {TYPE_CHOICES.map(([t, m]) => <MenuItem key={t} value={t}>{m.label}</MenuItem>)}
        </TextField>
        <Typography dir="auto" noWrap sx={{ fontSize: 11.5, color: "var(--text-muted)" }} title={f.samples.join(" · ")}>
          {f.options?.choices ? `${f.options.choices.length} options · ` : ""}{f.samples.join(" · ") || "empty"}
        </Typography>
      </Box>
    ))}
  </Box>
);

const NewTableDialog = ({ open, onClose, category, sub, onCreated }) => {
  const navigate = useNavigate();
  const [source, setSource] = useState("blank");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tax, setTax] = useState({ category: category || "OJO Snags", sub: sub ?? (category ? TAXONOMY.find((t) => t.label === category)?.subs[0] || null : "Installation") });
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [withSample, setWithSample] = useState(false);
  const [tables, setTables] = useState([]);
  const [dupId, setDupId] = useState("");
  const [dupRows, setDupRows] = useState(false);
  const [file, setFile] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [active, setActive] = useState(0);
  const [importRows, setImportRows] = useState(true);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [run, setRun] = useState(null); // file import: { phase, steps, current, startedAt, counts, tables, errors, stopped }
  const [error, setError] = useState(null);
  const input = useRef(null);
  const stopRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setRun(null);
      setError(null);
      stopRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    templatesApi.list().then(setTemplates).catch(() => setTemplates([]));
    tablesApi.list().then(setTables).catch(() => setTables([]));
  }, [open]);
  useEffect(() => {
    if (!templateId) { setPreview(null); return; }
    templatesApi.get(templateId).then(setPreview).catch((e) => setError(errText(e)));
  }, [templateId]);

  const matching = useMemo(() => templates.filter((t) => t.issueCategory === tax.category), [templates, tax.category]);
  const others = useMemo(() => templates.filter((t) => t.issueCategory !== tax.category), [templates, tax.category]);

  const onFile = async (f) => {
    if (!f) return;
    setError(null);
    setReading(true);
    try {
      const raw = await readWorkbook(f);
      const prepared = raw.map((sh) => {
        const hi = headerRowOf(sh.rows);
        const body = sh.rows.slice(hi + 1).filter((r) => r.some((v) => v !== "" && v !== null && v !== undefined));
        return { name: sh.name, headerIdx: hi, body, include: body.length > 0, tableName: `${String(sh.name).trim()}`, fields: inferFields(sh.rows[hi] || [], body).map((x) => ({ ...x, include: x.filled > 0 || Boolean(x.label) })) };
      });
      setFile(f);
      setSheets(prepared);
      setActive(Math.max(0, prepared.findIndex((s) => s.include)));
      if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      setError(`Couldn't read the file: ${e.message}`);
    } finally {
      setReading(false);
    }
  };
  const updateField = (si, fi, patch) => setSheets((list) => list.map((s, i) => (i !== si ? s : { ...s, fields: s.fields.map((f, j) => (j === fi ? { ...f, ...patch } : f)) })));

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const base = { description, issueCategory: tax.category, issueSubCategory: tax.sub };
      if (source === "file") {
        await importFile(base);
        return;
      }
      if (!name.trim()) throw new Error("Give the table a name");
      const body = { ...base, name };
      if (source === "template") {
        if (!templateId) throw new Error("Choose a template");
        Object.assign(body, { templateId, withSampleRows: withSample });
      }
      if (source === "duplicate") {
        if (!dupId) throw new Error("Choose a table to duplicate");
        Object.assign(body, { duplicateFrom: dupId, withRows: dupRows });
      }
      const table = await tablesApi.create(body);
      onCreated?.(table);
      onClose();
      navigate(`/tables/${table._id}`);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  // ---- file import: one step per table / sheet; rows go in small batches so progress moves
  const importFile = async (base) => {
    const chosen = sheets.filter((s) => s.include && s.fields.some((f) => f.include !== false));
    if (!chosen.length) throw new Error("Choose at least one sheet with at least one field");
    if (!name.trim()) throw new Error("Give the table a name");
    stopRef.current = false;
    const steps = [{ key: "upload", label: `Store ${file.name}`, status: "pending" }];
    chosen.forEach((sh) => {
      const tableName = chosen.length > 1 ? `${name} · ${sh.tableName}` : name;
      steps.push({ key: `create:${sh.name}`, label: `Create table “${tableName}”`, status: "pending" });
      if (saveTemplate) steps.push({ key: `tpl:${sh.name}`, label: `Save “${tableName}” as a template`, status: "pending" });
      if (importRows && sh.body.length) steps.push({ key: `rows:${sh.name}`, label: `Import ${sh.body.length.toLocaleString()} rows into “${tableName}”`, status: "pending" });
    });
    const state = { phase: "running", steps, current: null, startedAt: Date.now(), counts: { created: 0, failed: 0, emptied: 0 }, tables: [], errors: [], stopped: false };
    const push = () => setRun({ ...state, steps: state.steps.map((x) => ({ ...x })), counts: { ...state.counts }, tables: [...state.tables], current: state.current && { ...state.current } });
    const mark = (key, status, detail) => {
      const st = state.steps.find((x) => x.key === key);
      if (st) Object.assign(st, { status, ...(detail !== undefined ? { detail } : {}) });
      push();
    };
    push();

    mark("upload", "active");
    const stored = await filesApi.upload(file, { purpose: saveTemplate ? "template" : "import" }).catch(() => null);
    mark("upload", stored ? "done" : "error", stored ? undefined : "not stored, the import continues");

    try {
      for (const sh of chosen) {
        if (stopRef.current) break;
        const cols = sh.fields.filter((f) => f.include !== false);
        const fieldDefs = cols.map(({ label, type, options }) => ({ label: label.trim() || "Untitled", type, options: type === "singleSelect" || type === "multiSelect" ? options || { choices: [] } : undefined }));
        const tableName = chosen.length > 1 ? `${name} · ${sh.tableName}` : name;
        mark(`create:${sh.name}`, "active");
        const table = await tablesApi.create({ ...base, name: tableName, fields: fieldDefs });
        state.tables.push({ id: table._id, name: tableName, rows: 0 });
        mark(`create:${sh.name}`, "done", `${fieldDefs.length} fields`);
        if (saveTemplate) {
          mark(`tpl:${sh.name}`, "active");
          await templatesApi.create({ ...base, name: tableName, fields: fieldDefs, source: "uploaded", sourceFileId: stored?._id });
          mark(`tpl:${sh.name}`, "done");
        }
        if (!(importRows && sh.body.length)) continue;

        const live = table.fields;
        const rows = sh.body.map((r, i) => {
          const data = {};
          cols.forEach((c, j) => {
            const p = parseInput(live[j], r[c.sourceColumn]);
            if (p.error) state.counts.emptied++;
            else if (p.value !== null && p.value !== undefined) data[live[j].key] = p.value;
          });
          return { __row: sh.headerIdx + 2 + i, data, raw: r };
        });
        const key = `rows:${sh.name}`;
        const chunk = Math.max(25, Math.min(200, Math.ceil(rows.length / 25)));
        state.current = { done: 0, total: rows.length, unit: "rows" };
        state.startedAt = Date.now();
        mark(key, "active", `0 / ${rows.length.toLocaleString()}`);
        let batchId;
        for (let i = 0; i < rows.length; i += chunk) {
          if (stopRef.current) {
            state.stopped = true;
            break;
          }
          const part = rows.slice(i, i + chunk);
          const out = await tablesApi.importRows(table._id, { rows: part.map(({ __row, data }) => ({ __row, data })), mode: "create", dryRun: false, batchId, fileId: stored?._id, sheet: sh.name, final: i + chunk >= rows.length });
          batchId = out.batchId;
          state.counts.created += out.counts?.created || 0;
          state.counts.failed += out.counts?.failed || 0;
          state.tables[state.tables.length - 1].rows += out.counts?.created || 0;
          (out.results || []).filter((r) => r.status === "error").forEach((r) => {
            const src = part.find((x) => x.__row === r.row);
            state.errors.push({ sheet: sh.name, row: r.row, message: r.message, raw: src?.raw || [] });
          });
          state.current = { done: Math.min(rows.length, i + chunk), total: rows.length, unit: "rows" };
          mark(key, "active", `${state.current.done.toLocaleString()} / ${rows.length.toLocaleString()}`);
        }
        if (state.stopped && batchId) await tablesApi.finishBatch(table._id, batchId).catch(() => {});
        const failedHere = state.errors.filter((x) => x.sheet === sh.name).length;
        mark(key, state.stopped ? "error" : "done", state.stopped ? "stopped" : failedHere ? `${failedHere} failed` : `${rows.length.toLocaleString()} rows`);
      }
      state.phase = "done";
    } catch (e) {
      state.phase = "error";
      state.error = errText(e);
      const activeStep = state.steps.find((x) => x.status === "active");
      if (activeStep) Object.assign(activeStep, { status: "error", detail: "failed" });
    }
    push();
    if (state.tables.length) onCreated?.(state.tables[0], state.counts.emptied ? `${state.counts.emptied} cell${state.counts.emptied === 1 ? "" : "s"} didn’t match the chosen type and were left empty` : undefined);
  };

  const downloadImportErrors = () => {
    const bySheet = new Map();
    (run?.errors || []).forEach((e) => bySheet.set(e.sheet, [...(bySheet.get(e.sheet) || []), e]));
    downloadWorkbook(
      [...bySheet.entries()].map(([sheetName, list]) => {
        const sh = sheets.find((x) => x.name === sheetName);
        const cols = (sh?.fields || []).filter((f) => f.include !== false);
        return { name: sheetName.slice(0, 28), header: ["Row", "Error", ...cols.map((f) => f.label)], rows: list.map((e) => [e.row, e.message, ...cols.map((f) => e.raw[f.sourceColumn] ?? "")]) };
      }),
      "import-errors"
    );
  };

  const sheet = sheets[active];
  const running = run?.phase === "running";
  const finished = Boolean(run) && !running;
  const firstTable = run?.tables?.[0];
  const counts = run && [
    { label: "rows imported", value: run.counts.created, tone: "success" },
    { label: "rows failed", value: run.counts.failed, tone: run.counts.failed ? "danger" : undefined },
    ...(finished ? [{ label: "cells left empty", value: run.counts.emptied, tone: run.counts.emptied ? "warning" : undefined }] : []),
  ];
  const clean = finished && run.phase === "done" && !run.stopped && !run.counts.failed;

  return (
    <AppDialog
      open={open}
      onClose={running ? undefined : onClose}
      size="md"
      title={running ? "Creating and importing" : finished ? (clean ? "Import complete" : run.phase === "error" ? "Import stopped by an error" : run.stopped ? "Import stopped" : "Imported with some failed rows") : "New table"}
      description={
        running
          ? "Keep this window open. You can stop after the current batch."
          : finished
            ? `${run.tables.length} table${run.tables.length === 1 ? "" : "s"} created · ${run.counts.created.toLocaleString()} row${run.counts.created === 1 ? "" : "s"} imported${run.stopped ? ". Rows imported so far are kept; import the rest from the table’s Data menu." : ""}`
            : undefined
      }
      icon={finished ? (clean ? <CheckCircle sx={{ color: "var(--success)" }} /> : <WarningAmberOutlined sx={{ color: "var(--warning)" }} />) : undefined}
      error={!run && error ? { title: "Couldn’t create the table", message: error } : finished && run.phase === "error" ? { title: "Something went wrong", message: `${run.error}. Tables and rows created before the error are kept.` } : undefined}
      actions={
        running ? (
          <Button variant="outlined" onClick={() => { stopRef.current = true; setRun((r) => r && { ...r, stopping: true }); }} disabled={run.stopping}>
            {run.stopping ? "Stopping after this batch…" : "Stop import"}
          </Button>
        ) : finished ? (
          <>
            <Button variant="outlined" onClick={onClose}>Close</Button>
            {firstTable && <Button variant="contained" onClick={() => { onClose(); navigate(`/tables/${firstTable.id}`); }}>Open {run.tables.length > 1 ? "first table" : "table"}</Button>}
          </>
        ) : (
          <>
            <Button variant="outlined" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="contained" onClick={create} loading={busy} loadingPosition="start" startIcon={<span />} disabled={reading || (source === "file" && !file)}>
              {source === "file" && importRows ? "Create and import" : busy ? "Creating…" : "Create table"}
            </Button>
          </>
        )
      }
    >
      {run && (
        <ProgressPanel
          title={running ? (run.current ? "Importing rows" : "Setting up") : undefined}
          description={running ? run.steps.find((x) => x.status === "active")?.label : undefined}
          steps={run.steps}
          current={run.current}
          startedAt={running ? run.startedAt : undefined}
          counts={counts}
          footer={finished && run.errors.length > 0 && <Button variant="text" onClick={downloadImportErrors}>Download the {run.errors.length} failed row{run.errors.length === 1 ? "" : "s"} with reasons (.xlsx)</Button>}
        />
      )}
      {!run && (
      <>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1, mb: 2.5 }}>
          {SOURCES.map((s) => {
            const Icon = s.icon;
            const on = source === s.value;
            return (
              <Box key={s.value} component="button" type="button" onClick={() => setSource(s.value)} aria-pressed={on}
                sx={{ textAlign: "left", p: 1.5, borderRadius: "10px", font: "inherit", cursor: "pointer", border: on ? "1px solid var(--accent)" : "1px solid var(--border)", backgroundColor: on ? "var(--accent-subtle)" : "var(--surface)", boxShadow: on ? "0 0 0 3px var(--accent-ring)" : "none" }}>
                <Icon sx={{ fontSize: 20, color: on ? "var(--accent-text)" : "var(--text-muted)" }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.5 }}>{s.label}</Typography>
                <Typography sx={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{s.hint}</Typography>
              </Box>
            );
          })}
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
          <TextField label={source === "file" && sheets.filter((s) => s.include).length > 1 ? "Name prefix" : "Table name"} value={name} onChange={(e) => setName(e.target.value)} sx={{ flex: 1, minWidth: 220 }} required inputProps={{ dir: "auto" }} />
          <CategoryPicker value={tax} onChange={setTax} />
        </Box>
        <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={1} sx={{ mb: 2 }} />

        {source === "template" && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "260px 1fr" }, gap: 2 }}>
            <Box sx={{ border: "1px solid var(--border)", borderRadius: "10px", maxHeight: 320, overflowY: "auto" }}>
              {[["For this tracker", matching], ["Other trackers", others]].map(([label, list]) => list.length > 0 && (
                <Box key={label}>
                  <Typography sx={{ px: 1.5, pt: 1, pb: 0.5, fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{label}</Typography>
                  {list.map((tpl) => (
                    <Box key={tpl._id} component="button" type="button" onClick={() => { setTemplateId(tpl._id); if (!name) setName(tpl.name); }}
                      sx={{ display: "block", width: "100%", textAlign: "left", px: 1.5, py: 1, border: 0, font: "inherit", cursor: "pointer", backgroundColor: templateId === tpl._id ? "var(--surface-active)" : "transparent", "&:hover": { backgroundColor: "var(--surface-hover)" } }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{tpl.name}</Typography>
                      <Box sx={{ display: "flex", gap: 0.5, mt: 0.25 }}>
                        <Badge tone={tpl.source === "built_in" ? "accent" : "neutral"} sx={{ height: 18, fontSize: 10.5 }}>{tpl.source === "built_in" ? "Built-in" : tpl.source === "uploaded" ? "Uploaded" : "Saved"}</Badge>
                        <Badge sx={{ height: 18, fontSize: 10.5 }}>{tpl.fields?.length || 0} fields</Badge>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ))}
              {!templates.length && <Typography sx={{ p: 2, fontSize: 13, color: "var(--text-muted)" }}>No templates yet.</Typography>}
            </Box>
            <Box>
              {preview ? (
                <>
                  <Typography sx={{ fontSize: 13, color: "var(--text-secondary)", mb: 1 }}>{preview.description}</Typography>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", maxHeight: 250, overflowY: "auto" }}>
                    {preview.fields.map((f, i) => <Badge key={i} outline title={FIELD_TYPES[f.type]?.label}>{f.label.split("|")[0].trim()}{f.coreMapping ? " ●" : ""}</Badge>)}
                  </Box>
                  {preview.sampleRows?.length > 0 && <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={withSample} onChange={(e) => setWithSample(e.target.checked)} />} label={`Add the ${preview.sampleRows.length} sample rows`} />}
                  <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", mt: 1 }}>● feeds the app’s core concepts (calendar, dashboard, task views)</Typography>
                </>
              ) : <Typography sx={{ fontSize: 13, color: "var(--text-muted)" }}>Pick a template to see its fields.</Typography>}
            </Box>
          </Box>
        )}

        {source === "duplicate" && (
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <TextField select label="Table to copy" value={dupId} onChange={(e) => { setDupId(e.target.value); if (!name) setName(`${tables.find((t) => t._id === e.target.value)?.name} copy`); }} sx={{ minWidth: 300 }}>
              {tables.map((t) => <MenuItem key={t._id} value={t._id}>{t.name} · {t.issueCategory}{t.issueSubCategory ? ` · ${t.issueSubCategory}` : ""}</MenuItem>)}
            </TextField>
            <FormControlLabel control={<Checkbox checked={dupRows} onChange={(e) => setDupRows(e.target.checked)} />} label="Copy the rows too" />
          </Box>
        )}

        {source === "file" && (
          <Box>
            {reading ? (
              <Box sx={{ p: 4, textAlign: "center", borderRadius: "12px", border: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)" }}>
                <CircularProgress size={22} thickness={5} sx={{ color: "var(--accent)" }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 1 }}>Reading the workbook…</Typography>
                <Typography sx={{ fontSize: 12, color: "var(--text-secondary)" }}>Detecting sheets, header rows and field types.</Typography>
              </Box>
            ) : !file ? (
              <Box role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
                sx={{ p: 4, textAlign: "center", borderRadius: "12px", border: "2px dashed var(--border-strong)", backgroundColor: "var(--surface-subtle)", cursor: "pointer" }}>
                <UploadFileOutlined sx={{ fontSize: 34, color: "var(--text-muted)" }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 1 }}>Drop a workbook or click to browse</Typography>
                <Typography sx={{ fontSize: 12, color: "var(--text-secondary)" }}>Each sheet can become its own table. The file is stored with the table.</Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.5, alignItems: "center" }}>
                  <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mr: 1 }}><strong>{file.name}</strong> · {sheets.length} sheet{sheets.length === 1 ? "" : "s"}</Typography>
                  {sheets.map((s, i) => (
                    <Box key={s.name} sx={{ display: "inline-flex", alignItems: "center", borderRadius: "8px", border: i === active ? "1px solid var(--accent)" : "1px solid var(--border)", pr: 1 }}>
                      <Checkbox size="small" checked={s.include} onChange={(e) => setSheets((l) => l.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))} inputProps={{ "aria-label": `Create a table from ${s.name}` }} />
                      <Box component="button" type="button" onClick={() => setActive(i)} sx={{ border: 0, background: "none", font: "inherit", fontSize: 12.5, cursor: "pointer", color: "var(--text)" }}>{s.name} <span style={{ color: "var(--text-muted)" }}>· {s.body.length} rows</span></Box>
                    </Box>
                  ))}
                  <Button size="small" onClick={() => { setFile(null); setSheets([]); }}>Change file</Button>
                </Box>
                {sheet && (
                  <>
                    <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mb: 0.75 }}>Header row {sheet.headerIdx + 1} · check each field’s name and type</Typography>
                    <SheetFields sheet={sheet} onChange={(fi, patch) => updateField(active, fi, patch)} />
                  </>
                )}
                <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
                  <FormControlLabel control={<Checkbox checked={importRows} onChange={(e) => setImportRows(e.target.checked)} />} label="Import the rows too" />
                  <FormControlLabel control={<Checkbox checked={saveTemplate} onChange={(e) => setSaveTemplate(e.target.checked)} />} label="Also save as a template" />
                </Box>
              </>
            )}
            <input ref={input} type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => onFile(e.target.files?.[0])} />
          </Box>
        )}
      </>
      )}
    </AppDialog>
  );
};

export default NewTableDialog;
