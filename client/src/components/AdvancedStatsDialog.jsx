import { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem, Chip,
  ListItemText, Checkbox, Tabs, Tab,
  TextField,
} from '@mui/material';
import {
  parseISO, startOfWeek, getYear, startOfYear, eachWeekOfInterval,
  format, endOfWeek, eachMonthOfInterval
} from 'date-fns';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register the required components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);



const AdvancedStatsDialog = ({
  open,
  onClose,
  tasksData,
  colors,
  selectedDimension,
  selectedTimeframe,
  setSelectedTimeframe
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedItems, setSelectedItems] = useState([]);
  const [comparisonMode, setComparisonMode] = useState('single'); // 'single' or 'compare'
  const [comparisonGovernorate, setComparisonGovernorate] = useState('');
  const [comparisonReason, setComparisonReason] = useState('');
  const [comparisonGovernorates, setComparisonGovernorates] = useState([]);
  const [comparisonReasons, setComparisonReasons] = useState([]);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [combinedOptions, setCombinedOptions] = useState([]);



  useEffect(() => {
    console.log('Selected Items:', selectedItems);
  }, [selectedItems]);

  useEffect(() => {
    // Reset selections when tab changes
    setSelectedItems([]);
    setComparisonGovernorates([]);
    setComparisonReasons([]);
    setSelectedWeeks([]);
    setCombinedOptions([]);
  }, [tabValue]);


  const handleClose = () => {
    // Reset all selections
    setTabValue(0);
    setSelectedItems([]);
    setComparisonMode('single');
    setComparisonGovernorate('');
    setComparisonReason('');
    // Call the original onClose
    onClose();
  };

  const [combinedOptionName, setCombinedOptionName] = useState('');

  const handleAddCombinedOption = () => {
    if (combinedOptionName && selectedItems.length > 0) {
      setCombinedOptions([...combinedOptions, {
        name: combinedOptionName,
        items: selectedItems
      }]);
      setCombinedOptionName('');
      setSelectedItems([]);
    }
  };

  // Get all unique items based on selected dimension
  const dimensionItems = useMemo(() => {
    const items = new Set();
    tasksData.forEach(task => {
      const item = task[selectedDimension] || 'Not specified';
      items.add(item);
    });
    return Array.from(items).sort();
  }, [tasksData, selectedDimension]);

  // Get all unique governorates
  const allGovernorates = useMemo(() => {
    const govs = new Set();
    tasksData.forEach(task => {
      const gov = task.governorate || 'Not specified';
      govs.add(gov);
    });
    return Array.from(govs).sort();
  }, [tasksData]);

  // Get all unique reasons
  const allReasons = useMemo(() => {
    const reasons = new Set();
    tasksData.forEach(task => {
      const reason = task.reason || 'Not specified';
      reasons.add(reason);
    });
    return Array.from(reasons).sort();
  }, [tasksData]);

  // Get all months in the data
  const allMonths = useMemo(() => {
    const monthsSet = new Set();
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
      const monthsInYear = eachMonthOfInterval({
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31)
      });

      monthsInYear.forEach(month => {
        monthsSet.add(format(month, 'yyyy-MM'));
      });
    });

    return Array.from(monthsSet).sort();
  }, [tasksData]);

  const getWeekKey = (date) => {
    if (!date) return null;
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const year = getYear(weekStart);
    const weekNumber = Math.ceil((weekStart - startOfYear(weekStart)) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${weekNumber}`;
  };

  // Get all weeks in the data
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

  // Prepare trend data for the selected dimension
  const prepareTrendData = () => {
    const timePeriods = selectedTimeframe === 'weekly' ? selectedWeeks : allMonths;

    const datasets = [...selectedItems, ...combinedOptions].map(item => {
      const itemName = typeof item === 'string' ? item : item.name;
      const itemValues = typeof item === 'string' ? [item] : item.items;

      const counts = timePeriods.map(period => {
        return tasksData.filter(task => {
          const taskItem = task[selectedDimension] || 'Not specified';
          if (!itemValues.includes(taskItem)) return false;

          let taskDate;
          if (task.interviewDate) {
            taskDate = typeof task.interviewDate === 'string' ? task.interviewDate : task.interviewDate.$date;
          } else {
            taskDate = task.createdAt?.$date || task.updatedAt?.$date;
          }

          if (!taskDate) return false;

          try {
            const parsedDate = parseISO(taskDate);
            if (selectedTimeframe === 'weekly') {
              const taskWeek = getWeekKey(parsedDate);
              return taskWeek === period;
            } else {
              const taskMonth = format(parsedDate, 'yyyy-MM');
              return taskMonth === period;
            }
          } catch (e) {
            return false;
          }
        }).length;
      });

      return {
        label: itemName,
        data: counts,
        borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
        backgroundColor: `hsla(${Math.random() * 360}, 70%, 50%, 0.1)`,
        tension: 0.1,
        fill: true
      };
    });

    return {
      labels: timePeriods.map(period => {
        if (selectedTimeframe === 'weekly') {
          const [year, weekNum] = period.split('-W');
          return `Week ${weekNum}`;
        } else {
          return format(parseISO(`${period}-01`), 'MMM yyyy');
        }
      }),
      datasets
    };
  };

  // Prepare reason comparison data across governorates
  const prepareReasonComparisonData = () => {
    if (comparisonReasons.length === 0 || comparisonGovernorates.length === 0) return null;

    const timePeriods = selectedTimeframe === 'weekly' ? selectedWeeks : allMonths;

    const datasets = comparisonReasons.flatMap(reason =>
      comparisonGovernorates.map(governorate => {
        const data = timePeriods.map(period => {
          return tasksData.filter(task => {
            if (task.governorate !== governorate || task.reason !== reason) return false;

            let taskDate;
            if (task.interviewDate) {
              taskDate = typeof task.interviewDate === 'string' ? task.interviewDate : task.interviewDate.$date;
            } else {
              taskDate = task.createdAt?.$date || task.updatedAt?.$date;
            }

            if (!taskDate) return false;

            try {
              const parsedDate = parseISO(taskDate);
              if (selectedTimeframe === 'weekly') {
                const taskWeek = getWeekKey(parsedDate);
                return taskWeek === period;
              } else {
                const taskMonth = format(parsedDate, 'yyyy-MM');
                return taskMonth === period;
              }
            } catch (e) {
              return false;
            }
          }).length;
        });

        return {
          label: `${reason} in ${governorate}`,
          data,
          borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
          backgroundColor: `hsla(${Math.random() * 360}, 70%, 50%, 0.1)`,
          tension: 0.1,
          fill: true
        };
      })
    );

    return {
      labels: timePeriods.map(period => {
        if (selectedTimeframe === 'weekly') {
          const [year, weekNum] = period.split('-W');
          return `Week ${weekNum}`;
        } else {
          return format(parseISO(`${period}-01`), 'MMM yyyy');
        }
      }),
      datasets
    };
  };

  const lineChartOptions = {
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

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle sx={{ color: colors.textPrimary, backgroundColor: colors.surface }}>
        Advanced Statistics - {selectedDimension.charAt(0).toUpperCase() + selectedDimension.slice(1)}
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: colors.surface }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab label="Trend Analysis" />
          <Tab label="Reason Comparison" />
        </Tabs>

        <Box sx={{ mb: 2 }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel sx={{ color: colors.textSecondary, '&.Mui-focused': { color: colors.primary } }}>
              Timeframe
            </InputLabel>
            <Select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              label="Timeframe"
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
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>
        </Box>

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

        {tabValue === 0 && (
          <>
            <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>
              Select {selectedDimension === 'reason' ? 'Reasons' :
                selectedDimension === 'governorate' ? 'Governorates' :
                  'Items'} to Compare
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel sx={{ color: colors.textSecondary, '&.Mui-focused': { color: colors.primary } }}>
                {selectedDimension === 'reason' ? 'Reasons' :
                  selectedDimension === 'governorate' ? 'Governorates' :
                    'Items'}
              </InputLabel>
              <Select
                multiple
                value={selectedItems}
                onChange={(e) => setSelectedItems(e.target.value)}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((item) => (
                      <Chip
                        key={item}
                        label={item}
                        size="small"
                        sx={{ backgroundColor: colors.primary, color: colors.textPrimary }}
                      />
                    ))}
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
                {dimensionItems.map((item) => (
                  <MenuItem key={item} value={item}>
                    <Checkbox checked={selectedItems.includes(item)} />
                    <ListItemText primary={item} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}

        <Box sx={{ mt: 2 }}>
          {combinedOptions.map((option, index) => (
            <Chip
              key={index}
              label={`${option.name}: ${option.items.join(', ')}`}
              onDelete={() => {
                const newOptions = [...combinedOptions];
                newOptions.splice(index, 1);
                setCombinedOptions(newOptions);
              }}
              sx={{ m: 0.5 }}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Combine Options"
            variant="outlined"
            size="small"
            value={combinedOptionName}
            onChange={(e) => setCombinedOptionName(e.target.value)}
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: colors.border },
                '&:hover fieldset': { borderColor: colors.primary },
              },
              '& .MuiInputLabel-root': { color: colors.textSecondary },
              '& .MuiInputBase-input': { color: colors.textPrimary },
            }}
          />
          <Button
            variant="contained"
            onClick={handleAddCombinedOption}
          // sx={{ height: '56px' }}
          >
            Add Combined Option
          </Button>
        </Box>

        {tabValue === 1 && (
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel sx={{ color: colors.textSecondary, '&.Mui-focused': { color: colors.primary } }}>
                  Governorate
                </InputLabel>
                <Select
                  multiple
                  value={comparisonGovernorates}
                  onChange={(e) => setComparisonGovernorates(e.target.value)}
                  label="Governorate"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((gov) => (
                        <Chip key={gov} label={gov} size="small" sx={{ backgroundColor: colors.primary, color: colors.textPrimary }} />
                      ))}
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
                  {allGovernorates.map((gov) => (
                    <MenuItem key={gov} value={gov}>
                      <Checkbox checked={comparisonGovernorates.includes(gov)} />
                      <ListItemText primary={gov} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ flex: 1 }}>
                <InputLabel sx={{ color: colors.textSecondary, '&.Mui-focused': { color: colors.primary } }}>
                  Reason
                </InputLabel>
                <Select
                  multiple
                  value={comparisonReasons}
                  onChange={(e) => setComparisonReasons(e.target.value)}
                  label="Reason"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((reason) => (
                        <Chip key={reason} label={reason} size="small" sx={{ backgroundColor: colors.primary, color: colors.textPrimary }} />
                      ))}
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
                  {allReasons.map((reason) => (
                    <MenuItem key={reason} value={reason}>
                      <Checkbox checked={comparisonReasons.includes(reason)} />
                      <ListItemText primary={reason} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </>
        )}

        {tabValue === 0 && selectedItems.length > 0 && (
          <Box sx={{ height: '500px', mt: 2 }}>
            <Line data={prepareTrendData()} options={lineChartOptions} />
          </Box>
        )}

        {comparisonReasons.length > 0 && comparisonGovernorates.length > 0 && (
          <Box sx={{ height: '500px', mt: 2 }}>
            <Line data={prepareReasonComparisonData()} options={lineChartOptions} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ backgroundColor: colors.surface }}>
        <Button onClick={handleClose} sx={{ color: colors.textPrimary }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdvancedStatsDialog;