import { useState, useMemo, useEffect } from 'react';
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
import { calculateTrendData } from '../utils/dateFilterHelpers';
import { MdFileDownload } from 'react-icons/md';
import * as XLSX from 'xlsx';
import AIAnalysisButton from './AIAnalysisButton';
import api from '../api/api';
import TrendTasksDialog from './TrendTasksDialog';

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
  const [settings, setSettings] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);

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

  const handleCardClick = (entityName) => {
    setSelectedEntity(entityName);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedEntity(null);
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

    return calculateTrendData(tasks, period, range, analysisType, dateRange, settings || {});
  }, [tasks, period, range, analysisType, customStart, customEnd, settings]);

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
        tension: 0,
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

      // Default / Empty State
      if (!dataObj || !dataObj[selectedMetric] || dataObj[selectedMetric].length === 0) {
        return {
          name,
          change: 0,
          current: 0,
          average: 0,
          peak: 0,
          status: 'Excellent',
          statusColor: '#4caf50',
          trendDirection: 'flat'
        };
      }

      const data = dataObj[selectedMetric];
      const current = data[data.length - 1] || 0;
      const first = data[0] || 0;
      // Previous point (if available, otherwise first)
      const previous = data.length > 1 ? data[data.length - 2] : first;

      // Calculate Overall Change (First vs Last)
      let change = 0;
      if (first === 0 && current === 0) change = 0;
      else if (first === 0) change = 100;
      else change = ((current - first) / first) * 100;
      change = Math.round(change * 10) / 10;

      // Stats
      const sum = data.reduce((a, b) => a + b, 0);
      const average = Math.round((sum / data.length) * 10) / 10;
      const peak = Math.max(...data);

      // Breakdown Trends (Detractors & Neutrals)
      const detData = dataObj.detractors || [];
      const neutData = dataObj.neutrals || [];

      const currentDet = detData[detData.length - 1] || 0;
      const firstDet = detData[0] || 0;
      let detChange = 0;
      if (firstDet === 0 && currentDet === 0) detChange = 0;
      else if (firstDet === 0) detChange = 100;
      else detChange = ((currentDet - firstDet) / firstDet) * 100;
      detChange = Math.round(detChange * 10) / 10;

      const currentNeut = neutData[neutData.length - 1] || 0;
      const firstNeut = neutData[0] || 0;
      let neutChange = 0;
      if (firstNeut === 0 && currentNeut === 0) neutChange = 0;
      else if (firstNeut === 0) neutChange = 100;
      else neutChange = ((currentNeut - firstNeut) / firstNeut) * 100;
      neutChange = Math.round(neutChange * 10) / 10;

      // Top Reason
      const topReason = dataObj.topReason || 'None';
      const topReasonCount = dataObj.topReasonCount || 0;
      const allReasons = dataObj.allReasons || [];


      // --- Robust Status Logic ---
      let status = 'Stable';
      let statusColor = '#ff9800'; // Default Orange
      let trendDirection = 'flat';

      // 1. Excellent (0 violations)
      if (current === 0) {
        status = 'Excellent';
        statusColor = '#4caf50'; // Green
        trendDirection = 'flat';
      }
      // 2. Critical (At Peak and > 0)
      else if (current === peak && peak > 0) {
        status = 'Critical';
        statusColor = '#f44336'; // Red
        trendDirection = 'up';
      }
      // 3. Worsening (Above Avg + Increasing)
      else if (current > average && current >= previous) {
        status = 'Worsening';
        statusColor = '#f44336'; // Red
        trendDirection = 'up';
      }
      // 4. Improving (Below Avg + Decreasing)
      else if (current < average && current <= previous) {
        status = 'Improving';
        statusColor = '#4caf50'; // Green
        trendDirection = 'down';
      }
      // 5. High Concern (Just High)
      else if (current > average) {
        status = 'High';
        statusColor = '#ff5722'; // Deep Orange
        trendDirection = 'flat';
      }
      // 6. Good (Just Low)
      else if (current < average) {
        status = 'Good';
        statusColor = '#8bc34a'; // Light Green
        trendDirection = 'flat';
      }
      // 7. Stable (Default Fallback)
      else {
        status = 'Stable';
        statusColor = '#ff9800'; // Orange
        trendDirection = 'flat';
      }

      return {
        name,
        change,
        current,
        first,
        average,
        peak,
        status,
        statusColor,
        trendDirection,
        currentDet,
        detChange,
        currentNeut,
        neutChange,
        topReason,
        topReasonCount,
        allReasons
      };
    });

    // Find biggest mover (absolute change magnitude)
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
      <Box sx={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        mb: 2,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 1.5 : 2
      }}>
        <Typography variant="h6" sx={{ color: '#c2c2c2', fontWeight: 'bold' }}>
          Trend Statistics & Analysis
        </Typography>

        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'flex-start' : 'flex-end'
        }}>
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

          <IconButton
            onClick={handleExport}
            disabled={topEntities.length === 0}
            title="Export to Excel"
            size="small"
            sx={{
              color: '#4caf50',
              backgroundColor: 'rgba(76, 175, 80, 0.05)',
              '&:hover': { bgcolor: 'rgba(76,175,80,0.15)' }
            }}
          >
            <MdFileDownload size={20} />
          </IconButton>

          <AIAnalysisButton
            data={{
              period,
              range,
              analysisType,
              selectedEntities,
              metric: selectedMetric,
              customStart: range === 'custom' ? customStart : undefined,
              customEnd: range === 'custom' ? customEnd : undefined
            }}
            title={`Trend Analysis - ${analysisType === 'team' ? 'Teams' : 'Reasons'}`}
            context={`Comprehensive trend analysis for ${selectedEntities.length > 0 ? 'selected' : (viewMode === 'top5' ? 'top 5' : 'all')} ${analysisType}s based on ${selectedMetric}. Period: ${range === 'custom' ? 'Custom Range' : range === 'all' ? 'YTD' : `Last ${range}`} ${period}s.`}
            endpoint="/ai/analyze-trend"
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

            <Typography variant="subtitle2" sx={{ color: '#7b68ee', fontWeight: 'bold', mt: 1, mb: 0.5 }}>
              Status Definitions:
            </Typography>
            <Stack spacing={0.5} pl={1}>
              <Typography variant="body2" sx={{ color: '#ccc', fontSize: '0.8rem' }}>
                <span style={{ color: '#4caf50' }}>● Excellent:</span> Zero violations in the current period.
              </Typography>
              <Typography variant="body2" sx={{ color: '#ccc', fontSize: '0.8rem' }}>
                <span style={{ color: '#4caf50' }}>● Improving:</span> Below average and decreasing.
              </Typography>
              <Typography variant="body2" sx={{ color: '#ccc', fontSize: '0.8rem' }}>
                <span style={{ color: '#f44336' }}>● Worsening:</span> Above average and increasing.
              </Typography>
              <Typography variant="body2" sx={{ color: '#ccc', fontSize: '0.8rem' }}>
                <span style={{ color: '#f44336' }}>● Critical:</span> Reached the highest peak of the period.
              </Typography>
            </Stack>

            <Typography variant="subtitle2" sx={{ color: '#7b68ee', fontWeight: 'bold', mt: 1, mb: 0.5 }}>
              Metrics:
            </Typography>
            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
              • <strong>Overall Change:</strong> Comparison between the <em>First</em> period and the <em>Current</em> period of the range.
            </Typography>
            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
              • <strong>Breakdown (Detractors/Neutrals):</strong> Shows the specific trend for each type. <br />
              &nbsp;&nbsp; - <span style={{ color: '#f44336' }}>▲ 100%</span> means it doubled since the start.<br />
              &nbsp;&nbsp; - <span style={{ color: '#4caf50' }}>▼ 50%</span> means it halved since the start.
            </Typography>
          </Stack>
        </Paper>
      )}

      {/* Insight Highlights */}
      {trendAnalysis.entities.length > 0 && (
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} sx={{ mb: 3 }}>
          {trendAnalysis.worsening && trendAnalysis.worsening.change > 0 && (
            <Paper sx={{ p: 1.5, flex: 1, backgroundColor: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336' }}>
              <Typography variant="caption" sx={{ color: '#f44336', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Highest Concern
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff', mt: 0.5 }}>
                {trendAnalysis.worsening.name} increased by <strong>{trendAnalysis.worsening.change}%</strong>
              </Typography>
            </Paper>
          )}
          {trendAnalysis.improving && trendAnalysis.improving.change < 0 && (
            <Paper sx={{ p: 1.5, flex: 1, backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50' }}>
              <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Top Improved
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff', mt: 0.5 }}>
                {trendAnalysis.improving.name} decreased by <strong>{Math.abs(trendAnalysis.improving.change)}%</strong>
              </Typography>
            </Paper>
          )}
        </Stack>
      )}

      <Paper sx={{ p: isMobile ? 2 : 3, backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d' }}>
        {/* Controls */}
        <Stack spacing={3} sx={{ mb: 3 }}>
          <Stack direction="column" spacing={2.5}>

            {/* Top Row: Analysis Type & View & Range */}
            <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems={isMobile ? 'flex-start' : 'center'}>
              <Box sx={{ width: isMobile ? '100% ' : 'auto' }}>
                <Typography variant="caption" sx={{ color: '#b3b3b3', mb: 0.5, display: 'block' }}>
                  Analysis Type
                </Typography>
                <ToggleButtonGroup
                  value={analysisType}
                  exclusive
                  onChange={handleAnalysisTypeChange}
                  size="small"
                  fullWidth={isMobile}
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

              <Box sx={{ width: isMobile ? '100% ' : 'auto' }}>
                <Typography variant="caption" sx={{ color: '#b3b3b3', mb: 0.5, display: 'block' }}>
                  View
                </Typography>
                <ToggleButtonGroup
                  value={selectedEntities.length > 0 ? null : viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  size="small"
                  disabled={selectedEntities.length > 0}
                  fullWidth={isMobile}
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

              <Box sx={{ width: isMobile ? '100% ' : 'auto' }}>
                <Typography variant="caption" sx={{ color: '#b3b3b3', mb: 0.5, display: 'block' }}>
                  Range
                </Typography>
                <ToggleButtonGroup
                  value={range}
                  exclusive
                  onChange={handleRangeChange}
                  size="small"
                  fullWidth={isMobile}
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

            {/* Middle Row: Metric & Period */}
            <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems={isMobile ? 'flex-start' : 'center'}>
              <Box sx={{ width: isMobile ? '100% ' : 'auto' }}>
                <Typography variant="caption" sx={{ color: '#b3b3b3', mb: 0.5, display: 'block' }}>
                  X-Axis Unit
                </Typography>
                <ToggleButtonGroup
                  value={period}
                  exclusive
                  onChange={handlePeriodChange}
                  size="small"
                  fullWidth={isMobile}
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

              <Box sx={{ width: isMobile ? '100% ' : 'auto' }}>
                <Typography variant="caption" sx={{ color: '#b3b3b3', mb: 0.5, display: 'block' }}>
                  Metric
                </Typography>
                <ToggleButtonGroup
                  value={selectedMetric}
                  exclusive
                  onChange={handleMetricChange}
                  size="small"
                  fullWidth={isMobile}
                  sx={{
                    '& .MuiToggleButton-root': {
                      color: '#b3b3b3',
                      borderColor: '#3d3d3d',
                      '&.Mui-selected': { bgcolor: '#7b68ee', color: '#fff', '&:hover': { bgcolor: '#6a5acd' } }
                    }
                  }}
                >
                  <ToggleButton value="totalViolations">Total</ToggleButton>
                  <ToggleButton value="equivalentDetractors">Eq. Det.</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>

            {/* Bottom Row: Selection & Custom Selection */}
            <Stack direction="column" spacing={2}>
              <Box sx={{ width: '100%' }}>
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
                <Stack direction={isMobile ? "column" : "row"} spacing={2}>
                  <TextField
                    type="date"
                    label="From"
                    fullWidth={isMobile}
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    InputLabelProps={{ shrink: true, style: { color: '#b3b3b3' } }}
                    size="small"
                    sx={{ input: { color: '#fff' }, fieldset: { borderColor: '#555' } }}
                  />
                  <TextField
                    type="date"
                    label="To"
                    fullWidth={isMobile}
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    InputLabelProps={{ shrink: true, style: { color: '#b3b3b3' } }}
                    size="small"
                    sx={{ input: { color: '#fff' }, fieldset: { borderColor: '#555' } }}
                  />
                </Stack>
              )}
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
            {analysisType === 'team' ? 'Team' : 'Reason'} Performance Analysis (Selected Range)
          </Typography>
          <Stack direction={isMobile ? 'column' : 'row'} spacing={2} flexWrap="wrap" useFlexGap>
            {trendAnalysis.entities.map((indicator, index) => (
              <Box
                key={index}
                onClick={() => handleCardClick(indicator.name)}
                sx={{
                  backgroundColor: '#1e1e1e',
                  borderRadius: '8px',
                  p: 2,
                  flex: '1 1 200px',
                  minWidth: '200px',
                  border: '1px solid',
                  borderColor: indicator.statusColor || '#3d3d3d',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 4px 12px ${indicator.statusColor || '#7b68ee'}40`,
                    borderColor: indicator.statusColor || '#7b68ee'
                  }
                }}
              >
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '4px',
                  height: '100%',
                  bgcolor: indicator.statusColor || '#ff9800'
                }} />

                {/* Task Count Badge */}
                <Box sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: '#7b68ee',
                  color: '#fff',
                  borderRadius: '12px',
                  px: 1,
                  py: 0.5,
                  fontSize: '0.7rem',
                  fontWeight: 'bold'
                }}>
                  {trendData[indicator.name]?.allTasks?.length || 0} tasks
                </Box>

                <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 600, mb: 1, minHeight: '2.5em', pr: 8 }}>
                  {indicator.name}
                </Typography>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label={indicator.status}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      bgcolor: (indicator.statusColor || '#ff9800') + '33',
                      color: indicator.statusColor || '#ff9800'
                    }}
                  />
                </Stack>

                <Stack spacing={0.5} sx={{ mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: '#888' }}>Detractors:</Typography>
                    <Typography variant="caption" sx={{ color: '#fff' }}>
                      {indicator.currentDet}
                      <span style={{ color: indicator.detChange > 0 ? '#f44336' : indicator.detChange < 0 ? '#4caf50' : '#888', marginLeft: 4 }}>
                        ({indicator.detChange > 0 ? '▲' : indicator.detChange < 0 ? '▼' : ''}{Math.abs(indicator.detChange)}%)
                      </span>
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: '#888' }}>Neutrals:</Typography>
                    <Typography variant="caption" sx={{ color: '#fff' }}>
                      {indicator.currentNeut}
                      <span style={{ color: indicator.neutChange > 0 ? '#f44336' : indicator.neutChange < 0 ? '#4caf50' : '#888', marginLeft: 4 }}>
                        ({indicator.neutChange > 0 ? '▲' : indicator.neutChange < 0 ? '▼' : ''}{Math.abs(indicator.neutChange)}%)
                      </span>
                    </Typography>
                  </Stack>
                </Stack>

                {/* Reason Breakdown */}
                {indicator.allReasons && indicator.allReasons.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#666', mb: 0.5, display: 'block', fontSize: '0.65rem' }}>
                      Reason Breakdown:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {indicator.allReasons.map((r, i) => (
                        <Chip
                          key={i}
                          label={`${r.reason}: ${r.count}`}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: '0.65rem',
                            bgcolor: '#252525',
                            color: '#aaa',
                            border: '1px solid #333'
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 1, borderTop: '1px solid #333', pt: 1 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>Avg</Typography>
                    <Typography variant="body2" sx={{ color: '#ccc' }}>{indicator.average}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>Peak</Typography>
                    <Typography variant="body2" sx={{ color: '#ccc' }}>{indicator.peak}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>Current</Typography>
                    <Typography variant="h6" sx={{ color: '#fff', lineHeight: 1 }}>{indicator.current}</Typography>
                  </Box>
                </Stack>
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

      {/* Task Details Dialog */}
      <TrendTasksDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        entityName={selectedEntity}
        entityData={selectedEntity ? trendData[selectedEntity] : null}
        analysisType={analysisType}
        period={period}
      />
    </Box>
  );
};

export default TrendStatistics;
