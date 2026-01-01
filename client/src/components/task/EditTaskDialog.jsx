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
  const [validationCat, setValidationCat] = useState('');
  const [reason, setReason] = useState("");
  const [responsibility, setResponsibility] = useState("");
  const [responsibilitySub, setResponsibilitySub] = useState("");

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
        customerName: task.customerName || "",
        district: task.district || "",
        date: formattedDate,
        interviewDate: formattedInterviewDate,
        responsibility: task.responsibility || "",
        responsibilitySub: task.responsibilitySub || "",
      });

      setValue("date", formattedDate);
      setValue("pisDate", formattedPISDate);
      setValue("interviewDate", formattedInterviewDate);
      setValue("contactNumber", task.contactNumber);
      setValue("requestNumber", task.requestNumber);
      setValue("customerFeedback", task.customerFeedback);
      setValue("reason", task.reason);
      setValue("customerName", task.customerName);
      setValue("district", task.district);
      setValue("responsibility", task.responsibility);
      setValue("responsibilitySub", task.responsibilitySub);

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
      setValidationStatus(task.validationStatus || '');
      setValidationCat(task.validationCat || '');
      setReason(task.reason || (dropdownOptions.REASON.length > 0 ? dropdownOptions.REASON[0] : ""));

      let mainResp = task.responsibility || "";
      let subResp = task.responsibilitySub || "";

      // Logic to handle existing data migration (Main vs Sub)
      if (!subResp && mainResp) {
        // If the value in 'responsibility' is actually a known sub-responsibility, shift it
        const foundSub = dropdownOptions.RESPONSIBILITY_SUB.find(opt => opt.value === mainResp);
        if (foundSub) {
          subResp = mainResp;
          mainResp = foundSub.parentValue;
        } else if (!dropdownOptions.RESPONSIBILITY.includes(mainResp) && mainResp !== "") {
          // If it's custom text and not a main category, move it to sub as per user request
          subResp = mainResp;
          mainResp = "";
        }
      }

      setResponsibility(mainResp);
      setResponsibilitySub(subResp);
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
      validationCat,
      reason,
      responsibility,
      responsibilitySub
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
              className="mb-4"
            />

            <TextField
              label="Customer Name"
              placeholder="Customer Name"
              fullWidth
              variant="outlined"
              // inputProps={{ maxLength: 7 }}
              {...register("customerName", { required: "Customer name is required" })}
              error={!!errors.customerName}
              helperText={errors.customerName ? errors.customerName.message : ""}
              className="mb-4"
            />

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

            <TextField
              label="Tarrif Name"
              placeholder="Tarrif Name"
              fullWidth
              variant="outlined"
              multiline
              rows={4}
              {...register("tarrifName", { required: "Tarrif name is required" })}
              error={!!errors.tarrifName}
              helperText={errors.tarrifName ? errors.tarrifName.message : ""}
              className="mb-4"
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
              className="mb-4"
            />

            <Stack direction="row" spacing={2}>
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
    </Dialog>
  );
};

export default EditTaskDialog;
