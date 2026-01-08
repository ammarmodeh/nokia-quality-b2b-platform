import {
  Button,
  Dialog,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Stack,
  Box,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Grid,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import UserList from './UserList';
// import { useSelector } from 'react-redux';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useState } from 'react';
import api from '../../api/api';

// Fallback constants removed. Powered by dynamic API data.


const AddTask = ({ open, setOpen, setUpdateRefetchTasks }) => {
  // const user = useSelector((state) => state?.auth?.user);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
              formatted[key] = data[key]; // Store full objects for hierarchical options
            } else {
              formatted[key] = data[key].map(opt => opt.value);
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
    const fetchUsers = async () => {
      try {
        const { data } = await api.get("/users/get-all-users", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        // console.log({ data });
        setUsers(data);
      } catch (err) {
        // console.log(err);
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
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
      } catch (error) {
        // console.log(error);
      }
    }

    fetchAllFieldTeams()
  }, [])

  const task = '';

  const {
    handleSubmit,
    register,
    watch,
    formState: { errors },
  } = useForm();

  const [assignedTo, setAssignedTo] = useState(task?.assignedTo || []);
  const [whomItMayConcern, setWhomItMayConcern] = useState([]);
  const [priority, setPriority] = useState(task?.priority?.toUpperCase() || dropdownOptions.PRIORITY[0]);
  const [category, setCategory] = useState(dropdownOptions.TASK_CATEGORIES[0]);
  const [teamCompany, setTeamCompany] = useState(dropdownOptions.TEAM_COMPANY[0]);
  const [evaluationScore, setEvaluationScore] = useState(dropdownOptions.EVALUATION_SCORE[0]);
  const [governorate, setGovernorate] = useState(dropdownOptions.GOVERNORATES[0]);
  const [customerType, setCustomerType] = useState(dropdownOptions.CUSTOMER_TYPE[0]);
  const [validationStatus, setValidationStatus] = useState(dropdownOptions.VALIDATION_STATUS[1] || dropdownOptions.VALIDATION_STATUS[0]);
  const [responsible, setResponsible] = useState("");
  const [reason, setReason] = useState("");
  const [subReason, setSubReason] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [ontType, setOntType] = useState("");
  const [freeExtender, setFreeExtender] = useState("No");
  const [extenderType, setExtenderType] = useState("");
  const [extenderNumber, setExtenderNumber] = useState(0);
  const [closureCallEvaluation, setClosureCallEvaluation] = useState("");
  const [closureCallFeedback, setClosureCallFeedback] = useState("");

  // Conditional field toggles
  const [includeFieldTeam, setIncludeFieldTeam] = useState(false);
  const [includeOntType, setIncludeOntType] = useState(false);
  const [includeFreeExtender, setIncludeFreeExtender] = useState(false);
  const [includeClosureEvaluation, setIncludeClosureEvaluation] = useState(false);
  const [includeClosureFeedback, setIncludeClosureFeedback] = useState(false);
  // const [rootCause, setRootCause] = useState("");

  // This watchTitle is used to get the value of the title field (registered in the form)
  const watchSLID = watch('slid', '');
  // console.log({ watchSLID });

  // Handle changes in the "Assign Task To" list
  const handleAssignedToChange = (newAssignedTo) => {

    // Remove selected users from the "Whom It May Concern" list
    const updatedWhomItMayConcern = whomItMayConcern.filter(
      (userId) => !newAssignedTo.includes(userId)
    );

    setAssignedTo(newAssignedTo);
    setWhomItMayConcern(updatedWhomItMayConcern);
  };

  // Handle changes in the "Whom It May Concern" list
  const handleWhomItMayConcernChange = (newWhomItMayConcern) => {
    // Remove selected users from the "Assign Task To" list
    const updatedAssignedTo = assignedTo.filter(
      (userId) => !newWhomItMayConcern.includes(userId)
    );

    setWhomItMayConcern(newWhomItMayConcern);
    setAssignedTo(updatedAssignedTo);
  };


  const submitHandler = async (data) => {
    // console.log({ data });
    const formData = {
      ...data,
      slid: `INT${data.slid}`,
      governorate,
      assignedTo,
      whomItMayConcern,
      // status,
      priority,
      category,
      teamCompany,
      teamName: teamInfo.teamName,
      teamId: teamInfo.teamId,
      evaluationScore,
      customerType,
      validationStatus,
      responsible,
      reason,
      subReason,
      rootCause,
      ontType,
      freeExtender,
      extenderType: freeExtender === 'Yes' ? extenderType : null,
      extenderNumber: freeExtender === 'Yes' ? extenderNumber : 0,
      closureCallEvaluation,
      closureCallFeedback,
    };

    console.log('Sending Task Data:', formData);


    if (formData.whomItMayConcern.length === 0 || formData.assignedTo.length === 0) {
      alert('Please select at least one user for both "Assign Task To" and "Whom It May Concern" lists.');
      return;
    }

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
        setUpdateRefetchTasks(prev => !prev);
        alert('Task created successfully!');
      }
    } catch (error) {
      alert(error.response.data.message);
      console.log(error);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={handleClose}
    >
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            {task ? 'Update Task' : 'Add Task'}
          </Typography>
          <Button autoFocus color="inherit" type="submit" form="task-form">
            Create
          </Button>
        </Toolbar>
      </AppBar>
      <form id="task-form" onSubmit={handleSubmit(submitHandler)} style={{ padding: '24px' }}>
        <Stack spacing={3}>
          {/* Row 1: Request Number, SLID, Customer Name, Contact Number */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Request number"
              placeholder="Enter request number"
              type='number'
              fullWidth
              variant="outlined"
              {...register('requestNumber')}
              error={!!errors.requestNumber}
              helperText={errors.requestNumber ? errors.requestNumber.message : ''}
            />
            <TextField
              label="SLID"
              placeholder="Enter 7 digits"
              fullWidth
              variant="outlined"
              value={watchSLID}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 7);
              }}
              {...register('slid', {
                required: 'SLID is required',
                pattern: { value: /^\d{7}$/, message: 'SLID must be 7 digits' },
              })}
              error={!!errors.slid}
              helperText={errors.slid ? errors.slid.message : ''}
            />
            <TextField
              label="Customer Name"
              placeholder="Customer Name"
              fullWidth
              variant="outlined"
              {...register('customerName')}
              error={!!errors.customerName}
              helperText={errors.customerName ? errors.customerName.message : ''}
            />
            <TextField
              label="Contact number"
              placeholder="Enter contact number"
              type='number'
              fullWidth
              variant="outlined"
              {...register('contactNumber')}
              error={!!errors.contactNumber}
              helperText={errors.contactNumber ? errors.contactNumber.message : ''}
            />
          </Stack>

          {/* Row 2: Satisfaction Score, PIS Date */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Satisfaction Score</InputLabel>
              <Select
                value={evaluationScore}
                onChange={(e) => setEvaluationScore(e.target.value)}
                label="Satisfaction Score"
              >
                {dropdownOptions.EVALUATION_SCORE.map((list) => (
                  <MenuItem key={list} value={list}>{list}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="PIS Date"
              type="date"
              fullWidth
              variant="outlined"
              {...register('pisDate')}
              error={!!errors.pisDate}
              helperText={errors.pisDate ? errors.pisDate.message : ''}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          {/* Row 3: Governorate, District, Customer Type */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Governorate</InputLabel>
              <Select
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                label="Governorate"
              >
                {dropdownOptions.GOVERNORATES.map((list) => (
                  <MenuItem key={list} value={list}>{list}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="District"
              fullWidth
              variant="outlined"
              {...register('district')}
              error={!!errors.district}
              helperText={errors.district ? errors.district.message : ''}
            />
            <FormControl fullWidth variant="outlined">
              <InputLabel>Customer Type</InputLabel>
              <Select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                label="Customer Type"
              >
                {dropdownOptions.CUSTOMER_TYPE.map((list) => (
                  <MenuItem key={list} value={list}>{list}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Row 4: Tariff Name, Priority, Category */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Tariff Name"
              fullWidth
              variant="outlined"
              {...register('tarrifName')}
              error={!!errors.tarrifName}
              helperText={errors.tarrifName ? errors.tarrifName.message : ''}
            />
            <FormControl fullWidth variant="outlined">
              <InputLabel>Priority</InputLabel>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                label="Priority"
              >
                {dropdownOptions.PRIORITY.map((list) => (
                  <MenuItem key={list} value={list}>{list}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                label="Category"
              >
                {dropdownOptions.TASK_CATEGORIES.map((list) => (
                  <MenuItem key={list} value={list}>{list}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Row 5: Team Company, Field Team */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Team Company</InputLabel>
                <Select
                  value={teamCompany}
                  onChange={(e) => setTeamCompany(e.target.value)}
                  label="Team Company"
                >
                  {dropdownOptions.TEAM_COMPANY.map((list) => (
                    <MenuItem key={list} value={list}>{list}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeFieldTeam}
                      onChange={(e) => setIncludeFieldTeam(e.target.checked)}
                    />
                  }
                  label="Include Field Team"
                />
                {includeFieldTeam && (
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
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Row 6: RCA (Responsibility, Reason, SubReason, RootCause) */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Autocomplete
              freeSolo
              fullWidth
              options={dropdownOptions.RESPONSIBILITY?.map(item => item.value) || []}
              value={responsible}
              onChange={(e, newValue) => setResponsible(newValue || "")}
              onInputChange={(e, newValue) => setResponsible(newValue || "")}
              renderInput={(params) => <TextField {...params} label="Responsibility" variant="outlined" />}
            />
            <Autocomplete
              freeSolo
              fullWidth
              options={dropdownOptions.REASON?.map(item => item.value) || []}
              value={reason}
              onChange={(e, newValue) => setReason(newValue || "")}
              onInputChange={(e, newValue) => setReason(newValue || "")}
              renderInput={(params) => <TextField {...params} label="Main Reason" variant="outlined" />}
            />
            <Autocomplete
              freeSolo
              fullWidth
              options={dropdownOptions.REASON_SUB?.map(item => item.value) || []}
              value={subReason}
              onChange={(e, newValue) => setSubReason(newValue || "")}
              onInputChange={(e, newValue) => setSubReason(newValue || "")}
              renderInput={(params) => <TextField {...params} label="Sub Reason" variant="outlined" />}
            />
            <Autocomplete
              freeSolo
              fullWidth
              options={dropdownOptions.ROOT_CAUSE?.map(item => item.value) || []}
              value={rootCause}
              onChange={(e, newValue) => setRootCause(newValue || "")}
              onInputChange={(e, newValue) => setRootCause(newValue || "")}
              renderInput={(params) => <TextField {...params} label="Root Cause" variant="outlined" />}
            />
          </Stack>

          {/* Row 7: Validation Status, ONT Type, Free Extender */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Validation Status</InputLabel>
                <Select value={validationStatus} onChange={(e) => setValidationStatus(e.target.value)} label="Validation Status">
                  {dropdownOptions.VALIDATION_STATUS.map((list) => (
                    <MenuItem key={list} value={list}>{list}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeOntType}
                      onChange={(e) => setIncludeOntType(e.target.checked)}
                    />
                  }
                  label="Include ONT Type"
                />
                {includeOntType && (
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>ONT Type</InputLabel>
                    <Select value={ontType} onChange={(e) => setOntType(e.target.value)} label="ONT Type">
                      {dropdownOptions.ONT_TYPE.map((list) => (
                        <MenuItem key={list} value={list}>{list}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeFreeExtender}
                      onChange={(e) => setIncludeFreeExtender(e.target.checked)}
                    />
                  }
                  label="Include Free Extender"
                />
                {includeFreeExtender && (
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Free Extender</InputLabel>
                    <Select value={freeExtender} onChange={(e) => setFreeExtender(e.target.value)} label="Free Extender">
                      <MenuItem value="Yes">Yes</MenuItem>
                      <MenuItem value="No">No</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Row 8: Extender Details (Conditional) */}
          {includeFreeExtender && freeExtender === 'Yes' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Extender Type</InputLabel>
                <Select value={extenderType} onChange={(e) => setExtenderType(e.target.value)} label="Extender Type">
                  {dropdownOptions.EXTENDER_TYPE.map((list) => (
                    <MenuItem key={list} value={list}>{list}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Extender Number"
                type="number"
                fullWidth
                variant="outlined"
                value={extenderNumber}
                onChange={(e) => setExtenderNumber(parseInt(e.target.value) || 0)}
              />
            </Stack>
          )}

          {/* Row 9: Closure Call Evaluation & Feedback */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeClosureEvaluation}
                      onChange={(e) => setIncludeClosureEvaluation(e.target.checked)}
                    />
                  }
                  label="Include Closure Call Evaluation"
                />
                {includeClosureEvaluation && (
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Closure Call Evaluation (1-10)</InputLabel>
                    <Select value={closureCallEvaluation} onChange={(e) => setClosureCallEvaluation(e.target.value)} label="Closure Call Evaluation (1-10)">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <MenuItem key={num} value={num}>{num}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>

            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeClosureFeedback}
                      onChange={(e) => setIncludeClosureFeedback(e.target.checked)}
                    />
                  }
                  label="Include Closure Call Feedback"
                />
                {includeClosureFeedback && (
                  <TextField
                    label="Closure Call Feedback"
                    fullWidth
                    variant="outlined"
                    multiline
                    rows={2}
                    value={closureCallFeedback}
                    onChange={(e) => setClosureCallFeedback(e.target.value)}
                    inputProps={{ dir: "auto" }}
                    sx={{ '& .MuiInputBase-input': { textAlign: 'start' } }}
                  />
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Row 10: Customer Feedback */}
          <TextField
            label="Customer Feedback / Comment"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            {...register('customerFeedback')}
            error={!!errors.customerFeedback}
            helperText={errors.customerFeedback ? errors.customerFeedback.message : ''}
            inputProps={{ dir: "auto" }}
            sx={{ '& .MuiInputBase-input': { textAlign: 'start' } }}
          />

          <Divider />

          {/* Row 11: Assignment */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Box flex={1}>
              <UserList
                setAssignedTo={handleAssignedToChange}
                assignedTo={assignedTo}
                users={users}
                loading={loading}
                error={error}
                label="Assign Task To:"
                filteredUsers={whomItMayConcern}
              />
            </Box>
            <Box flex={1}>
              <UserList
                setAssignedTo={handleWhomItMayConcernChange}
                assignedTo={whomItMayConcern}
                users={users}
                loading={loading}
                error={error}
                label="Whom It May Concern:"
                filteredUsers={assignedTo}
              />
            </Box>
          </Stack>
        </Stack>
      </form>
    </Dialog>
  );
};

export default AddTask;