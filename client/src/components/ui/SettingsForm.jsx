// Settings-style form building blocks shared by the task forms (Add Task, DVOC Maintenance).
import { Autocomplete, Box, Button, IconButton, MenuItem, TextField, Tooltip, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';

import { field } from './formField';

/** A titled section of settings-style rows. */
export const Section = ({ id, title, description, children, sectionRef }) => (
  <Box component="section" id={`task-${id}`} ref={sectionRef} data-section={id} sx={{ scrollMarginTop: 16, pb: 4 }}>
    <Typography component="h2" sx={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', mb: description ? 0.25 : 1.25 }}>{title}</Typography>
    {description && <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', mb: 1.25 }}>{description}</Typography>}
    <Box>{children}</Box>
  </Box>
);

/** Label (and hint) on the left, control on the right; stacks on narrow screens. */
export const Row = ({ label, hint, required, children, align = 'center' }) => (
  <Box sx={{
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: 'minmax(180px, 2fr) minmax(0, 3fr)' },
    gap: { xs: 0.75, sm: 3 },
    alignItems: { xs: 'stretch', sm: align },
    py: 1.5,
    borderBottom: '1px solid var(--border)',
    '&:last-of-type': { borderBottom: 0 },
  }}>
    <Box sx={{ minWidth: 0 }}>
      <Typography component="label" sx={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
        {label}{required && <Box component="span" sx={{ color: 'var(--danger)', ml: 0.25 }}>*</Box>}
      </Typography>
      {hint && <Typography sx={{ fontSize: 12.5, color: 'var(--text-secondary)', mt: 0.25, lineHeight: 1.45 }}>{hint}</Typography>}
    </Box>
    <Box sx={{ minWidth: 0 }}>{children}</Box>
  </Box>
);

/** Two compact controls side by side inside one row (e.g. two dates). */
export const Pair = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25 }}>{children}</Box>
);

export const SmallLabel = ({ children }) => (
  <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mb: 0.5 }}>{children}</Typography>
);

export const SelectField = ({ value, onChange, options, ariaLabel, placeholder }) => {
  const safeValue = value ?? '';
  const hasValueInOptions = !safeValue || options.some((o) => (typeof o === 'object' ? String(o.value) === String(safeValue) : String(o) === String(safeValue)));
  return (
    <TextField select {...field} value={hasValueInOptions ? safeValue : ''} onChange={(e) => onChange(e.target.value)} slotProps={{ htmlInput: { 'aria-label': ariaLabel } }}
      SelectProps={{ displayEmpty: true, renderValue: (v) => (v === '' || v === undefined || v === 'Not specified' ? <span style={{ color: 'var(--text-muted)' }}>{placeholder || 'Not specified'}</span> : options.find((o) => typeof o === 'object' && String(o.value) === String(v))?.label ?? v) }}>
      {options.map((o) => (typeof o === 'object' ? <MenuItem key={String(o.value)} value={o.value}>{o.label}</MenuItem> : <MenuItem key={o} value={o}>{o}</MenuItem>))}
    </TextField>
  );
};

export const FreeAutocomplete = ({ options, value, onChange, ariaLabel, fallback = '' }) => (
  <Autocomplete
    freeSolo
    fullWidth
    size="small"
    options={options}
    value={value}
    onChange={(e, nv) => onChange(nv || fallback)}
    onInputChange={(e, nv) => onChange(nv)}
    renderInput={(params) => <TextField {...params} hiddenLabel inputProps={{ ...params.inputProps, 'aria-label': ariaLabel }} />}
  />
);

export const UnifiedRCARows = ({ rcaRows, dropdownOptions, handleAdd, handleRemove, handleChange }) => {
  const opt = (k) => dropdownOptions[k]?.map(item => item.value) || [];
  const yn = [{ value: 'Not specified', label: 'Not specified' }, { value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {rcaRows.map((row, index) => (
        <Box key={index} sx={{ p: 1.75, borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.25 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Cause {index + 1}</Typography>
            {rcaRows.length > 1 && (
              <Tooltip title="Remove this cause">
                <IconButton size="small" aria-label={`Remove cause ${index + 1}`} onClick={() => handleRemove(index)}><DeleteOutline sx={{ fontSize: 17 }} /></IconButton>
              </Tooltip>
            )}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 1.25 }}>
            <Box><SmallLabel>Main reason</SmallLabel><FreeAutocomplete options={opt('REASON')} value={row.reason} onChange={(v) => handleChange(index, 'reason', v || '')} ariaLabel="Main reason" /></Box>
            <Box><SmallLabel>Sub reason</SmallLabel><FreeAutocomplete options={opt('REASON_SUB')} value={row.subReason} onChange={(v) => handleChange(index, 'subReason', v || '')} ariaLabel="Sub reason" /></Box>
            <Box><SmallLabel>Root cause</SmallLabel><FreeAutocomplete options={opt('ROOT_CAUSE')} value={row.rootCause} onChange={(v) => handleChange(index, 'rootCause', v || '')} ariaLabel="Root cause" /></Box>
            <Box><SmallLabel>Owner</SmallLabel><FreeAutocomplete options={opt('RESPONSIBILITY')} value={row.responsible} onChange={(v) => handleChange(index, 'responsible', v || '')} ariaLabel="Owner" /></Box>
            <Box><SmallLabel>ITN related</SmallLabel><SelectField value={row.itnRelated || 'Not specified'} onChange={(v) => handleChange(index, 'itnRelated', v)} options={yn} ariaLabel="ITN related" /></Box>
            <Box><SmallLabel>Related to current subscription</SmallLabel><SelectField value={row.relatedToSubscription || 'Not specified'} onChange={(v) => handleChange(index, 'relatedToSubscription', v)} options={yn} ariaLabel="Related to current subscription" /></Box>
            <Box sx={{ gridColumn: { lg: 'span 2' } }}>
              <SmallLabel>Team accountability</SmallLabel>
              <SelectField value={row.teamAccountability || 'No'} onChange={(v) => handleChange(index, 'teamAccountability', v)} options={[{ value: 'Yes', label: 'Yes — counts against the field team' }, { value: 'No', label: 'No — registered, team not accountable' }]} ariaLabel="Team accountability" />
            </Box>
          </Box>
        </Box>
      ))}
      <Button variant="outlined" size="small" startIcon={<Add />} onClick={handleAdd} sx={{ alignSelf: 'flex-start' }}>Add another cause</Button>
    </Box>
  );
};
