import { useState, useMemo } from 'react';
import {
  Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  ListItemText,
  Checkbox,
  ButtonGroup,
  Divider
} from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { parseISO, startOfWeek, getYear, startOfYear, eachWeekOfInterval, format, endOfWeek } from 'date-fns';

const GovernorateDetailsDialog = ({ open, onClose, governorateData, colors, tasksData, stats }) => {
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [comparisonMode, setComparisonMode] = useState('single'); // 'single' or 'compare'
  const [comparisonReason, setComparisonReason] = useState('');
  const [comparisonGovernorate, setComparisonGovernorate] = useState('');

  const getWeekKey = (date) => {
    if (!date) return null;
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const year = getYear(weekStart);
    const weekNumber = Math.ceil((weekStart - startOfYear(weekStart)) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${weekNumber}`;
  };

  const allWeeks = useMemo(() => {
    const weeksSet = new Set();
    const years = new Set();

    tasksData.forEach(task => {
      let dateToUse;
      if (task.interviewDate) {
        dateToUse = typeof task.interviewDate === 'string' ? task.interviewDate : task.interviewDate.$date;
      } else {
        dateToUse = task.createdAt?.$date || task.updatedAt?.$date;
      }

      if (dateToUse) {
        try {
          const parsedDate = parseISO(dateToUse);
          if (!isNaN(parsedDate.getTime())) {
            years.add(getYear(parsedDate));
          }
        } catch (e) {
          console.warn('Invalid date format:', dateToUse);
        }
      }
    });

    if (years.size === 0) {
      years.add(getYear(new Date()));
    }

    Array.from(years).forEach(year => {
      const start = startOfYear(new Date(year, 0, 1));
      const end = new Date(year, 11, 31);
      const weeksInYear = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });

      weeksInYear.forEach(weekStart => {
        const weekKey = getWeekKey(weekStart);
        if (weekKey) weeksSet.add(weekKey);
      });
    });

    return Array.from(weeksSet).sort((a, b) => {
      const [yearA, weekA] = a.split('-W').map(Number);
      const [yearB, weekB] = b.split('-W').map(Number);
      return yearA !== yearB ? yearA - yearB : weekA - weekB;
    });
  }, [tasksData]);

  const formatWeekRange = (startDate) => {
    const start = format(startDate, "MMM d, yyyy");
    const end = format(endOfWeek(startDate, { weekStartsOn: 0 }), "MMM d, yyyy");
    return `${start} - ${end}`;
  };

  if (!governorateData) return null;


  const reasons = Object.entries(governorateData.reasons || {})
    .sort((a, b) => b[1].count - a[1].count);

  const reasonsChartData = {
    labels: reasons.map(([reason]) => reason),
    datasets: [{
      label: 'Count',
      data: reasons.map(([_, data]) => data.count),
      backgroundColor: reasons.map(() => `hsl(${Math.random() * 360}, 70%, 50%)`),
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: colors.textPrimary
        }
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${context.raw}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: colors.textSecondary
        },
        grid: {
          color: colors.border
        }
      },
      x: {
        ticks: {
          color: colors.textSecondary
        },
        grid: {
          color: colors.border
        }
      }
    }
  };

  const prepareReasonComparisonData = (reason) => {
    if (!reason || !stats || selectedWeeks.length === 0) return null;

    const governorates = Object.keys(stats.governorateStats || {}).filter(g => g !== 'Not specified');

    return {
      labels: governorates,
      datasets: [{
        label: `${reason} Count`,
        data: governorates.map(governorate => {
          return tasksData.filter(task => {
            const taskGovernorate = task.governorate === governorate;
            const taskReason = task.reason === reason;

            let taskDate;
            if (task.interviewDate) {
              taskDate = typeof task.interviewDate === 'string' ? task.interviewDate : task.interviewDate.$date;
            } else {
              taskDate = task.createdAt?.$date || task.updatedAt?.$date;
            }

            if (!taskDate) return false;

            try {
              const parsedDate = parseISO(taskDate);
              const taskWeek = getWeekKey(parsedDate);
              return taskGovernorate && taskReason && selectedWeeks.includes(taskWeek);
            } catch (e) {
              return false;
            }
          }).length;
        }),
        backgroundColor: governorates.map(() => `hsl(${Math.random() * 360}, 70%, 50%)`),
      }]
    };
  };


  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle sx={{ color: colors.textPrimary, backgroundColor: colors.surface }}>
        {governorateData.governorate} - Details
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: colors.surface }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: colors.textSecondary, '&.Mui-focused': { color: colors.primary } }}>
            Select Weeks
          </InputLabel>
          <Select
            multiple
            value={selectedWeeks}
            onChange={(e) => {
              const value = e.target.value;
              if (value.includes('all')) {
                setSelectedWeeks(value.includes('all') && value.length === 1 ? allWeeks : []);
              } else {
                setSelectedWeeks(value);
              }
            }}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.length === allWeeks.length ? (
                  <Chip label="All Weeks" size="small" sx={{ backgroundColor: colors.primary, color: colors.textPrimary }} />
                ) : (
                  selected.map((week) => (
                    <Chip key={week} label={week} size="small" sx={{ backgroundColor: colors.primary, color: colors.textPrimary }} />
                  ))
                )}
              </Box>
            )}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: colors.border,
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: colors.primary,
              },
              '& .MuiSelect-icon': {
                color: colors.textPrimary,
              },
              '& .MuiInputBase-input': {
                color: colors.textPrimary,
              },
            }}
          >
            <MenuItem value="all">
              <Checkbox checked={selectedWeeks.length === allWeeks.length} />
              <ListItemText primary="Select All Weeks" />
            </MenuItem>
            {allWeeks.map((week) => {
              const [year, weekNum] = week.split('-W');
              const weekStart = startOfWeek(new Date(year, 0, 1), { weekStartsOn: 0 });
              const adjustedWeekStart = new Date(weekStart);
              adjustedWeekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
              const weekRange = formatWeekRange(adjustedWeekStart);

              return (
                <MenuItem key={week} value={week}>
                  <Checkbox checked={selectedWeeks.includes(week)} />
                  <ListItemText primary={`Week ${weekNum} (${weekRange})`} />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>


        <Box sx={{ mb: 2 }}>
          <ButtonGroup variant="contained">
            <Button
              onClick={() => setComparisonMode('single')}
              sx={{ backgroundColor: comparisonMode === 'single' ? colors.primary : colors.surfaceElevated }}
            >
              Single View
            </Button>
            <Button
              onClick={() => setComparisonMode('compare')}
              sx={{ backgroundColor: comparisonMode === 'compare' ? colors.primary : colors.surfaceElevated }}
            >
              Comparison View
            </Button>
          </ButtonGroup>
        </Box>

        {/* {comparisonMode === 'compare' && (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Reason to Compare</InputLabel>
              <Select
                value={comparisonReason}
                onChange={(e) => setComparisonReason(e.target.value)}
                label="Reason to Compare"
              >
                {Object.keys(governorateData.reasons || {}).map(reason => (
                  <MenuItem key={reason} value={reason}>{reason}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {comparisonReason && (
              <Box sx={{ height: '400px', mt: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>
                  {comparisonReason} Across Governorates
                </Typography>
                <Bar
                  data={prepareReasonComparisonData(comparisonReason)}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        display: true,
                        text: `Comparison of ${comparisonReason} Across Governorates`,
                        color: colors.textPrimary
                      }
                    }
                  }}
                />
              </Box>
            )}
          </>
        )} */}

        {comparisonMode === 'compare' && comparisonReason && (
          <Box sx={{ height: '400px', my: 8 }}>
            <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>
              {comparisonReason} Across Governorates
            </Typography>
            <Bar
              data={prepareReasonComparisonData(comparisonReason)}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    display: true,
                    text: `Comparison of ${comparisonReason} Across Governorates`,
                    color: colors.textPrimary
                  }
                }
              }}
            />
          </Box>
        )}

        <Divider sx={{ my: 8, backgroundColor: '#3c3b3b' }} />



        <Divider sx={{ my: 2, backgroundColor: '#3c3b3b' }} />

        <Box sx={{ height: '400px', my: 8 }}>
          <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>
            Reasons
          </Typography>
          <Bar data={reasonsChartData} options={chartOptions} />
        </Box>

        <Divider sx={{ my: 8, backgroundColor: '#3c3b3b' }} />


      </DialogContent>
      <DialogActions sx={{ backgroundColor: colors.surface }}>
        <Button onClick={onClose} sx={{ color: colors.textPrimary }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GovernorateDetailsDialog;
