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
  CircularProgress
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import {
  startOfYear,
  endOfYear,
  eachWeekOfInterval,
} from 'date-fns';

import api from '../api/api';

// Memoized Row to prevent unnecessary re-renders of the entire table
const WeekRow = React.memo(({ row, index, onChange }) => {
  // Common input style to mimic the previous look but lightweight
  const inputStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: '#fff',
    textAlign: 'center',
    fontSize: '0.875rem',
    outline: 'none',
    padding: '4px 0',
    borderBottom: '1px solid transparent' // Placeholder for focus state if needed
  };

  // Conditional styling for thresholds
  const getPromoterColor = (val) => {
    if (val === '') return '#fff';
    const num = parseFloat(val);
    return num >= 75 ? '#4caf50' : '#fff'; // Green if >= 75%
  };

  const getDetractorColor = (val) => {
    if (val === '') return '#fff';
    const num = parseFloat(val);
    return num <= 9 ? '#4caf50' : '#f44336'; // Green if <= 9%, Red if > 9%
  };

  const handleInputChange = (field, value) => {
    onChange(index, field, value);
  };

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
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if the row data specifically changes
  // This is critical for typing performance
  const prevRow = prevProps.row;
  const nextRow = nextProps.row;

  return (
    prevRow.promoters === nextRow.promoters &&
    prevRow.detractors === nextRow.detractors &&
    prevRow.nps === nextRow.nps &&
    prevRow.itnRelated === nextRow.itnRelated &&
    prevRow.itnRelatedPercent === nextRow.itnRelatedPercent &&
    prevRow.sampleSize === nextRow.sampleSize &&
    prevRow.note === nextRow.note
  );
});

const SamplesTokenDialog = ({ open, onClose }) => {
  const [weeksData, setWeeksData] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Generate years for select (e.g., last year, this year, next year)
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Initialize weeks and load data from API
  useEffect(() => {
    if (!open) return;

    const fetchSamples = async () => {
      try {
        console.log(`🔍 Fetching samples for year: ${selectedYear}`);
        const response = await api.get(`/samples-token/${selectedYear}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        });

        console.log('📦 API Response:', response);
        console.log('📊 Saved Samples Data:', response.data);

        const savedSamples = response.data || [];
        console.log(`✅ Found ${savedSamples.length} saved samples`);

        const start = startOfYear(new Date(selectedYear, 0, 1));
        const end = endOfYear(new Date(selectedYear, 11, 31));
        const weeksInYear = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });
        console.log(`📅 Total weeks in ${selectedYear}: ${weeksInYear.length}`);

        const initializedData = weeksInYear.map((weekStart, index) => {
          const weekNum = index + 1;
          const savedWeek = savedSamples.find(s => s.weekNumber === weekNum) || {};

          if (Object.keys(savedWeek).length > 0) {
            console.log(`Week ${weekNum} data:`, savedWeek);
          }

          return {
            weekStart,
            weekNum,
            weekKey: `W${weekNum}`,
            promoters: savedWeek.promoters ?? '',
            detractors: savedWeek.detractors ?? '',
            nps: savedWeek.npsRelated ?? '',
            itnRelated: savedWeek.itnRelated ?? '',
            itnRelatedPercent: savedWeek.itnRelatedPercent ?? '',
            sampleSize: savedWeek.sampleSize ?? '',
            note: savedWeek.note ?? ''
          };
        });

        console.log('🎯 Initialized weeks data:', initializedData.slice(0, 3)); // Log first 3 weeks
        setWeeksData(initializedData);
        setMounted(true);
      } catch (error) {
        console.error('❌ Error fetching samples:', error);
        console.error('Error details:', error.response?.data || error.message);
        // Fallback to empty data
        const start = startOfYear(new Date(selectedYear, 0, 1));
        const end = endOfYear(new Date(selectedYear, 11, 31));
        const weeksInYear = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });
        const emptyData = weeksInYear.map((weekStart, index) => ({
          weekStart,
          weekNum: index + 1,
          weekKey: `W${index + 1}`,
          promoters: '',
          detractors: '',
          nps: '',
          itnRelated: '',
          itnRelatedPercent: '',
          sampleSize: '',
          note: ''
        }));
        console.log('📝 Using empty data fallback');
        setWeeksData(emptyData);
        setMounted(true);
      }
    };

    fetchSamples();
  }, [open, selectedYear]);

  // Save data to API
  useEffect(() => {
    if (!mounted || weeksData.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        const samples = weeksData
          .filter(row => row.promoters !== '' || row.detractors !== '' || row.sampleSize !== '')
          .map(row => ({
            year: selectedYear,
            weekNumber: row.weekNum,
            weekRange: `Week ${row.weekNum}`,
            sampleSize: parseFloat(row.sampleSize) || 0,
            promoters: parseFloat(row.promoters) || 0,
            detractors: parseFloat(row.detractors) || 0,
            npsRelated: parseFloat(row.nps) || 0,
            itnRelated: parseFloat(row.itnRelated) || 0
          }));

        if (samples.length > 0) {
          await api.post('/samples-token/bulk',
            { samples },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`
              }
            }
          );
          console.log('✅ Samples saved to database');
        }
      } catch (error) {
        console.error('Error saving samples:', error);
      }
    }, 500); // Debounce save

    return () => clearTimeout(timer);
  }, [weeksData, mounted, selectedYear]);

  const handleCellChange = useCallback((index, field, value) => {
    setWeeksData(prevData => {
      const newData = [...prevData];
      const row = { ...newData[index] };

      // Update the direct field
      row[field] = value;

      // Calculations
      const p = parseFloat(row.promoters) || 0;
      const d = parseFloat(row.detractors) || 0;
      const itn = parseFloat(row.itnRelated) || 0;
      const size = parseFloat(row.sampleSize) || 0;

      // NPS Calculation
      if (field === 'promoters' || field === 'detractors') {
        // re-evaluate p and d as they might have been the changed field
        const newP = field === 'promoters' ? (parseFloat(value) || 0) : (parseFloat(row.promoters) || 0);
        const newD = field === 'detractors' ? (parseFloat(value) || 0) : (parseFloat(row.detractors) || 0);

        // Check existence of string value to decide whether to clear or calc
        const pStr = field === 'promoters' ? value : row.promoters;
        const dStr = field === 'detractors' ? value : row.detractors;

        if (pStr !== '' && dStr !== '') {
          row.nps = (newP - newD);
        } else {
          row.nps = '';
        }
      }

      // ITN Related % Calculation
      if (field === 'itnRelated' || field === 'sampleSize') {
        const newItn = field === 'itnRelated' ? (parseFloat(value) || 0) : (parseFloat(row.itnRelated) || 0);
        const newSize = field === 'sampleSize' ? (parseFloat(value) || 0) : (parseFloat(row.sampleSize) || 0);

        const itnStr = field === 'itnRelated' ? value : row.itnRelated;
        const sizeStr = field === 'sampleSize' ? value : row.sampleSize;

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

  // Manual save function
  const handleManualSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const samples = weeksData
        .filter(row => row.promoters !== '' || row.detractors !== '' || row.sampleSize !== '')
        .map(row => ({
          year: selectedYear,
          weekNumber: row.weekNum,
          weekRange: `Week ${row.weekNum}`,
          sampleSize: parseFloat(row.sampleSize) || 0,
          promoters: parseFloat(row.promoters) || 0,
          detractors: parseFloat(row.detractors) || 0,
          npsRelated: parseFloat(row.nps) || 0,
          itnRelated: parseFloat(row.itnRelated) || 0
        }));

      if (samples.length > 0) {
        await api.post('/samples-token/bulk',
          { samples },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`
            }
          }
        );
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Error saving samples:', error);
      alert('Failed to save samples. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1e1e1e', // Dark mode background
          color: '#ffffff',
          minHeight: '80vh'
        }
      }}
    >
      <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
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
                '&:after': { borderBottomColor: '#7b68ee' }
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
              '&:hover': {
                backgroundColor: saveSuccess ? '#45a049' : '#1565c0'
              },
              minWidth: '100px'
            }}
          >
            {saving ? (
              <CircularProgress size={20} sx={{ color: '#fff' }} />
            ) : saveSuccess ? (
              '✓ Saved'
            ) : (
              'Save'
            )}
          </Button>
          <IconButton onClick={onClose} sx={{ color: '#9e9e9e' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
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
      </DialogContent>
    </Dialog>
  );
};

export default SamplesTokenDialog;
