import { useEffect, useState } from "react";
import { Box, Button, Divider, IconButton, ListItemIcon, Menu, MenuItem, Select, Skeleton, Tooltip, Typography } from "@mui/material";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import ContentCopy from "@mui/icons-material/ContentCopy";
import ConfirmationNumberOutlined from "@mui/icons-material/ConfirmationNumberOutlined";
import { toast } from "sonner";
import api from "../../api/api";
import Sheet from "../../components/ui/Sheet";
import Badge from "../../components/ui/Badge";
import { fmt, reportedDate, snagTypeOf, sourceOf, statusOf } from "./snagUtils";

const Field = ({ label, children }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1.5, py: 0.75, alignItems: "baseline" }}>
    <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{label}</Typography>
    <Box sx={{ fontSize: 13, color: "var(--text)", minWidth: 0, wordBreak: "break-word", textAlign: "left", unicodeBidi: "plaintext" }}>
      {children || children === 0 ? children : <span style={{ color: "var(--text-muted)" }}>—</span>}
    </Box>
  </Box>
);
const Section = ({ title, children }) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.5 }}>{title}</Typography>
    {children}
  </Box>
);
const Note = ({ text }) =>
  text ? (
    <Box dir="auto" sx={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55, p: 1.25, borderRadius: "8px", backgroundColor: "var(--surface-subtle)", border: "1px solid var(--border)" }}>{text}</Box>
  ) : null;

const ActivityLog = ({ issueId }) => {
  const [logs, setLogs] = useState(null);
  useEffect(() => {
    let cancel = false;
    setLogs(null);
    api
      .get("/customer-issues/logs", { params: { slid: issueId, limit: 30 } })
      .then((r) => !cancel && setLogs(r.data?.data || []))
      .catch(() => !cancel && setLogs([]));
    return () => {
      cancel = true;
    };
  }, [issueId]);
  if (!logs) return <Skeleton height={60} />;
  if (!logs.length) return <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>No recorded changes.</Typography>;
  return (
    <Box sx={{ position: "relative", pl: 2.5 }}>
      <Box sx={{ position: "absolute", left: 6, top: 6, bottom: 6, width: "1px", backgroundColor: "var(--border)" }} />
      {logs.map((l) => (
        <Box key={l._id} sx={{ position: "relative", pb: 1.5 }}>
          <Box sx={{ position: "absolute", left: -19, top: 5, width: 9, height: 9, borderRadius: "50%", border: "2px solid var(--surface)", backgroundColor: l.action === "DELETE" ? "var(--danger)" : ["CREATE", "ADD"].includes(l.action) ? "var(--success)" : "var(--accent)" }} />
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{({ CREATE: "Created", ADD: "Created", UPDATE: "Updated", DELETE: "Deleted" })[l.action] || l.action}</Typography>
            <Typography sx={{ fontSize: 12, color: "var(--text-secondary)" }}>by {l.performedBy || "Unknown"}</Typography>
            <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{l.timestamp ? new Date(l.timestamp).toLocaleString() : ""}</Typography>
          </Box>
          {l.changes && Object.keys(l.changes).length > 0 && (
            <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", mt: 0.25 }}>
              Changed: {Object.keys(l.changes).filter((k) => !["updatedAt", "__v"].includes(k)).slice(0, 6).join(", ")}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};

const SnagSheet = ({ snag, open, onClose, isAdmin, onPatch, onEdit, onRecordTicket, onDelete }) => {
  const [menu, setMenu] = useState(null);
  if (!snag) return null;
  const st = statusOf(snag);

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        width={600}
        title={snag.customerName || snag.slid}
        description={
          <Box component="span" sx={{ display: "inline-flex", gap: 1, flexWrap: "wrap" }}>
            <Box component="span" sx={{ fontFamily: "var(--font-mono)" }}>{snag.slid}</Box>
            {snag.ticketId && <><span>·</span><span>{snag.ticketId}</span></>}
          </Box>
        }
        actions={
          <>
            <IconButton size="small" aria-label="More actions" onClick={(e) => setMenu(e.currentTarget)} sx={{ color: "var(--text-muted)" }}>
              <MoreHoriz fontSize="small" />
            </IconButton>
            <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
              <MenuItem onClick={() => { setMenu(null); navigator.clipboard?.writeText(snag.slid || ""); toast.success("SLID copied"); }}>
                <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>Copy SLID
              </MenuItem>
              <MenuItem onClick={() => { setMenu(null); onRecordTicket(snag); }}>
                <ListItemIcon><ConfirmationNumberOutlined fontSize="small" /></ListItemIcon>Record GAIA ticket
              </MenuItem>
              {isAdmin && <Divider />}
              {isAdmin && (
                <MenuItem onClick={() => { setMenu(null); onDelete(snag); }} sx={{ color: "var(--danger)" }}>
                  <ListItemIcon><DeleteOutline fontSize="small" sx={{ color: "var(--danger)" }} /></ListItemIcon>Delete permanently…
                </MenuItem>
              )}
            </Menu>
          </>
        }
        footer={
          <>
            <Button variant="outlined" startIcon={<ConfirmationNumberOutlined sx={{ fontSize: 16 }} />} onClick={() => onRecordTicket(snag)}>Record ticket</Button>
            {isAdmin && <Button variant="contained" startIcon={<EditOutlined sx={{ fontSize: 16 }} />} onClick={() => onEdit(snag)}>Edit snag</Button>}
          </>
        }
      >
        <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 1.25, columnGap: 1.5, alignItems: "center", mb: 2.5 }}>
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Status</Typography>
          <Box><Badge tone={st.tone} dot>{st.label}</Badge></Box>
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Snag type</Typography>
          <Tooltip title={isAdmin ? "" : "Only admins can change this"}>
            <span>
              <Select
                value={snagTypeOf(snag)}
                disabled={!isAdmin}
                onChange={(e) => onPatch(snag._id, { snagType: e.target.value })}
                sx={{ minWidth: 170, "& .MuiSelect-select": { py: "5px", fontSize: 13 } }}
                inputProps={{ "aria-label": "Snag type" }}
              >
                <MenuItem value="Installation">OJO Snags · Installation</MenuItem>
                <MenuItem value="Maintenance">OJO Snags · Maintenance</MenuItem>
              </Select>
            </span>
          </Tooltip>
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Source</Typography>
          <Box><Badge outline>{snag.fromMain ? `${snag.fromMain} · ` : ""}{sourceOf(snag)}</Badge></Box>
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Section title={`Issues${snag.issues?.length ? ` · ${snag.issues.length}` : ""}`}>
          {(snag.issues || []).length ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 1 }}>
              {snag.issues.map((i, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "baseline", flexWrap: "wrap" }}>
                  <Badge outline>{i.category || "Uncategorised"}</Badge>
                  {i.subCategory && <Typography dir="auto" sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{i.subCategory}</Typography>}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>No issues listed.</Typography>
          )}
          {snag.reporterNote && <Box sx={{ mt: 1 }}><Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mb: 0.75 }}>Reporter note</Typography><Note text={snag.reporterNote} /></Box>}
        </Section>

        <Section title="Customer">
          <Field label="Name">{snag.customerName}</Field>
          <Field label="Contact">{snag.customerContact}</Field>
          <Field label="Area">{snag.area}</Field>
        </Section>

        <Section title="Field team">
          <Field label="Team">{snag.teamName}</Field>
          <Field label="Team code">{snag.teamCode}</Field>
          <Field label="Company">{snag.teamCompany}</Field>
          <Field label="Installing team">{snag.installingTeam}</Field>
          <Field label="PIS date">{snag.pisDate ? fmt(snag.pisDate) : null}</Field>
        </Section>

        <Section title="Reporting">
          <Field label="Reported">{fmt(reportedDate(snag))}</Field>
          <Field label="Reporter">{snag.reporter}</Field>
          <Field label="Contact method">{snag.contactMethod}</Field>
          <Field label="Assigned to">{snag.assignedTo}</Field>
          {snag.assigneeNote && <Box sx={{ mt: 0.5 }}><Note text={snag.assigneeNote} /></Box>}
        </Section>

        <Section title="Resolution">
          <Field label="Dispatched">{snag.dispatched === "yes" ? `Yes${snag.dispatchedAt ? ` · ${fmt(snag.dispatchedAt)}` : ""}` : "No"}</Field>
          <Field label="Resolved">{snag.solved === "yes" ? `Yes${snag.resolveDate ? ` · ${fmt(snag.resolveDate)}` : ""}` : "No"}</Field>
          <Field label="Resolved by">{snag.resolvedBy}</Field>
          <Field label="Supervisor">{snag.closedBy}{snag.closedAt ? ` · ${fmt(snag.closedAt)}` : ""}</Field>
          <Field label="Call">{[snag.callerName, snag.callDate ? fmt(snag.callDate) : null].filter(Boolean).join(" · ") || null}</Field>
          {snag.resolutionDetails && <Box sx={{ mt: 0.5 }}><Note text={snag.resolutionDetails} /></Box>}
          {snag.latestGaia && <Field label="Latest GAIA">{`${snag.latestGaia.mainCategory || ""} ${snag.latestGaia.status ? `· ${snag.latestGaia.status}` : ""}`.trim()}</Field>}
        </Section>

        <Section title="Activity">
          <ActivityLog issueId={snag._id} />
        </Section>
      </Sheet>
    </>
  );
};

export default SnagSheet;
