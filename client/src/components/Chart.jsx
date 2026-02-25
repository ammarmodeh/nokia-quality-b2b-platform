import { useState, useEffect, useMemo } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import * as XLSX from "xlsx";
import moment from "moment";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  // CircularProgress,
  Typography,
  Button,
  Chip,
  Box,
  useTheme,
  useMediaQuery,
  Autocomplete,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import { RiFileExcel2Fill } from "react-icons/ri";
import api from "../api/api";
import { ChartComponent } from "./ChartComponent";
import { DataTable } from "./DataTable";
import { generateWeekRanges, getDesiredWeeks, groupDataByWeek, generateMonthRanges, getMonthNumber, groupDataByMonth } from "../utils/helpers";
import { subDays, isAfter } from 'date-fns';

import ChartDataLabels from 'chartjs-plugin-datalabels';
// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, ChartDataLabels);

// Removed redundant fetchData since tasks are passed from parent (Dashboard)
/*
const fetchData = async () => {
...
};
*/


const prepareChartData = (groupedData, timeRange, settings = {}) => {
  const categories = ["NPS", "Promoters", "Neutrals", "Detractors"];
  const colors = {
    NPS: "rgba(148, 163, 184, 1)", // Clear Gray for NPS curve
    Promoters: "rgba(16, 185, 129, 0.9)", // Green
    Neutrals: "rgba(251, 146, 60, 0.9)", // Yellow-orange
    Detractors: "rgba(239, 68, 68, 0.9)", // Red
  };

  // Dynamic Targets from settings, with fallback to legacy defaults
  const promoterTarget = settings?.npsTargets?.promoters ?? 75;
  const detractorTarget = settings?.npsTargets?.detractors ?? 8;
  const npsTarget = promoterTarget - detractorTarget;

  const sortedLabels = Object.keys(groupedData).sort((a, b) => {
    const matchWkA = a.match(/Wk-(\d+) \((\d+)\)/);
    const matchWkB = b.match(/Wk-(\d+) \((\d+)\)/);
    if (matchWkA && matchWkB) {
      const yearA = parseInt(matchWkA[2], 10);
      const yearB = parseInt(matchWkB[2], 10);
      const weekA = parseInt(matchWkA[1], 10);
      const weekB = parseInt(matchWkB[1], 10);
      if (yearA !== yearB) return yearA - yearB;
      return weekA - weekB;
    }

    // Handle Month-X (descriptive) sorting
    const matchMonA = a.match(/Month (\d+)/);
    const matchMonB = b.match(/Month (\d+)/);
    if (matchMonA && matchMonB) {
      return parseInt(matchMonA[1], 10) - parseInt(matchMonB[1], 10);
    }

    return a.localeCompare(b);
  });

  return {
    labels: sortedLabels,
    datasets: [
      ...categories.map((category) => ({
        label: category,
        data: sortedLabels.map((week) => {
          if (category === "NPS") {
            const promoters = groupedData[week].Promoters || 0;
            const detractors = groupedData[week].Detractors || 0;
            return promoters - detractors;
          }
          return groupedData[week][category] || 0;
        }),
        backgroundColor: colors[category],
        borderColor: colors[category],
        pointBackgroundColor: colors[category],
        pointBorderColor: colors[category],
        pointStyle: category === "Promoters" ? "rectRot" : "rect",
        borderWidth: 2.5,
        tension: 0,
        fill: false,
        datalabels: {
          align: category === 'NPS' ? 'top' : (category === 'Promoters' ? 'top' : (category === 'Neutrals' ? 45 : 'right')),
          anchor: category === 'NPS' || category === 'Promoters' ? 'end' : 'center',
          offset: category === 'NPS' ? 10 : 6,
          backgroundColor: colors[category].replace('0.9', '0.15'), // Subtle background
          borderColor: colors[category],
          borderWidth: 1,
          borderRadius: 4,
          padding: { top: 2, bottom: 2, left: 4, right: 4 },
          font: { weight: 'bold', size: 10 },
          color: '#ffffff',
          display: (context) => {
            // Show all labels, but hide NPS if it's identical to Promoter (rare, but happens if detractors=0)
            const val = context.parsed?.y;
            const promoterVal = context.chart.data.datasets[1]?.data?.[context.dataIndex];

            if (category === 'NPS' && val !== undefined && val === promoterVal) {
              return 'auto'; // Only show if it doesn't collide
            }
            return true;
          }
        }
      })),
      // NPS Target Line (Dynamic)
      {
        label: `NPS Target (≥${npsTarget})`,
        data: sortedLabels.map(() => npsTarget),
        borderColor: "rgba(59, 130, 246, 0.6)", // Blue for NPS target
        backgroundColor: "rgba(59, 130, 246, 0.6)",
        pointBackgroundColor: "rgba(59, 130, 246, 0.6)",
        pointBorderColor: "rgba(59, 130, 246, 0.6)",
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0,
        fill: false,
        datalabels: { display: false }
      },
      // Promoters Target Line (Dynamic)
      {
        label: `Promoters Target (≥${promoterTarget}%)`,
        data: sortedLabels.map(() => promoterTarget),
        borderColor: "rgba(16, 185, 129, 0.5)",
        backgroundColor: "rgba(16, 185, 129, 0.5)",
        pointBackgroundColor: "rgba(16, 185, 129, 0.5)",
        pointBorderColor: "rgba(16, 185, 129, 0.5)",
        borderWidth: 1.5,
        borderDash: [8, 4],
        pointRadius: 0,
        tension: 0,
        fill: false,
        datalabels: { display: false }
      },
      // Detractors Target Line (Dynamic)
      {
        label: `Detractors Target (≤${detractorTarget}%)`,
        data: sortedLabels.map(() => detractorTarget),
        borderColor: "rgba(239, 68, 68, 0.5)",
        backgroundColor: "rgba(239, 68, 68, 0.5)",
        pointBackgroundColor: "rgba(239, 68, 68, 0.5)",
        pointBorderColor: "rgba(239, 68, 68, 0.5)",
        borderWidth: 1.5,
        borderDash: [12, 4],
        pointRadius: 0,
        tension: 0,
        fill: false,
        datalabels: { display: false }
      }
    ],
  };
};

const Chart = ({ tasks: initialTasks, samplesData = [], settings: propSettings }) => {
  const theme = useTheme();
  const hideChart = useMediaQuery('(max-width:503px)');
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [filter, setFilter] = useState("All");
  const [tasks, setTasks] = useState(initialTasks || []);
  const [weekRanges, setWeekRanges] = useState([]);
  const [timeRange, setTimeRange] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [settings, setSettings] = useState(null);
  // const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Advanced Time Range State
  const [viewType, setViewType] = useState('weekly'); // 'weekly' or 'monthly'
  const [timeFilterMode, setTimeFilterMode] = useState('weeks'); // 'weeks', 'days', 'months'
  const [recentDaysValue, setRecentDaysValue] = useState(70);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [monthOptions, setMonthOptions] = useState([]);

  // Custom Query Filters State
  const [queryFilters, setQueryFilters] = useState({
    teamName: null,
    responsible: null,
    reason: null,
    governorate: null,
    district: null
  });

  // Extract unique values for filters
  const uniqueFilters = useMemo(() => {
    if (!initialTasks || initialTasks.length === 0) return { teams: [], owners: [], reasons: [], governorates: [], districts: [] };

    const teams = new Set();
    const owners = new Set();
    const reasons = new Set();
    const governorates = new Set();
    const districts = new Set();

    initialTasks.forEach(task => {
      if (task.teamName) teams.add(task.teamName);
      if (task.responsible) owners.add(task.responsible);
      if (task.reason) reasons.add(task.reason);
      if (task.governorate) governorates.add(task.governorate);
      if (task.district) districts.add(task.district);
    });

    return {
      teams: Array.from(teams).sort(),
      owners: Array.from(owners).sort(),
      reasons: Array.from(reasons).sort(),
      governorates: Array.from(governorates).sort(),
      districts: Array.from(districts).sort()
    };
  }, [initialTasks]);

  useEffect(() => {
    if (initialTasks && initialTasks.length > 0 && settings) {
      const months = generateMonthRanges(initialTasks, settings);
      setMonthOptions(months);
    }
  }, [initialTasks, settings]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");
        setSettings(response.data);
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const weekStartDay = settings?.weekStartDay || 0;

  // Apply all filters (Time Range + Custom Queries)
  const processData = (allTasks, range, filters, currentSettings, samples, mode, days, months) => {
    // 1. Filter tasks by Custom Queries
    let filtered = allTasks;
    if (filters.teamName) filtered = filtered.filter(t => t.teamName === filters.teamName);
    if (filters.responsible) filtered = filtered.filter(t => t.responsible === filters.responsible);
    if (filters.reason) filtered = filtered.filter(t => t.reason === filters.reason);
    if (filters.governorate) filtered = filtered.filter(t => t.governorate === filters.governorate);
    if (filters.district) filtered = filtered.filter(t => t.district === filters.district);

    // 2. Filter by Time Mode
    let finalRange = range; // 'range' here is the `timeRange` state, which is an array of week keys
    if (mode === 'days') {
      const cutoff = subDays(new Date(), days);
      filtered = filtered.filter(t => t.interviewDate && isAfter(new Date(t.interviewDate), cutoff));
      // When filtering by days, we need to re-generate the week ranges based on the filtered data
      // and then use those as the 'finalRange' for grouping by week.
      const newRanges = generateWeekRanges(filtered, currentSettings || {});
      finalRange = newRanges.filter(r => /Wk-\d+ \(\d+\)/.test(r)); // Ensure only week keys are kept
    } else if (mode === 'months' && months.length > 0) {
      filtered = filtered.filter(t => {
        const monthInfo = getMonthNumber(t.interviewDate, currentSettings || {});
        return monthInfo && months.includes(monthInfo.key);
      });
      // Similar to 'days', if we filter by specific months, we need to re-generate week ranges
      // from the filtered data to ensure we only group by weeks present in the selected months.
      const newRanges = generateWeekRanges(filtered, currentSettings || {});
      finalRange = newRanges.filter(r => /Wk-\d+ \(\d+\)/.test(r));
    }

    // 3. Aggregate based on viewType
    if (viewType === 'monthly') {
      const monthRanges = generateMonthRanges(filtered, currentSettings || {});
      const allMonthKeys = monthRanges.map(m => m.key);
      const grouped = groupDataByMonth(filtered, allMonthKeys, currentSettings || {}, samples);

      // Filter range to only include months with activity (samples or violations)
      // and map keys to descriptive labels
      const activeRange = monthRanges
        .filter(m => {
          const stats = grouped[m.key];
          return stats && (stats.sampleSize > 0 || stats.Detractors > 0 || stats.Neutrals > 0);
        })
        .map(m => m.label); // Use the descriptive label as the key in the final range

      // Re-key grouped data with the descriptive labels for the chart/table
      const descriptiveGrouped = {};
      monthRanges.forEach(m => {
        if (activeRange.includes(m.label)) {
          descriptiveGrouped[m.label] = grouped[m.key];
        }
      });

      return { grouped: descriptiveGrouped, range: activeRange };
    }

    const timeFilteredData = getDesiredWeeks(filtered, finalRange, currentSettings || {});
    const grouped = groupDataByWeek(timeFilteredData, finalRange, currentSettings || {}, samples);
    return { grouped, range: finalRange };
  };

  useEffect(() => {
    if (initialTasks && initialTasks.length > 0) {
      setTasks(initialTasks);
      const ranges = generateWeekRanges(initialTasks, settings || {});
      const individualWeeks = ranges
        .filter(range => /Wk-\d+ \(\d+\)/.test(range))
        .sort((a, b) => {
          const matchA = a.match(/Wk-(\d+) \((\d+)\)/);
          const matchB = b.match(/Wk-(\d+) \((\d+)\)/);
          if (!matchA || !matchB) return 0;
          const yearA = parseInt(matchA[2], 10);
          const yearB = parseInt(matchB[2], 10);
          const weekA = parseInt(matchA[1], 10);
          const weekB = parseInt(matchB[1], 10);
          if (yearA !== yearB) return yearB - yearA;
          return weekB - weekA;
        });

      // Show latest weeks at the top of the selection list
      setWeekRanges(individualWeeks);

      // Default selection: Latest 10 weeks
      const defaultWeeks = individualWeeks.slice(0, 10);
      setTimeRange(defaultWeeks);

      const activeSettings = propSettings || settings || {};
      const actualMode = viewType === 'monthly' ? 'monthly' : timeFilterMode;
      const { grouped, range: finalRange } = processData(initialTasks, defaultWeeks, queryFilters, activeSettings, samplesData, actualMode, recentDaysValue, selectedMonths);
      setGroupedData(grouped);
      setChartData(prepareChartData(grouped, finalRange, activeSettings));
    }
  }, [initialTasks, settings, propSettings, samplesData]);

  const exportChartData = () => {
    if (!groupedData || Object.keys(groupedData).length === 0) return;

    const activeSettings = propSettings || settings || {};
    const promoterTarget = activeSettings?.npsTargets?.promoters ?? 75;
    const detractorTarget = activeSettings?.npsTargets?.detractors ?? 8;
    const npsTarget = promoterTarget - detractorTarget;

    // Sort weeks descending for the report
    const sortedWeeks = Object.keys(groupedData).sort((a, b) => {
      const matchA = a.match(/Wk-(\d+) \((\d+)\)/);
      const matchB = b.match(/Wk-(\d+) \((\d+)\)/);
      if (!matchA || !matchB) return 0;
      const yearA = parseInt(matchA[2], 10);
      const yearB = parseInt(matchB[2], 10);
      const weekA = parseInt(matchA[1], 10);
      const weekB = parseInt(matchB[1], 10);
      if (yearA !== yearB) return yearB - yearA;
      return weekB - weekA;
    });

    const exportData = sortedWeeks.map((week) => {
      const stats = groupedData[week];
      const promoters = stats.Promoters || 0;
      const detractors = stats.Detractors || 0;
      const nps = promoters - detractors;
      const pStatus = promoters >= promoterTarget ? "Met Target" : "Out of Target";
      const dStatus = detractors <= detractorTarget ? "Met Target" : "Out of Target";
      const nStatus = nps >= npsTarget ? "Met Target" : "Out of Target";

      return {
        [viewType === 'weekly' ? "Week" : "Month"]: week,
        "Total Samples": stats.sampleSize || 0,
        "Promoters (%)": promoters,
        "Target Promoters (%)": promoterTarget,
        "Promoter Status": pStatus,
        "Neutrals (%)": stats.Neutrals || 0,
        "Detractors (%)": detractors,
        "Target Detractors (%)": detractorTarget,
        "Detractor Status": dStatus,
        "NPS": nps,
        "Target NPS": npsTarget,
        "NPS Status": nStatus
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${viewType === 'weekly' ? 'Weekly' : 'Monthly'} QoS Trends`);

    // Auto-size columns
    const wscols = [
      { wch: 15 }, // Week
      { wch: 15 }, // Total Samples
      { wch: 15 }, // Promoters
      { wch: 18 }, // Target Promoters
      { wch: 15 }, // Promoter Status
      { wch: 15 }, // Neutrals
      { wch: 15 }, // Detractors
      { wch: 18 }, // Target Detractors
      { wch: 15 }, // Detractor Status
      { wch: 10 }, // NPS
      { wch: 15 }, // Target NPS
      { wch: 15 }  // NPS Status
    ];
    worksheet['!cols'] = wscols;

    const timestamp = moment().format("YYYY-MM-DD_HHmm");
    XLSX.writeFile(workbook, `${viewType}_qos_trends_${timestamp}.xlsx`);
  };

  const handleReset = () => {
    setQueryFilters({
      teamName: null,
      responsible: null,
      reason: null,
      governorate: null,
      district: null
    });
    setTimeFilterMode('weeks');
    setRecentDaysValue(70);
    setSelectedMonths([]);

    const individualWeeks = weekRanges
      .filter(range => /Wk-\d+ \(\d+\)/.test(range))
      .sort((a, b) => {
        const matchA = a.match(/Wk-(\d+) \((\d+)\)/);
        const matchB = b.match(/Wk-(\d+) \((\d+)\)/);
        if (!matchA || !matchB) return 0;
        const yearA = parseInt(matchA[2], 10);
        const yearB = parseInt(matchB[2], 10);
        const weekA = parseInt(matchA[1], 10);
        const weekB = parseInt(matchB[1], 10);
        if (yearA !== yearB) return yearB - yearA;
        return weekB - weekA;
      });

    const defaultWeeks = individualWeeks.slice(0, 10);
    setTimeRange(defaultWeeks);
  };

  useEffect(() => {
    if (tasks.length > 0) {
      const activeSettings = propSettings || settings || {};
      const actualMode = viewType === 'monthly' ? 'monthly' : timeFilterMode;
      const { grouped, range: finalRange } = processData(tasks, timeRange, queryFilters, activeSettings, samplesData, actualMode, recentDaysValue, selectedMonths);
      setGroupedData(grouped);
      setChartData(prepareChartData(grouped, finalRange, activeSettings));
    }
  }, [timeRange, tasks, settings, propSettings, samplesData, queryFilters, timeFilterMode, recentDaysValue, selectedMonths, viewType]);

  const applyFilter = (category) => {
    setFilter(category);
    const activeSettings = propSettings || settings || {};
    const actualMode = viewType === 'monthly' ? 'monthly' : timeFilterMode;
    const { grouped, range: finalRange } = processData(tasks, timeRange, queryFilters, activeSettings, samplesData, actualMode, recentDaysValue, selectedMonths);

    if (category === "All") {
      setChartData(prepareChartData(grouped, finalRange, activeSettings));
    } else {
      const filteredGrouped = Object.keys(grouped).reduce((acc, week) => {
        acc[week] = { [category]: grouped[week][category] };
        return acc;
      }, {});

      setChartData(prepareChartData(filteredGrouped, finalRange, activeSettings));
    }
    setGroupedData(grouped);
  };

  // if (loading) {
  //   return <CircularProgress sx={{ color: "#7b68ee" }} />;
  // }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box sx={{
      // backgroundColor: "#2d2d2d",
      py: 2,
      borderRadius: "8px",
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      <Stack
        direction={isSmallScreen ? "column" : "row"}
        spacing={2}
        sx={{ mb: 2 }}
        alignItems="center"
        justifyContent="space-between"
      >
        <Typography variant="h6" sx={{ color: "#E2E8F0", fontWeight: "bold", fontSize: "1.1rem" }}>
          {viewType === 'weekly' ? 'Weekly' : 'Monthly'} QoS Trends
        </Typography>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <ToggleButtonGroup
            value={viewType}
            exclusive
            onChange={(e, val) => val && setViewType(val)}
            size="small"
            sx={{
              backgroundColor: "rgba(0,0,0,0.2)",
              height: '32px',
              mr: 1,
              "& .MuiToggleButton-root": {
                color: "#94a3b8",
                borderColor: "rgba(255,255,255,0.05)",
                px: 2,
                fontSize: '0.75rem',
                textTransform: 'none',
                fontWeight: 700,
                "&.Mui-selected": {
                  backgroundColor: "rgba(123, 104, 238, 0.15)",
                  color: "#7b68ee",
                  borderColor: "rgba(123, 104, 238, 0.3)",
                  "&:hover": { backgroundColor: "rgba(123, 104, 238, 0.2)" }
                }
              }
            }}
          >
            <ToggleButton value="weekly" sx={{ gap: 0.5 }}>
              Weekly
            </ToggleButton>
            <ToggleButton value="monthly" sx={{ gap: 0.5 }}>
              Monthly
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterAltOffIcon />}
            sx={{
              color: "#94a3b8",
              borderColor: "rgba(148, 163, 184, 0.3)",
              textTransform: 'none',
              "&:hover": { borderColor: "#3b82f6", color: "#3b82f6" }
            }}
            onClick={handleReset}
          >
            Reset
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<RiFileExcel2Fill />}
            sx={{
              backgroundColor: '#10b981',
              textTransform: 'none',
              "&:hover": { backgroundColor: '#059669' }
            }}
            onClick={exportChartData}
          >
            Export Excel
          </Button>
        </Stack>
      </Stack>

      {/* Custom Query Filters Section */}
      <Accordion
        elevation={0}
        sx={{
          mb: 3,
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "12px !important",
          "&::before": { display: 'none' },
          "&.Mui-expanded": { mb: 3 }
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#94a3b8" }} />}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FilterAltIcon sx={{ color: "#3b82f6", fontSize: 20 }} />
            <Typography sx={{ color: "#e2e8f0", fontWeight: 600, fontSize: "0.9rem" }}>
              Customize Queries
            </Typography>
            {(queryFilters.teamName || queryFilters.responsible || queryFilters.reason || queryFilters.governorate || queryFilters.district) && (
              <Chip
                label="Active Filters"
                size="small"
                color="primary"
                sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
              />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2, px: 3, pb: 4 }}>
          {/* Advanced Time Range Selector */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="overline" sx={{ color: "#3b82f6", fontWeight: 800, letterSpacing: 1.2, mb: 2, display: 'block' }}>
              Advanced Time Range
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
              <ToggleButtonGroup
                value={timeFilterMode}
                exclusive
                onChange={(e, val) => val && setTimeFilterMode(val)}
                size="small"
                sx={{
                  backgroundColor: "rgba(0,0,0,0.2)",
                  height: '40px',
                  "& .MuiToggleButton-root": {
                    color: "#94a3b8",
                    borderColor: "rgba(255,255,255,0.05)",
                    px: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    "&.Mui-selected": {
                      backgroundColor: "rgba(59, 130, 246, 0.1)",
                      color: "#3b82f6",
                      borderColor: "rgba(59, 130, 246, 0.3)",
                      "&:hover": { backgroundColor: "rgba(59, 130, 246, 0.2)" }
                    }
                  }
                }}
              >
                <ToggleButton value="days" sx={{ gap: 1 }}>
                  <TodayIcon sx={{ fontSize: 18 }} /> Recent Days
                </ToggleButton>
                <ToggleButton value="weeks" sx={{ gap: 1 }}>
                  <DateRangeIcon sx={{ fontSize: 18 }} /> Specific Weeks
                </ToggleButton>
                <ToggleButton value="months" sx={{ gap: 1 }}>
                  <CalendarMonthIcon sx={{ fontSize: 18 }} /> Monthly Periods
                </ToggleButton>
              </ToggleButtonGroup>

              <Box sx={{ flexGrow: 1, width: '100%', pt: timeFilterMode === 'days' ? 1 : 0 }}>
                {timeFilterMode === 'days' && (
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Slider
                      value={recentDaysValue}
                      onChange={(e, val) => setRecentDaysValue(val)}
                      min={7}
                      max={365}
                      sx={{ flexGrow: 1, color: '#3b82f6' }}
                      valueLabelDisplay="auto"
                    />
                    <TextField
                      size="small"
                      label="Days"
                      type="number"
                      value={recentDaysValue}
                      onChange={(e) => setRecentDaysValue(Number(e.target.value))}
                      sx={{
                        width: 80,
                        "& .MuiOutlinedInput-root": { color: "#cbd5e1" },
                        "& .MuiInputLabel-root": { color: "#94a3b8" }
                      }}
                    />
                  </Stack>
                )}

                {timeFilterMode === 'weeks' && (
                  <Autocomplete
                    multiple
                    size="small"
                    options={weekRanges.filter(r => /Wk-\d+ \(\d+\)/.test(r))}
                    value={timeRange}
                    onChange={(e, newVal) => setTimeRange(newVal)}
                    renderInput={(params) => (
                      <TextField {...params} label="Select Specific Weeks" variant="outlined" placeholder="Search weeks..." />
                    )}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        color: "#cbd5e1",
                        "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                      },
                      "& .MuiInputLabel-root": { color: "#94a3b8" }
                    }}
                  />
                )}

                {timeFilterMode === 'months' && (
                  <Autocomplete
                    multiple
                    size="small"
                    options={monthOptions}
                    getOptionLabel={(option) => option.label}
                    value={monthOptions.filter(m => selectedMonths.includes(m.key))}
                    onChange={(e, newVal) => setSelectedMonths(newVal.map(v => v.key))}
                    renderInput={(params) => (
                      <TextField {...params} label="Select Monthly Periods" variant="outlined" placeholder="Search months..." />
                    )}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        color: "#cbd5e1",
                        "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                      },
                      "& .MuiInputLabel-root": { color: "#94a3b8" }
                    }}
                  />
                )}
              </Box>
            </Stack>
          </Box>

          <Divider sx={{ mb: 4, borderColor: "rgba(255,255,255,0.03)" }} />

          <Typography variant="overline" sx={{ color: "#3b82f6", fontWeight: 800, letterSpacing: 1.2, mb: 2, display: 'block' }}>
            Metadata Filters
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
              gap: 3,
              mt: 1
            }}
          >
            <Autocomplete
              size="small"
              options={uniqueFilters.teams}
              value={queryFilters.teamName}
              onChange={(e, newVal) => setQueryFilters(prev => ({ ...prev, teamName: newVal }))}
              renderInput={(params) => (
                <TextField {...params} label="Team Name" variant="outlined" />
              )}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#cbd5e1",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                  "&:hover fieldset": { borderColor: "#3b82f6" },
                },
                "& .MuiInputLabel-root": { color: "#94a3b8" }
              }}
            />
            <Autocomplete
              size="small"
              options={uniqueFilters.owners}
              value={queryFilters.responsible}
              onChange={(e, newVal) => setQueryFilters(prev => ({ ...prev, responsible: newVal }))}
              renderInput={(params) => (
                <TextField {...params} label="Owner" variant="outlined" />
              )}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#cbd5e1",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                  "&:hover fieldset": { borderColor: "#3b82f6" },
                },
                "& .MuiInputLabel-root": { color: "#94a3b8" }
              }}
            />
            <Autocomplete
              size="small"
              options={uniqueFilters.reasons}
              value={queryFilters.reason}
              onChange={(e, newVal) => setQueryFilters(prev => ({ ...prev, reason: newVal }))}
              renderInput={(params) => (
                <TextField {...params} label="Reason" variant="outlined" />
              )}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#cbd5e1",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                  "&:hover fieldset": { borderColor: "#3b82f6" },
                },
                "& .MuiInputLabel-root": { color: "#94a3b8" }
              }}
            />
            <Autocomplete
              size="small"
              options={uniqueFilters.governorates}
              value={queryFilters.governorate}
              onChange={(e, newVal) => setQueryFilters(prev => ({ ...prev, governorate: newVal }))}
              renderInput={(params) => (
                <TextField {...params} label="Governorate" variant="outlined" />
              )}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#cbd5e1",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                  "&:hover fieldset": { borderColor: "#3b82f6" },
                },
                "& .MuiInputLabel-root": { color: "#94a3b8" }
              }}
            />
            <Autocomplete
              size="small"
              options={uniqueFilters.districts}
              value={queryFilters.district}
              onChange={(e, newVal) => setQueryFilters(prev => ({ ...prev, district: newVal }))}
              renderInput={(params) => (
                <TextField {...params} label="District" variant="outlined" />
              )}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#cbd5e1",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                  "&:hover fieldset": { borderColor: "#3b82f6" },
                },
                "& .MuiInputLabel-root": { color: "#94a3b8" }
              }}
            />
            <Button
              startIcon={<FilterAltOffIcon />}
              onClick={handleReset}
              sx={{
                color: "#ff4d4d",
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                justifyContent: 'flex-start',
                "&:hover": { bgcolor: "rgba(255, 77, 77, 0.1)" }
              }}
            >
              Clear All Filters
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Chart and Table Section */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: isSmallScreen ? 2 : undefined }}>
        {!hideChart && (
          <Box sx={{ width: '100%', minHeight: 400 }}>
            <ChartComponent chartData={chartData} />
          </Box>
        )}
        <DataTable groupedData={groupedData} settings={propSettings || settings} />
      </Box>
    </Box>
  );
};

export default Chart;