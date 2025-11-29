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
  Alert,
  Chip,
  // Divider,
  // Link,
  Stack,
  // useTheme,
  // useMediaQuery
} from '@mui/material';
import {
  MdClose,
  MdContentCopy,
  MdRefresh,
  MdPsychology,
  // MdShare,
  // MdWhatsApp,
  MdOpenInNew
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';

const AIInsightDialog = ({ open, onClose, insights, title, onRegenerate, metadata }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  // const theme = useTheme();
  // const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const reportUrl = window.location.origin + '/dashboard'; // or generate a shareable link
  const whatsappText = encodeURIComponent(
    `OrangeJO-Nokia FTTH QoS Executive Report\n\n${insights?.substring(0, 800)}...\n\nView full report: ${reportUrl}`
  );
  const whatsappLink = `https://wa.me/?text=${whatsappText}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(insights || '');
    setSnackbar({ open: true, message: 'Report copied to clipboard!', severity: 'success' });
  };

  const handleShareWhatsApp = () => {
    window.open(whatsappLink, '_blank');
    setSnackbar({ open: true, message: 'Opening WhatsApp...', severity: 'info' });
  };

  const handleSnackbarClose = () => setSnackbar({ ...snackbar, open: false });

  // Helpful external links
  const resources = [
    { label: 'NPS Scoring Guide', url: 'https://www.nps.com/guide' },
    { label: 'FTTH Installation Best Practices', url: 'https://www.ftthcouncil.org/best-practices' },
    { label: 'Customer Education Tips', url: 'https://help.orange.jo/ftth-education' },
    { label: 'Nokia ONT Setup Manual', url: 'https://www.nokia.com/networks/training' },
  ];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        // maxWidth="lg"
        // fullWidth
        fullScreen
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #141414 0%, #1e1e1e 100%)',
            color: '#fff',
            // borderRadius: { xs: 0, sm: 3 },
            border: '1px solid #333',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          }
        }}
      >
        {/* Header */}
        <DialogTitle sx={{
          bgcolor: '#00e5ff15',
          borderBottom: '1px solid #333',
          py: 2.5,
          px: 4,
          mb: 1
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <MdPsychology size={28} color="#00e5ff" />
              {title}
            </Typography>
            <IconButton onClick={onClose} sx={{ color: '#aaa' }}>
              <MdClose size={26} />
            </IconButton>
          </Box>

          {metadata && (
            <Typography variant="body2" color="#00e5ff" mt={1}>
              Generated on {metadata.generatedAt} • {metadata.totalCases} cases analyzed
            </Typography>
          )}
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 4 }, py: 3 }}>
          <Box
            sx={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 2,
              p: { xs: 2, sm: 3 },
              maxHeight: '68vh',
              overflowY: 'auto',
              fontSize: '0.98rem',
              lineHeight: 1.75,
              '& h1, & h2, & h3': {
                color: '#00e5ff',
                mt: 3,
                mb: 1.5,
                fontWeight: 600,
                borderBottom: '1px dashed #444',
                pb: 1
              },
              '& strong': { color: '#fff', fontWeight: 700 },
              '& ul, & ol': { pl: 3, my: 2 },
              '& li': { mb: 0.7 },
              '& table': {
                width: '100%',
                borderCollapse: 'collapse',
                mt: 2,
                '& th, & td': {
                  border: '1px solid #444',
                  padding: '10px 12px',
                  textAlign: 'left',
                },
                '& th': { backgroundColor: '#222', fontWeight: 600 }
              }
            }}
          >
            <Typography component="div" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {insights || 'Generating insights...'}
            </Typography>
          </Box>

          {/* Resources */}
          <Box mt={4}>
            <Typography variant="subtitle2" color="#00e5ff" mb={1.5} fontWeight={600}>
              Reference Materials & Follow-Up Actions
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1.5}>
              {resources.map((res) => (
                <Chip
                  key={res.label}
                  label={res.label}
                  icon={<MdOpenInNew size={16} />}
                  clickable
                  component="a"
                  href={res.url}
                  target="_blank"
                  sx={{
                    bgcolor: '#252525',
                    color: '#ccc',
                    border: '1px solid #444',
                    '&:hover': { bgcolor: '#303030' }
                  }}
                />
              ))}
            </Stack>
          </Box>
        </DialogContent>

        {/* Footer Actions */}
        <DialogActions sx={{
          borderTop: '1px solid #333',
          py: 2.5,
          px: 4,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2
        }}>
          <Typography variant="caption" color="#777" flexGrow={1}>
            Powered by Gemini 2.5 Flash • OrangeJO-Nokia FTTH Quality Team
          </Typography>

          <Stack direction="row" spacing={1.5}>
            <Button
              startIcon={<MdContentCopy />}
              onClick={handleCopy}
              variant="outlined"
              sx={{ color: '#90caf9', borderColor: '#444' }}
            >
              Copy
            </Button>

            <Button
              startIcon={<FaWhatsapp />}
              onClick={handleShareWhatsApp}
              variant="contained"
              sx={{
                bgcolor: '#25D366',
                '&:hover': { bgcolor: '#1DA851' },
                color: '#fff'
              }}
            >
              Share via WhatsApp
            </Button>

            <Button
              startIcon={<MdRefresh />}
              onClick={onRegenerate}
              variant="outlined"
              sx={{ color: '#90caf9', borderColor: '#444' }}
            >
              Regenerate
            </Button>

            <Button onClick={onClose} variant="contained" color="primary">
              Close
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Feedback Toast */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={handleSnackbarClose} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AIInsightDialog;