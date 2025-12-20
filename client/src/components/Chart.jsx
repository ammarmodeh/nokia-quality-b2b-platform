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

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

// Removed redundant fetchData since tasks are passed from parent (Dashboard)
/*
const fetchData = async () => {
...
};
*/


const prepareChartData = (groupedData, timeRange) => {
  const categories = ["Detractor", "Violations", "NeutralPassive"];
  const colors = {
    Detractor: "rgba(255, 99, 132, 0.6)",
    NeutralPassive: "rgba(255, 206, 86, 0.6)",
    Violations: "rgba(75, 192, 192, 0.6)",
  };

  if (timeRange === "allWeeks") {
    const aggregatedData = Object.values(groupedData).reduce((acc, weekData) => {
      categories.forEach((category) => {
        if (category === "Violations") {
          acc[category] = (acc[category] || 0) + ((weekData.Detractor || 0) + (weekData.NeutralPassive || 0));
        } else {
          acc[category] = (acc[category] || 0) + (weekData[category] || 0);
        }
      });
      return acc;
    }, {});

    return {
      labels: ["All Weeks"],
      datasets: categories.map((category) => ({
        label: category,
        data: [aggregatedData[category] || 0],
        backgroundColor: colors[category],
      })),
    };
  }

  const sortedWeeks = Object.keys(groupedData).sort((a, b) => {
    const weekA = parseInt(a.replace("Wk-", ""), 10);
    const weekB = parseInt(b.replace("Wk-", ""), 10);
    return weekA - weekB;
  });

  return {
    labels: sortedWeeks,
    datasets: categories.map((category) => ({
      label: category,
      data: sortedWeeks.map((week) => {
        if (category === "Violations") {
          return (groupedData[week].Detractor || 0) + (groupedData[week].NeutralPassive || 0);
        }
        return groupedData[week][category] || 0;
      }),
      backgroundColor: colors[category],
    })),
  };
};

const Chart = ({ tasks: initialTasks }) => {
  const theme = useTheme();
  const hideChart = useMediaQuery('(max-width:503px)');
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [filter, setFilter] = useState("All");
  const [tasks, setTasks] = useState(initialTasks || []);
  const [weekRanges, setWeekRanges] = useState([]);
  const [timeRange, setTimeRange] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  // const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialTasks && initialTasks.length > 0) {
      setTasks(initialTasks);

      const ranges = generateWeekRanges(initialTasks);
      setWeekRanges(ranges);

      const individualWeeks = ranges
        .filter(range => /^Wk-\d+$/.test(range))
        .sort((a, b) => parseInt(a.replace("Wk-", "")) - parseInt(b.replace("Wk-", "")));

      const defaultWeeks = individualWeeks.slice(-4);
      setTimeRange(defaultWeeks);

      const filteredData = getDesiredWeeks(initialTasks, defaultWeeks);
      const grouped = groupDataByWeek(filteredData, defaultWeeks);
      setGroupedData(grouped);
      setChartData(prepareChartData(grouped, defaultWeeks));
    }
  }, [initialTasks]);

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
    const individualWeeks = weekRanges.filter(range => range.split('-').length === 1);
    individualWeeks.sort((a, b) => parseInt(a.replace("Wk-", "")) - parseInt(b.replace("Wk-", "")));
    const defaultWeeks = individualWeeks.slice(-4);

    setTimeRange(defaultWeeks);
    const filteredData = getDesiredWeeks(tasks, defaultWeeks);
    const grouped = groupDataByWeek(filteredData, defaultWeeks);
    setGroupedData(grouped);
    setChartData(prepareChartData(grouped, defaultWeeks));
  };

  useEffect(() => {
    if (tasks.length > 0) {
      const filteredData = getDesiredWeeks(tasks, timeRange);
      const grouped = groupDataByWeek(filteredData, timeRange);
      setGroupedData(grouped);
      setChartData(prepareChartData(grouped, timeRange));
    }
  }, [timeRange, tasks]);

  const applyFilter = (category) => {
    setFilter(category);
    const filteredData = getDesiredWeeks(tasks, timeRange);
    const grouped = groupDataByWeek(filteredData, timeRange);

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
        {!hideChart && (
          <FormControl
            variant="standard"
            sx={{
              minWidth: isSmallScreen ? '100%' : 150,
            }}
          >
            <InputLabel sx={{ color: "#b3b3b3" }}>Filter by Score</InputLabel>
            <Select
              value={filter}
              onChange={(e) => applyFilter(e.target.value)}
              label="Filter by Score"
              sx={{
                height: "100%",
                color: "#ffffff",
                "& .MuiSelect-icon": { color: "#b3b3b3" },
                "&::before": { borderBottom: "1px solid #666" },
                "&:hover:not(.Mui-disabled)::before": { borderBottom: "1px solid #7b68ee" },
                "&::after": { borderBottom: "1px solid #7b68ee" },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: "#2d2d2d",
                    color: "#ffffff",
                  },
                },
              }}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Detractor">Detractor</MenuItem>
              <MenuItem value="NeutralPassive">Neutral/Passive</MenuItem>
            </Select>
          </FormControl>
        )}

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