import { memo } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import ConfirmationNumberOutlined from "@mui/icons-material/ConfirmationNumberOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import Badge from "../../components/ui/Badge";
import AvatarGroup from "../../components/ui/AvatarGroup";
import { taxonomyOfTask } from "../../constants/taxonomy";
import TaxonomyBadge from "../../components/ui/TaxonomyBadge";
import { npsType, priorityMeta, taskDate, taskTitle, fmtDate } from "./taskUtils";


const BoardCard = memo(function BoardCard({ task, onOpen, dragging = false, overlay = false }) {
  const nps = npsType(task.evaluationScore);
  const pr = priorityMeta(task.priority);
  const tickets = task.tickets?.length || 0;
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen?.(task);
      }}
      sx={{
        position: "relative", minWidth: 0, overflow: "hidden", p: 1.5, pl: 1.75, borderRadius: "8px", cursor: overlay ? "grabbing" : "pointer",
        backgroundColor: "var(--surface)", border: "1px solid var(--border)",
        boxShadow: overlay ? "var(--shadow-lg)" : "var(--shadow-xs)",
        opacity: dragging ? 0.4 : 1, transform: overlay ? "rotate(1.5deg)" : "none",
        transition: "border-color .12s ease, box-shadow .12s ease",
        "&:hover": { borderColor: "var(--border-strong)" },
        "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 1 },
        "&::before": {
          content: '""', position: "absolute", left: 0, top: 10, bottom: 10, width: 3,
          borderRadius: "0 3px 3px 0", backgroundColor: pr.color,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
        <Typography sx={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-muted)" }} noWrap>
          {task.slid}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {nps && (
          <Badge tone={nps.tone} sx={{ height: 20, fontSize: 11 }}>
            {nps.label} · {task.evaluationScore}
          </Badge>
        )}
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 500, color: "var(--text)", lineHeight: 1.35, mb: 1 }} noWrap title={taskTitle(task)}>
        {taskTitle(task)}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1.25 }}>
        <TaxonomyBadge tax={taxonomyOfTask(task)} sx={{ height: 20, fontSize: 11 }} />
        {task.priority && task.priority !== "Not specified" && (
          <Badge tone={pr.tone} sx={{ height: 20, fontSize: 11 }}>{task.priority}</Badge>
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, color: "var(--text-muted)", fontSize: 11.5 }}>
        <Tooltip title="Interview date">
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, whiteSpace: "nowrap", flexShrink: 0 }}>
            <CalendarTodayOutlined sx={{ fontSize: 13 }} />
            {fmtDate(taskDate(task))}
          </Box>
        </Tooltip>
        {task.teamName && (
          <Tooltip title={`Field team: ${task.teamName}`}>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
              <GroupsOutlined sx={{ fontSize: 14 }} />
              <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}>{task.teamName}</Box>
            </Box>
          </Tooltip>
        )}
        {tickets > 0 && (
          <Tooltip title={`${tickets} GAIA ticket${tickets > 1 ? "s" : ""}`}>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4 }}>
              <ConfirmationNumberOutlined sx={{ fontSize: 13 }} />
              {tickets}
            </Box>
          </Tooltip>
        )}
        <Box sx={{ flex: 1 }} />
        <AvatarGroup users={task.assignedTo} max={3} size={22} />
      </Box>
    </Box>
  );
});

export default BoardCard;
