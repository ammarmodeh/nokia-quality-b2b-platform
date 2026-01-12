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
import { Paper, Typography, Select, MenuItem, FormControl, useMediaQuery, Box } from "@mui/material";
import { CalendarToday, CheckCircle } from "@mui/icons-material";
import api from "../api/api";

// ClickUp-inspired light theme
const clickUpTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#f9fafb",
      paper: "#ffffff",
    },
    primary: {
      main: "#7b68ee",
      light: "#9d8df1",
      dark: "#5e4ecf",
    },
    text: {
      primary: "#1f2937",
      secondary: "#6b7280",
    },
    divider: "#e5e7eb",
  },
  typography: {
    fontFamily: '"Inter", "Rubik", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h5: {
      fontWeight: 600,
      fontSize: "1.5rem",
      letterSpacing: "-0.01em",
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
});

const CalendarPage = () => {
  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const isMobile = useMediaQuery('(max-width:503px)');

  const [settings, setSettings] = useState(null);

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

  // Generate all weeks of the selected year
  useEffect(() => {
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 11, 31));
    const weeksInYear = eachWeekOfInterval({ start, end }, { weekStartsOn: weekStartDay });

    setWeeks(weeksInYear);
  }, [selectedYear, weekStartDay]);

  // Format week range (e.g., "Jan 1 - Jan 7")
  const formatWeekRange = useCallback((startDate) => {
    const start = format(startDate, "MMM d");
    const end = format(endOfWeek(startDate, { weekStartsOn: weekStartDay }), "MMM d");
    return `${start} - ${end}`;
  }, [weekStartDay]);

  // Check if a week is in the past
  const isWeekSpent = useCallback((weekStart) => {
    const endOfWeekDate = endOfWeek(weekStart, { weekStartsOn: weekStartDay });
    return isBefore(endOfWeekDate, new Date());
  }, [weekStartDay]);

  // Memoize the list of years for the Select component
  const realCurrentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => [realCurrentYear - 1, realCurrentYear, realCurrentYear + 1], [realCurrentYear]);

  // Memoize the weeks list to avoid recalculating on every render
  const memoizedWeeks = useMemo(() => weeks.map((weekStart) => {
    const isSpent = isWeekSpent(weekStart);
    const weekNumber = getCustomWeekNumber(weekStart, selectedYear, settings || {}); // Use custom week number function
    return {
      weekStart,
      isSpent,
      weekNumber,
      formattedRange: formatWeekRange(weekStart),
      isCurrentWeek: isSameWeek(weekStart, currentWeek, { weekStartsOn: weekStartDay }),
    };
  }), [weeks, isWeekSpent, selectedYear, formatWeekRange, currentWeek, settings, weekStartDay]);

  return (
    // <ThemeProvider theme={clickUpTheme}>
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        p: 3,
        // px: isMobile ? 2 : 3,
      }}
    >
      <Box
        sx={{
          // maxWidth: '1000px',
          mx: 'auto',
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <CalendarToday sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography
              variant="h5"
              sx={{
                color: 'text.primary',
                fontWeight: 600,
              }}
            >
              Yearly Calendar
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              ml: 5,
            }}
          >
            Custom week standard • Weeks start on Sunday • First week contains January 1st
          </Typography>
        </Box>

        {/* Year Selector */}
        <Box sx={{ mb: 3 }}>
          <FormControl
            size="small"
            sx={{
              minWidth: 140,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
                '&:hover': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                },
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: '2px',
                  },
                },
              },
            }}
          >
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              sx={{
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              {yearOptions.map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Weeks List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {memoizedWeeks.map((week, index) => (
            <Paper
              key={index}
              elevation={0}
              sx={{
                px: 2.5,
                py: 1.5,
                border: '1px solid',
                borderColor: week.isCurrentWeek ? 'primary.main' : 'divider',
                borderRadius: '6px',
                backgroundColor: week.isCurrentWeek
                  ? 'rgba(123, 104, 238, 0.04)'
                  : 'background.paper',
                opacity: week.isSpent ? 0.6 : 1,
                cursor: week.isSpent ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': week.isSpent ? {} : {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(123, 104, 238, 0.02)',
                  transform: 'translateX(4px)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: week.isCurrentWeek ? 'primary.main' : 'text.primary',
                      minWidth: '60px',
                    }}
                  >
                    Week {week.weekNumber}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {week.formattedRange}
                  </Typography>
                </Box>
                {week.isSpent && (
                  <CheckCircle
                    sx={{
                      fontSize: 18,
                      color: '#10b981',
                      opacity: 0.7,
                    }}
                  />
                )}
                {week.isCurrentWeek && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '4px',
                      backgroundColor: 'primary.main',
                      color: 'white',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Current
                  </Box>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
    // </ThemeProvider>
  );
};

export default CalendarPage;