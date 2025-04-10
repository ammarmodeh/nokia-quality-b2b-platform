import { Card as MUICard, CardContent, Typography, Stack, Chip, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from "@mui/material";
import Slider from "react-slick";
import * as XLSX from "xlsx";

// Helper function to group tasks by week based on interviewDate
const groupTasksByWeek = (tasks) => {
  const groupedTasks = {};

  tasks.forEach((task) => {
    if (!task.interviewDate) {
      // console.warn("Task missing interviewDate:", task);
      return; // Skip tasks without interviewDate
    }

    const date = new Date(task.interviewDate); // Use interviewDate
    const weekNumber = getWeekNumber(date);

    if (!groupedTasks[weekNumber]) {
      groupedTasks[weekNumber] = [];
    }

    groupedTasks[weekNumber].push(task);
  });

  return groupedTasks;
};

// Helper function to get the week number of a date relative to 5th January 2025
const getWeekNumber = (date) => {
  const startDate = new Date("2025-01-05"); // Week 1 starts on 5th January 2025
  const timeDifference = date - startDate;
  const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
  return Math.floor(daysDifference / 7) + 1; // Calculate week number
};

// Helper function to count violations per team and accumulate violated weeks up to the current week
const countViolationsPerTeam = (groupedTasks, currentWeek) => {
  const violations = {};

  // Iterate through all weeks up to the current week
  Object.keys(groupedTasks)
    .filter((week) => parseInt(week) <= currentWeek) // Only include weeks up to the current week
    .forEach((week) => {
      const tasks = groupedTasks[week];

      tasks.forEach((task) => {
        if (!task.teamName) {
          // console.warn("Task missing team:", task);
          return; // Skip tasks without team
        }

        if (!violations[task.teamName]) {
          violations[task.teamName] = {
            totalViolations: 0,
            currentWeekViolations: 0,
            currentWeekDetractors: 0,
            currentWeekNeutrals: 0,
            totalDetractors: 0,
            totalNeutrals: 0,
            violatedWeeks: new Set(), // Use a Set to store unique weeks
          };
        }

        // Count total violations
        violations[task.teamName].totalViolations++;

        // Count total detractors (evaluationScore 1-6)
        if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
          violations[task.teamName].totalDetractors++;
        }

        // Count total neutrals (evaluationScore 7-8)
        if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
          violations[task.teamName].totalNeutrals++;
        }

        // Add the violated week
        const weekNumber = getWeekNumber(new Date(task.interviewDate));
        violations[task.teamName].violatedWeeks.add(weekNumber);

        // Count current week violations
        if (weekNumber === currentWeek) {
          violations[task.teamName].currentWeekViolations++;

          // Count current week detractors (evaluationScore 1-6)
          if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
            violations[task.teamName].currentWeekDetractors++;
          }

          // Count current week neutrals (evaluationScore 7-8)
          if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
            violations[task.teamName].currentWeekNeutrals++;
          }
        }
      });
    });

  // Convert the Set of violated weeks to a sorted array
  Object.keys(violations).forEach((team) => {
    violations[team].violatedWeeks = Array.from(violations[team].violatedWeeks)
      .sort((a, b) => a - b)
      .map((week) => `Wk${week}`); // Format as "Wk1, Wk2, ..."
  });

  return violations;
};

// Main function to calculate weekly trends
const calculateTeamViolationTrends = (groupedTasks) => {
  const weeks = Object.keys(groupedTasks).sort((a, b) => a - b);
  const trends = [];

  weeks.forEach((week) => {
    // Calculate violations up to the current week
    const allViolations = countViolationsPerTeam(groupedTasks, parseInt(week));

    // Filter violations to include only teams that violated in the current week
    const currentWeekTasks = groupedTasks[week] || [];
    const currentWeekTeams = new Set(currentWeekTasks.map(task => task.teamName));
    const violations = Object.keys(allViolations)
      .filter(team => currentWeekTeams.has(team))
      .reduce((obj, key) => {
        obj[key] = allViolations[key];
        return obj;
      }, {});

    const trend = {
      week,
      violations, // Use the filtered violations for the current week
    };

    trends.push(trend);
  });

  return trends;
};

// Helper function to convert table data to CSV
const exportToExcel = (trend) => {
  const { week, violations } = trend;

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Create a new worksheet
  const worksheetData = [];

  // Headers
  const headers = [
    "Team",
    "Current Week Violations",
    "Current Week Detractors",
    "Current Week Neutrals",
    "Total Violations",
    "Total Detractors",
    "Total Neutrals",
    "Violated Weeks",
  ];
  worksheetData.push(headers);

  // Data rows
  Object.entries(violations).forEach(([team, data]) => {
    const row = [
      team,
      data.currentWeekViolations,
      data.currentWeekDetractors,
      data.currentWeekNeutrals,
      data.totalViolations,
      data.totalDetractors,
      data.totalNeutrals,
      data.violatedWeeks.join(", "),
    ];
    worksheetData.push(row);
  });

  // Convert the data to a worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Violations Report");

  // Write the workbook to a file
  XLSX.writeFile(workbook, `violations_report_week_${week}.xlsx`);
};

// Table component to display weekly trends
const TeamViolationTable = ({ trend }) => {
  if (!trend) {
    return (
      <MUICard
        sx={{
          minWidth: 200,
          boxShadow: 1,
          background: "#1e1e1e",
          color: "#e0e0e0",
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ color: "#b0b0b0" }}>
            No Data Available
          </Typography>
        </CardContent>
      </MUICard>
    );
  }

  const { week, violations } = trend;

  const getWeekDateRange = (week) => {
    const startDate = new Date(2025, 0, 5); // January 5, 2025 (month is 0-indexed)
    const startOfWeek = new Date(startDate.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

    const formatDate = (date) =>
      date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

  const handleDownloadCSV = () => {
    exportToExcel(trend);
    // downloadCSV(csv, `weekly_trends_week_${week}.csv`);
  };

  return (
    <MUICard
      sx={{
        boxShadow: 1,
        background: "#1e1e1e",
        color: "#e0e0e0",
        mx: '4px',
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        // "&:hover": {
        //   transform: "translateY(-2px)",
        //   boxShadow: 3,
        // },
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
          <Chip
            label={`Week ${week}`}
            sx={{ backgroundColor: "#ffffff29", color: "#e0e0e0" }}
          />
          <Typography variant="body1" sx={{ color: "#9e9e9e", fontFamily: 'IBM Plex Mono', fontSize: '10px' }}>
            {getWeekDateRange(week)}
          </Typography>
        </Stack>
        <Button variant="contained" onClick={handleDownloadCSV} sx={{ mb: 2, p: '0px 8px', float: 'right', backgroundColor: "#1D4ED8" }}>
          Download CSV
        </Button>
        <TableContainer component={Paper} sx={{ backgroundColor: "#2a2a2a" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "#e0e0e0", borderRight: '1px solid #4a4a4a' }}>Team</TableCell>
                <TableCell sx={{ color: "#e0e0e0", backgroundColor: "#3a3a3a" }} align="right">Current Week Violations</TableCell>
                <TableCell sx={{ color: "#e0e0e0", backgroundColor: "#3a3a3a" }} align="right">Current Week Detractors</TableCell>
                <TableCell sx={{ color: "#e0e0e0", backgroundColor: "#3a3a3a" }} align="right">Current Week Neutrals</TableCell>
                <TableCell sx={{ color: "#e0e0e0", borderLeft: '1px solid #4a4a4a' }} align="right">Total Violations</TableCell>
                <TableCell sx={{ color: "#e0e0e0" }} align="right">Total Detractors</TableCell>
                <TableCell sx={{ color: "#e0e0e0" }} align="right">Total Neutrals</TableCell>
                <TableCell sx={{ color: "#e0e0e0" }} align="right">Violated Weeks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(violations).map(([team, data]) => (
                <TableRow key={team}>
                  <TableCell sx={{ color: "#e0e0e0", borderRight: '1px solid #4a4a4a' }}>{team}</TableCell>
                  <TableCell sx={{ color: "#e0e0e0", backgroundColor: "#3a3a3a" }} align="right">{data.currentWeekViolations}</TableCell>
                  <TableCell sx={{ color: "#e0e0e0", backgroundColor: "#3a3a3a" }} align="right">{data.currentWeekDetractors}</TableCell>
                  <TableCell sx={{ color: "#e0e0e0", backgroundColor: "#3a3a3a" }} align="right">{data.currentWeekNeutrals}</TableCell>
                  <TableCell sx={{ color: "#e0e0e0", borderLeft: '1px solid #4a4a4a' }} align="right">{data.totalViolations}</TableCell>
                  <TableCell sx={{ color: "#e0e0e0" }} align="right">{data.totalDetractors}</TableCell>
                  <TableCell sx={{ color: "#e0e0e0" }} align="right">{data.totalNeutrals}</TableCell>
                  <TableCell sx={{ color: "#e0e0e0" }} align="right">
                    {data.violatedWeeks.join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </MUICard>
  );
};

// Slider component to navigate through weeks
const WeekSlider = ({ trends }) => {
  const settings = {
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    focusOnSelect: true,
    rows: 1,
    slidesToScroll: 1,
    swipe: false,          // Disable swipe gestures
    draggable: false,      // Disable dragging
    // arrows: false,         // Hide default arrows since we're using custom ones
    touchMove: false
  };

  if (!trends || trends.length === 0) {
    return (
      <MUICard
        sx={{
          boxShadow: 1,
          background: "#1e1e1e",
          color: "#e0e0e0",
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ color: "#b0b0b0" }}>
            No Trends Available
          </Typography>
        </CardContent>
      </MUICard>
    );
  }

  return (
    <Slider {...settings}>
      {trends.map((trend, index) => (
        <div className="card-div max-h-[500px] overflow-auto" key={index}>
          <TeamViolationTable trend={trend} />
        </div>
      ))}
    </Slider>
  );
};

// Main component to group tasks, calculate trends, and render the slider
const WeeklyTeamViolationTrends = ({ tasks }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <MUICard
        sx={{
          minWidth: 200,
          boxShadow: 1,
          background: "#1e1e1e",
          color: "#e0e0e0",
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ color: "#b0b0b0" }}>
            <CircularProgress size={24} />
          </Typography>
        </CardContent>
      </MUICard>
    );
  }

  const groupedTasks = groupTasksByWeek(tasks);
  const trends = calculateTeamViolationTrends(groupedTasks);

  return <WeekSlider trends={trends} />;
};

const TeamViolationTrend = ({ tasks }) => {
  // console.log({ tasks });
  return (
    <div style={{ padding: "0", backgroundColor: "#121212" }}>
      <WeeklyTeamViolationTrends tasks={tasks} />
    </div>
  );
};

export default TeamViolationTrend;
