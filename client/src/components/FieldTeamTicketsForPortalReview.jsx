import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  TablePagination,
  useMediaQuery,
  Button,
} from "@mui/material";
import {
  BugReport,
  PriorityHigh,
} from '@mui/icons-material';
import api from "../api/api";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import TicketDetailsDialogForPortalView from "./TicketDetailsDialogForPortalView";

const FieldTeamTicketsForPortalReview = ({ teamId, teamName }) => {
  const [teamTickets, setTeamTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const isMobile = useMediaQuery('(max-width:503px)');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!teamId) return;

      try {
        setLoading(true);
        // Fetch both team-specific tickets and all tickets
        const [teamResponse, allResponse] = await Promise.all([
          api.get(`/tasks/get-all-tasks`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
            params: {
              teamId: teamId
            }
          }),
          api.get(`/tasks/get-all-tasks`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            }
          })
        ]);

        // Filter team-specific tickets based on teamId
        const filteredTeamTickets = teamResponse.data.filter(task => task.teamId === teamId);
        setTeamTickets(filteredTeamTickets);
        setAllTickets(allResponse.data);
      } catch (error) {
        console.error("Error fetching tickets:", error);
        setError("Failed to fetch tickets");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [teamId]);

  // Colors for dark mode UI consistency
  const colors = {
    background: '#121212',
    surface: '#1e1e1e',
    surfaceElevated: '#252525',
    border: '#444',
    primary: '#3ea6ff',
    primaryHover: 'rgba(62, 166, 255, 0.08)',
    textPrimary: '#ffffff',
    textSecondary: '#9e9e9e',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    tableBg: '#1a1a1a',
    tableHeaderBg: '#252525',
    tableRowHover: '#2a2a2a',
    chartGrid: '#333333',
  };

  const handleClickOpen = (ticket) => {
    setSelectedTicket(ticket);
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setSelectedTicket(null);
  };

  const handleCopyTaskData = (ticket) => {
    const ticketData = `
      SLID: ${ticket.slid}
      Request Number: ${ticket.requestNumber}
      Customer Name: ${ticket.customerName}
      Contact Number: ${ticket.contactNumber}
      PIS Date: ${ticket.pisDate ? new Date(ticket.pisDate).toLocaleDateString() : 'N/A'}
      Tariff Name: ${ticket.tarrifName}
      Customer Type: ${ticket.customerType}
      Interview Date: ${ticket.interviewDate ? new Date(ticket.interviewDate).toLocaleDateString() : 'N/A'}
      Governate: ${ticket.governorate}
      District: ${ticket.district}
      Team Name: ${ticket.teamName}
      Team Company: ${ticket.teamCompany}
      Evaluation Score: ${ticket.evaluationScore || 'N/A'}
      Customer Feedback: ${ticket.customerFeedback}
      Reason: ${ticket.reason}
    `;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(ticketData).then(() => {
        alert("Ticket data copied to clipboard!");
      }).catch(err => {
        console.error("Failed to copy ticket data:", err);
      });
    } else {
      alert("Your browser does not support sharing or copying to clipboard.");
    }
  };

  // Calculate statistics for the team
  const teamTotalTickets = teamTickets.length;
  const teamDetractors = teamTickets.filter(t => t.evaluationScore && t.evaluationScore <= 6).length;
  const teamPassives = teamTickets.filter(t => t.evaluationScore && (t.evaluationScore === 7 || t.evaluationScore === 8)).length;

  // Calculate statistics for all tickets
  const allTotalTickets = allTickets.length;
  const allDetractors = allTickets.filter(t => t.evaluationScore && t.evaluationScore <= 6).length;
  const allPassives = allTickets.filter(t => t.evaluationScore && (t.evaluationScore === 7 || t.evaluationScore === 8)).length;

  // Calculate relative percentages
  const teamTicketPercentage = allTotalTickets > 0 ? (teamTotalTickets / allTotalTickets * 100).toFixed(1) : 0;
  const teamDetractorPercentage = allDetractors > 0 ? (teamDetractors / allDetractors * 100).toFixed(1) : 0;
  const teamPassivePercentage = allPassives > 0 ? (teamPassives / allPassives * 100).toFixed(1) : 0;

  // Calculate distributions
  const priorityDistribution = teamTickets.reduce((acc, ticket) => {
    const priority = ticket.priority || 'Unspecified';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  const reasonDistribution = teamTickets.reduce((acc, ticket) => {
    const reason = ticket.reason || 'Unknown';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  const validationStatusDistribution = teamTickets.reduce((acc, ticket) => {
    const status = ticket.validationStatus || 'Not validated';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Prepare data for charts
  const priorityData = Object.keys(priorityDistribution).map(key => ({
    name: key,
    value: priorityDistribution[key],
    percentage: allTotalTickets > 0 ? (priorityDistribution[key] / allTickets.filter(t => t.priority === key).length * 100).toFixed(1) : 0
  }));

  const reasonData = Object.keys(reasonDistribution).map(key => ({
    name: key,
    value: reasonDistribution[key],
    percentage: allTotalTickets > 0 ? (reasonDistribution[key] / allTickets.filter(t => t.reason === key).length * 100).toFixed(1) : 0
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const npsData = [
    { name: 'Detractors (1-6)', value: teamDetractors, percentage: teamDetractorPercentage, color: colors.error },
    { name: 'Passives (7-8)', value: teamPassives, percentage: teamPassivePercentage, color: colors.warning },
  ];

  const validationStatusData = Object.keys(validationStatusDistribution).map(key => ({
    name: key,
    value: validationStatusDistribution[key],
    percentage: allTotalTickets > 0 ? (validationStatusDistribution[key] / allTickets.filter(t => t.validationStatus === key).length * 100).toFixed(1) : 0
  }));

  // Custom styles for MUI components
  const darkThemeStyles = {
    paper: {
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      border: `1px solid ${colors.border}`,
    },
    table: {
      backgroundColor: colors.tableBg,
    },
    tableHead: {
      backgroundColor: colors.tableHeaderBg,
    },
    tableCell: {
      color: colors.textPrimary,
      borderBottom: `1px solid ${colors.border}`,
    },
    tablePagination: {
      color: colors.textPrimary,
      "& .MuiSvgIcon-root": {
        color: colors.textPrimary,
      },
    },
    card: {
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      border: `1px solid ${colors.border}`,
    },
    chip: {
      borderColor: colors.border,
    },
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  const renderBarChart = (data, title) => {
    // Function to lighten/darken colors for hover effect
    const adjustColor = (color, amount = 20) => {
      return '#' + color.replace(/^#/, '').replace(/../g, color =>
        ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)
      );
    };

    return (
      <Box sx={{
        height: 300,
        mt: 2,
        position: 'relative'
      }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: colors.textPrimary,
            textAlign: 'center',
            fontWeight: 'bold',
            mb: 1,
            fontSize: '0.9rem'
          }}
        >
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart
            data={data}
            margin={{
              top: 10,
              right: 20,
              left: 0,
              bottom: 5,
            }}
            barSize={isMobile ? 20 : 30}
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: '8px',
              padding: '0 10px'
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.chartGrid}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              stroke={colors.textSecondary}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              tickMargin={10}
            />
            <YAxis
              stroke={colors.textSecondary}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              tickMargin={5}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.textPrimary,
                borderRadius: '8px',
                padding: '10px',
                fontSize: '12px'
              }}
              itemStyle={{
                padding: '2px 0',
                fontSize: '12px'
              }}
              formatter={(value, name, props) => [
                <span key="value" style={{ color: colors.primary }}>
                  {value} ({props.payload.percentage}% of total)
                </span>,
                name
              ]}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '10px',
                fontSize: '12px',
                color: colors.textPrimary
              }}
            />
            <Bar
              dataKey="value"
              fill={colors.primary}
              radius={[4, 4, 0, 0]}
              animationBegin={100}
              animationDuration={1500}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || colors.primary}
                  style={{
                    cursor: 'pointer',
                    transition: 'fill 0.2s ease',
                    width: '100%', // Ensure the cell width matches the bar width
                    height: '100%' // Ensure the cell height matches the bar height
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.fill = adjustColor(entry.color || colors.primary, 20);
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.fill = entry.color || colors.primary;
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  const renderPieChart = (data, title) => (
    <Box sx={{ height: 300, mt: 2 }}>
      <Typography variant="subtitle2" sx={{ color: colors.textSecondary, textAlign: 'center', fontSize: '14px' }}>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height="90%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            fill="#8884d8"
            dataKey="value"
            labelLine={false} // Disable label lines
            label={false} // Disable custom labels
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || colors.primary} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary,
              fontSize: '12px',
              padding: '5px'
            }}
            itemStyle={{ fontSize: '12px', color: colors.textPrimary }}
            formatter={(value, name, props) => [
              `${name}: ${value} (${props.payload.percent}% of total)`,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: colors.textPrimary }}
            iconSize={10}
            layout="vertical"
            align="right"
            verticalAlign="middle"
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </Box>
  );

  return (
    <Box sx={{
      backgroundColor: colors.background,
      color: colors.textPrimary,
      py: isMobile ? 1 : 2,
      mt: 2,
    }}>
      <Typography variant="h5" gutterBottom sx={{
        color: colors.primary,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <BugReport /> Ticket Statistics for {teamName}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, backgroundColor: colors.surfaceElevated, color: colors.textPrimary }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3
      }}>
        <Card sx={darkThemeStyles.card}>
          <CardContent>
            <Typography variant="h6" sx={{ color: colors.textSecondary }}>Total Tickets</Typography>
            <Typography variant="h4" sx={{ color: colors.primary }}>{teamTotalTickets}</Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              {teamTicketPercentage}% of all tickets
            </Typography>
          </CardContent>
        </Card>

        <Card sx={darkThemeStyles.card}>
          <CardContent>
            <Typography variant="h6" sx={{ color: colors.textSecondary }}>Detractors (1-6)</Typography>
            <Typography variant="h4" sx={{ color: colors.error }}>{teamDetractors}</Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              {teamTotalTickets > 0 ? `${((teamDetractors / teamTotalTickets) * 100).toFixed(1)}% of team` : 'No data'}
              <br />
              {teamDetractorPercentage}% of all detractors
            </Typography>
          </CardContent>
        </Card>

        <Card sx={darkThemeStyles.card}>
          <CardContent>
            <Typography variant="h6" sx={{ color: colors.textSecondary }}>Passives (7-8)</Typography>
            <Typography variant="h4" sx={{ color: colors.warning }}>{teamPassives}</Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              {teamTotalTickets > 0 ? `${((teamPassives / teamTotalTickets) * 100).toFixed(1)}% of team` : 'No data'}
              <br />
              {teamPassivePercentage}% of all passives
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Charts Section */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 3,
        mb: 3
      }}>
        {/* NPS Distribution */}
        <Paper sx={{ p: 2, ...darkThemeStyles.paper }}>
          {renderPieChart(npsData, 'Customer Satisfaction Distribution')}
        </Paper>

        {/* Priority Distribution */}
        <Paper sx={{ p: 2, ...darkThemeStyles.paper }}>
          {renderBarChart(priorityData, 'Impact Level Distribution')}
        </Paper>

        {/* Top Reasons */}
        <Paper sx={{ p: 2, ...darkThemeStyles.paper }}>
          {renderBarChart(reasonData, 'Top 5 Issue Reasons')}
        </Paper>

        {/* Status Distribution */}
        <Paper sx={{ p: 2, ...darkThemeStyles.paper }}>
          {renderPieChart(validationStatusData, 'Validation Status Distribution')}
        </Paper>
      </Box>

      {/* Recent Tickets Table */}
      <Typography variant="h6" sx={{
        color: colors.primary,
        mt: 3,
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <PriorityHigh /> All Registered Issues
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress sx={{ color: colors.primary }} />
        </Box>
      ) : teamTickets.length > 0 ? (
        <>
          <TableContainer component={Paper} sx={darkThemeStyles.paper}>
            <Table>
              <TableHead sx={darkThemeStyles.tableHead}>
                <TableRow>
                  <TableCell sx={darkThemeStyles.tableCell}>SLID</TableCell>
                  <TableCell sx={darkThemeStyles.tableCell}>Date</TableCell>
                  <TableCell sx={darkThemeStyles.tableCell}>Reason</TableCell>
                  <TableCell sx={darkThemeStyles.tableCell}>Priority</TableCell>
                  <TableCell sx={darkThemeStyles.tableCell}>Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teamTickets
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((ticket) => (
                    <TableRow key={ticket._id}
                      sx={{
                        "&:hover": {
                          backgroundColor: colors.tableRowHover
                        }
                      }}
                    >
                      <TableCell sx={darkThemeStyles.tableCell}>
                        <Button
                          onClick={() => handleClickOpen(ticket)}
                          sx={{
                            color: colors.primary,
                            textTransform: 'none',
                            '&:hover': {
                              backgroundColor: colors.primaryHover
                            }
                          }}
                        >
                          {ticket.slid}
                        </Button>
                      </TableCell>
                      <TableCell sx={darkThemeStyles.tableCell}>
                        {ticket.pisDate ? new Date(ticket.pisDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell sx={darkThemeStyles.tableCell}>{ticket.reason}</TableCell>
                      <TableCell sx={darkThemeStyles.tableCell}>
                        <Chip
                          label={ticket.priority}
                          color={getPriorityColor(ticket.priority)}
                          variant="outlined"
                          size="small"
                          sx={darkThemeStyles.chip}
                        />
                      </TableCell>
                      <TableCell sx={darkThemeStyles.tableCell}>
                        {ticket.evaluationScore || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={teamTickets.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{
              ...darkThemeStyles.tablePagination,
              color: colors.textPrimary,
              "& .MuiTablePagination-select": {
                color: colors.textPrimary
              },
              "& .MuiTablePagination-selectIcon": {
                color: colors.textPrimary
              }
            }}
            labelRowsPerPage={
              <Typography color={colors.textPrimary}>Rows per page:</Typography>
            }
          />
        </>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center', ...darkThemeStyles.paper }}>
          <Typography variant="body1" sx={{ color: colors.textSecondary }}>
            No tickets found for this team
          </Typography>
        </Paper>
      )}

      {/* Ticket Dialog */}
      <TicketDetailsDialogForPortalView
        open={openDialog}
        onClose={handleClose}
        ticket={selectedTicket}
        onCopy={handleCopyTaskData}
      />
    </Box>
  );
};

export default FieldTeamTicketsForPortalReview;
