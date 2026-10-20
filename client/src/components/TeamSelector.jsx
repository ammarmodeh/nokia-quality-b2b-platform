import { Autocomplete, Box, Button, TextField, Tooltip } from "@mui/material";
import Add from "@mui/icons-material/Add";

/** Field team picker with the "New assessment" action next to it. */
const TeamSelector = ({ fieldTeams, selectedTeam, setSelectedTeam, loading, onNewAssessment, canAssess = true }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
    <Autocomplete
      options={fieldTeams}
      getOptionLabel={(option) => `${option.teamName}${option.teamCompany ? ` (${option.teamCompany})` : ''}`}
      isOptionEqualToValue={(o, v) => o._id === v._id}
      value={selectedTeam}
      onChange={(_e, v) => setSelectedTeam(v)}
      disabled={loading}
      renderInput={(params) => <TextField {...params} placeholder="Choose a field team…" slotProps={{ htmlInput: { ...params.inputProps, 'aria-label': 'Field team' } }} />}
      sx={{ flex: 1, minWidth: 240, maxWidth: 420 }}
    />
    {onNewAssessment && canAssess && (
      <Tooltip title={selectedTeam ? '' : 'Choose a team first'}>
        <span>
          <Button variant="contained" startIcon={<Add sx={{ fontSize: 18 }} />} onClick={onNewAssessment} disabled={loading || !selectedTeam}>
            New assessment
          </Button>
        </span>
      </Tooltip>
    )}
  </Box>
);

export default TeamSelector;
