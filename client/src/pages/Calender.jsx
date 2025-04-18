import { useState, useEffect, useMemo, useCallback } from "react";
import {
  startOfYear,
  endOfYear,
  eachWeekOfInterval,
  format,
  isSameWeek,
  isBefore,
  endOfWeek,
} from "date-fns";
import { getCustomWeekNumber } from "../utils/helpers";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Paper, Typography, Select, MenuItem, FormControl, InputLabel } from "@mui/material";

// Dark theme
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
    text: {
      primary: "#ffffff",
      secondary: "#b3b3b3",
    },
  },
});

const CalendarPage = () => {
  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Generate all weeks of the selected year (ensuring weeks start on Sunday)
  useEffect(() => {
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 11, 31));
    const weeksInYear = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 }); // Sunday start

    setWeeks(weeksInYear);
  }, [selectedYear]);

  // Format week range (e.g., "Jan 1 - Jan 7")
  const formatWeekRange = useCallback((startDate) => {
    const start = format(startDate, "MMM d");
    const end = format(endOfWeek(startDate, { weekStartsOn: 0 }), "MMM d");
    return `${start} - ${end}`;
  }, []);

  // Check if a week is in the past
  const isWeekSpent = useCallback((weekStart) => {
    const endOfWeekDate = endOfWeek(weekStart, { weekStartsOn: 0 });
    return isBefore(endOfWeekDate, new Date());
  }, []);

  // Memoize the list of years for the Select component
  const realCurrentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => [realCurrentYear - 1, realCurrentYear, realCurrentYear + 1], [realCurrentYear]);

  // Memoize the weeks list to avoid recalculating on every render
  const memoizedWeeks = useMemo(() => weeks.map((weekStart) => {
    const isSpent = isWeekSpent(weekStart);
    const weekNumber = getCustomWeekNumber(weekStart, selectedYear); // Use custom week number function
    return {
      weekStart,
      isSpent,
      weekNumber,
      formattedRange: formatWeekRange(weekStart),
      isCurrentWeek: isSameWeek(weekStart, currentWeek, { weekStartsOn: 0 }),
    };
  }), [weeks, isWeekSpent, selectedYear, formatWeekRange, currentWeek]);

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="p-4 max-w-[1100px] mx-auto" style={{ backgroundColor: darkTheme.palette.background.default, color: "#3ea6ff" }}>
        <Typography variant="h4" gutterBottom>
          Yearly Calendar with Custom Weeks
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          This calendar follows the <strong>custom week standard</strong>. The first week of the year
          is the one that contains <strong>January 1st</strong>, with weeks starting on <strong>Sunday</strong>.
        </Typography>

        {/* Year Selector */}
        <FormControl variant="outlined" fullWidth margin="normal">
          <InputLabel id="year-select-label">Select Year</InputLabel>
          <Select
            labelId="year-select-label"
            id="year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            label="Select Year"
          >
            {yearOptions.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Weeks List */}
        <div className="space-y-2">
          {memoizedWeeks.map((week, index) => (
            <Paper
              key={index}
              elevation={2}
              sx={{
                p: 2,
                borderRadius: "8px",
                backgroundColor: week.isCurrentWeek
                  ? "#3232b66e"
                  : week.isSpent
                    ? "background.paper"
                    : "background.default",
                opacity: week.isSpent ? 0.5 : 1,
                cursor: week.isSpent ? "not-allowed" : "pointer",
                "&:hover": { boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)" },
                transition: "box-shadow 0.3s ease",
              }}
            >
              <div className="flex items-center justify-between">
                <Typography variant="body1" color={week.isSpent ? "textSecondary" : "textPrimary"}>
                  Week {week.weekNumber} ({week.formattedRange})
                </Typography>
              </div>
            </Paper>
          ))}
        </div>
      </div>
    </ThemeProvider>
  );
};

export default CalendarPage;