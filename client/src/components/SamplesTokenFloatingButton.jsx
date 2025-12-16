import React, { useState } from 'react';
import { Fab, Tooltip } from '@mui/material';
import { Assessment as AssessmentIcon } from '@mui/icons-material';
import SamplesTokenDialog from './SamplesTokenDialog';

const SamplesTokenFloatingButton = () => {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Tooltip title="Samples Token" arrow>
        <Fab
          color="primary"
          aria-label="samples-token"
          onClick={handleClickOpen}
          sx={{
            position: 'fixed',
            bottom: 30,
            right: 30,
            backgroundColor: '#7b68ee',
            '&:hover': {
              backgroundColor: '#5e4ecf',
            },
            zIndex: 1000
          }}
        >
          <AssessmentIcon />
        </Fab>
      </Tooltip>
      <SamplesTokenDialog open={open} onClose={handleClose} />
    </>
  );
};

export default SamplesTokenFloatingButton;
