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
    VALIDATION_CATEGORY: [],
    REASON: [],
    RESPONSIBILITY: [],
    RESPONSIBILITY_SUB: []
  });

  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const { data } = await api.get("/dropdown-options/all");
        if (data && Object.keys(data).length > 0) {
          const formatted = {};
          Object.keys(data).forEach(key => {
            if (key === "RESPONSIBILITY_SUB") {
              formatted[key] = data[key]; // Store full objects for sub-options
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
  const [validationCat, setValidationCat] = useState(dropdownOptions.VALIDATION_CATEGORY[0]);
  const [reason, setReason] = useState(dropdownOptions.REASON[0]);
  const [responsibility, setResponsibility] = useState(dropdownOptions.RESPONSIBILITY[0]);
  const [responsibilitySub, setResponsibilitySub] = useState("");

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
      validationCat,
      reason,
      responsibility,
      responsibilitySub
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
              <InputLabel>Satisfaction Score</InputLabel>
              <Select value={evaluationScore} onChange={(e) => setEvaluationScore(e.target.value)} label="Satisfaction Score">
                {dropdownOptions.EVALUATION_SCORE.map((list) => (
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
                {dropdownOptions.GOVERNORATES.map((list) => (
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
                {dropdownOptions.CUSTOMER_TYPE.map((list) => (
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
            <Autocomplete
              freeSolo
              options={dropdownOptions.REASON}
              value={reason}
              onChange={(event, newValue) => {
                setReason(newValue);
              }}
              onInputChange={(event, newInputValue) => {
                setReason(newInputValue);
              }}
              renderInput={(params) => (
                <TextField {...params} label="Reason" variant="outlined" />
              )}
              fullWidth
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
                {dropdownOptions.TEAM_COMPANY.map((list) => (
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
                {dropdownOptions.VALIDATION_STATUS.map((list) => (
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
          <Autocomplete
            freeSolo
            options={dropdownOptions.RESPONSIBILITY}
            value={responsibility}
            onChange={(event, newValue) => {
              setResponsibility(newValue);
              setResponsibilitySub(""); // Reset sub when main changes
            }}
            onInputChange={(event, newInputValue) => {
              setResponsibility(newInputValue);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Responsible 1 (Main)" variant="outlined" />
            )}
            fullWidth
          />

          <Autocomplete
            freeSolo
            options={dropdownOptions.RESPONSIBILITY_SUB
              .filter(opt => opt.parentValue === responsibility)
              .map(opt => opt.value)}
            value={responsibilitySub}
            onChange={(event, newValue) => {
              setResponsibilitySub(newValue);
            }}
            onInputChange={(event, newInputValue) => {
              setResponsibilitySub(newInputValue);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Responsible 2 (Sub/Team)" variant="outlined" />
            )}
            fullWidth
          />
        </Stack>

        <Stack direction={"row"} spacing={2} sx={{ marginTop: '20px' }}>
          <FormControl fullWidth variant="outlined" error={!!errors.status}>
            <InputLabel>Validation Category</InputLabel>
            <Select value={validationCat} onChange={(e) => setValidationCat(e.target.value)} label="Validation Category">
              {dropdownOptions.VALIDATION_CATEGORY.map((list) => (
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
              label="Feedback Severity"
            >
              {dropdownOptions.PRIORITY.map((level) => (
                <MenuItem key={level} value={level}>
                  {level}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.priority ? errors.priority.message : ''}</FormHelperText>
          </FormControl>

          <Autocomplete
            freeSolo
            options={dropdownOptions.TASK_CATEGORIES}
            value={category}
            onChange={(event, newValue) => {
              setCategory(newValue);
            }}
            onInputChange={(event, newInputValue) => {
              setCategory(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Task Category"
                variant="outlined"
                error={!!errors.category}
                helperText={errors.category ? errors.category.message : ''}
              />
            )}
            fullWidth
          />
        </Stack>

        <Typography color='textSecondary' sx={{ opacity: 0.5 }}>End</Typography>

      </form>
    </Dialog>
  );
};

export default AddTask;