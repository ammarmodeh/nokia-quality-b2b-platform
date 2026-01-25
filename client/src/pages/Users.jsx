import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  TextField,
  Box,
  Grid,
  Chip,
  IconButton,
  useMediaQuery,
  Stack,
  Tabs,
  Tab,
  Button,
  Paper,
  InputAdornment,
  LinearProgress,
  MenuItem
} from "@mui/material";
import { FileCopy as FileCopyIcon, Visibility as VisibilityIcon } from "@mui/icons-material";
import { MdOutlineSearch, MdClose, MdGridView } from "react-icons/md";
import { FaList, FaSortAmountDown, FaUserTie, FaUsers, FaBuilding } from "react-icons/fa";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import api from "../api/api";
import { useSelector } from "react-redux";
import VisibilityDialog from "../components/VisibilityDialog";

// --- Stats Card Component ---
const StatCard = ({ title, count, total, color, icon }) => (
  <Card sx={{ height: '100%', position: 'relative', overflow: 'visible', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="start" mb={2}>
        <Box>
          <Typography variant="subtitle2" color="textSecondary" fontWeight="600" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="800" color="textPrimary">
            {count}
          </Typography>
        </Box>
        <Avatar
          variant="rounded"
          sx={{
            bgcolor: `${color}15`,
            color: color,
            width: 48,
            height: 48,
            borderRadius: 2
          }}
        >
          {icon}
        </Avatar>
      </Stack>
      {total > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={(count / total) * 100}
            sx={{
              flexGrow: 1,
              height: 6,
              borderRadius: 5,
              bgcolor: `${color}20`,
              '& .MuiLinearProgress-bar': {
                bgcolor: color,
                borderRadius: 5,
              }
            }}
          />
        </Box>
      )}
    </CardContent>
  </Card>
);

const Users = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const [team, setTeam] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedView, setSelectedView] = useState(0); // 0 = Board, 1 = List
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateTrigger, setUpdateTrigger] = useState(false);
  const currentUserId = useSelector((state) => state?.auth?.user?._id);

  // Fetch team members
  useEffect(() => {
    const fetchTeam = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get("/users/get-all-users", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        setTeam(data);
      } catch (error) {
        console.error("Error fetching team members:", error);
        setError(error.message || "Failed to load team members");
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [updateTrigger]);

  const handleCopyEmail = useCallback((email) => {
    navigator.clipboard.writeText(email)
      .then(() => alert("Email copied to clipboard!"))
      .catch(() => { });
  }, []);

  const handleVisibilityChange = useCallback(async (memberId, visibleTo) => {
    try {
      await api.put(`/users/update-visibility/${memberId}`, { visibleTo }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      setTeam((prev) => prev.map((m) => m._id === memberId ? { ...m, visibleTo } : m));
      setSelectedMember((prev) => prev?._id === memberId ? { ...prev, visibleTo } : prev);
    } catch (error) { }
  }, []);

  const isVisible = useCallback((member, currentUserId) => {
    if (!member) return false;
    if (member._id === currentUserId) return true;
    return member.visibleTo && member.visibleTo.includes(currentUserId);
  }, []);

  // Filter & Sort
  const filteredTeam = useMemo(() => {
    if (!Array.isArray(team)) return [];
    let result = team.filter((member) =>
      member && ( // Ensure member exists
        (member.name && member.name.toLowerCase().includes(search.toLowerCase())) ||
        (member.email && member.email.toLowerCase().includes(search.toLowerCase())) ||
        (member.title && member.title.toLowerCase().includes(search.toLowerCase()))
      )
    );

    if (sortBy === "name") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "role") {
      result.sort((a, b) => (a.role || "").localeCompare(b.role || ""));
    }

    return result;
  }, [team, search, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: team.length,
      admins: team.filter(m => m.role === 'Admin').length,
      departments: new Set(team.map(m => m.department).filter(Boolean)).size,
    };
  }, [team]);

  // DataGrid Columns
  const columns = [
    {
      field: 'avatar', headerName: '', width: 70, sortable: false,
      renderCell: (params) => <Avatar src={params.row?.avatar} alt={params.row?.name} sx={{ width: 32, height: 32 }} />
    },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150, renderCell: (p) => <Typography fontWeight="500">{p.value}</Typography> },
    {
      field: 'title', headerName: 'Title', width: 180,
      renderCell: (params) => <Chip label={params.value || 'Member'} size="small" variant="outlined" color="primary" />
    },
    { field: 'department', headerName: 'Department', width: 150 },
    {
      field: 'email', headerName: 'Email', flex: 1, minWidth: 200,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%', overflow: 'hidden' }}>
          <Typography variant="body2" noWrap sx={{ flex: 1 }}>
            {isVisible(params.row, currentUserId) ? params.value : '****'}
          </Typography>
          {isVisible(params.row, currentUserId) && (
            <IconButton size="small" onClick={() => handleCopyEmail(params.value)}><FileCopyIcon fontSize="small" /></IconButton>
          )}
        </Stack>
      )
    },
    {
      field: 'phoneNumber', headerName: 'Phone', width: 150,
      valueGetter: (value, row) => isVisible(row, currentUserId) ? value : '****'
    },
    {
      field: 'actions', headerName: 'Visibility', width: 100, sortable: false,
      renderCell: (params) => (
        params.row._id === currentUserId && (
          <IconButton onClick={() => { setSelectedMember(params.row); setDialogOpen(true); }}>
            <VisibilityIcon color="primary" />
          </IconButton>
        )
      )
    }
  ];

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
        <Typography color="error">Error: {error}</Typography>
        <Button variant="contained" onClick={() => setUpdateTrigger(prev => !prev)}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 0 : 3, minHeight: '100vh' }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', md: 'center' }} mb={4} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="#1e293b">
            Quality Members
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage your team, roles, and visibility settings.
          </Typography>
        </Box>
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={4}>
          <StatCard title="Total Members" count={stats.total} total={0} color="#3b82f6" icon={<FaUsers />} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Admins / Leads" count={stats.admins} total={stats.total} color="#8b5cf6" icon={<FaUserTie />} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Departments" count={stats.departments} total={0} color="#10b981" icon={<FaBuilding />} />
        </Grid>
      </Grid>

      {/* Toolbar */}
      <Paper sx={{ mb: 3, borderRadius: 3, p: 2 }} elevation={0}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
          <Tabs value={selectedView} onChange={(e, v) => setSelectedView(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 } }}>
            <Tab icon={<MdGridView />} iconPosition="start" label="Board View" />
            <Tab icon={<FaList />} iconPosition="start" label="List View" />
          </Tabs>

          <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <TextField
              placeholder="Search members..."
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><MdOutlineSearch color="action" /></InputAdornment>),
                endAdornment: search && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><MdClose /></IconButton></InputAdornment>)
              }}
              sx={{ width: { xs: '100%', md: 240 }, bgcolor: '#f1f5f9', borderRadius: 2, '& fieldset': { border: 'none' } }}
            />
            <TextField
              select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              size="small"
              InputProps={{ startAdornment: (<InputAdornment position="start"><FaSortAmountDown color="action" size={14} /></InputAdornment>) }}
              sx={{ minWidth: 150, bgcolor: '#f1f5f9', borderRadius: 2, '& fieldset': { border: 'none' } }}
            >
              <MenuItem value="name">Name (A-Z)</MenuItem>
              <MenuItem value="role">Role</MenuItem>
            </TextField>
          </Stack>
        </Stack>
      </Paper>

      {/* Content */}
      {selectedView === 0 ? (
        <Grid container spacing={3}>
          {filteredTeam.map((member) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={member._id}>
              <Card sx={{
                height: '100%',
                textAlign: 'center',
                p: 3,
                borderRadius: 3,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                position: 'relative',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }
              }}>
                {member._id === currentUserId && (
                  <IconButton onClick={() => { setSelectedMember(member); setDialogOpen(true); }} sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <VisibilityIcon fontSize="small" color="action" />
                  </IconButton>
                )}

                <Avatar src={member.avatar} alt={member.name} sx={{ width: 80, height: 80, mx: 'auto', mb: 2, border: '3px solid #f1f5f9' }} />

                <Typography variant="h6" fontWeight="bold" gutterBottom>{member.name}</Typography>

                <Chip label={member.title || "Member"} size="small" sx={{ mb: 2, bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }} />

                <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>{member.department || 'No Department'}</Typography>

                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                  <Typography variant="caption" display="block" color="textSecondary" sx={{ mb: 0.5 }}>
                    {isVisible(member, currentUserId) ? member.email : '••••••••••'}
                  </Typography>
                  <Typography variant="caption" display="block" color="textSecondary">
                    {isVisible(member, currentUserId) ? (member.phoneNumber || 'No phone') : '••••••••'}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ height: 650, width: '100%', borderRadius: 3, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <DataGrid
            rows={filteredTeam}
            columns={columns}
            getRowId={(row) => row._id}
            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            slots={{ toolbar: GridToolbar }}
            sx={{ border: 'none', '& .MuiDataGrid-cell': { borderBottom: '1px solid #f1f5f9' }, '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', fontWeight: 'bold' } }}
          />
        </Paper>
      )}

      {/* Dialog */}
      {selectedMember && (
        <VisibilityDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setSelectedMember(null); }}
          member={selectedMember}
          team={team}
          currentUserId={currentUserId}
          handleVisibilityChange={handleVisibilityChange}
        />
      )}
    </Box>
  );
};

export default Users;