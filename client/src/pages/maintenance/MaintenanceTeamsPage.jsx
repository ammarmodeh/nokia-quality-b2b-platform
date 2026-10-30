import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useOutletContext, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Button, IconButton, InputBase, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import { toast } from "sonner";
import { format } from "date-fns";
import AppDialog from "../../components/ui/AppDialog";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SectionCard from "../../components/ui/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import Sheet from "../../components/ui/Sheet";
import Badge from "../../components/ui/Badge";
import SegmentedControl from "../../components/ui/SegmentedControl";
import { Pair, Row, SelectField } from "../../components/ui/SettingsForm";
import { field } from "../../components/ui/formField";
import MTable from "./MTable";
import { STATUS_TONE, errMsg, fieldErrors, maintenanceApi, monthLabel, useDropdowns, useMaintenanceTeams } from "./maintenanceApi";

const SHIFTS = ["Morning", "Evening", "Night", "Rotating"];
const EMPTY = { teamName: "", teamCode: "", company: "", supervisor: "", supervisorPhone: "", governorate: "", coverageAreas: "", shift: "", vehicle: "", status: "Active", notes: "", members: [] };

/** Create / edit a maintenance team: identity, supervision, coverage, crew. */
export const TeamFormDialog = ({ open, team, onClose, onSaved }) => {
  const opt = useDropdowns();
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setV(team ? { ...EMPTY, ...team, coverageAreas: (team.coverageAreas || []).join(", "), members: team.members || [] } : EMPTY);
    setErrors({});
    setError(null);
  }, [open, team]);
  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val?.target ? val.target.value : val }));
  const setMember = (i, k, val) => setV((s) => ({ ...s, members: s.members.map((m, j) => (j === i ? { ...m, [k]: val } : m)) }));

  const submit = async () => {
    const errs = {};
    if (!v.teamName.trim()) errs.teamName = "Team name is required";
    if (v.members.some((m) => !String(m.name || "").trim() && (m.phone || "").trim())) errs.members = "Each crew member needs a name";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setError(null);
    try {
      const body = { ...v, members: v.members.filter((m) => String(m.name || "").trim()) };
      const saved = team ? await maintenanceApi.teams.update(team._id, body) : await maintenanceApi.teams.create(body);
      toast.success(team ? "Team updated" : `${saved.teamName} added`);
      onSaved?.(saved);
    } catch (e) {
      setErrors(fieldErrors(e));
      setError(errMsg(e, "Couldn't save the team"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      size="md"
      title={team ? `Edit ${team.teamName}` : "New maintenance team"}
      description="Maintenance teams are separate from the installation field teams."
      onSubmit={submit}
      primary={{ label: team ? "Save changes" : "Create team", loading: saving, type: "submit" }}
      error={error}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--text)", mt: 0.5 }}>Team</Typography>
      <Row label="Team name" required>
        <TextField {...field} value={v.teamName} onChange={set("teamName")} error={!!errors.teamName} helperText={errors.teamName} placeholder="e.g. Irbid Maintenance 1" autoFocus slotProps={{ htmlInput: { "aria-label": "Team name", maxLength: 80 } }} />
      </Row>
      <Row label="Code & company" hint="Team code (unique when set) and subcontractor.">
        <Pair>
          <TextField {...field} value={v.teamCode} onChange={set("teamCode")} placeholder="Code" error={!!errors.teamCode} helperText={errors.teamCode} slotProps={{ htmlInput: { "aria-label": "Team code", maxLength: 20 } }} />
          {opt("TEAM_COMPANY").length ? (
            <SelectField value={v.company} onChange={set("company")} options={[{ value: "", label: "Not set" }, ...opt("TEAM_COMPANY")]} ariaLabel="Company" placeholder="Company" />
          ) : (
            <TextField {...field} value={v.company} onChange={set("company")} placeholder="Company" slotProps={{ htmlInput: { "aria-label": "Company" } }} />
          )}
        </Pair>
      </Row>
      <Row label="Status" hint="Inactive teams keep their history but can't get new tasks or samples.">
        <SegmentedControl ariaLabel="Team status" value={v.status} onChange={set("status")} options={[{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }]} />
      </Row>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--text)", mt: 2 }}>Supervision & coverage</Typography>
      <Row label="Supervisor" hint="Name and phone.">
        <Pair>
          <TextField {...field} value={v.supervisor} onChange={set("supervisor")} placeholder="Supervisor" slotProps={{ htmlInput: { "aria-label": "Supervisor" } }} />
          <TextField {...field} value={v.supervisorPhone} onChange={set("supervisorPhone")} placeholder="Phone" slotProps={{ htmlInput: { "aria-label": "Supervisor phone", inputMode: "tel" } }} />
        </Pair>
      </Row>
      <Row label="Governorate & shift">
        <Pair>
          <SelectField value={v.governorate} onChange={set("governorate")} options={[{ value: "", label: "Not set" }, ...opt("GOVERNORATES")]} ariaLabel="Governorate" placeholder="Governorate" />
          <SelectField value={v.shift} onChange={set("shift")} options={[{ value: "", label: "Not set" }, ...SHIFTS.map((s) => ({ value: s, label: s }))]} ariaLabel="Shift" placeholder="Shift" />
        </Pair>
      </Row>
      <Row label="Coverage areas" hint="Districts or exchanges, separated by commas.">
        <TextField {...field} value={v.coverageAreas} onChange={set("coverageAreas")} placeholder="e.g. Ramtha, Huwwara" slotProps={{ htmlInput: { "aria-label": "Coverage areas" } }} />
      </Row>
      <Row label="Vehicle">
        <TextField {...field} value={v.vehicle} onChange={set("vehicle")} placeholder="Plate or fleet number" slotProps={{ htmlInput: { "aria-label": "Vehicle" } }} />
      </Row>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--text)", mt: 2 }}>Crew</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, py: 1.5 }}>
        {v.members.map((m, i) => (
          <Box key={m._id || i} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "2fr 1.4fr 1.4fr auto" }, gap: 1, alignItems: "center" }}>
            <TextField {...field} value={m.name} onChange={(e) => setMember(i, "name", e.target.value)} placeholder="Name" slotProps={{ htmlInput: { "aria-label": `Member ${i + 1} name` } }} />
            <SelectField value={m.role || "Technician"} onChange={(val) => setMember(i, "role", val)} options={["Technician", "Team leader", "Driver", "Trainee"].map((r) => ({ value: r, label: r }))} ariaLabel={`Member ${i + 1} role`} />
            <TextField {...field} value={m.phone || ""} onChange={(e) => setMember(i, "phone", e.target.value)} placeholder="Phone" slotProps={{ htmlInput: { "aria-label": `Member ${i + 1} phone`, inputMode: "tel" } }} />
            <Tooltip title="Remove">
              <IconButton aria-label={`Remove member ${i + 1}`} size="small" onClick={() => setV((s) => ({ ...s, members: s.members.filter((_, j) => j !== i) }))}>
                <DeleteOutline sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
        {errors.members && <Typography sx={{ fontSize: 12, color: "var(--danger)" }}>{errors.members}</Typography>}
        <Button variant="outlined" size="small" startIcon={<AddIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => setV((s) => ({ ...s, members: [...s.members, { name: "", role: "Technician", phone: "" }] }))}>
          Add crew member
        </Button>
      </Box>
      <Row label="Notes" align="start">
        <TextField {...field} multiline minRows={2} value={v.notes} onChange={set("notes")} slotProps={{ htmlInput: { "aria-label": "Notes" } }} />
      </Row>
    </AppDialog>
  );
};

const Detail = ({ label, children }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1, py: 0.75, fontSize: 13, borderBottom: "1px solid var(--border)" }}>
    <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{label}</Typography>
    <Box sx={{ color: "var(--text)", minWidth: 0 }}>{children || "—"}</Box>
  </Box>
);

const TeamSheet = ({ teamId, onClose, onEdit }) => {
  const [team, setTeam] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!teamId) return;
    setTeam(null);
    setError(null);
    maintenanceApi.teams.get(teamId).then(setTeam).catch((e) => setError(errMsg(e, "Couldn't load the team")));
  }, [teamId]);
  return (
    <Sheet
      open={Boolean(teamId)}
      onClose={onClose}
      width={560}
      title={team?.teamName || "Team"}
      description={team ? [team.teamCode, team.company, team.governorate].filter(Boolean).join(" · ") || "Maintenance team" : undefined}
      actions={
        team && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" component={RouterLink} to={`/dvoc-maintenance/reports/${team._id}`}>View Analysis</Button>
            <Button variant="outlined" onClick={() => onEdit(team)}>Edit</Button>
          </Box>
        )
      }
    >
      {error && <ErrorState message={error} />}
      {team && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Box>
            <Detail label="Status"><Badge tone={team.status === "Active" ? "success" : "neutral"} dot>{team.status}</Badge></Detail>
            <Detail label="Supervisor">{[team.supervisor, team.supervisorPhone].filter(Boolean).join(" · ")}</Detail>
            <Detail label="Shift">{team.shift}</Detail>
            <Detail label="Coverage">{(team.coverageAreas || []).join(", ")}</Detail>
            <Detail label="Vehicle">{team.vehicle}</Detail>
            <Detail label="Tasks">{["Todo", "In Progress", "Closed"].map((s) => `${team.statusCounts?.[s] || 0} ${s.toLowerCase()}`).join(" · ")}</Detail>
            {team.notes && <Detail label="Notes">{team.notes}</Detail>}
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Crew · {team.members?.length || 0}</Typography>
            {team.members?.length ? team.members.map((m) => (
              <Box key={m._id} sx={{ display: "flex", gap: 1, fontSize: 13, py: 0.5 }}>
                <span style={{ flex: 1 }}>{m.name}</span>
                <span style={{ color: "var(--text-secondary)" }}>{m.role}</span>
                <span style={{ color: "var(--text-muted)", minWidth: 100, textAlign: "right" }}>{m.phone}</span>
              </Box>
            )) : <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>No crew members recorded.</Typography>}
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Survey samples</Typography>
            {team.samples?.length ? team.samples.map((s) => (
              <Box key={s._id} sx={{ display: "flex", fontSize: 13, py: 0.5 }}>
                <span style={{ flex: 1 }}>{monthLabel(s.year, s.month)}</span>
                <strong>{s.sampleSize.toLocaleString()}</strong>
              </Box>
            )) : <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>No samples entered yet.</Typography>}
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Recent tasks</Typography>
            {team.recentTasks?.length ? team.recentTasks.map((t) => (
              <Box key={t._id} sx={{ display: "flex", gap: 1, alignItems: "center", fontSize: 13, py: 0.5 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{t.taskNumber}</span>
                <span style={{ flex: 1, color: "var(--text-secondary)" }}>{t.slid}</span>
                <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
              </Box>
            )) : <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>No tasks yet.</Typography>}
          </Box>
          {team.history?.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>History</Typography>
              {team.history.map((h) => (
                <Typography key={h._id} sx={{ fontSize: 12, color: "var(--text-secondary)", py: 0.25 }}>
                  {format(new Date(h.createdAt), "d MMM yyyy, HH:mm")} · {h.userName || "Someone"} · {h.summary || (h.changes ? `changed ${Object.keys(h.changes).join(", ")}` : h.action)}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Sheet>
  );
};

const MaintenanceTeamsPage = () => {
  const { refreshOverview } = useOutletContext() || {};
  const isAdmin = useSelector((s) => s?.auth?.user?.role) === "Admin";
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "Active";
  const [q, setQ] = useState("");
  const { teams, loading, error, reload } = useMaintenanceTeams(status === "all" ? {} : { status });
  const [editing, setEditing] = useState(null); // null | "new" | team
  const [openId, setOpenId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? teams.filter((t) => [t.teamName, t.teamCode, t.supervisor, t.company, t.governorate].some((x) => String(x || "").toLowerCase().includes(n))) : teams;
  }, [teams, q]);

  const columns = [
    { key: "teamName", label: "Team", render: (t) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <span style={{ color: "var(--text)", fontWeight: 500 }}>{t.teamName}</span>
        {t.teamCode && <Typography component="span" sx={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{t.teamCode}</Typography>}
      </Box>
    ) },
    { key: "company", label: "Company", render: (t) => t.company || "—" },
    { key: "supervisor", label: "Supervisor", render: (t) => t.supervisor || "—" },
    { key: "governorate", label: "Area", render: (t) => [t.governorate, t.shift].filter(Boolean).join(" · ") || "—" },
    { key: "crew", label: "Crew", align: "right", render: (t) => t.members?.length || 0 },
    { key: "tasks", label: "Tasks", align: "right", render: (t) => t.stats.tasks },
    { key: "resolved", label: "Resolved", align: "right", render: (t) => t.stats.resolvedTasks || 0 },
    { key: "samples", label: "Samples", align: "right", render: (t) => t.stats.samples.toLocaleString() },
    { key: "status", label: "Status", render: (t) => <Badge tone={t.status === "Active" ? "success" : "neutral"} dot>{t.status}</Badge> },
    {
      key: "analysis",
      label: "Analysis",
      align: "center",
      render: (t) => (
        <Button
          size="small"
          variant="outlined"
          component={RouterLink}
          to={`/dvoc-maintenance/reports/${t._id}`}
          onClick={(e) => e.stopPropagation()}
          sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: "auto", textTransform: "none" }}
        >
          View Analysis
        </Button>
      ),
    },
    ...(isAdmin ? [{ key: "actions", label: "", align: "right", render: (t) => (
      <Tooltip title="Delete team">
        <IconButton size="small" aria-label={`Delete ${t.teamName}`} onClick={(e) => { e.stopPropagation(); setDeleteError(null); setDeleting(t); }}>
          <DeleteOutline sx={{ fontSize: 17 }} />
        </IconButton>
      </Tooltip>
    ) }] : []),
  ];

  const saved = () => {
    setEditing(null);
    reload();
    refreshOverview?.();
  };

  return (
    <>
      <SectionCard
        title="Maintenance teams"
        description={loading ? "Loading…" : `${rows.length} team${rows.length === 1 ? "" : "s"}`}
        padding={0}
        actions={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: 30, px: 1, border: "1px solid var(--border)", borderRadius: "6px", width: { xs: 140, sm: 200 } }}>
              <SearchIcon sx={{ fontSize: 16, color: "var(--text-muted)" }} />
              <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams" sx={{ fontSize: 13, flex: 1 }} inputProps={{ "aria-label": "Search teams" }} />
            </Box>
            <SegmentedControl size="sm" ariaLabel="Status" value={status} onChange={(v) => setParams((p) => { const n = new URLSearchParams(p); if (v === "Active") n.delete("status"); else n.set("status", v); return n; }, { replace: true })} options={[{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }, { value: "all", label: "All" }]} />
            <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => setEditing("new")}>New team</Button>
          </Box>
        }
      >
        {error ? (
          <Box sx={{ p: 2 }}><ErrorState message={error} onRetry={reload} /></Box>
        ) : (
          <MTable
            ariaLabel="Maintenance teams"
            columns={columns}
            rows={rows}
            loading={loading}
            onRowClick={(t) => setOpenId(t._id)}
            empty={<EmptyState icon={<GroupsOutlined sx={{ fontSize: 20 }} />} title={teams.length ? "No teams match" : "No maintenance teams yet"} description={teams.length ? "Try another search." : "Add the teams that handle maintenance faults. They're kept separate from the installation field teams."} action={!teams.length && <Button variant="contained" onClick={() => setEditing("new")}>New team</Button>} />}
          />
        )}
      </SectionCard>

      <TeamFormDialog open={Boolean(editing)} team={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={(t) => { saved(); if (openId === t._id) setOpenId(null); }} />
      <TeamSheet teamId={openId} onClose={() => setOpenId(null)} onEdit={(t) => { setOpenId(null); setEditing(t); }} />
      <ConfirmDialog
        open={Boolean(deleting)}
        danger
        title={`Delete ${deleting?.teamName}?`}
        description="Only teams without tasks or samples can be deleted. Set a team to Inactive to keep its history."
        confirmLabel="Delete team"
        loading={busy}
        error={deleteError}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await maintenanceApi.teams.remove(deleting._id);
            toast.success("Team deleted");
            setDeleting(null);
            reload();
            refreshOverview?.();
          } catch (e) {
            setDeleteError(errMsg(e, "Couldn't delete the team"));
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
};

export default MaintenanceTeamsPage;
