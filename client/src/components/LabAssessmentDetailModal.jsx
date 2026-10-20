import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Grid,
  Chip,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material";
import {
  Close as CloseIcon,
  Print as PrintIcon,
  FileDownload as FileDownloadIcon,
  CheckCircle as CheckCircleIcon,
  Build as BuildIcon,
  Speed as SpeedIcon,
  Router as RouterIcon,
  Sensors as SensorsIcon,
  School as SchoolIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  SettingsInputComponent as SettingsIcon,
  PhotoCamera as PhotoCameraIcon,
} from "@mui/icons-material";
import { exportIndividualLabAssessmentReport } from "../utils/labAssessmentExcelExport";
import { exportArabicLabAssessmentReport } from "../utils/labAssessmentArabicExcelExport";
import { getInitialSections } from "../pages/LabAssessment";

// Normalize raw DB sections against official checkpoint definitions to prevent duplicate names
const normalizeForDisplay = (rawSections) => {
  const defaultSections = getInitialSections();
  if (!rawSections || !Array.isArray(rawSections) || rawSections.length === 0) return defaultSections;

  return defaultSections.map((defSec, sIdx) => {
    const matchedSec = rawSections.find(
      (es) => es.sectionId === defSec.sectionId || es.sectionTitle?.trim() === defSec.sectionTitle?.trim()
    ) || rawSections[sIdx];

    if (!matchedSec) return defSec;

    const is10PtSec = defSec.sectionId === "sec-8" || defSec.sectionId === "sec-9" || defSec.sectionTitle?.includes("Photo") || defSec.sectionTitle?.includes("Self-Assessment") || defSec.sectionTitle?.includes("Communication");

    const mergedCheckpoints = defSec.checkpoints.map((defCp, cpIdx) => {
      const matchedCp = matchedSec.checkpoints?.find(
        (ecp) => (ecp.id && ecp.id === defCp.id) || (ecp.name && ecp.name.trim() === defCp.name.trim())
      ) || matchedSec.checkpoints?.[cpIdx];

      const cpMax = is10PtSec ? 10 : 5;
      const passThreshold = is10PtSec ? 7 : 4;

      if (!matchedCp) {
        return { ...defCp, maxScore: cpMax, score: cpMax, status: "Pass", notes: "" };
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
        name: defCp.name,           // Always use official checkpoint name
        subSection: defCp.subSection, // Always use official subSection
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

const LabAssessmentDetailModal = ({ open, onClose, assessment, colors, getAssessmentStatus }) => {
  const printRef = useRef();

  if (!assessment) return null;

  const teamName = assessment.fieldTeamId?.teamName || assessment.fieldTeamName || "Unknown Team";
  const teamCompany = assessment.fieldTeamId?.teamCompany || "N/A";
  const assessorName = assessment.conductedBy || assessment.assessorId?.name || "Assessor";
  const assessmentDate = assessment.assessmentDate || assessment.createdAt || new Date();
  const score = assessment.overallScore !== undefined ? assessment.overallScore : (assessment.totalScore || 0);
  const defaultGetAssessmentStatus = (score) => {
    const s = Number(score) || 0;
    if (s >= 90) return { label: "Excellent (Pass)", color: "#16A34A", isPass: true, tier: "90-100" };
    if (s >= 80) return { label: "V.Good (Pass)", color: "#16A34A", isPass: true, tier: "80-89" };
    if (s >= 70) return { label: "Need improvements, and close monitoring (Pass)", color: "#D97706", isPass: true, tier: "70-79" };
    if (s >= 50) return { label: "Suspension, need training, then re-evaluate the team (Fail)", color: "#D97706", isPass: false, tier: "50-69" };
    return { label: "Ineligible (Fail)", color: "#DC2626", isPass: false, tier: "0-49" };
  };

  const statusInfo = getAssessmentStatus ? getAssessmentStatus(score) : defaultGetAssessmentStatus(score);

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    const isPass = status === "Pass" || status === "Valid" || status === "Available";
    const isFail = status === "Fail" || status === "Not Valid" || status === "Not Available" || status === "Not Existing" || status === "Missing";
    const isWarn = status === "Need Maintenance";

    let color = "var(--text-muted)";
    let bg = "rgba(158,158,158,0.15)";
    if (isPass) {
      color = "#16A34A";
      bg = "rgba(22, 163, 74, 0.15)";
    } else if (isFail) {
      color = "#DC2626";
      bg = "rgba(220, 38, 38, 0.15)";
    } else if (isWarn) {
      color = "#D97706";
      bg = "rgba(217, 119, 6, 0.15)";
    }

    return (
      <Chip
        label={status || "N/A"}
        size="small"
        sx={{
          bgcolor: bg,
          color: color,
          fontWeight: "600",
          border: `1px solid ${color}40`,
          fontSize: "0.75rem",
        }}
      />
    );
  };

  const sectionIcons = {
    "1. FDB – Fiber Splicing & Fiber Management": <SensorsIcon sx={{ color: "var(--accent-text)" }} />,
    "2. BEP – Outdoor/Indoor Fiber Splicing": <SettingsIcon sx={{ color: "#2563EB" }} />,
    "3. OTO – Splicing, Fiber Management & Optical Testing": <SpeedIcon sx={{ color: "#D97706" }} />,
    "4. ONT – Installation, Configuration & Service Activation": <RouterIcon sx={{ color: "#DB2777" }} />,
    "5. Assistant Tools & Mobile Applications": <BuildIcon sx={{ color: "#16A34A" }} />,
    "6. Customer Education": <SchoolIcon sx={{ color: "#16A34A" }} />,
    "7. Quality Ticket Awareness": <AssignmentTurnedInIcon sx={{ color: "#6C47FF" }} />,
    "8. Self-Assessment & Photo Documentation": <PhotoCameraIcon sx={{ color: "#2563EB" }} />,
    "9. Communication & Professional Behaviour": <SchoolIcon sx={{ color: "#D97706" }} />,
  };

  // Tools & Equipment stats for detail modal
  let eqValidCount = 0;
  let eqTotalCount = assessment.equipmentChecklist?.length || 0;
  assessment.equipmentChecklist?.forEach((item) => {
    if (item.status === "Valid" || item.status === "Available") eqValidCount += 1;
    else if (item.status === "Need Maintenance") eqValidCount += 0.5;
  });
  const eqPercentage = eqTotalCount > 0 ? Math.round((eqValidCount / eqTotalCount) * 100) : 100;
  const isEqPass = eqPercentage >= 70;

  // Helper table renderer
  const renderDetailTable = (checkpointsList, section) => (
    <TableContainer component={Paper} sx={{ bgcolor: "var(--overlay-subtle)", border: `1px solid ${colors?.border || "var(--border)"}`, borderRadius: "10px" }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: "var(--overlay-subtle)" }}>
            <TableCell sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600, width: "55%" }}>Checkpoint</TableCell>
            <TableCell align="center" sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600, width: "15%" }}>Result</TableCell>
            <TableCell sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600, width: "30%" }}>Assessor Observations / Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {checkpointsList.map((cp, cpIdx) => {
            const is10Pt =
              section?.sectionId === "sec-8" ||
              section?.sectionId === "sec-9" ||
              section?.sectionTitle?.includes("Photo") ||
              section?.sectionTitle?.includes("Self-Assessment") ||
              section?.sectionTitle?.includes("Communication") ||
              cp.id === "cp-8-photos-self-assess" ||
              cp.id === "cp-9-comm-behaviour" ||
              cp.name?.includes("Photo") ||
              cp.name?.includes("Communication");
            const cpMax = is10Pt ? 10 : (cp.maxScore || 5);
            const passThreshold = is10Pt ? 7 : 4;
            const scoreVal = cp.score !== undefined ? cp.score : (cp.status === "Pass" ? cpMax : 0);
            const isPass = cp.status === "Pass" || scoreVal >= passThreshold;

            return (
              <TableRow key={cpIdx} sx={{ borderBottom: `1px solid ${colors?.border || "var(--border)"}` }}>
                <TableCell sx={{ color: colors?.textPrimary || "#fff", py: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{cp.name}</Typography>
                  {cp.subSection && (
                    <Typography variant="caption" sx={{ color: colors?.textSecondary || "var(--text-secondary)" }}>
                      {cp.subSection}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  {cp.status === "N/A" ? (
                    getStatusBadge("N/A")
                  ) : (
                    <Stack direction="row" spacing={0.75} justifyContent="center" alignItems="center">
                      <Chip
                        label={`${scoreVal} / ${cpMax} Pts`}
                        size="small"
                        sx={{
                          bgcolor: isPass ? "rgba(22, 163, 74, 0.15)" : "rgba(220, 38, 38, 0.15)",
                          color: isPass ? "#16A34A" : "#DC2626",
                          fontWeight: "600",
                          border: `1px solid ${isPass ? "#16A34A40" : "#DC262640"}`,
                          fontSize: "0.75rem",
                        }}
                      />
                      <Chip
                        label={isPass ? "Pass" : "Fail"}
                        size="small"
                        sx={{
                          bgcolor: isPass ? "#16A34A" : "#DC2626",
                          color: "var(--text)",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                          height: 22,
                          px: 0.5,
                        }}
                      />
                    </Stack>
                  )}
                </TableCell>
                <TableCell sx={{ color: cp.notes ? (colors?.textPrimary || "#fff") : "rgba(255,255,255,0.3)", fontStyle: cp.notes ? "normal" : "italic" }}>
                  {cp.notes || "None"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const expYears = assessment.experienceYears !== undefined ? assessment.experienceYears : (assessment.fieldTeamId?.experienceYears !== undefined ? assessment.fieldTeamId.experienceYears : (assessment.yearsOfExperience ? Math.floor(Number(assessment.yearsOfExperience)) : 0));
  const expMonths = assessment.experienceMonths !== undefined ? assessment.experienceMonths : (assessment.fieldTeamId?.experienceMonths !== undefined ? assessment.fieldTeamId.experienceMonths : (assessment.yearsOfExperience ? Math.round((Number(assessment.yearsOfExperience) % 1) * 12) : 0));
  const expDays = assessment.experienceDays !== undefined ? assessment.experienceDays : (assessment.fieldTeamId?.experienceDays || 0);

  const formatExp = (y, m, d) => {
    const parts = [];
    if (y > 0) parts.push(`${y} ${y === 1 ? "Year" : "Years"}`);
    if (m > 0) parts.push(`${m} ${m === 1 ? "Month" : "Months"}`);
    if (d > 0) parts.push(`${d} ${d === 1 ? "Day" : "Days"}`);
    return parts.length > 0 ? parts.join(", ") : "0 Days";
  };
  const experienceText = formatExp(expYears, expMonths, expDays);

  const teamEmploymentType = assessment.employmentType || assessment.fieldTeamId?.employmentType || "Subcontractor";
  const teamCertificates = assessment.certificates || assessment.fieldTeamId?.certificates || {};

  const teamDateOfBirth = assessment.dateOfBirth || assessment.fieldTeamId?.dateOfBirth;
  let teamAge = assessment.age !== undefined && assessment.age !== null ? assessment.age : (assessment.fieldTeamId?.age !== undefined && assessment.fieldTeamId?.age !== null ? assessment.fieldTeamId.age : null);
  if (teamAge === null && teamDateOfBirth) {
    const birth = new Date(teamDateOfBirth);
    const ref = assessment.assessmentDate ? new Date(assessment.assessmentDate) : new Date();
    let a = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) a--;
    teamAge = a >= 0 ? a : null;
  }

  const CERT_DEFINITIONS = [
    { key: "dd", code: "DD", title: "Defensive Driving", description: "Safe vehicle operation, hazard perception & driving compliance" },
    { key: "es", code: "ES", title: "Electrical Safety", description: "Safe handling of electrical sources, grounding & arc flash prevention" },
    { key: "fa", code: "FA", title: "First Aid", description: "Emergency first response, CPR & basic trauma management" },
    { key: "ff", code: "FF", title: "Fire Fighting", description: "Fire extinguisher operation, fire risk prevention & evacuation" },
    { key: "ra", code: "RA", title: "Risk Assessment", description: "Job site hazard identification, risk evaluation & control measures" },
    { key: "wah", code: "WAH", title: "Work at Height", description: "Ladder safety, harness usage, pole climbing & fall arrest systems" },
  ];

  const handleExportArabicExcel = () => {
  const normalizedSections = normalizeForDisplay(assessment.sections);
  const fullData = {
    ...assessment,
    sections: normalizedSections,
    fieldTeam: assessment.fieldTeam || assessment.fieldTeamId || {
      teamName: assessment.teamName || teamName,
      company: assessment.company || teamCompany,
      employmentType: teamEmploymentType,
      age: teamAge,
      dateOfBirth: teamDateOfBirth,
      certificates: teamCertificates,
    },
  };
  exportArabicLabAssessmentReport(fullData);
};


  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: colors?.surface || "var(--border)",
          color: colors?.textPrimary || "#fff",
          borderRadius: "10px",
          border: `1px solid ${colors?.border || "var(--border)"}`,
          boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
        },
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          p: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${colors?.border || "var(--border)"}`,
          bgcolor: "var(--overlay-subtle)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "10px",
              bgcolor: "rgba(108, 71, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-text)",
            }}
          >
            <SpeedIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: colors?.textPrimary || "#fff" }}>
              E2E FTTH Practical Assessment Report
            </Typography>
            <Typography variant="caption" sx={{ color: colors?.textSecondary || "var(--text-secondary)" }}>
              Conducted in Controlled Laboratory Environment
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Button
            variant="contained"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportArabicExcel}
            sx={{
              bgcolor: "#16A34A",
              "&:hover": { bgcolor: "#1b5e20" },
              color: "var(--text)",
              fontWeight: 600,
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
            }}
          >
            Arabic Excel (تقرير Excel)
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={() => exportIndividualLabAssessmentReport(assessment)}
            sx={{
              bgcolor: "#16A34A",
              "&:hover": { bgcolor: "#1b5e20" },
              color: "var(--text)",
              fontWeight: 600,
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
            }}
          >
            Excel Report (.xlsx)
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{
              borderColor: colors?.border || "var(--border)",
              color: colors?.textPrimary || "#fff",
              borderRadius: "10px",
              "&:hover": { borderColor: "var(--accent)", bgcolor: "rgba(108, 71, 255, 0.1)" },
            }}
          >
            Print
          </Button>
          <IconButton onClick={onClose} sx={{ color: colors?.textSecondary || "var(--text-secondary)" }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Printable Report Content */}
      <DialogContent sx={{ p: 4 }}>
        <Stack spacing={4} ref={printRef}>
          {/* Metadata Card */}
          <Paper
            sx={{
              p: 3,
              bgcolor: "var(--overlay-subtle)",
              borderRadius: "10px",
              border: `1px solid ${colors?.border || "var(--border)"}`,
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600 }}>
                  FIELD TEAM & COMPANY
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: colors?.textPrimary || "#fff" }}>
                  {teamName}
                </Typography>
                <Typography variant="body2" sx={{ color: colors?.textSecondary || "var(--text-secondary)" }}>
                  {teamCompany}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600 }}>
                  PROFILE & EXPERIENCE
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
                  <Chip
                    label={teamEmploymentType}
                    size="small"
                    sx={{
                      bgcolor: teamEmploymentType === "Employee" ? "rgba(22, 163, 74,0.15)" : "rgba(108, 71, 255, 0.15)",
                      color: teamEmploymentType === "Employee" ? "#16A34A" : "#6C47FF",
                      fontWeight: 600,
                      border: `1px solid ${teamEmploymentType === "Employee" ? "#16A34A40" : "#6C47FF40"}`,
                    }}
                  />
                  {teamAge !== null && (
                    <Chip
                      label={`Age: ${teamAge} Yrs`}
                      size="small"
                      sx={{
                        bgcolor: "rgba(219, 39, 119, 0.12)",
                        color: "#DB2777",
                        fontWeight: 600,
                        border: "1px solid rgba(219, 39, 119, 0.3)",
                      }}
                    />
                  )}
                  <Typography variant="body2" sx={{ color: colors?.textPrimary || "#fff", fontWeight: 600 }}>
                    {experienceText}
                  </Typography>
                </Box>
                {teamDateOfBirth && (
                  <Typography variant="caption" sx={{ color: colors?.textSecondary || "var(--text-secondary)", display: "block", mt: 0.5 }}>
                    DoB: {new Date(teamDateOfBirth).toLocaleDateString()}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600 }}>
                  ASSESSOR & DATE
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: colors?.textPrimary || "#fff" }}>
                  {assessorName}
                </Typography>
                <Typography variant="caption" sx={{ color: colors?.textSecondary || "var(--text-secondary)" }}>
                  {new Date(assessmentDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6} md={3} sx={{ textAlign: { sm: "right" } }}>
                <Typography variant="caption" sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600 }}>
                  OVERALL PERFORMANCE
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "flex-start", sm: "flex-end" }, gap: 1.5, mt: 0.5 }}>
                  <Chip
                    label={`${score}%`}
                    sx={{
                      bgcolor: `${statusInfo.color}22`,
                      color: statusInfo.color,
                      fontSize: "1.2rem",
                      fontWeight: 600,
                      height: 40,
                      border: `2px solid ${statusInfo.color}`,
                      px: 1,
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ color: statusInfo.color, fontWeight: 600 }}>
                    {statusInfo.label}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Field Team Safety & Compliance Certifications Matrix Card */}
          <Paper
            sx={{
              p: 3,
              bgcolor: "var(--overlay-subtle)",
              borderRadius: "10px",
              border: `1px solid ${colors?.border || "var(--border)"}`,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: "var(--accent-text)", display: "flex", alignItems: "center", gap: 1 }}>
              <SchoolIcon fontSize="small" /> Field Team Safety & Compliance Certifications
            </Typography>

            <Grid container spacing={2}>
              {CERT_DEFINITIONS.map((cert) => {
                const isCertified = !!teamCertificates[cert.key];
                return (
                  <Grid item xs={12} sm={6} md={4} key={cert.key}>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: isCertified ? "rgba(22, 163, 74, 0.08)" : "rgba(255,255,255,0.015)",
                        border: isCertified ? "1px solid #16A34A" : `1px solid ${colors?.border || "var(--border)"}`,
                        borderRadius: "10px",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Chip
                            label={cert.code}
                            size="small"
                            sx={{
                              bgcolor: isCertified ? "#16A34A" : "rgba(255,255,255,0.08)",
                              color: "var(--text)",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              height: 22,
                            }}
                          />
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: isCertified ? "#16A34A" : (colors?.textPrimary || "#fff") }}>
                            {cert.title}
                          </Typography>
                        </Box>
                        <Chip
                          label={isCertified ? "Certified" : "Not Certified"}
                          size="small"
                          sx={{
                            bgcolor: isCertified ? "rgba(22, 163, 74, 0.15)" : "rgba(255,255,255,0.05)",
                            color: isCertified ? "#16A34A" : (colors?.textSecondary || "var(--text-secondary)"),
                            fontWeight: 600,
                            fontSize: "0.7rem",
                            height: 20,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: colors?.textSecondary || "var(--text-secondary)", display: "block", lineHeight: 1.3 }}>
                        {cert.description}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>


          {/* Tools & Equipment Readiness Section */}
          {assessment.equipmentChecklist && assessment.equipmentChecklist.length > 0 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#2563EB", display: "flex", alignItems: "center", gap: 1 }}>
                  <BuildIcon fontSize="small" /> Tools & Equipment
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={`${eqPercentage}% (${eqValidCount}/${eqTotalCount} Valid/Avail)`}
                    size="small"
                    sx={{
                      bgcolor: isEqPass ? "rgba(22, 163, 74,0.18)" : "rgba(220, 38, 38,0.18)",
                      color: isEqPass ? "#16A34A" : "#DC2626",
                      fontWeight: "600",
                      border: `1px solid ${isEqPass ? "#16A34A60" : "#DC262660"}`,
                    }}
                  />
                  <Chip
                    label={isEqPass ? "Pass" : "Fail"}
                    size="small"
                    sx={{
                      bgcolor: isEqPass ? "#16A34A" : "#DC2626",
                      color: "var(--text)",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      px: 0.5,
                    }}
                  />
                </Stack>
              </Box>

              <TableContainer component={Paper} sx={{ bgcolor: "var(--overlay-subtle)", border: `1px solid ${colors?.border || "var(--border)"}`, borderRadius: "10px" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "var(--overlay-subtle)" }}>
                      <TableCell sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600 }}>Tool / Equipment Item</TableCell>
                      <TableCell align="center" sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600 }}>Remarks / Condition</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assessment.equipmentChecklist.map((item, idx) => (
                      <TableRow key={idx} sx={{ borderBottom: `1px solid ${colors?.border || "var(--border)"}` }}>
                        <TableCell sx={{ color: colors?.textPrimary || "#fff", fontWeight: 600 }}>{item.toolName}</TableCell>
                        <TableCell align="center">{getStatusBadge(item.status)}</TableCell>
                        <TableCell sx={{ color: item.notes ? (colors?.textPrimary || "#fff") : "rgba(255,255,255,0.3)" }}>
                          {item.notes || "No remarks"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Structured Assessment Sections */}
          {(() => {
            // Normalize to prevent duplicate checkpoints from old saved records
            const normalizedSections = normalizeForDisplay(assessment.sections);
            return normalizedSections && normalizedSections.length > 0 ? (
              normalizedSections.map((sec, sIdx) => {
                const isSec7 = sec.sectionId === "sec-7";
                const is10PtSec =
                  sec.sectionId === "sec-8" ||
                  sec.sectionId === "sec-9" ||
                  sec.sectionTitle?.includes("Photo") ||
                  sec.sectionTitle?.includes("Self-Assessment") ||
                  sec.sectionTitle?.includes("Communication");
                let secTotal = 0;
                let secMax = 0;
                let isPointsOnly = false;
                sec.checkpoints?.forEach((cp) => {
                  if (cp.status !== "N/A") {
                    const isPoints =
                      cp.type === "points" ||
                      cp.maxScore === 10 ||
                      is10PtSec ||
                      cp.id === "cp-8-photos-self-assess" ||
                      cp.id === "cp-9-comm-behaviour" ||
                      cp.name?.includes("Photo") ||
                      cp.name?.includes("Communication");
                    const cpMax = isPoints ? 10 : (cp.maxScore || 5);
                    secMax += cpMax;
                    if (isPoints) {
                      isPointsOnly = true;
                      secTotal += Number(cp.score !== undefined ? cp.score : (cp.status === "Pass" ? cpMax : 0));
                    } else {
                      if (cp.status === "Pass") secTotal += Number(cp.score !== undefined ? cp.score : cpMax);
                      else if (cp.status === "Fail") secTotal += Number(cp.score > 0 && cp.score < cpMax ? cp.score : 0);
                    }
                  }
                });
                const secScorePct = secMax > 0 ? Math.min(100, Math.round((secTotal / secMax) * 100)) : 100;
                const isSecPass = secScorePct >= 70;

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
                    title: "B. BEP Identification & Warning Labels",
                    filter: (cp) => cp.id?.includes("label") || cp.subSection?.includes("Labeling"),
                  },
                ];

                return (
                  <Box key={sIdx}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: colors?.textPrimary || "#fff", display: "flex", alignItems: "center", gap: 1 }}>
                        {sectionIcons[sec.sectionTitle] || <CheckCircleIcon fontSize="small" sx={{ color: "var(--accent-text)" }} />}
                        {sec.sectionTitle}
                      </Typography>

                      <Stack direction="row" spacing={1} alignItems="center">
                        {isSec7 ? (
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
                        ) : isPointsOnly ? (
                          <>
                            <Chip
                              label={`${secTotal} / ${secMax} Pts (${secScorePct}%)`}
                              size="small"
                              sx={{
                                bgcolor: isSecPass ? "rgba(22, 163, 74,0.18)" : "rgba(220, 38, 38,0.18)",
                                color: isSecPass ? "#16A34A" : "#DC2626",
                                fontWeight: "600",
                                border: `1px solid ${isSecPass ? "#16A34A40" : "#DC262640"}`,
                              }}
                            />
                            <Chip
                              label={isSecPass ? "Pass" : "Fail"}
                              size="small"
                              sx={{
                                bgcolor: isSecPass ? "#16A34A" : "#DC2626",
                                color: "var(--text)",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                px: 0.5,
                              }}
                            />
                          </>
                        ) : (
                          <>
                            <Chip
                              label={`${secScorePct}%`}
                              size="small"
                              sx={{
                                bgcolor: isSecPass ? "rgba(22, 163, 74,0.18)" : "rgba(220, 38, 38,0.18)",
                                color: isSecPass ? "#16A34A" : "#DC2626",
                                fontWeight: "600",
                                border: `1px solid ${isSecPass ? "#16A34A40" : "#DC262640"}`,
                              }}
                            />
                            <Chip
                              label={isSecPass ? "Pass" : "Fail"}
                              size="small"
                              sx={{
                                bgcolor: isSecPass ? "#16A34A" : "#DC2626",
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

                    {isOntSection ? (
                      <Stack spacing={2}>
                        {ontGroups.map((group) => {
                          const groupCps = sec.checkpoints.filter(group.filter);
                          if (groupCps.length === 0) return null;
                          return (
                            <Paper
                              key={group.key}
                              sx={{
                                p: 2,
                                bgcolor: "var(--overlay-subtle)",
                                border: `1px solid var(--border)`,
                                borderRadius: "10px",
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 600, color: colors?.textPrimary || "#fff", mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                <span>{group.icon}</span> {group.title}
                              </Typography>
                              {renderDetailTable(groupCps, sec)}
                            </Paper>
                          );
                        })}
                      </Stack>
                    ) : isBepSection ? (
                      <Stack spacing={2}>
                        {bepGroups.map((group) => {
                          const groupCps = sec.checkpoints.filter(group.filter);
                          if (groupCps.length === 0) return null;
                          return (
                            <Paper
                              key={group.key}
                              sx={{
                                p: 2,
                                bgcolor: "var(--overlay-subtle)",
                                border: `1px solid var(--border)`,
                                borderRadius: "10px",
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 600, color: colors?.textPrimary || "#fff", mb: 1 }}>
                                {group.title}
                              </Typography>
                              {renderDetailTable(groupCps, sec)}
                            </Paper>
                          );
                        })}
                      </Stack>
                    ) : (
                      renderDetailTable(sec.checkpoints, sec)
                    )}
                  </Box>
                );
              })
            ) : (
              // Fallback for legacy format
              assessment.checkpoints && assessment.checkpoints.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: colors?.textPrimary || "#fff" }}>
                    Assessment Checkpoints
                  </Typography>
                  <TableContainer component={Paper} sx={{ bgcolor: "var(--overlay-subtle)", border: `1px solid ${colors?.border || "var(--border)"}`, borderRadius: "10px" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600 }}>Checkpoint</TableCell>
                          <TableCell align="center" sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600 }}>Score (0-5)</TableCell>
                          <TableCell sx={{ color: colors?.textSecondary || "var(--text-secondary)", fontWeight: 600 }}>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {assessment.checkpoints.map((cp, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ color: colors?.textPrimary || "#fff" }}>{cp.name}</TableCell>
                            <TableCell align="center" sx={{ color: "var(--accent-text)", fontWeight: 600 }}>{cp.score} / 5</TableCell>
                            <TableCell sx={{ color: cp.notes ? (colors?.textPrimary || "#fff") : "rgba(255,255,255,0.3)" }}>{cp.notes || "None"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )
            );
          })()}

          {/* Feedback & Recommendations Card */}
          {(assessment.feedback || assessment.comments) && (
            <Paper
              sx={{
                p: 3,
                bgcolor: "rgba(108, 71, 255, 0.05)",
                border: "1px dashed rgba(108, 71, 255, 0.4)",
                borderRadius: "10px",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "var(--accent-text)", mb: 1 }}>
                Assessor Comprehensive Feedback & Recommendations
              </Typography>
              <Typography variant="body2" sx={{ color: colors?.textPrimary || "#fff", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {assessment.feedback || assessment.comments}
              </Typography>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: `1px solid ${colors?.border || "var(--border)"}` }}>
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: "var(--accent)", "&:hover": { bgcolor: "var(--accent-hover)" }, borderRadius: "10px", px: 4 }}>
          Close Report
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LabAssessmentDetailModal;
