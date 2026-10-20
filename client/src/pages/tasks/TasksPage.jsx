import DataMenu from "../../components/dataio/DataMenu";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, Link as RouterLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { Autocomplete, Box, Button, Divider, IconButton, InputBase, ListItemIcon, Menu, MenuItem, Popover, Switch, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import Close from "@mui/icons-material/Close";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import TableRowsOutlined from "@mui/icons-material/TableRowsOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import PersonAddAltOutlined from "@mui/icons-material/PersonAddAltOutlined";
import FilterAltOffOutlined from "@mui/icons-material/FilterAltOffOutlined";
import api from "../../api/api";
import PageHeader from "../../components/ui/PageHeader";
import SegmentedControl from "../../components/ui/SegmentedControl";
import FilterChip from "../../components/ui/FilterChip";
import ErrorState from "../../components/ui/ErrorState";
import SafeDeleteDialog from "../../components/ui/SafeDeleteDialog";
import BulkBar from "../../components/ui/BulkBar";
import { bulkDelete, DELETE_PATHS } from "../../api/bulkDelete";
import PageLoader from "../../components/ui/PageLoader";
import { UserAvatar } from "../../components/ui/AvatarGroup";
import TaskBoard from "./TaskBoard";
import TaskTable from "./TaskTable";
import EventCalendar from "../../components/calendar/EventCalendar";
import TaskSheet from "./TaskSheet";
import useTaskActions from "./useTaskActions";
import { exportTasks, TASK_COLUMNS } from "./exportTasks";
import { DATE_RANGES, GROUP_BY, PRIORITIES, STATUSES, filterTasks, statusMeta, taskDate, taskTitle } from "./taskUtils";

const AddTask = lazy(() => import("../../components/task/AddTask"));
const EditTaskDialog = lazy(() => import("../../components/task/EditTaskDialog"));
const RecordTicketDialog = lazy(() => import("../../components/task/RecordTicketDialog"));

const LIST_KEYS = ["status", "priority", "type", "assignee", "team"];

const useUrlState = () => {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => {
    const s = {
      view: params.get("view") || "board",
      q: params.get("q") || "",
      range: params.get("range") || "all",
      mine: params.get("mine") === "1",
      group: params.get("group") || "none",
      from: params.get("from") || "",
      to: params.get("to") || "",
    };
    for (const k of LIST_KEYS) s[k] = params.get(k) ? params.get(k).split(",").filter(Boolean) : [];
    return s;
  }, [params]);
  const set = useCallback(
    (patch) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            const empty = v === "" || v === false || v == null || (Array.isArray(v) && !v.length);
            const isDefault = (k === "view" && v === "board") || (k === "range" && v === "all") || (k === "group" && v === "none");
            if (empty || isDefault) next.delete(k);
            else next.set(k, Array.isArray(v) ? v.join(",") : v === true ? "1" : String(v));
          }
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );
  return [state, set];
};

const TaskBulkBar = ({ count, users, onStatus, onPriority, onAssign, onExport, onDelete, onClear }) => {
  const [menu, setMenu] = useState(null); // {type, anchor}
  const [assignees, setAssignees] = useState([]);
  return (
    <BulkBar count={count} onExport={onExport} onDelete={onDelete} onClear={onClear}>
      <Button variant="outlined" onClick={(e) => setMenu({ type: "status", anchor: e.currentTarget })}>Change status</Button>
      <Button variant="outlined" onClick={(e) => setMenu({ type: "priority", anchor: e.currentTarget })}>Priority</Button>
      <Button variant="outlined" startIcon={<PersonAddAltOutlined sx={{ fontSize: 16 }} />} onClick={(e) => setMenu({ type: "assign", anchor: e.currentTarget })}>Reassign</Button>

      <Menu anchorEl={menu?.type !== "assign" ? menu?.anchor : null} open={Boolean(menu && menu.type !== "assign")} onClose={() => setMenu(null)}>
        {(menu?.type === "status" ? STATUSES : PRIORITIES).map((o) => (
          <MenuItem
            key={o.value}
            onClick={() => {
              setMenu(null);
              (menu.type === "status" ? onStatus : onPriority)(o.value);
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: menu?.type === "status" ? "50%" : "2px", backgroundColor: o.color, mr: 1 }} />
            {o.label || o.value}
          </MenuItem>
        ))}
      </Menu>
      <Popover open={menu?.type === "assign"} anchorEl={menu?.anchor} onClose={() => setMenu(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }} slotProps={{ paper: { sx: { p: 1.5, width: 320, mt: 0.75 } } }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 1 }}>Replace assignees on {count} task{count > 1 ? "s" : ""}</Typography>
        <Autocomplete
          multiple
          options={users}
          value={assignees}
          onChange={(_e, v) => setAssignees(v)}
          getOptionLabel={(o) => o.name || o.email || ""}
          isOptionEqualToValue={(o, v) => o._id === v._id}
          renderInput={(p) => <TextField {...p} autoFocus placeholder="Choose people" />}
          slotProps={{ chip: { size: "small" } }}
        />
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1.5 }}>
          <Button variant="outlined" onClick={() => setMenu(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              onAssign(assignees);
              setAssignees([]);
              setMenu(null);
            }}
          >
            Apply
          </Button>
        </Box>
      </Popover>
    </BulkBar>
  );
};

const TasksPage = () => {
  const me = useSelector((s) => s?.auth?.user);
  const [f, setF] = useUrlState();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [openId, setOpenId] = useState(null);
  // ?task=<id> opens that task (links from custom tables and the calendar)
  const [deepLink] = useSearchParams();
  const linkedTask = deepLink.get("task");
  useEffect(() => {
    if (linkedTask) setOpenId(linkedTask);
  }, [linkedTask]);
  const [selection, setSelection] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [ticketTask, setTicketTask] = useState(null);
  const [deleting, setDeleting] = useState(null); // tasks to delete permanently
  const isAdmin = me?.role === "Admin";
  const [moreMenu, setMoreMenu] = useState(null);
  const [searchDraft, setSearchDraft] = useState(f.q);

  const { patchOne, patchMany, dropMany } = useTaskActions(setTasks, users);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      const [t, u, ft] = await Promise.allSettled([api.get("/tasks/get-all-tasks"), api.get("/users/get-all-users"), api.get("/field-teams/get-field-teams")]);
      if (cancelled) return;
      if (t.status === "fulfilled") setTasks(Array.isArray(t.value.data) ? t.value.data : t.value.data?.tasks || []);
      else setError("We couldn't load tasks. Check your connection and try again.");
      if (u.status === "fulfilled") setUsers((u.value.data || []).filter((x) => x.isActive !== false).map(({ _id, name, email, color, role }) => ({ _id, name, email, color, role })));
      if (ft.status === "fulfilled") setTeams(ft.value.data || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Debounced search → URL
  useEffect(() => {
    const id = setTimeout(() => {
      if (searchDraft !== f.q) setF({ q: searchDraft });
    }, 250);
    return () => clearTimeout(id);
  }, [searchDraft, f.q, setF]);

  const filtered = useMemo(() => filterTasks(tasks, f, me?._id), [tasks, f, me?._id]);
  const openTask = useMemo(() => tasks.find((t) => t._id === openId) || null, [tasks, openId]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s.value, 0]));
    for (const t of filtered) if (c[t.status] !== undefined) c[t.status]++;
    return c;
  }, [filtered]);

  const teamOptions = useMemo(() => {
    const names = new Map();
    for (const t of tasks) if (t.teamName) names.set(t.teamName, (names.get(t.teamName) || 0) + 1);
    for (const t of teams) if (t.teamName && !names.has(t.teamName)) names.set(t.teamName, 0);
    return [...names.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => ({ value: n, label: n, hint: c || undefined }));
  }, [tasks, teams]);

  const userOptions = useMemo(() => users.map((u) => ({ value: u._id, label: u.name || u.email, icon: <UserAvatar user={u} size={20} /> })), [users]);

  const activeFilters = LIST_KEYS.some((k) => f[k].length) || f.range !== "all" || f.mine || f.q || f.from || f.to;
  const clearFilters = () => {
    setSearchDraft("");
    setF({ q: "", range: "all", mine: false, from: "", to: "", ...Object.fromEntries(LIST_KEYS.map((k) => [k, []])) });
  };

  const selectedTasks = useMemo(() => tasks.filter((t) => selection.includes(t._id)), [tasks, selection]);
  const bulkPatch = (patch, label) => patchMany(Object.fromEntries(selection.map((id) => [id, patch])), { success: `${label} updated on ${selection.length} task${selection.length > 1 ? "s" : ""}` });

  const onMove = (patches, info) => {
    const label = info.from !== info.to ? `Moved to ${statusMeta(info.to).label}` : undefined;
    patchMany(patches, { success: label });
  };

  return (
    <Box>
      <PageHeader
        title="Tasks"
        description="DVOC · Installation — NPS detractor and neutral follow-ups."
        actions={
          <>
            <DataMenu entity="tasks" viewRows={filtered} selectedRows={selectedTasks} filename="dvoc-installation-tasks" onImported={() => setRefresh((r) => r + 1)} context={{ teams }} />
            <IconButton aria-label="More" onClick={(e) => setMoreMenu(e.currentTarget)} sx={{ width: 32, height: 32, border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)", backgroundColor: "var(--surface)" }}>
              <MoreHoriz fontSize="small" />
            </IconButton>
            <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => setAddOpen(true)}>
              Create task
            </Button>
            <Menu anchorEl={moreMenu} open={Boolean(moreMenu)} onClose={() => setMoreMenu(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
              <MenuItem onClick={() => { setMoreMenu(null); exportTasks(filtered, { format: "csv", filename: "dvoc-installation-tasks" }); }}>
                <ListItemIcon><FileDownloadOutlined fontSize="small" /></ListItemIcon>Export view as CSV
              </MenuItem>
              <Divider />
              <MenuItem component={RouterLink} to="/tasks-list/reports" onClick={() => setMoreMenu(null)}>
                <ListItemIcon><InsightsOutlined fontSize="small" /></ListItemIcon>Audit reports
              </MenuItem>
            </Menu>
          </>
        }
      />

      {/* Toolbar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap", mb: 1.25 }}>
        <SegmentedControl
          ariaLabel="View"
          value={f.view}
          onChange={(v) => {
            setSelection([]);
            setF({ view: v });
          }}
          options={[
            { value: "board", label: "Board", icon: <ViewKanbanOutlined sx={{ fontSize: 16 }} /> },
            { value: "table", label: "Table", icon: <TableRowsOutlined sx={{ fontSize: 16 }} /> },
            { value: "calendar", label: "Calendar", icon: <CalendarMonthOutlined sx={{ fontSize: 16 }} /> },
          ]}
        />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: 32, px: 1.25, width: { xs: "100%", sm: 280 }, borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-xs)", "&:focus-within": { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-ring)" } }}>
          <SearchIcon sx={{ fontSize: 17, color: "var(--text-muted)" }} />
          <InputBase value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder="Search SLID, customer, request, team…" inputProps={{ "aria-label": "Search tasks" }} sx={{ flex: 1, fontSize: 13 }} />
          {searchDraft && (
            <IconButton size="small" aria-label="Clear search" onClick={() => setSearchDraft("")} sx={{ p: 0.25 }}>
              <Close sx={{ fontSize: 15 }} />
            </IconButton>
          )}
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box component="label" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
          <Switch size="small" checked={f.mine} onChange={(e) => setF({ mine: e.target.checked })} />
          My tasks
        </Box>
        {f.view === "board" && (
          <TextField select value={f.group} onChange={(e) => setF({ group: e.target.value })} sx={{ width: 170 }} slotProps={{ htmlInput: { "aria-label": "Group by" } }}>
            {GROUP_BY.map((g) => <MenuItem key={g.value} value={g.value}>{g.value === "none" ? "No grouping" : `Group: ${g.label}`}</MenuItem>)}
          </TextField>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 2 }}>
        <FilterChip label="Status" options={STATUSES.map((s) => ({ value: s.value, label: s.label, hint: counts[s.value] }))} value={f.status} onChange={(v) => setF({ status: v })} />
        <FilterChip label="Type" options={[{ value: "Detractor", label: "Detractor" }, { value: "Neutral", label: "Neutral" }, { value: "Promoter", label: "Promoter" }]} value={f.type} onChange={(v) => setF({ type: v })} />
        <FilterChip label="Priority" options={PRIORITIES.map((p) => ({ value: p.value, label: p.value }))} value={f.priority} onChange={(v) => setF({ priority: v })} />
        <FilterChip label="Assignee" options={userOptions} value={f.assignee} onChange={(v) => setF({ assignee: v })} searchable />
        <FilterChip label="Field team" options={teamOptions} value={f.team} onChange={(v) => setF({ team: v })} searchable />
        {f.from && f.to ? (
          <FilterChip label="Date" single options={[{ value: "custom", label: `${f.from} → ${f.to}` }]} value={["custom"]} onChange={() => setF({ from: "", to: "" })} />
        ) : (
          <FilterChip label="Date" single options={DATE_RANGES.filter((r) => r.value !== "all")} value={f.range === "all" ? [] : [f.range]} onChange={(v) => setF({ range: v[0] || "all" })} />
        )}
        {activeFilters && (
          <Button variant="text" size="small" startIcon={<FilterAltOffOutlined sx={{ fontSize: 16 }} />} onClick={clearFilters} sx={{ color: "var(--text-secondary)", height: 28 }}>
            Clear
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          {loading ? "Loading…" : `${filtered.length.toLocaleString()} of ${tasks.length.toLocaleString()} tasks`}
        </Typography>
      </Box>

      {error && <ErrorState title="Tasks didn't load" message={error} onRetry={() => { setLoading(true); setRefresh((r) => r + 1); }} sx={{ mb: 2 }} />}

      {f.view === "table" && selection.length > 0 && (
        <TaskBulkBar
          count={selection.length}
          users={users}
          onStatus={(v) => bulkPatch({ status: v }, "Status")}
          onPriority={(v) => bulkPatch({ priority: v }, "Priority")}
          onAssign={(list) => bulkPatch({ assignedTo: list }, "Assignees")}
          onExport={() => exportTasks(selectedTasks, { filename: "dvoc-installation-selected" })}
          onDelete={isAdmin ? () => setDeleting(selectedTasks) : undefined}
          onClear={() => setSelection([])}
        />
      )}

      {loading ? (
        <PageLoader />
      ) : f.view === "table" ? (
        <TaskTable tasks={filtered} selection={selection} onSelectionChange={setSelection} onOpen={(t) => setOpenId(t._id)} />
      ) : f.view === "calendar" ? (
        <Box sx={{ height: "calc(100vh - var(--topbar-h) - 220px)", minHeight: 560, display: "flex", flexDirection: "column" }}>
          <EventCalendar
            events={filtered.filter((t) => taskDate(t)).map((t) => ({ id: t._id, title: taskTitle(t), subtitle: t.slid, date: taskDate(t), color: statusMeta(t.status).color }))}
            onOpen={(ev) => setOpenId(ev.id)}
            onMove={(ev, day) => patchOne(ev.id, { interviewDate: new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())).toISOString() })}
            onCreate={() => setAddOpen(true)}
            height="100%"
          />
        </Box>
      ) : (
        <TaskBoard tasks={filtered} groupBy={f.group} onOpen={(t) => setOpenId(t._id)} onMove={onMove} onQuickAdd={() => setAddOpen(true)} />
      )}

      <TaskSheet
        task={openTask}
        open={Boolean(openTask)}
        onClose={() => setOpenId(null)}
        users={users}
        onPatch={(id, patch) => patchOne(id, patch)}
        onEdit={(t) => setEditTask(t)}
        onRecordTicket={(t) => setTicketTask(t)}
        onDelete={(t) => setDeleting([t])}
        canDelete={isAdmin}
      />

      <SafeDeleteDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        records={deleting || []}
        noun={{ one: "task", many: "tasks" }}
        nameOf={(t) => [t.slid, t.customerName].filter(Boolean).join(" · ")}
        exportColumns={TASK_COLUMNS}
        exportFilename="dvoc-installation-tasks"
        onDelete={(list) => bulkDelete(DELETE_PATHS.tasks, list.map((t) => t._id))}
        onDeleted={({ deleted }) => {
          dropMany(deleted);
          setSelection((sel) => sel.filter((id) => !deleted.includes(id)));
          if (deleted.includes(openId)) setOpenId(null);
          window.dispatchEvent(new CustomEvent("dashboard-refresh"));
        }}
      />

      <Suspense fallback={null}>
        {addOpen && <AddTask open={addOpen} setOpen={setAddOpen} setUpdateRefetchTasks={() => setRefresh((r) => r + 1)} />}
        {editTask && (
          <EditTaskDialog
            open={Boolean(editTask)}
            setOpen={(v) => !v && setEditTask(null)}
            task={editTask}
            handleTaskUpdate={(updated) => {
              setTasks((prev) => prev.map((t) => (t._id === updated._id ? { ...t, ...updated, tickets: t.tickets } : t)));
              setEditTask(null);
            }}
          />
        )}
        {ticketTask && (
          <RecordTicketDialog
            key={ticketTask._id}
            open={Boolean(ticketTask)}
            onClose={() => setTicketTask(null)}
            task={ticketTask}
            onTicketAdded={() => setRefresh((r) => r + 1)}
            onTicketUpdated={() => setRefresh((r) => r + 1)}
            onTicketDeleted={() => setRefresh((r) => r + 1)}
          />
        )}
      </Suspense>
    </Box>
  );
};

export default TasksPage;
