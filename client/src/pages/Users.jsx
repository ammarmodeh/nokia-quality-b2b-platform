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
} from "@mui/material";
import { FileCopy as FileCopyIcon, Visibility as VisibilityIcon } from "@mui/icons-material";
import { MdOutlineSearch, MdClose } from "react-icons/md";
import api from "../api/api";
import { useSelector } from "react-redux";
import VisibilityDialog from "../components/VisibilityDialog";

const TeamPage = () => {
  const [team, setTeam] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const currentUserId = useSelector((state) => state?.auth?.user?._id);

  // Fetch team members
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const { data } = await api.get("/users/get-all-users", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        setTeam(data);
      } catch (error) {
        // console.error("Error fetching team members:", error);
      }
    };

    fetchTeam();
  }, []);

  // Filter team members based on search input
  const filteredTeam = useMemo(() => {
    return team.filter((member) =>
      member.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [team, search]);

  // Handle copying email to clipboard
  const handleCopyEmail = useCallback((email) => {
    navigator.clipboard.writeText(email)
      .then(() => {
        alert("Email copied to clipboard!");
      })
      .catch((error) => {
        // console.error("Failed to copy email:", error);
      });
  }, []);

  // Clear search input
  const handleClearSearch = useCallback(() => {
    setSearch("");
  }, []);

  // Handle visibility change for team members
  const handleVisibilityChange = useCallback(async (memberId, visibleTo) => {
    try {
      await api.put(`/users/update-visibility/${memberId}`, { visibleTo }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      // Update the team state
      setTeam((prevTeam) =>
        prevTeam.map((member) =>
          member._id === memberId ? { ...member, visibleTo } : member
        )
      );

      // Update the selectedMember state if it's the current member
      setSelectedMember((prevMember) =>
        prevMember?._id === memberId ? { ...prevMember, visibleTo } : prevMember
      );
    } catch (error) {
      // console.error("Error updating visibility:", error);
    }
  }, []);

  // Check if a member's details are visible to the current user
  const isVisible = useCallback((member, currentUserId) => {
    if (member._id === currentUserId) return true;
    return member.visibleTo && member.visibleTo.includes(currentUserId);
  }, []);

  // Open dialog for visibility settings
  const handleOpenDialog = (member) => {
    setSelectedMember(member);
    setDialogOpen(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedMember(null); // Reset selectedMember when dialog is closed
  };

  return (
    <div className="max-w-[1000px] mx-auto">
      <Container maxWidth="lg" sx={{ mt: 5, backgroundColor: "#121212", minHeight: "100vh", p: 3 }}>
        <Typography variant="h4" fontWeight="bold" textAlign="center" mb={3} color="#ffffff">
          Quality Members
        </Typography>

        {/* Search Bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            maxWidth: "600px",
            py: 1,
            px: 2,
            gap: 1,
            borderRadius: "999px",
            backgroundColor: "#121212",
            border: "1px solid #444",
            "&:focus-within": {
              borderColor: "#3ea6ff",
            },
            margin: "0 auto 24px",
          }}
        >
          <MdOutlineSearch className="text-gray-400 text-xl" />
          <TextField
            fullWidth
            variant="standard"
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                backgroundColor: "transparent",
                color: "#ffffff",
              },
              "& .MuiInputBase-input": {
                fontSize: "14px",
                color: "#ffffff",
                padding: 0,
              },
              "& .MuiInput-root:before": {
                borderBottom: "none",
              },
              "& .MuiInput-root:after": {
                borderBottom: "none",
              },
              "& .MuiInput-root:hover:not(.Mui-disabled):before": {
                borderBottom: "none",
              },
            }}
            InputProps={{
              disableUnderline: true,
              style: { color: "#ffffff" },
              endAdornment: search && (
                <IconButton
                  size="small"
                  onClick={handleClearSearch}
                  sx={{ color: "#9e9e9e", "&:hover": { color: "#ffffff" } }}
                >
                  <MdClose className="text-xl" />
                </IconButton>
              ),
            }}
          />
        </Box>

        {/* Team Members Grid */}
        <Box sx={{ flexGrow: 1 }}>
          <Grid container spacing={3}>
            {filteredTeam.map((member) => (
              <Grid item xs={12} sm={6} md={4} lg={4} key={member._id}>
                <Box sx={{ position: "relative" }}>
                  <Card
                    sx={{
                      textAlign: "center",
                      p: 2,
                      transition: "0.3s",
                      "&:hover": { boxShadow: 6 },
                      backgroundColor: "#1e1e1e",
                    }}
                  >
                    {/* Set Visibility Icon Button */}
                    {member._id === currentUserId && (
                      <IconButton
                        onClick={() => handleOpenDialog(member)}
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          color: "#3ea6ff",
                          "&:hover": { backgroundColor: "rgba(62, 166, 255, 0.1)" },
                        }}
                      >
                        <VisibilityIcon sx={{ color: "#777777" }} />
                      </IconButton>
                    )}

                    {/* Avatar */}
                    <Avatar
                      src={member.avatar}
                      alt={member.name}
                      sx={{ width: 80, height: 80, margin: "auto" }}
                    />

                    {/* Card Content */}
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" color="#ffffff">
                        {member.name}
                      </Typography>

                      <Box sx={{ my: 1 }}>
                        <Chip
                          label={`${member.title}`}
                          size="medium"
                          sx={{
                            color: "#ffffff",
                            fontWeight: "bold",
                            backgroundColor: "#333333",
                          }}
                        />
                      </Box>

                      <Typography variant="body2" color="#90caf9">
                        {member.department}
                      </Typography>

                      <Typography variant="body2" color="#b3b3b3" mt={1}>
                        Phone: {isVisible(member, currentUserId) ? member.phoneNumber : "****"}
                      </Typography>

                      <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                        <Typography
                          variant="body2"
                          color="#b3b3b3"
                          sx={{
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "200px",
                          }}
                        >
                          Email: {isVisible(member, currentUserId) ? member.email : "****"}
                        </Typography>
                        {isVisible(member, currentUserId) && (
                          <IconButton
                            onClick={() => handleCopyEmail(member.email)}
                            sx={{ ml: 1, fontSize: 18, padding: 0, color: "#b3b3b3" }}
                          >
                            <FileCopyIcon fontSize="inherit" />
                          </IconButton>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      {/* Visibility Dialog */}
      {selectedMember && (
        <VisibilityDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          member={selectedMember}
          team={team}
          currentUserId={currentUserId}
          handleVisibilityChange={handleVisibilityChange}
        />
      )}
    </div>
  );
};

export default TeamPage;