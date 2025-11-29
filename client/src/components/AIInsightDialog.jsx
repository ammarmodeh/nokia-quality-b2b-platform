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
  // Chip,
  Stack,
  Link,
} from '@mui/material';
import {
  MdClose,
  MdContentCopy,
  MdRefresh,
  MdPsychology,
  MdOpenInNew,
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';

// === OFFICIAL FIELD TEAM RESOURCES (2025) ===
const shredWithFieldTeams = [
  {
    title: "Comprehensive Action Plan for Training Field Teams & Improving NPS",
    href: "https://drive.google.com/file/d/1NSgGNi1qWC9UiWLEmJOxesx5IOZwyAcf/view?usp=sharing",
  },
  {
    title: "Factors affecting gaming ping (Arabic)",
    href: "https://drive.google.com/file/d/1yV_OSTqxoWUBxvhiFV7nj-FH4HYdxpA3/view?usp=drive_link",
  },
  {
    title: "Factors Affecting VPN Connections (Arabic)",
    href: "https://drive.google.com/file/d/1vn3uGGRIWxmwPIvWgEA0F4uQdFZHSUn7/view?usp=drive_link",
  },
  {
    title: "Labeling Standard",
    href: "https://drive.google.com/file/d/1kqNm-6EtBSUf8M0yWrJ1mWT2FmmF68oB/view?usp=drive_link",
  },
  {
    title: "Nokia G-140W-C Configuration",
    href: "https://drive.google.com/file/d/15P_OzblC8a6tIIyQfpE4_DBEpYXxCp6R/view?usp=drive_link",
  },
  {
    title: "Nokia G-2426G-P (WiFi 6)",
    href: "https://drive.google.com/file/d/1i-88cqu5lfa4_gXmIPI1EzF9V-i4NM8O/view?usp=drive_link",
  },
  {
    title: "ONT Config Steps - NOKIA Type-H",
    href: "https://drive.google.com/file/d/18DoLwOu5VHlak47-wBRp00wXAjso_Nt4/view?usp=drive_link",
  },
  {
    title: "Best Place for Wireless Router (Arabic)",
    href: "https://drive.google.com/file/d/14AOMy7zwogwnlrt9azJ2TYiognxG4llY/view?usp=drive_link",
  },
  {
    title: "Tips on How to Talk to Customers (Arabic)",
    href: "https://drive.google.com/file/d/1gZdSFiyxVdjAxHLdI2UuZZAytwIZCKKP/view?usp=drive_link",
  },
  {
    title: "Troubleshoot IPTV Problems (Arabic)",
    href: "https://drive.google.com/file/d/1OicDupRWjCX75kc3EoDl46qQVG_z4sSf/view?usp=drive_link",
  },
  {
    title: "ZTE F6600P Configuration",
    href: "https://drive.google.com/file/d/1JTbu7c5LxUPGZMMywE_1A4fPQ46mWrdY/view?usp=drive_link",
  },
  {
    title: "Being an Effective Worker at Workplace",
    href: "https://drive.google.com/file/d/1wSSfzr_hxtPO0vZSMyPeLPQu8W7vxrky/view?usp=drive_link",
  },
  {
    title: "Electrode Lifetime & Maintenance",
    href: "https://drive.google.com/file/d/14KX8PnfBTDn2yPkLPQFMXdACbMmqgK2g/view?usp=drive_link",
  },
  {
    title: "Factors Affecting Optical Fiber Splicing Loss",
    href: "https://drive.google.com/file/d/1ksbOKaVe4cE1Y7ibxNpmqhkWoq5rbHbt/view?usp=drive_link",
  },
  {
    title: "Fusion Splicer Arc Calibration & Cleaning (Pages 44-46)",
    href: "https://drive.google.com/file/d/1iU2Yz5PWyuu54p8A7h_pZqaPEzN464eo/view?usp=drive_link",
  },
  {
    title: "How to Check & Improve Wi-Fi Signal Strength",
    href: "https://drive.google.com/file/d/1Lua0kWIdVTKvmYsVDEI_MxFElsIRl7aO/view?usp=drive_link",
  },
  {
    title: "Media Streamers Technical Specifications",
    href: "https://drive.google.com/file/d/1Ev2Lx1wkFcsZ2kd4WIbDmYzUKpS1LOih/view?usp=drive_link",
  },
  {
    title: "Must-Have Tools for Fiber Optic Technicians",
    href: "https://docs.google.com/document/d/1pjJNIKl9P3oLpiqNHe71oSsZy6sUUedC/edit?usp=sharing",
  },
  {
    title: "Wi-Fi Troubleshooting Guide",
    href: "https://docs.google.com/document/d/1TXluJoZyAcBuTcENXTfpYJX9Zo3gihsS/edit?usp=sharing",
  },
  {
    title: "Wi-Fi Best Practices (Arabic)",
    href: "https://drive.google.com/file/d/1jbfbxrOjJv1Erk9wn08AjvOlviK0Yr1r/view?usp=drive_link",
  },
];

const AIInsightDialog = ({ open, onClose, insights, title, onRegenerate, metadata }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const reportUrl = `${window.location.origin}/dashboard`;
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

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #141414 0%, #1e1e1e 100%)',
            color: '#fff',
            border: '1px solid #333',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          }
        }}
      >
        {/* Header */}
        <DialogTitle sx={{ bgcolor: '#00e5ff15', borderBottom: '1px solid #333', py: 2.5, px: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <MdPsychology size={28} color="#00e5ff" />
              {title || "QoS Executive Report"}
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
          {/* Main Report */}
          <Box
            sx={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 2,
              p: { xs: 2, sm: 3 },
              maxHeight: '60vh',
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
            }}
          >
            <Typography component="div" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {insights || 'Generating insights...'}
            </Typography>
          </Box>

          {/* === FIELD TEAM RESOURCES === */}
          <Box mt={5}>
            <Typography variant="h6" color="#00e5ff" mb={2} fontWeight={600}>
              Field Team Resources & Training Materials
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                gap: 1.5,
                maxHeight: '400px',
                overflowY: 'auto',
                pr: 1,
              }}
            >
              {shredWithFieldTeams.map((resource, idx) => (
                <Link
                  key={idx}
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="none"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: '#252525',
                    color: '#ccc',
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #444',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: '#303030',
                      borderColor: '#00e5ff',
                      color: '#fff',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,229,255,0.15)',
                    },
                  }}
                >
                  <MdOpenInNew size={18} color="#00e5ff" />
                  <Typography variant="body2" sx={{ fontSize: '0.9rem', lineHeight: 1.4 }}>
                    {resource.title}
                  </Typography>
                </Link>
              ))}
            </Box>
          </Box>
        </DialogContent>

        {/* Footer */}
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
            <Button startIcon={<MdContentCopy />} onClick={handleCopy} variant="outlined" sx={{ color: '#90caf9', borderColor: '#444' }}>
              Copy Report
            </Button>
            <Button
              startIcon={<FaWhatsapp />}
              onClick={handleShareWhatsApp}
              variant="contained"
              sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1DA851' }, color: '#fff' }}
            >
              Share via WhatsApp
            </Button>
            <Button startIcon={<MdRefresh />} onClick={onRegenerate} variant="outlined" sx={{ color: '#90caf9', borderColor: '#444' }}>
              Regenerate
            </Button>
            <Button onClick={onClose} variant="contained" color="primary">
              Close
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

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