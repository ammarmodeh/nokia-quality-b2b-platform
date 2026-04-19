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
  alpha,
  Fade
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { MdClose, MdTableChart, MdBarChart, MdCategory, MdPieChart } from 'react-icons/md';
import { SupportAgent, BugReport, Dangerous } from '@mui/icons-material';
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

const PREM_COLORS = {
  background: '#0f172a',
  surface: 'rgba(30, 41, 59, 0.5)',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  primary: '#8b5cf6',
  primaryGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: `1px solid ${PREM_COLORS.border}`,
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        p: 2,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        minWidth: '150px'
      }}>
        <Typography variant="subtitle2" color="#f8fafc" fontWeight="700" mb={1} sx={{ borderBottom: `1px solid ${PREM_COLORS.border}`, pb: 1 }}>
          {label || payload[0]?.name}
        </Typography>
        {payload.map((entry, index) => (
          <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: entry.color || entry.fill }} />
              <Typography variant="body2" color="#e2e8f0">{entry.name}:</Typography>
            </Box>
            <Typography variant="body2" fontWeight="bold" color="#f8fafc" ml={2}>
              {entry.value}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  }
  return null;
};

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
        <Typography variant="body2" fontWeight="bold" sx={{ color: '#8b5cf6' }}>
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
        let color = '#94a3b8';
        let bg = 'transparent';
        if (params.value <= 6) { color = '#ef4444'; bg = 'rgba(239, 68, 68, 0.1)'; }
        else if (params.value <= 8) { color = '#f59e0b'; bg = 'rgba(245, 158, 11, 0.1)'; }
        else if (params.value >= 9) { color = '#10b981'; bg = 'rgba(16, 185, 129, 0.1)'; }

        if (!params.value) return <Box>-</Box>;

        return (
          <Box
            sx={{
              fontWeight: 'bold',
              color: color,
              bgcolor: bg,
              border: `1px solid ${color}`,
              borderRadius: '50%',
              width: 32,
              height: 32,
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
      width: 160,
      renderCell: (params) => (
        <Typography variant="body2" color="#e2e8f0">{params.value || '-'}</Typography>
      )
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2" color="#e2e8f0">{params.value || '-'}</Typography>
      )
    },
    {
      field: 'customerFeedback',
      headerName: 'Feedback',
      flex: 1,
      minWidth: 250,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow placement="top">
          <Typography variant="body2" noWrap sx={{ color: '#cbd5e1', fontStyle: params.value ? 'normal' : 'italic' }}>
            {params.value || 'No feedback'}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'reason',
      headerName: 'Reason',
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'N/A'} 
          size="small" 
          sx={{ 
            bgcolor: 'rgba(59, 130, 246, 0.1)', 
            color: '#3b82f6',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }} 
        />
      )
    },
    {
      field: 'responsible',
      headerName: 'Owner',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="500" color="#f1f5f9">
          {params.value || 'N/A'}
        </Typography>
      )
    },
    {
      field: 'pisDate',
      headerName: 'PIS Date',
      width: 120,
      renderCell: (params) => {
        const dateVal = params.value?.$date || params.value;
        if (!dateVal) return <Typography variant="body2" color="#64748b">-</Typography>;
        return (
          <Typography variant="body2" color="#94a3b8">
            {newFormatDate(dateVal)}
          </Typography>
        );
      }
    }
  ];

  const ChartCard = ({ title, children, icon: Icon }) => (
    <Paper sx={{ 
      p: 3, 
      borderRadius: '24px', 
      height: '100%', 
      background: PREM_COLORS.surface,
      backdropFilter: 'blur(12px)',
      border: `1px solid ${PREM_COLORS.border}`,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 20px -8px rgba(0, 0, 0, 0.3)',
        borderColor: 'rgba(139, 92, 246, 0.4)'
      }
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
        {Icon && (
          <Box sx={{ 
            p: 1.2, 
            borderRadius: '14px', 
            background: 'rgba(139, 92, 246, 0.15)',
            color: '#a78bfa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={22} />
          </Box>
        )}
        <Typography variant="h6" fontWeight="700" color="#f8fafc" letterSpacing="0.5px">
          {title}
        </Typography>
      </Box>
      <Box sx={{ position: 'relative', width: '100%', height: 'calc(100% - 60px)', minHeight: 300 }}>
        {children}
      </Box>
    </Paper>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="xl"
      fullWidth
      TransitionComponent={Fade}
      transitionDuration={400}
      sx={{
        '& .MuiDialog-paper': {
          bgcolor: PREM_COLORS.background,
          backgroundImage: 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.1), transparent 40%), radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.1), transparent 40%)',
          borderRadius: fullScreen ? 0 : '24px',
          border: fullScreen ? 'none' : `1px solid ${PREM_COLORS.border}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        },
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)'
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${PREM_COLORS.border}`,
        p: 3,
        bgcolor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(10px)'
      }}>
        <Box>
          <Typography variant="h5" fontWeight="800" color="#f8fafc" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <MdPieChart color="#a78bfa" /> {title}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5, fontWeight: 500 }}>
            {tasks.length} tasks matching this criteria
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose} 
          sx={{ 
            color: '#94a3b8', 
            bgcolor: 'rgba(255,255,255,0.05)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', transform: 'rotate(90deg)' },
            transition: 'all 0.3s ease'
          }}
        >
          <MdClose />
        </IconButton>
      </DialogTitle>

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        sx={{
          borderBottom: `1px solid ${PREM_COLORS.border}`,
          px: 4,
          bgcolor: 'rgba(15, 23, 42, 0.4)',
          '& .MuiTab-root': { 
            textTransform: 'none', 
            fontWeight: 700,
            fontSize: '1.05rem',
            color: PREM_COLORS.textSecondary,
            minHeight: '64px',
            '&.Mui-selected': { color: '#a78bfa' },
            mx: 1
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#a78bfa',
            height: '3px',
            borderTopLeftRadius: '3px',
            borderTopRightRadius: '3px',
          }
        }}
      >
        <Tab icon={<MdTableChart size={22} />} iconPosition="start" label="Task List" />
        <Tab icon={<MdBarChart size={22} />} iconPosition="start" label="Analytics" />
      </Tabs>

      <DialogContent sx={{ 
        p: activeTab === 0 ? 0 : 4, 
        height: 'calc(85vh - 150px)', 
        overflow: 'auto',
        '&::-webkit-scrollbar': { width: '8px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: '10px' },
        '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255,255,255,0.3)' }
      }}>
        {activeTab === 0 && (
          <Box sx={{ height: '100%', width: '100%', p: 2 }}>
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
                pagination: { labelRowsPerPage: 'Rows:' }
              }}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              sx={{
                border: 'none',
                color: '#f8fafc',
                '& .MuiDataGrid-cell': {
                  borderColor: PREM_COLORS.border,
                  color: '#e2e8f0',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  color: '#f8fafc',
                  borderBottom: `1px solid ${PREM_COLORS.border}`,
                  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 }
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: `1px solid ${PREM_COLORS.border}`,
                  color: '#e2e8f0',
                },
                '& .MuiTablePagination-root': {
                  color: '#e2e8f0',
                },
                '& .MuiDataGrid-toolbarContainer': {
                  padding: 2,
                  gap: 2,
                  '& button': { color: '#a78bfa' },
                  '& input': { color: '#f8fafc' },
                  '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255,255,255,0.2)' },
                  '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'rgba(255,255,255,0.4)' },
                  '& .MuiInput-underline:after': { borderBottomColor: '#a78bfa' }
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                }
              }}
            />
          </Box>
        )}

        {activeTab === 1 && (
          <Grid container spacing={4} sx={{ pb: 2 }}>
            <Grid item xs={12} lg={6}>
              <ChartCard title="Owner Distribution" icon={SupportAgent}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.ownerData.slice(0, 10)} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorOwner" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.5}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="value" fill="url(#colorOwner)" radius={[6, 6, 0, 0]} animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            {/* Reason Breakdown */}
            <Grid item xs={12} lg={6}>
              <ChartCard title="Reason Breakdown" icon={MdCategory}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.reasonData.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      label={({ name, percent }) => percent > 0.05 ? `${name.substring(0, 15)}${name.length > 15 ? '...' : ''} ${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                      dataKey="value"
                      stroke="transparent"
                      animationDuration={1500}
                    >
                      {analytics.reasonData.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            {/* Sub-reason Distribution */}
            <Grid item xs={12} lg={6}>
              <ChartCard title="Sub-reason Distribution" icon={BugReport}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.subReasonData.slice(0, 10)} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0.5}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="value" fill="url(#colorSub)" radius={[6, 6, 0, 0]} animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            {/* Root Cause Analysis */}
            <Grid item xs={12} lg={6}>
              <ChartCard title="Root Cause Analysis" icon={Dangerous}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.rootCauseData.slice(0, 10)} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorRoot" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#b91c1c" stopOpacity={0.5}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="value" fill="url(#colorRoot)" radius={[6, 6, 0, 0]} animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NPSDetailsDialog;
