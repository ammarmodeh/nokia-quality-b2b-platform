import { useMemo, useState, useEffect } from "react";
import {
  DataGrid,
  GridToolbar
} from "@mui/x-data-grid";
import {
  Paper,
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Stack,
  useMediaQuery
} from "@mui/material";
import {
  MdAdd,
  MdHistory,
  MdReport
} from "react-icons/md";
import { newFormatDate } from "../utils/helpers";
import TeamStatusBadge from "./ViolationTeamStatusBadge";
import ViolationThresholdBadge from "./ViolationThresholdBadge";
import api from "../api/api"; // Import your API instance



const ViolationDataGrid = ({
  rows,
  user,
  paginationModel,
  onPaginationModelChange,
  onTeamNameClick,
  onAddSessionClick,
  onViewSessionsClick,
  onReportAbsenceClick,
}) => {
  const isMobile = useMediaQuery('(max-width:503px)');
  const [evaluationData, setEvaluationData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch evaluation data
  useEffect(() => {
    const fetchEvaluationData = async () => {
      setLoading(true);
      try {
        const response = await api.get('/quiz-results/teams/evaluation', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (response.status === 200) {
          setEvaluationData(response.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching evaluation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluationData();
  }, []);

  // Function to get theoretical Online Test Score for a team
  const getTheoreticalSatisfactionScore = (teamName) => {
    const teamEvaluation = evaluationData.find(team =>
      team.teamName === teamName || team.teamId === teamName
    );

    if (teamEvaluation && teamEvaluation.history && teamEvaluation.history.length > 0) {
      // Get the latest Online Test Score
      const latestEvaluation = teamEvaluation.history[0];
      return latestEvaluation.percentage || 'N/A';
    }

    return 'N/A';
  };

  // Enhance rows with theoretical Online Test Score
  const enhancedRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];

    return rows.map(row => ({
      ...row,
      evaluationScore: getTheoreticalSatisfactionScore(row.teamName)
    }));
  }, [rows, evaluationData]);

  const columns = useMemo(() => [
    {
      field: "teamName",
      headerName: "Team Name",
      width: 200,
      renderCell: (params) => (
        <Button
          onClick={() => onTeamNameClick(params.value)}
          sx={{
            color: '#7b68ee',
            textTransform: 'none',
            '&:hover': { backgroundColor: 'rgba(62, 166, 255, 0.1)' }
          }}
        >
          {params.value}
        </Button>
      ),
    },
    {
      field: "teamCompany",
      headerName: "Group",
      width: 100,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "detractorCount",
      headerName: "Detractors",
      width: 100,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? '#f44336' : '#6b7280' }}>
          {params.value}
        </Box>
      )
    },
    {
      field: "neutralCount",
      headerName: "Neutrals",
      width: 100,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? '#ff9800' : '#6b7280' }}>
          {params.value}
        </Box>
      )
    },
    // {
    //   field: "detractorRate",
    //   headerName: "Detractor %",
    //   width: 120,
    //   renderCell: (params) => {
    //     const val = parseFloat(params.value);
    //     const isHigh = val > 9;
    //     return (
    //       <Box sx={{
    //         color: isHigh ? '#f44336' : '#4caf50',
    //         fontWeight: 'bold',
    //         border: isHigh ? '1px solid #f44336' : '1px solid transparent',
    //         borderRadius: '4px',
    //         padding: '2px 6px',
    //         backgroundColor: isHigh ? 'rgba(244, 67, 54, 0.1)' : 'transparent'
    //       }}>
    //         {params.value}%
    //       </Box>
    //     );
    //   },
    // },
    // {
    //   field: "neutralRate",
    //   headerName: "Neutral %",
    //   width: 120,
    //   renderCell: (params) => (
    //     <Box sx={{ color: '#fff', fontWeight: '500' }}>
    //       {params.value}%
    //     </Box>
    //   ),
    // },
    {
      field: "detractorExcess",
      headerName: "Detr. Excess",
      width: 100,
      renderCell: (params) => {
        const val = params.value || 0;
        return (
          <Box sx={{
            color: val > 0 ? '#f44336' : '#cbd5e1',
            fontWeight: val > 0 ? 'bold' : 'normal'
          }}>
            {val > 0 ? `+${val}` : '--'}
          </Box>
        );
      }
    },
    {
      field: "neutralExcess",
      headerName: "Neu. Excess",
      width: 100,
      renderCell: (params) => {
        const val = params.value || 0;
        return (
          <Box sx={{
            color: val > 0 ? '#ff9800' : '#cbd5e1',
            fontWeight: val > 0 ? 'bold' : 'normal'
          }}>
            {val > 0 ? `+${val}` : '--'}
          </Box>
        );
      }
    },
    {
      field: "detractorStatus", // Virtual field for display
      headerName: "Det. Status",
      width: 110,
      renderCell: (params) => {
        const isViolated = params.row.violatesDetractorThreshold;
        if (isViolated) {
          return (
            <Box sx={{
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              color: '#d32f2f',
              padding: '4px 8px',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '0.75rem',
            }}>
              ⚠️ FAIL
            </Box>
          );
        }
        return (
          <Box sx={{
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            color: '#1b5e20',
            padding: '4px 8px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '0.75rem'
          }}>
            ✓ OK
          </Box>
        );
      },
    },
    {
      field: "neutralStatus", // Virtual field for display
      headerName: "Neu. Status",
      width: 110,
      renderCell: (params) => {
        const isViolated = params.row.violatesNeutralThreshold;
        if (isViolated) {
          return (
            <Box sx={{
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              color: '#ed6c02',
              padding: '4px 8px',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '0.75rem',
            }}>
              ⚠️ FAIL
            </Box>
          );
        }
        return (
          <Box sx={{
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            color: '#1b5e20',
            padding: '4px 8px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '0.75rem'
          }}>
            ✓ OK
          </Box>
        );
      },
    },
    {
      field: "totalViolations",
      headerName: "Total Violations",
      width: 120,
      renderCell: (params) => (
        <Box sx={{
          fontWeight: 'bold',
          color: params.value > 0 ? '#d32f2f' : '#64748b',
          backgroundColor: '#86202039',
          padding: '4px 8px',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          {params.value}
        </Box>
      )
    },
    {
      field: "lowPriorityCount",
      headerName: "Low Impact",
      width: 100,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? '#2e7d32' : '#cbd5e1' }}>
          {params.value}
        </Box>
      )
    },
    {
      field: "mediumPriorityCount",
      headerName: "Medium Impact",
      width: 120,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? '#ed6c02' : '#cbd5e1' }}>
          {params.value}
        </Box>
      )
    },
    {
      field: "highPriorityCount",
      headerName: "High Impact",
      width: 100,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? '#d32f2f' : '#cbd5e1' }}>
          {params.value}
        </Box>
      )
    },
    {
      field: "dateReachedLimit",
      headerName: "Limit Date",
      width: 120,
      renderCell: (params) => (
        <Box sx={{
          color: params.value ? '#d32f2f' : '#cbd5e1',
          fontWeight: params.value ? 'bold' : 'normal'
        }}>
          {params.value ? newFormatDate(params.value) : '--'}
        </Box>
      )
    },
    {
      field: "thresholdDescription",
      headerName: "How Reached",
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'left', px: 1, overflowX: 'auto', color: '#cbd5e1' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "consequenceApplied",
      headerName: "Consequence",
      width: 200,
      renderCell: (params) => (
        <Box sx={{
          color: params.value?.includes('suspension') ? '#d32f2f' :
            params.value?.includes('warning') ? '#ed6c02' : '#2e7d32',
          fontWeight: 'bold',
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'left', px: 1, overflowX: 'auto'
        }}>
          <Typography sx={{ fontSize: '0.8rem', }}>
            {params.value || '--'}
          </Typography>
        </Box>
      )
    },
    {
      field: "advice",
      headerName: "Recovery Advice",
      width: 250,
      renderCell: (params) => (
        <Typography variant="body2" sx={{
          fontSize: '0.75rem',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          px: 1,
          fontStyle: params.value === 'On Track' ? 'italic' : 'normal',
          color: params.value === 'On Track' ? '#64748b' : '#cbd5e1'
        }}>
          {params.value || 'On Track'}
        </Typography>
      )
    },
    {
      field: "notes",
      headerName: "Notes",
      width: 250,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'left', px: 1, overflowX: 'auto', color: '#cbd5e1' }}>
          {params.value}
        </Typography>
      )
    },
    // {
    //   field: "violationStatus",
    //   headerName: "Violation Threshold",
    //   width: 120,
    //   renderCell: (params) => (
    //     <ViolationThresholdBadge count={params.row.equivalentDetractorCount} />
    //   )
    // },
    {
      field: "validationStatus",
      headerName: "Team Status",
      width: 120,
      renderCell: (params) => <TeamStatusBadge status={params.value} />
    },
    {
      field: "evaluationScore",
      headerName: "Online Test Score",
      width: 100,
      renderCell: (params) => (
        <Box sx={{
          fontWeight: 'bold',
          color: params.value === 'N/A' ? '#64748b' :
            params.value >= 90 ? '#1b5e20' :
              params.value >= 75 ? '#2e7d32' :
                params.value >= 55 ? '#ed6c02' : '#d32f2f'
        }}>
          {params.value !== 'N/A' ? `${params.value}%` : params.value}
        </Box>
      )
    },
    {
      field: "otjAssessmentResult",
      headerName: "OTJ Assessment Score",
      width: 120,
      renderCell: (params) => (
        <Box sx={{
          fontWeight: 'bold',
          color: params.value === 'N/A' ? '#64748b' :
            params.value >= 90 ? '#1b5e20' :
              params.value >= 75 ? '#2e7d32' :
                params.value >= 55 ? '#ed6c02' : '#d32f2f'
        }}>
          {params.value !== 'N/A' ? `${params.value}%` : params.value}
        </Box>
      )
    },
    {
      field: "otjAssessmentDate",
      headerName: "OTJ Assessment Date",
      width: 120,
      renderCell: (params) => (
        <Box sx={{
          color: params.value === 'N/A' ? '#64748b' : '#cbd5e1',
          fontStyle: params.value === 'N/A' ? 'italic' : 'normal'
        }}>
          {params.value}
        </Box>
      )
    },
    {
      field: "otjAssessmentFeedback",
      headerName: "OTJ Feedback Summary",
      width: 200,
      renderCell: (params) => (
        <Tooltip title={params.value}
          componentsProps={{
            tooltip: {
              sx: {
                direction: 'rtl',
                textAlign: 'right',
                maxWidth: 500,
              }
            }
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: params.value === 'N/A' ? '#64748b' : '#cbd5e1',
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'right', px: 1, textAlign: 'right'
            }}
          >
            {params.value}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: "otjAssessmentConductedBy",
      headerName: "Conducted By",
      width: 200,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: params.value === 'N/A' ? '#64748b' : '#cbd5e1',
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'left', px: 1,
            }}
          >
            {params.value}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: "hasTraining",
      headerName: "Trained",
      width: 100,
      renderCell: (params) => (
        <Box>{params.value ? 'Yes' : 'No'}</Box>
      )
    },
    {
      field: "mostRecentCompletedSession",
      headerName: "Last Completed",
      width: 140,
      renderCell: (params) => (
        <Box sx={{
          fontStyle: params.value === "No completed sessions" ? "italic" : "normal",
          color: params.value === "No completed sessions" ? '#6b7280' : '#4caf50',
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'left', px: 1, overflowX: 'auto'
        }}>
          <Typography sx={{ fontSize: '0.8rem', }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "mostRecentMissedCanceledSession",
      headerName: "Last Missed/Canceled",
      width: 160,
      renderCell: (params) => (
        <Box sx={{
          fontStyle: params.value === "No missed/canceled sessions" ? "italic" : "normal",
          color: params.value === "No missed/canceled sessions" ? '#6b7280' :
            params.value.includes("Missed") ? '#f44336' : '#ff9800',
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'left', px: 1, overflowX: 'auto'
        }}>
          <Typography sx={{ fontSize: '0.8rem', }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 250,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Add Session">
            <IconButton
              disabled={user.role !== "Admin"}
              onClick={() => onAddSessionClick(params.row.teamName, params.row.id)}
              sx={{
                color: '#4caf50',
                '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
                '&.Mui-disabled': { color: '#666' }
              }}
            >
              <MdAdd />
            </IconButton>
          </Tooltip>

          <Tooltip title="Report Absence">
            <IconButton
              disabled={user.role !== "Admin"}
              onClick={() => onReportAbsenceClick(params.row.teamName, params.row.id)}
              sx={{
                color: '#f44336',
                '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
                '&.Mui-disabled': { color: '#666' }
              }}
            >
              <MdReport />
            </IconButton>
          </Tooltip>

          <Tooltip title="View Sessions">
            <IconButton
              onClick={() => onViewSessionsClick(params.row.id)}
              sx={{
                color: '#2196f3',
                '&:hover': { backgroundColor: 'rgba(33, 150, 243, 0.1)' }
              }}
            >
              <MdHistory />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [user.role, onTeamNameClick, onAddSessionClick, onViewSessionsClick, onReportAbsenceClick]);

  // Calculate statistics
  const calculateStats = () => {
    if (!enhancedRows || enhancedRows.length === 0) return {};

    const totalTeams = enhancedRows.length;
    const trainedTeams = enhancedRows.filter(row => row.hasTraining).length;
    const nonTrainedTeams = totalTeams - trainedTeams;

    const violatedTeams = enhancedRows.filter(row => row.equivalentDetractorCount >= 3).length;
    const warningTeams = enhancedRows.filter(row => row.equivalentDetractorCount === 2).length;
    const okTeams = enhancedRows.filter(row => row.equivalentDetractorCount <= 1).length;

    // Calculate average theoretical Online Test Score
    const teamsWithScore = enhancedRows.filter(row => row.evaluationScore !== 'N/A');
    const avgSatisfactionScore = teamsWithScore.length > 0
      ? Math.round(teamsWithScore.reduce((sum, row) => sum + parseInt(row.evaluationScore), 0) / teamsWithScore.length)
      : 'N/A';

    return {
      totalTeams,
      trainedTeams,
      nonTrainedTeams,
      trainedPercent: totalTeams > 0 ? Math.round((trainedTeams / totalTeams) * 100) : 0,
      nonTrainedPercent: totalTeams > 0 ? Math.round((nonTrainedTeams / totalTeams) * 100) : 0,
      violatedTeams,
      warningTeams,
      okTeams,
      violatedPercent: totalTeams > 0 ? Math.round((violatedTeams / totalTeams) * 100) : 0,
      warningPercent: totalTeams > 0 ? Math.round((warningTeams / totalTeams) * 100) : 0,
      okPercent: totalTeams > 0 ? Math.round((okTeams / totalTeams) * 100) : 0,
      avgSatisfactionScore
    };
  };

  const stats = calculateStats();

  return (
    <Box sx={{ width: "100%" }}>
      <Paper sx={{
        height: 400,
        width: "100%",
        // backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        overflow: "hidden",
        mb: 2
      }}>
        <DataGrid
          rows={enhancedRows}
          columns={columns}
          getRowId={(row) => row.teamId || row.id}
          pageSizeOptions={[5, 10, 25]}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          disableSelectionOnClick
          slots={{ toolbar: GridToolbar }}
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
                // backgroundColor: "#f8fafc",
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
              // backgroundColor: "#ffffff",
              gap: 2,
              "& .MuiButton-root": {
                color: "#64748b",
                fontSize: "0.80rem",
              }
            }
          }}
        />
      </Paper>

      {/* Statistics Section */}
      <Box sx={{ display: 'flex', gap: 3, mb: 2, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* Training Status */}
        {/* <Box sx={{ backgroundColor: '#191919', borderRadius: '4px', p: 1, width: '100%' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#5b5b5b', fontSize: '0.7rem', fontWeight: 600 }}>
            Training Status
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip
              label={`${stats.totalTeams} Total Teams`}
              size="small"
              sx={{
                backgroundColor: 'rgba(66, 165, 245, 0.1)',
                color: '#42a5f5',
                fontSize: '0.75rem'
              }}
            />
            <Chip
              label={`${stats.trainedTeams} Trained (${stats.trainedPercent}%)`}
              size="small"
              sx={{
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                color: '#4caf50',
                fontSize: '0.75rem'
              }}
            />
            <Chip
              label={`${stats.nonTrainedTeams} Not Trained (${stats.nonTrainedPercent}%)`}
              size="small"
              sx={{
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                color: '#f44336',
                fontSize: '0.75rem'
              }}
            />
          </Stack>
        </Box> */}

        {/* Violation Threshold */}
        {/* <Box sx={{ backgroundColor: '#191919', borderRadius: '4px', p: 1, width: '100%' }}>
          <Typography variant="subtitle2" sx={{ color: '#5b5b5b', fontSize: '0.7rem', fontWeight: 600, mb: 1 }}>
            Violation Threshold
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip
              label={`${stats.violatedTeams} Violated (${stats.violatedPercent}%)`}
              size="small"
              sx={{
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                color: '#f44336',
                fontSize: '0.75rem'
              }}
            />
            <Chip
              label={`${stats.warningTeams} Warning (${stats.warningPercent}%)`}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                color: '#ff9800',
                fontSize: '0.75rem'
              }}
            />
            <Chip
              label={`${stats.okTeams} OK (${stats.okPercent}%)`}
              size="small"
              sx={{
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                color: '#4caf50',
                fontSize: '0.75rem'
              }}
            />
          </Stack>
        </Box> */}

        {/* Overall Team Score */}
        {/* <Box sx={{ backgroundColor: '#191919', borderRadius: '4px', p: 1, width: '100%' }}>
          <Typography variant="subtitle2" sx={{ color: '#5b5b5b', fontSize: '0.7rem', fontWeight: 600, mb: 1 }}>
            Overall Team Score
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip
              label={`Avg: ${stats.avgSatisfactionScore}${stats.avgSatisfactionScore !== 'N/A' ? '%' : ''}`}
              size="small"
              sx={{
                backgroundColor: stats.avgSatisfactionScore === 'N/A' ? 'rgba(170, 170, 170, 0.1)' :
                  stats.avgSatisfactionScore >= 90 ? 'rgba(4, 151, 10, 0.1)' :
                    stats.avgSatisfactionScore >= 75 ? 'rgba(76, 175, 80, 0.1)' :
                      stats.avgSatisfactionScore >= 55 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                color: stats.avgSatisfactionScore === 'N/A' ? '#6b7280' :
                  stats.avgSatisfactionScore >= 90 ? '#04970a' :
                    stats.avgSatisfactionScore >= 75 ? '#4CAF50' :
                      stats.avgSatisfactionScore >= 55 ? '#FFC107' : '#f44336',
                fontSize: '0.75rem'
              }}
            />
          </Stack>
        </Box> */}
      </Box>
    </Box>
  );
};

export default ViolationDataGrid;