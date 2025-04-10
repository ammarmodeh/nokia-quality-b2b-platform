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
  Divider
} from "@mui/material";
import {
  FaNewspaper,
  FaFrown,
  FaExclamationTriangle,
  FaSyncAlt,
  FaChevronDown,
  FaChevronUp
} from "react-icons/fa";
import TaskStatusDialog from "./TaskStatusDialog";
import api from "../api/api";
import { ReportedIssueCardDialog } from "./ReportedIssueCardDialog";

// Helper function to count statuses with comprehensive null checks
function countStatuses(tasks = [], customerIssues = []) {
  // Initialize all counters with default values
  const statusCount = {
    Closed: 0,
    "In Progress": 0,
    Todo: 0,
    Neutral: 0,
    Detractor: 0
  };

  const taskStatusCounts = {
    Closed: 0,
    "In Progress": 0,
    Todo: 0
  };

  const detractorStatusCounts = {
    Closed: 0,
    "In Progress": 0,
    Todo: 0
  };

  const neutralStatusCounts = {
    Closed: 0,
    "In Progress": 0,
    Todo: 0
  };

  // Initialize reported issues by source team
  const reportedIssuesBySource = {
    "Activation Team": { count: 0, percentage: 0 },
    "Nokia Quality Team": { count: 0, percentage: 0 },
    "Orange Quality Team": { count: 0, percentage: 0 },
    "Nokia Closure Team": { count: 0, percentage: 0 }
  };

  // Safely find tasks with matching SLIDs
  const reportedTasks = Array.isArray(tasks) && Array.isArray(customerIssues)
    ? tasks.filter(task =>
      customerIssues.some(issue => issue?.slid === task?.slid))
    : [];

  // Calculate total tasks for percentage calculation
  const totalTasks = tasks.length || 1; // Use 1 to avoid division by zero

  // Process customer issues by source team
  if (Array.isArray(customerIssues)) {
    customerIssues.forEach(issue => {
      const source = issue?.from || "Nokia Closure Team";
      if (source === 'Activation Team') {
        reportedIssuesBySource["Activation Team"].count++;
      } else if (source === 'Nokia Quality Team') {
        reportedIssuesBySource["Nokia Quality Team"].count++;
      } else if (source === 'Orange Quality Team') {
        reportedIssuesBySource["Orange Quality Team"].count++;
      } else {
        reportedIssuesBySource["Nokia Closure Team"].count++;
      }
    });

    // Calculate percentages
    Object.keys(reportedIssuesBySource).forEach(team => {
      reportedIssuesBySource[team].percentage = parseFloat(
        ((reportedIssuesBySource[team].count / totalTasks) * 100
        ).toFixed(2));
    });
  }

  // Process tasks if they exist
  if (Array.isArray(tasks)) {
    tasks.forEach((task) => {
      const subTasks = task.subTasks || [];
      const totalProgress = subTasks.reduce((sum, subTask) => sum + (subTask.progress || 0), 0);

      // Update status counts
      if (totalProgress === 100) {
        taskStatusCounts.Closed++;
      } else if (totalProgress === 0) {
        taskStatusCounts.Todo++;
      } else {
        taskStatusCounts["In Progress"]++;
      }

      // Update detractor/neutral counts
      const score = task.evaluationScore || 0;
      if (score >= 1 && score <= 6) {
        statusCount.Detractor++;
        if (totalProgress === 100) {
          detractorStatusCounts.Closed++;
        } else if (totalProgress === 0) {
          detractorStatusCounts.Todo++;
        } else {
          detractorStatusCounts["In Progress"]++;
        }
      } else if (score >= 7 && score <= 8) {
        statusCount.Neutral++;
        if (totalProgress === 100) {
          neutralStatusCounts.Closed++;
        } else if (totalProgress === 0) {
          neutralStatusCounts.Todo++;
        } else {
          neutralStatusCounts["In Progress"]++;
        }
      }
    });
  }

  return {
    statusCount,
    taskStatusCounts,
    detractorStatusCounts,
    neutralStatusCounts,
    reportedTasksCount: reportedTasks.length,
    reportedIssuesBySource
  };
}

const Card = ({ tasks = [], setUpdateTasksList }) => {
  const [customerIssues, setCustomerIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeamIssues, setSelectedTeamIssues] = useState([]);
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});

  // Destructure with default values
  const {
    statusCount = {},
    detractorStatusCounts = {},
    reportedIssuesBySource = {}
  } = countStatuses(tasks, customerIssues);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [dialogTitle, setDialogTitle] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch customer issues
  useEffect(() => {
    const fetchCustomerIssues = async () => {
      try {
        const response = await api.get('/customer-issues-notifications', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setCustomerIssues(response.data.data || []);
        setError(null);
      } catch (err) {
        // console.error('Error fetching customer issues:', err);
        setError('Failed to load customer issues');
        setCustomerIssues([]);
      } finally {
        setLoading(false);
        setLastUpdated(new Date());
      }
    };

    fetchCustomerIssues();
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
      // console.error('Error refreshing customer issues:', err);
      setError('Failed to refresh customer issues');
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  const toggleCardExpand = (cardId) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleClick = (cardLabel, status, team) => {
    let filteredTasks = [];

    if (cardLabel === "DETRACTORS") {
      filteredTasks = tasks.filter((task) => {
        const subTasks = task.subTasks || [];
        const totalProgress = subTasks.reduce((sum, subTask) => sum + (subTask.progress || 0), 0);
        const score = task.evaluationScore || 0;

        if (score >= 1 && score <= 6) {
          if (status === "Closed" && totalProgress === 100) return true;
          if (status === "Todo" && totalProgress === 0) return true;
          if (status === "In Progress" && totalProgress > 0 && totalProgress < 100) return true;
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
        return issue.from !== 'Activation Team' &&
          issue.from !== 'Nokia Quality Team' &&
          issue.from !== 'Orange Quality Team';
      }
      return issue.from === sourceTeam;
    });

    if (issuesForSource.length > 0) {
      setSelectedTeamIssues(issuesForSource);
      setSelectedTeamName(sourceTeam);
      setIssueDialogOpen(true);
    }
  };

  const formatTeamName = (team) => {
    if (!team) return "Nokia Closure Team";
    return team;
  };

  const stats = [
    {
      _id: "1",
      label: "TOTAL TASKS",
      total: tasks.length || 0,
      icon: <FaNewspaper />,
      color: "#3ea6ff",
      subStats: null,
    },
    {
      _id: "2",
      label: "DETRACTORS",
      total: statusCount.Detractor || 0,
      icon: <FaFrown />,
      color: "#F44336",
      subStats: {
        Todo: detractorStatusCounts.Todo || 0,
        Closed: detractorStatusCounts.Closed || 0,
        "In Progress": detractorStatusCounts["In Progress"] || 0,
      },
    },
    {
      _id: "4",
      label: "REPORTED ISSUES",
      total: customerIssues.length || 0,
      icon: <FaExclamationTriangle />,
      color: "#FF9800",
      subStats: reportedIssuesBySource,
      isTeamBased: true,
      isIssueCard: true
    }
  ];

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading statistics...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <IconButton onClick={handleRefresh}>
          <FaSyncAlt />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box sx={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: { xs: "0px", sm: "12px", md: "16px" },
      py: 2,
      backgroundColor: "#121212",
      position: "relative"
    }}>
      {/* Refresh Button */}
      <IconButton
        onClick={handleRefresh}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          color: "#aaa",
          "&:hover": {
            color: "#fff",
            backgroundColor: "rgba(255,255,255,0.1)"
          }
        }}
      >
        <FaSyncAlt />
      </IconButton>

      {/* Last Updated Timestamp */}
      <Typography
        variant="caption"
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          color: "#666",
          fontSize: "0.7rem"
        }}
      >
        Last updated: {lastUpdated.toLocaleTimeString()}
      </Typography>

      {/* Stats Cards */}
      {stats.map(({ _id, label, total, icon, color, subStats, isTeamBased, isIssueCard }) => (
        <MUICard
          key={_id}
          sx={{
            minWidth: 200,
            boxShadow: "none",
            overflow: "hidden",
            background: "#1e1e1e",
            transition: "all 0.3s ease",
            border: "1px solid #444",
            "&:hover": {
              borderColor: "#666",
            },
            mt: 4
          }}
        >
          <CardHeader
            sx={{
              p: 2,
              cursor: subStats ? "pointer" : "default",
              "&:hover": {
                backgroundColor: subStats ? "rgba(255,255,255,0.05)" : "transparent"
              }
            }}
            onClick={subStats ? () => toggleCardExpand(_id) : undefined}
            title={
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{
                  backgroundColor: `${color}20`,
                  borderRadius: "50%",
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40
                }}>
                  <Typography sx={{ color, fontSize: "1rem" }}>
                    {icon}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{
                    fontWeight: 500,
                    color: "#aaaaaa",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    textAlign: "left"
                  }}>
                    {label}
                  </Typography>
                  <Typography variant="h5" sx={{
                    fontWeight: 700,
                    color,
                    fontSize: "1.5rem"
                  }}>
                    {total}
                  </Typography>
                </Box>
              </Box>
            }
            action={
              subStats && (
                <IconButton>
                  {expandedCards[_id] ? <FaChevronUp color={color} /> : <FaChevronDown color={color} />}
                </IconButton>
              )
            }
          />

          {subStats && (
            <Collapse in={expandedCards[_id]} timeout="auto" unmountOnExit>
              <Divider sx={{ borderColor: "#444" }} />
              <CardContent sx={{
                p: 2,
                pt: 1,
                "&:last-child": {
                  pb: 2
                }
              }}>
                <Stack spacing={1.5} sx={{ width: "100%" }}>
                  {!isTeamBased ? (
                    <Box sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 1
                    }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#9e9e9e",
                          cursor: "pointer",
                          "&:hover": {
                            color: "#ffffff",
                            textDecoration: "underline"
                          }
                        }}
                        onClick={() => handleClick(label, "Todo")}
                      >
                        Todo: {subStats.Todo || 0}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#9e9e9e",
                          cursor: "pointer",
                          "&:hover": {
                            color: "#ffffff",
                            textDecoration: "underline"
                          }
                        }}
                        onClick={() => handleClick(label, "Closed")}
                      >
                        Closed: {subStats.Closed || 0}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#9e9e9e",
                          cursor: "pointer",
                          "&:hover": {
                            color: "#ffffff",
                            textDecoration: "underline"
                          }
                        }}
                        onClick={() => handleClick(label, "In Progress")}
                      >
                        In Prog: {subStats["In Progress"] || 0}
                      </Typography>
                    </Box>
                  ) : (
                    Object.entries(subStats).map(([team, { count, percentage }]) => (
                      <Box
                        key={team}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 1
                        }}
                      >
                        <Tooltip title={`Click to view ${isIssueCard ? 'issues' : 'tasks'} from ${team}`}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#9e9e9e",
                              cursor: "pointer",
                              "&:hover": {
                                color: "#ffffff",
                                textDecoration: "underline"
                              }
                            }}
                            onClick={() => isIssueCard ? handleIssueClick(team) : handleClick(label, null, team)}
                          >
                            {formatTeamName(team)}: {count || 0} ({percentage}%)
                          </Typography>
                        </Tooltip>
                      </Box>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Collapse>
          )}
        </MUICard>
      ))}

      {/* Task Status (Detractors Card) Dialog */}
      <TaskStatusDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        tasks={selectedTasks}
        title={dialogTitle}
        setUpdateTasksList={setUpdateTasksList}
      />

      {/* Customer Issue Dialog */}
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