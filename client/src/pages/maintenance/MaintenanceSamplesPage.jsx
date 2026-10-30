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
import AppDialog from "../../components/ui/AppDialog";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SectionCard from "../../components/ui/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import FilterChip from "../../components/ui/FilterChip";
import Badge from "../../components/ui/Badge";
import { Pair, Row, SelectField } from "../../components/ui/SettingsForm";
import { field } from "../../components/ui/formField";
import MTable from "./MTable";
import { TeamFormDialog } from "./MaintenanceTeamsPage";
import { MONTHS, errMsg, fieldErrors, maintenanceApi, monthLabel, useMaintenanceTeams } from "./maintenanceApi";

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => thisYear - i);
const blank = (team = "") => ({ team, year: thisYear, month: new Date().getMonth() + 1, sampleSize: "", promoters: "", neutrals: "", detractors: "", source: "", notes: "" });

const SampleDialog = ({ open, sample, defaultTeam = "", teams, onClose, onSaved, onEditExisting }) => {
  const [v, setV] = useState(blank);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [existingId, setExistingId] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setV(sample ? { ...blank(), ...sample, team: sample.team?._id || sample.team, promoters: sample.promoters ?? "", neutrals: sample.neutrals ?? "", detractors: sample.detractors ?? "" } : blank(defaultTeam));
    setErrors({});
    setError(null);
    setExistingId(null);
  }, [open, sample, defaultTeam]);
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

// Promoters % follows the reports page: (samples − non-promoter DVOC tasks scored 1–8 in that month) ÷ samples.
const taskMonthKey = (t) => {
  const d = new Date(t.creationDate || t.faultDate || t.createdAt);
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${d.getMonth() + 1}`;
};
const isNonPromoter = (t) => t.evaluationScore != null && t.evaluationScore >= 1 && t.evaluationScore <= 8;
const pct = (promoters, samples) => (samples > 0 ? +((Math.max(0, promoters) / samples) * 100).toFixed(1) : null);
const fmtPct = (p) => (p == null ? "—" : `${p}%`);
const pctColor = (p) => (p == null ? "var(--text-muted)" : p < 70 ? "var(--danger)" : p < 85 ? "var(--warning, #B45309)" : "var(--success)");

const PCT_BANDS = [
  { value: "lt70", label: "Below 70%", test: (p) => p != null && p < 70 },
  { value: "70to85", label: "70% – 85%", test: (p) => p != null && p >= 70 && p < 85 },
  { value: "gte85", label: "85% and above", test: (p) => p != null && p >= 85 },
  { value: "none", label: "No samples", test: (p) => p == null },
];
const EXPERIENCE_BANDS = [
  { value: "lt1", label: "Under 1 year", test: (y) => y != null && y < 1 },
  { value: "1to3", label: "1 – 3 years", test: (y) => y != null && y >= 1 && y < 3 },
  { value: "3to5", label: "3 – 5 years", test: (y) => y != null && y >= 3 && y < 5 },
  { value: "gte5", label: "5+ years", test: (y) => y != null && y >= 5 },
  { value: "none", label: "Not recorded", test: (y) => y == null },
];
const bandTest = (bands, selected, value) => !selected.length || bands.some((b) => selected.includes(b.value) && b.test(value));
const SORTS = {
  team: (a, b) => a.team.teamName.localeCompare(b.team.teamName),
  worstLast: (a, b) => (a.lastPct ?? Infinity) - (b.lastPct ?? Infinity) || b.allSamples - a.allSamples,
  worstAll: (a, b) => (a.allPct ?? Infinity) - (b.allPct ?? Infinity) || b.allSamples - a.allSamples,
  mostSamples: (a, b) => b.allSamples - a.allSamples,
  experience: (a, b) => (b.team.yearsOfExperience ?? -1) - (a.team.yearsOfExperience ?? -1),
};

/** A team's monthly entries in the selected period: edit, delete or add a month. */
const TeamEntriesDialog = ({ summary, isAdmin, onClose, onAdd, onEdit, onDelete, onEditTeam }) => (
  <AppDialog
    open={Boolean(summary)}
    onClose={onClose}
    size="md"
    title={summary ? `${summary.team.teamName} · survey samples` : ""}
    description={summary ? `${summary.entries.length} month${summary.entries.length === 1 ? "" : "s"} · ${summary.allSamples.toLocaleString()} samples · promoters ${fmtPct(summary.allPct)}` : ""}
    extraActions={
      summary && (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="text" onClick={() => onEditTeam(summary.team)}>Edit team profile</Button>
          {summary.team.status === "Active" && <Button variant="outlined" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => onAdd(summary.team._id)}>Add month</Button>}
        </Box>
      )
    }
  >
    {summary && (
      <MTable
        ariaLabel="Monthly entries"
        rows={summary.entries}
        onRowClick={onEdit}
        columns={[
          { key: "month", label: "Month", render: (r) => <span style={{ color: "var(--text)", fontWeight: 500 }}>{monthLabel(r.year, r.month)}</span> },
          { key: "samples", label: "Samples", align: "right", render: (r) => r.sampleSize.toLocaleString() },
          { key: "nonPromoters", label: "Non-promoters", align: "right", render: (r) => r.nonPromoters },
          { key: "pct", label: "Promoters %", align: "right", render: (r) => <strong style={{ color: pctColor(r.promoterPct) }}>{fmtPct(r.promoterPct)}</strong> },
          { key: "actions", label: "", align: "right", render: (r) => (
            <Box sx={{ display: "inline-flex" }} onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Edit"><IconButton size="small" aria-label="Edit entry" onClick={() => onEdit(r)}><EditOutlined sx={{ fontSize: 16 }} /></IconButton></Tooltip>
              {isAdmin && <Tooltip title="Delete"><IconButton size="small" aria-label="Delete entry" onClick={() => onDelete(r)}><DeleteOutline sx={{ fontSize: 17 }} /></IconButton></Tooltip>}
            </Box>
          ) },
        ]}
        empty={<Typography sx={{ fontSize: 13, color: "var(--text-muted)", py: 2 }}>No samples entered for this period.</Typography>}
      />
    )}
  </AppDialog>
);

const MaintenanceSamplesPage = () => {
  const { refreshOverview } = useOutletContext() || {};
  const isAdmin = useSelector((s) => s?.auth?.user?.role) === "Admin";
  const { teams, reload: reloadTeams } = useMaintenanceTeams();
  const [year, setYear] = useState("all");
  const [q, setQ] = useState("");
  const [teamFilter, setTeamFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [trainingFilter, setTrainingFilter] = useState([]);
  const [qaFilter, setQaFilter] = useState([]);
  const [experienceFilter, setExperienceFilter] = useState([]);
  const [lastPctFilter, setLastPctFilter] = useState([]);
  const [allPctFilter, setAllPctFilter] = useState([]);
  const [sort, setSort] = useState("team");
  const [samples, setSamples] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openTeamId, setOpenTeamId] = useState(null);
  const [editing, setEditing] = useState(null); // null | { team } (new) | sample
  const [editingTeam, setEditingTeam] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([maintenanceApi.samples.list(year === "all" ? {} : { year }), maintenanceApi.tasks.list({ limit: "all" })])
      .then(([s, t]) => {
        setSamples(s);
        setTasks(t.rows);
        setError(null);
      })
      .catch((e) => setError(errMsg(e, "Couldn't load survey samples")))
      .finally(() => setLoading(false));
  }, [year]);
  useEffect(load, [load]);

  // Non-promoter DVOC tasks per team per month.
  const nonPromoters = useMemo(() => {
    const m = new Map();
    for (const t of tasks) {
      const key = taskMonthKey(t);
      const tid = t.team?._id || t.team;
      if (!key || !tid || !isNonPromoter(t)) continue;
      m.set(`${tid}|${key}`, (m.get(`${tid}|${key}`) || 0) + 1);
    }
    return m;
  }, [tasks]);

  const summaries = useMemo(() => {
    const byTeam = new Map(teams.map((t) => [t._id, []]));
    for (const s of samples) {
      const tid = s.team?._id || s.team;
      if (!byTeam.has(tid)) continue;
      const np = nonPromoters.get(`${tid}|${s.year}-${s.month}`) || 0;
      byTeam.get(tid).push({ ...s, nonPromoters: np, promoterPct: pct(s.sampleSize - np, s.sampleSize) });
    }
    return teams.map((team) => {
      const entries = byTeam.get(team._id).sort((a, b) => b.year - a.year || b.month - a.month);
      const last = entries[0] || null;
      const allSamples = entries.reduce((n, e) => n + e.sampleSize, 0);
      const allNon = entries.reduce((n, e) => n + e.nonPromoters, 0);
      return { team, entries, last, lastSamples: last?.sampleSize ?? null, lastPct: last?.promoterPct ?? null, allSamples, allPct: pct(allSamples - allNon, allSamples) };
    });
  }, [teams, samples, nonPromoters]);

  const visible = useMemo(() => {
    const n = q.trim().toLowerCase();
    return summaries
      .filter(({ team, lastPct, allPct }) =>
        (!n || [team.teamName, team.teamCode, team.supervisor].some((x) => String(x || "").toLowerCase().includes(n))) &&
        (!teamFilter.length || teamFilter.includes(team._id)) &&
        (!statusFilter.length || statusFilter.includes(team.status)) &&
        (!trainingFilter.length || trainingFilter.includes(team.training || "none")) &&
        (!qaFilter.length || qaFilter.includes(team.qaResult || "none")) &&
        bandTest(EXPERIENCE_BANDS, experienceFilter, team.yearsOfExperience) &&
        bandTest(PCT_BANDS, lastPctFilter, lastPct) &&
        bandTest(PCT_BANDS, allPctFilter, allPct)
      )
      .sort(SORTS[sort] || SORTS.team);
  }, [summaries, q, teamFilter, statusFilter, trainingFilter, qaFilter, experienceFilter, lastPctFilter, allPctFilter, sort]);

  const total = visible.reduce((s, r) => s + r.allSamples, 0);
  const filtersActive = [teamFilter, statusFilter, trainingFilter, qaFilter, experienceFilter, lastPctFilter, allPctFilter].some((f) => f.length) || q;
  const clearFilters = () => {
    [setTeamFilter, setStatusFilter, setTrainingFilter, setQaFilter, setExperienceFilter, setLastPctFilter, setAllPctFilter].forEach((f) => f([]));
    setQ("");
  };
  const openSummary = summaries.find((s) => s.team._id === openTeamId) || null;

  const teamOptions = useMemo(() => teams.map((t) => ({ value: t._id, label: t.teamName })), [teams]);
  const columns = [
    { key: "team", label: "Team", render: (r) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <span style={{ color: "var(--text)", fontWeight: 500 }}>{r.team.teamName}</span>
        {r.team.teamCode && <Typography component="span" sx={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{r.team.teamCode}</Typography>}
      </Box>
    ) },
    { key: "status", label: "Status", render: (r) => <Badge tone={r.team.status === "Active" ? "success" : "neutral"} dot>{r.team.status}</Badge> },
    { key: "experience", label: "Experience", align: "right", render: (r) => (r.team.yearsOfExperience != null ? `${r.team.yearsOfExperience} yr${r.team.yearsOfExperience === 1 ? "" : "s"}` : "—") },
    { key: "training", label: "Training", render: (r) => (r.team.training ? <Badge tone={r.team.training === "Trained" ? "success" : "warning"}>{r.team.training}</Badge> : "—") },
    { key: "qa", label: "QA", render: (r) => (r.team.qaResult ? <Badge tone={r.team.qaResult === "Passed" ? "success" : "danger"}>{r.team.qaResult}</Badge> : "—") },
    { key: "lastMonth", label: "Last month", render: (r) => (r.last ? monthLabel(r.last.year, r.last.month) : "—") },
    { key: "lastSamples", label: "Samples (last month)", align: "right", render: (r) => (r.lastSamples != null ? r.lastSamples.toLocaleString() : "—") },
    { key: "lastPct", label: "Promoters % (last month)", align: "right", render: (r) => <strong style={{ color: pctColor(r.lastPct) }}>{fmtPct(r.lastPct)}</strong> },
    { key: "allSamples", label: "Samples (all)", align: "right", render: (r) => <strong style={{ color: "var(--text)" }}>{r.allSamples.toLocaleString()}</strong> },
    { key: "allPct", label: "Promoters % (all)", align: "right", render: (r) => <strong style={{ color: pctColor(r.allPct) }}>{fmtPct(r.allPct)}</strong> },
    { key: "months", label: "Months", align: "right", render: (r) => r.entries.length },
  ];

  const afterSave = () => {
    setEditing(null);
    load();
    refreshOverview?.();
  };

  return (
    <>
      <SectionCard
        title="Survey samples"
        description={loading ? "Loading…" : `${visible.length} team${visible.length === 1 ? "" : "s"} · ${total.toLocaleString()} samples ${year === "all" ? "in all years" : `in ${year}`} · click a team for its monthly entries`}
        padding={0}
        actions={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Box sx={{ width: 120 }}><SelectField value={year} onChange={(v) => setYear(v === "all" ? "all" : Number(v))} options={[{ value: "all", label: "All years" }, ...YEARS.map((y) => ({ value: y, label: String(y) }))]} ariaLabel="Year" /></Box>
            <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => setEditing({ team: "" })} disabled={!teams.some((t) => t.status === "Active")}>Enter samples</Button>
          </Box>
        }
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", px: 2, py: 1.25, borderBottom: "1px solid var(--border)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: 30, px: 1, border: "1px solid var(--border)", borderRadius: "6px", width: { xs: "100%", sm: 190 } }}>
            <SearchIcon sx={{ fontSize: 16, color: "var(--text-muted)" }} />
            <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams" sx={{ fontSize: 13, flex: 1 }} inputProps={{ "aria-label": "Search teams" }} />
          </Box>
          <FilterChip label="Team" options={teamOptions} value={teamFilter} onChange={setTeamFilter} searchable />
          <FilterChip label="Status" options={[{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }]} value={statusFilter} onChange={setStatusFilter} />
          <FilterChip label="Experience" options={EXPERIENCE_BANDS} value={experienceFilter} onChange={setExperienceFilter} />
          <FilterChip label="Training" options={[{ value: "Trained", label: "Trained" }, { value: "Not trained", label: "Not trained" }, { value: "none", label: "Not recorded" }]} value={trainingFilter} onChange={setTrainingFilter} />
          <FilterChip label="QA" options={[{ value: "Passed", label: "Passed" }, { value: "Failed", label: "Failed" }, { value: "none", label: "Not recorded" }]} value={qaFilter} onChange={setQaFilter} />
          <FilterChip label="Promoters % (last month)" options={PCT_BANDS} value={lastPctFilter} onChange={setLastPctFilter} />
          <FilterChip label="Promoters % (all)" options={PCT_BANDS} value={allPctFilter} onChange={setAllPctFilter} />
          <FilterChip label="Sort" single options={[{ value: "team", label: "Team name" }, { value: "worstLast", label: "Lowest promoters % (last month)" }, { value: "worstAll", label: "Lowest promoters % (all)" }, { value: "mostSamples", label: "Most samples" }, { value: "experience", label: "Most experienced" }]} value={[sort]} onChange={(v) => setSort(v[0] || "team")} />
          {filtersActive && <Button size="small" variant="text" onClick={clearFilters}>Clear filters</Button>}
        </Box>
        {error ? (
          <Box sx={{ p: 2 }}><ErrorState message={error} onRetry={load} /></Box>
        ) : (
          <MTable
            ariaLabel="Survey samples by team"
            columns={columns}
            rows={visible}
            rowKey={(r) => r.team._id}
            loading={loading}
            onRowClick={(r) => setOpenTeamId(r.team._id)}
            empty={<EmptyState icon={<PollOutlined sx={{ fontSize: 20 }} />} title={teams.length ? "No teams match" : "No maintenance teams yet"} description={teams.length ? "Try other filters." : "Create a maintenance team first, under All teams."} action={filtersActive && <Button variant="outlined" onClick={clearFilters}>Clear filters</Button>} />}
          />
        )}
      </SectionCard>

      <TeamEntriesDialog
        summary={editing || editingTeam || deleting ? null : openSummary}
        isAdmin={isAdmin}
        onClose={() => setOpenTeamId(null)}
        onAdd={(teamId) => setEditing({ team: teamId })}
        onEdit={(s) => setEditing(s)}
        onDelete={(s) => { setDeleteError(null); setDeleting(s); }}
        onEditTeam={(t) => setEditingTeam(t)}
      />
      <SampleDialog
        open={Boolean(editing)}
        sample={editing?._id ? editing : null}
        defaultTeam={editing && !editing._id ? editing.team : ""}
        teams={teams}
        onClose={() => setEditing(null)}
        onSaved={afterSave}
        onEditExisting={(id) => {
          const found = samples.find((r) => r._id === id);
          if (found) setEditing(found);
          else maintenanceApi.samples.list({}).then((all) => setEditing(all.find((r) => r._id === id) || null));
        }}
      />
      <TeamFormDialog open={Boolean(editingTeam)} team={editingTeam} onClose={() => setEditingTeam(null)} onSaved={() => { setEditingTeam(null); reloadTeams(); }} />
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
