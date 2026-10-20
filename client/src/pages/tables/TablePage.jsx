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
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import PageHeader from "../../components/ui/PageHeader";
import TaxonomyBadge from "../../components/ui/TaxonomyBadge";
import ErrorState from "../../components/ui/ErrorState";
import PageLoader from "../../components/ui/PageLoader";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Badge from "../../components/ui/Badge";
import EventCalendar from "../../components/calendar/EventCalendar";
import { downloadWorkbook } from "../../components/dataio/parse";
import { taxonomyByLabel, taxonomyLabel } from "../../constants/taxonomy";
import GridView from "./GridView";
import KanbanView from "./KanbanView";
import FieldManagerSheet from "./FieldManagerSheet";
import RowSheet from "./RowSheet";
import ImportHistorySheet from "./ImportHistorySheet";
import CalendarFieldsDialog from "./CalendarFieldsDialog";
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

const workspacePath = (t) => {
  const c = taxonomyByLabel[t.issueCategory];
  const path = { "Closure Call": "/closure-call", "OJO Snags": "/ojo-snags", DVOC: "/dvoc", TCRM: "/tcrm", TRC: "/trc", "Internal Audit (FAT)": "/internal-audit" }[t.issueCategory];
  return { path: path || "/dashboard", label: c?.label || t.issueCategory };
};

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
  const [calendarOpen, setCalendarOpen] = useState(false);

  // ordered + visible fields for this view
  const ordered = useMemo(() => {
    if (!state.columnOrder?.length) return fields;
    const idx = new Map(state.columnOrder.map((k, i) => [k, i]));
    return [...fields].sort((a, b) => (idx.get(a.key) ?? 999 + a.order) - (idx.get(b.key) ?? 999 + b.order));
  }, [fields, state.columnOrder]);
  const visible = useMemo(() => ordered.filter((f) => !state.hiddenFields?.includes(f.key)), [ordered, state.hiddenFields]);

  const shown = useMemo(() => {
    let list = applyView(rows, fields, state, lookups, q);
    if (batch) list = list.filter((r) => r.importBatchId === batch._id);
    return list;
  }, [rows, fields, state, lookups, q, batch]);
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

  if (t.loading) return <PageLoader />;
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
            <Button variant="contained" startIcon={<Add />} onClick={async () => { const r = await t.addRow(); if (r) setOpenRowId(r._id); }}>New row</Button>
          </>
        }
      />

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
        <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{shown.length === rows.length ? `${rows.length} rows` : `${shown.length} of ${rows.length} rows`}</Typography>
      </Box>

      {selected.size > 0 && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, px: 1.5, py: 0.75, borderRadius: "8px", backgroundColor: "var(--accent-subtle)" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{selected.size} selected</Typography>
          <Button size="small" startIcon={<FileDownloadOutlined sx={{ fontSize: 16 }} />} onClick={() => exportRows(table, visible, selectedRows, lookups)}>Export</Button>
          <Button size="small" color="error" startIcon={<DeleteOutline sx={{ fontSize: 16 }} />} onClick={() => { t.deleteRows([...selected]); setSelected(new Set()); }}>Delete</Button>
          <IconButton size="small" aria-label="Clear selection" onClick={() => setSelected(new Set())}><Close sx={{ fontSize: 16 }} /></IconButton>
        </Box>
      )}

      {view?.type === "kanban" ? (
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
        <MenuItem onClick={() => { setMoreAnchor(null); setCalendarOpen(true); }}><ListItemIcon><EventAvailableOutlined fontSize="small" /></ListItemIcon>Calendar dates…</MenuItem>
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
        onRowChange={t.replaceRow} notify={t.notify} onDelete={(r) => { setOpenRowId(null); t.deleteRows([r._id]); }} />
      {historyOpen && <ImportHistorySheet open onClose={() => setHistoryOpen(false)} table={table} onShowBatch={setBatch} onRolledBack={t.loadRows} notify={t.notify} />}
      <Suspense fallback={null}>
        {importOpen && (
          <ImportWizard open entity={`table:${table._id}`} allowed={[`table:${table._id}`]} entities={{ [`table:${table._id}`]: tableEntity(table) }}
            onClose={() => setImportOpen(false)} onImported={t.loadRows} />
        )}
      </Suspense>

      <ConfirmDialog open={confirm === "archive"} title={`Archive “${table.name}”?`} description="The table and its rows are hidden from the workspace and sidebar. Nothing is deleted; an admin can restore it from the workspace's archived list." confirmLabel="Archive table" danger
        onClose={() => setConfirm(null)} onConfirm={async () => { try { await tablesApi.update(id, { archived: true }); navigate(ws.path); } catch (e) { t.notify(errText(e)); setConfirm(null); } }} />

      <CalendarFieldsDialog open={calendarOpen} onClose={() => setCalendarOpen(false)} table={table} onSaved={(tb) => { t.setTable(tb); t.notify("Calendar dates saved", "neutral"); }} />

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
