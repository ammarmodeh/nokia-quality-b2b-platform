import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Add from "@mui/icons-material/Add";
import ContentCopy from "@mui/icons-material/ContentCopy";
import PersonOutline from "@mui/icons-material/PersonOutline";
import PollOutlined from "@mui/icons-material/PollOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";
import RouterOutlined from "@mui/icons-material/RouterOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import PhoneCallbackOutlined from "@mui/icons-material/PhoneCallbackOutlined";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import AssignmentTurnedInOutlined from "@mui/icons-material/AssignmentTurnedInOutlined";
import { FaWhatsapp } from "react-icons/fa6";
import { toast } from "sonner";
import api from "../api/api";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import SegmentedControl from "../components/ui/SegmentedControl";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import PageLoader from "../components/ui/PageLoader";
import EmptyState from "../components/ui/EmptyState";
import EditTaskDialog from "../components/task/EditTaskDialog";
import RecordTicketDialog from "../components/task/RecordTicketDialog";
import SlaBadgeButton from "../components/sla/SlaBadgeButton";

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? "—" : format(parsed, "MMM dd, yyyy");
  } catch {
    return "—";
  }
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  try {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? "—" : format(parsed, "MMM dd, yyyy HH:mm");
  } catch {
    return "—";
  }
};

const npsOf = (score) => {
  const n = Number(score);
  if (!Number.isFinite(n) || score === null || score === undefined || score === "") return null;
  return n >= 9
    ? { label: "Promoter", tone: "success" }
    : n >= 7
    ? { label: "Neutral", tone: "warning" }
    : { label: "Detractor", tone: "danger" };
};

const arr = (v) => (Array.isArray(v) ? v.filter(Boolean) : v ? [v] : []);

const Field = ({ label, children, wide = false }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", sm: wide ? "1fr" : "150px minmax(0, 1fr)" },
      gap: { xs: 0.25, sm: wide ? 0.5 : 1.5 },
      py: 1,
      borderBottom: "1px solid var(--border)",
      "&:last-of-type": { borderBottom: 0 },
    }}
  >
    <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{label}</Typography>
    <Box sx={{ fontSize: 13, color: "var(--text)", minWidth: 0, wordBreak: "break-word" }}>
      {children === undefined || children === null || children === "" ? (
        <Box component="span" sx={{ color: "var(--text-muted)" }}>—</Box>
      ) : (
        children
      )}
    </Box>
  </Box>
);

const TaskViewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const loggedInUser = useSelector((state) => state?.auth?.user);
  const from = location.state?.from || "/tasks-list";

  const [task, setTask] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTaskData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/tasks/view-task/${id}`);
      setTask(data.task);
      setTickets(data.tickets || []);
    } catch (error) {
      console.error("Error fetching task details:", error);
      toast.error("Failed to load task details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskData();
  }, [id]);

  const handleTicketAdded = (newTicket) => {
    if (newTicket && newTicket._id) {
      const exists = tickets.find((t) => t._id === newTicket._id);
      if (exists) {
        setTickets((prev) => prev.map((t) => (t._id === newTicket._id ? newTicket : t)));
      } else {
        setTickets((prev) => [newTicket, ...prev]);
      }
      setTask((prev) => ({ ...prev, status: newTicket.status || prev.status }));
    } else {
      fetchTaskData();
    }
  };

  const handleCopyDetails = async () => {
    if (!task) return;
    const lines = [
      `Request #${task.requestNumber || "—"} · SLID ${task.slid || "—"}`,
      `Customer: ${task.customerName || "—"} (${task.contactNumber || "—"})`,
      `Location: ${[task.governorate, task.district].filter(Boolean).join(", ") || "—"}`,
      `Score: ${task.evaluationScore ?? "—"} · Status: ${task.status || "—"} · Priority: ${task.priority || "—"}`,
      `Operation: ${task.operation || "—"} · Team: ${task.teamName || "—"}`,
      task.customerFeedback ? `Feedback: ${task.customerFeedback}` : null,
      task.gaiaContent ? `GAIA Content: ${task.gaiaContent}` : null,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Task details copied to clipboard");
    } catch {
      toast.error("Could not copy details to clipboard");
    }
  };

  const phone = task?.teamId?.contactNumber || task?.contactNumber;
  const openWhatsApp = () => {
    let n = String(phone || "").trim();
    const plus = n.startsWith("+");
    n = n.replace(/[^0-9]/g, "");
    if (n.length < 10 || n.length > 15) {
      toast.error("Contact number is not valid for WhatsApp");
      return;
    }
    const msg = `Request #${task.requestNumber} · SLID ${task.slid || ""} · Customer: ${task.customerName || ""}`;
    window.open(`https://wa.me/${plus ? "+" : ""}${n}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  };

  const confirmTaskDelete = async () => {
    if (!task?._id) return;
    try {
      setDeleting(true);
      await api.delete(`/tasks/soft-delete-task/${task._id}`);
      toast.success("Task moved to trash successfully");
      navigate(from);
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error(error?.response?.data?.message || "Failed to delete task");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
        <PageLoader variant="cards" />
      </Box>
    );
  }

  if (!task) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
        <EmptyState
          title="Task not found"
          description="The requested task could not be located or may have been deleted."
          action={
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(from)}>
              Back to tasks
            </Button>
          }
        />
      </Box>
    );
  }

  const nps = npsOf(task.evaluationScore);
  const reasons = arr(task.reason);
  const subReasons = arr(task.subReason);
  const rootCauses = arr(task.rootCause);
  const responsibles = arr(task.responsible);
  const itnRelateds = arr(task.itnRelated);
  const subscriptions = arr(task.relatedToSubscription);
  const accountabilities = arr(task.teamAccountability);
  const rcaCount = Math.max(
    reasons.length,
    subReasons.length,
    rootCauses.length,
    responsibles.length,
    1
  );

  const canDelete =
    loggedInUser?.role === "admin" ||
    loggedInUser?.role === "superadmin" ||
    task.createdBy?._id === loggedInUser?._id;

  const tabOptions = [
    { value: "overview", label: "Overview", icon: <PersonOutline sx={{ fontSize: 16 }} /> },
    { value: "rca", label: "Root Cause", icon: <AccountTreeOutlined sx={{ fontSize: 16 }} /> },
    { value: "technical", label: "Technical & GAIA", icon: <RouterOutlined sx={{ fontSize: 16 }} /> },
    { value: "closure", label: "Closure & 2nd Call", icon: <PhoneCallbackOutlined sx={{ fontSize: 16 }} /> },
    { value: "history", label: `GAIA History (${tickets.length})`, icon: <HistoryOutlined sx={{ fontSize: 16 }} /> },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      {/* Back button */}
      <Box sx={{ mb: 1.5 }}>
        <Button
          variant="text"
          size="small"
          startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
          onClick={() => navigate(from)}
          sx={{ color: "var(--text-secondary)", px: 0.5 }}
        >
          Back to tasks
        </Button>
      </Box>

      {/* Modern PageHeader */}
      <PageHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
            <span>Request #{task.requestNumber || "—"}</span>
            {task.slid && (
              <Badge outline sx={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {task.slid}
              </Badge>
            )}
            {nps && (
              <Badge tone={nps.tone} dot>
                {nps.label} · {task.evaluationScore}
              </Badge>
            )}
            <Badge tone={task.status === "Closed" ? "success" : "accent"} dot>
              {task.status || "Open"}
            </Badge>
            {task.priority && task.priority !== "Not specified" && (
              <Badge
                tone={
                  task.priority.toLowerCase() === "high" || task.priority.toLowerCase() === "critical"
                    ? "danger"
                    : "warning"
                }
              >
                {task.priority}
              </Badge>
            )}
          </Box>
        }
        description={
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <span>{task.customerName || "Customer not named"}</span>
            <span>·</span>
            <span>{task.customerType || "Customer"}</span>
            {(task.governorate || task.district) && (
              <>
                <span>·</span>
                <span>{[task.governorate, task.district].filter(Boolean).join(", ")}</span>
              </>
            )}
            {task.contractDate && (
              <>
                <span>·</span>
                <span>Req. date: {fmtDate(task.contractDate)}</span>
              </>
            )}
          </Box>
        }
        actions={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <SlaBadgeButton
              target={{ kind: "task", id: task._id }}
              title={`Request #${task.requestNumber || "—"} · ${task.customerName || "Task"}`}
              slid={task.slid}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={() => setTicketDialogOpen(true)}
            >
              Record ticket
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<EditOutlined />}
              onClick={() => setEditDialogOpen(true)}
            >
              Edit task
            </Button>
            {phone && (
              <Tooltip title="Contact on WhatsApp">
                <IconButton
                  size="small"
                  onClick={openWhatsApp}
                  sx={{
                    border: "1px solid var(--border)",
                    color: "var(--success)",
                    backgroundColor: "var(--surface)",
                  }}
                >
                  <FaWhatsapp size={16} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Copy all details">
              <IconButton
                size="small"
                onClick={handleCopyDetails}
                sx={{
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  backgroundColor: "var(--surface)",
                }}
              >
                <ContentCopy sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            {canDelete && (
              <Tooltip title="Delete task">
                <IconButton
                  size="small"
                  onClick={() => setConfirmDelete(true)}
                  sx={{
                    border: "1px solid var(--border)",
                    color: "var(--danger)",
                    backgroundColor: "var(--surface)",
                  }}
                >
                  <DeleteOutline sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        }
      />

      {/* KPI StatCards Row */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, minmax(0, 1fr))" },
          mb: 3,
        }}
      >
        <StatCard
          label="Satisfaction Score"
          value={task.evaluationScore !== undefined && task.evaluationScore !== null ? task.evaluationScore : "—"}
          hint={nps ? nps.label : "Unrated"}
          icon={<PollOutlined sx={{ fontSize: 16 }} />}
        />
        <StatCard
          label="Task Status"
          value={task.status || "Open"}
          hint={task.validationStatus ? `Validation: ${task.validationStatus}` : undefined}
          icon={<AssignmentTurnedInOutlined sx={{ fontSize: 16 }} />}
        />
        <StatCard
          label="Primary RCA"
          value={reasons[0] || "None recorded"}
          hint={responsibles[0] ? `Owner: ${responsibles[0]}` : undefined}
          icon={<AccountTreeOutlined sx={{ fontSize: 16 }} />}
        />
        <StatCard
          label="Field Team"
          value={task.teamName || "Unassigned"}
          hint={task.teamCompany || undefined}
          icon={<GroupsOutlined sx={{ fontSize: 16 }} />}
        />
      </Box>

      {/* Navigation Switcher */}
      <Box sx={{ mb: 2.5 }}>
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={tabOptions}
          ariaLabel="Task views"
        />
      </Box>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* 3 Overview Cards */}
          <Box
            sx={{
              display: "grid",
              gap: 2.5,
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
            }}
          >
            <SectionCard title="Customer Information" bodySx={{ py: 1 }}>
              <Field label="Full name">{task.customerName}</Field>
              <Field label="Contact #">{task.contactNumber}</Field>
              <Field label="Customer type">{task.customerType}</Field>
              <Field label="Location">
                {[task.governorate, task.district].filter(Boolean).join(", ")}
              </Field>
              <Field label="Tariff plan">{task.tarrifName}</Field>
              <Field label="Speed">{task.speed ? `${task.speed} Mbps` : ""}</Field>
            </SectionCard>

            <SectionCard title="Operations & Team" bodySx={{ py: 1 }}>
              <Field label="Operation">{task.operation}</Field>
              <Field label="Category">{task.category}</Field>
              <Field label="Priority">{task.priority}</Field>
              <Field label="Field team">{task.teamName}</Field>
              <Field label="Team company">{task.teamCompany}</Field>
              <Field label="Validation">
                <Badge tone={task.validationStatus === "Validated" ? "success" : "neutral"} dot>
                  {task.validationStatus || "Not validated"}
                </Badge>
              </Field>
              <Field label="Svc Recipient">{task.serviceRecipientInitial}</Field>
            </SectionCard>

            <SectionCard title="Lifecycle Dates" bodySx={{ py: 1 }}>
              <Field label="Request date">{fmtDate(task.contractDate)}</Field>
              <Field label="FE / App date">{fmtDate(task.feDate || task.appDate)}</Field>
              <Field label="UN date">{fmtDate(task.unDate)}</Field>
              <Field label="In date">{fmtDate(task.inDate)}</Field>
              <Field label="Close date">{fmtDate(task.closeDate)}</Field>
              <Field label="PIS date">{fmtDate(task.pisDate)}</Field>
              <Field label="Interview date">{fmtDate(task.interviewDate)}</Field>
            </SectionCard>
          </Box>

          {/* Feedback & Scoring Factors */}
          <SectionCard title="Customer Feedback" bodySx={{ py: 2 }}>
            <Typography
              dir="auto"
              sx={{
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                p: 2,
                borderRadius: "8px",
                backgroundColor: "var(--surface-subtle)",
                border: "1px solid var(--border)",
                color: task.customerFeedback ? "var(--text)" : "var(--text-muted)",
              }}
            >
              {task.customerFeedback || "No customer feedback recorded."}
            </Typography>

            {arr(task.scoringKeys).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", mb: 1 }}>
                  Scoring Factors
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {arr(task.scoringKeys).map((k, i) => (
                    <Badge key={i} outline>
                      {k}
                    </Badge>
                  ))}
                </Box>
              </Box>
            )}
          </SectionCard>

          {/* Custom Questions if present */}
          {Array.isArray(task.customFields) && task.customFields.length > 0 && (
            <SectionCard title="Custom Questions" bodySx={{ py: 1 }}>
              {task.customFields.map((cf, idx) => (
                <Field key={idx} label={cf.question || `Question ${idx + 1}`}>
                  <Badge tone={cf.answer === "Yes" ? "success" : cf.answer === "No" ? "danger" : "neutral"}>
                    {cf.answer || "Not specified"}
                  </Badge>
                </Field>
              ))}
            </SectionCard>
          )}
        </Box>
      )}

      {/* RCA Tab */}
      {activeTab === "rca" && (
        <SectionCard
          title="Root Cause Analysis"
          description="Detailed multi-factor breakdown and accountability"
          padding={0}
          bodySx={{ p: 0 }}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "var(--surface-subtle)" }}>
                  <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Main Reason</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Sub Reason</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Root Cause</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Owner / Responsible</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Team Accountability</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>ITN Related</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Subscription</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: rcaCount }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ color: "var(--text-secondary)" }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{reasons[i] || "—"}</TableCell>
                    <TableCell>{subReasons[i] || "—"}</TableCell>
                    <TableCell>{rootCauses[i] || "—"}</TableCell>
                    <TableCell>{responsibles[i] || "—"}</TableCell>
                    <TableCell>
                      <Badge tone={accountabilities[i] === "Yes" ? "danger" : "neutral"}>
                        {accountabilities[i] || "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge tone={itnRelateds[i] === "Yes" ? "warning" : "neutral"}>
                        {itnRelateds[i] || "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge tone={subscriptions[i] === "Yes" ? "info" : "neutral"}>
                        {subscriptions[i] || "No"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      )}

      {/* Technical & GAIA Tab */}
      {activeTab === "technical" && (
        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <SectionCard title="Equipment & Hardware" bodySx={{ py: 1 }}>
            <Field label="ONT Type">{task.ontType}</Field>
            <Field label="Free Extender">{task.freeExtender || "No"}</Field>
            {task.freeExtender === "Yes" && (
              <>
                <Field label="Extender Type">{task.extenderType}</Field>
                <Field label="Extender Count">{task.extenderNumber}</Field>
              </>
            )}
            <Field label="Tariff Plan">{task.tarrifName}</Field>
            <Field label="Speed">{task.speed ? `${task.speed} Mbps` : ""}</Field>
          </SectionCard>

          <SectionCard title="GAIA Check & System" bodySx={{ py: 1 }}>
            <Field label="GAIA Check Status">
              <Badge tone={task.gaiaCheck === "Yes" ? "success" : "neutral"}>
                {task.gaiaCheck || "Not specified"}
              </Badge>
            </Field>
            <Field label="GAIA Content" wide>
              <Typography
                dir="auto"
                sx={{
                  mt: 0.5,
                  p: 1.5,
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  borderRadius: "8px",
                  backgroundColor: "var(--surface-subtle)",
                  border: "1px solid var(--border)",
                  color: task.gaiaContent ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {task.gaiaContent || "No GAIA content logged."}
              </Typography>
            </Field>
          </SectionCard>
        </Box>
      )}

      {/* Closure & 2nd Call Tab */}
      {activeTab === "closure" && (
        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <SectionCard title="Closure Call" bodySx={{ py: 1 }}>
            <Field label="Call status">{task.callStatus || "Not Done"}</Field>
            <Field label="Requested by team">{task.closureRequestedByFieldTeam || "Not specified"}</Field>
            <Field label="Technical evaluation">{task.technicalTeamEvaluation || "Not specified"}</Field>
            <Field label="Service evaluation">{task.serviceEvaluation || "Not specified"}</Field>
            <Field label="Dissatisfaction category">{task.categoryOfDissatisfaction || "Not specified"}</Field>
          </SectionCard>

          <SectionCard title="Second Call" bodySx={{ py: 1 }}>
            <Field label="Second call initiated">
              <Badge tone={task.secondCallInitiated === "Yes" ? "accent" : "neutral"}>
                {task.secondCallInitiated || "Not specified"}
              </Badge>
            </Field>
            {task.secondCallInitiated === "Yes" && (
              <>
                <Field label="Status">{task.secondCallStatus}</Field>
                <Field label="Category">{task.secondCallCategory}</Field>
                <Field label="Action taken">{task.secondCallAction}</Field>
                <Field label="Dispatched team">{task.secondCallTeam}</Field>
                <Field label="Dispatch date">{fmtDate(task.secondCallDispatchDate)}</Field>
                <Field label="Resolution date">{fmtDate(task.secondCallResolutionDate)}</Field>
                <Field label="Resolution method">{task.secondCallResolutionMethod}</Field>
                <Field label="Resolved by">{task.secondCallResolvedBy}</Field>
                <Field label="Resolved root cause">{task.secondCallRootCause}</Field>
                <Field label="Resolved before survey">{task.secondCallResolvedBeforeSurvey}</Field>
              </>
            )}
          </SectionCard>
        </Box>
      )}

      {/* GAIA History Tab */}
      {activeTab === "history" && (
        <SectionCard
          title="GAIA Tracking History"
          description="Log of GAIA events, calls, visits, and status updates"
          actions={
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={() => setTicketDialogOpen(true)}
            >
              Record new event
            </Button>
          }
          padding={0}
          bodySx={{ p: 0 }}
        >
          {tickets.length === 0 ? (
            <Box sx={{ py: 4 }}>
              <EmptyState
                title="No tracking events"
                description="No GAIA tickets or tracking events recorded yet for this task."
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setTicketDialogOpen(true)}
                  >
                    Record first ticket
                  </Button>
                }
              />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "var(--surface-subtle)" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Category / Flow</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Agent / Logged By</TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 260 }}>Notes & Action</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Follow-up</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                          {t.eventDate ? fmtDate(t.eventDate) : fmtDate(t.timestamp)}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                          {fmtDateTime(t.timestamp || t.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                          {t.mainCategory || t.transactionType || "GAIA Event"}
                        </Typography>
                        {t.transactionState && (
                          <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                            {t.transactionState}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          tone={
                            t.status === "Closed" || t.status === "Resolved"
                              ? "success"
                              : t.status === "In Progress"
                              ? "accent"
                              : "warning"
                          }
                          dot
                        >
                          {t.status || "Open"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13 }}>
                          {t.recordedBy?.name || t.agentName || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell dir="auto">
                        <Typography sx={{ fontSize: 13, whiteSpace: "pre-wrap", color: "var(--text)" }}>
                          {t.note || "No note recorded."}
                        </Typography>
                        {(t.rootCause || t.actionTaken) && (
                          <Box sx={{ mt: 0.5, display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {t.rootCause && (
                              <Typography sx={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                                <strong>RCA:</strong> {t.rootCause}
                              </Typography>
                            )}
                            {t.actionTaken && (
                              <Typography sx={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                                <strong>Action:</strong> {t.actionTaken}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.followUpRequired ? (
                          <Badge tone="warning">
                            {t.followUpDate ? `Visit: ${fmtDate(t.followUpDate)}` : "Required"}
                          </Badge>
                        ) : (
                          <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </SectionCard>
      )}

      {/* Dialogs */}
      <RecordTicketDialog
        open={ticketDialogOpen}
        onClose={() => setTicketDialogOpen(false)}
        task={task}
        onTicketAdded={handleTicketAdded}
        onTicketUpdated={handleTicketAdded}
        onTicketDeleted={handleTicketAdded}
      />

      <EditTaskDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        task={task}
        handleTaskUpdate={(updated) => {
          setTask(updated);
          fetchTaskData();
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task"
        description={`Are you sure you want to delete task ${task.slid || task.requestNumber}? It will be moved to the trash.`}
        confirmLabel="Move to trash"
        danger
        loading={deleting}
        onConfirm={confirmTaskDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </Box>
  );
};

export default TaskViewPage;