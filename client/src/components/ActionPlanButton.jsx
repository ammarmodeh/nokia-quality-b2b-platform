// src/components/ActionPlanButton.jsx
import { useState } from 'react';
import { IconButton, Tooltip, CircularProgress, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { MdAssignment, MdPlaylistAddCheck } from 'react-icons/md';
import api from '../api/api';
import ActionPlanDialog from './ActionPlanDialog';

const ActionPlanButton = ({
  title = "Generate Action Plan",
  size = "medium",
  color = "var(--text)"
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // Custom Range State
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Persistence
  const [lastPeriod, setLastPeriod] = useState('last_week');
  const [lastCustomDates, setLastCustomDates] = useState(null);

  const endpoint = `/action-plan`;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleAnalyze = async (period, customDates = null) => {
    handleCloseMenu();
    setLastPeriod(period);
    setLastCustomDates(customDates);
    setLoading(true);

    try {
      const payload = { period, ...customDates };
      const { data } = await api.post(endpoint, payload);

      setData(data);
      setDialogOpen(true);
    } catch (error) {
      setData({
        plan: error.response?.data?.error || error.message || "Failed to generate action plan. Please try again.",
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
      <Tooltip title="Generate Comprehensive Action Plan" arrow>
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
          {loading ? <CircularProgress size={22} /> : <MdPlaylistAddCheck size={28} />}
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          style: {
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)'
          },
        }}
      >
        <MenuItem onClick={() => handleAnalyze('last_week')} sx={{ '&:hover': { backgroundColor: 'var(--surface-hover)' } }}>Last Week</MenuItem>
        <MenuItem onClick={() => handleAnalyze('current_week')} sx={{ '&:hover': { backgroundColor: 'var(--surface-hover)' } }}>Current Week</MenuItem>
        <MenuItem onClick={() => handleAnalyze('last_month')} sx={{ '&:hover': { backgroundColor: 'var(--surface-hover)' } }}>Last Month</MenuItem>
        <MenuItem onClick={() => handleAnalyze('current_month')} sx={{ '&:hover': { backgroundColor: 'var(--surface-hover)' } }}>Current Month</MenuItem>
        <MenuItem onClick={() => { handleCloseMenu(); setCustomRangeOpen(true); }} sx={{ '&:hover': { backgroundColor: 'var(--surface-hover)' } }}>Custom Range...</MenuItem>
      </Menu>

      {data && (
        <ActionPlanDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          plan={data.plan}
          metadata={data.metadata}
          title={title}
          onRegenerate={handleRegenerate}
        />
      )}

      <Dialog open={customRangeOpen} onClose={() => setCustomRangeOpen(false)}>
        <DialogTitle>Select Action Plan Period</DialogTitle>
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
            Generate Plan
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ActionPlanButton;
