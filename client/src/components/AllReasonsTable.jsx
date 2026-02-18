import {
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Divider,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  Select,
  MenuItem
} from "@mui/material";
import { DataGrid, GridToolbarContainer, GridToolbarExport, GridToolbarQuickFilter } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { getReasonViolations2 } from "../utils/helpers";
import { RiFileExcel2Fill } from "react-icons/ri";
import { MdClose, MdFileDownload, MdTrendingUp, MdBarChart, MdPhotoCamera } from 'react-icons/md';
import { useState, useMemo, useEffect, memo, useRef } from "react";
import html2canvas from 'html2canvas';
import { useTheme, alpha } from '@mui/material';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  Legend
} from 'recharts';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import {
  filterTasksByWeek,
  filterTasksByMonth,
  filterTasksByDateRange,
  getAvailableWeeks,
  getAvailableMonths
} from '../utils/dateFilterHelpers';
import { getCustomWeekNumber } from '../utils/helpers';
import api from "../api/api";
import { TaskDetailsDialog } from "./TaskDetailsDialog";

// Reusable DetailRow component
const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2 }}>
    <Typography
      variant="body2"
      component="div"
      sx={{
        fontWeight: '500',
        color: '#b3b3b3',
      }}
    >
      {label}
    </Typography>
    {typeof value === 'string' || typeof value === 'number' ? (
      <Typography
        variant="body1"
        component="div"
        sx={{
          color: '#ffffff',
          wordBreak: 'break-word',
          textAlign: label === "Customer Feedback" ? "right" : "left",
          direction: label === "Customer Feedback" ? "rtl" : "ltr"
        }}
      >
        {value || 'N/A'}
      </Typography>
    ) : (
      <Box sx={{ display: 'inline-block', mt: 0.5 }}>
        {value}
      </Box>
    )}
  </Box>
);

// Custom Toolbar Component
function CustomToolbar() {
  return (
    <GridToolbarContainer sx={{ justifyContent: 'space-between', p: 1 }}>
      <GridToolbarExport />
      <GridToolbarQuickFilter />
    </GridToolbarContainer>
  );
}

export const AllReasonsTable = memo(({ tasks, onTaskUpdated }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:503px)');
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const chartRef = useRef(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [reasonTasks, setReasonTasks] = useState([]);

  // Filtering States
  const currentYear = new Date().getFullYear();
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

  // Calculate current week for default selection
  const defaultWeek = useMemo(() => {
    return getCustomWeekNumber(new Date(), currentYear, settings || {});
  }, [settings, currentYear]);

  const [filterType, setFilterType] = useState('week');
  const [selectedPeriod, setSelectedPeriod] = useState(defaultWeek !== null && defaultWeek !== undefined ? String(defaultWeek) : '');

  // Update selectedPeriod when defaultWeek becomes available
  useEffect(() => {
    if (defaultWeek && selectedPeriod === '') {
      setSelectedPeriod(String(defaultWeek));
    }
  }, [defaultWeek, selectedPeriod]);

  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // Available options
  const weeks = useMemo(() => getAvailableWeeks(tasks, settings || {}), [tasks, settings]);
  const months = useMemo(() => getAvailableMonths(tasks, settings || {}), [tasks, settings]);

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    const currentSettings = settings || { weekStartDay: 0, startWeekNumber: 1 };

    if (filterType === 'all') {
      filtered = tasks;
    } else if (filterType === 'week' && selectedPeriod !== 'all') {
      const weekNum = parseInt(selectedPeriod);
      filtered = filterTasksByWeek(tasks, currentYear, weekNum, currentSettings);
    } else if (filterType === 'month') {
      const monthNum = selectedPeriod === 'all' && months.length > 0 ? months[0].month : parseInt(selectedPeriod);
      filtered = filterTasksByMonth(tasks, currentYear, monthNum, currentSettings);
    } else if (filterType === 'custom' && dateRange.start && dateRange.end) {
      filtered = filterTasksByDateRange(tasks, dateRange.start, dateRange.end);
    }

    return filtered;
  }, [tasks, filterType, selectedPeriod, dateRange, currentYear, settings, months]);

  const periodLabel = useMemo(() => {
    if (filterType === 'all') return 'Full Year';
    if (filterType === 'week') {
      const week = weeks.find(w => String(w.week) === selectedPeriod);
      return week ? week.label : `Week ${selectedPeriod}`;
    }
    if (filterType === 'month') return months.find(m => String(m.month) === selectedPeriod)?.label || 'Selected Month';
    if (filterType === 'custom' && dateRange.start && dateRange.end) {
      return `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d')}`;
    }
    return '';
  }, [filterType, selectedPeriod, weeks, months, dateRange]);


  // Get the total violations for each reason (using filtered tasks)
  const reasonViolations = useMemo(() => getReasonViolations2(filteredTasks), [filteredTasks]);

  // Sort the reasonViolations array in descending order based on total violations
  const sortedReasonViolations = useMemo(() =>
    [...reasonViolations].sort((a, b) => b.total - a.total),
    [reasonViolations]
  );

  // Prepare Chart Data (Top 10)
  const chartData = useMemo(() => {
    return sortedReasonViolations.slice(0, 10).map(item => {
      const validatedTasks = item.tasks.filter(t => t.validationStatus === "Validated").length;
      const totalTasks = item.total;
      const validationPercentage = totalTasks > 0 ? Math.round((validatedTasks / totalTasks) * 100) : 0;

      return {
        name: item.reason,
        Violations: totalTasks,
        Validated: validatedTasks,
        ValidationRate: validationPercentage
      };
    });
  }, [sortedReasonViolations]);

  // Prepare rows for the DataGrid
  const rows = useMemo(() => sortedReasonViolations.map((violation, index) => ({
    id: index + 1,
    reason: violation.reason,
    totalViolations: violation.total,
    percentage: violation.percentage,
    tasks: violation.tasks // Include tasks in each row
  })), [sortedReasonViolations]);

  // Calculate the net total of all violations
  const netTotal = useMemo(() => rows.reduce((sum, row) => sum + row.totalViolations, 0), [rows]);

  // Define columns for the DataGrid
  const columns = [
    {
      field: "reason",
      headerName: "Reason",
      flex: 2,
      minWidth: isMobile ? 150 : undefined,
      renderCell: (params) => (
        <Button
          onClick={() => {
            setSelectedReason(params.value);
            setReasonTasks(params.row.tasks);
            setDialogOpen(true);
          }}
          sx={{
            textTransform: 'none',
            color: '#3b82f6',
            padding: 0,
            justifyContent: "flex-start",
            minWidth: 0,
            '&:hover': {
              textDecoration: 'underline',
              backgroundColor: 'transparent'
            }
          }}
        >
          {params.value}
        </Button>
      )
    },
    {
      field: "totalViolations",
      headerName: "Total Violations",
      flex: 1,
      type: "number",
      minWidth: isMobile ? 100 : undefined
    },
    {
      field: "percentage",
      headerName: "Percentage",
      flex: 1,
      minWidth: isMobile ? 80 : undefined
    },
  ];

  // Function to export table data to Excel
  const exportToExcel = () => {
    // 1. Determine Reported Period
    let periodStr = "All Time";
    if (filterType === 'week' && selectedPeriod !== 'all') {
      const week = weeks.find(w => String(w.week) === selectedPeriod);
      periodStr = week ? `Week ${week.week} (${week.label})` : `Week ${selectedPeriod}`;
    } else if (filterType === 'month') {
      const month = months.find(m => String(m.month) === selectedPeriod);
      periodStr = month ? month.label : `Month ${selectedPeriod}`;
    } else if (filterType === 'custom' && dateRange.start && dateRange.end) {
      periodStr = `${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`;
    }

    const excelData = rows.map((row) => {
      const validatedCount = row.tasks.filter(t => t.validationStatus === 'Validated').length;
      return {
        Reason: row.reason,
        "Total Audits": row.totalViolations,
        "Validated": validatedCount,
        "Compliance %": row.totalViolations > 0 ? `${((validatedCount / row.totalViolations) * 100).toFixed(1)}%` : "0%",
        "Share %": row.percentage,
      };
    });

    excelData.push({
      Reason: "NET TOTAL",
      "Total Audits": netTotal,
      "Validated": rows.reduce((sum, row) => sum + row.tasks.filter(t => t.validationStatus === 'Validated').length, 0),
      "Compliance %": "",
      "Share %": "100%",
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData, { origin: "A2" });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Reported Period: ${periodStr}`]], { origin: "A1" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reason Analytics");
    XLSX.writeFile(workbook, `Reason_Analytics_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Function to export reason tasks to Excel
  const exportReasonTasksToExcel = () => {
    const data = reasonTasks.map((task) => ({
      'Request Number': task.requestNumber,
      'SLID': task.slid,
      'PIS Date': task.pisDate ? new Date(task.pisDate).toLocaleString() : 'N/A',
      'Satisfaction Score': task.evaluationScore,
      'Customer Name': task.customerName,
      'Contact Number': task.contactNumber,
      'Tariff Name': task.tarrifName,
      'Customer Feedback': task.customerFeedback,
      'Reason': Array.isArray(task.reason) ? task.reason.join(", ") : task.reason,
      'Sub Reason': Array.isArray(task.subReason) ? task.subReason.join(", ") : (task.subReason || 'N/A'),
      'Root Cause': Array.isArray(task.rootCause) ? task.rootCause.join(", ") : (task.rootCause || 'N/A'),
      'Customer Type': task.customerType,
      'Governorate': task.governorate,
      'District': task.district,
      'Action taken by assigned user': task.subTasks?.map((sub, index) => `Step ${index + 1}: ${sub.note}`).join('\n') || 'N/A',
      'Team Name': task.teamName,
      'Team Company': task.teamCompany,
      'Interview Date': task.interviewDate ? new Date(task.interviewDate).toLocaleString() : 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0]).map((key) => ({ wch: key.length + 5 }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    XLSX.writeFile(workbook, `${selectedReason}_Tasks.xlsx`);
  };

  const handleCaptureChart = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Reason_Analysis_${periodLabel.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <Stack spacing={3} sx={{ width: "100%" }}>
      {/* Filters Header */}
      <Paper sx={{
        p: 2,
        borderRadius: "12px",
        // backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(226, 232, 240, 0.8)"
      }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          flexWrap="wrap"
        >
          <ToggleButtonGroup
            value={filterType}
            exclusive
            onChange={(e, newVal) => newVal && setFilterType(newVal)}
            size="small"
            sx={{
              display: 'flex',
              overflowX: isMobile ? 'auto' : 'visible',
              whiteSpace: 'nowrap',
              width: isMobile ? '100% ' : 'auto',
              '&::-webkit-scrollbar': { display: 'none' },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '& .MuiToggleButton-root': {
                px: 3,
                py: 1,
                borderRadius: '8px !important',
                border: '1px solid #e2e8f0',
                mx: 0.5,
                flexShrink: 0,
                minWidth: isMobile ? 'max-content' : 'auto',
                '&.Mui-selected': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  borderColor: theme.palette.primary.main,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  }
                }
              }
            }}
          >
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="custom">Range</ToggleButton>
            <ToggleButton value="all">All</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            {filterType === 'week' && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  displayEmpty
                  sx={{ borderRadius: '8px' }}
                >
                  <MenuItem value="" disabled>Select Week</MenuItem>
                  {weeks.map(w => <MenuItem key={w.key} value={String(w.week)}>{w.label}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {filterType === 'month' && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  displayEmpty
                  sx={{ borderRadius: '8px' }}
                >
                  <MenuItem value="" disabled>Select Month</MenuItem>
                  {months.map(m => <MenuItem key={m.key} value={String(m.month)}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {filterType === 'custom' && (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <DatePicker
                    label="Start Date"
                    value={dateRange.start}
                    onChange={(newValue) => setDateRange(prev => ({ ...prev, start: newValue }))}
                    slotProps={{ textField: { size: 'small', sx: { width: 130, borderRadius: '8px' } } }}
                  />
                  <Box sx={{ color: 'text.secondary' }}>-</Box>
                  <DatePicker
                    label="End Date"
                    value={dateRange.end}
                    onChange={(newValue) => setDateRange(prev => ({ ...prev, end: newValue }))}
                    slotProps={{ textField: { size: 'small', sx: { width: 130, borderRadius: '8px' } } }}
                  />
                </Stack>
              </LocalizationProvider>
            )}
          </Box>
        </Stack>
      </Paper>

      {/* Main Content Stack (Table + Chart) */}
      <Stack spacing={3}>
        <Paper sx={{
          height: 500, // Increased height slightly for better view
          width: "100%",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header inside Paper */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0"
            }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{
                  color: "#475569",
                  fontSize: isMobile ? "0.9rem" : "1rem",
                  fontWeight: "800",
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <MdBarChart className="text-blue-500" size={24} />
                Reason Overview - {periodLabel}
                <Chip
                  label={netTotal}
                  size="small"
                  sx={{
                    ml: 1,
                    bgcolor: alpha('#3b82f6', 0.1),
                    color: '#3b82f6',
                    fontWeight: 'bold'
                  }}
                />
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ ml: 4, fontWeight: 600 }}>
                Categorized Issue Breakdown & Performance
              </Typography>
            </Box>
            <Tooltip title="Export to Excel (v2 - Enhanced)">
              <IconButton
                onClick={exportToExcel}
                size={isMobile ? "small" : "medium"}
                sx={{
                  color: '#10b981',
                  bgcolor: alpha('#10b981', 0.1),
                  '&:hover': {
                    bgcolor: alpha('#10b981', 0.2),
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  p: 1
                }}
              >
                <RiFileExcel2Fill />
                <Typography variant="caption" sx={{ fontSize: '8px', fontWeight: 'bold' }}>V2</Typography>
              </IconButton>
            </Tooltip>
          </Stack>

          <DataGrid
            rows={rows}
            columns={columns}
            disableColumnResize
            pageSizeOptions={[5, 10, 25]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            slots={{ toolbar: CustomToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
            sx={{
              border: 0,
              color: "#cbd5e1", // Light gray for dark theme
              fontFamily: "'Inter', sans-serif",
              "& .MuiDataGrid-overlay": {
                color: "#64748b",
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f8fafc",
                color: "#475569",
                fontSize: "0.75rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                borderBottom: "1px solid #e2e8f0",
              },
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: "#f8fafc",
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid #f1f5f9",
              },
              "& .MuiDataGrid-row": {
                "&:hover": {
                  backgroundColor: "rgba(100, 116, 139, 0.08)",
                },
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: "1px solid #e2e8f0",
                // backgroundColor: "#ffffff",
                color: "#475569",
              },
              "& .MuiTablePagination-root": {
                color: "#475569",
              },
              "& .MuiDataGrid-toolbarContainer": {
                padding: "12px",
                borderBottom: "1px solid #e2e8f0",
                gap: 2,
                "& .MuiButton-root": {
                  color: "#64748b !important",
                  fontSize: "0.80rem",
                  textTransform: 'none',
                }
              }
            }}
          />
        </Paper>

        {/* Chart Section */}
        {sortedReasonViolations.length > 0 && (
          <Paper
            ref={chartRef}
            sx={{
              p: 3,
              borderRadius: "12px",
              height: 400,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              // bgcolor: 'white' // Removed to match dark theme
            }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                  <MdBarChart size={24} color="#3b82f6" />
                  <Typography variant="h6" fontWeight="800" color="#475569">
                    Top Reasons Analysis - {periodLabel}
                  </Typography>
                </Stack>
                {/* <Typography variant="caption" color="textSecondary" sx={{ ml: 4, fontWeight: 600 }}>
                  Volume Breakdown & Validation Performance Trends
                </Typography> */}
              </Box>
              <Tooltip title="Capture Chart as Image">
                <IconButton
                  onClick={handleCaptureChart}
                  size="small"
                  sx={{
                    color: '#7b68ee',
                    bgcolor: alpha('#7b68ee', 0.1),
                    '&:hover': {
                      bgcolor: alpha('#7b68ee', 0.2),
                    }
                  }}
                >
                  <MdPhotoCamera size={20} />
                </IconButton>
              </Tooltip>
            </Stack>
            <ResponsiveContainer width="100%" height="90%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: isMobile ? 9 : 11, fill: '#64748b' }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  yAxisId="left"
                  type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  label={{ value: 'Violations', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 12, fontWeight: 600 } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  label={{ value: 'Validation %', angle: 90, position: 'insideRight', style: { fill: '#64748b', fontSize: 12, fontWeight: 600 } }}
                />
                <RechartsTooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}
                />
                <Bar yAxisId="left" dataKey="Violations" radius={[4, 4, 0, 0]} barSize={isMobile ? 15 : 30} name="Total Violations">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                  ))}
                  <LabelList dataKey="Violations" position="top" style={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ValidationRate"
                  stroke="#7b68ee"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#7b68ee' }}
                  activeDot={{ r: 6 }}
                  name="Validation Rate (%)"
                >
                  <LabelList
                    dataKey="ValidationRate"
                    position="top"
                    formatter={(val) => `${val}%`}
                    style={{ fill: '#7b68ee', fontSize: 10, fontWeight: 600 }}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </Paper>
        )}
      </Stack>

      {/* Dialog to show reason tasks */}
      <TaskDetailsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        tasks={reasonTasks}
        title={`Tasks for Reason: ${selectedReason}`}
        onTaskUpdated={onTaskUpdated}
      />
    </Stack>
  );
});
