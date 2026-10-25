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
import api from '../../api/api';
import AsyncButton from '../ui/AsyncButton';

const callStatusOptions = ["Not Done", "No Answer", "Call Back", "Done"];
const trueFalseOptions = ["True", "False"];
const yesNoOptions = ["Yes", "No", "Not specified"];

// Sections of the form, in order. `keywords` feed the search box in the side nav.
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

/** A titled section of settings-style rows. */
const Section = ({ id, title, description, children, sectionRef }) => (
  <Box component="section" id={`task-${id}`} ref={sectionRef} data-section={id} sx={{ scrollMarginTop: 16, pb: 4 }}>
    <Typography component="h2" sx={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', mb: description ? 0.25 : 1.25 }}>{title}</Typography>
    {description && <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', mb: 1.25 }}>{description}</Typography>}
    <Box>{children}</Box>
  </Box>
);

/** Label (and hint) on the left, control on the right; stacks on narrow screens. */
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

/** Two compact controls side by side inside one row (e.g. two dates). */
const Pair = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25 }}>{children}</Box>
);

const SmallLabel = ({ children }) => (
  <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mb: 0.5 }}>{children}</Typography>
);

const SelectField = ({ value, onChange, options, ariaLabel, placeholder }) => {
  const safeValue = value ?? '';
  const hasValueInOptions = !safeValue || options.some((o) => (typeof o === 'object' ? String(o.value) === String(safeValue) : String(o) === String(safeValue)));
  return (
    <TextField select {...field} value={hasValueInOptions ? safeValue : ''} onChange={(e) => onChange(e.target.value)} slotProps={{ htmlInput: { 'aria-label': ariaLabel } }}
      SelectProps={{ displayEmpty: true, renderValue: (v) => (v === '' || v === undefined || v === 'Not specified' ? <span style={{ color: 'var(--text-muted)' }}>{placeholder || 'Not specified'}</span> : options.find((o) => typeof o === 'object' && String(o.value) === String(v))?.label ?? v) }}>
      {options.map((o) => (typeof o === 'object' ? <MenuItem key={String(o.value)} value={o.value}>{o.label}</MenuItem> : <MenuItem key={o} value={o}>{o}</MenuItem>))}
    </TextField>
  );
};

const FreeAutocomplete = ({ options, value, onChange, ariaLabel, fallback = '' }) => (
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

// initialValues pre-fills the form (e.g. "Create task from row" on a custom table); onCreated receives the new task.
const AddTask = ({ open, setOpen, setUpdateRefetchTasks, initialValues, onCreated }) => {
  // const user = useSelector((state) => state?.auth?.user);

  const [fieldTeams, setFieldTeams] = useState([]);
  const [teamInfo, setTeamInfo] = useState({ teamName: '', teamId: '' });

  // Dynamic dropdown options
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

  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const { data } = await api.get("/dropdown-options/all");
        if (data && Object.keys(data).length > 0) {
          const formatted = {};
          Object.keys(data).forEach(key => {
            if (key === "REASON_SUB" || key === "ROOT_CAUSE" || key === "REASON" || key === "RESPONSIBILITY") {
              formatted[key] = [{ value: "Not specified", label: "Not specified" }, ...data[key]]; // Store full objects for hierarchical options
            } else {
              formatted[key] = ["Not specified", ...data[key].map(opt => opt.value)];
            }
          });
          setDropdownOptions(prev => ({ ...prev, ...formatted }));
        }
      } catch (err) {
        console.error("Failed to load dropdown options", err);
      }
    };

    fetchDropdownOptions();
  }, []);

  useEffect(() => {
    const fetchAllFieldTeams = async () => {
      try {
        const { data } = await api.get("/field-teams/get-field-teams", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
        // console.log({ data });

        if (data) {
          setFieldTeams(data);
        }
      } catch {
        // console.log(error);
      }
    }

    fetchAllFieldTeams()
  }, [])

  // Fetch Scoring Keys from Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/settings");
        if (data && data.scoringKeys) {
          setScoringKeyOptions(data.scoringKeys);
        }
      } catch (error) {
        console.error("Failed to load settings for scoring keys", error);
      }
    };
    fetchSettings();
  }, []);

  const task = '';

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: initialValues || {} });

  const [priority, setPriority] = useState(task?.priority?.toUpperCase() || "Not specified");
  const [teamCompany, setTeamCompany] = useState("Not specified");
  const [evaluationScore, setEvaluationScore] = useState("Not specified");
  const [governorate, setGovernorate] = useState("Not specified");
  const [district, setDistrict] = useState("");
  const [customerType, setCustomerType] = useState("Not specified");
  const [validationStatus, setValidationStatus] = useState("Not specified");
  const [callStatus, setCallStatus] = useState("Not Done");
  const [closureRequestedByFieldTeam, setClosureRequestedByFieldTeam] = useState("False");
  const [technicalTeamEvaluation, setTechnicalTeamEvaluation] = useState("");
  const [serviceEvaluation, setServiceEvaluation] = useState("");
  const [categoryOfDissatisfaction, setCategoryOfDissatisfaction] = useState("");
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
    { responsible: 'Not specified', reason: 'Not specified', subReason: 'Not specified', rootCause: 'Not specified', itnRelated: 'Not specified', relatedToSubscription: 'Not specified', teamAccountability: 'No' }
  ]);
  const [ontType, setOntType] = useState("Not specified");
  const [freeExtender, setFreeExtender] = useState("Not specified");
  const [extenderType, setExtenderType] = useState("Not specified");
  const [extenderNumber, setExtenderNumber] = useState(0);
  const [gaiaCheck, setGaiaCheck] = useState("Not specified");
  const [gaiaContent, setGaiaContent] = useState("");
  const [isQoS, setIsQoS] = useState(false);
  const [scoringKeyOptions, setScoringKeyOptions] = useState([]);
  const [selectedScoringKeys, setSelectedScoringKeys] = useState([]);

  // Conditional field toggles

  // const [rootCause, setRootCause] = useState("");


  const handleAddCustomField = () => {
    setCustomFields([...customFields, { question: '', answer: 'Not specified' }]);
  };

  const handleRemoveCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleCustomFieldChange = (index, field, value) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };

  const submitHandler = async (data) => {
    // console.log({ data });
    const formData = {
      ...data,
      slid: data.slid,
      governorate,
      district,
      // status,
      priority,
      teamCompany,
      teamName: teamInfo.teamName,
      teamId: teamInfo.teamId,
      evaluationScore,
      customerType,
      validationStatus,
      responsible: rcaRows.map(r => r.responsible),
      reason: rcaRows.map(r => r.reason),
      subReason: rcaRows.map(r => r.subReason),
      rootCause: rcaRows.map(r => r.rootCause),
      teamAccountability: rcaRows.map(r => r.teamAccountability),
      itnRelated: rcaRows.map(r => r.itnRelated),
      relatedToSubscription: rcaRows.map(r => r.relatedToSubscription),
      ontType,
      freeExtender,
      extenderType: freeExtender === 'Yes' ? extenderType : null,
      extenderNumber: freeExtender === 'Yes' ? extenderNumber : 0,
      gaiaCheck,
      gaiaContent: gaiaCheck === "Yes" ? gaiaContent : null,
      contractDate: data.contractDate,
      inDate: data.inDate,
      feDate: data.feDate,
      unDate: data.unDate,
      closeDate: data.closeDate,
      operation: data.operation,
      isQoS,
      scoringKeys: selectedScoringKeys,
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
    };

    console.log('Sending Task Data:', formData);

    const url = '/tasks/add-task';
    const token = localStorage.getItem('accessToken');

    try {
      const response = await api.post(url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // console.log({ response });

      // return

      if (response.status === 201) {
        setOpen(false);
        setUpdateRefetchTasks?.(prev => !prev);
        onCreated?.(response.data?.task || response.data);
        alert('Task created successfully!');
      }
    } catch (error) {
      console.log(error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Unknown Error";
      const errorDetails = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
      alert(`Task Creation Failed:\n${errorDetails}`);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddRcaRow = () => setRcaRows([...rcaRows, { responsible: 'Not specified', reason: 'Not specified', subReason: 'Not specified', rootCause: 'Not specified', itnRelated: 'Not specified', relatedToSubscription: 'Not specified', teamAccountability: 'No' }]);
  const handleRemoveRcaRow = (index) => setRcaRows(rcaRows.filter((_, i) => i !== index));
  const handleChangeRcaRow = (index, field, newValue) => {
    const updated = [...rcaRows];
    updated[index][field] = newValue;
    setRcaRows(updated);
  };

  // ---- layout: side nav with search + scroll-spy (presentation only)
  const phone = useMediaQuery('(max-width:899.95px)');
  const bodyRef = useRef(null);
  const sectionRefs = useRef({});
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [navQuery, setNavQuery] = useState('');
  const navSections = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    return q ? SECTIONS.filter((s) => `${s.label} ${s.keywords}`.toLowerCase().includes(q)) : SECTIONS;
  }, [navQuery]);

  useEffect(() => {
    const root = bodyRef.current;
    if (!open || !root) return undefined;
    const onScroll = () => {
      const top = root.getBoundingClientRect().top;
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = sectionRefs.current[s.id];
        if (el && el.getBoundingClientRect().top - top <= 80) current = s.id;
      }
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) current = SECTIONS[SECTIONS.length - 1].id;
      setActiveSection(current);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, [open]);

  const goTo = (id) => {
    const root = bodyRef.current;
    const el = sectionRefs.current[id];
    if (!root || !el) return;
    root.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
    setActiveSection(id);
  };
  const secRef = (id) => (el) => { sectionRefs.current[id] = el; };
  const scoringOptions = scoringKeyOptions.filter(key => key.targetForm === 'Task' || key.targetForm === 'Both');
  const scoreOptions = [{ value: '', label: 'Not specified' }, ...[...Array(11).keys()].map((n) => ({ value: n, label: String(n) }))];

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

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => { if (reason === 'backdropClick' || isSubmitting) return; handleClose(); }}
      fullScreen={phone}
      maxWidth={false}
      aria-labelledby="add-task-title"
      slotProps={{ paper: { sx: { width: phone ? '100%' : 'min(1180px, calc(100% - 48px))', height: phone ? '100%' : 'min(880px, calc(100% - 48px))', m: phone ? 0 : 3, borderRadius: phone ? 0 : '16px', overflow: 'hidden', display: 'flex' } } }}
    >
      <Box component="form" id="task-form" onSubmit={handleSubmit(submitHandler, (errs) => (errs.slid || errs.requestNumber) && goTo('customer'))} noValidate sx={{ display: 'flex', flexDirection: phone ? 'column' : 'row', flex: 1, minHeight: 0, width: '100%' }}>
        {/* side nav */}
        <Box component="nav" aria-label="Form sections" sx={{
          width: phone ? 'auto' : 264, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.5,
          p: phone ? 1.5 : 2, pb: phone ? 1 : 2,
          borderRight: phone ? 0 : '1px solid var(--border)', borderBottom: phone ? '1px solid var(--border)' : 0,
          backgroundColor: 'var(--surface-subtle)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography id="add-task-title" component="h1" sx={{ fontSize: 16, fontWeight: 600, flex: 1, px: phone ? 0.5 : 0.75 }}>New DVOC task</Typography>
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
              SLID and request number are required. Everything else can be filled in later from the task sheet.
            </Typography>
          )}
        </Box>

        {/* content */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: 'var(--surface)' }}>
          {!phone && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, pt: 1.5, pb: 0 }}>
              <Tooltip title="Close">
                <span><IconButton aria-label="Close" onClick={handleClose} disabled={isSubmitting} size="small"><CloseIcon fontSize="small" /></IconButton></span>
              </Tooltip>
            </Box>
          )}
          <Box ref={bodyRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 2, sm: 4, md: 5 }, pt: phone ? 2 : 0.5, position: 'relative' }}>
            <Section id="customer" title="Customer" description="Who the survey case is about." sectionRef={secRef('customer')}>
              <Row label="SLID" required hint="Service line ID of the customer.">
                <TextField {...field} placeholder="e.g. INT0419303" {...register('slid', { required: 'SLID is required' })} error={!!errors.slid} helperText={errors.slid ? errors.slid.message : ''} slotProps={{ htmlInput: { 'aria-label': 'SLID' } }} />
              </Row>
              <Row label="Customer name">
                <TextField {...field} placeholder="Full name" {...register('customerName')} error={!!errors.customerName} helperText={errors.customerName ? errors.customerName.message : ''} slotProps={{ htmlInput: { 'aria-label': 'Customer name', dir: 'auto' } }} />
              </Row>
              <Row label="Contact number">
                <TextField {...field} type="number" placeholder="07XXXXXXXX" {...register('contactNumber')} error={!!errors.contactNumber} helperText={errors.contactNumber ? errors.contactNumber.message : ''} slotProps={{ htmlInput: { 'aria-label': 'Contact number' } }} />
              </Row>
              <Row label="Request & operation" required hint="Request number (required) and the operation it was for.">
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

            <Section id="survey" title="Survey" description="What the customer said in the NPS survey." sectionRef={secRef('survey')}>
              <Row label="Satisfaction score" hint="1–6 detractor · 7–8 neutral · 9–10 promoter.">
                <SelectField value={evaluationScore} onChange={setEvaluationScore} options={dropdownOptions.EVALUATION_SCORE} ariaLabel="Satisfaction score" />
              </Row>
              <Row label="Customer feedback" hint="The comment as the customer gave it." align="start">
                <TextField {...field} multiline minRows={4} placeholder="Feedback or comment" {...register('customerFeedback')} error={!!errors.customerFeedback} helperText={errors.customerFeedback ? errors.customerFeedback.message : ''} slotProps={{ htmlInput: { 'aria-label': 'Customer feedback', dir: 'auto' } }} />
              </Row>
              <Row label="Dashboard note" hint="Short line shown on the dashboard card. Up to 100 characters.">
                <TextField {...field} placeholder="Short note" {...register('dashboardShortNote')} slotProps={{ htmlInput: { 'aria-label': 'Dashboard short note', dir: 'auto', maxLength: 100 } }} />
              </Row>
              <Row label="Quality of Service (QoS)" hint="Weights this task higher in team performance rankings.">
                <Box component="label" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', fontSize: 14 }}>
                  <Checkbox checked={isQoS} onChange={(e) => setIsQoS(e.target.checked)} sx={{ ml: -1 }} inputProps={{ 'aria-label': 'Quality of Service (QoS)' }} />
                  {isQoS ? 'Flagged as QoS' : 'Not QoS'}
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
                    renderOption={(props, option, { selected }) => (
                      <li {...props} key={option.label}>
                        <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.25 }} />
                        {option.label} ({option.points > 0 ? '+' : ''}{option.points})
                      </li>
                    )}
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
                  <TextField {...field} type="date" {...register('inDate')} slotProps={{ htmlInput: { 'aria-label': 'Dispatch date (to subcon)' } }} />
                  <TextField {...field} type="date" {...register('closeDate')} slotProps={{ htmlInput: { 'aria-label': 'Completion date' } }} />
                </Pair>
              </Row>
              <Row label="PIS & interview" hint="Put-in-service date, and the survey interview date (shown on the calendar).">
                <Pair>
                  <TextField {...field} type="date" {...register('pisDate')} error={!!errors.pisDate} helperText={errors.pisDate ? errors.pisDate.message : ''} slotProps={{ htmlInput: { 'aria-label': 'PIS date' } }} />
                  <TextField {...field} type="date" {...register('interviewDate')} slotProps={{ htmlInput: { 'aria-label': 'Interview date' } }} />
                </Pair>
              </Row>
            </Section>

            <Section id="equipment" title="Equipment" description="What was installed at the customer's site." sectionRef={secRef('equipment')}>
              <Row label="ONT type">
                <SelectField value={ontType} onChange={setOntType} options={dropdownOptions.ONT_TYPE} ariaLabel="ONT type" />
              </Row>
              <Row label="Free extender" hint={freeExtender === 'Yes' ? 'Type and number of extenders given.' : undefined}>
                <Box sx={{ display: 'grid', gridTemplateColumns: freeExtender === 'Yes' ? { xs: '1fr', md: '1fr 1fr 110px' } : '1fr', gap: 1.25 }}>
                  <SelectField value={freeExtender} onChange={(val) => { setFreeExtender(val); if (val === 'No') { setExtenderType(""); setExtenderNumber(0); } }} options={['Not specified', 'Yes', 'No']} ariaLabel="Free extender" />
                  {freeExtender === 'Yes' && (
                    <>
                      <SelectField value={extenderType} onChange={setExtenderType} options={dropdownOptions.EXTENDER_TYPE} ariaLabel="Extender type" placeholder="Extender type" />
                      <TextField {...field} type="number" value={extenderNumber} onChange={(e) => setExtenderNumber(parseInt(e.target.value) || 0)} slotProps={{ htmlInput: { 'aria-label': 'Extender number', min: 0 } }} />
                    </>
                  )}
                </Box>
              </Row>
              <Row label="GAIA check" hint={gaiaCheck === 'Yes' ? 'Paste what GAIA shows for this order.' : 'Whether the order was checked in GAIA.'} align={gaiaCheck === 'Yes' ? 'start' : 'center'}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <SelectField value={gaiaCheck} onChange={setGaiaCheck} options={['Not specified', 'Yes', 'No']} ariaLabel="GAIA check" />
                  {gaiaCheck === 'Yes' && (
                    <TextField {...field} multiline minRows={2} placeholder="Content from the GAIA system" value={gaiaContent} onChange={(e) => setGaiaContent(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'GAIA content', style: { direction: 'ltr' } } }} />
                  )}
                </Box>
              </Row>
            </Section>

            <Section id="team" title="Team & priority" sectionRef={secRef('team')}>
              <Row label="Field team" hint="The installation team this case is registered against.">
                <Autocomplete
                  size="small"
                  options={fieldTeams}
                  getOptionLabel={(option) => option.teamName || ""}
                  value={fieldTeams.find(t => t._id === teamInfo.teamId) || null}
                  onChange={(e, newValue) => setTeamInfo(newValue ? { teamName: newValue.teamName, teamId: newValue._id } : { teamName: '', teamId: '' })}
                  renderInput={(params) => <TextField {...params} hiddenLabel placeholder="Choose a team" inputProps={{ ...params.inputProps, 'aria-label': 'Field team' }} />}
                  fullWidth
                />
              </Row>
              <Row label="Subcontractor">
                <SelectField value={teamCompany} onChange={setTeamCompany} options={dropdownOptions.TEAM_COMPANY} ariaLabel="Subcontractor" />
              </Row>
              <Row label="Priority & validation" hint="Impact of the case, and whether it has been validated.">
                <Pair>
                  <SelectField value={priority} onChange={setPriority} options={dropdownOptions.PRIORITY} ariaLabel="Priority" />
                  <SelectField value={validationStatus} onChange={setValidationStatus} options={dropdownOptions.VALIDATION_STATUS} ariaLabel="Validation status" />
                </Pair>
              </Row>
            </Section>

            <Section id="rca" title="Root cause" description="One block per cause. Team accountability decides whether the case counts against the field team." sectionRef={secRef('rca')}>
              <Box sx={{ pt: 0.5 }}>
                <UnifiedRCARows rcaRows={rcaRows} dropdownOptions={dropdownOptions} handleAdd={handleAddRcaRow} handleRemove={handleRemoveRcaRow} handleChange={handleChangeRcaRow} />
              </Box>
            </Section>

            <Section id="closure" title="Closure call" description="FMC closure call with the customer." sectionRef={secRef('closure')}>
              <Row label="Call status">
                <FreeAutocomplete options={callStatusOptions} value={callStatus} onChange={setCallStatus} ariaLabel="Closure call status" />
              </Row>
              <Row label="Comment" align="start">
                <TextField {...field} multiline minRows={3} placeholder="What happened on the call" {...register('closureComment')} slotProps={{ htmlInput: { 'aria-label': 'Closure comment', dir: 'auto' } }} />
              </Row>
              <Row label="Closure requested by field team">
                <FreeAutocomplete options={trueFalseOptions} value={closureRequestedByFieldTeam} onChange={setClosureRequestedByFieldTeam} ariaLabel="Closure requested by field team" fallback="False" />
              </Row>
              <Row label="Evaluations" hint="Technical team and service, 0–10.">
                <Pair>
                  <SelectField value={technicalTeamEvaluation} onChange={setTechnicalTeamEvaluation} options={scoreOptions} ariaLabel="Technical team evaluation" placeholder="Technical team" />
                  <SelectField value={serviceEvaluation} onChange={setServiceEvaluation} options={scoreOptions} ariaLabel="Service evaluation" placeholder="Service" />
                </Pair>
              </Row>
              <Row label="Category of dissatisfaction">
                <TextField {...field} placeholder="Category" value={categoryOfDissatisfaction} onChange={(e) => setCategoryOfDissatisfaction(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Category of dissatisfaction', dir: 'auto' } }} />
              </Row>
            </Section>

            <Section id="second" title="Second call" description="Follow-up call, if one was made." sectionRef={secRef('second')}>
              <Row label="Second call & status">
                <Pair>
                  <FreeAutocomplete options={yesNoOptions} value={secondCallInitiated} onChange={setSecondCallInitiated} ariaLabel="Second call made" fallback="Not specified" />
                  <FreeAutocomplete options={callStatusOptions} value={secondCallStatus} onChange={setSecondCallStatus} ariaLabel="Second call status" />
                </Pair>
              </Row>
              <Row label="Category of dissatisfaction">
                <TextField {...field} placeholder="Category" value={secondCallCategory} onChange={(e) => setSecondCallCategory(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call category of dissatisfaction', dir: 'auto' } }} />
              </Row>
              <Row label="Action & team">
                <Pair>
                  <TextField {...field} placeholder="Action" value={secondCallAction} onChange={(e) => setSecondCallAction(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call action' } }} />
                  <TextField {...field} placeholder="Team" value={secondCallTeam} onChange={(e) => setSecondCallTeam(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call team' } }} />
                </Pair>
              </Row>
              <Row label="Dispatch & resolution dates">
                <Pair>
                  <TextField {...field} type="date" value={secondCallDispatchDate} onChange={(e) => setSecondCallDispatchDate(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call dispatch date' } }} />
                  <TextField {...field} type="date" value={secondCallResolutionDate} onChange={(e) => setSecondCallResolutionDate(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call resolution date' } }} />
                </Pair>
              </Row>
              <Row label="Secondary status & method">
                <Pair>
                  <TextField {...field} placeholder="Secondary status" value={secondCallSecondaryStatus} onChange={(e) => setSecondCallSecondaryStatus(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call secondary status' } }} />
                  <TextField {...field} placeholder="Resolution method" value={secondCallResolutionMethod} onChange={(e) => setSecondCallResolutionMethod(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call resolution method' } }} />
                </Pair>
              </Row>
              <Row label="Resolved by & root cause">
                <Pair>
                  <TextField {...field} placeholder="Resolved by" value={secondCallResolvedBy} onChange={(e) => setSecondCallResolvedBy(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call resolved by' } }} />
                  <TextField {...field} placeholder="Root cause" value={secondCallRootCause} onChange={(e) => setSecondCallRootCause(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Second call root cause' } }} />
                </Pair>
              </Row>
              <Row label="Resolved before survey">
                <FreeAutocomplete options={yesNoOptions} value={secondCallResolvedBeforeSurvey} onChange={setSecondCallResolvedBeforeSurvey} ariaLabel="Resolved before survey" fallback="Not specified" />
              </Row>
            </Section>

            <Section id="custom" title="Custom questions" description="Extra yes / no questions for this case." sectionRef={secRef('custom')}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 0.5 }}>
                {customFields.map((cf, index) => (
                  <Box key={index} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 40px', sm: 'minmax(0,1fr) 180px 40px' }, gap: 1, alignItems: 'center' }}>
                    <TextField {...field} placeholder={`Question ${index + 1}`} value={cf.question} onChange={(e) => handleCustomFieldChange(index, 'question', e.target.value)} slotProps={{ htmlInput: { 'aria-label': `Question ${index + 1}`, dir: 'auto' } }} sx={{ gridColumn: { xs: '1 / 2', sm: 'auto' } }} />
                    <Box sx={{ gridColumn: { xs: '1 / 2', sm: 'auto' }, gridRow: { xs: 2, sm: 'auto' } }}>
                      <SelectField value={cf.answer} onChange={(v) => handleCustomFieldChange(index, 'answer', v)} options={yesNoOptions} ariaLabel={`Answer ${index + 1}`} />
                    </Box>
                    <IconButton size="small" aria-label={`Remove question ${index + 1}`} onClick={() => handleRemoveCustomField(index)} sx={{ gridColumn: { xs: 2, sm: 'auto' }, gridRow: { xs: '1 / 3', sm: 'auto' } }}><DeleteOutline sx={{ fontSize: 18 }} /></IconButton>
                  </Box>
                ))}
                <Button variant="outlined" size="small" startIcon={<Add />} onClick={handleAddCustomField} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>Add question</Button>
              </Box>
            </Section>
          </Box>

          {/* footer */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 2, sm: 4, md: 5 }, py: 1.5, borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            {(errors.slid || errors.requestNumber) && (
              <Button variant="text" size="small" color="error" onClick={() => goTo('customer')} sx={{ mr: 'auto' }}>
                {[errors.slid && 'SLID', errors.requestNumber && 'request number'].filter(Boolean).join(' and ')} required
              </Button>
            )}
            <Box sx={{ flex: errors.slid || errors.requestNumber ? 0 : 1 }} />
            <Button variant="outlined" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <AsyncButton variant="contained" type="submit" form="task-form" loading={isSubmitting} pendingLabel="Creating…">Create task</AsyncButton>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default AddTask;
