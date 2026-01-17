import { useEffect, useState } from "react";
import {
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
} from "@mui/icons-material";
import { FaRegCopy, FaStar } from "react-icons/fa";
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

const statusConfig = {
  Todo: { icon: <HourglassEmpty fontSize="small" className="text-yellow-600" />, color: "bg-yellow-100 text-yellow-800" },
  "In Progress": { icon: <PlayCircle className="text-blue-600" />, color: "bg-blue-100 text-blue-800" },
  Closed: { icon: <CheckCircle className="text-green-600" />, color: "bg-green-100 text-green-800" },
  Cancelled: { icon: <Cancel className="text-gray-500" />, color: "bg-[#2d2d2d] text-gray-300" },
};

const TaskCard = ({ task, users, setUpdateStateDuringSave, handleTaskUpdate, handleTaskDelete, handleFavoriteClick, handleTaskArchive }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state?.auth?.user);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [creatorColor, setCreatorColor] = useState([]);
  const formattedDate = task?.date ? format(new Date(task.date), "MMM dd, yyyy HH:mm") : "No Date";
  const remainingMinutes = task?.date ? differenceInMinutes(new Date(task.date), new Date()) : null;

  const assignedUsers = users.filter((user) =>
    task.assignedTo.some((assignedUser) => assignedUser._id === user._id || assignedUser === user._id)
  );
  const creator = users.find((user) => user._id === task.createdBy._id || user._id === task.createdBy) || {};

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
  };

  const copyToClipboard = () => {
    const formattedMessage = `
      **SLID**: ${task.slid}
      **Operation**: ${task.operation || 'N/A'}
      **Satisfaction Score**: ${task.score}
      **Status**: ${task.status}
      **Due Date**: ${formattedDate}
      **Remaining Time**: ${remainingMinutes !== null
        ? remainingMinutes > 0
          ? `${Math.floor(remainingMinutes / 1440)} days, ${Math.floor((remainingMinutes % 1440) / 60)} hours, ${remainingMinutes % 60} minutes left`
          : `${Math.floor(Math.abs(remainingMinutes) / 1440)} days, ${Math.floor((Math.abs(remainingMinutes) % 1440) / 60)} hours, ${Math.abs(remainingMinutes % 60)} minutes overdue`
        : "Not specified"}
      **Category**: ${task.category || "Not specified"}
      **Field Team**: ${task.teamName || "N/A"} (${task.teamCompany || "N/A"})
      **Assigned To**: ${assignedUsers.map((user) => user.name).join(", ") || "No assignees"}`;

    navigator.clipboard.writeText(formattedMessage).then(() => {
      alert("Task details copied to clipboard!");
    });
  };

  return (
    <>
      <Paper
        elevation={2}
        className="w-full p-5 rounded-lg border border-gray-400 hover:shadow-md transition-all duration-300"
        sx={{ backgroundColor: "#121111", borderRadius: isMobile ? 0 : "8px" }}
      >
        <Stack spacing={2} sx={{ height: "100%", justifyContent: "space-between" }}>
          <Stack>
            <div className="flex justify-between items-center">
              <Chip
                label={`${task?.priority} Priority`}
                sx={{
                  backgroundColor: "#414141",
                  color: "#ffffff",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              />

              <Stack direction="row">
                <Tooltip title="Copy Task Details">
                  <IconButton onClick={copyToClipboard} sx={{ color: "#ffffff" }}>
                    <FaRegCopy />
                  </IconButton>
                </Tooltip>
                <IconButton onClick={handleMenuOpen} sx={{ color: "#ffffff" }}>
                  <MoreVertIcon />
                </IconButton>
              </Stack>

              {user._id === (task.createdBy?._id || task.createdBy) ? (
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      backgroundColor: "#2d2d2d",
                      color: "#ffffff",
                    },
                  }}
                >
                  <MenuItem onClick={() => handleAction("edit")}>
                    <ListItemIcon>
                      <EditIcon fontSize="small" sx={{ color: "#ffffff" }} />
                    </ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleAction("delete")}>
                    <ListItemIcon>
                      <DeleteIcon fontSize="small" sx={{ color: "#ffffff" }} />
                    </ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleAction("view")}>
                    <ListItemIcon>
                      <VisibilityIcon fontSize="small" sx={{ color: "#ffffff" }} />
                    </ListItemIcon>
                    <ListItemText>View</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleAction("favorite")}>
                    <ListItemIcon>
                      <FaStar size={16} color="#ffffff" />
                    </ListItemIcon>
                    <ListItemText>Add to favorite</ListItemText>
                  </MenuItem>
                  {user.role === "Admin" && (
                    <MenuItem onClick={() => handleAction("archive")}>
                      <ListItemIcon>
                        <IoMdMagnet size={16} color="#ffffff" />
                      </ListItemIcon>
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
                      backgroundColor: "#2d2d2d",
                      color: "#ffffff",
                    },
                  }}
                >
                  <MenuItem onClick={() => handleAction("view")}>
                    <ListItemIcon>
                      <VisibilityIcon fontSize="small" sx={{ color: "#ffffff" }} />
                    </ListItemIcon>
                    <ListItemText>View</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleAction("favorite")}>
                    <ListItemIcon>
                      <FaStar size={16} color="#ffffff" />
                    </ListItemIcon>
                    <ListItemText>Add to favorite</ListItemText>
                  </MenuItem>
                </Menu>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <h4 className="text-lg font-semibold text-[#bdb5b5]">{task?.slid}</h4>
              <div>{statusConfig[task?.status || "Todo"]?.icon}</div>
              {task.status !== "Closed" ? (
                task.subTasks?.[0]?.title === "Task Reception" && task.subTasks[0].shortNote && (
                  <Chip
                    label={task.subTasks[0].shortNote}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(33, 150, 243, 0.1)",
                      color: "#2196f3",
                      border: "1px solid rgba(33, 150, 243, 0.3)",
                      fontSize: "11px",
                      fontWeight: "500",
                      height: "22px",
                      maxWidth: "200px",
                      "& .MuiChip-label": {
                        px: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }
                    }}
                    tooltip={task.subTasks[0].shortNote}
                  />
                )
              ) : (
                task.closureCallFeedback && (
                  <Chip
                    label={`Closure: ${task.closureCallFeedback}`}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      color: "#10b981",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      fontSize: "11px",
                      fontWeight: "500",
                      height: "22px",
                      maxWidth: "300px",
                      "& .MuiChip-label": {
                        px: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }
                    }}
                    tooltip={task.closureCallFeedback}
                  />
                )
              )}
            </div>

            <div className="text-sm text-gray-300 mt-2 space-y-1">
              <p>
                <span className="font-medium text-[#bdb5b5]">Due Date: </span>
                {formattedDate}
                {task.status !== "Closed" && remainingMinutes !== null && (
                  <span className={`ml-2 ${remainingMinutes > 0 ? "text-green-600" : "text-red-600"}`}>
                    {remainingMinutes > 0
                      ? `${Math.floor(remainingMinutes / 1440)} days, ${Math.floor(
                        (remainingMinutes % 1440) / 60
                      )} hours, ${remainingMinutes % 60} minutes left`
                      : `${Math.floor(Math.abs(remainingMinutes) / 1440)} days, ${Math.floor(
                        (Math.abs(remainingMinutes) % 1440) / 60
                      )} hours, ${Math.abs(remainingMinutes % 60)} minutes overdue`
                    }
                  </span>
                )}
              </p>
              <p><span className="font-medium text-[#bdb5b5]">Category:</span> {task?.category}</p>
              <p><span className="font-medium text-[#bdb5b5]">Field Team:</span> {task?.teamName || "N/A"} ({task?.teamCompany || "N/A"})</p>
              <p><span className="font-medium text-[#bdb5b5]">Operation:</span> {task?.operation || 'N/A'}</p>
            </div>

            <div className="mt-3 flex items-center justify-start gap-4">
              <p className="text-sm text-[#bdb5b5] font-medium">Assigned To:</p>
              <AvatarGroup max={3} className="">
                {assignedUsers.length > 0 ? (
                  assignedUsers.map((user) => (
                    <Tooltip key={user._id} title={user.name}>
                      <Avatar
                        src={user.avatar}
                        sx={{
                          backgroundColor: creatorColor.find((user2) => user2.id === user._id)?.color || "#8D6E63",
                          fontSize: "12px",
                          width: 28,
                          height: 28,
                        }}
                      >
                        {!user.avatar ? user.name.slice(0, 2).toUpperCase() : null}
                      </Avatar>
                    </Tooltip>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs">No assignees</p>
                )}
              </AvatarGroup>
            </div>
          </Stack>
          <Stack>
            <div className="mt-3 text-xs text-gray-400">
              {user && (user.role === 'Admin' || (task.assignedTo?.[0] && (user._id === (task.assignedTo[0]._id || task.assignedTo[0]) || user._id === (task.assignedTo[0]._id || task.assignedTo[0])))) && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setNoteDialogOpen(true)}
                  sx={{ backgroundColor: "#01013d" }}
                >
                  <RiProgress4Fill size={20} className="mr-2" />
                  Manage Subtasks
                </Button>
              )}

              <div className="flex items-center gap-2 mt-4">
                <Avatar
                  sx={{
                    backgroundColor:
                      creatorColor.find((u) => u.id === (task.createdBy?._id || task.createdBy))
                        ?.color || "#8D6E63",
                    fontSize: "12px",
                    width: 28,
                    height: 28,
                  }}
                >
                  {creator.name?.slice(0, 2).toUpperCase()}
                </Avatar>
                <p>
                  <span className="font-medium text-[#bdb5b5]">Created By:</span> {creator.name || "Unknown"}
                </p>
              </div>
            </div>
          </Stack>
        </Stack>
      </Paper>

      <EditTaskDialog open={editDialogOpen} setOpen={setEditDialogOpen} task={task} handleTaskUpdate={handleTaskUpdate} />

      <DetailedSubtaskDialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        task={task}
        setUpdateTasksList={setUpdateStateDuringSave}
      />
    </>
  );
};

export default TaskCard;