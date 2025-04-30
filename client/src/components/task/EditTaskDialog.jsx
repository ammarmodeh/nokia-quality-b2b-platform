import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, Button, TextField, Select, MenuItem, Stack, FormControl, InputLabel, FormHelperText, Autocomplete } from "@mui/material";
import { useForm } from "react-hook-form";
import SelectList from "../SelectList";
import { useSelector } from "react-redux";
import UserList from "./UserList";
import api from "../../api/api";

// const LISTS = ["Todo", "In Progress", "Closed"];
const PRIORITY = ["High", "Medium", "Low"];
const DEPARTMENT = ["Quality", "Production"];
const CATEGORIES = [
  "Orange HC detractor", "Orange Closure", "Orange Joint", "Nokia MS detractor", "Nokia FAT", "Nokia Closure", "TRC", "TCRM", "Others"
];
const TEAMCOMPANY = ['INH-1', 'INH-2', 'INH-3', 'INH-4', 'INH-5', 'INH-6', 'Al-Dar 2', 'Orange Team', 'غير معروف']
const EVALUATIONSCORE = [1, 2, 3, 4, 5, 6, 7, 8]
const JORDANGOVERNORATES = ["عمَان", "الزرقاء", "إربد", "العقبة", "المفرق", "مادبا", "البلقاء", "جرش", "معان", "الكرك", "عجلون", "الطفيلة"]
const CUSTOMERTYPE = ["CBU", "EBU"]
const VALIDATIONSTATUS = ["Validated", "Not validated"]
const VALIDATIONCATEGORY = ["Knowledge Gap", "Customer Education", "Customer’s Own Criteria", "Incomplete Service Delivery", "Lack of Technical Expertise",
  "Poor Time Management", "Technical Limitations", "Execution Delay", "Processing Delay", "External Factors", "Bad Team Behavior",
  "Device limitations", "Misuse of Service", "Customer-Declined Solution / Unrealistic Expectation", "Others", "VOIP", "Can't Determine"]

const EditTaskDialog = ({ open, setOpen, task, handleTaskUpdate }) => {
  const user = useSelector((state) => state?.auth?.user);
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm();

  const [assignedTo, setAssignedTo] = useState([]);
  // console.log({ assignedTo });
  const [whomItMayConcern, setWhomItMayConcern] = useState([]);
  // const [status, setStatus] = useState(LISTS[0]);
  const [priority, setPriority] = useState(PRIORITY[2]);
  const [department, setDepartment] = useState(DEPARTMENT[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
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
  const [validationStatus, setValidationStatus] = useState(VALIDATIONSTATUS[1]);
  const [validationCat, setValidationCat] = useState(VALIDATIONCATEGORY[0]);

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

      setPriority(PRIORITY.includes(task.priority) ? task.priority : PRIORITY[2]);
      setDepartment(DEPARTMENT.includes(task.department) ? task.department : DEPARTMENT[0]);
      setCategory(CATEGORIES.includes(task.category) ? task.category : CATEGORIES[0]);
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
    }
  }, [task, open, reset, setValue, user]);


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
      // status,
      priority,
      department,
      category,
      teamCompany,
      teamName: teamInfo.teamName,
      teamId: teamInfo.teamId,
      evaluationScore
    };

    // console.log({ formData });

    // return

    try {
      const response = await api.put(`/tasks/update-task/${task._id}`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      // console.log({ response });
      // return
      if (response.status === 200) {
        alert("Task updated successfully!");
        handleTaskUpdate(response.data);
        setOpen(false);
      }
    } catch (error) {
      // console.error("Error updating task:", error.response.data.error);
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
              <InputLabel>Evaluation Score</InputLabel>
              <Select value={evaluationScore} onChange={(e) => setEvaluationScore(e.target.value)} label="Evaluation Score">
                {EVALUATIONSCORE.map((score) => (
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
                {TEAMCOMPANY.map((list) => (
                  <MenuItem key={list} value={list}>
                    {list}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{errors.status ? errors.status.message : ''}</FormHelperText>
            </FormControl>

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

            <TextField
              label="responsibility"
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
            <SelectList label="Impact Level" lists={PRIORITY} selected={priority} setSelected={setPriority} />
            <SelectList label="Task Category" lists={CATEGORIES} selected={category} setSelected={setCategory} />
          </div>
          <div className="bg-gray-50 py-6 sm:flex sm:flex-row-reverse gap-4">
            <Button type="submit" color="primary" className="bg-blue-600 px-8 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto">Save</Button>
            <Button type="button" className="bg-white px-5 text-sm font-semibold text-gray-900 sm:w-auto" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
