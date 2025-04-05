import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
} from "@mui/material";

const VisibilityDialog = ({ open, onClose, member, team, currentUserId, handleVisibilityChange }) => {
  if (!member) return null; // Return null if member is null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: "bg-gray-900 text-gray-100", // Dark background and light text
      }}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: "#131111",
          color: "white",
          boxShadow: "none",
        },
      }}
    >
      {/* Dialog Title */}
      <DialogTitle className="bg-[#343434]">
        Set Visibility for {member.name}
      </DialogTitle>

      {/* Dialog Content */}
      <DialogContent sx={{ "&.MuiDialogContent-root": { paddingTop: 3 } }} >
        {/* Select Members Dropdown */}
        <FormControl fullWidth className="mt-4">
          <Select
            labelId="visible-to-label"
            multiple
            value={member.visibleTo || []}
            onChange={(e) => {
              const newVisibleTo = e.target.value;
              handleVisibilityChange(member._id, newVisibleTo);
            }}
            sx={{
              "& .MuiSelect-select": {
                backgroundColor: "#323232", // Background color of the select input
                color: "#e0e0e0", // Text color of the select input
              },
              "& .MuiSelect-icon": {
                color: "#e0e0e0", // Color of the dropdown icon
              },
              "& .MuiOutlinedInput-notchedOutline": {
                border: "none", // Remove border
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                border: "none", // Remove border on hover
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                border: "none", // Remove border when focused
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: "#323232", // Background color of the dropdown menu
                  color: "#e0e0e0", // Text color of the dropdown menu
                  "& .MuiMenuItem-root": {
                    "&:hover": {
                      backgroundColor: "#404040", // Hover background color for menu items
                    },
                    "&.Mui-selected": {
                      backgroundColor: "#505050", // Background color for selected items
                      color: "#e0e0e0", // Text color for selected items
                    },
                  },
                },
              },
            }}
          >
            {team
              .filter((teamMember) => teamMember._id !== currentUserId)
              .map((teamMember) => (
                <MenuItem
                  key={teamMember._id}
                  value={teamMember._id}
                >
                  {teamMember.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        {/* Selected Members Chips */}
        <Box className="mt-4">
          <Typography variant="body2" className="text-gray-300">
            Selected Members:
          </Typography>
          <Box className="flex flex-wrap gap-2 mt-2">
            {(member.visibleTo || []).map((id) => {
              const selectedMember = team.find((m) => m._id === id);
              return (
                selectedMember && (
                  <Chip
                    key={id}
                    label={selectedMember.name}
                    sx={{ backgroundColor: "#4a4a4ac2", color: "#e0e0e0" }}
                  />
                )
              );
            })}
          </Box>
        </Box>
      </DialogContent>

      {/* Dialog Actions */}
      <DialogActions className="bg-[#343434] ">
        <Button
          onClick={onClose}
          className="text-[#bfbfbf]" // Light gray text with hover effect
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VisibilityDialog;