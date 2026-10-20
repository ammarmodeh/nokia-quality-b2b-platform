import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, IconButton, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import Close from "@mui/icons-material/Close";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import LinkOff from "@mui/icons-material/LinkOff";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Sheet from "../../components/ui/Sheet";
import Badge from "../../components/ui/Badge";
import { CellEditor, CellValue } from "./CellValue";
import { FIELD_TYPES, READ_ONLY, formatValue, parseInput } from "./fieldTypes";
import { filesApi, tablesApi } from "./tablesApi";
import { rawOf } from "./viewUtils";
import { errText } from "./useTable";

const AddTask = lazy(() => import("../../components/task/AddTask"));

const Attachments = ({ field, value = [], onChange, canEdit, table }) => {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null); // { file, url }
  const input = useRef(null);
  const ids = useMemo(() => value || [], [value]);
  useEffect(() => {
    let off = false;
    if (!ids.length) { setFiles([]); return undefined; }
    filesApi.list({ tableId: table._id, purpose: "attachment" }).then((all) => !off && setFiles(all.filter((f) => ids.includes(f._id))));
    return () => { off = true; };
  }, [ids, table._id]);
  useEffect(() => () => preview?.url && URL.revokeObjectURL(preview.url), [preview]);

  const upload = async (list) => {
    const added = [];
    for (const file of list) added.push(await filesApi.upload(file, { tableId: table._id, purpose: "attachment" }));
    onChange([...ids, ...added.map((f) => f._id)]);
  };
  const open = async (f) => {
    if (/^(image\/|application\/pdf)/.test(f.mimeType || "")) setPreview({ file: f, url: await filesApi.download(f, { inline: true }) });
    else filesApi.download(f);
  };
  return (
    <Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {files.map((f) => (
          <Box key={f._id} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.5, borderRadius: "6px", border: "1px solid var(--border)" }}>
            <AttachFileOutlined sx={{ fontSize: 15, color: "var(--text-muted)" }} />
            <Box component="button" type="button" onClick={() => open(f)} sx={{ flex: 1, minWidth: 0, textAlign: "left", border: 0, background: "none", font: "inherit", fontSize: 12.5, color: "var(--accent-text)", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.originalName}</Box>
            <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{Math.max(1, Math.round(f.size / 1024))} KB</Typography>
            <IconButton size="small" aria-label="Download" onClick={() => filesApi.download(f)}><DownloadOutlined sx={{ fontSize: 15 }} /></IconButton>
            {canEdit && <IconButton size="small" aria-label="Remove attachment" onClick={() => onChange(ids.filter((x) => x !== f._id))}><Close sx={{ fontSize: 15 }} /></IconButton>}
          </Box>
        ))}
      </Box>
      {canEdit && (
        <>
          <Button size="small" startIcon={<AttachFileOutlined />} onClick={() => input.current?.click()} sx={{ mt: 0.5 }}>Attach files</Button>
          <input ref={input} type="file" multiple hidden onChange={(e) => { upload([...e.target.files]); e.target.value = ""; }} aria-label={`Attach files to ${field.label}`} />
        </>
      )}
      {preview && (
        <Box sx={{ mt: 1, border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
          <Box sx={{ display: "flex", alignItems: "center", px: 1, py: 0.5, backgroundColor: "var(--surface-subtle)" }}>
            <Typography noWrap sx={{ fontSize: 12, flex: 1 }}>{preview.file.originalName}</Typography>
            <IconButton size="small" aria-label="Close preview" onClick={() => setPreview(null)}><Close sx={{ fontSize: 15 }} /></IconButton>
          </Box>
          {preview.file.mimeType === "application/pdf" ? (
            <Box component="iframe" title={preview.file.originalName} src={preview.url} sx={{ width: "100%", height: 420, border: 0 }} />
          ) : (
            <Box component="img" alt={preview.file.originalName} src={preview.url} sx={{ display: "block", maxWidth: "100%", maxHeight: 420, mx: "auto" }} />
          )}
        </Box>
      )}
    </Box>
  );
};

const describe = (v, field, lookups) => (v === null || v === undefined || v === "" ? "empty" : field ? formatValue(field, v, null, lookups) || "empty" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Row detail: every field, attachments, linked task and the change history. */
const RowSheet = ({ open, onClose, table, fields, row, lookups, canEdit, onUpdateCells, onDelete, onRowChange, notify }) => {
  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState(null);
  const [activity, setActivity] = useState(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const allFields = useMemo(() => Object.fromEntries((table?.fields || []).map((f) => [f.key, f])), [table]);

  useEffect(() => { setEditing(null); setActivity(null); }, [row?._id]);
  useEffect(() => {
    if (open && row && tab === 1) tablesApi.activity(table._id, row._id).then(setActivity).catch((e) => notify(errText(e)));
  }, [open, row, tab, table, notify]);

  if (!row) return null;
  const primary = allFields[table.primaryField];
  const title = (primary && formatValue(primary, rawOf(primary, row), row, lookups)) || `Row #${row.autoNumber}`;

  const save = async (f, raw) => {
    setEditing(null);
    const p = ["singleSelect", "multiSelect", "checkbox", "user", "fieldTeam", "taxonomy", "rating", "attachment"].includes(f.type) ? { value: raw } : parseInput(f, raw, lookups);
    if (p.error) return notify(`${f.label}: ${p.error}`);
    await onUpdateCells([{ rowId: row._id, key: f.key, value: p.value }]);
  };

  const byConcept = Object.fromEntries(fields.filter((f) => f.coreMapping).map((f) => [f.coreMapping, f]));
  const pick = (re) => fields.find((f) => re.test(f.label));
  const taskDefaults = () => {
    const val = (f) => (f ? formatValue(f, rawOf(f, row), row, lookups) : undefined);
    const dateVal = (f) => (f && rawOf(f, row) ? String(rawOf(f, row)).slice(0, 10) : undefined);
    return {
      slid: val(byConcept.customerId || pick(/slid|int\b/i)),
      customerName: val(pick(/customer name|cust name/i)),
      contactNumber: val(pick(/contact|phone/i)),
      requestNumber: val(pick(/req(uest)? ?(no|number)/i)),
      pisDate: dateVal(pick(/pis/i)),
      interviewDate: dateVal(byConcept.date && /interview/i.test(byConcept.date.label) ? byConcept.date : pick(/interview/i)),
      customerFeedback: val(pick(/feedback|comment|complaint/i)),
    };
  };
  const linkTask = async (taskId) => {
    try {
      onRowChange(await tablesApi.updateRow(table._id, row._id, { linkedTaskId: taskId }));
      notify(taskId ? "Task linked to this row" : "Task unlinked", "neutral");
    } catch (e) {
      notify(errText(e));
    }
  };
  const legacy = Object.entries(row.legacy || {}).filter(([, v]) => v !== null && v !== undefined);

  return (
    <Sheet open={open} onClose={onClose} width={560} title={title} description={`#${row.autoNumber} · ${table.name}`}
      actions={canEdit && onDelete ? <Tooltip title="Delete row"><IconButton aria-label="Delete row" onClick={() => onDelete(row)}><DeleteOutline fontSize="small" /></IconButton></Tooltip> : undefined}>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2, mt: -1 }}>
        <Tab label="Details" />
        <Tab label="Activity" />
      </Tabs>
      {tab === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          {fields.map((f) => {
            const Icon = FIELD_TYPES[f.type]?.icon;
            const value = rawOf(f, row);
            const isEditing = editing === f.key;
            const can = canEdit && !READ_ONLY.includes(f.type);
            return (
              <Box key={f.key} sx={{ display: "grid", gridTemplateColumns: "170px minmax(0,1fr)", gap: 1.5, alignItems: "start", py: 0.75, borderBottom: "1px solid var(--border)" }}>
                <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", pt: 0.5, minWidth: 0 }}>
                  {Icon && <Icon sx={{ fontSize: 15, color: "var(--text-muted)", flexShrink: 0 }} />}
                  <Typography dir="auto" sx={{ fontSize: 12.5, color: "var(--text-secondary)", wordBreak: "break-word" }} title={f.description || undefined}>{f.label}{f.required ? " *" : ""}</Typography>
                </Box>
                {f.type === "attachment" ? (
                  <Attachments field={f} value={value} table={table} canEdit={can} onChange={(ids) => save(f, ids)} />
                ) : isEditing ? (
                  <CellEditor field={f} value={value} lookups={lookups} inline={false} onCommit={(v) => save(f, v)} onCancel={() => setEditing(null)} />
                ) : (
                  <Box role={can ? "button" : undefined} tabIndex={can ? 0 : undefined} onClick={() => can && setEditing(f.key)} onKeyDown={(e) => can && e.key === "Enter" && setEditing(f.key)}
                    sx={{ minHeight: 30, px: 1, py: 0.5, borderRadius: "6px", fontSize: 13, cursor: can ? "text" : "default", display: "flex", alignItems: "center", "&:hover": can ? { backgroundColor: "var(--surface-hover)" } : {}, "&:focus-visible": { outline: "2px solid var(--focus-ring)" } }}>
                    {value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length) ? (
                      READ_ONLY.includes(f.type) ? <CellValue field={f} value={value} row={row} lookups={lookups} /> : <Typography sx={{ fontSize: 13, color: "var(--text-muted)" }}>{can ? "Add…" : "—"}</Typography>
                    ) : (
                      <CellValue field={f} value={value} row={row} lookups={lookups} wrap />
                    )}
                  </Box>
                )}
              </Box>
            );
          })}

          <Box sx={{ mt: 2, p: 1.5, borderRadius: "10px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <TaskAltOutlined sx={{ fontSize: 18, color: "var(--text-muted)" }} />
            <Typography sx={{ fontSize: 13, flex: 1 }}>{row.linkedTaskId ? "Linked to a task" : "Not linked to a task"}</Typography>
            {row.linkedTaskId ? (
              <>
                <Button size="small" component={RouterLink} to={`/tasks-list?task=${row.linkedTaskId}`}>Open task</Button>
                {canEdit && <Button size="small" startIcon={<LinkOff sx={{ fontSize: 16 }} />} onClick={() => linkTask(null)}>Unlink</Button>}
              </>
            ) : canEdit && <Button size="small" variant="outlined" onClick={() => setTaskOpen(true)}>Create task from row</Button>}
          </Box>

          {legacy.length > 0 && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: "10px", backgroundColor: "var(--warning-subtle)" }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>Values kept from a field type change</Typography>
              {legacy.map(([k, v]) => <Typography key={k} sx={{ fontSize: 12.5 }}><strong>{allFields[k]?.label || k}:</strong> {describe(v)}</Typography>)}
            </Box>
          )}
          <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", mt: 1.5 }}>
            Created {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}{lookups.users[row.createdBy] ? ` by ${lookups.users[row.createdBy].name}` : ""} · updated {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true })}
          </Typography>
        </Box>
      )}
      {tab === 1 && (
        <Box>
          {!activity && <Typography sx={{ fontSize: 13, color: "var(--text-muted)" }}>Loading…</Typography>}
          {activity?.length === 0 && <Typography sx={{ fontSize: 13, color: "var(--text-muted)" }}>No changes recorded.</Typography>}
          {activity?.map((a) => (
            <Box key={a._id} sx={{ py: 1, borderBottom: "1px solid var(--border)" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Badge tone={a.action === "create" ? "success" : a.action === "delete" || a.action === "rollback" ? "danger" : "info"}>{a.action}</Badge>
                <Typography sx={{ fontSize: 12.5, flex: 1 }}>{a.user?.name || "Someone"}{a.batchId ? " · import" : ""}</Typography>
                <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</Typography>
              </Box>
              {a.action !== "create" && a.changes?.map((c, i) => (
                <Typography key={i} dir="auto" sx={{ fontSize: 12.5, color: "var(--text-secondary)", mt: 0.5 }}>
                  <strong>{allFields[c.field]?.label || c.field}</strong>: {describe(c.old, allFields[c.field], lookups)} → {describe(c.new, allFields[c.field], lookups)}
                </Typography>
              ))}
            </Box>
          ))}
        </Box>
      )}
      <Suspense fallback={null}>
        {taskOpen && <AddTask open={taskOpen} setOpen={setTaskOpen} initialValues={taskDefaults()} onCreated={(t) => t?._id && linkTask(t._id)} />}
      </Suspense>
    </Sheet>
  );
};

export default RowSheet;
