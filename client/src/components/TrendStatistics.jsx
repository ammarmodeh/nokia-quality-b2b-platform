import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Stack,
  useMediaQuery,
  TextField,
  IconButton,
  Autocomplete
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { calculateTrendData, calculatePercentageChange } from '../utils/dateFilterHelpers';
import { MdTrendingFlat, MdFileDownload } from 'react-icons/md';
import * as XLSX from 'xlsx';
import AIAnalysisButton from './AIAnalysisButton';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TrendStatistics = ({ tasks }) => {
  const isMobile = useMediaQuery('(max-width:503px)');
  const [period, setPeriod] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState('totalViolations');
  const [analysisType, setAnalysisType] = useState('team'); // 'team' or 'reason'
  const [range, setRange] = useState(8); // 8, 'all', or 'custom'
  const [viewMode, setViewMode] = useState('top5'); // 'top5' or 'all'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState([]);

  // Handlers
  const handlePeriodChange = (event, newPeriod) => {
    if (newPeriod !== null) setPeriod(newPeriod);
  };

  const handleMetricChange = (event, newMetric) => {
    if (newMetric !== null) setSelectedMetric(newMetric);
  };

  const handleAnalysisTypeChange = (event, newType) => {
    if (newType !== null) {
      setAnalysisType(newType);
      setSelectedEntities([]); // Reset selection on analysis type change
    }
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) setViewMode(newMode);
  };

  const handleRangeChange = (event, newRange) => {
    if (newRange !== null) setRange(newRange);
  };

  const handleSelectedEntitiesChange = (event, newValue) => {
    setSelectedEntities(newValue);
  };

  // Calculate trend data
  const trendData = useMemo(() => {
    let dateRange = null;
    if (range === 'custom') {
      if (customStart && customEnd) {
        dateRange = { start: customStart, end: customEnd };
      } else {
        return {}; // Don't calculate if dates incomplete
      }
    }

    return calculateTrendData(tasks, period, range, analysisType, dateRange);
  }, [tasks, period, range, analysisType, customStart, customEnd]);

  // Get available entities for autocomplete
  const allAvailableEntities = useMemo(() => {
    return Object.keys(trendData).sort();
  }, [trendData]);

  // Get entities to display (Top 5 or All or Selected)
  const topEntities = useMemo(() => {
    if (Object.keys(trendData).length === 0) return [];

    // If specific entities selected, use those
    if (selectedEntities.length > 0) {
      return selectedEntities;
    }

    const totals = Object.entries(trendData).map(([name, data]) => ({
      name,
      total: data.totalViolations.reduce((sum, val) => sum + val, 0)
    }));

    const sorted = totals.sort((a, b) => b.total - a.total);

    if (viewMode === 'all') {
      return sorted.map(t => t.name);
    }

    return sorted.slice(0, 5).map(t => t.name);
  }, [trendData, viewMode, selectedEntities]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (topEntities.length === 0) return null;

    const colors = [
      '#f44336', // Red
      '#ff9800', // Orange
      '#ffd700', // Gold
      '#4caf50', // Green
      '#2196f3', // Blue
      '#9c27b0', // Purple
      '#3f51b5', // Indigo
      '#00bcd4', // Cyan
      '#8bc34a', // Light Green
      '#e91e63', // Pink
    ];

    // Align labels from the first entity
    const firstEntity = trendData[topEntities[0]];
    if (!firstEntity) return null;

    const datasets = topEntities.map((name, index) => {
      const data = trendData[name];
      if (!data) return null;

      return {
        label: name,
        data: data[selectedMetric] || [],
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '33',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    }).filter(Boolean);

    return {
      labels: firstEntity.periods,
      datasets
    };
  }, [trendData, topEntities, selectedMetric]);

  // Calculate detailed trend analysis
  const trendAnalysis = useMemo(() => {
    const analysis = topEntities.map(name => {
      const dataObj = trendData[name];
      // Be defensive against empty data
      if (!dataObj || !dataObj[selectedMetric] || dataObj[selectedMetric].length < 2) {
        return {
          name,
          change: 0,
          direction: 'flat',
          current: dataObj && dataObj[selectedMetric] && dataObj[selectedMetric].length > 0 ? dataObj[selectedMetric][0] : 0,
          previous: 0,
          status: 'Stable'
        };
      }

      const data = dataObj[selectedMetric];
      const current = data[data.length - 1];
      const previous = data[data.length - 2];
      const change = calculatePercentageChange(current, previous);

      let direction = 'flat';
      let status = 'Stable';
      if (change > 0) {
        direction = 'up';
        status = 'Worsening';
      } else if (change < 0) {
        direction = 'down';
        status = 'Improving';
      }

      return { name, change, direction, current, previous, status };
    });

    // Find biggest mover
    const worsening = [...analysis].sort((a, b) => b.change - a.change)[0];
    const improving = [...analysis].sort((a, b) => a.change - b.change)[0];

    return { entities: analysis, worsening, improving };
  }, [trendData, topEntities, selectedMetric]);

  // Export to Excel
  const handleExport = () => {
    if (!trendData || Object.keys(trendData).length === 0) return;
    if (topEntities.length === 0) return;

    // Get all periods from the first entity (which has labels)
    const firstEntity = trendData[topEntities[0]];
    const periods = firstEntity.periods;

    // Prepare rows: Period | Entity 1 | Entity 2 ...
    const exportRows = periods.map((periodLabel, index) => {
      const row = { 'Period': periodLabel };
      topEntities.forEach(name => {
        // Safe access
        const val = trendData[name][selectedMetric][index];
        row[name] = val !== undefined ? val : 0;
      });
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);

    // Auto-width columns
    const wscols = Object.keys(exportRows[0]).map(k => ({ wch: k.length + 5 }));
    ws['!cols'] = wscols;

    const sheetName = `${analysisType === 'team' ? 'Teams' : 'Reasons'}_Trend`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    let rangeLabel = range;
    if (range === 'custom') rangeLabel = `Custom_${customStart}_to_${customEnd}`;

    const fileName = `Trend_${analysisType}_${selectedMetric}_${rangeLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isMobile ? 'bottom' : 'top',
        labels: {
          color: '#ffffff',
          font: { size: isMobile ? 10 : 12 }
        }
      },
      title: {
        display: true,
        text: `${period === 'week' ? 'Weekly' : 'Monthly'} Trend - ${selectedEntities.length > 0 ? 'Selected' : (viewMode === 'top5' ? 'Top 5' : 'All')} ${analysisType === 'team' ? 'Teams' : 'Reasons'}` +
          (range === 'custom' ? ` (Custom Date Range)` : ''),
        color: '#ffffff',
        font: { size: isMobile ? 14 : 16 }
      },
      tooltip: {
        backgroundColor: '#2d2d2d',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#7b68ee',
        borderWidth: 1,
        callbacks: {
          title: (tooltipItems) => {
            return tooltipItems[0].label;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#ffffff', font: { size: isMobile ? 9 : 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      y: {
        ticks: { color: '#ffffff', stepSize: 1, font: { size: isMobile ? 9 : 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  };

  return (
    <Box sx={{ my: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ color: '#c2c2c2', fontWeight: 'bold' }}>
            Trend Statistics & Analysis
          </Typography>
          <Chip
            label={showHelp ? "Hide Guide" : "How to read"}
            onClick={() => setShowHelp(!showHelp)}
            size="small"
            sx={{
              backgroundColor: showHelp ? '#7b68ee' : '#3d3d3d',
              color: '#fff',
              cursor: 'pointer'
            }}
          />
        </Box>

        <Box>
          <IconButton
            onClick={handleExport}
            disabled={topEntities.length === 0}
            title="Export to Excel"
            sx={{ color: '#4caf50', '&:hover': { bgcolor: 'rgba(76,175,80,0.1)' } }}
          >
            <MdFileDownload />
          </IconButton>

          <AIAnalysisButton
            data={chartData}
            title={`Trend Analysis - ${analysisType === 'team' ? 'Teams' : 'Reasons'}`}
            context={`Trend analysis for ${selectedEntities.length > 0 ? 'selected' : (viewMode === 'top5' ? 'top 5' : 'all')} ${analysisType}s based on ${selectedMetric}. Period: ${range} ${period}s.`}
          />
        </Box>
      </Box>

      {showHelp && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#333', border: '1px solid #7b68ee', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#7b68ee', fontWeight: 'bold', mb: 1 }}>
            Guide:
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
              • <strong>Analysis Type:</strong> Switch between analyzing specific <em>Teams</em> or underlying <em>Reasons</em>.
            </Typography>
            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
              • <strong>View:</strong> 'Top 5' shows highest volume. 'All' shows everything. 'Select Specific' lets you choose.
            </Typography>
            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
              • <strong>Range:</strong> 'Last 8' shows recent trend, 'All Time' shows Year-To-Date. 'Custom' lets you pick dates.
            </Typography>
            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
              • <strong>Custom Range:</strong> When selected, the chart will show all {period}s that fall within your dates.
            </Typography>
          </Stack>
        </Paper>
      )}

      {/* Insight Highlights */}
      {trendAnalysis.entities.length > 0 && (
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} sx={{ mb: 3 }}>
          {trendAnalysis.worsening && trendAnalysis.worsening.change > 0 && (
            <Paper sx={{ p: 2, flex: 1, backgroundColor: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336' }}>
              <Typography variant="caption" sx={{ color: '#f44336', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Highest Concern
              </Typography>
              <Typography variant="body1" sx={{ color: '#fff', mt: 0.5 }}>
                {trendAnalysis.worsening.name} increased by <strong>{trendAnalysis.worsening.change}%</strong>
              </Typography>
            </Paper>
          )}
          {trendAnalysis.improving && trendAnalysis.improving.change < 0 && (
            <Paper sx={{ p: 2, flex: 1, backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50' }}>
              <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Top Improved
              </Typography>
              <Typography variant="body1" sx={{ color: '#fff', mt: 0.5 }}>
                {trendAnalysis.improving.name} decreased by <strong>{Math.abs(trendAnalysis.improving.change)}%</strong>
              </Typography>
            </Paper>
          )}
        </Stack>
      )}

      <Paper sx={{ p: 3, backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d' }}>
        {/* Controls */}
        <Stack spacing={3} sx={{ mb: 3 }}>
          <Stack direction={isMobile ? 'column' : 'row'} spacing={2} justifyContent="space-between" flexWrap="wrap">

            {/* Group 1: Scope */}
            <Stack direction="column" spacing={2} sx={{ flex: 1 }}>
              <Stack direction="row" spacing={2}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#b3b3b3', mb: 1, display: 'block' }}>
                    Analysis Type
                  </Typography>
                  <ToggleButtonGroup
                    value={analysisType}
                    exclusive
                    onChange={handleAnalysisTypeChange}
                    size="small"
                    sx={{
                      '& .MuiToggleButton-root': {
                        color: '#b3b3b3',
                        borderColor: '#3d3d3d',
                        '&.Mui-selected': { bgcolor: '#7b68ee', color: '#fff', '&:hover': { bgcolor: '#6a5acd' } }
                      }
                    }}
                  >
                    <ToggleButton value="team">Teams</ToggleButton>
                    <ToggleButton value="reason">Reasons</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#b3b3b3', mb: 1, display: 'block' }}>
                    View
                  </Typography>
                  <ToggleButtonGroup
                    value={selectedEntities.length > 0 ? null : viewMode}
                    exclusive
                    onChange={handleViewModeChange}
                    size="small"
                    disabled={selectedEntities.length > 0}
                    sx={{
                      '& .MuiToggleButton-root': {
                        color: '#b3b3b3',
                        borderColor: '#3d3d3d',
                        '&.Mui-selected': { bgcolor: '#7b68ee', color: '#fff', '&:hover': { bgcolor: '#6a5acd' } },
                        '&.Mui-disabled': { color: '#555' }
                      }
                    }}
                  >
                    <ToggleButton value="top5">Top 5</ToggleButton>
                    <ToggleButton value="all">All</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#b3b3b3', mb: 1, display: 'block' }}>
                    Range
                  </Typography>
                  <ToggleButtonGroup
                    value={range}
                    exclusive
                    onChange={handleRangeChange}
                    size="small"
                    sx={{
                      '& .MuiToggleButton-root': {
                        color: '#b3b3b3',
                        borderColor: '#3d3d3d',
                        '&.Mui-selected': { bgcolor: '#7b68ee', color: '#fff', '&:hover': { bgcolor: '#6a5acd' } }
                      }
                    }}
                  >
                    <ToggleButton value={8}>Last 8</ToggleButton>
                    <ToggleButton value="all">YTD</ToggleButton>
                    <ToggleButton value="custom">Custom</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Stack>

              {/* Autocomplete for Specific Selection */}
              <Box sx={{ maxWidth: 400 }}>
                <Autocomplete
                  multiple
                  options={allAvailableEntities}
                  value={selectedEntities}
                  onChange={handleSelectedEntitiesChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label={`Select Specific ${analysisType === 'team' ? 'Teams' : 'Reasons'}`}
                      placeholder="Type to search..."
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#fff',
                          '& fieldset': { borderColor: '#3d3d3d' },
                          '&:hover fieldset': { borderColor: '#7b68ee' },
                        },
                        '& .MuiInputLabel-root': { color: '#b3b3b3' },
                        '& .MuiChip-root': { bgcolor: '#7b68ee', color: '#fff' },
                        '& .MuiSvgIcon-root': { color: '#b3b3b3' }
                      }}
                    />
                  )}
                  PaperComponent={({ children }) => (
                    <Paper sx={{ bgcolor: '#2d2d2d', color: '#fff' }}>{children}</Paper>
                  )}
                />
              </Box>

              {range === 'custom' && (
                <Stack direction="row" spacing={2}>
                  <TextField
                    type="date"
                    label="From"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    InputLabelProps={{ shrink: true, style: { color: '#b3b3b3' } }}
                    size="small"
                    sx={{ input: { color: '#fff' }, fieldset: { borderColor: '#555' } }}
                  />
                  <TextField
                    type="date"
                    label="To"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    InputLabelProps={{ shrink: true, style: { color: '#b3b3b3' } }}
                    size="small"
                    sx={{ input: { color: '#fff' }, fieldset: { borderColor: '#555' } }}
                  />
                </Stack>
              )}
            </Stack>

            {/* Group 2: Metric & Period */}
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box>
                <Typography variant="caption" sx={{ color: '#b3b3b3', mb: 1, display: 'block' }}>
                  X-Axis Unit
                </Typography>
                <ToggleButtonGroup
                  value={period}
                  exclusive
                  onChange={handlePeriodChange}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      color: '#b3b3b3',
                      borderColor: '#3d3d3d',
                      '&.Mui-selected': { bgcolor: '#7b68ee', color: '#fff', '&:hover': { bgcolor: '#6a5acd' } }
                    }
                  }}
                >
                  <ToggleButton value="week">Weeks</ToggleButton>
                  <ToggleButton value="month">Months</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: '#b3b3b3', mb: 1, display: 'block' }}>
                  Metric
                </Typography>
                <ToggleButtonGroup
                  value={selectedMetric}
                  exclusive
                  onChange={handleMetricChange}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      color: '#b3b3b3',
                      borderColor: '#3d3d3d',
                      fontSize: isMobile ? '0.7rem' : '0.875rem',
                      padding: isMobile ? '4px 8px' : '6px 12px',
                      '&.Mui-selected': { bgcolor: '#7b68ee', color: '#fff', '&:hover': { bgcolor: '#6a5acd' } }
                    }
                  }}
                >
                  <ToggleButton value="totalViolations">Total</ToggleButton>
                  <ToggleButton value="equivalentDetractors">Eq. Det.</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>
          </Stack>
        </Stack>

        {/* Chart */}
        {chartData && (
          <Box sx={{ height: isMobile ? 300 : 400, mb: 4 }}>
            <Line data={chartData} options={chartOptions} />
          </Box>
        )}

        {/* Detailed Trend Cards */}
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 2, borderBottom: '1px solid #3d3d3d', pb: 1 }}>
            {analysisType === 'team' ? 'Team' : 'Reason'} Performance Analysis (Last 2 Periods of Range)
          </Typography>
          <Stack direction={isMobile ? 'column' : 'row'} spacing={2} flexWrap="wrap" useFlexGap>
            {trendAnalysis.entities.map((indicator, index) => (
              <Box
                key={index}
                sx={{
                  backgroundColor: '#1e1e1e',
                  borderRadius: '8px',
                  p: 2,
                  flex: '1 1 200px',
                  minWidth: '200px',
                  border: '1px solid',
                  borderColor: indicator.status === 'Worsening' ? '#f44336' : indicator.status === 'Improving' ? '#4caf50' : '#3d3d3d',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '4px',
                  height: '100%',
                  bgcolor: indicator.status === 'Worsening' ? '#f44336' : indicator.status === 'Improving' ? '#4caf50' : '#ff9800'
                }} />

                <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 600, mb: 1, minHeight: '2.5em' }}>
                  {indicator.name}
                </Typography>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Chip
                    label={indicator.status}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      bgcolor: indicator.status === 'Worsening' ? 'rgba(244, 67, 54, 0.2)' : indicator.status === 'Improving' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                      color: indicator.status === 'Worsening' ? '#f44336' : indicator.status === 'Improving' ? '#4caf50' : '#ff9800'
                    }}
                  />
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="end">
                  <Box>
                    <Typography variant="caption" sx={{ color: '#888' }}>Previous</Typography>
                    <Typography variant="body2" sx={{ color: '#aaa' }}>{indicator.previous}</Typography>
                  </Box>
                  <MdTrendingFlat style={{ color: '#555' }} />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#888' }}>Current</Typography>
                    <Typography variant="h6" sx={{ color: '#fff', lineHeight: 1 }}>{indicator.current}</Typography>
                  </Box>
                </Stack>

                {indicator.change !== 0 && (
                  <Typography variant="caption" sx={{
                    display: 'block',
                    mt: 1,
                    textAlign: 'right',
                    color: indicator.change > 0 ? '#f44336' : '#4caf50'
                  }}>
                    {indicator.change > 0 ? '▲' : '▼'} {Math.abs(indicator.change)}% change
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Box>

        {!chartData && (
          <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', py: 4 }}>
            {!customStart || (range === 'custom' && !customEnd)
              ? "Please select a start and end date."
              : "No trend data available."}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default TrendStatistics;
