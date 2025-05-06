import { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, TextField, Dialog, Tabs, Tab, Box, useMediaQuery } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../api/api";
import AssessmentResultDialog from "./AssessmentDialog";
import PracticalAssessmentResultDialog from "./PracticalAssessmentResultDialog"; // Import the new dialog
import AdsClickIcon from '@mui/icons-material/AdsClick';

const FieldTeamsFloatingTable = ({ open, onClose }) => {
  const [fieldTeams, setFieldTeams] = useState([]);
  const [practicalAssessments, setPracticalAssessments] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [filteredPracticalTeams, setFilteredPracticalTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [practicalResultsDialogOpen, setPracticalResultsDialogOpen] = useState(false); // New state for practical dialog
  const [tabValue, setTabValue] = useState(0); // 0 for theoretical, 1 for practical
  const tableRef = useRef(null);
  const dialogRef = useRef(null);
  const isMobile = useMediaQuery('(max-width:503px)');

  const fetchFieldTeams = async () => {
    try {
      setRefreshing(true);

      // 1. Fetch theoretical assessments from quiz-results
      const quizResultsResponse = await api.get("/quiz-results", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      const quizResultsData = quizResultsResponse.data.data;

      // Process theoretical assessments
      const processedTheoreticalTeams = quizResultsData
        .filter(result => result.percentage !== null && result.percentage !== undefined)
        .map(result => ({
          _id: result.teamId,
          teamName: result.teamName,
          evaluationScore: `${result.percentage}%`,
          scoreValue: result.percentage,
          submittedAt: result.submittedAt,
          isPractical: false,
          // Add any additional fields you need from field-teams
          teamCompany: result.teamCompany || "" // You might need to fetch this separately
        }))
        .sort((a, b) => b.scoreValue - a.scoreValue);

      setFieldTeams(processedTheoreticalTeams);
      setFilteredTeams(processedTheoreticalTeams);

      // 2. Fetch practical assessments (keep existing code)
      const practicalResponse = await api.get("/on-the-job-assessments", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      const practicalData = practicalResponse.data;
      // console.log({ practicalData });

      const processedPracticalTeams = practicalData
        .filter(assessment => assessment.status === "Completed")
        .map(assessment => ({
          ...assessment,
          teamName: assessment.fieldTeamId?.teamName || assessment.fieldTeamName,
          teamCompany: assessment.fieldTeamId?.teamCompany || "",
          evaluationScore: `${assessment.overallScore}%`,
          scoreValue: assessment.overallScore,
          assessmentDate: assessment.assessmentDate,
          isPractical: true
        }))
        .sort((a, b) => b.scoreValue - a.scoreValue);

      setPracticalAssessments(processedPracticalTeams);
      setFilteredPracticalTeams(processedPracticalTeams);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchFieldTeams();
    }
  }, [open]);

  useEffect(() => {
    // Filter teams based on search term
    if (searchTerm.trim() === "") {
      setFilteredTeams(fieldTeams);
      setFilteredPracticalTeams(practicalAssessments);
    } else {
      const filtered = fieldTeams.filter(team =>
        team.teamName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTeams(filtered);

      const filteredPractical = practicalAssessments.filter(team =>
        team.teamName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPracticalTeams(filteredPractical);
    }
  }, [searchTerm, fieldTeams, practicalAssessments]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tableRef.current && !tableRef.current.contains(event.target) && dialogRef.current && !dialogRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  const handleTeamNameClick = (team) => {
    setSelectedTeam(team);
    setResultsDialogOpen(true);
  };

  const handlePracticalTeamNameClick = (team) => {
    setSelectedTeam(team);
    setPracticalResultsDialogOpen(true); // Open the practical dialog
  };

  const handleDialogClose = () => {
    setSelectedTeam(null);
    setResultsDialogOpen(false);
    setPracticalResultsDialogOpen(false); // Close the practical dialog
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (!open) return null;

  return (
    // <Box sx={{ width: '100%', height: '100%' }}>
    <div
      ref={tableRef}
      className={`${isMobile ? 'absolute left-1/2 -translate-x-1/2' : 'fixed right-4'} bottom-20 bg-[#171717fa] border border-[#444] rounded-lg shadow-lg z-50 flex flex-col`}
      style={{
        height: '400px', // Set a fixed height
        width: isMobile ? '90%' : '500px',
        maxHeight: '400px', // Ensure max height is also set
        overflowY: 'auto', // Make the content scrollable if it overflows
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Fixed Header */}
      <div className="flex justify-between items-center p-2 border-b border-[#444] flex-shrink-0">
        <h3 className="text-white font-medium">
          {tabValue === 0 ? "Theoretical Assessment Scores" : "On-The-Job Assessment Scores"}
        </h3>
        <div>
          <IconButton
            onClick={fetchFieldTeams}
            size="small"
            disabled={refreshing}
            title="Refresh teams"
          >
            <RefreshIcon
              style={{
                color: refreshing ? "#777" : "white",
                transition: "transform 0.3s",
                transform: refreshing ? "rotate(360deg)" : "rotate(0deg)"
              }}
            />
          </IconButton>
          <IconButton onClick={onClose} size="small">
            <CloseIcon style={{ color: "white" }} />
          </IconButton>
        </div>
      </div>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="assessment tabs"
          variant="fullWidth"
        >
          <Tab
            label="Theoretical"
            sx={{
              color: tabValue === 0 ? 'white' : '#777',
              minWidth: 0,
              fontSize: '0.7rem'
            }}
          />
          <Tab
            label="Practical"
            sx={{
              color: tabValue === 1 ? 'white' : '#777',
              minWidth: 0,
              fontSize: '0.7rem'
            }}
          />
        </Tabs>
      </Box>

      {/* Search Bar */}
      <div className="border-b border-[#444]">
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder={`Search ${tabValue === 0 ? 'theoretical' : 'practical'} team name...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon style={{ color: "#777", marginRight: "8px" }} />,
            style: {
              color: "white",
              borderRadius: "0px",
            },
          }}
        />
      </div>

      {/* Combined Scrollable Table */}
      <div style={{
        overflow: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <TableContainer
          component={Paper}
          style={{
            backgroundColor: "#171717fa",
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Table
            size="small"
            style={{
              minWidth: isMobile ? '500px' : '100%',
              tableLayout: 'auto',
              flex: 1
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell style={{ color: "white", fontWeight: 'bold', minWidth: 140 }}>Team Name</TableCell>
                <TableCell style={{ color: "white", fontWeight: 'bold', minWidth: 100 }}>Group</TableCell>
                <TableCell style={{ color: "white", fontWeight: 'bold', minWidth: 120 }}>Score</TableCell>
                <TableCell style={{ color: "white", fontWeight: 'bold', minWidth: 150 }}>Date & Time</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow style={{ height: '40px' }}>
                  <TableCell colSpan={4} style={{ color: "white", textAlign: "center" }}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (tabValue === 0 ? filteredTeams : filteredPracticalTeams).length === 0 ? (
                <TableRow style={{ height: '40px' }}>
                  <TableCell colSpan={4} style={{ color: "white", textAlign: "center" }}>
                    {searchTerm ? "No matching teams found" : `No ${tabValue === 0 ? 'evaluated' : 'assessed'} teams found`}
                  </TableCell>
                </TableRow>
              ) : (
                (tabValue === 0 ? filteredTeams : filteredPracticalTeams).map((team) => (
                  <TableRow key={team._id} style={{ height: '40px' }}>
                    <TableCell
                      style={{
                        color: "white",
                        cursor: 'pointer',
                        minWidth: 140,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '40px'
                      }}
                      title={team.teamName}
                      onClick={() => tabValue === 0 ? handleTeamNameClick(team) : handlePracticalTeamNameClick(team)}
                    >
                      {team.teamName}
                      <AdsClickIcon style={{ marginLeft: '10px', fontSize: '15px', verticalAlign: 'middle' }} />
                    </TableCell>
                    <TableCell
                      style={{
                        color: "white",
                        minWidth: 100,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '40px'
                      }}
                      title={team.teamCompany}
                    >
                      {team.teamCompany}
                    </TableCell>
                    <TableCell style={{
                      color: getScoreColor(team.evaluationScore),
                      fontWeight: 'bold',
                      minWidth: 80,
                      textAlign: 'left',
                      lineHeight: '40px'
                    }}>
                      {team.evaluationScore.includes('%')
                        ? team.evaluationScore
                        : `${team.evaluationScore}%`}
                    </TableCell>
                    <TableCell
                      style={{
                        color: "white",
                        minWidth: 150,
                        whiteSpace: 'nowrap',
                        lineHeight: '40px'
                      }}
                    >
                      {new Date(tabValue === 0 ? team.submittedAt : team.assessmentDate).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

          </Table>
        </TableContainer>
      </div>

      {/* Keep your existing Dialog components */}
      <Dialog
        ref={dialogRef}
        open={resultsDialogOpen}
        onClose={handleDialogClose}
        fullScreen
        PaperProps={{
          style: {
            backgroundColor: '#121212',
          }
        }}
      >
        {selectedTeam && (
          <AssessmentResultDialog
            teamId={selectedTeam._id}
            teamName={selectedTeam.teamName}
            onClose={handleDialogClose}
            isPractical={selectedTeam.isPractical}
          />
        )}
      </Dialog>

      <Dialog
        ref={dialogRef}
        open={practicalResultsDialogOpen}
        onClose={handleDialogClose}
        fullScreen
        PaperProps={{
          style: {
            backgroundColor: '#121212',
          }
        }}
      >
        {selectedTeam && (
          <PracticalAssessmentResultDialog
            assessmentId={selectedTeam._id}
            teamName={selectedTeam.teamName}
            onClose={handleDialogClose}
          />
        )}
      </Dialog>
    </div>
    // </Box>
  );
};

// Keep your existing getScoreColor function
const getScoreColor = (score) => {
  let numericScoreStr;

  if (typeof score === 'string') {
    numericScoreStr = score.split(' ')[1]?.replace('%', '') || score.replace('%', '');
  } else {
    numericScoreStr = score.toString();
  }

  const numericScore = parseFloat(numericScoreStr);
  if (numericScore >= 90) return '#04970a';
  if (numericScore >= 75) return '#4CAF50';
  if (numericScore >= 55) return '#FFC107';
  return '#F44336';
};

export default FieldTeamsFloatingTable;
