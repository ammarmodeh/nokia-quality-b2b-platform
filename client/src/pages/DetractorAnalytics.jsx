import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Select, MenuItem, FormControl, InputLabel, Button, Chip, TextField, Autocomplete } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Warning, CheckCircle, FilterList } from '@mui/icons-material';

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

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    teamName: '',
    responsible: '',
    period: 'daily'
  });
  const [teamNames, setTeamNames] = useState([]);
  const [responsibleOptions] = useState(['Nokia/Quality', 'Nokia/FMC', 'Other']);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

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
        fetchRootCause()
      ]);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/detractors`, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('accessToken')}` }
      });

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

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/detractors/analytics/overview?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

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

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/detractors/analytics/team-violations?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

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

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/detractors/analytics/trends?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

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

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/detractors/analytics/root-cause?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status) {
        setRootCauses(res.data.data);
      }
    } catch (error) {
      console.error("Root cause fetch error:", error);
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
      period: 'daily'
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
              onChange={(e, newValue) => handleFilterChange('responsible', newValue || '')}
              renderInput={(params) => <TextField {...params} label="Responsible" sx={{ input: { color: 'white' }, label: { color: '#aaa' } }} />}
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#3d3d3d' } } }}
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

      {/* Root Cause Analysis */}
      {rootCauses.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, }}>
          <Typography variant="h6" gutterBottom>Root Cause Analysis</Typography>
          <Grid container spacing={2}>
            {rootCauses.slice(0, 4).map((cause, idx) => (
              <Grid item xs={12} md={6} key={idx}>
                <Card sx={{ bgcolor: '#2a2a2a' }}>
                  <CardContent>
                    <Typography variant="subtitle1" color="primary" gutterBottom>{cause.field}</Typography>
                    {cause.topValues.slice(0, 5).map((val, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="#ccc">{val.value}</Typography>
                        <Chip label={val.count} size="small" color="warning" />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

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
