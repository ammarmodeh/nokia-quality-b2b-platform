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
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  useMediaQuery,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  CalendarToday,
  CheckCircle,
  Close,
  Share, // For the export button
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import api from "../api/api";

const CalendarDialog = ({ open, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [settings, setSettings] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [weeks, setWeeks] = useState([]);
  const currentWeek = useMemo(() => new Date(), []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");
        setSettings(response.data);
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    if (open) fetchSettings();
  }, [open]);

  const weekStartDay = settings?.weekStartDay || 0;

  useEffect(() => {
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 11, 31));
    const weeksInYear = eachWeekOfInterval({ start, end }, { weekStartsOn: weekStartDay });
    setWeeks(weeksInYear);
  }, [selectedYear, weekStartDay]);

  const formatWeekRange = useCallback((startDate) => {
    const start = format(startDate, "MMM d");
    const endDate = endOfWeek(startDate, { weekStartsOn: weekStartDay });
    const end = format(endDate, "MMM d");
    return `${start} - ${end}`;
  }, [weekStartDay]);

  const isWeekSpent = useCallback((weekStart) => {
    const endOfWeekDate = endOfWeek(weekStart, { weekStartsOn: weekStartDay });
    return isBefore(endOfWeekDate, new Date());
  }, [weekStartDay]);

  const realCurrentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => [realCurrentYear - 1, realCurrentYear, realCurrentYear + 1], [realCurrentYear]);

  const memoizedWeeks = useMemo(() => weeks.map((weekStart) => {
    const isSpent = isWeekSpent(weekStart);
    const weekNumber = getCustomWeekNumber(weekStart, selectedYear, settings || {});
    return {
      weekStart,
      isSpent,
      weekNumber,
      formattedRange: formatWeekRange(weekStart),
      isCurrentWeek: isSameWeek(weekStart, currentWeek, { weekStartsOn: weekStartDay }),
    };
  }), [weeks, isWeekSpent, selectedYear, formatWeekRange, currentWeek, settings, weekStartDay]);

  // Generate shareable text
  const generateShareText = () => {
    const currentWeekData = memoizedWeeks.find(w => w.isCurrentWeek);
    const currentWeekText = currentWeekData
      ? `Week ${currentWeekData.weekNumber} (${currentWeekData.formattedRange})`
      : "Unknown";

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekStartDayName = days[weekStartDay];

    let text = `Yearly Calendar ${selectedYear}\n`;
    text += `Weeks start on ${weekStartDayName}\n\n`;
    text += `Current Week → ${currentWeekText}\n\n`;
    text += `Weekly Overview:\n`;
    text += `━━━━━━━━━━━━━━━━━━\n`;

    memoizedWeeks.forEach(week => {
      const status = week.isCurrentWeek ? "Current Week" : week.isSpent ? "Completed" : "Upcoming";
      text += `${week.isSpent ? "Completed" : ""} Week ${week.weekNumber}: ${week.formattedRange} ${week.isCurrentWeek ? "Current Week" : week.isSpent ? "" : ""}\n`;
    });

    text += `\nShared via Q-Ops Calendar App`;
    return text;
  };

  // Share to WhatsApp
  const handleShareToWhatsApp = () => {
    const message = encodeURIComponent(generateShareText());
    const whatsappUrl = `https://wa.me/?text=${message}`;

    // On mobile, this opens WhatsApp app; on desktop, opens web version
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      scroll="paper"
      sx={{
        "& .MuiDialog-paper": {
          backgroundImage: 'none',
        }
      }}
    >
      <DialogTitle sx={{
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CalendarToday sx={{ color: '#7b68ee', fontSize: 28 }} />
          <Typography variant="h6" sx={{ color: '#1f2937', fontWeight: 600 }}>
            Yearly Calendar
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Share to WhatsApp">
            <IconButton onClick={handleShareToWhatsApp} color="success">
              <Share />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', flexDirection: fullScreen ? 'column' : 'row', alignItems: fullScreen ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Custom week standard • Weeks start on {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][weekStartDay]}
          </Typography>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              sx={{ fontWeight: 500, fontSize: '0.875rem', color: '#1f2937' }}
            >
              {yearOptions.map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {memoizedWeeks.map((week, index) => (
            <Paper
              key={index}
              elevation={0}
              sx={{
                px: 2.5,
                py: 1.5,
                border: '1px solid',
                borderColor: week.isCurrentWeek ? '#7b68ee' : '#e5e7eb',
                borderRadius: '6px',
                backgroundColor: week.isCurrentWeek && 'rgba(123, 104, 238, 0.04)',
                opacity: week.isSpent ? 0.6 : 1,
                cursor: week.isSpent ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': week.isSpent ? {} : {
                  borderColor: '#7b68ee',
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
                      color: week.isCurrentWeek ? '#7b68ee' : '#1f2937',
                      minWidth: '60px',
                    }}
                  >
                    Week {week.weekNumber}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.8125rem' }}>
                    {week.formattedRange}
                  </Typography>
                </Box>
                {week.isSpent && (
                  <CheckCircle sx={{ fontSize: 18, color: '#10b981', opacity: 0.7 }} />
                )}
                {week.isCurrentWeek && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '4px',
                      backgroundColor: '#7b68ee',
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
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #e5e7eb', padding: '12px 24px', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          startIcon={<Share />}
          onClick={handleShareToWhatsApp}
          sx={{
            color: '#25D366', // WhatsApp green
            borderColor: '#25D366',
            '&:hover': {
              borderColor: '#128C7E',
              backgroundColor: 'rgba(37, 211, 102, 0.04)',
            },
          }}
        >
          Share to WhatsApp
        </Button>

        <Button onClick={onClose} sx={{ color: '#6b7280' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CalendarDialog;