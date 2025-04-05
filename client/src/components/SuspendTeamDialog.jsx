import { useForm, Controller } from "react-hook-form";
import api from "../api/api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { format, isAfter } from "date-fns";

export const SuspendTeamDialog = ({ open, onClose, teamId, setUpdateTeamStatus }) => {
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm();

  const startDate = watch("suspensionStartDate"); // Watch the start date for validation
  const endDate = watch("suspensionEndDate"); // Watch the end date for validation

  const onSubmit = async (data) => {
    try {
      // Format dates to ISO strings (e.g., "2023-10-15")
      const formattedData = {
        ...data,
        suspensionStartDate: format(new Date(data.suspensionStartDate), "yyyy-MM-dd"), // Convert to ISO string
        suspensionEndDate: format(new Date(data.suspensionEndDate), "yyyy-MM-dd"), // Convert to ISO string
      };

      // console.log({ formattedData });

      const response = await api.post(`/field-teams/suspend-field-team/${teamId}`, formattedData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (response.status === 200) {
        alert("Team suspended successfully!");
        onClose();
        reset(); // Reset the form after successful submission
        setUpdateTeamStatus(prev => !prev);
      }
    } catch (error) {
      console.error("Error suspending team:", error);
      alert("Failed to suspend team.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Suspend Team</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Start Date Picker */}
          <Controller
            name="suspensionStartDate"
            control={control}
            defaultValue=""
            rules={{ required: "Start date is required" }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label="Suspension Start Date"
                type="date"
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                error={!!error}
                helperText={error ? error.message : null}
                inputProps={{
                  max: endDate || format(new Date(), "yyyy-MM-dd"), // Prevent selecting a start date after the end date
                }}
              />
            )}
          />

          {/* End Date Picker */}
          <Controller
            name="suspensionEndDate"
            control={control}
            defaultValue=""
            rules={{
              required: "End date is required",
              validate: (value) =>
                isAfter(new Date(value), new Date(startDate)) || "End date must be after start date",
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label="Suspension End Date"
                type="date"
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                error={!!error}
                helperText={error ? error.message : null}
                inputProps={{
                  min: startDate || format(new Date(), "yyyy-MM-dd"), // Prevent selecting an end date before the start date
                }}
              />
            )}
          />

          {/* Text Field for Suspension Reason */}
          <Controller
            name="suspensionReason"
            control={control}
            defaultValue=""
            rules={{ required: "Suspension reason is required" }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label="Suspension Reason"
                fullWidth
                margin="normal"
                error={!!error}
                helperText={error ? error.message : null}
              />
            )}
          />

          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" color="primary">
              Suspend
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};