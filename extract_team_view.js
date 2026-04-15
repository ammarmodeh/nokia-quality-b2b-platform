const fs = require('fs');
const filepath = './client/src/pages/FieldTeamPortal.jsx';
const code = fs.readFileSync(filepath, 'utf8');
const lines = code.split('\n');

let startTeamView = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('selectedTeam && (') && !lines[i].includes('!selectedTeam')) {
    startTeamView = i;
    break;
  }
}

if (startTeamView === -1) {
  console.log("Could not find startTeamView");
  process.exit(1);
}

let blockStart = startTeamView;
for (let i = startTeamView; i >= 0; i--) {
  if (lines[i].includes('{')) {
    blockStart = i;
    break;
  }
}

let endTeamView = -1;
let openParens = 0;
let openBraces = 0;
let started = false;

// Scan from blockStart line
for (let i = blockStart; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '(') openParens++;
    if (char === ')') openParens--;
    
    if (!started && openBraces >0 && openParens > 0) {
      started = true;
    }
    
    if (started && openBraces === 0 && openParens === 0 && char === '}') { // Both closed
      endTeamView = i;
      break;
    }
  }
  if (endTeamView !== -1) break;
}

console.log('blockStart:', blockStart);
console.log('endTeamView:', endTeamView);

if (endTeamView === -1) {
  console.log("Could not find endTeamView");
  process.exit(1);
}

const extractedCode = lines.slice(blockStart + 2, endTeamView).join('\n');

const componentProps = [
  'selectedTeam', 'colors', 'activeTab', 'handleTabChange', 'Quiz', 'Assignment',
  'BarChartIconMUI', 'SupportAgent', 'CheckCircle', 'stats', 'operationalEfficiencyData',
  'deepStats', 'allActivities', 'trendData', 'statusData', 'categoryData', 'technicalTasks',
  'quizDistributionData', 'jobDistributionData', 'doughnutOptions', 'commonOptions',
  'renderLineChart', 'renderBarChart', 'StatCard', 'quizResults', 'jobAssessments',
  'labAssessments', 'customerIssues', 'formatDate', 'getAssessmentStatus',
  'quizPage', 'quizRowsPerPage', 'setQuizPage', 'setQuizRowsPerPage',
  'jobPage', 'jobRowsPerPage', 'setJobPage', 'setJobRowsPerPage',
  'labPage', 'labRowsPerPage', 'setLabPage', 'setLabRowsPerPage',
  'issuesPage', 'issuesRowsPerPage', 'setIssuesPage', 'setIssuesRowsPerPage',
  'handleExportFullPerformanceToExcel', 'generatingReport', 'handleGenerateFullReport',
  'exportTheoreticalToExcel', 'exportTestToPDF', 'exportPracticalToExcel', 'exportLabToExcel',
  'handleExportTeamViolations', 'FieldTeamTicketsForPortalReview',
  'ViewIssueDetailsDialog', 'TaskDetailsDialog', 'CompactDataTable',
  'getPerformanceColor', 'calculateScoreLabel', 'getScoreDistribution', 'identifyStrengthsAndWeaknesses',
  'Timeline', 'setSelectedDetailIssue', 'setDetailIssueOpen', 'setSelectedTask', 'setViewDialogOpen',
  'handleReviewAssessment'
].map(prop => `${prop}={${prop}}`).join('\n  ');

const componentWrapper = `
import React from 'react';
import { Box, Paper, Typography, Grid, Button, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, TextField, Chip, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Pagination, LinearProgress, Stack, Avatar, Card, CardContent, CircularProgress, Alert, TablePagination, Tooltip as MuiTooltip, IconButton } from '@mui/material';
import { Quiz, Assignment, BarChart as BarChartIconMUI, SupportAgent, CheckCircle, Warning, PriorityHigh, Assessment, PictureAsPdf as PictureAsPdfIcon, Timeline, Visibility as VisibilityIcon } from '@mui/icons-material';
import { Doughnut, Bar } from 'react-chartjs-2';
import { FaFileExcel, FaClipboardList, FaFileExport } from 'react-icons/fa';

export const IndividualTeamView = ({
  ${componentProps.replace(/={[^}]+}/g, '').replace(/\n  /g, ', ')}
}) => {
  return (
    <>
      ${extractedCode}
    </>
  );
};
`;

fs.writeFileSync('./client/src/components/FieldTeamPortal/IndividualTeamView.jsx', componentWrapper);

const newLines = [
  ...lines.slice(0, blockStart),
  `          {selectedTeam && (`,
  `            <IndividualTeamView \n              ${componentProps}\n            />`,
  `          )}`,
  ...lines.slice(endTeamView + 1)
];

let fileOut = newLines.join('\n');
fileOut = fileOut.replace(
  'import { GlobalAnalytics } from "../components/FieldTeamPortal/GlobalAnalytics";',
  'import { GlobalAnalytics } from "../components/FieldTeamPortal/GlobalAnalytics";\nimport { IndividualTeamView } from "../components/FieldTeamPortal/IndividualTeamView";'
);

fs.writeFileSync('./client/src/pages/FieldTeamPortal.jsx', fileOut);
console.log('IndividualTeamView extracted successfully!');
