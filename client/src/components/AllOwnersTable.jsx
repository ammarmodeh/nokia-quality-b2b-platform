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
  MenuItem,
  TextField
} from "@mui/material";
import { DataGrid, GridToolbarContainer, GridToolbarExport, GridToolbarQuickFilter } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { getOwnerViolations } from "../utils/helpers";
import { RiFileExcel2Fill } from "react-icons/ri";
import { MdClose, MdFileDownload, MdTrendingUp, MdBarChart } from 'react-icons/md';
import { useState, useMemo, useEffect, memo } from "react";
import { useTheme, alpha } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { startOfYear, endOfYear, eachWeekOfInterval, format } from 'date-fns';
import {
  filterTasksByWeek,
  filterTasksByMonth,
  filterTasksByDateRange,
  getAvailableWeeks,
  getAvailableMonths
} from '../utils/dateFilterHelpers';
import { getCustomWeekNumber } from '../utils/helpers';
import api from "../api/api";

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

export const AllOwnersTable = memo(({ tasks }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:503px)');
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerTasks, setOwnerTasks] = useState([]);

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

  // Initialize weeks and months
  // Initialize weeks and months
  const weeks = useMemo(() => getAvailableWeeks(tasks, settings || {}), [tasks, settings]);
  const months = useMemo(() => getAvailableMonths(tasks, settings || {}), [tasks, settings]);

  // Fetch settings to determine default week
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

  // Filter tasks logic
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

  // Get the total violations for each owner using filtered tasks
  const ownerViolations = useMemo(() => getOwnerViolations(filteredTasks), [filteredTasks]);

  // Sort the ownerViolations array in descending order based on total violations
  const sortedOwnerViolations = useMemo(() => ownerViolations.sort((a, b) => b.total - a.total), [ownerViolations]);

  // Prepare chart data (top 10 owners)
  const chartData = useMemo(() => {
    return sortedOwnerViolations.slice(0, 10).map(item => {
      const validatedTasks = item.tasks.filter(t => t.validationStatus === "Validated").length;
      const totalTasks = item.total;
      const validationPercentage = totalTasks > 0 ? Math.round((validatedTasks / totalTasks) * 100) : 0;

      return {
        name: item.owner,
        Violations: totalTasks,
        Validated: validatedTasks,
        ValidationRate: validationPercentage
      };
    });
  }, [sortedOwnerViolations]);

  // Prepare rows for the DataGrid
  const rows = useMemo(() => sortedOwnerViolations.map((violation, index) => ({
    id: index + 1,
    owner: violation.owner,
    totalViolations: violation.total,
    percentage: violation.percentage,
    tasks: violation.tasks
  })), [sortedOwnerViolations]);

  // Calculate the net total of all violations
  const netTotal = useMemo(() => rows.reduce((sum, row) => sum + row.totalViolations, 0), [rows]);

  // Define columns for the DataGrid
  const columns = useMemo(() => [
    {
      field: "owner",
      headerName: "Owner",
      flex: 2,
      minWidth: isMobile ? 150 : undefined,
      renderCell: (params) => (
        <Button
          onClick={() => {
            setSelectedOwner(params.value);
            setOwnerTasks(params.row.tasks);
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
  ], [isMobile]);

  // Function to export table data to Excel
  const exportToExcel = () => {
    const excelData = rows.map((row) => ({
      Owner: row.owner,
      "Total Violations": row.totalViolations,
      Percentage: row.percentage,
    }));

    excelData.push({
      Owner: "Net Total",
      "Total Violations": netTotal,
      Percentage: "",
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Owner Violations");
    XLSX.writeFile(workbook, "Owner_Violations.xlsx");
  };

  // Function to export owner tasks to Excel
  const exportOwnerTasksToExcel = () => {
    const data = ownerTasks.map((task) => ({
      'Request Number': task.requestNumber,
      'SLID': task.slid,
      'PIS Date': task.pisDate ? new Date(task.pisDate).toLocaleString() : 'N/A',
      'Satisfaction Score': task.evaluationScore,
      'Customer Name': task.customerName,
      'Contact Number': task.contactNumber,
      'Tariff Name': task.tarrifName,
      'Customer Feedback': task.customerFeedback,
      'Reason': task.reason,
      'Sub Reason': task.subReason || 'N/A',
      'Root Cause': task.rootCause || 'N/A',
      'Customer Type': task.customerType,
      'Governorate': task.governorate,
      'District': task.district,
      'Owner': task.responsible,
      'Team Name': task.teamName,
      'Team Company': task.teamCompany,
      'Interview Date': task.interviewDate ? new Date(task.interviewDate).toLocaleString() : 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0]).map((key) => ({ wch: key.length + 5 }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    XLSX.writeFile(workbook, `${selectedOwner}_Tasks.xlsx`);
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
          height: 400,
          width: "100%",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e2e8f0",
          overflow: "hidden"
        }}>
          {/* Header inside Paper */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0",
              // backgroundColor: "#fff"
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: "#475569",
                fontSize: isMobile ? "0.9rem" : "1rem",
                fontWeight: "600",
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <MdBarChart className="text-blue-500" size={24} />
              Owner Overview
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
            <Tooltip title="Export to Excel">
              <IconButton
                onClick={exportToExcel}
                size={isMobile ? "small" : "medium"}
                sx={{
                  color: '#10b981',
                  bgcolor: alpha('#10b981', 0.1),
                  '&:hover': {
                    bgcolor: alpha('#10b981', 0.2),
                  }
                }}
              >
                <RiFileExcel2Fill />
              </IconButton>
            </Tooltip>
          </Stack>

          <DataGrid
            rows={rows}
            columns={columns}
            disableVirtualization={true}
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
        {sortedOwnerViolations.length > 0 && (
          <Paper sx={{
            p: 3,
            borderRadius: "12px",
            height: 400,
            // bgcolor: 'white',
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
          }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={3}>
              <MdTrendingUp size={24} color="#8b5cf6" />
              <Typography variant="h6" fontWeight="700" color="#475569">
                Top Owners Analysis
              </Typography>
            </Stack>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
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
                  type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <RechartsTooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}
                />
                <Bar dataKey="Violations" radius={[4, 4, 0, 0]} barSize={isMobile ? 15 : 30}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                  ))}
                  <LabelList dataKey="Violations" position="top" style={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                </Bar>
                <Bar dataKey="ValidationRate" radius={[4, 4, 0, 0]} barSize={isMobile ? 10 : 20}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-v-${index}`} fill={alpha(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5], 0.4)} />
                  ))}
                  <LabelList
                    dataKey="ValidationRate"
                    position="top"
                    formatter={(val) => `${val}%`}
                    style={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        )}
      </Stack>

      {/* Dialog to show owner tasks */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullScreen
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#1e293b',
            boxShadow: 'none',
            borderRadius: fullScreen ? '0px' : '8px',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderBottom: '1px solid #334155',
          padding: '16px 24px',
        }}>
          <Typography variant="h6" component="div">
            Tasks for Owner: {selectedOwner}
          </Typography>
          <IconButton
            onClick={() => setDialogOpen(false)}
            sx={{ color: '#ffffff', '&:hover': { backgroundColor: '#334155' } }}
          >
            <MdClose />
          </IconButton>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#334155' }} />

        <DialogContent dividers sx={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '20px 24px' }}>
          <Stack spacing={3}>
            {ownerTasks.map((task, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 3,
                  backgroundColor: '#334155',
                  borderRadius: 2,
                  border: '1px solid #475569'
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#60a5fa' }}>
                  Task {index + 1}
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  <Box>
                    <DetailRow label="Request Number" value={task.requestNumber} />
                    <DetailRow label="SLID" value={task.slid} />
                    <DetailRow label="PIS Date" value={task.pisDate ? new Date(task.pisDate).toLocaleDateString() : 'N/A'} />
                    <DetailRow label="Customer Name" value={task.customerName} />
                    <DetailRow label="Contact Number" value={task.contactNumber} />
                  </Box>
                  <Box>
                    <DetailRow label="Tariff Name" value={task.tarrifName} />
                    <DetailRow label="Customer Feedback" value={task.customerFeedback} />
                    <DetailRow label="Reason" value={task.reason} />
                    <DetailRow label="Sub Reason" value={task.subReason || 'N/A'} />
                    <DetailRow label="Root Cause" value={task.rootCause || 'N/A'} />
                    <DetailRow label="Customer Type" value={task.customerType} />
                    <DetailRow label="Governorate" value={task.governorate} />
                    <DetailRow label="District" value={task.district} />
                    <DetailRow label="Owner" value={task.responsible || 'N/A'} />
                    <DetailRow label="Team Name" value={task.teamName} />
                    <DetailRow label="Team Company" value={task.teamCompany} />
                    <DetailRow label="Interview Date" value={task.interviewDate ? new Date(task.interviewDate).toLocaleDateString() : 'N/A'} />
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ backgroundColor: '#0f172a', borderTop: '1px solid #334155', padding: '12px 24px' }}>
          <Button
            onClick={exportOwnerTasksToExcel}
            variant="contained"
            startIcon={<MdFileDownload />}
            sx={{ backgroundColor: '#2563eb', color: '#ffffff', '&:hover': { backgroundColor: '#1d4ed8' } }}
          >
            Export to Excel
          </Button>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#94a3b8' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
});
