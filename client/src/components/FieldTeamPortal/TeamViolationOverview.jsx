import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Pagination,
  Stack,
  Chip,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Card,
  CardContent,
  Tabs,
  Tab,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, LineChart, Line, ComposedChart, AreaChart, Area } from 'recharts';
import { FaFileExcel, FaEye, FaChartLine, FaInfo, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { TaskDetailsDialog } from '../TaskDetailsDialog';
import api from '../../api/api';
import { getWeekNumber, getMonthNumber } from '../../utils/helpers';

const normalizeText = (value) => {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(' ');
  return String(value);
};

// Legacy helper for field extraction (no longer used for accountability checks)
const fieldContainsReach = (value) => {
  if (!value) return false;
  if (Array.isArray(value)) return value.some(v => normalizeText(v).toLowerCase().includes('reach'));
  return normalizeText(value).toLowerCase().includes('reach');
};

const matchTeam = (entry, team) => {
  const entryName = normalizeText(entry?.teamName);
  const teamName = normalizeText(team?.teamName);
  if (entryName && teamName && entryName === teamName) return true;
  if (team?._id && (entry?.teamId === team._id || entry?._id === team._id)) return true;
  return false;
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const getMonthNameFromKey = (key) => {
  if (typeof key !== 'string' || !key.startsWith('Month-')) return key;
  const num = parseInt(key.replace('Month-', ''), 10);
  if (isNaN(num) || num < 1 || num > 12) return key;
  return monthNames[num - 1];
};

const getCohortLabel = (team) => {
  if (!team) return 'Unknown';
  if (team.cohort) return team.cohort;
  const isNewToInstallation = !!team.isNewToInstallation;
  const isNewToActivation = !!team.isNewToActivation;
  if (!isNewToInstallation && !isNewToActivation) return 'Expert';
  if (isNewToInstallation && !isNewToActivation) return 'New to Installation';
  if (!isNewToInstallation && isNewToActivation) return 'New to Activation';
  if (isNewToInstallation && isNewToActivation) return 'New to Installation & Activation';
  return 'Unknown';
};

const getLatestSessionDate = (team) => {
  const sessions = Array.isArray(team?.sessionHistory) ? team.sessionHistory : [];
  const dated = sessions
    .filter(s => s?.sessionDate)
    .map(s => ({ ...s, parsedDate: new Date(s.sessionDate) }))
    .filter(s => !Number.isNaN(s.parsedDate.getTime()));

  if (!dated.length) return null;
  dated.sort((a, b) => b.parsedDate - a.parsedDate);
  return dated[0].parsedDate;
};

const getTeamTasks = (team, tasks) => {
  const teamName = normalizeText(team?.teamName);
  const teamId = team?._id;
  const matchesTeam = (item) => {
    const nameMatch = normalizeText(item?.teamName) === teamName;
    const idMatch = item?.teamId === teamId || item?.team?._id === teamId || item?._id === teamId;
    return nameMatch || idMatch;
  };

  return (Array.isArray(tasks) ? tasks : [])
    .filter(matchesTeam)
    .map(item => ({
      ...item,
      _sourceType: 'task',
      taskDate: item?.interviewDate,
      taskDateIso: item?.interviewDate
    }));
};

const getMonthlyTeamData = (team, tasks) => {
  const teamTasks = getTeamTasks(team, tasks);
  const monthlyMap = {};

  teamTasks.forEach(task => {
    const date = task.taskDateIso ? new Date(task.taskDateIso) : null;
    if (date && !Number.isNaN(date.getTime())) {
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          totalTasks: 0,
          detractors: 0,
          neutrals: 0,
          promoters: 0,
          reach: 0
        };
      }
      monthlyMap[monthKey].totalTasks++;
      if (task.teamAccountability?.includes("Yes")) {
        monthlyMap[monthKey].reach++;
      }
      // Evaluation score scale: 0-10
      // Detractors: <= 6, Neutrals: 7-8, Promoters: 9-10
      const score = task.evaluationScore || 0;
      if (score <= 6) {
        monthlyMap[monthKey].detractors++;
      } else if (score >= 7 && score <= 8) {
        monthlyMap[monthKey].neutrals++;
      } else if (score >= 9) {
        monthlyMap[monthKey].promoters++;
      }
    }
  });

  const sorted = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
  
  // Add improvement indicators
  return sorted.map((month, idx) => ({
    ...month,
    improvementStatus: idx === 0 ? 'baseline' : (
      sorted[idx - 1].detractors > month.detractors ? 'improved' : 
      sorted[idx - 1].detractors < month.detractors ? 'declined' : 'stable'
    )
  }));
};

const getSessionBreakdown = (team, tasks) => {
  const sessions = Array.isArray(team?.sessionHistory) ? team.sessionHistory : [];
  const teamTasks = getTeamTasks(team, tasks);
  
  return sessions
    .filter(s => s?.sessionDate)
    .map(session => {
      const sessionDate = new Date(session.sessionDate);
      const monthKey = sessionDate.toISOString().slice(0, 7);
      const tasksAfterSession = teamTasks.filter(task => {
        const taskDate = task.taskDateIso ? new Date(task.taskDateIso) : task.taskDate ? new Date(task.taskDate) : null;
        return taskDate && taskDate > sessionDate;
      });
      
      const detractorsCount = tasksAfterSession.filter(t => {
        const score = t.evaluationScore || 0;
        return score <= 6;
      }).length;
      
      const neutralsCount = tasksAfterSession.filter(t => {
        const score = t.evaluationScore || 0;
        return score >= 7 && score <= 8;
      }).length;
      
      const promotersCount = tasksAfterSession.filter(t => {
        const score = t.evaluationScore || 0;
        return score >= 9;
      }).length;

      return {
        sessionDate: sessionDate.toLocaleDateString(),
        month: monthKey,
        status: session.status || 'Completed',
        tasksAfterSession,
        totalTasksAfter: tasksAfterSession.length,
        detractorsCount,
        neutralsCount,
        promotersCount,
        conductedBy: session.conductedBy || 'Unknown'
      };
    })
    .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
};

const getDetailedTeamAnalysis = (team, tasks) => {
  const teamTasks = getTeamTasks(team, tasks);
  return teamTasks.map(task => {
    const score = task.evaluationScore || 0;
    let sentiment = 'Not Evaluated';
    if (score <= 6) sentiment = 'Detractor';
    else if (score >= 7 && score <= 8) sentiment = 'Neutral';
    else if (score >= 9) sentiment = 'Promoter';
    
    return {
      ...task,
      date: task.taskDate ? new Date(task.taskDate) : null,
      month: task.taskDateIso ? new Date(task.taskDateIso).toISOString().slice(0, 7) : null,
      evaluation: score,
      sentiment,
      reason: task.reason || '-',
      subReason: task.subReason || '-',
      rootCause: task.rootCause || '-',
      owner: task.owner || task.responsible || '-',
      technician: task.technician || '-',
      status: task.status || 'Unknown'
    };
  });
};

const TeamViolationOverview = ({
  fieldTeams = [],
  leaderboardData = [],
  allTechnicalTasksGlobal = [],
  allCustomerIssuesGlobal = [],
  handleDrillDown,
  handleExportTeamViolations,
  handleExportAllTeamsViolations,
  colors = {},
  title = 'Field Team Tasks Insights',
  settings = {}
}) => {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTeamDetail, setSelectedTeamDetail] = useState(null);
  const [filterScore, setFilterScore] = useState([0, 10]);
  const [filterMonth, setFilterMonth] = useState('all');
  const [detailTab, setDetailTab] = useState(0);
  const [sortBy, setSortBy] = useState('date-desc');
  const [performanceTab, setPerformanceTab] = useState(0);
  const [performanceFilterCompany, setPerformanceFilterCompany] = useState('all');
  const [performanceFilterCohort, setPerformanceFilterCohort] = useState('all');
  const [performanceFilterMinTasks, setPerformanceFilterMinTasks] = useState(0);
  const [performanceFilterTrained, setPerformanceFilterTrained] = useState('all');
  const [performanceSearch, setPerformanceSearch] = useState('');
  const [chartCategoryFilter, setChartCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [tableWeekFilter, setTableWeekFilter] = useState('all');
  const [tableMonthFilter, setTableMonthFilter] = useState('all');

  // Task Details Dialog state (matching /tasks-list page)
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedViewTask, setSelectedViewTask] = useState(null);

  const handleViewTaskDetails = useCallback(async (task) => {
    const taskId = task._id || task.id || task.taskId;
    if (taskId) {
      try {
        const response = await api.get(`/tasks/get-task/${taskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        setSelectedViewTask(response.data);
        setViewDialogOpen(true);
      } catch (err) {
        console.error('Error fetching task details:', err);
        // Fallback: use the task data we already have
        setSelectedViewTask(task);
        setViewDialogOpen(true);
      }
    } else {
      setSelectedViewTask(task);
      setViewDialogOpen(true);
    }
  }, []);

  const handleOpenSessionDetail = (row) => {
    const team = fieldTeams.find(t => normalizeText(t.teamName) === normalizeText(row.teamName)) || { teamName: row.teamName };
    const teamTasks = row.rawTasks || getTeamTasks(team, allTechnicalTasksGlobal);

    setSelectedTeamDetail({
      ...row,
      team,
      rawTasks: teamTasks,
      monthlyData: getMonthlyTeamData(team, teamTasks),
      sessionBreakdown: getSessionBreakdown(team, teamTasks),
      detailedTasks: getDetailedTeamAnalysis(team, teamTasks)
    });
    setFilterScore([0, 10]);
    setFilterMonth('all');
    setDetailTab(0);
    setSortBy('date-desc');
    setDetailDialogOpen(true);
  };

  const handleCloseSessionDetail = () => {
    setDetailDialogOpen(false);
    setSelectedTeamDetail(null);
  };

  const { availableMonths, availableWeeks } = useMemo(() => {
    const mSet = new Set();
    const wSet = new Set();
    allTechnicalTasksGlobal.forEach(t => {
      const d = t.interviewDate;
      if (d) {
        const dateObj = new Date(d);
        if (!isNaN(dateObj.getTime())) {
          const mInfo = getMonthNumber(d, settings);
          if (mInfo && mInfo.key) mSet.add(mInfo.key);
          
          const wInfo = getWeekNumber(d, settings.weekStartDay, settings.week1StartDate, settings.week1EndDate, settings.startWeekNumber);
          if (wInfo && wInfo.key) wSet.add(wInfo.key);
        }
      }
    });
    return {
      availableMonths: Array.from(mSet).sort((a,b) => {
        const m1 = parseInt(a.replace('Month-', ''), 10) || 0;
        const m2 = parseInt(b.replace('Month-', ''), 10) || 0;
        return m1 - m2;
      }),
      availableWeeks: Array.from(wSet).sort((a,b) => {
        const matchA = a.match(/Wk-(\d+)\s*\((\d+)\)/);
        const matchB = b.match(/Wk-(\d+)\s*\((\d+)\)/);
        if (matchA && matchB) {
          if (matchA[2] !== matchB[2]) return parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
          return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
        }
        return a.localeCompare(b);
      })
    };
  }, [allTechnicalTasksGlobal]);

  const filteredGlobalTasks = useMemo(() => {
    let tasks = allTechnicalTasksGlobal;
    if (dateFilter.start) {
      const startDate = new Date(dateFilter.start);
      tasks = tasks.filter(t => {
        const d = t.interviewDate;
        return d && new Date(d) >= startDate;
      });
    }
    if (dateFilter.end) {
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      tasks = tasks.filter(t => {
        const d = t.interviewDate;
        return d && new Date(d) <= endDate;
      });
    }
    if (tableMonthFilter !== 'all') {
      tasks = tasks.filter(t => {
        const d = t.interviewDate;
        if (!d) return false;
        const mInfo = getMonthNumber(d, settings);
        return mInfo && mInfo.key === tableMonthFilter;
      });
    }
    if (tableWeekFilter !== 'all') {
      tasks = tasks.filter(t => {
        const d = t.interviewDate;
        if (!d) return false;
        const wInfo = getWeekNumber(d, settings.weekStartDay, settings.week1StartDate, settings.week1EndDate, settings.startWeekNumber);
        return wInfo && wInfo.key === tableWeekFilter;
      });
    }
    return tasks;
  }, [allTechnicalTasksGlobal, dateFilter, tableMonthFilter, tableWeekFilter, settings]);

  const teamRows = useMemo(() => {
    return (fieldTeams || []).map(team => {
      const latestSessionDate = getLatestSessionDate(team);
      const trained = !!latestSessionDate;
      const teamTasks = getTeamTasks(team, filteredGlobalTasks);
      const totalTasks = teamTasks.length;
      const reachCount = teamTasks.reduce((sum, item) => {
        if (item.teamAccountability?.includes("Yes")) {
          return sum + 1;
        }
        return sum;
      }, 0);
      const detractorsCount = teamTasks.filter(item => {
        const score = item.evaluationScore || 0;
        const normalized = score <= 10 ? score * 10 : score;
        return normalized > 0 && normalized <= 60;
      }).length;
      const neutralsCount = teamTasks.filter(item => {
        const score = item.evaluationScore || 0;
        const normalized = score <= 10 ? score * 10 : score;
        return normalized > 60 && normalized <= 80;
      }).length;
      
      const reachDetractors = teamTasks.filter(item => {
        const isReach = item.teamAccountability?.includes("Yes");
        const score = item.evaluationScore || 0;
        const normalized = score <= 10 ? score * 10 : score;
        return isReach && normalized > 0 && normalized <= 60;
      }).length;

      const reachNeutrals = teamTasks.filter(item => {
        const isReach = item.teamAccountability?.includes("Yes");
        const score = item.evaluationScore || 0;
        const normalized = score <= 10 ? score * 10 : score;
        return isReach && normalized > 60 && normalized <= 80;
      }).length;

      // Snapshot logic for UI table
      let snapshotMetrics = {
        weekly: { 
          total: 0, detractors: 0, neutrals: 0, 
          reach: 0, reachDetractors: 0, reachNeutrals: 0,
          ownerReachDetractors: 0, ownerReachNeutrals: 0,
          label: '-' 
        },
        monthly: { 
          total: 0, detractors: 0, neutrals: 0, 
          reach: 0, reachDetractors: 0, reachNeutrals: 0,
          ownerReachDetractors: 0, ownerReachNeutrals: 0,
          label: '-' 
        }
      };

      if (totalTasks > 0) {
        const taskDetails = teamTasks.map(t => {
          const d = t.interviewDate || t.date || t.createdAt;
          const wInfo = getWeekNumber(d, settings?.weekStartDay, settings?.week1StartDate, settings?.week1EndDate, settings?.startWeekNumber);
          const mInfo = getMonthNumber(d, settings);
          const score = t.evaluationScore || 0;
          const normalized = score <= 10 ? score * 10 : score;
          return {
            weekKey: wInfo?.key || 'Unknown',
            monthKey: mInfo?.key || 'Unknown',
            isReach: t.teamAccountability?.includes("Yes"),
            isOwnerReach: fieldContainsReach(t.responsible),
            isDetractor: normalized > 0 && normalized <= 60,
            isNeutral: normalized > 60 && normalized <= 80
          };
        });

        const uniqueWeeks = [...new Set(taskDetails.map(t => t.weekKey))].sort().reverse();
        const uniqueMonths = [...new Set(taskDetails.map(t => t.monthKey))].sort().reverse();
        
        const latestWkKey = uniqueWeeks[0];
        const latestMoKey = uniqueMonths[0];

        if (latestWkKey) {
          const wkTasks = taskDetails.filter(t => t.weekKey === latestWkKey);
          snapshotMetrics.weekly = {
            label: latestWkKey,
            total: wkTasks.length,
            detractors: wkTasks.filter(t => t.isDetractor).length,
            neutrals: wkTasks.filter(t => t.isNeutral).length,
            reach: wkTasks.filter(t => t.isReach).length,
            reachDetractors: wkTasks.filter(t => t.isReach && t.isDetractor).length,
            reachNeutrals: wkTasks.filter(t => t.isReach && t.isNeutral).length,
            ownerReachDetractors: wkTasks.filter(t => t.isOwnerReach && t.isDetractor).length,
            ownerReachNeutrals: wkTasks.filter(t => t.isOwnerReach && t.isNeutral).length
          };
        }

        if (latestMoKey) {
          const moTasks = taskDetails.filter(t => t.monthKey === latestMoKey);
          const moNum = parseInt(latestMoKey.split('-')[1]);
          snapshotMetrics.monthly = {
            label: !isNaN(moNum) ? monthNames[moNum - 1] : latestMoKey,
            total: moTasks.length,
            detractors: moTasks.filter(t => t.isDetractor).length,
            neutrals: moTasks.filter(t => t.isNeutral).length,
            reach: moTasks.filter(t => t.isReach).length,
            reachDetractors: moTasks.filter(t => t.isReach && t.isDetractor).length,
            reachNeutrals: moTasks.filter(t => t.isReach && t.isNeutral).length,
            ownerReachDetractors: moTasks.filter(t => t.isOwnerReach && t.isDetractor).length,
            ownerReachNeutrals: moTasks.filter(t => t.isOwnerReach && t.isNeutral).length
          };
        }
      }
      const tasksAfterLatestSession = latestSessionDate
        ? teamTasks.filter(item => {
            const dateValue = item.taskDateIso;
            const date = dateValue ? new Date(dateValue) : null;
            return date && date > latestSessionDate;
          }).length
        : 0;

      const daysSinceSession = latestSessionDate
        ? Math.max(1, Math.ceil((new Date() - latestSessionDate) / (1000 * 60 * 60 * 24)))
        : 0;
      const yearStart = latestSessionDate
        ? new Date(latestSessionDate.getFullYear(), 0, 1)
        : null;
      const daysBeforeSession = latestSessionDate && yearStart
        ? Math.max(1, Math.ceil((latestSessionDate - yearStart) / (1000 * 60 * 60 * 24)))
        : 0;
      const tasksBeforeLatestSessionSamePeriod = latestSessionDate && yearStart
        ? teamTasks.filter(item => {
            const dateValue = item.taskDateIso;
            const date = dateValue ? new Date(dateValue) : null;
            return date && date >= yearStart && date < latestSessionDate;
          }).length
        : 0;
      const violationsBeforeLatestSessionSamePeriod = latestSessionDate && yearStart
        ? teamTasks.filter(item => {
            const dateValue = item.taskDateIso;
            const date = dateValue ? new Date(dateValue) : null;
            const score = item.evaluationScore || 0;
            return date && date >= yearStart && date < latestSessionDate && score <= 8;
          }).length
        : 0;
      const avgTasksBeforeSession = tasksBeforeLatestSessionSamePeriod / (daysBeforeSession || 1);
      const avgTasksAfterSession = tasksAfterLatestSession / (daysSinceSession || 1);
      const improvedAfterSession = trained && latestSessionDate
        ? avgTasksAfterSession < avgTasksBeforeSession
        : false;
      const improvementRate = avgTasksBeforeSession > 0
        ? Math.round(((avgTasksBeforeSession - avgTasksAfterSession) / avgTasksBeforeSession) * 100)
        : 0;
      const postSessionViolationsCount = latestSessionDate
        ? teamTasks.filter(item => {
            const dateValue = item.taskDateIso;
            const date = dateValue ? new Date(dateValue) : null;
            const score = item.evaluationScore || 0;
            const normalized = score <= 10 ? score * 10 : score;
            return date && date > latestSessionDate && normalized > 0 && normalized <= 80;
          }).length
        : 0;

      const postSessionDetractorsCount = latestSessionDate
        ? teamTasks.filter(item => {
            const dateValue = item.taskDateIso;
            const date = dateValue ? new Date(dateValue) : null;
            const score = item.evaluationScore || 0;
            const normalized = score <= 10 ? score * 10 : score;
            return date && date > latestSessionDate && normalized > 0 && normalized <= 60;
          }).length
        : 0;

      const postSessionNeutralsCount = latestSessionDate
        ? teamTasks.filter(item => {
            const dateValue = item.taskDateIso;
            const date = dateValue ? new Date(dateValue) : null;
            const score = item.evaluationScore || 0;
            const normalized = score <= 10 ? score * 10 : score;
            return date && date > latestSessionDate && normalized > 60 && normalized <= 80;
          }).length
        : 0;

      const postSessionReachCount = latestSessionDate
        ? teamTasks.filter(item => {
            const dateValue = item.taskDateIso;
            const date = dateValue ? new Date(dateValue) : null;
            const isReach = item.teamAccountability?.includes("Yes");
            return date && date > latestSessionDate && isReach;
          }).length
        : 0;

      const postSessionReachDetractorsCount = latestSessionDate
        ? teamTasks.filter(item => {
            const dateValue = item.taskDateIso;
            const date = dateValue ? new Date(dateValue) : null;
            const score = item.evaluationScore || 0;
            const normalized = score <= 10 ? score * 10 : score;
            const isReach = item.teamAccountability?.includes("Yes");
            return date && date > latestSessionDate && isReach && normalized > 0 && normalized <= 60;
          }).length
        : 0;

      const postSessionReachNeutralsCount = latestSessionDate
        ? teamTasks.filter(item => {
            const dateValue = item.taskDateIso;
            const date = dateValue ? new Date(dateValue) : null;
            const score = item.evaluationScore || 0;
            const normalized = score <= 10 ? score * 10 : score;
            const isReach = item.teamAccountability?.includes("Yes");
            return date && date > latestSessionDate && isReach && normalized > 60 && normalized <= 80;
          }).length
        : 0;

      // Owner "Reach" company-based post-session breakdown (responsible field contains "Reach")
      const postSessionOwnerReachDetractorsCount = latestSessionDate
        ? teamTasks.filter(item => {
            const dateValue = item.taskDateIso;
            const date = dateValue ? new Date(dateValue) : null;
            const score = item.evaluationScore || 0;
            const normalized = score <= 10 ? score * 10 : score;
            const isOwnerReach = fieldContainsReach(item.responsible);
            return date && date > latestSessionDate && isOwnerReach && normalized > 0 && normalized <= 60;
          }).length
        : 0;

      const postSessionOwnerReachNeutralsCount = latestSessionDate
        ? teamTasks.filter(item => {
            const dateValue = item.taskDateIso;
            const date = dateValue ? new Date(dateValue) : null;
            const score = item.evaluationScore || 0;
            const normalized = score <= 10 ? score * 10 : score;
            const isOwnerReach = fieldContainsReach(item.responsible);
            return date && date > latestSessionDate && isOwnerReach && normalized > 60 && normalized <= 80;
          }).length
        : 0;

      
      const postSessionTotal = tasksAfterLatestSession;
      
      const postSessionViolationRate = postSessionTotal > 0
        ? Math.round((postSessionViolationsCount / postSessionTotal) * 100)
        : 0;
      const preSessionViolationRate = tasksBeforeLatestSessionSamePeriod > 0
        ? Math.round((violationsBeforeLatestSessionSamePeriod / tasksBeforeLatestSessionSamePeriod) * 100)
        : 0;
      const violationRateDelta = postSessionViolationRate - preSessionViolationRate;
      
      const cohort = getCohortLabel(team);

      // Calculate latest PIS date
      const latestPisDate = teamTasks.length > 0 
        ? teamTasks
            .filter(t => t.pisDate)
            .map(t => new Date(t.pisDate))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => b - a)[0]
        : null;

      // Calculate trend (comparing last month to previous month)
      const monthlyData = getMonthlyTeamData(team, allTechnicalTasksGlobal);
      const sortedMonths = monthlyData.sort((a, b) => a.month.localeCompare(b.month));
      const trendDirection = sortedMonths.length >= 2 
        ? sortedMonths[sortedMonths.length - 1].totalTasks >= sortedMonths[sortedMonths.length - 2].totalTasks 
          ? '↑' 
          : '↓'
        : '-';

      return {
        id: team._id || team.teamName,
        teamName: team.teamName || 'Unknown',
        teamCode: team.teamCode || team._id || '-',
        company: team.teamCompany || team.company || '-',
        cohort,
        trained,
        latestSession: latestSessionDate ? latestSessionDate.toLocaleDateString() : 'No session',
        totalTasks,
        reachCount,
        reachOwnershipPct: totalTasks > 0 ? Math.round((reachCount / totalTasks) * 100) : 0,
        detractorsCount,
        neutralsCount,
        teamDetractors: detractorsCount,
        teamNeutrals: neutralsCount,
        reachDetractors,
        reachNeutrals,
        reachDetractorsPct: totalTasks > 0 ? Math.round((reachDetractors / totalTasks) * 100) : 0,
        reachNeutralsPct: totalTasks > 0 ? Math.round((reachNeutrals / totalTasks) * 100) : 0,

        // Snapshots
        latestWeekLabel: snapshotMetrics.weekly.label,
        weeklyTotal: snapshotMetrics.weekly.total,
        weeklyDetractors: snapshotMetrics.weekly.detractors,
        weeklyNeutrals: snapshotMetrics.weekly.neutrals,
        weeklyReach: snapshotMetrics.weekly.reach,
        weeklyReachDetractors: snapshotMetrics.weekly.reachDetractors,
        weeklyReachNeutrals: snapshotMetrics.weekly.reachNeutrals,
        weeklyOwnerReachDetractors: snapshotMetrics.weekly.ownerReachDetractors,
        weeklyOwnerReachNeutrals: snapshotMetrics.weekly.ownerReachNeutrals,

        latestMonthLabel: snapshotMetrics.monthly.label,
        monthlyTotal: snapshotMetrics.monthly.total,
        monthlyDetractors: snapshotMetrics.monthly.detractors,
        monthlyNeutrals: snapshotMetrics.monthly.neutrals,
        monthlyReach: snapshotMetrics.monthly.reach,
        monthlyReachDetractors: snapshotMetrics.monthly.reachDetractors,
        monthlyReachNeutrals: snapshotMetrics.monthly.reachNeutrals,
        monthlyOwnerReachDetractors: snapshotMetrics.monthly.ownerReachDetractors,
        monthlyOwnerReachNeutrals: snapshotMetrics.monthly.ownerReachNeutrals,

        // Post-Session Group
        postSessionTotal,
        postSessionDetractors: postSessionDetractorsCount,
        postSessionNeutrals: postSessionNeutralsCount,
        postSessionOwnerReachDetractors: postSessionOwnerReachDetractorsCount,
        postSessionOwnerReachNeutrals: postSessionOwnerReachNeutralsCount,
        postSessionReach: postSessionReachCount,
        postSessionReachDetractors: postSessionReachDetractorsCount,
        postSessionReachNeutrals: postSessionReachNeutralsCount,
        postSessionReachPct: postSessionTotal > 0 ? Math.round((postSessionReachCount / postSessionTotal) * 100) : 0,


        tasksAfterLatestSession,
        tasksBeforeLatestSessionSamePeriod,
        violationsBeforeLatestSessionSamePeriod,
        daysBeforeSession,
        daysSinceSession,
        avgTasksBeforeSession,
        avgTasksAfterSession,
        improvementRate,
        improvedAfterSession,
        postSessionViolationsCount,
        postSessionViolationRate,
        preSessionViolationRate,
        violationRateDelta,
        latestSessionDate: latestSessionDate ? latestSessionDate.toLocaleDateString() : '-',
        latestPisDate,
        isActive: team.isActive !== false, // Default to true if not specified
        trendDirection,
        rawTasks: teamTasks,
        analyticsTeam: leaderboardData.find(entry => matchTeam(entry, team)),
        trainingStatus: trained ? 'Trained' : 'Untrained',
        monthlyData
      };
    }).sort((a, b) => b.totalTasks - a.totalTasks);
  }, [fieldTeams, leaderboardData, filteredGlobalTasks]);

  // Team Performance Segments
  const filteredPerformanceTeams = useMemo(() => {
    return teamRows.filter(row => {
      const searchMatch = !performanceSearch || row.teamName.toLowerCase().includes(performanceSearch.toLowerCase());
      const companyMatch = performanceFilterCompany === 'all' || row.company === performanceFilterCompany;
      const cohortMatch = performanceFilterCohort === 'all' || row.cohort === performanceFilterCohort;
      const tasksMatch = row.totalTasks >= performanceFilterMinTasks;
      const trainedMatch = performanceFilterTrained === 'all' ||
        (performanceFilterTrained === 'trained' && row.trained) ||
        (performanceFilterTrained === 'untrained' && !row.trained);
      return searchMatch && companyMatch && cohortMatch && tasksMatch && trainedMatch;
    });
  }, [teamRows, performanceSearch, performanceFilterCompany, performanceFilterCohort, performanceFilterMinTasks, performanceFilterTrained]);

  const improvedTeams = useMemo(() => {
    return filteredPerformanceTeams.filter(row => row.trained && row.improvementRate > 0);
  }, [filteredPerformanceTeams]);

  const untrainedTeams = useMemo(() => {
    return filteredPerformanceTeams.filter(row => !row.trained);
  }, [filteredPerformanceTeams]);

  const atRiskTeams = useMemo(() => {
    return filteredPerformanceTeams.filter(row => row.trained && row.improvementRate <= 0)
      .sort((a, b) => a.improvementRate - b.improvementRate);
  }, [filteredPerformanceTeams]);

  const chartData = useMemo(() => {
    let sourceData = teamRows;
    if (chartCategoryFilter === 'improved') sourceData = improvedTeams;
    else if (chartCategoryFilter === 'underperforming') sourceData = atRiskTeams;
    else if (chartCategoryFilter === 'untrained') sourceData = untrainedTeams;

    // Ensure we take the top 10 from the selected category sorted by totalTasks internally
    const sorted = [...sourceData].sort((a, b) => b.totalTasks - a.totalTasks);

    return sorted.slice(0, 10).map(row => ({
      name: row.teamName,
      totalTasks: row.totalTasks,
      tasksAfterLatestSession: row.tasksAfterLatestSession,
      isUntrained: !row.trained,
      isImproved: row.trained && row.improvementRate > 0,
      isUnderperforming: row.trained && row.improvementRate <= 0,
    }));
  }, [teamRows, improvedTeams, atRiskTeams, untrainedTeams, chartCategoryFilter]);

  const monthlyChartData = useMemo(() => {
    return selectedTeamDetail?.monthlyData || [];
  }, [selectedTeamDetail]);

  // Filtered and sorted detailed tasks
  const filteredDetailedTasks = useMemo(() => {
    if (!selectedTeamDetail?.detailedTasks) return [];
    
    let filtered = selectedTeamDetail.detailedTasks.filter(task => {
      const scoreMatch = task.evaluation >= filterScore[0] && task.evaluation <= filterScore[1];
      const monthMatch = filterMonth === 'all' || task.month === filterMonth;
      return scoreMatch && monthMatch;
    });

    // Sort based on sortBy
    if (sortBy === 'date-desc') {
      filtered.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    } else if (sortBy === 'date-asc') {
      filtered.sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
    } else if (sortBy === 'score-worst') {
      filtered.sort((a, b) => a.evaluation - b.evaluation);
    } else if (sortBy === 'score-best') {
      filtered.sort((a, b) => b.evaluation - a.evaluation);
    }

    return filtered;
  }, [selectedTeamDetail, filterScore, filterMonth, sortBy]);

  const sessionBreakdown = selectedTeamDetail?.sessionBreakdown || [];
  const sessionTaskCount = sessionBreakdown.reduce((sum, session) => sum + (session.tasksAfterSession?.length || 0), 0);
  const sessionDetractors = sessionBreakdown.reduce((sum, session) => sum + (session.detractorsCount || 0), 0);
  const sessionNeutrals = sessionBreakdown.reduce((sum, session) => sum + (session.neutralsCount || 0), 0);

  const rootCauseChartData = useMemo(() => {
    if (!filteredDetailedTasks.length) return [];

    const counts = {};
    filteredDetailedTasks.forEach(task => {
      const rootCause = normalizeText(task.rootCause) || 'Unknown';
      const isReachOwned = task.teamAccountability?.includes("Yes");
      const label = rootCause || 'Unknown';

      if (!counts[label]) {
        counts[label] = { rootCause: label, reach: 0, nonReach: 0, total: 0 };
      }

      if (isReachOwned) {
        counts[label].reach += 1;
      } else {
        counts[label].nonReach += 1;
      }
      counts[label].total += 1;
    });

    return Object.values(counts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredDetailedTasks]);

  const reachAnalytics = useMemo(() => {
    const allTeamTasks = selectedTeamDetail?.detailedTasks || [];
    const filteredTasks = filteredDetailedTasks;
    
    const allReachCount = allTeamTasks.filter(t => t.teamAccountability?.includes("Yes")).length;

    const totalFilteredTasks = filteredTasks.length;

    const filteredReachCount = filteredTasks.filter(t => t.teamAccountability?.includes("Yes")).length;

    const filteredNonReachCount = totalFilteredTasks - filteredReachCount;

    const detractorsFiltered = filteredTasks.filter(t => t.evaluation <= 6);
    const neutralsFiltered = filteredTasks.filter(t => t.evaluation >= 7 && t.evaluation <= 8);
    
    const reachDetractors = detractorsFiltered.filter(t => t.teamAccountability?.includes("Yes")).length;

    const reachNeutrals = neutralsFiltered.filter(t => t.teamAccountability?.includes("Yes")).length;

    return {
      totalFilteredTasks,
      totalReachPct: allTeamTasks.length > 0 ? Math.round((allReachCount / allTeamTasks.length) * 100) : 0,
      filteredReachCount,
      filteredReachPct: totalFilteredTasks > 0 ? Math.round((filteredReachCount / totalFilteredTasks) * 100) : 0,
      filteredNonReachCount,
      filteredNonReachPct: totalFilteredTasks > 0 ? Math.round((filteredNonReachCount / totalFilteredTasks) * 100) : 0,
      reachDetractors,
      reachDetractorsPct: filteredReachCount > 0 ? Math.round((reachDetractors / filteredReachCount) * 100) : 0,
      reachNeutrals,
      reachNeutralsPct: filteredReachCount > 0 ? Math.round((reachNeutrals / filteredReachCount) * 100) : 0
    };
  }, [selectedTeamDetail, filteredDetailedTasks]);

  const sessionReachAnalytics = useMemo(() => {
    const sessions = sessionBreakdown || [];
    const sessionReach = sessions.map(session => {
      const tasks = session.tasksAfterSession || [];
      const reachTasks = tasks.filter(t => t.teamAccountability?.includes("Yes")).length;
      const reachDetractors = tasks.filter(t =>
        (t.evaluationScore || 0) <= 6 && t.teamAccountability?.includes("Yes")
      ).length;
      return {
        sessionDate: session.sessionDate,
        total: tasks.length,
        reach: reachTasks,
        reachPct: tasks.length > 0 ? Math.round((reachTasks / tasks.length) * 100) : 0,
        reachDetractors
      };
    });
    return sessionReach;
  }, [sessionBreakdown]);  const summaryStats = useMemo(() => {
    const calcStats = (rows) => {
      const total = rows.length;
      if (total === 0) return { newToActivation: { count: 0, pct: '0.0' }, newToInstAct: { count: 0, pct: '0.0' } };
      const n2a = rows.filter(r => r.cohort === 'New to Activation').length;
      const n2ia = rows.filter(r => r.cohort === 'New to Installation & Activation').length;
      return {
        newToActivation: { count: n2a, pct: ((n2a / total) * 100).toFixed(1) },
        newToInstAct: { count: n2ia, pct: ((n2ia / total) * 100).toFixed(1) }
      };
    };

    return {
      total: calcStats(teamRows),
      trained: calcStats(teamRows.filter(r => r.trained)),
      untrained: calcStats(teamRows.filter(r => !r.trained))
    };
  }, [teamRows]);

  const teamStatusStats = useMemo(() => {
    const total = (fieldTeams || []).length;
    let active = 0;
    let terminated = 0;
    let resigned = 0;
    let suspended = 0;
    let onLeave = 0;
    let otherInactive = 0;

    (fieldTeams || []).forEach(team => {
      if (team.isTerminated) terminated++;
      else if (team.isResigned) resigned++;
      else if (team.isSuspended) suspended++;
      else if (team.isOnLeave) onLeave++;
      else if (team.isActive === false) otherInactive++;
      else active++;
    });

    const inactive = terminated + resigned + suspended + onLeave + otherInactive;

    return { total, active, inactive, terminated, resigned, suspended, onLeave, otherInactive };
  }, [fieldTeams]);

  const trainedCount = teamRows.filter(row => row.trained).length;
  const untrainedCount = teamRows.filter(row => !row.trained).length;
  const totalTasks = teamRows.reduce((sum, row) => sum + row.totalTasks, 0);
  const averageAfterRate = trainedCount > 0
    ? ((teamRows.filter(row => row.trained).reduce((sum, row) => sum + row.tasksAfterLatestSession, 0) / Math.max(1, teamRows.filter(row => row.trained).reduce((sum, row) => sum + row.totalTasks, 0))) * 100).toFixed(1)
    : '0.0';

  const teamTasksColumns = useMemo(() => [
    { field: 'teamName', headerName: 'Team', minWidth: 180, flex: 1, renderCell: (params) => <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{params.value}</span> },
    { 
      field: 'cohort', 
      headerName: 'Cohort', 
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{ 
            bgcolor: params.row.trained ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)', 
            color: params.row.trained ? '#10b981' : '#ef4444', 
            border: `1px solid ${params.row.trained ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` 
          }}
        />
      )
    },
    { 
      field: 'isActive', 
      headerName: 'Active', 
      width: 100,
      align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          sx={{ 
            bgcolor: params.value ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)', 
            color: params.value ? '#10b981' : '#ef4444', 
            border: `1px solid ${params.value ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` 
          }}
        />
      )
    },
    { field: 'totalTasks', headerName: 'Total Tasks', type: 'number', width: 120, align: 'center', headerAlign: 'center', renderCell: (params) => <span style={{ fontWeight: 700, color: '#fff' }}>{params.value}</span> },
    { 
      field: 'reachOwnershipPct', 
      headerName: 'Acc. %', 
      type: 'number', 
      width: 100, 
      align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title={`${params.row.reachCount} of ${params.row.totalTasks} tasks`}>
          <span style={{ color: '#3b82f6', fontWeight: 600 }}>{params.value}%</span>
        </Tooltip>
      )
    },
    // New accountability columns
    { field: 'teamDetractors', headerName: 'Team Det.', type: 'number', width: 90, align: 'center', headerAlign: 'center', renderCell: (params) => <span style={{ color: '#ef4444', fontWeight: 600 }}>{params.value}</span> },
    { field: 'teamNeutrals', headerName: 'Team Neu.', type: 'number', width: 90, align: 'center', headerAlign: 'center', renderCell: (params) => <span style={{ color: '#f59e0b', fontWeight: 600 }}>{params.value}</span> },
    { field: 'reachDetractors', headerName: 'Acc. Det.', type: 'number', width: 100, align: 'center', headerAlign: 'center', renderCell: (params) => <span style={{ color: '#ef4444' }}>{params.value}</span> },
    { field: 'reachNeutrals', headerName: 'Acc. Neu.', type: 'number', width: 100, align: 'center', headerAlign: 'center', renderCell: (params) => <span style={{ color: '#f59e0b' }}>{params.value}</span> },
    { 
      field: 'reachDetractorsPct', 
      headerName: 'Acc. Det. %', 
      type: 'number', 
      width: 110, 
      align: 'center', headerAlign: 'center', 
      renderCell: (params) => (
        <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{params.value}%</span>
      )
    },
    { 
      field: 'reachNeutralsPct', 
      headerName: 'Acc. Neu. %', 
      type: 'number', 
      width: 110, 
      align: 'center', headerAlign: 'center', 
      renderCell: (params) => (
        <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>{params.value}%</span>
      )
    },

    // Snapshot - Weekly
    { 
      field: 'latestWeekLabel', 
      headerName: 'Wk Snapshot', 
      width: 130, 
      headerClassName: 'weekly-group-header', 
      cellClassName: 'weekly-group-cell',
      renderCell: (params) => <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{params.value}</span>
    },
    { field: 'weeklyTotal', headerName: 'Wk Total', type: 'number', width: 90, headerClassName: 'weekly-group-header', cellClassName: 'weekly-group-cell' },
    { field: 'weeklyDetractors', headerName: 'Wk Det.', type: 'number', width: 80, headerClassName: 'weekly-group-header', cellClassName: 'weekly-group-cell' },
    { field: 'weeklyNeutrals', headerName: 'Wk Neu.', type: 'number', width: 80, headerClassName: 'weekly-group-header', cellClassName: 'weekly-group-cell' },
    { field: 'weeklyOwnerReachDetractors', headerName: 'Wk Reach Det.', type: 'number', width: 110, headerClassName: 'weekly-group-header', cellClassName: 'weekly-group-cell', renderCell: (params) => <span style={{ color: '#ef4444' }}>{params.value}</span> },
    { field: 'weeklyOwnerReachNeutrals', headerName: 'Wk Reach Neu.', type: 'number', width: 110, headerClassName: 'weekly-group-header', cellClassName: 'weekly-group-cell', renderCell: (params) => <span style={{ color: '#f59e0b' }}>{params.value}</span> },
    { field: 'weeklyReach', headerName: 'Wk Acc.', type: 'number', width: 90, headerClassName: 'weekly-group-header', cellClassName: 'weekly-group-cell' },
    { field: 'weeklyReachDetractors', headerName: 'Wk Acc. Det.', type: 'number', width: 100, headerClassName: 'weekly-group-header', cellClassName: 'weekly-group-cell', renderCell: (params) => <span style={{ color: '#ef4444' }}>{params.value}</span> },
    { field: 'weeklyReachNeutrals', headerName: 'Wk Acc. Neu.', type: 'number', width: 100, headerClassName: 'weekly-group-header', cellClassName: 'weekly-group-cell', renderCell: (params) => <span style={{ color: '#f59e0b' }}>{params.value}</span> },

    // Snapshot - Monthly
    { 
      field: 'latestMonthLabel', 
      headerName: 'Mo Snapshot', 
      width: 120, 
      headerClassName: 'monthly-group-header', 
      cellClassName: 'monthly-group-cell',
      renderCell: (params) => <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{params.value}</span>
    },
    { field: 'monthlyTotal', headerName: 'Mo Total', type: 'number', width: 90, headerClassName: 'monthly-group-header', cellClassName: 'monthly-group-cell' },
    { field: 'monthlyDetractors', headerName: 'Mo Det.', type: 'number', width: 80, headerClassName: 'monthly-group-header', cellClassName: 'monthly-group-cell' },
    { field: 'monthlyNeutrals', headerName: 'Mo Neu.', type: 'number', width: 80, headerClassName: 'monthly-group-header', cellClassName: 'monthly-group-cell' },
    { field: 'monthlyOwnerReachDetractors', headerName: 'Mo Reach Det.', type: 'number', width: 110, headerClassName: 'monthly-group-header', cellClassName: 'monthly-group-cell', renderCell: (params) => <span style={{ color: '#ef4444' }}>{params.value}</span> },
    { field: 'monthlyOwnerReachNeutrals', headerName: 'Mo Reach Neu.', type: 'number', width: 110, headerClassName: 'monthly-group-header', cellClassName: 'monthly-group-cell', renderCell: (params) => <span style={{ color: '#f59e0b' }}>{params.value}</span> },
    { field: 'monthlyReach', headerName: 'Mo Acc.', type: 'number', width: 90, headerClassName: 'monthly-group-header', cellClassName: 'monthly-group-cell' },
    { field: 'monthlyReachDetractors', headerName: 'Mo Acc. Det.', type: 'number', width: 100, headerClassName: 'monthly-group-header', cellClassName: 'monthly-group-cell', renderCell: (params) => <span style={{ color: '#ef4444' }}>{params.value}</span> },
    { field: 'monthlyReachNeutrals', headerName: 'Mo Acc. Neu.', type: 'number', width: 100, headerClassName: 'monthly-group-header', cellClassName: 'monthly-group-cell', renderCell: (params) => <span style={{ color: '#f59e0b' }}>{params.value}</span> },

    { 
      field: 'detractorsCount', 
      headerName: 'Global Det.', 
      type: 'number', 
      width: 120,
      align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title={`Tasks with evaluationScore ≤ 60`}>
          <span style={{ color: params.value > 0 ? '#ef4444' : '#94a3b8', fontWeight: 700 }}>{params.value}</span>
        </Tooltip>
      )
    },
    { 
      field: 'neutralsCount', 
      headerName: 'Global Neu.', 
      type: 'number', 
      width: 120,
      align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title={`Tasks with evaluationScore > 60 & ≤ 80`}>
          <span style={{ color: params.value > 0 ? '#f59e0b' : '#94a3b8', fontWeight: 700 }}>{params.value}</span>
        </Tooltip>
      )
    },
    { field: 'latestSession', headerName: 'Latest Session', width: 140, align: 'center', headerAlign: 'center', renderCell: (params) => <span style={{ color: '#94a3b8' }}>{params.value}</span> },
    
    // Snapshot - Post Session Group (Purple)
    { field: 'postSessionTotal', headerName: 'Post Total', type: 'number', width: 95, headerClassName: 'post-group-header', cellClassName: 'post-group-cell' },
    { field: 'postSessionDetractors', headerName: 'Post Det.', type: 'number', width: 85, headerClassName: 'post-group-header', cellClassName: 'post-group-cell' },
    { field: 'postSessionNeutrals', headerName: 'Post Neu.', type: 'number', width: 85, headerClassName: 'post-group-header', cellClassName: 'post-group-cell' },
    {
      field: 'postSessionOwnerReachDetractors',
      headerName: 'Post Reach Det.',
      type: 'number',
      width: 125,
      headerClassName: 'post-group-header',
      cellClassName: 'post-group-cell',
      renderCell: (params) => (
        <Tooltip title={`Post-session tasks where 'responsible' owner is Reach (company) AND score ≤60`}>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>{params.value}</span>
        </Tooltip>
      )
    },
    {
      field: 'postSessionOwnerReachNeutrals',
      headerName: 'Post Reach Neu.',
      type: 'number',
      width: 125,
      headerClassName: 'post-group-header',
      cellClassName: 'post-group-cell',
      renderCell: (params) => (
        <Tooltip title={`Post-session tasks where 'responsible' owner is Reach (company) AND score 61–80`}>
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>{params.value}</span>
        </Tooltip>
      )
    },
    { field: 'postSessionReach', headerName: 'Post Acc.', type: 'number', width: 95, headerClassName: 'post-group-header', cellClassName: 'post-group-cell' },
    {
      field: 'postSessionReachDetractors',
      headerName: 'Post Acc. Det.',
      type: 'number',
      width: 115,
      headerClassName: 'post-group-header',
      cellClassName: 'post-group-cell',
      renderCell: (params) => (
        <Tooltip title={`Accountable tasks (teamAccountability=Yes) that are also Detractors (score ≤60) post-session`}>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>{params.value}</span>
        </Tooltip>
      )
    },
    {
      field: 'postSessionReachNeutrals',
      headerName: 'Post Acc. Neu.',
      type: 'number',
      width: 115,
      headerClassName: 'post-group-header',
      cellClassName: 'post-group-cell',
      renderCell: (params) => (
        <Tooltip title={`Accountable tasks (teamAccountability=Yes) that are also Neutrals (score 61–80) post-session`}>
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>{params.value}</span>
        </Tooltip>
      )
    },
    { field: 'postSessionReachPct', headerName: 'Post Acc. %', type: 'number', width: 110, headerClassName: 'post-group-header', cellClassName: 'post-group-cell', renderCell: (params) => <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{params.value}%</span> },
    { 
      field: 'improvementRate', 
      headerName: 'Improve %', 
      type: 'number', 
      width: 125, 
      headerClassName: 'post-group-header', 
      cellClassName: 'post-group-cell',
      renderHeader: (params) => (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="caption" fontWeight={700}>Improve %</Typography>
          <Tooltip title="Daily volume change: ((Daily Avg Before - Daily Avg After) / Daily Avg Before). Positive % means daily task volume decreased post-session (improvement).">
            <span><FaInfoCircle style={{ fontSize: '0.85rem', opacity: 0.8 }} /></span>
          </Tooltip>
        </Stack>
      ),
      renderCell: (params) => {
        if (!params.row.trained) return <span style={{ color: '#94a3b8' }}>-</span>;
        return <span style={{ color: params.value >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{params.value > 0 ? '+' : ''}{params.value}%</span>;
      }
    },

    { 
      field: 'tasksAfterLatestSession', 
      headerName: 'After Latest', 
      type: 'number', 
      width: 120,
      align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <span style={{ color: params.value > 0 ? '#ef4444' : '#94a3b8', fontWeight: 700 }}>
          {params.value}
        </span>
      )
    },
    { 
      field: 'latestPisDate', 
      headerName: 'Latest PIS Date', 
      width: 150,
      align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title="Date of the most recently committed task (PIS Date)">
          <span style={{ color: params.value ? '#e2e8f0' : '#94a3b8', fontWeight: 600 }}>
            {params.value ? params.value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
          </span>
        </Tooltip>
      )
    },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 150, 
      align: 'center', headerAlign: 'center',
      sortable: false, 
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 0.5 }}>
          <Tooltip title="View detailed session breakdown">
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={() => handleOpenSessionDetail(params.row)}
              sx={{ minWidth: 40, py: 0.5, px: 1 }}
            >
              <FaInfo />
            </Button>
          </Tooltip>
          <Tooltip title="Export team tasks">
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleExportTeamViolations(params.row.analyticsTeam || params.row)}
              sx={{ minWidth: 40, py: 0.5, px: 1, color: '#94a3b8', borderColor: 'rgba(148, 163, 184, 0.3)' }}
            >
              <FaFileExcel />
            </Button>
          </Tooltip>
        </Stack>
      )
    }
  ], [handleOpenSessionDetail, handleExportTeamViolations]);

  const segmentColumns = useMemo(() => [
    { field: 'teamName', headerName: 'Team Name', minWidth: 180, flex: 1, renderCell: (params) => <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{params.value}</span> },
    { field: 'company', headerName: 'Company', width: 140, renderCell: (params) => <span style={{ color: '#94a3b8' }}>{params.value}</span> },
    { field: 'cohort', headerName: 'Cohort', width: 120, renderCell: (params) => <span style={{ color: '#94a3b8' }}>{params.value}</span> },
    { field: 'totalTasks', headerName: 'Total Tasks', type: 'number', width: 110, renderCell: (params) => <span style={{ color: '#fff' }}>{params.value}</span> },
    { field: 'reachOwnershipPct', headerName: 'Acc. %', type: 'number', width: 100, renderCell: (params) => <span style={{ color: '#3b82f6' }}>{params.value}%</span> },
    { field: 'detractorsCount', headerName: 'Detractors', type: 'number', width: 100, renderCell: (params) => <span style={{ color: '#ef4444' }}>{params.value}</span> },
    { field: 'neutralsCount', headerName: 'Neutrals', type: 'number', width: 100, renderCell: (params) => <span style={{ color: '#f59e0b' }}>{params.value}</span> },
    { field: 'tasksBeforeLatestSessionSamePeriod', headerName: 'Before Tasks', type: 'number', width: 120, renderCell: (params) => <span style={{ color: '#94a3b8' }}>{params.row.trained ? (params.value ?? 'N/A') : 'N/A'}</span> },
    { field: 'tasksAfterLatestSession', headerName: 'After Tasks', type: 'number', width: 120, renderCell: (params) => <span style={{ color: '#94a3b8' }}>{params.row.trained ? (params.value ?? 'N/A') : 'N/A'}</span> },
    { field: 'daysBeforeAfter', headerName: 'Days Before/After', width: 140, renderCell: (params) => <span style={{ color: '#94a3b8' }}>{params.row.trained ? `${params.row.daysBeforeSession} / ${params.row.daysSinceSession}` : 'N/A'}</span> },
    { field: 'improvementRate', headerName: 'Improve %', type: 'number', width: 110, renderCell: (params) => {
      if (!params.row.trained) return <span style={{ color: '#94a3b8' }}>N/A</span>;
      return <span style={{ color: params.value >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{(params.value >= 0 ? '+' : '') + (params.value?.toFixed(1) || 0) + '%'}</span>;
    } },
    { field: 'postSessionViolationsCount', headerName: 'Post Viols', type: 'number', width: 100, renderCell: (params) => <span style={{ color: '#ef4444' }}>{params.row.trained ? (params.value ?? 'N/A') : 'N/A'}</span> },
    { field: 'latestSession', headerName: 'Latest Session', width: 140, renderCell: (params) => <span style={{ color: '#94a3b8' }}>{params.row.trained ? (params.value || 'No session') : 'No sessions'}</span> },
  ], []);

  const renderCohortMiniStats = (data) => (
    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <Stack spacing={0.8}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.68rem' }}>New to Activation</Typography>
          <Typography variant="caption" fontWeight={700} color="#fff" sx={{ fontSize: '0.72rem' }}>
            {data.newToActivation.count} <Box component="span" sx={{ color: '#8b5cf6', ml: 0.5 }}>({data.newToActivation.pct}%)</Box>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.68rem' }}>New to Installation & Act.</Typography>
          <Typography variant="caption" fontWeight={700} color="#fff" sx={{ fontSize: '0.72rem' }}>
            {data.newToInstAct.count} <Box component="span" sx={{ color: '#8b5cf6', ml: 0.5 }}>({data.newToInstAct.pct}%)</Box>
          </Typography>
        </Box>
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ mt: 6 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FaChartLine /> {title}
            </Typography>
            <Typography variant="body2" color="#94a3b8">
              Team task risk profile plus Reach ownership and training effectiveness. Latest session comparisons are based on PIS date.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<FaFileExcel />}
              onClick={handleExportAllTeamsViolations}
              sx={{ borderColor: colors.primary || '#3b82f6', color: colors.primary || '#3b82f6' }}
            >
              Export All Tasks
            </Button>
          </Stack>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, ...colors.glass, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', height: '100%' }}>
              <Typography variant="subtitle2" color="#94a3b8" gutterBottom>Total Teams</Typography>
              <Typography variant="h4" fontWeight={800} color="#fff">{teamRows.length}</Typography>
              <Typography variant="caption" color="#6b7280" display="block" sx={{ mb: 1 }}>Active team profiles from fieldteams.</Typography>
              {renderCohortMiniStats(summaryStats.total)}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, ...colors.glass, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', height: '100%' }}>
              <Typography variant="subtitle2" color="#94a3b8" gutterBottom>Trained</Typography>
              <Typography variant="h4" fontWeight={800} color="#10b981">{trainedCount}</Typography>
              <Typography variant="caption" color="#6b7280" display="block" sx={{ mb: 1 }}>Teams with recorded training sessions.</Typography>
              {renderCohortMiniStats(summaryStats.trained)}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, ...colors.glass, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', height: '100%' }}>
              <Typography variant="subtitle2" color="#94a3b8" gutterBottom>Untrained</Typography>
              <Typography variant="h4" fontWeight={800} color="#ef4444">{untrainedCount}</Typography>
              <Typography variant="caption" color="#6b7280" display="block" sx={{ mb: 1 }}>Teams without a recorded session.</Typography>
              {renderCohortMiniStats(summaryStats.untrained)}
            </Paper>
          </Grid>
        </Grid>
      </Box>


      <Paper sx={{ p: 2.5, ...colors.glass, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} color="#fff">Team Tasks Table</Typography>
            <Typography variant="body2" color="#94a3b8" sx={{ mb: 1.5 }}>Detailed task profile for each field team, including Team Accountability and session-aware counts.</Typography>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip size="small" label={`Total: ${teamStatusStats.total}`} sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600 }} />
              <Chip size="small" label={`Active: ${teamStatusStats.active}`} sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }} />
              <Chip size="small" label={`Inactive: ${teamStatusStats.inactive}`} sx={{ bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }} />
              {teamStatusStats.onLeave > 0 && <Chip size="small" label={`On Leave: ${teamStatusStats.onLeave}`} sx={{ bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }} />}
              {teamStatusStats.terminated > 0 && <Chip size="small" label={`Terminated: ${teamStatusStats.terminated}`} sx={{ bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }} />}
              {teamStatusStats.resigned > 0 && <Chip size="small" label={`Resigned: ${teamStatusStats.resigned}`} sx={{ bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }} />}
              {teamStatusStats.suspended > 0 && <Chip size="small" label={`Suspended: ${teamStatusStats.suspended}`} sx={{ bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }} />}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.2)', px: 2, py: 1, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>From:</Typography>
                <TextField
                  type="date"
                  size="small"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.05)',
                    borderRadius: 1,
                    '& input': { color: '#fff', fontSize: '0.8rem', p: '6px 8px' },
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>To:</Typography>
                <TextField
                  type="date"
                  size="small"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.05)',
                    borderRadius: 1,
                    '& input': { color: '#fff', fontSize: '0.8rem', p: '6px 8px' },
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                  }}
                />
              </Box>
              {(dateFilter.start || dateFilter.end) && (
                <Button size="small" onClick={() => setDateFilter({ start: '', end: '' })} sx={{ color: '#ef4444', minWidth: 0, p: 0.5 }}>
                  Clear
                </Button>
              )}
            </Box>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: '#94a3b8' }}>Month</InputLabel>
              <Select
                value={tableMonthFilter}
                label="Month"
                onChange={(e) => setTableMonthFilter(e.target.value)}
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(0,0,0,0.2)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.08)' },
                  '& .MuiSvgIcon-root': { color: '#94a3b8' }
                }}
              >
                <MenuItem value="all">All Months</MenuItem>
                {availableMonths.map(m => (
                  <MenuItem key={m} value={m}>{getMonthNameFromKey(m)}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: '#94a3b8' }}>Week</InputLabel>
              <Select
                value={tableWeekFilter}
                label="Week"
                onChange={(e) => setTableWeekFilter(e.target.value)}
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(0,0,0,0.2)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.08)' },
                  '& .MuiSvgIcon-root': { color: '#94a3b8' }
                }}
              >
                <MenuItem value="all">All Weeks</MenuItem>
                {availableWeeks.map(w => (
                  <MenuItem key={w} value={w}>{w}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<FaFileExcel />}
              onClick={handleExportAllTeamsViolations}
              size="small"
              sx={{ borderColor: colors.primary || '#3b82f6', color: colors.primary || '#3b82f6', height: 'fit-content' }}
            >
              Export Tasks
            </Button>
          </Box>
        </Box>

        <Box sx={{ height: 500, width: '100%', mt: 2 }}>
          <DataGrid
            rows={teamRows}
            columns={teamTasksColumns}
            pageSizeOptions={[5, 10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
            disableRowSelectionOnClick
            sx={{
              border: 0,
              color: '#cbd5e1',
              '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
              '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(255,255,255,0.08)' },
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#111827', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)' },
              '& .MuiDataGrid-footerContainer': { borderTop: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' },
              '& .MuiTablePagination-root': { color: '#94a3b8' },
              '& .MuiDataGrid-toolbarContainer': { p: 1 },
              
              // Custom Weekly Snapshot Styles
              '& .weekly-group-header': { backgroundColor: 'rgba(30, 58, 138, 0.4) !important', color: '#60a5fa !important', fontWeight: 'bold !important' },
              '& .weekly-group-cell': { backgroundColor: 'rgba(30, 58, 138, 0.1)' },
              
              // Custom Monthly Snapshot Styles
              '& .monthly-group-header': { backgroundColor: 'rgba(20, 83, 45, 0.4) !important', color: '#4ade80 !important', fontWeight: 'bold !important' },
              '& .monthly-group-cell': { backgroundColor: 'rgba(20, 83, 45, 0.1)' },

              // Custom Post-Session Styles
              '& .post-group-header': { backgroundColor: 'rgba(91, 33, 182, 0.4) !important', color: '#a78bfa !important', fontWeight: 'bold !important' },
              '& .post-group-cell': { backgroundColor: 'rgba(91, 33, 182, 0.1)' }
            }}
          />
        </Box>
      </Paper>

      {/* Team Performance Segments Table */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 2 }}>
        <Typography variant="h6" color="#fff" fontWeight={700} gutterBottom>
          Team Performance Segments
        </Typography>
        <Typography variant="body2" color="#94a3b8" sx={{ mb: 2 }}>
          Categorized view of teams based on training status and post-session performance.
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 2 }}>
          <Typography variant="subtitle2" color="#fff" fontWeight={600} sx={{ mb: 1 }}>Filters & Queries</Typography>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Search Team Name"
              value={performanceSearch}
              onChange={(e) => setPerformanceSearch(e.target.value)}
              sx={{
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: 'rgba(59,130,246,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(59,130,246,0.5)' }
                }
              }}
            />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Company</InputLabel>
                <Select
                  value={performanceFilterCompany}
                  label="Company"
                  onChange={(e) => setPerformanceFilterCompany(e.target.value)}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59,130,246,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59,130,246,0.5)' },
                    '& .MuiSvgIcon-root': { color: '#94a3b8' }
                  }}
                >
                  <MenuItem value="all">All Companies</MenuItem>
                  {[...new Set(teamRows.map(t => t.company).filter(c => c && c !== '-'))].map(company => (
                    <MenuItem key={company} value={company}>{company}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Cohort</InputLabel>
                <Select
                  value={performanceFilterCohort}
                  label="Cohort"
                  onChange={(e) => setPerformanceFilterCohort(e.target.value)}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59,130,246,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59,130,246,0.5)' },
                    '& .MuiSvgIcon-root': { color: '#94a3b8' }
                  }}
                >
                  <MenuItem value="all">All Cohorts</MenuItem>
                  {[...new Set(teamRows.map(t => t.cohort).filter(c => c && c !== 'Unknown'))].map(cohort => (
                    <MenuItem key={cohort} value={cohort}>{cohort}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Min Tasks"
                type="number"
                value={performanceFilterMinTasks}
                onChange={(e) => setPerformanceFilterMinTasks(Number(e.target.value))}
                sx={{
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(59,130,246,0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(59,130,246,0.5)' }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Training Status</InputLabel>
                <Select
                  value={performanceFilterTrained}
                  label="Training Status"
                  onChange={(e) => setPerformanceFilterTrained(e.target.value)}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59,130,246,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59,130,246,0.5)' },
                    '& .MuiSvgIcon-root': { color: '#94a3b8' }
                  }}
                >
                  <MenuItem value="all">All Teams</MenuItem>
                  <MenuItem value="trained">Trained</MenuItem>
                  <MenuItem value="untrained">Untrained</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ borderBottom: 1, borderColor: 'rgba(59,130,246,0.15)' }}>
          <Tabs
            value={performanceTab}
            onChange={(e, v) => setPerformanceTab(v)}
            sx={{
              '& .MuiTab-root': { color: '#94a3b8', textTransform: 'none', fontWeight: 600 },
              '& .Mui-selected': { color: '#3b82f6' },
              '& .MuiTabs-indicator': { backgroundColor: '#3b82f6' }
            }}
          >
            <Tab label={`Improved Teams (${improvedTeams.length})`} />
            <Tab label={`Underperforming Teams (Post-session violations) (${atRiskTeams.length})`} />
            <Tab label={`Untrained Teams (${untrainedTeams.length})`} />
          </Tabs>
        </Box>

        {/* Improved Teams Tab */}
        {performanceTab === 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="#94a3b8" sx={{ mb: 1 }}>
              Teams that improved after training using average daily tasks before year start through session and after session to today.
            </Typography>
            <Box sx={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={improvedTeams}
                columns={segmentColumns}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                slots={{ toolbar: GridToolbar }}
                slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }}
                disableRowSelectionOnClick
                sx={{
                  border: 0, color: '#cbd5e1',
                  '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(255,255,255,0.08)' },
                  '& .MuiDataGrid-columnHeaders': { bgcolor: '#111827', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)' },
                  '& .MuiDataGrid-footerContainer': { borderTop: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' },
                  '& .MuiTablePagination-root': { color: '#94a3b8' },
                }}
              />
            </Box>
          </Box>
        )}

        {/* Untrained Teams Tab */}
        {performanceTab === 2 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="#94a3b8" sx={{ mb: 1 }}>
              Teams that have not received training sessions yet.
            </Typography>
            <Box sx={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={untrainedTeams}
                columns={segmentColumns}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                slots={{ toolbar: GridToolbar }}
                slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }}
                disableRowSelectionOnClick
                sx={{
                  border: 0, color: '#cbd5e1',
                  '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(255,255,255,0.08)' },
                  '& .MuiDataGrid-columnHeaders': { bgcolor: '#111827', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)' },
                  '& .MuiDataGrid-footerContainer': { borderTop: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' },
                  '& .MuiTablePagination-root': { color: '#94a3b8' },
                }}
              />
            </Box>
          </Box>
        )}

        {/* Post-Session Violations Tab */}
        {performanceTab === 1 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="#94a3b8" sx={{ mb: 1 }}>
              Trained teams that still committed violations after their latest session.
            </Typography>
            <Box sx={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={atRiskTeams}
                columns={segmentColumns}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                slots={{ toolbar: GridToolbar }}
                slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }}
                disableRowSelectionOnClick
                sx={{
                  border: 0, color: '#cbd5e1',
                  '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(255,255,255,0.08)' },
                  '& .MuiDataGrid-columnHeaders': { bgcolor: '#111827', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)' },
                  '& .MuiDataGrid-footerContainer': { borderTop: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' },
                  '& .MuiTablePagination-root': { color: '#94a3b8' },
                }}
              />
            </Box>
          </Box>
        )}
      </Paper>

      {/* Advanced Team Analytics Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseSessionDetail}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0f172a',
            backgroundImage: 'linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(16,185,129,0.05) 100%)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 2,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff', fontWeight: 700, borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
          {selectedTeamDetail?.teamName ? `${selectedTeamDetail.teamName} - Advanced Team Analytics` : 'Team Analytics'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 2 }}>
          {selectedTeamDetail && (
            <Stack spacing={2}>
              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'rgba(59,130,246,0.15)' }}>
                <Tabs 
                  value={detailTab} 
                  onChange={(e, v) => setDetailTab(v)}
                  sx={{
                    '& .MuiTab-root': { color: '#94a3b8', textTransform: 'none', fontWeight: 600 },
                    '& .Mui-selected': { color: '#3b82f6' },
                    '& .MuiTabs-indicator': { backgroundColor: '#3b82f6' }
                  }}
                >
                  <Tab label="Team Trend - Monthly Overview" />
                  <Tab label="Session Impact - After Training" />
                  <Tab label="Root Cause & Task Analysis" />
                </Tabs>
              </Box>

              {/* TAB 0: Team Trend - Monthly Overview */}
              {detailTab === 0 && (
                <Box>
                  <Typography variant="h6" color="#fff" fontWeight={700} gutterBottom>
                    {selectedTeamDetail.teamName} - Monthly Task Trends
                  </Typography>
                  <Typography variant="body2" color="#94a3b8" sx={{ mb: 2 }}>
                    This view is scoped to the selected team only, showing monthly counts, detractors, and neutrals.
                  </Typography>
                  {monthlyChartData && monthlyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={monthlyChartData} margin={{ top: 5, right: 30, left: 0, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fill: '#94a3b8', fontSize: 11 }} 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                          wrapperStyle={{ backgroundColor: '#111827', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10 }} 
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#fff', padding: '8px 12px' }}
                          cursor={{ fill: 'rgba(59,130,246,0.1)' }}
                          formatter={(value) => <span style={{ color: '#e2e8f0' }}>{value}</span>}
                          labelFormatter={(label) => <span style={{ color: '#94a3b8', fontWeight: 600 }}>{label}</span>}
                        />
                        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '0.85rem', paddingTop: '20px' }} />
                        <Line type="monotone" dataKey="totalTasks" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name="Total Tasks" />
                        <Line type="monotone" dataKey="detractors" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} name="Detractors (≤6)" />
                        <Line type="monotone" dataKey="neutrals" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="Neutrals (7-8)" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="#94a3b8">No monthly data available</Typography>
                  )}
                </Box>
              )}

              {/* TAB 1: Session Impact - After Training */}
              {detailTab === 1 && (
                <Box>
                  <Typography variant="h6" color="#fff" fontWeight={700} gutterBottom>
                    {selectedTeamDetail.teamName} - Session Impact Summary
                  </Typography>
                  <Typography variant="body2" color="#94a3b8" sx={{ mb: 2 }}>
                    Only tasks for this team are shown, with post-session counts and detractor/neural breakdowns.
                  </Typography>
                  {sessionBreakdown.length > 0 ? (
                    <>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, mb: 3 }}>
                        <Card sx={{ bgcolor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                          <CardContent sx={{ py: 1 }}>
                            <Typography color="#94a3b8" variant="caption">Sessions Reviewed</Typography>
                            <Typography color="#fff" variant="h6" fontWeight={700}>{sessionBreakdown.length}</Typography>
                          </CardContent>
                        </Card>
                        <Card sx={{ bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <CardContent sx={{ py: 1 }}>
                            <Typography color="#94a3b8" variant="caption">Post-Session Tasks</Typography>
                            <Typography color="#ef4444" variant="h6" fontWeight={700}>{sessionTaskCount}</Typography>
                          </CardContent>
                        </Card>
                        <Card sx={{ bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <CardContent sx={{ py: 1 }}>
                            <Typography color="#94a3b8" variant="caption">Detractors After Session</Typography>
                            <Typography color="#ef4444" variant="h6" fontWeight={700}>{sessionDetractors}</Typography>
                          </CardContent>
                        </Card>
                        <Card sx={{ bgcolor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <CardContent sx={{ py: 1 }}>
                            <Typography color="#94a3b8" variant="caption">Neutrals After Session</Typography>
                            <Typography color="#f59e0b" variant="h6" fontWeight={700}>{sessionNeutrals}</Typography>
                          </CardContent>
                        </Card>
                      </Box>
                      <TableContainer sx={{ border: '1px solid rgba(59,130,246,0.15)', borderRadius: 1 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#111827' }}>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>Session Date</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>Status</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>Total Tasks</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>Acc. Tasks</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>Acc. %</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>Detractors</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>Acc. Detractors</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>Neutrals</TableCell>
                                  </TableRow>
                          </TableHead>
                          <TableBody>
                            {sessionReachAnalytics.map((session, index) => (
                              <TableRow key={index} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                                <TableCell sx={{ color: '#e2e8f0' }}>{session.sessionDate}</TableCell>
                                <TableCell sx={{ color: '#94a3b8' }}>{sessionBreakdown[index]?.status || 'Completed'}</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>{session.total}</TableCell>
                                <TableCell sx={{ color: '#3b82f6', fontWeight: 700 }}>{session.reach}</TableCell>
                                <TableCell sx={{ color: '#3b82f6', fontWeight: 700 }}>{session.reachPct}%</TableCell>
                                <TableCell sx={{ color: '#ef4444', fontWeight: 700 }}>{sessionBreakdown[index]?.detractorsCount || 0}</TableCell>
                                <TableCell sx={{ color: '#ef4444', fontWeight: 700 }}>{session.reachDetractors}</TableCell>
                                <TableCell sx={{ color: '#f59e0b', fontWeight: 700 }}>{sessionBreakdown[index]?.neutralsCount || 0}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  ) : (
                    <Typography color="#94a3b8">No session breakdown data available for this team.</Typography>
                  )}
                </Box>
              )}

              {/* TAB 2: Detailed Analysis - Root Cause */}
              {detailTab === 2 && (
                <Box>
                  <Typography variant="h6" color="#fff" fontWeight={700} gutterBottom>
                    Detailed Task Analysis - Root Cause & Weakness Points
                  </Typography>
                  <Typography variant="body2" color="#94a3b8" sx={{ mb: 2 }}>
                    Root cause counts by reach ownership show which issues are still falling outside Reach-controlled tasks.
                  </Typography>

                  {rootCauseChartData.length > 0 ? (
                    <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 2 }}>
                      <Typography variant="subtitle2" color="#94a3b8" sx={{ mb: 1 }}>Root Cause Breakdown (Reach vs Non-Reach)</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={rootCauseChartData} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                          <XAxis dataKey="rootCause" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} height={80} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <RechartsTooltip wrapperStyle={{ backgroundColor: '#111827', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10 }} contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#fff' }} formatter={(value) => [value, 'Tasks']} />
                          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '0.85rem' }} />
                          <Bar dataKey="reach" name="Team Accountable" fill="#3b82f6" stackId="a" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="nonReach" name="Non-Accountable" fill="#f59e0b" stackId="a" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Paper>
                  ) : (
                    <Typography color="#94a3b8" sx={{ mb: 3 }}>No root cause data available for the selected filters.</Typography>
                  )}

                  {/* Reach Ownership Summary */}
                  <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="#94a3b8" sx={{ mb: 2 }}>Reach Ownership Analysis</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, mb: 2 }}>
                      <Card sx={{ bgcolor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <CardContent sx={{ py: 1 }}>
                          <Typography color="#94a3b8" variant="caption">Total Tasks</Typography>
                          <Typography color="#fff" variant="h6" fontWeight={700}>{reachAnalytics.totalFilteredTasks}</Typography>
                        </CardContent>
                      </Card>
                      <Card sx={{ bgcolor: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
                        <CardContent sx={{ py: 1 }}>
                          <Typography color="#94a3b8" variant="caption">Team Accountable</Typography>
                          <Typography color="#3b82f6" variant="h6" fontWeight={700}>{reachAnalytics.filteredReachCount} ({reachAnalytics.filteredReachPct}%)</Typography>
                        </CardContent>
                      </Card>
                      <Card sx={{ bgcolor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}>
                        <CardContent sx={{ py: 1 }}>
                          <Typography color="#94a3b8" variant="caption">Non-Accountable Tasks</Typography>
                          <Typography color="#f59e0b" variant="h6" fontWeight={700}>{reachAnalytics.filteredNonReachCount} ({reachAnalytics.filteredNonReachPct}%)</Typography>
                        </CardContent>
                      </Card>
                      <Card sx={{ bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <CardContent sx={{ py: 1 }}>
                          <Typography color="#94a3b8" variant="caption">Acc. Detractors</Typography>
                          <Typography color="#ef4444" variant="h6" fontWeight={700}>{reachAnalytics.reachDetractors} ({reachAnalytics.reachDetractorsPct}%)</Typography>
                        </CardContent>
                      </Card>
                      <Card sx={{ bgcolor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <CardContent sx={{ py: 1 }}>
                          <Typography color="#94a3b8" variant="caption">Acc. Neutrals</Typography>
                          <Typography color="#f59e0b" variant="h6" fontWeight={700}>{reachAnalytics.reachNeutrals} ({reachAnalytics.reachNeutralsPct}%)</Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  </Paper>

                  {/* Advanced Filters */}
                  <Paper sx={{ p: 2, bgcolor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 2, mb: 2 }}>
                    <Stack spacing={2}>
                      <Typography variant="body2" fontWeight={700} color="#fff">Query & Filters</Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        {/* Evaluation Score Slider */}
                        <FormControl sx={{ flex: 1 }}>
                          <Typography variant="caption" color="#94a3b8">Evaluation Score Range</Typography>
                          <Box sx={{ px: 1, py: 1 }}>
                            <Slider
                              value={filterScore}
                              onChange={(e, newValue) => setFilterScore(newValue)}
                              min={0}
                              max={10}
                              step={0.5}
                              marks={[
                                { value: 0, label: '0' },
                                { value: 6, label: '6' },
                                { value: 8, label: '8' },
                                { value: 10, label: '10' }
                              ]}
                              valueLabelDisplay="auto"
                              range
                              sx={{
                                '& .MuiSlider-thumb': { bgcolor: '#3b82f6', '&:hover': { boxShadow: '0 0 0 8px rgba(59,130,246,0.16)' } },
                                '& .MuiSlider-track': { bgcolor: '#3b82f6' },
                                '& .MuiSlider-rail': { bgcolor: 'rgba(148,163,184,0.3)' }
                              }}
                            />
                            <Typography variant="caption" color="#94a3b8" sx={{ mt: 0.5 }}>
                              {`Showing: ${filterScore[0]} - ${filterScore[1]}`}
                            </Typography>
                          </Box>
                        </FormControl>

                        {/* Month Filter */}
                        <FormControl sx={{ minWidth: 140 }}>
                          <InputLabel sx={{ color: '#94a3b8' }}>Month</InputLabel>
                          <Select
                            value={filterMonth}
                            label="Month"
                            onChange={(e) => setFilterMonth(e.target.value)}
                            sx={{
                              color: '#fff',
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59,130,246,0.3)' },
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59,130,246,0.5)' },
                              '& .MuiSvgIcon-root': { color: '#94a3b8' }
                            }}
                          >
                            <MenuItem value="all">All Months</MenuItem>
                            {selectedTeamDetail.monthlyData?.map(m => (
                              <MenuItem key={m.month} value={m.month}>{m.month}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Sort By */}
                        <FormControl sx={{ minWidth: 140 }}>
                          <InputLabel sx={{ color: '#94a3b8' }}>Sort By</InputLabel>
                          <Select
                            value={sortBy}
                            label="Sort By"
                            onChange={(e) => setSortBy(e.target.value)}
                            sx={{
                              color: '#fff',
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59,130,246,0.3)' },
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59,130,246,0.5)' },
                              '& .MuiSvgIcon-root': { color: '#94a3b8' }
                            }}
                          >
                            <MenuItem value="date-desc">Newest First</MenuItem>
                            <MenuItem value="date-asc">Oldest First</MenuItem>
                            <MenuItem value="score-worst">Worst Scores</MenuItem>
                            <MenuItem value="score-best">Best Scores</MenuItem>
                          </Select>
                        </FormControl>

                        {/* Results Count */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', px: 1 }}>
                          <Typography variant="body2" color="#3b82f6" fontWeight={700}>
                            {filteredDetailedTasks.length} tasks
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>
                  </Paper>

                  {/* Detailed Tasks Table */}
                  <TableContainer sx={{ maxHeight: 450, border: '1px solid rgba(59,130,246,0.15)', borderRadius: 1 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#111827' }}>
                          <TableCell sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem' }}>Date</TableCell>
                          <TableCell sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem' }}>Score</TableCell>
                          <TableCell sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem' }}>Category</TableCell>
                          <TableCell sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem' }}>Reason</TableCell>
                          <TableCell sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem' }}>Sub-Reason</TableCell>
                          <TableCell sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem' }}>Root Cause</TableCell>
                          <TableCell sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem' }}>Owner</TableCell>
                          <TableCell sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem' }} align="center">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredDetailedTasks.length > 0 ? (
                          filteredDetailedTasks.map((task, idx) => (
                            <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                              <TableCell sx={{ color: '#e2e8f0', fontSize: '0.75rem' }}>
                                {task.date?.toLocaleDateString() || '-'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.75rem' }}>
                                <Chip
                                  label={`${task.evaluation}/10`}
                                  size="small"
                                  sx={{
                                    bgcolor: task.evaluation <= 6 ? 'rgba(239,68,68,0.2)' : task.evaluation <= 8 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                                    color: task.evaluation <= 6 ? '#ef4444' : task.evaluation <= 8 ? '#f59e0b' : '#10b981'
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ color: task.sentiment === 'Detractor' ? '#ef4444' : task.sentiment === 'Neutral' ? '#f59e0b' : '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                                {task.sentiment}
                              </TableCell>
                              <TableCell sx={{ color: '#e2e8f0', fontSize: '0.75rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <Tooltip title={task.reason}><span>{task.reason}</span></Tooltip>
                              </TableCell>
                              <TableCell sx={{ color: '#e2e8f0', fontSize: '0.75rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <Tooltip title={task.subReason}><span>{task.subReason}</span></Tooltip>
                              </TableCell>
                              <TableCell sx={{ color: '#e2e8f0', fontSize: '0.75rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', bgcolor: task.rootCause !== '-' ? 'rgba(239,68,68,0.1)' : 'transparent' }}>
                                <Tooltip title={task.rootCause}><span>{task.rootCause}</span></Tooltip>
                              </TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontSize: '0.75rem', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <Tooltip title={task.owner}><span>{task.owner}</span></Tooltip>
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.75rem' }} align="center">
                                <Tooltip title="View full task details">
                                  <Button
                                    size="small"
                                    variant="text"
                                    color="primary"
                                    onClick={() => handleViewTaskDetails(task)}
                                    sx={{ minWidth: 40, py: 0.5, px: 1, fontSize: '0.75rem' }}
                                  >
                                    <FaEye />
                                  </Button>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} align="center" sx={{ color: '#94a3b8', py: 3 }}>
                              No tasks match the selected filters
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(59,130,246,0.15)', p: 2 }}>
          <Button onClick={handleCloseSessionDetail} sx={{ color: '#94a3b8' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Details Dialog - same as /tasks-list page */}
      {selectedViewTask && (
        <TaskDetailsDialog
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setSelectedViewTask(null);
          }}
          tasks={[selectedViewTask]}
          teamName={selectedViewTask.teamName || 'Unknown Team'}
        />
      )}
    </Box>
  );
};

export default TeamViolationOverview;
