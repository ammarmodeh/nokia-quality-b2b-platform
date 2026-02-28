import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Typography,
  Box,
  Stack,
  Tooltip,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  FaSyncAlt,
} from "react-icons/fa";
import { FaClipboardList } from "react-icons/fa6";
import { MdOutlineDoneAll, MdClose } from "react-icons/md";
import { LuTableProperties } from "react-icons/lu";
import TaskStatusDialog from "./TaskStatusDialog";
import api from "../api/api";

function countStatuses(tasks = []) {
  const statusCount = { Closed: 0, "In Progress": 0, Todo: 0, Neutral: 0, Detractor: 0 };
  const taskStatusCounts = { Closed: 0, "In Progress": 0, Todo: 0 };
  const detractorStatusCounts = { Closed: 0, "In Progress": 0, Todo: 0 };
  const neutralStatusCounts = { Closed: 0, "In Progress": 0, Todo: 0 };
  const validationCounts = { Validated: 0, Pending: 0 };

  // Aggregations for each card
  const aggregations = {
    Total: { reasons: {}, subReasons: {}, owners: {}, itnRelated: {}, relatedToSubscription: {} },
    Detractor: { reasons: {}, subReasons: {}, owners: {}, itnRelated: {}, relatedToSubscription: {} },
    Neutral: { reasons: {}, subReasons: {}, owners: {}, itnRelated: {}, relatedToSubscription: {} }
  };

  if (Array.isArray(tasks)) {
    tasks.forEach((task) => {
      // Basic Status Counts
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

      const increment = (map, value) => {
        if (Array.isArray(value)) {
          value.forEach(v => { if (v) map[v] = (map[v] || 0) + 1; });
        } else if (value) {
          map[value] = (map[value] || 0) + 1;
        }
      };

      const score = task.evaluationScore || 0;
      const isDetractor = score >= 1 && score <= 6;
      const isNeutral = score >= 7 && score <= 8;

      // Increment Total stats
      increment(aggregations.Total.reasons, task.reason);
      increment(aggregations.Total.subReasons, task.subReason);
      increment(aggregations.Total.owners, task.responsible || task.assignedTo?.name);
      increment(aggregations.Total.itnRelated, task.itnRelated);
      increment(aggregations.Total.relatedToSubscription, task.relatedToSubscription);

      if (isDetractor) {
        statusCount.Detractor++;
        if (task.status === "Closed") detractorStatusCounts.Closed++;
        else if (task.status === "Todo") detractorStatusCounts.Todo++;
        else detractorStatusCounts["In Progress"]++;

        increment(aggregations.Detractor.reasons, task.reason);
        increment(aggregations.Detractor.subReasons, task.subReason);
        increment(aggregations.Detractor.owners, task.responsible || task.assignedTo?.name);
        increment(aggregations.Detractor.itnRelated, task.itnRelated);
        increment(aggregations.Detractor.relatedToSubscription, task.relatedToSubscription);
      } else if (isNeutral) {
        statusCount.Neutral++;
        if (task.status === "Closed") neutralStatusCounts.Closed++;
        else if (task.status === "Todo") neutralStatusCounts.Todo++;
        else neutralStatusCounts["In Progress"]++;

        increment(aggregations.Neutral.reasons, task.reason);
        increment(aggregations.Neutral.subReasons, task.subReason);
        increment(aggregations.Neutral.owners, task.responsible || task.assignedTo?.name);
        increment(aggregations.Neutral.itnRelated, task.itnRelated);
        increment(aggregations.Neutral.relatedToSubscription, task.relatedToSubscription);
      }
    });
  }

  const getStats = (map, total) => {
    const sorted = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
      }));
    return {
      top3: sorted.slice(0, 3),
      all: sorted
    };
  };

  return {
    statusCount,
    taskStatusCounts,
    detractorStatusCounts,
    neutralStatusCounts,
    validationCounts,
    totalStats: {
      reasons: getStats(aggregations.Total.reasons, tasks.length),
      subReasons: getStats(aggregations.Total.subReasons, tasks.length),
      owners: getStats(aggregations.Total.owners, tasks.length),
      itnRelated: getStats(aggregations.Total.itnRelated, tasks.length),
      relatedToSubscription: getStats(aggregations.Total.relatedToSubscription, tasks.length)
    },
    detractorStats: {
      reasons: getStats(aggregations.Detractor.reasons, statusCount.Detractor),
      subReasons: getStats(aggregations.Detractor.subReasons, statusCount.Detractor),
      owners: getStats(aggregations.Detractor.owners, statusCount.Detractor),
      itnRelated: getStats(aggregations.Detractor.itnRelated, statusCount.Detractor),
      relatedToSubscription: getStats(aggregations.Detractor.relatedToSubscription, statusCount.Detractor)
    },
    neutralStats: {
      reasons: getStats(aggregations.Neutral.reasons, statusCount.Neutral),
      subReasons: getStats(aggregations.Neutral.subReasons, statusCount.Neutral),
      owners: getStats(aggregations.Neutral.owners, statusCount.Neutral),
      itnRelated: getStats(aggregations.Neutral.itnRelated, statusCount.Neutral),
      relatedToSubscription: getStats(aggregations.Neutral.relatedToSubscription, statusCount.Neutral)
    }
  };
}

const Card = ({ tasks = [], samplesData = [], setUpdateTasksList }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    statusCount = {},
    taskStatusCounts = {},
    detractorStatusCounts = {},
    neutralStatusCounts = {},
    validationCounts = {},
    totalStats,
    detractorStats,
    neutralStats
  } = countStatuses(tasks);

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [selectedStatsCategory, setSelectedStatsCategory] = useState("");
  const [selectedStats, setSelectedStats] = useState([]);

  const handleShowAll = (category, data) => {
    setSelectedStatsCategory(category);
    setSelectedStats(data);
    setStatsDialogOpen(true);
  };

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

  // const handleClick = (cardLabel, status, team, path, isRefresh = false) => {
  //   if (path && !status) {
  //     navigate(path);
  //     return;
  //   }

  //   let filteredTasks = tasks;
  //   if (cardLabel === "DETRACTORS") {
  //     filteredTasks = tasks.filter((task) => task.evaluationScore >= 1 && task.evaluationScore <= 6);
  //   } else if (cardLabel === "NEUTRALS") {
  //     filteredTasks = tasks.filter((task) => task.evaluationScore >= 7 && task.evaluationScore <= 8);
  //   }

  //   if (status) {
  //     filteredTasks = filteredTasks.filter((task) => task.status === status);
  //   }

  //   if (team) {
  //     filteredTasks = filteredTasks.filter((task) => task.teamName === team);
  //   }

  //   setSelectedTasks(filteredTasks);
  //   if (!isRefresh) {
  //     setDialogTitle(`${cardLabel}${team ? ` - ${team}` : ""}${status ? ` - ${status}` : ""}`);
  //     setDialogOpen(true);
  //   }
  // };





  const totalSamples = samplesData?.reduce((acc, curr) => acc + (curr.sampleSize || 0), 0) || 0;
  const violationPercentage = totalSamples > 0 ? ((tasks.length / totalSamples) * 100).toFixed(2) : 0;
  const detractorPercentage = totalSamples > 0 ? ((counts.Detractor / totalSamples) * 100).toFixed(2) : 0;
  const neutralPercentage = totalSamples > 0 ? ((counts.Neutral / totalSamples) * 100).toFixed(2) : 0;

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
        { label: "Total Samples", count: totalSamples, color: "text-indigo-200" },
        { label: "Violation %", count: `${violationPercentage}%`, color: "text-yellow-200" },
      ],
      extraStats: [
        { label: "Top Reasons", values: totalStats.reasons.top3, allData: totalStats.reasons.all },
        { label: "Top Sub Reasons", values: totalStats.subReasons.top3, allData: totalStats.subReasons.all },
        { label: "Top Owners", values: totalStats.owners.top3, allData: totalStats.owners.all },
        { label: "ITN Related", values: totalStats.itnRelated.top3, allData: totalStats.itnRelated.all },
        { label: "Related to Subscription", values: totalStats.relatedToSubscription.top3, allData: totalStats.relatedToSubscription.all },
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
        { label: "Detractor %", count: `${detractorPercentage}%`, color: "text-yellow-200" },
      ],
      extraStats: [
        { label: "Top Reasons", values: detractorStats.reasons.top3, allData: detractorStats.reasons.all },
        { label: "Top Sub Reasons", values: detractorStats.subReasons.top3, allData: detractorStats.subReasons.all },
        { label: "Top Owners", values: detractorStats.owners.top3, allData: detractorStats.owners.all },
        { label: "ITN Related", values: detractorStats.itnRelated.top3, allData: detractorStats.itnRelated.all },
        { label: "Related to Subscription", values: detractorStats.relatedToSubscription.top3, allData: detractorStats.relatedToSubscription.all },
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
        { label: "Neutral %", count: `${neutralPercentage}%`, color: "text-indigo-200" },
      ],
      extraStats: [
        { label: "Top Reasons", values: neutralStats.reasons.top3, allData: neutralStats.reasons.all },
        { label: "Top Sub Reasons", values: neutralStats.subReasons.top3, allData: neutralStats.subReasons.all },
        { label: "Top Owners", values: neutralStats.owners.top3, allData: neutralStats.owners.all },
        { label: "ITN Related", values: neutralStats.itnRelated.top3, allData: neutralStats.itnRelated.all },
        { label: "Related to Subscription", values: neutralStats.relatedToSubscription.top3, allData: neutralStats.relatedToSubscription.all },
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

  const FullStatsDialog = ({ open, onClose, title, data = [] }) => {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: '#1a1a1a', color: 'white' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'gray' }}><MdClose /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <div className="space-y-2">
            {data.length > 0 ? data.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-sm font-medium">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-blue-400">{item.count}</span>
                  <span className="text-xs bg-blue-400/20 px-2 py-0.5 rounded text-blue-400">{item.percentage}%</span>
                </div>
              </div>
            )) : <Typography variant="body2" sx={{ color: 'gray', textAlign: 'center', py: 4 }}>No data available</Typography>}
          </div>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #333', p: 2 }}>
          <Button onClick={onClose} sx={{ color: 'gray' }}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  const CardWidget = ({ label, count, bg, icon, subStats, extraStats, onShowAll }) => {
    return (
      <div className={`w-full min-h-44 ${bg} p-5 shadow-xl rounded-2xl flex flex-col justify-between transition-all duration-300 group relative overflow-hidden`}>
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>

        <div className="flex justify-between items-start z-10">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white/80 tracking-wider uppercase mb-1">
              {label}
            </span>
            <span className="text-4xl font-black text-white">
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
              <div key={idx} className="flex flex-col p-1.5 rounded-lg transition-colors border border-transparent">
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

        {extraStats && (
          <div className="mt-4 space-y-3 z-10 pt-3 border-t border-white/10">
            {extraStats.map((stat, idx) => (
              <div key={idx} className="flex flex-col">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-white/50 uppercase">{stat.label}</span>
                  {stat.allData && stat.allData.length > 3 && (
                    <button
                      onClick={() => onShowAll(stat.label, stat.allData)}
                      className="text-[9px] text-white/40 hover:text-white transition-colors uppercase font-bold"
                    >
                      Show All
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {stat.values.length > 0 ? stat.values.map((v, i) => (
                    <span key={i} className="text-[9px] bg-white/10 text-white leading-tight px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
                      {v.name} ({v.count}) <span className="opacity-60 text-[8px]">{v.percentage}%</span>
                    </span>
                  )) : <span className="text-[9px] text-white/30 italic">No data</span>}
                </div>
              </div>
            ))}
          </div>
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
            extraStats={item.extraStats}
            onShowAll={handleShowAll}
          />
        ))}
      </div>

      <FullStatsDialog
        open={statsDialogOpen}
        onClose={() => setStatsDialogOpen(false)}
        title={selectedStatsCategory}
        data={selectedStats}
      />

      {/* <TaskStatusDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        tasks={selectedTasks}
        title={dialogTitle}
        setUpdateTasksList={setUpdateTasksList}
      /> */}
    </Box>
  );
};

export default Card;