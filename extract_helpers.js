const fs = require('fs');
const filepath = './client/src/pages/FieldTeamPortal.jsx';
const content = fs.readFileSync(filepath, 'utf8');

const regexMap = {
  splitValues: /const splitValues = ([\s\S]*?^};)/m,
  normalizeValue: /const normalizeValue = ([\s\S]*?^};)/m,
  extractOwners: /const extractOwners = ([\s\S]*?^};)/m,
  calculateItemPoints: /const calculateItemPoints = ([\s\S]*?^  };)/m,
  mapItemToExcelRow: /const mapItemToExcelRow = ([\s\S]*?^  };)/m,
  getAssessmentStatus: /const getAssessmentStatus = ([\s\S]*?^  };)/m,
  getPerformanceColor: /const getPerformanceColor = ([\s\S]*?^  };)/m,
  formatDate: /const formatDate = ([\s\S]*?^  };)/m,
  calculateAverageScore: /const calculateAverageScore = ([\s\S]*?^  };)/m,
  calculateMedianScore: /const calculateMedianScore = ([\s\S]*?^  };)/m,
  calculateStandardDeviation: /const calculateStandardDeviation = ([\s\S]*?^  };)/m,
  calculatePercentageAboveThreshold: /const calculatePercentageAboveThreshold = ([\s\S]*?^  };)/m,
  getHeatmapColor: /const getHeatmapColor = ([\s\S]*?^  };)/m,
  calculateHighestScore: /const calculateHighestScore = ([\s\S]*?^  };)/m,
  calculateLowestScore: /const calculateLowestScore = ([\s\S]*?^  };)/m,
  getScoreDistribution: /const getScoreDistribution = ([\s\S]*?^  };)/m,
  identifyStrengthsAndWeaknesses: /const identifyStrengthsAndWeaknesses = ([\s\S]*?^  };)/m,
};

let output = '';
for (const [name, regex] of Object.entries(regexMap)) {
  const match = content.match(regex);
  if (match) {
    output += `export const ${name} = ` + match[1].trim() + '\n\n';
  } else {
    console.error(`Not found: ${name}`);
  }
}

fs.writeFileSync('./client/src/utils/fieldTeamDataHelpers.js', output);
console.log('Helpers written successfully to client/src/utils/fieldTeamDataHelpers.js');
