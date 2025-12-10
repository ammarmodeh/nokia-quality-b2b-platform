import { useState } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import { MdPsychology } from 'react-icons/md';
import api from '../api/api';
import AIInsightDialog from './AIInsightDialog';

const AIAnalysisButton = ({
  data,
  title = "AI Analysis",
  context = "",
  chartType = "Table/Chart",
  size = "medium",
  color = "#ffffff"
}) => {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [metadata, setMetadata] = useState(null);

  const endpoint = '/ai/analyze-chart';

  const handleAnalyze = async () => {
    if (!data) return;

    setLoading(true);
    try {
      const response = await api.post(endpoint, {
        data,
        title,
        context,
        chartType
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });

      setAnalysisResult(response.data.analysis);
      setMetadata({
        generatedAt: new Date().toLocaleString(),
        totalCases: Array.isArray(data) ? data.length : Object.keys(data).length // Rough estimate of data size
      });
      setDialogOpen(true);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setAnalysisResult(error.response?.data?.message || "Failed to generate analysis.");
      setMetadata({ generatedAt: new Date().toLocaleString() });
      setDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => setDialogOpen(false);

  const handleRegenerate = () => {
    setAnalysisResult(null);
    handleAnalyze();
  };

  return (
    <>
      <Tooltip title="Generate AI Report" arrow>
        <span>
          <IconButton
            onClick={handleAnalyze}
            disabled={loading || !data}
            size={size}
            sx={{
              color,
              background: loading ? 'rgba(0,229,255,0.1)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(0, 229, 255, 0.2)' },
              boxShadow: loading ? '0 0 10px rgba(0,229,255,0.4)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? <CircularProgress size={22} sx={{ color: '#00e5ff' }} /> : <MdPsychology size={28} />}
          </IconButton>
        </span>
      </Tooltip>

      {analysisResult && (
        <AIInsightDialog
          open={dialogOpen}
          onClose={handleClose}
          insights={analysisResult}
          metadata={metadata}
          title={title}
          onRegenerate={handleRegenerate}
        />
      )}
    </>
  );
};

export default AIAnalysisButton;
