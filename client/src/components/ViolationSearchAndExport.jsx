import {
  TextField,
  IconButton,
  Tooltip,
  Stack,
  Typography,
  InputAdornment,
  Chip
} from "@mui/material";
import { RiFileExcel2Fill } from "react-icons/ri";
import { MdInfo, MdSearch } from "react-icons/md";
import { useMediaQuery } from "@mui/material";

const SearchAndExport = ({
  searchText,
  setSearchText,
  exportToExcel,
  onViolationInfoClick,
  tasks = [],
  fieldTeams = []
}) => {
  const isMobile = useMediaQuery('(max-width:503px)');

  // Calculate violation statistics based on tasks' evaluationScore
  const calculateViolationStats = () => {
    if (!tasks || tasks.length === 0 || !fieldTeams || fieldTeams.length === 0) return {};

    // Group tasks by teamName and calculate scores
    const teamStats = {};
    const allTeamNames = new Set(fieldTeams.map(team => team.teamName));

    // Initialize all teams with no violations
    Array.from(allTeamNames).forEach(teamName => {
      teamStats[teamName] = {
        detractorCount: 0,
        neutralCount: 0,
        highPriorityCount: 0,
        mediumPriorityCount: 0,
        lowPriorityCount: 0,
        hasEvaluation: false
      };
    });

    // Process tasks to count evaluations and priorities
    tasks.forEach(task => {
      const teamName = task.teamName;
      if (teamName && teamStats[teamName]) {
        if (task.evaluationScore) {
          teamStats[teamName].hasEvaluation = true;
          if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
            teamStats[teamName].detractorCount++;
          } else if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
            teamStats[teamName].neutralCount++;
          }
        }

        // Count priority levels
        if (task.priority === 'High') {
          teamStats[teamName].highPriorityCount++;
        } else if (task.priority === 'Medium') {
          teamStats[teamName].mediumPriorityCount++;
        } else if (task.priority === 'Low') {
          teamStats[teamName].lowPriorityCount++;
        }
      }
    });

    const totalTeams = allTeamNames.size;
    const evaluatedTeams = Object.values(teamStats).filter(team => team.hasEvaluation).length;

    const teamsWithDetractors = Object.values(teamStats).filter(team =>
      team.detractorCount > 0
    ).length;

    const teamsWithOnlyNeutrals = Object.values(teamStats).filter(team =>
      team.detractorCount === 0 && team.neutralCount > 0
    ).length;

    const teamsWithNoViolations = Object.values(teamStats).filter(team =>
      team.detractorCount === 0 && team.neutralCount === 0
    ).length;

    // Calculate total priority counts across all teams
    const totalHighPriority = Object.values(teamStats).reduce((sum, team) => sum + team.highPriorityCount, 0);
    const totalMediumPriority = Object.values(teamStats).reduce((sum, team) => sum + team.mediumPriorityCount, 0);
    const totalLowPriority = Object.values(teamStats).reduce((sum, team) => sum + team.lowPriorityCount, 0);
    const totalPriorities = totalHighPriority + totalMediumPriority + totalLowPriority;

    // Calculate total detractors and passives across all tasks
    const totalDetractors = tasks.filter(task => task.evaluationScore >= 1 && task.evaluationScore <= 6).length;
    const totalPassives = tasks.filter(task => task.evaluationScore >= 7 && task.evaluationScore <= 8).length;
    const totalEvaluatedTasks = tasks.filter(task => task.evaluationScore).length;

    // Calculate percentages
    const highPriorityPercent = totalPriorities > 0 ? Math.round((totalHighPriority / totalPriorities) * 100) : 0;
    const mediumPriorityPercent = totalPriorities > 0 ? Math.round((totalMediumPriority / totalPriorities) * 100) : 0;
    const lowPriorityPercent = totalPriorities > 0 ? Math.round((totalLowPriority / totalPriorities) * 100) : 0;
    const detractorsPercent = totalEvaluatedTasks > 0 ? Math.round((totalDetractors / totalEvaluatedTasks) * 100) : 0;
    const passivesPercent = totalEvaluatedTasks > 0 ? Math.round((totalPassives / totalEvaluatedTasks) * 100) : 0;

    return {
      totalTeams,
      evaluatedTeams,
      teamsWithDetractors,
      teamsWithOnlyNeutrals,
      teamsWithNoViolations,
      percentWithDetractors: totalTeams > 0 ? ((teamsWithDetractors / totalTeams) * 100).toFixed(1) : 0,
      percentWithOnlyNeutrals: totalTeams > 0 ? ((teamsWithOnlyNeutrals / totalTeams) * 100).toFixed(1) : 0,
      percentWithNoViolations: totalTeams > 0 ? ((teamsWithNoViolations / totalTeams) * 100).toFixed(1) : 0,
      percentEvaluated: totalTeams > 0 ? ((evaluatedTeams / totalTeams) * 100).toFixed(1) : 0,
      totalHighPriority,
      totalMediumPriority,
      totalLowPriority,
      totalPriorities,
      highPriorityPercent,
      mediumPriorityPercent,
      lowPriorityPercent,
      totalDetractors,
      totalPassives,
      totalEvaluatedTasks,
      detractorsPercent,
      passivesPercent
    };
  };

  const violationStats = calculateViolationStats();

  return (
    <Stack
      direction={isMobile ? "column" : "column"}
      spacing={2}
      alignItems={isMobile ? "flex-start" : "center"}
      justifyContent="space-between"
      width="100%"
    >
      <Stack direction={isMobile ? "column" : "row"} alignItems="center" justifyContent={isMobile ? "flex-start" : "space-between"} width={"100%"} spacing={2}>
        <Typography
          variant="h6"
          fontWeight="bold"
          width={isMobile ? "100%" : "auto"}
          sx={{
            color: "#c2c2c2",
            fontSize: isMobile ? "0.9rem" : "1rem",
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          Team Violation Tracker
          <Tooltip title="Learn how violations are evaluated" arrow>
            <IconButton
              onClick={onViolationInfoClick}
              size="medium"
              sx={{ color: '#ffffff' }}
            >
              <MdInfo />
            </IconButton>
          </Tooltip>
        </Typography>

        <Stack
          direction={"row"}
          gap={1}
          alignItems={isMobile ? "flex-start" : "center"}
          width={isMobile ? "100%" : "auto"}
          justifyContent={isMobile ? "space-between" : "flex-end"}
        >
          <TextField
            variant="outlined"
            // size="small"
            placeholder="Search teams, violations, status..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            width={isMobile ? "auto" : "auto"}
            sx={{
              backgroundColor: '#2d2d2d',
              borderRadius: '4px',
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#3d3d3d' },
                '&:hover fieldset': { borderColor: '#555' },
                '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
              },
              '& .MuiInputBase-input': {
                color: '#ffffff',
                fontSize: '0.875rem',
                padding: '8.5px 14px',
              },
              minWidth: isMobile ? undefined : '400px',
              flexGrow: isMobile ? 1 : undefined
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MdSearch style={{ color: '#b3b3b3' }} />
                </InputAdornment>
              ),
            }}
          />

          <Tooltip title="Export to Excel">
            <IconButton
              onClick={exportToExcel}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#4caf50',
                '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' },

              }}
            >
              <RiFileExcel2Fill fontSize={isMobile ? "16px" : "20px"} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction={`${isMobile ? "column" : "row"}`} alignItems="center" justifyContent={"space-between"} gap={2} width={"100%"} sx={{ mt: 2 }}>
        {tasks.length > 0 && (
          <>
            {/* <Stack direction="row" gap={1} width={"100%"} sx={{ backgroundColor: '#191919', borderRadius: '4px', p: 1, flexDirection: 'column' }}>
              <Typography
                variant="outlined"
                size="small"
                sx={{ color: '#5b5b5b', fontSize: '0.7rem', fontWeight: 600 }}
              >
                Detractor and Passive Feedback Mapping Across Teams
              </Typography>
              <Stack direction="row" gap={1} sx={{ flexWrap: isMobile ? "wrap" : "nowrap" }}>
                <Chip
                  label={`${violationStats.totalTeams} Total`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(66, 165, 245, 0.1)',
                    color: '#42a5f5',
                    fontSize: '0.75rem'
                  }}
                />
                <Chip
                  label={`${violationStats.teamsWithDetractors} Detractors (${violationStats.percentWithDetractors}%)`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    color: '#f44336',
                    fontSize: '0.75rem'
                  }}
                />
                <Chip
                  label={`${violationStats.teamsWithOnlyNeutrals} Passive (${violationStats.percentWithOnlyNeutrals}%)`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    color: '#ff9800',
                    fontSize: '0.75rem'
                  }}
                />
                <Chip
                  label={`${violationStats.teamsWithNoViolations} Clean (${violationStats.percentWithNoViolations}%)`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    color: '#4caf50',
                    fontSize: '0.75rem'
                  }}
                />
              </Stack>
            </Stack> */}

            {/* <Stack direction="row" gap={1} width={"100%"} sx={{ backgroundColor: '#191919', borderRadius: '4px', p: 1, flexDirection: 'column' }}>
              <Typography
                variant="outlined"
                size="small"
                sx={{ color: '#5b5b5b', fontSize: '0.7rem', fontWeight: 600 }}
              >
                Detractors vs. Neutrals
              </Typography>
              <Stack direction="row" gap={1}>
                <Chip
                  label={`${violationStats.totalDetractors} Detractors (${violationStats.detractorsPercent}%)`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    color: '#f44336',
                    fontSize: '0.75rem'
                  }}
                />
                <Chip
                  label={`${violationStats.totalPassives} Passives (${violationStats.passivesPercent}%)`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    color: '#ff9800',
                    fontSize: '0.75rem'
                  }}
                />
              </Stack>
            </Stack> */}

            {/* <Stack direction="row" gap={1} width={"100%"} sx={{ backgroundColor: '#191919', borderRadius: '4px', p: 1, flexDirection: 'column' }}>
              <Typography
                variant="outlined"
                size="small"
                sx={{ color: '#5b5b5b', fontSize: '0.7rem', fontWeight: 600 }}
              >
                Customer Satisfaction Insights - Feedback Severity
              </Typography>
              <Stack direction="row" gap={1}>
                <Chip
                  label={`${violationStats.totalHighPriority} High (${violationStats.highPriorityPercent}%)`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    color: '#f44336',
                    fontSize: '0.75rem'
                  }}
                />
                <Chip
                  label={`${violationStats.totalMediumPriority} Medium (${violationStats.mediumPriorityPercent}%)`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    color: '#ff9800',
                    fontSize: '0.75rem'
                  }}
                />
                <Chip
                  label={`${violationStats.totalLowPriority} Low (${violationStats.lowPriorityPercent}%)`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    color: '#4caf50',
                    fontSize: '0.75rem'
                  }}
                />
              </Stack>
            </Stack> */}
          </>
        )}
      </Stack>
    </Stack>
  );
};

export default SearchAndExport;