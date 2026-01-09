import { useMemo } from "react";
import {
  Box,
  Stack,
  Typography,
  Chip,
  Tooltip,
  Paper,
  Grid
} from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import { groupTasksByWeek, calculateReasonTrends } from "../utils/benchmarkUtils";

const ReasonTrend = ({ tasks, selectedWeek, settings = {} }) => {
  const trends = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    const grouped = groupTasksByWeek(tasks, settings);
    return calculateReasonTrends(grouped);
  }, [tasks, settings]);

  const currentTrend = useMemo(() => {
    return trends.find(t => t.week === selectedWeek);
  }, [trends, selectedWeek]);

  const chartData = useMemo(() => {
    if (!currentTrend) return [];
    return Object.entries(currentTrend.reasons)
      .map(([name, count]) => ({
        name,
        count,
        change: currentTrend.comparison?.[name] || 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [currentTrend]);

  const columns = [
    {
      field: 'name',
      headerName: 'Root Cause Reason',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#e0e0e0' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'count',
      headerName: 'Occurrence',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{ bgcolor: '#7b68ee22', color: '#7b68ee', fontWeight: 700, border: '1px solid #7b68ee44' }}
        />
      )
    },
    {
      field: 'change',
      headerName: 'vs Last Week',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const value = params.value;
        if (value === 0) return <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: '#b0b0b0' }}><RemoveIcon fontSize="small" /><Typography variant="caption">No change</Typography></Stack>;
        const isImprovement = value < 0;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: isImprovement ? '#4caf50' : '#f44336' }}>
            {isImprovement ? <TrendingDownIcon fontSize="small" /> : <TrendingUpIcon fontSize="small" />}
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {Math.abs(value)} {isImprovement ? 'Fewer' : 'More'}
            </Typography>
          </Stack>
        );
      }
    }
  ];

  if (!currentTrend) return (
    <Box p={4} textAlign="center">
      <Typography color="#b3b3b3">No data available for the selected week.</Typography>
    </Box>
  );

  const colors = {
    primary: "#7b68ee",
    error: "#f44336",
    success: "#4caf50",
    textSecondary: "#b3b3b3",
    border: "#3d3d3d",
    surface: "#252525"
  };

  return (
    <Box>
      <Grid container spacing={0}>
        <Grid item xs={12} lg={7} sx={{ borderRight: { lg: `1px solid ${colors.border}` }, p: 3 }}>
          <Typography variant="subtitle2" sx={{ color: colors.textSecondary, mb: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Reason Frequency Distribution
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={150}
                  tick={{ fill: colors.textSecondary, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, color: '#fff' }}
                  itemStyle={{ color: colors.primary }}
                  cursor={{ fill: 'rgba(123, 104, 238, 0.1)' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 5 ? colors.error : colors.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>

        <Grid item xs={12} lg={5} sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ color: colors.textSecondary, mb: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Detailed Comparison
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={chartData.map((d, i) => ({ id: i, ...d }))}
              columns={columns}
              hideFooter
              density="compact"
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: 'transparent',
                  color: colors.textSecondary,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  borderBottom: `1px solid ${colors.border}`
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: `1px solid ${colors.border}`
                },
                '& .MuiDataGrid-row:hover': {
                  bgcolor: 'rgba(123, 104, 238, 0.05)'
                },
                color: '#fff'
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReasonTrend;