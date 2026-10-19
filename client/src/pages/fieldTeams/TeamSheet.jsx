import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, IconButton, Typography } from "@mui/material";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import EditOutlined from "@mui/icons-material/EditOutlined";
import GavelOutlined from "@mui/icons-material/GavelOutlined";
import Sheet from "../../components/ui/Sheet";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import { escalationTone, evalTone, fmtDate, latestEval, teamStatusOf } from "./teamUtils";

const Field = ({ label, children }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 1.5, py: 0.75, alignItems: "baseline" }}>
    <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{label}</Typography>
    <Box sx={{ fontSize: 13, color: "var(--text)", minWidth: 0, wordBreak: "break-word", unicodeBidi: "plaintext", textAlign: "left" }}>
      {children || children === 0 ? children : <span style={{ color: "var(--text-muted)" }}>—</span>}
    </Box>
  </Box>
);
const Section = ({ title, action, children }) => (
  <Box sx={{ mb: 2.5 }}>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</Typography>
      {action}
    </Box>
    {children}
  </Box>
);

const OPEN = ["Todo", "In Progress"];
const CERTS = { dd: "Defensive driving", es: "Electrical safety", fa: "First aid", ff: "Fire fighting" };

const TeamSheet = ({ team, open, onClose, metrics, periodLabel, tasks, isAdmin, onEdit, onMenu, onEscalation, onHistory }) => {
  const navigate = useNavigate();
  const teamTasks = useMemo(() => {
    if (!team) return [];
    const name = (team.teamName || "").trim().toLowerCase();
    return (tasks || []).filter((t) => (t.teamName || "").trim().toLowerCase() === name || String(t.teamId?._id || t.teamId || "") === String(team._id));
  }, [tasks, team]);
  if (!team) return null;

  const st = teamStatusOf(team);
  const m = metrics || {};
  const ev = latestEval(team);
  const det = teamTasks.filter((t) => t.evaluationScore >= 1 && t.evaluationScore <= 6).length;
  const neu = teamTasks.filter((t) => t.evaluationScore >= 7 && t.evaluationScore <= 8).length;
  const openTasks = teamTasks.filter((t) => OPEN.includes(t.status)).length;
  const sessions = [...(team.sessionHistory || [])].sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
  const certs = Object.entries(CERTS).filter(([k]) => team.certificates?.[k]).map(([, v]) => v);
  const exp = [team.experienceYears && `${team.experienceYears}y`, team.experienceMonths && `${team.experienceMonths}m`].filter(Boolean).join(" ");

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={620}
      title={team.teamName}
      description={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Badge tone={st.tone} dot>{st.label}</Badge>
          <Box component="span" sx={{ fontFamily: "var(--font-mono)" }}>{team.teamCode || "No code"}</Box>
          <span>·</span>
          <span>{team.teamCompany || "No company"}</span>
        </Box>
      }
      actions={
        <IconButton size="small" aria-label="Status actions" onClick={(e) => onMenu(e, team)} sx={{ color: "var(--text-muted)" }}>
          <MoreHoriz fontSize="small" />
        </IconButton>
      }
      footer={
        <>
          <Button variant="outlined" startIcon={<GavelOutlined sx={{ fontSize: 16 }} />} onClick={() => onEscalation(team, 0)}>Record escalation</Button>
          {isAdmin && <Button variant="contained" startIcon={<EditOutlined sx={{ fontSize: 16 }} />} onClick={() => onEdit(team)}>Edit team</Button>}
        </>
      }
    >
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, mb: 2.5 }}>
        <StatCard label="NPS tasks" value={teamTasks.length} hint={`${openTasks} open`} sx={{ p: 1.5 }} />
        <StatCard label="Detractors" value={det} sx={{ p: 1.5 }} />
        <StatCard label="Neutrals" value={neu} sx={{ p: 1.5 }} />
        <StatCard label="Last quiz" value={ev ? `${ev.percentage}%` : "—"} sx={{ p: 1.5 }} />
      </Box>

      <Section title={`Accountability · ${periodLabel}`}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", p: 1.25, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)", mb: 1 }}>
          <Badge tone={escalationTone(m.consequenceLevel ?? 0)}>Level {m.consequenceLevel ?? 0}</Badge>
          <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{m.requiredConsequence || "Compliant"}</Typography>
        </Box>
        <Field label="Accountable issues">{`${m.accDet ?? 0} detractor(s) · ${m.accNeu ?? 0} neutral(s) · ${m.points ?? 0} point(s)`}</Field>
        <Field label="Latest action">{team.escalationAction ? `${team.escalationAction} · ${team.escalationStatus || "Pending"} · ${fmtDate(team.escalationDate)}` : null}</Field>
        <Field label="Warning history">
          <Button size="small" variant="text" onClick={() => onEscalation(team, 1)} sx={{ p: 0, minHeight: 0, minWidth: 0 }}>
            {(team.escalationHistory || []).length} record(s)
          </Button>
        </Field>
        <Box sx={{ mt: 1 }}>
          <Button variant="outlined" onClick={() => navigate(`/tasks-list?view=table&team=${encodeURIComponent(team.teamName)}`)}>Open team tasks</Button>
        </Box>
      </Section>

      <Section title="Assessments" action={<Button size="small" variant="text" onClick={() => onHistory(team._id)}>All results</Button>}>
        {!(team.evaluationHistory || []).length && <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>No quiz results yet.</Typography>}
        {(team.evaluationHistory || []).slice(0, 4).map((e, i) => (
          <Box key={e._id || i} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.6 }}>
            <Badge tone={evalTone(e.percentage)} sx={{ minWidth: 48, justifyContent: "center" }}>{e.percentage}%</Badge>
            <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{fmtDate(e.submittedAt)}</Typography>
            {e.quizCode && <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{e.quizCode}</Typography>}
          </Box>
        ))}
        <Field label="Quiz code">{team.quizCode ? <span style={{ fontFamily: "var(--font-mono)" }}>{team.quizCode}</span> : null}</Field>
        <Field label="Quiz access">{team.canTakeQuiz ? "Allowed" : "Blocked"}</Field>
      </Section>

      <Section title={`Training sessions${sessions.length ? ` · ${sessions.length}` : ""}`}>
        {!sessions.length && <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>No sessions recorded.</Typography>}
        {sessions.slice(0, 6).map((s) => (
          <Box key={s._id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.6, minWidth: 0 }}>
            <Badge tone={s.status === "Completed" ? "success" : s.status === "Missed" ? "danger" : "neutral"} sx={{ flexShrink: 0 }}>{s.status}</Badge>
            <Typography noWrap sx={{ fontSize: 12.5, flex: 1, minWidth: 0 }}>{s.sessionTitle || s.sessionType || "Session"}</Typography>
            <Typography sx={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{fmtDate(s.sessionDate)}</Typography>
          </Box>
        ))}
        {sessions.length > 6 && <Typography sx={{ fontSize: 12, color: "var(--text-muted)", pt: 0.5 }}>and {sessions.length - 6} earlier session(s)</Typography>}
      </Section>

      <Section title="Profile">
        <Field label="Full name">{[team.firstName, team.secondName, team.thirdName, team.surname].filter(Boolean).join(" ")}</Field>
        <Field label="Contact">{team.contactNumber}</Field>
        <Field label="Employment">{team.employmentType}</Field>
        <Field label="Role">{team.role}</Field>
        <Field label="Experience">{exp || (team.yearsOfExperience ? `${team.yearsOfExperience} years` : null)}</Field>
        <Field label="Installation start">{team.installationStartDate ? fmtDate(team.installationStartDate) : team.isNewToInstallation ? "New to installation" : null}</Field>
        <Field label="Activation start">{team.activationStartDate ? fmtDate(team.activationStartDate) : team.isNewToActivation ? "New to activation" : null}</Field>
        <Field label="Certificates">{certs.length ? <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>{certs.map((c) => <Badge key={c} outline>{c}</Badge>)}</Box> : null}</Field>
      </Section>

      <Section title="Equipment">
        <Field label="FSM serial">{team.fsmSerialNumber}</Field>
        <Field label="Laptop serial">{team.laptopSerialNumber}</Field>
      </Section>

      {(team.isSuspended || team.isOnLeave || team.isTerminated || team.isResigned) && (
        <Section title="Status details">
          {team.isSuspended && <Field label="Suspended">{`${fmtDate(team.suspensionStartDate)} → ${fmtDate(team.suspensionEndDate)} · ${team.suspensionReason || ""}`}</Field>}
          {team.isOnLeave && <Field label="On leave">{`${fmtDate(team.leaveStartDate)} → ${fmtDate(team.leaveEndDate)} · ${team.leaveReason || ""}`}</Field>}
          {team.isTerminated && <Field label="Termination reason">{team.terminationReason}</Field>}
          {team.isResigned && <Field label="Resignation reason">{team.resignationReason}</Field>}
        </Section>
      )}
    </Sheet>
  );
};

export default TeamSheet;
