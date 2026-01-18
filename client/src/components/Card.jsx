import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Typography,
  Box,
  Stack,
  Tooltip,
  IconButton,
  Collapse,
} from "@mui/material";
import {
  FaSyncAlt,
} from "react-icons/fa";
import { FaClipboardList } from "react-icons/fa6";
import { MdOutlineDoneAll } from "react-icons/md";
import { LuTableProperties } from "react-icons/lu";
import TaskStatusDialog from "./TaskStatusDialog";
import api from "../api/api";

function countStatuses(tasks = []) {
  const statusCount = { Closed: 0, "In Progress": 0, Todo: 0, Neutral: 0, Detractor: 0 };
  const taskStatusCounts = { Closed: 0, "In Progress": 0, Todo: 0 };
  const detractorStatusCounts = { Closed: 0, "In Progress": 0, Todo: 0 };
  const neutralStatusCounts = { Closed: 0, "In Progress": 0, Todo: 0 };
  const validationCounts = { Validated: 0, Pending: 0 };

  if (Array.isArray(tasks)) {
    tasks.forEach((task) => {
      if (task.status === "Closed") {
        taskStatusCounts.Closed++;
      } else if (task.status === "Todo") {
        taskStatusCounts.Todo++;
      } else {
        taskStatusCounts["In Progress"]++;
      }

      // Validation Stats
      if (task.validationStatus === "Validated") {
        validationCounts.Validated++;
      } else {
        validationCounts.Pending++;
      }

      const score = task.evaluationScore || 0;
      if (score >= 1 && score <= 6) {
        statusCount.Detractor++;
        if (task.status === "Closed") detractorStatusCounts.Closed++;
        else if (task.status === "Todo") detractorStatusCounts.Todo++;
        else detractorStatusCounts["In Progress"]++;
      } else if (score >= 7 && score <= 8) {
        statusCount.Neutral++;
        if (task.status === "Closed") neutralStatusCounts.Closed++;
        else if (task.status === "Todo") neutralStatusCounts.Todo++;
        else neutralStatusCounts["In Progress"]++;
      }
    });
  }

  return { statusCount, taskStatusCounts, detractorStatusCounts, neutralStatusCounts, validationCounts };
}

const Card = ({ tasks = [], setUpdateTasksList }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { statusCount = {}, taskStatusCounts = {}, detractorStatusCounts = {}, neutralStatusCounts = {}, validationCounts = {} } = countStatuses(tasks);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [dialogTitle, setDialogTitle] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const navigate = useNavigate();

  const counts = {
    Todo: taskStatusCounts.Todo,
    "In Progress": taskStatusCounts["In Progress"],
    Closed: taskStatusCounts.Closed,
    Detractor: statusCount.Detractor,
    DetractorTodo: detractorStatusCounts.Todo,
    DetractorInProgress: detractorStatusCounts["In Progress"],
    DetractorClosed: detractorStatusCounts.Closed,
    Neutral: statusCount.Neutral,
    NeutralTodo: neutralStatusCounts.Todo,
    NeutralInProgress: neutralStatusCounts["In Progress"],
    NeutralClosed: neutralStatusCounts.Closed,
    Validated: validationCounts.Validated,
    Pending: validationCounts.Pending,
  };





  useEffect(() => {
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, []);

  const handleRefresh = async () => {
    setLastUpdated(new Date());
    setUpdateTasksList(prev => !prev);
  };

  const handleClick = (cardLabel, status, team, path, isRefresh = false) => {
    if (path && !status) {
      navigate(path);
      return;
    }

    let filteredTasks = tasks;
    if (cardLabel === "DETRACTORS") {
      filteredTasks = tasks.filter((task) => task.evaluationScore >= 1 && task.evaluationScore <= 6);
    } else if (cardLabel === "NEUTRALS") {
      filteredTasks = tasks.filter((task) => task.evaluationScore >= 7 && task.evaluationScore <= 8);
    }

    if (status) {
      filteredTasks = filteredTasks.filter((task) => task.status === status);
    }

    if (team) {
      filteredTasks = filteredTasks.filter((task) => task.teamName === team);
    }

    setSelectedTasks(filteredTasks);
    if (!isRefresh) {
      setDialogTitle(`${cardLabel}${team ? ` - ${team}` : ""}${status ? ` - ${status}` : ""}`);
      setDialogOpen(true);
    }
  };





  const stats = [
    {
      _id: "1",
      label: "TOTAL TASKS",
      total: tasks?.length || 0,
      icon: <FaClipboardList />,
      bg: "bg-[#1d4ed8]",
      subStats: [
        { label: "Todo", count: counts.Todo, color: "text-blue-200" },
        { label: "Validated", count: counts.Validated, color: "text-green-300" },
        { label: "Pending", count: counts.Pending, color: "text-orange-300" },
      ],
    },
    {
      _id: "2",
      label: "DETRACTORS",
      total: counts.Detractor || 0,
      icon: <MdOutlineDoneAll />,
      bg: "bg-[#be123c]", // Vibrant red
      path: "/detractor-tasks",
      subStats: [
        { label: "Todo", count: counts.DetractorTodo, color: "text-red-200" },
        { label: "In Progress", count: counts.DetractorInProgress, color: "text-red-100" },
        { label: "Closed", count: counts.DetractorClosed, color: "text-green-300" },
      ],
    },
    {
      _id: "3",
      label: "NEUTRALS",
      total: counts.Neutral || 0,
      icon: <MdOutlineDoneAll />,
      bg: "bg-[#ca8a04]", // Vibrant gold/yellow
      path: "/neutral-tasks",
      subStats: [
        { label: "Todo", count: counts.NeutralTodo, color: "text-yellow-200" },
        { label: "In Progress", count: counts.NeutralInProgress, color: "text-yellow-100" },
        { label: "Closed", count: counts.NeutralClosed, color: "text-green-300" },
      ],
    },
  ];

  if (loading) return <Box sx={{ p: 3, textAlign: 'center' }}><Typography>Loading statistics...</Typography></Box>;
  if (error) return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography color="error">{error}</Typography>
      <IconButton onClick={handleRefresh}><FaSyncAlt /></IconButton>
    </Box>
  );

  const CardWidget = ({ label, count, bg, icon, subStats, path }) => {
    return (
      <div className={`w-full h-44 ${bg} p-5 shadow-xl rounded-2xl flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden`}>
        {/* Background Decoration */}
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>

        <div className="flex justify-between items-start z-10">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white/80 tracking-wider uppercase mb-1">
              {label}
            </span>
            <span
              className={`text-4xl font-black text-white ${path ? 'cursor-pointer hover:underline' : ''}`}
              onClick={() => path && handleClick(label, null, null, path)}
            >
              {count}
            </span>
          </div>
          <div className="p-3 bg-white/20 rounded-xl text-white text-2xl backdrop-blur-md group-hover:rotate-12 transition-transform duration-300">
            {icon}
          </div>
        </div>

        {subStats && (
          <div className="grid grid-cols-3 gap-2 mt-4 z-10">
            {subStats.map((sub, idx) => (
              <div
                key={idx}
                className="flex flex-col cursor-pointer hover:bg-white/10 p-1.5 rounded-lg transition-colors border border-transparent hover:border-white/20"
                onClick={() => handleClick(label, (label === "REPORTED ISSUES" ? null : sub.label), null, null)}
              >
                <span className="text-[10px] font-bold text-white/60 uppercase truncate">
                  {sub.label}
                </span>
                <span className={`text-sm font-black ${sub.color}`}>
                  {sub.count}
                </span>
              </div>
            ))}
          </div>
        )}

        {path && (
          <Link
            to={path}
            className="absolute bottom-2 right-4 text-[10px] font-bold text-white/50 hover:text-white transition-colors uppercase tracking-widest"
          >
            View All →
          </Link>
        )}
      </div>
    );
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} mb={2}>
        <Typography variant="caption" color="textSecondary">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Typography>
        <Tooltip title="Refresh Stats">
          <IconButton onClick={handleRefresh} size="small" sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#f1f5f9' }, boxShadow: 1 }}>
            <FaSyncAlt size={14} color="#64748b" />
          </IconButton>
        </Tooltip>
      </Stack>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((item, index) => (
          <CardWidget
            key={index}
            label={item.label}
            count={item.total}
            bg={item.bg}
            icon={item.icon}
            subStats={item.subStats}
            path={item.path}
          />
        ))}
      </div>

      <TaskStatusDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        tasks={selectedTasks}
        title={dialogTitle}
        setUpdateTasksList={setUpdateTasksList}
      />
    </Box>
  );
};

export default Card;