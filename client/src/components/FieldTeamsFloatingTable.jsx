import { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, TextField, Dialog } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../api/api";
import AssessmentResultDialog from "./AssessmentDialog"; // Import the new dialog component
import AdsClickIcon from '@mui/icons-material/AdsClick';

const FieldTeamsFloatingTable = ({ open, onClose }) => {
  const [fieldTeams, setFieldTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null); // State for selected team
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false); // State for dialog open/close
  const tableRef = useRef(null);
  const dialogRef = useRef(null); // Ref for the dialog

  const fetchFieldTeams = async () => {
    try {
      setRefreshing(true);
      const response = await api.get("/field-teams/get-field-teams", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      const { data } = response;

      // Filter and sort teams
      const filteredTeams = data
        .filter(team => team.evaluationScore !== "N/A")
        .map(team => ({
          ...team,
          // Convert score to number for proper sorting
          scoreValue: parseFloat(team.evaluationScore.replace('%', ''))
        }))
        .sort((a, b) => b.scoreValue - a.scoreValue); // Sort descending

      setFieldTeams(filteredTeams);
      setFilteredTeams(filteredTeams); // Initialize filtered teams
      setLoading(false);
    } catch (error) {
      console.error("Error fetching field teams:", error);
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
    } else {
      const filtered = fieldTeams.filter(team =>
        team.teamName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTeams(filtered);
    }
  }, [searchTerm, fieldTeams]);

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

  const handleDialogClose = () => {
    setSelectedTeam(null);
    setResultsDialogOpen(false);
  };

  if (!open) return null;

  return (
    <div
      ref={tableRef}
      className="fixed bottom-20 right-4 bg-[#171717fa] border border-[#444] rounded-lg shadow-lg z-50 w-90 flex flex-col"
      style={{ maxHeight: '320px' }}
    >
      {/* Fixed Header */}
      <div className="flex justify-between items-center p-2 border-b border-[#444] flex-shrink-0">
        <h3 className="text-white font-medium">Team Evaluation Scores (Ranked)</h3>
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

      {/* Search Bar */}
      <div className="border-b border-[#444]">
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Search team name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon style={{ color: "#777", marginRight: "8px" }} />,
            style: {
              color: "white",
              // backgroundColor: "#1E1E1E",
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
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      {/* Scrollable Table Body */}
      <div className="h-[200px] overflow-y-auto">
        <TableContainer component={Paper} style={{ backgroundColor: "#171717fa" }}>
          <Table size="small" style={{ tableLayout: 'fixed' }}>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} style={{ color: "white", textAlign: "center" }}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} style={{ color: "white", textAlign: "center" }}>
                    {searchTerm ? "No matching teams found" : "No evaluated teams found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeams.map((team) => (
                  <TableRow key={team._id}>
                    <TableCell
                      style={{ color: "white", width: '140px', cursor: 'pointer' }}
                      title={team.teamName}
                      onClick={() => handleTeamNameClick(team)}
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      {/* Assessment Result Dialog */}
      <Dialog
        ref={dialogRef} // Add ref to the dialog
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
          />
        )}
      </Dialog>
    </div>
  );
};

// Helper function for score color
const getScoreColor = (score) => {
  const numericScoreStr = score.split(' ')[1].replace('%', '');
  const numericScore = parseFloat(numericScoreStr);
  if (numericScore >= 90) return '#04970a';
  if (numericScore >= 75) return '#4CAF50'; // Green for high scores
  if (numericScore >= 55) return '#FFC107'; // Yellow for medium scores
  return '#F44336'; // Red for low scores
};

export default FieldTeamsFloatingTable;
