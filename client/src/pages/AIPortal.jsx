import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Paper, CircularProgress, Divider, Avatar } from '@mui/material';
import { MdPsychology, MdSend, MdAutoAwesome } from 'react-icons/md';
import api from '../api/api';
import { useSelector } from 'react-redux';

const AIPortal = () => {
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const handleGenerateInsights = async () => {
    setLoadingInsights(true);
    try {
      const { data } = await api.post('/ai/insights', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      setInsights(data.insights);
    } catch (error) {
      console.error("Error fetching insights:", error);
      setInsights("Failed to generate insights. Please try again later.");
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const newMessage = { role: 'user', text: chatMessage };
    setChatHistory((prev) => [...prev, newMessage]);
    setChatMessage('');
    setLoadingChat(true);

    try {
      const { data } = await api.post('/ai/chat', { message: newMessage.text }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      const botResponse = { role: 'model', text: data.reply };
      setChatHistory((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Error sending message:", error);
      setChatHistory((prev) => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', backgroundColor: '#121212', color: '#fff' }}>
      <Typography variant="h4" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, color: '#90caf9' }}>
        <MdPsychology size={40} /> AI Portal <Typography variant="caption" sx={{ color: 'gray' }}>(Powered by Gemini)</Typography>
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>

        {/* Insights Section */}
        <Paper sx={{ p: 3, backgroundColor: '#1e1e1e', color: '#fff', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <MdAutoAwesome color="#ffeb3b" /> Strategic Insights
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: '#aaa' }}>
            Generate an AI-powered executive summary of your current operations, highlighting risks and opportunities.
          </Typography>

          <Button
            variant="contained"
            onClick={handleGenerateInsights}
            disabled={loadingInsights}
            sx={{ mb: 3, backgroundColor: '#3f51b5' }}
          >
            {loadingInsights ? <CircularProgress size={24} color="inherit" /> : "Generate Insights"}
          </Button>

          {insights && (
            <Box sx={{ p: 2, backgroundColor: '#252525', borderRadius: 1, border: '1px solid #444' }}>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>{insights}</Typography>
            </Box>
          )}
        </Paper>

        {/* Chat Section */}
        <Paper sx={{ p: 3, backgroundColor: '#1e1e1e', color: '#fff', borderRadius: 2, display: 'flex', flexDirection: 'column', height: '600px' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>AI Assistant Chat</Typography>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, p: 2, backgroundColor: '#252525', borderRadius: 1 }}>
            {chatHistory.length === 0 && (
              <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', mt: 4 }}>
                Ask me anything about your tasks, teams, or performance stats.
              </Typography>
            )}
            {chatHistory.map((msg, index) => (
              <Box key={index} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', mb: 2 }}>
                <Box sx={{
                  maxWidth: '80%',
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: msg.role === 'user' ? '#3f51b5' : '#333',
                  color: '#fff'
                }}>
                  <Typography variant="body2">{msg.text}</Typography>
                </Box>
              </Box>
            ))}
            {loadingChat && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#333' }}>
                  <CircularProgress size={20} />
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your question..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              sx={{
                backgroundColor: '#252525',
                input: { color: '#fff' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                }
              }}
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={loadingChat || !chatMessage.trim()}
              sx={{ backgroundColor: '#3f51b5' }}
            >
              <MdSend />
            </Button>
          </Box>
        </Paper>

      </Box>
    </Box>
  );
};

export default AIPortal;
