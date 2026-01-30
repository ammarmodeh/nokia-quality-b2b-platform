import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Divider,
  useTheme,
  alpha,
  Button,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  FaSmile,
  FaMeh,
  FaFrown,
  FaPoll,
  FaEnvelope
} from 'react-icons/fa';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { startOfYear, endOfYear, eachWeekOfInterval, format } from 'date-fns';
import {
  filterTasksByWeek,
  filterTasksByMonth,
  filterTasksByDateRange,
  getAvailableWeeks,
  getAvailableMonths,
  aggregateSamples
} from '../utils/dateFilterHelpers';
import { getCustomWeekNumber } from '../utils/helpers';
import ManagementEmailDialog from './ManagementEmailDialog';
import NPSDetailsDialog from './NPSDetailsDialog';

const NPSSummaryCard = ({ tasks = [], samplesData = [], teamsData = [], settings = {} }) => {
  const theme = useTheme();

  // States
  const currentYear = new Date().getFullYear();

  // Calculate current week for default selection
  const defaultWeek = useMemo(() => {
    return getCustomWeekNumber(new Date(), currentYear, settings);
  }, [settings, currentYear]);

  // States
  const [filterType, setFilterType] = useState('week'); // Default to current week
  const [selectedPeriod, setSelectedPeriod] = useState(defaultWeek ? defaultWeek.toString() : 'all');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  // Details Dialog State
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsType, setDetailsType] = useState('');
  const [detailsTasks, setDetailsTasks] = useState([]);


  // Helper for weeks interval
  const weeksInterval = useMemo(() => {
    const start = startOfYear(new Date(currentYear, 0, 1));
    const end = endOfYear(new Date(currentYear, 11, 31));
    return eachWeekOfInterval({ start, end }, { weekStartsOn: settings?.weekStartDay || 0 });
  }, [currentYear, settings]);

  // Available options
  const weeks = useMemo(() => getAvailableWeeks(tasks, settings), [tasks, settings]);
  const months = useMemo(() => getAvailableMonths(tasks, settings), [tasks, settings]);

  // Derived Stats
  const stats = useMemo(() => {
    let filteredTasks = tasks;
    let totalSamples = 0;
    const currentSettings = settings || { weekStartDay: 0, startWeekNumber: 1 };

    if (filterType === 'all') {
      filteredTasks = tasks;
      totalSamples = aggregateSamples(samplesData, 'all');
    } else if (filterType === 'week' && selectedPeriod !== 'all') {
      const weekNum = parseInt(selectedPeriod);
      const selectedWeekObj = weeks.find(w => w.week.toString() === selectedPeriod && w.year === currentYear);
      filteredTasks = filterTasksByWeek(tasks, currentYear, weekNum, currentSettings);
      totalSamples = aggregateSamples(samplesData, 'week', { weekNumber: weekNum, startDate: selectedWeekObj?.start, year: selectedWeekObj?.year || currentYear }, currentSettings);
    } else if (filterType === 'month') { // Removed `&& selectedPeriod !== 'all'` to allow default month selection
      const monthNum = selectedPeriod === 'all' && months.length > 0 ? months[0].month : parseInt(selectedPeriod);
      filteredTasks = filterTasksByMonth(tasks, currentYear, monthNum, currentSettings);
      // We also need to filter samples. We need aggregated samples for the month.
      // aggregateSamples implementation needs checking if it supports new month logic.
      // Passing 'month' and monthNum to it.
      totalSamples = aggregateSamples(samplesData, 'month', { month: monthNum }, currentSettings);
    } else if (filterType === 'custom' && dateRange.start && dateRange.end) {
      filteredTasks = filterTasksByDateRange(tasks, dateRange.start, dateRange.end);
      totalSamples = aggregateSamples(samplesData, 'range', { ...dateRange, weeksInterval }, currentSettings);
    } else {
      // Fallback
      totalSamples = aggregateSamples(samplesData, 'all');
    }

    // Determine explicit start/end for the period
    let periodStart = null;
    let periodEnd = null;

    if (filterType === 'all') {
      periodStart = startOfYear(new Date(currentYear, 0, 1));
      periodEnd = endOfYear(new Date(currentYear, 11, 31));
    } else if (filterType === 'week' && selectedPeriod !== 'all') {
      const selectedWeekObj = weeks.find(w => w.week.toString() === selectedPeriod && w.year === currentYear);
      if (selectedWeekObj) {
        periodStart = selectedWeekObj.start;
        periodEnd = selectedWeekObj.end;
      }
    } else if (filterType === 'month' && selectedPeriod !== 'all') {
      const monthIdx = parseInt(selectedPeriod);
      const selectedMonthObj = months.find(m => m.month === monthIdx);
      if (selectedMonthObj) {
        periodStart = selectedMonthObj.start;
        periodEnd = selectedMonthObj.end;
      }
    } else if (filterType === 'custom' && dateRange.start && dateRange.end) {
      periodStart = dateRange.start;
      periodEnd = dateRange.end;
    }

    const detractorsTasks = filteredTasks.filter(t => t.evaluationScore >= 1 && t.evaluationScore <= 6);
    const neutralsTasks = filteredTasks.filter(t => t.evaluationScore >= 7 && t.evaluationScore <= 8);

    const detractors = detractorsTasks.length;
    const neutrals = neutralsTasks.length;
    const promoters = Math.max(0, totalSamples - (detractors + neutrals));

    const promotersPercent = totalSamples > 0 ? Math.round((promoters / totalSamples) * 100) : 0;
    const detractorsPercent = totalSamples > 0 ? Math.round((detractors / totalSamples) * 100) : 0;

    const nps = promotersPercent - detractorsPercent;

    // Use dynamic targets from settings, fallback to defaults if not available
    const targetPromoters = settings?.npsTargets?.promoters ?? 75;
    const targetDetractors = settings?.npsTargets?.detractors ?? 8;

    const isPromoterAlarm = promotersPercent < targetPromoters && totalSamples > 0;
    const isDetractorAlarm = detractorsPercent > targetDetractors && totalSamples > 0;

    return {
      totalSamples, promoters, neutrals, detractors, nps, filteredTasks,
      promotersPercent, detractorsPercent, targetPromoters, targetDetractors,
      isPromoterAlarm, isDetractorAlarm,
      periodStart, periodEnd,
      detractorsTasks, neutralsTasks
    };
  }, [tasks, samplesData, filterType, selectedPeriod, dateRange, currentYear, weeksInterval, weeks, months]);

  const periodLabel = useMemo(() => {
    if (filterType === 'all') return 'Full Year Analytics';
    if (filterType === 'week') return `Week ${selectedPeriod}`;
    if (filterType === 'month') return months.find(m => m.month === parseInt(selectedPeriod))?.label || 'Selected Month';
    if (filterType === 'custom' && dateRange.start && dateRange.end) {
      return `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d')}`;
    }
    return '';
  }, [filterType, selectedPeriod, months, dateRange]);

  const handleCardClick = (type) => {
    if (type === 'Detractors') {
      setDetailsTasks(stats.detractorsTasks);
      setDetailsType('Detractors');
      setDetailsOpen(true);
    } else if (type === 'Neutrals') {
      setDetailsTasks(stats.neutralsTasks);
      setDetailsType('Neutrals');
      setDetailsOpen(true);
    }
  };

  const StatItem = ({ label, value, icon, color, target, current, isAlarm, isClickable = false }) => (
    <Box
      onClick={() => isClickable && handleCardClick(label)}
      sx={{
        p: { xs: 1.5, sm: 2 },
        textAlign: 'center',
        position: 'relative',
        borderRadius: 3,
        transition: 'all 0.3s ease',
        cursor: isClickable ? 'pointer' : 'default',
        '&:hover': isClickable ? {
          bgcolor: alpha(color, 0.05),
          transform: 'translateY(-2px)',
          boxShadow: 2
        } : {},
        ...(isAlarm && {
          bgcolor: alpha('#ef4444', 0.05),
          animation: 'pulse 2s infinite ease-in-out',
          '@keyframes pulse': {
            '0%': { boxShadow: `0 0 0 0 ${alpha('#ef4444', 0.2)}` },
            '70%': { boxShadow: `0 0 0 10px ${alpha('#ef4444', 0)}` },
            '100%': { boxShadow: `0 0 0 0 ${alpha('#ef4444', 0)}` }
          }
        })
      }}>
      <Box sx={{
        display: 'inline-flex',
        p: 1.5,
        borderRadius: 2,
        bgcolor: alpha(color, 0.1),
        color: color,
        mb: 1,
        position: 'relative'
      }}>
        {icon}
        {isAlarm && (
          <Box sx={{
            position: 'absolute',
            top: -5,
            right: -5,
            width: 12,
            height: 12,
            bgcolor: '#ef4444',
            borderRadius: '50%',
            border: '2px solid #fff',
            animation: 'flash 1s infinite alternate',
            '@keyframes flash': {
              from: { opacity: 0.5 },
              to: { opacity: 1 }
            }
          }} />
        )}
      </Box>
      <Typography variant="h5" fontWeight="800" color={isAlarm ? "#ef4444" : "textPrimary"}>
        {value}
      </Typography>
      <Typography variant="caption" color="textSecondary" fontWeight="600" sx={{ display: 'block' }}>
        {label}
      </Typography>
      {target !== undefined && (
        <Typography variant="caption" sx={{
          fontSize: '0.65rem',
          fontWeight: 'bold',
          color: isAlarm ? "#ef4444" : "textSecondary",
          display: 'block',
          mt: 0.5
        }}>
          {current}% (Goal: {label === 'Promoters' ? '≥' : '≤'}{target}%)
        </Typography>
      )}
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card sx={{
        borderRadius: 4,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        overflow: 'visible',
        // bgcolor: '#fff',
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', md: 'center' }} spacing={2} mb={3}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                display: 'flex'
              }}>
                <FaPoll size={20} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="800">NPS Performance</Typography>
                {/* <Typography variant="caption" color="textSecondary">Interactive Sentiment Scoring</Typography> */}
              </Box>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
              <ToggleButtonGroup
                value={filterType}
                exclusive
                onChange={(e, v) => {
                  if (v) {
                    setFilterType(v);
                    if (v === 'week') {
                      // Default to latest available week or current
                      const latestWeek = weeks.length > 0 ? weeks[0].week.toString() : (defaultWeek ? defaultWeek.toString() : 'all');
                      setSelectedPeriod(latestWeek);
                    } else if (v === 'month') {
                      // Default to latest available month
                      const latestMonth = months.length > 0 ? months[0].month.toString() : '1';
                      setSelectedPeriod(latestMonth);
                    } else {
                      setSelectedPeriod('all');
                    }
                  }
                }}
                size="small"
                sx={{
                  // bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  '& .MuiToggleButton-root': { border: 'none', px: 2, py: 0.5, borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }
                }}
              >
                <ToggleButton value="all">Year</ToggleButton>
                <ToggleButton value="week">Week</ToggleButton>
                <ToggleButton value="month">Month</ToggleButton>
                <ToggleButton value="custom">Range</ToggleButton>
              </ToggleButtonGroup>

              {filterType === 'week' && (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    {weeks.length === 0 && <MenuItem value="all" disabled>No Weeks</MenuItem>}
                    {weeks.map(w => <MenuItem key={w.key} value={w.week.toString()}>{w.label}</MenuItem>)}
                  </Select>
                </FormControl>
              )}

              {filterType === 'month' && (
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <Select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    {months.length === 0 && <MenuItem value="all" disabled>No Months</MenuItem>}
                    {months.map(m => <MenuItem key={m.key} value={m.month.toString()}>{m.label}</MenuItem>)}
                  </Select>
                </FormControl>
              )}

              {filterType === 'custom' && (
                <Stack direction="row" spacing={1}>
                  <DatePicker
                    label="Start"
                    value={dateRange.start}
                    onChange={(v) => setDateRange(prev => ({ ...prev, start: v }))}
                    slotProps={{ textField: { size: 'small', sx: { width: 130 } } }}
                  />
                  <DatePicker
                    label="End"
                    value={dateRange.end}
                    onChange={(v) => setDateRange(prev => ({ ...prev, end: v }))}
                    slotProps={{ textField: { size: 'small', sx: { width: 130 } } }}
                  />
                </Stack>
              )}

              <Button
                variant="outlined"
                startIcon={<FaEnvelope />}
                onClick={() => setShowEmailDialog(true)}
                sx={{ borderRadius: 2, height: 40, textTransform: 'none', fontWeight: 'bold' }}
              >
                Report
              </Button>
            </Stack>
          </Stack>

          <Grid container spacing={0} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Box sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                borderRadius: 4,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                border: '1px dashed',
                borderColor: alpha(theme.palette.primary.main, 0.2)
              }}>
                <Typography variant="caption" color="primary" fontWeight="800" sx={{ mb: 0.5, letterSpacing: 1 }}>
                  {periodLabel.toUpperCase()}
                </Typography>
                <Typography variant="h2" fontWeight="900" color="primary.main">
                  {stats.nps}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {stats.totalSamples} Total Samples
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={8}>
              <Grid container spacing={1}>
                <Grid item xs={4} sm={4}>
                  <StatItem
                    label="Promoters"
                    value={stats.promoters}
                    icon={<FaSmile size={20} />}
                    color="#10b981"
                    target={stats.targetPromoters}
                    current={stats.promotersPercent}
                    isAlarm={stats.isPromoterAlarm}
                  />
                </Grid>
                <Grid item xs={4} sm={4}>
                  <StatItem
                    label="Neutrals"
                    value={stats.neutrals}
                    icon={<FaMeh size={20} />}
                    color="#f59e0b"
                    isClickable={true}
                  />
                </Grid>
                <Grid item xs={4} sm={4}>
                  <StatItem
                    label="Detractors"
                    value={stats.detractors}
                    icon={<FaFrown size={20} />}
                    color="#ef4444"
                    target={stats.targetDetractors}
                    current={stats.detractorsPercent}
                    isAlarm={stats.isDetractorAlarm}
                    isClickable={true}
                  />
                </Grid>
              </Grid>

              <Box sx={{ px: 3, mt: 1 }}>
                <Box sx={{
                  height: 10,
                  width: '100%',
                  bgcolor: '#f1f5f9',
                  borderRadius: 5,
                  display: 'flex',
                  overflow: 'hidden'
                }}>
                  <Box sx={{ width: `${(stats.promoters / (stats.totalSamples || 1)) * 100}%`, bgcolor: '#10b981' }} />
                  <Box sx={{ width: `${(stats.neutrals / (stats.totalSamples || 1)) * 100}%`, bgcolor: '#f59e0b' }} />
                  <Box sx={{ width: `${(stats.detractors / (stats.totalSamples || 1)) * 100}%`, bgcolor: '#ef4444' }} />
                </Box>
                {/* <Stack direction="row" justifyContent="space-between" mt={1}>
                  <Typography variant="caption" color="textSecondary">Sentiment Balance</Typography>
                  <Typography variant="caption" fontWeight="bold">NPS Score: {stats.nps}</Typography>
                </Stack> */}
              </Box>
            </Grid>
          </Grid>

          <Divider />

          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} /> Promoters (9-10)
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} /> Neutrals (7-8)
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} /> Detractors (1-6)
            </Typography>
          </Box>
        </CardContent>

        <ManagementEmailDialog
          open={showEmailDialog}
          onClose={() => setShowEmailDialog(false)}
          data={{ tasks: stats.filteredTasks, teamsData, samplesData, totalSamples: stats.totalSamples, allTasks: tasks }}
          type="dashboard"
          period={periodLabel}
          startDate={stats.periodStart}
          endDate={stats.periodEnd}
          settings={settings}
        />

        {/* NPS Details Dialog */}
        <NPSDetailsDialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          title={`${detailsType} - ${periodLabel}`}
          tasks={detailsTasks}
        />
      </Card>
    </LocalizationProvider>
  );
};

export default NPSSummaryCard;
