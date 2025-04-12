import { useState } from 'react';
import { MenuItem, Box, Typography, Snackbar, Alert } from '@mui/material';
import { RiFileCopyLine } from 'react-icons/ri';

const CopyMenuItem = ({ accountId }) => {
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(accountId); // replace with actual ID
    setOpenSnackbar(true);
  };

  return (
    <>
      <MenuItem onClick={copyToClipboard} sx={{ mt: 1 }}>
        <RiFileCopyLine style={{ fontSize: 18, marginRight: 8 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="body2" sx={{ ml: 1 }}>Account ID</Typography>
          <Typography variant="caption" sx={{
            color: '#1d1dff',
            lineHeight: 1.2,
            ml: 1
          }}>
            Click to copy
          </Typography>
        </Box>
      </MenuItem>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={2000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
};

export default CopyMenuItem;
