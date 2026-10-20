import { useEffect, useMemo, useState } from 'react';
import { Box, Button, IconButton, InputBase, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ContentCopy from '@mui/icons-material/ContentCopy';
import EditOutlined from '@mui/icons-material/EditOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import SearchIcon from '@mui/icons-material/Search';
import Close from '@mui/icons-material/Close';
import { FaWhatsapp } from 'react-icons/fa6';
import moment from 'moment';
import { toast } from 'sonner';
import api from '../api/api';
import { getWeekNumber } from '../utils/helpers';
import { exportRows } from '../utils/exportRows';
import EditTaskDialog from './task/EditTaskDialog';
import AppDialog from './ui/AppDialog';
import SectionCard from './ui/SectionCard';
import StatCard from './ui/StatCard';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import { gridSx } from '../pages/tasks/gridSx';

const fmt = (d) => (d ? moment(d).format('D MMM YYYY') : '—');
const list = (v) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : v) || '';
const npsOf = (score) => {
  const n = Number(score);
  if (!Number.isFinite(n) || score === null || score === undefined || score === '') return null;
  return n >= 9 ? { label: 'Promoter', tone: 'success' } : n >= 7 ? { label: 'Neutral', tone: 'warning' } : { label: 'Detractor', tone: 'danger' };
};

// Every column the old Excel export had, now through the shared styled exporter.
const EXPORT_COLUMNS = [
  ['Request number', (t) => t.requestNumber],
  ['Operation', (t) => t.operation],
  ['SLID', (t) => t.slid],
  ['PIS date', (t) => (t.pisDate ? new Date(t.pisDate) : '')],
  ['Request date', (t) => (t.contractDate ? new Date(t.contractDate) : '')],
  ['FE date', (t) => (t.feDate || t.appDate ? new Date(t.feDate || t.appDate) : '')],
  ['UN date', (t) => (t.unDate ? new Date(t.unDate) : '')],
  ['In date', (t) => (t.inDate ? new Date(t.inDate) : '')],
  ['Close date', (t) => (t.closeDate ? new Date(t.closeDate) : '')],
  ['Interview date', (t) => (t.interviewDate ? new Date(t.interviewDate) : '')],
  ['Customer', (t) => t.customerName],
  ['Contact', (t) => t.contactNumber],
  ['Customer type', (t) => t.customerType],
  ['Governorate', (t) => t.governorate],
  ['District', (t) => t.district],
  ['Tariff', (t) => t.tarrifName],
  ['Satisfaction score', (t) => t.evaluationScore],
  ['NPS type', (t) => npsOf(t.evaluationScore)?.label || ''],
  ['Feedback severity', (t) => t.priority || ''],
  ['Customer feedback', (t) => t.customerFeedback],
  ['Reason', (t) => list(t.reason)],
  ['Sub reason', (t) => list(t.subReason)],
  ['Root cause', (t) => list(t.rootCause)],
  ['Owner', (t) => list(t.responsible)],
  ['Scoring factors', (t) => list(t.scoringKeys)],
  ['ITN related', (t) => list(t.itnRelated)],
  ['Related to current subscription', (t) => list(t.relatedToSubscription)],
  ['Validation', (t) => t.validationStatus || 'Not validated'],
  ['GAIA check', (t) => t.gaiaCheck],
  ['GAIA content', (t) => t.gaiaContent],
  ['Latest QOps type', (t) => t.latestGaia?.transactionType],
  ['Latest QOps state', (t) => t.latestGaia?.transactionState],
  ['Latest QOps reason', (t) => t.latestGaia?.unfReasonCode],
  ['Field team', (t) => t.teamName],
  ['Team company', (t) => t.teamCompany],
  ['Actions taken', (t) => (t.subTasks || []).map((s, i) => `Step ${i + 1}: ${s.note || ''}`).join('\n')],
];

/** Label / value row used in the detail sections. */
const Field = ({ label, children, wide }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: wide ? '1fr' : '150px minmax(0, 1fr)' }, gap: { xs: 0.25, sm: wide ? 0.5 : 1.5 }, py: 0.875, borderBottom: '1px solid var(--border)', '&:last-of-type': { borderBottom: 0 } }}>
    <Typography sx={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{label}</Typography>
    <Box sx={{ fontSize: 13, color: 'var(--text)', minWidth: 0, wordBreak: 'break-word' }} dir="auto">
      {children === undefined || children === null || children === '' ? <Box component="span" sx={{ color: 'var(--text-muted)' }}>—</Box> : children}
    </Box>
  </Box>
);

/**
 * Tasks behind a number (team, reason, owner, …). Several tasks: KPIs, search and a
 * sortable table; click a row for its details. One task: details straight away.
 * Props unchanged: { open, onClose, tasks, title, teamName, onTaskUpdated }.
 */
export const TaskDetailsDialog = ({ open, onClose, tasks = [], title, teamName, onTaskUpdated }) => {
  const [settings, setSettings] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const displayTitle = title || `Tasks for ${teamName || 'this team'}`;
  const single = tasks.length === 1;
  const selected = single ? tasks[0] : tasks.find((t) => t._id === selectedId) || null;

  useEffect(() => {
    api.get('/settings').then((r) => setSettings(r.data)).catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setQuery('');
    }
  }, [open]);

  // Q-Ops log of the task being viewed
  useEffect(() => {
    if (!open || !selected?._id) {
      setLogs([]);
      return;
    }
    let cancel = false;
    setLoadingLogs(true);
    api.get(`/tasks/tickets/${selected._id}`)
      .then(({ data }) => {
        if (cancel) return;
        setLogs((data || []).sort((a, b) => (new Date(a.eventDate || 0) - new Date(b.eventDate || 0)) || (new Date(a.createdAt) - new Date(b.createdAt))));
      })
      .catch(() => !cancel && setLogs([]))
      .finally(() => !cancel && setLoadingLogs(false));
    return () => { cancel = true; };
  }, [open, selected?._id]);

  const weekOf = (d) => (d ? getWeekNumber(d, settings?.weekStartDay, settings?.week1StartDate, settings?.week1EndDate, settings?.startWeekNumber).week : null);

  const stats = useMemo(() => {
    const scored = tasks.filter((t) => npsOf(t.evaluationScore));
    const det = scored.filter((t) => npsOf(t.evaluationScore).label === 'Detractor').length;
    const neu = scored.filter((t) => npsOf(t.evaluationScore).label === 'Neutral').length;
    const avg = scored.length ? (scored.reduce((s, t) => s + Number(t.evaluationScore), 0) / scored.length).toFixed(1) : '—';
    return { det, neu, avg };
  }, [tasks]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => [t.slid, t.requestNumber, t.customerName, list(t.reason), list(t.subReason), list(t.rootCause), list(t.responsible)].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [tasks, query]);

  const fileBase = (title || `tasks-${teamName || 'team'}`).replace(/[^\w؀-ۿ]+/g, '-').toLowerCase();
  const exportAll = () => {
    try {
      exportRows(selected && !single ? [selected] : tasks, EXPORT_COLUMNS, { filename: selected && !single ? `task-${selected.slid || selected.requestNumber}` : fileBase });
    } catch (e) {
      toast.error(`Export failed: ${e.message}`);
    }
  };

  const copyDetails = async () => {
    const source = selected ? [selected] : tasks;
    const text = [
      displayTitle,
      '',
      ...source.map((t, i) => [
        `=== Task ${i + 1} ===`,
        ...EXPORT_COLUMNS.map(([h, get]) => {
          const v = get(t);
          return `${h}: ${v instanceof Date ? moment(v).format('YYYY-MM-DD') : v ?? ''}`;
        }),
        ...(selected && logs.length ? ['--- Q-Ops log ---', ...logs.map((l, j) => `${j + 1}. ${l.eventDate ? moment(l.eventDate).format('DD/MM/YYYY') : '-'} | ${l.transactionType || l.mainCategory || ''} | ${l.transactionState || ''} | ${l.agentName || ''} | ${l.note || ''}`)] : []),
        '',
      ].join('\n')),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Details copied');
    } catch {
      toast.error('Couldn’t copy to the clipboard');
    }
  };

  const phone = (selected || tasks[0])?.teamId?.contactNumber;
  const openWhatsApp = () => {
    let n = String(phone || '').trim();
    const plus = n.startsWith('+');
    n = n.replace(/[^0-9]/g, '');
    if (n.length < 10 || n.length > 15) {
      toast.error('The team’s phone number isn’t valid');
      return;
    }
    const msg = [displayTitle, '', ...(selected ? [selected] : tasks).map((t, i) => `${i + 1}. ${t.slid || ''} · ${t.customerName || ''} · score ${t.evaluationScore ?? '—'} · ${t.status || ''}`)].join('\n');
    window.open(`https://wa.me/${plus ? '+' : ''}${n}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  const columns = [
    { field: 'interviewDate', headerName: 'Interview', type: 'date', width: 120, valueGetter: (v) => (v ? new Date(v) : null), renderCell: ({ value }) => fmt(value) },
    { field: 'week', headerName: 'Week', type: 'number', width: 80, align: 'left', headerAlign: 'left', valueGetter: (_v, row) => weekOf(row.interviewDate) },
    {
      field: 'slid', headerName: 'SLID', width: 150,
      renderCell: ({ row }) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.slid}</Typography>
          <Typography noWrap sx={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Req. {row.requestNumber}</Typography>
        </Box>
      ),
    },
    { field: 'customerName', headerName: 'Customer', flex: 1, minWidth: 160, renderCell: ({ value }) => <Typography noWrap dir="auto" sx={{ fontSize: 13 }}>{value || '—'}</Typography> },
    {
      field: 'evaluationScore', headerName: 'Score', type: 'number', width: 140, align: 'left', headerAlign: 'left',
      valueGetter: (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null),
      renderCell: ({ value }) => { const n = npsOf(value); return n ? <Badge tone={n.tone}>{n.label} · {value}</Badge> : '—'; },
    },
    { field: 'reason', headerName: 'Reason', flex: 1, minWidth: 150, valueGetter: (v) => list(v) },
    { field: 'rootCause', headerName: 'Root cause', flex: 1, minWidth: 160, valueGetter: (v) => list(v) },
    { field: 'responsible', headerName: 'Owner', width: 120, valueGetter: (v) => list(v) },
  ];

  const detail = selected && (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {!single && <Button variant="text" startIcon={<ArrowBack sx={{ fontSize: 16 }} />} onClick={() => setSelectedId(null)} sx={{ color: 'var(--text-secondary)', mr: 0.5 }}>All tasks</Button>}
        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Request #{selected.requestNumber}</Typography>
        {selected.slid && <Badge outline sx={{ fontFamily: 'var(--font-mono)' }}>{selected.slid}</Badge>}
        {selected.interviewDate && <Badge>Week {weekOf(selected.interviewDate)}</Badge>}
        {npsOf(selected.evaluationScore) && <Badge tone={npsOf(selected.evaluationScore).tone} dot>{npsOf(selected.evaluationScore).label} · {selected.evaluationScore}</Badge>}
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>PIS {fmt(selected.pisDate)}</Typography>
        <Button variant="outlined" startIcon={<EditOutlined sx={{ fontSize: 16 }} />} onClick={() => setEditTask(selected)}>Edit task</Button>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
        <SectionCard title="Customer" bodySx={{ py: 1 }}>
          <Field label="Name">{selected.customerName}</Field>
          <Field label="Contact">{selected.contactNumber}</Field>
          <Field label="Type">{selected.customerType}</Field>
          <Field label="Location">{[selected.governorate, selected.district].filter(Boolean).join(', ')}</Field>
          <Field label="Tariff">{selected.tarrifName}</Field>
        </SectionCard>
        <SectionCard title="Issue" bodySx={{ py: 1 }}>
          <Field label="Reason">{list(selected.reason)}</Field>
          <Field label="Sub reason">{list(selected.subReason)}</Field>
          <Field label="Severity">{selected.priority && selected.priority !== 'Not specified' ? selected.priority : ''}</Field>
          <Field label="Scoring factors">{list(selected.scoringKeys)}</Field>
          <Field label="ITN related">{list(selected.itnRelated)}</Field>
          <Field label="Current subscription">{list(selected.relatedToSubscription)}</Field>
        </SectionCard>
        <SectionCard title="Outcome and team" bodySx={{ py: 1 }}>
          <Field label="Root cause">{list(selected.rootCause)}</Field>
          <Field label="Owner">{list(selected.responsible)}</Field>
          <Field label="Validation"><Badge tone={selected.validationStatus === 'Validated' ? 'success' : 'neutral'} dot>{selected.validationStatus || 'Not validated'}</Badge></Field>
          <Field label="Field team">{selected.teamName}</Field>
          <Field label="Company">{selected.teamCompany}</Field>
        </SectionCard>
      </Box>

      <SectionCard title="Customer feedback" bodySx={{ py: 1.5 }}>
        <Typography dir="auto" sx={{ fontSize: 13.5, whiteSpace: 'pre-wrap', color: selected.customerFeedback ? 'var(--text)' : 'var(--text-muted)' }}>
          {selected.customerFeedback || 'No feedback recorded.'}
        </Typography>
      </SectionCard>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' } }}>
        <SectionCard title="Dates" bodySx={{ py: 1 }}>
          <Field label="Request">{fmt(selected.contractDate)}</Field>
          <Field label="FE">{fmt(selected.feDate || selected.appDate)}</Field>
          <Field label="UN">{fmt(selected.unDate)}</Field>
          <Field label="In">{fmt(selected.inDate)}</Field>
          <Field label="Close">{fmt(selected.closeDate)}</Field>
          <Field label="Interview">{fmt(selected.interviewDate)}</Field>
        </SectionCard>
        <SectionCard
          title="Q-Ops log"
          description={[selected.gaiaCheck && `GAIA check: ${selected.gaiaCheck}`, selected.latestGaia?.transactionType && `Latest: ${[selected.latestGaia.transactionType, selected.latestGaia.transactionState, selected.latestGaia.unfReasonCode].filter(Boolean).join(' · ')}`].filter(Boolean).join(' · ') || undefined}
          padding={0}
          bodySx={{ p: 0 }}
        >
          {selected.gaiaContent && (
            <Typography dir="auto" sx={{ px: 2.5, py: 1.25, fontSize: 12.5, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>{selected.gaiaContent}</Typography>
          )}
          <TableContainer sx={{ maxHeight: 280, border: 0, borderRadius: 0 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type / state</TableCell>
                  <TableCell>Agent</TableCell>
                  <TableCell>Note</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingLogs ? (
                  <TableRow><TableCell colSpan={4} sx={{ color: 'var(--text-muted)', py: 2.5, textAlign: 'center' }}>Loading…</TableCell></TableRow>
                ) : logs.length ? (
                  logs.map((l, i) => (
                    <TableRow key={l._id || i}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{l.eventDate ? moment(l.eventDate).format('D MMM YYYY') : '—'}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12.5 }}>{l.transactionType || l.mainCategory}</Typography>
                        {l.transactionState && <Typography sx={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.transactionState}</Typography>}
                      </TableCell>
                      <TableCell>{l.agentName || '—'}</TableCell>
                      <TableCell dir="auto" sx={{ maxWidth: 320, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{l.note || '—'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} sx={{ color: 'var(--text-muted)', py: 2.5, textAlign: 'center', borderBottom: 0 }}>No Q-Ops entries yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      </Box>
    </Box>
  );

  const overview = !selected && (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' } }}>
        <StatCard label="Tasks" value={tasks.length} />
        <StatCard label="Detractors" value={stats.det} hint="Score 0–6" />
        <StatCard label="Neutrals" value={stats.neu} hint="Score 7–8" />
        <StatCard label="Average score" value={stats.avg} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 32, px: 1.25, width: { xs: '100%', sm: 300 }, borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-xs)', '&:focus-within': { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-ring)' } }}>
          <SearchIcon sx={{ fontSize: 17, color: 'var(--text-muted)' }} />
          <InputBase value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search SLID, customer, reason, owner…" inputProps={{ 'aria-label': 'Search tasks' }} sx={{ flex: 1, fontSize: 13 }} />
          {query && <IconButton size="small" aria-label="Clear search" onClick={() => setQuery('')} sx={{ p: 0.25 }}><Close sx={{ fontSize: 15 }} /></IconButton>}
        </Box>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{rows.length} of {tasks.length} tasks · click a row for details</Typography>
      </Box>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r._id || `${r.slid}-${r.requestNumber}`}
        onRowClick={({ row }) => setSelectedId(row._id)}
        disableRowSelectionOnClick
        autoHeight
        rowHeight={50}
        columnHeaderHeight={40}
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } }, sorting: { sortModel: [{ field: 'interviewDate', sort: 'desc' }] } }}
        slots={{ noRowsOverlay: () => <EmptyState title="No tasks match" description="Clear the search to see all tasks." minHeight={180} /> }}
        sx={{ ...gridSx, minHeight: 260 }}
      />
    </Box>
  );

  return (
    <>
      <AppDialog
        open={open}
        onClose={onClose}
        size="xl"
        title={displayTitle}
        description={selected && !single ? `${selected.customerName || selected.slid || 'Task'} · ${tasks.length} tasks in this view` : `${tasks.length} task${tasks.length === 1 ? '' : 's'}${tasks.length > 1 ? ` · ${stats.det} detractor${stats.det === 1 ? '' : 's'}, ${stats.neu} neutral${stats.neu === 1 ? '' : 's'}` : ''}`}
        extraActions={
          <>
            <Button variant="text" startIcon={<ContentCopy sx={{ fontSize: 16 }} />} onClick={copyDetails} sx={{ color: 'var(--text-secondary)' }}>Copy details</Button>
            {phone && (
              <Tooltip title="Send a summary to the team on WhatsApp">
                <Button variant="text" startIcon={<FaWhatsapp size={15} />} onClick={openWhatsApp} sx={{ color: 'var(--text-secondary)' }}>WhatsApp</Button>
              </Tooltip>
            )}
          </>
        }
        actions={
          <>
            <Button variant="outlined" onClick={onClose}>Close</Button>
            <Button variant="contained" startIcon={<FileDownloadOutlined sx={{ fontSize: 16 }} />} onClick={exportAll} disabled={!tasks.length}>
              {selected && !single ? 'Export this task' : `Export ${tasks.length === 1 ? 'task' : 'tasks'} (.xlsx)`}
            </Button>
          </>
        }
      >
        {tasks.length ? (selected ? detail : overview) : <EmptyState title="No tasks" description="Nothing to show for this selection." />}
      </AppDialog>

      {editTask && (
        <EditTaskDialog
          open={Boolean(editTask)}
          setOpen={(v) => !v && setEditTask(null)}
          task={editTask}
          handleTaskUpdate={(updated) => {
            setEditTask(null);
            onTaskUpdated?.(updated);
          }}
        />
      )}
    </>
  );
};
