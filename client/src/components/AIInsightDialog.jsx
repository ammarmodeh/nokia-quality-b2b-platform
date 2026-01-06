// src/components/AIInsightDialog.jsx
import { useState, useRef, useEffect } from 'react';
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
  Stack,
  Link,
  TextField,
  CircularProgress,
} from '@mui/material';
import {
  MdClose,
  MdContentCopy,
  MdRefresh,
  MdPsychology,
  MdOpenInNew,
  MdPictureAsPdf,
  MdChat,
  MdSend,
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import api from '../api/api';

// === OFFICIAL FIELD TEAM RESOURCES (2025) ===
const shredWithFieldTeams = [
  // ... (Your resource list remains unchanged)
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
    href: "https://drive.google.com/file/d/1vn3uGGRIWxmwPIvWgEA0F4uQdFZHSUn3/view?usp=drive_link",
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

// Component updated to accept 'api' as a prop
const AIInsightDialog = ({ open, onClose, insights, title, onRegenerate, metadata }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // === NEW CHAT STATE ===
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, chatOpen]);
  // === END CHAT STATE ===

  const reportUrl = `${window.location.origin}/dashboard`;
  const whatsappText = encodeURIComponent(
    `OrangeJO FTTH Project Report\n\n${insights?.substring(0, 800)}...\n\nView full report: ${reportUrl}`
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

  // === CHAT SEND HANDLER (Logic Unchanged) ===
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    const newHistory = [...chatHistory, { sender: 'user', text: userMessage }];
    setChatHistory(newHistory);

    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Authentication token not found. Please log in.");
      }

      const response = await api.post(
        '/ai/chat',
        {
          reportContext: insights,
          userQuery: userMessage,
          chatHistory: newHistory.filter(msg => msg.sender === 'user').map(msg => msg.text)
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      setChatHistory(prev => [
        ...prev,
        { sender: 'ai', text: response.data.chatResponse || "Sorry, I couldn't process that request." }
      ]);

    } catch (error) {
      console.error('Chat failed:', error);

      let errorMsg = "Failed to get a response from the AI.";

      if (error.response?.status === 503) {
        errorMsg = "AI Service is temporarily busy/overloaded. Please wait a moment and try sending your question again.";
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }

      setChatHistory(prev => [
        ...prev,
        { sender: 'ai', text: `Error: ${errorMsg}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };
  // === END CHAT SEND HANDLER ===


  // === DOWNLOAD HANDLER (Logic Unchanged) ===
  const handleDownload = async (format) => {
    setSnackbar({ open: true, message: `Generating ${format.toUpperCase()} report...`, severity: 'info' });

    try {
      const endpoint = '/ai/report/download';
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Authentication token not found. Please log in.");
      }

      const response = await api.post(
        endpoint,
        {
          reportContent: insights,
          format: format,
          title: title || 'QoS Executive Report'
        },
        {
          responseType: 'blob',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const blob = new Blob([response.data], { type: response.headers['content-type'] });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let filename = `${(title || 'QoS_Report').replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: `${format.toUpperCase()} report successfully generated!`, severity: 'success' });

    } catch (error) {
      console.error('Download failed:', error);
      const errorMsg = error.response?.data?.error || error.message || "Unknown error.";
      setSnackbar({
        open: true,
        message: `Download failed: ${errorMsg}`,
        severity: 'error'
      });
    }
  };
  // === END DOWNLOAD HANDLER ===


  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #141414 0%, #ffffff 100%)',
            color: '#ffffff',
            border: '1px solid #f3f4f6',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          }
        }}
      >
        {/* Header: Centered horizontally with max-width */}
        <Box sx={{ mx: 'auto', width: '100%' }}>
          <DialogTitle sx={{ bgcolor: '#00e5ff15', borderBottom: '1px solid #f3f4f6', py: 1.5, px: 3 }}> {/* Reduced padding */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}> {/* Reduced Typography variant */}
                <MdPsychology size={22} color="#00e5ff" /> {/* Reduced icon size */}
                {title || "QoS Executive Report"}
              </Typography>
              <IconButton onClick={onClose} sx={{ color: '#aaa', p: 0.5 }}> {/* Reduced padding */}
                <MdClose size={20} /> {/* Reduced icon size */}
              </IconButton>
            </Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} mt={1}>
              {metadata && (
                <Typography variant="caption" color="#00e5ff" mt={0.5}> {/* Reduced Typography variant/margin */}
                  Generated on {metadata.generatedAt} • Period: {metadata.period || 'YTD'} • {metadata.totalCases} cases analyzed
                </Typography>
              )}
              {/* Chat Toggle Button */}
              <Button
                size="small" // Small button size
                startIcon={<MdChat size={16} />}
                onClick={() => setChatOpen(!chatOpen)}
                variant="outlined"
                sx={{
                  color: chatOpen ? '#dc3545' : '#00e5ff',
                  borderColor: chatOpen ? '#dc3545' : '#00e5ff',
                  '&:hover': {
                    borderColor: chatOpen ? '#dc3545' : '#00e5ff',
                    bgcolor: chatOpen ? '#dc354510' : '#00e5ff10'
                  },
                  mr: 1, // Reduced margin
                  p: '4px 10px' // Custom padding for smaller look
                }}
              >
                {chatOpen ? 'Hide Chat' : 'Ask AI'}
              </Button>
            </Stack>
          </DialogTitle>
        </Box>

        {/* Content: Constrained to max-width and centered */}
        <Box
          sx={{
            // maxWidth: 'lg',
            mx: 'auto',
            width: '100%',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}
        >
          <DialogContent sx={{ px: { xs: 1, sm: 3 }, py: 2, display: 'flex', flexDirection: 'column', flexGrow: 1 }}> {/* Reduced padding */}

            <Box display="flex" flexGrow={1} minHeight={0}>
              {/* Main Report Content (Always Visible) */}
              <Box
                flexGrow={1}
                sx={{
                  pr: chatOpen ? 2 : 0,
                  width: chatOpen ? '65%' : '100%',
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #f3f4f6',
                    borderRadius: 1, // Reduced border radius
                    p: { xs: 1.5, sm: 2 }, // Reduced padding
                    height: chatOpen ? '50vh' : '60vh',
                    flexGrow: 1,
                    overflowY: 'auto',
                    fontSize: '0.9rem', // Reduced overall font size
                    lineHeight: 1.6, // Reduced line height slightly
                    '& h1, & h2, & h3': {
                      color: '#00e5ff',
                      mt: 2, mb: 1, fontWeight: 600, // Reduced margins
                      borderBottom: '1px dashed #e5e7eb', pb: 0.5 // Reduced padding
                    },
                    // Specific text size reduction for the Markdown content
                    '& h1': { fontSize: '1.5rem' },
                    '& h2': { fontSize: '1.25rem' },
                    '& h3': { fontSize: '1.1rem' },
                    '& strong': { color: '#ffffff', fontWeight: 700 },
                    '& ul, & ol': { pl: 2.5, my: 1.5 }, // Reduced padding/margin
                    '& li': { mb: 0.5 }, // Reduced margin
                    '& table': { width: '100%', borderCollapse: 'collapse', my: 1.5, fontSize: '0.85rem' }, // Reduced size
                    '& th, & td': { border: '1px solid #3d3d3d', p: 1, textAlign: 'left' }, // Reduced padding
                    '& th': { backgroundColor: '#2d2d2d' }
                  }}
                >
                  <Typography component="div" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {insights || 'Generating insights...'}
                  </Typography>
                </Box>
              </Box>

              {/* === AI CHAT PANEL === */}
              <Box
                sx={{
                  width: chatOpen ? '35%' : '0',
                  ml: chatOpen ? 2 : 0,
                  overflow: 'hidden',
                  transition: 'width 0.3s ease, margin 0.3s ease',
                  display: chatOpen ? 'flex' : 'none',
                  flexDirection: 'column',
                  borderLeft: '1px solid #f3f4f6',
                  pl: 2,
                }}
              >
                <Typography variant="subtitle1" color="#00e5ff" mb={1} fontWeight={600}> {/* Reduced Typography variant */}
                  Report Q&A
                </Typography>

                {/* Chat History Area */}
                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    mb: 1, // Reduced margin
                    p: 1,
                    background: '#2d2d2d',
                    borderRadius: 1,
                    border: '1px solid #3d3d3d',
                  }}
                >
                  {chatHistory.length === 0 ? (
                    <Typography color="#777" p={1.5} textAlign="center" variant="caption"> {/* Reduced Typography variant/padding */}
                      Ask me about any term, metric, or implication in the report!
                    </Typography>
                  ) : (
                    chatHistory.map((message, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                          mb: 0.5, // Reduced margin
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '80%',
                            p: 0.8, // Reduced padding
                            borderRadius: 1, // Reduced border radius
                            bgcolor: message.sender === 'user' ? '#00e5ff20' : '#414142ff',
                            color: message.sender === 'user' ? '#fff' : '#ccc',
                            fontSize: '0.8rem', // Reduced font size
                          }}
                        >
                          {message.text}
                        </Box>
                      </Box>
                    ))
                  )}
                  {chatLoading && (
                    <Box display="flex" justifyContent="flex-start" mt={0.5}>
                      <CircularProgress size={18} color="primary" sx={{ color: '#00e5ff' }} /> {/* Reduced size */}
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Chat Input */}
                <form onSubmit={handleSendMessage} style={{ display: 'flex', width: '100%' }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Inquire about the report..."
                    size="small" // Small size
                    sx={{
                      mr: 1,
                      '& .MuiOutlinedInput-root': {
                        color: '#ffffff',
                        '& fieldset': { borderColor: '#555' },
                        '&:hover fieldset': { borderColor: '#00e5ff' },
                        '&.Mui-focused fieldset': { borderColor: '#00e5ff' },
                      },
                      // The size="small" prop handles the internal padding
                    }}
                    disabled={chatLoading}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="small" // Small button size
                    startIcon={<MdSend size={16} />}
                    disabled={!chatInput.trim() || chatLoading}
                    sx={{ bgcolor: '#00e5ff', '&:hover': { bgcolor: '#00c3d9' } }}
                  >
                    Send
                  </Button>
                </form>
              </Box>
            </Box>

            {/* === FIELD TEAM RESOURCES === */}
            <Box mt={3}> {/* Reduced margin */}
              <Typography variant="h6" color="#00e5ff" mb={1} fontWeight={600} fontSize="1.1rem"> {/* Reduced Typography variant/size */}
                Field Team Resources & Training Materials
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                  gap: 1, // Reduced gap
                  maxHeight: '100px', // Further reduced height
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
                      display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#252525', color: '#ccc',
                      p: 1.5, borderRadius: 1, border: '1px solid #3d3d3d', transition: 'all 0.2s', // Reduced padding/radius
                      '&:hover': { bgcolor: '#303030', borderColor: '#00e5ff', color: '#ffffff', transform: 'translateY(-1px)', boxShadow: '0 2px 6px rgba(0,229,255,0.15)' }, // Reduced transform/shadow
                    }}
                  >
                    <MdOpenInNew size={16} color="#00e5ff" /> {/* Reduced icon size */}
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}> {/* Reduced Typography size */}
                      {resource.title}
                    </Typography>
                  </Link>
                ))}
              </Box>
            </Box>

          </DialogContent>
        </Box>

        {/* Footer: Centered horizontally with max-width */}
        <Box sx={{ mx: 'auto', width: '100%' }}>
          <DialogActions sx={{
            borderTop: '1px solid #f3f4f6',
            py: 1.5, // Reduced padding
            px: 3, // Reduced padding
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5 // Reduced gap
          }}>
            <Typography variant="caption" color="#777" flexGrow={1}> {/* Reduced Typography variant */}
              Powered by Gemini 2.5 Flash • OrangeJO-Nokia FTTH Quality Team
            </Typography>
            <Stack direction="row" spacing={1}> {/* Reduced spacing */}
              {/* PDF DOWNLOAD BUTTON */}
              <Button
                size="small" // Small button size
                startIcon={<MdPictureAsPdf size={16} />}
                onClick={() => handleDownload('pdf')}
                variant="contained"
                sx={{
                  bgcolor: '#dc3545',
                  '&:hover': { bgcolor: '#c82333' },
                  color: '#ffffff'
                }}
                disabled={!insights}
              >
                Download PDF
              </Button>

              <Button size="small" startIcon={<MdContentCopy size={16} />} onClick={handleCopy} variant="outlined" sx={{ color: '#90caf9', borderColor: '#3d3d3d' }}>
                Copy Report
              </Button>
              <Button
                size="small"
                startIcon={<FaWhatsapp size={16} />}
                onClick={handleShareWhatsApp}
                variant="contained"
                sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1DA851' }, color: '#ffffff' }}
              >
                Share via WhatsApp
              </Button>
              <Button size="small" startIcon={<MdRefresh size={16} />} onClick={onRegenerate} variant="outlined" sx={{ color: '#90caf9', borderColor: '#3d3d3d' }}>
                Regenerate
              </Button>
              <Button onClick={onClose} variant="contained" color="primary" size="small">
                Close
              </Button>
            </Stack>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={handleSnackbarClose} variant="filled" sx={{ fontSize: '0.9rem', py: 0.5 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AIInsightDialog;