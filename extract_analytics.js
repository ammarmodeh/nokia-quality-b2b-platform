const fs = require('fs');
const filepath = './client/src/pages/FieldTeamPortal.jsx';
const code = fs.readFileSync(filepath, 'utf8');
const lines = code.split('\n');

let startAnalytics = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{globalTab === 1 && (')) {
    startAnalytics = i;
    break;
  }
}

if (startAnalytics === -1) {
  console.log("Could not find startAnalytics");
  process.exit(1);
}

let endAnalytics = -1;
let openParens = 0;
let openBraces = 0;
let started = false;

// Scan from startAnalytics line
for (let i = startAnalytics; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '(') openParens++;
    if (char === ')') openParens--;
    
    // We are looking for the closing `)}` of `{globalTab === 1 && (`
    // Wait, `{globalTab === 1 && (` has `{` and `(`.
    // So `{` is +1, `(` is +1.
    if (!started && openBraces >0 && openParens > 0) {
      started = true;
    }
    
    if (started && openBraces === 0 && openParens === 0 && char === '}') { // Both closed
      endAnalytics = i;
      break;
    }
  }
  if (endAnalytics !== -1) break;
}

console.log('startAnalytics:', startAnalytics);
console.log('endAnalytics:', endAnalytics);

if (endAnalytics === -1) {
  console.log("Could not find endAnalytics");
  process.exit(1);
}

const extractedCode = lines.slice(startAnalytics + 1, endAnalytics).join('\n');

const componentProps = [
  'isMedium', 'analyticsSubTab', 'setAnalyticsSubTab', 'globalAnalytics', 
  'handleExportAnalyticsDistributions', 'timeFilterMode', 'setTimeFilterMode',
  'recentDaysValue', 'setRecentDaysValue', 'selectedWeeks', 'setSelectedWeeks',
  'weekRanges', 'selectedMonths', 'setSelectedMonths', 'monthOptions',
  'customDateRange', 'setCustomDateRange', 'handleAnalyticsDrillDown',
  'offendersPage', 'setOffendersPage', 'colors', 'PieChartIcon',
  'TrendingUpIcon', 'RechartsPieChart', 'RechartsPie', 'Cell',
  'ResponsiveContainer', 'RechartsTooltip', 'RechartsLegend', 'Avatar',
  'Typography', 'Box', 'Tabs', 'Tab', 'Button', 'Grid', 'Paper', 'Table',
  'TableBody', 'TableCell', 'TableContainer', 'TableHead', 'TableRow',
  'FormControl', 'InputLabel', 'Select', 'MenuItem', 'TextField', 'Chip',
  'Pagination', 'LinearProgress', 'Stack'
].map(prop => `${prop}={${prop}}`).join('\n  ');

const componentWrapper = `
import React from 'react';
import { Box, Paper, Typography, Grid, Button, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, TextField, Chip, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Pagination, LinearProgress, Stack, Avatar } from '@mui/material';
import { PieChart as PieChartIcon } from '@mui/icons-material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { PieChart as RechartsPieChart, Pie as RechartsPie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';

export const GlobalAnalytics = ({
  ${componentProps.replace(/={[^}]+}/g, '').replace(/\n  /g, ', ')}
}) => {
  return (
    <>
      ${extractedCode}
    </>
  );
};
`;

fs.writeFileSync('./client/src/components/FieldTeamPortal/GlobalAnalytics.jsx', componentWrapper);

const newLines = [
  ...lines.slice(0, startAnalytics),
  `          {globalTab === 1 && (`,
  `            <GlobalAnalytics \n              ${componentProps}\n            />`,
  `          )}`,
  ...lines.slice(endAnalytics + 1)
];

let fileOut = newLines.join('\n');
fileOut = fileOut.replace(
  'import { GlobalLeaderboard } from "../components/FieldTeamPortal/GlobalLeaderboard";',
  'import { GlobalLeaderboard } from "../components/FieldTeamPortal/GlobalLeaderboard";\nimport { GlobalAnalytics } from "../components/FieldTeamPortal/GlobalAnalytics";'
);

fs.writeFileSync('./client/src/pages/FieldTeamPortal.jsx', fileOut);
console.log('GlobalAnalytics extracted successfully!');
