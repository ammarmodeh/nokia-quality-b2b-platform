import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useSelector } from "react-redux";
import { Autocomplete, Box, Button, IconButton, InputBase, TextField, Tooltip, Typography } from "@mui/material";
import Add from "@mui/icons-material/Add";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import AppDialog from "../ui/AppDialog";
import ConfirmDialog from "../ui/ConfirmDialog";
import Badge from "../ui/Badge";
import EmptyState from "../ui/EmptyState";
import { teamCodesApi } from "../../api/qops";

const EPOCH_YEAR = 2000;
const day = (d) => (d ? format(new Date(d), "yyyy-MM-dd") : "");
const shown = (d, open = "now") => (!d ? open : new Date(d).getUTCFullYear() <= EPOCH_YEAR ? "since records began" : format(new Date(d), "d MMM yyyy"));
const SOURCE = { manual: "added by hand", "team-update": "code changed on the team", backfill: "held before history started" };

const PeriodDialog = ({ open, onClose, period, teams, onSaved }) => {
  const [code, setCode] = useState(period?.code || "");
  const [team, setTeam] = useState(period?.fieldTeamId ? teams.find((t) => t._id === (period.fieldTeamId._id || period.fieldTeamId)) || null : null);
  const [from, setFrom] = useState(period?.from && new Date(period.from).getUTCFullYear() > EPOCH_YEAR ? day(period.from) : "");
  const [to, setTo] = useState(day(period?.to));
  const [note, setNote] = useState(period?.note || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const save = async () => {
    if (!code.trim()) return setError("Enter the team code");
    if (!team) return setError("Choose the field team");
    setBusy(true);
    setError(null);
    const body = { code: code.trim(), fieldTeamId: team._id, from: from ? new Date(`${from}T00:00:00Z`).toISOString() : null, to: to ? new Date(`${to}T00:00:00Z`).toISOString() : null, note };
    try {
      await (period?._id ? teamCodesApi.update(period._id, body) : teamCodesApi.create(body));
      onSaved();
    } catch (e) {
      setError(e?.response?.data?.message || "Couldn't save the period");
      setBusy(false);
    }
  };
  return (
    <AppDialog open={open} onClose={onClose} size="sm" title={period?._id ? "Edit code period" : "Add a code period"} description="Who held the code, from when until when. Tickets dated inside the period count for that team." error={error} onSubmit={save}
      primary={{ label: period?._id ? "Save" : "Add period", loading: busy }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField autoFocus required label="Team code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={Boolean(period?._id)} />
        <Autocomplete options={teams} value={team} onChange={(_e, v) => setTeam(v)} getOptionLabel={(t) => `${t.teamName}${t.teamCode ? ` (${t.teamCode})` : ""}`} isOptionEqualToValue={(a, b) => a._id === b._id}
          renderInput={(p) => <TextField {...p} required label="Field team" />} />
        <TextField type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} helperText="Empty = since records began" />
        <TextField type="date" label="Until (not included)" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} helperText="Empty = still holds it" />
        <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} sx={{ gridColumn: "1 / -1" }} inputProps={{ dir: "auto" }} />
      </Box>
    </AppDialog>
  );
};

/**
 * Team code history: who held which code, and when. Codes change hands; a ticket counts for the
 * team that held its code on the ticket's date. Codes without recorded history resolve to the
 * team that carries them today, until the first change (or an admin adds the periods).
 */
const TeamCodesDialog = ({ open, onClose, teams = [], team = null }) => {
  const isAdmin = useSelector((s) => s?.auth?.user?.role) === "Admin";
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(() => {
    setError(null);
    teamCodesApi.list(team ? { teamId: team._id } : {}).then(setData).catch((e) => setError(e?.response?.data?.message || "Couldn't load the code history"));
  }, [team]);
  useEffect(() => { if (open) load(); }, [open, load]);

  const byCode = useMemo(() => {
    const m = new Map();
    for (const p of [...(data?.periods || []), ...(data?.implicit || [])]) {
      const name = p.fieldTeamId?.teamName || "";
      if (q && !`${p.code} ${name}`.toLowerCase().includes(q.toLowerCase())) continue;
      if (!m.has(p.code)) m.set(p.code, []);
      m.get(p.code).push(p);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [data, q]);

  return (
    <AppDialog open={open} onClose={onClose} size="lg" title={team ? `Code history · ${team.teamName}` : "Team codes"}
      description="Codes move between people. Each ticket counts for whoever held its code on the ticket's date, so old tickets stay with the person who did the work."
      secondary={{ label: "Close" }} actions={<><Button variant="outlined" onClick={onClose}>Close</Button>{isAdmin && <Button variant="contained" startIcon={<Add />} onClick={() => setEditing({ code: team?.teamCode || "", fieldTeamId: team?._id })}>Add period</Button>}</>}
      error={error}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: 32, px: 1.25, mb: 1.5, width: { xs: "100%", sm: 280 }, borderRadius: "6px", border: "1px solid var(--border)" }}>
        <SearchIcon sx={{ fontSize: 17, color: "var(--text-muted)" }} />
        <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code or team" inputProps={{ "aria-label": "Search codes" }} sx={{ flex: 1, fontSize: 13 }} />
      </Box>
      {data && !byCode.length && <EmptyState title="No codes match" minHeight={140} />}
      {!data && !error && <Typography sx={{ fontSize: 13, color: "var(--text-muted)" }}>Loading…</Typography>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {byCode.map(([code, list]) => (
          <Box key={code} sx={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.75, backgroundColor: "var(--surface-subtle)", borderBottom: "1px solid var(--border)" }}>
              <Typography sx={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13 }}>{code}</Typography>
              <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>{list.length === 1 ? "1 holder" : `${list.length} holders`}</Typography>
            </Box>
            {list.map((p, i) => (
              <Box key={p._id || `${code}-${i}`} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr auto", sm: "minmax(160px,1.2fr) 1.6fr 1fr auto" }, alignItems: "center", gap: 1, px: 1.5, py: 0.75, borderTop: i ? "1px solid var(--border)" : 0 }}>
                <Typography dir="auto" sx={{ fontSize: 13, fontWeight: 500 }}>{p.fieldTeamId?.teamName || "Unknown team"}{p.fieldTeamId?.isTerminated ? " · left" : ""}</Typography>
                <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", display: { xs: "none", sm: "block" } }}>
                  {p.implicit ? "Holds it now · no history recorded yet" : `${shown(p.from)} → ${shown(p.to)}`}
                </Typography>
                <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 0.5, flexWrap: "wrap" }}>
                  {!p.implicit && !p.to && <Badge tone="success">current</Badge>}
                  {p.source && <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }} title={p.note || undefined}>{SOURCE[p.source] || p.source}{p.note ? " · note" : ""}</Typography>}
                </Box>
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  {isAdmin && !p.implicit && <Tooltip title="Edit period"><IconButton size="small" aria-label="Edit period" onClick={() => setEditing(p)}><EditOutlined sx={{ fontSize: 16 }} /></IconButton></Tooltip>}
                  {isAdmin && !p.implicit && <Tooltip title="Delete period"><IconButton size="small" aria-label="Delete period" onClick={() => setRemoving(p)}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton></Tooltip>}
                  {isAdmin && p.implicit && <Button size="small" onClick={() => setEditing({ code, fieldTeamId: p.fieldTeamId?._id })}>Record history</Button>}
                </Box>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      {editing && <PeriodDialog open period={editing} teams={teams} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      <ConfirmDialog open={Boolean(removing)} danger confirmLabel="Delete period" title={`Delete ${removing?.code} · ${removing?.fieldTeamId?.teamName || ""}?`}
        description="Tickets already saved keep their team. New or re-checked tickets in those dates will no longer resolve to this team."
        onClose={() => setRemoving(null)}
        onConfirm={async () => { try { await teamCodesApi.remove(removing._id); load(); } catch (e) { setError(e?.response?.data?.message || "Couldn't delete the period"); } setRemoving(null); }} />
    </AppDialog>
  );
};

export default TeamCodesDialog;
