import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Button, IconButton, InputBase, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import PollOutlined from "@mui/icons-material/PollOutlined";
import { toast } from "sonner";
import { format } from "date-fns";
import AppDialog from "../../components/ui/AppDialog";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SectionCard from "../../components/ui/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import FilterChip from "../../components/ui/FilterChip";
import { Pair, Row, SelectField } from "../../components/ui/SettingsForm";
import { field } from "../../components/ui/formField";
import MTable from "./MTable";
import { MONTHS, errMsg, fieldErrors, maintenanceApi, monthLabel, useMaintenanceTeams } from "./maintenanceApi";

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => thisYear - i);
const blank = () => ({ team: "", year: thisYear, month: new Date().getMonth() + 1, sampleSize: "", promoters: "", neutrals: "", detractors: "", source: "", notes: "" });

const SampleDialog = ({ open, sample, teams, onClose, onSaved, onEditExisting }) => {
  const [v, setV] = useState(blank);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [existingId, setExistingId] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setV(sample ? { ...blank(), ...sample, team: sample.team?._id || sample.team, promoters: sample.promoters ?? "", neutrals: sample.neutrals ?? "", detractors: sample.detractors ?? "" } : blank());
    setErrors({});
    setError(null);
    setExistingId(null);
  }, [open, sample]);
  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val?.target ? val.target.value : val }));
  const n = (x) => (x === "" || x == null ? null : Number(x));
  const parts = [n(v.promoters), n(v.neutrals), n(v.detractors)];
  const partsSum = parts.filter((x) => x != null).reduce((a, b) => a + b, 0);

  const submit = async () => {
    const errs = {};
    if (!v.team) errs.team = "Choose a team";
    if (v.sampleSize === "" || !Number.isInteger(Number(v.sampleSize)) || Number(v.sampleSize) < 0) errs.sampleSize = "Enter a whole number ≥ 0";
    if (partsSum > Number(v.sampleSize || 0)) errs.sampleSize = "Promoters + neutrals + detractors can't exceed the sample size";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setError(null);
    setExistingId(null);
    const body = { ...v, year: Number(v.year), month: Number(v.month), sampleSize: Number(v.sampleSize), promoters: n(v.promoters), neutrals: n(v.neutrals), detractors: n(v.detractors) };
    try {
      const saved = sample ? await maintenanceApi.samples.update(sample._id, body) : await maintenanceApi.samples.create(body);
      toast.success(sample ? "Sample entry updated" : "Samples saved");
      onSaved?.(saved);
    } catch (e) {
      setErrors(fieldErrors(e));
      setError(errMsg(e, "Couldn't save the samples"));
      setExistingId(e?.response?.data?.existingId || null);
    } finally {
      setSaving(false);
    }
  };

  const activeTeams = teams.filter((t) => t.status === "Active" || t._id === v.team);
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      size="sm"
      title={sample ? "Edit survey samples" : "Enter survey samples"}
      description="One entry per maintenance team per month."
      onSubmit={submit}
      primary={{ label: sample ? "Save changes" : "Save samples", loading: saving, type: "submit" }}
      error={error}
      extraActions={existingId && <Button variant="text" onClick={() => onEditExisting(existingId)}>Edit the existing entry</Button>}
    >
      <Row label="Team" required>
        <SelectField value={v.team} onChange={set("team")} options={[{ value: "", label: "Choose a team" }, ...activeTeams.map((t) => ({ value: t._id, label: t.teamCode ? `${t.teamName} · ${t.teamCode}` : t.teamName }))]} ariaLabel="Team" placeholder="Choose a team" />
        {errors.team && <Typography sx={{ fontSize: 12, color: "var(--danger)", mt: 0.5 }}>{errors.team}</Typography>}
      </Row>
      <Row label="Month" required>
        <Pair>
          <SelectField value={v.month} onChange={set("month")} options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} ariaLabel="Month" />
          <SelectField value={v.year} onChange={set("year")} options={YEARS.map((y) => ({ value: y, label: String(y) }))} ariaLabel="Year" />
        </Pair>
      </Row>
      <Row label="Survey samples" required hint="Completed surveys for this team in the month.">
        <TextField {...field} type="number" value={v.sampleSize} onChange={set("sampleSize")} error={!!errors.sampleSize} helperText={errors.sampleSize} slotProps={{ htmlInput: { "aria-label": "Survey samples", min: 0, step: 1 } }} />
      </Row>
      <Row label="Breakdown" hint={`Optional. ${partsSum ? `${partsSum} of ${v.sampleSize || 0} accounted for.` : "Promoters, neutrals, detractors."}`}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
          {["promoters", "neutrals", "detractors"].map((k) => (
            <TextField key={k} {...field} type="number" value={v[k]} onChange={set(k)} placeholder={k[0].toUpperCase() + k.slice(1)} error={!!errors[k]} helperText={errors[k]} slotProps={{ htmlInput: { "aria-label": k, min: 0, step: 1 } }} />
          ))}
        </Box>
      </Row>
      <Row label="Source">
        <TextField {...field} value={v.source} onChange={set("source")} placeholder="e.g. vendor batch" slotProps={{ htmlInput: { "aria-label": "Source" } }} />
      </Row>
      <Row label="Notes" align="start">
        <TextField {...field} multiline minRows={2} value={v.notes} onChange={set("notes")} slotProps={{ htmlInput: { "aria-label": "Notes" } }} />
      </Row>
    </AppDialog>
  );
};

const MaintenanceSamplesPage = () => {
  const { refreshOverview } = useOutletContext() || {};
  const isAdmin = useSelector((s) => s?.auth?.user?.role) === "Admin";
  const { teams } = useMaintenanceTeams();
  const [year, setYear] = useState(thisYear);
  const [teamFilter, setTeamFilter] = useState([]);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | sample
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    maintenanceApi.samples
      .list({ year })
      .then((r) => {
        setRows(r);
        setError(null);
      })
      .catch((e) => setError(errMsg(e, "Couldn't load survey samples")))
      .finally(() => setLoading(false));
  }, [year]);
  useEffect(load, [load]);

  const visible = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((r) => (!teamFilter.length || teamFilter.includes(r.team?._id)) && (!n || [r.team?.teamName, r.team?.teamCode, r.source, r.notes].some((x) => String(x || "").toLowerCase().includes(n))));
  }, [rows, teamFilter, q]);
  const total = visible.reduce((s, r) => s + r.sampleSize, 0);

  const teamOptions = useMemo(() => teams.map((t) => ({ value: t._id, label: t.teamName })), [teams]);
  const columns = [
    { key: "month", label: "Month", render: (r) => <span style={{ color: "var(--text)", fontWeight: 500 }}>{monthLabel(r.year, r.month)}</span> },
    { key: "team", label: "Team", render: (r) => r.team?.teamName || "—" },
    { key: "sampleSize", label: "Samples", align: "right", render: (r) => <strong style={{ color: "var(--text)" }}>{r.sampleSize.toLocaleString()}</strong> },
    { key: "breakdown", label: "P / N / D", align: "right", render: (r) => (r.promoters == null && r.neutrals == null && r.detractors == null ? "—" : [r.promoters, r.neutrals, r.detractors].map((x) => x ?? "–").join(" / ")) },
    { key: "linked", label: "Linked tasks", align: "right", render: (r) => r.linkedTasks },
    { key: "source", label: "Source", render: (r) => r.source || "—" },
    { key: "updated", label: "Updated", render: (r) => `${format(new Date(r.updatedAt), "d MMM yyyy")}${r.updatedBy?.name ? ` · ${r.updatedBy.name}` : ""}` },
    { key: "actions", label: "", align: "right", render: (r) => (
      <Box sx={{ display: "inline-flex" }} onClick={(e) => e.stopPropagation()}>
        <Tooltip title="Edit"><IconButton size="small" aria-label="Edit entry" onClick={() => setEditing(r)}><EditOutlined sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        {isAdmin && <Tooltip title="Delete"><IconButton size="small" aria-label="Delete entry" onClick={() => { setDeleteError(null); setDeleting(r); }}><DeleteOutline sx={{ fontSize: 17 }} /></IconButton></Tooltip>}
      </Box>
    ) },
  ];

  return (
    <>
      <SectionCard
        title="Survey samples"
        description={loading ? "Loading…" : `${visible.length} entr${visible.length === 1 ? "y" : "ies"} · ${total.toLocaleString()} samples in ${year}`}
        padding={0}
        actions={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: 30, px: 1, border: "1px solid var(--border)", borderRadius: "6px", width: { xs: 130, sm: 170 } }}>
              <SearchIcon sx={{ fontSize: 16, color: "var(--text-muted)" }} />
              <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" sx={{ fontSize: 13, flex: 1 }} inputProps={{ "aria-label": "Search samples" }} />
            </Box>
            <FilterChip label="Team" options={teamOptions} value={teamFilter} onChange={setTeamFilter} searchable />
            <Box sx={{ width: 100 }}><SelectField value={year} onChange={(v) => setYear(Number(v))} options={YEARS.map((y) => ({ value: y, label: String(y) }))} ariaLabel="Year" /></Box>
            <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => setEditing("new")} disabled={!teams.some((t) => t.status === "Active")}>Enter samples</Button>
          </Box>
        }
      >
        {error ? (
          <Box sx={{ p: 2 }}><ErrorState message={error} onRetry={load} /></Box>
        ) : (
          <MTable
            ariaLabel="Survey samples"
            columns={columns}
            rows={visible}
            loading={loading}
            onRowClick={(r) => setEditing(r)}
            empty={<EmptyState icon={<PollOutlined sx={{ fontSize: 20 }} />} title={rows.length ? "No entries match" : `No samples entered for ${year}`} description={!teams.length ? "Create a maintenance team first, under All teams." : rows.length ? "Try another team or search." : "Enter each maintenance team's monthly survey samples. They don't affect DVOC Installation figures."} />}
          />
        )}
      </SectionCard>

      <SampleDialog
        open={Boolean(editing)}
        sample={editing === "new" ? null : editing}
        teams={teams}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); refreshOverview?.(); }}
        onEditExisting={(id) => {
          const found = rows.find((r) => r._id === id);
          if (found) setEditing(found);
          else maintenanceApi.samples.list({}).then((all) => setEditing(all.find((r) => r._id === id) || null));
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        danger
        title="Delete this sample entry?"
        description={deleting ? `${deleting.team?.teamName} · ${monthLabel(deleting.year, deleting.month)} · ${deleting.sampleSize} samples` : ""}
        confirmLabel="Delete"
        loading={busy}
        error={deleteError}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await maintenanceApi.samples.remove(deleting._id);
            toast.success("Entry deleted");
            setDeleting(null);
            load();
            refreshOverview?.();
          } catch (e) {
            setDeleteError(errMsg(e, "Couldn't delete the entry"));
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
};

export default MaintenanceSamplesPage;
