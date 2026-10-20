import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link as RouterLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import { Box, Button, Checkbox, Divider, IconButton, InputAdornment, ListItemIcon, Menu, MenuItem, Snackbar, Alert, TextField, Typography } from "@mui/material";
import Search from "@mui/icons-material/Search";
import ViewColumnOutlined from "@mui/icons-material/ViewColumnOutlined";
import TableRowsOutlined from "@mui/icons-material/TableRowsOutlined";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import Add from "@mui/icons-material/Add";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import ImportExportOutlined from "@mui/icons-material/ImportExportOutlined";
import ExpandMore from "@mui/icons-material/ExpandMore";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import BookmarkAddOutlined from "@mui/icons-material/BookmarkAddOutlined";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import FilterList from "@mui/icons-material/FilterList";
import WorkspacesOutlined from "@mui/icons-material/WorkspacesOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import PushPinOutlined from "@mui/icons-material/PushPinOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import Close from "@mui/icons-material/Close";
import FolderSpecialOutlined from "@mui/icons-material/FolderSpecialOutlined";
import PlaylistRemoveOutlined from "@mui/icons-material/PlaylistRemoveOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import SegmentedControl from "../../components/ui/SegmentedControl";
import GroupDialog, { groupColor } from "./GroupDialog";
import AnalysisPanel from "./AnalysisPanel";
import PageHeader from "../../components/ui/PageHeader";
import TaxonomyBadge from "../../components/ui/TaxonomyBadge";
import ErrorState from "../../components/ui/ErrorState";
import PageLoader from "../../components/ui/PageLoader";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Badge from "../../components/ui/Badge";
import EventCalendar from "../../components/calendar/EventCalendar";
import { downloadWorkbook } from "../../components/dataio/parse";
import { taxonomyByLabel, taxonomyLabel, trackerPath } from "../../constants/taxonomy";
import GridView from "./GridView";
import KanbanView from "./KanbanView";
import FieldManagerSheet from "./FieldManagerSheet";
import RowSheet from "./RowSheet";
import ImportHistorySheet from "./ImportHistorySheet";
import BulkBar from "../../components/ui/BulkBar";
import SafeDeleteDialog from "../../components/ui/SafeDeleteDialog";
import { bulkDelete, DELETE_PATHS } from "../../api/bulkDelete";
import { FilterButton, SortButton } from "./ViewControls";
import { choiceColor, formatValue, IMPORTABLE } from "./fieldTypes";
import { applyView, groupRows, rawOf } from "./viewUtils";
import { tableEntity } from "./tableImport";
import { tablesApi } from "./tablesApi";
import { errText, useLookups, useTable } from "./useTable";

const ImportWizard = lazy(() => import("../../components/dataio/ImportWizard"));

const VIEW_ICON = { grid: TableRowsOutlined, kanban: ViewKanbanOutlined, calendar: CalendarMonthOutlined };
const VIEW_STATE_KEYS = ["filters", "sorts", "groupBy", "hiddenFields", "columnOrder", "frozen", "cardFields", "dateField"];
const pickState = (v) => Object.fromEntries(VIEW_STATE_KEYS.map((k) => [k, v?.[k] ?? (["filters", "sorts", "hiddenFields", "columnOrder", "cardFields"].includes(k) ? [] : k === "frozen" ? 1 : null)]));

const workspacePath = (t) => ({ path: trackerPath(t.issueCategory), label: taxonomyByLabel[t.issueCategory]?.label || t.issueCategory });

const exportRows = (table, fields, rows, lookups, fmt = "xlsx") => {
  const header = fields.map((f) => f.label);
  const body = rows.map((r) => fields.map((f) => {
    const v = rawOf(f, r);
    if ((f.type === "date" || f.type === "datetime") && v) return new Date(v);
    if (f.type === "number" && v !== null && v !== undefined) return Number(v);
    return formatValue(f, v, r, lookups);
  }));
  downloadWorkbook([{ name: table.name.slice(0, 28), header, rows: body }], table.name.toLowerCase().replace(/[^\w]+/g, "-"), fmt);
};

/** Every live field plus row metadata — the backup taken before a permanent delete. */
const backupColumns = (table, lookups) => [
  ["Row #", (r) => r.autoNumber],
  ...table.fields
    .filter((f) => !f.archived)
    .sort((a, b) => a.order - b.order)
    .map((f) => [
      f.label,
      (r) => {
        const v = rawOf(f, r);
        if ((f.type === "date" || f.type === "datetime") && v) return new Date(v);
        if (f.type === "number" && v !== null && v !== undefined) return Number(v);
        return formatValue(f, v, r, lookups);
      },
    ]),
  ["Created", (r) => (r.createdAt ? new Date(r.createdAt) : "")],
  ["Updated", (r) => (r.updatedAt ? new Date(r.updatedAt) : "")],
  ["Record ID", (r) => r._id],
];

const downloadTableTemplate = (table) => {
  const fields = table.fields.filter(IMPORTABLE).sort((a, b) => a.order - b.order);
  const lists = fields.filter((f) => f.options?.choices?.length);
  const max = Math.max(0, ...lists.map((f) => f.options.choices.length));
  downloadWorkbook(
    [
      { name: "Template", header: fields.map((f) => (f.required ? `${f.label} *` : f.label)), rows: [] },
      ...(lists.length ? [{ name: "Lists", header: lists.map((f) => f.label), rows: Array.from({ length: max }, (_x, i) => lists.map((f) => f.options.choices[i]?.value ?? "")) }] : []),
    ],
    `${table.name.toLowerCase().replace(/[^\w]+/g, "-")}-template`
  );
};

const TablePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = useSelector((s) => s?.auth?.user?.role) === "Admin";
  const [params, setParams] = useSearchParams();
  const lookups = useLookups();
  const t = useTable(id);
  const { table, fields, views, rows } = t;

  const viewId = params.get("view");
  const view = useMemo(() => views.find((v) => v._id === viewId) || views[0], [views, viewId]);
  const [draft, setDraft] = useState(null); // unsaved view state
  useEffect(() => setDraft(view ? pickState(view) : null), [view]);
  const state = draft || pickState(view);
  const dirty = view && draft && JSON.stringify(pickState(view)) !== JSON.stringify(draft);
  const setState = (patch) => setDraft((d) => ({ ...(d || pickState(view)), ...patch }));

  const [q, setQ] = useState(params.get("q") || "");
  useEffect(() => {
    const h = setTimeout(() => setParams((p) => { const n = new URLSearchParams(p); if (q) n.set("q", q); else n.delete("q"); return n; }, { replace: true }), 250);
    return () => clearTimeout(h);
  }, [q, setParams]);

  const [selected, setSelected] = useState(new Set());
  const [openRowId, setOpenRowId] = useState(() => params.get("row")); // ?row=<id> opens a row (calendar links)
  const [fieldsOpen, setFieldsOpen] = useState(null); // true | field to edit
  const [dataAnchor, setDataAnchor] = useState(null);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [viewAnchor, setViewAnchor] = useState(null);
  const [viewMenu, setViewMenu] = useState(null);
  const [header, setHeader] = useState(null); // { field, anchor }
  const [importOpen, setImportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [batch, setBatch] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [widths, setWidths] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [rename, setRename] = useState(null);
  const [deletingRows, setDeletingRows] = useState(null); // rows to delete permanently
  const [groupDialog, setGroupDialog] = useState(null); // { group? } | { fromSelection }
  const [groupMenu, setGroupMenu] = useState(null); // { anchor, group }
  const [addToAnchor, setAddToAnchor] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [recheck, setRecheck] = useState(null); // null | "ask" | "running"
  const groupKey = params.get("group");
  const mode = params.get("mode") === "analysis" ? "analysis" : "rows";
  const setParam = (k, v) => setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });

  // ordered + visible fields for this view
  const ordered = useMemo(() => {
    if (!state.columnOrder?.length) return fields;
    const idx = new Map(state.columnOrder.map((k, i) => [k, i]));
    return [...fields].sort((a, b) => (idx.get(a.key) ?? 999 + a.order) - (idx.get(b.key) ?? 999 + b.order));
  }, [fields, state.columnOrder]);
  const visible = useMemo(() => ordered.filter((f) => !state.hiddenFields?.includes(f.key)), [ordered, state.hiddenFields]);

  // row groups: picked members plus rows matching the group's rule
  const groups = useMemo(() => [...(table?.groups || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [table]);
  const members = useMemo(() => {
    const out = {};
    for (const g of groups) {
      const ruled = g.filters?.length ? new Set(applyView(rows, fields, { filters: g.filters }, lookups, "").map((r) => r._id)) : null;
      out[g.key] = new Set(rows.filter((r) => r.groups?.includes(g.key) || ruled?.has(r._id)).map((r) => r._id));
    }
    return out;
  }, [groups, rows, fields, lookups]);
  const group = groups.find((g) => g.key === groupKey) || null;
  const scoped = useMemo(() => (group ? rows.filter((r) => members[group.key]?.has(r._id)) : rows), [rows, group, members]);

  const shown = useMemo(() => {
    let list = applyView(scoped, fields, state, lookups, q);
    if (batch) list = list.filter((r) => r.importBatchId === batch._id);
    return list;
  }, [scoped, fields, state, lookups, q, batch]);
  const groupField = fields.find((f) => f.key === state.groupBy);
  const items = useMemo(() => groupRows(shown, view?.type === "grid" ? groupField : null, lookups, collapsed), [shown, groupField, lookups, collapsed, view]);
  const openRow = rows.find((r) => r._id === openRowId) || null;

  const saveView = async () => {
    try {
      const v = await tablesApi.updateView(id, view._id, draft);
      t.setViews((list) => list.map((x) => (x._id === v._id ? v : x)));
      t.notify("View saved", "neutral");
    } catch (e) {
      t.notify(errText(e));
    }
  };
  const createView = async (type) => {
    setViewAnchor(null);
    const name = { grid: "Grid", kanban: "Kanban", calendar: "Calendar" }[type];
    const status = fields.find((f) => f.coreMapping === "status" && ["singleSelect", "checkbox"].includes(f.type)) || fields.find((f) => f.type === "singleSelect");
    const date = fields.find((f) => f.coreMapping === "date") || fields.find((f) => ["date", "datetime"].includes(f.type));
    try {
      const v = await tablesApi.createView(id, { name: `${name} view`, type, shared: true, groupBy: type === "kanban" ? status?.key : undefined, dateField: type === "calendar" ? date?.key : undefined, cardFields: type === "kanban" ? fields.filter((f) => f.key !== table.primaryField).slice(0, 3).map((f) => f.key) : [] });
      t.setViews((list) => [...list, v]);
      setParams((p) => { const n = new URLSearchParams(p); n.set("view", v._id); return n; });
    } catch (e) {
      t.notify(errText(e));
    }
  };

  const onReorder = async (keys) => {
    if (isAdmin) {
      t.setTable((tb) => ({ ...tb, fields: tb.fields.map((f) => ({ ...f, order: keys.includes(f.key) ? keys.indexOf(f.key) : f.order })) }));
      try {
        t.setTable(await tablesApi.reorderFields(id, keys));
        if (state.columnOrder?.length) setState({ columnOrder: [] });
      } catch (e) {
        t.notify(errText(e));
      }
    } else setState({ columnOrder: keys });
  };
  const onResize = useCallback(async (key, w, done) => {
    setWidths((x) => ({ ...x, [key]: w }));
    if (done && isAdmin) {
      try { t.setTable((await tablesApi.updateField(id, key, { width: Math.round(w) })).table); } catch { /* width stays local */ }
    }
  }, [id, isAdmin, t]);

  const headerAction = async (action) => {
    const f = header.field;
    setHeader(null);
    switch (action) {
      case "asc":
      case "desc": return setState({ sorts: [{ field: f.key, dir: action }] });
      case "filter": return setState({ filters: [...(state.filters || []), { field: f.key, op: f.type === "checkbox" ? "eq" : ["singleSelect", "multiSelect", "user", "fieldTeam", "taxonomy"].includes(f.type) ? "eq" : "contains", value: f.type === "checkbox" ? true : "" }] });
      case "group": return setState({ groupBy: state.groupBy === f.key ? null : f.key });
      case "hide": return setState({ hiddenFields: [...(state.hiddenFields || []), f.key] });
      case "freeze": return setState({ frozen: visible.findIndex((x) => x.key === f.key) + 1 });
      case "rename": return setRename({ field: f, label: f.label });
      case "edit": return setFieldsOpen(f);
      case "left":
      case "right": {
        const pos = f.order + (action === "right" ? 1 : 0);
        try {
          t.setTable(await tablesApi.addField(id, { label: "New field", type: "text", position: pos }));
          if (state.columnOrder?.length) setState({ columnOrder: [] });
        } catch (e) { t.notify(errText(e)); }
        return undefined;
      }
      default: return undefined;
    }
  };

  const saveGroup = async ({ name, description, color, filters, withSelection }) => {
    if (groupDialog?.group) {
      t.setTable(await tablesApi.updateGroup(id, groupDialog.group.key, { name, description, color, filters }));
      t.notify(`Group “${name}” saved`, "neutral");
    } else {
      const rowIds = withSelection ? [...selected] : [];
      const out = await tablesApi.createGroup(id, { name, description, color, filters, rowIds });
      t.setTable(out.table);
      if (rowIds.length) { t.setRowGroups(rowIds, out.key, true); setSelected(new Set()); }
      setParam("group", out.key);
      t.notify(`Group “${name}” created`, "neutral");
    }
    setGroupDialog(null);
  };
  const changeMembers = async (g, ids, add) => {
    setAddToAnchor(null);
    try {
      const out = await tablesApi.groupRows(id, g.key, add ? { add: ids } : { remove: ids });
      t.setRowGroups(ids, g.key, add);
      setSelected(new Set());
      const n = add ? out.added : out.removed;
      t.notify(add ? `${n} row${n === 1 ? "" : "s"} added to “${g.name}”${n < ids.length ? ` (${ids.length - n} already in it)` : ""}` : `${n} row${n === 1 ? "" : "s"} removed from “${g.name}”`, "neutral");
    } catch (e) {
      t.notify(errText(e));
    }
  };

  if (t.loading) return <PageLoader variant="table" />;
  if (t.error) return <Box sx={{ p: 3 }}><ErrorState title="Couldn't open this table" message={t.error} onRetry={t.reload} /></Box>;
  if (!table) return null;

  const ws = workspacePath(table);
  const primary = fields.find((f) => f.key === table.primaryField) || fields[0];
  const tax = { category: table.issueCategory, subCategory: table.issueSubCategory, color: taxonomyByLabel[table.issueCategory]?.color, label: taxonomyLabel(table.issueCategory, table.issueSubCategory) };
  const statusChoices = fields.filter((f) => ["singleSelect", "checkbox"].includes(f.type));
  const dateFields = fields.filter((f) => ["date", "datetime"].includes(f.type));
  const dateField = fields.find((f) => f.key === state.dateField) || dateFields.find((f) => f.coreMapping === "date") || dateFields[0];
  const kanbanField = fields.find((f) => f.key === state.groupBy && ["singleSelect", "checkbox"].includes(f.type));
  const selectedRows = rows.filter((r) => selected.has(r._id));
  const pickedInGroup = group ? selectedRows.filter((r) => r.groups?.includes(group.key)) : [];
  const fromCode = fields.some((f) => f.coreMapping === "teamCode") && !fields.some((f) => f.coreMapping === "fieldTeam" && f.type === "fieldTeam");
  const label = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - var(--topbar-h) - 48px)", minHeight: 520 }}>
      <PageHeader
        title={table.name}
        description={
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <TaxonomyBadge tax={tax} />
            <Box component={RouterLink} to={ws.path} sx={{ color: "var(--text-secondary)", fontSize: 13 }}>{ws.label} workspace</Box>
            {table.description && <span>· {table.description}</span>}
          </Box>
        }
        actions={
          <>
            <Button variant="outlined" startIcon={<ImportExportOutlined sx={{ fontSize: 17 }} />} endIcon={<ExpandMore sx={{ fontSize: 16 }} />} onClick={(e) => setDataAnchor(e.currentTarget)}>Data</Button>
            <Button variant="outlined" startIcon={<ViewColumnOutlined sx={{ fontSize: 17 }} />} onClick={() => setFieldsOpen(true)}>Fields</Button>
            {isAdmin && <IconButton aria-label="Table options" onClick={(e) => setMoreAnchor(e.currentTarget)}><MoreHoriz /></IconButton>}
            <Button variant="contained" startIcon={<Add />} onClick={async () => { const r = await t.addRow({}, group ? { groups: [group.key] } : undefined); if (r) setOpenRowId(r._id); }}>New row</Button>
          </>
        }
      />

      {/* groups: tables inside this table, each with its own rows and analysis */}
      <Box role="tablist" aria-label="Row groups" sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.25, overflowX: "auto", pb: 0.25 }}>
        {[{ key: null, name: "All rows", count: rows.length }, ...groups.map((g) => ({ ...g, count: members[g.key]?.size || 0 }))].map((g) => {
          const active = (g.key || null) === (group?.key || null);
          return (
            <Box key={g.key || "all"} component="button" type="button" role="tab" aria-selected={active}
              onClick={() => { setParam("group", g.key); setSelected(new Set()); }}
              onContextMenu={g.key ? (e) => { e.preventDefault(); setGroupMenu({ anchor: e.currentTarget, group: g }); } : undefined}
              title={g.description || undefined}
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, height: 30, px: 1.25, borderRadius: "999px", font: "inherit", fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", cursor: "pointer", border: "1px solid", borderColor: active ? "var(--accent)" : "var(--border)", backgroundColor: active ? "var(--accent-subtle)" : "var(--surface)", color: active ? "var(--accent-text)" : "var(--text-secondary)", "&:hover": { color: "var(--text)", borderColor: active ? "var(--accent)" : "var(--border-strong)" } }}>
              {g.key ? <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: groupColor(g.color), flexShrink: 0 }} /> : <TableRowsOutlined sx={{ fontSize: 15 }} />}
              <Box component="span" sx={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</Box>
              <Box component="span" sx={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{g.count.toLocaleString()}</Box>
              {g.key && active && <Box component="span" role="button" aria-label={`Options for ${g.name}`} onClick={(e) => { e.stopPropagation(); setGroupMenu({ anchor: e.currentTarget, group: g }); }} sx={{ display: "inline-flex", ml: 0.25, color: "var(--text-muted)" }}><ExpandMore sx={{ fontSize: 16 }} /></Box>}
            </Box>
          );
        })}
        <Button size="small" startIcon={<Add sx={{ fontSize: 16 }} />} onClick={() => setGroupDialog({})} sx={{ color: "var(--text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}>Group</Button>
      </Box>

      {/* views bar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, borderBottom: "1px solid var(--border)", mb: 1.5, overflowX: "auto" }}>
        {views.map((v) => {
          const Icon = VIEW_ICON[v.type];
          const active = v._id === view?._id;
          return (
            <Box key={v._id} component="button" type="button" onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.set("view", v._id); return n; })}
              onContextMenu={(e) => { e.preventDefault(); setViewMenu({ anchor: e.currentTarget, view: v }); }}
              sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.25, height: 36, border: 0, background: "none", font: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", color: active ? "var(--text)" : "var(--text-secondary)", borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent", "&:hover": { color: "var(--text)" } }}>
              <Icon sx={{ fontSize: 16 }} />{v.name}
              {active && <Box component="span" role="button" aria-label="View options" onClick={(e) => { e.stopPropagation(); setViewMenu({ anchor: e.currentTarget, view: v }); }} sx={{ display: "inline-flex", ml: 0.25, color: "var(--text-muted)" }}><ExpandMore sx={{ fontSize: 16 }} /></Box>}
            </Box>
          );
        })}
        <Button size="small" startIcon={<Add sx={{ fontSize: 16 }} />} onClick={(e) => setViewAnchor(e.currentTarget)} sx={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>View</Button>
      </Box>

      {/* toolbar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        <TextField size="small" placeholder="Search rows" value={q} onChange={(e) => setQ(e.target.value)} sx={{ width: { xs: "100%", sm: 240 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 17 }} /></InputAdornment> } }} />
        <FilterButton fields={fields} filters={state.filters || []} onChange={(filters) => setState({ filters })} lookups={lookups} />
        <SortButton fields={fields} sorts={state.sorts || []} onChange={(sorts) => setState({ sorts })} />
        {view?.type === "grid" && (
          <TextField select size="small" value={state.groupBy || ""} onChange={(e) => setState({ groupBy: e.target.value || null })} sx={{ width: 170 }} slotProps={{ htmlInput: { "aria-label": "Group by" } }}
            SelectProps={{ displayEmpty: true, renderValue: (v) => (v ? `Group: ${fields.find((f) => f.key === v)?.label}` : "No grouping") }}>
            <MenuItem value="">No grouping</MenuItem>
            {fields.filter((f) => !["longText", "attachment"].includes(f.type)).map((f) => <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>)}
          </TextField>
        )}
        {view?.type === "kanban" && (
          <TextField select size="small" value={kanbanField?.key || ""} onChange={(e) => setState({ groupBy: e.target.value || null })} sx={{ width: 200 }} slotProps={{ htmlInput: { "aria-label": "Lanes from" } }}
            SelectProps={{ displayEmpty: true, renderValue: (v) => (v ? `Lanes: ${fields.find((f) => f.key === v)?.label}` : "Choose lanes field") }}>
            {statusChoices.map((f) => <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>)}
          </TextField>
        )}
        {view?.type === "calendar" && (
          <TextField select size="small" value={dateField?.key || ""} onChange={(e) => setState({ dateField: e.target.value })} sx={{ width: 200 }} slotProps={{ htmlInput: { "aria-label": "Date field" } }}
            SelectProps={{ displayEmpty: true, renderValue: (v) => (v ? `Date: ${fields.find((f) => f.key === v)?.label}` : "Choose a date field") }}>
            {dateFields.map((f) => <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>)}
          </TextField>
        )}
        {state.hiddenFields?.length > 0 && <Button size="small" variant="outlined" startIcon={<VisibilityOffOutlined sx={{ fontSize: 16 }} />} onClick={() => setFieldsOpen(true)}>{state.hiddenFields.length} hidden</Button>}
        {batch && (
          <Badge tone="info" sx={{ height: 28 }}>
            Rows from import {format(new Date(batch.createdAt), "dd MMM HH:mm")}
            <IconButton size="small" aria-label="Show all rows" onClick={() => setBatch(null)} sx={{ ml: 0.25, width: 18, height: 18 }}><Close sx={{ fontSize: 13 }} /></IconButton>
          </Badge>
        )}
        <Box sx={{ flex: 1 }} />
        {dirty && (
          <>
            <Button size="small" color="inherit" onClick={() => setDraft(pickState(view))}>Reset</Button>
            <Button size="small" variant="contained" onClick={saveView}>Save view</Button>
          </>
        )}
        <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{shown.length === scoped.length ? label(scoped.length, "row", "rows") : `${shown.length.toLocaleString()} of ${label(scoped.length, "row", "rows")}`}{group ? ` in “${group.name}”` : ""}</Typography>
        <SegmentedControl size="sm" ariaLabel="Show rows or analysis" value={mode} onChange={(v) => setParam("mode", v === "analysis" ? "analysis" : null)}
          options={[{ value: "rows", label: "Rows", icon: <TableRowsOutlined sx={{ fontSize: 15 }} /> }, { value: "analysis", label: "Analysis", icon: <InsightsOutlined sx={{ fontSize: 15 }} /> }]} />
      </Box>

      {selectedRows.length > 0 && (
        <BulkBar
          count={selectedRows.length}
          onExport={() => exportRows(table, visible, selectedRows, lookups)}
          onDelete={() => setDeletingRows(selectedRows)}
          onClear={() => setSelected(new Set())}
        >
          <Button variant="outlined" startIcon={<FolderSpecialOutlined sx={{ fontSize: 16 }} />} endIcon={<ExpandMore sx={{ fontSize: 16 }} />} onClick={(e) => setAddToAnchor(e.currentTarget)}>Add to group</Button>
          {group && pickedInGroup.length > 0 && (
            <Button variant="outlined" startIcon={<PlaylistRemoveOutlined sx={{ fontSize: 16 }} />} onClick={() => changeMembers(group, pickedInGroup.map((r) => r._id), false)}>Remove from “{group.name}”</Button>
          )}
        </BulkBar>
      )}

      {mode === "analysis" ? (
        <AnalysisPanel rows={shown} allRows={rows} fields={fields} lookups={lookups} title={`${group ? `Group “${group.name}”` : "All rows"}${state.filters?.length || q ? " · with the current filters and search" : ""}`}
          onFilter={(f, v) => { setState({ filters: [...(state.filters || []).filter((x) => x.field !== f.key), { field: f.key, op: "eq", value: v }] }); setParam("mode", null); }} />
      ) : view?.type === "kanban" ? (
        <KanbanView rows={shown} groupField={kanbanField} primary={primary} cardFields={(state.cardFields || []).map((k) => fields.find((f) => f.key === k)).filter(Boolean)} lookups={lookups} canEdit
          onUpdateCells={t.updateCells} onAddRow={async (data) => { const r = await t.addRow(data); if (r) setOpenRowId(r._id); }} onOpenRow={(r) => setOpenRowId(r._id)}
          onPickGroup={statusChoices.length ? <Button variant="outlined" onClick={() => setState({ groupBy: statusChoices[0].key })}>Use “{statusChoices[0].label}”</Button> : isAdmin ? <Button variant="outlined" onClick={() => setFieldsOpen(true)}>Add a single-select field</Button> : null} />
      ) : view?.type === "calendar" ? (
        dateField ? (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <EventCalendar
              height="100%"
              events={shown.filter((r) => rawOf(dateField, r)).map((r) => {
                const status = fields.find((f) => f.coreMapping === "status");
                return { id: r._id, title: formatValue(primary, rawOf(primary, r), r, lookups) || `#${r.autoNumber}`, date: rawOf(dateField, r), color: status?.type === "singleSelect" && rawOf(status, r) ? choiceColor(status, rawOf(status, r)) : tax.color, row: r };
              })}
              onOpen={(ev) => setOpenRowId(ev.id)}
              onMove={(ev, day) => t.updateCells([{ rowId: ev.id, key: dateField.key, value: new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())).toISOString() }])}
              onCreate={async (day) => { const r = await t.addRow({ [dateField.key]: new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())).toISOString() }); if (r) setOpenRowId(r._id); }}
            />
          </Box>
        ) : (
          <ErrorState title="No date field" message="Add a Date field to this table to use the calendar view." />
        )
      ) : (
        <GridView
          fields={visible} items={items} lookups={lookups} frozen={Math.min(state.frozen ?? 1, visible.length)} widths={widths} onResize={onResize} canEdit
          selected={selected} onSelect={setSelected} onUpdateCells={t.updateCells} onAddRow={() => t.addRow()} onAddRows={t.addRows} onDeleteRows={t.deleteRows}
          onOpenRow={(r) => setOpenRowId(r._id)} onHeaderMenu={(field, anchor) => setHeader({ field, anchor })} collapsed={collapsed}
          onToggleGroup={(k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }))} notify={t.notify}
        />
      )}

      {/* menus */}
      <Menu anchorEl={addToAnchor} open={Boolean(addToAnchor)} onClose={() => setAddToAnchor(null)}>
        {groups.map((g) => (
          <MenuItem key={g.key} onClick={() => changeMembers(g, selectedRows.map((r) => r._id), true)}>
            <ListItemIcon><Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: groupColor(g.color) }} /></ListItemIcon>{g.name}
          </MenuItem>
        ))}
        {groups.length > 0 && <Divider />}
        <MenuItem onClick={() => { setAddToAnchor(null); setGroupDialog({ fromSelection: true }); }}><ListItemIcon><Add fontSize="small" /></ListItemIcon>New group from {label(selectedRows.length, "row", "rows")}…</MenuItem>
      </Menu>

      <Menu anchorEl={groupMenu?.anchor} open={Boolean(groupMenu)} onClose={() => setGroupMenu(null)}>
        <MenuItem onClick={() => { setGroupDialog({ group: groupMenu.group }); setGroupMenu(null); }}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon>Rename, colour & rule…</MenuItem>
        <MenuItem onClick={() => { const g = groupMenu.group; setGroupMenu(null); setParam("group", g.key); setParam("mode", "analysis"); }}><ListItemIcon><InsightsOutlined fontSize="small" /></ListItemIcon>Analyse this group</MenuItem>
        <MenuItem onClick={() => { const g = groupMenu.group; setGroupMenu(null); exportRows({ ...table, name: `${table.name} - ${g.name}` }, visible, rows.filter((r) => members[g.key]?.has(r._id)), lookups); }}><ListItemIcon><FileDownloadOutlined fontSize="small" /></ListItemIcon>Export this group (.xlsx)</MenuItem>
        {isAdmin && <MenuItem onClick={async () => { const g = groupMenu.group; setGroupMenu(null); try { const out = await tablesApi.groupToTable(id, g.key, { name: `${table.name} · ${g.name}` }); t.notify(`Copied ${label(out.rows, "row", "rows")} to the new table “${out.table.name}”`, "neutral"); } catch (e) { t.notify(errText(e)); } }}><ListItemIcon><ContentCopyOutlined fontSize="small" /></ListItemIcon>Copy to a separate table</MenuItem>}
        <Divider />
        <MenuItem onClick={() => { setDeletingGroup(groupMenu.group); setGroupMenu(null); }} sx={{ color: "var(--danger)" }}><ListItemIcon><DeleteOutline fontSize="small" sx={{ color: "var(--danger)" }} /></ListItemIcon>Delete group (keeps the rows)</MenuItem>
      </Menu>
      <Menu anchorEl={dataAnchor} open={Boolean(dataAnchor)} onClose={() => setDataAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        <MenuItem onClick={() => { setDataAnchor(null); setImportOpen(true); }}><ListItemIcon><FileUploadOutlined fontSize="small" /></ListItemIcon>Import from Excel / CSV…</MenuItem>
        <MenuItem onClick={() => { setDataAnchor(null); exportRows(table, visible, shown, lookups, "xlsx"); }}><ListItemIcon><FileDownloadOutlined fontSize="small" /></ListItemIcon>Export this view (.xlsx)</MenuItem>
        <MenuItem onClick={() => { setDataAnchor(null); exportRows(table, visible, shown, lookups, "csv"); }}><ListItemIcon><FileDownloadOutlined fontSize="small" /></ListItemIcon>Export this view (.csv)</MenuItem>
        <MenuItem onClick={() => { setDataAnchor(null); downloadTableTemplate(table); }}><ListItemIcon><DescriptionOutlined fontSize="small" /></ListItemIcon>Download import template</MenuItem>
        <Divider />
        <MenuItem onClick={() => { setDataAnchor(null); setHistoryOpen(true); }}><ListItemIcon><HistoryOutlined fontSize="small" /></ListItemIcon>Import history</MenuItem>
      </Menu>

      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        <MenuItem onClick={() => { setMoreAnchor(null); setRename({ table: true, label: table.name, description: table.description }); }}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon>Rename & describe</MenuItem>
        <MenuItem onClick={async () => { setMoreAnchor(null); try { await tablesApi.saveAsTemplate(id, { withRows: false }); t.notify("Saved to the template library", "neutral"); } catch (e) { t.notify(errText(e)); } }}><ListItemIcon><BookmarkAddOutlined fontSize="small" /></ListItemIcon>Save as template</MenuItem>
        <MenuItem onClick={async () => { setMoreAnchor(null); try { await tablesApi.saveAsTemplate(id, { withRows: true }); t.notify("Saved as a template with 20 sample rows", "neutral"); } catch (e) { t.notify(errText(e)); } }}><ListItemIcon><BookmarkAddOutlined fontSize="small" /></ListItemIcon>Save as template with sample rows</MenuItem>
        {fromCode && <MenuItem onClick={() => { setMoreAnchor(null); setRecheck("ask"); }}><ListItemIcon><GroupsOutlined fontSize="small" /></ListItemIcon>Re-check teams from codes…</MenuItem>}
        <Divider />
        <MenuItem onClick={() => { setMoreAnchor(null); setConfirm("archive"); }} sx={{ color: "var(--danger)" }}><ListItemIcon><ArchiveOutlined fontSize="small" sx={{ color: "var(--danger)" }} /></ListItemIcon>Archive table</MenuItem>
      </Menu>

      <Menu anchorEl={viewAnchor} open={Boolean(viewAnchor)} onClose={() => setViewAnchor(null)}>
        {["grid", "kanban", "calendar"].map((type) => { const Icon = VIEW_ICON[type]; return <MenuItem key={type} onClick={() => createView(type)}><ListItemIcon><Icon fontSize="small" /></ListItemIcon>{type[0].toUpperCase() + type.slice(1)}</MenuItem>; })}
      </Menu>

      <Menu anchorEl={viewMenu?.anchor} open={Boolean(viewMenu)} onClose={() => setViewMenu(null)}>
        <MenuItem onClick={() => { setRename({ view: viewMenu.view, label: viewMenu.view.name }); setViewMenu(null); }}>Rename view</MenuItem>
        <MenuItem onClick={async () => { const v = viewMenu.view; setViewMenu(null); try { const n = await tablesApi.createView(id, { ...pickState(v), name: `${v.name} copy`, type: v.type, shared: v.shared }); t.setViews((l) => [...l, n]); } catch (e) { t.notify(errText(e)); } }}>Duplicate view</MenuItem>
        <MenuItem onClick={async () => { const v = viewMenu.view; setViewMenu(null); try { const n = await tablesApi.updateView(id, v._id, { shared: !v.shared }); t.setViews((l) => l.map((x) => (x._id === n._id ? n : x))); } catch (e) { t.notify(errText(e)); } }}>{viewMenu?.view.shared ? "Make personal" : "Share with team"}</MenuItem>
        {views.length > 1 && <MenuItem sx={{ color: "var(--danger)" }} onClick={async () => { const v = viewMenu.view; setViewMenu(null); try { await tablesApi.deleteView(id, v._id); t.setViews((l) => l.filter((x) => x._id !== v._id)); setParams((p) => { const n = new URLSearchParams(p); n.delete("view"); return n; }); } catch (e) { t.notify(errText(e)); } }}>Delete view</MenuItem>}
        {view?.type === "kanban" && viewMenu && <Divider />}
        {view?.type === "kanban" && viewMenu && <Typography sx={{ px: 2, py: 0.5, fontSize: 12, color: "var(--text-muted)" }}>Card fields</Typography>}
        {view?.type === "kanban" && viewMenu && fields.filter((f) => f.key !== primary?.key).map((f) => (
          <MenuItem key={f.key} dense onClick={() => setState({ cardFields: state.cardFields?.includes(f.key) ? state.cardFields.filter((k) => k !== f.key) : [...(state.cardFields || []), f.key] })}>
            <Checkbox size="small" checked={Boolean(state.cardFields?.includes(f.key))} sx={{ p: 0.25, mr: 1 }} />{f.label}
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={header?.anchor} open={Boolean(header)} onClose={() => setHeader(null)}>
        <MenuItem onClick={() => headerAction("asc")}><ListItemIcon><ArrowUpward fontSize="small" /></ListItemIcon>Sort ascending</MenuItem>
        <MenuItem onClick={() => headerAction("desc")}><ListItemIcon><ArrowDownward fontSize="small" /></ListItemIcon>Sort descending</MenuItem>
        <MenuItem onClick={() => headerAction("filter")}><ListItemIcon><FilterList fontSize="small" /></ListItemIcon>Filter by this field</MenuItem>
        <MenuItem onClick={() => headerAction("group")}><ListItemIcon><WorkspacesOutlined fontSize="small" /></ListItemIcon>{state.groupBy === header?.field.key ? "Remove grouping" : "Group by this field"}</MenuItem>
        <MenuItem onClick={() => headerAction("freeze")}><ListItemIcon><PushPinOutlined fontSize="small" /></ListItemIcon>Freeze up to here</MenuItem>
        <MenuItem onClick={() => headerAction("hide")}><ListItemIcon><VisibilityOffOutlined fontSize="small" /></ListItemIcon>Hide in this view</MenuItem>
        {isAdmin && <Divider />}
        {isAdmin && <MenuItem onClick={() => headerAction("rename")}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon>Rename</MenuItem>}
        {isAdmin && <MenuItem onClick={() => headerAction("edit")}><ListItemIcon><ViewColumnOutlined fontSize="small" /></ListItemIcon>Edit field</MenuItem>}
        {isAdmin && <MenuItem onClick={() => headerAction("left")}><ListItemIcon><Add fontSize="small" /></ListItemIcon>Insert left</MenuItem>}
        {isAdmin && <MenuItem onClick={() => headerAction("right")}><ListItemIcon><Add fontSize="small" /></ListItemIcon>Insert right</MenuItem>}
      </Menu>

      {/* sheets & dialogs */}
      {fieldsOpen && (
        <FieldManagerSheet open onClose={() => setFieldsOpen(null)} table={table} fields={ordered} hiddenFields={state.hiddenFields || []} isAdmin={isAdmin}
          initialEdit={fieldsOpen === true ? null : fieldsOpen}
          onToggleHidden={(k) => setState({ hiddenFields: state.hiddenFields?.includes(k) ? state.hiddenFields.filter((x) => x !== k) : [...(state.hiddenFields || []), k] })}
          onReorder={onReorder} onTableChange={(tb) => { t.setTable(tb); t.loadRows(); }} notify={t.notify} />
      )}
      <RowSheet open={Boolean(openRow)} onClose={() => setOpenRowId(null)} table={table} fields={ordered} row={openRow} lookups={lookups} canEdit onUpdateCells={t.updateCells}
        onRowChange={t.replaceRow} notify={t.notify} onDelete={(r) => setDeletingRows([r])} />

      <SafeDeleteDialog
        open={Boolean(deletingRows)}
        onClose={() => setDeletingRows(null)}
        records={deletingRows || []}
        noun={{ one: "row", many: "rows" }}
        nameOf={(r) => { const v = primary ? formatValue(primary, rawOf(primary, r), r, lookups) : ""; return `#${r.autoNumber ?? ""}${v ? ` · ${v}` : ""}`; }}
        exportColumns={backupColumns(table, lookups)}
        exportFilename={table.name.toLowerCase().replace(/[^\w]+/g, "-")}
        onDelete={(list) => bulkDelete(DELETE_PATHS.tableRows(id), list.map((r) => r._id))}
        onDeleted={({ deleted }) => {
          t.dropRows(deleted);
          setSelected((s) => new Set([...s].filter((x) => !deleted.includes(x))));
          if (deleted.includes(openRowId)) setOpenRowId(null);
        }}
      />
      {historyOpen && <ImportHistorySheet open onClose={() => setHistoryOpen(false)} table={table} onShowBatch={setBatch} onRolledBack={t.loadRows} notify={t.notify} />}
      <Suspense fallback={null}>
        {importOpen && (
          <ImportWizard open entity={`table:${table._id}`} allowed={[`table:${table._id}`]} entities={{ [`table:${table._id}`]: tableEntity(table) }}
            onClose={() => setImportOpen(false)} onImported={t.loadRows} />
        )}
      </Suspense>

      <ConfirmDialog open={confirm === "archive"} title={`Archive “${table.name}”?`} description="The table and its rows are hidden from the workspace and sidebar. Nothing is deleted; an admin can restore it from the workspace's archived list." confirmLabel="Archive table" danger
        onClose={() => setConfirm(null)} onConfirm={async () => { try { await tablesApi.update(id, { archived: true }); navigate(ws.path); } catch (e) { t.notify(errText(e)); setConfirm(null); } }} />

      {groupDialog && (
        <GroupDialog open onClose={() => setGroupDialog(null)} group={groupDialog.group} fields={fields} lookups={lookups}
          selectedCount={groupDialog.fromSelection || selected.size ? selected.size : 0} currentFilters={groupDialog.group ? [] : state.filters || []} onSave={saveGroup} />
      )}
      <ConfirmDialog open={Boolean(deletingGroup)} title={`Delete the group “${deletingGroup?.name}”?`} confirmLabel="Delete group" danger
        description={`The tab and its rule go away. Its ${label(members[deletingGroup?.key]?.size || 0, "row stays", "rows stay")} in “${table.name}”; nothing is deleted from the table.`}
        onClose={() => setDeletingGroup(null)}
        onConfirm={async () => { try { t.setTable(await tablesApi.deleteGroup(id, deletingGroup.key)); if (groupKey === deletingGroup.key) setParam("group", null); t.notify(`Group “${deletingGroup.name}” deleted`, "neutral"); setDeletingGroup(null); } catch (e) { t.notify(errText(e)); setDeletingGroup(null); } }} />
      <ConfirmDialog open={Boolean(recheck)} loading={recheck === "running"} title="Re-check teams from codes?" confirmLabel={selected.size ? `Re-check ${label(selected.size, "row", "rows")}` : "Re-check all rows"}
        description={`Each row's team is normally fixed when the row is saved: the team that held its code on its date. Re-checking looks the team up again from the current code history${selected.size ? " for the selected rows" : " for every row"}. Use it after correcting a code's history.`}
        onClose={() => setRecheck(null)}
        onConfirm={async () => { setRecheck("running"); try { const out = await tablesApi.recheckTeams(id, selected.size ? [...selected] : undefined); await t.loadRows(); t.notify(`Checked ${label(out.checked, "row", "rows")}: ${out.changed} changed team${out.unmatched ? `, ${out.unmatched} with a code no team held on that date` : ""}`, "neutral"); } catch (e) { t.notify(errText(e)); } setRecheck(null); }} />

      {rename && (
        <ConfirmDialog open title={rename.field ? "Rename field" : rename.view ? "Rename view" : "Rename table"} confirmLabel="Save"
          description={
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
              <TextField autoFocus fullWidth label="Name" value={rename.label} onChange={(e) => setRename((r) => ({ ...r, label: e.target.value }))} inputProps={{ dir: "auto" }} />
              {rename.table && <TextField fullWidth label="Description" multiline minRows={2} value={rename.description || ""} onChange={(e) => setRename((r) => ({ ...r, description: e.target.value }))} />}
              {rename.field && <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>Rows keep their values — they’re stored by the field’s id, not its name.</Typography>}
            </Box>
          }
          onClose={() => setRename(null)}
          onConfirm={async () => {
            try {
              if (rename.field) t.setTable((await tablesApi.updateField(id, rename.field.key, { label: rename.label })).table);
              else if (rename.view) { const v = await tablesApi.updateView(id, rename.view._id, { name: rename.label }); t.setViews((l) => l.map((x) => (x._id === v._id ? v : x))); }
              else t.setTable(await tablesApi.update(id, { name: rename.label, description: rename.description }));
              setRename(null);
            } catch (e) { t.notify(errText(e)); }
          }} />
      )}

      <Snackbar open={Boolean(t.toast)} autoHideDuration={t.toast?.action ? 8000 : 5000} onClose={() => t.setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} key={t.toast?.at}>
        {t.toast ? (
          <Alert severity={t.toast.tone === "danger" ? "error" : t.toast.tone === "warning" ? "warning" : "info"} variant="filled" onClose={() => t.setToast(null)}
            action={t.toast.action ? <Button color="inherit" size="small" onClick={async () => { const a = t.toast.action; t.setToast(null); await a.run(); }}>{t.toast.action.label}</Button> : undefined}>
            {t.toast.message}
          </Alert>
        ) : <span />}
      </Snackbar>
    </Box>
  );
};

export default TablePage;
