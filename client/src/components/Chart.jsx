import { useState, useEffect } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
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
  useMediaQuery
} from "@mui/material";
import api from "../api/api";
import { ChartComponent } from "./ChartComponent";
import { DataTable } from "./DataTable";
import { generateWeekRanges, getDesiredWeeks, groupDataByWeek } from "../utils/helpers";

import ChartDataLabels from 'chartjs-plugin-datalabels';
// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, ChartDataLabels);

// Removed redundant fetchData since tasks are passed from parent (Dashboard)
/*
const fetchData = async () => {
...
};
*/


const prepareChartData = (groupedData, timeRange) => {
  const categories = ["NPS", "Promoters", "Neutrals", "Detractors"];
  const colors = {
    NPS: "rgba(59, 130, 246, 0.9)", // Blue
    Promoters: "rgba(16, 185, 129, 0.9)", // Green
    Neutrals: "rgba(251, 146, 60, 0.9)", // Yellow-orange
    Detractors: "rgba(239, 68, 68, 0.9)", // Red
  };

  const sortedWeeks = Object.keys(groupedData).sort((a, b) => {
    const matchA = a.match(/Wk-(\d+) \((\d+)\)/);
    const matchB = b.match(/Wk-(\d+) \((\d+)\)/);
    if (!matchA || !matchB) return 0;
    const yearA = parseInt(matchA[2], 10);
    const yearB = parseInt(matchB[2], 10);
    const weekA = parseInt(matchA[1], 10);
    const weekB = parseInt(matchB[1], 10);
    if (yearA !== yearB) return yearA - yearB;
    return weekA - weekB;
  });

  return {
    labels: sortedWeeks,
    datasets: [
      ...categories.map((category) => ({
        label: category,
        data: sortedWeeks.map((week) => {
          if (category === "NPS") {
            return (groupedData[week].Promoters || 0) - (groupedData[week].Detractors || 0);
          }
          return groupedData[week][category] || 0;
        }),
        backgroundColor: colors[category],
        borderColor: colors[category],
        pointBackgroundColor: colors[category],
        pointBorderColor: colors[category],
        pointStyle: category === "Promoters" ? "rectRot" : "rect",
        borderWidth: 2.5,
        tension: 0.3,
        fill: false,
      })),
      // NPS Target Line (Promoters Target 75% - Detractors Target 9% = 66%)
      {
        label: "NPS Target (≥66%)",
        data: sortedWeeks.map(() => 66),
        borderColor: "rgba(148, 163, 184, 0.6)",
        backgroundColor: "rgba(148, 163, 184, 0.6)",
        pointBackgroundColor: "rgba(148, 163, 184, 0.6)",
        pointBorderColor: "rgba(148, 163, 184, 0.6)",
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0,
        fill: false,
      }
    ],
  };
};

const Chart = ({ tasks: initialTasks, samplesData = [] }) => {
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

  useEffect(() => {
    if (initialTasks && initialTasks.length > 0) {
      setTasks(initialTasks);

      const ranges = generateWeekRanges(initialTasks, settings || {});
      setWeekRanges(ranges);

      const individualWeeks = ranges
        .filter(range => /Wk-\d+ \(\d+\)/.test(range))
        .sort((a, b) => {
          const matchA = a.match(/Wk-(\d+) \((\d+)\)/);
          const matchB = b.match(/Wk-(\d+) \((\d+)\)/);
          const yearA = parseInt(matchA[2], 10);
          const yearB = parseInt(matchB[2], 10);
          const weekA = parseInt(matchA[1], 10);
          const weekB = parseInt(matchB[1], 10);
          if (yearA !== yearB) return yearA - yearB;
          return weekA - weekB;
        });

      const defaultWeeks = individualWeeks.slice(-10);
      setTimeRange(defaultWeeks);

      const filteredData = getDesiredWeeks(initialTasks, defaultWeeks, settings || {});
      const grouped = groupDataByWeek(filteredData, defaultWeeks, settings || {}, samplesData);
      setGroupedData(grouped);
      setChartData(prepareChartData(grouped, defaultWeeks));
    }
  }, [initialTasks, settings, samplesData]);

  const exportChartData = () => {
    const csvRows = [];
    const headers = ["Week", "Detractor", "NeutralPassive", "TotalViolations"];
    csvRows.push(headers.join(","));

    Object.keys(groupedData).forEach((week) => {
      const totalViolations = (groupedData[week].NeutralPassive || 0) + (groupedData[week].Detractor || 0);
      const row = [
        week,
        groupedData[week].Detractor || 0,
        groupedData[week].NeutralPassive || 0,
        totalViolations,
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = "qos_violations_data.csv";
    link.click();
  };

  const handleReset = () => {
    const individualWeeks = weekRanges.filter(range => /Wk-\d+ \(\d+\)/.test(range));
    individualWeeks.sort((a, b) => {
      const matchA = a.match(/Wk-(\d+) \((\d+)\)/);
      const matchB = b.match(/Wk-(\d+) \((\d+)\)/);
      const yearA = parseInt(matchA[2], 10);
      const yearB = parseInt(matchB[2], 10);
      const weekA = parseInt(matchA[1], 10);
      const weekB = parseInt(matchB[1], 10);
      if (yearA !== yearB) return yearA - yearB;
      return weekA - weekB;
    });
    const defaultWeeks = individualWeeks.slice(-4);

    setTimeRange(defaultWeeks);
    const filteredData = getDesiredWeeks(tasks, defaultWeeks, settings || {});
    const grouped = groupDataByWeek(filteredData, defaultWeeks, settings || {}, samplesData);
    setGroupedData(grouped);
    setChartData(prepareChartData(grouped, defaultWeeks));
  };

  useEffect(() => {
    if (tasks.length > 0) {
      const filteredData = getDesiredWeeks(tasks, timeRange, settings || {});
      const grouped = groupDataByWeek(filteredData, timeRange, settings || {}, samplesData);
      setGroupedData(grouped);
      setChartData(prepareChartData(grouped, timeRange));
    }
  }, [timeRange, tasks, settings, samplesData]);

  const applyFilter = (category) => {
    setFilter(category);
    const filteredData = getDesiredWeeks(tasks, timeRange, settings || {});
    const grouped = groupDataByWeek(filteredData, timeRange, settings || {}, samplesData);

    if (category === "All") {
      setChartData(prepareChartData(grouped, timeRange));
    } else {
      const filteredGrouped = Object.keys(grouped).reduce((acc, week) => {
        acc[week] = { [category]: grouped[week][category] };
        return acc;
      }, {});

      setChartData(prepareChartData(filteredGrouped, timeRange));
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
      {/* Controls Section */}
      <Stack
        direction={isSmallScreen ? "column" : "row"}
        spacing={isSmallScreen ? 2 : 3}
        sx={{ mb: 3 }}
        alignItems={isSmallScreen ? "stretch" : "flex-end"}
      >

        <FormControl
          variant="standard"
          sx={{
            minWidth: isSmallScreen ? '100%' : 150,
          }}
        >
          <InputLabel sx={{ color: "#b3b3b3" }}>Time Range</InputLabel>
          <Select
            multiple
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Time Range"
            sx={{
              color: "#ffffff",
              "& .MuiSelect-icon": { color: "#b3b3b3" },
              "&::before": { borderBottom: "1px solid #666" },
              "&:hover:not(.Mui-disabled)::before": { borderBottom: "1px solid #7b68ee" },
              "&::after": { borderBottom: "1px solid #7b68ee" },
              "& .MuiChip-root": {
                backgroundColor: "#243d53",
                color: "#ffffff",
                margin: "2px",
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: "#2d2d2d",
                  color: "#ffffff",
                },
              },
            }}
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip
                    key={value}
                    label={value}
                    sx={{
                      backgroundColor: "#243d53",
                      color: "#ffffff",
                    }}
                  />
                ))}
              </Box>
            )}
          >
            {weekRanges.map((range, index) => (
              <MenuItem key={`${range}-${index}`} value={range}>
                {range}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack
          direction={isSmallScreen ? "row" : "row"}
          spacing={1}
          sx={{
            width: isSmallScreen ? '100%' : 'auto',
            height: '29px'
          }}
        >
          <Button
            variant="outlined"
            size="medium"
            sx={{
              color: "#7b68ee",
              width: isSmallScreen ? '50%' : 'auto'
            }}
            onClick={handleReset}
          >
            Reset
          </Button>

          <Button
            variant="contained"
            size="medium"
            sx={{ backgroundColor: '#1D4ED8', py: 1, lineHeight: 1, fontSize: '0.8rem', width: isSmallScreen ? '50%' : 'auto' }}
            onClick={exportChartData}
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {/* Chart and Table Section */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: isSmallScreen ? 2 : undefined }}>
        {!hideChart && (
          <Box sx={{ width: '100%', minHeight: 400 }}>
            <ChartComponent chartData={chartData} />
          </Box>
        )}
        <DataTable groupedData={groupedData} />
      </Box>
    </Box>
  );
};

export default Chart;