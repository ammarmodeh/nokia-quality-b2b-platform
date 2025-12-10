// src/components/AIInsightButton.jsx
import { useState } from 'react';
import { IconButton, Tooltip, CircularProgress, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
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
  const [anchorEl, setAnchorEl] = useState(null);

  // Custom Range State
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Persistence for regeneration
  const [lastPeriod, setLastPeriod] = useState('ytd');
  const [lastCustomDates, setLastCustomDates] = useState(null);

  const endpoint = `${import.meta.env.VITE_BACKEND_URL}/api/ai/deep-weekly-analysis`

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleAnalyze = async (period, customDates = null) => {
    handleCloseMenu();

    // Store for regeneration
    setLastPeriod(period);
    setLastCustomDates(customDates);

    setLoading(true);
    try {
      const payload = { period, ...customDates };
      const { data } = await api.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });

      setData(data); // Contains analysis + metadata
      setDialogOpen(true);
    } catch (error) {
      setData({
        analysis: error.response?.data?.error || error.message || "Failed to generate report. Please try again.",
        metadata: { generatedAt: new Date().toLocaleString() }
      });
      setDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => setDialogOpen(false);
  const handleRegenerate = () => {
    setData(null);
    handleAnalyze(lastPeriod, lastCustomDates);
  };

  return (
    <>
      <Tooltip title="AI Executive Report Options" arrow>
        <IconButton
          onClick={handleClick}
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

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          style: {
            backgroundColor: '#2d2d2d',
            color: '#ffffff',
            border: '1px solid #3d3d3d'
          },
        }}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        <MenuItem onClick={() => handleAnalyze('ytd')} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>YTD Report</MenuItem>
        <MenuItem onClick={() => handleAnalyze('last_month')} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>Last Month</MenuItem>
        <MenuItem onClick={() => handleAnalyze('current_month')} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>Current Month</MenuItem>
        <MenuItem onClick={() => handleAnalyze('last_week')} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>Last Week</MenuItem>
        <MenuItem onClick={() => handleAnalyze('current_week')} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>Current Week</MenuItem>
        <MenuItem onClick={() => { handleCloseMenu(); setCustomRangeOpen(true); }} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>Custom Range...</MenuItem>
      </Menu>

      {data && (
        <AIInsightDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          insights={data.analysis}
          metadata={data.metadata}
          title={title}
          onRegenerate={handleRegenerate}
        />
      )}

      <Dialog open={customRangeOpen} onClose={() => setCustomRangeOpen(false)}>
        <DialogTitle>Select Custom Date Range</DialogTitle>
        <DialogContent>
          <TextField
            label="Start Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            sx={{ mb: 2, mt: 2 }}
          />
          <TextField
            label="End Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomRangeOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setCustomRangeOpen(false);
              handleAnalyze('custom', { startDate, endDate });
            }}
            variant="contained"
            disabled={!startDate || !endDate}
          >
            Analyze
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AIInsightButton;