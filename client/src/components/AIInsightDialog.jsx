// src/components/AIInsightDialog.jsx

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  Snackbar,
  Alert
} from '@mui/material';
import { MdClose, MdContentCopy, MdRefresh, MdPsychology } from 'react-icons/md';

const AIInsightDialog = ({ open, onClose, insights, title, onRegenerate }) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleCopy = () => {
    if (insights) {
      // Use a temporary textarea for robust copy of Markdown content
      const tempTextArea = document.createElement('textarea');
      tempTextArea.value = insights;
      document.body.appendChild(tempTextArea);
      tempTextArea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextArea);

      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            // Simple dark theme
            backgroundColor: '#1e1e1e',
            color: '#fff',
            borderRadius: 2,
            border: '1px solid #444',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          // Clean separator
          borderBottom: '1px solid #333',
          pb: 1.5,
          px: 3,
        }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#00e5ff', fontWeight: 500 }}>
            <MdPsychology size={22} /> {title}
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <MdClose />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 2, px: 3, pb: 1 }}>
          {insights ? (
            // Focus area: Simple, clear display of text
            <Box sx={{
              p: 2,
              // Subtle background distinction
              backgroundColor: '#252525',
              borderRadius: 1,
              border: '1px solid #3a3a3a',
              maxHeight: '70vh',
              overflowY: 'auto',
              lineHeight: 1.6, // Increased line spacing for readability
            }}>
              <Typography
                variant="body1"
                component="div"
                sx={{
                  whiteSpace: 'pre-wrap', // Handles line breaks correctly for markdown
                  wordBreak: 'break-word',
                  color: '#ffffff',
                  // Custom style injection for Markdown elements for clear structure
                  '& h1, & h2, & h3': {
                    color: '#00e5ff', // Highlight headings
                    borderBottom: '1px solid #333',
                    paddingBottom: '4px',
                    marginTop: '1.5rem',
                    marginBottom: '0.8rem',
                    fontSize: '1.25rem', // Ensure headings are clear
                  },
                  '& strong': {
                    color: '#fff',
                    fontWeight: 700,
                  },
                  '& ul, & ol': {
                    paddingLeft: '20px',
                    margin: '10px 0'
                  },
                  '& table': {
                    width: '100%',
                    borderCollapse: 'collapse',
                    margin: '15px 0',
                    '& th, & td': {
                      border: '1px solid #444',
                      padding: '8px',
                      textAlign: 'left',
                    },
                    '& th': {
                      backgroundColor: '#1a1a1a',
                    }
                  }
                }}
              >
                {insights}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#aaa', textAlign: 'center', py: 6 }}>
              Generating deep insights now...
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #333', pt: 2, px: 3, pb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="caption" sx={{ color: '#777' }}>
              Powered by Gemini AI
            </Typography>
          </Box>
          <Button
            startIcon={<MdContentCopy />}
            onClick={handleCopy}
            sx={{ color: '#90caf9' }}
            disabled={!insights}
          >
            Copy Report
          </Button>
          <Button
            startIcon={<MdRefresh />}
            onClick={onRegenerate}
            sx={{ color: '#90caf9' }}
          >
            Regenerate
          </Button>
          <Button onClick={onClose} variant="contained" sx={{ backgroundColor: '#3f51b5', '&:hover': { backgroundColor: '#303f9f' } }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          Report copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
};

export default AIInsightDialog;