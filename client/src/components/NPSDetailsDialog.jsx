import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  Chip,
  useTheme,
  useMediaQuery,
  Tooltip,
  Tabs,
  Tab,
  Grid,
  Paper,
  alpha
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { MdClose, MdTableChart, MdBarChart } from 'react-icons/md';
import { format } from 'date-fns';
import { newFormatDate } from '../utils/helpers';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF6B9D', '#8884D8', '#82CA9D'];

const NPSDetailsDialog = ({ open, onClose, title, tasks = [] }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0);

  // Analytics aggregation
  const analytics = useMemo(() => {
    const stats = {
      byOwner: {},
      byReason: {},
      bySubReason: {},
      byRootCause: {}
    };

    tasks.forEach(task => {
      // Owner
      const owner = task.responsible || 'Unassigned';
      stats.byOwner[owner] = (stats.byOwner[owner] || 0) + 1;

      // Reason
      const reason = task.reason || 'N/A';
      stats.byReason[reason] = (stats.byReason[reason] || 0) + 1;

      // Sub-reason
      const subReason = task.subReason || 'N/A';
      stats.bySubReason[subReason] = (stats.bySubReason[subReason] || 0) + 1;

      // Root Cause
      const rootCause = task.rootCause || 'N/A';
      stats.byRootCause[rootCause] = (stats.byRootCause[rootCause] || 0) + 1;
    });

    // Convert to chart data
    const toChartData = (obj) => Object.entries(obj)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      ownerData: toChartData(stats.byOwner),
      reasonData: toChartData(stats.byReason),
      subReasonData: toChartData(stats.bySubReason),
      rootCauseData: toChartData(stats.byRootCause)
    };
  }, [tasks]);

  const columns = [
    {
      field: 'slid',
      headerName: 'SLID',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold" color="primary">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'evaluationScore',
      headerName: 'Score',
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        let color = '#757575';
        if (params.value <= 6) color = '#ef4444';
        else if (params.value <= 8) color = '#f59e0b';
        else color = '#10b981';

        return (
          <Box
            sx={{
              fontWeight: 'bold',
              color: color,
              border: `1px solid ${color}`,
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem'
            }}
          >
            {params.value}
          </Box>
        );
      }
    },
    {
      field: 'teamName',
      headerName: 'Team Name',
      width: 150,
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      width: 180,
    },
    {
      field: 'customerFeedback',
      headerName: 'Feedback',
      flex: 1,
      minWidth: 250,
      renderCell: (params) => (
        <Tooltip title={params.value || ''}>
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'reason',
      headerName: 'Reason',
      width: 150,
    },
    {
      field: 'responsible',
      headerName: 'Owner',
      width: 150,
      renderCell: (params) => params.row.responsible || 'N/A'
    },
    {
      field: 'pisDate',
      headerName: 'PIS Date',
      width: 120,
      renderCell: (params) => {
        const dateVal = params.value?.$date || params.value;
        return (
          <Typography variant="body2">
            {newFormatDate(dateVal)}
          </Typography>
        );
      }
    }
  ];

  const ChartCard = ({ title, children }) => (
    <Paper sx={{ p: 3, borderRadius: 3, height: '100%', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
      <Typography variant="h6" fontWeight="700" mb={2}>
        {title}
      </Typography>
      {children}
    </Paper>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: fullScreen ? 0 : 3,
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`,
        pb: 2
      }}>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {tasks.length} tasks found
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <MdClose />
        </IconButton>
      </DialogTitle>

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          px: 2,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 }
        }}
      >
        <Tab icon={<MdTableChart />} iconPosition="start" label="Task List" />
        <Tab icon={<MdBarChart />} iconPosition="start" label="Analytics" />
      </Tabs>

      <DialogContent sx={{ p: activeTab === 0 ? 0 : 3, height: 600, overflow: 'auto' }}>
        {activeTab === 0 && (
          <DataGrid
            rows={tasks}
            columns={columns}
            getRowId={(row) => row._id || Math.random()}
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
              pagination: {
                labelRowsPerPage: 'Rows:',
              }
            }}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderColor: theme.palette.divider
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
              }
            }}
          />
        )}

        {activeTab === 1 && (
          <Grid container spacing={3}>
            {/* Owner Analysis */}
            <Grid item xs={12} md={6}>
              <ChartCard title="Owner Distribution">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.ownerData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill={theme.palette.primary.main} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            {/* Reason Breakdown */}
            <Grid item xs={12} md={6}>
              <ChartCard title="Reason Breakdown">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.reasonData.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.reasonData.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            {/* Sub-reason Distribution */}
            <Grid item xs={12} md={6}>
              <ChartCard title="Sub-reason Distribution">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.subReasonData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            {/* Root Cause Analysis */}
            <Grid item xs={12} md={6}>
              <ChartCard title="Root Cause Analysis">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.rootCauseData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, p: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NPSDetailsDialog;
