import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Select,
  MenuItem,
  FormControl,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  Stack
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import {
  startOfYear,
  endOfYear,
  eachWeekOfInterval
} from 'date-fns';

import api from '../api/api';
import { getCustomWeekNumber } from '../utils/helpers';

// Month 1=101, Month 2=102 ... Month 12=112
const MONTH_WEEK_OFFSET = 100;

const MONTHS = [
  { month: 1,  name: 'January' },
  { month: 2,  name: 'February' },
  { month: 3,  name: 'March' },
  { month: 4,  name: 'April' },
  { month: 5,  name: 'May' },
  { month: 6,  name: 'June' },
  { month: 7,  name: 'July' },
  { month: 8,  name: 'August' },
  { month: 9,  name: 'September' },
  { month: 10, name: 'October' },
  { month: 11, name: 'November' },
  { month: 12, name: 'December' },
];

// ─── Memoized Week Row ──────────────────────────────────────────────────────
const WeekRow = React.memo(({ row, index, onChange }) => {
  const inputStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: '#fff',
    textAlign: 'center',
    fontSize: '0.875rem',
    outline: 'none',
    padding: '4px 0',
    borderBottom: '1px solid transparent'
  };

  const getPromoterColor = (val) => {
    if (val === '') return '#fff';
    return parseFloat(val) >= 75 ? '#4caf50' : '#fff';
  };

  const getDetractorColor = (val) => {
    if (val === '') return '#fff';
    const num = parseFloat(val);
    return num <= 9 ? '#4caf50' : '#f44336';
  };

  const handleInputChange = (field, value) => onChange(index, field, value);

  return (
    <TableRow hover sx={{ '&:hover': { backgroundColor: '#333' } }}>
      <TableCell sx={{ color: '#ccc', borderBottom: '1px solid #333', py: 1, px: 2 }}>
        week {row.weekNum}
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid #333', p: 0 }}>
        <input
          style={{ ...inputStyle, color: getPromoterColor(row.promoters), fontWeight: parseFloat(row.promoters) >= 75 ? 'bold' : 'normal' }}
          value={row.promoters}
          onChange={(e) => handleInputChange('promoters', e.target.value)}
          type="number"
          placeholder="%"
        />
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid #333', p: 0 }}>
        <input
          style={{ ...inputStyle, color: getDetractorColor(row.detractors), fontWeight: parseFloat(row.detractors) > 9 ? 'bold' : 'normal' }}
          value={row.detractors}
          onChange={(e) => handleInputChange('detractors', e.target.value)}
          type="number"
          placeholder="%"
        />
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid #333', color: '#fff', textAlign: 'center', py: 1 }}>
        {row.nps}
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid #333', p: 0 }}>
        <input
          style={inputStyle}
          value={row.itnRelated}
          onChange={(e) => handleInputChange('itnRelated', e.target.value)}
          type="number"
        />
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid #333', color: '#fff', textAlign: 'center', py: 1 }}>
        {row.itnRelatedPercent ? `${row.itnRelatedPercent}%` : ''}
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid #333', p: 0 }}>
        <input
          style={inputStyle}
          value={row.sampleSize}
          onChange={(e) => handleInputChange('sampleSize', e.target.value)}
          type="number"
        />
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid #333', p: 0 }}>
        <input
          style={{ ...inputStyle, textAlign: 'left', paddingLeft: '8px' }}
          value={row.note}
          onChange={(e) => handleInputChange('note', e.target.value)}
          type="text"
        />
      </TableCell>
    </TableRow>
  );
}, (prev, next) => {
  const p = prev.row, n = next.row;
  return (
    p.promoters === n.promoters &&
    p.detractors === n.detractors &&
    p.nps === n.nps &&
    p.itnRelated === n.itnRelated &&
    p.itnRelatedPercent === n.itnRelatedPercent &&
    p.sampleSize === n.sampleSize &&
    p.note === n.note
  );
});

// ─── Main Component ─────────────────────────────────────────────────────────
const SamplesTokenDialog = ({ open, onClose }) => {
  const [tab, setTab] = useState(0);
  const [weeksData, setWeeksData] = useState([]);
  const [monthlyTotals, setMonthlyTotals] = useState(
    MONTHS.map(m => ({ ...m, totalSamples: '' }))
  );
  const [mounted, setMounted] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [settings, setSettings] = useState(null);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        setSettings(response.data);
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  // ── Fetch & initialize data ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const fetchSamples = async () => {
      try {
        const response = await api.get(`/samples-token/${selectedYear}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });

        const savedSamples = response.data || [];

        // ── Weekly rows ────────────────────────────────────────────────────
        const start = startOfYear(new Date(selectedYear, 0, 1));
        const end   = endOfYear(new Date(selectedYear, 11, 31));
        const weekStartDay = settings?.weekStartDay || 0;
        const weeksInYear = eachWeekOfInterval({ start, end }, { weekStartsOn: weekStartDay });

        const weekRecords = savedSamples.filter(s => s.weekNumber < MONTH_WEEK_OFFSET);
        const initializedData = weeksInYear.map((weekStart) => {
          const weekNum = getCustomWeekNumber(weekStart, selectedYear, settings || {});
          const saved = weekRecords.find(s => s.weekNumber === weekNum) || {};
          return {
            weekStart,
            weekNum,
            weekKey: `W${weekNum}`,
            promoters:        saved.promoters        ?? '',
            detractors:       saved.detractors       ?? '',
            nps:              saved.npsRelated        ?? '',
            itnRelated:       saved.itnRelated        ?? '',
            itnRelatedPercent: saved.itnRelatedPercent ?? '',
            sampleSize:       saved.sampleSize        ?? '',
            note:             saved.note              ?? ''
          };
        });

        setWeeksData(initializedData);

        // ── Monthly totals ─────────────────────────────────────────────────
        const monthRecords = savedSamples.filter(
          s => s.weekNumber >= MONTH_WEEK_OFFSET + 1 && s.weekNumber <= MONTH_WEEK_OFFSET + 12
        );
        setMonthlyTotals(
          MONTHS.map(m => {
            const rec = monthRecords.find(s => s.weekNumber === MONTH_WEEK_OFFSET + m.month);
            return { ...m, totalSamples: rec?.sampleSize ?? '' };
          })
        );

        setMounted(true);
      } catch (error) {
        console.error('Error fetching samples:', error);
        // Fallback: empty data
        const start = startOfYear(new Date(selectedYear, 0, 1));
        const end   = endOfYear(new Date(selectedYear, 11, 31));
        const weekStartDay = settings?.weekStartDay || 0;
        const weeksInYear = eachWeekOfInterval({ start, end }, { weekStartsOn: weekStartDay });
        const emptyData = weeksInYear.map((weekStart) => ({
          weekStart,
          weekNum: getCustomWeekNumber(weekStart, selectedYear, settings || {}),
          weekKey: `W${getCustomWeekNumber(weekStart, selectedYear, settings || {})}`,
          promoters: '', detractors: '', nps: '',
          itnRelated: '', itnRelatedPercent: '', sampleSize: '', note: ''
        }));
        setWeeksData(emptyData);
        setMonthlyTotals(MONTHS.map(m => ({ ...m, totalSamples: '' })));
        setMounted(true);
      }
    };

    fetchSamples();
  }, [open, selectedYear, settings]);

  // ── Week cell change handler ────────────────────────────────────────────
  const handleCellChange = useCallback((index, field, value) => {
    setWeeksData(prevData => {
      const newData = [...prevData];
      const row = { ...newData[index] };
      row[field] = value;

      if (field === 'promoters' || field === 'detractors') {
        const newP = field === 'promoters'   ? (parseFloat(value) || 0) : (parseFloat(row.promoters)  || 0);
        const newD = field === 'detractors'  ? (parseFloat(value) || 0) : (parseFloat(row.detractors) || 0);
        const pStr = field === 'promoters'   ? value : row.promoters;
        const dStr = field === 'detractors'  ? value : row.detractors;
        row.nps = (pStr !== '' && dStr !== '') ? (newP - newD) : '';
      }

      if (field === 'itnRelated' || field === 'sampleSize') {
        const newItn  = field === 'itnRelated'  ? (parseFloat(value) || 0) : (parseFloat(row.itnRelated)  || 0);
        const newSize = field === 'sampleSize'  ? (parseFloat(value) || 0) : (parseFloat(row.sampleSize) || 0);
        const itnStr  = field === 'itnRelated'  ? value : row.itnRelated;
        const sizeStr = field === 'sampleSize'  ? value : row.sampleSize;
        if (itnStr !== '' && sizeStr !== '' && newSize !== 0) {
          row.itnRelatedPercent = Math.round((newItn / newSize) * 100);
        } else {
          row.itnRelatedPercent = '';
        }
      }

      newData[index] = row;
      return newData;
    });
  }, []);

  // ── Monthly total change handler ────────────────────────────────────────
  const handleMonthlyChange = useCallback((monthIdx, value) => {
    setMonthlyTotals(prev => {
      const next = [...prev];
      next[monthIdx] = { ...next[monthIdx], totalSamples: value };
      return next;
    });
  }, []);

  // ── Grand total (sum of all monthly totals entered) ─────────────────────
  const grandMonthlyTotal = useMemo(() =>
    monthlyTotals.reduce((sum, m) => sum + (parseFloat(m.totalSamples) || 0), 0),
    [monthlyTotals]
  );

  // ── Save ────────────────────────────────────────────────────────────────
  const handleManualSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const weeklySamples = weeksData
        .filter(row => row.promoters !== '' || row.detractors !== '' || row.sampleSize !== '')
        .map(row => ({
          year: selectedYear,
          weekNumber: row.weekNum,
          weekRange: `Week ${row.weekNum}`,
          startDate: row.weekStart,
          endDate: new Date(new Date(row.weekStart).getTime() + 6 * 24 * 60 * 60 * 1000),
          sampleSize:  parseFloat(row.sampleSize)  || 0,
          promoters:   parseFloat(row.promoters)   || 0,
          detractors:  parseFloat(row.detractors)  || 0,
          npsRelated:  parseFloat(row.nps)         || 0,
          itnRelated:  parseFloat(row.itnRelated)  || 0
        }));

      // Monthly total records: weekNumber = 100 + month
      const monthlySamples = monthlyTotals
        .filter(m => m.totalSamples !== '')
        .map(m => ({
          year: selectedYear,
          weekNumber: MONTH_WEEK_OFFSET + m.month,   // 101–112
          weekRange: m.name,
          sampleSize: parseFloat(m.totalSamples) || 0,
          promoters: 0,
          detractors: 0,
          npsRelated: 0,
          itnRelated: 0
        }));

      const allSamples = [...weeklySamples, ...monthlySamples];

      if (allSamples.length > 0) {
        await api.post('/samples-token/bulk',
          { samples: allSamples },
          { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
        );
        setSaveSuccess(true);
        // Dispatch event so Dashboard refetches samplesData
        window.dispatchEvent(new Event('dashboard-refresh'));
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (error) {
      console.error('Error saving samples:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          minHeight: '80vh'
        }
      }}
    >
      {/* ── Header ── */}
      <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" component="div">Samples Token (Weekly)</Typography>
          <FormControl size="small" variant="standard" sx={{ minWidth: 80 }}>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              sx={{
                color: '#fff',
                '.MuiSelect-icon': { color: '#fff' },
                '&:before': { borderBottomColor: '#aaa' },
                '&:after':  { borderBottomColor: '#7b68ee' }
              }}
            >
              {years.map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            onClick={handleManualSave}
            disabled={saving}
            sx={{
              backgroundColor: saveSuccess ? '#4caf50' : '#1976d2',
              '&:hover': { backgroundColor: saveSuccess ? '#45a049' : '#1565c0' },
              minWidth: '100px'
            }}
          >
            {saving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : saveSuccess ? '✓ Saved' : 'Save'}
          </Button>
          <IconButton onClick={onClose} sx={{ color: '#9e9e9e' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* ── Tabs ── */}
      <Box sx={{ borderBottom: '1px solid #333', backgroundColor: '#252525' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          TabIndicatorProps={{ style: { backgroundColor: '#7b68ee' } }}
          sx={{
            '& .MuiTab-root': { color: '#aaa', textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: '#fff' }
          }}
        >
          <Tab label="📊 Weekly Data" />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📅 Monthly Totals
                {grandMonthlyTotal > 0 && (
                  <Chip
                    label={grandMonthlyTotal.toLocaleString()}
                    size="small"
                    sx={{ backgroundColor: '#7b68ee33', color: '#7b68ee', fontWeight: 'bold', height: 18, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0 }}>

        {/* ══ TAB 0: Weekly Data ══════════════════════════════════════════ */}
        {tab === 0 && (
          <TableContainer component={Paper} sx={{ backgroundColor: 'transparent', backgroundImage: 'none', boxShadow: 'none' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: '#2d2d2d', color: '#fff', fontWeight: 'bold' }}>Week#</TableCell>
                  <TableCell sx={{ backgroundColor: '#90EE90', color: '#000', fontWeight: 'bold' }}>Promoters (%) (&ge;75%)</TableCell>
                  <TableCell sx={{ backgroundColor: '#FF6347', color: '#fff', fontWeight: 'bold' }}>Detractors (%) (&le;9%)</TableCell>
                  <TableCell sx={{ backgroundColor: '#FFFFE0', color: '#000', fontWeight: 'bold' }}>NPS</TableCell>
                  <TableCell sx={{ backgroundColor: '#FFFFE0', color: '#000', fontWeight: 'bold' }}>ITN Related</TableCell>
                  <TableCell sx={{ backgroundColor: '#FFFFE0', color: '#000', fontWeight: 'bold' }}>ITN Related%</TableCell>
                  <TableCell sx={{ backgroundColor: '#D3D3D3', color: '#000', fontWeight: 'bold' }}>Sample Size</TableCell>
                  <TableCell sx={{ backgroundColor: '#FFFFE0', color: '#000', fontWeight: 'bold', width: '30%' }}>Note</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {weeksData.map((row, index) => (
                  <WeekRow
                    key={row.weekKey}
                    row={row}
                    index={index}
                    onChange={handleCellChange}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ══ TAB 1: Monthly Totals ════════════════════════════════════════ */}
        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" sx={{ color: '#aaa', mb: 2, lineHeight: 1.7 }}>
              Enter the <strong style={{ color: '#fff' }}>official monthly total samples</strong> for each month.
              When NPS Performance is filtered by <strong style={{ color: '#7b68ee' }}>Month</strong>, it will use these values
              instead of summing weekly sample sizes.
            </Typography>

            <TableContainer component={Paper} sx={{ backgroundColor: '#2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ backgroundColor: '#333', color: '#aaa', fontWeight: 'bold', width: 160 }}>Month</TableCell>
                    <TableCell sx={{ backgroundColor: '#333', color: '#aaa', fontWeight: 'bold' }}>
                      Total Monthly Samples
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#333', color: '#aaa', fontWeight: 'bold', width: 120, textAlign: 'center' }}>
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthlyTotals.map((m, idx) => {
                    const val = parseFloat(m.totalSamples) || 0;
                    const hasData = m.totalSamples !== '';
                    return (
                      <TableRow
                        key={m.month}
                        hover
                        sx={{
                          '&:hover': { backgroundColor: '#333' },
                          backgroundColor: idx % 2 === 0 ? '#252525' : '#2a2a2a'
                        }}
                      >
                        <TableCell sx={{ color: '#e0e0e0', fontWeight: 600, py: 1.5, fontSize: '0.9rem' }}>
                          {m.name}
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <input
                            type="number"
                            min="0"
                            value={m.totalSamples}
                            onChange={(e) => handleMonthlyChange(idx, e.target.value)}
                            placeholder="Enter total samples…"
                            style={{
                              background: '#1e1e1e',
                              border: `1px solid ${hasData ? '#7b68ee' : '#444'}`,
                              borderRadius: 6,
                              color: hasData ? '#fff' : '#666',
                              fontSize: '0.9rem',
                              fontWeight: hasData ? 600 : 400,
                              padding: '6px 12px',
                              outline: 'none',
                              width: '100%',
                              maxWidth: 240,
                              transition: 'border-color 0.2s'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', py: 1 }}>
                          {hasData ? (
                            <Chip
                              label={`${val.toLocaleString()} samples`}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                fontWeight: 'bold',
                                border: '1px solid #10b981',
                                fontSize: '0.72rem'
                              }}
                            />
                          ) : (
                            <Typography variant="caption" sx={{ color: '#555' }}>Not set</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Grand Total Banner */}
            {grandMonthlyTotal > 0 && (
              <Stack
                direction="row"
                justifyContent="flex-end"
                alignItems="center"
                spacing={1.5}
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: 'rgba(123, 104, 238, 0.1)',
                  border: '1px solid rgba(123, 104, 238, 0.3)'
                }}
              >
                <Typography variant="body2" sx={{ color: '#aaa' }}>Year Total (all months entered):</Typography>
                <Typography variant="h6" sx={{ color: '#7b68ee', fontWeight: 800 }}>
                  {grandMonthlyTotal.toLocaleString()} samples
                </Typography>
              </Stack>
            )}
          </Box>
        )}

      </DialogContent>
    </Dialog>
  );
};

export default SamplesTokenDialog;
