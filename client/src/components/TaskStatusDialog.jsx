import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { getWeekNumber } from "../utils/helpers";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Box,
  TextField,
  DialogActions,
  Button,
  Chip,
  Paper,
  LinearProgress,
  Avatar,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Edit, Visibility, Delete, ContentCopy, WhatsApp, Close, Search, FilterList, HourglassEmpty, PlayCircle, CheckCircle, Cancel } from "@mui/icons-material";
import { format, differenceInMinutes } from "date-fns";
import api from "../api/api";
import { useSelector } from "react-redux";
import EditTaskDialog from "./task/EditTaskDialog";
import DetailedSubtaskDialog from "./task/DetailedSubtaskDialog";
import { MdClose } from "react-icons/md";
import moment from "moment";
import { RiFileExcel2Fill, RiProgress4Fill } from "react-icons/ri";
import { toast } from 'sonner';

const statusConfig = {
  Todo: { icon: <HourglassEmpty fontSize="small" className="text-yellow-600" />, color: "bg-yellow-100 text-yellow-800" },
  "In Progress": { icon: <PlayCircle className="text-blue-600" />, color: "bg-blue-100 text-blue-800" },
  Closed: { icon: <CheckCircle className="text-green-600" />, color: "bg-green-100 text-green-800" },
  Cancelled: { icon: <Cancel className="text-gray-500" />, color: "bg-[#2d2d2d] text-gray-300" },
};

const TaskStatusDialog = ({ open, onClose, tasks: initialTasks, title, setUpdateTasksList }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const currentUser = useSelector((state) => state?.auth?.user?._id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState(initialTasks);
  const [filteredTasks, setFilteredTasks] = useState(initialTasks);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [taskToView, setTaskToView] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  // const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [viewLoading, setViewLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState("All");

  // Determine default week: Current week if it has tasks, otherwise "All"
  const currentWeek = getWeekNumber(new Date()).key;
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);

  // Update default selection when tasks load
  useEffect(() => {
    if (initialTasks) {
      const hasCurrentWeekTasks = initialTasks.some(t => {
        const date = t.interviewDate || t.createdAt;
        return getWeekNumber(date).key === currentWeek;
      });

      // If no tasks in current week, default to "All" to show data
      if (!hasCurrentWeekTasks && initialTasks.length > 0) {
        setSelectedWeek("All");
      } else {
        setSelectedWeek(currentWeek);
      }

      const sortedTasks = [...initialTasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTasks(sortedTasks);
      setFilteredTasks(sortedTasks);
    }
  }, [initialTasks, currentWeek]); // Added currentWeek dependency

  // Calculate Reason Stats based on Selected Week
  const reasonStats = tasks?.reduce((acc, task) => {
    // Apply Week Filter to Stats
    if (selectedWeek !== "All") {
      const date = task.interviewDate || task.createdAt;
      const weekKey = getWeekNumber(date).key;
      if (weekKey !== selectedWeek) return acc;
    }

    const reason = task.reason || "Unspecified";
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  const sortedReasons = Object.entries(reasonStats || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Top 5 reasons

  // Unique Reasons for Dropdown (can be from all tasks or filtered, sticking to filtered for consistency with view)
  const uniqueReasons = ["All", ...Object.keys(reasonStats || {}).sort()];

  // Calculate Week Stats
  const weekStats = tasks?.reduce((acc, task) => {
    if (task.createdAt || task.interviewDate) {
      const date = task.interviewDate || task.createdAt;
      // Prefer interviewDate as in Dashboard charts equivalent
      const weekKey = getWeekNumber(date).key;
      acc[weekKey] = (acc[weekKey] || 0) + 1;
    }
    return acc;
  }, {});

  const uniqueWeeks = ["All", ...Object.keys(weekStats || {}).sort().reverse()]; // Sort Newest weeks first



  // Handle search and filters
  useEffect(() => {
    let filtered = tasks;

    // Filter by Week
    if (selectedWeek !== "All") {
      filtered = filtered.filter(task => {
        const date = task.interviewDate || task.createdAt;
        return getWeekNumber(date).key === selectedWeek;
      });
    }

    // Filter by Reason
    if (selectedReason !== "All") {
      filtered = filtered.filter(task => (task.reason || "Unspecified") === selectedReason);
    }

    // Filter by Search Term
    if (searchTerm.trim() !== "") {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.customerName?.toLowerCase().includes(lowerSearch) ||
        task.slid?.toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredTasks(filtered);
  }, [searchTerm, tasks, selectedReason, selectedWeek]);

  // KPIs
  const notClosedCount = filteredTasks.filter(t => t.status !== 'Closed').length;

  // Custom field display configuration
  const fieldDisplayConfig = {
    customerName: { displayName: "Customer Name" },
    slid: { displayName: "SLID" },
    contactNumber: { displayName: "Contact Number", format: (value) => value || 'N/A' },
    governorate: { displayName: "Governorate" },
    district: { displayName: "District" },
    teamName: { displayName: "Team Name" },
    teamCompany: { displayName: "Team Company" },
    pisDate: {
      displayName: "PIS Date",
      format: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    interviewDate: {
      displayName: "Interview Date",
      format: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    tarrifName: { displayName: "Tariff Name" },
    customerType: { displayName: "Customer Type" },
    customerFeedback: { displayName: "Customer Feedback" },
    reason: { displayName: "Reason (Level 1)" },
    subReason: { displayName: "Sub Reason (Level 2)" },
    rootCause: { displayName: "Root Cause (Level 3)" },
    responsible: { displayName: "Responsibility" },
    priority: { displayName: "Priority" },
    assignedTo: {
      displayName: "Assigned To",
      format: (value) => value?.map ? value.map(item => item.name).join(', ') : 'N/A'
    },
    createdBy: {
      displayName: "Created By",
      format: (value) => value?.name || 'N/A'
    },
    evaluationScore: { displayName: "Satisfaction Score" },
    subTasks: {
      displayName: "Subtasks",
      format: (value) => value?.map ? value.map(sub => `• ${sub.title}: ${sub.note || 'No note'}`).join('\n') : 'N/A'
    },
    ontType: { displayName: "ONT Type" },
    freeExtender: { displayName: "Free Extender" },
    extenderType: { displayName: "Extender Type" },
    extenderNumber: { displayName: "Number of Extenders" },
    closureCallEvaluation: { displayName: "Closure Call Evaluation" },
    closureCallFeedback: { displayName: "Closure Call Feedback" },
    teamId: { displayName: "Team ID" }
  };

  // Order of fields to display in the view dialog
  const fieldDisplayOrder = [
    'slid',
    'pisDate',
    'customerName',
    'contactNumber',
    'governorate',
    'district',
    'teamName',
    'teamCompany',
    'interviewDate',
    'tarrifName',
    'customerType',
    'customerFeedback',
    'responsible',
    'reason',
    'subReason',
    'rootCause',
    'assignedTo',
    'evaluationScore',
    'ontType',
    'freeExtender',
    'extenderType',
    'extenderNumber',
    'closureCallEvaluation',
    'closureCallFeedback',
    'subTasks'
  ];

  // Format task data for copy/share using the same order as display
  const formatTaskForCopy = (task) => {
    const formattedData = [];

    fieldDisplayOrder.forEach(field => {
      if (task[field] === undefined || task[field] === null) return;

      const config = fieldDisplayConfig[field] || { displayName: field };
      const value = config.format ? config.format(task[field]) : task[field];

      formattedData.push({
        displayName: config.displayName,
        value: value
      });
    });

    return formattedData;
  };

  // Export all tasks to Excel
  const exportToExcel = () => {
    // Prepare the data for Excel
    const data = tasks.map(task => ({
      'SLID': task.slid,
      'PIS Date': task.pisDate ? moment(task.pisDate).format("YYYY-MM-DD") : 'N/A',
      'Interview Date': task.interviewDate ? moment(task.interviewDate).format("YYYY-MM-DD") : 'N/A',
      'Customer Name': task.customerName,
      'Contact Number': task.contactNumber || 'N/A',
      'Customer Type': task.customerType,
      'Satisfaction Score': task.evaluationScore,
      'Governorate': task.governorate,
      'District': task.district,
      'Tariff Name': task.tarrifName,
      'Customer Feedback': task.customerFeedback || 'N/A',
      'Responsibility': task.responsible,
      'Reason (Level 1)': task.reason,
      'Sub Reason (Level 2)': task.subReason,
      'Root Cause (Level 3)': task.rootCause,
      'Team Name': task.teamName,
      'Team Company': task.teamCompany,
      'ONT Type': task.ontType || 'N/A',
      'Free Extender': task.freeExtender || 'No',
      'Extender Type': task.extenderType || 'N/A',
      'Extender Number': task.extenderNumber || 0,
      'Closure Call Evaluation': task.closureCallEvaluation || 'N/A',
      'Closure Call Feedback': task.closureCallFeedback || 'N/A',
      'Assigned To': task.assignedTo?.map ? task.assignedTo.map(item => item.name).join(', ') : 'N/A',
      'Assignee Feedback': task.subTasks?.map ? task.subTasks.map(sub => `${sub.title}: ${sub.note || 'No note'}`).join('; ') : 'N/A',
    }));

    // Create a worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Create a workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");

    // Generate the Excel file
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${moment().format('YYYY-MM-DD')}.xlsx`);
  };

  // Handle View button click - shows details in dialog
  const handleView = async (task) => {
    setViewDialogOpen(true);
    setViewLoading(true);
    try {
      const { data } = await api.get(`/tasks/get-task/${task._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      // Merge with task from list to ensure we have populated fields like assignedTo/createdBy if missing
      setTaskToView({ ...task, ...data });
    } catch (error) {
      console.error("Error fetching task details:", error);
      setTaskToView(task); // Fallback to list data
    } finally {
      setViewLoading(false);
    }
  };

  // Handle Copy button click
  const handleCopy = (task) => {
    const formattedFields = formatTaskForCopy(task);
    let textToCopy = '';

    formattedFields.forEach(field => {
      textToCopy += `${field.displayName}: ${field.value}\n`;
    });

    navigator.clipboard.writeText(textToCopy)
      .then(() => alert('Task details copied to clipboard!'))
      .catch(err => {
        console.error('Failed to copy text: ', err)
      });
  };

  // Handle WhatsApp share button click
  const handleWhatsAppShare = async (task) => {
    let phoneNumber = task.teamId?.contactNumber;

    // Fallback search if phone number not directly available
    if (!phoneNumber && task.teamName) {
      try {
        const response = await api.get('/field-teams/get-field-teams', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        const fieldTeam = response.data.find(team =>
          team.teamName?.trim().toLowerCase() === task.teamName.trim().toLowerCase()
        );
        if (fieldTeam) phoneNumber = fieldTeam.contactNumber;
      } catch (error) {
        console.error('Error fetching team for contact:', error);
      }
    }

    if (!phoneNumber) {
      toast.error('No contact number found for this team');
      // Prompt user to update team? Or just fallback to no number?
      // Fallback to opening WhatsApp without number for now, but warned
    } else {
      // Clean and validate phone number
      let cleanNumber = phoneNumber.toString().trim();
      const hasPlus = cleanNumber.startsWith('+');
      cleanNumber = cleanNumber.replace(/[^0-9]/g, '');
      if (hasPlus && cleanNumber) cleanNumber = '+' + cleanNumber;

      const digitsOnly = cleanNumber.replace(/\+/g, '');
      if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
        phoneNumber = cleanNumber;
      } else {
        toast.error('Invalid phone number format');
        phoneNumber = null;
      }
    }


    const formattedFields = formatTaskForCopy(task);
    let message = `*🔔 Task Details - ${task.slid}*\n\n`;

    formattedFields.forEach(field => {
      // Exclude internal IDs or long technical fields if desired, but for now keep all as "Details"
      if (field.displayName === 'Team ID') return;
      message += `*${field.displayName}:* ${field.value}\n`;
    });

    const whatsappUrl = phoneNumber
      ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleOpenSubtasks = (task) => {
    setSelectedTask(task);
    setSubtaskDialogOpen(true);
  };

  const handleTaskUpdate = (updatedTask) => {
    const updatedTasks = tasks.map((task) =>
      task._id === updatedTask._id ? { ...updatedTask } : task
    );
    setTasks(updatedTasks);
    setFilteredTasks(updatedTasks);
    setEditDialogOpen(false);
  };

  const handleTaskDelete = async (taskId) => {
    const confirmDelete = confirm("Are you sure you want to delete this task?");
    if (!confirmDelete) return;

    try {
      const { data } = await api.get(`/tasks/get-task/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      if (data) {
        const response = await api.post(`/trash/add-trash`, data, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });

        if (response.status === 200) {
          alert("Task added to trash successfully! You can check the trash page.");
          await api.delete(`/tasks/delete-task/${taskId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          });
          const updatedTasks = tasks.filter((task) => task._id !== taskId);
          setTasks(updatedTasks);
          setFilteredTasks(updatedTasks);
          setUpdateTasksList((prevUpdateTasksList) => !prevUpdateTasksList);
        }
      } else {
        alert("Failed to add task to trash.");
      }
    } catch (error) {
      console.error("Error adding task to trash:", error);
    }
  };

  // Clear search input
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  return (
    <>
      {/* Main Dialog - Mobile Optimized */}
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        // fullWidth
        // maxWidth="md"
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: "#131111",
            color: "white",
            boxShadow: "none",
            [theme.breakpoints.down('sm')]: {
              margin: 0,
              borderRadius: 0,
            },
          },
        }}
      >
        <DialogTitle component="div" sx={{
          background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(123, 104, 238, 0.2)',
          color: "white",
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: isMobile ? 1.5 : 2.5,
          px: isMobile ? 2 : 3,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              component="div"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {title}
            </Typography>
            <Chip
              label={`${filteredTasks.length} ${filteredTasks.length === 1 ? 'Task' : 'Tasks'}`}
              size="small"
              sx={{
                background: 'linear-gradient(135deg, rgba(123, 104, 238, 0.2) 0%, rgba(123, 104, 238, 0.1) 100%)',
                color: '#7b68ee',
                border: '1px solid rgba(123, 104, 238, 0.3)',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Export to Excel">
              <IconButton
                onClick={exportToExcel}
                size={isMobile ? "small" : "medium"}
                sx={{
                  color: '#4caf50',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(76, 175, 80, 0.15)',
                    transform: 'scale(1.1)',
                  }
                }}
              >
                <RiFileExcel2Fill fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={onClose}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#ffffff',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'rotate(90deg)',
                }
              }}
            >
              <MdClose />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{
          "&.MuiDialogContent-root": {
            padding: 0,
            display: "flex",
            flexDirection: "column",
            height: isMobile ? "calc(100vh - 112px)" : "70vh",
          }
        }}>
          {/* Stats and Filters Section */}
          <Box sx={{
            p: isMobile ? 1 : 2,
            backgroundColor: "#2d2d2d",
            borderBottom: "1px solid #e5e7eb"
          }}>
            {/* KPI Stats */}
            <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
              <Chip
                label={`Open Issues: ${notClosedCount}`}
                color={notClosedCount > 0 ? "error" : "success"}
                variant="filled"
                sx={{ fontWeight: 'bold' }}
              />
              <Typography variant="body2" color="textSecondary">
                Showing {filteredTasks.length} tasks
              </Typography>
            </Stack>

            {/* Top Reasons Stats */}
            <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 0.5 }} alignItems="center">
              <Typography variant="caption" color="textSecondary" sx={{ whiteSpace: 'nowrap' }}>Top Reasons:</Typography>
              {sortedReasons.map(([reason, count]) => (
                <Chip
                  key={reason}
                  label={`${reason}: ${count}`}
                  size="small"
                  color={selectedReason === reason ? "primary" : "default"}
                  onClick={() => setSelectedReason(reason === selectedReason ? "All" : reason)}
                  sx={{
                    borderRadius: '4px',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: selectedReason === reason ? 'white' : '#b3b3b3',
                    backgroundColor: selectedReason === reason ? 'primary.main' : 'rgba(255,255,255,0.05)',
                    '&:hover': { backgroundColor: selectedReason === reason ? 'primary.dark' : 'rgba(255,255,255,0.1)' }
                  }}
                  variant={selectedReason === reason ? "filled" : "outlined"}
                />
              ))}
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
              {/* Search Bar */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: 1,
                  px: 1.5,
                  py: 0.5,
                  border: "1px solid rgba(255,255,255,0.1)",
                  "&:focus-within": {
                    borderColor: "#7b68ee",
                  },
                }}
              >
                <Search fontSize="small" sx={{ color: "#b3b3b3", mr: 1 }} />
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder="Search by name or SLID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    disableUnderline: true,
                    style: { color: "#ffffff", fontSize: '0.9rem' },
                    endAdornment: searchTerm && (
                      <IconButton
                        size="small"
                        onClick={handleClearSearch}
                        sx={{ color: "#b3b3b3", "&:hover": { color: "#ffffff" } }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    ),
                  }}
                />
              </Box>

              {/* Week Dropdown */}
              <FormControl variant="standard" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                <Select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  displayEmpty
                  sx={{
                    color: "white",
                    '.MuiSelect-icon': { color: "white" },
                    '&:before': { borderBottomColor: 'rgba(255,255,255,0.3)' },
                    '&:after': { borderBottomColor: '#7b68ee' },
                    fontSize: '0.9rem'
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#333',
                        color: 'white',
                        '& .MuiMenuItem-root': {
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                          '&.Mui-selected': { bgcolor: 'rgba(123, 104, 238, 0.3)' }
                        }
                      }
                    }
                  }}
                  renderValue={(selected) => {
                    if (selected === "All") return <span style={{ color: '#b3b3b3' }}>All Weeks</span>;
                    return selected;
                  }}
                >
                  {uniqueWeeks.map((week) => (
                    <MenuItem key={week} value={week}>
                      {week} {week !== "All" && `(${weekStats[week]})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Reason Dropdown */}
              <FormControl variant="standard" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                <Select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  displayEmpty
                  sx={{
                    color: "white",
                    '.MuiSelect-icon': { color: "white" },
                    '&:before': { borderBottomColor: 'rgba(255,255,255,0.3)' },
                    '&:after': { borderBottomColor: '#7b68ee' },
                    fontSize: '0.9rem'
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#333',
                        color: 'white',
                        '& .MuiMenuItem-root': {
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                          '&.Mui-selected': { bgcolor: 'rgba(123, 104, 238, 0.3)' }
                        }
                      }
                    }
                  }}
                  renderValue={(selected) => {
                    if (selected === "All") {
                      return <span style={{ color: '#b3b3b3' }}>Filter by Reason</span>;
                    }
                    return selected;
                  }}
                >
                  {uniqueReasons.map((reason) => (
                    <MenuItem key={reason} value={reason}>
                      {reason} {reason !== "All" && `(${reasonStats[reason]})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Mobile Filter Chip (Visible only on small screens) */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, mt: 1, gap: 1, overflowX: 'auto' }}>
              <Chip
                icon={<FilterList style={{ color: 'white' }} />}
                label={selectedReason === "All" ? "Filter Reason" : selectedReason}
                onClick={() => { /* Consider adding a mobile friendly dropdown or dialog here if needed, for now reliance on top stats chips is good enough or standard Select */ }}
                // For now, simpler to just start with the Select functioning on mobile or relying on the top chips
                sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
              {/* Or maybe just show the Select on mobile too but styled differently? Let's keep the Select above visible on all breakpoints or adjust */}
            </Box>
          </Box>

          {/* Scrollable content - Mobile Optimized */}
          <Box sx={{
            overflowY: "auto",
            flex: 1,
            padding: isMobile ? 1 : 2,
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
            },
          }}>
            <Stack spacing={isMobile ? 1.5 : 2}>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task, index) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: isMobile ? 2 : 3,
                      background: 'linear-gradient(135deg, #2d2d2d 0%, #252525 100%)',
                      borderRadius: 3,
                      border: '1px solid rgba(123, 104, 238, 0.2)',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(123, 104, 238, 0.3)',
                        border: '1px solid rgba(123, 104, 238, 0.4)',
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: task.status === 'Closed'
                          ? 'linear-gradient(90deg, #66BB6A 0%, #43A047 100%)'
                          : task.status === 'In Progress'
                            ? 'linear-gradient(90deg, #42A5F5 0%, #1E88E5 100%)'
                            : 'linear-gradient(90deg, #FFA726 0%, #FB8C00 100%)',
                      }
                    }}
                  >
                    <Stack spacing={isMobile ? 1.5 : 2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant={isMobile ? "h6" : "h5"}
                            sx={{
                              fontWeight: 700,
                              color: '#ffffff',
                              mb: 1,
                              letterSpacing: '-0.5px',
                              lineHeight: 1.2
                            }}
                          >
                            {task.customerName}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                            <Chip
                              label={task.slid}
                              size="small"
                              sx={{
                                background: 'linear-gradient(135deg, rgba(123, 104, 238, 0.2) 0%, rgba(123, 104, 238, 0.1) 100%)',
                                color: '#7b68ee',
                                border: '1px solid rgba(123, 104, 238, 0.3)',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                letterSpacing: '0.5px',
                                height: '24px',
                              }}
                            />
                            {statusConfig[task.status || "Todo"]?.icon}
                            {task.status !== "Closed" ? (
                              task.subTasks?.find(st => st.title === "Task Reception")?.shortNote && (
                                <Chip
                                  label={task.subTasks.find(st => st.title === "Task Reception").shortNote}
                                  size="small"
                                  sx={{
                                    backgroundColor: "rgba(33, 150, 243, 0.1)",
                                    color: "#2196f3",
                                    border: "1px solid rgba(33, 150, 243, 0.3)",
                                    fontSize: "10px",
                                    fontWeight: "500",
                                    height: "20px",
                                    ml: 1,
                                    "& .MuiChip-label": {
                                      px: 1,
                                    }
                                  }}
                                />
                              )
                            ) : (
                              task.closureCallFeedback && (
                                <Chip
                                  label={`Closure: ${task.closureCallFeedback}`}
                                  size="small"
                                  sx={{
                                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                                    color: "#10b981",
                                    border: "1px solid rgba(16, 185, 129, 0.3)",
                                    fontSize: "10px",
                                    fontWeight: "500",
                                    height: "20px",
                                    ml: 1,
                                    maxWidth: "250px",
                                    "& .MuiChip-label": {
                                      px: 1,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }
                                  }}
                                />
                              )
                            )}
                          </Box>
                        </Box>
                        <Stack direction="row" spacing={isMobile ? 0.25 : 0.5}>
                          <Tooltip title="Copy">
                            <IconButton onClick={() => handleCopy(task)} size="small" sx={{ color: '#7b68ee' }}>
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="WhatsApp">
                            <IconButton onClick={() => handleWhatsAppShare(task)} size="small" sx={{ color: '#25D366' }}>
                              <WhatsApp fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View">
                            <IconButton onClick={() => handleView(task)} size="small" sx={{ color: '#ffffff' }}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {currentUser === (task.createdBy?._id || task.createdBy) && (
                            <>
                              <Tooltip title="Edit">
                                <IconButton onClick={() => handleEdit(task)} size="small" sx={{ color: 'beige' }}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton onClick={() => handleTaskDelete(task._id)} size="small" sx={{ color: '#f44336' }}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </Stack>

                      {/* Enhanced Information Blocks */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {task.customerFeedback && (
                          <Box sx={{
                            p: 2,
                            background: 'linear-gradient(135deg, rgba(123, 104, 238, 0.08) 0%, rgba(123, 104, 238, 0.03) 100%)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 2,
                            borderLeft: '4px solid #7b68ee',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              boxShadow: '0 6px 16px rgba(123, 104, 238, 0.2)',
                              transform: 'translateX(2px)'
                            }
                          }}>
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#7b68ee',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                mb: 1,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                fontSize: '0.7rem'
                              }}
                            >
                              <Box component="span" sx={{ fontSize: '1rem' }}>💬</Box>
                              Customer Feedback
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                direction: 'rtl',
                                textAlign: 'right',
                                color: '#eff5ff',
                                lineHeight: 1.6,
                                fontWeight: 500
                              }}
                            >
                              {task.customerFeedback}
                            </Typography>
                          </Box>
                        )}

                        {(() => {
                          const taskReception = task.subTasks?.find(st => st.title === "Task Reception");
                          const hasShortNote = taskReception?.shortNote;

                          return hasShortNote ? (
                            <Box sx={{
                              p: 2,
                              background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(33, 150, 243, 0.03) 100%)',
                              backdropFilter: 'blur(10px)',
                              borderRadius: 2,
                              borderLeft: '4px solid #2196f3',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                boxShadow: '0 6px 16px rgba(33, 150, 243, 0.2)',
                                transform: 'translateX(2px)'
                              }
                            }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#2196f3',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  mb: 1,
                                  textTransform: 'uppercase',
                                  letterSpacing: '1px',
                                  fontSize: '0.7rem'
                                }}
                              >
                                <Box component="span" sx={{ fontSize: '1rem' }}>📝</Box>
                                Reception Summary
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  direction: 'rtl',
                                  textAlign: 'right',
                                  color: '#eff5ff',
                                  lineHeight: 1.6,
                                  fontWeight: 500
                                }}
                              >
                                {taskReception.shortNote}
                              </Typography>
                            </Box>
                          ) : null;
                        })()}
                      </Box>

                      <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 2 }}>
                        <Box sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: '#bdb5b5', spaceY: 0.5 }}>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            <Box component="span" sx={{ color: '#aaa', fontWeight: 500 }}>Due Date:</Box> {task.date ? format(new Date(task.date), "MMM dd, yyyy") : "No Date"}
                            {task.date && (
                              <Box component="span" sx={{ ml: 1, color: differenceInMinutes(new Date(task.date), new Date()) > 0 ? "success.main" : "error.main" }}>
                                ({differenceInMinutes(new Date(task.date), new Date()) > 0 ? "Left" : "Overdue"})
                              </Box>
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            <Box component="span" sx={{ color: '#aaa', fontWeight: 500 }}>Category:</Box> {task.category}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            <Box component="span" sx={{ color: '#aaa', fontWeight: 500 }}>Operation:</Box> {task.operation || 'N/A'}
                          </Typography>
                        </Box>

                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="caption" sx={{ color: '#aaa' }}>Assignee:</Typography>
                            <Chip
                              label={task.assignedTo?.[0]?.name || "Not Assigned"}
                              size="small"
                              sx={{
                                color: '#ffffff',
                                backgroundColor: task.assignedTo?.[0] ? 'primary.main' : 'grey.600',
                                height: 20,
                                fontSize: '0.7rem'
                              }}
                            />
                          </Box>

                          {task.subTasks && task.subTasks.length > 0 && (
                            <Box sx={{ mt: 1.5 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#aaa',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    fontSize: '0.7rem'
                                  }}
                                >
                                  Progress
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#7b68ee',
                                    fontWeight: 700,
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {Math.round((task.subTasks.filter(st => st.status === "Closed" || st.note !== "").length / task.subTasks.length) * 100)}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={(task.subTasks.filter(st => st.status === "Closed" || st.note !== "").length / task.subTasks.length) * 100}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                                  "& .MuiLinearProgress-bar": {
                                    background: 'linear-gradient(90deg, #7b68ee 0%, #9b87f5 100%)',
                                    borderRadius: 4,
                                    boxShadow: '0 0 10px rgba(123, 104, 238, 0.4)'
                                  }
                                }}
                              />
                            </Box>
                          )}
                        </Box>
                      </Box>

                      <Button
                        variant="contained"
                        fullWidth={isMobile}
                        onClick={() => handleOpenSubtasks(task)}
                        sx={{
                          mt: 2,
                          background: 'linear-gradient(135deg, #7b68ee 0%, #6a5acd 100%)',
                          color: '#ffffff',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          py: 1.25,
                          borderRadius: 2,
                          boxShadow: '0 4px 12px rgba(123, 104, 238, 0.3)',
                          alignSelf: isMobile ? 'stretch' : 'flex-start',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #6a5acd 0%, #5b4bbd 100%)',
                            boxShadow: '0 6px 16px rgba(123, 104, 238, 0.4)',
                            transform: 'translateY(-2px)'
                          },
                          '&:active': {
                            transform: 'translateY(0)'
                          }
                        }}
                      >
                        <RiProgress4Fill size={20} style={{ marginRight: '8px' }} />
                        Manage Subtasks
                      </Button>
                    </Stack>
                  </Paper>
                ))
              ) : (
                <Typography variant="body2" sx={{ textAlign: 'center', py: 3, color: '#aaa' }}>
                  No tasks found matching your search
                </Typography>
              )}
            </Stack>
          </Box>
        </DialogContent >

        {isMobile && (
          <DialogActions sx={{
            backgroundColor: '#2d2d2d',
            borderTop: '1px solid #e5e7eb',
            px: 2,
            py: 1,
          }}>
            <Button
              onClick={onClose}
              size="small"
              sx={{
                color: '#ffffff',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        )
        }
      </Dialog >

      {/* Task Details View Dialog - Mobile Optimized */}
      < Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        fullScreen
        // fullWidth
        // maxWidth="md"
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#2d2d2d',
            boxShadow: 'none',
            borderRadius: isMobile ? 0 : '8px',
          }
        }}
      >
        <DialogTitle component="div" sx={{
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: isMobile ? '12px 16px' : '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ fontWeight: 500 }}>
              Task Details
            </Typography>
            {taskToView?.customerName && (
              <Typography
                variant={isMobile ? "caption" : "subtitle1"}
                component="div"
                sx={{
                  color: '#7b68ee',
                  fontStyle: 'italic'
                }}
              >
                {taskToView.customerName}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Copy">
              <IconButton
                onClick={() => handleCopy(taskToView)}
                size={isMobile ? "small" : "medium"}
                sx={{
                  mr: 1,
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#2a2a2a',
                  }
                }}
              >
                <ContentCopy fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={() => setViewDialogOpen(false)}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                }
              }}
            >
              <MdClose fontSize={isMobile ? "18px" : "24px"} />
            </IconButton>
          </Box>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#e5e7eb' }} />

        <DialogContent dividers sx={{
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          padding: isMobile ? '12px 16px' : '20px 24px',
          minHeight: '200px',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#e5e7eb',
            borderRadius: '2px',
          },
        }}>
          {viewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '200px' }}>
              <Typography sx={{ color: '#aaa' }}>Loading details...</Typography>
            </Box>
          ) : taskToView && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 3 }}>
              {/* Basic Information Section */}
              <Paper elevation={0} sx={{
                p: isMobile ? 1.5 : 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee' }}>
                  Basic Info
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? 1.5 : 2
                }}>
                  <DetailRow label="Request Number" value={taskToView.requestNumber} isMobile={isMobile} />
                  <DetailRow label="SLID" value={taskToView.slid} isMobile={isMobile} />
                  <DetailRow label="Customer Name" value={taskToView.customerName} isMobile={isMobile} />
                  <DetailRow label="Contact Number" value={taskToView.contactNumber} isMobile={isMobile} />
                  <DetailRow label="PIS Date" value={moment(taskToView.pisDate).format("YYYY-MM-DD")} isMobile={isMobile} />
                  <DetailRow label="Tariff Name" value={taskToView.tarrifName} isMobile={isMobile} />
                  <DetailRow label="Customer Type" value={taskToView.customerType} isMobile={isMobile} />
                  <DetailRow label="Interview Date" value={moment(taskToView.interviewDate).format("YYYY-MM-DD")} isMobile={isMobile} />
                </Box>
              </Paper>

              {/* Location Information Section */}
              <Paper elevation={0} sx={{
                p: isMobile ? 1.5 : 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee' }}>
                  Location
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? 1.5 : 2
                }}>
                  <DetailRow label="Governorate" value={taskToView.governorate} isMobile={isMobile} />
                  <DetailRow label="District" value={taskToView.district} isMobile={isMobile} />
                </Box>
              </Paper>

              {/* Team Information Section */}
              <Paper elevation={0} sx={{
                p: isMobile ? 1.5 : 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee' }}>
                  Team Info
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? 1.5 : 2
                }}>
                  <DetailRow label="Team Name" value={taskToView.teamName} isMobile={isMobile} />
                  <DetailRow label="Team Company" value={taskToView.teamCompany} isMobile={isMobile} />
                </Box>
              </Paper>

              {/* Evaluation Section */}
              <Paper elevation={0} sx={{
                p: isMobile ? 1.5 : 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee' }}>
                  Evaluation
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? 1.5 : 2
                }}>
                  <DetailRow
                    label="Satisfaction Score"
                    value={
                      <Box component="span">
                        <Chip
                          label={`${taskToView.evaluationScore} (${taskToView.evaluationScore >= 9 ? 'Promoter' :
                            taskToView.evaluationScore >= 7 ? 'Neutral' : 'Detractor'
                            })`}
                          size={isMobile ? "small" : "medium"}
                          sx={{
                            color: '#ffffff',
                            backgroundColor:
                              taskToView.evaluationScore >= 9 ? '#4caf50' :
                                taskToView.evaluationScore >= 7 ? '#6b7280' : '#f44336',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                    }
                    isMobile={isMobile}
                  />
                  <DetailRow label="Customer Feedback" value={taskToView.customerFeedback} isMobile={isMobile} />
                  <DetailRow label="Reason" value={taskToView.reason} isMobile={isMobile} />
                </Box>
              </Paper>

              {/* Progress Section */}
              {taskToView?.subTasks?.[0]?.note && (
                <Paper elevation={0} sx={{
                  p: isMobile ? 1.5 : 2,
                  backgroundColor: '#2d2d2d',
                  borderRadius: 2,
                  border: '1px solid #3d3d3d'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee' }}>
                    Progress
                  </Typography>

                  {/* Progress Bar with Assigned Team Members */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant={isMobile ? "caption" : "body2"} sx={{ color: '#eff5ff' }}>
                        Progress: {taskToView?.subTasks?.length > 0 ? Math.round((100 / taskToView.subTasks.length) * taskToView.subTasks.filter(t => t.note).length) : 0}%
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {taskToView.assignedTo?.map((user, index) => (
                          <Tooltip key={index} title={user.name}>
                            <Avatar sx={{
                              width: isMobile ? 24 : 28,
                              height: isMobile ? 24 : 28,
                              fontSize: isMobile ? '0.7rem' : '0.8rem',
                              backgroundColor: '#3a4044',
                              border: '2px solid',
                              borderColor: taskToView?.subTasks?.some(t => t.completedBy?._id === user._id) ? '#4caf50' : '#f44336'
                            }}>
                              {user?.name
                                ?.split(' ')
                                .map((part, i) => i < 2 ? part.charAt(0) : '')
                                .join('') || '?'}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={taskToView?.subTasks?.length > 0 ? Math.round((100 / taskToView.subTasks.length) * taskToView.subTasks.filter(t => t.note).length) : 0}
                      sx={{
                        height: isMobile ? 8 : 10,
                        borderRadius: 5,
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 5,
                          backgroundColor: '#7b68ee'
                        }
                      }}
                    />
                  </Box>

                  {/* Detailed Action Items */}
                  <Paper sx={{
                    p: isMobile ? 1 : 2,
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #3d3d3d',
                    borderRadius: '8px'
                  }}>
                    {taskToView?.subTasks?.map((subtask, index) => (
                      <Box
                        key={index}
                        sx={{
                          mb: index < taskToView.subTasks.length - 1 ? 2 : 0,
                          pb: index < taskToView.subTasks.length - 1 ? 2 : 0,
                          borderBottom: index < taskToView.subTasks.length - 1 ? '1px solid #e5e7eb' : 'none'
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant={isMobile ? "body2" : "h6"} sx={{ color: '#eff5ff', fontWeight: 500 }}>
                            {index + 1}. {subtask.title}
                          </Typography>
                          {subtask.completedBy && (
                            <Chip
                              size={isMobile ? "small" : "medium"}
                              sx={{
                                backgroundColor: '#3a4044',
                                color: 'white',
                                '& .MuiChip-avatar': {
                                  width: isMobile ? 20 : 24,
                                  height: isMobile ? 20 : 24,
                                  fontSize: isMobile ? '0.65rem' : '0.75rem'
                                }
                              }}
                              avatar={
                                <Avatar sx={{
                                  backgroundColor: (Array.isArray(taskToView.assignedTo) && taskToView.assignedTo.some(u => (u?._id || u) === subtask.completedBy?._id))
                                    ? '#7b68ee'
                                    : '#f44336',
                                  width: isMobile ? 20 : 24,
                                  height: isMobile ? 20 : 24,
                                  fontSize: isMobile ? '0.65rem' : '0.75rem'
                                }}>
                                  {subtask.completedBy?.name
                                    ?.split(' ')
                                    .map((part, i) => i < 2 ? part.charAt(0) : '')
                                    .join('') || '?'}
                                </Avatar>
                              }
                              label={`${isMobile ? '' : 'Action by: '}${subtask.completedBy.name}`}
                            />
                          )}
                        </Stack>

                        <Box sx={{
                          backgroundColor: '#2a2a2a',
                          p: isMobile ? 1 : 2,
                          borderRadius: 1,
                          borderLeft: '3px solid',
                          borderColor: subtask.note ? '#7b68ee' : 'transparent'
                        }}>
                          <Typography variant={isMobile ? "caption" : "body1"} sx={{
                            direction: 'rtl',
                            textAlign: 'right',
                            color: '#eff5ff',
                            fontStyle: subtask.note ? 'normal' : 'italic'
                          }}>
                            {subtask.note || 'No action taken yet'}
                          </Typography>
                        </Box>

                        {subtask.shortNote && (
                          <Box sx={{
                            mt: 1,
                            p: 1.5,
                            backgroundColor: 'rgba(33, 150, 243, 0.05)',
                            borderRadius: '4px',
                            borderRight: '4px solid #2196f3'
                          }}>
                            <Typography variant="caption" sx={{ color: '#2196f3', fontWeight: 'bold', display: 'block', mb: 0.5, textAlign: 'right' }}>
                              Reception Summary:
                            </Typography>
                            <Typography variant="body2" sx={{ direction: 'rtl', textAlign: 'right', color: '#ffffff', fontWeight: '500' }}>
                              {subtask.shortNote}
                            </Typography>
                          </Box>
                        )}

                        {subtask.dateTime && (
                          <Typography variant="caption" sx={{
                            color: 'gray',
                            display: 'block',
                            mt: 0.5,
                            textAlign: 'right',
                            fontSize: isMobile ? '0.65rem' : '0.75rem'
                          }}>
                            Completed: {subtask.dateTime}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Paper>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>

        <Divider sx={{ backgroundColor: '#e5e7eb' }} />

        <DialogActions sx={{
          backgroundColor: '#2d2d2d',
          borderTop: '1px solid #e5e7eb',
          padding: isMobile ? '8px 16px' : '12px 24px',
        }}>
          <Button
            onClick={() => setViewDialogOpen(false)}
            size={isMobile ? "small" : "medium"}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#2a2a2a',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog >

      {/* EditTaskDialog */}
      {
        selectedTask && (
          <EditTaskDialog
            open={editDialogOpen}
            setOpen={setEditDialogOpen}
            task={selectedTask}
            handleTaskUpdate={handleTaskUpdate}
            isMobile={isMobile}
          />
        )
      }

      {/* Detailed Subtask Dialog */}
      {
        subtaskDialogOpen && selectedTask && (
          <DetailedSubtaskDialog
            open={subtaskDialogOpen}
            onClose={() => setSubtaskDialogOpen(false)}
            task={selectedTask}
            setUpdateTasksList={setUpdateTasksList}
          />
        )
      }
    </>
  );
};

const DetailRow = ({ label, value, isMobile }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    <Typography
      variant={isMobile ? "caption" : "body2"}
      component="div"
      sx={{
        fontWeight: '500',
        color: '#b3b3b3'
      }}
    >
      {label}
    </Typography>
    {typeof value === 'string' || typeof value === 'number' ? (
      <Typography
        variant={isMobile ? "body2" : "body1"}
        component="div"
        sx={{
          color: '#ffffff',
          wordBreak: 'break-word',
          fontSize: isMobile ? '0.875rem' : '1rem',
          textAlign: label === "Customer Feedback" ? "right" : "left",
          direction: label === "Customer Feedback" ? "rtl" : "ltr"
        }}
      >
        {value || 'N/A'}
      </Typography>
    ) : (
      <Box sx={{ display: 'inline-block' }}>
        {value}
      </Box>
    )}
  </Box>
);

export default TaskStatusDialog;