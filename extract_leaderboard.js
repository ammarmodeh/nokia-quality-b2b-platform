const fs = require('fs');
const filepath = './client/src/pages/FieldTeamPortal.jsx';
const lines = fs.readFileSync(filepath, 'utf8').split('\n');

const startIdx = 2790; // Line 2791 (index 2790) is {globalTab === 0 && (
const endIdx = 3149;   // Line 3150 is )} (index 3149)

const extractedCode = lines.slice(startIdx + 1, endIdx).join('\n'); // inside the <>...</>

const componentJSX = Object.entries({
  LeaderboardSearchQuery: 'leaderboardSearchQuery',
  setLeaderboardSearchQuery: 'setLeaderboardSearchQuery',
  LeaderboardStatusQuery: 'leaderboardStatusQuery',
  setLeaderboardStatusQuery: 'setLeaderboardStatusQuery',
  AdvancedFiltersOpen: 'advancedFiltersOpen',
  setAdvancedFiltersOpen: 'setAdvancedFiltersOpen',
  LeaderboardDateFilter: 'leaderboardDateFilter',
  setLeaderboardDateFilter: 'setLeaderboardDateFilter',
  LeaderboardThresholds: 'leaderboardThresholds',
  setLeaderboardThresholds: 'setLeaderboardThresholds',
  LeaderboardPage: 'leaderboardPage',
  setLeaderboardPage: 'setLeaderboardPage',
  LeaderboardSort: 'leaderboardSort',
  setLeaderboardSort: 'setLeaderboardSort',
  LeaderboardRowsPerPage: 'leaderboardRowsPerPage',
  setLeaderboardRowsPerPage: 'setLeaderboardRowsPerPage',
  paginatedLeaderboardData: 'paginatedLeaderboardData',
  leaderboardDataLength: 'leaderboardData.length',
  colors: 'colors',
  handleExportLeaderboard: 'handleExportLeaderboard',
  handleTeamSelect: 'handleTeamSelect',
  handleDrillDown: 'handleDrillDown'
}).map(([key, val]) => `${key}={${val}}`).join(' ');

const componentWrapper = `
import React from 'react';
import { Box, Paper, TextField, IconButton, FormControl, Select, MenuItem, Button, Grid, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip, Tooltip as MuiTooltip, TablePagination } from '@mui/material';
import { Search as SearchIcon, FilterList as FilterListIcon, TableChart as TableChartIcon } from '@mui/icons-material';
import { FaTimes, FaFilter, FaFileExcel } from 'react-icons/fa';

export const GlobalLeaderboard = ({
  leaderboardSearchQuery, setLeaderboardSearchQuery,
  leaderboardStatusQuery, setLeaderboardStatusQuery,
  advancedFiltersOpen, setAdvancedFiltersOpen,
  leaderboardDateFilter, setLeaderboardDateFilter,
  leaderboardThresholds, setLeaderboardThresholds,
  leaderboardPage, setLeaderboardPage,
  leaderboardSort, setLeaderboardSort,
  leaderboardRowsPerPage, setLeaderboardRowsPerPage,
  paginatedLeaderboardData, leaderboardDataLength,
  colors, handleExportLeaderboard, handleTeamSelect, handleDrillDown
}) => {
  return (
    <>
      ${extractedCode}
    </>
  );
};
`;

// Make sure directory exists
if (!fs.existsSync('./client/src/components/FieldTeamPortal')) {
    fs.mkdirSync('./client/src/components/FieldTeamPortal');
}

fs.writeFileSync('./client/src/components/FieldTeamPortal/GlobalLeaderboard.jsx', componentWrapper);

const newLines = [
  ...lines.slice(0, startIdx),
  `          {globalTab === 0 && (`,
  `            <GlobalLeaderboard ${componentJSX} />`,
  `          )}`,
  ...lines.slice(endIdx + 1)
];

// Add import to FieldTeamPortal
let fileOut = newLines.join('\n');
fileOut = fileOut.replace(
  'import FieldTeamTicketsForPortalReview from "../components/FieldTeamTicketsForPortalReview";',
  'import FieldTeamTicketsForPortalReview from "../components/FieldTeamTicketsForPortalReview";\nimport { GlobalLeaderboard } from "../components/FieldTeamPortal/GlobalLeaderboard";'
);

fs.writeFileSync('./client/src/pages/FieldTeamPortal.jsx', fileOut);
console.log('GlobalLeaderboard extracted successfully!');
