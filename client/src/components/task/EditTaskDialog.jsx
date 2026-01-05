import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, Button, TextField, Select, MenuItem, Stack, FormControl, InputLabel, FormHelperText, Autocomplete } from "@mui/material";
import { useForm } from "react-hook-form";
import SelectList from "../SelectList";
import { useSelector } from "react-redux";
import UserList from "./UserList";
import api from "../../api/api";

// const LISTS = ["Todo", "In Progress", "Closed"];
// Initial fallback constants for safety (will be replaced by API data)
// Fallback constants removed. Powered by dynamic API data.

const DEPARTMENT = ["Quality", "Production"];

const EditTaskDialog = ({ open, setOpen, task, handleTaskUpdate }) => {
  const user = useSelector((state) => state?.auth?.user);
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm();

  const [assignedTo, setAssignedTo] = useState([]);
  // console.log({ assignedTo });
  const [whomItMayConcern, setWhomItMayConcern] = useState([]);
  // const [status, setStatus] = useState(LISTS[0]);
  const [priority, setPriority] = useState("");
  const [department, setDepartment] = useState(DEPARTMENT[0]);
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [pisDate, setPisDate] = useState(""); // State for PIS Date
  const [interviewDate, setInterviewDate] = useState("");
  // console.log({ pisDate, interviewDate });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamCompany, setTeamCompany] = useState('');
  const [evaluationScore, setEvaluationScore] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [fieldTeams, setFieldTeams] = useState([]);
  const [teamInfo, setTeamInfo] = useState({ teamName: '', teamId: '' });
  const [customerType, setCustomerType] = useState('');
  const [validationStatus, setValidationStatus] = useState("");
  const [responsible, setResponsible] = useState("");
  const [subReason, setSubReason] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [ontType, setOntType] = useState("");
  const [freeExtender, setFreeExtender] = useState("No");
  const [extenderType, setExtenderType] = useState("");
  const [extenderNumber, setExtenderNumber] = useState(0);
  const [closureCallEvaluation, setClosureCallEvaluation] = useState("");
  const [closureCallFeedback, setClosureCallFeedback] = useState("");

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

  // Fetch all users when the component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get("/users/get-all-users", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        // console.log("Fetched users:", data); // Debugging: Log fetched users
        setUsers(data);
      } catch (err) {
        // console.error("Error fetching users:", err); // Debugging: Log error
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  // Initialize form and state when the task is loaded
  useEffect(() => {
    if (open && task) {
      const dueDate = task.date ? new Date(task.date) : null;
      const formattedDate = dueDate
        ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}T${String(dueDate.getHours()).padStart(2, "0")}:${String(dueDate.getMinutes()).padStart(2, "0")}`
        : "";

      const pisDueDate = task.pisDate ? new Date(task.pisDate) : null;
      const formattedPISDate = pisDueDate
        ? `${pisDueDate.getFullYear()}-${String(pisDueDate.getMonth() + 1).padStart(2, "0")}-${String(pisDueDate.getDate()).padStart(2, "0")}T${String(pisDueDate.getHours()).padStart(2, "0")}:${String(pisDueDate.getMinutes()).padStart(2, "0")}`
        : "";

      const interviewDueDate = task.interviewDate ? new Date(task.interviewDate) : null;
      const formattedInterviewDate = interviewDueDate
        ? `${interviewDueDate.getFullYear()}-${String(interviewDueDate.getMonth() + 1).padStart(2, "0")}-${String(interviewDueDate.getDate()).padStart(2, "0")}`
        : "";

      // console.log("Formatted Interview Date:", formattedInterviewDate); // Debugging log

      if (Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
        // console.log("task.assignedTo:", task.assignedTo);
        setAssignedTo(task.assignedTo.map((assignedUser) => assignedUser._id || assignedUser));
      }

      if (Array.isArray(task.whomItMayConcern)) {
        setWhomItMayConcern(task.whomItMayConcern);
      }

      reset({
        slid: task.slid ? task.slid.replace("INT", "") : "",
        pisDate: formattedPISDate,
        contactNumber: task.contactNumber || "",
        requestNumber: task.requestNumber || "",
        tarrifName: task.tarrifName || "",
        customerFeedback: task.customerFeedback || "",
        reason: task.reason || "",
        responsible: task.responsible || "",
        customerName: task.customerName || "",
        district: task.district || "",
        date: formattedDate,
        interviewDate: formattedInterviewDate,
      });

      setValue("date", formattedDate);
      setValue("pisDate", formattedPISDate);
      setValue("interviewDate", formattedInterviewDate);
      setValue("contactNumber", task.contactNumber);
      setValue("requestNumber", task.requestNumber);
      setValue("customerFeedback", task.customerFeedback);
      setValue("reason", task.reason);
      setValue("responsible", task.responsible);
      setValue("customerName", task.customerName);
      setValue("district", task.district);

      setPriority(dropdownOptions.PRIORITY.includes(task.priority) ? task.priority : dropdownOptions.PRIORITY[0]);
      setDepartment(DEPARTMENT.includes(task.department) ? task.department : DEPARTMENT[0]);
      setCategory(dropdownOptions.TASK_CATEGORIES.includes(task.category) ? task.category : dropdownOptions.TASK_CATEGORIES[0]);
      setDate(formattedDate);
      setPisDate(formattedPISDate);
      setInterviewDate(formattedInterviewDate);
      setTeamCompany(task.teamCompany || '');
      setEvaluationScore(task.evaluationScore || '');
      setGovernorate(task.governorate || '');
      setTeamInfo({
        teamName: task.teamName || '',
        teamId: task.teamId || ''
      });
      setCustomerType(task.customerType || '');
      setValidationStatus(task.validationStatus || "");
      setResponsible(task.responsible || "");
      setReason(task.reason || "");
      setSubReason(task.subReason || "");
      setRootCause(task.rootCause || "");
      setOntType(task.ontType || "");
      setFreeExtender(task.freeExtender || "No");
      setExtenderType(task.extenderType || "");
      setExtenderNumber(task.extenderNumber || 0);
      setClosureCallEvaluation(task.closureCallEvaluation || "");
      setClosureCallFeedback(task.closureCallFeedback || "");
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

  const handleAssignedToChange = (newAssignedTo) => {
    setAssignedTo(newAssignedTo);
  };

  const handleWhomItMayConcernChange = (newWhomItMayConcern) => {
    setWhomItMayConcern(newWhomItMayConcern);
  };

  const handleSubmitForm = async (data) => {
    const formData = {
      ...data,
      slid: `INT${data.slid}`,
      assignedTo,
      whomItMayConcern,
      priority,
      department,
      category,
      teamCompany,
      teamName: teamInfo.teamName,
      teamId: teamInfo.teamId,
      evaluationScore,
      governorate,
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

    // console.log({ formData });

    // return

    try {
      const response = await api.put(`/tasks/update-task/${task._id}`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      if (response.status === 200) {
        alert("Task updated successfully!");
        handleTaskUpdate(response.data);  // This should update the parent component's state
        setOpen(false);
      }
    } catch (error) {
      console.error("Error updating task:", error.response?.data?.error);
    }
  };

  return (
    <Dialog open={open} fullScreen onClose={() => setOpen(false)}>
      <DialogTitle>Edit Task</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit(handleSubmitForm)} className="overflow-y-auto">
          <Stack spacing={2} className="mt-4">
            <Stack direction="row" spacing={2}>
              <TextField
                label="SLID"
                placeholder="Enter 7 digits (e.g., 0123456)"
                fullWidth
                variant="outlined"
                value={watch("slid")}
                onChange={(e) => setValue("slid", e.target.value.replace(/\D/g, "").slice(0, 7))}
                inputProps={{ maxLength: 7 }}
                {...register("slid", { required: "SLID is required", pattern: { value: /^\d{7}$/, message: "Task SLID must be exactly 7 digits." } })}
                error={!!errors.slid}
                helperText={errors.slid ? errors.slid.message : ""}
              />
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
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Customer Name"
                placeholder="Customer Name"
                fullWidth
                variant="outlined"
                {...register("customerName", { required: "Customer name is required" })}
                error={!!errors.customerName}
                helperText={errors.customerName ? errors.customerName.message : ""}
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

            <Stack direction="row" spacing={2}>
              <FormControl fullWidth variant="outlined" error={!!errors.status}>
                <InputLabel>Satisfaction Score</InputLabel>
                <Select value={evaluationScore} onChange={(e) => setEvaluationScore(e.target.value)} label="Satisfaction Score">
                  {dropdownOptions.EVALUATION_SCORE.map((score) => (
                    <MenuItem key={score} value={score}>
                      {score}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errors.status ? errors.status.message : ''}</FormHelperText>
              </FormControl>

              <TextField
                label="PIS Date"
                type="datetime-local"
                fullWidth
                variant="outlined"
                {...register('pisDate', { required: 'PIS Date is required!' })}
                error={!!errors.pisDate}
                helperText={errors.pisDate ? errors.pisDate.message : ''}
                value={pisDate}
                onChange={(e) => setPisDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
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
            <Stack direction="row" spacing={2}>
              <TextField
                label="Tariff Name"
                placeholder="Tariff Name"
                fullWidth
                variant="outlined"
                multiline
                rows={4}
                {...register("tarrifName", { required: "Tariff Name is required" })}
                error={!!errors.tarrifName}
                helperText={errors.tarrifName ? errors.tarrifName.message : ""}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Customer Feedback"
                placeholder="Enter the customer feedback"
                fullWidth
                variant="outlined"
                multiline
                rows={4}
                {...register("customerFeedback", { required: "Customer feedback is required" })}
                error={!!errors.customerFeedback}
                helperText={errors.customerFeedback ? errors.customerFeedback.message : ""}
                inputProps={{ dir: 'rtl' }}
                sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
              />
            </Stack>

            {/* New Fields Section */}
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Equipment & Verification Details
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Autocomplete
                freeSolo
                options={dropdownOptions.ONT_TYPE}
                value={ontType}
                onChange={(e, v) => setOntType(v)}
                onInputChange={(e, v) => setOntType(v)}
                renderInput={(params) => <TextField {...params} label="ONT Type" />}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Free Extender?</InputLabel>
                <Select
                  value={freeExtender}
                  onChange={(e) => setFreeExtender(e.target.value)}
                  label="Free Extender?"
                >
                  <MenuItem value="No">No</MenuItem>
                  <MenuItem value="Yes">Yes</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {freeExtender === 'Yes' && (
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Autocomplete
                  freeSolo
                  options={dropdownOptions.EXTENDER_TYPE}
                  value={extenderType}
                  onChange={(e, v) => setExtenderType(v)}
                  onInputChange={(e, v) => setExtenderType(v)}
                  renderInput={(params) => <TextField {...params} label="Extender Type" />}
                  fullWidth
                />
                <TextField
                  label="Number of Extenders"
                  type="number"
                  value={extenderNumber}
                  onChange={(e) => setExtenderNumber(e.target.value)}
                  fullWidth
                />
              </Stack>
            )}

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Closure Call Evaluation (1-10)</InputLabel>
                <Select
                  value={closureCallEvaluation}
                  onChange={(e) => setClosureCallEvaluation(e.target.value)}
                  label="Closure Call Evaluation (1-10)"
                >
                  {[...Array(10)].map((_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {i + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Closure Call Feedback"
                value={closureCallFeedback}
                onChange={(e) => setClosureCallFeedback(e.target.value)}
                fullWidth
                multiline
                rows={1}
                inputProps={{ dir: 'rtl' }}
                sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Autocomplete
                freeSolo
                options={dropdownOptions.RESPONSIBILITY.map(opt => opt.value)}
                value={responsible}
                onChange={(event, newValue) => {
                  setResponsible(newValue);
                  setReason("");
                  setSubReason("");
                  setRootCause("");
                }}
                onInputChange={(event, newInputValue) => {
                  setResponsible(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Responsibility" variant="outlined" />
                )}
                fullWidth
              />
              <Autocomplete
                freeSolo
                options={dropdownOptions.REASON
                  .filter(opt => !responsible ? !opt.parentValue : opt.parentValue === responsible)
                  .map(opt => opt.value)}
                value={reason}
                onChange={(event, newValue) => {
                  setReason(newValue);
                  setSubReason("");
                  setRootCause("");
                }}
                onInputChange={(event, newInputValue) => {
                  setReason(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Reason (Level 1)" variant="outlined" />
                )}
                fullWidth
              />
              <Autocomplete
                freeSolo
                options={dropdownOptions.REASON_SUB
                  .filter(opt => !reason ? !opt.parentValue : opt.parentValue === reason)
                  .map(opt => opt.value)}
                value={subReason}
                onChange={(event, newValue) => {
                  setSubReason(newValue);
                  setRootCause("");
                }}
                onInputChange={(event, newInputValue) => {
                  setSubReason(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Sub Reason (Level 2)" variant="outlined" />
                )}
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Autocomplete
                freeSolo
                options={dropdownOptions.ROOT_CAUSE
                  .filter(opt => !subReason ? !opt.parentValue : opt.parentValue === subReason)
                  .map(opt => opt.value)}
                value={rootCause}
                onChange={(event, newValue) => {
                  setRootCause(newValue);
                }}
                onInputChange={(event, newInputValue) => {
                  setRootCause(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Root Cause (Level 3)" variant="outlined" />
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
                value={interviewDate}  // Ensure value updates
                onChange={(e) => setInterviewDate(e.target.value)}
                helperText={errors.interviewDate ? errors.interviewDate.message : ''}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Stack>
          </Stack>

          <Stack direction="row" spacing={2} className="my-6">
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
              fullWidth
            />

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

          </Stack>

          <Stack>
            <UserList
              setAssignedTo={handleAssignedToChange}
              assignedTo={assignedTo}
              users={users}
              loading={loading}
              error={error}
              label="Assign Task To:"
              filteredUsers={whomItMayConcern}
            />

            <div className="mt-4">
              <UserList
                setAssignedTo={handleWhomItMayConcernChange}
                assignedTo={whomItMayConcern}
                users={users}
                loading={loading}
                error={error}
                label="Whom It May Concern:"
                filteredUsers={assignedTo}
              />
            </div>
          </Stack>

          <div className="flex gap-4 mt-6">
            {/* <SelectList label="Task Stage" lists={LISTS} selected={status} setSelected={setStatus} /> */}
            <TextField
              label="Task Date and Time"
              type="datetime-local"
              fullWidth
              variant="outlined"
              {...register("date")}
              error={!!errors.date}
              helperText={errors.date ? errors.date.message : ""}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </div>
          <div className="flex gap-4 mt-6">
            <SelectList label="Feedback Severity" lists={dropdownOptions.PRIORITY} selected={priority} setSelected={setPriority} />
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
          </div>
          <div className="bg-[#2d2d2d] py-6 sm:flex sm:flex-row-reverse gap-4">
            <Button type="submit" color="primary" className="bg-blue-600 px-8 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto">Save</Button>
            <Button type="button" className="bg-[#2d2d2d] px-5 text-sm font-semibold text-white sm:w-auto" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog >
  );
};

export default EditTaskDialog;
