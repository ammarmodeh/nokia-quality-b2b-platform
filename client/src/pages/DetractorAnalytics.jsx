import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Select, MenuItem, FormControl, InputLabel, Button, Chip, TextField, Autocomplete } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import api from '../api/api';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Warning, CheckCircle, FilterList } from '@mui/icons-material';

// Hierarchical mapping will be loaded dynamically from the API

const DetractorAnalytics = () => {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const { token } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);

  // Analytics Data
  const [overview, setOverview] = useState({ totalRecords: 0, responsibleBreakdown: [], teamBreakdown: [] });
  const [teamViolations, setTeamViolations] = useState([]);
  const [trends, setTrends] = useState([]);
  const [rootCauses, setRootCauses] = useState([]);
  const [fixedStats, setFixedStats] = useState([]);
  const [trendSnapshots, setTrendSnapshots] = useState({ topTeams: [], topReasons: [] });
  const [isComparison, setIsComparison] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    teamName: '',
    responsible: '',
    specificTeam: '',
    period: 'daily',
    studyColumns: ['Main Reason'],
    compareBy: '',
    responsibleSub: ''
  });
  const [teamNames, setTeamNames] = useState([]);
  const [responsibleOptions, setResponsibleOptions] = useState(['Nokia/Quality', 'Nokia/FMC', 'OJO', 'Other']);
  const [responsibleSubOptions, setResponsibleSubOptions] = useState([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  useEffect(() => {
    const fetchRespOptions = async () => {
      try {
        const { data } = await api.get("/dropdown-options/all");
        if (data) {
          if (data.RESPONSIBILITY) {
            setResponsibleOptions(data.RESPONSIBILITY.map(opt => opt.value));
          }
          if (data.RESPONSIBILITY_SUB) {
            setResponsibleSubOptions(data.RESPONSIBILITY_SUB);
          }
        }
      } catch (err) {
        console.error("Failed to fetch responsibility options", err);
      }
    };
    fetchRespOptions();
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [filters]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTableData(),
        fetchOverview(),
        fetchTeamViolations(),
        fetchTrends(),
        fetchRootCause(),
        fetchFixedStats()
      ]);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async () => {
    try {
      const res = await api.get('/detractors');

      if (res.data.status && Array.isArray(res.data.data)) {
        const fetchedData = res.data.data;

        if (fetchedData.length > 0) {
          const exclude = ['_id', '__v', 'createdAt', 'updatedAt', 'auditStatus'];

          // Collect ALL unique columns from ALL records while preserving order
          const allColumns = [];
          const seenColumns = new Set();

          fetchedData.forEach(item => {
            Object.keys(item).forEach(key => {
              if (!exclude.includes(key) && !seenColumns.has(key)) {
                allColumns.push(key);
                seenColumns.add(key);
              }
            });
          });

          // Create dynamic columns from all unique fields in order
          const dynamicCols = allColumns.map(key => ({
            field: key,
            headerName: key.charAt(0).toUpperCase() + key.slice(1),
            flex: 1,
            minWidth: 150
          }));

          dynamicCols.push({
            field: 'auditStatus',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
              <span style={{
                color: params.value === 'Confirmed' ? '#4caf50' : '#ff9800',
                fontWeight: 'bold'
              }}>
                {params.value || '-'}
              </span>
            )
          });
          setColumns(dynamicCols);

          const formattedRows = fetchedData.map((d, i) => ({
            ...d,
            id: d._id ? d._id.toString() : i
          }));
          setRows(formattedRows);

          // Extract unique team names
          const teams = [...new Set(fetchedData.map(d => d['Team Name']).filter(Boolean))];
          setTeamNames(teams);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch data");
    }
  };

  const fetchOverview = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.teamName) params.append('teamName', filters.teamName);
      if (filters.responsible) params.append('responsible', filters.responsible);
      if (filters.responsibleSub) params.append('responsibleSub', filters.responsibleSub);
      if (filters.specificTeam) params.append('specificTeam', filters.specificTeam);

      const res = await api.get(`/detractors/analytics/overview?${params}`);

      if (res.data.status) {
        setOverview(res.data.data);
      }
    } catch (error) {
      console.error("Overview fetch error:", error);
    }
  };

  const fetchTeamViolations = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.specificTeam) params.append('specificTeam', filters.specificTeam);
      if (filters.responsible) params.append('responsible', filters.responsible);
      if (filters.responsibleSub) params.append('responsibleSub', filters.responsibleSub);

      const res = await api.get(`/detractors/analytics/team-violations?${params}`);

      if (res.data.status) {
        setTeamViolations(res.data.data);
      }
    } catch (error) {
      console.error("Team violations fetch error:", error);
    }
  };

  const fetchTrends = async () => {
    try {
      const params = new URLSearchParams();
      params.append('period', filters.period);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.specificTeam) params.append('specificTeam', filters.specificTeam);
      if (filters.responsible) params.append('responsible', filters.responsible);
      if (filters.responsibleSub) params.append('responsibleSub', filters.responsibleSub);

      const res = await api.get(`/detractors/analytics/trends?${params}`);

      if (res.data.status) {
        setTrends(res.data.data);
      }
    } catch (error) {
      console.error("Trends fetch error:", error);
    }
  };

  const fetchRootCause = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.teamName) params.append('teamName', filters.teamName);
      if (filters.specificTeam) params.append('specificTeam', filters.specificTeam);
      if (filters.responsible) params.append('responsible', filters.responsible);
      if (filters.responsibleSub) params.append('responsibleSub', filters.responsibleSub);

      // Add RCA specific params
      if (filters.studyColumns && filters.studyColumns.length > 0) {
        filters.studyColumns.forEach(col => params.append('studyColumns', col));
      }
      if (filters.compareBy) params.append('compareBy', filters.compareBy);

      const res = await api.get(`/detractors/analytics/root-cause?${params}`);

      if (res.data.status) {
        setRootCauses(res.data.data);
        setIsComparison(res.data.isComparison);
      }
    } catch (error) {
      console.error("Root cause fetch error:", error);
    }
  };

  const fetchFixedStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.teamName) params.append('teamName', filters.teamName);
      if (filters.specificTeam) params.append('specificTeam', filters.specificTeam);
      if (filters.responsible) params.append('responsible', filters.responsible);
      if (filters.responsibleSub) params.append('responsibleSub', filters.responsibleSub);

      const res = await api.get(`/detractors/analytics/fixed-rca?${params}`);
      if (res.data.status) {
        setFixedStats(res.data.data);
        setTrendSnapshots(res.data.trends);
      }
    } catch (error) {
      console.error("Fixed stats fetch error:", error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      teamName: '',
      responsible: '',
      specificTeam: '',
      period: 'daily',
      studyColumns: ['Main Reason'],
      compareBy: '',
      responsibleSub: ''
    });
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'white' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        📊 Advanced NPS Analytics & Root Cause Analysis
      </Typography>

      {/* Filters Panel */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FilterList />
          <Typography variant="h6">Filters</Typography>
          <Button size="small" onClick={resetFilters} sx={{ ml: 'auto' }}>Reset</Button>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                input: { color: 'white' },
                label: { color: '#aaa' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#3d3d3d' },
                  '&:hover fieldset': { borderColor: '#666' }
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                input: { color: 'white' },
                label: { color: '#aaa' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#3d3d3d' },
                  '&:hover fieldset': { borderColor: '#666' }
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Autocomplete
              options={teamNames}
              value={filters.teamName}
              onChange={(e, newValue) => handleFilterChange('teamName', newValue || '')}
              renderInput={(params) => <TextField {...params} label="Team" sx={{ input: { color: 'white' }, label: { color: '#aaa' } }} />}
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#3d3d3d' } } }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Autocomplete
              options={responsibleOptions}
              value={filters.responsible}
              onChange={(e, newValue) => {
                handleFilterChange('responsible', newValue || '');
                handleFilterChange('responsibleSub', ''); // Reset sub when main changes
              }}
              renderInput={(params) => <TextField {...params} label="Responsible" sx={{ input: { color: 'white' }, label: { color: '#aaa' } }} />}
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#3d3d3d' } } }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Autocomplete
              options={responsibleSubOptions
                .filter(opt => opt.parentValue === filters.responsible)
                .map(opt => opt.value)}
              value={filters.responsibleSub}
              onChange={(e, newValue) => handleFilterChange('responsibleSub', newValue || '')}
              renderInput={(params) => <TextField {...params} label="Specific Team" sx={{ input: { color: 'white' }, label: { color: '#aaa' } }} />}
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#3d3d3d' } } }}
              disabled={!filters.responsible}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#aaa' }}>Period</InputLabel>
              <Select
                value={filters.period}
                onChange={(e) => handleFilterChange('period', e.target.value)}
                label="Period"
                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d3d' } }}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ color: 'white', height: '100%' }}>
            <CardContent>
              <Typography color="gray" gutterBottom>Total Violations</Typography>
              <Typography variant="h3">{overview.totalRecords}</Typography>
              <Chip label="All Time" size="small" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ color: 'white', height: '100%' }}>
            <CardContent>
              <Typography color="gray" gutterBottom>Unique Teams</Typography>
              <Typography variant="h3">{teamNames.length}</Typography>
              <Chip label="Active" size="small" color="success" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ color: 'white', height: '100%' }}>
            <CardContent>
              <Typography color="gray" gutterBottom>Top Violator</Typography>
              <Typography variant="h6">{teamViolations[0]?.teamName || 'N/A'}</Typography>
              <Typography variant="body2" color="error">{teamViolations[0]?.totalViolations || 0} violations</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ color: 'white', height: '100%' }}>
            <CardContent>
              <Typography color="gray" gutterBottom>Trend</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {trends.length > 1 && trends[trends.length - 1]?.count > trends[trends.length - 2]?.count ? (
                  <>
                    <TrendingUp color="error" />
                    <Typography variant="h6" color="error">Increasing</Typography>
                  </>
                ) : (
                  <>
                    <TrendingDown color="success" />
                    <Typography variant="h6" color="success">Decreasing</Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ color: 'white' }}>
            <CardContent sx={{ height: 350 }}>
              <Typography variant="h6" gutterBottom>Violations by Responsible</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview.responsibleBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {overview.responsibleBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#2d2d2d', border: 'none' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ color: 'white' }}>
            <CardContent sx={{ height: 350 }}>
              <Typography variant="h6" gutterBottom>Top 10 Teams by Violations</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.teamBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#fff" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#fff" />
                  <Tooltip contentStyle={{ backgroundColor: '#2d2d2d', border: 'none' }} />
                  <Bar dataKey="value" fill="#7b68ee">
                    {overview.teamBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card sx={{ color: 'white' }}>
            <CardContent sx={{ height: 350 }}>
              <Typography variant="h6" gutterBottom>Violation Trends Over Time ({filters.period})</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip contentStyle={{ backgroundColor: '#2d2d2d', border: 'none' }} />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#7b68ee" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="uniqueTeams" stroke="#00C49F" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Team Violations Table */}
      <Paper sx={{ p: 3, mb: 3, }}>
        <Typography variant="h6" gutterBottom>Team Violation Statistics</Typography>
        <Box sx={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={teamViolations.map((t, i) => ({ id: i, ...t }))}
            columns={[
              { field: 'teamName', headerName: 'Team Name', flex: 1 },
              { field: 'totalViolations', headerName: 'Total Violations', width: 150 },
              {
                field: 'avgViolationsPerDay',
                headerName: 'Avg/Day',
                width: 120,
                valueFormatter: (params) => params.value?.toFixed(2) || '0'
              },
              {
                field: 'latestViolation',
                headerName: 'Latest',
                width: 150,
                valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : '-'
              }
            ]}
            sx={{
              color: 'white',
              borderColor: '#3d3d3d',
              '& .MuiDataGrid-cell': { borderColor: '#3d3d3d', color: '#ddd' },
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f3f4f6', color: '#ffffff', borderBottom: '1px solid #555', fontWeight: 'bold' },
              '& .MuiDataGrid-footerContainer': { borderColor: '#3d3d3d', color: '#ffffff' },
            }}
          />
        </Box>
      </Paper>

      {/* Advanced RCA Section */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: 3, background: 'linear-gradient(135deg, #121212, #1a1a1a)', border: '1px solid #3d3d3d', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(123, 104, 238, 0.1)' }}>
            <Warning color="primary" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>Advanced Root Cause Discovery</Typography>
            <Typography variant="body2" sx={{ color: 'gray' }}>Managerial Intelligence & Deep Operational Analysis</Typography>
          </Box>
        </Box>

        {/* RCA Controls - Moved Inside */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              multiple
              options={columns.map(c => c.field).filter(f => !['id', 'auditStatus', 'Team Name', 'Responsible', 'Specific Team'].includes(f))}
              value={filters.studyColumns}
              onChange={(e, newValue) => handleFilterChange('studyColumns', newValue)}
              renderInput={(params) => <TextField {...params} label="Dynamic Study Columns" sx={{ input: { color: 'white' }, label: { color: '#aaa' } }} />}
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' } } }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} sx={{ color: '#7b68ee', borderColor: '#7b68ee', bgcolor: 'rgba(123, 104, 238, 0.05)' }} />
                ))
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={columns.map(c => c.field).filter(f => !['id', 'auditStatus'].includes(f))}
              value={filters.compareBy}
              onChange={(e, newValue) => handleFilterChange('compareBy', newValue || '')}
              renderInput={(params) => <TextField {...params} label="Dynamic Comparison Target" sx={{ input: { color: 'white' }, label: { color: '#aaa' } }} />}
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' } } }}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Main Content Area */}
          <Grid item xs={12} lg={9}>
            {/* 1. Week vs Responsible */}
            <Card sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 'bold', color: '#7b68ee' }}>📅 Week # vs Responsible Breakdown</Typography>
                <Box sx={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fixedStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="label" stroke="#aaa" />
                      <YAxis stroke="#aaa" />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: 8 }} />
                      <Legend />
                      {responsibleOptions.map((resp, i) => (
                        <Bar key={resp} dataKey={`responsible.${resp}`} name={resp} stackId="a" fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

            {/* 2. Week vs Q1 (Detractor/Neutral) & NPS Density */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 'bold', color: '#ff7c7c' }}>📌 Week # vs Q1 Classification</Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fixedStats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                          <XAxis dataKey="label" stroke="#aaa" />
                          <YAxis stroke="#aaa" />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: 8 }} />
                          <Legend />
                          <Bar dataKey="q1.detractors" name="Detractors (1-6)" fill="#ff4d4d" stackId="q1" />
                          <Bar dataKey="q1.neutrals" name="Neutrals (7-8)" fill="#ffcc00" stackId="q1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 'bold', color: '#00C49F' }}>📈 NPS Density (Violations / Total Samples %)</Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={fixedStats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                          <XAxis dataKey="label" stroke="#aaa" />
                          <YAxis stroke="#aaa" />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: 8 }} />
                          <Line type="monotone" dataKey="npsDensity" name="Density %" stroke="#00C49F" strokeWidth={3} dot={{ r: 6, strokeWidth: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* 3. Feedback/Comment Trend & Dynamic RCA */}
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 'bold', color: '#ffbb28' }}>💬 Comment Volume vs Week #</Typography>
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fixedStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="label" stroke="#aaa" />
                      <YAxis stroke="#aaa" />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: 8 }} />
                      <Bar dataKey="comments" name="Total Feedback Comments" fill="#ffbb28" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

            {/* Dynamic Analysis Cards */}
            {rootCauses.map((cause, idx) => (
              <Card key={idx} sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>🔍 Dynamic Discovery: {cause.field}</Typography>
                  {isComparison ? (
                    <Box sx={{ height: 350, mt: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cause.data} layout="vertical">
                          <XAxis type="number" stroke="#aaa" />
                          <YAxis type="category" dataKey="groupName" stroke="#aaa" width={120} />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none' }} />
                          <Legend />
                          {cause.allValues.map((val, i) => (
                            <Bar key={val} dataKey={val} stackId="a" fill={COLORS[i % COLORS.length]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ height: 250 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={cause.topValues} dataKey="count" nameKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                                {cause.topValues.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {cause.topValues.slice(0, 5).map((val, i) => (
                          <Box key={i} sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="gray">{val.value}</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{val.count}</Typography>
                            </Box>
                            <Box sx={{ height: 4, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                              <Box sx={{ width: `${(val.count / Math.max(...cause.topValues.map(v => v.count))) * 100}%`, height: '100%', bgcolor: COLORS[i % COLORS.length] }} />
                            </Box>
                          </Box>
                        ))}
                      </Grid>
                    </Grid>
                  )}
                </CardContent>
              </Card>
            ))}
          </Grid>

          {/* Right Snapshot Sidebar */}
          <Grid item xs={12} lg={3}>
            <Box sx={{ position: 'sticky', top: 20 }}>
              <Card sx={{ mb: 3, bgcolor: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp fontSize="small" color="primary" /> Top Offending Teams
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {trendSnapshots.topTeams.map((team, idx) => (
                      <Box key={idx} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{team.name}</Typography>
                        <Chip label={team.value} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d' }} />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ bgcolor: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterList fontSize="small" color="secondary" /> Top Root Causes
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {trendSnapshots.topReasons.map((reason, idx) => (
                      <Box key={idx} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{reason.name}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ffcc00' }}>{reason.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Table */}
      <Typography variant="h6" sx={{ mb: 2 }}>Detailed Data Explorer</Typography>
      <Paper sx={{ width: '100%', border: '1px solid #3d3d3d', height: 600 }}>
        {rows.length > 0 ? (
          <DataGrid
            rows={rows}
            columns={columns}
            slots={{ toolbar: GridToolbar }}
            loading={loading}
            sx={{
              color: 'white',
              borderColor: '#3d3d3d',
              '& .MuiDataGrid-cell': { borderColor: '#3d3d3d', color: '#ddd' },
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: '#f3f4f6',
                color: '#ffffff',
                borderBottom: '1px solid #555',
                fontWeight: 'bold'
              },
              '& .MuiDataGrid-columnHeader': { bgcolor: '#f3f4f6', color: '#ffffff' },
              '& .MuiDataGrid-columnHeaderTitle': { color: '#ffffff' },
              '& .MuiDataGrid-footerContainer': { borderColor: '#3d3d3d', color: '#ffffff' },
              '& .MuiTablePagination-root': { color: '#ffffff' },
              '& .MuiButtonBase-root': { color: '#ffffff' },
            }}
          />
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', color: '#aaa' }}>
            <Typography>No data available to display.</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default DetractorAnalytics;
