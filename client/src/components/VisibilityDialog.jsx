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
          backgroundColor: '#1e1e1e',
          boxShadow: 'none',
          borderRadius: isMobile ? 0 : '8px',
        }
      }}
    >
      {/* Dialog Title */}
      <DialogTitle sx={{
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        borderBottom: '1px solid #444',
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
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#444',
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
                backgroundColor: "#272727",
                color: "#ffffff",
                padding: isMobile ? '12px 14px' : '14px 16px',
                fontSize: isMobile ? '0.875rem' : '1rem',
                borderRadius: '4px',
              },
              "& .MuiSelect-icon": {
                color: "#3ea6ff",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                border: "1px solid #444",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                border: "1px solid #3ea6ff",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                border: "1px solid #3ea6ff",
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: "#272727",
                  color: "#ffffff",
                  maxHeight: isMobile ? '60vh' : 'none',
                  "& .MuiMenuItem-root": {
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    padding: isMobile ? '8px 16px' : '10px 16px',
                    "&:hover": {
                      backgroundColor: "#333",
                    },
                    "&.Mui-selected": {
                      backgroundColor: "#3ea6ff33",
                      color: "#3ea6ff",
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
          <Typography variant={isMobile ? "caption" : "body2"} sx={{ color: '#aaaaaa', mb: 1 }}>
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
                      backgroundColor: '#333',
                      color: '#ffffff',
                      border: '1px solid #3ea6ff',
                      '& .MuiChip-deleteIcon': {
                        color: '#3ea6ff',
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
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #444',
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