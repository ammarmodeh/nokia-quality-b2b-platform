// src/components/ActionPlanDialog.jsx
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
  MdAssignment,
  MdOpenInNew,
  MdPictureAsPdf,
  MdChat,
  MdSend,
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import api from '../api/api';

const ActionPlanDialog = ({ open, onClose, plan, title, onRegenerate, metadata }) => {
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
    `Nokia Quality Action Plan\n\n${plan?.substring(0, 800)}...\n\nView details: ${reportUrl}`
  );
  const whatsappLink = `https://wa.me/?text=${whatsappText}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(plan || '');
    setSnackbar({ open: true, message: 'Action Plan copied to clipboard!', severity: 'success' });
  };

  const handleShareWhatsApp = () => {
    window.open(whatsappLink, '_blank');
    setSnackbar({ open: true, message: 'Opening WhatsApp...', severity: 'info' });
  };

  const handleSnackbarClose = () => setSnackbar({ ...snackbar, open: false });

  // === CHAT SEND HANDLER ===
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
          reportContext: plan,
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
        errorMsg = "AI Service is temporarily busy. Please try again.";
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      setChatHistory(prev => [
        ...prev,
        { sender: 'ai', text: `Error: ${errorMsg}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // === DOWNLOAD HANDLER ===
  const handleDownload = async (format) => {
    setSnackbar({ open: true, message: `Generating ${format.toUpperCase()} action plan...`, severity: 'info' });

    try {
      const endpoint = '/ai/report/download';
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Authentication token not found. Please log in.");
      }

      const response = await api.post(
        endpoint,
        {
          reportContent: plan,
          format: format,
          title: title || 'Action Plan'
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
      let filename = `Action_Plan_${new Date().toISOString().slice(0, 10)}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match && match.length === 2) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: `${format.toUpperCase()} downloaded successfully!`, severity: 'success' });

    } catch (error) {
      console.error('Download failed:', error);
      setSnackbar({ open: true, message: 'Download failed.', severity: 'error' });
    }
  };

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
        <Box sx={{ mx: 'auto', width: '100%' }}>
          <DialogTitle sx={{ bgcolor: '#00e5ff15', borderBottom: '1px solid #f3f4f6', py: 1.5, px: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <MdAssignment size={22} color="#00e5ff" />
                {title || "Comprehensive Action Plan"}
              </Typography>
              <IconButton onClick={onClose} sx={{ color: '#aaa', p: 0.5 }}>
                <MdClose size={20} />
              </IconButton>
            </Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} mt={1}>
              {metadata && (
                <Typography variant="caption" color="#00e5ff" mt={0.5}>
                  Generated on {new Date().toLocaleDateString()} • {metadata.totalCases} Violations Identified • {metadata.period}
                </Typography>
              )}
              <Button
                size="small"
                startIcon={<MdChat size={16} />}
                onClick={() => setChatOpen(!chatOpen)}
                variant="outlined"
                sx={{
                  color: chatOpen ? '#dc3545' : '#00e5ff',
                  borderColor: chatOpen ? '#dc3545' : '#00e5ff',
                  p: '4px 10px'
                }}
              >
                {chatOpen ? 'Hide Chat' : 'Ask AI'}
              </Button>
            </Stack>
          </DialogTitle>
        </Box>

        <Box sx={{ mx: 'auto', width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <DialogContent sx={{ px: { xs: 1, sm: 3 }, py: 2, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>

            <Box display="flex" flexGrow={1} minHeight={0}>
              <Box
                flexGrow={1}
                sx={{
                  pr: chatOpen ? 2 : 0,
                  width: chatOpen ? '65%' : '100%',
                  transition: 'width 0.3s ease',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #f3f4f6',
                    borderRadius: 1,
                    p: { xs: 1.5, sm: 2 },
                    height: chatOpen ? '50vh' : '65vh',
                    flexGrow: 1,
                    overflowY: 'auto',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    '& h1, & h2, & h3': { color: '#00e5ff', mt: 2, mb: 1, fontWeight: 600, borderBottom: '1px dashed #e5e7eb', pb: 0.5 },
                    '& strong': { color: '#ffffff', fontWeight: 700 },
                    '& table': { width: '100%', borderCollapse: 'collapse', my: 1.5 },
                    '& th, & td': { border: '1px solid #3d3d3d', p: 1, textAlign: 'left' },
                    '& th': { backgroundColor: '#2d2d2d' }
                  }}
                >
                  <Typography component="div" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {plan || 'Generating Action Plan...'}
                  </Typography>
                </Box>
              </Box>

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
                <Typography variant="subtitle1" color="#00e5ff" mb={1} fontWeight={600}>Action Plan Q&A</Typography>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 1, p: 1, background: '#2d2d2d', borderRadius: 1, border: '1px solid #3d3d3d' }}>
                  {chatHistory.map((msg, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', mb: 0.5 }}>
                      <Box sx={{ maxWidth: '80%', p: 0.8, borderRadius: 1, bgcolor: msg.sender === 'user' ? '#00e5ff20' : '#414142ff', color: msg.sender === 'user' ? '#fff' : '#ccc', fontSize: '0.8rem' }}>
                        {msg.text}
                      </Box>
                    </Box>
                  ))}
                  {chatLoading && <CircularProgress size={18} sx={{ color: '#00e5ff' }} />}
                  <div ref={messagesEndRef} />
                </Box>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', width: '100%' }}>
                  <TextField fullWidth value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask about the plan..." size="small" sx={{ mr: 1, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#555' } } }} disabled={chatLoading} />
                  <Button type="submit" variant="contained" size="small" sx={{ bgcolor: '#00e5ff', '&:hover': { bgcolor: '#00c3d9' } }}>Send</Button>
                </form>
              </Box>
            </Box>
          </DialogContent>
        </Box>

        <Box sx={{ mx: 'auto', width: '100%' }}>
          <DialogActions sx={{ borderTop: '1px solid #f3f4f6', py: 1.5, px: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
            <Typography variant="caption" color="#777" flexGrow={1}>Powered by Gemini 2.5 Flash</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" startIcon={<MdPictureAsPdf size={16} />} onClick={() => handleDownload('pdf')} variant="contained" sx={{ bgcolor: '#dc3545', color: '#fff' }} disabled={!plan}>PDF</Button>
              <Button size="small" startIcon={<MdAssignment size={16} />} onClick={() => handleDownload('docx')} variant="contained" sx={{ bgcolor: '#007bff', color: '#fff' }} disabled={!plan}>Word</Button>
              <Button size="small" startIcon={<MdContentCopy size={16} />} onClick={handleCopy} variant="outlined" sx={{ color: '#90caf9', borderColor: '#3d3d3d' }}>Copy</Button>
              <Button size="small" startIcon={<FaWhatsapp size={16} />} onClick={handleShareWhatsApp} variant="contained" sx={{ bgcolor: '#25D366', color: '#fff' }}>Share</Button>
              <Button size="small" startIcon={<MdRefresh size={16} />} onClick={onRegenerate} variant="outlined" sx={{ color: '#90caf9', borderColor: '#3d3d3d' }}>Regenerate</Button>
              <Button onClick={onClose} variant="contained" color="primary" size="small">Close</Button>
            </Stack>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={handleSnackbarClose} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

export default ActionPlanDialog;
