import { useForm } from "react-hook-form";
import api from "../api/api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";

export const TerminateTeamDialog = ({ open, onClose, teamId, setUpdateTeamStatus }) => {
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await api.post(`/field-teams/terminate-field-team/${teamId}`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 200) {
        alert("Team terminated successfully!");
        onClose(); // Close the dialog
        setUpdateTeamStatus(prev => !prev);
      }
    } catch (error) {
      // console.error("Error terminating team:", error);
      alert("Failed to terminate team.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Terminate Team</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label="Termination Reason"
            {...register('terminationReason', { required: true })}
            fullWidth
            margin="normal"
            required
          />
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" color="primary">Terminate</Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};