import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Paper,
  Stack,
  AvatarGroup,
  Avatar,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Divider,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  HourglassEmpty,
  PlayCircle,
  CheckCircle,
  Cancel,
  Speed,
  LocationOn,
  Business,
  Category as CategoryIcon,
  CalendarToday,
  Info as InfoIcon,
} from "@mui/icons-material";
import { FaRegCopy, FaStar, FaWhatsapp } from "react-icons/fa";
import { useSelector } from "react-redux";
import api from "../api/api";
import { format, differenceInMinutes } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EditTaskDialog from "./task/EditTaskDialog";
import { IoMdMagnet } from "react-icons/io";
import { RiProgress4Fill } from "react-icons/ri";
import DetailedSubtaskDialog from "./task/DetailedSubtaskDialog";
import TaskProgressDialog from "./task/TaskProgressDialog";
import { toast } from "sonner";
import { getCustomWeekNumber } from "../utils/helpers";

const statusConfig = {
  Todo: { icon: <HourglassEmpty fontSize="small" />, color: "#eab308", bg: "rgba(234, 179, 8, 0.1)", border: "rgba(234, 179, 8, 0.3)" },
  "In Progress": { icon: <PlayCircle fontSize="small" />, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.3)" },
  Closed: { icon: <CheckCircle fontSize="small" />, color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", border: "rgba(34, 197, 94, 0.3)" },
  Cancelled: { icon: <Cancel fontSize="small" />, color: "#6b7280", bg: "rgba(107, 116, 128, 0.1)", border: "rgba(107, 116, 128, 0.3)" },
};

const priorityConfig = {
  High: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)" },
  Medium: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)" },
  Normal: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.3)" },
  Low: { color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)" },
};

const validationConfig = {
  Validated: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", border: "rgba(34, 197, 94, 0.3)" },
  "Not validated": { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)" },
};

const TaskCard = ({ task, users, setUpdateStateDuringSave, handleTaskUpdate, handleTaskDelete, handleFavoriteClick, handleTaskArchive, settings = {} }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state?.auth?.user);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [managementNoteOpen, setManagementNoteOpen] = useState(false);
  const [creatorColor, setCreatorColor] = useState([]);

  const assignedUsers = Array.isArray(task?.assignedTo)
    ? users.filter((user) =>
      task.assignedTo.some((assignedUser) => (assignedUser?._id || assignedUser) === user._id)
    )
    : [];

  const creator = users.find((u) => u._id === (task?.createdBy?._id || task?.createdBy)) || {};

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  useEffect(() => {
    if (users.length > 0 && creatorColor.length === 0) {
      setCreatorColor(users.map((user) => ({ id: user._id, color: user.color })));
    }
  }, [users, creatorColor]);

  const handleAction = (action) => {
    handleMenuClose();
    if (action === "edit") setEditDialogOpen(true);
    if (action === "delete") handleTaskDelete(task._id);
    if (action === "favorite") handleFavoriteClick(task);
    if (action === "view") navigate(`/tasks/view-task/${task._id}`, { state: { from: location.pathname } });
    if (action === "archive") handleTaskArchive(task._id);
    if (action === "progress") setProgressDialogOpen(true);
  };

  const generateTaskReport = () => {
    return `*🚨 TASK DISPATCH PROTOCOL - ${task.slid}*\n\n` +
      `*━━━ 🆔 IDENTIFICATION ━━━*\n` +
      `📌 *SLID:* ${task.slid}\n` +
      `🔢 *Request #:* ${task.requestNumber || "N/A"}\n` +
      `🏷️ *Status:* ${task.status} | *Priority:* ${task.priority || "Normal"}\n` +
      `📦 *Category:* ${task.category || "N/A"}\n` +
      `🛡️ *Validation:* ${task.validationStatus || "Pending"}\n\n` +

      `*━━━ 👤 CUSTOMER ━━━*\n` +
      `👤 *Name:* ${task.customerName || "N/A"}\n` +
      `🏷️ *Type:* ${task.customerType || "N/A"}\n` +
      `📱 *Contact:* ${task.contactNumber || "N/A"}\n` +
      `💬 *Feedback:* ${task.customerFeedback || "N/A"}\n` +
      `💰 *Tariff:* ${task.tarrifName || "N/A"}\n\n` +

      `*━━━ 📍 LOCATION ━━━*\n` +
      `🏛️ *Governorate:* ${task.governorate || "N/A"}\n` +
      `🗺️ *District:* ${task.district || "N/A"}\n\n` +

      `*━━━ 🔧 TECHNICAL ━━━*\n` +
      `⚠️ *Reason:* ${task.reason || "N/A"}\n` +
      `🔍 *Sub Reason:* ${task.subReason || "N/A"}\n` +
      `🎯 *Root Cause:* ${task.rootCause || "N/A"}\n` +
      `📡 *ONT Type:* ${task.ontType || "N/A"}\n` +
      `📶 *Extender:* ${task.freeExtender || "No"} (${task.extenderType || "N/A"} - ${task.extenderNumber || 0})\n\n` +

      `*━━━ ⚙️ OPERATIONS ━━━*\n` +
      `🛠️ *Operation:* ${task.operation || "N/A"}\n` +
      `📈 *Satisfaction:* ${task.evaluationScore || 0}/10\n` +
      `⚡ *Speed:* ${task.speed || "N/A"}\n` +
      `📞 *Closure Call:* ${task.closureCallEvaluation || "N/A"}/10\n` +
      `📝 *Closure Feedback:* ${task.closureCallFeedback || "N/A"}\n` +
      `👥 *Svc Recipient:* ${task.serviceRecipientInitial || "N/A"} (QoS: ${task.serviceRecipientQoS || "N/A"})\n\n` +

      `*━━━ 🗓️ DATES ━━━*\n` +
      `📅 *Created:* ${task.createdAt ? format(new Date(task.createdAt), "MMM dd, yyyy HH:mm") : "N/A"}\n` +
      `📆 *Interview:* ${task.interviewDate ? format(new Date(task.interviewDate), "MMM dd, yyyy") : "N/A"}\n` +
      `🚀 *PIS Date:* ${task.pisDate ? format(new Date(task.pisDate), "MMM dd, yyyy") : "N/A"}\n\n` +

      `*━━━ 👥 TEAM ━━━*\n` +
      `🚛 *Field Team:* ${task.teamName || "N/A"}\n` +
      `🏢 *Company:* ${task.teamCompany || "N/A"}\n` +
      `👨‍💼 *Assigned:* ${assignedUsers.map(u => u.name).join(", ") || "N/A"}\n` +
      `👤 *Responsible:* ${task.responsible || "N/A"}\n\n` +

      `_🛑 ACTION REQUIRED: Immediate review and update requested._`;
  };

  const copyToClipboard = () => {
    const formattedMessage = generateTaskReport();
    navigator.clipboard.writeText(formattedMessage).then(() => {
      toast.success("Detailed protocol copied to clipboard!");
    });
  };

  const handleWhatsAppDispatch = () => {
    const phoneNumber = task.teamId?.contactNumber;
    const cleanNumber = phoneNumber?.replace(/[^0-9]/g, "");

    const encodedMessage = encodeURIComponent(generateTaskReport());

    if (cleanNumber) {
      window.open(`https://wa.me/${cleanNumber}?text=${encodedMessage}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
      toast.warning("Team contact missing. Opening general share.");
    }
  };

  const scoreColor = task.evaluationScore >= 9 ? "#22c55e" : task.evaluationScore >= 7 ? "#3b82f6" : "#ef4444";

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          bgcolor: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: 3,
          p: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: `0 12px 24px -10px ${scoreColor}33`,
            borderColor: scoreColor,
          },
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header Bar - Solid Color Strip based on Priority/Score */}
        <Box sx={{ height: 6, width: '100%', bgcolor: scoreColor }} />

        {/* Content Container */}
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>

          {/* Top Row: SLID & Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="overline" sx={{ color: '#64748b', fontWeight: 800, letterSpacing: 1.5, lineHeight: 1 }}>
                SLID
              </Typography>
              <Typography variant="h5" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#fff', letterSpacing: -0.5, mt: 0.5 }}>
                {task.slid}
              </Typography>
            </Box>
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              sx={{
                color: '#64748b',
                bgcolor: 'rgba(255,255,255,0.05)',
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                borderRadius: 2
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Customer Info Card */}
          <Box sx={{
            bgcolor: 'rgba(255,255,255,0.03)',
            borderRadius: 2,
            p: 1.5,
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontSize: '0.8rem' }}>
                <CategoryIcon sx={{ fontSize: 16 }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#e2e8f0', fontWeight: 700, lineHeight: 1.2 }}>
                  {task.customerName || "Unknown Customer"}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {task.governorate} • {task.district}
                </Typography>
              </Box>
            </Stack>

            {task.dashboardShortNote && (
              <Box sx={{
                mt: 1.5,
                p: 1.2,
                bgcolor: 'rgba(59, 130, 246, 0.08)',
                borderRadius: 2,
                border: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <InfoIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                <Typography variant="caption" sx={{ color: '#93c5fd', fontWeight: 600, fontStyle: 'italic', lineHeight: 1.2 }}>
                  {task.dashboardShortNote}
                </Typography>
              </Box>
            )}

            {/* Tags Row */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Chip
                label={task.status}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: statusConfig[task.status]?.bg,
                  color: statusConfig[task.status]?.color,
                  border: `1px solid ${statusConfig[task.status]?.border}`
                }}
              />
              <Chip
                label={task.priority}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: priorityConfig[task.priority]?.bg,
                  color: priorityConfig[task.priority]?.color,
                  border: `1px solid ${priorityConfig[task.priority]?.border}`
                }}
              />
              <Chip
                label={`Score: ${task.evaluationScore}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: `${scoreColor}22`,
                  color: scoreColor,
                  border: `1px solid ${scoreColor}44`
                }}
              />
              {task.validationStatus && (
                <Chip
                  label={task.validationStatus}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    bgcolor: validationConfig[task.validationStatus]?.bg || 'rgba(255,255,255,0.05)',
                    color: validationConfig[task.validationStatus]?.color || '#94a3b8',
                    border: `1px solid ${validationConfig[task.validationStatus]?.border || 'rgba(255,255,255,0.1)'}`
                  }}
                />
              )}
            </Stack>

            {task.customerFeedback && (
              <Box sx={{
                mt: 1.5,
                p: 1,
                bgcolor: 'rgba(0,0,0,0.2)',
                borderRadius: 1.5,
                borderRight: `3px solid ${scoreColor}`
              }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, fontSize: '0.6rem', display: 'block', mb: 0.5, letterSpacing: 0.5 }}>
                  CUSTOMER FEEDBACK
                </Typography>
                <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.75rem', fontStyle: 'italic', lineHeight: 1.3, textAlign: 'right' }}>
                  "{task.customerFeedback}"
                </Typography>
              </Box>
            )}

            {/* Subtask Management Notes */}
            {task.subTasks?.filter(st => st.note).length > 0 && (
              <Box sx={{
                mt: 1,
                p: 1,
                bgcolor: 'rgba(59, 130, 246, 0.05)',
                borderRadius: 1.5,
                borderRight: '3px solid #3b82f6'
              }}
                dir="rtl"
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.6rem', letterSpacing: 0.5 }}>
                    MANAGEMENT NOTES
                  </Typography>
                  <Tooltip title="Read Full Note">
                    <IconButton
                      size="small"
                      onClick={() => setManagementNoteOpen(true)}
                      sx={{ p: 0, color: '#3b82f6', '&:hover': { color: '#fff' } }}
                    >
                      <VisibilityIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#cbd5e1',
                    fontSize: '0.75rem',
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textAlign: 'right'
                  }}
                >
                  {task.subTasks.filter(st => st.note).slice(-1)[0].note}
                </Typography>
                {task.subTasks.filter(st => st.note).length > 1 && (
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.6rem', mt: 0.5, display: 'block' }}>
                    + {task.subTasks.filter(st => st.note).length - 1} more log(s)
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {/* Timeline / Dates Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 1, borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5, fontSize: '0.65rem', fontWeight: 700 }}>
                PIS DATE
              </Typography>
              <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 600, fontSize: '0.8rem' }}>
                {task.pisDate ? (
                  <>
                    {format(new Date(task.pisDate), "MMM dd")} <span style={{ color: '#64748b', fontSize: '0.7rem' }}>(W{getCustomWeekNumber(new Date(task.pisDate), new Date(task.pisDate).getFullYear(), settings)})</span>
                  </>
                ) : "N/A"}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 1, borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5, fontSize: '0.65rem', fontWeight: 700 }}>
                INTERVIEW
              </Typography>
              <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 600, fontSize: '0.8rem' }}>
                {task.interviewDate ? (
                  <>
                    {format(new Date(task.interviewDate), "MMM dd")} <span style={{ color: '#64748b', fontSize: '0.7rem' }}>(W{getCustomWeekNumber(new Date(task.interviewDate), new Date(task.interviewDate).getFullYear(), settings)})</span>
                  </>
                ) : "N/A"}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

          {/* Footer Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Dispatch Protocol">
                <Box
                  onClick={handleWhatsAppDispatch}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#22c55e', color: '#fff' },
                    transition: 'all 0.2s'
                  }}
                >
                  <FaWhatsapp size={14} />
                </Box>
              </Tooltip>
              <Tooltip title="Copy Info">
                <Box
                  onClick={copyToClipboard}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'rgba(148, 163, 184, 0.1)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#fff', color: '#000' },
                    transition: 'all 0.2s'
                  }}
                >
                  <FaRegCopy size={14} />
                </Box>
              </Tooltip>
            </Box>

            <Button
              size="small"
              onClick={() => setNoteDialogOpen(true)}
              endIcon={<RiProgress4Fill />}
              sx={{
                color: '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { color: '#fff', bgcolor: 'transparent' }
              }}
            >
              DETAILS
            </Button>
          </Box>
        </Box>

        {/* Menu */}
        {user._id === (task.createdBy?._id || task.createdBy) ? (
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                bgcolor: "#1e293b",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 2,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                "& .MuiMenuItem-root": { color: "#e2e8f0", fontSize: '0.85rem', py: 1, "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" } },
              },
            }}
          >
            <MenuItem onClick={() => handleAction("edit")}>
              <ListItemIcon><EditIcon fontSize="small" sx={{ color: "#3b82f6" }} /></ListItemIcon>
              <ListItemText>Edit Node</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleAction("delete")}>
              <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: "#ef4444" }} /></ListItemIcon>
              <ListItemText>Purge Node</ListItemText>
            </MenuItem>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <MenuItem onClick={() => handleAction("view")}>
              <ListItemIcon><VisibilityIcon fontSize="small" sx={{ color: "#10b981" }} /></ListItemIcon>
              <ListItemText>Full Diagnostics</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleAction("progress")}>
              <ListItemIcon><RiProgress4Fill size={16} color="#94a3b8" /></ListItemIcon>
              <ListItemText>View Timeline</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleAction("favorite")}>
              <ListItemIcon><FaStar size={14} color="#f59e0b" /></ListItemIcon>
              <ListItemText>Bookmark</ListItemText>
            </MenuItem>
            {user.role === "Admin" && (
              <MenuItem onClick={() => handleAction("archive")}>
                <ListItemIcon><IoMdMagnet size={16} color="#8b5cf6" /></ListItemIcon>
                <ListItemText>Archive</ListItemText>
              </MenuItem>
            )}
          </Menu>
        ) : (
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                bgcolor: "#1e293b",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 2,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                "& .MuiMenuItem-root": { color: "#e2e8f0", fontSize: '0.85rem', py: 1, "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" } },
              },
            }}
          >
            <MenuItem onClick={() => handleAction("view")}>
              <ListItemIcon><VisibilityIcon fontSize="small" sx={{ color: "#10b981" }} /></ListItemIcon>
              <ListItemText>Full Diagnostics</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleAction("progress")}>
              <ListItemIcon><RiProgress4Fill size={16} color="#94a3b8" /></ListItemIcon>
              <ListItemText>View Timeline</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleAction("favorite")}>
              <ListItemIcon><FaStar size={14} color="#f59e0b" /></ListItemIcon>
              <ListItemText>Bookmark</ListItemText>
            </MenuItem>
          </Menu>
        )}
      </Paper>

      <EditTaskDialog open={editDialogOpen} setOpen={setEditDialogOpen} task={task} handleTaskUpdate={handleTaskUpdate} />

      <DetailedSubtaskDialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        task={task}
        setUpdateTasksList={setUpdateStateDuringSave}
      />

      <TaskProgressDialog
        open={progressDialogOpen}
        onClose={() => setProgressDialogOpen(false)}
        subtasks={task.subTasks || []}
      />

      {/* Management Note Full View Dialog */}
      <Dialog
        open={managementNoteOpen}
        onClose={() => setManagementNoteOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">Management Note</Typography>
          <IconButton onClick={() => setManagementNoteOpen(false)} sx={{ color: '#94a3b8' }}>
            <MdClose />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2, direction: 'rtl', textAlign: 'right' }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', lineHeight: 1.6 }}>
            {task.subTasks?.filter(st => st.note).slice(-1)[0]?.note}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #333', p: 2 }}>
          <Button onClick={() => setManagementNoteOpen(false)} sx={{ color: '#94a3b8' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskCard;