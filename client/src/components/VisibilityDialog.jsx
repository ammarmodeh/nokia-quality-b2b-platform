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
  useMediaQuery,
  useTheme,
} from "@mui/material";

const VisibilityDialog = ({ open, onClose, member, team, currentUserId, handleVisibilityChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!member) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#2d2d2d',
          boxShadow: 'none',
          borderRadius: isMobile ? 0 : '8px',
        }
      }}
    >
      {/* Dialog Title */}
      <DialogTitle sx={{
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: isMobile ? '12px 16px' : '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ fontWeight: 500 }}>
          Set Visibility for {member.name}
        </Typography>
      </DialogTitle>

      {/* Dialog Content */}
      <DialogContent sx={{
        padding: isMobile ? '12px 16px' : '20px 24px',
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#e5e7eb',
          borderRadius: '2px',
        },
      }}>
        {/* Select Members Dropdown */}
        <FormControl fullWidth sx={{ mt: 2 }}>
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
                backgroundColor: "#2d2d2d",
                color: "#ffffff",
                padding: isMobile ? '12px 14px' : '14px 16px',
                fontSize: isMobile ? '0.875rem' : '1rem',
                borderRadius: '4px',
              },
              "& .MuiSelect-icon": {
                color: "#7b68ee",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                border: "1px solid #3d3d3d",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                border: "1px solid #7b68ee",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                border: "1px solid #7b68ee",
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: "#2d2d2d",
                  color: "#ffffff",
                  maxHeight: isMobile ? '60vh' : 'none',
                  "& .MuiMenuItem-root": {
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    padding: isMobile ? '8px 16px' : '10px 16px',
                    "&:hover": {
                      backgroundColor: "#2d2d2d",
                    },
                    "&.Mui-selected": {
                      backgroundColor: "#7b68ee33",
                      color: "#7b68ee",
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
        <Box sx={{ mt: 3 }}>
          <Typography variant={isMobile ? "caption" : "body2"} sx={{ color: '#b3b3b3', mb: 1 }}>
            Selected Members:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {(member.visibleTo || []).map((id) => {
              const selectedMember = team.find((m) => m._id === id);
              return (
                selectedMember && (
                  <Chip
                    key={id}
                    label={selectedMember.name}
                    size={isMobile ? "small" : "medium"}
                    sx={{
                      backgroundColor: '#2d2d2d',
                      color: '#ffffff',
                      border: '1px solid #7b68ee',
                      '& .MuiChip-deleteIcon': {
                        color: '#7b68ee',
                      },
                    }}
                  />
                )
              );
            })}
          </Box>
        </Box>
      </DialogContent>

      {/* Dialog Actions */}
      <DialogActions sx={{
        backgroundColor: '#2d2d2d',
        borderTop: '1px solid #e5e7eb',
        padding: isMobile ? '8px 16px' : '12px 24px',
      }}>
        <Button
          onClick={onClose}
          size={isMobile ? "small" : "medium"}
          sx={{
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#2a2a2a',
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VisibilityDialog;