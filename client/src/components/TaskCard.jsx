import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Paper,
  Stack,
  AvatarGroup,
  Avatar,
  Typography,
  Box,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  HourglassEmpty,
  PlayCircle,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import { FaRegCopy, FaStar } from "react-icons/fa";
import { useSelector } from "react-redux";
import api from "../api/api";
import { format, differenceInMinutes } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EditTaskDialog from "./task/EditTaskDialog";
import { IoMdMagnet } from "react-icons/io";
import { MdClose } from "react-icons/md";
import SubtaskManager from "./SubtaskManager";
import { RiProgress4Fill } from "react-icons/ri";

const predefinedSubtasks = {
  original: [
    {
      title: "Task Reception",
      note: "",
      progress: 0,
      status: "Open",
    },
    {
      title: "Customer Contact and Appointment Scheduling",
      note: "",
      progress: 0,
      status: "Open",
    },
    {
      title: "On-Site Problem Resolution",
      note: "",
      progress: 0,
      status: "Open",
    },
    {
      title: "Task Closure for Declined Visits",
      note: "",
      progress: 0,
      status: "Open",
    },
  ],
  visit: [
    {
      title: "Service Installation Evaluation",
      status: "Open",
      checkpoints: [
        {
          name: "ONT Placement Verification",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "How was the ONT placement handled?",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Incorrect", value: "incorrect" },
              { label: "Acceptable", value: "acceptable" },
              { label: "Optimal", value: "optimal" }
            ],
            selected: null,
            actionTaken: {
              question: "Corrective actions for ONT placement:",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Relocated ONT to proper position", value: "shift_ont" },
                { label: "ONT placed at a suboptimal location due to internal conduit blockage preventing access to the optimal position.", value: "internal_conduit_blocked" },
                { label: "ONT installed in non-standard location based on customer's preference", value: "customer_preference" },
                { label: "Reported to technical team for ONT relocation", value: "report_dispatcher" },
                { label: "No corrective action", value: "no_action" }
              ],
              selected: null
            }
          }
        },
        {
          name: "ONT Configuration Check",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "ONT configuration status:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Incorrect", value: "incorrect" },
              { label: "Partially Correct", value: "partial" },
              { label: "Fully Correct", value: "correct" },
            ],
            selected: null,
            actionTaken: {
              question: "Corrective actions for ONT configuration:",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Adjusted ONT settings", value: "reconfigure_ont" },
                { label: "No corrective action", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Wi-Fi Repeater Setup",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Customer Wi-Fi repeater status:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Active and functioning properly", value: "yes_working" },
              { label: "Available but not in use", value: "yes_not_needed" },
              { label: "Not present", value: "no" },
            ],
            selected: null,
            followUpQuestion: {
              question: "Repeater placement quality:",
              choices: [
                { label: "Select an option", value: null }, // Added null choice
                { label: "Incorrect", value: "incorrect" },
                { label: "Acceptable", value: "acceptable" },
                { label: "Optimal", value: "optimal" },
              ],
              selected: null,
              actionTaken: {
                question: "Corrective actions for repeater placement:",
                choices: [ // REMOVED the null option here
                  { label: "Repositioned repeater", value: "relocate_repeater" },
                  { label: "No corrective action", value: "no_action" }
                ],
                selected: null
              },
            },
          },
        },
        {
          name: "Connection Speed Test",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Speed test results:",
            choices: [
              { label: "Select an option", value: null },
              { label: "Below expected", value: "low" },
              { label: "Meets expectations", value: "ok" },
              { label: "Exceeds expectations", value: "high" }
            ],
            selected: null,
            actionTaken: {
              question: "Corrective actions for speed issues:",
              choices: [
                { label: "Select an action", value: null },
                { label: "Optimized network configuration", value: "optimize_settings" },
                { label: "Performed ONT reset", value: "reset_ont" },
                { label: "Performed repeater reset", value: "reset_repeater" },
                { label: "No corrective action", value: "no_action" }
              ],
              selected: null,
              // Only show justification when no corrective action is taken
              justification: {
                question: "Reason for not taking corrective action:",
                showWhen: "no_action",
                choices: [
                  { label: "Select justification", value: null },
                  { label: "Device limitations (old hardware)", value: "device_limitations" },
                  { label: "Customer WiFi environment issues", value: "wifi_environment" },
                  { label: "Speed meets contracted service level", value: "meets_contract" },
                  { label: "Temporary network congestion", value: "temp_congestion" },
                  { label: "Application-specific limitation", value: "app_limitation" },
                  { label: "Customer declined service improvements", value: "customer_declined" }
                ],
                selected: null,
                notes: {
                  question: "Additional notes about the situation:",
                  value: ""
                }
              }
            },
            // Additional justification for any speed result
            generalJustification: {
              question: "Technical assessment notes:",
              choices: [
                { label: "Select assessment", value: null },
                { label: "Normal speed variation observed", value: "normal_variation" },
                { label: "Speed limited by device capabilities", value: "device_limit" },
                { label: "Speed limited by WiFi technology", value: "wifi_limit" },
                { label: "Speed matches service plan", value: "matches_plan" },
                { label: "No technical issues found", value: "no_issues" }
              ],
              selected: null,
              notes: {
                question: "Technical observations:",
                value: ""
              }
            }
          }
        },
        {
          name: "Wi-Fi Coverage Assessment",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Wi-Fi signal strength evaluation:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Weak", value: "weak" },
              { label: "Adequate", value: "average" },
              { label: "Strong", value: "strong" },
            ],
            selected: null,
            actionTaken: {
              question: "Corrective actions for coverage issues:",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Recommended new repeater purchase", value: "advise_buy_repeater" },
                { label: "Repositioned existing repeater", value: "relocate_repeater" },
                { label: "No corrective action", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Optical Signal Quality Check",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Optical signal quality:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Low power", value: "low_power" },
              { label: "Standard", value: "standard" },
              { label: "High power", value: "high_power" },
            ],
            selected: null,
            actionTaken: {
              question: "Corrective actions for signal issues:",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Adjusted optical connection", value: "adjust_connection" },
                { label: "Replaced optical cable", value: "replace_cable" },
                { label: "Identified weak signal from FDB", value: "weak_signal" },
                { label: "Identified ONT malfunction", value: "ont_malfunction" },
                { label: "Reported to technical team", value: "report_technical" },
                { label: "No corrective action", value: "no_action" },
              ],
              selected: null,
            },
          },
          signalTestNotes: "",
        },
      ],
      note: "",
      dateTime: null,
    },
    {
      title: "Customer Technical Education",
      status: "Open",
      checkpoints: [
        {
          name: "Wi-Fi Frequency Explanation (2.4GHz vs 5GHz)",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Frequency band explanation provided:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Not provided", value: "none" },
              { label: "Basic information", value: "basic" },
              { label: "Comprehensive explanation", value: "detailed" },
            ],
            selected: null,
            actionTaken: {
              question: "Follow-up actions for frequency explanation:",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Provided supplemental explanation", value: "provide_explanation" },
                { label: "No follow-up action", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Wi-Fi Optimization Guidance",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Optimization guidance provided:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Not provided", value: "none" },
              { label: "Minimal guidance", value: "minimal" },
              { label: "Complete guidance", value: "complete" },
            ],
            selected: null,
            actionTaken: {
              question: "Follow-up actions for optimization guidance:",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Provided additional recommendations", value: "provide_guidance" },
                { label: "No follow-up action", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Internet-Based Applications (e.g., IPTV, VPN, ....)",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Did the customer mention using any internet-based applications?",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Not using any", value: "not_using" },
              { label: "Not discussed", value: "not_discussed" },
              { label: "Partially discussed", value: "partial" },
              { label: "Fully explained with usage guidance", value: "explained" }
            ],
            selected: null,
            actionTaken: {
              question: "What action was taken regarding internet-based applications?",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Shared common limitations and tips (e.g., VPN speed impact)", value: "share_tips" },
                { label: "Customer confirmed no use of such applications", value: "not_applicable" },
                { label: "No follow-up action needed", value: "no_action" }
              ],
              selected: null
            }
          }
        },
      ],
      note: "",
      dateTime: null,
    },
    {
      title: "Service Feedback Collection",
      status: "Open",
      checkpoints: [
        {
          name: "Service Rating Instructions",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Rating instructions clarity:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Not provided", value: "not_delivered" },
              { label: "Unclear or incomplete", value: "incomplete_unclear" },
              { label: "Clear and complete", value: "clear_and_complete" },
            ],
            selected: null,
          },
        },
        {
          name: "Technician Professionalism Evaluation",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Technician conduct assessment:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Unprofessional behavior", value: "unacceptable_conduct" },
              { label: "Standard professionalism", value: "standard" },
              { label: "Exemplary professionalism", value: "professional" },
            ],
            selected: null,
            actionTaken: {
              question: "Actions regarding technician behavior:",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Escalated to management", value: "report_manager" },
                { label: "No action taken", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Service Execution Pace",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Perceived service pace:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Rushed service", value: "rushed_service" },
              { label: "Appropriate pace", value: "appropriate_pace" },
            ],
            selected: null,
            actionTaken: {
              question: "Actions regarding service pace:",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Escalated to management", value: "report_manager" },
                { label: "No action taken", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Post-Service Follow-Up Instructions",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            simpleQuestion: true,  // Mark as simple question
            question: "Follow-up instructions provided:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
            selected: null,
          },
        },
      ],
      note: "",
      dateTime: null,
    },
  ],
  phone: [
    {
      title: "Remote Service Assessment",
      status: "Open",
      checkpoints: [
        {
          name: "Wi-Fi Coverage Evaluation",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Reported Wi-Fi coverage:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Weak", value: "weak" },
              { label: "Adequate", value: "average" },
              { label: "Strong", value: "strong" },
            ],
            selected: null,
            actionTaken: {
              question: "Remote support actions:",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Recommended repeater purchase", value: "advise_buy_repeater" },
                { label: "No action taken", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Reported Speed Verification",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Customer-reported speed:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Below expected", value: "low" },
              { label: "Meets expectations", value: "ok" },
              { label: "Exceeds expectations", value: "high" },
            ],
            selected: null,
            actionTaken: {
              question: "Remote troubleshooting actions:",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Explained frequency band differences", value: "explain_band_diff" },
                { label: "Demonstrated optimal speed near ONT", value: "demo_near_ont" },
                { label: "Identified device limitations", value: "identify_device_limit" },
                { label: "No action taken", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Wi-Fi Frequency Explanation (2.4GHz vs 5GHz)",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Frequency explanation provided:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Not provided", value: "none" },
              { label: "Basic information", value: "basic" },
              { label: "Comprehensive explanation", value: "detailed" },
            ],
            selected: null,
            actionTaken: {
              question: "Follow-up explanations:",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Provided additional clarification", value: "provide_explanation" },
                { label: "No follow-up action", value: "no_action" },
              ],
              selected: null,
            },
          },
        },
        {
          name: "Internet-Based Applications (e.g., IPTV, VPN, ....)",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Did the customer mention using any internet-based applications?",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Not using any", value: "not_using" },
              { label: "Not discussed", value: "not_discussed" },
              { label: "Partially discussed", value: "partial" },
              { label: "Fully explained with usage guidance", value: "explained" }
            ],
            selected: null,
            actionTaken: {
              question: "What action was taken regarding internet-based applications?",
              choices: [
                { label: "Select an action", value: null }, // Added null choice
                { label: "Shared common limitations and tips (e.g., VPN speed impact)", value: "share_tips" },
                { label: "Customer confirmed no use of such applications", value: "not_applicable" },
                { label: "No follow-up action needed", value: "no_action" }
              ],
              selected: null
            }
          }
        },
        {
          name: "Service Rating Instructions",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Rating instructions clarity:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Not provided", value: "not_delivered" },
              { label: "Unclear or incomplete", value: "incomplete_unclear" },
              { label: "Clear and complete", value: "clear_and_complete" },
            ],
            selected: null,
          },
        },
        {
          name: "Post-Service Follow-Up Instructions",
          checked: false,
          score: null,
          options: {
            type: "conditional",
            question: "Follow-up instructions provided:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
            selected: null,
          },
        },
      ],
      note: "",
      dateTime: null,
    },
  ],
  others: [
    {
      title: "Alternative Resolution Methods",
      status: "Open",
      checkpoints: [
        {
          name: "Resolution Category",
          checked: false,
          options: {
            type: "conditional",
            question: "Select resolution type:",
            choices: [
              { label: "Select an option", value: null }, // Added null choice
              { label: "No response from customer", value: "no_answer" },
              { label: "Visit declined by customer", value: "customer_refuse" },
              { label: "Service cancellation initiated", value: "customer_cancel" },
              { label: "Incorrect contact details", value: "wrong_info" },
            ],
            selected: null
          }
        },
        {
          name: "Resolution Details",
          checked: false,
          options: {
            type: "text",
            question: "Additional resolution notes:",
            value: ""
          }
        }
      ]
    }
  ]
}

const statusConfig = {
  Todo: { icon: <HourglassEmpty fontSize="small" className="text-yellow-600" />, color: "bg-yellow-100 text-yellow-800" },
  "In Progress": { icon: <PlayCircle className="text-blue-600" />, color: "bg-blue-100 text-blue-800" },
  Closed: { icon: <CheckCircle className="text-green-600" />, color: "bg-green-100 text-green-800" },
  Cancelled: { icon: <Cancel className="text-gray-500" />, color: "bg-[#2d2d2d] text-gray-300" },
};

const TaskCard = ({ task, users, setUpdateStateDuringSave, handleTaskUpdate, handleTaskDelete, handleFavoriteClick, handleTaskArchive }) => {
  const navigate = useNavigate();
  const user = useSelector((state) => state?.auth?.user);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [notes, setNotes] = useState({
    visit: predefinedSubtasks.visit.map(() => ""),
    phone: predefinedSubtasks.phone.map(() => ""),
    original: predefinedSubtasks.original.map(() => ""),
    others: predefinedSubtasks.others.map(() => "")
  });
  const [subtasksByOption, setSubtasksByOption] = useState({
    visit: predefinedSubtasks.visit,
    phone: predefinedSubtasks.phone,
    original: predefinedSubtasks.original,
    others: predefinedSubtasks.others
  });
  const [checkpointsByOption, setCheckpointsByOption] = useState({
    visit: predefinedSubtasks.visit.map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : [])),
    phone: predefinedSubtasks.phone.map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : [])),
    original: predefinedSubtasks.original.map((subtask) => [...subtask.checkpoints || []]),
    others: predefinedSubtasks.others.map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : []))
  });
  const [additionalInfoByOption, setAdditionalInfoByOption] = useState({
    visit: { ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null },
    phone: { ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null },
    original: { ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null },
    others: { ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null }
  });
  const [activeStep, setActiveStep] = useState(0);
  const [cancelState, setCancelState] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState([]);
  const [creatorColor, setCreatorColor] = useState([]);
  const formattedDate = task?.date ? format(new Date(task.date), "MMM dd, yyyy HH:mm") : "No Date";
  const remainingMinutes = task?.date ? differenceInMinutes(new Date(task.date), new Date()) : null;

  const [selectedOption, setSelectedOption] = useState("visit");
  const [subtasks, setSubtasks] = useState(subtasksByOption.visit);
  const [checkpoints, setCheckpoints] = useState(checkpointsByOption.visit);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState(additionalInfoByOption.visit);

  task.subtasks = task.subTasks || [];
  task.whomItMayConcern = task.whomItMayConcern || [];

  const assignedUsers = users.filter((user) =>
    task.assignedTo.some((assignedUser) => assignedUser._id === user._id || assignedUser === user._id)
  );
  const creator = users.find((user) => user._id === task.createdBy._id || user._id === task.createdBy) || {};

  useEffect(() => {
    setCheckpoints(subtasks.map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : [])));
  }, [subtasks]);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);


  const resetUIStates = () => {
    setNotes({
      visit: predefinedSubtasks.visit.map(() => ""),
      phone: predefinedSubtasks.phone.map(() => ""),
      original: predefinedSubtasks.original.map(() => ""),
      others: predefinedSubtasks.others.map(() => ""),
    });

    setSubtasksByOption({
      visit: predefinedSubtasks.visit,
      phone: predefinedSubtasks.phone,
      original: predefinedSubtasks.original,
      others: predefinedSubtasks.others,
    });

    setCheckpointsByOption({
      visit: predefinedSubtasks.visit.map((subtask) =>
        subtask.checkpoints ? subtask.checkpoints.map(cp => ({
          ...cp,
          checked: false,
          options: cp.options ? {
            ...cp.options,
            selected: null,
            followUpQuestion: cp.options.followUpQuestion ? {
              ...cp.options.followUpQuestion,
              selected: null,
              actionTaken: cp.options.followUpQuestion.actionTaken ? {
                ...cp.options.followUpQuestion.actionTaken,
                selected: null,
              } : null,
            } : null,
            actionTaken: cp.options.actionTaken ? {
              ...cp.options.actionTaken,
              selected: null,
            } : null,
          } : null,
          signalTestNotes: "",
        })) : []
      ),
      phone: predefinedSubtasks.phone.map((subtask) =>
        subtask.checkpoints ? subtask.checkpoints.map(cp => ({
          ...cp,
          checked: false,
          options: cp.options ? {
            ...cp.options,
            selected: null,
            followUpQuestion: cp.options.followUpQuestion ? {
              ...cp.options.followUpQuestion,
              selected: null,
              actionTaken: cp.options.followUpQuestion.actionTaken ? {
                ...cp.options.followUpQuestion.actionTaken,
                selected: null,
              } : null,
            } : null,
            actionTaken: cp.options.actionTaken ? {
              ...cp.options.actionTaken,
              selected: null,
            } : null,
          } : null,
        })) : []
      ),
      original: predefinedSubtasks.original.map((subtask) =>
        subtask.checkpoints ? subtask.checkpoints.map(cp => ({
          ...cp,
          checked: false,
          options: cp.options ? {
            ...cp.options,
            selected: null,
            followUpQuestion: cp.options.followUpQuestion ? {
              ...cp.options.followUpQuestion,
              selected: null,
              actionTaken: cp.options.followUpQuestion.actionTaken ? {
                ...cp.options.followUpQuestion.actionTaken,
                selected: null,
              } : null,
            } : null,
            actionTaken: cp.options.actionTaken ? {
              ...cp.options.actionTaken,
              selected: null,
            } : null,
          } : null,
        })) : []
      ),
      others: predefinedSubtasks.others.map((subtask) =>
        subtask.checkpoints ? subtask.checkpoints.map(cp => ({
          ...cp,
          checked: false,
          options: cp.options ? {
            ...cp.options,
            selected: null,
            value: "",
          } : null,
        })) : []
      ),
    });

    setAdditionalInfoByOption({
      visit: { ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null },
      phone: { ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null },
      original: { ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null },
      others: { ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null },
    });

    setActiveStep(0);
    setSelectedOption("visit");
    setSubtasks(predefinedSubtasks.visit);
    setCheckpoints(predefinedSubtasks.visit.map((subtask) =>
      subtask.checkpoints ? subtask.checkpoints.map(cp => ({
        ...cp,
        checked: false,
        options: cp.options ? {
          ...cp.options,
          selected: null,
          followUpQuestion: cp.options.followUpQuestion ? {
            ...cp.options.followUpQuestion,
            selected: null,
            actionTaken: cp.options.followUpQuestion.actionTaken ? {
              ...cp.options.followUpQuestion.actionTaken,
              selected: null,
            } : null,
          } : null,
          actionTaken: cp.options.actionTaken ? {
            ...cp.options.actionTaken,
            selected: null,
          } : null,
        } : null,
        signalTestNotes: "",
      })) : []
    ));
    setAdditionalInfo({ ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null });
    setExpandedNotes([]);
  };

  const toggleNoteExpand = (index) => {
    setExpandedNotes((prev) => {
      const newExpanded = Array.isArray(prev) ? [...prev] : Array(subtasks.length).fill(false);
      newExpanded[index] = !newExpanded[index];
      return newExpanded;
    });
  };

  const handleCheckpointToggle = (subtaskIndex, checkpointIndex) => {
    const updatedCheckpoints = [...checkpoints];
    const checkpoint = updatedCheckpoints[subtaskIndex][checkpointIndex];

    // Toggle the checked state
    checkpoint.checked = !checkpoint.checked;

    // If this checkpoint has no score system, set score to null when checked
    if (checkpoint.score === null) {
      checkpoint.score = checkpoint.checked ? null : 0;
    }

    setCheckpoints(updatedCheckpoints);
    setCheckpointsByOption((prev) => ({
      ...prev,
      [selectedOption]: updatedCheckpoints,
    }));
  };

  const handleOptionChange = (event) => {
    const option = event.target.value;
    if (predefinedSubtasks[option]) {
      setSelectedOption(option);
      const newSubtasks = subtasksByOption[option].map((subtask, index) =>
        index === 0
          ? {
            ...subtask,
            ontType: additionalInfoByOption[option].ontType,
            speed: additionalInfoByOption[option].speed,
            serviceRecipientInitial: additionalInfoByOption[option].serviceRecipientInitial,
            serviceRecipientQoS: additionalInfoByOption[option].serviceRecipientQoS,
          }
          : subtask
      );
      setSubtasks(newSubtasks);
      setCheckpoints(checkpointsByOption[option]);
      setAdditionalInfo(additionalInfoByOption[option]);
    }
  };

  const copyToClipboard = () => {
    const formattedMessage = `
      **SLID**: ${task.slid}
      **Operation**: ${task.operation || 'N/A'}
      **Satisfaction Score**: ${task.score}
      **Status**: ${task.status}
      **Due Date**: ${formattedDate}
      **Remaining Time**: ${remainingMinutes !== null
        ? remainingMinutes > 0
          ? `${Math.floor(remainingMinutes / 1440)} days, ${Math.floor((remainingMinutes % 1440) / 60)} hours, ${remainingMinutes % 60} minutes left`
          : `${Math.floor(Math.abs(remainingMinutes) / 1440)} days, ${Math.floor((Math.abs(remainingMinutes) % 1440) / 60)} hours, ${Math.abs(remainingMinutes % 60)} minutes overdue`
        : "Not specified"}
      **Category**: ${task.category || "Not specified"}
      **Assigned To**: ${assignedUsers.map((user) => user.name).join(", ") || "No assignees"}
      **Progress**: ${(100 / subtasks.length) * activeStep}%`;

    navigator.clipboard.writeText(formattedMessage).then(() => {
      alert("Task details copied to clipboard!");
    });
  };

  useEffect(() => {
    const fetchSubtasks = async () => {
      try {
        const response = await api.get(`/tasks/get-task/${task._id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });

        let matchingOption = response.data.subtaskType || "visit";
        let fetchedSubtasks = response.data.subTasks || [];

        if (!response.data.subtaskType && fetchedSubtasks.length > 0) {
          matchingOption =
            Object.keys(predefinedSubtasks).find((option) => {
              const predefinedTitles = predefinedSubtasks[option].map((s) => s.title);
              const fetchedTitles = fetchedSubtasks.map((s) => s.title);
              return JSON.stringify(predefinedTitles) === JSON.stringify(fetchedTitles);
            }) || "visit";
        }

        if (fetchedSubtasks.length === 0) {
          fetchedSubtasks = predefinedSubtasks[matchingOption];
        }

        // Merge task-level fields into subtasks[0]
        fetchedSubtasks = fetchedSubtasks.map((subtask, index) =>
          index === 0
            ? {
              ...subtask,
              ontType: response.data.ontType || null,
              speed: response.data.speed || null,
              serviceRecipientInitial: response.data.serviceRecipientInitial || null,
              serviceRecipientQoS: response.data.serviceRecipientQoS || null,
            }
            : subtask
        );

        // Update subtasksByOption, checkpointsByOption, and additionalInfoByOption for the matching option
        setSubtasksByOption((prev) => ({
          ...prev,
          [matchingOption]: fetchedSubtasks,
        }));
        setCheckpointsByOption((prev) => ({
          ...prev,
          [matchingOption]: fetchedSubtasks.map((subtask) =>
            subtask.checkpoints ? subtask.checkpoints.map((cp) => ({
              ...cp,
              options: cp.options ? {
                ...cp.options,
                followUpQuestion: cp.options.followUpQuestion ? {
                  ...cp.options.followUpQuestion,
                  actionTaken: cp.options.followUpQuestion.actionTaken ? {
                    ...cp.options.followUpQuestion.actionTaken,
                    selected: cp.options.followUpQuestion.actionTaken.selected || null,
                  } : null,
                } : null,
                actionTaken: cp.options.actionTaken ? {
                  ...cp.options.actionTaken,
                  selected: cp.options.actionTaken.selected || null,
                } : null,
              } : null,
            })) : []
          ),
        }));
        setNotes((prevNotes) => ({
          ...prevNotes,
          [matchingOption]: fetchedSubtasks.map((subtask) => subtask.note || ""),
        }));
        setAdditionalInfoByOption((prev) => ({
          ...prev,
          [matchingOption]: {
            ontType: response.data.ontType || null,
            speed: response.data.speed || null,
            serviceRecipientInitial: response.data.serviceRecipientInitial || null,
            serviceRecipientQoS: response.data.serviceRecipientQoS || null,
          },
        }));

        setSelectedOption(matchingOption);
        setSubtasks(fetchedSubtasks);
        setCheckpoints(
          fetchedSubtasks.map((subtask) => (subtask.checkpoints ? subtask.checkpoints.map((cp) => ({
            ...cp,
            options: cp.options ? {
              ...cp.options,
              followUpQuestion: cp.options.followUpQuestion ? {
                ...cp.options.followUpQuestion,
                actionTaken: cp.options.followUpQuestion.actionTaken ? {
                  ...cp.options.followUpQuestion.actionTaken,
                  selected: cp.options.followUpQuestion.actionTaken.selected || null,
                } : null,
              } : null,
              actionTaken: cp.options.actionTaken ? {
                ...cp.options.actionTaken,
                selected: cp.options.actionTaken.selected || null,
              } : null,
            } : null,
          })) : []))
        );
        setAdditionalInfo({
          ontType: response.data.ontType || null,
          speed: response.data.speed || null,
          serviceRecipientInitial: response.data.serviceRecipientInitial || null,
          serviceRecipientQoS: response.data.serviceRecipientQoS || null,
        });

        const activeSteps = fetchedSubtasks.filter((subtask) => subtask.note !== "").length || 0;
        setActiveStep(activeSteps);
      } catch (error) {
        console.error("Error fetching subtasks:", error);
        setSelectedOption("visit");
        setSubtasks(predefinedSubtasks.visit);
        setCheckpoints(predefinedSubtasks.visit.map((subtask) => (subtask.checkpoints ? subtask.checkpoints.map((cp) => ({
          ...cp,
          options: cp.options ? {
            ...cp.options,
            followUpQuestion: cp.options.followUpQuestion ? {
              ...cp.options.followUpQuestion,
              actionTaken: cp.options.followUpQuestion.actionTaken ? {
                ...cp.options.followUpQuestion.actionTaken,
                selected: null,
              } : null,
            } : null,
            actionTaken: cp.options.actionTaken ? {
              ...cp.options.actionTaken,
              selected: null,
            } : null,
          } : null,
        })) : [])));
        setAdditionalInfo(additionalInfoByOption.visit);
      }
    };
    fetchSubtasks();
  }, [task._id, cancelState]);

  useEffect(() => {
    if (users.length > 0 && creatorColor.length === 0) {
      setCreatorColor(users.map((user) => ({ id: user._id, color: user.color })));
    }
  }, [users, creatorColor]);

  const handleAction = (action) => {
    handleMenuClose();
    if (action === "edit") setEditDialogOpen(true);
    if (action === "delete") handleTaskDelete(task._id);
    if (action === "favorite") handleFavoriteClick(task);
    if (action === "view") navigate(`/tasks/view-task/${task._id}`, { state: { from: location.pathname } });
    if (action === "archive") handleTaskArchive(task._id);
  };

  const handleNoteDialogOpen = () => {
    setNoteDialogOpen(true);
  };

  const handleNoteDialogClose = () => {
    setNoteDialogOpen(false);
    setCancelState((prev) => !prev);
    resetUIStates();
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleNoteChange = (subtaskIndex, value) => {
    const newNotes = [...notes[selectedOption]];
    newNotes[subtaskIndex] = value;
    setNotes((prevNotes) => ({
      ...prevNotes,
      [selectedOption]: newNotes,
    }));
    // Update subtasksByOption with the new note
    setSubtasksByOption((prev) => ({
      ...prev,
      [selectedOption]: prev[selectedOption].map((subtask, index) =>
        index === subtaskIndex ? { ...subtask, note: value } : subtask
      ),
    }));
    setSubtasks((prev) =>
      prev.map((subtask, index) => (index === subtaskIndex ? { ...subtask, note: value } : subtask))
    );
  };


  const handleReset = async () => {
    const confirmation = confirm("Are you sure you want to reset the subtasks and notes?");
    if (!confirmation) return;

    try {
      const resetSubtasks = predefinedSubtasks.original.map((subtask) => ({
        ...subtask,
        note: "",
        dateTime: null,
        checkpoints: subtask.checkpoints
          ? subtask.checkpoints.map((checkpoint) => ({
            ...checkpoint,
            checked: false,
            score: 0,
            options: checkpoint.options ? {
              ...checkpoint.options,
              selected: null,
              followUpQuestion: checkpoint.options.followUpQuestion ? {
                ...checkpoint.options.followUpQuestion,
                selected: null
              } : null
            } : null
          }))
          : [],
      }));

      // Reset all options including 'others'
      setSubtasksByOption((prev) => ({
        ...prev,
        original: resetSubtasks,
        others: predefinedSubtasks.others.map(subtask => ({
          ...subtask,
          note: "",
          dateTime: null,
          checkpoints: subtask.checkpoints ? subtask.checkpoints.map(cp => ({
            ...cp,
            checked: false,
            options: cp.options ? {
              ...cp.options,
              selected: null,
              value: ""
            } : null
          })) : []
        }))
      }));

      setCheckpointsByOption((prev) => ({
        ...prev,
        original: resetSubtasks.map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : [])),
        others: predefinedSubtasks.others.map(subtask =>
          subtask.checkpoints ? subtask.checkpoints.map(cp => ({
            ...cp,
            checked: false,
            options: cp.options ? {
              ...cp.options,
              selected: null,
              value: ""
            } : null
          })) : []
        )
      }));

      setNotes((prevNotes) => ({
        ...prevNotes,
        original: resetSubtasks.map(() => ""),
        others: predefinedSubtasks.others.map(() => "")
      }));

      setAdditionalInfoByOption((prev) => ({
        ...prev,
        original: {
          ontType: null,
          speed: null,
          serviceRecipientInitial: null,
          serviceRecipientQoS: null,
        },
        others: {
          ontType: null,
          speed: null,
          serviceRecipientInitial: null,
          serviceRecipientQoS: null,
        }
      }));

      setSubtasks(resetSubtasks);
      setCheckpoints(resetSubtasks.map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : [])));
      setAdditionalInfo({
        ontType: null,
        speed: null,
        serviceRecipientInitial: null,
        serviceRecipientQoS: null,
      });

      const response = await api.put(
        `/tasks/update-subtask/${task._id}`,
        {
          subtasks: resetSubtasks,
          notify: false,
          subtaskType: "original",
          ontType: null,
          speed: null,
          serviceRecipientInitial: null,
          serviceRecipientQoS: null,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.status === 200) {
        console.log("Subtasks reset successfully");
        handleNoteDialogClose();
      } else {
        console.error("Failed to reset subtasks");
      }
    } catch (error) {
      console.error("Error resetting subtasks:", error);
    }
  }



  const handleSaveNote = async (updatedSubtasks) => {
    try {
      const subtasksToSave = updatedSubtasks || subtasks.map((subtask, index) => ({
        ...subtask,
        note: notes[selectedOption][index] || "",
        dateTime: subtask.dateTime || new Date().toISOString(),
        checkpoints: checkpoints[index] ? checkpoints[index].map(cp => ({
          ...cp,
          options: cp.options ? {
            ...cp.options,
            followUpQuestion: cp.options.followUpQuestion ? {
              ...cp.options.followUpQuestion,
              selected: cp.options.followUpQuestion.selected || null
            } : null
          } : null
        })) : [],
        ...(index === 0
          ? {
            ontType: additionalInfo.ontType,
            speed: additionalInfo.speed,
            serviceRecipientInitial: additionalInfo.serviceRecipientInitial,
            serviceRecipientQoS: additionalInfo.serviceRecipientQoS,
          }
          : {}),
      }));

      const response = await api.put(
        `/tasks/update-subtask/${task._id}`,
        {
          subtasks: subtasksToSave,
          notify: false,
          subtaskType: selectedOption,
          ontType: additionalInfo.ontType,
          speed: additionalInfo.speed,
          serviceRecipientInitial: additionalInfo.serviceRecipientInitial,
          serviceRecipientQoS: additionalInfo.serviceRecipientQoS,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.status === 200) {
        setSubtasks(subtasksToSave);
        setSubtasksByOption((prev) => ({
          ...prev,
          [selectedOption]: subtasksToSave,
        }));
        setCheckpointsByOption((prev) => ({
          ...prev,
          [selectedOption]: checkpoints,
        }));
        setAdditionalInfoByOption((prev) => ({
          ...prev,
          [selectedOption]: {
            ontType: additionalInfo.ontType,
            speed: additionalInfo.speed,
            serviceRecipientInitial: additionalInfo.serviceRecipientInitial,
            serviceRecipientQoS: additionalInfo.serviceRecipientQoS,
          },
        }));
        setUpdateStateDuringSave((prev) => !prev);
        alert("Subtasks saved successfully!");
        resetUIStates(); // Reset UI state after successful save
        handleNoteDialogClose();
      }
    } catch (error) {
      console.error("Error updating subtasks:", error);
      alert("Failed to save subtasks. Please try again.");
    }
  };

  return (
    <>
      <Paper
        elevation={2}
        className="w-full p-5 rounded-lg border border-gray-400 hover:shadow-md transition-all duration-300"
        sx={{ backgroundColor: "#121111", borderRadius: isMobile ? 0 : "8px" }}
      >
        <Stack spacing={2} sx={{ height: "100%", justifyContent: "space-between" }}>
          <Stack>
            <div className="flex justify-between items-center">
              <Chip
                label={`${task?.priority} Priority`}
                sx={{
                  backgroundColor: "#414141",
                  color: "#ffffff",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              />

              <Stack direction="row">
                <Tooltip title="Copy Task Details">
                  <IconButton onClick={copyToClipboard} sx={{ color: "#ffffff" }}>
                    <FaRegCopy />
                  </IconButton>
                </Tooltip>
                <IconButton onClick={handleMenuOpen} sx={{ color: "#ffffff" }}>
                  <MoreVertIcon />
                </IconButton>
              </Stack>

              {user._id === task.createdBy._id || user._id === task.createdBy ? (
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      backgroundColor: "#2d2d2d",
                      color: "#ffffff",
                    },
                  }}
                >
                  <MenuItem onClick={() => handleAction("edit")}>
                    <ListItemIcon>
                      <EditIcon fontSize="small" sx={{ color: "#ffffff" }} />
                    </ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleAction("delete")}>
                    <ListItemIcon>
                      <DeleteIcon fontSize="small" sx={{ color: "#ffffff" }} />
                    </ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleAction("view")}>
                    <ListItemIcon>
                      <VisibilityIcon fontSize="small" sx={{ color: "#ffffff" }} />
                    </ListItemIcon>
                    <ListItemText>View</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleAction("favorite")}>
                    <ListItemIcon>
                      <FaStar size={16} color="#ffffff" />
                    </ListItemIcon>
                    <ListItemText>Add to favorite</ListItemText>
                  </MenuItem>
                  {user.role === "Admin" && (
                    <MenuItem onClick={() => handleAction("archive")}>
                      <ListItemIcon>
                        <IoMdMagnet size={16} color="#ffffff" />
                      </ListItemIcon>
                      <ListItemText>Archive</ListItemText>
                    </MenuItem>
                  )}
                </Menu>
              ) : (
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      backgroundColor: "#2d2d2d",
                      color: "#ffffff",
                    },
                  }}
                >
                  <MenuItem onClick={() => handleAction("view")}>
                    <ListItemIcon>
                      <VisibilityIcon fontSize="small" sx={{ color: "#ffffff" }} />
                    </ListItemIcon>
                    <ListItemText>View</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleAction("favorite")}>
                    <ListItemIcon>
                      <FaStar size={16} color="#ffffff" />
                    </ListItemIcon>
                    <ListItemText>Add to favorite</ListItemText>
                  </MenuItem>
                </Menu>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <h4 className="text-lg font-semibold text-[#bdb5b5]">{task?.slid}</h4>
              <div>{statusConfig[task?.status || "Todo"]?.icon}</div>
            </div>

            <div className="text-sm text-gray-300 mt-2 space-y-1">
              <p>
                <span className="font-medium text-[#bdb5b5]">Due Date: </span>
                {formattedDate}
                {activeStep !== subtasks.length && remainingMinutes !== null && (
                  <span className={`ml-2 ${remainingMinutes > 0 ? "text-green-600" : "text-red-600"}`}>
                    {remainingMinutes > 0
                      ? `${Math.floor(remainingMinutes / 1440)} days, ${Math.floor(
                        (remainingMinutes % 1440) / 60
                      )} hours, ${remainingMinutes % 60} minutes left`
                      : `${Math.floor(Math.abs(remainingMinutes) / 1440)} days, ${Math.floor(
                        (Math.abs(remainingMinutes) % 1440) / 60
                      )} hours, ${Math.abs(remainingMinutes % 60)} minutes overdue`
                    }
                  </span>
                )}
              </p>
              <p><span className="font-medium text-[#bdb5b5]">Category:</span> {task?.category}</p>
              <p><span className="font-medium text-[#bdb5b5]">Operation:</span> {task?.operation || 'N/A'}</p>
            </div>

            <div className="mt-3 flex items-center justify-start gap-4">
              <p className="text-sm text-[#bdb5b5] font-medium">Assigned To:</p>
              <AvatarGroup max={3} className="">
                {assignedUsers.length > 0 ? (
                  assignedUsers.map((user) => (
                    <Tooltip key={user._id} title={user.name}>
                      <Avatar
                        src={user.avatar}
                        sx={{
                          backgroundColor: creatorColor.find((user2) => user2.id === user._id)?.color || "#8D6E63",
                          fontSize: "12px",
                          width: 28,
                          height: 28,
                        }}
                      >
                        {!user.avatar ? user.name.slice(0, 2).toUpperCase() : null}
                      </Avatar>
                    </Tooltip>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs">No assignees</p>
                )}
              </AvatarGroup>
            </div>
          </Stack>
          <Stack>
            <div className="mt-3 text-xs text-gray-400">
              {user && (user._id === task.assignedTo[0]._id || user._id === task.assignedTo[0]) && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNoteDialogOpen}
                  sx={{ backgroundColor: "#01013d" }}
                >
                  <RiProgress4Fill size={20} className="mr-2" />
                  Manage Subtasks
                </Button>
              )}

              <div className="flex items-center gap-2 mt-4">
                <Avatar
                  sx={{
                    backgroundColor:
                      creatorColor.find((user) => user.id === task.createdBy._id || user.id === task.createdBy)
                        ?.color || "#8D6E63",
                    fontSize: "12px",
                    width: 28,
                    height: 28,
                  }}
                >
                  {creator.name?.slice(0, 2).toUpperCase()}
                </Avatar>
                <p>
                  <span className="font-medium text-[#bdb5b5]">Created By:</span> {creator.name || "Unknown"}
                </p>
              </div>
            </div>
          </Stack>
        </Stack>
      </Paper>

      <EditTaskDialog open={editDialogOpen} setOpen={setEditDialogOpen} task={task} handleTaskUpdate={handleTaskUpdate} />

      <Dialog
        open={noteDialogOpen}
        onClose={handleNoteDialogClose}
        fullScreen
        PaperProps={{
          sx: {
            backgroundColor: "#2d2d2d",
            color: "#ffffff",
            width: "100%",
            maxWidth: "none",
          }
        }}

      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#2d2d2d",
            color: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            padding: "16px 24px",
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}
        >
          <Typography variant="h6" component="div">
            Manage Subtasks - {task.slid}
          </Typography>
          <IconButton
            onClick={handleNoteDialogClose}
            sx={{
              color: "#ffffff",
              "&:hover": {
                backgroundColor: "#2a2a2a",
              },
            }}
          >
            <MdClose />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ padding: 0 }}>
          <RadioGroup row value={selectedOption} onChange={handleOptionChange} sx={{ padding: 2 }}>
            {Object.keys(predefinedSubtasks).map((option) => (
              <FormControlLabel
                key={option}
                value={option}
                control={<Radio />}
                label={option === "no_answer" ? "No Answer" :
                  option === "others" ? "Others" :
                    option.charAt(0).toUpperCase() + option.slice(1)}
              />
            ))}
          </RadioGroup>
          <SubtaskManager
            subtasks={subtasks}
            notes={notes[selectedOption]}
            setNotes={setNotes}
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            handleBack={handleBack}
            handleSaveNote={handleSaveNote}
            handleReset={handleReset}
            expandedNotes={expandedNotes}
            setExpandedNotes={setExpandedNotes}
            toggleNoteExpand={toggleNoteExpand}
            checkpoints={checkpoints}
            setCheckpoints={setCheckpoints}
            handleCheckpointToggle={handleCheckpointToggle}
            // handleScoreChange={handleScoreChange}
            handleOptionChange={handleOptionChange}
            selectedTaskId={task._id}
            selectedOption={selectedOption}
            handleNoteChange={handleNoteChange}
            setSubtasks={setSubtasks}
            additionalInfo={additionalInfo}
            setAdditionalInfo={setAdditionalInfo}
          />
        </DialogContent>

        <DialogActions
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            backgroundColor: "#2d2d2d",
            borderTop: "1px solid #e5e7eb",
            position: "sticky",
            bottom: 0,
            zIndex: 1,
          }}
        >
          <Button
            onClick={handleReset}
            sx={{
              color: "#f44336",
              "&:hover": {
                backgroundColor: "rgba(244, 67, 54, 0.1)",
              },
            }}
          >
            Reset
          </Button>
          <Box sx={{ display: "flex", gap: "8px" }}>
            <Button
              onClick={handleNoteDialogClose}
              sx={{
                color: "#ffffff",
                "&:hover": {
                  backgroundColor: "#2a2a2a",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSaveNote()}
              sx={{
                backgroundColor: "#4caf50",
                color: "#ffffff",
                "&:hover": {
                  backgroundColor: "#388e3c",
                },
              }}
            >
              Save
            </Button>
          </Box>
        </DialogActions>
      </Dialog >
    </>
  );
};

export default TaskCard;