// src/components/AIInsightButton.jsx
import { useState } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import { MdPsychology } from 'react-icons/md';
import api from '../api/api';
import AIInsightDialog from './AIInsightDialog';

const AIInsightButton = ({
  title = "Deep AI Executive Analysis",
  endpoint = "/ai/deep-weekly-analysis",
  size = "medium",
  color = "#00e5ff"
}) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });

      setInsights(data.analysis || "No insights generated.");
      setDialogOpen(true);
    } catch (error) {
      console.error("AI Analysis Error:", error);
      setInsights(
        error.response?.data?.error ||
        "Failed to connect to AI engine. Please try again later."
      );
      setDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => setDialogOpen(false);
  const handleRegenerate = () => {
    setInsights(null);
    handleAnalyze();
  };

  return (
    <>
      <Tooltip title="Deep AI Executive Insights" arrow placement="top">
        <IconButton
          onClick={handleAnalyze}
          disabled={loading}
          size={size}
          sx={{
            color,
            ml: 1,
            '&:hover': { backgroundColor: 'rgba(0, 229, 255, 0.15)' },
          }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : <MdPsychology size={26} />}
        </IconButton>
      </Tooltip>

      <AIInsightDialog
        open={dialogOpen}
        onClose={handleClose}
        insights={insights}
        title={title}
        onRegenerate={handleRegenerate}
      />
    </>
  );
};

export default AIInsightButton;