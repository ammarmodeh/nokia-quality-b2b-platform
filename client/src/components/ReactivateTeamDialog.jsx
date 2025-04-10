import api from "../api/api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";

export const ReactivateTeamDialog = ({ open, onClose, teamId, setUpdateTeamStatus }) => {
  const handleReactivate = async () => {
    try {
      const response = await api.post(`/field-teams/reactivate-field-team/${teamId}`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 200) {
        alert("Team reactivated successfully!");
        onClose(); // Close the dialog
        setUpdateTeamStatus(prev => !prev);
      }
    } catch (error) {
      // console.error("Error reactivating team:", error);
      alert("Failed to reactivate team.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Reactivate Team</DialogTitle>
      <DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleReactivate} color="primary">Reactivate</Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};