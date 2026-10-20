import { StepRail, StepFooter } from "../components/ui/Stepper";
import SectionCard from "../components/ui/SectionCard";
import Badge from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import { tok } from "../theme/tokens";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  IconButton,
  Tooltip,
  Autocomplete,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import InputBase from "@mui/material/InputBase";
import Menu from "@mui/material/Menu";
import ListItemIcon from "@mui/material/ListItemIcon";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import FilterChip from "../components/ui/FilterChip";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import SafeDeleteDialog from "../components/ui/SafeDeleteDialog";
import { gridSx } from "./tasks/gridSx";
import { bulkDelete, DELETE_PATHS } from "../api/bulkDelete";
import {
  Assessment as AssessmentIcon,
  ListAlt as ListAltIcon,
  BarChart as BarChartIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Build as BuildIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  FileDownload as FileDownloadIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  VerifiedUser as VerifiedUserIcon,
  EmojiEvents as EmojiEventsIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from "@mui/icons-material";
import api from "../api/api";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import LabAssessmentDetailModal from "../components/LabAssessmentDetailModal";
import {
  exportMasterLabAssessmentReport,
  exportIndividualLabAssessmentReport,
} from "../utils/labAssessmentExcelExport";
import { exportArabicLabAssessmentPDF } from "../utils/labAssessmentArabicPdf";

// Five grading tiers, from the design palette (distinct steps for charts and badges).
const TIER_COLORS = { excellent: "#16A34A", vgood: "#0D9488", improve: "#CA8A04", suspend: "#EA580C", fail: "#DC2626" };

const scoreOf = (a) => (a?.overallScore !== undefined ? a.overallScore : a?.totalScore) ?? 0;

// Everything in a lab assessment, for the backup taken before a permanent delete.
const LAB_BACKUP_COLUMNS = [
  ["Team", (a) => a.fieldTeamName || a.fieldTeamId?.teamName],
  ["Company", (a) => a.fieldTeamId?.teamCompany || ""],
  ["Assessment date", (a) => (a.assessmentDate ? new Date(a.assessmentDate) : "")],
  ["Overall score (%)", (a) => scoreOf(a)],
  ["Conducted by", (a) => a.conductedBy || a.assessorId?.name || ""],
  ["Employment type", (a) => a.employmentType || ""],
  ["Date of birth", (a) => (a.dateOfBirth ? new Date(a.dateOfBirth) : "")],
  ["Experience (years)", (a) => a.yearsOfExperience ?? ""],
  ["Certificates", (a) => Object.entries(a.certificates || {}).filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(", ")],
  ["Section scores", (a) => Object.entries(a.sectionScores || {}).map(([k, v]) => `${k}: ${v}`).join("; ")],
  ["Equipment", (a) => (a.equipmentChecklist || []).map((e) => `${e.name || e.item}: ${e.status}`).join("; ")],
  ["Failed checkpoints", (a) => (a.sections || []).flatMap((sec) => (sec.checkpoints || []).filter((c) => c.status === "Fail").map((c) => c.name)).join("; ")],
  ["Feedback", (a) => a.feedback || a.comments || ""],
  ["Created", (a) => (a.createdAt ? new Date(a.createdAt) : "")],
  ["Record ID", (a) => a._id],
];

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
  const [labStep, setLabStep] = useState(0);
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
  const [rowMenu, setRowMenu] = useState(null); // { anchor, row }
  const isAdmin = user?.role === "Admin";

  // Tracking Filter & Search
  const [trackingFilter, setTrackingFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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
  }, []);


  const fetchTeams = async () => {
    try {
      const response = await api.get("/field-teams/get-field-teams");
      setFieldTeams(response.data || []);
    } catch {
      toast.error("Failed to fetch field teams");
    }
  };

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const response = await api.get("/lab-assessments");
      setAssessments(response.data || []);
    } catch {
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
    if (s >= 90) return { label: "Excellent (Pass)", color: TIER_COLORS.excellent, isPass: true, tier: "90-100" };
    if (s >= 80) return { label: "V.Good (Pass)", color: TIER_COLORS.vgood, isPass: true, tier: "80-89" };
    if (s >= 70) return { label: "Need improvements, and close monitoring (Pass)", color: TIER_COLORS.improve, isPass: true, tier: "70-79" };
    if (s >= 50) return { label: "Suspension, need training, then re-evaluate the team (Fail)", color: TIER_COLORS.suspend, isPass: false, tier: "50-69" };
    return { label: "Ineligible (Fail)", color: TIER_COLORS.fail, isPass: false, tier: "0-49" };
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
    setLabStep(0);
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
    setLabStep(0);
  };

  const handleDeleteAssessment = (assess) => {
    setAssessmentToDelete(assess);
    setDeleteDialogOpen(true);
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
      { name: "Excellent (90-100% / Pass)", count: tierCounts.excellent, value: tierCounts.excellent, color: TIER_COLORS.excellent },
      { name: "V.Good (80-89% / Pass)", count: tierCounts.vgood, value: tierCounts.vgood, color: TIER_COLORS.vgood },
      { name: "Need Improvements (70-79% / Pass)", count: tierCounts.needImprovement, value: tierCounts.needImprovement, color: TIER_COLORS.improve },
      { name: "Suspension & Retrain (50-69% / Fail)", count: tierCounts.suspension, value: tierCounts.suspension, color: TIER_COLORS.suspend },
      { name: "Ineligible (0-49% / Fail)", count: tierCounts.ineligible, value: tierCounts.ineligible, color: TIER_COLORS.fail },
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
        actions={
          <Button variant="outlined" startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />} onClick={() => exportMasterLabAssessmentReport({ assessments, fieldTeams })} disabled={!assessments.length}>
            Export master report
          </Button>
        }
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
            <Paper sx={{ p: { xs: 2, md: 2.5 }, borderRadius: "10px", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
              <Stack spacing={2.5}>
                {/* Form Header */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                  <Box>
                    <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                      {isEditing ? `Edit Practical Assessment – ${selectedTeam?.teamName || ""}` : "Practical Lab Assessment Form"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                      Conducted by Assessor: <strong>{user?.name || "Quality Specialist"}</strong>
                    </Typography>
                  </Box>

                  {isEditing && (
                    <Button variant="outlined" onClick={resetForm}>
                      Cancel edit
                    </Button>
                  )}
                </Box>

                {/* Score & Evaluation Status Sticky Bar */}
                <Paper
                  sx={{
                    p: 2.5,
                    bgcolor: "var(--accent-subtle)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 500 }}>
                      Live overall score · pass at 70% or more
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 0.5, flexWrap: "wrap" }}>
                      <Typography sx={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: getAssessmentStatus(liveScoreStats.percentage).color }}>
                        {liveScoreStats.percentage}%
                      </Typography>
                      <Badge color={getAssessmentStatus(liveScoreStats.percentage).color}>{getAssessmentStatus(liveScoreStats.percentage).label}</Badge>
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

                {/* Step rail */}
                <StepRail
                  active={labStep}
                  onChange={(i) => { setLabStep(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  steps={[
                    { label: "Team & profile", done: !!selectedTeam && labStep > 0 },
                    { label: "Tools & equipment", hint: `${equipmentStats.percentage}%`, done: labStep > 1, tone: equipmentStats.percentage >= 80 ? "success" : "warning" },
                    ...sections.map((sec, idx) => {
                      const st = getSectionStats(sec);
                      return {
                        label: sec.sectionTitle.replace(/^\d+\.\s*/, "").split(/\s[–-]\s/)[0],
                        hint: st.isInformational ? "info" : `${st.percentage}%`,
                        tone: st.isInformational ? "neutral" : st.isPass ? "success" : "danger",
                        done: labStep > idx + 2,
                      };
                    }),
                    { label: "Review & submit", done: false },
                  ]}
                />

                {labStep === 0 && (<>
                {/* Basic Assessment Meta Inputs */}
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" } }}>
                  <Autocomplete
                    options={fieldTeams}
                    getOptionLabel={(option) => `${option.teamName} (${option.teamCompany || "Company"})`}
                    value={selectedTeam}
                    onChange={(event, newValue) => handleTeamSelection(newValue)}
                    renderInput={(params) => <TextField {...params} label="Field team" required error={labStep > 0 && !selectedTeam} />}
                  />
                  <TextField
                    type="date"
                    fullWidth
                    label="Assessment date"
                    required
                    value={assessmentDate}
                    onChange={(e) => setAssessmentDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Box>

                {/* Field Team Profile & Safety Compliance Info */}
                <Paper
                  sx={{
                    p: 3,
                    bgcolor: "var(--surface-subtle)",
                    border: `1px solid ${colors.border}`,
                    borderRadius: "10px",
                  }}
                >
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
                      <PersonIcon sx={{ color: colors.primary }} /> Field Team Profile & Safety Certifications
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      Technician employment type, years of expertise, and mandatory safety & compliance certificates
                    </Typography>
                  </Box>

                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    {/* Employment Type */}
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 600, textTransform: "uppercase", display: "block", mb: 1 }}>
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
                              <Chip label="Partner" size="small" sx={{ height: 20, fontSize: "0.7rem", bgcolor: "rgba(108, 71, 255, 0.15)", color: colors.primary }} />
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
                              <Chip label="Direct" size="small" sx={{ height: 20, fontSize: "0.7rem", bgcolor: "rgba(22, 163, 74, 0.15)", color: colors.success }} />
                            </Box>
                          }
                        />
                      </RadioGroup>
                    </Grid>

                    {/* Date of Birth (DoB) & Technician Age */}
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 600, textTransform: "uppercase" }}>
                          Date of Birth (DoB)
                        </Typography>
                        {calculatedAge !== null && (
                          <Chip
                            label={`Age: ${calculatedAge} Yrs`}
                            size="small"
                            sx={{
                              bgcolor: "rgba(219, 39, 119, 0.15)",
                              color: "#DB2777",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              height: 22,
                              border: "1px solid rgba(219, 39, 119, 0.4)",
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
                      />
                    </Grid>

                    {/* Experience: Years, Months, Days */}
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 600, textTransform: "uppercase", display: "block", mb: 1 }}>
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
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Safety & Compliance Certificates */}
                  <Divider sx={{ borderColor: colors.border, mb: 2.5 }} />
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 600, textTransform: "uppercase", display: "block", mb: 1.5 }}>
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
                              bgcolor: isChecked ? "rgba(22, 163, 74, 0.08)" : "rgba(255,255,255,0.015)",
                              border: isChecked ? `1px solid ${colors.success}` : `1px solid ${colors.border}`,
                              borderRadius: "10px",
                              transition: "all 0.2s ease-in-out",
                              "&:hover": {
                                bgcolor: isChecked ? "rgba(22, 163, 74, 0.12)" : "rgba(255,255,255,0.04)",
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
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    height: 24,
                                    px: 0.5,
                                  }}
                                />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: isChecked ? colors.success : colors.textPrimary }}>
                                  {cert.title}
                                </Typography>
                              </Box>
                              <Chip
                                label={isChecked ? "Certified" : "Not Certified"}
                                size="small"
                                sx={{
                                  bgcolor: isChecked ? "rgba(22, 163, 74, 0.15)" : "rgba(255,255,255,0.05)",
                                  color: isChecked ? colors.success : colors.textSecondary,
                                  fontWeight: 600,
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

                </>)}

                {labStep === 1 && (<>
                {/* SECTION: Tools & Equipment Readiness Check */}
                <Paper sx={{ p: 3, bgcolor: "var(--surface-subtle)", border: `1px solid ${colors.border}`, borderRadius: "10px" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
                    <Box>
                      <Typography variant="h6" sx={{ color: colors.info, fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
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
                          bgcolor: equipmentStats.isPass ? "rgba(22, 163, 74,0.18)" : "rgba(220, 38, 38,0.18)",
                          color: equipmentStats.isPass ? colors.success : colors.error,
                          fontWeight: 600,
                          border: `1px solid ${equipmentStats.isPass ? colors.success : colors.error}60`,
                        }}
                      />
                      <Chip
                        label={equipmentStats.isPass ? "Pass" : "Fail"}
                        size="small"
                        sx={{
                          bgcolor: equipmentStats.isPass ? "#16A34A" : "#DC2626",
                          color: "var(--text)",
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          px: 0.5,
                        }}
                      />
                    </Stack>
                  </Box>

                  <TableContainer component={Paper} sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "10px" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "var(--surface-subtle)" }}>
                          <TableCell sx={{ color: colors.textSecondary, fontWeight: 600, width: "35%" }}>Tool / Equipment Item</TableCell>
                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 600, width: "35%" }}>Assessment Status</TableCell>
                          <TableCell sx={{ color: colors.textSecondary, fontWeight: 600, width: "30%" }}>Assessor Observations / Notes</TableCell>
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
                                        control={<Radio size="small" sx={{ color: colors.error, "&.Mui-checked": { color: "#DC2626" } }} />}
                                        label={<Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 600 }}>Not Existing</Typography>}
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
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                </>)}

                {/* One assessment section per step */}
                {sections.map((sec, sIdx) => {
                  if (labStep !== sIdx + 2) return null;
                  const secStats = getSectionStats(sec);

                  // Helper renderer for a set of checkpoints
                  const renderCheckpointsTable = (checkpointsWithIndices) => (
                    <TableContainer component={Paper} sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "10px" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "var(--surface-subtle)" }}>
                            <TableCell sx={{ color: colors.textSecondary, fontWeight: 600, width: "50%" }}>Checkpoint & Criteria</TableCell>
                            <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 600, width: "25%" }}>Result</TableCell>
                            <TableCell sx={{ color: colors.textSecondary, fontWeight: 600, width: "25%" }}>Assessor Remarks</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {checkpointsWithIndices.map(({ cp, cpIdx }) => (
                            <TableRow key={cp.id || cpIdx} sx={{ borderBottom: `1px solid ${colors.border}`, "&:hover": { bgcolor: "var(--surface-subtle)" } }}>
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
                                            label={<Typography variant="caption" sx={{ color: colors.success, fontWeight: 600 }}>Pass</Typography>}
                                          />
                                          <FormControlLabel
                                            value="Fail"
                                            control={<Radio size="small" sx={{ color: colors.error, "&.Mui-checked": { color: colors.error } }} />}
                                            label={<Typography variant="caption" sx={{ color: colors.error, fontWeight: 600 }}>Fail</Typography>}
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
                                                  input: { color: colors.textPrimary, fontWeight: 600, textAlign: "center", py: 0.5, px: 0.5, fontSize: "0.85rem" },
                                                },
                                              }}
                                            />
                                            <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 600 }}>
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
                                                      ? (isGood ? "#16A34A" : "#DC2626")
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
                    <Paper key={sec.sectionId} sx={{ p: 3, bgcolor: "var(--surface-subtle)", border: `1px solid ${colors.border}`, borderRadius: "10px" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
                        <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 600 }}>
                          {sec.sectionTitle}
                        </Typography>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={`${sec.checkpoints.length} Checkpoints`}
                            size="small"
                            sx={{ bgcolor: "rgba(108, 71, 255, 0.15)", color: colors.primary, border: `1px solid ${colors.primary}40`, fontWeight: 600 }}
                          />
                          {sec.sectionId === "sec-7" ? (
                            <Chip
                              label="Quality Supervisor Awareness (No Pass/Fail)"
                              size="small"
                              sx={{
                                bgcolor: "rgba(108, 71, 255, 0.18)",
                                color: "#ce93d8",
                                fontWeight: 600,
                                border: "1px solid rgba(108, 71, 255, 0.4)",
                              }}
                            />
                          ) : (
                            <>
                              <Chip
                                label={`${secStats.percentage}%`}
                                size="small"
                                sx={{
                                  bgcolor: secStats.isPass ? "rgba(22, 163, 74,0.18)" : "rgba(220, 38, 38,0.18)",
                                  color: secStats.isPass ? colors.success : colors.error,
                                  fontWeight: 600,
                                  border: `1px solid ${secStats.isPass ? colors.success : colors.error}60`,
                                }}
                              />
                              <Chip
                                label={secStats.isPass ? "Pass" : "Fail"}
                                size="small"
                                sx={{
                                  bgcolor: secStats.isPass ? "#16A34A" : "#DC2626",
                                  color: "var(--text)",
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  px: 0.5,
                                }}
                              />
                            </>
                          )}
                        </Stack>
                      </Box>

                      {sec.sectionId === "sec-4" && (
                        <Alert severity="info" sx={{ mb: 2.5, bgcolor: "rgba(37, 99, 235, 0.08)", border: "1px solid rgba(37, 99, 235, 0.3)", color: "#fff" }}>
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
                                  bgcolor: "var(--surface-subtle)",
                                  border: `1px solid var(--border)`,
                                  borderRadius: "10px",
                                }}
                              >
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    fontWeight: 600,
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
                                  bgcolor: "var(--surface-subtle)",
                                  border: `1px solid var(--border)`,
                                  borderRadius: "10px",
                                }}
                              >
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    fontWeight: 600,
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

                {labStep === sections.length + 2 && (<>
                <SectionCard title="Section summary" description="Scores per section. Click a row to revisit that step.">
                  {sections.map((sec, i) => {
                    const st = getSectionStats(sec);
                    return (
                      <Box key={sec.sectionId || i} component="button" type="button" onClick={() => setLabStep(i + 2)}
                        sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", py: 1, px: 0, border: 0, borderBottom: "1px solid var(--border)", background: "none", font: "inherit", textAlign: "left", cursor: "pointer", color: "var(--text)", "&:last-of-type": { borderBottom: 0 }, "&:hover": { color: "var(--accent-text)" } }}>
                        <Typography sx={{ fontSize: 13, flex: 1 }}>{sec.sectionTitle}</Typography>
                        {st.isInformational ? <Badge>Info only</Badge> : <Badge tone={st.isPass ? "success" : "danger"}>{st.percentage}% · {st.totalScore}/{st.maxScore}</Badge>}
                      </Box>
                    );
                  })}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Tools & equipment readiness</Typography>
                    <Badge tone={equipmentStats.percentage >= 80 ? "success" : "warning"}>{equipmentStats.percentage}%</Badge>
                  </Box>
                </SectionCard>
                {/* Feedback & Recommendations */}
                <Paper sx={{ p: 3, bgcolor: "var(--surface-subtle)", border: `1px solid ${colors.border}`, borderRadius: "10px" }}>
                  <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 600, mb: 1 }}>
                    Assessor Overall Synthesis & Recommendations
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Provide detailed feedback, observed strengths, areas needing improvement, or re-training recommendations..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </Paper>

                </>)}

                <StepFooter
                  active={labStep}
                  count={sections.length + 3}
                  onBack={() => { setLabStep((x) => Math.max(0, x - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  onNext={() => { setLabStep((x) => Math.min(sections.length + 2, x + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  nextDisabled={labStep === 0 && !selectedTeam}
                  nextLabel={labStep === 0 && !selectedTeam ? "Select a team to continue" : "Next"}
                  extra={<Button variant="text" onClick={resetForm} sx={{ color: "var(--text-secondary)" }}>Reset form</Button>}
                  finish={
                    <Button variant="contained" size="large" onClick={handleSubmit} disabled={!selectedTeam}>
                      {isEditing ? "Update practical assessment" : "Submit assessment"}
                    </Button>
                  }
                />
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: TRACKING TABLE */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: 32, px: 1.25, width: { xs: "100%", sm: 260 }, mr: { sm: 0.5 }, borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-xs)", "&:focus-within": { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-ring)" } }}>
              <SearchIcon sx={{ fontSize: 17, color: "var(--text-muted)" }} />
              <InputBase value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search team or company…" inputProps={{ "aria-label": "Search teams" }} sx={{ flex: 1, fontSize: 13 }} />
            </Box>
            <FilterChip
              label="Status"
              single
              value={trackingFilter === "all" ? [] : [trackingFilter]}
              onChange={(v) => setTrackingFilter(v[0] || "all")}
              options={[
                { value: "tested", label: "Evaluated", hint: stats.testedTeams },
                { value: "pending", label: "Pending", hint: stats.pendingTeams },
                { value: "passed", label: "Passed", hint: stats.testedTeams - stats.failCount },
                { value: "failed", label: "Failed / retrain", hint: stats.failCount },
              ]}
            />
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>{loading ? "Loading…" : `${trackingData.length} of ${fieldTeams.length} teams`}</Typography>
          </Box>

          <DataGrid
            rows={trackingData}
            getRowId={(row) => row._id}
            onRowClick={({ row }) => { if (row.isTested) { setSelectedAssessmentForDetail(row.lastAssessment); setDetailModalOpen(true); } }}
            disableRowSelectionOnClick
            autoHeight
            rowHeight={52}
            columnHeaderHeight={40}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: "assessmentDate", sort: "desc" }] } }}
            slots={{ noRowsOverlay: () => <EmptyState title="No teams match" description="Try another status or clear the search." minHeight={200} /> }}
            sx={{ ...gridSx, minHeight: 360 }}
            columns={[
              {
                field: "teamName", headerName: "Team", flex: 1.2, minWidth: 170,
                renderCell: ({ row }) => (
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap dir="auto" sx={{ fontSize: 13, fontWeight: 500 }}>{row.teamName}</Typography>
                    <Typography noWrap sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{row.teamCompany || "—"}</Typography>
                  </Box>
                ),
              },
              { field: "employmentType", headerName: "Type", width: 140, valueGetter: (v) => v || "Subcontractor", renderCell: ({ value }) => <Badge tone={value === "Direct Employee" || value === "Employee" ? "info" : "accent"}>{value}</Badge> },
              {
                field: "age", headerName: "Age", type: "number", width: 90, align: "left", headerAlign: "left",
                valueGetter: (_v, row) => {
                  const known = row.age ?? row.lastAssessment?.age;
                  if (known !== undefined && known !== null) return known;
                  const dob = row.dateOfBirth || row.lastAssessment?.dateOfBirth;
                  if (!dob) return null;
                  const birth = new Date(dob);
                  const now = new Date();
                  let a = now.getFullYear() - birth.getFullYear();
                  const m = now.getMonth() - birth.getMonth();
                  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) a--;
                  return a >= 0 ? a : null;
                },
                renderCell: ({ value }) => (value === null ? "—" : value),
              },
              {
                field: "experience", headerName: "Experience", width: 140,
                valueGetter: (_v, row) => formatExperienceDuration(
                  row.experienceYears !== undefined ? row.experienceYears : (row.lastAssessment?.experienceYears || 0),
                  row.experienceMonths !== undefined ? row.experienceMonths : (row.lastAssessment?.experienceMonths || 0),
                  row.experienceDays !== undefined ? row.experienceDays : (row.lastAssessment?.experienceDays || 0),
                  row.yearsOfExperience
                ),
              },
              {
                field: "score", headerName: "Score", type: "number", width: 100, align: "left", headerAlign: "left",
                valueGetter: (_v, row) => (row.isTested ? scoreOf(row.lastAssessment) : null),
                renderCell: ({ value }) => (value === null ? <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>—</Typography> : <Badge color={getAssessmentStatus(value).color}>{value}%</Badge>),
              },
              {
                field: "statusLabel", headerName: "Result", flex: 1, minWidth: 200,
                valueGetter: (_v, row) => (row.isTested ? getAssessmentStatus(scoreOf(row.lastAssessment)).label : "Pending"),
                renderCell: ({ row, value }) => (row.isTested
                  ? <Tooltip title={value}><Typography noWrap sx={{ fontSize: 12.5, color: getAssessmentStatus(scoreOf(row.lastAssessment)).color }}>{value}</Typography></Tooltip>
                  : <Badge>Pending</Badge>),
              },
              {
                field: "assessmentDate", headerName: "Assessed", type: "date", width: 120,
                valueGetter: (_v, row) => (row.isTested ? new Date(row.lastAssessment.assessmentDate || row.lastAssessment.createdAt) : null),
                renderCell: ({ value }) => (value ? value.toLocaleDateString() : "—"),
              },
              {
                field: "actions", headerName: "", width: 120, sortable: false, filterable: false, align: "right",
                renderCell: ({ row }) => (
                  <Box sx={{ display: "flex", gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                    <Button size="small" variant="outlined" onClick={() => handleNewAssessmentForTeam(row)}>Assess</Button>
                    {row.isTested && (
                      <IconButton size="small" aria-label={`More actions for ${row.teamName}`} onClick={(e) => setRowMenu({ anchor: e.currentTarget, row })}>
                        <MoreHoriz fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ),
              },
            ]}
          />

          <Menu anchorEl={rowMenu?.anchor} open={Boolean(rowMenu)} onClose={() => setRowMenu(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
            <MenuItem onClick={() => { setSelectedAssessmentForDetail(rowMenu.row.lastAssessment); setDetailModalOpen(true); setRowMenu(null); }}><ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>View report</MenuItem>
            <MenuItem onClick={() => { handleEditAssessment(rowMenu.row.lastAssessment); setRowMenu(null); }}><ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>Edit assessment</MenuItem>
            <MenuItem onClick={() => { exportIndividualLabAssessmentReport(rowMenu.row.lastAssessment); setRowMenu(null); }}><ListItemIcon><FileDownloadIcon fontSize="small" /></ListItemIcon>Export report (.xlsx)</MenuItem>
            <MenuItem onClick={() => { exportArabicLabAssessmentPDF(rowMenu.row.lastAssessment); setRowMenu(null); }}><ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>Export Arabic PDF</MenuItem>
            {isAdmin && <Divider />}
            {isAdmin && (
              <MenuItem onClick={() => { handleDeleteAssessment(rowMenu.row.lastAssessment); setRowMenu(null); }} sx={{ color: "var(--danger)" }}>
                <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: "var(--danger)" }} /></ListItemIcon>Delete latest assessment…
              </MenuItem>
            )}
          </Menu>
        </Box>
      )}

      {/* TAB 2: QUALITY & PERFORMANCE INTELLIGENCE */}
      {activeTab === 2 && (
        <Stack spacing={4}>
          {/* KPIs */}
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(6, minmax(0, 1fr))" } }}>
            <StatCard label="Evaluated teams" value={stats.testedTeams} hint={`of ${stats.totalTeams} (${stats.completionRate}%)`} />
            <StatCard label="Average score" value={`${stats.avgScore}%`} hint={getAssessmentStatus(stats.avgScore).label.split("(")[0].trim()} />
            <StatCard label="Pass rate (≥ 70%)" value={`${stats.passRate}%`} hint={`${stats.testedTeams - stats.failCount} passed · ${stats.failCount} failed`} />
            <StatCard label="Tools readiness" value={`${stats.equipmentReadinessRate}%`} hint="Valid and calibrated equipment" />
            <StatCard label="Average experience" value={`${stats.avgExpYears} yrs`} hint="Technician tenure" />
            <StatCard label="All 6 clearances" value={`${assessments.length > 0 ? Math.round((stats.certStats.all6 / assessments.length) * 100) : 0}%`} hint={`${stats.certStats.all6} fully certified`} />
          </Box>

          {/* 5-tier breakdown */}
          <SectionCard title="Results by tier" description="Latest qualification tier of every assessment">
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(5, minmax(0, 1fr))" } }}>
              {[
                { label: "Excellent", range: "90–100%", count: stats.tierCounts.excellent, color: TIER_COLORS.excellent, desc: "Full qualification, autonomous deployment" },
                { label: "Very good", range: "80–89%", count: stats.tierCounts.vgood, color: TIER_COLORS.vgood, desc: "Qualified with high confidence" },
                { label: "Needs improvement", range: "70–79%", count: stats.tierCounts.needImprovement, color: TIER_COLORS.improve, desc: "Pass with close supervision" },
                { label: "Suspend & retrain", range: "50–69%", count: stats.tierCounts.suspension, color: TIER_COLORS.suspend, desc: "Practical re-training required" },
                { label: "Ineligible", range: "0–49%", count: stats.tierCounts.ineligible, color: TIER_COLORS.fail, desc: "Disqualified, full restart" },
              ].map((tier) => (
                <Box key={tier.label} sx={{ p: 1.75, borderRadius: "8px", border: "1px solid var(--border)", borderTop: `3px solid ${tier.color}`, backgroundColor: "var(--surface)" }}>
                  <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{tier.label}</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{tier.count}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", mt: 0.25 }}>
                    {tier.range} · {assessments.length > 0 ? Math.round((tier.count / assessments.length) * 100) : 0}% of assessments
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "var(--text-muted)", mt: 0.5 }}>{tier.desc}</Typography>
                </Box>
              ))}
            </Box>
          </SectionCard>

          {/* Charts Row: Score Progression + 5-Tier Distribution Donut */}
          <Grid container spacing={3}>
            {/* Performance Trajectory Area Chart */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "10px", height: "100%" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
                    <TrendingUpIcon sx={{ color: colors.primary }} /> Practical Lab Assessment Score Trajectory
                  </Typography>
                  <Chip label={`Last ${stats.scoreTrend.length} Tests`} size="small" sx={{ bgcolor: "var(--surface-subtle)", color: colors.textSecondary }} />
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
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" stroke={colors.textSecondary} fontSize={12} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke={colors.textSecondary} fontSize={12} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "10px", color: "var(--text)" }}
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
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "10px", height: "100%", display: "flex", flexDirection: "column" }}>
                <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 600, mb: 1 }}>
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
                      <RechartsTooltip contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "10px" }} />
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
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "10px", height: "100%" }}>
                <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 600, mb: 2 }}>
                  Section Mastery Benchmarks (FDB → BEP → OTO → ONT → Tools → Education → Photos)
                </Typography>
                <Box sx={{ height: 300, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.sectionAverages} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} stroke={colors.textSecondary} fontSize={12} />
                      <YAxis type="category" dataKey="section" stroke={colors.textSecondary} fontSize={11} width={130} />
                      <RechartsTooltip contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "10px", color: "var(--text)" }} />
                      <Bar dataKey="avg" fill="var(--accent-text)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* Subcontractor vs Direct Employee Comparison */}
            <Grid item xs={12} lg={5}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "10px", height: "100%" }}>
                <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 600, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <BusinessIcon sx={{ color: "#2563EB" }} /> Employment Classification Benchmark
                </Typography>
                <Stack spacing={2.5}>
                  {/* Direct Employee */}
                  <Paper sx={{ p: 2.5, bgcolor: "rgba(37, 99, 235, 0.05)", border: `1px solid rgba(37, 99, 235, 0.25)`, borderRadius: "10px" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#2563EB" }}>
                        Direct Employees
                      </Typography>
                      <Chip label={`${stats.employmentStats.employee.count} Evaluated`} size="small" sx={{ bgcolor: "rgba(37, 99, 235, 0.2)", color: "#2563EB", fontWeight: 600 }} />
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>Average Mastery Score</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                          {stats.employmentStats.employee.avgScore}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>Cohort Pass Rate</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: "#16A34A" }}>
                          {stats.employmentStats.employee.passRate}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Subcontractor */}
                  <Paper sx={{ p: 2.5, bgcolor: "rgba(108, 71, 255, 0.05)", border: `1px solid rgba(108, 71, 255, 0.25)`, borderRadius: "10px" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#6C47FF" }}>
                        Subcontractors (Partners)
                      </Typography>
                      <Chip label={`${stats.employmentStats.subcontractor.count} Evaluated`} size="small" sx={{ bgcolor: "rgba(108, 71, 255, 0.2)", color: "#6C47FF", fontWeight: 600 }} />
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>Average Mastery Score</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                          {stats.employmentStats.subcontractor.avgScore}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>Cohort Pass Rate</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: "#16A34A" }}>
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
          <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "10px" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: colors.textPrimary, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <VerifiedUserIcon sx={{ color: "#16A34A" }} /> Safety & Compliance Clearances Compliance Rates (DD • ES • FA • FF • RA • WAH)
            </Typography>
            <Grid container spacing={2}>
              {CERTIFICATE_DEFINITIONS.map((cert) => {
                const count = stats.certStats[cert.key] || 0;
                const pct = assessments.length > 0 ? Math.round((count / assessments.length) * 100) : 0;
                return (
                  <Grid item xs={12} sm={6} md={2} key={cert.key}>
                    <Paper sx={{ p: 2, bgcolor: "var(--surface-subtle)", border: `1px solid ${colors.border}`, borderRadius: "10px" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Chip label={cert.code} size="small" sx={{ bgcolor: "rgba(108, 71, 255, 0.2)", color: colors.primary, fontWeight: 600 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: pct >= 80 ? "#16A34A" : "#D97706" }}>
                          {pct}%
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: colors.textPrimary, fontSize: "0.85rem" }}>
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
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "10px" }}>
                <Typography variant="subtitle1" sx={{ color: colors.success, mb: 2, fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
                  <EmojiEventsIcon /> Top Performing Field Teams
                </Typography>
                <Stack spacing={1.5}>
                  {stats.topTeams.map((team, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 2,
                        bgcolor: "rgba(22, 163, 74, 0.05)",
                        border: `1px solid #16A34A30`,
                        borderRadius: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                          {team.teamName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                          {team.teamCompany} • {team.employmentType}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip label={`${team.avg}%`} size="small" sx={{ bgcolor: "#16A34A22", color: "#16A34A", fontWeight: 600, border: "1px solid #16A34A" }} />
                        {team.latestAssess && (
                          <>
                            <Tooltip title="Export Arabic PDF (تقرير الفني)">
                              <IconButton
                                size="small"
                                onClick={() => exportArabicLabAssessmentPDF(team.latestAssess)}
                                sx={{ color: "#DC2626" }}
                              >
                                <PictureAsPdfIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Export Excel Report">
                              <IconButton
                                size="small"
                                onClick={() => exportIndividualLabAssessmentReport(team.latestAssess)}
                                sx={{ color: "#16A34A" }}
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
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "10px" }}>
                <Typography variant="subtitle1" sx={{ color: colors.error, mb: 2, fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
                  <WarningIcon /> Priority Follow-Up / Retraining Required
                </Typography>
                <Stack spacing={1.5}>
                  {stats.bottomTeams.map((team, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 2,
                        bgcolor: "rgba(220, 38, 38, 0.05)",
                        border: `1px solid #DC262630`,
                        borderRadius: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                          {team.teamName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                          {team.teamCompany} • {team.employmentType}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip label={`${team.avg}%`} size="small" sx={{ bgcolor: "#DC262622", color: "#DC2626", fontWeight: 600, border: "1px solid #DC2626" }} />
                        {team.latestAssess && (
                          <>
                            <Tooltip title="Export Arabic PDF (تقرير الفني)">
                              <IconButton
                                size="small"
                                onClick={() => exportArabicLabAssessmentPDF(team.latestAssess)}
                                sx={{ color: "#DC2626" }}
                              >
                                <PictureAsPdfIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Export Excel Report">
                              <IconButton
                                size="small"
                                onClick={() => exportIndividualLabAssessmentReport(team.latestAssess)}
                                sx={{ color: "#DC2626" }}
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

      {/* Permanent delete: backup export + typed confirmation */}
      <SafeDeleteDialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setAssessmentToDelete(null); }}
        records={assessmentToDelete ? [assessmentToDelete] : []}
        noun={{ one: "lab assessment", many: "lab assessments" }}
        nameOf={(a) => `${a.fieldTeamName || a.fieldTeamId?.teamName || "Team"} · ${new Date(a.assessmentDate || a.createdAt).toLocaleDateString()} · ${scoreOf(a)}%`}
        exportColumns={LAB_BACKUP_COLUMNS}
        exportFilename="lab-assessment"
        onDelete={(list) => bulkDelete(DELETE_PATHS.lab, list.map((a) => a._id))}
        onDeleted={({ deleted }) => {
          setAssessments((prev) => prev.filter((a) => !deleted.includes(a._id)));
          if (deleted.includes(editingId)) resetForm();
        }}
      />
    </Box>
  );
};

export default LabAssessment;
