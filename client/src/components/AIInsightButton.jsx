// src/components/AIInsightButton.jsx
import { useState } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import { MdPsychology } from 'react-icons/md';
import api from '../api/api';
import AIInsightDialog from './AIInsightDialog';

const AIInsightButton = ({
  title = "Deep AI Executive Analysis",
  size = "medium",
  color = "#ffffff"
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const endpoint = `${import.meta.env.VITE_BACKEND_URL}/api/ai/deep-weekly-analysis`

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });

      setData(data); // Contains analysis + metadata
      setDialogOpen(true);
    } catch (error) {
      setData({
        analysis: error.response?.data?.error || "Failed to generate report. Please try again.",
        metadata: { generatedAt: new Date().toLocaleString() }
      });
      setDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => setDialogOpen(false);
  const handleRegenerate = () => {
    setData(null);
    handleAnalyze();
  };

  return (
    <>
      <Tooltip title="AI Executive Report" arrow>
        <IconButton
          onClick={handleAnalyze}
          disabled={loading}
          size={size}
          sx={{
            color,
            background: loading ? 'rgba(0,229,255,0.1)' : 'transparent',
            '&:hover': { backgroundColor: 'rgba(0, 229, 255, 0.2)' },
            boxShadow: loading ? '0 0 10px rgba(0,229,255,0.4)' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? <CircularProgress size={22} /> : <MdPsychology size={28} />}
        </IconButton>
      </Tooltip>

      {data && (
        <AIInsightDialog
          open={dialogOpen}
          onClose={handleClose}
          insights={data.analysis}
          metadata={data.metadata}
          title={title}
          onRegenerate={handleRegenerate}
        />
      )}
    </>
  );
};

export default AIInsightButton;