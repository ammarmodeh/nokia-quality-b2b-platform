import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, MenuItem, TextField, Typography } from "@mui/material";
import AddBoxOutlined from "@mui/icons-material/AddBoxOutlined";
import DashboardCustomizeOutlined from "@mui/icons-material/DashboardCustomizeOutlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import Badge from "../../components/ui/Badge";
import ErrorState from "../../components/ui/ErrorState";
import { readWorkbook } from "../../components/dataio/parse";
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
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const input = useRef(null);

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
    setBusy(true);
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
      setBusy(false);
    }
  };
  const updateField = (si, fi, patch) => setSheets((list) => list.map((s, i) => (i !== si ? s : { ...s, fields: s.fields.map((f, j) => (j === fi ? { ...f, ...patch } : f)) })));

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const base = { description, issueCategory: tax.category, issueSubCategory: tax.sub };
      if (source === "file") {
        const chosen = sheets.filter((s) => s.include);
        if (!chosen.length) throw new Error("Choose at least one sheet");
        const stored = await filesApi.upload(file, { purpose: saveTemplate ? "template" : "import" }).catch(() => null);
        let first = null;
        for (const s of chosen) {
          const cols = s.fields.filter((f) => f.include !== false);
          if (!cols.length) continue;
          const fieldDefs = cols.map(({ label, type, options }) => ({ label: label.trim() || "Untitled", type, options: type === "singleSelect" || type === "multiSelect" ? options || { choices: [] } : undefined }));
          const tableName = chosen.length > 1 ? `${name} · ${s.tableName}` : name;
          const table = await tablesApi.create({ ...base, name: tableName, fields: fieldDefs });
          first ||= table;
          if (saveTemplate) await templatesApi.create({ ...base, name: tableName, fields: fieldDefs, source: "uploaded", sourceFileId: stored?._id });
          if (importRows && s.body.length) {
            const live = table.fields;
            let skippedCells = 0;
            const rows = s.body.map((r, i) => {
              const data = {};
              cols.forEach((c, j) => {
                const p = parseInput(live[j], r[c.sourceColumn]);
                if (p.error) skippedCells++;
                else if (p.value !== null && p.value !== undefined) data[live[j].key] = p.value;
              });
              return { __row: s.headerIdx + 2 + i, data };
            });
            let batchId;
            for (let i = 0; i < rows.length; i += 500) {
              setProgress({ sheet: s.name, done: i, total: rows.length });
              const out = await tablesApi.importRows(table._id, { rows: rows.slice(i, i + 500), mode: "create", dryRun: false, batchId, fileId: stored?._id, sheet: s.name, final: i + 500 >= rows.length });
              batchId = out.batchId;
            }
            if (skippedCells) onCreated?.(table, `${skippedCells} cell${skippedCells === 1 ? "" : "s"} didn't match the chosen type and were left empty`);
          }
        }
        setProgress(null);
        if (first) { onClose(); navigate(`/tables/${first._id}`); }
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
      setProgress(null);
    } finally {
      setBusy(false);
    }
  };

  const sheet = sheets[active];
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>New table</DialogTitle>
      <DialogContent>
        {error && <ErrorState title="Couldn't create the table" message={error} sx={{ mb: 2 }} />}
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
            {!file ? (
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
        {busy && <LinearProgress sx={{ mt: 2 }} variant={progress ? "determinate" : "indeterminate"} value={progress ? (progress.done / progress.total) * 100 : undefined} />}
        {progress && <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", mt: 0.5 }}>Importing {progress.sheet}: {progress.done} of {progress.total} rows…</Typography>}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={create} disabled={busy || (source === "file" && !file)}>{source === "file" && importRows ? "Create and import" : "Create table"}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewTableDialog;
