import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Box, Button, Dialog, DialogContent, DialogTitle, List, ListItemButton, ListItemIcon, ListItemText, Snackbar, Alert, Typography } from "@mui/material";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import TableChartOutlined from "@mui/icons-material/TableChartOutlined";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import api from "../../api/api";
import EventCalendar from "./EventCalendar";
import FilterChip from "../ui/FilterChip";
import Sheet from "../ui/Sheet";
import Badge from "../ui/Badge";
import TaxonomyBadge from "../ui/TaxonomyBadge";
import { TAXONOMY, taxonomyByLabel, taxonomyLabel, taxonomyOfIssue, taxonomyOfTask } from "../../constants/taxonomy";
import { statusMeta, taskDate, taskTitle } from "../../pages/tasks/taskUtils";
import { tablesApi } from "../../pages/tables/tablesApi";
import { calendarEntriesApi } from "../../api/qops";
import { trackerPath } from "../../constants/taxonomy";
import CalendarEntryDialog from "./CalendarEntryDialog";

const AddTask = lazy(() => import("../task/AddTask"));

// Tickets reach the calendar only through calendar entries ("Put on calendar" on a row,
// snag or task) and GAIA follow-up dates. Dates inside tickets mean different things, so
// they stay off unless "Ticket dates (old view)" is switched on.
const SOURCES = [
  { value: "entries", label: "Calendar entries" },
  { value: "scheduled", label: "GAIA follow-up visits" },
  { value: "lab", label: "Lab assessments" },
  { value: "ojt", label: "On-the-job assessments" },
  { value: "legacy", label: "Ticket dates (old view)" },
];
const DEFAULT_SOURCES = ["entries", "scheduled", "lab", "ojt"];
const ASSESSMENT_COLOR = { lab: "#0D9488", ojt: "#6366F1" };
const SNAG_PATH = { "OJO Snags": "/ojo-snags", TCRM: "/tcrm", TRC: "/trc", "Internal Audit (FAT)": "/internal-audit" };
const KIND_LABEL = { task: "DVOC task", snag: "Snag / complaint", lab: "Lab assessment", ojt: "On-the-job assessment", row: "Table row", visit: "Follow-up visit", entry: "Calendar entry" };
const TARGET_LABEL = { row: "Table row", issue: "Snag / complaint", task: "DVOC task" };
const idOf = (u) => (u && typeof u === "object" ? u._id : u);
const teamOf = (x) => x?.teamName || x?.fieldTeamName || x?.fieldTeamId?.teamName || null;
const utcDay = (d) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();

/**
 * One calendar for everything dated in the app: booked appointments and visits
 * (ticket follow-up dates, custom-table scheduling fields), DVOC tasks (interview date),
 * snags / complaints (reported date), lab and on-the-job assessments, and custom
 * table rows whose date field feeds the calendar. Tasks and table rows can be
 * dragged to another day; an empty day can start a new task or table row.
 */
const GlobalCalendar = ({ onNavigate, height = "100%" }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState({ tasks: [], snags: [], lab: [], ojt: [], tables: [], scheduled: [], tableList: [], entries: [] });
  const [editingEntry, setEditingEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState([]);
  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [cats, setCats] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [users, setUsers] = useState({});
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(null); // day
  const [taskFor, setTaskFor] = useState(null);
  const [toast, setToast] = useState(null);
  const [weekStartsOn, setWeekStartsOn] = useState(0);

  const legacyOn = sources.includes("legacy");
  const load = useCallback(async () => {
    const from = new Date(Date.now() - 400 * 864e5).toISOString();
    const to = new Date(Date.now() + 200 * 864e5).toISOString();
    const none = Promise.resolve([]);
    const reqs = {
      entries: calendarEntriesApi.range(from, to),
      tasks: legacyOn ? api.get("/tasks/get-all-tasks").then((r) => (Array.isArray(r.data) ? r.data : r.data?.tasks || [])) : none,
      snags: legacyOn ? api.get("/customer-issues", { params: { limit: 10000 } }).then((r) => r.data?.data || []) : none,
      lab: api.get("/lab-assessments").then((r) => r.data || []),
      ojt: api.get("/on-the-job-assessments").then((r) => r.data || []),
      tables: legacyOn ? tablesApi.calendar({ from, to }) : none,
      scheduled: api.get("/tasks/scheduled-tickets", { params: { from, to } }).then((r) => r.data || []),
      tableList: tablesApi.list(),
      users: api.get("/users/get-all-users").then((r) => r.data || []),
      settings: api.get("/settings").then((r) => r.data || {}),
    };
    const keys = Object.keys(reqs);
    const out = await Promise.allSettled(Object.values(reqs));
    const next = {};
    const bad = [];
    out.forEach((r, i) => {
      if (r.status === "fulfilled") next[keys[i]] = r.value;
      else { next[keys[i]] = []; if (SOURCES.some((s) => s.value === keys[i]) || ["tasks", "snags", "tables"].includes(keys[i])) bad.push(keys[i]); }
    });
    setUsers(Object.fromEntries((next.users || []).map((u) => [u._id, u])));
    setWeekStartsOn(next.settings?.weekStartDay || 0);
    setData(next);
    setFailed(bad);
    setLoading(false);
  }, [legacyOn]);
  useEffect(() => { load(); }, [load]);

  const events = useMemo(() => {
    const list = [];
    const showScheduled = sources.includes("scheduled");
    if (sources.includes("entries"))
      for (const e of data.entries || []) {
        const tax = e.issueCategory ? { category: e.issueCategory, subCategory: e.issueSubCategory, color: taxonomyByLabel[e.issueCategory]?.color, label: taxonomyLabel(e.issueCategory, e.issueSubCategory) } : null;
        list.push({ id: `entry:${e._id}`, kind: "entry", raw: e, date: e.date, title: `${e.type} · ${e.title || e.slid || "Ticket"}${e.time ? ` · ${e.time}` : ""}`, subtitle: e.tableName || tax?.label, color: e.status === "cancelled" ? "var(--text-muted)" : tax?.color || "var(--accent)", tax, team: e.teamName, assignees: (e.assignees || []).map(idOf), draggable: true, scheduled: true, status: e.status === "planned" ? null : e.status === "done" ? "Done" : "Cancelled" });
      }
    // booked appointments / visits: ticket follow-up dates (tasks and snags) and custom-table
    // scheduling fields (below). `scheduled` puts a calendar mark on the chip.
    if (showScheduled) {
      for (const k of data.scheduled || []) {
        const p = k.parent || {};
        const tax = k.taskType === "CustomerIssue" ? taxonomyOfIssue(p) : taxonomyOfTask(p);
        list.push({ id: `visit:${k._id}`, kind: "visit", raw: k, date: k.followUpDate, title: `Visit · ${p.customerName || p.slid || k.ticketId}`, subtitle: k.mainCategory, color: tax.color, tax, team: p.teamName, assignees: [], draggable: true, scheduled: true, status: k.status, dateLabel: "Follow-up date" });
      }
    }
    if (legacyOn)
      for (const t of data.tasks) {
        const d = taskDate(t);
        if (!d) continue;
        const tax = taxonomyOfTask(t);
        list.push({ id: `task:${t._id}`, kind: "task", raw: t, date: d, title: taskTitle(t), subtitle: t.slid, color: tax.color, tax, team: t.teamName, assignees: (t.assignedTo || []).map(idOf), draggable: true, status: statusMeta(t.status).label });
      }
    if (legacyOn)
      for (const s of data.snags) {
        const d = s.date || s.pisDate || s.createdAt;
        if (!d) continue;
        const tax = taxonomyOfIssue(s);
        list.push({ id: `snag:${s._id}`, kind: "snag", raw: s, date: d, title: s.customerName || s.slid || "Snag", subtitle: tax.label, color: tax.color, tax, team: s.teamName, assignees: [], draggable: false, status: s.solved === "yes" ? "Resolved" : s.dispatched === "yes" ? "Dispatched" : "Open" });
      }
    for (const k of ["lab", "ojt"])
      if (sources.includes(k))
        for (const a of data[k]) {
          const d = a.assessmentDate || a.createdAt;
          if (!d) continue;
          list.push({ id: `${k}:${a._id}`, kind: k, raw: a, date: d, title: `${k === "lab" ? "Lab" : "OJT"} · ${teamOf(a) || "Team"}`, subtitle: a.overallScore !== undefined ? `${Math.round(a.overallScore)}%` : "", color: ASSESSMENT_COLOR[k], tax: null, team: teamOf(a), assignees: [], draggable: false, status: a.status });
        }
    for (const r of data.tables) {
      // a row shows once per calendar date field; scheduling fields sit with appointments
      const scheduled = r.role === "schedule";
      if (!legacyOn) continue;
      const tax = { category: r.issueCategory, subCategory: r.issueSubCategory, color: taxonomyByLabel[r.issueCategory]?.color, label: taxonomyLabel(r.issueCategory, r.issueSubCategory) };
      const label = r.fieldLabel ? r.fieldLabel.split("|")[0].trim() : "";
      list.push({ id: `row:${r.key || r.id}`, kind: "row", raw: r, date: r.date, title: scheduled ? `${label || "Appointment"} · ${r.title}` : r.title, subtitle: r.tableName, color: tax.color, tax, team: null, assignees: [], draggable: true, scheduled, status: r.status, dateLabel: label });
    }
    return list.filter((e) => (!cats.length || (e.tax && cats.includes(e.tax.category))) && (!teams.length || teams.includes(e.team)) && (!assignees.length || e.assignees.some((a) => assignees.includes(a))));
  }, [data, sources, cats, teams, assignees, legacyOn]);

  const teamOptions = useMemo(() => {
    const m = new Map();
    [...data.tasks, ...data.snags, ...data.lab, ...data.ojt, ...(data.entries || [])].forEach((x) => { const t = teamOf(x); if (t) m.set(t, (m.get(t) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => ({ value: v, label: v, hint: n }));
  }, [data]);
  const assigneeOptions = useMemo(() => Object.values(users).filter((u) => u.isActive !== false).map((u) => ({ value: u._id, label: u.name })), [users]);

  const move = async (ev, day) => {
    const iso = utcDay(day);
    const prev = data;
    try {
      if (ev.kind === "entry") {
        setData((d) => ({ ...d, entries: d.entries.map((k) => (k._id === ev.raw._id ? { ...k, date: iso } : k)) }));
        await calendarEntriesApi.update(ev.raw._id, { date: iso });
      } else if (ev.kind === "visit") {
        setData((d) => ({ ...d, scheduled: d.scheduled.map((k) => (k._id === ev.raw._id ? { ...k, followUpDate: iso } : k)) }));
        await api.put(`/tasks/tickets/${ev.raw._id}`, { followUpDate: iso });
      } else if (ev.kind === "task") {
        setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t._id === ev.raw._id ? { ...t, interviewDate: iso } : t)) }));
        await api.put(`/tasks/update-task/${ev.raw._id}`, { interviewDate: iso });
      } else if (ev.kind === "row") {
        setData((d) => ({ ...d, tables: d.tables.map((r) => ((r.key || r.id) === (ev.raw.key || ev.raw.id) ? { ...r, date: iso } : r)) }));
        await tablesApi.updateRow(ev.raw.tableId, ev.raw.id, { data: { [ev.raw.dateField]: ev.raw.dateType === "datetime" ? new Date(new Date(iso).getTime() + (new Date(ev.raw.date).getUTCHours() * 36e5)).toISOString() : iso } });
      }
      setToast({ tone: "info", message: `Moved “${ev.title}” to ${format(day, "d MMM")}` });
    } catch (e) {
      setData(prev);
      setToast({ tone: "error", message: e?.response?.data?.message || "Couldn't reschedule" });
    }
  };

  const go = (path) => { onNavigate?.(); navigate(path); };
  const openTarget = (ev) => {
    if (ev.kind === "entry") {
      const tg = ev.raw.target || {};
      if (tg.kind === "row") return go(`/tables/${tg.tableId}?row=${tg.id}`);
      if (tg.kind === "task") return go(`/tasks-list?task=${tg.id}`);
      return go(`${trackerPath(ev.raw.issueCategory) || "/ojo-snags"}?q=${encodeURIComponent(ev.raw.slid || "")}`);
    }
    if (ev.kind === "task") return go(`/tasks-list?task=${ev.raw._id}`);
    if (ev.kind === "visit") {
      const p = ev.raw.parent || {};
      if (ev.raw.taskType === "Task") return go(`/tasks-list?task=${p._id}`);
      return go(`${SNAG_PATH[ev.tax?.category] || "/ojo-snags"}?q=${encodeURIComponent(p.slid || p.ticketId || "")}`);
    }
    if (ev.kind === "row") return go(`/tables/${ev.raw.tableId}?row=${ev.raw.id}`);
    if (ev.kind === "snag") {
      const path = SNAG_PATH[ev.tax?.category] || "/ojo-snags";
      return go(`${path}?q=${encodeURIComponent(ev.raw.slid || ev.raw.ticketId || "")}`);
    }
    return go("/assessment-dashboard");
  };

  // the field a new row gets the day in: the table's first calendar field, else its schedule / date mapping
  const dayFieldOf = (t) => {
    const live = (t.fields || []).filter((f) => !f.archived && ["date", "datetime"].includes(f.type));
    return live.find((f) => f.key === t.settings?.calendarFields?.[0]) || live.find((f) => f.coreMapping === "schedule") || live.find((f) => f.coreMapping === "date");
  };
  const datedTables = data.tableList;
  const createRow = async (table) => {
    const day = creating;
    setCreating(null);
    const f = dayFieldOf(table);
    try {
      const row = await tablesApi.createRow(table._id, f ? { [f.key]: utcDay(day) } : {});
      await calendarEntriesApi.create({ target: { kind: "row", id: row._id, tableId: table._id }, date: utcDay(day), type: "Visit" });
      go(`/tables/${table._id}?row=${row._id}`);
    } catch (e) {
      setToast({ tone: "error", message: e?.response?.data?.message || "Couldn't add the row" });
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height, minHeight: 0 }}>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.5, alignItems: "center" }}>
        <FilterChip label="Show" options={SOURCES} value={sources} onChange={(v) => setSources(v.length ? v : SOURCES.map((s) => s.value))} />
        <FilterChip label="Tracker" options={TAXONOMY.map((t) => ({ value: t.label, label: t.label }))} value={cats} onChange={setCats} />
        <FilterChip label="Field team" options={teamOptions} value={teams} onChange={setTeams} searchable />
        <FilterChip label="Assignee" options={assigneeOptions} value={assignees} onChange={setAssignees} searchable />
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12, color: failed.length ? "var(--warning)" : "var(--text-muted)" }}>
          {loading ? "Loading…" : failed.length ? `Couldn't load: ${failed.map((k) => SOURCES.find((s) => s.value === k)?.label).join(", ")}` : `${events.length.toLocaleString()} items`}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", mb: 1.25 }}>
        {TAXONOMY.map((t) => <Box key={t.label} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: 11.5, color: "var(--text-secondary)" }}><Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: t.color }} />{t.label}</Box>)}
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: 11.5, color: "var(--text-secondary)" }}><Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: ASSESSMENT_COLOR.lab }} />Lab</Box>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: 11.5, color: "var(--text-secondary)" }}><Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: ASSESSMENT_COLOR.ojt }} />On-the-job</Box>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: 11.5, color: "var(--text-secondary)" }}><EventAvailableOutlined sx={{ fontSize: 13 }} />Scheduled on purpose (calendar entry or follow-up)</Box>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <EventCalendar events={events} onOpen={setOpen} onMove={move} onCreate={setCreating} weekStartsOn={weekStartsOn} height="100%" initialDate={params.get("date") || undefined} />
      </Box>

      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open?.title} description={open ? format(new Date(open.date), open.raw?.dateType === "datetime" ? "EEEE d MMMM yyyy · HH:mm" : "EEEE d MMMM yyyy") : ""} width={440}
        footer={open && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, width: "100%" }}>
            {open.kind === "entry" && <Button variant="outlined" onClick={() => setEditingEntry(open.raw)}>Edit entry</Button>}
            <Button variant="contained" onClick={() => { const e = open; setOpen(null); openTarget(e); }}>Open {open.kind === "task" ? "task" : open.kind === "row" ? "row" : open.kind === "entry" ? "ticket" : open.kind === "snag" || open.kind === "visit" ? "record" : "assessments"}</Button>
          </Box>
        )}>
        {open && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              {open.scheduled && <Badge tone="accent">Scheduled</Badge>}
              {open.tax ? <TaxonomyBadge tax={open.tax} /> : <Badge color={open.color}>{KIND_LABEL[open.kind]}</Badge>}
              {open.status && <Badge>{open.status}</Badge>}
            </Box>
            {[
              ["Type", open.kind === "entry" ? `${open.raw.type} · ${TARGET_LABEL[open.raw.target?.kind] || "Ticket"}` : KIND_LABEL[open.kind]],
              ["Time", open.kind === "entry" ? open.raw.time : null],
              ["Status", open.kind === "entry" ? { planned: "Planned", done: "Done", cancelled: "Cancelled" }[open.raw.status] : null],
              ["Date field", open.dateLabel],
              ["SLID", open.raw.slid || open.raw.parent?.slid],
              ["Customer", open.raw.parent?.customerName],
              ["Note", open.kind === "visit" || open.kind === "entry" ? open.raw.note : null],
              ["Ticket", open.kind === "entry" ? open.raw.title : null],
              ["Added by", open.kind === "entry" ? open.raw.createdBy?.name : null],
              ["Ticket", open.raw.ticketId],
              ["Table", open.kind === "row" ? open.raw.tableName : null],
              ["Field team", open.team],
              ["Score", open.kind === "lab" || open.kind === "ojt" ? open.subtitle : open.raw.evaluationScore],
              ["Assigned to", open.assignees.map((a) => users[a]?.name).filter(Boolean).join(", ")],
              ["Conducted by", open.raw.conductedBy],
            ].filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => (
              <Box key={k} sx={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 1 }}>
                <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{k}</Typography>
                <Typography dir="auto" sx={{ fontSize: 13 }}>{String(v)}</Typography>
              </Box>
            ))}
            {open.draggable && <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>Drag it to another day on the calendar to reschedule.</Typography>}
          </Box>
        )}
      </Sheet>

      {editingEntry && (
        <CalendarEntryDialog open entry={editingEntry} target={editingEntry.target} title={editingEntry.title}
          onClose={() => setEditingEntry(null)}
          onSaved={(saved) => { setEditingEntry(null); setOpen(null); setData((d) => ({ ...d, entries: d.entries.map((k) => (k._id === saved._id ? { ...k, ...saved } : k)) })); }} />
      )}

      <Dialog open={Boolean(creating)} onClose={() => setCreating(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Add on {creating ? format(creating, "EEE d MMM") : ""}</DialogTitle>
        <DialogContent sx={{ px: 1 }}>
          <List dense>
            <ListItemButton onClick={() => { setTaskFor(creating); setCreating(null); }}>
              <ListItemIcon><ViewKanbanOutlined fontSize="small" /></ListItemIcon>
              <ListItemText primary="New DVOC task" secondary="Put on the calendar on this day" />
            </ListItemButton>
            {datedTables.map((t) => (
              <ListItemButton key={t._id} onClick={() => createRow(t)}>
                <ListItemIcon><TableChartOutlined fontSize="small" /></ListItemIcon>
                <ListItemText primary={`New row in ${t.name}`} secondary={`${taxonomyLabel(t.issueCategory, t.issueSubCategory)} · put on the calendar on this day`} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
      <Suspense fallback={null}>
        {taskFor && <AddTask open setOpen={(v) => !v && setTaskFor(null)} initialValues={{ interviewDate: format(taskFor, "yyyy-MM-dd") }}
          onCreated={async (task) => { const day = taskFor; setTaskFor(null); if (task?._id) await calendarEntriesApi.create({ target: { kind: "task", id: task._id }, date: utcDay(day), type: "Visit" }).catch(() => {}); load(); }} />}
      </Suspense>
      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? <Alert severity={toast.tone} variant="filled" onClose={() => setToast(null)}>{toast.message}</Alert> : <span />}
      </Snackbar>
    </Box>
  );
};

export default GlobalCalendar;
