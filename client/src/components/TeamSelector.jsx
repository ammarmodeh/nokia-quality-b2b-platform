import {
  Box,
  Paper,
  Autocomplete,
  TextField,
  useMediaQuery,
} from "@mui/material";

const TeamSelector = ({
  fieldTeams,
  selectedTeam,
  setSelectedTeam,
  loading,
  colors,
}) => {
  const isMobile = useMediaQuery('(max-width:503px)');

  return (
    <Paper sx={{
      p: 3,
      mb: 3,
      backgroundColor: colors.surface,
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
      </Box>
    </Paper>
  );
};

export default TeamSelector;