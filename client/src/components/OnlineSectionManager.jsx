/**
 * OnlineSectionManager.jsx
 * Manages team online transaction data with a simple direct-upload flow.
 * No column mapping — the sheet must follow a fixed format (shown in the dialog).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, Typography, IconButton, Tooltip, TextField, MenuItem,
  CircularProgress, Chip, Divider, LinearProgress,
} from '@mui/material';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import DeleteOutline    from '@mui/icons-material/DeleteOutline';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import RefreshOutlined  from '@mui/icons-material/RefreshOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import { toast } from 'sonner';
import XLSX from 'xlsx-js-style';
import api from '../api/api';
import AppDialog from './ui/AppDialog';
import { useSelector } from 'react-redux';

// ─── helpers ─────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthLabel = (m) => MONTHS[(m || 1) - 1] ?? m;
const pct  = (v) => (v == null ? '—' : `${v}%`);
const num  = (v) => (v == null || v === '' ? '—' : Number(v).toLocaleString());

// ─── Flexible column aliases ──────────────────────────────────────────────────
const ALIASES = {
  teamName:           ['team name', 'team', 'اسم الفريق', 'الفريق', 'field team'],
  teamCode:           ['code', 'team code', 'team_code', 'team id', 'كود الفريق', 'كود'],
  onlineTransactions: ['online transactions', 'online transaction', 'online', 'transactions', 'online qo', 'online-qo', 'qo', 'المعاملات الاونلاين', 'عدد المعاملات', 'معاملات'],
  year:               ['year', 'السنة', 'سنة'],
  month:              ['month', 'الشهر', 'شهر'],
  notes:              ['notes', 'note', 'ملاحظات', 'comment'],
};

function findColIdx(header, keys) {
  for (const k of keys) {
    const i = header.indexOf(k.toLowerCase());
    if (i !== -1) return i;
  }
  return -1;
}

// ─── Parse sheet (supports Online-QO subsheet, fallback Year/Month) ───────────
function parseSheet(wb, targetSheet, fallbackYear, fallbackMonth) {
  const sheetNames = wb.SheetNames || [];
  if (!sheetNames.length) return { rows: [], errors: ['Workbook has no sheets.'], detectedSheet: '' };

  let activeSheetName = targetSheet;
  if (!activeSheetName || !wb.Sheets[activeSheetName]) {
    // Auto-detect sheet named Online-QO or similar
    const auto = sheetNames.find((s) => /online[-_\s]?qo/i.test(s.trim())) || sheetNames[0];
    activeSheetName = auto;
  }

  const ws = wb.Sheets[activeSheetName];
  if (!ws) return { rows: [], errors: [`Subsheet "${activeSheetName}" not found.`], detectedSheet: activeSheetName };

  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (raw.length < 2) return { rows: [], errors: [`Subsheet "${activeSheetName}" is empty or has no data rows.`], detectedSheet: activeSheetName };

  const header = raw[0].map((h) => String(h || '').toLowerCase().trim());
  const idx = {
    teamName:           findColIdx(header, ALIASES.teamName),
    teamCode:           findColIdx(header, ALIASES.teamCode),
    onlineTransactions: findColIdx(header, ALIASES.onlineTransactions),
    year:               findColIdx(header, ALIASES.year),
    month:              findColIdx(header, ALIASES.month),
    notes:              findColIdx(header, ALIASES.notes),
  };

  const detectedCols = {
    hasTeamName: idx.teamName >= 0,
    hasTeamCode: idx.teamCode >= 0,
    hasOnline:   idx.onlineTransactions >= 0,
    hasYear:     idx.year >= 0,
    hasMonth:    idx.month >= 0,
  };

  const errors = [];
  if (!detectedCols.hasTeamName) {
    return {
      rows: [],
      errors: [`Column "Team Name" was not found in subsheet "${activeSheetName}".`],
      detectedSheet: activeSheetName,
      detectedCols,
    };
  }

  if (!detectedCols.hasOnline) {
    return {
      rows: [],
      errors: [
        `Missing "Online Transactions" column in subsheet "${activeSheetName}".`,
        `Please add a column named "Online Transactions" (or "Online") with the transaction counts.`,
      ],
      detectedSheet: activeSheetName,
      detectedCols,
    };
  }

  const rows = [];
  for (let r = 1; r < raw.length; r++) {
    const row = raw[r];
    if (row.every((c) => c === '' || c == null)) continue; // skip blank rows

    const teamName = String(row[idx.teamName] ?? '').trim();
    if (!teamName) continue;

    // Year: use column if present, otherwise dialog fallback
    let y = idx.year >= 0 ? parseInt(row[idx.year], 10) : fallbackYear;
    if (!y || y < 2020 || y > 2099) y = fallbackYear;

    // Month: use column if present, otherwise dialog fallback
    let m = idx.month >= 0 ? parseInt(row[idx.month], 10) : fallbackMonth;
    if (!m || m < 1 || m > 12) m = fallbackMonth;

    const online = parseFloat(String(row[idx.onlineTransactions] ?? '0').replace(/,/g, '')) || 0;

    rows.push({
      teamCode:           idx.teamCode >= 0 ? String(row[idx.teamCode] ?? '').trim() : '',
      teamName,
      year:               y,
      month:              m,
      onlineTransactions: online,
      notes:              idx.notes >= 0 ? String(row[idx.notes] ?? '').trim() : '',
    });
  }

  return { rows, errors, detectedSheet: activeSheetName, detectedCols };
}

// ─── Download blank template ──────────────────────────────────────────────────
function downloadTemplate() {
  const hdrStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E3A5F' } } };
  const headers = ['Team Name', 'Code', 'Online Transactions', 'Year', 'Month', 'Notes'];
  const example = [
    ['شادي باسم عبد الجواد', '5006', 120, 2026, 10, ''],
    ['Team Beta', '5007', 85, 2026, 10, ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
  headers.forEach((_, c) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cell]) ws[cell].s = hdrStyle;
  });
  ws['!cols'] = [180, 80, 150, 60, 60, 120].map((w) => ({ wch: w / 7 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Online-QO');
  XLSX.writeFile(wb, 'Online-QO-template.xlsx');
}

// ─── KPI chip ─────────────────────────────────────────────────────────────────
const KpiChip = ({ label, value, color }) => (
  <Box sx={{ textAlign: 'center', px: 2, py: 1 }}>
    <Typography sx={{ fontSize: 11, color: 'var(--text-muted)', mb: 0.25 }}>{label}</Typography>
    <Typography sx={{ fontSize: 18, fontWeight: 700, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
  </Box>
);

// ─── Rate cell ────────────────────────────────────────────────────────────────
const RateCell = ({ value }) => {
  if (value == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const color = value > 15 ? '#DC2626' : value > 7 ? '#D97706' : '#16A34A';
  return <span style={{ color, fontWeight: 600 }}>{value}%</span>;
};

// ─── Upload Dialog content ────────────────────────────────────────────────────
const UploadContent = ({ onDone }) => {
  const [wb, setWb]                 = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [chosenSheet, setChosenSheet] = useState('');
  const [targetYear, setTargetYear]   = useState(new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);
  const [parsed, setParsed]         = useState(null); // { rows, errors, detectedSheet, detectedCols }
  const [uploading, setUploading]   = useState(false);
  const fileRef = useRef();

  const handleReparse = (workbook, sheet, y, m) => {
    if (!workbook) return;
    const res = parseSheet(workbook, sheet, y, m);
    setParsed(res);
    if (res.detectedSheet && res.detectedSheet !== sheet) {
      setChosenSheet(res.detectedSheet);
    }
  };

  const onPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const workbook = XLSX.read(ev.target.result, { type: 'array' });
      setWb(workbook);
      const names = workbook.SheetNames || [];
      setSheetNames(names);
      const defaultSheet = names.find((s) => /online[-_\s]?qo/i.test(s.trim())) || names[0] || '';
      setChosenSheet(defaultSheet);
      handleReparse(workbook, defaultSheet, targetYear, targetMonth);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const doUpload = async () => {
    if (!parsed?.rows?.length) return;
    setUploading(true);
    try {
      const res = await api.post('/team-online/upload', { rows: parsed.rows });
      toast.success(`Upload complete — ${res.data.upserted} new, ${res.data.modified} updated.`);
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      {/* What columns are needed */}
      <Box sx={{ mb: 2, p: 2, borderRadius: '10px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5, color: 'var(--text)' }}>
          Subsheet: <code style={{ backgroundColor: 'var(--surface)', padding: '2px 6px', borderRadius: 4, color: 'var(--primary)' }}>Online-QO</code>
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mb: 1.5 }}>
          Your subsheet currently has <b>Team Name</b> and <b>Code</b>. Below is the full column structure:
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 1 }}>
          <Box sx={{ p: 1.25, borderRadius: '6px', border: '1px solid #16A34A', backgroundColor: 'rgba(22,163,74,.05)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Team Name</Typography>
              <Chip label="Already present" size="small" sx={{ height: 16, fontSize: 9.5, backgroundColor: '#16A34A', color: '#fff' }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: 'var(--text-muted)' }}>e.g. شادي باسم عبد الجواد</Typography>
          </Box>

          <Box sx={{ p: 1.25, borderRadius: '6px', border: '1px solid #16A34A', backgroundColor: 'rgba(22,163,74,.05)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Code</Typography>
              <Chip label="Already present" size="small" sx={{ height: 16, fontSize: 9.5, backgroundColor: '#16A34A', color: '#fff' }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: 'var(--text-muted)' }}>e.g. 5006 (Team code)</Typography>
          </Box>

          <Box sx={{ p: 1.25, borderRadius: '6px', border: '2px solid #2563EB', backgroundColor: 'rgba(37,99,235,.07)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8' }}>Online Transactions</Typography>
              <Chip label="Must Add" size="small" sx={{ height: 16, fontSize: 9.5, backgroundColor: '#2563EB', color: '#fff' }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: 'var(--text-muted)' }}>e.g. 100, 350 (Transaction count)</Typography>
          </Box>

          <Box sx={{ p: 1.25, borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Year & Month</Typography>
              <Chip label="Optional column" size="small" sx={{ height: 16, fontSize: 9.5 }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: 'var(--text-muted)' }}>If omitted, uses selector below</Typography>
          </Box>
        </Box>
      </Box>

      {/* Target period and sheet selection */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          select
          label="Default Month"
          size="small"
          value={targetMonth}
          onChange={(e) => {
            const m = Number(e.target.value);
            setTargetMonth(m);
            if (wb) handleReparse(wb, chosenSheet, targetYear, m);
          }}
          sx={{ minWidth: 140 }}
        >
          {MONTHS.map((name, i) => (
            <MenuItem key={i + 1} value={i + 1}>{name} ({i + 1})</MenuItem>
          ))}
        </TextField>

        <TextField
          type="number"
          label="Default Year"
          size="small"
          value={targetYear}
          onChange={(e) => {
            const y = Number(e.target.value);
            setTargetYear(y);
            if (wb) handleReparse(wb, chosenSheet, y, targetMonth);
          }}
          sx={{ width: 110 }}
        />

        {sheetNames.length > 1 && (
          <TextField
            select
            label="Subsheet"
            size="small"
            value={chosenSheet}
            onChange={(e) => {
              const s = e.target.value;
              setChosenSheet(s);
              if (wb) handleReparse(wb, s, targetYear, targetMonth);
            }}
            sx={{ minWidth: 150 }}
          >
            {sheetNames.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        )}

        <Button variant="outlined" size="small" startIcon={<FileDownloadOutlined sx={{ fontSize: 15 }} />} onClick={downloadTemplate} sx={{ ml: 'auto' }}>
          Download template
        </Button>
      </Box>

      {/* Pick file button */}
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<UploadFileOutlined sx={{ fontSize: 18 }} />} onClick={() => fileRef.current?.click()} sx={{ fontWeight: 600 }}>
          {wb ? 'Choose different file' : 'Select Excel file to upload'}
        </Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={onPick} />
      </Box>

      {/* Parse result */}
      {parsed && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
            {parsed.rows.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <CheckCircleOutline sx={{ fontSize: 16, color: '#16A34A' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#16A34A' }}>
                  {parsed.rows.length} valid rows detected from sheet &ldquo;{parsed.detectedSheet}&rdquo;
                </Typography>
              </Box>
            )}
            {parsed.errors.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <ErrorOutline sx={{ fontSize: 16, color: '#DC2626' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#DC2626' }}>
                  {parsed.errors.length} issue(s) found
                </Typography>
              </Box>
            )}
          </Box>

          {parsed.errors.length > 0 && (
            <Box sx={{ mb: 1.5, p: 1.5, borderRadius: '8px', backgroundColor: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.3)' }}>
              {parsed.errors.map((e, i) => (
                <Typography key={i} sx={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>• {e}</Typography>
              ))}
            </Box>
          )}

          {parsed.rows.length > 0 && (
            <>
              {/* Mini preview */}
              <Box sx={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)', mb: 2 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-subtle)' }}>
                      {['Team Name', 'Code', 'Online Transactions', 'Year', 'Month'].map((h) => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 5).map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600 }}>{r.teamName}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>{r.teamCode || '—'}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 700, color: '#2563EB', fontVariantNumeric: 'tabular-nums' }}>{r.onlineTransactions.toLocaleString()}</td>
                        <td style={{ padding: '6px 10px' }}>{r.year}</td>
                        <td style={{ padding: '6px 10px' }}>{monthLabel(r.month)}</td>
                      </tr>
                    ))}
                    {parsed.rows.length > 5 && (
                      <tr><td colSpan={5} style={{ padding: '5px 10px', color: 'var(--text-muted)', fontSize: 11.5 }}>+ {parsed.rows.length - 5} more rows…</td></tr>
                    )}
                  </tbody>
                </table>
              </Box>

              <Button variant="contained" onClick={doUpload} disabled={uploading}
                startIcon={uploading ? <CircularProgress size={13} color="inherit" /> : undefined}>
                {uploading ? 'Uploading…' : `Confirm and upload ${parsed.rows.length} rows`}
              </Button>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const OnlineSectionManager = ({ sx, defaultFilterTeam }) => {
  const user    = useSelector((s) => s?.auth?.user);
  const isAdmin = user?.role === 'Admin';

  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filterYear,  setFilterYear]  = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterTeam,  setFilterTeam]  = useState(defaultFilterTeam || '');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterYear) { params.set('from', `${filterYear}-${filterMonth || '01'}`); params.set('to', `${filterYear}-${filterMonth || '12'}`); }
      const res = await api.get(`/team-online/summary?${params}`);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error('Failed to load online section data.'); }
    finally   { setLoading(false); }
  }, [filterYear, filterMonth]);

  useEffect(() => { load(); }, [load]);

  const deleteRow = async (id) => {
    try { await api.delete(`/team-online/${id}`); setRows((p) => p.filter((r) => r._id !== id)); toast.success('Row deleted.'); }
    catch { toast.error('Delete failed.'); }
  };

  const displayed = useMemo(() => {
    let r = rows;
    if (filterYear)  r = r.filter((x) => x.year  === Number(filterYear));
    if (filterMonth) r = r.filter((x) => x.month === Number(filterMonth));
    if (filterTeam)  r = r.filter((x) => x.teamName.toLowerCase().includes(filterTeam.toLowerCase()));
    return r;
  }, [rows, filterYear, filterMonth, filterTeam]);

  const totals = useMemo(() => {
    const online  = displayed.reduce((s, r) => s + (r.onlineTransactions || 0), 0);
    const samples = displayed.reduce((s, r) => s + (r.samplesToken || 0), 0);
    const dvoc    = displayed.reduce((s, r) => s + (r.dvoc ?? r.issuesFound ?? 0), 0);
    const accountable = displayed.reduce((s, r) => s + (r.accountable || 0), 0);
    const nonAccountable = Math.max(0, dvoc - accountable);
    const adjustedSamples = Math.max(0, samples - nonAccountable);

    return {
      online,
      samples,
      dvoc,
      accountable,
      adjustedSamples,
      sampleRate:      online  > 0 ? +((samples / online)  * 100).toFixed(1) : null,
      dvocSamplePct:   adjustedSamples > 0 ? +((accountable / adjustedSamples) * 100).toFixed(1) : null,
      dvocOnlinePct:   online  > 0 ? +((accountable / online)  * 100).toFixed(2) : null,
    };
  }, [displayed]);

  const exportExcel = () => {
    const data = [
      ['Year','Month','Team Code','Team Name','Online Tx','Samples token','DVOC','Accountable DVOC','Adjusted samples','Sample Rate %','DVOC / Sample %','DVOC / Online %','Notes'],
      ...displayed.map((r) => {
        const dvoc = r.dvoc ?? r.issuesFound ?? 0;
        const acc = r.accountable ?? 0;
        const nonAcc = Math.max(0, dvoc - acc);
        const samples = r.samplesToken || 0;
        const adj = r.adjustedSamples ?? Math.max(0, samples - nonAcc);
        const samplePct = r.dvocSamplePct ?? (adj > 0 ? +((acc / adj) * 100).toFixed(1) : null);
        const onlinePct = r.dvocOnlinePct ?? (r.onlineTransactions > 0 ? +((acc / r.onlineTransactions) * 100).toFixed(2) : null);
        return [
          r.year,
          monthLabel(r.month),
          r.teamCode,
          r.teamName,
          r.onlineTransactions,
          samples,
          dvoc,
          acc,
          adj,
          r.sampleRate ?? '',
          samplePct != null ? `${samplePct}%` : '',
          onlinePct != null ? `${onlinePct}%` : '',
          r.notes,
        ];
      }),
      [],
      [
        'TOTALS','','','',
        totals.online,
        totals.samples,
        totals.dvoc,
        totals.accountable,
        totals.adjustedSamples,
        totals.sampleRate != null ? `${totals.sampleRate}%` : '',
        totals.dvocSamplePct != null ? `${totals.dvocSamplePct}%` : '',
        totals.dvocOnlinePct != null ? `${totals.dvocOnlinePct}%` : '',
        '',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [55,55,80,160,90,80,70,90,80,80,100,100,120].map((w) => ({ wch: w / 7 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Online Section');
    XLSX.writeFile(wb, `online-section-${filterYear || 'all'}.xlsx`);
  };

  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a);

  return (
    <Box sx={sx}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Online Section</Typography>
          <Typography sx={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Upload monthly online transactions — auto-joined with samples &amp; DVOC issues per team.
          </Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<RefreshOutlined sx={{ fontSize: 15 }} />} onClick={load} disabled={loading}>Refresh</Button>
        <Button variant="outlined" size="small" startIcon={<FileDownloadOutlined sx={{ fontSize: 15 }} />} onClick={exportExcel} disabled={!displayed.length}>Export</Button>
        {isAdmin && (
          <Button variant="contained" size="small" startIcon={<UploadFileOutlined sx={{ fontSize: 15 }} />} onClick={() => setUploadOpen(true)}>Upload sheet</Button>
        )}
      </Box>

      {/* KPI Bar */}
      {displayed.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 2, borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
          <KpiChip label="Total Online Tx"  value={num(totals.online)}  color="var(--accent-text)" />
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'var(--border)' }} />
          <KpiChip label="Samples Taken"    value={num(totals.samples)} />
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'var(--border)' }} />
          <KpiChip label="DVOC Total"       value={num(totals.dvoc)}  color={totals.dvoc > 0 ? '#DC2626' : 'var(--text)'} />
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'var(--border)' }} />
          <KpiChip label="Accountable DVOC" value={num(totals.accountable)} color={totals.accountable > 0 ? '#DC2626' : 'var(--text)'} />
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'var(--border)' }} />
          <KpiChip label="Adjusted Samples" value={num(totals.adjustedSamples)} />
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'var(--border)' }} />
          <KpiChip label="Sample Rate %"    value={pct(totals.sampleRate)} />
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'var(--border)' }} />
          <KpiChip label="DVOC / Sample %"  value={pct(totals.dvocSamplePct)}  color={totals.dvocSamplePct > 10 ? '#DC2626' : totals.dvocSamplePct > 5 ? '#D97706' : '#16A34A'} />
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'var(--border)' }} />
          <KpiChip label="DVOC / Online %"  value={pct(totals.dvocOnlinePct)} />
        </Box>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField select label="Year"  size="small" value={filterYear}  onChange={(e) => setFilterYear(e.target.value)}  sx={{ width: 100 }}>
          <MenuItem value="">All</MenuItem>
          {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
        <TextField select label="Month" size="small" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} sx={{ width: 110 }}>
          <MenuItem value="">All</MenuItem>
          {MONTHS.map((m, i) => <MenuItem key={i+1} value={i+1}>{m}</MenuItem>)}
        </TextField>
        <TextField label="Team" size="small" value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} placeholder="Filter team…" sx={{ width: 200 }} />
        <Typography sx={{ fontSize: 12.5, color: 'var(--text-muted)', ml: 'auto' }}>{displayed.length} rows</Typography>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      {/* Table */}
      <Box sx={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-subtle)' }}>
              {[
                'Period',
                'Team Code',
                'Team Name',
                'Online Tx',
                'Samples token',
                'DVOC',
                'Accountable DVOC',
                'Adjusted samples',
                'Sample Rate %',
                'DVOC / Sample %',
                'DVOC / Online %',
                'Notes',
                ...(isAdmin ? [''] : []),
              ].map((h) => (
                <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11.5, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 && !loading && (
              <tr><td colSpan={isAdmin ? 13 : 12} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No online data yet.{isAdmin ? ' Click "Upload sheet" to get started.' : ''}
              </td></tr>
            )}
            {displayed.map((row) => {
              const dvoc = row.dvoc ?? row.issuesFound ?? 0;
              const acc = row.accountable ?? 0;
              const nonAcc = Math.max(0, dvoc - acc);
              const samples = row.samplesToken || 0;
              const adj = row.adjustedSamples ?? Math.max(0, samples - nonAcc);
              const dvocSamplePct = row.dvocSamplePct ?? (adj > 0 ? +((acc / adj) * 100).toFixed(1) : null);
              const dvocOnlinePct = row.dvocOnlinePct ?? (row.onlineTransactions > 0 ? +((acc / row.onlineTransactions) * 100).toFixed(2) : null);

              return (
                <tr key={row._id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}>
                  <td style={{ padding: '7px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{monthLabel(row.month)} {row.year}</td>
                  <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 12 }}>{row.teamCode || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ padding: '7px 12px', fontWeight: 600 }}>{row.teamName}</td>
                  <td style={{ padding: '7px 12px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{num(row.onlineTransactions)}</td>
                  <td style={{ padding: '7px 12px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{num(samples)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right' }}>
                    {dvoc > 0
                      ? <Chip label={dvoc} size="small" sx={{ height: 20, fontSize: 11, backgroundColor: 'rgba(220,38,38,.12)', color: '#DC2626', fontWeight: 700 }} />
                      : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'right' }}>
                    {acc > 0
                      ? <Chip label={acc} size="small" sx={{ height: 20, fontSize: 11, backgroundColor: 'rgba(220,38,38,.12)', color: '#DC2626', fontWeight: 700 }} />
                      : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                  </td>
                  <td style={{ padding: '7px 12px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{num(adj)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(row.sampleRate)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right' }}><RateCell value={dvocSamplePct} /></td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(dvocOnlinePct)}</td>
                  <td style={{ padding: '7px 12px', color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.notes || '—'}</td>
                  {isAdmin && (
                    <td style={{ padding: '7px 8px' }}>
                      <Tooltip title="Delete row">
                        <IconButton size="small" onClick={() => deleteRow(row._id)} sx={{ color: 'var(--text-muted)', '&:hover': { color: '#DC2626' } }}>
                          <DeleteOutline sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>

      {/* Upload Dialog */}
      <AppDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Online Transactions Sheet"
        description="Your Excel sheet must follow the exact column format shown below."
        size="md"
        actions={<Button variant="outlined" onClick={() => setUploadOpen(false)}>Close</Button>}
      >
        <UploadContent onDone={() => { setUploadOpen(false); load(); }} />
      </AppDialog>
    </Box>
  );
};

export default OnlineSectionManager;
