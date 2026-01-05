import { useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

const CopyMUICell = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'} placement="top">
        <IconButton
          onClick={handleCopy}
          size="small"
          disabled={!value}
          sx={{
            color: '#9c27b0',
            '&:hover': {
              backgroundColor: 'rgba(156, 39, 176, 0.1)',
            },
            mr: 1,
          }}
        >
          {copied ? <AssignmentTurnedInIcon fontSize="small" /> : <AssignmentIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Typography variant="body2">{value || 'N/A'}</Typography>
    </Box>
  );
};

export default CopyMUICell;
