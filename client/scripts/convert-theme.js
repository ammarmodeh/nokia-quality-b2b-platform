// Batch update script for converting dark theme to ClickUp light theme
// This script will be used to update all files with dark theme references

const fs = require('fs');
const path = require('path');

const replacements = [
  // Background colors
  { from: /#121212/g, to: '#f9fafb' },
  { from: /#1e1e1e/g, to: '#ffffff' },
  { from: /#272727/g, to: '#ffffff' },
  { from: /bg-\[#121212\]/g, to: 'bg-[#f9fafb]' },
  { from: /bg-\[#1e1e1e\]/g, to: 'bg-white' },

  // Border colors
  { from: /#444/g, to: '#e5e7eb' },
  { from: /#4f4f4f/g, to: '#e5e7eb' },
  { from: /border-\[#444\]/g, to: 'border-[#e5e7eb]' },
  { from: /#483c3c/g, to: '#e5e7eb' },

  // Text colors
  { from: /#ffffff/g, to: '#1f2937' },
  { from: /#A1A1A1/g, to: '#6b7280' },
  { from: /#b3b3b3/g, to: '#6b7280' },
  { from: /text-gray-100/g, to: 'text-gray-900' },
  { from: /text-gray-200/g, to: 'text-gray-700' },
  { from: /text-white/g, to: 'text-gray-900' },

  // Accent colors
  { from: /#3ea6ff/g, to: '#7b68ee' },
  { from: /#0d73bc/g, to: '#7b68ee' },
];

// Files to update (from grep search results)
const filesToUpdate = [
  'src/pages/Dashboard.jsx',
  'src/pages/AssignedToMe.jsx',
  'src/pages/TaskViewPage.jsx',
  'src/pages/Tasks.jsx',
  'src/pages/MainStats.jsx',
  'src/pages/DetractorAnalytics.jsx',
  'src/pages/TeamsPerformancePage.jsx',
  'src/pages/FieldTeams.jsx',
  'src/pages/DataManagement.jsx',
  'src/components/Navbar.jsx',
  'src/components/Card.jsx',
  'src/components/Chart.jsx',
  'src/components/NotificationPanel.jsx',
  // ... add more files as needed
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    replacements.forEach(({ from, to }) => {
      if (content.match(from)) {
        content = content.replace(from, to);
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
    } else {
      console.log(`- Skipped: ${filePath} (no changes needed)`);
    }
  } catch (error) {
    console.error(`✗ Error updating ${filePath}:`, error.message);
  }
}

// Run updates
console.log('Starting ClickUp theme conversion...\n');
filesToUpdate.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  updateFile(fullPath);
});
console.log('\nConversion complete!');
