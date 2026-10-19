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
  Stack,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Groups as GroupsIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
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
  { month: 1,  name: 'January',   short: 'Jan' },
  { month: 2,  name: 'February',  short: 'Feb' },
  { month: 3,  name: 'March',     short: 'Mar' },
  { month: 4,  name: 'April',     short: 'Apr' },
  { month: 5,  name: 'May',       short: 'May' },
  { month: 6,  name: 'June',      short: 'Jun' },
  { month: 7,  name: 'July',      short: 'Jul' },
  { month: 8,  name: 'August',    short: 'Aug' },
  { month: 9,  name: 'September', short: 'Sep' },
  { month: 10, name: 'October',   short: 'Oct' },
  { month: 11, name: 'November',  short: 'Nov' },
  { month: 12, name: 'December',  short: 'Dec' },
];

// ─── Memoized Week Row ──────────────────────────────────────────────────────
const WeekRow = React.memo(({ row, index, onChange }) => {
  const inputStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: 'var(--text)',
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
    <TableRow hover sx={{ '&:hover': { backgroundColor: 'var(--surface-hover)' } }}>
      <TableCell sx={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', py: 1, px: 2 }}>
        week {row.weekNum}
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid var(--border)', p: 0 }}>
        <input
          style={{ ...inputStyle, color: getPromoterColor(row.promoters), fontWeight: parseFloat(row.promoters) >= 75 ? 'bold' : 'normal' }}
          value={row.promoters}
          onChange={(e) => handleInputChange('promoters', e.target.value)}
          type="number"
          placeholder="%"
        />
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid var(--border)', p: 0 }}>
        <input
          style={{ ...inputStyle, color: getDetractorColor(row.detractors), fontWeight: parseFloat(row.detractors) > 9 ? 'bold' : 'normal' }}
          value={row.detractors}
          onChange={(e) => handleInputChange('detractors', e.target.value)}
          type="number"
          placeholder="%"
        />
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid var(--border)', color: 'var(--text)', textAlign: 'center', py: 1 }}>
        {row.nps}
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid var(--border)', p: 0 }}>
        <input
          style={inputStyle}
          value={row.itnRelated}
          onChange={(e) => handleInputChange('itnRelated', e.target.value)}
          type="number"
        />
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid var(--border)', color: 'var(--text)', textAlign: 'center', py: 1 }}>
        {row.itnRelatedPercent ? `${row.itnRelatedPercent}%` : ''}
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid var(--border)', p: 0 }}>
        <input
          style={inputStyle}
          value={row.sampleSize}
          onChange={(e) => handleInputChange('sampleSize', e.target.value)}
          type="number"
        />
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid var(--border)', p: 0 }}>
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
  
  // Team Monthly Samples State
  const [fieldTeams, setFieldTeams] = useState([]);
  const [teamMonthlyData, setTeamMonthlyData] = useState({}); // { [monthNum]: { [teamName]: sampleSize } }
  const [selectedTeamMonth, setSelectedTeamMonth] = useState(new Date().getMonth() + 1);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  // Daily Online Data State
  const [dailyOnlineData, setDailyOnlineData] = useState({}); // { [dateStr 'YYYY-MM-DD']: { onlineSamples: '', note: '' } }
  const [selectedOnlineMonth, setSelectedOnlineMonth] = useState(new Date().getMonth() + 1);
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  
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

    const fetchAllData = async () => {
      try {
        // Fetch field teams, weekly/monthly samples, team samples, and daily online in parallel
        const [samplesRes, teamSamplesRes, fieldTeamsRes, dailyOnlineRes] = await Promise.all([
          api.get(`/samples-token/${selectedYear}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch(err => ({ data: [] })),
          api.get(`/samples-token/team-samples/${selectedYear}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch(err => ({ data: [] })),
          api.get('/field-teams/get-field-teams', {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch(err => ({ data: [] })),
          api.get(`/samples-token/daily-online/${selectedYear}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch(err => ({ data: [] }))
        ]);

        const savedSamples = samplesRes.data || [];
        const savedTeamSamples = teamSamplesRes.data || [];
        const teamsList = fieldTeamsRes.data || [];
        const savedDailyOnline = dailyOnlineRes.data || [];

        setFieldTeams(teamsList);

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

        // ── Team monthly data ──────────────────────────────────────────────
        const initialTeamData = {};
        for (let m = 1; m <= 12; m++) {
          initialTeamData[m] = {};
        }

        savedTeamSamples.forEach(item => {
          if (item.month >= 1 && item.month <= 12 && item.teamName) {
            initialTeamData[item.month][item.teamName] = item.sampleSize ?? '';
          }
        });

        setTeamMonthlyData(initialTeamData);

        // ── Daily Online & Samples data ───────────────────────────────────
        const initialDailyData = {};
        savedDailyOnline.forEach(item => {
          if (item.date) {
            initialDailyData[item.date] = {
              onlineSamples: (item.onlineSamples !== undefined && item.onlineSamples !== null) ? item.onlineSamples : '',
              samplesToken: (item.samplesToken !== undefined && item.samplesToken !== null) ? item.samplesToken : '',
              note: item.note || ''
            };
          }
        });
        setDailyOnlineData(initialDailyData);

        setMounted(true);
      } catch (error) {
        console.error('Error fetching data:', error);
        setMounted(true);
      }
    };

    fetchAllData();
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

  // ── Team sample change handler ──────────────────────────────────────────
  const handleTeamSampleChange = useCallback((monthNum, teamName, value) => {
    setTeamMonthlyData(prev => {
      const updatedMonth = { ...(prev[monthNum] || {}) };
      if (value === '') {
        delete updatedMonth[teamName];
      } else {
        updatedMonth[teamName] = value;
      }
      return {
        ...prev,
        [monthNum]: updatedMonth
      };
    });
  }, []);

  // ── Daily Online & Samples change handler ───────────────────────────────
  const handleDailyOnlineChange = useCallback((dateStr, field, value) => {
    setDailyOnlineData(prev => {
      const existing = prev[dateStr] || { onlineSamples: '', samplesToken: '', note: '' };
      return {
        ...prev,
        [dateStr]: {
          ...existing,
          [field]: value
        }
      };
    });
  }, []);

  // Quick fill all days with Online Volume in active month
  const handleFillMonthDailyOnline = (val) => {
    if (val === '' || isNaN(Number(val))) return;
    const numDays = new Date(selectedYear, selectedOnlineMonth, 0).getDate();
    setDailyOnlineData(prev => {
      const next = { ...prev };
      for (let d = 1; d <= numDays; d++) {
        const dateStr = `${selectedYear}-${String(selectedOnlineMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const existing = next[dateStr] || { onlineSamples: '', samplesToken: '', note: '' };
        next[dateStr] = {
          ...existing,
          onlineSamples: val
        };
      }
      return next;
    });
  };

  // Quick fill all days with Samples Token in active month
  const handleFillMonthDailySamplesToken = (val) => {
    if (val === '' || isNaN(Number(val))) return;
    const numDays = new Date(selectedYear, selectedOnlineMonth, 0).getDate();
    setDailyOnlineData(prev => {
      const next = { ...prev };
      for (let d = 1; d <= numDays; d++) {
        const dateStr = `${selectedYear}-${String(selectedOnlineMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const existing = next[dateStr] || { onlineSamples: '', samplesToken: '', note: '' };
        next[dateStr] = {
          ...existing,
          samplesToken: val
        };
      }
      return next;
    });
  };

  // Quick clear all days in active month
  const handleClearMonthDailyOnline = () => {
    if (window.confirm(`Clear all daily entries for ${MONTHS[selectedOnlineMonth - 1].name}?`)) {
      const numDays = new Date(selectedYear, selectedOnlineMonth, 0).getDate();
      setDailyOnlineData(prev => {
        const next = { ...prev };
        for (let d = 1; d <= numDays; d++) {
          const dateStr = `${selectedYear}-${String(selectedOnlineMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          delete next[dateStr];
        }
        return next;
      });
    }
  };

  // ── Grand total (sum of all monthly totals entered) ─────────────────────
  const grandMonthlyTotal = useMemo(() =>
    monthlyTotals.reduce((sum, m) => sum + (parseFloat(m.totalSamples) || 0), 0),
    [monthlyTotals]
  );

  // ── Transfer July Samples to August Handler ─────────────────────────────
  const handleTransferJulToAug = useCallback(() => {
    const julMap = teamMonthlyData[7] || {};
    const julCount = Object.keys(julMap).filter(k => julMap[k] !== '' && julMap[k] !== null && julMap[k] !== undefined).length;
    if (julCount === 0) {
      alert('No team samples found in July (Month 7) to transfer.');
      return;
    }

    if (window.confirm(`Are you sure you want to transfer all ${julCount} team sample entries from July to August? (July entries will be cleared and August will be populated)`)) {
      setTeamMonthlyData(prev => {
        const next = { ...prev };
        next[8] = { ...(next[8] || {}), ...julMap };
        next[7] = {};
        return next;
      });
      setSelectedTeamMonth(8);
      alert('Successfully transferred July team samples to August! Please click the green "Save" button to save these changes to the database.');
    }
  }, [teamMonthlyData]);

  // ── Team monthly totals and grand total ─────────────────────────────────
  const teamMonthTotals = useMemo(() => {
    const totals = {};
    for (let m = 1; m <= 12; m++) {
      const monthObj = teamMonthlyData[m] || {};
      totals[m] = Object.values(monthObj).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    }
    return totals;
  }, [teamMonthlyData]);

  const grandTeamSamplesTotal = useMemo(() => {
    return Object.values(teamMonthTotals).reduce((sum, val) => sum + val, 0);
  }, [teamMonthTotals]);

  // Filtered teams list based on search query
  const filteredFieldTeams = useMemo(() => {
    if (!teamSearchQuery.trim()) return fieldTeams;
    const q = teamSearchQuery.toLowerCase();
    return fieldTeams.filter(t => (t.teamName || '').toLowerCase().includes(q));
  }, [fieldTeams, teamSearchQuery]);

  // ── Daily Online & Samples Month Totals and Grand Total ─────────────────
  const dailyOnlineMonthTotals = useMemo(() => {
    const totals = {};
    for (let m = 1; m <= 12; m++) {
      const numDays = new Date(selectedYear, m, 0).getDate();
      let mSum = 0;
      for (let d = 1; d <= numDays; d++) {
        const dateStr = `${selectedYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const val = parseFloat(dailyOnlineData[dateStr]?.onlineSamples);
        if (!isNaN(val)) mSum += val;
      }
      totals[m] = mSum;
    }
    return totals;
  }, [selectedYear, dailyOnlineData]);

  const dailySamplesTokenMonthTotals = useMemo(() => {
    const totals = {};
    for (let m = 1; m <= 12; m++) {
      const numDays = new Date(selectedYear, m, 0).getDate();
      let mSum = 0;
      for (let d = 1; d <= numDays; d++) {
        const dateStr = `${selectedYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const val = parseFloat(dailyOnlineData[dateStr]?.samplesToken);
        if (!isNaN(val)) mSum += val;
      }
      totals[m] = mSum;
    }
    return totals;
  }, [selectedYear, dailyOnlineData]);

  const grandDailyOnlineTotal = useMemo(() => {
    return Object.values(dailyOnlineMonthTotals).reduce((sum, v) => sum + v, 0);
  }, [dailyOnlineMonthTotals]);

  const grandDailySamplesTokenTotal = useMemo(() => {
    return Object.values(dailySamplesTokenMonthTotals).reduce((sum, v) => sum + v, 0);
  }, [dailySamplesTokenMonthTotals]);

  // Days list for the active online month
  const daysInSelectedOnlineMonth = useMemo(() => {
    const numDays = new Date(selectedYear, selectedOnlineMonth, 0).getDate();
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let d = 1; d <= numDays; d++) {
      const dateObj = new Date(selectedYear, selectedOnlineMonth - 1, d);
      const dateStr = `${selectedYear}-${String(selectedOnlineMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = dayNames[dateObj.getDay()];
      const isWeekend = dateObj.getDay() === 5 || dateObj.getDay() === 6;
      const rec = dailyOnlineData[dateStr] || { onlineSamples: '', samplesToken: '', note: '' };
      days.push({
        day: d,
        dateStr,
        dayOfWeek,
        isWeekend,
        onlineSamples: rec.onlineSamples ?? '',
        samplesToken: rec.samplesToken ?? '',
        note: rec.note ?? ''
      });
    }

    if (!onlineSearchQuery.trim()) return days;
    const q = onlineSearchQuery.toLowerCase();
    return days.filter(day =>
      day.dateStr.includes(q) ||
      day.dayOfWeek.toLowerCase().includes(q) ||
      String(day.day).includes(q) ||
      (day.note || '').toLowerCase().includes(q)
    );
  }, [selectedYear, selectedOnlineMonth, dailyOnlineData, onlineSearchQuery]);

  // ── Save ────────────────────────────────────────────────────────────────
  const handleManualSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Weekly samples
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

      // 2. Monthly total records: weekNumber = 100 + month
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

      const allGeneralSamples = [...weeklySamples, ...monthlySamples];

      // 3. Team monthly sample records
      const teamSamplesToSave = [];
      MONTHS.forEach(m => {
        const monthNum = m.month;
        const monthMap = teamMonthlyData[monthNum] || {};
        fieldTeams.forEach(ft => {
          const teamName = ft.teamName;
          const val = monthMap[teamName];
          teamSamplesToSave.push({
            year: selectedYear,
            month: monthNum,
            teamName: teamName,
            teamId: ft._id || undefined,
            sampleSize: (val !== undefined && val !== null && val !== '') ? (parseFloat(val) || 0) : 0
          });
        });
      });

      // 4. Daily Online & Daily Samples Token
      const dailyOnlineToSave = [];
      for (let m = 1; m <= 12; m++) {
        const numDays = new Date(selectedYear, m, 0).getDate();
        for (let d = 1; d <= numDays; d++) {
          const dateStr = `${selectedYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const rec = dailyOnlineData[dateStr];
          if (rec && (rec.onlineSamples !== '' || rec.samplesToken !== '' || rec.note !== '')) {
            dailyOnlineToSave.push({
              year: selectedYear,
              date: dateStr,
              month: m,
              day: d,
              onlineSamples: parseFloat(rec.onlineSamples) || 0,
              samplesToken: parseFloat(rec.samplesToken) || 0,
              note: rec.note || ''
            });
          }
        }
      }

      const promises = [];

      if (allGeneralSamples.length > 0) {
        promises.push(
          api.post('/samples-token/bulk',
            { samples: allGeneralSamples },
            { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
          )
        );
      }

      if (teamSamplesToSave.length > 0) {
        promises.push(
          api.post('/samples-token/team-samples/bulk',
            { samples: teamSamplesToSave },
            { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
          )
        );
      }

      if (dailyOnlineToSave.length > 0) {
        promises.push(
          api.post('/samples-token/daily-online/bulk',
            { samples: dailyOnlineToSave },
            { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
          )
        );
      }

      await Promise.all(promises);

      setSaveSuccess(true);
      // Dispatch event so Dashboard refetches samplesData
      window.dispatchEvent(new Event('dashboard-refresh'));
      setTimeout(() => setSaveSuccess(false), 2500);
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
          backgroundColor: 'var(--surface)',
          color: 'var(--text)',
          minHeight: '80vh'
        }
      }}
    >
      {/* ── Header ── */}
      <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" component="div">Samples Token</Typography>
          <FormControl size="small" variant="standard" sx={{ minWidth: 80 }}>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              sx={{
                color: 'var(--text)',
                '.MuiSelect-icon': { color: 'var(--text)' },
                '&:before': { borderBottomColor: '#aaa' },
                '&:after':  { borderBottomColor: 'var(--accent)' }
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
            {saving ? <CircularProgress size={20} sx={{ color: 'var(--text)' }} /> : saveSuccess ? '✓ Saved' : 'Save'}
          </Button>
          <IconButton onClick={onClose} sx={{ color: 'var(--text-muted)' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* ── Tabs ── */}
      <Box sx={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          TabIndicatorProps={{ style: { backgroundColor: 'var(--accent)' } }}
          sx={{
            '& .MuiTab-root': { color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: 'var(--text)' }
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
                    sx={{ backgroundColor: '#7b68ee33', color: 'var(--accent-text)', fontWeight: 'bold', height: 18, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                👥 Team Monthly Samples
                {grandTeamSamplesTotal > 0 && (
                  <Chip
                    label={grandTeamSamplesTotal.toLocaleString()}
                    size="small"
                    sx={{ backgroundColor: '#10b98133', color: '#10b981', fontWeight: 'bold', height: 18, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📅 Daily DVOC & Online Samples
                {grandDailySamplesTokenTotal > 0 && (
                  <Chip
                    label={`${grandDailySamplesTokenTotal.toLocaleString()} DVOC`}
                    size="small"
                    sx={{ backgroundColor: '#10b98133', color: '#34d399', fontWeight: 'bold', height: 18, fontSize: '0.65rem' }}
                  />
                )}
                {grandDailyOnlineTotal > 0 && (
                  <Chip
                    label={`${grandDailyOnlineTotal.toLocaleString()} Online`}
                    size="small"
                    sx={{ backgroundColor: '#06b6d433', color: '#38bdf8', fontWeight: 'bold', height: 18, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, overflowY: 'auto' }}>

        {/* ══ TAB 0: Weekly Data ══════════════════════════════════════════ */}
        {tab === 0 && (
          <TableContainer component={Paper} sx={{ backgroundColor: 'transparent', backgroundImage: 'none', boxShadow: 'none' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: 'var(--surface)', color: 'var(--text)', fontWeight: 'bold' }}>Week#</TableCell>
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
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2, lineHeight: 1.7 }}>
              Enter the <strong style={{ color: 'var(--text)' }}>official monthly total samples</strong> for each month.
              When NPS Performance is filtered by <strong style={{ color: 'var(--accent-text)' }}>Month</strong>, it will use these values
              instead of summing weekly sample sizes.
            </Typography>

            <TableContainer component={Paper} sx={{ backgroundColor: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: 160 }}>Month</TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                      Total Monthly Samples
                    </TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: 120, textAlign: 'center' }}>
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
                          '&:hover': { backgroundColor: 'var(--surface-hover)' },
                          backgroundColor: idx % 2 === 0 ? '#252525' : '#2a2a2a'
                        }}
                      >
                        <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, py: 1.5, fontSize: '0.9rem' }}>
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
                              background: 'var(--surface)',
                              border: `1px solid ${hasData ? 'var(--accent)' : 'var(--border)'}`,
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
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>Year Total (all months entered):</Typography>
                <Typography variant="h6" sx={{ color: 'var(--accent-text)', fontWeight: 800 }}>
                  {grandMonthlyTotal.toLocaleString()} samples
                </Typography>
              </Stack>
            )}
          </Box>
        )}

        {/* ══ TAB 2: Team Monthly Samples ═════════════════════════════════ */}
        {tab === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1.5, lineHeight: 1.7 }}>
                Enter the <strong style={{ color: 'var(--text)' }}>total sample token for each team</strong> per month.
                These team tokens are directly reflected in the <strong style={{ color: '#10b981' }}>NPS Analysis and Feedback</strong> Excel export,
                where non-accountable detractors and neutrals will be deducted from the sample tokens to compute final total samples, promoters, and NPS.
              </Typography>

              {/* Month Pills Navigation */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  overflowX: 'auto',
                  pb: 1,
                  pt: 0.5,
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-thumb': { backgroundColor: 'var(--surface-hover)', borderRadius: 3 }
                }}
              >
                {MONTHS.map(m => {
                  const isSelected = selectedTeamMonth === m.month;
                  const monthTotal = teamMonthTotals[m.month] || 0;
                  return (
                    <Button
                      key={m.month}
                      variant={isSelected ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setSelectedTeamMonth(m.month)}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        px: 1.8,
                        py: 0.8,
                        minWidth: 80,
                        backgroundColor: isSelected ? '#7b68ee' : '#252525',
                        borderColor: isSelected ? '#7b68ee' : '#444',
                        color: isSelected ? '#fff' : '#ccc',
                        '&:hover': {
                          backgroundColor: isSelected ? '#6a58de' : '#333',
                          borderColor: 'var(--accent)'
                        },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.2
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                        {m.short}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          color: isSelected ? '#e0d8ff' : monthTotal > 0 ? '#10b981' : '#666'
                        }}
                      >
                        {monthTotal > 0 ? `${monthTotal.toLocaleString()}s` : '0'}
                      </Typography>
                    </Button>
                  );
                })}
              </Box>
            </Box>

            {/* Controls Bar: Active Month Title, Search, and Month KPI */}
            <Paper
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: 'var(--surface)',
                borderRadius: 2,
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <GroupsIcon sx={{ color: 'var(--accent-text)', fontSize: 28 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--text)' }}>
                    {MONTHS.find(m => m.month === selectedTeamMonth)?.name} {selectedYear} — Team Samples
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                    {filteredFieldTeams.length} teams listed | {Object.keys(teamMonthlyData[selectedTeamMonth] || {}).length} configured
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleTransferJulToAug}
                  sx={{
                    color: '#f59e0b',
                    borderColor: '#f59e0b',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    height: 36,
                    px: 1.5,
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      borderColor: '#f59e0b'
                    }
                  }}
                >
                  🔄 Transfer Jul Samples → Aug
                </Button>

                <TextField
                  size="small"
                  placeholder="Search team…"
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'var(--text-muted)', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                    sx: {
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text)',
                      borderRadius: 2,
                      fontSize: '0.85rem',
                      '& fieldset': { borderColor: 'var(--border)' },
                      '&:hover fieldset': { borderColor: 'var(--accent)' },
                      '&.Mui-focused fieldset': { borderColor: 'var(--accent)' },
                      height: 36
                    }
                  }}
                  sx={{ width: 200 }}
                />

                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: '16px !important', color: '#10b981 !important' }} />}
                  label={`Month Total: ${(teamMonthTotals[selectedTeamMonth] || 0).toLocaleString()} samples`}
                  sx={{
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    fontWeight: 700,
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    height: 36,
                    fontSize: '0.8rem'
                  }}
                />
              </Box>
            </Paper>

            {/* Team Samples Table */}
            <TableContainer component={Paper} sx={{ backgroundColor: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: '60px' }}>#</TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: '220px' }}>Team Name</TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: '130px' }}>Team Code</TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: '130px' }}>Company</TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: '180px' }}>Monthly Sample Size</TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: '120px', textAlign: 'center' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredFieldTeams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'var(--text-muted)' }}>
                        {fieldTeams.length === 0 ? 'No field teams loaded from database.' : 'No teams found matching search.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFieldTeams.map((team, idx) => {
                      const curVal = (teamMonthlyData[selectedTeamMonth] || {})[team.teamName] ?? '';
                      const hasVal = curVal !== '' && curVal !== null && curVal !== undefined;
                      const numVal = parseFloat(curVal) || 0;
                      return (
                        <TableRow
                          key={team._id || team.teamName || idx}
                          hover
                          sx={{
                            '&:hover': { backgroundColor: 'var(--surface-hover)' },
                            backgroundColor: idx % 2 === 0 ? '#252525' : '#2a2a2a'
                          }}
                        >
                          <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600, py: 1 }}>
                            {idx + 1}
                          </TableCell>
                          <TableCell sx={{ color: 'var(--text)', fontWeight: 600, py: 1 }}>
                            {team.teamName}
                          </TableCell>
                          <TableCell sx={{ color: 'var(--text-secondary)', py: 1, fontSize: '0.82rem' }}>
                            {team.teamLeader || '—'}
                          </TableCell>
                          <TableCell sx={{ color: 'var(--text-secondary)', py: 1, fontSize: '0.82rem' }}>
                            {team.subcontractor || '—'}
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <input
                              type="number"
                              min="0"
                              value={curVal}
                              onChange={(e) => handleTeamSampleChange(selectedTeamMonth, team.teamName, e.target.value)}
                              placeholder="Sample size"
                              style={{
                                background: 'var(--surface)',
                                border: `1px solid ${hasVal ? '#10b981' : 'var(--border)'}`,
                                borderRadius: 4,
                                color: hasVal ? '#fff' : '#666',
                                fontSize: '0.85rem',
                                fontWeight: hasVal ? 700 : 400,
                                padding: '4px 8px',
                                outline: 'none',
                                width: '140px',
                                transition: 'border-color 0.2s'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', py: 1 }}>
                            {hasVal ? (
                              <Chip
                                label={`${numVal.toLocaleString()} samples`}
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
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Grand Total Summary Footer */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Year Grand Total Team Samples ({selectedYear}):</Typography>
                <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 800 }}>
                  {grandTeamSamplesTotal.toLocaleString()} team sample tokens across 12 months
                </Typography>
              </Box>

              <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Tip: Click "Save" at the top right to persist all weekly, monthly, and team monthly tokens.
              </Typography>
            </Stack>
          </Box>
        )}

        {/* ══ TAB 3: Daily Online & Samples Data ═══════════════════════════ */}
        {tab === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2, lineHeight: 1.7 }}>
              Enter the <strong style={{ color: '#38bdf8' }}>Daily Online transaction volume</strong> and the <strong style={{ color: '#10b981' }}>Daily Samples Taken (Token on PIS Basis)</strong> for each day.
              This allows correlating daily online volume with daily sample token size and actual DVOC incidents in the exported Excel sheet.
            </Typography>

            {/* Month Selection Bar */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5, p: 1.5, backgroundColor: 'var(--surface)', borderRadius: 2 }}>
              {MONTHS.map(m => {
                const isSelected = selectedOnlineMonth === m.month;
                const mOnline = dailyOnlineMonthTotals[m.month] || 0;
                const mSamples = dailySamplesTokenMonthTotals[m.month] || 0;
                return (
                  <Button
                    key={m.month}
                    variant={isSelected ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setSelectedOnlineMonth(m.month)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: isSelected ? 700 : 500,
                      backgroundColor: isSelected ? '#0891b2' : 'transparent',
                      color: isSelected ? '#fff' : '#aaa',
                      borderColor: isSelected ? '#0891b2' : '#444',
                      '&:hover': {
                        backgroundColor: isSelected ? '#0e7490' : '#333',
                        borderColor: '#0891b2'
                      },
                      minWidth: 85,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.25,
                      alignItems: 'center',
                      py: 0.75
                    }}
                  >
                    <span style={{ fontWeight: 'bold' }}>{m.short}</span>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
                      {mOnline > 0 && (
                        <Chip
                          label={mOnline.toLocaleString()}
                          size="small"
                          sx={{
                            height: 15,
                            fontSize: '0.58rem',
                            fontWeight: 'bold',
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(8,145,178,0.25)',
                            color: isSelected ? '#fff' : '#38bdf8',
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                      {mSamples > 0 && (
                        <Chip
                          label={mSamples.toLocaleString()}
                          size="small"
                          sx={{
                            height: 15,
                            fontSize: '0.58rem',
                            fontWeight: 'bold',
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(16,185,129,0.25)',
                            color: isSelected ? '#fff' : '#34d399',
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                    </Stack>
                  </Button>
                );
              })}
            </Box>

            {/* Quick Actions & Search */}
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="subtitle1" sx={{ color: 'var(--text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{MONTHS[selectedOnlineMonth - 1]?.name} {selectedYear}</span>
                </Typography>
                <Chip
                  label={`Online: ${(dailyOnlineMonthTotals[selectedOnlineMonth] || 0).toLocaleString()}`}
                  size="small"
                  sx={{ backgroundColor: '#0891b222', color: '#38bdf8', border: '1px solid #0891b2', fontWeight: 700 }}
                />
                <Chip
                  label={`Samples Token: ${(dailySamplesTokenMonthTotals[selectedOnlineMonth] || 0).toLocaleString()}`}
                  size="small"
                  sx={{ backgroundColor: '#10b98122', color: '#34d399', border: '1px solid #10b981', fontWeight: 700 }}
                />
              </Box>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Filter day/date..."
                  value={onlineSearchQuery}
                  onChange={(e) => setOnlineSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'var(--text-muted)', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                    sx: {
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '0.85rem',
                      height: 36,
                      borderRadius: 1.5,
                      '& fieldset': { borderColor: 'var(--border)' },
                      '&:hover fieldset': { borderColor: '#0891b2' },
                      '&.Mui-focused fieldset': { borderColor: '#0891b2' }
                    }
                  }}
                  sx={{ width: 160 }}
                />

                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const val = prompt(`Enter daily ONLINE volume to fill all days in ${MONTHS[selectedOnlineMonth - 1].name}:`);
                    if (val !== null && val.trim() !== '') {
                      handleFillMonthDailyOnline(val.trim());
                    }
                  }}
                  sx={{ color: '#38bdf8', borderColor: '#0891b2', textTransform: 'none', height: 36, fontSize: '0.78rem' }}
                >
                  ⚡ Fill Online
                </Button>

                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const val = prompt(`Enter daily SAMPLES TOKEN to fill all days in ${MONTHS[selectedOnlineMonth - 1].name}:`);
                    if (val !== null && val.trim() !== '') {
                      handleFillMonthDailySamplesToken(val.trim());
                    }
                  }}
                  sx={{ color: '#34d399', borderColor: '#10b981', textTransform: 'none', height: 36, fontSize: '0.78rem' }}
                >
                  ⚡ Fill Samples Token
                </Button>

                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={handleClearMonthDailyOnline}
                  sx={{ textTransform: 'none', height: 36, fontSize: '0.78rem' }}
                >
                  🗑️ Clear
                </Button>
              </Stack>
            </Stack>

            {/* Daily Online & Samples Table */}
            <TableContainer component={Paper} sx={{ backgroundColor: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: 70 }}>Day #</TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: 110 }}>Date</TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: 75 }}>Day</TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: 180 }}>Daily Online Volume</TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: 180 }}>Daily Samples Token (PIS)</TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Notes / Context</TableCell>
                    <TableCell sx={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', fontWeight: 'bold', width: 140, textAlign: 'center' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {daysInSelectedOnlineMonth.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'var(--text-muted)' }}>
                        No days found matching search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    daysInSelectedOnlineMonth.map((dayObj, idx) => {
                      const hasOnline = dayObj.onlineSamples !== '' && dayObj.onlineSamples !== null && dayObj.onlineSamples !== undefined;
                      const hasSamples = dayObj.samplesToken !== '' && dayObj.samplesToken !== null && dayObj.samplesToken !== undefined;
                      const numOnline = parseFloat(dayObj.onlineSamples) || 0;
                      const numSamples = parseFloat(dayObj.samplesToken) || 0;
                      return (
                        <TableRow
                          key={dayObj.dateStr}
                          hover
                          sx={{
                            '&:hover': { backgroundColor: 'var(--surface-hover)' },
                            backgroundColor: dayObj.isWeekend
                              ? 'rgba(255, 255, 255, 0.03)'
                              : (idx % 2 === 0 ? '#252525' : '#2a2a2a')
                          }}
                        >
                          <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600, py: 1 }}>
                            Day {String(dayObj.day).padStart(2, '0')}
                          </TableCell>
                          <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, py: 1, fontSize: '0.85rem' }}>
                            {dayObj.dateStr}
                          </TableCell>
                          <TableCell sx={{ color: dayObj.isWeekend ? '#fbbf24' : '#94a3b8', fontWeight: 500, py: 1 }}>
                            {dayObj.dayOfWeek}
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <input
                              type="number"
                              min="0"
                              value={dayObj.onlineSamples}
                              onChange={(e) => handleDailyOnlineChange(dayObj.dateStr, 'onlineSamples', e.target.value)}
                              placeholder="Online volume..."
                              style={{
                                background: 'var(--surface)',
                                border: `1px solid ${hasOnline ? '#0891b2' : 'var(--border)'}`,
                                borderRadius: 6,
                                color: hasOnline ? '#fff' : '#666',
                                fontSize: '0.85rem',
                                fontWeight: hasOnline ? 700 : 400,
                                padding: '5px 10px',
                                outline: 'none',
                                width: '100%',
                                maxWidth: 160,
                                transition: 'border-color 0.2s'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <input
                              type="number"
                              min="0"
                              value={dayObj.samplesToken}
                              onChange={(e) => handleDailyOnlineChange(dayObj.dateStr, 'samplesToken', e.target.value)}
                              placeholder="Samples taken..."
                              style={{
                                background: 'var(--surface)',
                                border: `1px solid ${hasSamples ? '#10b981' : 'var(--border)'}`,
                                borderRadius: 6,
                                color: hasSamples ? '#fff' : '#666',
                                fontSize: '0.85rem',
                                fontWeight: hasSamples ? 700 : 400,
                                padding: '5px 10px',
                                outline: 'none',
                                width: '100%',
                                maxWidth: 160,
                                transition: 'border-color 0.2s'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <input
                              type="text"
                              value={dayObj.note}
                              onChange={(e) => handleDailyOnlineChange(dayObj.dateStr, 'note', e.target.value)}
                              placeholder="Optional note..."
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                                color: 'var(--text-secondary)',
                                fontSize: '0.85rem',
                                padding: '5px 10px',
                                outline: 'none',
                                width: '100%'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', py: 1 }}>
                            <Stack spacing={0.5} alignItems="center">
                              {hasOnline ? (
                                <Chip
                                  label={`${numOnline.toLocaleString()} online`}
                                  size="small"
                                  sx={{
                                    backgroundColor: 'rgba(8, 145, 178, 0.15)',
                                    color: '#38bdf8',
                                    fontWeight: 'bold',
                                    border: '1px solid #0891b2',
                                    fontSize: '0.7rem',
                                    height: 20
                                  }}
                                />
                              ) : null}
                              {hasSamples ? (
                                <Chip
                                  label={`${numSamples.toLocaleString()} samples`}
                                  size="small"
                                  sx={{
                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                    color: '#34d399',
                                    fontWeight: 'bold',
                                    border: '1px solid #10b981',
                                    fontSize: '0.7rem',
                                    height: 20
                                  }}
                                />
                              ) : null}
                              {!hasOnline && !hasSamples && (
                                <Typography variant="caption" sx={{ color: '#555' }}>Not set</Typography>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Grand Total Summary Footer */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                backgroundColor: 'rgba(8, 145, 178, 0.1)',
                border: '1px solid rgba(8, 145, 178, 0.3)'
              }}
            >
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Year Total Daily Online ({selectedYear}):</Typography>
                  <Typography variant="h6" sx={{ color: '#38bdf8', fontWeight: 800 }}>
                    {grandDailyOnlineTotal.toLocaleString()} online
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Year Total Samples Taken ({selectedYear}):</Typography>
                  <Typography variant="h6" sx={{ color: '#34d399', fontWeight: 800 }}>
                    {grandDailySamplesTokenTotal.toLocaleString()} samples taken
                  </Typography>
                </Box>
              </Stack>

              <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Tip: Click "Save" at the top right to persist all weekly, monthly, team, and daily tokens.
              </Typography>
            </Stack>
          </Box>
        )}

      </DialogContent>
    </Dialog>
  );
};

export default SamplesTokenDialog;
