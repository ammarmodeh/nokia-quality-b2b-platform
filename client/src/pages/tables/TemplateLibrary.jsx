import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import { Box, Button, IconButton, InputAdornment, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import Search from "@mui/icons-material/Search";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlined from "@mui/icons-material/UnarchiveOutlined";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Add from "@mui/icons-material/Add";
import SectionCard from "../../components/ui/SectionCard";
import Badge from "../../components/ui/Badge";
import Sheet from "../../components/ui/Sheet";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import { downloadWorkbook, readWorkbook } from "../../components/dataio/parse";
import { TAXONOMY, taxonomyByLabel, taxonomyLabel } from "../../constants/taxonomy";
import { CORE_CONCEPTS, FIELD_TYPES, READ_ONLY, SELECT_TYPES, inferFields } from "./fieldTypes";
import { filesApi, templatesApi } from "./tablesApi";
import { errText } from "./useTable";

const SOURCE = { built_in: ["Built-in", "accent"], uploaded: ["Uploaded", "info"], saved_from_table: ["Saved", "neutral"] };
const TYPES = Object.entries(FIELD_TYPES).filter(([t]) => !READ_ONLY.includes(t));
const TAX_VALUES = TAXONOMY.flatMap((t) => (t.subs.length ? t.subs.map((s) => ({ category: t.label, sub: s })) : [{ category: t.label, sub: null }]));

const downloadTemplateFile = (tpl) => {
  const lists = tpl.fields.filter((f) => f.options?.choices?.length);
  const max = Math.max(0, ...lists.map((f) => f.options.choices.length));
  downloadWorkbook(
    [
      { name: "Template", header: tpl.fields.map((f) => (f.required ? `${f.label} *` : f.label)), rows: (tpl.sampleRows || []).map((r) => tpl.fields.map((f) => r[f.label] ?? "")) },
      ...(lists.length ? [{ name: "Lists", header: lists.map((f) => f.label), rows: Array.from({ length: max }, (_x, i) => lists.map((f) => f.options.choices[i]?.value ?? "")) }] : []),
    ],
    `${tpl.name.toLowerCase().replace(/[^\w]+/g, "-")}-template`
  );
};

/** Edit a template's name, tracker and fields. Saving makes a new version. */
const TemplateEditor = ({ initial, onClose, onSaved }) => {
  const [t, setT] = useState(() => ({ ...initial, fields: (initial.fields || []).map((f) => ({ ...f, options: { ...(f.options || {}), choices: f.options?.choices || [] } })) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const setField = (i, patch) => setT((x) => ({ ...x, fields: x.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));
  const move = (i, d) => setT((x) => { const l = [...x.fields]; const j = i + d; if (j < 0 || j >= l.length) return x; [l[i], l[j]] = [l[j], l[i]]; return { ...x, fields: l }; });
  const isNew = !initial._id;
  const builtIn = initial.source === "built_in";

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { name: t.name, description: t.description, issueCategory: t.issueCategory, issueSubCategory: t.issueSubCategory, fields: t.fields, sourceFileId: t.sourceFileId, source: t.source === "saved_from_table" ? "saved_from_table" : "uploaded" };
      onSaved(isNew ? await templatesApi.create(body) : await templatesApi.update(initial._id, body));
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} width={680} title={isNew ? "New template" : `Edit “${initial.name}”`}
      description={builtIn ? "Built-in templates can't change; saving creates your own editable copy." : isNew ? "Check the fields inferred from your sheet." : `Version ${initial.version}. Saving creates version ${initial.version + 1}; tables already made from it don't change.`}
      footer={
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", width: "100%" }}>
          {error && <Typography sx={{ fontSize: 12.5, color: "var(--danger)", flex: 1, alignSelf: "center" }}>{error}</Typography>}
          <Button variant="outlined" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={busy || !t.name?.trim() || !t.fields.length}>{busy ? "Saving…" : builtIn ? "Save as my copy" : "Save"}</Button>
        </Box>
      }>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <TextField label="Name" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} sx={{ flex: 1, minWidth: 220 }} />
          <TextField select label="Tracker" value={`${t.issueCategory}|${t.issueSubCategory || ""}`} onChange={(e) => { const [c, s] = e.target.value.split("|"); setT({ ...t, issueCategory: c, issueSubCategory: s || null }); }} sx={{ minWidth: 220 }}>
            {TAX_VALUES.map((v) => <MenuItem key={`${v.category}|${v.sub || ""}`} value={`${v.category}|${v.sub || ""}`}>{taxonomyLabel(v.category, v.sub)}</MenuItem>)}
          </TextField>
        </Box>
        <TextField label="Description" value={t.description || ""} onChange={(e) => setT({ ...t, description: e.target.value })} multiline minRows={2} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, mt: 1 }}>Fields ({t.fields.length})</Typography>
        <Box sx={{ border: "1px solid var(--border)", borderRadius: "10px" }}>
          {t.fields.map((f, i) => (
            <Box key={i} sx={{ p: 1, borderBottom: "1px solid var(--border)", "&:last-of-type": { borderBottom: 0 } }}>
              <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                <TextField size="small" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} sx={{ flex: 1 }} inputProps={{ dir: "auto", "aria-label": "Field name" }} />
                <TextField select size="small" value={f.type} onChange={(e) => setField(i, { type: e.target.value })} sx={{ width: 160 }} slotProps={{ htmlInput: { "aria-label": "Field type" } }}>
                  {TYPES.map(([k, m]) => <MenuItem key={k} value={k}>{m.label}</MenuItem>)}
                </TextField>
                <TextField select size="small" value={f.coreMapping || ""} onChange={(e) => setField(i, { coreMapping: e.target.value || null })} sx={{ width: 150 }} slotProps={{ htmlInput: { "aria-label": "Core concept" } }} SelectProps={{ displayEmpty: true, renderValue: (v) => (v ? CORE_CONCEPTS[v].label : "No mapping") }}>
                  <MenuItem value="">No mapping</MenuItem>
                  {Object.entries(CORE_CONCEPTS).filter(([, c]) => c.types.includes(f.type)).map(([k, c]) => <MenuItem key={k} value={k}>{c.label}</MenuItem>)}
                </TextField>
                <IconButton size="small" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUpward sx={{ fontSize: 15 }} /></IconButton>
                <IconButton size="small" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === t.fields.length - 1}><ArrowDownward sx={{ fontSize: 15 }} /></IconButton>
                <IconButton size="small" aria-label="Remove field" onClick={() => setT((x) => ({ ...x, fields: x.fields.filter((_f, j) => j !== i) }))}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
              </Box>
              {SELECT_TYPES.includes(f.type) && (
                <TextField size="small" fullWidth sx={{ mt: 0.75 }} label="Options (comma-separated)" value={(f.options?.choices || []).map((c) => c.value).join(", ")}
                  onChange={(e) => setField(i, { options: { ...f.options, choices: e.target.value.split(",").map((v, k) => ({ value: v.trim(), color: f.options?.choices?.[k]?.color || "gray" })).filter((c, k, arr) => c.value || k === arr.length - 1) } })} />
              )}
            </Box>
          ))}
        </Box>
        <Button size="small" startIcon={<Add />} sx={{ alignSelf: "flex-start" }} onClick={() => setT((x) => ({ ...x, fields: [...x.fields, { label: "New field", type: "text", options: { choices: [] } }] }))}>Add field</Button>
        {initial.history?.length > 0 && (
          <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>
            Earlier versions: {initial.history.map((h) => `v${h.version} (${format(new Date(h.savedAt), "dd MMM yyyy")})`).join(", ")}
          </Typography>
        )}
      </Box>
    </Sheet>
  );
};

/** Settings → Templates: browse, preview, upload, edit, version, download. */
const TemplateLibrary = () => {
  const isAdmin = useSelector((s) => s?.auth?.user?.role) === "Admin";
  const [list, setList] = useState(null);
  const [archived, setArchived] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const input = useRef(null);

  const load = useCallback(() => templatesApi.list({ archived }).then(setList).catch((e) => setError(errText(e))), [archived]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    templatesApi.get(openId).then(setDetail).catch((e) => setError(errText(e)));
  }, [openId]);

  const shown = useMemo(() => (list || []).filter((t) => (!cat || t.issueCategory === cat) && (!q || `${t.name} ${t.description}`.toLowerCase().includes(q.toLowerCase()))), [list, q, cat]);

  const upload = async (file) => {
    if (!file) return;
    try {
      const sheets = await readWorkbook(file);
      const sh = sheets.find((s) => s.rows.length > 1) || sheets[0];
      let hi = 0;
      let best = -1;
      sh.rows.slice(0, 10).forEach((r, i) => { const n = r.filter((v) => typeof v === "string" && v.trim()).length; if (n > best) { best = n; hi = i; } });
      const body = sh.rows.slice(hi + 1).filter((r) => r.some((v) => v !== ""));
      const fields = inferFields(sh.rows[hi] || [], body).filter((f) => f.filled || f.label).map(({ label, type, options }) => ({ label, type, options: options || { choices: [] } }));
      const stored = await filesApi.upload(file, { purpose: "template" }).catch(() => null);
      setEditing({ name: file.name.replace(/\.[^.]+$/, ""), description: `From ${file.name} · sheet “${sh.name}”`, issueCategory: "OJO Snags", issueSubCategory: "Installation", fields, source: "uploaded", sourceFileId: stored?._id });
    } catch (e) {
      setError(`Couldn't read the file: ${e.message}`);
    }
  };

  const act = async (fn) => {
    try { await fn(); load(); } catch (e) { setError(errText(e)); }
  };

  return (
    <SectionCard title="Templates" description="Starting points for custom tables. Built-in templates come from the team's working sheets; upload a workbook or save any table to add your own."
      actions={isAdmin ? <><Button variant="outlined" size="small" startIcon={<UploadFileOutlined sx={{ fontSize: 17 }} />} onClick={() => input.current?.click()}>Upload Excel</Button><input ref={input} type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} /></> : undefined}>
      {error && <ErrorState title="Something went wrong" message={error} sx={{ mb: 2 }} />}
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <TextField size="small" placeholder="Search templates" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1, minWidth: 200 }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 17 }} /></InputAdornment> } }} />
        <TextField select size="small" value={cat} onChange={(e) => setCat(e.target.value)} sx={{ width: 200 }} SelectProps={{ displayEmpty: true }} slotProps={{ htmlInput: { "aria-label": "Tracker" } }}>
          <MenuItem value="">All trackers</MenuItem>
          {TAXONOMY.map((t) => <MenuItem key={t.label} value={t.label}>{t.label}</MenuItem>)}
        </TextField>
        <Button size="small" variant={archived ? "contained" : "text"} onClick={() => setArchived((a) => !a)}>{archived ? "Showing archived" : "Archived"}</Button>
      </Box>
      {list && !shown.length && <EmptyState title="No templates" description={q || cat ? "Nothing matches these filters." : "Upload a workbook to create one."} minHeight={160} />}
      <Box sx={{ display: "flex", flexDirection: "column", border: shown.length ? "1px solid var(--border)" : 0, borderRadius: "10px", overflow: "hidden" }}>
        {shown.map((t) => {
          const [srcLabel, srcTone] = SOURCE[t.source] || SOURCE.uploaded;
          const open = openId === t._id;
          return (
            <Box key={t._id} sx={{ borderBottom: "1px solid var(--border)", "&:last-of-type": { borderBottom: 0 } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1.25, cursor: "pointer", "&:hover": { backgroundColor: "var(--surface-hover)" } }} onClick={() => setOpenId(open ? null : t._id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpenId(open ? null : t._id)} aria-expanded={open}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: taxonomyByLabel[t.issueCategory]?.color, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 500 }}>{t.name}</Typography>
                  <Typography noWrap sx={{ fontSize: 12, color: "var(--text-secondary)" }}>{taxonomyLabel(t.issueCategory, t.issueSubCategory)} · {t.fields?.length || 0} fields{t.source !== "built_in" ? ` · v${t.version}${t.createdBy?.name ? ` · ${t.createdBy.name}` : ""}` : ""}</Typography>
                </Box>
                <Badge tone={srcTone}>{srcLabel}</Badge>
                <Tooltip title="Download as .xlsx"><IconButton size="small" aria-label="Download template" onClick={(e) => { e.stopPropagation(); templatesApi.get(t._id).then(downloadTemplateFile); }}><FileDownloadOutlined sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                {isAdmin && <Tooltip title="Duplicate"><IconButton size="small" aria-label="Duplicate" onClick={(e) => { e.stopPropagation(); act(() => templatesApi.duplicate(t._id)); }}><ContentCopyOutlined sx={{ fontSize: 16 }} /></IconButton></Tooltip>}
                {isAdmin && <Tooltip title={t.source === "built_in" ? "Edit a copy" : "Edit"}><IconButton size="small" aria-label="Edit" onClick={(e) => { e.stopPropagation(); templatesApi.get(t._id).then(setEditing); }}><EditOutlined sx={{ fontSize: 16 }} /></IconButton></Tooltip>}
                {isAdmin && t.source !== "built_in" && (
                  <Tooltip title={t.archived ? "Restore" : "Archive"}>
                    <IconButton size="small" aria-label={t.archived ? "Restore" : "Archive"} onClick={(e) => { e.stopPropagation(); act(() => templatesApi.update(t._id, { archived: !t.archived })); }}>
                      {t.archived ? <UnarchiveOutlined sx={{ fontSize: 16 }} /> : <ArchiveOutlined sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {open && detail?._id === t._id && (
                <Box sx={{ px: 2, pb: 1.75, pt: 0.25 }}>
                  {detail.description && <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mb: 1 }}>{detail.description}</Typography>}
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {detail.fields.map((f, i) => {
                      const Icon = FIELD_TYPES[f.type]?.icon;
                      return (
                        <Badge key={i} outline title={`${FIELD_TYPES[f.type]?.label}${f.coreMapping ? ` · feeds ${CORE_CONCEPTS[f.coreMapping]?.label}` : ""}`}>
                          {Icon && <Icon sx={{ fontSize: 13, color: "var(--text-muted)" }} />}{f.label.split("|")[0].trim()}{f.coreMapping ? " ●" : ""}
                        </Badge>
                      );
                    })}
                  </Box>
                  {detail.sourceFileId && <Button size="small" sx={{ mt: 1 }} onClick={() => filesApi.list({ templateId: detail._id }).then((fs) => fs[0] && filesApi.download(fs[0]))}>Download original file</Button>}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      {editing && <TemplateEditor initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </SectionCard>
  );
};

export default TemplateLibrary;
