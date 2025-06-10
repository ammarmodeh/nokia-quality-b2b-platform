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
} from '@mui/material';
import { useForm } from 'react-hook-form';
import UserList from './UserList';
// import { useSelector } from 'react-redux';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useState } from 'react';
import api from '../../api/api';

// const LISTS = ['Todo', 'In Progress', 'Closed'];
const PRIORIRY = ['High', 'Medium', 'Low'];
const CATEGORIES = ['Orange HC detractor', 'Orange Closure', 'Orange Joint', 'Nokia MS detractor', 'Nokia FAT', 'Nokia Closure', 'TRC', 'TCRM', 'Others'];
const TEAMCOMPANY = ['INH-1', 'INH-2', 'INH-3', 'INH-4', 'INH-5', 'INH-6', 'Al-Dar 2', 'Orange Team', 'غير معروف']
const EVALUATIONSCORE = [1, 2, 3, 4, 5, 6, 7, 8]
const JORDANGOVERNORATES = ["عمَان", "الزرقاء", "إربد", "العقبة", "المفرق", "مادبا", "البلقاء", "جرش", "معان", "الكرك", "عجلون", "الطفيلة"]
const CUSTOMERTYPE = ["CBU", "EBU"]
const VALIDATIONSTATUS = ["Validated", "Not validated"]
const VALIDATIONCATEGORY = ["Knowledge Gap", "Customer Education", "Customer Perception", "Incomplete Service Delivery", "Lack of Technical Expertise",
  "Poor Time Management", "Technical Limitations", "Execution Delay", "Processing Delay", "External Factors", "Bad Team Behavior",
  "Device limitations", "Misuse of Service", "Customer-Declined Solution / Unrealistic Expectation", "Others", "VOIP", "Can't Determine"]

// If the field team caused the delay: (e.g., due to poor time management, lack of preparedness, skill gaps, or equipment issues)
// If the company delayed the transaction (e.g., due to internal processing, lack of material availability, slow approval procedures), then it’s an operational or administrative issue within the company.
// If the delay was caused by external factors (e.g., customer availability, municipality permits, or unexpected site conditions), then neither the team nor the company is directly responsible, but better coordination might be needed.
// Categorizing the Complaint:
// "Execution Delay - Field Team" → If the team is at fault.
// "Processing Delay - Internal Handling" → If the company’s workflow caused it.
// "External Factors - Uncontrollable Delay" → If the issue was beyond both the team's and company’s control.

// Main Category: Slow Internet Performance
// Subcategory 1: Wi-Fi Coverage Issue (Weak signal inside the house)
// Subcategory 2: Network Congestion/ISP Issue (External network problems)
// Subcategory 3: Fiber Connection Issue (Bad splicing, high attenuation)
// Subcategory 4: Equipment Issue (Faulty router, ONT problems)


const AddTask = ({ open, setOpen, setUpdateRefetchTasks }) => {
  // const user = useSelector((state) => state?.auth?.user);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fieldTeams, setFieldTeams] = useState([]);
  // console.log({ fieldTeams });
  const [teamInfo, setTeamInfo] = useState({ teamName: '', teamId: '' });
  // console.log({ fieldTeams, teamName });

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
  // console.log({ assignedTo });
  const [whomItMayConcern, setWhomItMayConcern] = useState([]);
  // const [status, setStatus] = useState(task?.status?.toUpperCase() || LISTS[0]);
  const [priority, setPriority] = useState(task?.priority?.toUpperCase() || PRIORIRY[0]);
  const [category, setCategory] = useState(CATEGORIES[0] || 'Others');
  const [teamCompany, setTeamCompany] = useState(TEAMCOMPANY[0] || 'INH-1');
  const [evaluationScore, setEvaluationScore] = useState(EVALUATIONSCORE[0] || 1);
  const [governorate, setGovernorate] = useState(JORDANGOVERNORATES[0]);
  const [customerType, setCustomerType] = useState(CUSTOMERTYPE[0]);
  const [validationStatus, setValidationStatus] = useState(VALIDATIONSTATUS[1]);
  const [validationCat, setValidationCat] = useState(VALIDATIONCATEGORY[0]);

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
      validationCat
    };
    // console.log({ formData });


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
      }
    } catch (error) {
      // console.log('Error while adding task:', error.response.data.error);
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
      <form id="task-form" onSubmit={handleSubmit(submitHandler)} className="p-6">
        <Stack spacing={2}>

          <Stack direction={"row"} spacing={2}>
            <TextField
              label="Request number"
              placeholder="Enter request number"
              type='number'
              fullWidth
              variant="outlined"
              {...register('requestNumber', {
                required: 'request number is required',
              })}
              error={!!errors.requestNumber}
              helperText={errors.requestNumber ? errors.requestNumber.message : ''}
            />

            <TextField
              label="SLID"
              placeholder="Enter 7 digits (e.g., 0123456)"
              fullWidth
              variant="outlined"
              value={watchSLID}
              onInput={(e) => {
                // console.log('onInput triggered');
                e.target.value = e.target.value.replace(/\D/g, '');
                if (e.target.value.length > 7) {
                  e.target.value = e.target.value.slice(0, 7);
                }
              }}
              InputProps={{ maxLength: 7 }}
              {...register('slid', {
                required: 'SLID is required',
                pattern: {
                  value: /^\d{7}$/,
                  message: 'SLID must be exactly 7 digits.',
                },
              })}
              error={!!errors.title}
              helperText={errors.title ? errors.title.message : ''}
            />
            <TextField
              label="Customer Name"
              placeholder="Customer Name"
              fullWidth
              variant="outlined"
              {...register('customerName', {
                required: 'Customer name is required',
              })}
              error={!!errors.customerName}
              helperText={errors.customerName ? errors.customerName.message : ''}
              sx={{ marginTop: '20px' }}
            />
            <TextField
              label="Contact number"
              placeholder="Enter contact number"
              type='number'
              fullWidth
              variant="outlined"
              {...register('contactNumber', {
                required: 'Contact number is required',
              })}
              error={!!errors.contactNumber}
              helperText={errors.contactNumber ? errors.contactNumber.message : ''}
            />
          </Stack>

          <Stack direction={"row"} spacing={2}>
            <FormControl fullWidth variant="outlined" error={!!errors.status}>
              <InputLabel>Evaluation Score</InputLabel>
              <Select value={evaluationScore} onChange={(e) => setEvaluationScore(e.target.value)} label="Team Company">
                {EVALUATIONSCORE.map((list) => (
                  <MenuItem key={list} value={list}>
                    {list}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{errors.status ? errors.status.message : ''}</FormHelperText>
            </FormControl>

            <TextField
              label="PIS Date"
              type="date"
              fullWidth
              variant="outlined"
              {...register('pisDate', { required: 'PIS Date is required!' })}
              error={!!errors.pisDate}
              helperText={errors.pisDate ? errors.pisDate.message : ''}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Stack>

          <Stack direction={"row"} spacing={2} >
            <FormControl fullWidth variant="outlined" error={!!errors.status}>
              <InputLabel>Governorate</InputLabel>
              <Select value={governorate} onChange={(e) => setGovernorate(e.target.value)} label="Governorate">
                {JORDANGOVERNORATES.map((list) => (
                  <MenuItem key={list} value={list}>
                    {list}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{errors.status ? errors.status.message : ''}</FormHelperText>
            </FormControl>
            <TextField
              label="District"
              type="text"
              fullWidth
              variant="outlined"
              {...register('district', { required: 'District is required!' })}
              error={!!errors.district}
              helperText={errors.district ? errors.district.message : ''}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <FormControl fullWidth variant="outlined" error={!!errors.status}>
              <InputLabel>Customer Type</InputLabel>
              <Select value={customerType} onChange={(e) => setCustomerType(e.target.value)} label="Customer Type">
                {CUSTOMERTYPE.map((list) => (
                  <MenuItem key={list} value={list}>
                    {list}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{errors.status ? errors.status.message : ''}</FormHelperText>
            </FormControl>
          </Stack>


          <Stack direction={"row"} spacing={2}>
            <TextField
              label="Tarrif Name"
              placeholder="Tarrif Name"
              fullWidth
              variant="outlined"
              multiline
              rows={4}
              {...register('tarrifName', {
                required: 'Tarrif name is required',
              })}
              error={!!errors.tarrifName}
              helperText={errors.tarrifName ? errors.tarrifName.message : ''}
              sx={{ marginTop: '20px' }}
            />

            <TextField
              label="Customer Feedback"
              placeholder="Enter the customer feedback"
              fullWidth
              variant="outlined"
              multiline
              rows={4}
              {...register('customerFeedback', {
                required: 'Customer feedback is required',
              })}
              error={!!errors.customerFeedback}
              helperText={errors.customerFeedback ? errors.customerFeedback.message : ''}
              sx={{ marginTop: '20px' }}
            />
          </Stack>

          <Stack direction={"row"} spacing={2}>
            <TextField
              label="Reason"
              placeholder="Enter reason"
              type='text'
              fullWidth
              variant="outlined"
              {...register('reason', {
                required: 'reason is required',
              })}
              error={!!errors.reason}
              helperText={errors.reason ? errors.reason.message : ''}
            />
            <TextField
              label="Interview Date"
              type="date"
              fullWidth
              variant="outlined"
              {...register('interviewDate', { required: 'Interview Date is required!' })}
              error={!!errors.interviewDate}
              helperText={errors.interviewDate ? errors.interviewDate.message : ''}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Stack>
        </Stack>

        <Divider sx={{ my: 4 }} />

        <Stack direction="row" spacing={2} alignItems="flex-start">
          {/* Autocomplete - Takes remaining width (flex-grow) */}
          <Box sx={{ flexGrow: 1 }}>
            <Autocomplete
              options={fieldTeams}
              getOptionLabel={(option) => option.teamName}
              value={fieldTeams.find(team => team.teamName === teamInfo.teamName) || null}
              onChange={(event, newValue) => {
                setTeamInfo({
                  teamName: newValue?.teamName || '',
                  teamId: newValue?._id || ''
                });
              }}
              renderInput={(params) => (
                <FormControl fullWidth variant="outlined" error={!!errors.status}>
                  <TextField
                    {...params}
                    label="Team Name"
                    variant="outlined"
                    error={!!errors.status}
                    helperText={errors.status ? errors.status.message : ''}
                  />
                </FormControl>
              )}
            />
          </Box>

          {/* Team Company - Fixed width */}
          <Box sx={{ width: 200 }}>
            <FormControl fullWidth variant="outlined" error={!!errors.status}>
              <InputLabel>Team Company</InputLabel>
              <Select value={teamCompany} onChange={(e) => setTeamCompany(e.target.value)} label="Team Company">
                {TEAMCOMPANY.map((list) => (
                  <MenuItem key={list} value={list}>
                    {list}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{errors.status ? errors.status.message : ''}</FormHelperText>
            </FormControl>
          </Box>

          {/* Validation Status - Fixed width */}
          <Box sx={{ width: 200 }}>
            <FormControl fullWidth variant="outlined" error={!!errors.status}>
              <InputLabel>Validation Status</InputLabel>
              <Select value={validationStatus} onChange={(e) => setValidationStatus(e.target.value)} label="Validation Status">
                {VALIDATIONSTATUS.map((list) => (
                  <MenuItem key={list} value={list}>
                    {list}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{errors.status ? errors.status.message : ''}</FormHelperText>
            </FormControl>
          </Box>
        </Stack>

        <Stack direction={"row"} spacing={2} sx={{ marginTop: '20px' }}>
          <TextField
            label="Responsibility"
            placeholder="Responsibility"
            type='text'
            fullWidth
            variant="outlined"
            {...register('responsibility', {
              required: 'responsibility is required',
            })}
            error={!!errors.responsibility}
            helperText={errors.responsibility ? errors.responsibility.message : ''}
          />

          <FormControl fullWidth variant="outlined" error={!!errors.status}>
            <InputLabel>Validation Category</InputLabel>
            <Select value={validationCat} onChange={(e) => setValidationCat(e.target.value)} label="Validation Status">
              {VALIDATIONCATEGORY.map((list) => (
                <MenuItem key={list} value={list}>
                  {list}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.status ? errors.status.message : ''}</FormHelperText>
          </FormControl>
        </Stack>

        <Divider sx={{ my: 4 }} />

        <Stack direction={"row"} spacing={2}>
          <Box sx={{ flex: 1 }}>
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

          <Box sx={{ flex: 1 }}>
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

        <Divider sx={{ my: 4 }} />

        <Stack direction={"row"} spacing={2} sx={{ marginBottom: '20px' }}>
          <TextField
            label="Task Date and Time"
            type="datetime-local"
            fullWidth
            variant="outlined"
            {...register('date')}
            error={!!errors.date}
            helperText={errors.date ? errors.date.message : ''}
            InputLabelProps={{
              shrink: true,
            }}
          />

          <FormControl fullWidth variant="outlined" error={!!errors.priority}>
            <InputLabel>Priority Level</InputLabel>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              label="Impact Level"
            >
              {PRIORIRY.map((level) => (
                <MenuItem key={level} value={level}>
                  {level}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.priority ? errors.priority.message : ''}</FormHelperText>
          </FormControl>

          <FormControl fullWidth variant="outlined" error={!!errors.category}>
            <InputLabel>Task Category</InputLabel>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} label="Task Category">
              {CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.category ? errors.category.message : ''}</FormHelperText>
          </FormControl>
        </Stack>

        <Typography color='textSecondary' sx={{ opacity: 0.5 }}>End</Typography>

      </form>
    </Dialog>
  );
};

export default AddTask;