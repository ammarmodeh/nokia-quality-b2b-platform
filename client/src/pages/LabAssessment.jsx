import PageHeader from "../components/ui/PageHeader";
import { tok } from "../theme/tokens";
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  MenuItem,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Autocomplete,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  AlertTitle,
  InputAdornment,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Assessment as AssessmentIcon,
  ListAlt as ListAltIcon,
  BarChart as BarChartIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Build as BuildIcon,
  Speed as SpeedIcon,
  Router as RouterIcon,
  School as SchoolIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  SettingsInputComponent as SettingsIcon,
  Info as InfoIcon,
  RestartAlt as ResetIcon,
  DoneAll as DoneAllIcon,
  Warning as WarningIcon,
  PhotoCamera as PhotoCameraIcon,
  Person as PersonIcon,
  WorkspacePremium as CertificateIcon,
  FileDownload as FileDownloadIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  VerifiedUser as VerifiedUserIcon,
  FilterList as FilterListIcon,
  EmojiEvents as EmojiEventsIcon,
  Engineering as EngineeringIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from "@mui/icons-material";
import api from "../api/api";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import LabAssessmentDetailModal from "../components/LabAssessmentDetailModal";
import {
  exportMasterLabAssessmentReport,
  exportIndividualLabAssessmentReport,
} from "../utils/labAssessmentExcelExport";
import { exportArabicLabAssessmentPDF } from "../utils/labAssessmentArabicPdf";

// Initial default sections & checkpoints for E2E FTTH Practical Assessment
export const getInitialSections = () => [
  {
    sectionId: "sec-1",
    sectionTitle: "1. FDB – Fiber Splicing & Fiber Management",
    checkpoints: [
      {
        id: "cp-1-1",
        subSection: "A. Power Measurement & Splitter Verification",
        name: "Measure optical power received from selected splitter port before starting installation",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-1-2-theo",
        subSection: "A. Power Measurement & Splitter Verification",
        name: "Record measured optical power and determine whether within theoretical acceptable range (-16 to -19 dBm)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-1-2-prac",
        subSection: "A. Power Measurement & Splitter Verification",
        name: "Record measured optical power and determine whether within practical acceptable range (-16 to -22 or -23 dBm)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-1-4",
        subSection: "B. New Drop Fiber Installation",
        name: "Properly perform fusion splicing between pigtail and outdoor drop fiber (black)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-1-route-pigtail",
        subSection: "B. New Drop Fiber Installation",
        name: "Properly route and organize pigtail inside cassette/raceway without excessive bending, tension, or crossing",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-1-route-outdoor",
        subSection: "B. New Drop Fiber Installation",
        name: "Properly route and organize outdoor drop fiber inside cassette/raceway without excessive bending, tension, or crossing",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-1-label-pigtail",
        subSection: "B. New Drop Fiber Installation",
        name: "Install required label on Pigtail (Splitter port / identification label)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-1-label-outdoor",
        subSection: "B. New Drop Fiber Installation",
        name: "Install required label on Outdoor drop fiber cable (black)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-1-7",
        subSection: "B. New Drop Fiber Installation",
        name: "Ensure splice is properly protected with sleeve and securely positioned",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-1-8",
        subSection: "C. Existing Drop Fiber Handling",
        name: "Identify required existing drop fiber and carefully extract/reposition from raceway without disturbing others",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-1-9",
        subSection: "C. Existing Drop Fiber Handling",
        name: "Maintain proper fiber organization, avoid cassette deformation, and return fibers to correct position",
        status: "Pass",
        score: 5,
        notes: "",
      },
    ],
  },
  {
    sectionId: "sec-2",
    sectionTitle: "2. BEP – Outdoor/Indoor Fiber Splicing",
    checkpoints: [
      {
        id: "cp-2-1",
        subSection: "BEP Splicing & Management",
        name: "Perform fusion splicing between Outdoor drop fiber (black) and Indoor drop fiber (white)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-2-2",
        subSection: "BEP Splicing & Management",
        name: "Properly organize and route fiber inside BEP according to required installation standard",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-2-3",
        subSection: "BEP Splicing & Management",
        name: "Avoid excessive bending, tension, or unnecessary fiber loops, and properly secure fiber/cable",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-2-label-outdoor",
        subSection: "BEP Labeling",
        name: "Apply required label on Outdoor drop fiber (black) at BEP (clear, readable, correct position)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-2-label-indoor",
        subSection: "BEP Labeling",
        name: "Apply required label on Indoor drop fiber (white) at BEP (clear, readable, correct position)",
        status: "Pass",
        score: 5,
        notes: "",
      },
    ],
  },
  {
    sectionId: "sec-3",
    sectionTitle: "3. OTO – Splicing, Fiber Management & Optical Testing",
    checkpoints: [
      {
        id: "cp-3-1",
        subSection: "A. Splicing",
        name: "Perform fusion splicing between indoor drop fiber and built-in OTO pigtail",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-3-2",
        subSection: "A. Splicing",
        name: "Properly protect and position splice, organize fiber inside OTO without excessive bending or tension",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-3-3",
        subSection: "B. Labeling",
        name: "Apply required identification label to OTO cover (correctly positioned and readable)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-3-4",
        subSection: "C. Optical Testing",
        name: "Connect patch cord from OTO to optical power meter and perform required optical test",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-3-5",
        subSection: "C. Optical Testing",
        name: "Measure link loss, record value, and verify within acceptable range (at max 2 dB difference from FDB splitter Rx power)",
        status: "Pass",
        score: 5,
        notes: "",
      },
    ],
  },
  {
    sectionId: "sec-4",
    sectionTitle: "4. ONT – Installation, Configuration & Service Activation",
    checkpoints: [
      // ZTE F6600P
      {
        id: "cp-4-zte-int",
        subSection: "A. ZTE F6600P Configuration",
        name: "ZTE F6600P – Power on ONT and enter required INT number in the appropriate field",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-4-zte-wan",
        subSection: "A. ZTE F6600P Configuration",
        name: "ZTE F6600P – Configure required WAN connection information correctly",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-4-zte-wifi",
        subSection: "A. ZTE F6600P Configuration",
        name: "ZTE F6600P – Configure Wi-Fi settings separately: 2.4 GHz & 5 GHz (SSIDs & Passwords)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-4-zte-optical",
        subSection: "A. ZTE F6600P Configuration",
        name: "ZTE F6600P – Check & verify received optical signal level",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-4-zte-led",
        subSection: "A. ZTE F6600P Service Verification",
        name: "ZTE F6600P – Understand and explain ONT LED behavior & status indicators (e.g. PON LED solid green, flashing, LOS red, Internet/WAN & Wi-Fi LEDs)",
        status: "Pass",
        score: 5,
        notes: "",
      },

      // Nokia G-2426G-P (Wi-Fi 6)
      {
        id: "cp-4-nokia6-int",
        subSection: "B. Nokia G-2426G-P (Wi-Fi 6) Configuration",
        name: "Nokia G-2426G-P – Power on ONT and enter required INT number in the appropriate field",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-4-nokia6-fw",
        subSection: "B. Nokia G-2426G-P (Wi-Fi 6) Configuration",
        name: "For Nokia G-2426G-P only: Manually upload firmware version 62 and verify automatic restart before continuing configuration",
        status: "Pass",
        score: 5,
        notes: "Mandatory firmware v62 upload step for Nokia Wi-Fi 6",
      },
      {
        id: "cp-4-nokia6-wan",
        subSection: "B. Nokia G-2426G-P (Wi-Fi 6) Configuration",
        name: "Nokia G-2426G-P – Configure required WAN connection information correctly",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-4-nokia6-wifi",
        subSection: "B. Nokia G-2426G-P (Wi-Fi 6) Configuration",
        name: "Nokia G-2426G-P – Configure Wi-Fi settings separately: 2.4 GHz & 5 GHz (SSIDs & Passwords)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-4-nokia6-optical",
        subSection: "B. Nokia G-2426G-P (Wi-Fi 6) Configuration",
        name: "Nokia G-2426G-P – Check & verify received optical signal level",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-4-nokia6-led",
        subSection: "B. Nokia G-2426G-P (Wi-Fi 6) Service Verification",
        name: "Nokia G-2426G-P – Understand and explain ONT LED behavior & status indicators (e.g. PON LED solid green, flashing, LOS red, Internet/WAN & Wi-Fi LEDs)",
        status: "Pass",
        score: 5,
        notes: "",
      },

      // Nokia G-140W-H (Wi-Fi 5)
      {
        id: "cp-4-nokia5-wan",
        subSection: "C. Nokia G-140W-H (Wi-Fi 5) Configuration",
        name: "Nokia G-140W-H – Configure required WAN connection information correctly",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-4-nokia5-wifi",
        subSection: "C. Nokia G-140W-H (Wi-Fi 5) Configuration",
        name: "Nokia G-140W-H – Configure Wi-Fi settings separately: 2.4 GHz & 5 GHz (SSIDs & Passwords)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-4-nokia5-optical",
        subSection: "C. Nokia G-140W-H (Wi-Fi 5) Configuration",
        name: "Nokia G-140W-H – Check & verify received optical signal level",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-4-nokia5-led",
        subSection: "C. Nokia G-140W-H (Wi-Fi 5) Service Verification",
        name: "Nokia G-140W-H – Understand and explain ONT LED behavior & status indicators (e.g. PON LED solid green, flashing, LOS red, Internet/WAN & Wi-Fi LEDs)",
        status: "Pass",
        score: 5,
        notes: "",
      },

      // ONT Labeling
      {
        id: "cp-4-label-callcenter",
        subSection: "D. ONT Labeling (Shared Requirement)",
        name: "Apply required Call Center & INT number label on ONT (clearly visible to customer)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-4-label-noreset",
        subSection: "D. ONT Labeling (Shared Requirement)",
        name: "Apply required NO RESET label on ONT (placed directly over/near reset-hole area, clearly visible to customer)",
        status: "Pass",
        score: 5,
        notes: "",
      },
    ],
  },
  {
    sectionId: "sec-5",
    sectionTitle: "5. Assistant Tools & Mobile Applications",
    checkpoints: [
      {
        id: "cp-5-ookla",
        subSection: "A. Ookla Speedtest App",
        name: "Verify team smartphone has Ookla Speedtest application installed and properly configured (server selection, accurate testing standard)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-5-wifimeter",
        subSection: "B. Wi-Fi Signal Meter",
        name: "Verify team smartphone has Wi-Fi Signal Meter / Analyzer application installed and configured to measure 2.4 GHz & 5 GHz coverage and signal strength",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-5-timestamp",
        subSection: "C. Timestamp Camera App",
        name: "Verify team smartphone has Timestamp Camera application installed with correct date, time, and GPS coordinates configuration for photo evidence",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-5-laptop-1gbps",
        subSection: "D. 1 Gbps-Capable Laptop",
        name: "1 Gbps-capable laptop: Team must have a laptop with a 1 Gbps or higher Ethernet/network interface capable of performing and verifying high-speed internet speed tests.",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-5-wifi6-device",
        subSection: "E. High-Speed Wi-Fi Device",
        name: "High-speed Wi-Fi device: Team must have a Wi-Fi 6–capable laptop or mobile device capable of measuring and verifying high-speed Wi-Fi performance, particularly for services delivered through Wi-Fi 6 routers.",
        status: "Pass",
        score: 5,
        notes: "",
      },
    ],
  },
  {
    sectionId: "sec-6",
    sectionTitle: "6. Customer Education",
    checkpoints: [
      {
        id: "cp-6-1",
        subSection: "A. Wi-Fi Education",
        name: "Explain difference between 2.4 GHz and 5 GHz Wi-Fi (advantages, limitations, distance vs speed)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-6-2",
        subSection: "B. 3-Point Speed Test",
        name: "Explain and demonstrate/perform required 3-point speed test per project procedure",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-6-3",
        subSection: "C. ONT / Service Handling",
        name: "Clearly explain NOT to reset ONT and that pressing reset removes configuration & interrupts service",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-6-4",
        subSection: "D. Customer Support Routing",
        name: "Educate customer on support routing: Call Center (Sales/Billing/Accounts) vs Tech Team (Internet/Speed/Issues)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-6-5",
        subSection: "E. CX Follow-Up Call",
        name: "Inform customer of CX follow-up call after ~48h and explain CSAT satisfaction scale (1–8 Unsatisfied, 9–10 Satisfied)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-6-6",
        subSection: "F. Additional Service Education",
        name: "Educate customer on expected performance for IPTV, VPN, PlayStation/Sony servers, and server speed differences",
        status: "Pass",
        score: 5,
        notes: "",
      },
    ],
  },
  {
    sectionId: "sec-7",
    sectionTitle: "7. Quality Ticket Awareness",
    checkpoints: [
      {
        id: "cp-7-1",
        subSection: "Ticket Types & SLAs",
        name: "Demonstrate clear understanding of NPS Ticket (SLA: 24 hours) and CC Ticket (SLA: 9 hours)",
        status: "Pass",
        score: 5,
        notes: "",
      },
      {
        id: "cp-7-2",
        subSection: "SLA Compliance & Escalation",
        name: "Demonstrate understanding of timely corrective action within SLA and proper escalation when SLA is at risk",
        status: "Pass",
        score: 5,
        notes: "",
      },
    ],
  },
  {
    sectionId: "sec-8",
    sectionTitle: "8. Self-Assessment & Photo Documentation",
    checkpoints: [
      {
        id: "cp-8-photos-self-assess",
        subSection: "Step-by-Step Installation Photo Verification & Quality Self-Assessment",
        name: "Capture complete, clear Timestamp photo evidence for every step (FDB splicing & labels, BEP splicing & labels, OTO splicing & cover label, ONT installation & labels, Speedtest result, and Wi-Fi signal meter) to thoroughly self-assess installation quality",
        type: "points",
        status: "Pass",
        maxScore: 10,
        score: 10,
        notes: "",
      },
    ],
  },
  {
    sectionId: "sec-9",
    sectionTitle: "9. Communication & Professional Behaviour",
    checkpoints: [
      {
        id: "cp-9-comm-behaviour",
        subSection: "Overall Communication & Behaviour Assessment",
        name: "Overall Communication & Behaviour Rating — Evaluate the technician's professional conduct: greeting & personal appearance, clarity of communication with the customer, respectful & courteous behaviour, ability to explain work steps, and handling of questions or complaints professionally",
        type: "points",
        status: "Pass",
        maxScore: 10,
        score: 10,
        notes: "",
      },
    ],
  },
];

export const CERTIFICATE_DEFINITIONS = [
  { key: "dd", code: "DD", title: "Defensive Driving", description: "Safe vehicle operation, hazard perception & driving compliance" },
  { key: "es", code: "ES", title: "Electrical Safety", description: "Safe handling of electrical sources, grounding & arc flash prevention" },
  { key: "fa", code: "FA", title: "First Aid", description: "Emergency first response, CPR & basic trauma management" },
  { key: "ff", code: "FF", title: "Fire Fighting", description: "Fire extinguisher operation, fire risk prevention & evacuation" },
  { key: "ra", code: "RA", title: "Risk Assessment", description: "Job site hazard identification, risk evaluation & control measures" },
  { key: "wah", code: "WAH", title: "Work at Height", description: "Ladder safety, harness usage, pole climbing & fall arrest systems" },
];

export const formatExperienceDuration = (years = 0, months = 0, days = 0, fallbackTotal) => {
  const y = parseInt(years, 10) || 0;
  const m = parseInt(months, 10) || 0;
  const d = parseInt(days, 10) || 0;
  if (y === 0 && m === 0 && d === 0 && fallbackTotal !== undefined && fallbackTotal !== null) {
    const num = parseFloat(fallbackTotal);
    if (!isNaN(num) && num > 0) {
      const fullYears = Math.floor(num);
      const remMonths = Math.round((num - fullYears) * 12);
      const parts = [];
      if (fullYears > 0) parts.push(`${fullYears} ${fullYears === 1 ? "Year" : "Years"}`);
      if (remMonths > 0) parts.push(`${remMonths} ${remMonths === 1 ? "Month" : "Months"}`);
      return parts.join(", ") || "0 Days";
    }
  }
  const parts = [];
  if (y > 0) parts.push(`${y} ${y === 1 ? "Year" : "Years"}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? "Month" : "Months"}`);
  if (d > 0) parts.push(`${d} ${d === 1 ? "Day" : "Days"}`);
  return parts.length > 0 ? parts.join(", ") : "0 Days";
};

const initialEquipmentList = [
  { toolName: "Splicing Machine", status: "Valid", notes: "" },
  { toolName: "Fiber Cleaver", status: "Valid", notes: "" },
  { toolName: "Fiber Stripper", status: "Valid", notes: "" },
  { toolName: "Optical Power Meter", status: "Valid", notes: "" },
  { toolName: "Laser Source", status: "Valid", notes: "" },
  { toolName: "Cleaning Solution – IPA 99%", status: "Available", notes: "" },
  { toolName: "Lint-Free Cotton Swab / Ear Stick", status: "Available", notes: "" },
  { toolName: "Fiber Wipes", status: "Available", notes: "" },
  { toolName: "Cleaning Brush", status: "Available", notes: "" },
  { toolName: "Protection Sleeve – 60 mm", status: "Available", notes: "" },
  { toolName: "Protection Sleeve – 40 mm", status: "Available", notes: "" },
];

const LabAssessment = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [activeTab, setActiveTab] = useState(0);
  const [fieldTeams, setFieldTeams] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);
  const [experienceMonths, setExperienceMonths] = useState(0);
  const [experienceDays, setExperienceDays] = useState(0);
  const [employmentType, setEmploymentType] = useState("Subcontractor");
  const [certificates, setCertificates] = useState({
    dd: false,
    es: false,
    fa: false,
    ff: false,
    ra: false,
    wah: false,
  });
  const [feedback, setFeedback] = useState("");

  // Live Calculated Age derived from Date of Birth and Assessment Date
  const calculatedAge = useMemo(() => {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    const ref = assessmentDate ? new Date(assessmentDate) : new Date();
    if (isNaN(birth.getTime())) return null;
    let a = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) a--;
    return a >= 0 ? a : null;
  }, [dateOfBirth, assessmentDate]);

  // Equipment Checklist & Sections Checkpoints
  const [equipmentList, setEquipmentList] = useState(initialEquipmentList);
  const [sections, setSections] = useState(getInitialSections());

  // Dialogs
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAssessmentForDetail, setSelectedAssessmentForDetail] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState(null);
  const [deletingAssessment, setDeletingAssessment] = useState(false);

  // Tracking Filter & Search
  const [trackingFilter, setTrackingFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Settings
  const [settings, setSettings] = useState(null);

  const colors = {
    background: tok('--bg'),
    surface: tok('--surface'),
    border: tok('--border'),
    primary: tok('--accent'),
    textPrimary: tok('--text'),
    textSecondary: tok('--text-secondary'),
    success: tok('--success'),
    error: tok('--danger'),
    warning: tok('--warning'),
    info: tok('--info'),
  };

  useEffect(() => {
    fetchTeams();
    fetchAssessments();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get("/settings");
      setSettings(response.data);
    } catch (error) {
      console.error("Failed to fetch settings");
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await api.get("/field-teams/get-field-teams");
      setFieldTeams(response.data || []);
    } catch (error) {
      toast.error("Failed to fetch field teams");
    }
  };

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const response = await api.get("/lab-assessments");
      setAssessments(response.data || []);
    } catch (error) {
      toast.error("Failed to fetch lab assessments");
    } finally {
      setLoading(false);
    }
  };

  // Live score calculation
  const liveScoreStats = useMemo(() => {
    let totalScore = 0;
    let maxScore = 0;

    sections.forEach((sec) => {
      if (sec.sectionId === "sec-7") return; // Quality Ticket Awareness is informational, no pass/fail calculation
      sec.checkpoints.forEach((cp) => {
        if (cp.status !== "N/A") {
          const isPointsSec = sec.sectionId === "sec-8" || sec.sectionId === "sec-9" || sec.sectionTitle?.includes("Photo") || sec.sectionTitle?.includes("Self-Assessment") || sec.sectionTitle?.includes("Communication") || cp.id === "cp-8-photos-self-assess" || cp.id === "cp-9-comm-behaviour";
          const cpMax = isPointsSec ? (cp.maxScore || 10) : (cp.maxScore || 5);
          maxScore += cpMax;
          const cpScore = cp.score !== undefined ? cp.score : (cp.status === "Pass" ? cpMax : 0);
          totalScore += Math.min(cpMax, Math.max(0, Number(cpScore)));
        }
      });
    });

    const percentage = maxScore > 0 ? Math.min(100, Math.round((totalScore / maxScore) * 100)) : 100;
    return { totalScore, maxScore, percentage };
  }, [sections]);

  // Calculate live section stats
  const getSectionStats = (sec) => {
    if (sec.sectionId === "sec-7") {
      return { isInformational: true, percentage: 100, isPass: true, label: "Awareness & Information (No Pass/Fail)" };
    }
    let totalScore = 0;
    let maxScore = 0;
    const isSec8 = sec.sectionId === "sec-8" || sec.sectionId === "sec-9" || sec.sectionTitle?.includes("Photo") || sec.sectionTitle?.includes("Self-Assessment") || sec.sectionTitle?.includes("Communication");
    sec.checkpoints.forEach((cp) => {
      if (cp.status !== "N/A") {
        const cpMax = isSec8 ? 10 : (cp.maxScore || 5);
        maxScore += cpMax;
        const cpScore = cp.score !== undefined ? cp.score : (cp.status === "Pass" ? cpMax : 0);
        totalScore += Math.min(cpMax, Math.max(0, Number(cpScore)));
      }
    });
    const percentage = maxScore > 0 ? Math.min(100, Math.round((totalScore / maxScore) * 100)) : 100;
    const isPass = percentage >= 70;
    return { totalScore, maxScore, percentage, isPass, isInformational: false };
  };

  // Calculate Tools & Equipment Matrix stats
  const equipmentStats = useMemo(() => {
    let validCount = 0;
    let totalCount = equipmentList.length;
    equipmentList.forEach((item) => {
      if (item.status === "Valid" || item.status === "Available") {
        validCount += 1;
      } else if (item.status === "Need Maintenance") {
        validCount += 0.5;
      }
    });
    const percentage = totalCount > 0 ? Math.round((validCount / totalCount) * 100) : 100;
    const isPass = percentage >= 70;
    return { validCount, totalCount, percentage, isPass };
  }, [equipmentList]);

  const getAssessmentStatus = (score) => {
    const s = Number(score) || 0;
    if (s >= 90) return { label: "Excellent (Pass)", color: "#00e676", isPass: true, tier: "90-100" };
    if (s >= 80) return { label: "V.Good (Pass)", color: "#4caf50", isPass: true, tier: "80-89" };
    if (s >= 70) return { label: "Need improvements, and close monitoring (Pass)", color: "#fbc02d", isPass: true, tier: "70-79" };
    if (s >= 50) return { label: "Suspension, need training, then re-evaluate the team (Fail)", color: "#ff9800", isPass: false, tier: "50-69" };
    return { label: "Ineligible (Fail)", color: "#f44336", isPass: false, tier: "0-49" };
  };

  // Checkpoint changes: Status & Points (0 to 5 for sec 1-7, 0 to 10 for sec 8)
  const handleCheckpointStatusChange = (sectionIndex, checkpointIndex, newStatus) => {
    setSections((prev) => {
      const newSections = JSON.parse(JSON.stringify(prev));
      const sec = newSections[sectionIndex];
      const cp = sec.checkpoints[checkpointIndex];
      const isSec8 = sec?.sectionId === "sec-8" || sec?.sectionTitle?.includes("Photo") || sec?.sectionTitle?.includes("Self-Assessment") || cp.id === "cp-8-photos-self-assess";
      const cpMax = isSec8 ? 10 : 5;
      cp.status = newStatus;
      cp.maxScore = cpMax;
      if (newStatus === "Pass") {
        cp.score = (cp.score !== undefined && cp.score >= (isSec8 ? 7 : 4)) ? cp.score : cpMax;
      } else if (newStatus === "Fail") {
        cp.score = (cp.score !== undefined && cp.score < (isSec8 ? 7 : 4)) ? cp.score : 0;
      } else {
        cp.score = 0;
      }
      return newSections;
    });
  };

  const handleCheckpointScoreChange = (sectionIndex, checkpointIndex, newScore) => {
    setSections((prev) => {
      const newSections = JSON.parse(JSON.stringify(prev));
      const sec = newSections[sectionIndex];
      const cp = sec.checkpoints[checkpointIndex];
      const isSec8 = sec?.sectionId === "sec-8" || sec?.sectionTitle?.includes("Photo") || sec?.sectionTitle?.includes("Self-Assessment") || cp.id === "cp-8-photos-self-assess";
      const cpMax = isSec8 ? 10 : 5;
      const passThreshold = isSec8 ? 7 : 4;
      const val = Math.max(0, Math.min(cpMax, Number(newScore) || 0));
      cp.score = val;
      cp.maxScore = cpMax;
      cp.status = val >= passThreshold ? "Pass" : "Fail";
      return newSections;
    });
  };

  const handleCheckpointNotesChange = (sectionIndex, checkpointIndex, notes) => {
    setSections((prev) => {
      const newSections = JSON.parse(JSON.stringify(prev));
      if (newSections[sectionIndex]?.checkpoints?.[checkpointIndex]) {
        newSections[sectionIndex].checkpoints[checkpointIndex].notes = notes;
      }
      return newSections;
    });
  };

  const handleEquipmentChange = (index, field, value) => {
    setEquipmentList((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleTeamSelection = (newValue) => {
    setSelectedTeam(newValue);
    if (newValue) {
      const dobStr = newValue.dateOfBirth ? new Date(newValue.dateOfBirth).toISOString().split("T")[0] : "";
      setDateOfBirth(dobStr);
      setExperienceYears(newValue.experienceYears !== undefined ? newValue.experienceYears : (newValue.yearsOfExperience ? Math.floor(Number(newValue.yearsOfExperience)) : 0));
      setExperienceMonths(newValue.experienceMonths !== undefined ? newValue.experienceMonths : (newValue.yearsOfExperience ? Math.round((Number(newValue.yearsOfExperience) % 1) * 12) : 0));
      setExperienceDays(newValue.experienceDays !== undefined ? newValue.experienceDays : 0);
      setEmploymentType(newValue.employmentType || "Subcontractor");
      setCertificates(
        newValue.certificates || {
          dd: false,
          es: false,
          fa: false,
          ff: false,
          ra: false,
          wah: false,
        }
      );
    } else {
      setDateOfBirth("");
      setExperienceYears(0);
      setExperienceMonths(0);
      setExperienceDays(0);
      setEmploymentType("Subcontractor");
      setCertificates({ dd: false, es: false, fa: false, ff: false, ra: false, wah: false });
    }
  };

  const handleCertificateToggle = (key) => {
    setCertificates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetForm = () => {
    setSelectedTeam(null);
    setAssessmentDate(new Date().toISOString().split("T")[0]);
    setDateOfBirth("");
    setExperienceYears(0);
    setExperienceMonths(0);
    setExperienceDays(0);
    setEmploymentType("Subcontractor");
    setCertificates({ dd: false, es: false, fa: false, ff: false, ra: false, wah: false });
    setFeedback("");
    setEquipmentList(initialEquipmentList);
    setSections(getInitialSections());
    setIsEditing(false);
    setEditingId(null);
  };

  const normalizeSectionsForEdit = (existingSections) => {
    const defaultSections = getInitialSections();
    if (!existingSections || !Array.isArray(existingSections) || existingSections.length === 0) {
      return defaultSections;
    }

    return defaultSections.map((defSec, sIdx) => {
      // Match section by sectionId, trimmed title, or exact index
      const matchedSec = existingSections.find(
        (es) => es.sectionId === defSec.sectionId || es.sectionTitle?.trim() === defSec.sectionTitle?.trim()
      ) || existingSections[sIdx];

      if (!matchedSec) {
        return defSec;
      }

      const isSec8 = defSec.sectionId === "sec-8" || defSec.sectionTitle?.includes("Photo") || defSec.sectionTitle?.includes("Self-Assessment");

      // Match checkpoints strictly by id, exact name, or exact index (NEVER by subSection to avoid duplication)
      const mergedCheckpoints = defSec.checkpoints.map((defCp, cpIdx) => {
        const matchedCp = matchedSec.checkpoints?.find(
          (ecp) => (ecp.id && ecp.id === defCp.id) || (ecp.name && ecp.name.trim() === defCp.name.trim())
        ) || matchedSec.checkpoints?.[cpIdx];

        const cpMax = isSec8 ? 10 : 5;
        const passThreshold = isSec8 ? 7 : 4;

        if (!matchedCp) {
          return {
            ...defCp,
            id: defCp.id,
            name: defCp.name,
            subSection: defCp.subSection,
            maxScore: cpMax,
            score: cpMax,
            status: "Pass",
            notes: "",
          };
        }

        let scoreVal = matchedCp.score;
        let statusVal = matchedCp.status || "Pass";

        if (scoreVal === undefined || scoreVal === null) {
          scoreVal = statusVal === "Pass" ? cpMax : 0;
        } else {
          scoreVal = Math.min(cpMax, Math.max(0, Number(scoreVal) || 0));
        }

        if (statusVal !== "N/A") {
          statusVal = scoreVal >= passThreshold ? "Pass" : "Fail";
        }

        return {
          ...defCp,
          id: defCp.id,
          name: defCp.name, // ALWAYS enforce official unique checkpoint criteria
          subSection: defCp.subSection, // ALWAYS enforce official unique subSection
          maxScore: cpMax,
          score: scoreVal,
          status: statusVal,
          notes: matchedCp.notes || "",
        };
      });

      return {
        ...defSec,
        sectionId: defSec.sectionId,
        sectionTitle: defSec.sectionTitle,
        checkpoints: mergedCheckpoints,
      };
    });
  };

  const [searchParams] = useSearchParams();
  const urlEditId = searchParams.get("editId") || searchParams.get("id");

  // Auto load assessment if editId or id is in query params
  useEffect(() => {
    if (urlEditId) {
      if (assessments.length > 0) {
        const target = assessments.find((a) => a._id === urlEditId);
        if (target) {
          handleEditAssessment(target);
          return;
        }
      }
      // If not yet in assessments list, fetch directly from backend API
      api.get(`/lab-assessments/${urlEditId}`)
        .then((res) => {
          if (res.data) {
            handleEditAssessment(res.data);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch assessment by editId:", err);
        });
    }
  }, [urlEditId, assessments]);

  const handleSubmit = async () => {
    if (!selectedTeam) {
      toast.error("Please select a Field Team");
      return;
    }

    const totalExp = Number((Number(experienceYears || 0) + Number(experienceMonths || 0) / 12 + Number(experienceDays || 0) / 365).toFixed(2));

    // Compute dynamic section scores map
    const computedSectionScores = {};
    sections.forEach((sec) => {
      let totalScore = 0;
      let maxScore = 0;
      let isPoints = false;
      sec.checkpoints.forEach((cp) => {
        if (cp.status !== "N/A") {
          const cpIsPoints = cp.type === "points" || cp.maxScore === 10 || sec.sectionId === "sec-8" || sec.sectionTitle?.includes("Photo") || sec.sectionTitle?.includes("Self-Assessment") || cp.id === "cp-8-photos-self-assess";
          const cpMax = cp.maxScore || (cpIsPoints ? 10 : 5);
          maxScore += cpMax;
          if (cpIsPoints) {
            isPoints = true;
            totalScore += Number(cp.score !== undefined ? cp.score : cpMax);
          } else {
            if (cp.status === "Pass") totalScore += Number(cp.score !== undefined ? cp.score : cpMax);
            else if (cp.status === "Fail") totalScore += Number(cp.score > 0 && cp.score < cpMax ? cp.score : 0);
          }
        }
      });
      const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;
      const key = sec.sectionId ? sec.sectionId.replace("sec-", "section") : "section";
      computedSectionScores[key] = isPoints ? totalScore : pct;
    });

    const payload = {
      fieldTeamId: selectedTeam._id,
      fieldTeamName: selectedTeam.teamName,
      conductedBy: user?.name || "Assessor",
      assessmentDate: new Date(assessmentDate),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      age: calculatedAge,
      experienceYears: Number(experienceYears) || 0,
      experienceMonths: Number(experienceMonths) || 0,
      experienceDays: Number(experienceDays) || 0,
      yearsOfExperience: totalExp,
      employmentType: employmentType || "Subcontractor",
      certificates: certificates || {},
      assessmentType: "E2E FTTH Practical Assessment",
      equipmentChecklist: equipmentList,
      sections: sections,
      sectionScores: computedSectionScores,
      overallScore: liveScoreStats.percentage,
      totalScore: liveScoreStats.percentage,
      feedback: feedback.trim(),
      comments: feedback.trim(),
    };

    try {
      if (isEditing) {
        await api.put(`/lab-assessments/${editingId}`, payload);
        toast.success("Practical Assessment updated successfully!");
      } else {
        await api.post("/lab-assessments", payload);
        toast.success("E2E FTTH Practical Assessment submitted successfully!");
      }

      resetForm();
      fetchAssessments();
      setActiveTab(1); // Switch to tracking tab
    } catch (error) {
      console.error(error);
      toast.error(isEditing ? "Failed to update assessment" : "Failed to submit assessment");
    }
  };

  const handleEditAssessment = (assess) => {
    const team = fieldTeams.find((t) => t._id === (assess.fieldTeamId?._id || assess.fieldTeamId));
    setSelectedTeam(team || { _id: assess.fieldTeamId?._id || assess.fieldTeamId, teamName: assess.fieldTeamName, teamCompany: assess.fieldTeamId?.teamCompany || "" });
    setAssessmentDate(assess.assessmentDate ? new Date(assess.assessmentDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    const dobStr = assess.dateOfBirth ? new Date(assess.dateOfBirth).toISOString().split("T")[0] : (team?.dateOfBirth ? new Date(team.dateOfBirth).toISOString().split("T")[0] : "");
    setDateOfBirth(dobStr);
    setExperienceYears(assess.experienceYears !== undefined ? assess.experienceYears : (assess.yearsOfExperience ? Math.floor(Number(assess.yearsOfExperience)) : (team?.experienceYears || 0)));
    setExperienceMonths(assess.experienceMonths !== undefined ? assess.experienceMonths : (assess.yearsOfExperience ? Math.round((Number(assess.yearsOfExperience) % 1) * 12) : (team?.experienceMonths || 0)));
    setExperienceDays(assess.experienceDays !== undefined ? assess.experienceDays : (team?.experienceDays || 0));
    setEmploymentType(assess.employmentType || team?.employmentType || "Subcontractor");
    setCertificates(assess.certificates || team?.certificates || { dd: false, es: false, fa: false, ff: false, ra: false, wah: false });
    setFeedback(assess.feedback || assess.comments || "");

    if (assess.equipmentChecklist && assess.equipmentChecklist.length > 0) {
      setEquipmentList(assess.equipmentChecklist);
    } else {
      setEquipmentList(initialEquipmentList);
    }

    if (assess.sections && assess.sections.length > 0) {
      setSections(normalizeSectionsForEdit(assess.sections));
    } else {
      setSections(getInitialSections());
    }

    setIsEditing(true);
    setEditingId(assess._id);
    setActiveTab(0);
  };

  const handleDeleteAssessment = (assess) => {
    setAssessmentToDelete(assess);
    setDeleteDialogOpen(true);
  };

  const confirmPermanentDelete = async () => {
    if (!assessmentToDelete?._id) return;
    setDeletingAssessment(true);
    try {
      await api.delete(`/lab-assessments/${assessmentToDelete._id}`);
      toast.success("Practical Assessment permanently deleted successfully");
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
      fetchAssessments();
    } catch (error) {
      toast.error("Failed to permanently delete assessment");
    } finally {
      setDeletingAssessment(false);
    }
  };

  const handleNewAssessmentForTeam = (teamRow) => {
    resetForm();
    handleTeamSelection(teamRow);
    setActiveTab(0);
  };

  // Tracking Data Processing
  const trackingData = useMemo(() => {
    let data = fieldTeams.map((team) => {
      const teamAssessments = assessments.filter(
        (a) => (a.fieldTeamId?._id === team._id) || (a.fieldTeamId === team._id) || (a.fieldTeamName === team.teamName)
      );
      teamAssessments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const latest = teamAssessments[0];

      return {
        ...team,
        isTested: !!latest,
        lastAssessment: latest,
        assessmentCount: teamAssessments.length,
        allAssessments: teamAssessments,
      };
    });

    if (trackingFilter === "tested") {
      data = data.filter((t) => t.isTested);
    } else if (trackingFilter === "pending") {
      data = data.filter((t) => !t.isTested);
    } else if (trackingFilter === "passed") {
      data = data.filter((t) => t.isTested && (t.lastAssessment.overallScore !== undefined ? t.lastAssessment.overallScore : t.lastAssessment.totalScore) >= 70);
    } else if (trackingFilter === "failed") {
      data = data.filter((t) => t.isTested && (t.lastAssessment.overallScore !== undefined ? t.lastAssessment.overallScore : t.lastAssessment.totalScore) < 70);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (t) =>
          t.teamName.toLowerCase().includes(q) ||
          (t.teamCompany && t.teamCompany.toLowerCase().includes(q))
      );
    }

    return data;
  }, [fieldTeams, assessments, trackingFilter, searchQuery]);

  // All teams (unfiltered) — used for correct tab counts regardless of active filter
  const allTrackingData = useMemo(() => {
    return fieldTeams.map((team) => {
      const teamAssessments = assessments.filter(
        (a) => (a.fieldTeamId?._id === team._id) || (a.fieldTeamId === team._id) || (a.fieldTeamName === team.teamName)
      );
      teamAssessments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const latest = teamAssessments[0];
      return {
        ...team,
        isTested: !!latest,
        lastAssessment: latest,
        assessmentCount: teamAssessments.length,
        allAssessments: teamAssessments,
      };
    });
  }, [fieldTeams, assessments]);

  // Analytics & Statistics Deep-Dive
  const stats = useMemo(() => {
    const totalTeams = fieldTeams.length;
    // Always count from the full unfiltered list so tab labels stay correct
    const testedTeams = allTrackingData.filter((t) => t.isTested).length;
    const pendingTeams = totalTeams - testedTeams;
    const completionRate = totalTeams ? Math.round((testedTeams / totalTeams) * 100) : 0;

    const scores = assessments.map((a) => (a.overallScore !== undefined ? a.overallScore : a.totalScore) || 0);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const passCount = assessments.filter((a) => (a.overallScore !== undefined ? a.overallScore : a.totalScore) >= 70).length;
    const passRate = assessments.length ? Math.round((passCount / assessments.length) * 100) : 0;
    const failCount = assessments.length - passCount;

    // 5-Tier Classification Counts & Percentages
    const tierCounts = {
      excellent: assessments.filter((a) => (a.overallScore || a.totalScore) >= 90).length,
      vgood: assessments.filter((a) => (a.overallScore || a.totalScore) >= 80 && (a.overallScore || a.totalScore) < 90).length,
      needImprovement: assessments.filter((a) => (a.overallScore || a.totalScore) >= 70 && (a.overallScore || a.totalScore) < 80).length,
      suspension: assessments.filter((a) => (a.overallScore || a.totalScore) >= 50 && (a.overallScore || a.totalScore) < 70).length,
      ineligible: assessments.filter((a) => (a.overallScore || a.totalScore) < 50).length,
    };

    // Distribution matching 5-Tier Classification Scale
    const distribution = [
      { name: "Excellent (90-100% / Pass)", count: tierCounts.excellent, value: tierCounts.excellent, color: "#00e676" },
      { name: "V.Good (80-89% / Pass)", count: tierCounts.vgood, value: tierCounts.vgood, color: "#4caf50" },
      { name: "Need Improvements (70-79% / Pass)", count: tierCounts.needImprovement, value: tierCounts.needImprovement, color: "#fbc02d" },
      { name: "Suspension & Retrain (50-69% / Fail)", count: tierCounts.suspension, value: tierCounts.suspension, color: "#ff9800" },
      { name: "Ineligible (0-49% / Fail)", count: tierCounts.ineligible, value: tierCounts.ineligible, color: "#f44336" },
    ].filter((d) => d.value > 0);

    // Score trend over time
    const sortedAssessments = [...assessments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const scoreTrend = sortedAssessments.map((a) => ({
      date: new Date(a.assessmentDate || a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: a.overallScore !== undefined ? a.overallScore : a.totalScore,
      team: a.fieldTeamId?.teamName || a.fieldTeamName || "Unknown",
    }));

    // Section averages across all structured assessments
    const sectionScoreTotals = {};
    const sectionCounts = {};

    assessments.forEach((a) => {
      if (a.sections && a.sections.length > 0) {
        a.sections.forEach((sec) => {
          const title = sec.sectionTitle.split("–")[0].replace(/^\d+\.\s*/, "").trim();
          let totalCpScore = 0;
          let maxCpScore = 0;
          const isSec8 = sec.sectionId === "sec-8" || sec.sectionTitle?.includes("Photo") || sec.sectionTitle?.includes("Self-Assessment");
          sec.checkpoints?.forEach((cp) => {
            if (cp.status !== "N/A") {
              const isPoints = cp.type === "points" || cp.maxScore === 10 || isSec8 || cp.id === "cp-8-photos-self-assess" || cp.name?.includes("Photo") || cp.name?.includes("Self-Assessment");
              const cpMax = isPoints ? 10 : (cp.maxScore || 5);
              maxCpScore += cpMax;
              if (isPoints) {
                totalCpScore += Number(cp.score !== undefined ? cp.score : (cp.status === "Pass" ? cpMax : 0));
              } else {
                if (cp.status === "Pass") totalCpScore += Number(cp.score !== undefined ? cp.score : cpMax);
                else if (cp.status === "Fail") totalCpScore += Number(cp.score > 0 && cp.score < cpMax ? cp.score : 0);
              }
            }
          });
          const secPct = maxCpScore > 0 ? Math.min(100, (totalCpScore / maxCpScore) * 100) : 100;
          sectionScoreTotals[title] = (sectionScoreTotals[title] || 0) + secPct;
          sectionCounts[title] = (sectionCounts[title] || 0) + 1;
        });
      }
    });

    const sectionAverages = Object.keys(sectionScoreTotals).map((title) => ({
      section: title,
      avg: Math.round(sectionScoreTotals[title] / sectionCounts[title]),
    }));

    // Employment Classification Comparison
    const subcontractorAssessments = assessments.filter(
      (a) => (a.employmentType || a.fieldTeamId?.employmentType) === "Subcontractor" || !(a.employmentType || a.fieldTeamId?.employmentType)
    );
    const employeeAssessments = assessments.filter(
      (a) => (a.employmentType || a.fieldTeamId?.employmentType) === "Direct Employee"
    );

    const calcGroupStats = (arr) => {
      if (arr.length === 0) return { count: 0, avgScore: 0, passRate: 0 };
      const subScores = arr.map((a) => (a.overallScore !== undefined ? a.overallScore : a.totalScore) || 0);
      const subAvg = Math.round(subScores.reduce((a, b) => a + b, 0) / subScores.length);
      const subPass = arr.filter((a) => (a.overallScore !== undefined ? a.overallScore : a.totalScore) >= 70).length;
      return { count: arr.length, avgScore: subAvg, passRate: Math.round((subPass / arr.length) * 100) };
    };

    const employmentStats = {
      subcontractor: calcGroupStats(subcontractorAssessments),
      employee: calcGroupStats(employeeAssessments),
    };

    // Safety Clearances Compliance
    const certStats = {
      dd: assessments.filter((a) => (a.certificates?.dd || a.fieldTeamId?.certificates?.dd)).length,
      es: assessments.filter((a) => (a.certificates?.es || a.fieldTeamId?.certificates?.es)).length,
      fa: assessments.filter((a) => (a.certificates?.fa || a.fieldTeamId?.certificates?.fa)).length,
      ff: assessments.filter((a) => (a.certificates?.ff || a.fieldTeamId?.certificates?.ff)).length,
      ra: assessments.filter((a) => (a.certificates?.ra || a.fieldTeamId?.certificates?.ra)).length,
      wah: assessments.filter((a) => (a.certificates?.wah || a.fieldTeamId?.certificates?.wah)).length,
      all6: assessments.filter((a) => {
        const c = a.certificates || a.fieldTeamId?.certificates || {};
        return c.dd && c.es && c.fa && c.ff && c.ra && c.wah;
      }).length,
    };

    // Average Experience Duration
    let totalExpSum = 0;
    assessments.forEach((a) => {
      const y = Number(a.experienceYears !== undefined ? a.experienceYears : (a.fieldTeamId?.experienceYears || 0));
      const m = Number(a.experienceMonths !== undefined ? a.experienceMonths : (a.fieldTeamId?.experienceMonths || 0));
      const d = Number(a.experienceDays !== undefined ? a.experienceDays : (a.fieldTeamId?.experienceDays || 0));
      totalExpSum += y + m / 12 + d / 365;
    });
    const avgExpYears = assessments.length ? (totalExpSum / assessments.length).toFixed(1) : "0.0";

    // Equipment Readiness Global Avg
    let eqValidSum = 0;
    let eqTotalSum = 0;
    assessments.forEach((a) => {
      if (a.equipmentChecklist && a.equipmentChecklist.length > 0) {
        a.equipmentChecklist.forEach((item) => {
          eqTotalSum += 1;
          if (item.status === "Valid" || item.status === "Available") eqValidSum += 1;
          else if (item.status === "Need Maintenance") eqValidSum += 0.5;
        });
      }
    });
    const equipmentReadinessRate = eqTotalSum > 0 ? Math.round((eqValidSum / eqTotalSum) * 100) : 100;

    // Top & bottom teams
    const teamAverages = fieldTeams
      .map((team) => {
        const teamAssess = assessments.filter(
          (a) => (a.fieldTeamId?._id || a.fieldTeamId) === team._id || a.fieldTeamName === team.teamName
        );
        if (teamAssess.length === 0) return null;
        const avg = Math.round(teamAssess.reduce((sum, a) => sum + (a.overallScore || a.totalScore || 0), 0) / teamAssess.length);
        const latestAssess = [...teamAssess].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        return {
          teamName: team.teamName,
          teamCompany: team.teamCompany || "Company",
          employmentType: team.employmentType || "Subcontractor",
          avg,
          count: teamAssess.length,
          latestAssess,
        };
      })
      .filter(Boolean);

    const topTeams = [...teamAverages].sort((a, b) => b.avg - a.avg).slice(0, 5);
    const bottomTeams = [...teamAverages].sort((a, b) => a.avg - b.avg).slice(0, 5);

    return {
      totalTeams,
      testedTeams,
      pendingTeams,
      completionRate,
      avgScore,
      passRate,
      failCount,
      tierCounts,
      distribution,
      scoreTrend,
      sectionAverages,
      employmentStats,
      certStats,
      avgExpYears,
      equipmentReadinessRate,
      topTeams,
      bottomTeams,
      teamAverages,
    };
  }, [allTrackingData, fieldTeams, assessments]);

  return (
    <Box>
      <PageHeader
        title="Lab Assessment"
        description="E2E FTTH practical lab evaluation: FDB → BEP → OTO → ONT → service verification, customer education, tools, quality awareness and behaviour."
      />

      {/* Navigation Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" allowScrollButtonsMobile>
          <Tab icon={<AssessmentIcon />} iconPosition="start" label={isEditing ? "Edit Assessment Form" : "New Assessment Form"} />
          <Tab icon={<ListAltIcon />} iconPosition="start" label={`Evaluation Tracking (${fieldTeams.length})`} />
          <Tab icon={<BarChartIcon />} iconPosition="start" label="Quality & Performance Intelligence" />
        </Tabs>
      </Box>

      {/* TAB 0: ASSESSMENT FORM */}
      {activeTab === 0 && (
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Paper sx={{ p: { xs: 2, md: 4 }, bgcolor: colors.surface, borderRadius: "20px", border: `1px solid ${colors.border}` }}>
              <Stack spacing={4}>
                {/* Form Header */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: colors.textPrimary }}>
                      {isEditing ? `Edit Practical Assessment – ${selectedTeam?.teamName || ""}` : "Practical Lab Assessment Form"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                      Conducted by Assessor: <strong>{user?.name || "Quality Specialist"}</strong>
                    </Typography>
                  </Box>

                  {isEditing && (
                    <Button variant="outlined" size="small" color="error" onClick={resetForm} sx={{ borderRadius: "10px" }}>
                      Cancel Edit
                    </Button>
                  )}
                </Box>

                {/* Score & Evaluation Status Sticky Bar */}
                <Paper
                  sx={{
                    p: 2.5,
                    bgcolor: "rgba(123, 104, 238, 0.08)",
                    border: `1px solid ${colors.primary}40`,
                    borderRadius: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>
                      Current Live Overall Score (Pass Threshold: ≥ 70%)
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 0.5, flexWrap: "wrap" }}>
                      <Typography variant="h3" sx={{ fontWeight: 900, color: getAssessmentStatus(liveScoreStats.percentage).color }}>
                        {liveScoreStats.percentage}%
                      </Typography>
                      <Chip
                        label={getAssessmentStatus(liveScoreStats.percentage).label}
                        sx={{
                          bgcolor: `${getAssessmentStatus(liveScoreStats.percentage).color}22`,
                          color: getAssessmentStatus(liveScoreStats.percentage).color,
                          fontWeight: 800,
                          fontSize: "0.95rem",
                          height: 36,
                          border: `2px solid ${getAssessmentStatus(liveScoreStats.percentage).color}`,
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                    <Typography variant="body2" sx={{ color: colors.textPrimary, fontWeight: 600 }}>
                      Points Earned: <strong>{liveScoreStats.totalScore} / {liveScoreStats.maxScore}</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block" }}>
                      Grading: 90-100 (Exc/Pass) • 80-89 (V.Good/Pass) • 70-79 (Need Imp/Pass) • 50-69 (Susp/Fail) • 0-49 (Inelig/Fail)
                    </Typography>
                  </Box>
                </Paper>

                {/* Basic Assessment Meta Inputs */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={7}>
                    <Autocomplete
                      options={fieldTeams}
                      getOptionLabel={(option) => `${option.teamName} (${option.teamCompany || "Company"})`}
                      value={selectedTeam}
                      onChange={(event, newValue) => handleTeamSelection(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Field Team *"
                          required
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": { borderColor: colors.border },
                              "&:hover fieldset": { borderColor: colors.primary },
                              "&.Mui-focused fieldset": { borderColor: colors.primary },
                            },
                            "& .MuiInputLabel-root": { color: colors.textSecondary },
                            input: { color: colors.textPrimary },
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={5}>
                    <TextField
                      type="date"
                      fullWidth
                      label="Assessment Date"
                      value={assessmentDate}
                      onChange={(e) => setAssessmentDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: colors.border },
                          "&:hover fieldset": { borderColor: colors.primary },
                          "&.Mui-focused fieldset": { borderColor: colors.primary },
                        },
                        "& .MuiInputLabel-root": { color: colors.textSecondary },
                        input: { color: colors.textPrimary },
                      }}
                    />
                  </Grid>
                </Grid>

                {/* Field Team Profile & Safety Compliance Info */}
                <Paper
                  sx={{
                    p: 3,
                    bgcolor: "var(--overlay-subtle)",
                    border: `1px solid ${colors.border}`,
                    borderRadius: "16px",
                  }}
                >
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                      <PersonIcon sx={{ color: colors.primary }} /> Field Team Profile & Safety Certifications
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      Technician employment type, years of expertise, and mandatory safety & compliance certificates
                    </Typography>
                  </Box>

                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    {/* Employment Type */}
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase", display: "block", mb: 1 }}>
                        Employment Classification
                      </Typography>
                      <RadioGroup
                        row
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value)}
                        sx={{ gap: 2 }}
                      >
                        <FormControlLabel
                          value="Subcontractor"
                          control={<Radio size="small" sx={{ color: colors.primary, "&.Mui-checked": { color: colors.primary } }} />}
                          label={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Typography variant="body2" sx={{ color: colors.textPrimary, fontWeight: 600 }}>
                                Subcontractor
                              </Typography>
                              <Chip label="Partner" size="small" sx={{ height: 20, fontSize: "0.7rem", bgcolor: "rgba(123, 104, 238, 0.15)", color: colors.primary }} />
                            </Box>
                          }
                        />
                        <FormControlLabel
                          value="Employee"
                          control={<Radio size="small" sx={{ color: colors.success, "&.Mui-checked": { color: colors.success } }} />}
                          label={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Typography variant="body2" sx={{ color: colors.textPrimary, fontWeight: 600 }}>
                                Employee
                              </Typography>
                              <Chip label="Direct" size="small" sx={{ height: 20, fontSize: "0.7rem", bgcolor: "rgba(76, 175, 80, 0.15)", color: colors.success }} />
                            </Box>
                          }
                        />
                      </RadioGroup>
                    </Grid>

                    {/* Date of Birth (DoB) & Technician Age */}
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>
                          Date of Birth (DoB)
                        </Typography>
                        {calculatedAge !== null && (
                          <Chip
                            label={`Age: ${calculatedAge} Yrs`}
                            size="small"
                            sx={{
                              bgcolor: "rgba(233, 30, 99, 0.15)",
                              color: "#f472b6",
                              fontWeight: 800,
                              fontSize: "0.75rem",
                              height: 22,
                              border: "1px solid rgba(233, 30, 99, 0.4)",
                            }}
                          />
                        )}
                      </Box>
                      <TextField
                        type="date"
                        fullWidth
                        size="small"
                        label="Date of Birth (DoB)"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": { borderColor: colors.border },
                            "&:hover fieldset": { borderColor: colors.primary },
                            "&.Mui-focused fieldset": { borderColor: colors.primary },
                          },
                          "& .MuiInputLabel-root": { color: colors.textSecondary },
                          input: { color: colors.textPrimary, fontWeight: 600 },
                        }}
                      />
                    </Grid>

                    {/* Experience: Years, Months, Days */}
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase", display: "block", mb: 1 }}>
                        Experience (Years / Months / Days)
                      </Typography>
                      <Grid container spacing={1.5}>
                        <Grid item xs={4}>
                          <TextField
                            type="number"
                            fullWidth
                            size="small"
                            label="Years"
                            inputProps={{ min: 0, max: 50 }}
                            value={experienceYears}
                            onChange={(e) => setExperienceYears(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                "& fieldset": { borderColor: colors.border },
                                "&:hover fieldset": { borderColor: colors.primary },
                                "&.Mui-focused fieldset": { borderColor: colors.primary },
                              },
                              "& .MuiInputLabel-root": { color: colors.textSecondary },
                              input: { color: colors.textPrimary, fontWeight: 600, textAlign: "center" },
                            }}
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField
                            type="number"
                            fullWidth
                            size="small"
                            label="Months"
                            inputProps={{ min: 0, max: 11 }}
                            value={experienceMonths}
                            onChange={(e) => setExperienceMonths(Math.min(11, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                "& fieldset": { borderColor: colors.border },
                                "&:hover fieldset": { borderColor: colors.primary },
                                "&.Mui-focused fieldset": { borderColor: colors.primary },
                              },
                              "& .MuiInputLabel-root": { color: colors.textSecondary },
                              input: { color: colors.textPrimary, fontWeight: 600, textAlign: "center" },
                            }}
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField
                            type="number"
                            fullWidth
                            size="small"
                            label="Days"
                            inputProps={{ min: 0, max: 30 }}
                            value={experienceDays}
                            onChange={(e) => setExperienceDays(Math.min(30, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                "& fieldset": { borderColor: colors.border },
                                "&:hover fieldset": { borderColor: colors.primary },
                                "&.Mui-focused fieldset": { borderColor: colors.primary },
                              },
                              "& .MuiInputLabel-root": { color: colors.textSecondary },
                              input: { color: colors.textPrimary, fontWeight: 600, textAlign: "center" },
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Safety & Compliance Certificates */}
                  <Divider sx={{ borderColor: colors.border, mb: 2.5 }} />
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase", display: "block", mb: 1.5 }}>
                    Safety & Compliance Certifications (6 Mandatory Areas)
                  </Typography>

                  <Grid container spacing={2}>
                    {CERTIFICATE_DEFINITIONS.map((cert) => {
                      const isChecked = !!certificates[cert.key];
                      return (
                        <Grid item xs={12} sm={6} md={4} key={cert.key}>
                          <Paper
                            onClick={() => handleCertificateToggle(cert.key)}
                            sx={{
                              p: 2,
                              cursor: "pointer",
                              bgcolor: isChecked ? "rgba(76, 175, 80, 0.08)" : "rgba(255,255,255,0.015)",
                              border: isChecked ? `1px solid ${colors.success}` : `1px solid ${colors.border}`,
                              borderRadius: "12px",
                              transition: "all 0.2s ease-in-out",
                              "&:hover": {
                                bgcolor: isChecked ? "rgba(76, 175, 80, 0.12)" : "rgba(255,255,255,0.04)",
                                borderColor: isChecked ? colors.success : colors.primary,
                              },
                            }}
                          >
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Chip
                                  label={cert.code}
                                  size="small"
                                  sx={{
                                    bgcolor: isChecked ? colors.success : "rgba(255,255,255,0.08)",
                                    color: isChecked ? "#ffffff" : colors.textSecondary,
                                    fontWeight: 800,
                                    fontSize: "0.75rem",
                                    height: 24,
                                    px: 0.5,
                                  }}
                                />
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isChecked ? colors.success : colors.textPrimary }}>
                                  {cert.title}
                                </Typography>
                              </Box>
                              <Chip
                                label={isChecked ? "Certified" : "Not Certified"}
                                size="small"
                                sx={{
                                  bgcolor: isChecked ? "rgba(76, 175, 80, 0.15)" : "rgba(255,255,255,0.05)",
                                  color: isChecked ? colors.success : colors.textSecondary,
                                  fontWeight: 700,
                                  fontSize: "0.7rem",
                                  height: 20,
                                }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block", lineHeight: 1.4 }}>
                              {cert.description}
                            </Typography>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Paper>

                {/* SECTION: Tools & Equipment Readiness Check */}
                <Paper sx={{ p: 3, bgcolor: "var(--overlay-subtle)", border: `1px solid ${colors.border}`, borderRadius: "16px" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
                    <Box>
                      <Typography variant="h6" sx={{ color: colors.info, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                        <BuildIcon /> Tools & Equipment
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                        Verify equipment condition, operational status, cleanliness & suitability
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={`${equipmentStats.percentage}% (${equipmentStats.validCount}/${equipmentStats.totalCount} Valid/Avail)`}
                        size="small"
                        sx={{
                          bgcolor: equipmentStats.isPass ? "rgba(76,175,80,0.18)" : "rgba(244,67,54,0.18)",
                          color: equipmentStats.isPass ? colors.success : colors.error,
                          fontWeight: 800,
                          border: `1px solid ${equipmentStats.isPass ? colors.success : colors.error}60`,
                        }}
                      />
                      <Chip
                        label={equipmentStats.isPass ? "Pass" : "Fail"}
                        size="small"
                        sx={{
                          bgcolor: equipmentStats.isPass ? "#4caf50" : "#f44336",
                          color: "var(--text)",
                          fontWeight: 800,
                          fontSize: "0.75rem",
                          px: 0.5,
                        }}
                      />
                    </Stack>
                  </Box>

                  <TableContainer component={Paper} sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "12px" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "var(--overlay-subtle)" }}>
                          <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, width: "35%" }}>Tool / Equipment Item</TableCell>
                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, width: "35%" }}>Assessment Status</TableCell>
                          <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, width: "30%" }}>Assessor Observations / Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {equipmentList.map((item, idx) => {
                          const isAvailabilityType =
                            item.toolName.includes("Solution") ||
                            item.toolName.includes("Swab") ||
                            item.toolName.includes("Wipes") ||
                            item.toolName.includes("Brush") ||
                            item.toolName.includes("Sleeve");

                          return (
                            <TableRow key={idx} sx={{ borderBottom: `1px solid ${colors.border}` }}>
                              <TableCell sx={{ color: colors.textPrimary, fontWeight: 600 }}>{item.toolName}</TableCell>
                              <TableCell align="center">
                                <RadioGroup
                                  row
                                  value={item.status}
                                  onChange={(e) => handleEquipmentChange(idx, "status", e.target.value)}
                                  sx={{ justifyContent: "center" }}
                                >
                                  {isAvailabilityType ? (
                                    <>
                                      <FormControlLabel
                                        value="Available"
                                        control={<Radio size="small" sx={{ color: colors.success, "&.Mui-checked": { color: colors.success } }} />}
                                        label={<Typography variant="caption" sx={{ color: colors.success, fontWeight: 600 }}>Available</Typography>}
                                      />
                                      <FormControlLabel
                                        value="Not Available"
                                        control={<Radio size="small" sx={{ color: colors.error, "&.Mui-checked": { color: colors.error } }} />}
                                        label={<Typography variant="caption" sx={{ color: colors.error, fontWeight: 600 }}>Not Available</Typography>}
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <FormControlLabel
                                        value="Valid"
                                        control={<Radio size="small" sx={{ color: colors.success, "&.Mui-checked": { color: colors.success } }} />}
                                        label={<Typography variant="caption" sx={{ color: colors.success, fontWeight: 600 }}>Valid</Typography>}
                                      />
                                      <FormControlLabel
                                        value="Need Maintenance"
                                        control={<Radio size="small" sx={{ color: colors.warning, "&.Mui-checked": { color: colors.warning } }} />}
                                        label={<Typography variant="caption" sx={{ color: colors.warning, fontWeight: 600 }}>Need Maint.</Typography>}
                                      />
                                      <FormControlLabel
                                        value="Not Valid"
                                        control={<Radio size="small" sx={{ color: colors.error, "&.Mui-checked": { color: colors.error } }} />}
                                        label={<Typography variant="caption" sx={{ color: colors.error, fontWeight: 600 }}>Not Valid</Typography>}
                                      />
                                      <FormControlLabel
                                        value="Not Existing"
                                        control={<Radio size="small" sx={{ color: colors.error, "&.Mui-checked": { color: "#d32f2f" } }} />}
                                        label={<Typography variant="caption" sx={{ color: "#ef5350", fontWeight: 700 }}>Not Existing</Typography>}
                                      />
                                    </>
                                  )}
                                </RadioGroup>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  fullWidth
                                  size="small"
                                  placeholder="Observations..."
                                  value={item.notes}
                                  onChange={(e) => handleEquipmentChange(idx, "notes", e.target.value)}
                                  sx={{
                                    "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: colors.border }, input: { color: colors.textPrimary, fontSize: "0.85rem" } },
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                {/* Render All Assessment Sections (1 to 8) */}
                {sections.map((sec, sIdx) => {
                  const secStats = getSectionStats(sec);

                  // Helper renderer for a set of checkpoints
                  const renderCheckpointsTable = (checkpointsWithIndices) => (
                    <TableContainer component={Paper} sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "12px" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "var(--overlay-subtle)" }}>
                            <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, width: "50%" }}>Checkpoint & Criteria</TableCell>
                            <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, width: "25%" }}>Result</TableCell>
                            <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, width: "25%" }}>Assessor Remarks</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {checkpointsWithIndices.map(({ cp, cpIdx }) => (
                            <TableRow key={cp.id || cpIdx} sx={{ borderBottom: `1px solid ${colors.border}`, "&:hover": { bgcolor: "var(--overlay-subtle)" } }}>
                              <TableCell sx={{ color: colors.textPrimary, py: 1.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{cp.name}</Typography>
                                {cp.subSection && (
                                  <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block" }}>
                                    {cp.subSection}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                {(() => {
                                  const isSec8 = sec?.sectionId === "sec-8" || sec?.sectionTitle?.includes("Photo") || sec?.sectionTitle?.includes("Self-Assessment") || cp.id === "cp-8-photos-self-assess";
                                  const cpMax = isSec8 ? 10 : 5;
                                  const passThreshold = isSec8 ? 7 : 4;
                                  const currentScore = cp.score !== undefined ? cp.score : (cp.status === "Pass" ? cpMax : 0);
                                  const pointOptions = isSec8 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [0, 1, 2, 3, 4, 5];

                                  return (
                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                                      {/* Top Row: Pass/Fail/NA Radio + Score Input Box */}
                                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                                        <RadioGroup
                                          row
                                          value={cp.status || (currentScore >= passThreshold ? "Pass" : "Fail")}
                                          onChange={(e) => handleCheckpointStatusChange(sIdx, cpIdx, e.target.value)}
                                          sx={{ justifyContent: "center" }}
                                        >
                                          <FormControlLabel
                                            value="Pass"
                                            control={<Radio size="small" sx={{ color: colors.success, "&.Mui-checked": { color: colors.success } }} />}
                                            label={<Typography variant="caption" sx={{ color: colors.success, fontWeight: 700 }}>Pass</Typography>}
                                          />
                                          <FormControlLabel
                                            value="Fail"
                                            control={<Radio size="small" sx={{ color: colors.error, "&.Mui-checked": { color: colors.error } }} />}
                                            label={<Typography variant="caption" sx={{ color: colors.error, fontWeight: 700 }}>Fail</Typography>}
                                          />
                                          <FormControlLabel
                                            value="N/A"
                                            control={<Radio size="small" sx={{ color: colors.textSecondary, "&.Mui-checked": { color: colors.textSecondary } }} />}
                                            label={<Typography variant="caption" sx={{ color: colors.textSecondary }}>N/A</Typography>}
                                          />
                                        </RadioGroup>

                                        {cp.status !== "N/A" && (
                                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                            <TextField
                                              type="number"
                                              size="small"
                                              inputProps={{ min: 0, max: cpMax, step: 1 }}
                                              value={currentScore}
                                              onChange={(e) => {
                                                const val = Math.max(0, Math.min(cpMax, Number(e.target.value) || 0));
                                                handleCheckpointScoreChange(sIdx, cpIdx, val);
                                              }}
                                              sx={{
                                                width: "56px",
                                                "& .MuiOutlinedInput-root": {
                                                  "& fieldset": { borderColor: currentScore >= passThreshold ? colors.success : colors.error },
                                                  input: { color: colors.textPrimary, fontWeight: 800, textAlign: "center", py: 0.5, px: 0.5, fontSize: "0.85rem" },
                                                },
                                              }}
                                            />
                                            <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700 }}>
                                              / {cpMax}
                                            </Typography>
                                          </Box>
                                        )}
                                      </Box>

                                      {/* Bottom Row: Quick Clickable Score Buttons (0, 1, 2, 3, 4, 5) */}
                                      {cp.status !== "N/A" && (
                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, justifyContent: "center" }}>
                                          {pointOptions.map((num) => {
                                            const isSelected = currentScore === num;
                                            const isGood = num >= passThreshold;
                                            return (
                                              <Button
                                                key={num}
                                                size="small"
                                                onClick={() => handleCheckpointScoreChange(sIdx, cpIdx, num)}
                                                sx={{
                                                  minWidth: isSec8 ? "24px" : "28px",
                                                  height: "24px",
                                                  p: 0,
                                                  fontSize: "0.75rem",
                                                  fontWeight: isSelected ? 900 : 600,
                                                  bgcolor: isSelected
                                                    ? (isGood ? colors.success : colors.error)
                                                    : "rgba(255,255,255,0.05)",
                                                  color: isSelected ? "#fff" : colors.textSecondary,
                                                  border: isSelected ? "none" : `1px solid ${colors.border}`,
                                                  borderRadius: "5px",
                                                  "&:hover": {
                                                    bgcolor: isSelected
                                                      ? (isGood ? "#43a047" : "#e53935")
                                                      : "rgba(255,255,255,0.12)",
                                                  },
                                                }}
                                              >
                                                {num}
                                              </Button>
                                            );
                                          })}
                                        </Box>
                                      )}
                                    </Box>
                                  );
                                })()}
                              </TableCell>
                              <TableCell>
                                <TextField
                                  fullWidth
                                  size="small"
                                  placeholder="Observations..."
                                  value={cp.notes || ""}
                                  onChange={(e) => handleCheckpointNotesChange(sIdx, cpIdx, e.target.value)}
                                  sx={{
                                    "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: colors.border }, input: { color: colors.textPrimary, fontSize: "0.85rem" } },
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  );

                  // Section 4 ONT Groups (Render each ONT model in a separated square)
                  const isOntSection = sec.sectionId === "sec-4";
                  const isBepSection = sec.sectionId === "sec-2";

                  const ontGroups = [
                    {
                      key: "zte",
                      title: "1. ZTE F6600P – Wi-Fi 6 Configuration & Verification",
                      icon: "📡",
                      filter: (cp) => cp.id?.includes("zte") || cp.subSection?.includes("ZTE"),
                    },
                    {
                      key: "nokia6",
                      title: "2. Nokia G-2426G-P – Wi-Fi 6 Configuration & Firmware v62",
                      icon: "⚡",
                      filter: (cp) => cp.id?.includes("nokia6") || cp.subSection?.includes("Nokia G-2426G-P"),
                    },
                    {
                      key: "nokia5",
                      title: "3. Nokia G-140W-H – Wi-Fi 5 Configuration & Verification",
                      icon: "📶",
                      filter: (cp) => cp.id?.includes("nokia5") || cp.subSection?.includes("Nokia G-140W-H"),
                    },
                    {
                      key: "labels",
                      title: "4. ONT Identification & Warning Labels (Shared Standard)",
                      icon: "🏷️",
                      filter: (cp) => cp.id?.includes("label") || cp.subSection?.includes("Labeling"),
                    },
                  ];

                  const bepGroups = [
                    {
                      key: "bep-splice",
                      title: "A. BEP – Outdoor/Indoor Drop Fiber Fusion Splicing & Routing",
                      filter: (cp) => !cp.id?.includes("label") && !cp.subSection?.includes("Labeling"),
                    },
                    {
                      key: "bep-labels",
                      title: "B. BEP – Outdoor & Indoor Drop Fiber Identification Labels",
                      filter: (cp) => cp.id?.includes("label") || cp.subSection?.includes("Labeling"),
                    },
                  ];

                  return (
                    <Paper key={sec.sectionId} sx={{ p: 3, bgcolor: "var(--overlay-subtle)", border: `1px solid ${colors.border}`, borderRadius: "16px" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
                        <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 700 }}>
                          {sec.sectionTitle}
                        </Typography>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={`${sec.checkpoints.length} Checkpoints`}
                            size="small"
                            sx={{ bgcolor: "rgba(123, 104, 238, 0.15)", color: colors.primary, border: `1px solid ${colors.primary}40`, fontWeight: 600 }}
                          />
                          {sec.sectionId === "sec-7" ? (
                            <Chip
                              label="Quality Supervisor Awareness (No Pass/Fail)"
                              size="small"
                              sx={{
                                bgcolor: "rgba(156, 39, 176, 0.18)",
                                color: "#ce93d8",
                                fontWeight: 700,
                                border: "1px solid rgba(156, 39, 176, 0.4)",
                              }}
                            />
                          ) : (
                            <>
                              <Chip
                                label={`${secStats.percentage}%`}
                                size="small"
                                sx={{
                                  bgcolor: secStats.isPass ? "rgba(76,175,80,0.18)" : "rgba(244,67,54,0.18)",
                                  color: secStats.isPass ? colors.success : colors.error,
                                  fontWeight: 800,
                                  border: `1px solid ${secStats.isPass ? colors.success : colors.error}60`,
                                }}
                              />
                              <Chip
                                label={secStats.isPass ? "Pass" : "Fail"}
                                size="small"
                                sx={{
                                  bgcolor: secStats.isPass ? "#4caf50" : "#f44336",
                                  color: "var(--text)",
                                  fontWeight: 800,
                                  fontSize: "0.75rem",
                                  px: 0.5,
                                }}
                              />
                            </>
                          )}
                        </Stack>
                      </Box>

                      {sec.sectionId === "sec-4" && (
                        <Alert severity="info" sx={{ mb: 2.5, bgcolor: "rgba(0, 188, 212, 0.08)", border: "1px solid rgba(0, 188, 212, 0.3)", color: "#fff" }}>
                          <strong>Supported ONT Models:</strong> ZTE F6600P, Nokia G-2426G-P (Wi-Fi 6), and Nokia G-140W-H (Wi-Fi 5). Note that manual firmware v62 upload step applies specifically to the <strong>Nokia G-2426G-P</strong>. Each ONT model is separated into its own square box below.
                        </Alert>
                      )}

                      {/* If ONT Section: Render each ONT in a separated square */}
                      {isOntSection ? (
                        <Stack spacing={2.5}>
                          {ontGroups.map((group) => {
                            const groupCheckpoints = sec.checkpoints
                              .map((cp, cpIdx) => ({ cp, cpIdx }))
                              .filter(({ cp }) => group.filter(cp));

                            if (groupCheckpoints.length === 0) return null;

                            return (
                              <Paper
                                key={group.key}
                                sx={{
                                  p: 2.5,
                                  bgcolor: "var(--overlay-subtle)",
                                  border: `1px solid var(--border)`,
                                  borderRadius: "14px",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                }}
                              >
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    fontWeight: 700,
                                    color: colors.textPrimary,
                                    mb: 1.5,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <span>{group.icon}</span> {group.title}
                                </Typography>
                                {renderCheckpointsTable(groupCheckpoints)}
                              </Paper>
                            );
                          })}
                        </Stack>
                      ) : isBepSection ? (
                        <Stack spacing={2.5}>
                          {bepGroups.map((group) => {
                            const groupCheckpoints = sec.checkpoints
                              .map((cp, cpIdx) => ({ cp, cpIdx }))
                              .filter(({ cp }) => group.filter(cp));

                            if (groupCheckpoints.length === 0) return null;

                            return (
                              <Paper
                                key={group.key}
                                sx={{
                                  p: 2.5,
                                  bgcolor: "var(--overlay-subtle)",
                                  border: `1px solid var(--border)`,
                                  borderRadius: "14px",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                }}
                              >
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    fontWeight: 700,
                                    color: colors.textPrimary,
                                    mb: 1.5,
                                  }}
                                >
                                  {group.title}
                                </Typography>
                                {renderCheckpointsTable(groupCheckpoints)}
                              </Paper>
                            );
                          })}
                        </Stack>
                      ) : (
                        renderCheckpointsTable(sec.checkpoints.map((cp, cpIdx) => ({ cp, cpIdx })))
                      )}
                    </Paper>
                  );
                })}

                {/* Feedback & Recommendations */}
                <Paper sx={{ p: 3, bgcolor: "var(--overlay-subtle)", border: `1px solid ${colors.border}`, borderRadius: "16px" }}>
                  <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 700, mb: 1 }}>
                    Assessor Overall Synthesis & Recommendations
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Provide detailed feedback, observed strengths, areas needing improvement, or re-training recommendations..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: colors.border },
                        "&:hover fieldset": { borderColor: colors.primary },
                        "&.Mui-focused fieldset": { borderColor: colors.primary },
                      },
                      textarea: { color: colors.textPrimary },
                    }}
                  />
                </Paper>

                {/* Submit / Action Buttons */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                  <Button variant="outlined" onClick={resetForm} sx={{ color: colors.textSecondary, borderColor: colors.border, borderRadius: "12px", px: 3 }}>
                    Reset Form
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!selectedTeam}
                    sx={{
                      bgcolor: colors.primary,
                      "&:hover": { bgcolor: "var(--accent-hover)" },
                      borderRadius: "12px",
                      px: 6,
                      py: 1.5,
                      fontWeight: 700,
                      fontSize: "1.05rem",
                      boxShadow: `0 8px 16px ${colors.primary}40`,
                    }}
                  >
                    {isEditing ? "Update Practical Assessment" : "Submit E2E Assessment"}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: TRACKING TABLE */}
      {activeTab === 1 && (
        <Stack spacing={3}>
          <Paper
            sx={{
              p: 2.5,
              bgcolor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Tabs
              value={trackingFilter}
              onChange={(e, v) => setTrackingFilter(v)}
              textColor="primary"
              indicatorColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{ minHeight: "auto", "& .MuiTab-root": { minHeight: 48, fontSize: "0.95rem", textTransform: "none", fontWeight: 600 } }}
            >
              <Tab label={`All Teams (${fieldTeams.length})`} value="all" />
              <Tab label={`Evaluated (${stats.testedTeams})`} value="tested" />
              <Tab label={`Pending (${stats.pendingTeams})`} value="pending" />
              <Tab label={`Certified / Passed (${stats.testedTeams - stats.failCount})`} value="passed" />
              <Tab label={`Failed / Retrain Needed (${stats.failCount})`} value="failed" />
            </Tabs>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: "100%", md: "auto" } }}>
              <TextField
                placeholder="Search team or company..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: colors.textSecondary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: { xs: "100%", sm: 260 },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: colors.border },
                    "&:hover fieldset": { borderColor: colors.primary },
                    "&.Mui-focused fieldset": { borderColor: colors.primary },
                  },
                  input: { color: colors.textPrimary },
                }}
              />

              <Button
                variant="contained"
                startIcon={<FileDownloadIcon />}
                onClick={() => exportMasterLabAssessmentReport({ assessments, fieldTeams })}
                sx={{
                  bgcolor: "#2e7d32",
                  "&:hover": { bgcolor: "#1b5e20" },
                  color: "var(--text)",
                  fontWeight: 700,
                  borderRadius: "10px",
                  px: 2.5,
                  py: 1,
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(46, 125, 50, 0.3)",
                }}
              >
                Export Master Report (.xlsx)
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ width: "100%", height: 620, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "16px", overflow: "auto" }}>
            <DataGrid
              rows={trackingData}
              getRowId={(row) => row._id}
              columns={[
                { field: "teamName", headerName: "Team Name", flex: 1.2, minWidth: 160 },
                { field: "teamCompany", headerName: "Company", flex: 1, minWidth: 130 },
                {
                  field: "employmentType",
                  headerName: "Type",
                  width: 130,
                  renderCell: (params) => (
                    <Chip
                      label={params.row.employmentType || "Subcontractor"}
                      size="small"
                      sx={{
                        bgcolor: params.row.employmentType === "Direct Employee" ? "rgba(0, 188, 212, 0.15)" : "rgba(156, 39, 176, 0.15)",
                        color: params.row.employmentType === "Direct Employee" ? "#00bcd4" : "#ba68c8",
                        border: `1px solid ${params.row.employmentType === "Direct Employee" ? "#00bcd440" : "#ba68c840"}`,
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    />
                  ),
                },
                {
                  field: "age",
                  headerName: "DoB & Age",
                  width: 140,
                  renderCell: (params) => {
                    const dob = params.row.dateOfBirth || params.row.lastAssessment?.dateOfBirth;
                    let ageVal = params.row.age !== undefined && params.row.age !== null ? params.row.age : (params.row.lastAssessment?.age !== undefined && params.row.lastAssessment?.age !== null ? params.row.lastAssessment.age : null);
                    if (ageVal === null && dob) {
                      const birth = new Date(dob);
                      const now = new Date();
                      let a = now.getFullYear() - birth.getFullYear();
                      const m = now.getMonth() - birth.getMonth();
                      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) a--;
                      ageVal = a >= 0 ? a : null;
                    }
                    if (!dob && ageVal === null) return <Typography variant="caption" sx={{ color: colors.textSecondary }}>-</Typography>;

                    return (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.2 }}>
                        {ageVal !== null && (
                          <Chip
                            label={`Age: ${ageVal} Yrs`}
                            size="small"
                            sx={{
                              bgcolor: "rgba(233, 30, 99, 0.12)",
                              color: "#f472b6",
                              fontWeight: 700,
                              fontSize: "0.72rem",
                              height: 20,
                              width: "fit-content",
                            }}
                          />
                        )}
                        {dob && (
                          <Typography variant="caption" sx={{ color: colors.textSecondary, fontSize: "0.7rem" }}>
                            {new Date(dob).toISOString().split("T")[0]}
                          </Typography>
                        )}
                      </Box>
                    );
                  },
                },
                {
                  field: "experience",
                  headerName: "Experience",
                  width: 140,
                  valueGetter: (value, row) =>
                    formatExperienceDuration(
                      row.experienceYears !== undefined ? row.experienceYears : (row.lastAssessment?.experienceYears || 0),
                      row.experienceMonths !== undefined ? row.experienceMonths : (row.lastAssessment?.experienceMonths || 0),
                      row.experienceDays !== undefined ? row.experienceDays : (row.lastAssessment?.experienceDays || 0),
                      row.yearsOfExperience
                    ),
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: colors.textSecondary, fontSize: "0.82rem" }}>
                      {params.value}
                    </Typography>
                  ),
                },
                {
                  field: "score",
                  headerName: "Score",
                  width: 110,
                  align: "center",
                  headerAlign: "center",
                  valueGetter: (value, row) =>
                    row.isTested ? (row.lastAssessment.overallScore !== undefined ? row.lastAssessment.overallScore : row.lastAssessment.totalScore) : null,
                  renderCell: (params) => {
                    if (params.value === null) return "-";
                    const status = getAssessmentStatus(params.value);
                    return (
                      <Chip
                        label={`${params.value}%`}
                        size="small"
                        sx={{
                          bgcolor: `${status.color}22`,
                          color: status.color,
                          fontWeight: "bold",
                          border: `1px solid ${status.color}`,
                        }}
                      />
                    );
                  },
                },
                {
                  field: "statusLabel",
                  headerName: "Evaluation Result",
                  width: 200,
                  valueGetter: (value, row) => {
                    if (!row.isTested) return "-";
                    const score = row.lastAssessment.overallScore !== undefined ? row.lastAssessment.overallScore : row.lastAssessment.totalScore;
                    return getAssessmentStatus(score).label;
                  },
                  renderCell: (params) => {
                    if (!params.row.isTested) return <Typography variant="caption" sx={{ color: colors.textSecondary }}>Pending</Typography>;
                    const score = params.row.lastAssessment.overallScore !== undefined ? params.row.lastAssessment.overallScore : params.row.lastAssessment.totalScore;
                    const status = getAssessmentStatus(score);
                    return <Typography variant="body2" sx={{ color: status.color, fontWeight: 700, fontSize: "0.82rem" }}>{status.label}</Typography>;
                  },
                },
                {
                  field: "assessmentDate",
                  headerName: "Assessment Date",
                  width: 140,
                  valueGetter: (value, row) => (row.isTested ? row.lastAssessment.assessmentDate || row.lastAssessment.createdAt : null),
                  valueFormatter: (value) => (value ? new Date(value).toLocaleDateString() : "-"),
                },
                {
                  field: "actions",
                  headerName: "Actions",
                  width: 220,
                  sortable: false,
                  renderCell: (params) => (
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Start New Practical Assessment">
                        <IconButton onClick={() => handleNewAssessmentForTeam(params.row)} sx={{ color: colors.success }}>
                          <AssessmentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {params.row.isTested && (
                        <>
                          <Tooltip title="Export Arabic PDF (تقرير الفني بالعربي)">
                            <IconButton
                              onClick={() => exportArabicLabAssessmentPDF(params.row.lastAssessment)}
                              sx={{ color: "#ef4444" }}
                            >
                              <PictureAsPdfIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Export Detailed Report (.xlsx)">
                            <IconButton
                              onClick={() => exportIndividualLabAssessmentReport(params.row.lastAssessment)}
                              sx={{ color: "#4caf50" }}
                            >
                              <FileDownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Detailed Report / Print">
                            <IconButton
                              onClick={() => {
                                setSelectedAssessmentForDetail(params.row.lastAssessment);
                                setDetailModalOpen(true);
                              }}
                              sx={{ color: colors.primary }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Assessment">
                            <IconButton onClick={() => handleEditAssessment(params.row.lastAssessment)} sx={{ color: colors.warning }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Permanently Delete Assessment">
                            <IconButton onClick={() => handleDeleteAssessment(params.row.lastAssessment)} sx={{ color: colors.error }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  ),
                },
              ]}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              sx={{
                border: "none",
                color: colors.textPrimary,
                "& .MuiDataGrid-cell": { borderBottom: `1px solid ${colors.border}` },
                "& .MuiDataGrid-columnHeaders": { bgcolor: colors.surface, borderBottom: `1px solid ${colors.border}`, color: colors.textSecondary },
                "& .MuiDataGrid-virtualScroller": { bgcolor: colors.background },
                "& .MuiDataGrid-footerContainer": { borderTop: `1px solid ${colors.border}`, bgcolor: colors.surface, color: colors.textSecondary },
                "& .MuiTablePagination-root": { color: colors.textSecondary },
                "& .MuiButtonBase-root": { color: colors.textSecondary },
              }}
            />
          </Paper>
        </Stack>
      )}

      {/* TAB 2: QUALITY & PERFORMANCE INTELLIGENCE */}
      {activeTab === 2 && (
        <Stack spacing={4}>
          {/* Header Action Bar */}
          <Paper
            sx={{
              p: 3,
              bgcolor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: "18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              background: "linear-gradient(135deg, rgba(123, 104, 238, 0.08) 0%, rgba(37, 37, 37, 0.95) 100%)",
            }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: colors.textPrimary, display: "flex", alignItems: "center", gap: 1.5 }}>
                <TrendingUpIcon sx={{ color: colors.primary }} /> Quality & Practical Lab Performance Intelligence
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 0.5 }}>
                Cross-sectional quality indicators, technician qualification benchmarks, safety compliance, and comprehensive audit reports
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={<FileDownloadIcon />}
              onClick={() => exportMasterLabAssessmentReport({ assessments, fieldTeams })}
              sx={{
                bgcolor: "#2e7d32",
                "&:hover": { bgcolor: "#1b5e20" },
                color: "var(--text)",
                fontWeight: 800,
                borderRadius: "12px",
                px: 3.5,
                py: 1.2,
                boxShadow: "0 6px 18px rgba(46, 125, 50, 0.4)",
              }}
            >
              Export Comprehensive Master Report (.xlsx)
            </Button>
          </Paper>

          {/* 6 Multi-Dimensional Executive KPI Cards */}
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "16px", height: "100%" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>Evaluated Teams</Typography>
                  <Typography variant="h4" sx={{ color: colors.success, fontWeight: 800, mt: 0.5 }}>{stats.testedTeams}</Typography>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block", mt: 0.5 }}>
                    of {stats.totalTeams} Total Teams ({stats.completionRate}%)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4} lg={2}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "16px", height: "100%" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>Global Average</Typography>
                  <Typography variant="h4" sx={{ color: getAssessmentStatus(stats.avgScore).color, fontWeight: 800, mt: 0.5 }}>{stats.avgScore}%</Typography>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block", mt: 0.5 }}>
                    {getAssessmentStatus(stats.avgScore).label.split("(")[0].trim()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4} lg={2}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "16px", height: "100%" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>Pass Rate (≥ 70%)</Typography>
                  <Typography variant="h4" sx={{ color: colors.primary, fontWeight: 800, mt: 0.5 }}>{stats.passRate}%</Typography>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block", mt: 0.5 }}>
                    {stats.testedTeams - stats.failCount} Passed / {stats.failCount} Failed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4} lg={2}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "16px", height: "100%" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>Tools Readiness</Typography>
                  <Typography variant="h4" sx={{ color: stats.equipmentReadinessRate >= 80 ? "#00bcd4" : "#ff9800", fontWeight: 800, mt: 0.5 }}>{stats.equipmentReadinessRate}%</Typography>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block", mt: 0.5 }}>
                    Valid & Calibrated Equipment
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4} lg={2}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "16px", height: "100%" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>Avg Experience</Typography>
                  <Typography variant="h4" sx={{ color: "#e91e63", fontWeight: 800, mt: 0.5 }}>{stats.avgExpYears} Yrs</Typography>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block", mt: 0.5 }}>
                    Field Technician Tenure
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4} lg={2}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "16px", height: "100%" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>All 6 Clearances</Typography>
                  <Typography variant="h4" sx={{ color: "#4caf50", fontWeight: 800, mt: 0.5 }}>
                    {assessments.length > 0 ? Math.round((stats.certStats.all6 / assessments.length) * 100) : 0}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block", mt: 0.5 }}>
                    {stats.certStats.all6} Fully Certified Teams
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 5-Tier Classification Breakdown Banners */}
          <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "18px" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: colors.textPrimary, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <EmojiEventsIcon sx={{ color: "#fbc02d" }} /> 5-Tier Qualification & Assessment Result Breakdown
            </Typography>
            <Grid container spacing={2}>
              {[
                { label: "Excellent (Pass)", range: "90 - 100%", count: stats.tierCounts.excellent, color: "#00e676", desc: "Full qualification & autonomous deployment" },
                { label: "V.Good (Pass)", range: "80 - 89%", count: stats.tierCounts.vgood, color: "#4caf50", desc: "Qualified with high operational confidence" },
                { label: "Need Improvements (Pass)", range: "70 - 79%", count: stats.tierCounts.needImprovement, color: "#fbc02d", desc: "Conditional pass – close supervisor monitoring" },
                { label: "Suspension & Retrain (Fail)", range: "50 - 69%", count: stats.tierCounts.suspension, color: "#ff9800", desc: "Suspension & mandatory practical re-training" },
                { label: "Ineligible (Fail)", range: "0 - 49%", count: stats.tierCounts.ineligible, color: "#f44336", desc: "Field disqualification & full restart" },
              ].map((tier, idx) => {
                const pct = assessments.length > 0 ? Math.round((tier.count / assessments.length) * 100) : 0;
                return (
                  <Grid item xs={12} sm={6} md={2.4} key={idx}>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: `${tier.color}0a`,
                        border: `1px solid ${tier.color}35`,
                        borderRadius: "14px",
                        height: "100%",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Chip
                          label={tier.range}
                          size="small"
                          sx={{ bgcolor: `${tier.color}22`, color: tier.color, fontWeight: 800, fontSize: "0.75rem" }}
                        />
                        <Typography variant="h5" sx={{ fontWeight: 900, color: tier.color }}>
                          {tier.count}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: colors.textPrimary, fontSize: "0.88rem" }}>
                        {tier.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block", mt: 0.5 }}>
                        {pct}% of cohort • {tier.desc}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>

          {/* Charts Row: Score Progression + 5-Tier Distribution Donut */}
          <Grid container spacing={3}>
            {/* Performance Trajectory Area Chart */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "18px", height: "100%" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                    <TrendingUpIcon sx={{ color: colors.primary }} /> Practical Lab Assessment Score Trajectory
                  </Typography>
                  <Chip label={`Last ${stats.scoreTrend.length} Tests`} size="small" sx={{ bgcolor: "var(--overlay-subtle)", color: colors.textSecondary }} />
                </Box>
                <Box sx={{ height: 320, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.scoreTrend}>
                      <defs>
                        <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.primary} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" vertical={false} />
                      <XAxis dataKey="date" stroke={colors.textSecondary} fontSize={12} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke={colors.textSecondary} fontSize={12} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "12px", color: "var(--text)" }}
                        formatter={(value, name, item) => [`${value}% (${getAssessmentStatus(value).label.split("(")[0].trim()})`, item?.payload?.team || "Team"]}
                      />
                      <Area type="monotone" dataKey="score" stroke={colors.primary} strokeWidth={3} fill="url(#scoreColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* Score Distribution Donut Chart */}
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "18px", height: "100%", display: "flex", flexDirection: "column" }}>
                <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 700, mb: 1 }}>
                  5-Tier Result Distribution
                </Typography>
                <Box sx={{ height: 320, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.distribution} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={5} dataKey="value">
                        {stats.distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "12px" }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Section Mastery Breakdown + Employment Type Comparative Analytics */}
          <Grid container spacing={3}>
            {/* Section Mastery Horizontal Bar */}
            <Grid item xs={12} lg={7}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "18px", height: "100%" }}>
                <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 700, mb: 2 }}>
                  Section Mastery Benchmarks (FDB → BEP → OTO → ONT → Tools → Education → Photos)
                </Typography>
                <Box sx={{ height: 300, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.sectionAverages} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} stroke={colors.textSecondary} fontSize={12} />
                      <YAxis type="category" dataKey="section" stroke={colors.textSecondary} fontSize={11} width={130} />
                      <RechartsTooltip contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "12px", color: "var(--text)" }} />
                      <Bar dataKey="avg" fill="var(--accent-text)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* Subcontractor vs Direct Employee Comparison */}
            <Grid item xs={12} lg={5}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "18px", height: "100%" }}>
                <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 700, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <BusinessIcon sx={{ color: "#00bcd4" }} /> Employment Classification Benchmark
                </Typography>
                <Stack spacing={2.5}>
                  {/* Direct Employee */}
                  <Paper sx={{ p: 2.5, bgcolor: "rgba(0, 188, 212, 0.05)", border: `1px solid rgba(0, 188, 212, 0.25)`, borderRadius: "14px" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#00bcd4" }}>
                        Direct Employees
                      </Typography>
                      <Chip label={`${stats.employmentStats.employee.count} Evaluated`} size="small" sx={{ bgcolor: "rgba(0, 188, 212, 0.2)", color: "#00bcd4", fontWeight: 700 }} />
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>Average Mastery Score</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.textPrimary }}>
                          {stats.employmentStats.employee.avgScore}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>Cohort Pass Rate</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: "#4caf50" }}>
                          {stats.employmentStats.employee.passRate}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Subcontractor */}
                  <Paper sx={{ p: 2.5, bgcolor: "rgba(156, 39, 176, 0.05)", border: `1px solid rgba(156, 39, 176, 0.25)`, borderRadius: "14px" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#ba68c8" }}>
                        Subcontractors (Partners)
                      </Typography>
                      <Chip label={`${stats.employmentStats.subcontractor.count} Evaluated`} size="small" sx={{ bgcolor: "rgba(156, 39, 176, 0.2)", color: "#ba68c8", fontWeight: 700 }} />
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>Average Mastery Score</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.textPrimary }}>
                          {stats.employmentStats.subcontractor.avgScore}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>Cohort Pass Rate</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: "#4caf50" }}>
                          {stats.employmentStats.subcontractor.passRate}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Safety & Compliance Clearances Matrix Progress */}
          <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "18px" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: colors.textPrimary, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <VerifiedUserIcon sx={{ color: "#4caf50" }} /> Safety & Compliance Clearances Compliance Rates (DD • ES • FA • FF • RA • WAH)
            </Typography>
            <Grid container spacing={2}>
              {CERTIFICATE_DEFINITIONS.map((cert) => {
                const count = stats.certStats[cert.key] || 0;
                const pct = assessments.length > 0 ? Math.round((count / assessments.length) * 100) : 0;
                return (
                  <Grid item xs={12} sm={6} md={2} key={cert.key}>
                    <Paper sx={{ p: 2, bgcolor: "var(--overlay-subtle)", border: `1px solid ${colors.border}`, borderRadius: "14px" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Chip label={cert.code} size="small" sx={{ bgcolor: "rgba(123, 104, 238, 0.2)", color: colors.primary, fontWeight: 800 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: pct >= 80 ? "#4caf50" : "#ff9800" }}>
                          {pct}%
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: colors.textPrimary, fontSize: "0.85rem" }}>
                        {cert.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block", mt: 0.5, fontSize: "0.75rem" }}>
                        {count} / {assessments.length} Cleared
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>

          {/* Leaderboards: Top Performers vs Priority Retraining */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "18px" }}>
                <Typography variant="subtitle1" sx={{ color: colors.success, mb: 2, fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                  <EmojiEventsIcon /> Top Performing Field Teams
                </Typography>
                <Stack spacing={1.5}>
                  {stats.topTeams.map((team, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 2,
                        bgcolor: "rgba(76, 175, 80, 0.05)",
                        border: `1px solid #4caf5030`,
                        borderRadius: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: colors.textPrimary }}>
                          {team.teamName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                          {team.teamCompany} • {team.employmentType}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip label={`${team.avg}%`} size="small" sx={{ bgcolor: "#4caf5022", color: "#4caf50", fontWeight: 800, border: "1px solid #4caf50" }} />
                        {team.latestAssess && (
                          <>
                            <Tooltip title="Export Arabic PDF (تقرير الفني)">
                              <IconButton
                                size="small"
                                onClick={() => exportArabicLabAssessmentPDF(team.latestAssess)}
                                sx={{ color: "#ef4444" }}
                              >
                                <PictureAsPdfIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Export Excel Report">
                              <IconButton
                                size="small"
                                onClick={() => exportIndividualLabAssessmentReport(team.latestAssess)}
                                sx={{ color: "#4caf50" }}
                              >
                                <FileDownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </Box>
                  ))}
                  {stats.topTeams.length === 0 && <Typography variant="caption" color={colors.textSecondary}>No evaluated teams yet.</Typography>}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "18px" }}>
                <Typography variant="subtitle1" sx={{ color: colors.error, mb: 2, fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                  <WarningIcon /> Priority Follow-Up / Retraining Required
                </Typography>
                <Stack spacing={1.5}>
                  {stats.bottomTeams.map((team, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 2,
                        bgcolor: "rgba(244, 67, 54, 0.05)",
                        border: `1px solid #f4433630`,
                        borderRadius: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: colors.textPrimary }}>
                          {team.teamName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                          {team.teamCompany} • {team.employmentType}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip label={`${team.avg}%`} size="small" sx={{ bgcolor: "#f4433622", color: "#f44336", fontWeight: 800, border: "1px solid #f44336" }} />
                        {team.latestAssess && (
                          <>
                            <Tooltip title="Export Arabic PDF (تقرير الفني)">
                              <IconButton
                                size="small"
                                onClick={() => exportArabicLabAssessmentPDF(team.latestAssess)}
                                sx={{ color: "#ef4444" }}
                              >
                                <PictureAsPdfIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Export Excel Report">
                              <IconButton
                                size="small"
                                onClick={() => exportIndividualLabAssessmentReport(team.latestAssess)}
                                sx={{ color: "#f44336" }}
                              >
                                <FileDownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </Box>
                  ))}
                  {stats.bottomTeams.length === 0 && <Typography variant="caption" color={colors.textSecondary}>No evaluated teams yet.</Typography>}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      )}

      {/* Detailed Report Dialog */}
      <LabAssessmentDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        assessment={selectedAssessmentForDetail}
        colors={colors}
        getAssessmentStatus={getAssessmentStatus}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deletingAssessment && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: colors.surface,
            color: colors.textPrimary,
            borderRadius: "20px",
            border: `1px solid rgba(244, 67, 54, 0.4)`,
            boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1, color: colors.error, fontWeight: 800 }}>
          <WarningIcon sx={{ color: colors.error, fontSize: "1.8rem" }} /> Permanent Delete Confirmation
        </DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Alert severity="error" variant="filled" sx={{ mb: 2.5, borderRadius: "12px", fontWeight: 600 }}>
            Permanent Delete Warning: This action cannot be undone!
          </Alert>
          <Typography variant="body1" sx={{ color: colors.textPrimary, mb: 2, lineHeight: 1.6 }}>
            You are about to permanently delete the <strong>E2E FTTH Practical Assessment</strong> for team{" "}
            <span style={{ color: colors.primary, fontWeight: 700 }}>
              {assessmentToDelete?.fieldTeamName || assessmentToDelete?.fieldTeamId?.teamName || "Selected Team"}
            </span>.
          </Typography>
          <Paper sx={{ p: 2, bgcolor: "var(--overlay-subtle)", borderRadius: "12px", border: `1px solid ${colors.border}`, mb: 2 }}>
            <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block", mb: 0.5 }}>
              Assessment Date: <strong>{assessmentToDelete?.assessmentDate ? new Date(assessmentToDelete.assessmentDate).toLocaleDateString() : (assessmentToDelete?.createdAt ? new Date(assessmentToDelete.createdAt).toLocaleDateString() : "-")}</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block", mb: 0.5 }}>
              Assessor: <strong>{assessmentToDelete?.conductedBy || assessmentToDelete?.assessorId?.name || "Assessor"}</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block" }}>
              Overall Score: <strong>{assessmentToDelete?.overallScore !== undefined ? assessmentToDelete.overallScore : (assessmentToDelete?.totalScore || 0)}%</strong>
            </Typography>
          </Paper>
          <Typography variant="body2" sx={{ color: colors.textSecondary }}>
            All checkpoint test results, equipment validation records, technician scores, and notes will be permanently erased from the system and all generated intelligence sheets.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1.5, borderTop: `1px solid ${colors.border}` }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deletingAssessment}
            sx={{ borderColor: colors.border, color: colors.textPrimary, borderRadius: "10px" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmPermanentDelete}
            disabled={deletingAssessment}
            startIcon={deletingAssessment ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
            sx={{
              bgcolor: "#dc2626",
              "&:hover": { bgcolor: "#b91c1c" },
              borderRadius: "10px",
              fontWeight: 700,
              px: 2.5,
            }}
          >
            {deletingAssessment ? "Permanently Deleting..." : "Permanently Delete Assessment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LabAssessment;
