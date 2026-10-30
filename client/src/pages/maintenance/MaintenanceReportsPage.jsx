import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { Link as RouterLink, useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Button,
  Divider,
  TablePagination,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Stack,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
} from "@mui/material";
import {
  MdArrowBack,
  MdFileDownload,
  MdRefresh,
  MdDateRange,
  MdBarChart,
  MdExpandMore,
  MdSearch,
  MdClose,
  MdVisibility,
  MdEdit,
  MdAssignment,
  MdGroups,
  MdThumbUp,
  MdThumbDown,
  MdRemoveCircleOutline,
  MdWarningAmber,
  MdCheckCircle,
} from "react-icons/md";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  format,
  subWeeks,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from "date-fns";
import XLSX from "xlsx-js-style";
import { getTaskRcaRows } from "./maintenanceRca";

import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";
import AppDialog from "../../components/ui/AppDialog";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import MaintenanceTaskSheet from "./MaintenanceTaskSheet";
import MaintenanceTaskForm from "./MaintenanceTaskForm";
import { maintenanceApi, useMaintenanceTeams, errMsg } from "./maintenanceApi";
import { getCustomWeekRange } from "../../utils/helpers";

const DEFAULT_SETTINGS_STATE = { settings: {} };

const formatDuration = (start, end) => {
  if (!start || !end) return "—";
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return "—";
  const diffMs = e - s;
  const isNegative = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const totalMins = Math.round(absMs / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);

  const text = parts.join(" ");
  return isNegative ? `-${text}` : text;
};

const matchesRootCause = (row, filter) =>
  filter === "all" || (filter === "__none__" ? !row.hasRootCause : row.hasRootCause && row.rootCause === filter);

const MaintenanceReportsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { teamId: urlTeamId } = useParams();
  const navigate = useNavigate();
  const { settings } = useSelector((state) => state.settings || DEFAULT_SETTINGS_STATE);
  const { teams } = useMaintenanceTeams();

  // Active team selection: from URL or "all"
  const selectedTeamId = urlTeamId || "all";
  const selectedTeam = useMemo(
    () => (selectedTeamId !== "all" ? teams.find((t) => t._id === selectedTeamId) : null),
    [teams, selectedTeamId]
  );

  const [tasks, setTasks] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Default date filter to "all" so all tasks in the system are immediately visible by default
  const [dateFilter, setDateFilter] = useState({
    start: null,
    end: null,
    type: "all",
  });
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);

  // UI state
  const [breakdownOpen, setBreakdownOpen] = useState(true);
  const [allRootCausesOpen, setAllRootCausesOpen] = useState(true);
  const [teamsMatrixOpen, setTeamsMatrixOpen] = useState(true);
  const [matrixView, setMatrixView] = useState("all"); // all | worstPromoters | worstDvoc | withSamples
  const [matrixTop, setMatrixTop] = useState(0);
  const [hideNoSampleTeams, setHideNoSampleTeams] = useState(false);
  const [matrixSearch, setMatrixSearch] = useState("");
  const [drillDownState, setDrillDownState] = useState({
    open: false,
    title: "",
    tasks: [],
  });

  // Table & Paging state
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [fiberFilter, setFiberFilter] = useState("all");
  const [resolvedFilter, setResolvedFilter] = useState("all");
  const [ncfFilter, setNcfFilter] = useState("all");
  const [hcFilter, setHcFilter] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState("all"); // all | Yes | No | unset
  // RCA filters match within one RCA row (reason → sub-reason → root cause → owner cascade).
  const [rcaReasonFilter, setRcaReasonFilter] = useState("all");
  const [rcaSubReasonFilter, setRcaSubReasonFilter] = useState("all");
  const [rcaRootCauseFilter, setRcaRootCauseFilter] = useState("all"); // "__none__" = no root cause entered
  const [rcaOwnerFilter, setRcaOwnerFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Detail & Edit dialogs
  const [sheetId, setSheetId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  // Fetch all tasks and survey samples
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksRes, samplesRes] = await Promise.all([
        maintenanceApi.tasks.list({ limit: 10000 }),
        maintenanceApi.samples.list(),
      ]);
      setTasks(tasksRes.rows || []);
      setSamples(samplesRes || []);
    } catch (e) {
      setError(errMsg(e, "Failed to load maintenance analysis data"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Team switcher
  const handleTeamChange = (e) => {
    const val = e.target.value;
    if (val === "all") {
      navigate("/dvoc-maintenance/reports");
    } else {
      navigate(`/dvoc-maintenance/reports/${val}`);
    }
    setPage(0);
  };

  // 1. Filter tasks by selected team (if on a specific team page)
  const scopedTasks = useMemo(() => {
    if (selectedTeamId === "all") return tasks;
    return tasks.filter((t) => t.team?._id === selectedTeamId || t.team === selectedTeamId);
  }, [tasks, selectedTeamId]);

  // 2. Filter tasks by Date Filter
  const filteredTasks = useMemo(() => {
    if (dateFilter.type === "all" || (!dateFilter.start && !dateFilter.end)) {
      return scopedTasks;
    }
    const start = dateFilter.start ? startOfDay(new Date(dateFilter.start)) : null;
    const end = dateFilter.end ? endOfDay(new Date(dateFilter.end)) : null;

    return scopedTasks.filter((t) => {
      const dateVal = t.creationDate || t.faultDate || t.createdAt;
      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      if (start && end) {
        return isWithinInterval(d, { start, end });
      }
      if (start) return d >= start;
      if (end) return d <= end;
      return true;
    });
  }, [scopedTasks, dateFilter]);

  // 3. Filter survey samples by scope and date
  const filteredSamples = useMemo(() => {
    let list = samples;
    if (selectedTeamId !== "all") {
      list = list.filter((s) => s.team?._id === selectedTeamId || s.team === selectedTeamId);
    }
    if (dateFilter.type === "thisMonth") {
      const now = new Date();
      return list.filter((s) => s.year === now.getFullYear() && s.month === now.getMonth() + 1);
    }
    if (dateFilter.type === "lastMonth") {
      const lm = subMonths(new Date(), 1);
      return list.filter((s) => s.year === lm.getFullYear() && s.month === lm.getMonth() + 1);
    }
    if (dateFilter.type !== "all" && dateFilter.start && dateFilter.end) {
      const startYear = new Date(dateFilter.start).getFullYear();
      const startMonth = new Date(dateFilter.start).getMonth() + 1;
      const endYear = new Date(dateFilter.end).getFullYear();
      const endMonth = new Date(dateFilter.end).getMonth() + 1;
      return list.filter((s) => {
        const sampleVal = s.year * 12 + s.month;
        const startVal = startYear * 12 + startMonth;
        const endVal = endYear * 12 + endMonth;
        return sampleVal >= startVal && sampleVal <= endVal;
      });
    }
    return list;
  }, [samples, selectedTeamId, dateFilter]);

  // Total Samples from survey samples pool
  const totalSamples = useMemo(() => {
    return filteredSamples.reduce((sum, s) => sum + (s.sampleSize || 0), 0);
  }, [filteredSamples]);

  // Satisfaction & NPS Breakdown
  // - Detractors: evaluation score 1 - 6
  // - Neutrals: evaluation score 7 - 8
  // - Non-promoters: Detractors + Neutrals (registered tasks with score 1-8)
  // - Promoters: totalSamples - nonPromoters
  const detractorsList = useMemo(() => {
    return filteredTasks.filter(
      (t) => t.evaluationScore !== null && Number(t.evaluationScore) >= 1 && Number(t.evaluationScore) <= 6
    );
  }, [filteredTasks]);

  const neutralsList = useMemo(() => {
    return filteredTasks.filter(
      (t) => t.evaluationScore !== null && Number(t.evaluationScore) >= 7 && Number(t.evaluationScore) <= 8
    );
  }, [filteredTasks]);

  const highRatedList = useMemo(() => {
    return filteredTasks.filter(
      (t) => t.evaluationScore !== null && Number(t.evaluationScore) >= 9
    );
  }, [filteredTasks]);

  const detractorsCount = detractorsList.length;
  const neutralsCount = neutralsList.length;
  const nonPromotersCount = detractorsCount + neutralsCount;

  // Promoters = Remaining from sample pool (or explicit score 9-10 tasks)
  const promotersCount = useMemo(() => {
    if (totalSamples > 0) {
      return Math.max(0, totalSamples - nonPromotersCount);
    }
    return highRatedList.length;
  }, [totalSamples, nonPromotersCount, highRatedList]);

  const sampleBase = totalSamples > 0 ? totalSamples : nonPromotersCount + highRatedList.length;

  const promoterRate = sampleBase > 0 ? ((promotersCount / sampleBase) * 100).toFixed(1) : "0.0";
  const detractorRate = sampleBase > 0 ? ((detractorsCount / sampleBase) * 100).toFixed(1) : "0.0";
  const neutralRate = sampleBase > 0 ? ((neutralsCount / sampleBase) * 100).toFixed(1) : "0.0";
  const nonPromoterRate = sampleBase > 0 ? ((nonPromotersCount / sampleBase) * 100).toFixed(1) : "0.0";

  // Task & RCA KPIs
  const totalTasks = filteredTasks.length;

  // Only RCA rows with an entered root cause count as identified issues.
  const totalIssues = useMemo(() => {
    return filteredTasks.reduce((acc, t) => acc + getTaskRcaRows(t).filter((r) => r.hasRootCause).length, 0);
  }, [filteredTasks]);

  const rcaRowsWithoutRootCause = useMemo(() => {
    return filteredTasks.reduce((acc, t) => acc + getTaskRcaRows(t).filter((r) => !r.hasRootCause).length, 0);
  }, [filteredTasks]);

  const resolvedTasks = useMemo(() => {
    return filteredTasks.filter(
      (t) => t.resolvedAfterVisit === "Yes" || t.status === "Closed"
    ).length;
  }, [filteredTasks]);

  const resolvedRate = totalTasks > 0 ? ((resolvedTasks / totalTasks) * 100).toFixed(1) : "0.0";

  const ncfTasks = useMemo(() => {
    return filteredTasks.filter((t) => Boolean(t.ncf)).length;
  }, [filteredTasks]);

  const ncfRate = totalTasks > 0 ? ((ncfTasks / totalTasks) * 100).toFixed(1) : "0.0";

  const hcTasks = useMemo(() => {
    return filteredTasks.filter((t) => Boolean(t.hcResponsibility)).length;
  }, [filteredTasks]);

  const hcRate = totalTasks > 0 ? ((hcTasks / totalTasks) * 100).toFixed(1) : "0.0";

  const ftthwTasks = useMemo(() => {
    return filteredTasks.filter((t) => t.fiberCategory === "FTTHW").length;
  }, [filteredTasks]);

  const ftthnTasks = useMemo(() => {
    return filteredTasks.filter((t) => t.fiberCategory === "FTTHN").length;
  }, [filteredTasks]);

  // ALL Root Causes extraction (no slice limit)
  const allRootCausesList = useMemo(() => {
    const rcMap = {};
    filteredTasks.forEach((t) => {
      const rcas = getTaskRcaRows(t).filter((r) => r.hasRootCause);
      rcas.forEach((r) => {
        const rc = (r.rootCause || "Unknown").trim();
        const reason = (r.reason || "Unknown").trim();
        const owner = (r.responsible || "Unknown").trim();
        if (!rcMap[rc]) {
          rcMap[rc] = { rootCause: rc, count: 0, reasons: new Set(), owners: new Set(), tasks: [] };
        }
        rcMap[rc].count++;
        rcMap[rc].reasons.add(reason);
        rcMap[rc].owners.add(owner);
        if (!rcMap[rc].tasks.some((existing) => existing._id === t._id)) {
          rcMap[rc].tasks.push(t);
        }
      });
    });

    return Object.values(rcMap)
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item,
        percentage: totalIssues > 0 ? ((item.count / totalIssues) * 100).toFixed(1) : "0.0",
        reasonsStr: Array.from(item.reasons).join(", "),
        ownersStr: Array.from(item.owners).join(", "),
      }));
  }, [filteredTasks, totalIssues]);

  // Generic category helper (shows all items or top K if specified)
  const getCategoryStats = useCallback(
    (field) => {
      const counts = {};
      filteredTasks.forEach((t) => {
        if (field === "fiberCategory") {
          const val = t.fiberCategory ? (t.fiberCategory === "FTTHW" ? "FTTHW (Working)" : "FTTHN (Not working)") : "Not specified";
          counts[val] = (counts[val] || 0) + 1;
          return;
        }
        if (field === "faultType") {
          const val = (t.faultType || "Not specified").trim();
          counts[val] = (counts[val] || 0) + 1;
          return;
        }

        const rcaRows = getTaskRcaRows(t);
        rcaRows.forEach((row) => {
          const val = (row[field] || "Unknown").trim();
          counts[val] = (counts[val] || 0) + 1;
        });
      });

      const totalCount = Object.values(counts).reduce((acc, curr) => acc + curr, 0);

      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
        }));
    },
    [filteredTasks]
  );

  const allReasons = useMemo(() => getCategoryStats("reason"), [getCategoryStats]);
  const allSubReasons = useMemo(() => getCategoryStats("subReason"), [getCategoryStats]);
  const allOwners = useMemo(() => getCategoryStats("responsible"), [getCategoryStats]);
  const allFaultTypes = useMemo(() => getCategoryStats("faultType"), [getCategoryStats]);
  const fiberCategories = useMemo(() => getCategoryStats("fiberCategory"), [getCategoryStats]);

  // Teams Analysis Matrix (Performance table across all teams)
  const teamsMatrix = useMemo(() => {
    const map = {};
    teams.forEach((t) => {
      map[t._id] = {
        _id: t._id,
        teamName: t.teamName,
        teamCode: t.teamCode || "-",
        company: t.company || "-",
        supervisor: t.supervisor || "-",
        status: t.status,
        samples: 0,
        tasks: 0,
        detractors: 0,
        neutrals: 0,
        highRated: 0,
        resolved: 0,
        issues: 0,
        ncf: 0,
        hc: 0,
      };
    });

    // Populate samples
    filteredSamples.forEach((s) => {
      const tid = s.team?._id || s.team;
      if (map[tid]) {
        map[tid].samples += s.sampleSize || 0;
      }
    });

    // Populate tasks
    filteredTasks.forEach((t) => {
      const tid = t.team?._id || t.team;
      if (!map[tid]) {
        map[tid] = {
          _id: tid,
          teamName: t.team?.teamName || "Unassigned",
          teamCode: t.team?.teamCode || "-",
          company: "-",
          supervisor: "-",
          status: "Active",
          samples: 0,
          tasks: 0,
          detractors: 0,
          neutrals: 0,
          highRated: 0,
          resolved: 0,
          issues: 0,
          ncf: 0,
          hc: 0,
        };
      }
      const entry = map[tid];
      entry.tasks++;
      entry.issues += getTaskRcaRows(t).filter((r) => r.hasRootCause).length;
      if (t.resolvedAfterVisit === "Yes" || t.status === "Closed") entry.resolved++;
      if (t.ncf) entry.ncf++;
      if (t.hcResponsibility) entry.hc++;

      if (t.evaluationScore !== null) {
        const sc = Number(t.evaluationScore);
        if (sc >= 1 && sc <= 6) entry.detractors++;
        else if (sc >= 7 && sc <= 8) entry.neutrals++;
        else if (sc >= 9) entry.highRated++;
      }
    });

    return Object.values(map)
      .map((t) => {
        const nonPromoters = t.detractors + t.neutrals;
        // Percentages need real survey samples; teams without any get no % (not a misleading 0% / 100%).
        const hasSamples = t.samples > 0;
        const totalSamp = hasSamples ? t.samples : nonPromoters + t.highRated;
        const promoters = hasSamples ? Math.max(0, t.samples - nonPromoters) : t.highRated;
        const promoterPct = hasSamples ? +((promoters / t.samples) * 100).toFixed(1) : null;
        // DVOC % = DVOC cases (maintenance tasks) per survey sample.
        const dvocPct = hasSamples ? +((t.tasks / t.samples) * 100).toFixed(1) : null;
        const resolvedPct = t.tasks > 0 ? ((t.resolved / t.tasks) * 100).toFixed(1) : "0.0";
        const ncfPct = t.tasks > 0 ? ((t.ncf / t.tasks) * 100).toFixed(1) : "0.0";

        return {
          ...t,
          promoters,
          nonPromoters,
          effectiveSamples: totalSamp,
          hasSamples,
          promoterPct,
          dvocPct,
          resolvedPct,
          ncfPct,
        };
      })
      .sort((a, b) => b.tasks - a.tasks || b.effectiveSamples - a.effectiveSamples);
  }, [teams, filteredSamples, filteredTasks]);

  // Team performance filters (combinable): a ranking view, Top N, hide teams without samples, search.
  const displayedTeams = useMemo(() => {
    const needle = matrixSearch.trim().toLowerCase();
    const needsSamples = hideNoSampleTeams || matrixView !== "all";
    let list = teamsMatrix.filter(
      (t) =>
        (!needsSamples || t.hasSamples) &&
        (!needle || [t.teamName, t.teamCode, t.supervisor].some((x) => String(x || "").toLowerCase().includes(needle)))
    );
    if (matrixView === "worstPromoters") list = [...list].sort((a, b) => a.promoterPct - b.promoterPct || b.samples - a.samples);
    else if (matrixView === "worstDvoc") list = [...list].sort((a, b) => b.dvocPct - a.dvocPct || b.tasks - a.tasks);
    else if (matrixView === "withSamples") list = [...list].sort((a, b) => b.samples - a.samples);
    return matrixTop ? list.slice(0, matrixTop) : list;
  }, [teamsMatrix, matrixView, matrixTop, hideNoSampleTeams, matrixSearch]);

  // Drill-down handler
  const handleDrillDown = (category, value) => {
    let drillTasks = [];
    if (category === "reason") {
      drillTasks = filteredTasks.filter((t) =>
        getTaskRcaRows(t).some((r) => r.reason.toLowerCase() === value.toLowerCase())
      );
    } else if (category === "subReason") {
      drillTasks = filteredTasks.filter((t) =>
        getTaskRcaRows(t).some((r) => r.subReason.toLowerCase() === value.toLowerCase())
      );
    } else if (category === "rootCause") {
      drillTasks = filteredTasks.filter((t) =>
        getTaskRcaRows(t).some((r) => r.rootCause.toLowerCase() === value.toLowerCase())
      );
    } else if (category === "responsible") {
      drillTasks = filteredTasks.filter((t) =>
        getTaskRcaRows(t).some((r) => r.responsible.toLowerCase() === value.toLowerCase())
      );
    } else if (category === "faultType") {
      drillTasks = filteredTasks.filter((t) => (t.faultType || "Not specified") === value);
    } else if (category === "fiberCategory") {
      if (value.startsWith("FTTHW")) {
        drillTasks = filteredTasks.filter((t) => t.fiberCategory === "FTTHW");
      } else if (value.startsWith("FTTHN")) {
        drillTasks = filteredTasks.filter((t) => t.fiberCategory === "FTTHN");
      } else {
        drillTasks = filteredTasks.filter((t) => !t.fiberCategory);
      }
    } else if (category === "score") {
      if (value === "Detractor") {
        drillTasks = detractorsList;
      } else if (value === "Neutral") {
        drillTasks = neutralsList;
      } else if (value === "Promoter") {
        drillTasks = highRatedList;
      }
    }

    setDrillDownState({
      open: true,
      title: `${category.toUpperCase()}: ${value}`,
      tasks: drillTasks,
    });
  };

  // RCA filter options come from the period's RCA rows, each narrowed by the filters before it.
  const rcaFilterOptions = useMemo(() => {
    const rows = filteredTasks.flatMap(getTaskRcaRows);
    const uniq = (list, field, current) => {
      const values = new Set(list.map((r) => r[field]));
      if (current !== "all") values.add(current); // keep a stale selection visible
      return [...values].sort((a, b) => a.localeCompare(b));
    };
    const byReason = rows.filter((r) => rcaReasonFilter === "all" || r.reason === rcaReasonFilter);
    const bySub = byReason.filter((r) => rcaSubReasonFilter === "all" || r.subReason === rcaSubReasonFilter);
    const byRoot = bySub.filter((r) => matchesRootCause(r, rcaRootCauseFilter));
    return {
      reasons: uniq(rows, "reason", rcaReasonFilter),
      subReasons: uniq(byReason, "subReason", rcaSubReasonFilter),
      rootCauses: uniq(bySub.filter((r) => r.hasRootCause), "rootCause", rcaRootCauseFilter === "__none__" ? "all" : rcaRootCauseFilter),
      hasMissingRootCause: bySub.some((r) => !r.hasRootCause),
      owners: uniq(byRoot, "responsible", rcaOwnerFilter),
    };
  }, [filteredTasks, rcaReasonFilter, rcaSubReasonFilter, rcaRootCauseFilter, rcaOwnerFilter]);

  const rcaFiltersActive = [rcaReasonFilter, rcaSubReasonFilter, rcaRootCauseFilter, rcaOwnerFilter].some((f) => f !== "all");

  const clearRcaFilters = () => {
    setRcaReasonFilter("all");
    setRcaSubReasonFilter("all");
    setRcaRootCauseFilter("all");
    setRcaOwnerFilter("all");
    setPage(0);
  };

  // Filtered task register
  const tableFilteredTasks = useMemo(() => {
    return filteredTasks.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        const slid = (t.slid || "").toLowerCase();
        const num = (t.taskNumber || "").toLowerCase();
        const ticket = (t.ticketNumber || "").toLowerCase();
        const cust = (t.customerName || "").toLowerCase();
        const phone = (t.contactNumber || "").toLowerCase();
        const complaint = (t.customerComplaint || "").toLowerCase();
        const teamName = (t.team?.teamName || "").toLowerCase();
        const rcaMatch = getTaskRcaRows(t).some(
          (r) =>
            r.reason.toLowerCase().includes(q) ||
            r.subReason.toLowerCase().includes(q) ||
            r.rootCause.toLowerCase().includes(q) ||
            r.responsible.toLowerCase().includes(q)
        );

        if (
          !slid.includes(q) &&
          !num.includes(q) &&
          !ticket.includes(q) &&
          !cust.includes(q) &&
          !phone.includes(q) &&
          !complaint.includes(q) &&
          !teamName.includes(q) &&
          !rcaMatch
        ) {
          return false;
        }
      }

      if (teamFilter !== "all" && t.team?._id !== teamFilter && t.team !== teamFilter) {
        return false;
      }
      if (fiberFilter !== "all" && t.fiberCategory !== fiberFilter) {
        return false;
      }
      if (resolvedFilter !== "all") {
        const isResolved = t.resolvedAfterVisit === "Yes" || t.status === "Closed";
        if (resolvedFilter === "yes" && !isResolved) return false;
        if (resolvedFilter === "no" && isResolved) return false;
      }
      if (ncfFilter !== "all") {
        if (ncfFilter === "yes" && !t.ncf) return false;
        if (ncfFilter === "no" && t.ncf) return false;
      }
      if (hcFilter !== "all") {
        if (hcFilter === "yes" && !t.hcResponsibility) return false;
        if (hcFilter === "no" && t.hcResponsibility) return false;
      }
      if (followUpFilter !== "all") {
        if (followUpFilter === "unset" ? Boolean(t.customerFollowUp) : t.customerFollowUp !== followUpFilter) return false;
      }
      if (
        rcaFiltersActive &&
        !getTaskRcaRows(t).some(
          (r) =>
            (rcaReasonFilter === "all" || r.reason === rcaReasonFilter) &&
            (rcaSubReasonFilter === "all" || r.subReason === rcaSubReasonFilter) &&
            matchesRootCause(r, rcaRootCauseFilter) &&
            (rcaOwnerFilter === "all" || r.responsible === rcaOwnerFilter)
        )
      ) {
        return false;
      }
      if (scoreFilter !== "all") {
        const score = t.evaluationScore !== null ? Number(t.evaluationScore) : null;
        if (scoreFilter === "detractor" && (score === null || score < 1 || score > 6)) return false;
        if (scoreFilter === "neutral" && (score === null || score < 7 || score > 8)) return false;
        if (scoreFilter === "promoter" && (score === null || score < 9)) return false;
        if (scoreFilter === "nonPromoter" && (score === null || score < 1 || score > 8)) return false;
      }

      return true;
    });
  }, [filteredTasks, search, teamFilter, fiberFilter, resolvedFilter, ncfFilter, hcFilter, followUpFilter, rcaFiltersActive, rcaReasonFilter, rcaSubReasonFilter, rcaRootCauseFilter, rcaOwnerFilter, scoreFilter]);

  const paginatedTasks = useMemo(() => {
    return tableFilteredTasks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [tableFilteredTasks, page, rowsPerPage]);

  // MiniTable component
  const MiniTable = ({ title, data, color, category }) => (
    <Box
      sx={{
        backgroundColor: "var(--surface)",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color }}>{title}</Typography>
        <Typography sx={{ fontSize: 11, color: "var(--text-muted)" }}>
          {data.length} items · {data.reduce((a, b) => a + b.count, 0)} total
        </Typography>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, maxHeight: 320, overflowY: "auto", pr: 0.5 }}>
        {data.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: "var(--text-muted)", py: 1, textAlign: "center" }}>
            No records in period
          </Typography>
        ) : (
          data.map((item, i) => (
            <Box
              key={i}
              onClick={() => handleDrillDown(category, item.name)}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.25,
                p: 0.5,
                borderRadius: "4px",
                cursor: "pointer",
                "&:hover": { backgroundColor: "var(--overlay-subtle)" },
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text)",
                    maxWidth: "75%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={item.name}
                >
                  {item.name}
                </Typography>
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)" }}>
                  {item.count} ({item.percentage}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, item.percentage)}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "var(--border)",
                  "& .MuiLinearProgress-bar": { backgroundColor: color, borderRadius: 2 },
                }}
              />
            </Box>
          ))
        )}
      </Box>
    </Box>
  );

  // -------------------------------------------------------------
  // EXCEL EXPORT (Overall or Team specific)
  // -------------------------------------------------------------
  const exportToExcel = async () => {
    setExporting(true);
    try {
      let periodStr = "All Time";
      let periodStart = "";
      let periodEnd = "";

      if (dateFilter.type !== "all" && dateFilter.start && dateFilter.end) {
        try {
          periodStr = `${format(new Date(dateFilter.start), "dd/MM/yyyy")} - ${format(new Date(dateFilter.end), "dd/MM/yyyy")}`;
          periodStart = format(new Date(dateFilter.start), "ddMMyyyy");
          periodEnd = format(new Date(dateFilter.end), "ddMMyyyy");
        } catch {
          periodStr = "Custom Period";
        }
      } else if (filteredTasks.length > 0) {
        const dates = filteredTasks
          .map((t) => (t.creationDate || t.faultDate || t.createdAt ? new Date(t.creationDate || t.faultDate || t.createdAt) : null))
          .filter(Boolean)
          .sort((a, b) => a - b);
        if (dates.length > 0) {
          periodStr = `${format(dates[0], "dd/MM/yyyy")} - ${format(dates[dates.length - 1], "dd/MM/yyyy")}`;
          periodStart = format(dates[0], "ddMMyyyy");
          periodEnd = format(dates[dates.length - 1], "ddMMyyyy");
        }
      }

      const teamNamePrefix = selectedTeam ? `${selectedTeam.teamName} - ` : "";
      const getExportFileName = () => {
        const now = new Date();
        const exportDate = format(now, "ddMMyyyy");
        if (!periodStart || !periodEnd) {
          return `${teamNamePrefix}Maintenance RCA & Quality Report - ${exportDate}.xlsx`;
        }
        return `${teamNamePrefix}Maintenance RCA & Quality Report - ${exportDate}-${periodStart}to${periodEnd}.xlsx`;
      };

      const workbook = XLSX.utils.book_new();

      const applyHeaderStyle = (ws, range, bg = "1F2937", color = "FFFFFF") => {
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) continue;
            ws[cellAddress].s = {
              font: { bold: true, color: { rgb: color } },
              fill: { fgColor: { rgb: bg } },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } },
              },
            };
          }
        }
      };

      const applyDataRowStyle = (ws, range) => {
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) continue;
            ws[cellAddress].s = {
              alignment: { vertical: "center" },
              border: { bottom: { style: "thin", color: { rgb: "E5E7EB" } } },
            };
          }
        }
      };

      const fixSheetRange = (ws) => {
        const cells = Object.keys(ws).filter((k) => k[0] !== "!");
        if (cells.length === 0) return;
        const range = { s: { r: 1000000, c: 1000000 }, e: { r: 0, c: 0 } };
        cells.forEach((addr) => {
          const c = XLSX.utils.decode_cell(addr);
          if (c.r < range.s.r) range.s.r = c.r;
          if (c.r > range.e.r) range.e.r = c.r;
          if (c.c < range.s.c) range.s.c = c.c;
          if (c.c > range.e.c) range.e.c = c.c;
        });
        ws["!ref"] = XLSX.utils.encode_range(range);
      };

      const thinBorder = {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } },
      };
      const doubleBottomBorder = {
        top: { style: "thin", color: { rgb: "9CA3AF" } },
        bottom: { style: "double", color: { rgb: "111827" } },
        left: { style: "thin", color: { rgb: "9CA3AF" } },
        right: { style: "thin", color: { rgb: "9CA3AF" } },
      };

      // SHEET 1: Executive Summary (With Promoters, Neutrals, Detractors)
      const todoCount = filteredTasks.filter((t) => t.status === "Todo").length;
      const inProgressCount = filteredTasks.filter((t) => t.status === "In Progress").length;
      const closedCount = filteredTasks.filter((t) => t.status === "Closed").length;

      const summaryData = [
        [`MAINTENANCE QUALITY & ROOT CAUSE ANALYSIS${selectedTeam ? ` - ${selectedTeam.teamName}` : ""}`, "", "", ""],
        [`Reported Period: ${periodStr}  |  Export Date: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, "", "", ""],
        ["", "", "", ""],
        ["SURVEY SAMPLES & CUSTOMER SATISFACTION ANALYSIS", "", "", ""],
        ["Performance Indicator", "Value", "Rate / Share", "Operational Status & Definition"],
        ["Total Survey Samples", sampleBase, "100.0%", "Sample pool token from survey entries"],
        ["Promoters (Score 9-10 / Balance)", promotersCount, `${promoterRate}%`, "Satisfied customers / balance of samples"],
        ["Neutrals (Score 7-8)", neutralsCount, `${neutralRate}%`, "Average satisfaction (requires review)"],
        ["Detractors (Score 1-6)", detractorsCount, `${detractorRate}%`, "Dissatisfied customers (critical attention)"],
        ["Non-Promoters Total (Score 1-8)", nonPromotersCount, `${nonPromoterRate}%`, "Tasks registered for quality processing"],
        ["", "", "", ""],
        ["OPERATIONAL METRICS & RCA VOLUME", "", "", ""],
        ["Metric", "Value", "Rate / Share", "Notes"],
        ["Total Maintenance Tasks", totalTasks, "100.0%", "All maintenance tasks recorded in period"],
        ["Total RCA Issues Logged", totalIssues, "-", "Root causes & technical issues identified"],
        ["Resolved After Visit", resolvedTasks, `${resolvedRate}%`, "Successfully resolved after team visit"],
        ["New Connection Faults (NCF ≤ 1M)", ncfTasks, `${ncfRate}%`, "Ticket created within 31 days from install"],
        ["HC Responsibility Faults", hcTasks, `${hcRate}%`, "High-level / Home Care accountability"],
        ["Fiber is Working (FTTHW)", ftthwTasks, `${((ftthwTasks / Math.max(1, totalTasks)) * 100).toFixed(1)}%`, "Customer complaint with active fiber link"],
        ["Fiber Not Working (FTTHN)", ftthnTasks, `${((ftthnTasks / Math.max(1, totalTasks)) * 100).toFixed(1)}%`, "Total fiber service outage"],
        ["", "", "", ""],
        ["WORKFLOW LIFECYCLE", "", "", ""],
        ["Status", "Task Count", "Share", "Notes"],
        ["Todo (Pending)", todoCount, `${((todoCount / Math.max(1, totalTasks)) * 100).toFixed(1)}%`, "Awaiting action"],
        ["In Progress", inProgressCount, `${((inProgressCount / Math.max(1, totalTasks)) * 100).toFixed(1)}%`, "Active troubleshooting"],
        ["Closed", closedCount, `${((closedCount / Math.max(1, totalTasks)) * 100).toFixed(1)}%`, "Visit completed"],
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      if (!wsSummary["!merges"]) wsSummary["!merges"] = [];
      wsSummary["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });
      wsSummary["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 3 } });
      wsSummary["!merges"].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 3 } });
      wsSummary["!merges"].push({ s: { r: 11, c: 0 }, e: { r: 11, c: 3 } });
      wsSummary["!merges"].push({ s: { r: 21, c: 0 }, e: { r: 21, c: 3 } });

      if (wsSummary["A1"]) {
        wsSummary["A1"].s = {
          font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1E3A8A" } },
          alignment: { horizontal: "left", vertical: "center", indent: 1 },
        };
      }
      applyHeaderStyle(wsSummary, { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } }, "374151");
      applyHeaderStyle(wsSummary, { s: { r: 12, c: 0 }, e: { r: 12, c: 3 } }, "374151");
      applyHeaderStyle(wsSummary, { s: { r: 22, c: 0 }, e: { r: 22, c: 3 } }, "374151");
      wsSummary["!cols"] = [{ wch: 42 }, { wch: 18 }, { wch: 18 }, { wch: 44 }];
      fixSheetRange(wsSummary);

      // SHEET 2: ALL Root Causes (Full Table)
      const allRcaExportData = allRootCausesList.map((r, i) => ({
        "Rank #": i + 1,
        "Root Cause": r.rootCause,
        "Occurrences (Cases)": r.count,
        "% of Total Issues": `${r.percentage}%`,
        "Associated Reasons": r.reasonsStr,
        "Responsible Owners": r.ownersStr,
      }));

      const wsRcaAll = XLSX.utils.aoa_to_sheet([[`ALL ROOT CAUSES BREAKDOWN - Period: ${periodStr}`]]);
      wsRcaAll["A1"].s = {
        font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E3A8A" } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
      };
      if (!wsRcaAll["!merges"]) wsRcaAll["!merges"] = [];
      wsRcaAll["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
      XLSX.utils.sheet_add_json(wsRcaAll, allRcaExportData, { origin: "A3", skipHeader: false });
      applyHeaderStyle(wsRcaAll, { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, "374151");
      wsRcaAll["!cols"] = [{ wch: 10 }, { wch: 35 }, { wch: 22 }, { wch: 18 }, { wch: 30 }, { wch: 25 }];
      fixSheetRange(wsRcaAll);

      // SHEET 3: Teams Matrix (All 25 teams summary)
      const wsTeams = XLSX.utils.aoa_to_sheet([[`MAINTENANCE TEAMS PERFORMANCE MATRIX - Period: ${periodStr}`]]);
      wsTeams["A1"].s = {
        font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
      };
      if (!wsTeams["!merges"]) wsTeams["!merges"] = [];
      wsTeams["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } });

      const teamExportRows = teamsMatrix.map((t) => ({
        "Team Name": t.teamName,
        "Team Code": t.teamCode,
        Status: t.status,
        "Survey Samples": t.samples,
        Promoters: t.promoters,
        "Promoter %": t.promoterPct == null ? "—" : `${t.promoterPct}%`,
        Neutrals: t.neutrals,
        Detractors: t.detractors,
        DVOC: t.tasks,
        "DVOC %": t.dvocPct == null ? "—" : `${t.dvocPct}%`,
        "Resolved Tasks": t.resolved,
        "Resolved %": `${t.resolvedPct}%`,
        "Total RCA Issues": t.issues,
        "NCF Tasks (≤1M)": t.ncf,
      }));
      XLSX.utils.sheet_add_json(wsTeams, teamExportRows, { origin: "A3", skipHeader: false });
      applyHeaderStyle(wsTeams, { s: { r: 2, c: 0 }, e: { r: 2, c: 13 } }, "374151");
      wsTeams["!cols"] = Array(14).fill({ wch: 16 });
      wsTeams["!cols"][0] = { wch: 28 };
      fixSheetRange(wsTeams);

      // SHEET 4: Raw Data
      let maxTaskRcas = 3;
      filteredTasks.forEach((t) => {
        const len = getTaskRcaRows(t).length;
        if (len > maxTaskRcas) maxTaskRcas = len;
      });

      const rawRows = filteredTasks.map((t) => {
        const rcas = getTaskRcaRows(t);
        const score = t.evaluationScore !== null && t.evaluationScore !== undefined ? t.evaluationScore : "-";
        let classification = "-";
        if (score !== "-") {
          const sc = Number(score);
          if (sc <= 6) classification = "Detractor (1-6)";
          else if (sc <= 8) classification = "Neutral (7-8)";
          else classification = "Promoter (9-10)";
        }

        const reportingDate = t.faultDate ? format(new Date(t.faultDate), "dd/MM/yyyy HH:mm") : "-";
        const creationDate = t.creationDate || t.createdAt ? format(new Date(t.creationDate || t.createdAt), "dd/MM/yyyy HH:mm") : "-";
        const clearanceDate = t.dueDate || t.closedAt ? format(new Date(t.dueDate || t.closedAt), "dd/MM/yyyy HH:mm") : "-";
        const interviewDate = t.interviewDate ? format(new Date(t.interviewDate), "dd/MM/yyyy HH:mm") : "-";

        const diffRepToCreate = formatDuration(t.faultDate, t.creationDate || t.createdAt);
        const diffRepToClose = formatDuration(t.faultDate, t.dueDate || t.closedAt);
        const diffCreateToClose = formatDuration(t.creationDate || t.createdAt, t.dueDate || t.closedAt);
        const diffCloseToInterview = formatDuration(t.dueDate || t.closedAt, t.interviewDate);

        const row = {
          "Task #": t.taskNumber || "-",
          "SLID (Tel no)": t.slid || "-",
          "Trouble Ticket #": t.ticketNumber || "-",
          "Satisfaction Score": score,
          Classification: classification,
          "Customer Name": t.customerName || "-",
          "Contact Number": t.contactNumber || "-",
          "Customer Complaint": t.customerComplaint || "-",
          "Fiber Category": t.fiberCategory ? (t.fiberCategory === "FTTHW" ? "FTTHW (Working)" : "FTTHN (Not working)") : "Not specified",
          "Team Name": t.team?.teamName || "Unassigned",
          "Team Code": t.team?.teamCode || "-",
          Governorate: t.governorate || "-",
          District: t.district || "-",
          "Fault Type": t.faultType || "-",
          "Resolved After Visit": t.resolvedAfterVisit || "Not specified",
          "NCF (≤ 1 Month)": t.ncf ? "Yes" : "No",
          "HC Responsibility": t.hcResponsibility ? "Yes" : "No",
          "Customer Follow-up": t.customerFollowUp || "Not recorded",
          Status: t.status || "-",
          Priority: t.priority || "Medium",
          "Customer Feedback": t.customerFeedback || "-",
          "Team Feedback": t.teamFeedback || "-",
          "Reporting Date": reportingDate,
          "Creation Date": creationDate,
          "Clearance Date": clearanceDate,
          "Interview Date": interviewDate,
          "Diff: Reporting -> Creation": diffRepToCreate,
          "Diff: Reporting -> Close": diffRepToClose,
          "Diff: Creation -> Close": diffCreateToClose,
          "Diff: Close -> Interview": diffCloseToInterview,
        };

        for (let i = 0; i < maxTaskRcas; i++) {
          const r = rcas[i] || {};
          row[`Reason ${i + 1}`] = r.reason || "-";
          row[`Sub-Reason ${i + 1}`] = r.subReason || "-";
          row[`Root Cause ${i + 1}`] = r.hasRootCause ? r.rootCause : "-";
          row[`Owner ${i + 1}`] = r.responsible || "-";
          row[`Team Accountable ${i + 1}`] = r.teamAccountability || "-";
        }
        return row;
      });

      const rawLastCol = Object.keys(rawRows[0] || {}).length - 1;
      const wsRaw = XLSX.utils.aoa_to_sheet([[`RAW DATA - Period: ${periodStr}`]]);
      wsRaw["A1"].s = {
        font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0F172A" } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 },
      };
      if (!wsRaw["!merges"]) wsRaw["!merges"] = [];
      wsRaw["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: rawLastCol } });
      XLSX.utils.sheet_add_json(wsRaw, rawRows, { origin: "A3", skipHeader: false });
      applyHeaderStyle(wsRaw, { s: { r: 2, c: 0 }, e: { r: 2, c: rawLastCol } }, "374151");
      wsRaw["!cols"] = Array(rawLastCol + 1).fill({ wch: 18 });
      wsRaw["!cols"][0] = { wch: 18 };
      wsRaw["!cols"][1] = { wch: 18 };
      wsRaw["!cols"][5] = { wch: 24 };
      wsRaw["!cols"][7] = { wch: 30 };
      fixSheetRange(wsRaw);

      // Append sheets
      XLSX.utils.book_append_sheet(workbook, wsSummary, "Executive Summary");
      XLSX.utils.book_append_sheet(workbook, wsRcaAll, "All Root Causes");
      XLSX.utils.book_append_sheet(workbook, wsTeams, "Team Performance");
      XLSX.utils.book_append_sheet(workbook, wsRaw, "Raw Data");

      XLSX.writeFile(workbook, getExportFileName());
    } catch (err) {
      console.error("Export to Excel failed:", err);
      alert("Failed to export Excel report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ mb: 4 }}>
        {/* Page Header */}
        <PageHeader
          title={selectedTeam ? `Team Analysis: ${selectedTeam.teamName}` : "DVOC Maintenance Quality & Root Cause Analysis"}
          description={
            selectedTeam
              ? `Dedicated team performance, satisfaction analysis, root causes and tasks for ${selectedTeam.teamName} (${selectedTeam.teamCode || "No code"}).`
              : "Overview analysis, customer satisfaction, all root causes, and per-team breakdowns for DVOC Maintenance."
          }
          actions={
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              {selectedTeam && (
                <Button
                  variant="outlined"
                  onClick={() => navigate("/dvoc-maintenance/reports")}
                  startIcon={<MdArrowBack />}
                >
                  All Teams Overview
                </Button>
              )}
              <Button
                variant="outlined"
                component={RouterLink}
                to="/dvoc-maintenance/tasks"
                startIcon={<MdAssignment />}
              >
                Tasks Tab
              </Button>
              <Button
                variant="contained"
                startIcon={<MdFileDownload />}
                onClick={exportToExcel}
                disabled={exporting || loading || filteredTasks.length === 0}
              >
                {exporting ? "Exporting..." : "Export Excel"}
              </Button>
            </Box>
          }
        />

        {/* Team Selector & Scope Bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1.5,
            mb: 2,
            borderRadius: "10px",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 260 }}>
            <MdGroups style={{ fontSize: 24, color: "var(--accent)" }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Analysis Scope
              </Typography>
              <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                <Select
                  value={selectedTeamId}
                  onChange={handleTeamChange}
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: "var(--surface-subtle)",
                    "& .MuiSelect-select": { py: 0.75 },
                  }}
                >
                  <MenuItem value="all" sx={{ fontSize: 13, fontWeight: 700 }}>
                    🌐 Overall Operation (All 25 Teams)
                  </MenuItem>
                  {teams.map((t) => (
                    <MenuItem key={t._id} value={t._id} sx={{ fontSize: 13 }}>
                      {t.teamName} {t.teamCode ? `(${t.teamCode})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Quick Details if a single team is active */}
          {selectedTeam && (
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", fontSize: 12, color: "var(--text-secondary)" }}>
              <Box>
                <strong>Supervisor:</strong> {selectedTeam.supervisor || "—"}
              </Box>
              <Box>
                <strong>Area:</strong> {selectedTeam.governorate || "—"} ({selectedTeam.shift || "Rotating"})
              </Box>
              <Box>
                <strong>Crew:</strong> {selectedTeam.members?.length || 0} members
              </Box>
              <Badge tone={selectedTeam.status === "Active" ? "success" : "neutral"} dot>
                {selectedTeam.status}
              </Badge>
            </Box>
          )}
        </Box>

        {/* Date Filter Toolbar (Defaulted to ALL TIME so all 10 tasks show immediately) */}
        <Box
          sx={{
            backgroundColor: "var(--surface)",
            p: 1.5,
            borderRadius: "10px",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-xs)",
            mb: 2.5,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            flexWrap: "wrap",
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexShrink: 0 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: "600", color: "var(--accent-text)", display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <MdDateRange /> Period:
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 0.5,
                flexShrink: 0,
                "& .MuiButton-root": {
                  whiteSpace: "nowrap",
                  minWidth: "auto",
                  px: 1,
                  py: 0.5,
                  borderRadius: "10px",
                  textTransform: "none",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                  "&:hover": { borderColor: "var(--accent)", backgroundColor: "rgba(108, 71, 255, 0.08)" },
                  "&.MuiButton-contained": {
                    backgroundColor: "var(--accent)",
                    color: "var(--on-accent)",
                    "&:hover": { backgroundColor: "var(--accent-hover)" },
                  },
                },
              }}
            >
              <Button
                onClick={() => {
                  setDateFilter({ start: null, end: null, type: "all" });
                  setTempStartDate(null);
                  setTempEndDate(null);
                }}
                variant={dateFilter.type === "all" ? "contained" : "outlined"}
                size="small"
              >
                All Time (All 10 Tasks)
              </Button>
              <Button
                onClick={() => {
                  const start = startOfMonth(new Date());
                  const end = endOfMonth(new Date());
                  setDateFilter({ start, end, type: "thisMonth" });
                  setTempStartDate(start);
                  setTempEndDate(end);
                }}
                variant={dateFilter.type === "thisMonth" ? "contained" : "outlined"}
                size="small"
              >
                This Month (Oct 2026)
              </Button>
              <Button
                onClick={() => {
                  const start = startOfMonth(subMonths(new Date(), 1));
                  const end = endOfMonth(subMonths(new Date(), 1));
                  setDateFilter({ start, end, type: "lastMonth" });
                  setTempStartDate(start);
                  setTempEndDate(end);
                }}
                variant={dateFilter.type === "lastMonth" ? "contained" : "outlined"}
                size="small"
              >
                Last Month
              </Button>
              <Button
                onClick={() => {
                  const range = getCustomWeekRange(new Date(), settings);
                  setDateFilter({ ...range, type: "thisWeek" });
                  setTempStartDate(range.start);
                  setTempEndDate(range.end);
                }}
                variant={dateFilter.type === "thisWeek" ? "contained" : "outlined"}
                size="small"
              >
                This Week (Oct 25-31)
              </Button>
              <Button
                onClick={() => {
                  const range = getCustomWeekRange(subWeeks(new Date(), 1), settings);
                  setDateFilter({ ...range, type: "lastWeek" });
                  setTempStartDate(range.start);
                  setTempEndDate(range.end);
                }}
                variant={dateFilter.type === "lastWeek" ? "contained" : "outlined"}
                size="small"
              >
                Last Week
              </Button>
            </Box>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />

          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <DatePicker
              label="Start date"
              value={tempStartDate}
              onChange={(v) => setTempStartDate(v)}
              slotProps={{
                textField: {
                  size: "small",
                  sx: { width: 135, "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.75 } },
                },
              }}
            />
            <DatePicker
              label="End date"
              value={tempEndDate}
              onChange={(v) => setTempEndDate(v)}
              slotProps={{
                textField: {
                  size: "small",
                  sx: { width: 135, "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.75 } },
                },
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setDateFilter({ start: tempStartDate, end: tempEndDate, type: "custom" });
              }}
              sx={{ fontSize: "0.75rem", py: 0.5 }}
            >
              Apply Dates
            </Button>
            <IconButton size="small" onClick={loadData} title="Refresh data">
              <MdRefresh />
            </IconButton>
          </Box>
        </Box>

        {loading && <LoadingSpinner message="Calculating maintenance metrics and root cause breakdown..." />}

        {error && (
          <Box sx={{ p: 2, mb: 2, borderRadius: "8px", backgroundColor: "var(--surface)", border: "1px solid var(--danger)" }}>
            <Typography sx={{ color: "var(--danger)", fontSize: 13 }}>{error}</Typography>
          </Box>
        )}

        {!loading && (
          <>
            {/* KPI STATCARDS ROW 1: SAMPLES, PROMOTERS, NEUTRALS, DETRACTORS */}
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, mb: 1 }}>
              Customer Satisfaction & Survey Samples Pool
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" },
                gap: 1.5,
                mb: 2.5,
              }}
            >
              <StatCard
                label="Survey Samples"
                value={sampleBase.toLocaleString()}
                hint={totalSamples > 0 ? `${filteredSamples.length} monthly entries` : "Based on logged tasks"}
              />
              <StatCard
                label="Promoters"
                value={`${promoterRate}%`}
                hint={`${promotersCount} customers (balance)`}
                icon={<MdThumbUp style={{ color: "#16A34A" }} />}
              />
              <StatCard
                label="Neutrals (Score 7-8)"
                value={`${neutralRate}%`}
                hint={`${neutralsCount} recorded tasks`}
                icon={<MdRemoveCircleOutline style={{ color: "#D97706" }} />}
                onClick={() => handleDrillDown("score", "Neutral")}
              />
              <StatCard
                label="Detractors (Score 1-6)"
                value={`${detractorRate}%`}
                hint={`${detractorsCount} recorded tasks`}
                icon={<MdThumbDown style={{ color: "#DC2626" }} />}
                onClick={() => handleDrillDown("score", "Detractor")}
              />
              <StatCard
                label="Non-Promoters (1-8)"
                value={`${nonPromoterRate}%`}
                hint={`${nonPromotersCount} total quality tasks`}
                icon={<MdWarningAmber style={{ color: "#7C3AED" }} />}
                onClick={() => handleDrillDown("score", "Non-Promoter")}
              />
            </Box>

            {/* KPI STATCARDS ROW 2: OPERATIONAL & RCA TASKS */}
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, mb: 1 }}>
              Maintenance Tasks & Quality Execution
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" },
                gap: 1.5,
                mb: 2.5,
              }}
            >
              <StatCard label="Total Tasks" value={totalTasks.toLocaleString()} hint="Within selected period" />
              <StatCard
                label="Total RCA Issues"
                value={totalIssues.toLocaleString()}
                hint={rcaRowsWithoutRootCause > 0 ? `Identified root causes · ${rcaRowsWithoutRootCause} RCA row(s) without one` : "Identified root causes"}
              />
              <StatCard label="Resolved After Visit" value={resolvedTasks.toLocaleString()} hint={`${resolvedRate}% resolved`} />
              <StatCard label="NCF Tasks (≤1M)" value={ncfTasks.toLocaleString()} hint={`${ncfRate}% new conn faults`} />
              <StatCard label="HC Responsibility" value={hcTasks.toLocaleString()} hint={`${hcRate}% HC assigned`} />
              <StatCard
                label="Fiber Category"
                value={`${ftthwTasks}W / ${ftthnTasks}N`}
                hint="FTTHW (working) vs FTTHN"
              />
            </Box>

            {/* SECTION 1: ALL ROOT CAUSES (Not just top 3 or 5) */}
            <Box
              sx={{
                mb: 2.5,
                borderRadius: "10px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                overflow: "hidden",
              }}
            >
              <Box
                component="button"
                onClick={() => setAllRootCausesOpen((v) => !v)}
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  border: "none",
                  borderBottom: allRootCausesOpen ? "1px solid var(--border)" : "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  color: "var(--text)",
                  textAlign: "left",
                }}
              >
                <MdBarChart style={{ color: "#DB2777", fontSize: 22 }} />
                <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
                  ALL Root Causes Breakdown ({allRootCausesList.length} distinct root causes identified)
                </Typography>
                <Badge tone="accent">{totalIssues} total cases</Badge>
                <MdExpandMore
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 20,
                    transform: allRootCausesOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform .2s",
                    marginLeft: 8,
                  }}
                />
              </Box>

              {allRootCausesOpen && (
                <Box sx={{ p: 2 }}>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 380 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ "& th": { fontWeight: 700, backgroundColor: "var(--surface-subtle)" } }}>
                          <TableCell sx={{ width: 60 }}>#</TableCell>
                          <TableCell>Root Cause</TableCell>
                          <TableCell align="center" sx={{ width: 130 }}>Occurrences</TableCell>
                          <TableCell align="center" sx={{ width: 140 }}>% of Issues</TableCell>
                          <TableCell>Associated Reasons</TableCell>
                          <TableCell>Responsible Owners</TableCell>
                          <TableCell align="right" sx={{ width: 120 }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allRootCausesList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 3, color: "var(--text-muted)" }}>
                              No root causes logged in selected period
                            </TableCell>
                          </TableRow>
                        ) : (
                          allRootCausesList.map((item, idx) => (
                            <TableRow key={idx} hover sx={{ cursor: "pointer" }} onClick={() => handleDrillDown("rootCause", item.rootCause)}>
                              <TableCell sx={{ fontWeight: 600, color: "var(--text-muted)" }}>{idx + 1}</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: "var(--text)" }}>{item.rootCause}</TableCell>
                              <TableCell align="center">
                                <Badge tone="accent">{item.count}</Badge>
                              </TableCell>
                              <TableCell align="center">
                                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{item.percentage}%</Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(100, Number(item.percentage))}
                                  sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    mt: 0.5,
                                    "& .MuiLinearProgress-bar": { backgroundColor: "#DB2777" },
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                {item.reasonsStr || "—"}
                              </TableCell>
                              <TableCell sx={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                {item.ownersStr || "—"}
                              </TableCell>
                              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleDrillDown("rootCause", item.rootCause)}
                                  sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: "auto", textTransform: "none" }}
                                >
                                  View {item.count} Tasks
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>

            {/* SECTION 2: DETAILED BREAKDOWN (Reasons, Sub-reasons, Owners, Fault Types, Fiber) */}
            <Box
              sx={{
                mb: 2.5,
                borderRadius: "10px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                overflow: "hidden",
              }}
            >
              <Box
                component="button"
                onClick={() => setBreakdownOpen((v) => !v)}
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  border: "none",
                  borderBottom: breakdownOpen ? "1px solid var(--border)" : "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  color: "var(--text)",
                  textAlign: "left",
                }}
              >
                <MdBarChart style={{ color: "var(--accent-text)", fontSize: 20 }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600, flex: 1 }}>
                  Category & Classification Breakdowns (Click any item to drill down)
                </Typography>
                <MdExpandMore
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 20,
                    transform: breakdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform .2s",
                  }}
                />
              </Box>
              {breakdownOpen && (
                <Box
                  sx={{
                    p: 2,
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
                  }}
                >
                  <MiniTable title="All Reasons" data={allReasons} color="#2563EB" category="reason" />
                  <MiniTable title="All Sub-Reasons" data={allSubReasons} color="#6C47FF" category="subReason" />
                  <MiniTable title="All Owners / Responsible" data={allOwners} color="#00BCD4" category="responsible" />
                  <MiniTable title="All Fault Types" data={allFaultTypes} color="#D97706" category="faultType" />
                  <MiniTable title="Fiber Status" data={fiberCategories} color="#16A34A" category="fiberCategory" />
                  <MiniTable
                    title="Satisfaction Ratings"
                    data={[
                      { name: "Promoter (Score 9-10)", count: promotersCount, percentage: Math.round(Number(promoterRate)) },
                      { name: "Neutral (Score 7-8)", count: neutralsCount, percentage: Math.round(Number(neutralRate)) },
                      { name: "Detractor (Score 1-6)", count: detractorsCount, percentage: Math.round(Number(detractorRate)) },
                    ]}
                    color="#7C3AED"
                    category="score"
                  />
                </Box>
              )}
            </Box>

            {/* SECTION 3: TEAMS PERFORMANCE MATRIX (If Overall View) */}
            {selectedTeamId === "all" && (
              <Box
                sx={{
                  mb: 2.5,
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface)",
                  overflow: "hidden",
                }}
              >
                <Box
                  component="button"
                  onClick={() => setTeamsMatrixOpen((v) => !v)}
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    border: "none",
                    borderBottom: teamsMatrixOpen ? "1px solid var(--border)" : "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    color: "var(--text)",
                    textAlign: "left",
                  }}
                >
                  <MdGroups style={{ color: "#2563EB", fontSize: 22 }} />
                  <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
                    Maintenance Teams Analysis & Performance ({displayedTeams.length} of {teamsMatrix.length} teams)
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Click "View Analysis" to open a team's dedicated page
                  </Typography>
                  <MdExpandMore
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 20,
                      transform: teamsMatrixOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform .2s",
                      marginLeft: 8,
                    }}
                  />
                </Box>

                {teamsMatrixOpen && (
                  <Box sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1.5 }}>
                      <TextField
                        size="small"
                        placeholder="Search team, code, supervisor"
                        value={matrixSearch}
                        onChange={(e) => setMatrixSearch(e.target.value)}
                        sx={{ width: 230, "& input": { fontSize: 12.5 } }}
                        inputProps={{ "aria-label": "Search teams" }}
                      />
                      <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel sx={{ fontSize: 12 }}>Show</InputLabel>
                        <Select value={matrixView} label="Show" onChange={(e) => setMatrixView(e.target.value)} sx={{ fontSize: 12 }}>
                          <MenuItem value="all" sx={{ fontSize: 12 }}>All teams</MenuItem>
                          <MenuItem value="worstPromoters" sx={{ fontSize: 12 }}>Worst teams by promoters %</MenuItem>
                          <MenuItem value="worstDvoc" sx={{ fontSize: 12 }}>Worst teams by DVOC %</MenuItem>
                          <MenuItem value="withSamples" sx={{ fontSize: 12 }}>Teams with samples</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 110 }}>
                        <InputLabel sx={{ fontSize: 12 }}>Top</InputLabel>
                        <Select value={matrixTop} label="Top" onChange={(e) => setMatrixTop(Number(e.target.value))} sx={{ fontSize: 12 }}>
                          {[0, 5, 10, 20].map((n) => (
                            <MenuItem key={n} value={n} sx={{ fontSize: 12 }}>{n ? `Top ${n}` : "All"}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        size="small"
                        variant={hideNoSampleTeams ? "contained" : "outlined"}
                        onClick={() => setHideNoSampleTeams((x) => !x)}
                        sx={{ fontSize: 12, textTransform: "none" }}
                      >
                        Hide teams without samples
                      </Button>
                      {(matrixView !== "all" || matrixTop || hideNoSampleTeams || matrixSearch) && (
                        <Button size="small" variant="text" onClick={() => { setMatrixView("all"); setMatrixTop(0); setHideNoSampleTeams(false); setMatrixSearch(""); }} sx={{ fontSize: 12, textTransform: "none" }}>
                          Clear
                        </Button>
                      )}
                      <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", ml: "auto" }}>
                        {matrixView === "worstPromoters" ? "Lowest promoter % first · " : matrixView === "worstDvoc" ? "Highest DVOC % first · " : ""}
                        Percentages use the team’s survey samples; teams without samples show “—”{matrixView !== "all" ? " and are left out of rankings" : ""}.
                      </Typography>
                    </Box>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ "& th": { fontWeight: 700, backgroundColor: "var(--surface-subtle)", fontSize: 12 } }}>
                            <TableCell>Team Name</TableCell>
                            <TableCell align="center">Samples</TableCell>
                            <TableCell align="center">Promoter %</TableCell>
                            <TableCell align="center">Neutral (7-8)</TableCell>
                            <TableCell align="center">Detractor (1-6)</TableCell>
                            <TableCell align="center">DVOC</TableCell>
                            <TableCell align="center" title="DVOC cases ÷ survey samples">DVOC %</TableCell>
                            <TableCell align="center">Resolved %</TableCell>
                            <TableCell align="center">RCA Issues</TableCell>
                            <TableCell align="center">NCF (≤1M)</TableCell>
                            <TableCell align="right">Team Analysis Page</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {displayedTeams.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={11} align="center" sx={{ py: 3, color: "var(--text-muted)" }}>
                                No teams match these filters.
                              </TableCell>
                            </TableRow>
                          )}
                          {displayedTeams.map((t) => (
                            <TableRow key={t._id} hover>
                              <TableCell>
                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
                                  {t.teamName}
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: "var(--text-muted)" }}>
                                  {t.teamCode} · {t.supervisor}
                                </Typography>
                              </TableCell>
                              <TableCell align="center" sx={{ fontWeight: 600 }}>
                                {t.hasSamples ? t.samples : "—"}
                              </TableCell>
                              <TableCell align="center">
                                {t.promoterPct == null ? (
                                  "—"
                                ) : (
                                  <Badge tone={t.promoterPct >= 80 ? "success" : t.promoterPct >= 60 ? "warning" : "danger"}>{t.promoterPct}%</Badge>
                                )}
                              </TableCell>
                              <TableCell align="center">{t.neutrals}</TableCell>
                              <TableCell align="center">
                                {t.detractors > 0 ? (
                                  <Badge tone="danger">{t.detractors}</Badge>
                                ) : (
                                  "0"
                                )}
                              </TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700 }}>
                                {t.tasks}
                              </TableCell>
                              <TableCell align="center" sx={{ fontWeight: 600 }}>
                                {t.dvocPct == null ? "—" : `${t.dvocPct}%`}
                              </TableCell>
                              <TableCell align="center">
                                <Badge tone={t.resolved > 0 ? "success" : "neutral"}>
                                  {t.resolvedPct}%
                                </Badge>
                              </TableCell>
                              <TableCell align="center">{t.issues}</TableCell>
                              <TableCell align="center">{t.ncf}</TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => navigate(`/dvoc-maintenance/reports/${t._id}`)}
                                  sx={{ fontSize: 11, py: 0.3, px: 1.2, textTransform: "none" }}
                                >
                                  View Analysis
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Box>
            )}

            {/* SECTION 5: FILTERABLE TASKS REGISTER */}
            <Box
              sx={{
                borderRadius: "10px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                overflow: "hidden",
              }}
            >
              {/* Toolbar */}
              <Box
                sx={{
                  p: 1.5,
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1.5,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <MdAssignment style={{ fontSize: 20, color: "var(--accent-text)" }} />
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                    {selectedTeam ? `${selectedTeam.teamName} Tasks` : "Maintenance Tasks Register"} ({tableFilteredTasks.length})
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                  <TextField
                    size="small"
                    placeholder="Search SLID, customer, ticket, RCA..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                    InputProps={{
                      startAdornment: <MdSearch style={{ marginRight: 6, color: "var(--text-muted)" }} />,
                      endAdornment: search ? (
                        <IconButton size="small" onClick={() => setSearch("")}>
                          <MdClose style={{ fontSize: 14 }} />
                        </IconButton>
                      ) : null,
                    }}
                    sx={{ width: { xs: "100%", sm: 220 }, "& .MuiInputBase-input": { fontSize: 13, py: 0.6 } }}
                  />

                  {/* Rating Score Filter */}
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel sx={{ fontSize: 12 }}>Score Filter</InputLabel>
                    <Select
                      value={scoreFilter}
                      label="Score Filter"
                      onChange={(e) => {
                        setScoreFilter(e.target.value);
                        setPage(0);
                      }}
                      sx={{ fontSize: 12 }}
                    >
                      <MenuItem value="all" sx={{ fontSize: 12 }}>All Scores</MenuItem>
                      <MenuItem value="detractor" sx={{ fontSize: 12 }}>Detractor (1-6)</MenuItem>
                      <MenuItem value="neutral" sx={{ fontSize: 12 }}>Neutral (7-8)</MenuItem>
                      <MenuItem value="promoter" sx={{ fontSize: 12 }}>Promoter (9-10)</MenuItem>
                      <MenuItem value="nonPromoter" sx={{ fontSize: 12 }}>Non-Promoter (1-8)</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Fiber Filter */}
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel sx={{ fontSize: 12 }}>Fiber</InputLabel>
                    <Select
                      value={fiberFilter}
                      label="Fiber"
                      onChange={(e) => {
                        setFiberFilter(e.target.value);
                        setPage(0);
                      }}
                      sx={{ fontSize: 12 }}
                    >
                      <MenuItem value="all" sx={{ fontSize: 12 }}>All Fiber</MenuItem>
                      <MenuItem value="FTTHW" sx={{ fontSize: 12 }}>FTTHW</MenuItem>
                      <MenuItem value="FTTHN" sx={{ fontSize: 12 }}>FTTHN</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Resolved Filter */}
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel sx={{ fontSize: 12 }}>Resolved</InputLabel>
                    <Select
                      value={resolvedFilter}
                      label="Resolved"
                      onChange={(e) => {
                        setResolvedFilter(e.target.value);
                        setPage(0);
                      }}
                      sx={{ fontSize: 12 }}
                    >
                      <MenuItem value="all" sx={{ fontSize: 12 }}>All</MenuItem>
                      <MenuItem value="yes" sx={{ fontSize: 12 }}>Yes</MenuItem>
                      <MenuItem value="no" sx={{ fontSize: 12 }}>No</MenuItem>
                    </Select>
                  </FormControl>

                  {/* NCF Filter */}
                  <FormControl size="small" sx={{ minWidth: 95 }}>
                    <InputLabel sx={{ fontSize: 12 }}>NCF</InputLabel>
                    <Select
                      value={ncfFilter}
                      label="NCF"
                      onChange={(e) => {
                        setNcfFilter(e.target.value);
                        setPage(0);
                      }}
                      sx={{ fontSize: 12 }}
                    >
                      <MenuItem value="all" sx={{ fontSize: 12 }}>All</MenuItem>
                      <MenuItem value="yes" sx={{ fontSize: 12 }}>NCF (≤1M)</MenuItem>
                      <MenuItem value="no" sx={{ fontSize: 12 }}>Non-NCF</MenuItem>
                    </Select>
                  </FormControl>


                  {/* Customer follow-up Filter */}
                  <FormControl size="small" sx={{ minWidth: 120, maxWidth: 220 }}>
                    <InputLabel sx={{ fontSize: 12 }}>Follow-up</InputLabel>
                    <Select
                      value={followUpFilter}
                      label="Follow-up"
                      onChange={(e) => {
                        setFollowUpFilter(e.target.value);
                        setPage(0);
                      }}
                      sx={{ fontSize: 12 }}
                    >
                      <MenuItem value="all" sx={{ fontSize: 12 }}>All</MenuItem>
                      <MenuItem value="Yes" sx={{ fontSize: 12 }}>Needs follow-up</MenuItem>
                      <MenuItem value="No" sx={{ fontSize: 12 }}>No follow-up</MenuItem>
                      <MenuItem value="unset" sx={{ fontSize: 12 }}>Not recorded</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* RCA filters — a task matches when one of its RCA rows matches all chosen values */}
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", mr: 0.5 }}>RCA filters</Typography>

                  <FormControl size="small" sx={{ minWidth: 140, maxWidth: 220 }}>
                    <InputLabel sx={{ fontSize: 12 }}>Reason</InputLabel>
                    <Select
                      value={rcaReasonFilter}
                      label="Reason"
                      onChange={(e) => {
                        setRcaReasonFilter(e.target.value);
                        setRcaSubReasonFilter("all");
                        setRcaRootCauseFilter("all");
                        setRcaOwnerFilter("all");
                        setPage(0);
                      }}
                      sx={{ fontSize: 12 }}
                    >
                      <MenuItem value="all" sx={{ fontSize: 12 }}>All</MenuItem>
                      {rcaFilterOptions.reasons.map((o) => (
                        <MenuItem key={o} value={o} sx={{ fontSize: 12 }}>{o}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 140, maxWidth: 220 }}>
                    <InputLabel sx={{ fontSize: 12 }}>Sub-reason</InputLabel>
                    <Select
                      value={rcaSubReasonFilter}
                      label="Sub-reason"
                      onChange={(e) => {
                        setRcaSubReasonFilter(e.target.value);
                        setRcaRootCauseFilter("all");
                        setRcaOwnerFilter("all");
                        setPage(0);
                      }}
                      sx={{ fontSize: 12 }}
                    >
                      <MenuItem value="all" sx={{ fontSize: 12 }}>All</MenuItem>
                      {rcaFilterOptions.subReasons.map((o) => (
                        <MenuItem key={o} value={o} sx={{ fontSize: 12 }}>{o}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 150, maxWidth: 220 }}>
                    <InputLabel sx={{ fontSize: 12 }}>Root cause</InputLabel>
                    <Select
                      value={rcaRootCauseFilter}
                      label="Root cause"
                      onChange={(e) => {
                        setRcaRootCauseFilter(e.target.value);
                        setRcaOwnerFilter("all");
                        setPage(0);
                      }}
                      sx={{ fontSize: 12 }}
                    >
                      <MenuItem value="all" sx={{ fontSize: 12 }}>All</MenuItem>
                      {rcaFilterOptions.rootCauses.map((o) => (
                        <MenuItem key={o} value={o} sx={{ fontSize: 12 }}>{o}</MenuItem>
                      ))}
                      {(rcaFilterOptions.hasMissingRootCause || rcaRootCauseFilter === "__none__") && (
                        <MenuItem value="__none__" sx={{ fontSize: 12, fontStyle: "italic" }}>No root cause entered</MenuItem>
                      )}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 130, maxWidth: 220 }}>
                    <InputLabel sx={{ fontSize: 12 }}>Owner</InputLabel>
                    <Select
                      value={rcaOwnerFilter}
                      label="Owner"
                      onChange={(e) => {
                        setRcaOwnerFilter(e.target.value);
                        setPage(0);
                      }}
                      sx={{ fontSize: 12 }}
                    >
                      <MenuItem value="all" sx={{ fontSize: 12 }}>All</MenuItem>
                      {rcaFilterOptions.owners.map((o) => (
                        <MenuItem key={o} value={o} sx={{ fontSize: 12 }}>{o}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                {rcaFiltersActive && (
                  <Button size="small" startIcon={<MdClose />} onClick={clearRcaFilters} sx={{ fontSize: 12, textTransform: "none" }}>
                    Clear RCA filters
                  </Button>
                )}
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { fontWeight: 600, backgroundColor: "var(--surface-subtle)", fontSize: 12 } }}>
                      <TableCell>Task / SLID</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell>Customer / Contact</TableCell>
                      <TableCell>Team</TableCell>
                      <TableCell>Fault / Fiber</TableCell>
                      <TableCell align="center">Resolved</TableCell>
                      <TableCell align="center">Follow-up</TableCell>
                      <TableCell>Root Cause Analysis</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                          <EmptyState
                            icon={<MdAssignment style={{ fontSize: 28 }} />}
                            title="No matching tasks"
                            description="Try adjusting your filters or date selection."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTasks.map((task) => {
                        const rcaList = getTaskRcaRows(task);
                        const score = task.evaluationScore !== null && task.evaluationScore !== undefined ? Number(task.evaluationScore) : null;
                        return (
                          <TableRow key={task._id} hover sx={{ cursor: "pointer" }} onClick={() => setSheetId(task._id)}>
                            <TableCell>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)" }}>
                                {task.slid}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: "var(--text-muted)" }}>
                                {task.taskNumber || task.ticketNumber || "—"}
                              </Typography>
                            </TableCell>

                            <TableCell align="center">
                              {score !== null ? (
                                <Badge tone={score <= 6 ? "danger" : score <= 8 ? "warning" : "success"} sx={{ fontWeight: 700 }}>
                                  {score} {score <= 6 ? "Det" : score <= 8 ? "Neu" : "Pro"}
                                </Badge>
                              ) : (
                                <Typography sx={{ fontSize: 11, color: "var(--text-muted)" }}>—</Typography>
                              )}
                            </TableCell>

                            <TableCell>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>
                                {task.customerName || "—"}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: "var(--text-muted)" }}>
                                {task.contactNumber || "—"}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography sx={{ fontSize: 12.5 }}>
                                {task.team?.teamName || "Unassigned"}
                              </Typography>
                              {task.team?.teamCode && (
                                <Typography sx={{ fontSize: 11, color: "var(--text-muted)" }}>
                                  {task.team.teamCode}
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell>
                              <Typography sx={{ fontSize: 12 }}>{task.faultType || "—"}</Typography>
                              {task.fiberCategory && (
                                <Badge
                                  tone={task.fiberCategory === "FTTHW" ? "success" : "warning"}
                                  sx={{ fontSize: 10, height: 18, mt: 0.25 }}
                                >
                                  {task.fiberCategory}
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell align="center">
                              <Badge
                                tone={
                                  task.resolvedAfterVisit === "Yes" || task.status === "Closed"
                                    ? "success"
                                    : task.resolvedAfterVisit === "No"
                                    ? "danger"
                                    : "neutral"
                                }
                              >
                                {task.resolvedAfterVisit === "Yes"
                                  ? "Yes"
                                  : task.resolvedAfterVisit === "No"
                                  ? "No"
                                  : task.status === "Closed"
                                  ? "Closed"
                                  : "Pending"}
                              </Badge>
                            </TableCell>

                            <TableCell align="center">
                              {task.customerFollowUp ? (
                                <Badge tone={task.customerFollowUp === "Yes" ? "warning" : "neutral"}>{task.customerFollowUp}</Badge>
                              ) : (
                                <Typography sx={{ fontSize: 11, color: "var(--text-muted)" }}>—</Typography>
                              )}
                            </TableCell>

                            <TableCell sx={{ maxWidth: 260 }}>
                              {rcaList.length === 0 ? (
                                <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>No RCA logged</Typography>
                              ) : (
                                rcaList.map((r, idx) => (
                                  <Box key={idx} sx={{ fontSize: 11, lineHeight: 1.3, mb: idx < rcaList.length - 1 ? 0.5 : 0 }}>
                                    <span style={{ fontWeight: 600 }}>{r.reason}</span>
                                    {r.subReason && ` › ${r.subReason}`}
                                    {r.hasRootCause && <span style={{ color: "#DB2777" }}> › {r.rootCause}</span>}
                                    {r.responsible && (
                                      <span style={{ color: "var(--text-muted)" }}> ({r.responsible})</span>
                                    )}
                                  </Box>
                                ))
                              )}
                            </TableCell>

                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                                <Tooltip title="View task sheet">
                                  <IconButton size="small" onClick={() => setSheetId(task._id)}>
                                    <MdVisibility style={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit task">
                                  <IconButton size="small" onClick={() => setEditingTask(task)}>
                                    <MdEdit style={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={tableFilteredTasks.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Box>
          </>
        )}

        {/* Drill-Down Dialog */}
        <AppDialog
          open={drillDownState.open}
          onClose={() => setDrillDownState((prev) => ({ ...prev, open: false }))}
          size="xl"
          title="Tasks in this breakdown"
          description={`${drillDownState.title} — ${drillDownState.tasks.length} task${drillDownState.tasks.length === 1 ? "" : "s"}`}
          actions={
            <Button variant="outlined" onClick={() => setDrillDownState((prev) => ({ ...prev, open: false }))}>
              Close
            </Button>
          }
          bodySx={{ p: 0 }}
        >
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 600, backgroundColor: "var(--surface-subtle)" } }}>
                  <TableCell>Date</TableCell>
                  <TableCell>SLID</TableCell>
                  <TableCell align="center">Score</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Fault / Fiber</TableCell>
                  <TableCell align="center">NCF</TableCell>
                  <TableCell align="center">HC</TableCell>
                  <TableCell align="center">Resolved</TableCell>
                  <TableCell>Root Cause Details</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drillDownState.tasks.map((task) => {
                  const rcas = getTaskRcaRows(task);
                  const score = task.evaluationScore !== null && task.evaluationScore !== undefined ? Number(task.evaluationScore) : null;
                  return (
                    <TableRow key={task._id} hover>
                      <TableCell sx={{ fontSize: 12 }}>
                        {task.creationDate || task.faultDate || task.createdAt
                          ? format(new Date(task.creationDate || task.faultDate || task.createdAt), "dd/MM/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "var(--accent)", fontSize: 12.5 }}>
                        {task.slid}
                      </TableCell>
                      <TableCell align="center">
                        {score !== null ? (
                          <Badge tone={score <= 6 ? "danger" : score <= 8 ? "warning" : "success"}>
                            {score}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{task.customerName || "—"}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{task.team?.teamName || "Unassigned"}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {task.faultType || "—"}
                        {task.fiberCategory && (
                          <Badge tone={task.fiberCategory === "FTTHW" ? "success" : "warning"} sx={{ ml: 0.5, fontSize: 10 }}>
                            {task.fiberCategory}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {task.ncf ? <Badge tone="danger" sx={{ fontSize: 10 }}>NCF</Badge> : "—"}
                      </TableCell>
                      <TableCell align="center">
                        {task.hcResponsibility ? <Badge tone="warning" sx={{ fontSize: 10 }}>HC</Badge> : "—"}
                      </TableCell>
                      <TableCell align="center">
                        <Badge tone={task.resolvedAfterVisit === "Yes" || task.status === "Closed" ? "success" : "danger"}>
                          {task.resolvedAfterVisit === "Yes" || task.status === "Closed" ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, maxWidth: 240 }}>
                        {rcas.map((r, i) => (
                          <Box key={i}>
                            <span style={{ fontWeight: 600 }}>{r.reason}</span> › {r.subReason} › <span style={{ color: "#DB2777" }}>{r.rootCause}</span>
                          </Box>
                        ))}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSheetId(task._id);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </AppDialog>

        {/* Task Details Sheet */}
        {sheetId && (
          <MaintenanceTaskSheet
            taskId={sheetId}
            onClose={() => setSheetId(null)}
            onEdit={(t) => setEditingTask(t)}
            onChanged={loadData}
          />
        )}

        {/* Task Edit Form Dialog */}
        {editingTask && (
          <MaintenanceTaskForm
            open={Boolean(editingTask)}
            task={editingTask}
            teams={teams}
            onClose={() => setEditingTask(null)}
            onSaved={() => {
              setEditingTask(null);
              loadData();
            }}
          />
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default MaintenanceReportsPage;
