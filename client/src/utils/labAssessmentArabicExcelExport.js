import XLSX from "xlsx-js-style";
import { format } from "date-fns";

/**
 * Minimal Arabic Excel export for a single lab assessment.
 * Generates a simple workbook with basic team info and overall score.
 * The filename follows the pattern `${teamName}_team_performance_ar.xlsx`.
 */
export const exportArabicLabAssessmentReport = (fullData) => {
  const { fieldTeam } = fullData;
  const teamName = fieldTeam?.teamName || "Team";
  const overallScore = fullData.overallScore ?? fullData.totalScore ?? 0;

  // Create a new workbook and a worksheet with Arabic headers.
  const wb = XLSX.utils.book_new();
  const wsData = [
    ["اسم الفريق", teamName],
    ["النتيجة العامة", overallScore],
    ["تاريخ التصدير", format(new Date(), "dd-MM-yyyy HH:mm")],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for better readability.
  ws["!cols"] = [{ wch: 20 }, { wch: 30 }];

  // Append the sheet with an Arabic title.
  XLSX.utils.book_append_sheet(wb, ws, "تقرير");

  const fileName = `${teamName}_team_performance_ar.xlsx`;
  XLSX.writeFile(wb, fileName);
};
