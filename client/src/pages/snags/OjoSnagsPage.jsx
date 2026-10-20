import DataMenu from "../../components/dataio/DataMenu";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Button, IconButton, InputBase, ListItemIcon, Menu, MenuItem, Tab, Tabs, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import Close from "@mui/icons-material/Close";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import TableRowsOutlined from "@mui/icons-material/TableRowsOutlined";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import FilterAltOffOutlined from "@mui/icons-material/FilterAltOffOutlined";
import { toast } from "sonner";
import api from "../../api/api";
import PageHeader from "../../components/ui/PageHeader";
import FilterChip from "../../components/ui/FilterChip";
import SegmentedControl from "../../components/ui/SegmentedControl";
import ErrorState from "../../components/ui/ErrorState";
import PageLoader from "../../components/ui/PageLoader";
import { exportRows } from "../../utils/exportRows";
import BulkBar from "../../components/ui/BulkBar";
import SafeDeleteDialog from "../../components/ui/SafeDeleteDialog";
import { bulkDelete, DELETE_PATHS } from "../../api/bulkDelete";
import { taxonomyOfIssue } from "../../constants/taxonomy";
import SnagTable from "./SnagTable";
import SnagSheet from "./SnagSheet";
import CategoryTables from "../tables/CategoryTables";
import { DATE_RANGES, NON_OJO_SOURCES, categoriesOf, filterSnags, reportedDate, snagTypeOf, sourceOf, statusOf } from "./snagUtils";

const CustomerIssueDialog = lazy(() => import("../../components/CustomerIssueDialog"));
const RecordTicketDialog = lazy(() => import("../../components/task/RecordTicketDialog"));
const CustomerIssuesAnalytics = lazy(() => import("../../components/CustomerIssuesAnalytics"));

const LIST_KEYS = ["status", "source", "category", "team"];
const TABS = [
  { value: "all", label: "All" },
  { value: "Installation", label: "Installation" },
  { value: "Maintenance", label: "Maintenance" },
];

const EXPORT_COLUMNS = [
  ["SLID", (s) => s.slid],
  ["Ticket", (s) => s.ticketId],
  ["Tracker", (s) => taxonomyOfIssue(s).label],
  ["Source", (s) => [s.fromMain, sourceOf(s)].filter(Boolean).join(" · ")],
  ["Status", (s) => statusOf(s).label],
  ["Customer", (s) => s.customerName],
  ["Contact", (s) => s.customerContact],
  ["Area", (s) => s.area],
  ["Issue categories", (s) => categoriesOf(s).join(", ")],
  ["Issue sub-categories", (s) => (s.issues || []).map((i) => i?.subCategory).filter(Boolean).join(", ")],
  ["Field team", (s) => s.teamName],
  ["Team code", (s) => s.teamCode],
  ["Company", (s) => s.teamCompany],
  ["Reported", (s) => (reportedDate(s) ? new Date(reportedDate(s)) : "")],
  ["PIS date", (s) => (s.pisDate ? new Date(s.pisDate) : "")],
  ["Reporter", (s) => s.reporter],
  ["Dispatched", (s) => s.dispatched],
  ["Resolved", (s) => s.solved],
  ["Resolve date", (s) => (s.resolveDate ? new Date(s.resolveDate) : "")],
  ["Resolved by", (s) => s.resolvedBy],
  ["Supervisor", (s) => s.closedBy],
  ["Resolution details", (s) => s.resolutionDetails],
  ["Assigned to", (s) => s.assignedTo],
  ["Installing team", (s) => s.installingTeam],
  ["Caller", (s) => s.callerName],
  ["Call date", (s) => (s.callDate ? new Date(s.callDate) : "")],
  ["Created", (s) => (s.createdAt ? new Date(s.createdAt) : "")],
  ["Record ID", (s) => s._id],
];

// One page for every tracker whose records are customer issues (OJO Snags, TCRM, TRC, Internal Audit).
const TRACKERS = {
  "OJO Snags": { title: "OJO Snags", description: "Joint-quality snags raised by OJO on field installations and maintenance.", add: "Report snag", file: "ojo-snags", tabs: true },
  TCRM: { title: "TCRM", description: "Customer complaints received through TCRM and how each was resolved.", add: "Add complaint", file: "tcrm" },
  TRC: { title: "TRC", description: "Complaints escalated through the regulator (TRC) and their resolution.", add: "Add complaint", file: "trc" },
  "Internal Audit (FAT)": { title: "Internal Audit (FAT)", description: "Findings from internal field acceptance (FAT) audits.", add: "Add finding", file: "internal-audit" },
};

const OjoSnagsPage = ({ tracker = "OJO Snags" }) => {
  const meta = TRACKERS[tracker] || TRACKERS["OJO Snags"];
  const user = useSelector((s) => s?.auth?.user);
  const isAdmin = user?.role === "Admin";
  const [params, setParams] = useSearchParams();
  const f = useMemo(() => {
    const s = { tab: params.get("tab") || "all", view: params.get("view") || "list", q: params.get("q") || "", range: params.get("range") || "" };
    for (const k of LIST_KEYS) s[k] = params.get(k) ? params.get(k).split(",").filter(Boolean) : [];
    return s;
  }, [params]);
  const setF = useCallback(
    (patch) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            const isDefault = (k === "tab" && v === "all") || (k === "view" && v === "list");
            if (!v || (Array.isArray(v) && !v.length) || isDefault) next.delete(k);
            else next.set(k, Array.isArray(v) ? v.join(",") : v);
          }
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  const [snags, setSnags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [openId, setOpenId] = useState(null);
  const [dialog, setDialog] = useState(null); // { mode: 'add' | 'edit', issue }
  const [ticketFor, setTicketFor] = useState(null);
  const [more, setMore] = useState(null);
  const [draft, setDraft] = useState(f.q);
  const [selection, setSelection] = useState([]);
  const [deleting, setDeleting] = useState(null); // records to delete permanently

  useEffect(() => {
    const onRefresh = () => setRefresh((r) => r + 1);
    window.addEventListener("cin-refresh", onRefresh);
    return () => window.removeEventListener("cin-refresh", onRefresh);
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data } = await api.get("/customer-issues", { params: { limit: 10000 } });
        if (!cancel) {
          setSnags(data?.data || []);
          setError(null);
        }
      } catch (e) {
        if (!cancel) setError(e?.response?.data?.message || "Check your connection and try again.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [refresh]);

  useEffect(() => {
    const id = setTimeout(() => draft !== f.q && setF({ q: draft }), 250);
    return () => clearTimeout(id);
  }, [draft, f.q, setF]);

  const base = useMemo(() => filterSnags(snags, { ...f, tab: "all", tracker }), [snags, f, tracker]);
  const rows = useMemo(() => (f.tab === "all" ? base : base.filter((s) => snagTypeOf(s) === f.tab)), [base, f.tab]);
  const tabCount = (t) => (t === "all" ? base.length : base.filter((s) => snagTypeOf(s) === t).length);
  const openSnag = useMemo(() => snags.find((s) => s._id === openId) || null, [snags, openId]);

  const options = useMemo(() => {
    const count = (getter) => {
      const m = new Map();
      for (const s of snags) for (const v of [].concat(getter(s))) if (v) m.set(v, (m.get(v) || 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => ({ value: v, label: v, hint: n }));
    };
    return { source: count(sourceOf), category: count(categoriesOf), team: count((s) => s.teamName) };
  }, [snags]);

  const sourceValue = f.source.length ? f.source : options.source.map((o) => o.value).filter((v) => !NON_OJO_SOURCES.includes(v));
  const fileBase = `${meta.file}${meta.tabs ? `-${f.tab.toLowerCase()}` : ""}`;
  const activeFilters = f.q || f.range || LIST_KEYS.some((k) => f[k].length);

  const patch = async (id, body) => {
    const prev = snags;
    setSnags((list) => list.map((s) => (s._id === id ? { ...s, ...body } : s)));
    try {
      const { data } = await api.put(`/customer-issues/${id}`, body);
      if (data?.data) setSnags((list) => list.map((s) => (s._id === id ? { ...s, ...data.data } : s)));
      toast.success("Snag updated");
    } catch {
      setSnags(prev);
      toast.error("Couldn't save the change");
    }
  };

  // Same create / update flow as before (incl. saving a new supervisor name).
  const submit = async (issueData, id) => {
    try {
      if (issueData.solved === "yes" && issueData.closedBy && issueData.closedBy.trim() !== "") {
        try {
          await api.post("/dropdown-options/add", { category: "CIN_SUPERVISORS", value: issueData.closedBy.trim(), label: issueData.closedBy.trim(), order: 99 });
        } catch {
          /* duplicate supervisor names are fine */
        }
      }
      if (id) {
        const { data } = await api.put(`/customer-issues/${id}`, {
          ...issueData,
          date: issueData.date ? new Date(issueData.date).toISOString() : null,
          pisDate: issueData.pisDate ? new Date(issueData.pisDate).toISOString() : null,
        });
        setSnags((list) => list.map((s) => (s._id === id ? { ...s, ...data.data } : s)));
        toast.success("Snag updated");
      } else {
        await api.post("/customer-issues", issueData);
        toast.success("Snag reported");
      }
      setRefresh((r) => r + 1);
      window.dispatchEvent(new CustomEvent("dashboard-refresh"));
      return true;
    } catch (e) {
      toast.error(`${id ? "Couldn’t save the snag" : "Couldn’t report the snag"}: ${e?.response?.data?.message || "check your connection and try again"}. Your entries are kept.`);
      return false;
    }
  };

  const noun = tracker === "OJO Snags" ? { one: "snag", many: "snags" } : { one: "record", many: "records" };
  // only rows still visible under the current tab / filters count as selected
  const selectedRows = useMemo(() => rows.filter((s) => selection.includes(s._id)), [rows, selection]);

  return (
    <Box>
      <PageHeader
        title={meta.title}
        description={meta.description}
        actions={
          <>
            <DataMenu entity="snags" viewRows={rows} filename={fileBase} onImported={() => setRefresh((r) => r + 1)} />
            <IconButton aria-label="More" onClick={(e) => setMore(e.currentTarget)} sx={{ width: 32, height: 32, border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)", backgroundColor: "var(--surface)" }}>
              <MoreHoriz fontSize="small" />
            </IconButton>
            {isAdmin && (
              <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => setDialog({ mode: "add" })}>
                {meta.add}
              </Button>
            )}
            <Menu anchorEl={more} open={Boolean(more)} onClose={() => setMore(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
              <MenuItem onClick={() => { setMore(null); exportRows(rows, EXPORT_COLUMNS, { format: "csv", filename: fileBase }); }}>
                <ListItemIcon><FileDownloadOutlined fontSize="small" /></ListItemIcon>Export view as CSV
              </MenuItem>
            </Menu>
          </>
        }
      />

      {meta.tabs && (
      <Tabs value={f.tab} onChange={(_e, v) => setF({ tab: v })} aria-label="Snag type" sx={{ mb: 2 }}>
        {TABS.map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                {t.label}
                <Box component="span" sx={{ px: 0.75, height: 18, minWidth: 18, borderRadius: "5px", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", backgroundColor: "var(--surface-active)" }}>
                  {loading ? "·" : tabCount(t.value)}
                </Box>
              </Box>
            }
          />
        ))}
      </Tabs>
      )}

      <CategoryTables category={tracker} sub={meta.tabs && f.tab !== "all" ? f.tab : undefined} title={meta.tabs && f.tab !== "all" ? `${f.tab} tables` : "Tables"} compact />

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 2 }}>
        <SegmentedControl
          ariaLabel="View"
          value={f.view}
          onChange={(v) => setF({ view: v })}
          options={[
            { value: "list", label: "Table", icon: <TableRowsOutlined sx={{ fontSize: 16 }} /> },
            { value: "analytics", label: "Analytics", icon: <InsightsOutlined sx={{ fontSize: 16 }} /> },
          ]}
        />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: 32, px: 1.25, width: { xs: "100%", sm: 260 }, mx: { sm: 0.5 }, borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-xs)", "&:focus-within": { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-ring)" } }}>
          <SearchIcon sx={{ fontSize: 17, color: "var(--text-muted)" }} />
          <InputBase value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search SLID, ticket, customer, team…" inputProps={{ "aria-label": "Search snags" }} sx={{ flex: 1, fontSize: 13 }} />
          {draft && <IconButton size="small" aria-label="Clear search" onClick={() => setDraft("")} sx={{ p: 0.25 }}><Close sx={{ fontSize: 15 }} /></IconButton>}
        </Box>
        <FilterChip label="Status" options={["Open", "Dispatched", "Resolved"].map((v) => ({ value: v, label: v }))} value={f.status} onChange={(v) => setF({ status: v })} />
        <FilterChip label="Issue" options={options.category} value={f.category} onChange={(v) => setF({ category: v })} searchable />
        <FilterChip label="Field team" options={options.team} value={f.team} onChange={(v) => setF({ team: v })} searchable />
        {meta.tabs && <FilterChip label="Source" options={options.source} value={sourceValue} onChange={(v) => setF({ source: v.length ? v : [] })} />}
        <FilterChip label="Date" single options={DATE_RANGES} value={f.range ? [f.range] : []} onChange={(v) => setF({ range: v[0] || "" })} />
        {activeFilters && (
          <Button variant="text" size="small" startIcon={<FilterAltOffOutlined sx={{ fontSize: 16 }} />} onClick={() => { setDraft(""); setF({ q: "", range: "", ...Object.fromEntries(LIST_KEYS.map((k) => [k, []])) }); }} sx={{ color: "var(--text-secondary)", height: 28 }}>
            Clear
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>{loading ? "Loading…" : `${rows.length.toLocaleString()} ${tracker === "OJO Snags" ? "snag" : "record"}${rows.length === 1 ? "" : "s"}`}</Typography>
      </Box>

      {error && <ErrorState title="Snags didn't load" message={error} onRetry={() => { setLoading(true); setRefresh((r) => r + 1); }} sx={{ mb: 2 }} />}

      {f.view !== "analytics" && selectedRows.length > 0 && (
        <BulkBar
          count={selectedRows.length}
          onExport={() => exportRows(selectedRows, EXPORT_COLUMNS, { filename: `${fileBase}-selected` })}
          onDelete={isAdmin ? () => setDeleting(selectedRows) : undefined}
          onClear={() => setSelection([])}
        />
      )}

      {loading ? (
        <PageLoader variant="table" />
      ) : f.view === "analytics" ? (
        <Suspense fallback={<PageLoader variant="cards" />}>
          <CustomerIssuesAnalytics issues={rows} />
        </Suspense>
      ) : (
        <SnagTable rows={rows} onOpen={(s) => setOpenId(s._id)} selection={selection} onSelectionChange={setSelection} />
      )}

      <SnagSheet
        snag={openSnag}
        open={Boolean(openSnag)}
        onClose={() => setOpenId(null)}
        isAdmin={isAdmin}
        onPatch={patch}
        onEdit={(s) => setDialog({ mode: "edit", issue: s })}
        onRecordTicket={(s) => setTicketFor(s)}
        onDelete={(s) => setDeleting([s])}
      />

      <SafeDeleteDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        records={deleting || []}
        noun={noun}
        nameOf={(s) => [s.slid, s.customerName || s.ticketId].filter(Boolean).join(" · ")}
        exportColumns={EXPORT_COLUMNS}
        exportFilename={fileBase}
        onDelete={(list) => bulkDelete(DELETE_PATHS.snags, list.map((s) => s._id))}
        onDeleted={({ deleted }) => {
          setSnags((list) => list.filter((s) => !deleted.includes(s._id)));
          setSelection((sel) => sel.filter((id) => !deleted.includes(id)));
          if (deleted.includes(openId)) setOpenId(null);
          window.dispatchEvent(new CustomEvent("dashboard-refresh"));
        }}
      />

      <Suspense fallback={null}>
        {dialog && (
          <CustomerIssueDialog
            open
            onClose={() => setDialog(null)}
            onSubmit={submit}
            issue={dialog.mode === "edit" ? dialog.issue : null}
          />
        )}
        {ticketFor && (
          <RecordTicketDialog
            key={ticketFor._id}
            open
            onClose={() => setTicketFor(null)}
            task={ticketFor}
            taskType="CustomerIssue"
            onTicketAdded={() => setRefresh((r) => r + 1)}
          />
        )}
      </Suspense>
    </Box>
  );
};

export default OjoSnagsPage;
