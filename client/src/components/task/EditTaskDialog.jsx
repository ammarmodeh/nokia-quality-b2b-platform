import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, Button, TextField, Select, MenuItem, Stack, FormControl, InputLabel, FormHelperText, Autocomplete, Typography, IconButton, Divider, Box, Grid, FormControlLabel, Checkbox, Radio, RadioGroup, FormLabel } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import { useForm } from "react-hook-form";
import SelectList from "../SelectList";
import { useSelector } from "react-redux";
import api from "../../api/api";
import { toast } from "sonner";

// const LISTS = ["Todo", "In Progress", "Closed"];
// Initial fallback constants for safety (will be replaced by API data)
// Fallback constants removed. Powered by dynamic API data.

const DEPARTMENT = ["Quality", "Production"];

const UnifiedRCARows = ({ rcaRows, dropdownOptions, handleAdd, handleRemove, handleChange }) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main', fontSize: '1rem' }}>
        RCA & Responsibility
      </Typography>
      <Stack spacing={2}>
        {rcaRows.map((row, index) => (
          <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={2.1}>
                <Autocomplete
                  freeSolo
                  fullWidth
                  size="small"
                  options={dropdownOptions.REASON?.map(item => item.value) || []}
                  value={row.reason}
                  onChange={(e, nv) => handleChange(index, 'reason', nv || '')}
                  onInputChange={(e, nv) => handleChange(index, 'reason', nv || '')}
                  renderInput={(params) => <TextField {...params} label="Main Reason" variant="outlined" />}
                />
              </Grid>
              <Grid item xs={12} sm={2.1}>
                <Autocomplete
                  freeSolo
                  fullWidth
                  size="small"
                  options={dropdownOptions.REASON_SUB?.map(item => item.value) || []}
                  value={row.subReason}
                  onChange={(e, nv) => handleChange(index, 'subReason', nv || '')}
                  onInputChange={(e, nv) => handleChange(index, 'subReason', nv || '')}
                  renderInput={(params) => <TextField {...params} label="Sub Reason" variant="outlined" />}
                />
              </Grid>
              <Grid item xs={12} sm={2.1}>
                <Autocomplete
                  freeSolo
                  fullWidth
                  size="small"
                  options={dropdownOptions.ROOT_CAUSE?.map(item => item.value) || []}
                  value={row.rootCause}
                  onChange={(e, nv) => handleChange(index, 'rootCause', nv || '')}
                  onInputChange={(e, nv) => handleChange(index, 'rootCause', nv || '')}
                  renderInput={(params) => <TextField {...params} label="Root Cause" variant="outlined" />}
                />
              </Grid>
              <Grid item xs={12} sm={2.1}>
                <Autocomplete
                  freeSolo
                  fullWidth
                  size="small"
                  options={dropdownOptions.RESPONSIBILITY?.map(item => item.value) || []}
                  value={row.responsible}
                  onChange={(e, nv) => handleChange(index, 'responsible', nv || '')}
                  onInputChange={(e, nv) => handleChange(index, 'responsible', nv || '')}
                  renderInput={(params) => <TextField {...params} label="Owner" variant="outlined" />}
                />
              </Grid>
              <Grid item xs={12} sm={2.1}>
                <FormControl fullWidth size="small">
                  <InputLabel>ITN Related</InputLabel>
                  <Select
                    value={row.itnRelated || 'Not specified'}
                    label="ITN Related"
                    onChange={(e) => handleChange(index, 'itnRelated', e.target.value)}
                  >
                    <MenuItem value="Not specified">Not specified</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2.1}>
                <FormControl fullWidth size="small">
                  <InputLabel>Related to Current Subscription</InputLabel>
                  <Select
                    value={row.relatedToSubscription || 'Not specified'}
                    label="Related to Current Subscription"
                    onChange={(e) => handleChange(index, 'relatedToSubscription', e.target.value)}
                  >
                    <MenuItem value="Not specified">Not specified</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2.1}>
                <FormControl fullWidth size="small">
                  <InputLabel>Team Accountability</InputLabel>
                  <Select
                    value={row.teamAccountability || 'No'}
                    label="Team Accountability"
                    onChange={(e) => handleChange(index, 'teamAccountability', e.target.value)}
                  >
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={1.5}>
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <IconButton color="primary" onClick={handleAdd} size="small">
                    <AddCircleIcon />
                  </IconButton>
                  {rcaRows.length > 1 && (
                    <IconButton color="error" onClick={() => handleRemove(index)} size="small">
                      <RemoveCircleIcon />
                    </IconButton>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

const callStatusOptions = ["Not Done", "No Answer", "Call Back", "Done"];
const trueFalseOptions = ["True", "False"];
const yesNoOptions = ["Yes", "No", "Not specified"];

const EditTaskDialog = ({
  open,
  setOpen,
  onClose,
  task: taskProp,
  id,
  handleTaskUpdate,
  onTaskUpdated,
  onUpdate
}) => {
  const [task, setTask] = useState(taskProp);

  // Sync internal task state with prop
  useEffect(() => {
    if (taskProp) setTask(taskProp);
  }, [taskProp]);

  // Fetch task by ID if not provided as object
  useEffect(() => {
    const fetchTask = async () => {
      if (open && !task && id) {
        try {
          setLoading(true);
          const { data } = await api.get(`/tasks/get-task/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          });
          setTask(data);
        } catch (err) {
          console.error("Failed to fetch task for editing:", err);
          setError("Failed to load task data");
        } finally {
          setLoading(false);
        }
      }
    };
    fetchTask();
  }, [open, id, task]);

  const handleClose = () => {
    if (setOpen) setOpen(false);
    if (onClose) onClose();
  };

  const handleSuccess = (updatedTask) => {
    if (handleTaskUpdate) handleTaskUpdate(updatedTask);
    if (onTaskUpdated) onTaskUpdated(updatedTask);
    if (onUpdate) onUpdate(updatedTask);
    handleClose();
  };

  const user = useSelector((state) => state?.auth?.user);
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm();

  const [priority, setPriority] = useState("");
  const [department, setDepartment] = useState(DEPARTMENT[0]);
  const [date, setDate] = useState("");
  const [pisDate, setPisDate] = useState(""); // State for PIS Date
  const [interviewDate, setInterviewDate] = useState("");
  // console.log({ pisDate, interviewDate });
  const [teamCompany, setTeamCompany] = useState('');
  const [evaluationScore, setEvaluationScore] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [district, setDistrict] = useState('');
  const [fieldTeams, setFieldTeams] = useState([]);
  const [teamInfo, setTeamInfo] = useState({ teamName: '', teamId: '' });
  const [customerType, setCustomerType] = useState('');
  const [validationStatus, setValidationStatus] = useState("Not specified");
  const [callStatus, setCallStatus] = useState("");
  const [closureRequestedByFieldTeam, setClosureRequestedByFieldTeam] = useState("False");
  const [technicalTeamEvaluation, setTechnicalTeamEvaluation] = useState("");
  const [serviceEvaluation, setServiceEvaluation] = useState("");
  const [categoryOfDissatisfaction, setCategoryOfDissatisfaction] = useState("");
  const [customFields, setCustomFields] = useState([{ question: "", answer: "Not specified" }]);
  const handleAddCustomField = () => {
    setCustomFields([...customFields, { question: "", answer: "Not specified" }]);
  };
  const handleRemoveCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };
  const handleCustomFieldChange = (index, field, value) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };
  const [secondCallInitiated, setSecondCallInitiated] = useState("Not specified");
  const [secondCallStatus, setSecondCallStatus] = useState("");
  const [secondCallCategory, setSecondCallCategory] = useState("");
  const [secondCallAction, setSecondCallAction] = useState("");
  const [secondCallTeam, setSecondCallTeam] = useState("");
  const [secondCallDispatchDate, setSecondCallDispatchDate] = useState("");
  const [secondCallSecondaryStatus, setSecondCallSecondaryStatus] = useState("");
  const [secondCallResolutionMethod, setSecondCallResolutionMethod] = useState("");
  const [secondCallResolvedBy, setSecondCallResolvedBy] = useState("");
  const [secondCallRootCause, setSecondCallRootCause] = useState("");
  const [secondCallResolutionDate, setSecondCallResolutionDate] = useState("");
  const [secondCallResolvedBeforeSurvey, setSecondCallResolvedBeforeSurvey] = useState("Not specified");
  const [rcaRows, setRcaRows] = useState([
    { responsible: 'Not specified', reason: 'Not specified', subReason: 'Not specified', rootCause: 'Not specified', itnRelated: 'Not specified', relatedToSubscription: 'Not specified', teamAccountability: 'No' }
  ]);
  const [ontType, setOntType] = useState("Not specified");
  const [freeExtender, setFreeExtender] = useState("Not specified");
  const [extenderType, setExtenderType] = useState("Not specified");
  const [extenderNumber, setExtenderNumber] = useState(0);
  const [operation, setOperation] = useState("");
  const [gaiaCheck, setGaiaCheck] = useState("Not specified");
  const [gaiaContent, setGaiaContent] = useState("");
  const [isQoS, setIsQoS] = useState(false);
  const [contractDate, setContractDate] = useState("");
  const [inDate, setInDate] = useState("");
  const [feDate, setFeDate] = useState("");
  const [unDate, setUnDate] = useState("");
  // const [closeDate, setCloseDate] = useState(""); // Removed in favor of react-hook-form
  const [scoringKeyOptions, setScoringKeyOptions] = useState([]);
  const [selectedScoringKeys, setSelectedScoringKeys] = useState([]);

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

  // Initialize form and state when the task is loaded
  useEffect(() => {
    if (open && task) {
      const pisDueDate = task.pisDate ? new Date(task.pisDate) : null;
      const formattedPISDate = pisDueDate
        ? `${pisDueDate.getFullYear()}-${String(pisDueDate.getMonth() + 1).padStart(2, "0")}-${String(pisDueDate.getDate()).padStart(2, "0")}`
        : "";

      const interviewDueDate = task.interviewDate ? new Date(task.interviewDate) : null;
      const formattedInterviewDate = interviewDueDate
        ? `${interviewDueDate.getFullYear()}-${String(interviewDueDate.getMonth() + 1).padStart(2, "0")}-${String(interviewDueDate.getDate()).padStart(2, "0")}`
        : "";

      // console.log("Formatted Interview Date:", formattedInterviewDate); // Debugging log

      reset({
        slid: task.slid || "",
        pisDate: formattedPISDate,
        contactNumber: task.contactNumber || "",
        requestNumber: task.requestNumber || "",
        tarrifName: task.tarrifName || "",
        customerFeedback: task.customerFeedback || "",
        reason: task.reason || "",
        responsible: task.responsible || "",
        customerName: task.customerName || "",
        operation: task.operation || "",
        interviewDate: formattedInterviewDate,
        contractDate: task.contractDate ? new Date(task.contractDate).toISOString().split('T')[0] : "",
        inDate: task.inDate ? new Date(task.inDate).toISOString().split('T')[0] : "",
        feDate: task.feDate ? new Date(task.feDate).toISOString().split('T')[0] : (task.appDate ? new Date(task.appDate).toISOString().split('T')[0] : ""),
        unDate: task.unDate ? new Date(task.unDate).toISOString().split('T')[0] : "",
        closeDate: task.closeDate ? new Date(task.closeDate).toISOString().split('T')[0] : "",
      });

      setValue("pisDate", formattedPISDate);
      setValue("interviewDate", formattedInterviewDate);
      setValue("contactNumber", task.contactNumber || "");
      setValue("requestNumber", task.requestNumber || "");
      setValue("customerFeedback", task.customerFeedback || "");
      setValue("closureComment", task.closureComment || "");
      setValue("reason", task.reason || "");
      setValue("responsible", task.responsible || "");
      setValue("customerName", task.customerName || "");
      setValue("operation", task.operation || "");
      setValue("dashboardShortNote", task.dashboardShortNote || "");
      setValue("contractDate", task.contractDate ? new Date(task.contractDate).toISOString().split('T')[0] : "");
      setValue("inDate", task.inDate ? new Date(task.inDate).toISOString().split('T')[0] : "");
      setValue("feDate", task.feDate ? new Date(task.feDate).toISOString().split('T')[0] : (task.appDate ? new Date(task.appDate).toISOString().split('T')[0] : ""));
      setValue("unDate", task.unDate ? new Date(task.unDate).toISOString().split('T')[0] : "");
      setValue("closeDate", task.closeDate ? new Date(task.closeDate).toISOString().split('T')[0] : "");
      setValue("gaiaContent", task.gaiaContent || "");

      const priorityValue = task.priority || "";
      setPriority(priorityValue);

      setDepartment(task.department || DEPARTMENT[0]);

      setPisDate(formattedPISDate);
      setInterviewDate(formattedInterviewDate);
      setTeamCompany(task.teamCompany || '');
      setEvaluationScore(task.evaluationScore || '');
      setGovernorate(task.governorate || '');
      setDistrict(task.district || '');
      const teamIdVal = task.teamId && typeof task.teamId === 'object' ? task.teamId._id : task.teamId;
      const teamNameVal = task.teamName || (task.teamId && typeof task.teamId === 'object' ? task.teamId.teamName : '');
      setTeamInfo({
        teamName: teamNameVal || '',
        teamId: teamIdVal || ''
      });
      setCustomerType(task.customerType || '');
      setValidationStatus(task.validationStatus || "");
      setCallStatus(task.callStatus || "");
      setClosureRequestedByFieldTeam(task.closureRequestedByFieldTeam || "False");
      setTechnicalTeamEvaluation(task.technicalTeamEvaluation || "");
      setServiceEvaluation(task.serviceEvaluation || "");
      setCategoryOfDissatisfaction(task.categoryOfDissatisfaction || "");
      setCustomFields(Array.isArray(task.customFields) && task.customFields.length > 0 ? task.customFields : [{ question: "", answer: "Not specified" }]);
      setSecondCallInitiated(task.secondCallInitiated || "Not specified");
      setSecondCallStatus(task.secondCallStatus || "");
      setSecondCallCategory(task.secondCallCategory || "");
      setSecondCallAction(task.secondCallAction || "");
      setSecondCallTeam(task.secondCallTeam || "");
      setSecondCallDispatchDate(task.secondCallDispatchDate ? new Date(task.secondCallDispatchDate).toISOString().split('T')[0] : "");
      setSecondCallSecondaryStatus(task.secondCallSecondaryStatus || "");
      setSecondCallResolutionMethod(task.secondCallResolutionMethod || "");
      setSecondCallResolvedBy(task.secondCallResolvedBy || "");
      setSecondCallRootCause(task.secondCallRootCause || "");
      setSecondCallResolutionDate(task.secondCallResolutionDate ? new Date(task.secondCallResolutionDate).toISOString().split('T')[0] : "");
      setSecondCallResolvedBeforeSurvey(task.secondCallResolvedBeforeSurvey || "Not specified");

      const itns = Array.isArray(task.itnRelated) ? task.itnRelated : (task.itnRelated ? [task.itnRelated] : []);
      const resps = Array.isArray(task.responsible) ? task.responsible : (task.responsible ? [task.responsible] : []);
      const reas = Array.isArray(task.reason) ? task.reason : (task.reason ? [task.reason] : []);
      const subReas = Array.isArray(task.subReason) ? task.subReason : (task.subReason ? [task.subReason] : []);
      const roots = Array.isArray(task.rootCause) ? task.rootCause : (task.rootCause ? [task.rootCause] : []);
      const subs = Array.isArray(task.relatedToSubscription) ? task.relatedToSubscription : (task.relatedToSubscription ? [task.relatedToSubscription] : []);
      const teamAccs = Array.isArray(task.teamAccountability) ? task.teamAccountability : (task.teamAccountability ? [task.teamAccountability] : []);

      const maxLen = Math.max(resps.length, reas.length, subReas.length, roots.length, itns.length, subs.length, teamAccs.length, 1);
      const rows = [];
      for (let i = 0; i < maxLen; i++) {
        rows.push({
          responsible: resps[i] || 'Not specified',
          reason: reas[i] || 'Not specified',
          subReason: subReas[i] || 'Not specified',
          rootCause: roots[i] || 'Not specified',
          itnRelated: itns[i] || 'Not specified',
          relatedToSubscription: subs[i] || 'Not specified',
          teamAccountability: teamAccs[i] || task.accountability || 'No'
        });
      }
      setRcaRows(rows);

      setOntType(task.ontType || "Not specified");
      setFreeExtender(task.freeExtender || "Not specified");
      setExtenderType(task.extenderType || "Not specified");
      setExtenderNumber(task.extenderNumber || 0);
      setOperation(task.operation || "");
      setGaiaCheck(task.gaiaCheck || "Not specified");
      setGaiaContent(task.gaiaContent || "");
      setIsQoS(task.isQoS || false);
      setContractDate(task.contractDate ? new Date(task.contractDate).toISOString().split('T')[0] : "");
      setInDate(task.inDate ? new Date(task.inDate).toISOString().split('T')[0] : "");
      const initialFeDate = task.feDate ? new Date(task.feDate).toISOString().split('T')[0] : (task.appDate ? new Date(task.appDate).toISOString().split('T')[0] : "");
      setFeDate(initialFeDate);
      setUnDate(task.unDate ? new Date(task.unDate).toISOString().split('T')[0] : "");
      // setCloseDate(task.closeDate ? new Date(task.closeDate).toISOString().split('T')[0] : "");
      setSelectedScoringKeys(task.scoringKeys || []);
    }
  }, [task, open, reset, setValue, user, dropdownOptions]);


  useEffect(() => {
    const fetchAllFieldTeams = async () => {
      try {
        const { data } = await api.get("/field-teams/get-field-teams", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
        // console.log("Fetched field teams:", data); // Debugging: Log fetched field teams

        if (data) {
          setFieldTeams(data);
        }
      } catch (error) {
        // console.log("Error fetching field teams:", error); // Debugging: Log error
      }
    }

    fetchAllFieldTeams()
  }, [])

  const handleSubmitForm = async (data) => {
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
      department,
      teamCompany,
      teamName: teamInfo.teamName,
      teamId: teamInfo.teamId,
      evaluationScore,
      operation,
      governorate,
      district,
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
      contractDate,
      inDate,
      feDate,
      unDate,
      closeDate: data.closeDate,
      isQoS,
      scoringKeys: selectedScoringKeys,
    };

    // console.log({ formData });

    // return

    try {
      const { data: responseData } = await api.put(`/tasks/update-task/${task._id}`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      if (responseData.status === 200 || responseData._id) {
        toast.success(responseData?.message || "Task Updated Successfully");
        handleSuccess(responseData.task || responseData);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Something went wrong");
    }
  };

  const handleAddRcaRow = () => setRcaRows([...rcaRows, { responsible: '', reason: '', subReason: '', rootCause: '', itnRelated: 'No', relatedToSubscription: 'No', teamAccountability: 'No' }]);
  const handleRemoveRcaRow = (index) => setRcaRows(rcaRows.filter((_, i) => i !== index));
  const handleChangeRcaRow = (index, field, newValue) => {
    const updated = [...rcaRows];
    updated[index][field] = newValue;
    setRcaRows(updated);
  };

  return (
    <Dialog open={open} fullScreen onClose={() => setOpen(false)}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Edit Task</Typography>
        <IconButton onClick={() => setOpen(false)} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <form onSubmit={handleSubmit(handleSubmitForm)} style={{ padding: '8px 0' }}>
          <Stack spacing={3}>
            {/* Row 1: Customer Name, Contact Number */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Customer Name"
                fullWidth
                variant="outlined"
                {...register("customerName", { required: "Customer name is required" })}
                error={!!errors.customerName}
                helperText={errors.customerName ? errors.customerName.message : ""}
              />
              <TextField
                label="Contact number"
                type='number'
                fullWidth
                variant="outlined"
                {...register('contactNumber', { required: 'Contact number is required' })}
                error={!!errors.contactNumber}
                helperText={errors.contactNumber ? errors.contactNumber.message : ''}
              />
            </Stack>

            {/* Row 2: Request Number, Operation, SLID */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Request number"
                type='number'
                fullWidth
                variant="outlined"
                {...register('requestNumber', { required: 'request number is required' })}
                error={!!errors.requestNumber}
                helperText={errors.requestNumber ? errors.requestNumber.message : ''}
              />
              <TextField
                label="Operation"
                placeholder="Enter operation"
                fullWidth
                variant="outlined"
                value={operation}
                onChange={(e) => setOperation(e.target.value)}
              />
              <TextField
                label="SLID"
                placeholder="Enter SLID"
                fullWidth
                variant="outlined"
                value={watch("slid")}
                onChange={(e) => setValue("slid", e.target.value)}
                {...register("slid", { required: "SLID is required" })}
                error={!!errors.slid}
                helperText={errors.slid ? errors.slid.message : ""}
              />
            </Stack>

            {/* Row 3: Governorate & District */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Governorate</InputLabel>
                <Select value={governorate} onChange={(e) => setGovernorate(e.target.value)} label="Governorate">
                  {dropdownOptions.GOVERNORATES.map((list) => (
                    <MenuItem key={list} value={list}>{list}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="District"
                placeholder="Enter District"
                fullWidth
                variant="outlined"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Tariff Name"
                fullWidth
                variant="outlined"
                {...register("tarrifName", { required: "Tariff Name is required" })}
                error={!!errors.tarrifName}
                helperText={errors.tarrifName ? errors.tarrifName.message : ""}
              />
            </Stack>

            {/* Row 5: Satisfaction Score */}
            <FormControl fullWidth variant="outlined">
              <InputLabel>Satisfaction Score</InputLabel>
              <Select value={evaluationScore} onChange={(e) => setEvaluationScore(e.target.value)} label="Satisfaction Score">
                {dropdownOptions.EVALUATION_SCORE.map((score) => (
                  <MenuItem key={score} value={score}>{score}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Customer Feedback / Comment"
              fullWidth
              variant="outlined"
              multiline
              rows={4}
              {...register('customerFeedback', { required: 'Customer feedback is required!' })}
              error={!!errors.customerFeedback}
              helperText={errors.customerFeedback ? errors.customerFeedback.message : ''}
              inputProps={{ dir: "auto" }}
              sx={{ '& .MuiInputBase-input': { textAlign: 'start' } }}
            />

            <TextField
              label="Dashboard Short Note"
              placeholder="A very short note for the main dashboard card"
              fullWidth
              variant="outlined"
              {...register('dashboardShortNote')}
              inputProps={{ dir: "auto", maxLength: 100 }}
              helperText="Maximum 100 characters"
            />

            {/* Row 7: Customer Type */}
            <FormControl fullWidth variant="outlined">
              <InputLabel>Customer Type</InputLabel>
              <Select value={customerType} onChange={(e) => setCustomerType(e.target.value)} label="Customer Type">
                {dropdownOptions.CUSTOMER_TYPE.map((list) => (
                  <MenuItem key={list} value={list}>{list}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* New Row: GAIA Check & Request Date */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>GAIA Check</InputLabel>
                <Select
                  value={gaiaCheck}
                  onChange={(e) => setGaiaCheck(e.target.value)}
                  label="GAIA Check"
                >
                  <MenuItem value="Not specified">Not specified</MenuItem>
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </Select>
              </FormControl>
              {gaiaCheck === 'Yes' && (
                <TextField
                  label="GAIA Content"
                  placeholder="Content to be added from GAIA system"
                  fullWidth
                  variant="outlined"
                  value={gaiaContent}
                  onChange={(e) => setGaiaContent(e.target.value)}
                  multiline
                  rows={2}
                  inputProps={{ style: { direction: 'ltr' } }}
                />
              )}
              <TextField
                label="Request Date"
                type="date"
                fullWidth
                variant="outlined"
                {...register('contractDate')}
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            {/* Row: FE Date & In Date */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Creation Date (FE)"
                type="date"
                fullWidth
                variant="outlined"
                {...register('feDate')}
                value={feDate}
                onChange={(e) => setFeDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Dispatch Date (To Subcon)"
                type="date"
                fullWidth
                variant="outlined"
                {...register('inDate')}
                value={inDate}
                onChange={(e) => setInDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            {/* Ordered Date Fields: Close Date -> PIS Date -> Interview Date */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Completion Date"
                type="date"
                fullWidth
                variant="outlined"
                {...register('closeDate')}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="PIS Date"
                type="date"
                fullWidth
                variant="outlined"
                {...register('pisDate', { required: 'PIS Date is required!' })}
                error={!!errors.pisDate}
                helperText={errors.pisDate ? errors.pisDate.message : ''}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Interview Date"
                type="date"
                fullWidth
                variant="outlined"
                {...register('interviewDate')}
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            {/* Dynamic Scoring Keys - Autocomplete */}
            {scoringKeyOptions.length > 0 && (
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>Scoring Factors</Typography>
                <Autocomplete
                  multiple
                  id="scoring-factors-autocomplete"
                  options={scoringKeyOptions.filter(key => key.targetForm === 'Task' || key.targetForm === 'Both')}
                  getOptionLabel={(option) => `${option.label} (${option.points > 0 ? '+' : ''}${option.points})`}
                  value={scoringKeyOptions.filter(key => selectedScoringKeys.includes(key.label))}
                  onChange={(event, newValue) => {
                    setSelectedScoringKeys(newValue.map(item => item.label));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="Select Scoring Factors"
                      placeholder="Search factors..."
                    />
                  )}
                  renderOption={(props, option, { selected }) => (
                    <li {...props}>
                      <Checkbox
                        icon={<Box component="span" sx={{ width: 16, height: 16, border: '1px solid gray', borderRadius: '3px' }} />}
                        checkedIcon={<Box component="span" sx={{ width: 16, height: 16, bgcolor: 'primary.main', borderRadius: '3px' }} />}
                        style={{ marginRight: 8 }}
                        checked={selected}
                      />
                      {option.label} ({option.points > 0 ? '+' : ''}{option.points})
                    </li>
                  )}
                  fullWidth
                />
              </Box>
            )}

            {/* Row: ONT Type -> Free Extender */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>ONT Type</InputLabel>
                <Select value={ontType} onChange={(e) => setOntType(e.target.value)} label="ONT Type">
                  {dropdownOptions.ONT_TYPE.map((list) => (
                    <MenuItem key={list} value={list}>{list}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Free Extender</InputLabel>
                <Select
                  value={freeExtender}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFreeExtender(val);
                    if (val === 'No') {
                      setExtenderType("");
                      setExtenderNumber(0);
                    }
                  }}
                  label="Free Extender"
                >
                  <MenuItem value="Not specified">Not specified</MenuItem>
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </Select>
              </FormControl>
              {freeExtender === 'Yes' && (
                <>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Extender Type</InputLabel>
                    <Select value={extenderType} onChange={(e) => setExtenderType(e.target.value)} label="Extender Type">
                      {dropdownOptions.EXTENDER_TYPE.map((list) => (
                        <MenuItem key={list} value={list}>{list}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField label="Extender Count" type="number" fullWidth value={extenderNumber} onChange={(e) => setExtenderNumber(parseInt(e.target.value) || 0)} />
                </>
              )}
            </Stack>

            {/* Row 9: Subcon (Team Company), Field Team */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Subcon</InputLabel>
                <Select value={teamCompany} onChange={(e) => setTeamCompany(e.target.value)} label="Subcon">
                  {dropdownOptions.TEAM_COMPANY.map((list) => (
                    <MenuItem key={list} value={list}>{list}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Autocomplete
                options={fieldTeams}
                getOptionLabel={(option) => option.teamName || ""}
                value={fieldTeams.find(t => t._id === teamInfo.teamId) || null}
                onChange={(e, newValue) => {
                  setTeamInfo(newValue ? { teamName: newValue.teamName, teamId: newValue._id } : { teamName: '', teamId: '' });
                }}
                renderInput={(params) => <TextField {...params} label="Field Team Name" variant="outlined" />}
                fullWidth
              />
            </Stack>

            <UnifiedRCARows
              rcaRows={rcaRows}
              setRcaRows={setRcaRows}
              dropdownOptions={dropdownOptions}
              handleAdd={handleAddRcaRow}
              handleRemove={handleRemoveRcaRow}
              handleChange={handleChangeRcaRow}
            />

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2 }}>Additional Details (Priority, Validation, etc.)</Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  label="Priority"
                >
                  {dropdownOptions.PRIORITY.map((level) => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Validation Status</InputLabel>
                <Select value={validationStatus} onChange={(e) => setValidationStatus(e.target.value)} label="Validation Status">
                  {dropdownOptions.VALIDATION_STATUS.map((list) => (
                    <MenuItem key={list} value={list}>{list}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>FMC Closure</Typography>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Autocomplete
                    freeSolo
                    fullWidth
                    size="small"
                    options={callStatusOptions}
                    value={callStatus}
                    onChange={(event, newValue) => setCallStatus(newValue || '')}
                    onInputChange={(event, newValue) => setCallStatus(newValue)}
                    renderInput={(params) => <TextField {...params} label="Status" variant="outlined" />}
                  />
                </Stack>
                <TextField
                  label="Comment"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={4}
                  {...register('closureComment')}
                  inputProps={{ dir: "auto" }}
                  sx={{ '& .MuiInputBase-input': { textAlign: 'start' } }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Autocomplete
                    freeSolo
                    fullWidth
                    size="small"
                    options={trueFalseOptions}
                    value={closureRequestedByFieldTeam}
                    onChange={(event, newValue) => setClosureRequestedByFieldTeam(newValue || 'False')}
                    onInputChange={(event, newValue) => setClosureRequestedByFieldTeam(newValue)}
                    renderInput={(params) => <TextField {...params} label="Closure requested by field team" variant="outlined" />}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Technical Team Evaluation</InputLabel>
                    <Select
                      value={technicalTeamEvaluation}
                      onChange={(e) => setTechnicalTeamEvaluation(e.target.value)}
                      label="Technical Team Evaluation"
                    >
                      <MenuItem value=""><em>Not specified</em></MenuItem>
                      {[...Array(11).keys()].map((num) => (
                        <MenuItem key={num} value={num}>{num}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Service Evaluation</InputLabel>
                    <Select
                      value={serviceEvaluation}
                      onChange={(e) => setServiceEvaluation(e.target.value)}
                      label="Service Evaluation"
                    >
                      <MenuItem value=""><em>Not specified</em></MenuItem>
                      {[...Array(11).keys()].map((num) => (
                        <MenuItem key={num} value={num}>{num}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
                <TextField
                  label="Category of dissatisfaction"
                  fullWidth
                  variant="outlined"
                  value={categoryOfDissatisfaction}
                  onChange={(e) => setCategoryOfDissatisfaction(e.target.value)}
                  inputProps={{ dir: "auto" }}
                  sx={{ '& .MuiInputBase-input': { textAlign: 'start' } }}
                />
              </Stack>
            </Box>

            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Custom Yes/No Fields</Typography>
              <Stack spacing={2}>
                {customFields.map((field, index) => (
                  <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
                    <TextField
                      label={`Question ${index + 1}`}
                      placeholder="Enter custom question"
                      fullWidth
                      variant="outlined"
                      value={field.question}
                      onChange={(e) => handleCustomFieldChange(index, 'question', e.target.value)}
                    />
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Answer</InputLabel>
                      <Select
                        value={field.answer}
                        onChange={(e) => handleCustomFieldChange(index, 'answer', e.target.value)}
                        label="Answer"
                      >
                        {yesNoOptions.map((option) => (
                          <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <IconButton color="error" onClick={() => handleRemoveCustomField(index)} size="small">
                      <RemoveCircleIcon />
                    </IconButton>
                  </Stack>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddCircleIcon />}
                  onClick={handleAddCustomField}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Add Custom Field
                </Button>
              </Stack>
            </Box>

            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Second Call Details</Typography>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Autocomplete
                    freeSolo
                    fullWidth
                    size="small"
                    options={yesNoOptions}
                    value={secondCallInitiated}
                    onChange={(event, newValue) => setSecondCallInitiated(newValue || 'Not specified')}
                    onInputChange={(event, newValue) => setSecondCallInitiated(newValue)}
                    renderInput={(params) => <TextField {...params} label="Second Call" variant="outlined" />}
                  />
                  <Autocomplete
                    freeSolo
                    fullWidth
                    size="small"
                    options={callStatusOptions}
                    value={secondCallStatus}
                    onChange={(event, newValue) => setSecondCallStatus(newValue || '')}
                    onInputChange={(event, newValue) => setSecondCallStatus(newValue)}
                    renderInput={(params) => <TextField {...params} label="Status" variant="outlined" />}
                  />
                  <TextField
                    label="Category of dissatisfaction"
                    placeholder="Category of dissatisfaction"
                    fullWidth
                    variant="outlined"
                    value={secondCallCategory}
                    onChange={(e) => setSecondCallCategory(e.target.value)}
                    inputProps={{ dir: "auto" }}
                    sx={{ '& .MuiInputBase-input': { textAlign: 'start' } }}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Action"
                    placeholder="Action"
                    fullWidth
                    variant="outlined"
                    value={secondCallAction}
                    onChange={(e) => setSecondCallAction(e.target.value)}
                  />
                  <TextField
                    label="Team"
                    placeholder="Team"
                    fullWidth
                    variant="outlined"
                    value={secondCallTeam}
                    onChange={(e) => setSecondCallTeam(e.target.value)}
                  />
                  <TextField
                    label="Dispatch Date"
                    type="date"
                    fullWidth
                    variant="outlined"
                    value={secondCallDispatchDate}
                    onChange={(e) => setSecondCallDispatchDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Secondary Status"
                    fullWidth
                    variant="outlined"
                    value={secondCallSecondaryStatus}
                    onChange={(e) => setSecondCallSecondaryStatus(e.target.value)}
                  />
                  <TextField
                    label="Resolution Method"
                    fullWidth
                    variant="outlined"
                    value={secondCallResolutionMethod}
                    onChange={(e) => setSecondCallResolutionMethod(e.target.value)}
                  />
                  <TextField
                    label="Resolved By"
                    fullWidth
                    variant="outlined"
                    value={secondCallResolvedBy}
                    onChange={(e) => setSecondCallResolvedBy(e.target.value)}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Root Cause"
                    fullWidth
                    variant="outlined"
                    value={secondCallRootCause}
                    onChange={(e) => setSecondCallRootCause(e.target.value)}
                  />
                  <TextField
                    label="Resolution Date"
                    type="date"
                    fullWidth
                    variant="outlined"
                    value={secondCallResolutionDate}
                    onChange={(e) => setSecondCallResolutionDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Autocomplete
                    freeSolo
                    fullWidth
                    size="small"
                    options={yesNoOptions}
                    value={secondCallResolvedBeforeSurvey}
                    onChange={(event, newValue) => setSecondCallResolvedBeforeSurvey(newValue || 'Not specified')}
                    onInputChange={(event, newValue) => setSecondCallResolvedBeforeSurvey(newValue)}
                    renderInput={(params) => <TextField {...params} label="Resolved Before Survey" variant="outlined" />}
                  />
                </Stack>
              </Stack>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button onClick={handleClose} variant="outlined">Cancel</Button>
              <Button type="submit" variant="contained" color="primary">Update Task</Button>
            </Box>
          </Stack>
        </form>
      </DialogContent>
    </Dialog >
  );
};

export default EditTaskDialog;
