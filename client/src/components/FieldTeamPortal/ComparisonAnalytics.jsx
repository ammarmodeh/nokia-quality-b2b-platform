import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, FormControl, InputLabel, Select, MenuItem,
  Chip, Stack, Button, IconButton, useTheme, ToggleButtonGroup, ToggleButton, Autocomplete, TextField,
  Tooltip as MuiTooltip
} from '@mui/material';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { getWeekNumber } from '../../utils/helpers';
import { FaChartArea, FaCalendarAlt, FaSortAmountDown, FaInfoCircle } from 'react-icons/fa';

const normalizeText = (value) => {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(' ').toLowerCase().trim();
  return String(value).toLowerCase().trim();
};

const splitValues = (val) => {
  if (val === undefined || val === null || val === "") return [];
  if (Array.isArray(val)) {
    return val.flatMap(v => {
      if (typeof v === 'string') return v.split(/[,;|]/).map(s => s.trim());
      return v;
    });
  }
  return String(val).split(/[,;|]/).map(s => s.trim());
};

const normalizeValue = (name) => {
  if (!name || typeof name !== 'string') return 'Not specified';
  let n = name.trim();
  if (!n || n.toUpperCase() === 'N/A' || n.toUpperCase() === 'EMPTY' || n.toUpperCase() === 'NIL' || n.toUpperCase() === 'NOT SPECIFIED' || n.toUpperCase() === 'OTHER' || n.toUpperCase() === 'OTHERS') return 'Not specified';

  const uppercased = n.toUpperCase();
  if (uppercased === 'REACH') return 'Reach';
  if (uppercased === 'OJO') return 'OJO';
  if (uppercased === 'GAM') return 'GAM';
  if (uppercased === 'CUSTOMER') return 'Customer';

  return n;
};

const extractOwners = (task) => {
  if (!task) return [];
  const resp = splitValues(task.responsible);
  if (resp.length > 0 && resp.some(v => v && v !== 'Empty')) {
    return resp.map(normalizeValue);
  }
  return [];
};

// Custom tooltip for the chart that shows raw counts
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  // Access total from the first bar's payload (always present regardless of hidden Line)
  const totalRaw = payload[0]?.payload?.total || 0;
  const tokenValue = payload[0]?.payload?.tokenValue;

  return (
    <Box sx={{
      background: '#111827',
      border: '1px solid rgba(59,130,246,0.3)',
      borderRadius: '8px',
      p: 1.5,
      minWidth: 180
    }}>
      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block', mb: 0.5 }}>
        {label} — {totalRaw} total tasks
      </Typography>
      {tokenValue !== undefined && tokenValue > 0 && (
        <Typography variant="caption" sx={{ color: '#8b5cf6', fontWeight: 700, display: 'block', mb: 1 }}>
          Total Samples Token: {tokenValue}
        </Typography>
      )}
      <Box sx={{ mt: 1 }}>
      {payload
        .filter(p => p.dataKey !== 'total' && p.dataKey !== 'tokenValue' && !String(p.dataKey).endsWith('_raw'))
        .map((p, i) => {
          const rawKey = `${p.dataKey}_raw`;
          const rawCount = p.payload?.[rawKey] ?? 0;
          return (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: p.fill, fontWeight: 600 }}>
                {p.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 700 }}>
                {rawCount} ({p.value?.toFixed(1)}%)
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const ComparisonAnalytics = ({ technicalTasks = [], settings = {}, colors = {}, totalSamplesTarget = 0, samplesTokenData = [] }) => {
  const [timeFilterMode, setTimeFilterMode] = useState('months'); // 'months', 'weeks', 'days'
  const [comparisonCategory, setComparisonCategory] = useState('reason'); // 'reason', 'subReason', 'rootCause', 'owner'
  const [selectedItemsFilters, setSelectedItemsFilters] = useState([]); // Array of selected string items
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [barMode, setBarMode] = useState('stacked'); // 'stacked', 'grouped'

  const { chartData, percentageChartData, tableRows, items, itemColors, periodRange, totalStats } = useMemo(() => {
    const buckets = {};
    const itemsSet = new Set();

    // All tasks passing date filter (including those without interviewDate for count)
    const allDateFilteredTasks = technicalTasks.filter(task => {
      if (dateRange.start && task.interviewDate && new Date(task.interviewDate) < new Date(dateRange.start)) return false;
      if (dateRange.end && task.interviewDate) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        if (new Date(task.interviewDate) > end) return false;
      }
      return true;
    });

    // Tasks used for chart grouping (must have interviewDate)
    const dateFilteredTasks = allDateFilteredTasks.filter(task => !!task.interviewDate);

    dateFilteredTasks.forEach(task => {
      const d = new Date(task.interviewDate);
      let key = '';
      let sortOrder = 0;

      if (timeFilterMode === 'months') {
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        key = `${new Date(y, m - 1, 1).toLocaleString('default', { month: 'short' })} ${y}`;
        sortOrder = y * 100 + m;
      } else if (timeFilterMode === 'weeks') {
        const weekInfo = getWeekNumber(d, settings.weekStartDay, settings.week1StartDate, settings.week1EndDate, settings.startWeekNumber);
        key = weekInfo.key;
        sortOrder = weekInfo.year * 100 + weekInfo.week;
      } else if (timeFilterMode === 'days') {
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        const date = d.getDate();
        key = `${y}-${String(m).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
        sortOrder = d.getTime();
      }

      if (!buckets[key]) {
        buckets[key] = { period: key, sortOrder, total: 0 };
      }

      let taskItems = [];
      if (comparisonCategory === 'reason') taskItems = splitValues(task.reason).map(normalizeValue);
      else if (comparisonCategory === 'subReason') taskItems = splitValues(task.subReason).map(normalizeValue);
      else if (comparisonCategory === 'rootCause') taskItems = splitValues(task.rootCause).map(normalizeValue);
      else if (comparisonCategory === 'owner') taskItems = extractOwners(task);

      if (taskItems.length === 0) taskItems = ['Not specified'];

      taskItems.forEach(item => {
        if (!buckets[key][item]) buckets[key][item] = 0;
        buckets[key][item] += 1;
        buckets[key].total += 1;
        if (item !== 'Not specified') itemsSet.add(item);
      });
    });

    const uniqueTokensMap = new Map();
    samplesTokenData.forEach(s => {
      const key = `${s.year}-${s.weekNumber}`;
      if (!uniqueTokensMap.has(key)) {
        uniqueTokensMap.set(key, s);
      }
    });
    const cleanTokens = Array.from(uniqueTokensMap.values());

    const sortedBuckets = Object.values(buckets).sort((a, b) => a.sortOrder - b.sortOrder).map(b => {
      let tokenValue = 0;
      if (timeFilterMode === 'weeks') {
        const match = b.period.match(/Wk-(\d+)\s*\((\d+)\)/);
        if (match) {
          const wk = parseInt(match[1], 10);
          const yr = parseInt(match[2], 10);
          const token = cleanTokens.find(s => s.weekNumber === wk && s.year === yr);
          if (token) tokenValue = token.sampleSize || 0;
        }
      } else if (timeFilterMode === 'months') {
        const match = b.period.match(/([a-zA-Z]+)\s+(\d+)/);
        if (match) {
          const monthStr = match[1];
          const yr = parseInt(match[2], 10);
          const date = new Date(`${monthStr} 1, ${yr}`);
          const monthNum = date.getMonth() + 1; // 1-12
          const token = cleanTokens.find(s => s.weekNumber === 100 + monthNum && s.year === yr);
          if (token) tokenValue = token.sampleSize || 0;
        }
      }
      return { ...b, tokenValue };
    });
    
    const allItems = Array.from(itemsSet);

    sortedBuckets.forEach(b => {
      allItems.forEach(i => {
        if (b[i] === undefined) b[i] = 0;
      });
    });

    // Build percentage-based chart data for correct % bars
    // Each item value = (rawCount / periodTotal) * 100
    // Keep raw counts as `item_raw` for the tooltip
    const pctChartData = sortedBuckets.map(bucket => {
      const periodTotal = bucket.total || 1;
      const newBucket = {
        period: bucket.period,
        sortOrder: bucket.sortOrder,
        total: bucket.total, // keep for the trend line
        tokenValue: bucket.tokenValue,
      };
      allItems.forEach(item => {
        const raw = bucket[item] || 0;
        newBucket[item] = periodTotal > 0 ? parseFloat(((raw / periodTotal) * 100).toFixed(1)) : 0;
        newBucket[`${item}_raw`] = raw;
      });
      // Also carry raw for 'Not specified' if present
      if (bucket['Not specified'] !== undefined) {
        const raw = bucket['Not specified'] || 0;
        newBucket['Not specified'] = periodTotal > 0 ? parseFloat(((raw / periodTotal) * 100).toFixed(1)) : 0;
        newBucket['Not specified_raw'] = raw;
      }
      return newBucket;
    });

    const generatedRows = [];
    if (sortedBuckets.length > 0) {
      const earliest = sortedBuckets[0];
      const latest = sortedBuckets[sortedBuckets.length - 1];
      const previous = sortedBuckets.length > 1 ? sortedBuckets[sortedBuckets.length - 2] : null;

      allItems.forEach((item, index) => {
        const startCount = earliest[item] || 0;
        const currentCount = latest[item] || 0;
        const prevCount = previous ? (previous[item] || 0) : startCount;

        const lifetimeCount = sortedBuckets.reduce((sum, b) => sum + (b[item] || 0), 0);

        let overallImprovement = 0;
        if (startCount === 0 && currentCount > 0) overallImprovement = -100;
        else if (startCount === 0 && currentCount === 0) overallImprovement = 0;
        else overallImprovement = ((startCount - currentCount) / startCount) * 100;

        let popImprovement = 0;
        if (prevCount === 0 && currentCount > 0) popImprovement = -100;
        else if (prevCount === 0 && currentCount === 0) popImprovement = 0;
        else popImprovement = ((prevCount - currentCount) / prevCount) * 100;

        generatedRows.push({
          id: index,
          item,
          lifetimeCount,
          startCount,
          latestCount: currentCount,
          prevCount,
          improvement: overallImprovement,
          popImprovement,
          trend: overallImprovement > 0 ? 'Improved' : overallImprovement < 0 ? 'Declined' : 'Stable'
        });
      });
    }

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#fbbf24', '#a855f7'];
    const iColors = {};
    allItems.forEach((item, idx) => {
      iColors[item] = COLORS[idx % COLORS.length];
    });

    return {
      chartData: sortedBuckets,
      percentageChartData: pctChartData,
      tableRows: generatedRows.sort((a, b) => b.lifetimeCount - a.lifetimeCount),
      items: allItems,
      itemColors: iColors,
      periodRange: sortedBuckets.length > 1 ? `${sortedBuckets[0].period} to ${sortedBuckets[sortedBuckets.length - 1].period}` : 'Select a wider span',
      totalStats: {
        totalUniqueSamples: allDateFilteredTasks.length, // all tasks, not just those with interviewDate
        totalItemOccurrences: sortedBuckets.reduce((sum, b) => sum + b.total, 0),
        improvedCount: generatedRows.filter(r => r.trend === 'Improved').length,
        declinedCount: generatedRows.filter(r => r.trend === 'Declined').length
      }
    };
  }, [technicalTasks, settings, timeFilterMode, comparisonCategory, dateRange, samplesTokenData]);

  const columns = [
    {
      field: 'item', headerName: 'Category Item', flex: 1, minWidth: 180,
      renderCell: (params) => <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{params.value}</span>
    },
    {
      field: 'lifetimeCount', headerName: 'Total Count', type: 'number', width: 120,
      renderCell: (params) => <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 700 }}>{params.value}</Typography>
    },
    {
      field: 'latestCount', headerName: 'Current Period', type: 'number', width: 140,
      renderCell: (params) => <span style={{ color: '#fff', fontWeight: 600 }}>{params.value} hits</span>
    },
    {
      field: 'popImprovement', headerName: `vs Prev ${timeFilterMode.slice(0, -1)}`, type: 'number', width: 150,
      renderCell: (params) => {
        const val = params.value;
        return (
          <span style={{
            color: val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#64748b',
            fontWeight: 700,
            fontSize: '0.8rem'
          }}>
            {val > 0 ? '↑ ' : val < 0 ? '↓ ' : ''}
            {Math.abs(val).toFixed(1)}%
          </span>
        );
      }
    },
    {
      field: 'improvement', headerName: 'Overall Improvement', type: 'number', width: 170,
      renderCell: (params) => {
        if (params.row.trend === 'Insufficient Data') return <span style={{ color: '#64748b' }}>N/A</span>;
        return (
          <span style={{
            color: params.value > 0 ? '#10b981' : params.value < 0 ? '#ef4444' : '#f59e0b',
            fontWeight: 800
          }}>
            {params.value > 0 ? '+' : ''}{params.value.toFixed(1)}%
          </span>
        );
      }
    },
    {
      field: 'trend', headerName: 'Trend Status', width: 140,
      renderCell: (params) => {
        let bg = 'rgba(100,116,139,0.2)';
        let c = '#94a3b8';
        if (params.value === 'Improved') { bg = 'rgba(16,185,129,0.15)'; c = '#10b981'; }
        if (params.value === 'Declined') { bg = 'rgba(239,68,68,0.15)'; c = '#ef4444'; }
        if (params.value === 'Stable') { bg = 'rgba(245,158,11,0.15)'; c = '#f59e0b'; }
        return <Chip label={params.value} size="small" sx={{ bgcolor: bg, color: c, fontWeight: 600 }} />;
      }
    }
  ];

  const activeItems = selectedItemsFilters.length > 0 ? selectedItemsFilters : items;
  const filteredTableRows = selectedItemsFilters.length > 0 ? tableRows.filter(row => selectedItemsFilters.includes(row.item)) : tableRows;

  // The trend line data key — use total (raw count) for the line overlay
  // But since Y-axis is now %, we'll scale total to % of max total for the line
  const maxTotal = Math.max(...(percentageChartData.map(b => b.total) || [1]), 1);

  return (
    <Box sx={{ mt: 2, animation: 'fadeIn 0.5s ease-out' }}>
      <Paper sx={{ p: 3, ...colors.glass, borderRadius: 3, border: '1px solid rgba(59,130,246,0.15)', mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 4 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FaChartArea /> Comparison Analytics
            </Typography>
            <Typography variant="body2" color="#94a3b8" mt={0.5}>
              Multi-dimensional improvement analysis across custom periods.
            </Typography>
          </Box>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>Layout</Typography>
              <ToggleButtonGroup
                color="primary"
                value={barMode}
                exclusive
                onChange={(e, v) => v && setBarMode(v)}
                size="small"
                sx={{
                  border: '1px solid rgba(59,130,246,0.3)',
                  '& .MuiToggleButton-root': { color: '#94a3b8', border: 'none', px: 2 },
                  '& .Mui-selected': { bgcolor: 'rgba(59,130,246,0.1) !important', color: colors.primary + ' !important' }
                }}
              >
                <ToggleButton value="stacked">Stacked</ToggleButton>
                <ToggleButton value="grouped">Grouped</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>Grouping</Typography>
              <ToggleButtonGroup
                color="primary"
                value={timeFilterMode}
                exclusive
                onChange={(e, v) => v && setTimeFilterMode(v)}
                size="small"
                sx={{
                  border: '1px solid rgba(59,130,246,0.3)',
                  '& .MuiToggleButton-root': { color: '#94a3b8', border: 'none', px: 2 },
                  '& .Mui-selected': { bgcolor: 'rgba(59,130,246,0.1) !important', color: colors.primary + ' !important' }
                }}
              >
                <ToggleButton value="days">Days</ToggleButton>
                <ToggleButton value="weeks">Weeks</ToggleButton>
                <ToggleButton value="months">Months</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </Box>

        {/* Summary Stat Cards */}
        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, mb: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="#64748b" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700 }}>Total Tasks (Low Sat. Score)</Typography>
                <Typography variant="h6" color={colors.primary} fontWeight={800}>{totalStats.totalUniqueSamples}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3} sx={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="#8b5cf6" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700 }}>Total Samples Token</Typography>
                <Typography variant="h6" color="#8b5cf6" fontWeight={800}>{totalSamplesTarget}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={2} sx={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
              <MuiTooltip title="Sum of all category item occurrences across all periods. Can exceed Total Samples if a task has multiple categories (e.g. multiple reasons)." arrow>
                <Box sx={{ textAlign: 'center', cursor: 'help' }}>
                  <Typography variant="caption" color="#64748b" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                    Total Category Hits <FaInfoCircle size={10} />
                  </Typography>
                  <Typography variant="h6" color="#fff" fontWeight={800}>{totalStats.totalItemOccurrences}</Typography>
                </Box>
              </MuiTooltip>
            </Grid>
            <Grid item xs={12} sm={2} sx={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="#64748b" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700 }}>Improved Items</Typography>
                <Typography variant="h6" color="#10b981" fontWeight={800}>{totalStats.improvedCount}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={2} sx={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="#64748b" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700 }}>Declined Items</Typography>
                <Typography variant="h6" color="#ef4444" fontWeight={800}>{totalStats.declinedCount}</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: '250px' }}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>Categorization</Typography>
            <FormControl size="small" fullWidth>
              <Select
                value={comparisonCategory}
                onChange={(e) => {
                  setComparisonCategory(e.target.value);
                  setSelectedItemsFilters([]);
                }}
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.02)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59,130,246,0.2)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59,130,246,0.4)' },
                  '& .MuiSvgIcon-root': { color: '#94a3b8' }
                }}
              >
                <MenuItem value="reason">By Reason</MenuItem>
                <MenuItem value="subReason">By Sub-Reason</MenuItem>
                <MenuItem value="rootCause">By Root Cause</MenuItem>
                <MenuItem value="owner">By Ownership</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ flex: 2, minWidth: '300px' }}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>Focus Search</Typography>
            <Autocomplete
              multiple
              limitTags={3}
              options={items}
              value={selectedItemsFilters}
              onChange={(event, newValue) => setSelectedItemsFilters(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  placeholder="Select specific items to compare..."
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.02)',
                      '& fieldset': { borderColor: 'rgba(59,130,246,0.2)' },
                    }
                  }}
                />
              )}
              sx={{
                '& .MuiChip-root': { bgcolor: colors.primary + '20', color: colors.primary, fontWeight: 700 },
              }}
            />
          </Box>
        </Box>

        {/* Date Range */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Custom Span:</Typography>
            <TextField
              type="date"
              size="small"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              sx={{
                '& .MuiInputBase-root': { color: '#fff', fontSize: '0.8rem', bgcolor: 'rgba(255,255,255,0.02)' },
                width: 150
              }}
            />
            <Typography sx={{ color: '#4b5563' }}>→</Typography>
            <TextField
              type="date"
              size="small"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              sx={{
                '& .MuiInputBase-root': { color: '#fff', fontSize: '0.8rem', bgcolor: 'rgba(255,255,255,0.02)' },
                width: 150
              }}
            />
            <Button
              size="small"
              onClick={() => setDateRange({ start: '', end: '' })}
              sx={{ color: colors.primary, fontSize: '0.7rem' }}
            >
              Clear Span
            </Button>
          </Box>
        </Box>

        {/* Chart — Y-axis is now 0–100%, each bar segment = % of period total */}
        <Box sx={{ height: 420, width: '100%', mb: 2 }}>
          <ResponsiveContainer>
            <ComposedChart data={percentageChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                domain={barMode === 'stacked' ? [0, 100] : [0, 'auto']}
                tickFormatter={(v) => `${v}%`}
              />
              <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px', color: '#94a3b8' }} />

              {activeItems.map((item) => (
                <Bar
                  key={item}
                  dataKey={item}
                  name={item}
                  stackId={barMode === 'stacked' ? 'a' : undefined}
                  fill={itemColors[item]}
                  radius={barMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey={item}
                    content={(props) => {
                      const { x, y, width, height, value, index } = props;
                      // Skip tiny segments (< 5% height or 0)
                      if (!value || value === 0 || height < 14) return null;

                      // Use index-based lookup on percentageChartData for reliable raw count access
                      const rawCount = percentageChartData[index]?.[`${item}_raw`] ?? 0;
                      const labelText = `${rawCount} (${value?.toFixed(0)}%)`;
                      const isStacked = barMode === 'stacked';

                      return (
                        <text
                          x={x + width / 2}
                          y={isStacked ? (y + height / 2) : (y - 8)}
                          fill={isStacked ? '#fff' : '#94a3b8'}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={9}
                          fontWeight={700}
                        >
                          {labelText}
                        </text>
                      );
                    }}
                  />
                </Bar>
              ))}

              {/* Trend line uses raw total count, but on a secondary implicit scale via a separate key */}
              {/* We render total as a separate invisible bar or line — keep the shift trend line but note it's on same axis */}
              <Line
                type="monotone"
                dataKey="total"
                name="Total Tasks (count)"
                stroke={colors.primary}
                strokeWidth={3}
                dot={{ r: 4, fill: colors.primary, strokeWidth: 2, stroke: '#111827' }}
                activeDot={{ r: 6 }}
                // Use right Y-axis so it doesn't distort the 0-100% bars
                yAxisId={0}
                hide={true} // Hidden from chart — total is shown in tooltip instead
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
        <Typography variant="caption" sx={{ color: 'rgba(148, 163, 184, 0.4)', display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <FaInfoCircle style={{ marginRight: 4 }} /> Bar values = % of period total tasks. Hover for raw counts. Grouping by {timeFilterMode} in {barMode} mode.
        </Typography>
      </Paper>

      <Paper sx={{ p: 4, ...colors.glass, borderRadius: 3, border: '1px solid rgba(59,130,246,0.15)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} color="#fff">Improvement Matrix</Typography>
            <Typography variant="caption" color="#64748b">Comparison between earliest and latest available data points in current range.</Typography>
          </Box>
          <Chip icon={<FaCalendarAlt />} label={`Span: ${periodRange}`} sx={{ bgcolor: colors.primary + '10', color: colors.primary, fontWeight: 700, border: `1px solid ${colors.primary}30` }} />
        </Box>
        <Box sx={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={filteredTableRows}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } }, sorting: { sortModel: [{ field: 'improvement', sort: 'desc' }] } }}
            slots={{ toolbar: GridToolbar }}
            slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }}
            disableRowSelectionOnClick
            sx={{
              border: 0, color: '#94a3b8',
              '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
              '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(255,255,255,0.05)' },
              '& .MuiDataGrid-columnHeaders': { bgcolor: 'rgba(15, 23, 42, 0.5)', color: colors.primary, borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 800 },
              '& .MuiDataGrid-footerContainer': { borderTop: '1px solid rgba(255,255,255,0.05)' },
              '& .MuiTablePagination-root': { color: '#64748b' },
              '& .MuiDataGrid-toolbarContainer .MuiButton-text': { color: colors.primary }
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default ComparisonAnalytics;
