import { useMemo } from "react";
import {
  Box,
  Stack,
  Typography,
  Chip,
  Button,
  Grid,
  Paper
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
  Cell
} from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from "xlsx";
import { groupTasksByWeek, calculateTeamViolationTrends } from "../utils/benchmarkUtils";

const TeamViolationTrend = ({ tasks, selectedWeek, settings = {} }) => {
  const trends = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    const grouped = groupTasksByWeek(tasks, settings);
    return calculateTeamViolationTrends(grouped, settings);
  }, [tasks, settings]);

  const currentTrend = useMemo(() => {
    return trends.find(t => t.week === selectedWeek);
  }, [trends, selectedWeek]);

  const rows = useMemo(() => {
    if (!currentTrend) return [];
    return currentTrend.violations.map((v, i) => ({ id: i, ...v }));
  }, [currentTrend]);

  const chartData = useMemo(() => {
    return rows
      .sort((a, b) => b.currentWeekViolations - a.currentWeekViolations)
      .slice(0, 5); // Top 5 offenders
  }, [rows]);

  const exportToExcel = () => {
    if (!currentTrend) return;
    const workbook = XLSX.utils.book_new();
    const worksheetData = [
      ["Team", "Current Week Violations", "Current Week Detractors", "Current Week Neutrals", "Total Violations", "Total Detractors", "Total Neutrals", "Violated Weeks"]
    ];

    rows.forEach(v => {
      worksheetData.push([
        v.teamName,
        v.currentWeekViolations,
        v.currentWeekDetractors,
        v.currentWeekNeutrals,
        v.totalViolations,
        v.totalDetractors,
        v.totalNeutrals,
        v.violatedWeeks.map(w => `W${w}`).join(", ")
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Violations Report");
    XLSX.writeFile(workbook, `violations_report_week_${selectedWeek}.xlsx`);
  };

  const columns = [
    { field: 'teamName', headerName: 'Team Name', flex: 1.5, minWidth: 150 },
    {
      field: 'currentWeekViolations',
      headerName: 'CW Violations',
      width: 130,
      align: 'center',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: params.value > 0 ? '#f44336' : '#4caf50' }}>
          {params.value}
        </Typography>
      )
    },
    { field: 'currentWeekDetractors', headerName: 'CW Detractors', width: 130, align: 'center' },
    { field: 'totalViolations', headerName: 'Cumulative Violations', width: 160, align: 'center' },
    {
      field: 'violatedWeeks',
      headerName: 'Violation History',
      flex: 2,
      minWidth: 200,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', py: 1 }}>
          {params.value.map(wk => (
            <Chip
              key={wk}
              label={`W${wk}`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: wk === selectedWeek ? '#7b68ee' : '#3d3d3d',
                color: wk === selectedWeek ? '#7b68ee' : '#b3b3b3',
                bgcolor: wk === selectedWeek ? '#7b68ee11' : 'transparent',
                fontSize: '0.65rem',
                height: 20
              }}
            />
          ))}
        </Stack>
      )
    }
  ];

  if (!currentTrend) return (
    <Box p={4} textAlign="center">
      <Typography color="#b3b3b3">No violation data available for the selected week.</Typography>
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
        <Grid item xs={12} lg={4} sx={{ borderRight: { lg: `1px solid ${colors.border}` }, p: 3 }}>
          <Typography variant="subtitle2" sx={{ color: colors.textSecondary, mb: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Top 5 Current Offenders
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" vertical={false} />
                <XAxis
                  dataKey="teamName"
                  tick={{ fill: colors.textSecondary, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: colors.textSecondary }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, color: '#fff' }}
                  cursor={{ fill: 'rgba(123, 104, 238, 0.05)' }}
                />
                <Bar dataKey="currentWeekViolations" name="Violations" radius={[4, 4, 0, 0]} barSize={30}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.currentWeekViolations > 2 ? colors.error : colors.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>

        <Grid item xs={12} lg={8} sx={{ p: 0 }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
            <Button
              startIcon={<DownloadIcon />}
              variant="outlined"
              size="small"
              onClick={exportToExcel}
              sx={{
                color: colors.primary,
                borderColor: colors.primary,
                '&:hover': { borderColor: colors.primary, bgcolor: `${colors.primary}11` }
              }}
            >
              Export Weekly Audit
            </Button>
          </Stack>
          <Box sx={{ height: 432, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10]}
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
                '& .MuiDataGrid-footerContainer': {
                  borderTop: `1px solid ${colors.border}`
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

export default TeamViolationTrend;
