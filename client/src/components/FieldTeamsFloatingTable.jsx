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
      // Fetch theoretical assessments
      const response = await api.get("/field-teams/get-field-teams", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      const { data } = response;

      // Filter and sort teams
      const filteredTeams = data
        .filter(team => team.evaluationScore !== "N/A")
        .map(team => ({
          ...team,
          scoreValue: parseFloat(team.evaluationScore.replace('%', ''))
        }))
        .sort((a, b) => b.scoreValue - a.scoreValue);

      setFieldTeams(filteredTeams);
      setFilteredTeams(filteredTeams);

      // Fetch practical assessments
      const practicalResponse = await api.get("/on-the-job-assessments", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      const practicalData = practicalResponse.data;

      // Process practical assessments
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
    <Box sx={{
      width: '100%',
      height: '100%',
    }}>
      <div
        ref={tableRef}
        className={`${isMobile ? 'absolute left-1/2 -translate-x-1/2' : 'fixed right-4'
          } bottom-20 bg-[#171717fa] border border-[#444] rounded-lg shadow-lg z-50 flex flex-col overflow-auto`}
        style={{ maxHeight: '400px', width: isMobile ? '90%' : '400px' }}
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

        {/* Fixed Table Head */}
        <TableContainer component={Paper} style={{ backgroundColor: "#171717fa", height: '50px' }}>
          <Table size="small" aria-label="field teams table">
            <TableHead>
              <TableRow>
                <TableCell style={{ color: "white", fontWeight: 'bold', width: '140px' }}>Team Name</TableCell>
                <TableCell style={{ color: "white", fontWeight: 'bold', width: '100px' }}>Group</TableCell>
                <TableCell style={{ color: "white", fontWeight: 'bold' }}>Score</TableCell>
                {tabValue === 1 && (
                  <TableCell style={{ color: "white", fontWeight: 'bold', width: '100px' }}>Date</TableCell>
                )}
              </TableRow>
            </TableHead>
          </Table>
        </TableContainer>

        {/* Scrollable Table Body */}
        <div className="h-[250px] overflow-y-auto">
          <TableContainer component={Paper} style={{ backgroundColor: "#171717fa" }}>
            <Table size="small" style={{ tableLayout: 'fixed' }}>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={tabValue === 0 ? 3 : 4} style={{ color: "white", textAlign: "center" }}>
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : (tabValue === 0 ? filteredTeams : filteredPracticalTeams).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tabValue === 0 ? 3 : 4} style={{ color: "white", textAlign: "center" }}>
                      {searchTerm ? "No matching teams found" : `No ${tabValue === 0 ? 'evaluated' : 'assessed'} teams found`}
                    </TableCell>
                  </TableRow>
                ) : (
                  (tabValue === 0 ? filteredTeams : filteredPracticalTeams).map((team) => (
                    <TableRow key={team._id}>
                      <TableCell
                        style={{ color: "white", width: '140px', cursor: 'pointer' }}
                        title={team.teamName}
                        onClick={() => tabValue === 0 ? handleTeamNameClick(team) : handlePracticalTeamNameClick(team)}
                      >
                        {team.teamName}
                        <AdsClickIcon style={{ marginLeft: '10px', fontSize: '15px' }} />
                      </TableCell>
                      <TableCell style={{ color: "white", width: '100px' }} title={team.teamCompany}>
                        {team.teamCompany}
                      </TableCell>
                      <TableCell style={{
                        color: getScoreColor(team.evaluationScore),
                        fontWeight: 'bold'
                      }}>
                        {team.evaluationScore.includes('%')
                          ? team.evaluationScore
                          : `${team.evaluationScore}%`}
                      </TableCell>
                      {tabValue === 1 && (
                        <TableCell style={{ color: "white", width: '100px' }}>
                          {new Date(team.assessmentDate).toLocaleDateString()}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>

        {/* Assessment Result Dialog */}
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

        {/* Practical Assessment Result Dialog */}
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
    </Box>
  );
};

// Helper function for score color
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
