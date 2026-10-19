import { useState } from "react";
import { Autocomplete, Box, Button, Divider, IconButton, ListItemIcon, Menu, MenuItem, Select, TextField, Tooltip, Typography } from "@mui/material";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import EditOutlined from "@mui/icons-material/EditOutlined";
import ConfirmationNumberOutlined from "@mui/icons-material/ConfirmationNumberOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import ContentCopy from "@mui/icons-material/ContentCopy";
import { toast } from "sonner";
import Sheet from "../../components/ui/Sheet";
import Badge from "../../components/ui/Badge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { UserAvatar } from "../../components/ui/AvatarGroup";
import { taxonomyOfTask } from "../../constants/taxonomy";
import TaxonomyBadge from "../../components/ui/TaxonomyBadge";
import { PRIORITIES, STATUSES, npsType, fmtDate, taskTitle } from "./taskUtils";

const arr = (v) => (Array.isArray(v) ? v.filter(Boolean) : v ? [v] : []);

const Field = ({ label, children }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1.5, py: 0.75, alignItems: "baseline" }}>
    <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{label}</Typography>
    <Box sx={{ fontSize: 13, color: "var(--text)", minWidth: 0, wordBreak: "break-word" }}>{children ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</Box>
  </Box>
);

const Section = ({ title, children }) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.5 }}>{title}</Typography>
    {children}
  </Box>
);

const Chips = ({ values }) => {
  const list = arr(values);
  if (!list.length) return null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {list.map((v) => <Badge key={v} outline>{v}</Badge>)}
    </Box>
  );
};

const TextBlock = ({ text, rtl }) =>
  text ? (
    <Box dir={rtl ? "auto" : undefined} sx={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55, p: 1.25, borderRadius: "8px", backgroundColor: "var(--surface-subtle)", border: "1px solid var(--border)" }}>
      {text}
    </Box>
  ) : null;

const selectSx = { minWidth: 150, "& .MuiSelect-select": { py: "5px", fontSize: 13 } };

const TaskSheet = ({ task, open, onClose, users, onPatch, onEdit, onRecordTicket, onDelete }) => {
  const [menu, setMenu] = useState(null);
  const [confirm, setConfirm] = useState(false);
  if (!task) return null;
  const nps = npsType(task.evaluationScore);
  const tickets = [...(task.tickets || [])].sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
  const assigned = (task.assignedTo || []).map((u) => users.find((x) => x._id === (u?._id || u)) || u).filter((u) => u && typeof u === "object");

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        width={600}
        title={taskTitle(task)}
        description={
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Box component="span" sx={{ fontFamily: "var(--font-mono)" }}>{task.slid}</Box>
            <span>·</span>
            <span>Request {task.requestNumber}</span>
          </Box>
        }
        actions={
          <>
            <Tooltip title="More actions">
              <IconButton size="small" onClick={(e) => setMenu(e.currentTarget)} aria-label="More actions" sx={{ color: "var(--text-muted)" }}>
                <MoreHoriz fontSize="small" />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
              <MenuItem
                onClick={() => {
                  setMenu(null);
                  navigator.clipboard?.writeText(task.slid || "");
                  toast.success("SLID copied");
                }}
              >
                <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>Copy SLID
              </MenuItem>
              <MenuItem onClick={() => { setMenu(null); onRecordTicket(task); }}>
                <ListItemIcon><ConfirmationNumberOutlined fontSize="small" /></ListItemIcon>Record GAIA ticket
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { setMenu(null); setConfirm(true); }} sx={{ color: "var(--danger)" }}>
                <ListItemIcon><DeleteOutline fontSize="small" sx={{ color: "var(--danger)" }} /></ListItemIcon>Delete task
              </MenuItem>
            </Menu>
          </>
        }
        footer={
          <>
            <Button variant="outlined" startIcon={<ConfirmationNumberOutlined sx={{ fontSize: 16 }} />} onClick={() => onRecordTicket(task)}>Record ticket</Button>
            <Button variant="contained" startIcon={<EditOutlined sx={{ fontSize: 16 }} />} onClick={() => onEdit(task)}>Edit all fields</Button>
          </>
        }
      >
        {/* Quick edit */}
        <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 1.25, columnGap: 1.5, alignItems: "center", mb: 2.5 }}>
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Status</Typography>
          <Select value={task.status || "Todo"} onChange={(e) => onPatch(task._id, { status: e.target.value })} sx={selectSx} inputProps={{ "aria-label": "Status" }}>
            {STATUSES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: s.color }} />{s.label}
                </Box>
              </MenuItem>
            ))}
          </Select>

          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Priority</Typography>
          <Select value={task.priority || "Not specified"} onChange={(e) => onPatch(task._id, { priority: e.target.value })} sx={selectSx} inputProps={{ "aria-label": "Priority" }}>
            {PRIORITIES.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "2px", backgroundColor: p.color }} />{p.value}
                </Box>
              </MenuItem>
            ))}
          </Select>

          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", alignSelf: "start", pt: 0.75 }}>Assignees</Typography>
          <Autocomplete
            multiple
            size="small"
            options={users}
            value={assigned}
            isOptionEqualToValue={(o, v) => o._id === v._id}
            getOptionLabel={(o) => o.name || o.email || ""}
            onChange={(_e, value) => onPatch(task._id, { assignedTo: value })}
            renderOption={(props, o) => {
              const { key, ...rest } = props;
              return (
                <li key={key} {...rest}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <UserAvatar user={o} size={22} />
                    <Box>
                      <Typography sx={{ fontSize: 13 }}>{o.name}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{o.email}</Typography>
                    </Box>
                  </Box>
                </li>
              );
            }}
            renderInput={(params) => <TextField {...params} placeholder={assigned.length ? "" : "Assign people"} />}
            slotProps={{ chip: { size: "small" } }}
          />

          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Tracker</Typography>
          <Box><TaxonomyBadge tax={taxonomyOfTask(task)} /></Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Section title="Survey">
          <Field label="Evaluation score">{nps ? <Badge tone={nps.tone}>{nps.label} · {task.evaluationScore}</Badge> : null}</Field>
          <Field label="Interview date">{task.interviewDate ? fmtDate(task.interviewDate) : null}</Field>
          <Field label="Technical team">{task.technicalTeamEvaluation ?? null}</Field>
          <Field label="Service">{task.serviceEvaluation ?? null}</Field>
          <Field label="Dissatisfaction">{task.categoryOfDissatisfaction}</Field>
          <Field label="Validation">{task.validationStatus}</Field>
          {task.customerFeedback && (
            <Box sx={{ mt: 1 }}>
              <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mb: 0.75 }}>Customer feedback</Typography>
              <TextBlock text={task.customerFeedback} rtl />
            </Box>
          )}
        </Section>

        <Section title="Root cause">
          <Field label="Reason"><Chips values={task.reason} /></Field>
          <Field label="Sub-reason"><Chips values={task.subReason} /></Field>
          <Field label="Root cause"><Chips values={task.rootCause} /></Field>
          <Field label="Accountability"><Chips values={task.teamAccountability} /></Field>
          <Field label="Responsible"><Chips values={task.responsible} /></Field>
        </Section>

        <Section title="Customer">
          <Field label="Name">{task.customerName}</Field>
          <Field label="Contact">{task.contactNumber}</Field>
          <Field label="Type">{task.customerType}</Field>
          <Field label="Governorate">{task.governorate}</Field>
          <Field label="District">{task.district}</Field>
        </Section>

        <Section title="Field team">
          <Field label="Team">{task.teamName}</Field>
          <Field label="Company">{task.teamCompany}</Field>
          <Field label="PIS date">{task.pisDate ? fmtDate(task.pisDate) : null}</Field>
        </Section>

        <Section title="Service">
          <Field label="Operation">{task.operation}</Field>
          <Field label="Tariff">{task.tarrifName}</Field>
          <Field label="Speed">{task.speed ? `${task.speed} Mbps` : null}</Field>
          <Field label="ONT">{task.ontType}</Field>
          <Field label="Extender">{task.freeExtender === "Yes" ? `${task.extenderType || "Yes"}${task.extenderNumber ? ` × ${task.extenderNumber}` : ""}` : task.freeExtender}</Field>
        </Section>

        <Section title={`Activity${tickets.length ? ` · ${tickets.length}` : ""}`}>
          {!tickets.length && <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)", py: 0.5 }}>No GAIA tickets recorded yet.</Typography>}
          <Box sx={{ position: "relative", pl: 2.5 }}>
            {tickets.length > 0 && <Box sx={{ position: "absolute", left: 6, top: 6, bottom: 6, width: "1px", backgroundColor: "var(--border)" }} />}
            {tickets.map((tk) => (
              <Box key={tk._id} sx={{ position: "relative", pb: 1.75 }}>
                <Box sx={{ position: "absolute", left: -19, top: 5, width: 9, height: 9, borderRadius: "50%", border: "2px solid var(--surface)", backgroundColor: "var(--accent)" }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{tk.mainCategory}</Typography>
                  {tk.status && <Badge sx={{ height: 20, fontSize: 11 }}>{tk.status}</Badge>}
                  <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{fmtDate(tk.eventDate || tk.timestamp)}</Typography>
                  {tk.ticketId && <Typography sx={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{tk.ticketId}</Typography>}
                </Box>
                {(tk.note || tk.actionTaken) && (
                  <Typography dir="auto" sx={{ fontSize: 12.5, color: "var(--text-secondary)", mt: 0.25, whiteSpace: "pre-wrap" }}>{tk.note || tk.actionTaken}</Typography>
                )}
              </Box>
            ))}
          </Box>
          <Field label="Created">{fmtDate(task.createdAt)}{task.createdBy?.name ? ` by ${task.createdBy.name}` : ""}</Field>
          <Field label="Last updated">{fmtDate(task.updatedAt)}</Field>
        </Section>
      </Sheet>

      <ConfirmDialog
        open={confirm}
        danger
        title="Delete this task?"
        description="It will be moved to Trash. You can undo right after."
        confirmLabel="Delete"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onDelete(task);
        }}
      />
    </>
  );
};

export default TaskSheet;
