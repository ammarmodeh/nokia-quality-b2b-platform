import { useState, useEffect } from "react";
import {
  Card as MUICard,
  CardContent,
  Typography,
  Box,
  Stack,
  Tooltip,
  IconButton,
  Collapse,
  CardHeader,
  Divider,
  Grid
} from "@mui/material";
import {
  FaNewspaper,
  FaFrown,
  FaExclamationTriangle,
  FaSyncAlt,
  FaChevronDown,
  FaChevronUp,
  FaMeh
} from "react-icons/fa";
import TaskStatusDialog from "./TaskStatusDialog";
import api from "../api/api";
import { ReportedIssueCardDialog } from "./ReportedIssueCardDialog";

// Helper function to count statuses with comprehensive null checks
function countStatuses(tasks = [], customerIssues = [], teamOptions = []) {
  const statusCount = { Closed: 0, "In Progress": 0, Todo: 0, Neutral: 0, Detractor: 0 };
  const taskStatusCounts = { Closed: 0, "In Progress": 0, Todo: 0 };
  const detractorStatusCounts = { Closed: 0, "In Progress": 0, Todo: 0 };
  const neutralStatusCounts = { Closed: 0, "In Progress": 0, Todo: 0 };

  const reportedIssuesBySource = {};

  // Initialize with dynamic teams if available, otherwise fallback
  if (teamOptions.length > 0) {
    teamOptions.forEach(team => {
      reportedIssuesBySource[team] = { count: 0, percentage: 0 };
    });
    // Add Other/Unknown category
    reportedIssuesBySource["Others"] = { count: 0, percentage: 0 };
  } else {
    // Fallback for initial load or error
    reportedIssuesBySource["Activation Team"] = { count: 0, percentage: 0 };
    reportedIssuesBySource["Nokia Quality Team"] = { count: 0, percentage: 0 };
    reportedIssuesBySource["Orange Quality Team"] = { count: 0, percentage: 0 };
    reportedIssuesBySource["Nokia Closure Team"] = { count: 0, percentage: 0 };
  }

  const reportedTasks = Array.isArray(tasks) && Array.isArray(customerIssues)
    ? tasks.filter(task => customerIssues.some(issue => issue?.slid === task?.slid))
    : [];

  const totalTasks = tasks.length || 1;

  const reportedIssuesStats = {
    resolved: 0,
    remaining: 0,
    total: 0
  };

  if (Array.isArray(customerIssues)) {
    reportedIssuesStats.total = customerIssues.length;
    customerIssues.forEach(issue => {
      if (issue.solved === 'yes') {
        reportedIssuesStats.resolved++;
      } else {
        reportedIssuesStats.remaining++;
      }

      const source = issue?.from;
      if (source && reportedIssuesBySource[source]) {
        reportedIssuesBySource[source].count++;
      } else {
        // Count as 'Others' or fallback if not found in list
        if (reportedIssuesBySource["Others"]) {
          reportedIssuesBySource["Others"].count++;
        } else if (reportedIssuesBySource["Nokia Closure Team"]) {
          // Fallback legacy behavior if using static list
          const legacyTeams = ["Activation Team", "Nokia Quality Team", "Orange Quality Team"];
          if (!legacyTeams.includes(source)) {
            reportedIssuesBySource["Nokia Closure Team"].count++;
          }
        }
      }
    });

    Object.keys(reportedIssuesBySource).forEach(team => {
      reportedIssuesBySource[team].percentage = parseFloat(((reportedIssuesBySource[team].count / totalTasks) * 100).toFixed(2));
    });
  }

  if (Array.isArray(tasks)) {
    tasks.forEach((task) => {
      if (task.status === "Closed") {
        taskStatusCounts.Closed++;
      } else if (task.status === "Todo") {
        taskStatusCounts.Todo++;
      } else {
        taskStatusCounts["In Progress"]++;
      }

      const score = task.evaluationScore || 0;
      if (score >= 1 && score <= 6) {
        statusCount.Detractor++;
        if (task.status === "Closed") detractorStatusCounts.Closed++;
        else if (task.status === "Todo") detractorStatusCounts.Todo++;
        else detractorStatusCounts["In Progress"]++;
      } else if (score >= 7 && score <= 8) {
        statusCount.Neutral++;
        if (task.status === "Closed") neutralStatusCounts.Closed++;
        else if (task.status === "Todo") neutralStatusCounts.Todo++;
        else neutralStatusCounts["In Progress"]++;
      }
    });
  }

  return { statusCount, taskStatusCounts, detractorStatusCounts, neutralStatusCounts, reportedTasksCount: reportedTasks.length, reportedIssuesStats, reportedIssuesBySource };
}

const Card = ({ tasks = [], setUpdateTasksList }) => {
  const [customerIssues, setCustomerIssues] = useState([]);
  const [teamOptions, setTeamOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeamIssues, setSelectedTeamIssues] = useState([]);
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});

  const { statusCount = {}, detractorStatusCounts = {}, neutralStatusCounts = {}, reportedIssuesStats = {}, reportedIssuesBySource = {} } = countStatuses(tasks, customerIssues, teamOptions);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [dialogTitle, setDialogTitle] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const fetchCustomerIssues = async () => {
      try {
        const [issuesResponse, optionsResponse] = await Promise.all([
          api.get('/customer-issues-notifications', {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
            params: { limit: 1000 }
          }),
          api.get('/dropdown-options/all')
        ]);

        setCustomerIssues(issuesResponse.data.data || []);

        // Extract teams from dropdown options
        if (optionsResponse.data && optionsResponse.data.ISSUE_FROM_TEAMS) {
          const teamOptions = optionsResponse.data.ISSUE_FROM_TEAMS
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(opt => opt.value);

          setTeamOptions(teamOptions);
        }

        setError(null);
      } catch (err) {
        setError('Failed to load data');
        setCustomerIssues([]);
      } finally {
        setLoading(false);
        setLastUpdated(new Date());
      }
    };
    fetchCustomerIssues();

    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await api.get('/customer-issues-notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setCustomerIssues(response.data.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to refresh customer issues');
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  const toggleCardExpand = (cardId) => {
    setExpandedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const handleClick = (cardLabel, status, team) => {
    let filteredTasks = [];
    if (cardLabel === "DETRACTORS") {
      filteredTasks = tasks.filter((task) => {
        const score = task.evaluationScore || 0;
        if (score >= 1 && score <= 6) {
          if (status === task.status) return true;
          if (!status) return true; // if no status specified, return all detractors
        }
        return false;
      });
    } else if (cardLabel === "NEUTRALS") {
      filteredTasks = tasks.filter((task) => {
        const score = task.evaluationScore || 0;
        if (score >= 7 && score <= 8) {
          if (status === task.status) return true;
          if (!status) return true;
        }
        return false;
      });
    }
    setSelectedTasks(filteredTasks);
    setDialogTitle(`${cardLabel}${team ? ` - ${team}` : ''}${status ? ` - ${status}` : ''} (${filteredTasks.length})`);
    setDialogOpen(true);
  };

  const handleIssueClick = (sourceTeam) => {
    const issuesForSource = customerIssues.filter(issue => {
      if (sourceTeam === 'Nokia Closure Team') {
        return issue.from !== 'Activation Team' && issue.from !== 'Nokia Quality Team' && issue.from !== 'Orange Quality Team';
      }
      return issue.from === sourceTeam;
    });

    if (issuesForSource.length > 0) {
      setSelectedTeamIssues(issuesForSource);
      setSelectedTeamName(sourceTeam);
      setIssueDialogOpen(true);
    }
  };

  const formatTeamName = (team) => (!team ? "Nokia Closure Team" : team);

  const stats = [
    {
      _id: "1",
      label: "TOTAL TASKS",
      total: tasks.length || 0,
      icon: <FaNewspaper />,
      color: "#2563eb", // Blue
      subStats: null,
    },
    {
      _id: "2",
      label: "DETRACTORS",
      total: statusCount.Detractor || 0,
      icon: <FaFrown />,
      color: "#ef4444", // Red
      subStats: {
        Todo: detractorStatusCounts.Todo || 0,
        Closed: detractorStatusCounts.Closed || 0,
        "In Progress": detractorStatusCounts["In Progress"] || 0,
      },
    },
    {
      _id: "3",
      label: "NEUTRALS",
      total: statusCount.Neutral || 0,
      icon: <FaMeh />,
      color: "#f59e0b", // Amber/Orange for Neutrals
      subStats: {
        Todo: neutralStatusCounts.Todo || 0,
        Closed: neutralStatusCounts.Closed || 0,
        "In Progress": neutralStatusCounts["In Progress"] || 0,
      },
    },
    {
      _id: "4",
      label: "REPORTED ISSUES",
      total: customerIssues.length || 0,
      icon: <FaExclamationTriangle />,
      color: "#f59e0b", // Orange
      subStats: {
        Resolved: reportedIssuesStats.resolved || 0,
        Remaining: reportedIssuesStats.remaining || 0,
        Total: reportedIssuesStats.total || customerIssues.length || 0
      },
      isTeamBased: false, // Changed to false to use the numbers layout
      isIssueCard: true
    }
  ];

  if (loading) return <Box sx={{ p: 3, textAlign: 'center' }}><Typography>Loading statistics...</Typography></Box>;
  if (error) return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography color="error">{error}</Typography>
      <IconButton onClick={handleRefresh}><FaSyncAlt /></IconButton>
    </Box>
  );

  return (
    <Box sx={{ position: "relative" }}>
      <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} mb={2}>
        <Typography variant="caption" color="textSecondary">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Typography>
        <Tooltip title="Refresh Stats">
          <IconButton onClick={handleRefresh} size="small" sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#f1f5f9' }, boxShadow: 1 }}>
            <FaSyncAlt size={14} color="#64748b" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Grid container spacing={3}>
        {stats.map(({ _id, label, total, icon, color, subStats, isTeamBased, isIssueCard }) => (
          <Grid item xs={12} sm={6} md={3} key={_id}>
            <MUICard
              sx={{
                height: '100%',
                borderRadius: 3,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                overflow: 'visible',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary" fontWeight="600" gutterBottom>
                      {label}
                    </Typography>
                    <Typography variant="h3" fontWeight="800" color="textPrimary">
                      {total}
                    </Typography>
                  </Box>
                  <Box sx={{
                    bgcolor: `${color}15`,
                    color: color,
                    p: 1.5,
                    borderRadius: 2,
                    display: 'flex',
                    fontSize: '1.5rem'
                  }}>
                    {icon}
                  </Box>
                </Box>

                {subStats && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={1}>
                      {isTeamBased ? (
                        Object.entries(subStats).map(([team, { count, percentage }]) => (
                          <Box key={team} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500 }}>
                              {formatTeamName(team)}
                            </Typography>
                            <Tooltip title={isIssueCard ? "View Issues" : "View Tasks"}>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 'bold', color: color, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                onClick={() => isIssueCard ? handleIssueClick(team) : handleClick(label, null, team)}
                              >
                                {count} ({percentage}%)
                              </Typography>
                            </Tooltip>
                          </Box>
                        ))
                      ) : (
                        // Custom Layout for Issue Card vs others
                        isIssueCard ? (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Stack alignItems="center">
                              <Typography variant="caption" color="textSecondary">Registered</Typography>
                              <Typography variant="h6" color="textPrimary">
                                {subStats.Total}
                              </Typography>
                            </Stack>

                            <Stack alignItems="center">
                              <Typography variant="caption" color="textSecondary">Resolved</Typography>
                              <Typography variant="h6" color="#10b981" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                                {subStats.Resolved}
                              </Typography>
                            </Stack>

                            <Stack alignItems="center">
                              <Typography variant="caption" color="textSecondary">Remain</Typography>
                              <Typography variant="h6" color="#ef4444" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                                {subStats.Remaining}
                              </Typography>
                            </Stack>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Stack alignItems="center">
                              <Typography variant="caption" color="textSecondary">Todo</Typography>
                              <Typography variant="h6" color="textPrimary" sx={{ cursor: 'pointer', '&:hover': { color: color } }} onClick={() => handleClick(label, "Todo")}>
                                {subStats.Todo}
                              </Typography>
                            </Stack>

                            <Stack alignItems="center">
                              <Typography variant="caption" color="textSecondary">In Progress</Typography>
                              <Typography variant="h6" color="#3b82f6" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => handleClick(label, "In Progress")}>
                                {subStats["In Progress"]}
                              </Typography>
                            </Stack>

                            <Stack alignItems="center">
                              <Typography variant="caption" color="textSecondary">Closed</Typography>
                              <Typography variant="h6" color="#10b981" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => handleClick(label, "Closed")}>
                                {subStats.Closed}
                              </Typography>
                            </Stack>
                          </Box>
                        )
                      )}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </MUICard>
          </Grid>
        ))}
      </Grid>

      <TaskStatusDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        tasks={selectedTasks}
        title={dialogTitle}
        setUpdateTasksList={setUpdateTasksList}
      />

      <ReportedIssueCardDialog
        open={issueDialogOpen}
        onClose={() => setIssueDialogOpen(false)}
        teamIssues={selectedTeamIssues}
        teamName={selectedTeamName}
      />
    </Box>
  );
};

export default Card;