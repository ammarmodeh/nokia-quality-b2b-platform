import {
  Button,
  Dialog,
  IconButton,
  Typography,
  TextField,
  MenuItem,
  Box,
  Autocomplete,
  Checkbox,
  InputAdornment,
  Tooltip,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import PersonOutline from '@mui/icons-material/PersonOutline';
import PollOutlined from '@mui/icons-material/PollOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import RouterOutlined from '@mui/icons-material/RouterOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import PhoneCallbackOutlined from '@mui/icons-material/PhoneCallbackOutlined';
import PhoneForwardedOutlined from '@mui/icons-material/PhoneForwardedOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import api from '../../api/api';
import AsyncButton from '../ui/AsyncButton';

const callStatusOptions = ["Not Done", "No Answer", "Call Back", "Done"];
const trueFalseOptions = ["True", "False"];
const yesNoOptions = ["Yes", "No", "Not specified"];

const SECTIONS = [
  { id: 'customer', label: 'Customer', icon: PersonOutline, keywords: 'name contact phone slid request number operation customer type tariff governorate district' },
  { id: 'survey', label: 'Survey', icon: PollOutlined, keywords: 'satisfaction score feedback comment dashboard note qos scoring factors' },
  { id: 'dates', label: 'Dates', icon: EventOutlined, keywords: 'request date creation fe dispatch subcon completion pis interview' },
  { id: 'equipment', label: 'Equipment', icon: RouterOutlined, keywords: 'ont extender gaia' },
  { id: 'team', label: 'Team & priority', icon: GroupsOutlined, keywords: 'subcon field team priority validation status' },
  { id: 'rca', label: 'Root cause', icon: AccountTreeOutlined, keywords: 'rca reason sub reason root cause owner responsible itn subscription team accountability' },
  { id: 'closure', label: 'Closure call', icon: PhoneCallbackOutlined, keywords: 'fmc closure status comment closure requested technical team evaluation service evaluation dissatisfaction' },
  { id: 'second', label: 'Second call', icon: PhoneForwardedOutlined, keywords: 'second call status category action team dispatch secondary resolution resolved root cause survey' },
  { id: 'custom', label: 'Custom questions', icon: QuizOutlined, keywords: 'custom yes no question answer' },
];

const field = { size: 'small', fullWidth: true, hiddenLabel: true };

const Section = ({ id, title, description, children, sectionRef }) => (
  <Box component="section" id={`edit-task-${id}`} ref={sectionRef} data-section={id} sx={{ scrollMarginTop: 16, pb: 4 }}>
    <Typography component="h2" sx={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', mb: description ? 0.25 : 1.25 }}>{title}</Typography>
    {description && <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', mb: 1.25 }}>{description}</Typography>}
    <Box>{children}</Box>
  </Box>
);

const Row = ({ label, hint, required, children, align = 'center' }) => (
  <Box sx={{
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: 'minmax(180px, 2fr) minmax(0, 3fr)' },
    gap: { xs: 0.75, sm: 3 },
    alignItems: { xs: 'stretch', sm: align },
    py: 1.5,
    borderBottom: '1px solid var(--border)',
    '&:last-of-type': { borderBottom: 0 },
  }}>
    <Box sx={{ minWidth: 0 }}>
      <Typography component="label" sx={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
        {label}{required && <Box component="span" sx={{ color: 'var(--danger)', ml: 0.25 }}>*</Box>}
      </Typography>
      {hint && <Typography sx={{ fontSize: 12.5, color: 'var(--text-secondary)', mt: 0.25, lineHeight: 1.45 }}>{hint}</Typography>}
    </Box>
    <Box sx={{ minWidth: 0 }}>{children}</Box>
  </Box>
);

const Pair = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25 }}>{children}</Box>
);

const SmallLabel = ({ children }) => (
  <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mb: 0.5 }}>{children}</Typography>
);

const SelectField = ({ value, onChange, options = [], ariaLabel, placeholder }) => {
  const safeValue = value ?? '';
  const hasValueInOptions = !safeValue || options.some((o) => (typeof o === 'object' ? String(o.value) === String(safeValue) : String(o) === String(safeValue)));
  return (
    <TextField select {...field} value={hasValueInOptions ? safeValue : ''} onChange={(e) => onChange(e.target.value)} slotProps={{ htmlInput: { 'aria-label': ariaLabel } }}
      SelectProps={{ displayEmpty: true, renderValue: (v) => (v === '' || v === undefined || v === 'Not specified' ? <span style={{ color: 'var(--text-muted)' }}>{placeholder || 'Not specified'}</span> : options.find((o) => typeof o === 'object' && String(o.value) === String(v))?.label ?? v) }}>
      {options.map((o) => (typeof o === 'object' ? <MenuItem key={String(o.value)} value={o.value}>{o.label}</MenuItem> : <MenuItem key={String(o)} value={o}>{o}</MenuItem>))}
    </TextField>
  );
};

const FreeAutocomplete = ({ options = [], value = '', onChange, ariaLabel, fallback = '' }) => (
  <Autocomplete
    freeSolo
    fullWidth
    size="small"
    options={options}
    value={value}
    onChange={(e, nv) => onChange(nv || fallback)}
    onInputChange={(e, nv) => onChange(nv)}
    renderInput={(params) => <TextField {...params} hiddenLabel inputProps={{ ...params.inputProps, 'aria-label': ariaLabel }} />}
  />
);

const UnifiedRCARows = ({ rcaRows, dropdownOptions, handleAdd, handleRemove, handleChange }) => {
  const opt = (k) => dropdownOptions[k]?.map(item => item.value) || [];
  const yn = [{ value: 'Not specified', label: 'Not specified' }, { value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {rcaRows.map((row, index) => (
        <Box key={index} sx={{ p: 1.75, borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.25 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Cause {index + 1}</Typography>
            {rcaRows.length > 1 && (
              <Tooltip title="Remove this cause">
                <IconButton size="small" aria-label={`Remove cause ${index + 1}`} onClick={() => handleRemove(index)}><DeleteOutline sx={{ fontSize: 17 }} /></IconButton>
              </Tooltip>
            )}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 1.25 }}>
            <Box><SmallLabel>Main reason</SmallLabel><FreeAutocomplete options={opt('REASON')} value={row.reason} onChange={(v) => handleChange(index, 'reason', v || '')} ariaLabel="Main reason" /></Box>
            <Box><SmallLabel>Sub reason</SmallLabel><FreeAutocomplete options={opt('REASON_SUB')} value={row.subReason} onChange={(v) => handleChange(index, 'subReason', v || '')} ariaLabel="Sub reason" /></Box>
            <Box><SmallLabel>Root cause</SmallLabel><FreeAutocomplete options={opt('ROOT_CAUSE')} value={row.rootCause} onChange={(v) => handleChange(index, 'rootCause', v || '')} ariaLabel="Root cause" /></Box>
            <Box><SmallLabel>Owner</SmallLabel><FreeAutocomplete options={opt('RESPONSIBILITY')} value={row.responsible} onChange={(v) => handleChange(index, 'responsible', v || '')} ariaLabel="Owner" /></Box>
            <Box><SmallLabel>ITN related</SmallLabel><SelectField value={row.itnRelated || 'Not specified'} onChange={(v) => handleChange(index, 'itnRelated', v)} options={yn} ariaLabel="ITN related" /></Box>
            <Box><SmallLabel>Related to current subscription</SmallLabel><SelectField value={row.relatedToSubscription || 'Not specified'} onChange={(v) => handleChange(index, 'relatedToSubscription', v)} options={yn} ariaLabel="Related to current subscription" /></Box>
            <Box sx={{ gridColumn: { lg: 'span 2' } }}>
              <SmallLabel>Team accountability</SmallLabel>
              <SelectField value={row.teamAccountability || 'No'} onChange={(v) => handleChange(index, 'teamAccountability', v)} options={[{ value: 'Yes', label: 'Yes — counts against the field team' }, { value: 'No', label: 'No — registered, team not accountable' }]} ariaLabel="Team accountability" />
            </Box>
          </Box>
        </Box>
      ))}
      <Button variant="outlined" size="small" startIcon={<Add />} onClick={handleAdd} sx={{ alignSelf: 'flex-start' }}>Add another cause</Button>
    </Box>
  );
};

const toDateInput = (val) => {
  if (!val) return '';
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const parseRcaRows = (t) => {
  if (!t) return [{ responsible: '', reason: '', subReason: '', rootCause: '', itnRelated: 'No', relatedToSubscription: 'No', teamAccountability: 'No' }];
  const toArr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const reasons = toArr(t.reason);
  const subReasons = toArr(t.subReason);
  const rootCauses = toArr(t.rootCause);
  const responsibles = toArr(t.responsible);
  const accountabilities = toArr(t.teamAccountability);
  const itnRelateds = toArr(t.itnRelated);
  const subscriptions = toArr(t.relatedToSubscription);
  const len = Math.max(reasons.length, subReasons.length, rootCauses.length, responsibles.length, 1);
  const rows = [];
  for (let i = 0; i < len; i++) {
    rows.push({
      reason: reasons[i] || '',
      subReason: subReasons[i] || '',
      rootCause: rootCauses[i] || '',
      responsible: responsibles[i] || '',
      teamAccountability: accountabilities[i] || 'No',
      itnRelated: itnRelateds[i] || 'No',
      relatedToSubscription: subscriptions[i] || 'No',
    });
  }
  return rows;
};

const EditTaskDialog = ({
  open,
  setOpen,
  onClose,
  task: taskProp,
  id,
  handleTaskUpdate,
  onTaskUpdated,
  onUpdate,
}) => {
  const phone = useMediaQuery('(max-width:768px)');
  const [task, setTask] = useState(taskProp?.isSummary ? null : taskProp);
  const [loadingTask, setLoadingTask] = useState(Boolean(taskProp?.isSummary));

  // Sync internal task state with prop. Summary rows (list/dashboard) lack some fields,
  // so they are reloaded in full below instead of seeding the form with blanks.
  useEffect(() => {
    if (taskProp && !taskProp.isSummary) setTask(taskProp);
  }, [taskProp]);

  // Fetch task by ID if not provided as a full object
  useEffect(() => {
    let cancel = false;
    const fetchId = taskProp?.isSummary ? taskProp._id : !taskProp ? id : null;
    const fetchTask = async () => {
      if (open && fetchId) {
        try {
          setLoadingTask(true);
          const { data } = await api.get(`/tasks/get-task/${fetchId}`);
          if (!cancel) setTask(data);
        } catch (err) {
          console.error("Failed to fetch task for editing:", err);
        } finally {
          if (!cancel) setLoadingTask(false);
        }
      }
    };
    fetchTask();
    return () => { cancel = true; };
  }, [open, id, taskProp]);

  const [fieldTeams, setFieldTeams] = useState([]);
  const [teamInfo, setTeamInfo] = useState({ teamName: '', teamId: '' });

  const [dropdownOptions, setDropdownOptions] = useState({
    PRIORITY: [],
    TASK_CATEGORIES: [],
    TEAM_COMPANY: [],
    EVALUATION_SCORE: [],
    GOVERNORATES: [],
    CUSTOMER_TYPE: [],
    VALIDATION_STATUS: [],
    REASON: [],
    REASON_SUB: [],
    ROOT_CAUSE: [],
    RESPONSIBILITY: [],
    ONT_TYPE: [],
    EXTENDER_TYPE: [],
  });

  const [scoringKeyOptions, setScoringKeyOptions] = useState([]);
  const [selectedScoringKeys, setSelectedScoringKeys] = useState([]);

  // Controlled states
  const [priority, setPriority] = useState('');
  const [teamCompany, setTeamCompany] = useState('');
  const [evaluationScore, setEvaluationScore] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [district, setDistrict] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [validationStatus, setValidationStatus] = useState('');
  const [callStatus, setCallStatus] = useState('Not Done');
  const [closureRequestedByFieldTeam, setClosureRequestedByFieldTeam] = useState('False');
  const [technicalTeamEvaluation, setTechnicalTeamEvaluation] = useState('');
  const [serviceEvaluation, setServiceEvaluation] = useState('');
  const [categoryOfDissatisfaction, setCategoryOfDissatisfaction] = useState('');
  const [customFields, setCustomFields] = useState([{ question: '', answer: 'Not specified' }]);
  const [secondCallInitiated, setSecondCallInitiated] = useState('Not specified');
  const [secondCallStatus, setSecondCallStatus] = useState('');
  const [secondCallCategory, setSecondCallCategory] = useState('');
  const [secondCallAction, setSecondCallAction] = useState('');
  const [secondCallTeam, setSecondCallTeam] = useState('');
  const [secondCallDispatchDate, setSecondCallDispatchDate] = useState('');
  const [secondCallSecondaryStatus, setSecondCallSecondaryStatus] = useState('');
  const [secondCallResolutionMethod, setSecondCallResolutionMethod] = useState('');
  const [secondCallResolvedBy, setSecondCallResolvedBy] = useState('');
  const [secondCallRootCause, setSecondCallRootCause] = useState('');
  const [secondCallResolutionDate, setSecondCallResolutionDate] = useState('');
  const [secondCallResolvedBeforeSurvey, setSecondCallResolvedBeforeSurvey] = useState('Not specified');
  const [rcaRows, setRcaRows] = useState([
    { responsible: '', reason: '', subReason: '', rootCause: '', itnRelated: 'No', relatedToSubscription: 'No', teamAccountability: 'No' },
  ]);
  const [ontType, setOntType] = useState('');
  const [freeExtender, setFreeExtender] = useState('');
  const [extenderType, setExtenderType] = useState('');
  const [extenderNumber, setExtenderNumber] = useState(0);
  const [gaiaCheck, setGaiaCheck] = useState('');
  const [gaiaContent, setGaiaContent] = useState('');
  const [isQoS, setIsQoS] = useState(false);

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  // Load dropdowns & teams
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [dd, ft, st] = await Promise.allSettled([
          api.get("/dropdown-options/all"),
          api.get("/field-teams/get-field-teams"),
          api.get("/settings"),
        ]);
        if (cancel) return;
        if (dd.status === "fulfilled" && dd.value?.data) {
          const data = dd.value.data;
          const formatted = {};
          Object.keys(data).forEach(key => {
            if (key === "REASON_SUB" || key === "ROOT_CAUSE" || key === "REASON" || key === "RESPONSIBILITY") {
              formatted[key] = [{ value: "Not specified", label: "Not specified" }, ...data[key]];
            } else {
              formatted[key] = ["Not specified", ...data[key].map(opt => opt.value)];
            }
          });
          setDropdownOptions(prev => ({ ...prev, ...formatted }));
        }
        if (ft.status === "fulfilled" && ft.value?.data) {
          setFieldTeams(ft.value.data);
        }
        if (st.status === "fulfilled" && st.value?.data?.scoringKeys) {
          setScoringKeyOptions(st.value.data.scoringKeys);
        }
      } catch (err) {
        console.error("Failed to load options", err);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Populate form with task data
  useEffect(() => {
    if (!task) return;
    reset({
      slid: task.slid || '',
      customerName: task.customerName || '',
      contactNumber: task.contactNumber || '',
      requestNumber: task.requestNumber || '',
      operation: task.operation || '',
      tarrifName: task.tarrifName || '',
      contractDate: toDateInput(task.contractDate),
      feDate: toDateInput(task.feDate || task.appDate),
      inDate: toDateInput(task.inDate),
      unDate: toDateInput(task.unDate),
      closeDate: toDateInput(task.closeDate),
      pisDate: toDateInput(task.pisDate),
      interviewDate: toDateInput(task.interviewDate),
      customerFeedback: task.customerFeedback || '',
      dashboardShortNote: task.dashboardShortNote || '',
      fmcComment: task.fmcComment || '',
      gaiaContent: task.gaiaContent || '',
    });

    setPriority(task.priority || '');
    setTeamCompany(task.teamCompany || '');
    setTeamInfo({ teamName: task.teamName || '', teamId: task.teamId?._id || task.teamId || '' });
    setEvaluationScore(task.evaluationScore != null ? String(task.evaluationScore) : '');
    setGovernorate(task.governorate || '');
    setDistrict(task.district || '');
    setCustomerType(task.customerType || '');
    setValidationStatus(task.validationStatus || '');
    setCallStatus(task.callStatus || 'Not Done');
    setClosureRequestedByFieldTeam(task.closureRequestedByFieldTeam === true || task.closureRequestedByFieldTeam === 'True' ? 'True' : 'False');
    setTechnicalTeamEvaluation(task.technicalTeamEvaluation || '');
    setServiceEvaluation(task.serviceEvaluation || '');
    setCategoryOfDissatisfaction(task.categoryOfDissatisfaction || '');
    setOntType(task.ontType || '');
    setFreeExtender(task.freeExtender || '');
    setExtenderType(task.extenderType || '');
    setExtenderNumber(task.extenderNumber || 0);
    setGaiaCheck(task.gaiaCheck || '');
    setGaiaContent(task.gaiaContent || '');
    setIsQoS(Boolean(task.isQoS));
    setSelectedScoringKeys(task.scoringKeys || []);
    setSecondCallInitiated(task.secondCallInitiated || 'Not specified');
    setSecondCallStatus(task.secondCallStatus || '');
    setSecondCallCategory(task.secondCallCategory || '');
    setSecondCallAction(task.secondCallAction || '');
    setSecondCallTeam(task.secondCallTeam || '');
    setSecondCallDispatchDate(toDateInput(task.secondCallDispatchDate));
    setSecondCallSecondaryStatus(task.secondCallSecondaryStatus || '');
    setSecondCallResolutionMethod(task.secondCallResolutionMethod || '');
    setSecondCallResolvedBy(task.secondCallResolvedBy || '');
    setSecondCallRootCause(task.secondCallRootCause || '');
    setSecondCallResolutionDate(toDateInput(task.secondCallResolutionDate));
    setSecondCallResolvedBeforeSurvey(task.secondCallResolvedBeforeSurvey || 'Not specified');
    setCustomFields(Array.isArray(task.customFields) && task.customFields.length ? task.customFields : [{ question: '', answer: 'Not specified' }]);
    setRcaRows(parseRcaRows(task));
  }, [task, reset]);

  // Section navigation & search
  const [navQuery, setNavQuery] = useState('');
  const [activeSection, setActiveSection] = useState('customer');
  const bodyRef = useRef(null);
  const sectionRefs = useRef({});

  const navSections = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.keywords.toLowerCase().includes(q)
    );
  }, [navQuery]);

  const goTo = (sectionId) => {
    const root = bodyRef.current;
    const el = sectionRefs.current[sectionId];
    if (!root || !el) return;
    root.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
    setActiveSection(sectionId);
  };
  const secRef = (sectionId) => (el) => { sectionRefs.current[sectionId] = el; };

  const handleClose = () => {
    if (isSubmitting) return;
    setOpen?.(false);
    onClose?.();
  };

  const submitHandler = async (data) => {
    if (!task?._id) return;
    const formData = {
      ...data,
      slid: data.slid,
      callStatus,
      closureRequestedByFieldTeam,
      technicalTeamEvaluation,
      serviceEvaluation,
      categoryOfDissatisfaction,
      customFields,
      secondCallInitiated,
      secondCallStatus,
      secondCallCategory,
      secondCallAction,
      secondCallTeam,
      secondCallDispatchDate,
      secondCallSecondaryStatus,
      secondCallResolutionMethod,
      secondCallResolvedBy,
      secondCallRootCause,
      secondCallResolutionDate,
      secondCallResolvedBeforeSurvey,
      priority,
      teamCompany,
      teamName: teamInfo.teamName,
      teamId: teamInfo.teamId,
      evaluationScore: evaluationScore !== '' ? Number(evaluationScore) : null,
      governorate,
      district,
      customerType,
      validationStatus,
      responsible: rcaRows.map(r => r.responsible).filter(Boolean),
      reason: rcaRows.map(r => r.reason).filter(Boolean),
      subReason: rcaRows.map(r => r.subReason).filter(Boolean),
      rootCause: rcaRows.map(r => r.rootCause).filter(Boolean),
      teamAccountability: rcaRows.map(r => r.teamAccountability),
      itnRelated: rcaRows.map(r => r.itnRelated),
      relatedToSubscription: rcaRows.map(r => r.relatedToSubscription),
      ontType,
      freeExtender,
      extenderType: freeExtender === 'Yes' ? extenderType : null,
      extenderNumber: freeExtender === 'Yes' ? extenderNumber : 0,
      gaiaCheck,
      gaiaContent: gaiaCheck === 'Yes' ? gaiaContent : null,
      contractDate: data.contractDate || null,
      inDate: data.inDate || null,
      feDate: data.feDate || null,
      unDate: data.unDate || null,
      closeDate: data.closeDate || null,
      pisDate: data.pisDate || null,
      interviewDate: data.interviewDate || null,
      isQoS,
      scoringKeys: selectedScoringKeys,
    };

    try {
      const { data: responseData } = await api.put(`/tasks/update-task/${task._id}`, formData);
      const updated = responseData?.task || responseData;
      toast.success(responseData?.message || "Task updated successfully");
      handleTaskUpdate?.(updated);
      onUpdate?.(updated);
      onTaskUpdated?.(updated);
      handleClose();
      window.dispatchEvent(new CustomEvent('task-updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (err) {
      console.error("Update task error:", err);
      toast.error(err?.response?.data?.message || "Failed to update task");
    }
  };

  const handleAddRcaRow = () => setRcaRows([...rcaRows, { responsible: '', reason: '', subReason: '', rootCause: '', itnRelated: 'No', relatedToSubscription: 'No', teamAccountability: 'No' }]);
  const handleRemoveRcaRow = (index) => setRcaRows(rcaRows.filter((_, i) => i !== index));
  const handleChangeRcaRow = (index, fld, val) => {
    const updated = [...rcaRows];
    updated[index][fld] = val;
    setRcaRows(updated);
  };

  const scoringOptions = scoringKeyOptions.filter(key => key.targetForm === 'Task' || key.targetForm === 'Both');
  const scoreOptions = [{ value: '', label: 'Not specified' }, ...[...Array(11).keys()].map((n) => ({ value: String(n), label: String(n) }))];

  const navItem = (s) => {
    const Icon = s.icon;
    const on = activeSection === s.id;
    return (
      <Box key={s.id} component="button" type="button" onClick={() => goTo(s.id)} aria-current={on ? 'true' : undefined}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, width: phone ? 'auto' : '100%', flexShrink: 0, px: 1.25, height: 36, border: 0, borderRadius: '8px', cursor: 'pointer',
          font: 'inherit', fontSize: 14, textAlign: 'left', whiteSpace: 'nowrap',
          color: on ? 'var(--text)' : 'var(--text-secondary)', fontWeight: on ? 600 : 500,
          backgroundColor: on ? 'var(--surface-active)' : 'transparent',
          '&:hover': { backgroundColor: on ? 'var(--surface-active)' : 'var(--surface-hover)', color: 'var(--text)' },
          '&:focus-visible': { outline: '2px solid var(--focus-ring)', outlineOffset: 1 },
        }}>
        <Icon sx={{ fontSize: 19, color: on ? 'var(--text)' : 'var(--text-muted)' }} />
        {s.label}
      </Box>
    );
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => { if (reason === 'backdropClick' || isSubmitting) return; handleClose(); }}
      fullScreen={phone}
      maxWidth={false}
      aria-labelledby="edit-task-title"
      slotProps={{ paper: { sx: { width: phone ? '100%' : 'min(1180px, calc(100% - 48px))', height: phone ? '100%' : 'min(880px, calc(100% - 48px))', m: phone ? 0 : 3, borderRadius: phone ? 0 : '16px', overflow: 'hidden', display: 'flex' } } }}
    >
      {loadingTask ? (
        <Box sx={{ display: 'grid', placeItems: 'center', height: 400, width: '100%' }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Box component="form" id="edit-task-form" onSubmit={handleSubmit(submitHandler, (errs) => (errs.slid || errs.requestNumber) && goTo('customer'))} noValidate sx={{ display: 'flex', flexDirection: phone ? 'column' : 'row', flex: 1, minHeight: 0, width: '100%' }}>
          {/* Side Nav */}
          <Box component="nav" aria-label="Form sections" sx={{
            width: phone ? 'auto' : 264, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.5,
            p: phone ? 1.5 : 2, pb: phone ? 1 : 2,
            borderRight: phone ? 0 : '1px solid var(--border)', borderBottom: phone ? '1px solid var(--border)' : 0,
            backgroundColor: 'var(--surface-subtle)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography id="edit-task-title" component="h1" sx={{ fontSize: 16, fontWeight: 600, flex: 1, px: phone ? 0.5 : 0.75 }}>
                Edit task {task?.slid ? `· ${task.slid}` : ''}
              </Typography>
              {phone && <IconButton aria-label="Close" onClick={handleClose} disabled={isSubmitting} size="small"><CloseIcon fontSize="small" /></IconButton>}
            </Box>
            {!phone && (
              <TextField {...field} placeholder="Search sections" value={navQuery} onChange={(e) => setNavQuery(e.target.value)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }, htmlInput: { 'aria-label': 'Search sections' } }} />
            )}
            <Box sx={{ display: 'flex', flexDirection: phone ? 'row' : 'column', gap: '2px', overflowX: phone ? 'auto' : 'visible', overflowY: phone ? 'hidden' : 'auto', mx: phone ? -0.5 : 0 }}>
              {navSections.map(navItem)}
              {!navSections.length && <Typography sx={{ fontSize: 13, color: 'var(--text-muted)', px: 1.25, py: 1 }}>No section matches.</Typography>}
            </Box>
            {!phone && (
              <Typography sx={{ mt: 'auto', fontSize: 12, color: 'var(--text-muted)', px: 0.75, lineHeight: 1.5 }}>
                Update fields below and click Save changes when done.
              </Typography>
            )}
          </Box>

          {/* Form Content */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: 'var(--surface)' }}>
            {!phone && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, pt: 1.5, pb: 0 }}>
                <Tooltip title="Close">
                  <span><IconButton aria-label="Close" onClick={handleClose} disabled={isSubmitting} size="small"><CloseIcon fontSize="small" /></IconButton></span>
                </Tooltip>
              </Box>
            )}
            <Box ref={bodyRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 2, sm: 4, md: 5 }, pt: phone ? 2 : 0.5, position: 'relative' }}>
              <Section id="customer" title="Customer" description="Service line and customer contact details." sectionRef={secRef('customer')}>
                <Row label="SLID" required hint="Service line ID of the customer.">
                  <TextField {...field} placeholder="e.g. INT0419303" {...register('slid', { required: 'SLID is required' })} error={!!errors.slid} helperText={errors.slid ? errors.slid.message : ''} slotProps={{ htmlInput: { 'aria-label': 'SLID' } }} />
                </Row>
                <Row label="Customer name">
                  <TextField {...field} placeholder="Full name" {...register('customerName')} error={!!errors.customerName} helperText={errors.customerName ? errors.customerName.message : ''} slotProps={{ htmlInput: { 'aria-label': 'Customer name', dir: 'auto' } }} />
                </Row>
                <Row label="Contact number">
                  <TextField {...field} type="number" placeholder="07XXXXXXXX" {...register('contactNumber')} error={!!errors.contactNumber} helperText={errors.contactNumber ? errors.contactNumber.message : ''} slotProps={{ htmlInput: { 'aria-label': 'Contact number' } }} />
                </Row>
                <Row label="Request & operation" required hint="Request number (required) and operation.">
                  <Pair>
                    <TextField {...field} type="number" placeholder="Request number" {...register('requestNumber', { required: 'Request number is required' })} error={!!errors.requestNumber} helperText={errors.requestNumber ? errors.requestNumber.message : ''} slotProps={{ htmlInput: { 'aria-label': 'Request number' } }} />
                    <TextField {...field} placeholder="Operation" {...register('operation')} slotProps={{ htmlInput: { 'aria-label': 'Operation' } }} />
                  </Pair>
                </Row>
                <Row label="Customer type">
                  <SelectField value={customerType} onChange={setCustomerType} options={dropdownOptions.CUSTOMER_TYPE} ariaLabel="Customer type" />
                </Row>
                <Row label="Tariff">
                  <TextField {...field} placeholder="Tariff name" {...register('tarrifName')} error={!!errors.tarrifName} helperText={errors.tarrifName ? errors.tarrifName.message : ''} slotProps={{ htmlInput: { 'aria-label': 'Tariff name' } }} />
                </Row>
                <Row label="Location" hint="Governorate and district.">
                  <Pair>
                    <SelectField value={governorate} onChange={setGovernorate} options={dropdownOptions.GOVERNORATES} ariaLabel="Governorate" />
                    <TextField {...field} placeholder="District" value={district} onChange={(e) => setDistrict(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'District', dir: 'auto' } }} />
                  </Pair>
                </Row>
              </Section>

              <Section id="survey" title="Survey" description="NPS satisfaction score and customer feedback." sectionRef={secRef('survey')}>
                <Row label="Satisfaction score" hint="0 to 10 scale (1–6 detractor, 7–8 neutral, 9–10 promoter).">
                  <SelectField value={evaluationScore} onChange={setEvaluationScore} options={scoreOptions} ariaLabel="Satisfaction score" />
                </Row>
                <Row label="Customer feedback" hint="Exact comments transcribed from the survey." align="start">
                  <TextField {...field} multiline rows={3} placeholder="Customer feedback or comments…" {...register('customerFeedback')} slotProps={{ htmlInput: { 'aria-label': 'Customer feedback', dir: 'auto' } }} />
                </Row>
                <Row label="Dashboard note" hint="Short note shown on summary cards." align="start">
                  <TextField {...field} multiline rows={2} placeholder="Maximum 100 characters" {...register('dashboardShortNote')} slotProps={{ htmlInput: { 'aria-label': 'Dashboard note', dir: 'auto', maxLength: 100 } }} />
                </Row>
                <Row label="Quality of Service (QoS)">
                  <Box component="label" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
                    <Checkbox size="small" checked={isQoS} onChange={(e) => setIsQoS(e.target.checked)} sx={{ p: 0 }} />
                    <Typography sx={{ fontSize: 13, color: 'var(--text)' }}>Flag this record as a QoS case</Typography>
                  </Box>
                </Row>
                {scoringOptions.length > 0 && (
                  <Row label="Scoring factors" hint="Points added to or taken from the team's score." align="start">
                    <Autocomplete
                      multiple
                      size="small"
                      options={scoringOptions}
                      getOptionLabel={(option) => `${option.label} (${option.points > 0 ? '+' : ''}${option.points})`}
                      value={scoringKeyOptions.filter(key => selectedScoringKeys.includes(key.label))}
                      onChange={(event, newValue) => setSelectedScoringKeys(newValue.map(item => item.label))}
                      disableCloseOnSelect
                      renderInput={(params) => <TextField {...params} hiddenLabel placeholder={selectedScoringKeys.length ? '' : 'Search factors…'} inputProps={{ ...params.inputProps, 'aria-label': 'Scoring factors' }} />}
                      renderOption={(props, option, { selected }) => {
                        const { key, ...rest } = props;
                        return (
                          <li key={option.label || key} {...rest}>
                            <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.25 }} />
                            {option.label} ({option.points > 0 ? '+' : ''}{option.points})
                          </li>
                        );
                      }}
                      fullWidth
                    />
                  </Row>
                )}
              </Section>

              <Section id="dates" title="Dates" description="Order lifecycle, from request to the survey interview." sectionRef={secRef('dates')}>
                <Row label="Request & creation" hint="Request date and creation date (FE).">
                  <Pair>
                    <TextField {...field} type="date" {...register('contractDate')} slotProps={{ htmlInput: { 'aria-label': 'Request date' } }} />
                    <TextField {...field} type="date" {...register('feDate')} slotProps={{ htmlInput: { 'aria-label': 'Creation date (FE)' } }} />
                  </Pair>
                </Row>
                <Row label="Dispatch & completion" hint="Dispatched to the subcontractor, and completed.">
                  <Pair>
                    <TextField {...field} type="date" {...register('inDate')} slotProps={{ htmlInput: { 'aria-label': 'Dispatch date (In date)' } }} />
                    <TextField {...field} type="date" {...register('closeDate')} slotProps={{ htmlInput: { 'aria-label': 'Completion date (Close date)' } }} />
                  </Pair>
                </Row>
                <Row label="PIS & interview" hint="Post-installation service date and the survey interview date.">
                  <Pair>
                    <TextField {...field} type="date" {...register('pisDate')} slotProps={{ htmlInput: { 'aria-label': 'PIS date' } }} />
                    <TextField {...field} type="date" {...register('interviewDate')} slotProps={{ htmlInput: { 'aria-label': 'Interview date' } }} />
                  </Pair>
                </Row>
                <Row label="UN date">
                  <TextField {...field} type="date" {...register('unDate')} slotProps={{ htmlInput: { 'aria-label': 'UN date' } }} />
                </Row>
              </Section>

              <Section id="equipment" title="Equipment" description="ONT, extenders and GAIA verification." sectionRef={secRef('equipment')}>
                <Row label="ONT type">
                  <SelectField value={ontType} onChange={setOntType} options={dropdownOptions.ONT_TYPE} ariaLabel="ONT type" />
                </Row>
                <Row label="Free extender" hint="Whether a free extender was provided and its model.">
                  <Pair>
                    <SelectField value={freeExtender} onChange={setFreeExtender} options={yesNoOptions} ariaLabel="Free extender" />
                    {freeExtender === 'Yes' && (
                      <SelectField value={extenderType} onChange={setExtenderType} options={dropdownOptions.EXTENDER_TYPE} ariaLabel="Extender type" />
                    )}
                  </Pair>
                </Row>
                {freeExtender === 'Yes' && (
                  <Row label="Extender quantity">
                    <TextField {...field} type="number" placeholder="Count" value={extenderNumber} onChange={(e) => setExtenderNumber(Number(e.target.value) || 0)} slotProps={{ htmlInput: { 'aria-label': 'Extender quantity', min: 0 } }} />
                  </Row>
                )}
                <Row label="GAIA check" hint="Whether a verification check was run in GAIA.">
                  <SelectField value={gaiaCheck} onChange={setGaiaCheck} options={yesNoOptions} ariaLabel="GAIA check" />
                </Row>
                {gaiaCheck === 'Yes' && (
                  <Row label="GAIA content" align="start">
                    <TextField {...field} multiline rows={2} placeholder="Verification notes or ticket reference…" value={gaiaContent} onChange={(e) => setGaiaContent(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'GAIA content' } }} />
                  </Row>
                )}
              </Section>

              <Section id="team" title="Team & priority" description="Assigned field team and ticket urgency." sectionRef={secRef('team')}>
                <Row label="Field team" hint="Subcontractor team that performed the installation.">
                  <SelectField
                    value={teamInfo.teamId}
                    onChange={(idVal) => {
                      const tm = fieldTeams.find(t => String(t._id) === String(idVal));
                      setTeamInfo({ teamName: tm?.teamName || '', teamId: idVal });
                      if (tm?.teamCompany) setTeamCompany(tm.teamCompany);
                    }}
                    options={fieldTeams.map(t => ({ value: String(t._id), label: t.teamName }))}
                    ariaLabel="Field team"
                    placeholder="Select team"
                  />
                </Row>
                <Row label="Subcontractor company">
                  <SelectField value={teamCompany} onChange={setTeamCompany} options={dropdownOptions.TEAM_COMPANY} ariaLabel="Subcontractor company" />
                </Row>
                <Row label="Priority">
                  <SelectField value={priority} onChange={setPriority} options={dropdownOptions.PRIORITY} ariaLabel="Priority" />
                </Row>
                <Row label="Validation status">
                  <SelectField value={validationStatus} onChange={setValidationStatus} options={dropdownOptions.VALIDATION_STATUS} ariaLabel="Validation status" />
                </Row>
              </Section>

              <Section id="rca" title="Root cause" description="Reasons for detractor or neutral feedback, and accountability." sectionRef={secRef('rca')}>
                <UnifiedRCARows
                  rcaRows={rcaRows}
                  dropdownOptions={dropdownOptions}
                  handleAdd={handleAddRcaRow}
                  handleRemove={handleRemoveRcaRow}
                  handleChange={handleChangeRcaRow}
                />
              </Section>

              <Section id="closure" title="Closure call" description="Follow-up call with the customer to close the loop." sectionRef={secRef('closure')}>
                <Row label="Call status">
                  <SelectField value={callStatus} onChange={setCallStatus} options={callStatusOptions} ariaLabel="Closure call status" />
                </Row>
                <Row label="Closure requested" hint="Requested by the field team.">
                  <SelectField value={closureRequestedByFieldTeam} onChange={setClosureRequestedByFieldTeam} options={trueFalseOptions} ariaLabel="Closure requested by field team" />
                </Row>
                <Row label="Closure comment" align="start">
                  <TextField {...field} multiline rows={2} placeholder="Outcome of the closure call…" {...register('fmcComment')} slotProps={{ htmlInput: { 'aria-label': 'Closure comment', dir: 'auto' } }} />
                </Row>
                <Row label="Evaluation" hint="Technical team score and service rating.">
                  <Pair>
                    <TextField {...field} placeholder="Technical evaluation" value={technicalTeamEvaluation} onChange={(e) => setTechnicalTeamEvaluation(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Technical evaluation' } }} />
                    <TextField {...field} placeholder="Service evaluation" value={serviceEvaluation} onChange={(e) => setServiceEvaluation(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Service evaluation' } }} />
                  </Pair>
                </Row>
                <Row label="Category of dissatisfaction">
                  <TextField {...field} placeholder="Reason category" value={categoryOfDissatisfaction} onChange={(e) => setCategoryOfDissatisfaction(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Category of dissatisfaction' } }} />
                </Row>
              </Section>

              <Section id="second" title="Second call" description="Secondary follow-up if the issue remained unresolved." sectionRef={secRef('second')}>
                <Row label="Second call made">
                  <FreeAutocomplete options={yesNoOptions} value={secondCallInitiated} onChange={setSecondCallInitiated} ariaLabel="Second call made" fallback="Not specified" />
                </Row>
                {secondCallInitiated === 'Yes' && (
                  <>
                    <Row label="Status & category">
                      <Pair>
                        <TextField {...field} placeholder="Status" value={secondCallStatus} onChange={(e) => setSecondCallStatus(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call status' } }} />
                        <TextField {...field} placeholder="Category" value={secondCallCategory} onChange={(e) => setSecondCallCategory(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call category' } }} />
                      </Pair>
                    </Row>
                    <Row label="Action & team">
                      <Pair>
                        <TextField {...field} placeholder="Action taken" value={secondCallAction} onChange={(e) => setSecondCallAction(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call action' } }} />
                        <TextField {...field} placeholder="Team dispatched" value={secondCallTeam} onChange={(e) => setSecondCallTeam(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call team' } }} />
                      </Pair>
                    </Row>
                    <Row label="Dates" hint="Dispatch and resolution dates.">
                      <Pair>
                        <TextField {...field} type="date" value={secondCallDispatchDate} onChange={(e) => setSecondCallDispatchDate(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call dispatch date' } }} />
                        <TextField {...field} type="date" value={secondCallResolutionDate} onChange={(e) => setSecondCallResolutionDate(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call resolution date' } }} />
                      </Pair>
                    </Row>
                    <Row label="Resolution & owner">
                      <Pair>
                        <TextField {...field} placeholder="Method" value={secondCallResolutionMethod} onChange={(e) => setSecondCallResolutionMethod(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Resolution method' } }} />
                        <TextField {...field} placeholder="Resolved by" value={secondCallResolvedBy} onChange={(e) => setSecondCallResolvedBy(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Resolved by' } }} />
                      </Pair>
                    </Row>
                    <Row label="Resolved root cause">
                      <TextField {...field} placeholder="Root cause identified on second call" value={secondCallRootCause} onChange={(e) => setSecondCallRootCause(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Resolved root cause' } }} />
                    </Row>
                    <Row label="Resolved before survey">
                      <FreeAutocomplete options={yesNoOptions} value={secondCallResolvedBeforeSurvey} onChange={setSecondCallResolvedBeforeSurvey} ariaLabel="Resolved before survey" fallback="Not specified" />
                    </Row>
                  </>
                )}
              </Section>

              <Section id="custom" title="Custom questions" description="Additional questions configured in settings." sectionRef={secRef('custom')}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  {customFields.map((fieldItem, index) => (
                    <Box key={index} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr auto' }, gap: 1, alignItems: 'center' }}>
                      <TextField {...field} placeholder="Question label" value={fieldItem.question} onChange={(e) => {
                        const next = [...customFields];
                        next[index].question = e.target.value;
                        setCustomFields(next);
                      }} slotProps={{ htmlInput: { 'aria-label': `Custom question ${index + 1}` } }} />
                      <SelectField
                        value={fieldItem.answer || 'Not specified'}
                        onChange={(val) => {
                          const next = [...customFields];
                          next[index].answer = val;
                          setCustomFields(next);
                        }}
                        options={[{ value: 'Not specified', label: 'Not specified' }, { value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]}
                        ariaLabel={`Answer for question ${index + 1}`}
                      />
                      <IconButton size="small" aria-label={`Remove question ${index + 1}`} onClick={() => setCustomFields(customFields.filter((_, i) => i !== index))} disabled={customFields.length === 1}>
                        <DeleteOutline sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Box>
                  ))}
                  <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => setCustomFields([...customFields, { question: '', answer: 'Not specified' }])} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                    Add question
                  </Button>
                </Box>
              </Section>
            </Box>

            {/* Footer */}
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1,
              px: { xs: 2, sm: 3 }, py: 1.5,
              borderTop: '1px solid var(--border)',
              backgroundColor: 'var(--surface-subtle)',
            }}>
              <Button variant="outlined" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <AsyncButton type="submit" form="edit-task-form" variant="contained" loading={isSubmitting}>
                Save changes
              </AsyncButton>
            </Box>
          </Box>
        </Box>
      )}
    </Dialog>
  );
};

export default EditTaskDialog;
