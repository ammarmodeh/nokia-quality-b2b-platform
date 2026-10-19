import {
  Box,
  Paper,
  Autocomplete,
  TextField,
  Button,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { Add } from "@mui/icons-material";

const TeamSelector = ({
  fieldTeams,
  selectedTeam,
  setSelectedTeam,
  loading,
  colors,
  onNewAssessment,
  canAssess = true,
}) => {
  const isMobile = useMediaQuery('(max-width:503px)');

  return (
    <Paper sx={{
      p: 3,
      mb: 3,
      // backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
        <Autocomplete
          options={fieldTeams}
          getOptionLabel={(option) => `${option.teamName} (${option.teamCompany})`}
          value={selectedTeam}
          onChange={(event, newValue) => setSelectedTeam(newValue)}
          disabled={loading}
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Field Team"
              variant="outlined"
              InputLabelProps={{
                style: {
                  color: colors.textSecondary,
                  fontSize: '0.8rem',
                  top: '-7px',
                },
              }}
              InputProps={{
                ...params.InputProps,
                style: {
                  color: colors.textPrimary,
                  height: '36px',
                  fontSize: '0.8rem',
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: colors.border,
                  },
                  '&:hover fieldset': {
                    borderColor: colors.primary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: colors.primary,
                  },
                  '&.Mui-disabled fieldset': {
                    borderColor: `${colors.border}80`,
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '8px 12px',
                  height: 'auto',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: colors.primary,
                  top: '1px',
                },
                '& input': {
                  caretColor: colors.primary,
                },
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: `0 0 0 1000px ${colors.surface} inset`,
                  WebkitTextFillColor: colors.textPrimary,
                  transition: 'background-color 5000s ease-in-out 0s',
                },
              }}
            />
          )}
          sx={{
            '& .MuiAutocomplete-popupIndicator': {
              color: colors.textSecondary,
              '&:hover': {
                backgroundColor: colors.primaryHover,
              }
            },
            '& .MuiAutocomplete-clearIndicator': {
              color: colors.textSecondary,
              '&:hover': {
                backgroundColor: colors.primaryHover,
              }
            },
          }}
          componentsProps={{
            paper: {
              sx: {
                backgroundColor: colors.surfaceElevated,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                marginTop: '4px',
                '& .MuiAutocomplete-option': {
                  '&[aria-selected="true"]': {
                    backgroundColor: `${colors.primary}22`,
                  },
                  '&[aria-selected="true"].Mui-focused': {
                    backgroundColor: `${colors.primary}33`,
                  },
                  '&.Mui-focused': {
                    backgroundColor: colors.primaryHover,
                  },
                },
              },
            },
            popper: {
              sx: {
                '& .MuiAutocomplete-listbox': {
                  backgroundColor: colors.surfaceElevated,
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: colors.surface,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: colors.border,
                    borderRadius: '4px',
                  },
                },
              },
            },
          }}
        />

        {onNewAssessment && canAssess && (
          <Tooltip title={selectedTeam ? `Start OTJ Assessment for ${selectedTeam.teamName}` : "Select an operational team first to start assessment"}>
            <span>
              <Button
                variant="contained"
                onClick={onNewAssessment}
                disabled={loading || !selectedTeam}
                startIcon={<Add sx={{ fontSize: '1.2rem !important' }} />}
                sx={{
                  backgroundColor: colors.primary,
                  color: 'var(--text)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                  height: '36px',
                  px: 2.5,
                  minWidth: isMobile ? '100%' : '160px',
                  borderRadius: '6px',
                  textTransform: 'none',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: colors.primaryHover,
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.45)',
                    transform: 'translateY(-1px)',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: 'var(--overlay-subtle)',
                    color: 'rgba(255, 255, 255, 0.3)',
                  }
                }}
              >
                Assess Team
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};

export default TeamSelector;