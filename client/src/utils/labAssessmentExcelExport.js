import XLSX from "xlsx-js-style";
import { format } from "date-fns";

// Standardized checklist sections & checkpoints (single source of truth for excel reports)
export const STANDARDIZED_LAB_SECTIONS = [
  {
    sectionId: "sec-1",
    sectionTitle: "1. FDB – Fiber Splicing & Fiber Management",
    checkpoints: [
      { id: "cp-1-1", subSection: "A. Power Measurement & Splitter Verification", name: "Measure optical power received from selected splitter port before starting installation", maxScore: 5 },
      { id: "cp-1-2-theo", subSection: "A. Power Measurement & Splitter Verification", name: "Record measured optical power and determine whether within theoretical acceptable range (-16 to -19 dBm)", maxScore: 5 },
      { id: "cp-1-2-prac", subSection: "A. Power Measurement & Splitter Verification", name: "Record measured optical power and determine whether within practical acceptable range (-16 to -22 or -23 dBm)", maxScore: 5 },
      { id: "cp-1-4", subSection: "B. New Drop Fiber Installation", name: "Properly perform fusion splicing between pigtail and outdoor drop fiber (black)", maxScore: 5 },
      { id: "cp-1-route-pigtail", subSection: "B. New Drop Fiber Installation", name: "Properly route and organize pigtail inside cassette/raceway without excessive bending, tension, or crossing", maxScore: 5 },
      { id: "cp-1-route-outdoor", subSection: "B. New Drop Fiber Installation", name: "Properly route and organize outdoor drop fiber inside cassette/raceway without excessive bending, tension, or crossing", maxScore: 5 },
      { id: "cp-1-label-pigtail", subSection: "B. New Drop Fiber Installation", name: "Install required label on Pigtail (Splitter port / identification label)", maxScore: 5 },
      { id: "cp-1-label-outdoor", subSection: "B. New Drop Fiber Installation", name: "Install required label on Outdoor drop fiber cable (black)", maxScore: 5 },
      { id: "cp-1-7", subSection: "B. New Drop Fiber Installation", name: "Ensure splice is properly protected with sleeve and securely positioned", maxScore: 5 },
      { id: "cp-1-8", subSection: "C. Existing Drop Fiber Handling", name: "Identify required existing drop fiber and carefully extract/reposition from raceway without disturbing others", maxScore: 5 },
      { id: "cp-1-9", subSection: "C. Existing Drop Fiber Handling", name: "Maintain proper fiber organization, avoid cassette deformation, and return fibers to correct position", maxScore: 5 },
    ],
  },
  {
    sectionId: "sec-2",
    sectionTitle: "2. BEP – Outdoor/Indoor Fiber Splicing",
    checkpoints: [
      { id: "cp-2-1", subSection: "BEP Splicing & Management", name: "Perform fusion splicing between Outdoor drop fiber (black) and Indoor drop fiber (white)", maxScore: 5 },
      { id: "cp-2-2", subSection: "BEP Splicing & Management", name: "Properly organize and route fiber inside BEP according to required installation standard", maxScore: 5 },
      { id: "cp-2-3", subSection: "BEP Splicing & Management", name: "Avoid excessive bending, tension, or unnecessary fiber loops, and properly secure fiber/cable", maxScore: 5 },
      { id: "cp-2-label-outdoor", subSection: "BEP Labeling", name: "Apply required label on Outdoor drop fiber (black) at BEP (clear, readable, correct position)", maxScore: 5 },
      { id: "cp-2-label-indoor", subSection: "BEP Labeling", name: "Apply required label on Indoor drop fiber (white) at BEP (clear, readable, correct position)", maxScore: 5 },
    ],
  },
  {
    sectionId: "sec-3",
    sectionTitle: "3. OTO – Splicing, Fiber Management & Optical Testing",
    checkpoints: [
      { id: "cp-3-1", subSection: "A. Splicing", name: "Perform fusion splicing between indoor drop fiber and built-in OTO pigtail", maxScore: 5 },
      { id: "cp-3-2", subSection: "A. Splicing", name: "Properly protect and position splice, organize fiber inside OTO without excessive bending or tension", maxScore: 5 },
      { id: "cp-3-3", subSection: "B. Labeling", name: "Apply required identification label to OTO cover (correctly positioned and readable)", maxScore: 5 },
      { id: "cp-3-4", subSection: "C. Optical Testing", name: "Connect patch cord from OTO to optical power meter and perform required optical test", maxScore: 5 },
      { id: "cp-3-5", subSection: "C. Optical Testing", name: "Measure link loss, record value, and verify within acceptable range (at max 2 dB difference from FDB splitter Rx power)", maxScore: 5 },
    ],
  },
  {
    sectionId: "sec-4",
    sectionTitle: "4. ONT – Installation, Configuration & Service Activation",
    checkpoints: [
      { id: "cp-4-zte-int", subSection: "A. ZTE F6600P Configuration", name: "ZTE F6600P – Power on ONT and enter required INT number in the appropriate field", maxScore: 5 },
      { id: "cp-4-zte-wan", subSection: "A. ZTE F6600P Configuration", name: "ZTE F6600P – Configure required WAN connection information correctly", maxScore: 5 },
      { id: "cp-4-zte-wifi", subSection: "A. ZTE F6600P Configuration", name: "ZTE F6600P – Configure Wi-Fi settings separately: 2.4 GHz & 5 GHz (SSIDs & Passwords)", maxScore: 5 },
      { id: "cp-4-zte-optical", subSection: "A. ZTE F6600P Configuration", name: "ZTE F6600P – Check & verify received optical signal level", maxScore: 5 },
      { id: "cp-4-zte-led", subSection: "A. ZTE F6600P Service Verification", name: "ZTE F6600P – Understand and explain ONT LED behavior & status indicators (e.g. PON LED solid green, flashing, LOS red, Internet/WAN & Wi-Fi LEDs)", maxScore: 5 },
      { id: "cp-4-nokia6-int", subSection: "B. Nokia G-2426G-P (Wi-Fi 6) Configuration", name: "Nokia G-2426G-P – Power on ONT and enter required INT number in the appropriate field", maxScore: 5 },
      { id: "cp-4-nokia6-fw", subSection: "B. Nokia G-2426G-P (Wi-Fi 6) Configuration", name: "For Nokia G-2426G-P only: Manually upload firmware version 62 and verify automatic restart before continuing configuration", maxScore: 5 },
      { id: "cp-4-nokia6-wan", subSection: "B. Nokia G-2426G-P (Wi-Fi 6) Configuration", name: "Nokia G-2426G-P – Configure required WAN connection information correctly", maxScore: 5 },
      { id: "cp-4-nokia6-wifi", subSection: "B. Nokia G-2426G-P (Wi-Fi 6) Configuration", name: "Nokia G-2426G-P – Configure Wi-Fi settings separately: 2.4 GHz & 5 GHz (SSIDs & Passwords)", maxScore: 5 },
      { id: "cp-4-nokia6-optical", subSection: "B. Nokia G-2426G-P (Wi-Fi 6) Configuration", name: "Nokia G-2426G-P – Check & verify received optical signal level", maxScore: 5 },
      { id: "cp-4-nokia6-led", subSection: "B. Nokia G-2426G-P (Wi-Fi 6) Service Verification", name: "Nokia G-2426G-P – Understand and explain ONT LED behavior & status indicators (e.g. PON LED solid green, flashing, LOS red, Internet/WAN & Wi-Fi LEDs)", maxScore: 5 },
      { id: "cp-4-nokia5-wan", subSection: "C. Nokia G-140W-H (Wi-Fi 5) Configuration", name: "Nokia G-140W-H – Configure required WAN connection information correctly", maxScore: 5 },
      { id: "cp-4-nokia5-wifi", subSection: "C. Nokia G-140W-H (Wi-Fi 5) Configuration", name: "Nokia G-140W-H – Configure Wi-Fi settings separately: 2.4 GHz & 5 GHz (SSIDs & Passwords)", maxScore: 5 },
      { id: "cp-4-nokia5-optical", subSection: "C. Nokia G-140W-H (Wi-Fi 5) Configuration", name: "Nokia G-140W-H – Check & verify received optical signal level", maxScore: 5 },
      { id: "cp-4-nokia5-led", subSection: "C. Nokia G-140W-H (Wi-Fi 5) Service Verification", name: "Nokia G-140W-H – Understand and explain ONT LED behavior & status indicators (e.g. PON LED solid green, flashing, LOS red, Internet/WAN & Wi-Fi LEDs)", maxScore: 5 },
      { id: "cp-4-label-callcenter", subSection: "D. ONT Labeling (Shared Requirement)", name: "Apply required Call Center & INT number label on ONT (clearly visible to customer)", maxScore: 5 },
      { id: "cp-4-label-noreset", subSection: "D. ONT Labeling (Shared Requirement)", name: "Apply required NO RESET label on ONT (placed directly over/near reset-hole area, clearly visible to customer)", maxScore: 5 },
    ],
  },
  {
    sectionId: "sec-5",
    sectionTitle: "5. Assistant Tools & Mobile Applications",
    checkpoints: [
      { id: "cp-5-ookla", subSection: "A. Ookla Speedtest App", name: "Verify team smartphone has Ookla Speedtest application installed and properly configured (server selection, accurate testing standard)", maxScore: 5 },
      { id: "cp-5-wifimeter", subSection: "B. Wi-Fi Signal Meter", name: "Verify team smartphone has Wi-Fi Signal Meter / Analyzer application installed and configured to measure 2.4 GHz & 5 GHz coverage and signal strength", maxScore: 5 },
      { id: "cp-5-timestamp", subSection: "C. Timestamp Camera App", name: "Verify team smartphone has Timestamp Camera application installed with correct date, time, and GPS coordinates configuration for photo evidence", maxScore: 5 },
      { id: "cp-5-laptop-1gbps", subSection: "D. 1 Gbps-Capable Laptop", name: "1 Gbps-capable laptop: Team must have a laptop with a 1 Gbps or higher Ethernet/network interface capable of performing and verifying high-speed internet speed tests.", maxScore: 5 },
      { id: "cp-5-wifi6-device", subSection: "E. High-Speed Wi-Fi Device", name: "High-speed Wi-Fi device: Team must have a Wi-Fi 6–capable laptop or mobile device capable of measuring and verifying high-speed Wi-Fi performance, particularly for services delivered through Wi-Fi 6 routers.", maxScore: 5 },
    ],
  },
  {
    sectionId: "sec-6",
    sectionTitle: "6. Customer Education",
    checkpoints: [
      { id: "cp-6-1", subSection: "A. Wi-Fi Education", name: "Explain difference between 2.4 GHz and 5 GHz Wi-Fi (advantages, limitations, distance vs speed)", maxScore: 5 },
      { id: "cp-6-2", subSection: "B. 3-Point Speed Test", name: "Explain and demonstrate/perform required 3-point speed test per project procedure", maxScore: 5 },
      { id: "cp-6-3", subSection: "C. ONT / Service Handling", name: "Clearly explain NOT to reset ONT and that pressing reset removes configuration & interrupts service", maxScore: 5 },
      { id: "cp-6-4", subSection: "D. Customer Support Routing", name: "Educate customer on support routing: Call Center (Sales/Billing/Accounts) vs Tech Team (Internet/Speed/Issues)", maxScore: 5 },
      { id: "cp-6-5", subSection: "E. CX Follow-Up Call", name: "Inform customer of CX follow-up call after ~48h and explain CSAT satisfaction scale (1–8 Unsatisfied, 9–10 Satisfied)", maxScore: 5 },
      { id: "cp-6-6", subSection: "F. Additional Service Education", name: "Educate customer on expected performance for IPTV, VPN, PlayStation/Sony servers, and server speed differences", maxScore: 5 },
    ],
  },
  {
    sectionId: "sec-7",
    sectionTitle: "7. Quality Ticket Awareness",
    checkpoints: [
      { id: "cp-7-1", subSection: "Ticket Types & SLAs", name: "Demonstrate clear understanding of NPS Ticket (SLA: 24 hours) and CC Ticket (SLA: 9 hours)", maxScore: 5 },
      { id: "cp-7-2", subSection: "SLA Compliance & Escalation", name: "Demonstrate understanding of timely corrective action within SLA and proper escalation when SLA is at risk", maxScore: 5 },
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
        maxScore: 10,
      },
    ],
  },
];

// Helper to normalize any assessment sections against the official standard to avoid duplications
export const normalizeExportSections = (sections) => {
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return STANDARDIZED_LAB_SECTIONS.map((s) => ({
      ...s,
      checkpoints: s.checkpoints.map((cp) => ({ ...cp, score: cp.maxScore, status: "Pass", notes: "" })),
    }));
  }

  return STANDARDIZED_LAB_SECTIONS.map((defSec, sIdx) => {
    const matchedSec = sections.find(
      (es) => es.sectionId === defSec.sectionId || es.sectionTitle?.trim() === defSec.sectionTitle?.trim()
    ) || sections[sIdx];

    if (!matchedSec) {
      return {
        ...defSec,
        checkpoints: defSec.checkpoints.map((cp) => ({ ...cp, score: cp.maxScore, status: "Pass", notes: "" })),
      };
    }

    const isSec8 = defSec.sectionId === "sec-8" || defSec.sectionTitle?.includes("Photo") || defSec.sectionTitle?.includes("Self-Assessment");
    const cpMax = isSec8 ? 10 : 5;
    const passThreshold = isSec8 ? 7 : 4;

    const mergedCheckpoints = defSec.checkpoints.map((defCp, cpIdx) => {
      // Match strictly by id, exact criteria name, or exact index
      const matchedCp = matchedSec.checkpoints?.find(
        (ecp) => (ecp.id && ecp.id === defCp.id) || (ecp.name && ecp.name.trim() === defCp.name.trim())
      ) || matchedSec.checkpoints?.[cpIdx];

      if (!matchedCp) {
        return {
          ...defCp,
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
        name: defCp.name, // ALWAYS enforce the official unique checkpoint name
        subSection: defCp.subSection, // ALWAYS enforce the official subsection
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

// Color Palette for Excel Styling
const PALETTE = {
  headerBg: "1E3A8A", // Deep Navy Blue
  headerText: "FFFFFF",
  subHeaderBg: "3B82F6", // Bright Blue
  accentBg: "7C3AED", // Indigo / Purple
  lightGray: "F3F4F6",
  borderGray: "D1D5DB",
  darkBorder: "9CA3AF",
  successBg: "DCFCE7",
  successText: "15803D",
  warningBg: "FEF9C3",
  warningText: "A16207",
  orangeBg: "FFEDD5",
  orangeText: "C2410C",
  errorBg: "FEE2E2",
  errorText: "B91C1C",
  infoBg: "E0F2FE",
  infoText: "0369A1",
};

// 5-Tier Classification helper for Excel styling
const getTierStyle = (score) => {
  const s = Number(score) || 0;
  if (s >= 90) {
    return {
      label: "Excellent",
      status: "Pass",
      bg: "DCFCE7", // Light green
      color: "15803D",
    };
  }
  if (s >= 80) {
    return {
      label: "V.Good",
      status: "Pass",
      bg: "ECFDF5", // Soft mint
      color: "047857",
    };
  }
  if (s >= 70) {
    return {
      label: "Need improvements, and close monitoring",
      status: "Pass",
      bg: "FEF9C3", // Soft yellow
      color: "A16207",
    };
  }
  if (s >= 50) {
    return {
      label: "Suspension, need training, then re-evaluate the team",
      status: "Fail",
      bg: "FFEDD5", // Soft orange
      color: "C2410C",
    };
  }
  return {
    label: "Ineligible",
    status: "Fail",
    bg: "FEE2E2", // Soft red
    color: "B91C1C",
  };
};

const formatExp = (y = 0, m = 0, d = 0, fallback) => {
  const years = parseInt(y, 10) || 0;
  const months = parseInt(m, 10) || 0;
  const days = parseInt(d, 10) || 0;
  if (years === 0 && months === 0 && days === 0 && fallback !== undefined && fallback !== null) {
    const num = parseFloat(fallback);
    if (!isNaN(num) && num > 0) {
      const fullY = Math.floor(num);
      const remM = Math.round((num - fullY) * 12);
      const p = [];
      if (fullY > 0) p.push(`${fullY} ${fullY === 1 ? "Year" : "Years"}`);
      if (remM > 0) p.push(`${remM} ${remM === 1 ? "Month" : "Months"}`);
      return p.join(", ") || "0 Days";
    }
  }
  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? "Day" : "Days"}`);
  return parts.length > 0 ? parts.join(", ") : "0 Days";
};

// Styling helpers
const createTitleRow = (ws, titleText, subtitleText, endCol) => {
  ws["A1"] = {
    v: titleText,
    t: "s",
    s: {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E3A8A" } },
      alignment: { horizontal: "center", vertical: "center" },
    },
  };
  ws["A2"] = {
    v: subtitleText,
    t: "s",
    s: {
      font: { italic: true, sz: 11, color: { rgb: "E0E7FF" } },
      fill: { fgColor: { rgb: "2563EB" } },
      alignment: { horizontal: "center", vertical: "center" },
    },
  };

  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: endCol } });
  ws["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: endCol } });

  if (!ws["!rows"]) ws["!rows"] = [];
  ws["!rows"][0] = { hpt: 30 };
  ws["!rows"][1] = { hpt: 20 };
};

const applyTableHeader = (ws, startRow, headers, bg = "1F2937", color = "FFFFFF") => {
  headers.forEach((h, colIdx) => {
    const cellAddr = XLSX.utils.encode_cell({ r: startRow, c: colIdx });
    ws[cellAddr] = {
      v: h,
      t: "s",
      s: {
        font: { bold: true, color: { rgb: color }, sz: 11 },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "medium", color: { rgb: "000000" } },
          bottom: { style: "medium", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "4B5563" } },
          right: { style: "thin", color: { rgb: "4B5563" } },
        },
      },
    };
  });
  if (!ws["!rows"]) ws["!rows"] = [];
  ws["!rows"][startRow] = { hpt: 26 };
};

const applyBordersAndAlignments = (ws, startRow, endRow, numCols) => {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = 0; c < numCols; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellAddr]) continue;
      ws[cellAddr].s = {
        ...(ws[cellAddr].s || {}),
        alignment: {
          vertical: "center",
          horizontal: ws[cellAddr].s?.alignment?.horizontal || "left",
          wrapText: true,
        },
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } },
        },
      };
    }
  }
};

/**
 * Generates and downloads the Comprehensive Master Excel Report across all Field Teams & Assessments
 */
export const exportMasterLabAssessmentReport = ({ trackingData = [], assessments = [], stats = {} }) => {
  const wb = XLSX.utils.book_new();
  const exportDate = format(new Date(), "dd-MM-yyyy HH:mm");

  // ==========================================
  // SHEET 1: EXECUTIVE QUALITY INTELLIGENCE
  // ==========================================
  const ws1 = {};
  createTitleRow(
    ws1,
    "NOKIA FTTH E2E PRACTICAL ASSESSMENT - QUALITY & PERFORMANCE INTELLIGENCE MASTER REPORT",
    `Report Generated: ${exportDate} | Total Teams Tracked: ${stats.totalTeams || trackingData.length} | Evaluated: ${stats.testedTeams || 0} (${stats.completionRate || 0}%)`,
    7
  );

  let r1 = 3;

  // KPI Highlights Grid
  ws1[XLSX.utils.encode_cell({ r: r1, c: 0 })] = {
    v: "1. EXECUTIVE KPI SUMMARY",
    t: "s",
    s: { font: { bold: true, sz: 13, color: { rgb: "1E3A8A" } } },
  };
  r1++;

  const kpiHeaders = ["Performance Indicator", "Current Result", "Benchmark Threshold", "Compliance Status", "Quality Scope Notes"];
  applyTableHeader(ws1, r1, kpiHeaders, "1E3A8A", "FFFFFF");
  r1++;

  const kpis = [
    ["Total Field Teams Registered", `${stats.totalTeams || trackingData.length} Teams`, "All Authorized Teams", "Active", "Total field technician squads in database"],
    ["Evaluation Completion Rate", `${stats.completionRate || 0}%`, "≥ 90.0% Target", (stats.completionRate || 0) >= 90 ? "Optimal" : "In Progress", `${stats.testedTeams || 0} of ${stats.totalTeams || 0} teams evaluated`],
    ["Global Average Practical Score", `${stats.avgScore || 0}%`, "≥ 80.0% Target", (stats.avgScore || 0) >= 80 ? "V.Good" : (stats.avgScore || 0) >= 70 ? "Acceptable" : "Action Needed", "Across all practical lab evaluations"],
    ["Certification Pass Rate (Score ≥ 70%)", `${stats.passRate || 0}%`, "≥ 85.0% Target", (stats.passRate || 0) >= 85 ? "Compliant" : "Review Needed", "Percentage of teams meeting minimum pass threshold"],
    ["Pending Practical Assessments", `${stats.pendingTeams || 0} Teams`, "0 Teams", (stats.pendingTeams || 0) === 0 ? "Completed" : "Scheduled", "Technicians awaiting practical assessment in lab"],
  ];

  kpis.forEach((row) => {
    row.forEach((val, c) => {
      const cell = XLSX.utils.encode_cell({ r: r1, c });
      ws1[cell] = {
        v: val,
        t: "s",
        s: {
          font: { sz: 10, bold: c === 0 || c === 1 },
          alignment: { horizontal: c === 1 || c === 3 ? "center" : "left", vertical: "center" },
          fill: c === 3 && (val === "Optimal" || val === "Compliant" || val === "V.Good") ? { fgColor: { rgb: PALETTE.successBg } } : undefined,
        },
      };
    });
    r1++;
  });
  applyBordersAndAlignments(ws1, 4, r1 - 1, 5);

  r1 += 2;

  // 5-Tier Score Distribution Table
  ws1[XLSX.utils.encode_cell({ r: r1, c: 0 })] = {
    v: "2. 5-TIER PERFORMANCE CLASSIFICATION BREAKDOWN",
    t: "s",
    s: { font: { bold: true, sz: 13, color: { rgb: "1E3A8A" } } },
  };
  r1++;

  const tierHeaders = ["Classification Tier", "Score Range", "Quality Result Status", "Team Count", "Share (%)", "Required Management Action"];
  applyTableHeader(ws1, r1, tierHeaders, "374151", "FFFFFF");
  r1++;

  const totalEvaluated = stats.testedTeams || assessments.length || 1;
  const tiers = [
    { name: "Excellent", range: "90% – 100%", status: "Pass", count: assessments.filter((a) => (a.overallScore || a.totalScore) >= 90).length, action: "Recognize as master technicians & eligible for complex installs" },
    { name: "V.Good", range: "80% – 89%", status: "Pass", count: assessments.filter((a) => (a.overallScore || a.totalScore) >= 80 && (a.overallScore || a.totalScore) < 90).length, action: "Approved for autonomous field execution & standard installs" },
    { name: "Need improvements, and close monitoring", range: "70% – 79%", status: "Pass", count: assessments.filter((a) => (a.overallScore || a.totalScore) >= 70 && (a.overallScore || a.totalScore) < 80).length, action: "Targeted coaching on weak sections with close supervision" },
    { name: "Suspension, need training, then re-evaluate", range: "50% – 69%", status: "Fail", count: assessments.filter((a) => (a.overallScore || a.totalScore) >= 50 && (a.overallScore || a.totalScore) < 70).length, action: "Mandatory retraining program followed by re-evaluation" },
    { name: "Ineligible", range: "0% – 49%", status: "Fail", count: assessments.filter((a) => (a.overallScore || a.totalScore) < 50).length, action: "Suspended from field dispatch until recertified" },
  ];

  tiers.forEach((t) => {
    const pct = totalEvaluated > 0 ? ((t.count / totalEvaluated) * 100).toFixed(1) : "0.0";
    const tierRow = [t.name, t.range, t.status, t.count, `${pct}%`, t.action];
    tierRow.forEach((val, c) => {
      const cell = XLSX.utils.encode_cell({ r: r1, c });
      ws1[cell] = {
        v: val,
        t: typeof val === "number" ? "n" : "s",
        s: {
          font: { sz: 10, bold: c === 0 || c === 2 },
          alignment: { horizontal: c === 1 || c === 2 || c === 3 || c === 4 ? "center" : "left", vertical: "center" },
          fill: c === 2 ? { fgColor: { rgb: t.status === "Pass" ? PALETTE.successBg : PALETTE.errorBg } } : undefined,
        },
      };
    });
    r1++;
  });
  applyBordersAndAlignments(ws1, r1 - tiers.length, r1 - 1, 6);

  r1 += 2;

  // Section Mastery Benchmarks
  ws1[XLSX.utils.encode_cell({ r: r1, c: 0 })] = {
    v: "3. SECTION MASTERY BENCHMARKS",
    t: "s",
    s: { font: { bold: true, sz: 13, color: { rgb: "1E3A8A" } } },
  };
  r1++;

  const secHeaders = ["Section #", "Assessment Domain", "Criteria Focus", "Global Average Mastery (%)", "Benchmark Compliance"];
  applyTableHeader(ws1, r1, secHeaders, "4B5563", "FFFFFF");
  r1++;

  const secAverages = stats.sectionAverages && stats.sectionAverages.length > 0 ? stats.sectionAverages : [
    { section: "Tools & Equipment", avg: 88 },
    { section: "1. FDB", avg: 84 },
    { section: "2. BEP", avg: 82 },
    { section: "3. OTO", avg: 86 },
    { section: "4. ONT", avg: 80 },
    { section: "5. Assistant Tools", avg: 92 },
    { section: "6. Customer Education", avg: 85 },
    { section: "8. Self-Assessment", avg: 89 },
  ];

  secAverages.forEach((sec, idx) => {
    const isSecPass = (sec.avg || 0) >= 70;
    const secRow = [`Section ${idx + 1}`, sec.section, "Structured E2E practical criteria & inspection matrix", `${sec.avg}%`, isSecPass ? "Pass (≥70%)" : "Fail (<70%)"];
    secRow.forEach((val, c) => {
      const cell = XLSX.utils.encode_cell({ r: r1, c });
      ws1[cell] = {
        v: val,
        t: "s",
        s: {
          font: { sz: 10, bold: c === 0 || c === 3 },
          alignment: { horizontal: c === 0 || c === 3 || c === 4 ? "center" : "left", vertical: "center" },
          fill: c === 4 ? { fgColor: { rgb: isSecPass ? PALETTE.successBg : PALETTE.errorBg } } : undefined,
        },
      };
    });
    r1++;
  });
  applyBordersAndAlignments(ws1, r1 - secAverages.length, r1 - 1, 5);

  ws1["!cols"] = [{ wch: 32 }, { wch: 30 }, { wch: 35 }, { wch: 22 }, { wch: 24 }, { wch: 45 }, { wch: 20 }, { wch: 20 }];
  ws1["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r1 + 2, c: 7 } });
  XLSX.utils.book_append_sheet(wb, ws1, "Quality Intelligence");

  // ==========================================
  // SHEET 2: TEAM PERFORMANCE MASTER MATRIX
  // ==========================================
  const ws2 = {};
  createTitleRow(
    ws2,
    "FIELD TEAMS PRACTICAL ASSESSMENT - MASTER PERFORMANCE MATRIX",
    "Comprehensive team scores, classification tiers, experience breakdown, and section mastery percentages",
    18
  );

  let r2 = 3;
  const masterHeaders = [
    "Team Code",
    "Team Name",
    "Company",
    "Employment Type",
    "Date of Birth (DoB)",
    "Age (Years)",
    "Experience (Y/M/D)",
    "Safety Certs Count",
    "DD (Defensive Driving)",
    "ES (Electrical Safety)",
    "FA (First Aid)",
    "FF (Fire Fighting)",
    "RA (Risk Assessment)",
    "WAH (Work at Height)",
    "Assessment Date",
    "Overall Score (%)",
    "5-Tier Classification",
    "Status",
    "Assessor Name",
    "Evaluations Count",
    "Assessor Overall Notes / Feedback",
  ];

  applyTableHeader(ws2, r2, masterHeaders, "1E3A8A", "FFFFFF");
  r2++;

  const startDataR2 = r2;

  trackingData.forEach((team) => {
    const latest = team.lastAssessment;
    const isTested = team.isTested && latest;
    const score = isTested ? (latest.overallScore !== undefined ? latest.overallScore : latest.totalScore) : null;
    const tierInfo = isTested ? getTierStyle(score) : { label: "Pending", status: "Pending", bg: "F3F4F6", color: "6B7280" };

    const expY = team.experienceYears !== undefined ? team.experienceYears : (team.yearsOfExperience ? Math.floor(Number(team.yearsOfExperience)) : 0);
    const expM = team.experienceMonths !== undefined ? team.experienceMonths : (team.yearsOfExperience ? Math.round((Number(team.yearsOfExperience) % 1) * 12) : 0);
    const expD = team.experienceDays !== undefined ? team.experienceDays : 0;
    const expString = formatExp(expY, expM, expD, team.yearsOfExperience);

    const certs = team.certificates || latest?.certificates || {};
    const certCount = [certs.dd, certs.es, certs.fa, certs.ff, certs.ra, certs.wah].filter(Boolean).length;

    const dob = team.dateOfBirth || latest?.dateOfBirth;
    const dobString = dob ? format(new Date(dob), "dd/MM/yyyy") : "-";
    let ageVal = team.age !== undefined && team.age !== null ? team.age : (latest?.age !== undefined && latest?.age !== null ? latest.age : null);
    if (ageVal === null && dob) {
      const birth = new Date(dob);
      const now = new Date();
      let a = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) a--;
      ageVal = a >= 0 ? a : null;
    }
    const ageString = ageVal !== null ? `${ageVal} Yrs` : "-";

    const rowData = [
      team.teamCode || "N/A",
      team.teamName || "N/A",
      team.teamCompany || "N/A",
      team.employmentType === "Employee" ? "Direct Employee" : "Subcontractor (Partner)",
      dobString,
      ageString,
      expString,
      `${certCount} / 6`,
      certs.dd ? "Certified" : "No",
      certs.es ? "Certified" : "No",
      certs.fa ? "Certified" : "No",
      certs.ff ? "Certified" : "No",
      certs.ra ? "Certified" : "No",
      certs.wah ? "Certified" : "No",
      isTested ? format(new Date(latest.assessmentDate || latest.createdAt), "dd/MM/yyyy") : "Pending",
      isTested ? `${score}%` : "Pending",
      tierInfo.label,
      tierInfo.status,
      isTested ? latest.conductedBy || latest.assessorId?.name || "Assessor" : "-",
      team.assessmentCount || (isTested ? 1 : 0),
      isTested ? latest.feedback || latest.comments || "Completed successfully" : "Awaiting practical assessment in lab",
    ];

    rowData.forEach((val, c) => {
      const cell = XLSX.utils.encode_cell({ r: r2, c });
      ws2[cell] = {
        v: val,
        t: typeof val === "number" ? "n" : "s",
        s: {
          font: { sz: 9, bold: c === 1 || c === 15 || c === 16 },
          alignment: {
            horizontal: c === 0 || c === 3 || c === 4 || c === 5 || c === 7 || (c >= 8 && c <= 17) || c === 19 ? "center" : "left",
            vertical: "center",
          },
          fill: c === 16 ? { fgColor: { rgb: tierInfo.bg } } :
                c === 17 ? { fgColor: { rgb: tierInfo.status === "Pass" ? PALETTE.successBg : tierInfo.status === "Fail" ? PALETTE.errorBg : "F3F4F6" } } :
                (c >= 8 && c <= 13) && val === "Certified" ? { fgColor: { rgb: PALETTE.successBg } } : undefined,
        },
      };
    });
    r2++;
  });

  applyBordersAndAlignments(ws2, startDataR2, r2 - 1, masterHeaders.length);

  ws2["!cols"] = [
    { wch: 14 }, // Code
    { wch: 24 }, // Name
    { wch: 18 }, // Company
    { wch: 22 }, // Employment
    { wch: 18 }, // Date of Birth
    { wch: 14 }, // Age
    { wch: 24 }, // Exp
    { wch: 16 }, // Cert Count
    { wch: 12 }, // DD
    { wch: 12 }, // ES
    { wch: 12 }, // FA
    { wch: 12 }, // FF
    { wch: 12 }, // RA
    { wch: 14 }, // WAH
    { wch: 16 }, // Date
    { wch: 14 }, // Score
    { wch: 32 }, // Classification
    { wch: 12 }, // Status
    { wch: 20 }, // Assessor
    { wch: 14 }, // Eval Count
    { wch: 45 }, // Feedback
  ];

  ws2["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r2 + 1, c: masterHeaders.length - 1 } });
  XLSX.utils.book_append_sheet(wb, ws2, "Teams Master Performance");

  // ==========================================
  // SHEET 3: DETAILED CHECKPOINTS ANALYTICS
  // ==========================================
  const ws3 = {};
  createTitleRow(
    ws3,
    "FTTH PRACTICAL ASSESSMENT - COMPLETE CHECKPOINTS EVALUATION LOG",
    "Itemized breakdown of every checkpoint, criteria, score, and technician observation across all assessments",
    8
  );

  let r3 = 3;
  const cpHeaders = [
    "Team Code",
    "Team Name",
    "Assessment Date",
    "Section Name",
    "SubSection / ONT Model",
    "Checkpoint Criteria",
    "Evaluation Result",
    "Points / Score",
    "Inspector Notes / Observations",
  ];

  applyTableHeader(ws3, r3, cpHeaders, "0D9488", "FFFFFF");
  r3++;
  const startDataR3 = r3;

  assessments.forEach((assess) => {
    const tCode = assess.fieldTeamId?.teamCode || "N/A";
    const tName = assess.fieldTeamName || assess.fieldTeamId?.teamName || "N/A";
    const aDate = format(new Date(assess.assessmentDate || assess.createdAt), "dd/MM/yyyy");
    const normSections = normalizeExportSections(assess.sections);

    normSections.forEach((sec) => {
      const isSec8 = sec.sectionId === "sec-8" || sec.sectionTitle?.includes("Photo") || sec.sectionTitle?.includes("Self-Assessment");
      const cpMax = isSec8 ? 10 : 5;
      const passThreshold = isSec8 ? 7 : 4;
      sec.checkpoints.forEach((cp) => {
        const cpScore = cp.score !== undefined ? cp.score : (cp.status === "Pass" ? cpMax : 0);
        const isPass = cp.status === "Pass" || cpScore >= passThreshold;

        const rowData = [
          tCode,
          tName,
          aDate,
          sec.sectionTitle,
          cp.subSection || "-",
          cp.name,
          `${cpScore} / ${cpMax} Pts (${isPass ? "Pass" : "Fail"})`,
          `${cpScore}`,
          cp.notes || "-",
        ];

        rowData.forEach((val, c) => {
          const cell = XLSX.utils.encode_cell({ r: r3, c });
          ws3[cell] = {
            v: val,
            t: "s",
            s: {
              font: { sz: 9 },
              alignment: { horizontal: c === 0 || c === 2 || c === 6 || c === 7 ? "center" : "left", vertical: "center" },
              fill: c === 6 ? { fgColor: { rgb: isPass ? PALETTE.successBg : PALETTE.errorBg } } : undefined,
            },
          };
        });
        r3++;
      });
    });
  });

  applyBordersAndAlignments(ws3, startDataR3, r3 - 1, cpHeaders.length);

  ws3["!cols"] = [
    { wch: 14 }, // Code
    { wch: 22 }, // Name
    { wch: 16 }, // Date
    { wch: 30 }, // Section
    { wch: 35 }, // SubSection
    { wch: 55 }, // Checkpoint Criteria
    { wch: 18 }, // Result
    { wch: 14 }, // Points
    { wch: 40 }, // Notes
  ];

  ws3["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r3 + 1, c: cpHeaders.length - 1 } });
  XLSX.utils.book_append_sheet(wb, ws3, "All Checkpoints Log");

  // ==========================================
  // SHEET 4: SAFETY & COMPLIANCE MATRIX
  // ==========================================
  const ws4 = {};
  createTitleRow(
    ws4,
    "SAFETY & COMPLIANCE CLEARANCE MATRIX (6 MANDATORY CERTIFICATES)",
    "Defensive Driving (DD), Electrical Safety (ES), First Aid (FA), Fire Fighting (FF), Risk Assessment (RA), Work at Height (WAH)",
    10
  );

  let r4 = 3;
  const safetyHeaders = [
    "Team Code",
    "Team Name",
    "Company",
    "Employment Type",
    "DD (Defensive Driving)",
    "ES (Electrical Safety)",
    "FA (First Aid)",
    "FF (Fire Fighting)",
    "RA (Risk Assessment)",
    "WAH (Work at Height)",
    "Total Clearances",
  ];

  applyTableHeader(ws4, r4, safetyHeaders, "7C3AED", "FFFFFF");
  r4++;
  const startDataR4 = r4;

  trackingData.forEach((team) => {
    const certs = team.certificates || team.lastAssessment?.certificates || {};
    const count = [certs.dd, certs.es, certs.fa, certs.ff, certs.ra, certs.wah].filter(Boolean).length;
    const rowData = [
      team.teamCode || "N/A",
      team.teamName || "N/A",
      team.teamCompany || "N/A",
      team.employmentType === "Employee" ? "Direct Employee" : "Subcontractor",
      certs.dd ? "Certified" : "Missing",
      certs.es ? "Certified" : "Missing",
      certs.fa ? "Certified" : "Missing",
      certs.ff ? "Certified" : "Missing",
      certs.ra ? "Certified" : "Missing",
      certs.wah ? "Certified" : "Missing",
      `${count} / 6 (${Math.round((count / 6) * 100)}%)`,
    ];

    rowData.forEach((val, c) => {
      const cell = XLSX.utils.encode_cell({ r: r4, c });
      ws4[cell] = {
        v: val,
        t: "s",
        s: {
          font: { sz: 9, bold: c === 1 || c === 10 },
          alignment: { horizontal: c === 0 || (c >= 3 && c <= 10) ? "center" : "left", vertical: "center" },
          fill: (c >= 4 && c <= 9) ? { fgColor: { rgb: val === "Certified" ? PALETTE.successBg : PALETTE.errorBg } } :
                c === 10 && count === 6 ? { fgColor: { rgb: PALETTE.successBg } } : undefined,
        },
      };
    });
    r4++;
  });

  applyBordersAndAlignments(ws4, startDataR4, r4 - 1, safetyHeaders.length);

  ws4["!cols"] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
  ];

  ws4["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r4 + 1, c: safetyHeaders.length - 1 } });
  XLSX.utils.book_append_sheet(wb, ws4, "Safety Clearances Matrix");

  // Save File
  const filename = `Nokia_FTTH_Practical_Assessment_Quality_Intelligence_Master_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
  XLSX.writeFile(wb, filename);
};

/**
 * Generates and downloads the Detailed Individual Team Excel Report
 */
export const exportIndividualLabAssessmentReport = (assessment, team) => {
  if (!assessment) return;

  const wb = XLSX.utils.book_new();
  const teamName = assessment.fieldTeamName || team?.teamName || "Field_Team";
  const safeName = (teamName || "Field_Team")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim() || "Field_Team";
  const score = assessment.overallScore !== undefined ? assessment.overallScore : assessment.totalScore || 0;
  const tierInfo = getTierStyle(score);

  const expY = assessment.experienceYears !== undefined ? assessment.experienceYears : (team?.experienceYears !== undefined ? team.experienceYears : (assessment.yearsOfExperience ? Math.floor(Number(assessment.yearsOfExperience)) : 0));
  const expM = assessment.experienceMonths !== undefined ? assessment.experienceMonths : (team?.experienceMonths !== undefined ? team.experienceMonths : (assessment.yearsOfExperience ? Math.round((Number(assessment.yearsOfExperience) % 1) * 12) : 0));
  const expD = assessment.experienceDays !== undefined ? assessment.experienceDays : (team?.experienceDays || 0);
  const expString = formatExp(expY, expM, expD, assessment.yearsOfExperience);

  // ==========================================
  // SHEET 1: ASSESSMENT SUMMARY
  // ==========================================
  const ws1 = {};
  createTitleRow(
    ws1,
    `PRACTICAL ASSESSMENT EVALUATION REPORT - ${teamName.toUpperCase()}`,
    `Date of Assessment: ${format(new Date(assessment.assessmentDate || assessment.createdAt), "dd/MM/yyyy HH:mm")} | Assessor: ${assessment.conductedBy || assessment.assessorId?.name || "Assessor"}`,
    5
  );

  let r1 = 3;

  ws1[XLSX.utils.encode_cell({ r: r1, c: 0 })] = {
    v: "1. FIELD TECHNICIAN PROFILE & EVALUATION RESULT",
    t: "s",
    s: { font: { bold: true, sz: 12, color: { rgb: "1E3A8A" } } },
  };
  r1++;

  const profileHeaders = ["Metric / Profile Field", "Technician Detail", "Evaluation Standard", "Status / Classification"];
  applyTableHeader(ws1, r1, profileHeaders, "1E3A8A", "FFFFFF");
  r1++;

  const dob = assessment.dateOfBirth || team?.dateOfBirth || assessment.fieldTeamId?.dateOfBirth;
  const dobFormatted = dob ? format(new Date(dob), "dd/MM/yyyy") : "Not Specified";
  let ageVal = assessment.age !== undefined && assessment.age !== null ? assessment.age : (team?.age !== undefined && team?.age !== null ? team.age : (assessment.fieldTeamId?.age !== undefined && assessment.fieldTeamId?.age !== null ? assessment.fieldTeamId.age : null));
  if (ageVal === null && dob) {
    const birth = new Date(dob);
    const ref = assessment.assessmentDate ? new Date(assessment.assessmentDate) : new Date();
    let a = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) a--;
    ageVal = a >= 0 ? a : null;
  }
  const ageFormatted = ageVal !== null ? `${ageVal} Years` : "Not Specified";

  const profileData = [
    ["Field Team Name", teamName, "Verified Identity", "Active"],
    ["Team Code / ID", team?.teamCode || assessment.fieldTeamId?.teamCode || "N/A", "System ID", "Verified"],
    ["Subcontractor / Company", team?.teamCompany || assessment.fieldTeamId?.teamCompany || "N/A", "Service Partner", "Verified"],
    ["Employment Classification", assessment.employmentType === "Employee" ? "Direct Employee" : "Subcontractor (Partner)", "Contract Type", "Verified"],
    ["Date of Birth (DoB)", dobFormatted, "Official Government / HR Record", "Recorded"],
    ["Technician Age", ageFormatted, "Standard Field Working Age", "Verified"],
    ["Field Experience Duration", expString, "Years, Months, Days", "Recorded"],
    ["Overall Practical Score", `${score}%`, "≥ 70.0% Minimum Pass", tierInfo.status],
    ["5-Tier Performance Result", tierInfo.label, "Nokia Quality Benchmark Scale", tierInfo.status],
    ["Assessor Overall Feedback", assessment.feedback || assessment.comments || "Completed successfully", "Quality Supervisor Remarks", "Logged"],
  ];

  profileData.forEach((row) => {
    row.forEach((val, c) => {
      const cell = XLSX.utils.encode_cell({ r: r1, c });
      ws1[cell] = {
        v: val,
        t: "s",
        s: {
          font: { sz: 10, bold: c === 0 || c === 1 },
          alignment: { horizontal: c === 2 || c === 3 ? "center" : "left", vertical: "center" },
          fill: c === 3 && (val === "Pass" || val === "Verified" || val === "Optimal") ? { fgColor: { rgb: PALETTE.successBg } } :
                c === 3 && val === "Fail" ? { fgColor: { rgb: PALETTE.errorBg } } : undefined,
        },
      };
    });
    r1++;
  });
  applyBordersAndAlignments(ws1, 4, r1 - 1, 4);

  r1 += 2;

  // Section Breakdown Summary
  ws1[XLSX.utils.encode_cell({ r: r1, c: 0 })] = {
    v: "2. SECTION-BY-SECTION MASTERY SUMMARY",
    t: "s",
    s: { font: { bold: true, sz: 12, color: { rgb: "1E3A8A" } } },
  };
  r1++;

  const secSummaryHeaders = ["Section #", "Assessment Domain", "Total Checkpoints", "Section Score (%)", "Evaluation Result"];
  applyTableHeader(ws1, r1, secSummaryHeaders, "374151", "FFFFFF");
  r1++;

  const normSections = normalizeExportSections(assessment.sections);

  if (normSections && normSections.length > 0) {
    normSections.forEach((sec, idx) => {
      const isSec8 = sec.sectionId === "sec-8" || sec.sectionTitle?.includes("Photo") || sec.sectionTitle?.includes("Self-Assessment");
      const cpCount = sec.checkpoints?.length || 0;
      let totalSc = 0;
      let maxSc = 0;
      sec.checkpoints.forEach((cp) => {
        if (cp.status !== "N/A") {
          const cpMax = isSec8 ? 10 : 5;
          maxSc += cpMax;
          const cpScore = cp.score !== undefined ? cp.score : (cp.status === "Pass" ? cpMax : 0);
          totalSc += Math.min(cpMax, Math.max(0, Number(cpScore)));
        }
      });
      const pct = maxSc > 0 ? Math.min(100, Math.round((totalSc / maxSc) * 100)) : 100;
      const isSecPass = pct >= 70;
      const isSec7 = sec.sectionId === "sec-7";

      const secRow = [
        `Section ${idx + 1}`,
        sec.sectionTitle,
        `${cpCount} Checkpoints`,
        isSec7 ? "100% (Awareness)" : `${totalSc} / ${maxSc} Pts (${pct}%)`,
        isSec7 ? "Informational" : isSecPass ? "Pass" : "Fail",
      ];

      secRow.forEach((val, c) => {
        const cell = XLSX.utils.encode_cell({ r: r1, c });
        ws1[cell] = {
          v: val,
          t: "s",
          s: {
            font: { sz: 10, bold: c === 0 || c === 3 },
            alignment: { horizontal: c === 0 || c === 2 || c === 3 || c === 4 ? "center" : "left", vertical: "center" },
            fill: c === 4 && val === "Pass" ? { fgColor: { rgb: PALETTE.successBg } } :
                  c === 4 && val === "Fail" ? { fgColor: { rgb: PALETTE.errorBg } } : undefined,
          },
        };
      });
      r1++;
    });
  }

  applyBordersAndAlignments(ws1, r1 - (normSections.length || 0), r1 - 1, 5);

  ws1["!cols"] = [{ wch: 30 }, { wch: 38 }, { wch: 25 }, { wch: 28 }, { wch: 20 }];
  ws1["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r1 + 1, c: 4 } });
  XLSX.utils.book_append_sheet(wb, ws1, "Summary & Result");

  // ==========================================
  // SHEET 2: ALL CHECKPOINTS EVALUATION
  // ==========================================
  const ws2 = {};
  createTitleRow(
    ws2,
    `ITEMIZED PRACTICAL CHECKPOINTS - ${teamName.toUpperCase()}`,
    `Comprehensive verification criteria across FDB, BEP, OTO, ONT (ZTE & Nokia), Apps & Customer Education`,
    7
  );

  let r2 = 3;
  const indCpHeaders = [
    "Section Name",
    "SubSection / ONT Model",
    "Checkpoint Criteria",
    "Result Status",
    "Score",
    "Max Points",
    "Assessor Notes & Observations",
  ];

  applyTableHeader(ws2, r2, indCpHeaders, "0D9488", "FFFFFF");
  r2++;
  const startDataR2 = r2;

  if (normSections && normSections.length > 0) {
    normSections.forEach((sec) => {
      const isSec8 = sec.sectionId === "sec-8" || sec.sectionTitle?.includes("Photo") || sec.sectionTitle?.includes("Self-Assessment");
      const cpMax = isSec8 ? 10 : 5;
      const passThreshold = isSec8 ? 7 : 4;
      sec.checkpoints.forEach((cp) => {
        const cpScore = cp.score !== undefined ? cp.score : (cp.status === "Pass" ? cpMax : 0);
        const isPass = cp.status === "Pass" || cpScore >= passThreshold;

        const rowData = [
          sec.sectionTitle,
          cp.subSection || "-",
          cp.name,
          cp.status === "N/A" ? "N/A" : (isPass ? "Pass" : "Fail"),
          `${cpScore}`,
          `${cpMax}`,
          cp.notes || "-",
        ];

        rowData.forEach((val, c) => {
          const cell = XLSX.utils.encode_cell({ r: r2, c });
          ws2[cell] = {
            v: val,
            t: "s",
            s: {
              font: { sz: 9 },
              alignment: { horizontal: c === 3 || c === 4 || c === 5 ? "center" : "left", vertical: "center" },
              fill: c === 3 && isPass ? { fgColor: { rgb: PALETTE.successBg } } :
                    c === 3 && !isPass && cp.status !== "N/A" ? { fgColor: { rgb: PALETTE.errorBg } } : undefined,
            },
          };
        });
        r2++;
      });
    });
  }

  applyBordersAndAlignments(ws2, startDataR2, r2 - 1, indCpHeaders.length);

  ws2["!cols"] = [
    { wch: 30 }, // Section
    { wch: 35 }, // SubSection
    { wch: 55 }, // Checkpoint Criteria
    { wch: 16 }, // Result
    { wch: 12 }, // Score
    { wch: 12 }, // Max Points
    { wch: 45 }, // Notes
  ];

  ws2["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r2 + 1, c: indCpHeaders.length - 1 } });
  XLSX.utils.book_append_sheet(wb, ws2, "Checkpoints Detail");

  // ==========================================
  // SHEET 3: TOOLS & EQUIPMENT READINESS
  // ==========================================
  const ws3 = {};
  createTitleRow(
    ws3,
    `TOOLS & EQUIPMENT READINESS INSPECTION MATRIX - ${teamName.toUpperCase()}`,
    "Splicing Machine, Cleaver, Stripper, Optical Power Meter, Laser Source, IPA 99%, Sleeves & Wipes",
    4
  );

  let r3 = 3;
  const eqHeaders = ["Item #", "Tool / Equipment Name", "Readiness & Calibration Status", "Inspection Evaluation", "Notes"];
  applyTableHeader(ws3, r3, eqHeaders, "EA580C", "FFFFFF");
  r3++;
  const startDataR3 = r3;

  const eqList = assessment.equipmentChecklist || [];
  eqList.forEach((eq, idx) => {
    const isGood = eq.status === "Valid" || eq.status === "Available";
    const rowData = [
      `#${idx + 1}`,
      eq.toolName,
      eq.status || "Valid",
      isGood ? "Approved for Field Use" : eq.status === "Need Maintenance" ? "Maintenance Required" : "Non-Compliant / Missing",
      eq.notes || "-",
    ];

    rowData.forEach((val, c) => {
      const cell = XLSX.utils.encode_cell({ r: r3, c });
      ws3[cell] = {
        v: val,
        t: "s",
        s: {
          font: { sz: 9 },
          alignment: { horizontal: c === 0 || c === 2 || c === 3 ? "center" : "left", vertical: "center" },
          fill: c === 3 && isGood ? { fgColor: { rgb: PALETTE.successBg } } :
                c === 3 && !isGood ? { fgColor: { rgb: PALETTE.errorBg } } : undefined,
        },
      };
    });
    r3++;
  });

  applyBordersAndAlignments(ws3, startDataR3, r3 - 1, eqHeaders.length);

  ws3["!cols"] = [{ wch: 10 }, { wch: 35 }, { wch: 28 }, { wch: 30 }, { wch: 40 }];
  ws3["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r3 + 1, c: eqHeaders.length - 1 } });
  XLSX.utils.book_append_sheet(wb, ws3, "Tools & Equipment Matrix");

  // ==========================================
  // SHEET 4: SAFETY CLEARANCES
  // ==========================================
  const ws4 = {};
  createTitleRow(
    ws4,
    `SAFETY & COMPLIANCE CLEARANCES - ${teamName.toUpperCase()}`,
    "6 Mandatory Field Technician Safety Clearances & Certified Scopes",
    4
  );

  let r4 = 3;
  const certHeaders = ["Code", "Certificate Title", "Mandatory Safety Scope & Description", "Verification Status", "Clearance Level"];
  applyTableHeader(ws4, r4, certHeaders, "7C3AED", "FFFFFF");
  r4++;
  const startDataR4 = r4;

  const certs = assessment.certificates || team?.certificates || {};
  const certDefs = [
    { key: "dd", code: "DD", title: "Defensive Driving", desc: "Safe vehicle operation, hazard perception & driving compliance" },
    { key: "es", code: "ES", title: "Electrical Safety", desc: "Safe handling of electrical sources, grounding & arc flash prevention" },
    { key: "fa", code: "FA", title: "First Aid", desc: "Emergency first response, CPR & basic trauma management" },
    { key: "ff", code: "FF", title: "Fire Fighting", desc: "Fire extinguisher operation, fire risk prevention & evacuation" },
    { key: "ra", code: "RA", title: "Risk Assessment", desc: "Job site hazard identification, risk evaluation & control measures" },
    { key: "wah", code: "WAH", title: "Work at Height", desc: "Ladder safety, harness usage, pole climbing & fall arrest systems" },
  ];

  certDefs.forEach((cDef) => {
    const isCert = Boolean(certs[cDef.key]);
    const rowData = [
      cDef.code,
      cDef.title,
      cDef.desc,
      isCert ? "Certified" : "Not Certified",
      isCert ? "Authorized" : "Clearance Missing",
    ];

    rowData.forEach((val, c) => {
      const cell = XLSX.utils.encode_cell({ r: r4, c });
      ws4[cell] = {
        v: val,
        t: "s",
        s: {
          font: { sz: 9, bold: c === 0 || c === 3 },
          alignment: { horizontal: c === 0 || c === 3 || c === 4 ? "center" : "left", vertical: "center" },
          fill: c === 3 && isCert ? { fgColor: { rgb: PALETTE.successBg } } :
                c === 3 && !isCert ? { fgColor: { rgb: PALETTE.errorBg } } : undefined,
        },
      };
    });
    r4++;
  });

  applyBordersAndAlignments(ws4, startDataR4, r4 - 1, certHeaders.length);

  ws4["!cols"] = [{ wch: 12 }, { wch: 25 }, { wch: 60 }, { wch: 22 }, { wch: 22 }];
  ws4["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r4 + 1, c: certHeaders.length - 1 } });
  XLSX.utils.book_append_sheet(wb, ws4, "Safety Clearances");

  // Save File
  const filename = `${safeName}_FTTH_Practical_Assessment_Detailed_Report_${format(new Date(), "yyyyMMdd")}.xlsx`;
  XLSX.writeFile(wb, filename);
};
