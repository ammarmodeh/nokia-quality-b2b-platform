import React, { useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Grid,
    alpha,
    useTheme,
    TextField,
    InputAdornment,
    IconButton,
    Tooltip as MuiTooltip,
    TableSortLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Divider,
    Slide,
    ToggleButtonGroup,
    ToggleButton
} from '@mui/material';
import {
    MdSearch,
    MdFileDownload,
    MdInsights,
    MdClose,
    MdBarChart,
    MdPieChart,
    MdShowChart
} from 'react-icons/md';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ComposedChart,
    Line,
    Area,
    LineChart
} from 'recharts';
import * as XLSX from 'xlsx';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

// --- Professional Chart Dialog ---
const ProfessionalChartDialog = ({ open, onClose, title, data, type: initialType = 'line', stackKeys = [] }) => {
    const theme = useTheme();
    const [chartType, setChartType] = useState(initialType);

    // Sync with initialType when dialog opens
    React.useEffect(() => {
        if (open) setChartType(initialType);
    }, [open, initialType]);

    const renderChart = () => {
        const labelStyle = { fill: '#fff', fontSize: 10, fontWeight: 600 };
        const colors = ['#7b68ee', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

        switch (chartType) {
            case 'radar':
                const radarKey = data[0]?.cases !== undefined ? 'cases' : (data[0]?.total !== undefined ? 'total' : 'value');
                return (
                    <ResponsiveContainer width="100%" height={500}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                            <PolarGrid stroke="#444" />
                            <PolarAngleAxis dataKey="name" tick={{ fill: '#aaa', fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#aaa' }} />
                            <Radar name="Primary Metric" dataKey={radarKey} stroke="#7b68ee" fill="#7b68ee" fillOpacity={0.6} />
                            {data[0]?.detractors !== undefined && <Radar name="Detractors" dataKey="detractors" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />}
                            <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: 'none', borderRadius: 8, color: '#fff' }} />
                            <Legend wrapperStyle={{ paddingTop: 20 }} />
                        </RadarChart>
                    </ResponsiveContainer>
                );
            case 'area':
                const areaKey = data[0]?.cases !== undefined ? 'cases' : (data[0]?.total !== undefined ? 'total' : 'count');
                return (
                    <ResponsiveContainer width="100%" height={500}>
                        <ComposedChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" tick={{ fill: '#aaa', fontSize: 10 }} angle={-15} textAnchor="end" height={80} />
                            <YAxis tick={{ fill: '#aaa' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: 'none', borderRadius: 8 }} />
                            <Legend wrapperStyle={{ paddingTop: 10 }} />
                            <Area type="monotone" dataKey={areaKey} name="Volume" fill="#7b68ee" stroke="#7b68ee" fillOpacity={0.3} label={{ position: 'top', ...labelStyle }} />
                            {data[0]?.neutrals !== undefined && <Bar dataKey="neutrals" name="Neutrals" barSize={20} fill="#f59e0b" label={{ position: 'top', ...labelStyle }} />}
                            {data[0]?.detractors !== undefined && <Line type="monotone" dataKey="detractors" name="Detractors" stroke="#ef4444" strokeWidth={3} dot={{ r: 6 }} label={{ position: 'top', ...labelStyle }} />}
                        </ComposedChart>
                    </ResponsiveContainer>
                );
            case 'line':
                const lineKey = data[0]?.cases !== undefined ? 'cases' : (data[0]?.total !== undefined ? 'total' : 'count');
                return (
                    <ResponsiveContainer width="100%" height={500}>
                        <LineChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" tick={{ fill: '#aaa', fontSize: 10 }} angle={-15} textAnchor="end" height={80} />
                            <YAxis tick={{ fill: '#aaa' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: 'none', borderRadius: 8 }} />
                            <Legend wrapperStyle={{ paddingTop: 10 }} />
                            <Line type="monotone" dataKey={lineKey} name="Volume" stroke="#7b68ee" strokeWidth={4} dot={{ r: 6 }} label={{ position: 'top', ...labelStyle }} />
                            {data[0]?.detractors !== undefined && <Line type="monotone" dataKey="detractors" name="Detractors" stroke="#ef4444" strokeWidth={3} dot={{ r: 6 }} label={{ position: 'top', ...labelStyle }} />}
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                const pieKey = data[0]?.value !== undefined ? 'value' : (data[0]?.total !== undefined ? 'total' : (data[0]?.cases !== undefined ? 'cases' : 'count'));
                return (
                    <ResponsiveContainer width="100%" height={500}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={100}
                                outerRadius={180}
                                paddingAngle={5}
                                dataKey={(d) => d[pieKey] || 0}
                                nameKey="name"
                                label={({ name, value, percent }) => {
                                    const pctValue = (percent * 100).toFixed(1);
                                    return `${name}: ${value} (${pctValue}%)`;
                                }}
                                labelLine={{ stroke: '#666' }}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: 'none', borderRadius: 8 }} />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: 20 }} />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'stack':
            case 'bar':
            default:
                const isMatrix = stackKeys.length > 0;
                // Detect which keys to use for the bars
                const hasCases = data.some(d => d.cases !== undefined);
                const hasValue = data.some(d => d.value !== undefined);
                const hasTotal = data.some(d => d.total !== undefined);
                const hasNeutrals = data.some(d => d.neutrals !== undefined);
                const hasDetractors = data.some(d => d.detractors !== undefined);

                return (
                    <ResponsiveContainer width="100%" height={isMatrix ? 600 : 500}>
                        <BarChart data={data} layout={isMatrix ? "vertical" : "horizontal"} margin={{ top: 30, right: 30, left: isMatrix ? 120 : 20, bottom: isMatrix ? 20 : 80 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={!isMatrix} vertical={isMatrix} />
                            {isMatrix ? (
                                <>
                                    <XAxis type="number" tick={{ fill: '#aaa' }} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#aaa', fontSize: 10 }} width={110} />
                                </>
                            ) : (
                                <>
                                    <XAxis dataKey="name" tick={{ fill: '#aaa', fontSize: 10 }} angle={-15} textAnchor="end" height={80} />
                                    <YAxis tick={{ fill: '#aaa' }} />
                                </>
                            )}
                            <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: 'none', borderRadius: 8 }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Legend wrapperStyle={{ paddingTop: 10 }} />
                            {isMatrix ? (
                                stackKeys.map((key, i) => (
                                    <Bar key={key} dataKey={(d) => d[key] || 0} name={key} stackId="a" fill={colors[i % colors.length]} label={{ position: 'center', fill: '#fff', fontSize: 9 }} />
                                ))
                            ) : (
                                <>
                                    {hasCases && <Bar dataKey="cases" name="Total Volume" fill="#7b68ee" radius={[4, 4, 0, 0]} label={{ position: 'top', ...labelStyle }} />}
                                    {!hasCases && hasValue && <Bar dataKey="value" name="Value" fill="#7b68ee" radius={[4, 4, 0, 0]} label={{ position: 'top', ...labelStyle }} />}
                                    {!hasCases && !hasValue && hasTotal && <Bar dataKey="total" name="Total" fill="#7b68ee" radius={[4, 4, 0, 0]} label={{ position: 'top', ...labelStyle }} />}
                                    {hasNeutrals && <Bar dataKey="neutrals" name="Neutrals" fill="#f59e0b" radius={[4, 4, 0, 0]} label={{ position: 'top', ...labelStyle }} />}
                                    {hasDetractors && <Bar dataKey="detractors" name="Detractors" fill="#ef4444" radius={[4, 4, 0, 0]} label={{ position: 'top', ...labelStyle }} />}
                                </>
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                );
        }
    };

    const chartOptions = [
        ...(initialType === 'stack' ? [{ type: 'stack', label: 'Matrix', icon: <MdBarChart /> }] : []),
        { type: 'line', label: 'Line', icon: <MdShowChart /> },
        { type: 'area', label: 'Area', icon: <MdInsights /> },
        { type: 'radar', label: 'Radar', icon: <MdInsights /> },
        { type: 'pie', label: 'Pie', icon: <MdPieChart /> }
    ];

    return (
        <Dialog
            fullWidth
            maxWidth="lg"
            open={open}
            onClose={onClose}
            TransitionComponent={Transition}
            PaperProps={{
                sx: {
                    bgcolor: '#121212',
                    backgroundImage: 'none',
                    border: '1px solid #333',
                    boxShadow: '0 0 50px rgba(0,0,0,0.8)',
                    minHeight: '80vh'
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', py: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ color: '#7b68ee', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {title} <span style={{ color: alpha('#fff', 0.5), fontSize: '0.9rem' }}>Analytics Insight</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: alpha('#fff', 0.3), fontWeight: 600 }}>
                        Detailed Distribution & Correlation Matrix Analysis
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', bgcolor: alpha('#fff', 0.05), p: 0.5, borderRadius: '12px', border: '1px solid #444' }}>
                        {chartOptions.map((opt) => (
                            <MuiTooltip key={opt.type} title={`${opt.label} View`}>
                                <IconButton
                                    size="small"
                                    onClick={() => setChartType(opt.type)}
                                    sx={{
                                        color: chartType === opt.type ? '#fff' : alpha('#fff', 0.4),
                                        bgcolor: chartType === opt.type ? '#7b68ee' : 'transparent',
                                        '&:hover': { bgcolor: chartType === opt.type ? '#7b68ee' : alpha('#fff', 0.1) },
                                        borderRadius: '8px',
                                        transition: '0.3s'
                                    }}
                                >
                                    {opt.icon}
                                </IconButton>
                            </MuiTooltip>
                        ))}
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: 'white' }}>
                        <MdClose />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 4 }}>
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800 }}>
                        {title} Performance Overview
                    </Typography>
                    <Typography variant="body2" sx={{ color: alpha('#fff', 0.4) }}>
                        Visualizing data distribution through {chartType.toUpperCase()} representation.
                        Hover on elements for specific values.
                    </Typography>
                </Box>
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    {renderChart()}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid #333' }}>
                <Button onClick={onClose} variant="contained" sx={{ bgcolor: '#7b68ee', '&:hover': { bgcolor: alpha('#7b68ee', 0.8) }, fontWeight: 800, px: 4 }}>
                    Done with Analysis
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const AllTasksDeepDiveAnalytics = ({ tasks, periodLabel, onDrillDown }) => {
    const theme = useTheme();

    // --- States ---
    const [ownerSearch, setOwnerSearch] = useState('');
    const [reasonSearch, setReasonSearch] = useState('');
    const [ownerSort, setOwnerSort] = useState({ field: 'cases', order: 'desc' });
    const [reasonSort, setReasonSort] = useState({ field: 'cases', order: 'desc' });

    // Dialog State
    const [chartDialog, setChartDialog] = useState({ open: false, title: '', data: [], type: 'area', stackKeys: [] });

    // Helper functions
    const getFlatValues = (task, field) => {
        const val = task[field];
        if (Array.isArray(val)) return val.length > 0 ? val : ['Unknown'];
        if (val && typeof val === 'string' && val.trim()) return [val.trim()];
        return ['Unknown'];
    };

    const getHeatmapColor = (value, min = 0, max = 100, type = 'green') => {
        const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
        const colors = {
            green: `rgba(16, 185, 129, ${percentage * 0.4 + 0.05})`,
            blue: `rgba(123, 104, 238, ${percentage * 0.4 + 0.05})`,
            orange: `rgba(245, 158, 11, ${percentage * 0.4 + 0.05})`,
            red: `rgba(239, 68, 68, ${percentage * 0.4 + 0.05})`
        };
        return colors[type] || colors.green;
    };

    const exportToExcel = (data, fileName) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Analytics");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    };

    // --- DATA PROCESSING ---
    const segmentationData = useMemo(() => {
        const total = tasks.length;
        if (total === 0) return [];
        const segments = {
            Promoter: { count: 0, color: '#10b981' },
            Neutral: { count: 0, color: '#f59e0b' },
            Detractor: { count: 0, color: '#ef4444' }
        };
        tasks.forEach(task => {
            const score = task.evaluationScore;
            if (score >= 9) segments.Promoter.count++;
            else if (score >= 7) segments.Neutral.count++;
            else segments.Detractor.count++;
        });
        return Object.entries(segments).map(([name, data]) => ({
            name,
            value: data.count,
            percentage: ((data.count / total) * 100).toFixed(1),
            color: data.color
        })).filter(s => s.value > 0);
    }, [tasks]);

    // const validatedTasks = useMemo(() => tasks.filter(t => t.validationStatus === 'Validated'), [tasks]);
    // Uses 'tasks' directly for analytics to show actual numbers as requested
    const analyzedTasks = tasks; // Alias for clarity, or just use tasks

    const ownerPerformance = useMemo(() => {
        const stats = {};
        analyzedTasks.forEach(task => {
            const owners = getFlatValues(task, 'responsible');
            owners.forEach(owner => {
                if (!stats[owner]) stats[owner] = { name: owner, cases: 0, neutrals: 0, detractors: 0 };
                stats[owner].cases++;
                const score = task.evaluationScore;
                if (score >= 7 && score <= 8) stats[owner].neutrals++;
                else if (score >= 0 && score <= 6 && score !== null) stats[owner].detractors++; // Ensure score is valid
            });
        });
        const totalValidated = Object.values(stats).reduce((acc, curr) => acc + curr.cases, 0);
        let rows = Object.values(stats).map(s => ({
            ...s,
            percentageLabel: totalValidated > 0 ? ((s.cases / totalValidated) * 100).toFixed(0) : 0,
            percentageValue: totalValidated > 0 ? (s.cases / totalValidated) * 100 : 0,
            neutralPctValue: s.cases > 0 ? (s.neutrals / s.cases) * 100 : 0,
            detractorPctValue: s.cases > 0 ? (s.detractors / s.cases) * 100 : 0
        }));
        if (ownerSearch) rows = rows.filter(r => r.name.toLowerCase().includes(ownerSearch.toLowerCase()));
        rows.sort((a, b) => {
            const isDesc = ownerSort.order === 'desc';
            const aVal = a[ownerSort.field];
            const bVal = b[ownerSort.field];
            if (typeof aVal === 'string') return isDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
            return isDesc ? bVal - aVal : aVal - bVal;
        });
        return rows;
    }, [analyzedTasks, ownerSearch, ownerSort]);

    const reasonAnalysis = useMemo(() => {
        const stats = {};
        analyzedTasks.forEach(task => {
            const reasons = getFlatValues(task, 'reason');
            reasons.forEach(reason => {
                if (!stats[reason]) stats[reason] = { name: reason, cases: 0, neutrals: 0, detractors: 0 };
                stats[reason].cases++;
                const score = task.evaluationScore;
                if (score >= 7 && score <= 8) stats[reason].neutrals++;
                else if (score >= 0 && score <= 6 && score !== null) stats[reason].detractors++;
            });
        });
        const totalCases = Object.values(stats).reduce((acc, curr) => acc + curr.cases, 0);
        let rows = Object.values(stats).map(s => ({
            ...s,
            percentageLabel: totalCases > 0 ? ((s.cases / totalCases) * 100).toFixed(0) : 0,
            percentageValue: totalCases > 0 ? (s.cases / totalCases) * 100 : 0,
            neutralPctValue: s.cases > 0 ? (s.neutrals / s.cases) * 100 : 0,
            detractorPctValue: s.cases > 0 ? (s.detractors / s.cases) * 100 : 0
        }));
        if (reasonSearch) rows = rows.filter(r => r.name.toLowerCase().includes(reasonSearch.toLowerCase()));
        rows.sort((a, b) => {
            const isDesc = reasonSort.order === 'desc';
            const aVal = a[reasonSort.field];
            const bVal = b[reasonSort.field];
            if (typeof aVal === 'string') return isDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
            return isDesc ? bVal - aVal : aVal - bVal;
        });
        return rows;
    }, [analyzedTasks, reasonSearch, reasonSort]);

    const itnAnalysis = useMemo(() => {
        const stats = {};
        analyzedTasks.forEach(task => {
            const values = getFlatValues(task, 'itnRelated');
            values.forEach(val => {
                if (!stats[val]) stats[val] = { name: val, cases: 0, neutrals: 0, detractors: 0 };
                stats[val].cases++;
                const score = task.evaluationScore;
                if (score >= 7 && score <= 8) stats[val].neutrals++;
                else if (score >= 0 && score <= 6 && score !== null) stats[val].detractors++;
            });
        });
        const totalCases = Object.values(stats).reduce((acc, curr) => acc + curr.cases, 0);
        return Object.values(stats).map(s => ({
            ...s,
            percentageLabel: totalCases > 0 ? ((s.cases / totalCases) * 100).toFixed(0) : 0,
            percentageValue: totalCases > 0 ? (s.cases / totalCases) * 100 : 0,
            neutralPctValue: s.cases > 0 ? (s.neutrals / s.cases) * 100 : 0,
            detractorPctValue: s.cases > 0 ? (s.detractors / s.cases) * 100 : 0
        })).sort((a, b) => b.cases - a.cases);
    }, [analyzedTasks]);

    const subscriptionAnalysis = useMemo(() => {
        const stats = {};
        analyzedTasks.forEach(task => {
            const values = getFlatValues(task, 'relatedToSubscription');
            values.forEach(val => {
                if (!stats[val]) stats[val] = { name: val, cases: 0, neutrals: 0, detractors: 0 };
                stats[val].cases++;
                const score = task.evaluationScore;
                if (score >= 7 && score <= 8) stats[val].neutrals++;
                else if (score >= 0 && score <= 6 && score !== null) stats[val].detractors++;
            });
        });
        const totalCases = Object.values(stats).reduce((acc, curr) => acc + curr.cases, 0);
        return Object.values(stats).map(s => ({
            ...s,
            percentageLabel: totalCases > 0 ? ((s.cases / totalCases) * 100).toFixed(0) : 0,
            percentageValue: totalCases > 0 ? (s.cases / totalCases) * 100 : 0,
            neutralPctValue: s.cases > 0 ? (s.neutrals / s.cases) * 100 : 0,
            detractorPctValue: s.cases > 0 ? (s.detractors / s.cases) * 100 : 0
        })).sort((a, b) => b.cases - a.cases);
    }, [analyzedTasks]);

    const contributionMatrix = useMemo(() => {
        const matrix = {};
        const ownerTotals = {};
        const topReasons = reasonAnalysis.slice(0, 10).map(r => r.name);
        const topOwners = ownerPerformance.slice(0, 8).map(o => o.name);
        analyzedTasks.forEach(task => {
            const reasons = getFlatValues(task, 'reason');
            const owners = getFlatValues(task, 'responsible');

            // Fix for cross-association:
            // If strictly multiple owners AND multiple reasons, assume 1:1 mapping by index.
            // Otherwise (e.g. 1 owner for 3 reasons), keep cross-product.
            if (reasons.length > 1 && owners.length > 1) {
                const len = Math.min(reasons.length, owners.length);
                for (let i = 0; i < len; i++) {
                    const r = reasons[i];
                    const o = owners[i];

                    if (!topReasons.includes(r)) continue;
                    if (!matrix[r]) matrix[r] = { total: 0 };

                    if (!topOwners.includes(o)) continue;

                    // Increment specific cell
                    matrix[r][o] = (matrix[r][o] || 0) + 1;
                    matrix[r].total++;
                    ownerTotals[o] = (ownerTotals[o] || 0) + 1;
                }
            } else {
                // Fallback: Cross-product (for 1 owner -> N reasons, or N owners -> 1 reason)
                reasons.forEach(r => {
                    if (!topReasons.includes(r)) return;
                    if (!matrix[r]) matrix[r] = { total: 0 };
                    owners.forEach(o => {
                        if (!topOwners.includes(o)) return;
                        matrix[r][o] = (matrix[r][o] || 0) + 1;
                        matrix[r].total++;
                        ownerTotals[o] = (ownerTotals[o] || 0) + 1;
                    });
                });
            }
        });
        return { matrix, topReasons, topOwners, ownerTotals };
    }, [analyzedTasks, reasonAnalysis, ownerPerformance]);

    const rootCauseAnalysis = useMemo(() => {
        const stats = {};
        analyzedTasks.forEach(task => {
            const values = getFlatValues(task, 'rootCause');
            values.forEach(val => {
                if (!stats[val]) stats[val] = { name: val, cases: 0, neutrals: 0, detractors: 0 };
                stats[val].cases++;
                const score = task.evaluationScore;
                if (score >= 7 && score <= 8) stats[val].neutrals++;
                else if (score >= 0 && score <= 6 && score !== null) stats[val].detractors++;
            });
        });
        const totalCases = Object.values(stats).reduce((acc, curr) => acc + curr.cases, 0);
        return Object.values(stats).map(s => ({
            ...s,
            percentageLabel: totalCases > 0 ? ((s.cases / totalCases) * 100).toFixed(0) : 0,
            percentageValue: totalCases > 0 ? (s.cases / totalCases) * 100 : 0,
            neutralPctValue: s.cases > 0 ? (s.neutrals / s.cases) * 100 : 0,
            detractorPctValue: s.cases > 0 ? (s.detractors / s.cases) * 100 : 0
        })).sort((a, b) => b.cases - a.cases);
    }, [analyzedTasks]);

    const rootCauseMatrix = useMemo(() => {
        const matrix = {};
        const ownerTotals = {};
        const topRCs = rootCauseAnalysis.slice(0, 10).map(r => r.name);
        const topOwners = ownerPerformance.slice(0, 8).map(o => o.name);
        analyzedTasks.forEach(task => {
            const rcs = getFlatValues(task, 'rootCause');
            const owners = getFlatValues(task, 'responsible');

            if (rcs.length > 1 && owners.length > 1) {
                const len = Math.min(rcs.length, owners.length);
                for (let i = 0; i < len; i++) {
                    const r = rcs[i];
                    const o = owners[i];
                    if (!topRCs.includes(r)) continue;
                    if (!matrix[r]) matrix[r] = { total: 0 };
                    if (!topOwners.includes(o)) continue;
                    matrix[r][o] = (matrix[r][o] || 0) + 1;
                    matrix[r].total++;
                    ownerTotals[o] = (ownerTotals[o] || 0) + 1;
                }
            } else {
                rcs.forEach(r => {
                    if (!topRCs.includes(r)) return;
                    if (!matrix[r]) matrix[r] = { total: 0 };
                    owners.forEach(o => {
                        if (!topOwners.includes(o)) return;
                        matrix[r][o] = (matrix[r][o] || 0) + 1;
                        matrix[r].total++;
                        ownerTotals[o] = (ownerTotals[o] || 0) + 1;
                    });
                });
            }
        });
        return { matrix, topRCs, topOwners, ownerTotals };
    }, [analyzedTasks, rootCauseAnalysis, ownerPerformance]);

    const hierarchyData = useMemo(() => {
        const data = {};
        tasks.forEach(task => {
            const reasons = getFlatValues(task, 'reason');
            const subReasons = getFlatValues(task, 'subReason');
            const rootCauses = getFlatValues(task, 'rootCause');
            reasons.forEach(r => {
                if (!data[r]) data[r] = { count: 0, subs: {} };
                data[r].count++;
                subReasons.forEach(sr => {
                    if (!data[r].subs[sr]) data[r].subs[sr] = { count: 0, rcs: {} };
                    data[r].subs[sr].count++;
                    rootCauses.forEach(rc => {
                        if (!data[r].subs[sr].rcs[rc]) data[r].subs[sr].rcs[rc] = 0;
                        data[r].subs[sr].rcs[rc]++;
                    });
                });
            });
        });
        return data;
    }, [tasks]);

    // --- UI COMPONENTS ---
    const SectionHeader = ({ title, onSearchChange, searchValue, onExport, dataToExport, chartType = 'area', stackKeys = [] }) => (
        <Box sx={{
            bgcolor: alpha('#7b68ee', 0.05),
            color: '#fff',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            borderBottom: '1px solid #333'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 4, height: 20, bgcolor: '#7b68ee', borderRadius: 4 }} />
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: alpha('#fff', 0.9) }}>
                        {title}
                    </Typography>
                    {periodLabel && (
                        <Typography variant="caption" sx={{ color: '#7b68ee', fontWeight: 700, display: 'block', mt: -0.5, fontSize: '0.65rem' }}>
                            PERIOD: {periodLabel}
                        </Typography>
                    )}
                </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {onSearchChange !== undefined && (
                    <TextField
                        size="small"
                        placeholder="Quick Filter..."
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        sx={{
                            width: 180,
                            '& .MuiInputBase-root': {
                                height: 32,
                                fontSize: '0.8rem',
                                bgcolor: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                borderRadius: '8px',
                                '& fieldset': { border: '1px solid #444' },
                                '&:hover fieldset': { borderColor: '#7b68ee' }
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <MdSearch color="#7b68ee" size={18} />
                                </InputAdornment>
                            )
                        }}
                    />
                )}
                <MuiTooltip title="View Advanced Chart">
                    <IconButton
                        size="small"
                        onClick={() => setChartDialog({ open: true, title, data: dataToExport, type: chartType, stackKeys })}
                        sx={{ color: '#7b68ee', bgcolor: alpha('#7b68ee', 0.1), '&:hover': { bgcolor: alpha('#7b68ee', 0.2) } }}
                    >
                        <MdInsights size={20} />
                    </IconButton>
                </MuiTooltip>
                <MuiTooltip title="Export to Excel">
                    <IconButton
                        size="small"
                        onClick={() => onExport(dataToExport, title.replace(/\s+/g, '_'))}
                        sx={{ color: '#10b981', bgcolor: alpha('#10b981', 0.1), '&:hover': { bgcolor: alpha('#10b981', 0.2) } }}
                    >
                        <MdFileDownload size={20} />
                    </IconButton>
                </MuiTooltip>
            </Box>
        </Box>
    );

    const StyledTableCell = (props) => (
        <TableCell
            {...props}
            sx={{
                py: 1.5,
                px: 2,
                borderBottom: '1px solid #2d2d2d',
                fontSize: '0.85rem',
                color: alpha('#fff', 0.8),
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'rgba(123, 104, 238, 0.05)', color: '#fff' },
                ...props.sx
            }}
        />
    );

    const HeaderCell = (props) => (
        <TableCell
            {...props}
            sx={{
                py: 1.5,
                px: 2,
                bgcolor: '#1a1a1a',
                borderBottom: '2px solid #333',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: '#7b68ee',
                textTransform: 'uppercase',
                letterSpacing: 1,
                position: 'sticky',
                top: 0,
                zIndex: 10,
                ...props.sx
            }}
        />
    );

    const SortLabel = ({ field, activeSort, setSort, children }) => (
        <TableSortLabel
            active={activeSort.field === field}
            direction={activeSort.field === field ? activeSort.order : 'desc'}
            onClick={() => setSort({
                field,
                order: activeSort.field === field && activeSort.order === 'desc' ? 'asc' : 'desc'
            })}
            sx={{
                color: 'inherit !important',
                '& .MuiTableSortLabel-icon': { color: '#7b68ee !important' }
            }}
        >
            {children}
        </TableSortLabel>
    );

    if (!tasks.length) return null;

    return (
        <Box sx={{ mt: 4 }}>
            {/* --- UNIFIED DETAILED REPORT CARD --- */}
            <Paper sx={{
                bgcolor: '#121212',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #333',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* TOP BAR / TITLE */}
                <Box sx={{ p: 4, pb: 2, borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#fff', mb: 0.5, letterSpacing: -0.5 }}>
                            Deep Dive Analytics <span style={{ color: '#7b68ee' }}>Report</span>
                        </Typography>
                        <Typography variant="body2" sx={{ color: alpha('#fff', 0.5), fontWeight: 500 }}>
                            Advanced performance, segmentation, and contribution analysis generated from {tasks.length} cases.
                        </Typography>
                    </Box>
                    {/* <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="overline" sx={{ color: '#7b68ee', fontWeight: 900, fontSize: '0.75rem' }}>
                            Nokia Quality B2B Platform
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: alpha('#fff', 0.3) }}>
                            v2.0 DeepEngine Performance Matrix
                        </Typography>
                    </Box> */}
                </Box>

                {/* 1. SEGMENTATION & OVERVIEW GRID */}
                <Box sx={{ p: 3 }}>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={7}>
                            <Box sx={{ border: '1px solid #2d2d2d', borderRadius: '8px', overflow: 'hidden' }}>
                                <SectionHeader title="Segmentation Data" onExport={exportToExcel} dataToExport={segmentationData} chartType="pie" />
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <HeaderCell>Customer Sentiment</HeaderCell>
                                                <HeaderCell align="center">Case Count</HeaderCell>
                                                <HeaderCell align="center">Matrix Share</HeaderCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {segmentationData.map((row) => (
                                                <TableRow
                                                    key={row.name}
                                                    hover
                                                    onClick={() => onDrillDown && onDrillDown({ sentiment: row.name }, `Sentiment Analysis: ${row.name}`)}
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    <StyledTableCell sx={{ color: row.color, fontWeight: 700 }}>{row.name}</StyledTableCell>
                                                    <StyledTableCell align="center" sx={{ bgcolor: alpha(row.color, 0.05), borderLeft: `6px solid ${row.color}` }}>{row.value}</StyledTableCell>
                                                    <StyledTableCell align="center" sx={{ bgcolor: getHeatmapColor(parseFloat(row.percentage), 0, 100, row.name === 'Promoter' ? 'green' : row.name === 'Neutral' ? 'orange' : 'red'), fontWeight: 800 }}>
                                                        {row.percentage}%
                                                    </StyledTableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <Box sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid #2d2d2d', borderRadius: '8px', bgcolor: alpha('#fff', 0.02) }}>
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie data={segmentationData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={8} dataKey="value">
                                            {segmentationData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: 'none', borderRadius: 8 }} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>

                <Divider sx={{ borderColor: '#2d2d2d', mx: 3 }} />

                {/* 2. OWNER PERFORMANCE SECTION */}
                <Box sx={{ p: 3 }}>
                    <Box sx={{ border: '1px solid #2d2d2d', borderRadius: '8px', overflow: 'hidden' }}>
                        <SectionHeader title="Owner Performance Matrix" onSearchChange={setOwnerSearch} searchValue={ownerSearch} onExport={exportToExcel} dataToExport={ownerPerformance} chartType="radar" />
                        <TableContainer sx={{ maxHeight: 500 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <HeaderCell><SortLabel field="name" activeSort={ownerSort} setSort={setOwnerSort}>Resource Owner</SortLabel></HeaderCell>
                                        <HeaderCell align="center"><SortLabel field="cases" activeSort={ownerSort} setSort={setOwnerSort}>Validated Cases</SortLabel></HeaderCell>
                                        <HeaderCell align="center"><SortLabel field="percentageValue" activeSort={ownerSort} setSort={setOwnerSort}>Total %</SortLabel></HeaderCell>
                                        <HeaderCell align="center" sx={{ color: '#f59e0b' }}><SortLabel field="neutrals" activeSort={ownerSort} setSort={setOwnerSort}>Neutrals</SortLabel></HeaderCell>
                                        <HeaderCell align="center" sx={{ color: '#f59e0b' }}><SortLabel field="neutralPctValue" activeSort={ownerSort} setSort={setOwnerSort}>%</SortLabel></HeaderCell>
                                        <HeaderCell align="center" sx={{ color: '#ef4444' }}><SortLabel field="detractors" activeSort={ownerSort} setSort={setOwnerSort}>Detractors</SortLabel></HeaderCell>
                                        <HeaderCell align="center" sx={{ color: '#ef4444' }}><SortLabel field="detractorPctValue" activeSort={ownerSort} setSort={setOwnerSort}>%</SortLabel></HeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {ownerPerformance.map((row) => (
                                        <TableRow
                                            key={row.name}
                                            hover
                                            onClick={() => onDrillDown && onDrillDown({ responsible: row.name }, `Owner Performance: ${row.name}`)}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <StyledTableCell sx={{ fontWeight: 800, color: '#fff' }}>{row.name}</StyledTableCell>
                                            <StyledTableCell align="center" sx={{ bgcolor: alpha('#7b68ee', 0.1), fontWeight: 700 }}>{row.cases}</StyledTableCell>
                                            <StyledTableCell align="center" sx={{ fontWeight: 900, bgcolor: getHeatmapColor(row.percentageValue, 0, 50, 'blue') }}>{row.percentageLabel}%</StyledTableCell>
                                            <StyledTableCell align="center" sx={{ color: '#f59e0b', fontWeight: 600 }}>{row.neutrals}</StyledTableCell>
                                            <StyledTableCell align="center" sx={{ bgcolor: getHeatmapColor(row.neutralPctValue, 0, 40, 'orange'), color: '#fff' }}>{row.neutralPctValue.toFixed(1)}%</StyledTableCell>
                                            <StyledTableCell align="center" sx={{ color: '#ef4444', fontWeight: 600 }}>{row.detractors}</StyledTableCell>
                                            <StyledTableCell align="center" sx={{ bgcolor: getHeatmapColor(row.detractorPctValue, 0, 40, 'red'), color: '#fff' }}>{row.detractorPctValue.toFixed(1)}%</StyledTableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Box>

                <Divider sx={{ borderColor: '#2d2d2d', mx: 3 }} />

                {/* 3. REASON ANALYSIS SECTION */}
                <Box sx={{ p: 3 }}>
                    <Box sx={{ border: '1px solid #2d2d2d', borderRadius: '8px', overflow: 'hidden' }}>
                        <SectionHeader title="Deep Reason Analysis" onSearchChange={setReasonSearch} searchValue={reasonSearch} onExport={exportToExcel} dataToExport={reasonAnalysis} chartType="area" />
                        <TableContainer sx={{ maxHeight: 500 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <HeaderCell><SortLabel field="name" activeSort={reasonSort} setSort={setReasonSort}>Main Reason</SortLabel></HeaderCell>
                                        <HeaderCell align="center"><SortLabel field="cases" activeSort={reasonSort} setSort={setReasonSort}>Total Volume</SortLabel></HeaderCell>
                                        <HeaderCell align="center"><SortLabel field="percentageValue" activeSort={reasonSort} setSort={setReasonSort}>Volume %</SortLabel></HeaderCell>
                                        <HeaderCell align="center" sx={{ color: '#f59e0b' }}><SortLabel field="neutrals" activeSort={reasonSort} setSort={setReasonSort}>Neutrals</SortLabel></HeaderCell>
                                        <HeaderCell align="center" sx={{ color: '#f59e0b' }}><SortLabel field="neutralPctValue" activeSort={reasonSort} setSort={setReasonSort}>%</SortLabel></HeaderCell>
                                        <HeaderCell align="center" sx={{ color: '#ef4444' }}><SortLabel field="detractors" activeSort={reasonSort} setSort={setReasonSort}>Detractors</SortLabel></HeaderCell>
                                        <HeaderCell align="center" sx={{ color: '#ef4444' }}><SortLabel field="detractorPctValue" activeSort={reasonSort} setSort={setReasonSort}>%</SortLabel></HeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {reasonAnalysis.map((row) => (
                                        <TableRow
                                            key={row.name}
                                            hover
                                            onClick={() => onDrillDown && onDrillDown({ reason: row.name }, `Reason Analysis: ${row.name}`)}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <StyledTableCell sx={{ fontWeight: 800, color: '#fff' }}>{row.name}</StyledTableCell>
                                            <StyledTableCell align="center" sx={{ bgcolor: alpha('#10b981', 0.1), fontWeight: 700 }}>{row.cases}</StyledTableCell>
                                            <StyledTableCell align="center" sx={{ fontWeight: 900, bgcolor: getHeatmapColor(row.percentageValue, 0, 40, 'green') }}>{row.percentageLabel}%</StyledTableCell>
                                            <StyledTableCell align="center" sx={{ color: '#f59e0b' }}>{row.neutrals}</StyledTableCell>
                                            <StyledTableCell align="center" sx={{ bgcolor: getHeatmapColor(row.neutralPctValue, 0, 40, 'orange') }}>{row.neutralPctValue.toFixed(1)}%</StyledTableCell>
                                            <StyledTableCell align="center" sx={{ color: '#ef4444' }}>{row.detractors}</StyledTableCell>
                                            <StyledTableCell align="center" sx={{ bgcolor: getHeatmapColor(row.detractorPctValue, 0, 40, 'red') }}>{row.detractorPctValue.toFixed(1)}%</StyledTableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Box>

                <Divider sx={{ borderColor: '#2d2d2d', mx: 3 }} />

                {/* 5. ITN & SUBSCRIPTION IMPACT SECTION (NEW) */}
                <Box sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ border: '1px solid #2d2d2d', borderRadius: '8px', overflow: 'hidden' }}>
                                <SectionHeader title="ITN Impact Analysis" onExport={exportToExcel} dataToExport={itnAnalysis} chartType="bar" />
                                <TableContainer sx={{ maxHeight: 400 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <HeaderCell>ITN Category</HeaderCell>
                                                <HeaderCell align="center">Cases</HeaderCell>
                                                <HeaderCell align="center">N%</HeaderCell>
                                                <HeaderCell align="center">D%</HeaderCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {itnAnalysis.map((row) => (
                                                <TableRow
                                                    key={row.name}
                                                    hover
                                                    onClick={() => onDrillDown && onDrillDown({ itnRelated: row.name }, `ITN Impact: ${row.name}`)}
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    <StyledTableCell sx={{ fontWeight: 800, color: '#fff' }}>{row.name}</StyledTableCell>
                                                    <StyledTableCell align="center" sx={{ bgcolor: alpha('#7b68ee', 0.1) }}>{row.cases}</StyledTableCell>
                                                    <StyledTableCell align="center" sx={{ bgcolor: getHeatmapColor(row.neutralPctValue, 0, 40, 'orange') }}>{row.neutralPctValue.toFixed(1)}%</StyledTableCell>
                                                    <StyledTableCell align="center" sx={{ bgcolor: getHeatmapColor(row.detractorPctValue, 0, 40, 'red') }}>{row.detractorPctValue.toFixed(1)}%</StyledTableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ border: '1px solid #2d2d2d', borderRadius: '8px', overflow: 'hidden' }}>
                                <SectionHeader title="Subscription Correlation" onExport={exportToExcel} dataToExport={subscriptionAnalysis} chartType="pie" />
                                <TableContainer sx={{ maxHeight: 400 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <HeaderCell>Status</HeaderCell>
                                                <HeaderCell align="center">Volume</HeaderCell>
                                                <HeaderCell align="center">Share %</HeaderCell>
                                                <HeaderCell align="center">D%</HeaderCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {subscriptionAnalysis.map((row) => (
                                                <TableRow key={row.name}>
                                                    <StyledTableCell sx={{ fontWeight: 800, color: '#fff' }}>{row.name}</StyledTableCell>
                                                    <StyledTableCell align="center" sx={{ bgcolor: alpha('#10b981', 0.1) }}>{row.cases}</StyledTableCell>
                                                    <StyledTableCell align="center" sx={{ fontWeight: 900 }}>{row.percentageLabel}%</StyledTableCell>
                                                    <StyledTableCell align="center" sx={{ bgcolor: getHeatmapColor(row.detractorPctValue, 0, 40, 'red') }}>{row.detractorPctValue.toFixed(1)}%</StyledTableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>

                <Divider sx={{ borderColor: '#2d2d2d', mx: 3 }} />

                {/* 4. CONTRIBUTION MATRIX SECTION */}
                <Box sx={{ p: 3 }}>
                    <Box sx={{ border: '1px solid #2d2d2d', borderRadius: '8px', overflow: 'hidden' }}>
                        <SectionHeader
                            title="Owner-Reason Impact Matrix"
                            onExport={exportToExcel}
                            dataToExport={contributionMatrix.topReasons.map(r => ({ name: r, ...contributionMatrix.matrix[r] }))}
                            chartType="stack"
                            stackKeys={contributionMatrix.topOwners}
                        />
                        <TableContainer sx={{ overflowX: 'auto', maxHeight: 600 }}>
                            <Table size="small" stickyHeader sx={{ minWidth: 1000 }}>
                                <TableHead>
                                    <TableRow>
                                        <HeaderCell sx={{ top: 0, zIndex: 12, borderRight: '2px solid #333' }}>Reason</HeaderCell>
                                        {contributionMatrix.topOwners.map(owner => (
                                            <HeaderCell key={owner} align="center" colSpan={2} sx={{ bgcolor: alpha('#7b68ee', 0.05), borderLeft: '1px solid #333', top: 0 }}>
                                                {owner}
                                            </HeaderCell>
                                        ))}
                                        <HeaderCell align="center" sx={{ bgcolor: alpha('#10b981', 0.1), top: 0, borderLeft: '2px solid #333' }}>Total Impact</HeaderCell>
                                    </TableRow>
                                    <TableRow>
                                        <HeaderCell sx={{ top: 48, zIndex: 12, borderRight: '2px solid #333' }}></HeaderCell>
                                        {contributionMatrix.topOwners.map(owner => (
                                            <React.Fragment key={`${owner}-sub`}>
                                                <HeaderCell align="center" sx={{ top: 48, fontSize: '0.7rem', borderLeft: '1px solid #333' }}>Vol</HeaderCell>
                                                <HeaderCell align="center" sx={{ top: 48, fontSize: '0.7rem', color: alpha('#fff', 0.5) }}>Load %</HeaderCell>
                                            </React.Fragment>
                                        ))}
                                        <HeaderCell align="center" sx={{ top: 48, borderLeft: '2px solid #333' }}>Cases</HeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {contributionMatrix.topReasons.map(reason => {
                                        const data = contributionMatrix.matrix[reason] || { total: 0 };
                                        return (
                                            <TableRow key={reason}>
                                                <StyledTableCell
                                                    onClick={() => onDrillDown && onDrillDown({ reason: reason }, `Tasks for Reason: ${reason}`)}
                                                    sx={{ position: 'sticky', left: 0, bgcolor: '#121212', zIndex: 5, borderRight: '2px solid #333', fontWeight: 900, color: '#fff', cursor: 'pointer', '&:hover': { bgcolor: alpha('#7b68ee', 0.1) } }}
                                                >
                                                    {reason}
                                                </StyledTableCell>
                                                {contributionMatrix.topOwners.map(owner => {
                                                    const count = data[owner] || 0;
                                                    const ownerTotal = contributionMatrix.ownerTotals[owner] || 0;
                                                    const loadPct = ownerTotal > 0 ? (count / ownerTotal) * 100 : 0;
                                                    return (
                                                        <React.Fragment key={`${reason}-${owner}`}>
                                                            <StyledTableCell
                                                                align="center"
                                                                onClick={() => count > 0 && onDrillDown && onDrillDown({ reason: reason, responsible: owner }, `Tasks for ${owner} (${reason})`)}
                                                                sx={{ borderLeft: '1px solid #2d2d2d', fontWeight: 700, cursor: count > 0 ? 'pointer' : 'default', '&:hover': { bgcolor: count > 0 ? alpha('#7b68ee', 0.1) : 'inherit' } }}
                                                            >
                                                                {count || '-'}
                                                            </StyledTableCell>
                                                            <StyledTableCell align="center" sx={{ bgcolor: getHeatmapColor(loadPct, 0, 60, 'blue'), color: loadPct > 0 ? '#fff' : alpha('#fff', 0.2), fontSize: '0.75rem', fontWeight: 600 }}>
                                                                {count > 0 ? `${loadPct.toFixed(0)}%` : '-'}
                                                            </StyledTableCell>
                                                        </React.Fragment>
                                                    );
                                                })}
                                                <StyledTableCell
                                                    align="center"
                                                    onClick={() => data.total > 0 && onDrillDown && onDrillDown({ reason: reason }, `Total Impact: ${reason}`)}
                                                    sx={{ fontWeight: 900, bgcolor: alpha('#10b981', 0.2), color: '#fff', borderLeft: '2px solid #333', cursor: 'pointer', '&:hover': { bgcolor: alpha('#10b981', 0.3) } }}
                                                >
                                                    {data.total}
                                                </StyledTableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Box>

                <Divider sx={{ borderColor: '#2d2d2d', mx: 3 }} />

                {/* 6. ROOT CAUSE IMPACT MATRIX SECTION (NEW) */}
                <Box sx={{ p: 3 }}>
                    <Box sx={{ border: '1px solid #2d2d2d', borderRadius: '8px', overflow: 'hidden' }}>
                        <SectionHeader
                            title="Root Cause Impact Matrix"
                            onExport={exportToExcel}
                            dataToExport={rootCauseMatrix.topRCs.map(rc => ({ name: rc, ...rootCauseMatrix.matrix[rc] }))}
                            chartType="stack"
                            stackKeys={rootCauseMatrix.topOwners}
                        />
                        <TableContainer sx={{ overflowX: 'auto', maxHeight: 600 }}>
                            <Table size="small" stickyHeader sx={{ minWidth: 1000 }}>
                                <TableHead>
                                    <TableRow>
                                        <HeaderCell sx={{ top: 0, zIndex: 12, borderRight: '2px solid #333' }}>Root Cause</HeaderCell>
                                        {rootCauseMatrix.topOwners.map(owner => (
                                            <HeaderCell key={owner} align="center" colSpan={2} sx={{ bgcolor: alpha('#7b68ee', 0.05), borderLeft: '1px solid #333', top: 0 }}>
                                                {owner}
                                            </HeaderCell>
                                        ))}
                                        <HeaderCell align="center" sx={{ bgcolor: alpha('#10b981', 0.1), top: 0, borderLeft: '2px solid #333' }}>Total Impact</HeaderCell>
                                    </TableRow>
                                    <TableRow>
                                        <HeaderCell sx={{ top: 48, zIndex: 12, borderRight: '2px solid #333' }}></HeaderCell>
                                        {rootCauseMatrix.topOwners.map(owner => (
                                            <React.Fragment key={`${owner}-sub`}>
                                                <HeaderCell align="center" sx={{ top: 48, fontSize: '0.7rem', borderLeft: '1px solid #333' }}>Vol</HeaderCell>
                                                <HeaderCell align="center" sx={{ top: 48, fontSize: '0.7rem', color: alpha('#fff', 0.5) }}>Load %</HeaderCell>
                                            </React.Fragment>
                                        ))}
                                        <HeaderCell align="center" sx={{ top: 48, borderLeft: '2px solid #333' }}>Cases</HeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rootCauseMatrix.topRCs.map(rc => {
                                        const data = rootCauseMatrix.matrix[rc] || { total: 0 };
                                        return (
                                            <TableRow key={rc}>
                                                <StyledTableCell
                                                    onClick={() => onDrillDown && onDrillDown({ rootCause: rc }, `Tasks for Root Cause: ${rc}`)}
                                                    sx={{ position: 'sticky', left: 0, bgcolor: '#121212', zIndex: 5, borderRight: '2px solid #333', fontWeight: 900, color: '#fff', cursor: 'pointer', '&:hover': { bgcolor: alpha('#7b68ee', 0.1) } }}
                                                >
                                                    {rc}
                                                </StyledTableCell>
                                                {rootCauseMatrix.topOwners.map(owner => {
                                                    const count = data[owner] || 0;
                                                    const ownerTotal = rootCauseMatrix.ownerTotals[owner] || 0;
                                                    const loadPct = ownerTotal > 0 ? (count / ownerTotal) * 100 : 0;
                                                    return (
                                                        <React.Fragment key={`${rc}-${owner}`}>
                                                            <StyledTableCell
                                                                align="center"
                                                                onClick={() => count > 0 && onDrillDown && onDrillDown({ rootCause: rc, responsible: owner }, `Tasks for ${owner} (${rc})`)}
                                                                sx={{ borderLeft: '1px solid #2d2d2d', fontWeight: 700, cursor: count > 0 ? 'pointer' : 'default', '&:hover': { bgcolor: count > 0 ? alpha('#7b68ee', 0.1) : 'inherit' } }}
                                                            >
                                                                {count || '-'}
                                                            </StyledTableCell>
                                                            <StyledTableCell align="center" sx={{ bgcolor: getHeatmapColor(loadPct, 0, 60, 'blue'), color: loadPct > 0 ? '#fff' : alpha('#fff', 0.2), fontSize: '0.75rem', fontWeight: 600 }}>
                                                                {count > 0 ? `${loadPct.toFixed(0)}%` : '-'}
                                                            </StyledTableCell>
                                                        </React.Fragment>
                                                    );
                                                })}
                                                <StyledTableCell
                                                    align="center"
                                                    onClick={() => data.total > 0 && onDrillDown && onDrillDown({ rootCause: rc }, `Total Impact: ${rc}`)}
                                                    sx={{ fontWeight: 900, bgcolor: alpha('#10b981', 0.2), color: '#fff', borderLeft: '2px solid #333', cursor: 'pointer', '&:hover': { bgcolor: alpha('#10b981', 0.3) } }}
                                                >
                                                    {data.total}
                                                </StyledTableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Box>

                {/* FOOTER */}
                <Box sx={{ p: 3, bgcolor: '#0a0a0a', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ color: alpha('#fff', 0.3), fontSize: '0.7rem' }}>
                        © 2026 Reach Quality Task Management - Confidential Business Analysis
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                            <Typography sx={{ color: alpha('#fff', 0.5), fontSize: '0.7rem' }}>Live Accuracy Validated</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#7b68ee' }} />
                            <Typography sx={{ color: alpha('#fff', 0.5), fontSize: '0.7rem' }}>DeepEngine Active</Typography>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            {/* --- CHART DIALOG --- */}
            <ProfessionalChartDialog
                open={chartDialog.open}
                onClose={() => setChartDialog({ ...chartDialog, open: false })}
                title={chartDialog.title}
                data={chartDialog.data}
                type={chartDialog.type}
                stackKeys={chartDialog.stackKeys}
            />
        </Box>
    );
};

export default AllTasksDeepDiveAnalytics;
