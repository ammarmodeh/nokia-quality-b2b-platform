import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  InputAdornment,
  MenuItem,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Search as SearchIcon, FileDownloadOutlined } from '@mui/icons-material';
import {
  startOfYear,
  endOfYear,
  eachWeekOfInterval
} from 'date-fns';
import { toast } from 'sonner';

import api from '../api/api';
import XLSX from 'xlsx-js-style';
import { getCustomWeekNumber } from '../utils/helpers';
import { AppDialog, Badge, ConfirmDialog } from './ui';

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

const fmt = (n) => (Number(n) || 0).toLocaleString();

// ─── Shared bits ────────────────────────────────────────────────────────────
// Compact input for table cells; `tone` colours the value (success / danger).
const cellInputSx = {
  width: '100%',
  height: 30,
  px: 1,
  border: '1px solid var(--border)',
  borderRadius: '6px',
  backgroundColor: 'var(--surface)',
  color: 'var(--text)',
  font: 'inherit',
  fontSize: 13,
  fontVariantNumeric: 'tabular-nums',
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
  '&::placeholder': { color: 'var(--text-muted)' },
  '&:hover': { borderColor: 'var(--border-strong)' },
  '&:focus': { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-ring)' },
  MozAppearance: 'textfield',
  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
};

const CellInput = ({ tone, sx, ...props }) => (
  <Box
    component="input"
    sx={{ ...cellInputSx, ...(tone && { color: `var(--${tone})`, fontWeight: 600 }), ...sx }}
    {...props}
  />
);

const numCell = { fontVariantNumeric: 'tabular-nums' };
const headSx = { '& th': { whiteSpace: 'nowrap' } };

// Month picker with a small count under each month.
const MonthStrip = ({ value, onChange, meta, label }) => (
  <Box
    role="radiogroup"
    aria-label={label}
    sx={{
      display: 'flex', gap: '2px', p: '2px', borderRadius: '8px', overflowX: 'auto',
      backgroundColor: 'var(--surface-active)', border: '1px solid var(--border)'
    }}
  >
    {MONTHS.map(m => {
      const active = m.month === value;
      const { text, hint, filled } = meta(m.month);
      const btn = (
        <Box
          key={m.month}
          component="button"
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(m.month)}
          sx={{
            flex: '1 0 64px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
            py: 0.625, border: 0, borderRadius: '6px', cursor: 'pointer', font: 'inherit',
            color: active ? 'var(--text)' : 'var(--text-secondary)',
            backgroundColor: active ? 'var(--surface)' : 'transparent',
            boxShadow: active ? 'var(--shadow-xs)' : 'none',
            '&:hover': { color: 'var(--text)' },
            '&:focus-visible': { outline: '2px solid var(--focus-ring)', outlineOffset: 1 },
          }}
        >
          <Box component="span" sx={{ fontSize: 12.5, fontWeight: 500 }}>{m.short}</Box>
          <Box component="span" sx={{ fontSize: 11, ...numCell, color: filled ? 'var(--success)' : 'var(--text-muted)' }}>{text}</Box>
        </Box>
      );
      return hint ? <Tooltip key={m.month} title={hint}>{btn}</Tooltip> : btn;
    })}
  </Box>
);

const Intro = ({ children }) => (
  <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, mb: 2, maxWidth: 760 }}>
    {children}
  </Typography>
);

const Toolbar = ({ title, caption, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, my: 2 }}>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</Typography>
      {caption && <Typography sx={{ fontSize: 12, color: 'var(--text-muted)' }}>{caption}</Typography>}
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>{children}</Box>
  </Box>
);

const SearchField = ({ value, onChange, placeholder, width = 200 }) => (
  <TextField
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    sx={{ width }}
    slotProps={{
      input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> },
      htmlInput: { 'aria-label': placeholder }
    }}
  />
);

const NotSet = () => <Typography component="span" sx={{ fontSize: 12, color: 'var(--text-muted)' }}>Not set</Typography>;

// ─── Memoized Week Row ──────────────────────────────────────────────────────
const WeekRow = React.memo(({ row, index, onChange }) => {
  const promoterTone = row.promoters === '' ? undefined : parseFloat(row.promoters) >= 75 ? 'success' : undefined;
  const detractorTone = row.detractors === '' ? undefined : parseFloat(row.detractors) <= 9 ? 'success' : 'danger';
  const handleInputChange = (field, value) => onChange(index, field, value);

  return (
    <TableRow hover>
      <TableCell sx={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Week {row.weekNum}</TableCell>
      <TableCell>
        <CellInput tone={promoterTone} value={row.promoters} onChange={(e) => handleInputChange('promoters', e.target.value)} type="number" placeholder="%" aria-label={`Week ${row.weekNum} promoters %`} />
      </TableCell>
      <TableCell>
        <CellInput tone={detractorTone} value={row.detractors} onChange={(e) => handleInputChange('detractors', e.target.value)} type="number" placeholder="%" aria-label={`Week ${row.weekNum} detractors %`} />
      </TableCell>
      <TableCell align="right" sx={{ ...numCell, fontWeight: 600 }}>{row.nps}</TableCell>
      <TableCell>
        <CellInput value={row.itnRelated} onChange={(e) => handleInputChange('itnRelated', e.target.value)} type="number" aria-label={`Week ${row.weekNum} ITN related`} />
      </TableCell>
      <TableCell align="right" sx={{ ...numCell, color: 'var(--text-secondary)' }}>
        {row.itnRelatedPercent !== '' ? `${row.itnRelatedPercent}%` : ''}
      </TableCell>
      <TableCell>
        <CellInput value={row.sampleSize} onChange={(e) => handleInputChange('sampleSize', e.target.value)} type="number" aria-label={`Week ${row.weekNum} sample size`} />
      </TableCell>
      <TableCell>
        <CellInput value={row.note} onChange={(e) => handleInputChange('note', e.target.value)} type="text" aria-label={`Week ${row.weekNum} note`} sx={{ fontVariantNumeric: 'normal' }} />
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
WeekRow.displayName = 'WeekRow';

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
  const [showInactiveWithSamples, setShowInactiveWithSamples] = useState(false);

  // Daily Online Data State
  const [dailyOnlineData, setDailyOnlineData] = useState({}); // { [dateStr 'YYYY-MM-DD']: { onlineSamples: '', note: '' } }
  const [selectedOnlineMonth, setSelectedOnlineMonth] = useState(new Date().getMonth() + 1);
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  
  const [mounted, setMounted] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [settings, setSettings] = useState(null);
  const [confirm, setConfirm] = useState(null); // { title, description, confirmLabel, danger, onConfirm }
  const [fillValue, setFillValue] = useState('');

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
          }).catch(() => ({ data: [] })),
          api.get(`/samples-token/team-samples/${selectedYear}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch(() => ({ data: [] })),
          api.get('/field-teams/get-field-teams', {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch(() => ({ data: [] })),
          api.get(`/samples-token/daily-online/${selectedYear}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch(() => ({ data: [] }))
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
    const monthName = MONTHS[selectedOnlineMonth - 1].name;
    setConfirm({
      title: `Clear ${monthName}?`,
      description: `Removes every daily online, DVOC and note entry for ${monthName} ${selectedYear}. Nothing is saved until you click Save.`,
      confirmLabel: 'Clear month',
      danger: true,
      onConfirm: () => {
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
    });
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
      toast.info('July has no team samples to move.');
      return;
    }

    setConfirm({
      title: 'Move July samples to August?',
      description: `Moves ${julCount} team sample ${julCount === 1 ? 'entry' : 'entries'} from July into August and clears July. Nothing is saved until you click Save.`,
      confirmLabel: 'Move to August',
      onConfirm: () => {
        setTeamMonthlyData(prev => {
          const next = { ...prev };
          next[8] = { ...(next[8] || {}), ...julMap };
          next[7] = {};
          return next;
        });
        setSelectedTeamMonth(8);
        toast.success('July samples moved to August. Click Save to keep the change.');
      }
    });
  }, [teamMonthlyData]);

  // ── Team monthly totals and grand total ─────────────────────────────────
  // Only count active teams so the badge always matches the visible rows.
  const teamMonthTotals = useMemo(() => {
    const activeNames = new Set(
      fieldTeams.filter(t => !t.isTerminated && t.isActive !== false).map(t => t.teamName)
    );
    const totals = {};
    for (let m = 1; m <= 12; m++) {
      const monthObj = teamMonthlyData[m] || {};
      totals[m] = Object.entries(monthObj).reduce((sum, [name, val]) =>
        activeNames.has(name) ? sum + (parseFloat(val) || 0) : sum, 0
      );
    }
    return totals;
  }, [teamMonthlyData, fieldTeams]);

  const grandTeamSamplesTotal = useMemo(() => {
    return Object.values(teamMonthTotals).reduce((sum, val) => sum + val, 0);
  }, [teamMonthTotals]);

  // Filtered teams list: exclude terminated / inactive, then apply search.
  // When showInactiveWithSamples is on, also append inactive teams that have
  // at least one month of saved sample data (across the full year) — BUT only
  // if no active team already uses the same teamName (samples are keyed by
  // name, so showing both would duplicate the same value on two rows).
  const filteredFieldTeams = useMemo(() => {
    const active = fieldTeams.filter(t => !t.isTerminated && t.isActive !== false);

    let pool = active;
    if (showInactiveWithSamples) {
      const activeNames = new Set(active.map(t => t.teamName));
      const inactiveWithData = fieldTeams
        .filter(t => t.isTerminated || t.isActive === false)
        .filter(t => !activeNames.has(t.teamName)) // skip if active twin exists
        .filter(t =>
          MONTHS.some(m => {
            const v = teamMonthlyData[m.month]?.[t.teamName];
            return v !== undefined && v !== '' && v !== null;
          })
        );
      pool = [...active, ...inactiveWithData];
    }

    if (!teamSearchQuery.trim()) return pool;
    const q = teamSearchQuery.toLowerCase();
    return pool.filter(t => `${t.teamName || ''} ${t.teamCode || ''}`.toLowerCase().includes(q));
  }, [fieldTeams, teamSearchQuery, showInactiveWithSamples, teamMonthlyData]);

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
      toast.error('Couldn’t save the samples. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Export to xlsx ──────────────────────────────────────────────────────
  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const hdrStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E293B' } } };
    const applyHdr = (ws, cols) => {
      cols.forEach((_, c) => {
        const cell = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[cell]) ws[cell].s = hdrStyle;
      });
    };

    // Sheet 1: Weekly Results
    const weekHdr = ['Week', 'Promoters %', 'Detractors %', 'NPS', 'ITN Related', 'ITN %', 'Sample Size', 'Note'];
    const weekRows = [
      weekHdr,
      ...weeksData
        .filter(r => r.sampleSize !== '' || r.promoters !== '' || r.detractors !== '')
        .map(r => [
          `Week ${r.weekNum}`, r.promoters, r.detractors, r.nps,
          r.itnRelated, r.itnRelatedPercent !== '' ? `${r.itnRelatedPercent}%` : '',
          r.sampleSize, r.note,
        ]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(weekRows);
    applyHdr(ws1, weekHdr);
    ws1['!cols'] = [70, 90, 95, 60, 80, 60, 90, 140].map(w => ({ wch: w / 7 }));
    XLSX.utils.book_append_sheet(wb, ws1, 'Weekly Results');

    // Sheet 2: Monthly Totals
    const monthHdr = ['Month', 'Total Samples'];
    const monthRows = [
      monthHdr,
      ...MONTHS.map(m => [m.name, monthlyTotals[m.month - 1]?.totalSamples ?? '']),
      [],
      ['TOTAL', grandMonthlyTotal],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(monthRows);
    applyHdr(ws2, monthHdr);
    ws2['!cols'] = [100, 100].map(w => ({ wch: w / 7 }));
    XLSX.utils.book_append_sheet(wb, ws2, 'Monthly Totals');

    // Sheet 3: Team Samples — team × month matrix
    const activeTeams = fieldTeams.filter(t => !t.isTerminated && t.isActive !== false);
    const teamHdr = ['Team Name', 'Team Code', 'Company', ...MONTHS.map(m => m.short), 'Year Total'];
    const teamDataRows = activeTeams.map(ft => {
      const name = ft.teamName;
      const monthVals = MONTHS.map(m => {
        const v = teamMonthlyData[m.month]?.[name];
        return v !== undefined && v !== '' ? (parseFloat(v) || 0) : '';
      });
      const yearTotal = monthVals.reduce((s, v) => s + (parseFloat(v) || 0), 0);
      return [name, ft.teamCode || '', ft.teamCompany || '', ...monthVals, yearTotal];
    });
    const monthColTotals = MONTHS.map(m =>
      activeTeams.reduce((s, ft) => {
        const v = teamMonthlyData[m.month]?.[ft.teamName];
        return s + (v !== undefined && v !== '' ? (parseFloat(v) || 0) : 0);
      }, 0)
    );
    const ws3 = XLSX.utils.aoa_to_sheet([teamHdr, ...teamDataRows, [], ['TOTAL', '', '', ...monthColTotals, grandTeamSamplesTotal]]);
    applyHdr(ws3, teamHdr);
    ws3['!cols'] = [160, 80, 120, ...MONTHS.map(() => 55), 80].map(w => ({ wch: w / 7 }));
    XLSX.utils.book_append_sheet(wb, ws3, 'Team Samples');

    // Sheet 4: Daily DVOC & Online
    const dailyHdr = ['Date', 'Day', 'Online Samples', 'DVOC Token', 'Note'];
    const dailyDataRows = [];
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    for (let m = 1; m <= 12; m++) {
      const numDays = new Date(selectedYear, m, 0).getDate();
      for (let d = 1; d <= numDays; d++) {
        const dateStr = `${selectedYear}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const rec = dailyOnlineData[dateStr];
        if (rec && (rec.onlineSamples !== '' || rec.samplesToken !== '' || rec.note !== '')) {
          const day = new Date(selectedYear, m - 1, d);
          dailyDataRows.push([
            dateStr, dayNames[day.getDay()],
            rec.onlineSamples !== '' ? parseFloat(rec.onlineSamples) : '',
            rec.samplesToken  !== '' ? parseFloat(rec.samplesToken)  : '',
            rec.note || '',
          ]);
        }
      }
    }
    dailyDataRows.push([], ['TOTAL', '', grandDailyOnlineTotal, grandDailySamplesTokenTotal, '']);
    const ws4 = XLSX.utils.aoa_to_sheet([dailyHdr, ...dailyDataRows]);
    applyHdr(ws4, dailyHdr);
    ws4['!cols'] = [90, 50, 100, 90, 160].map(w => ({ wch: w / 7 }));
    XLSX.utils.book_append_sheet(wb, ws4, 'Daily DVOC & Online');

    XLSX.writeFile(wb, `survey-samples-${selectedYear}.xlsx`);
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  const selectedOnlineMonthName = MONTHS[selectedOnlineMonth - 1]?.name;
  const selectedTeamMonthName = MONTHS[selectedTeamMonth - 1]?.name;
  const teamsWithSamples = Object.keys(teamMonthlyData[selectedTeamMonth] || {}).length;

  const footerSummary = [
    <>Weekly sample size <strong>{fmt(weeksData.reduce((s, r) => s + (parseFloat(r.sampleSize) || 0), 0))}</strong></>,
    <>Year total <strong>{fmt(grandMonthlyTotal)}</strong> samples</>,
    <>Year total <strong>{fmt(grandTeamSamplesTotal)}</strong> team samples</>,
    <>Year total <strong>{fmt(grandDailySamplesTokenTotal)}</strong> DVOC · <strong>{fmt(grandDailyOnlineTotal)}</strong> online</>
  ][tab];

  const tabLabel = (text, ...badges) => (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      {text}
      {badges.filter(b => b && b.value > 0).map(b => (
        <Badge key={b.tone} tone={b.tone} sx={{ height: 18, fontSize: 11, px: 0.625, ...numCell }}>{b.label || fmt(b.value)}</Badge>
      ))}
    </Box>
  );

  return (
    <>
      <AppDialog
        open={open}
        onClose={onClose}
        size="xl"
        title="Survey samples"
        description="Sample sizes behind NPS: weekly results, official monthly totals, per-team tokens and daily DVOC / online counts."
        bodySx={{ p: 0, display: 'flex', flexDirection: 'column', minHeight: { sm: 'min(720px, calc(100vh - 210px))' } }}
        secondary={{ label: 'Close' }}
        primary={{ label: saveSuccess ? 'Saved' : 'Save', loadingLabel: 'Saving…', onClick: handleManualSave, loading: saving }}
        extraActions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', ...numCell, '& strong': { color: 'var(--text)', fontWeight: 600 } }}>
              {footerSummary}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownloadOutlined sx={{ fontSize: 15 }} />}
              onClick={handleExport}
              disabled={!mounted}
              sx={{ flexShrink: 0 }}
            >
              Export xlsx
            </Button>
          </Box>
        }
      >
        {/* ── Tabs + year ── */}
        <Box
          sx={{
            position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center', gap: 2,
            px: 2.5, backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)'
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons={false}
            sx={{ flex: 1, minWidth: 0, borderBottom: 0 }}
          >
            <Tab label="Weekly results" />
            <Tab label={tabLabel('Monthly totals', { tone: 'accent', value: grandMonthlyTotal })} />
            <Tab label={tabLabel('Team samples', { tone: 'success', value: grandTeamSamplesTotal })} />
            <Tab
              label={tabLabel(
                'Daily DVOC & online',
                { tone: 'success', value: grandDailySamplesTokenTotal, label: `${fmt(grandDailySamplesTokenTotal)} DVOC` },
                { tone: 'info', value: grandDailyOnlineTotal, label: `${fmt(grandDailyOnlineTotal)} online` }
              )}
            />
          </Tabs>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            inputProps={{ 'aria-label': 'Year' }}
            sx={{ minWidth: 96, flexShrink: 0 }}
          >
            {years.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </Box>

        <Box sx={{ flex: 1, px: 2.5, py: 2 }}>
          {/* ══ TAB 0: Weekly results ══════════════════════════════════════ */}
          {tab === 0 && (
            <>
              <Intro>
                Weekly survey results. NPS is promoters minus detractors; ITN % is ITN-related over sample size.
                Targets: promoters ≥ 75%, detractors ≤ 9%.
              </Intro>
              <TableContainer>
                <Table size="small" sx={{ minWidth: 880 }}>
                  <TableHead sx={headSx}>
                    <TableRow>
                      <TableCell sx={{ width: 90 }}>Week</TableCell>
                      <TableCell sx={{ width: 120 }}>Promoters % <Box component="span" sx={{ color: 'var(--text-muted)' }}>≥ 75</Box></TableCell>
                      <TableCell sx={{ width: 120 }}>Detractors % <Box component="span" sx={{ color: 'var(--text-muted)' }}>≤ 9</Box></TableCell>
                      <TableCell align="right" sx={{ width: 70 }}>NPS</TableCell>
                      <TableCell sx={{ width: 110 }}>ITN related</TableCell>
                      <TableCell align="right" sx={{ width: 80 }}>ITN %</TableCell>
                      <TableCell sx={{ width: 110 }}>Sample size</TableCell>
                      <TableCell>Note</TableCell>
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
            </>
          )}

          {/* ══ TAB 1: Monthly totals ══════════════════════════════════════ */}
          {tab === 1 && (
            <>
              <Intro>
                The official total samples for each month. When NPS performance is viewed by month, these totals are used
                instead of adding up the weekly sample sizes.
              </Intro>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={headSx}>
                    <TableRow>
                      <TableCell sx={{ width: 180 }}>Month</TableCell>
                      <TableCell>Total samples</TableCell>
                      <TableCell align="right" sx={{ width: 160 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthlyTotals.map((m, idx) => {
                      const hasData = m.totalSamples !== '';
                      return (
                        <TableRow key={m.month} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{m.name}</TableCell>
                          <TableCell>
                            <CellInput
                              type="number"
                              min="0"
                              value={m.totalSamples}
                              onChange={(e) => handleMonthlyChange(idx, e.target.value)}
                              placeholder="Total samples"
                              aria-label={`${m.name} total samples`}
                              sx={{ maxWidth: 220 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {hasData ? <Badge tone="success" sx={numCell}>{fmt(m.totalSamples)} samples</Badge> : <NotSet />}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* ══ TAB 2: Team samples ════════════════════════════════════════ */}
          {tab === 2 && (
            <>
              <Intro>
                The sample tokens each team received per month. They feed the NPS analysis & feedback export, where
                non-accountable detractors and passives are deducted to give the final samples, promoters and NPS.
              </Intro>

              <MonthStrip
                label="Month"
                value={selectedTeamMonth}
                onChange={setSelectedTeamMonth}
                meta={(m) => {
                  const total = teamMonthTotals[m] || 0;
                  return { text: total > 0 ? fmt(total) : '—', filled: total > 0 };
                }}
              />

              <Toolbar
                title={`${selectedTeamMonthName} ${selectedYear}`}
                caption={`${filteredFieldTeams.length} teams · ${teamsWithSamples} with samples`}
              >
                <SearchField value={teamSearchQuery} onChange={setTeamSearchQuery} placeholder="Search teams" />
                <Button
                  variant={showInactiveWithSamples ? 'contained' : 'outlined'}
                  color={showInactiveWithSamples ? 'warning' : 'primary'}
                  size="small"
                  onClick={() => setShowInactiveWithSamples(v => !v)}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {showInactiveWithSamples ? 'Hiding inactive' : 'Show inactive'}
                </Button>
                <Button variant="outlined" onClick={handleTransferJulToAug}>Move July to August</Button>
                <Badge tone="success" sx={{ height: 32, px: 1.25, fontSize: 13, ...numCell }}>
                  {fmt(teamMonthTotals[selectedTeamMonth])} samples this month
                </Badge>
              </Toolbar>

              <TableContainer>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead sx={headSx}>
                    <TableRow>
                      <TableCell sx={{ width: 56 }}>#</TableCell>
                      <TableCell>Team</TableCell>
                      <TableCell sx={{ width: 140 }}>Code</TableCell>
                      <TableCell sx={{ width: 160 }}>Company</TableCell>
                      <TableCell sx={{ width: 170 }}>Sample size</TableCell>
                      <TableCell align="right" sx={{ width: 150 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredFieldTeams.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'var(--text-muted)' }}>
                          {fieldTeams.length === 0 ? 'No field teams yet.' : 'No team matches your search.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFieldTeams.map((team, idx) => {
                        const curVal = (teamMonthlyData[selectedTeamMonth] || {})[team.teamName] ?? '';
                        const hasVal = curVal !== '' && curVal !== null && curVal !== undefined;
                        return (
                          <TableRow key={team._id || team.teamName || idx} hover
                            sx={(team.isTerminated || team.isActive === false) ? { opacity: 0.75, backgroundColor: 'rgba(220,38,38,.04)' } : {}}
                          >
                            <TableCell sx={{ color: 'var(--text-muted)', ...numCell }}>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>
                              {team.teamName}
                              {(team.isTerminated || team.isActive === false) && (
                                <Box component="span" sx={{ ml: 1, fontSize: 10, px: 0.75, py: 0.125, borderRadius: '4px', backgroundColor: 'rgba(220,38,38,.12)', color: '#DC2626', fontWeight: 700, verticalAlign: 'middle' }}>left</Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ color: 'var(--text-secondary)' }}>{team.teamCode || '—'}</TableCell>
                            <TableCell sx={{ color: 'var(--text-secondary)' }}>{team.teamCompany || '—'}</TableCell>
                            <TableCell>
                              <CellInput
                                type="number"
                                min="0"
                                value={curVal}
                                onChange={(e) => handleTeamSampleChange(selectedTeamMonth, team.teamName, e.target.value)}
                                placeholder="Sample size"
                                aria-label={`${team.teamName} sample size`}
                                sx={{ maxWidth: 140 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {hasVal ? <Badge tone="success" sx={numCell}>{fmt(curVal)} samples</Badge> : <NotSet />}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* ══ TAB 3: Daily DVOC & online ═════════════════════════════════ */}
          {tab === 3 && (
            <>
              <Intro>
                Daily online transaction volume and daily DVOC samples taken (token on PIS basis). The export uses them to
                compare daily volume with sample size and DVOC cases.
              </Intro>

              <MonthStrip
                label="Month"
                value={selectedOnlineMonth}
                onChange={setSelectedOnlineMonth}
                meta={(m) => {
                  const dvoc = dailySamplesTokenMonthTotals[m] || 0;
                  const online = dailyOnlineMonthTotals[m] || 0;
                  return {
                    text: dvoc > 0 ? fmt(dvoc) : '—',
                    filled: dvoc > 0,
                    hint: dvoc || online ? `${fmt(dvoc)} DVOC · ${fmt(online)} online` : null
                  };
                }}
              />

              <Toolbar
                title={`${selectedOnlineMonthName} ${selectedYear}`}
                caption={`${fmt(dailySamplesTokenMonthTotals[selectedOnlineMonth])} DVOC samples · ${fmt(dailyOnlineMonthTotals[selectedOnlineMonth])} online`}
              >
                <SearchField value={onlineSearchQuery} onChange={setOnlineSearchQuery} placeholder="Filter days" width={160} />
                <TextField
                  type="number"
                  value={fillValue}
                  onChange={(e) => setFillValue(e.target.value)}
                  placeholder="Value"
                  sx={{ width: 96 }}
                  slotProps={{ htmlInput: { 'aria-label': 'Value to fill every day', min: 0 } }}
                />
                <Tooltip title={`Set online volume for every day in ${selectedOnlineMonthName}`}>
                  <span>
                    <Button variant="outlined" disabled={fillValue === ''} onClick={() => handleFillMonthDailyOnline(fillValue.trim())}>Fill online</Button>
                  </span>
                </Tooltip>
                <Tooltip title={`Set DVOC samples for every day in ${selectedOnlineMonthName}`}>
                  <span>
                    <Button variant="outlined" disabled={fillValue === ''} onClick={() => handleFillMonthDailySamplesToken(fillValue.trim())}>Fill DVOC</Button>
                  </span>
                </Tooltip>
                <Button variant="outlined" color="error" onClick={handleClearMonthDailyOnline}>Clear month</Button>
              </Toolbar>

              <TableContainer>
                <Table size="small" sx={{ minWidth: 860 }}>
                  <TableHead sx={headSx}>
                    <TableRow>
                      <TableCell sx={{ width: 64 }}>Day</TableCell>
                      <TableCell sx={{ width: 110 }}>Date</TableCell>
                      <TableCell sx={{ width: 64 }}>Weekday</TableCell>
                      <TableCell sx={{ width: 150 }}>Online volume</TableCell>
                      <TableCell sx={{ width: 150 }}>DVOC samples (PIS)</TableCell>
                      <TableCell>Note</TableCell>
                      <TableCell align="right" sx={{ width: 130 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {daysInSelectedOnlineMonth.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'var(--text-muted)' }}>
                          No day matches your filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      daysInSelectedOnlineMonth.map((dayObj) => {
                        const hasOnline = dayObj.onlineSamples !== '' && dayObj.onlineSamples !== null && dayObj.onlineSamples !== undefined;
                        const hasSamples = dayObj.samplesToken !== '' && dayObj.samplesToken !== null && dayObj.samplesToken !== undefined;
                        return (
                          <TableRow
                            key={dayObj.dateStr}
                            hover
                            sx={dayObj.isWeekend ? { backgroundColor: 'var(--surface-subtle)' } : undefined}
                          >
                            <TableCell sx={{ color: 'var(--text-muted)', ...numCell }}>{String(dayObj.day).padStart(2, '0')}</TableCell>
                            <TableCell sx={{ color: 'var(--text-secondary)', ...numCell }}>{dayObj.dateStr}</TableCell>
                            <TableCell sx={{ color: dayObj.isWeekend ? 'var(--warning)' : 'var(--text-secondary)' }}>{dayObj.dayOfWeek}</TableCell>
                            <TableCell>
                              <CellInput
                                type="number"
                                min="0"
                                value={dayObj.onlineSamples}
                                onChange={(e) => handleDailyOnlineChange(dayObj.dateStr, 'onlineSamples', e.target.value)}
                                placeholder="Online"
                                aria-label={`${dayObj.dateStr} online volume`}
                              />
                            </TableCell>
                            <TableCell>
                              <CellInput
                                type="number"
                                min="0"
                                value={dayObj.samplesToken}
                                onChange={(e) => handleDailyOnlineChange(dayObj.dateStr, 'samplesToken', e.target.value)}
                                placeholder="Samples"
                                aria-label={`${dayObj.dateStr} DVOC samples`}
                              />
                            </TableCell>
                            <TableCell>
                              <CellInput
                                type="text"
                                value={dayObj.note}
                                onChange={(e) => handleDailyOnlineChange(dayObj.dateStr, 'note', e.target.value)}
                                placeholder="Optional note"
                                aria-label={`${dayObj.dateStr} note`}
                                sx={{ fontVariantNumeric: 'normal' }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {hasOnline || hasSamples ? (
                                <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                  {hasSamples && <Badge tone="success" sx={numCell}>{fmt(dayObj.samplesToken)} DVOC</Badge>}
                                  {hasOnline && <Badge tone="info" sx={numCell}>{fmt(dayObj.onlineSamples)} online</Badge>}
                                </Box>
                              ) : <NotSet />}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      </AppDialog>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onClose={() => setConfirm(null)}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
      />
    </>
  );
};

export default SamplesTokenDialog;
