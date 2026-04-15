export const splitValues = (val) => {
  if (val === undefined || val === null || val === "") return [];
  if (Array.isArray(val)) {
    return val.flatMap(v => {
      if (typeof v === 'string') return v.split(/[,;|]/).map(s => s.trim());
      return v;
    });
  }
  return String(val).split(/[,;|]/).map(s => s.trim());
};

export const normalizeValue = (name) => {
  if (!name || typeof name !== 'string') return 'Not specified';
  let n = name.trim();
  if (!n || n.toUpperCase() === 'N/A' || n.toUpperCase() === 'EMPTY' || n.toUpperCase() === 'NIL' || n.toUpperCase() === 'NOT SPECIFIED' || n.toUpperCase() === 'OTHER' || n.toUpperCase() === 'OTHERS') return 'Not specified';

  // Check for prioritized common values but keep their casing or standard format
  const uppercased = n.toUpperCase();
  if (uppercased === 'REACH') return 'Reach';
  if (uppercased === 'OJO') return 'OJO';
  if (uppercased === 'GAM') return 'GAM';
  if (uppercased === 'CUSTOMER') return 'Customer';

  return n;
};

export const extractOwners = (task) => {
  if (!task) return [];

  // 1. Check responsible array/string (Primary)
  const resp = splitValues(task.responsible);
  if (resp.length > 0 && resp.some(v => v && v !== 'Empty')) {
    return resp.map(normalizeValue);
  }

  return []; // No fallback to assignedTo; globalAnalytics will default to 'Not specified'
};

export const calculateItemPoints = (item, type = 'task') => {
    let points = 0;

    // 1. Dynamic Scoring Rules
    if (settings?.scoringRules && Array.isArray(settings.scoringRules)) {
      const evaluateRule = (item, rule) => {
        if (!rule.isActive) return 0;
        let itemValue = item[rule.field];
        const ruleValue = rule.value;

        const compare = (a, b, op) => {
          switch (op) {
            case 'equals': return a == b;
            case 'notEquals': return a != b;
            case 'greaterThan': return Number(a) > Number(b);
            case 'lessThan': return Number(a) < Number(b);
            case 'contains': return String(a).toLowerCase().includes(String(b).toLowerCase());
            default: return false;
          }
        };

        return compare(itemValue, ruleValue, rule.operator) ? Number(rule.points) : 0;
      };

      settings.scoringRules.filter(r => r.type === type).forEach(rule => {
        points += evaluateRule(item, rule);
      });
    }

    // 2. Manual Scoring Keys
    if (settings?.scoringKeys && Array.isArray(settings.scoringKeys) && Array.isArray(item.scoringKeys)) {
      item.scoringKeys.forEach(keyLabel => {
        const keyConfig = settings.scoringKeys.find(k =>
          k.label === keyLabel &&
          (k.targetForm === (type === 'task' ? 'Task' : 'Issue') || k.targetForm === 'Both')
        );
        if (keyConfig) points += Number(keyConfig.points);
      });
    }

    return points;
  };

export const mapItemToExcelRow = (item, type) => {
    let displayScore = 'Not Evaluated';
    let satisfaction = 'N/A';
    let score = item.evaluationScore || 0;
    if (score > 0) {
      const isSmallScale = score <= 10;
      displayScore = `${score}${isSmallScale ? '/10' : '%'}`;
      const normalized = isSmallScale ? score * 10 : score;
      if (normalized <= 60) satisfaction = 'Detractor';
      else if (normalized <= 80) satisfaction = 'Neutral';
      else satisfaction = 'Promoter';
    }

    return {
      'Type': type === 'task' ? 'NPS Ticket' : 'Customer Issue',
      'SLID': item.slid,
      'Customer': item.customerName || 'N/A',
      'Status': item.validationStatus || (item.solved === 'yes' ? 'Solved' : 'Open'),

      'Governorate': item.governorate || '-',
      'District': item.district || '-',

      'Score': displayScore,
      'Satisfaction': satisfaction,
      'Points': calculateItemPoints(item, type),

      'Customer Feedback': (type === 'task' ? (item.customerFeedback || '-') : (item.reporterNote || '-')),
      'Our Actions/Resolution': (type === 'issue' ? (item.resolutionDetails || item.assigneeNote || '-') : '-'),

      // Dynamic Interleaved Columns
      ...(() => {
        const reasons = Array.isArray(item.reason) ? item.reason : (item.reason ? [item.reason] : []);
        const subReasons = Array.isArray(item.subReason) ? item.subReason : (item.subReason ? [item.subReason] : []);
        const rootCauses = Array.isArray(item.rootCause) ? item.rootCause : (item.rootCause ? [item.rootCause] : []);
        const owners = extractOwners(item);

        const maxLen = Math.max(reasons.length, subReasons.length, rootCauses.length, owners.length, 1);
        const dynamicCols = {};

        for (let i = 0; i < maxLen; i++) {
          dynamicCols[`Reason ${i + 1}`] = reasons[i] || 'Not specified';
          dynamicCols[`Sub-Reason ${i + 1}`] = subReasons[i] || 'Not specified';
          dynamicCols[`Root Cause ${i + 1}`] = rootCauses[i] || 'Not specified';
          dynamicCols[`Owner ${i + 1}`] = owners[i] || 'Not specified';
        }
        return dynamicCols;
      })(),


      'GAIA Check': item.gaiaCheck || 'N/A',
      'GAIA Content': item.gaiaContent || '-',
      'Latest QOps Type': item.latestGaia?.transactionType || 'N/A',
      'Latest QOps State': item.latestGaia?.transactionState || 'N/A',
      'Latest QOps Reason': item.latestGaia?.unfReasonCode || 'N/A',
      'Latest QOps Note': item.latestGaia?.note || 'N/A',
      'QOps Transaction History': item.tickets?.map((t, idx) =>
        `[${idx + 1}] ${new Date(t.eventDate || t.createdAt).toLocaleDateString()} | ${t.transactionType || t.mainCategory} (${t.transactionState}) -> Note: ${t.note || 'No note'}`
      ).join('\n') || 'No logs',
      'Action taken by assigned user': item.subTasks?.map((sub, index) =>
        `Step ${index + 1}: ${sub.title} - ${sub.note}`
      ).join('\n') || '',
      'ITN Related': ((Array.isArray(item.itnRelated) && item.itnRelated.includes('Yes')) || item.itnRelated === 'Yes' || item.itnRelated === true) ? 'Yes' : 'No',
      'Subscription Related': ((Array.isArray(item.relatedToSubscription) && item.relatedToSubscription.includes('Yes')) || item.relatedToSubscription === 'Yes' || item.relatedToSubscription === true) ? 'Yes' : 'No',

      'Team Name': item.teamName,
      'Technician': item.technician || item.primaryTechnician || '-',
      // 'Team Company': item.teamCompany || '-',

      'Date': new Date(item.interviewDate || item.date || item.createdAt).toLocaleDateString(),
      'Request Date': item.contractDate ? new Date(item.contractDate).toLocaleDateString() : '-',
      'UN Date': item.unDate ? new Date(item.unDate).toLocaleDateString() : '-',
      'FE Date': item.feDate ? new Date(item.feDate).toLocaleDateString() : (item.appDate ? new Date(item.appDate).toLocaleDateString() : '-'),
      'In Date': item.inDate ? new Date(item.inDate).toLocaleDateString() : '-',
      'Close Date': item.closeDate ? new Date(item.closeDate).toLocaleDateString() : '-'
    };
  };

export const getAssessmentStatus = (score, type = 'general') => {
    const thresholds = settings?.thresholds || { pass: 85, average: 70, fail: 50, quizPassScore: 70, labPassScore: 75 };

    if (type === 'practical') {
      // 1-5 Scale
      if (score >= 4.5) return { label: "Excellent", color: "#2e7d32" };
      if (score >= 3.5) return { label: "Good", color: "#66bb6a" };
      if (score >= 2.5) return { label: "Satisfactory", color: "#ffa726" };
      if (score >= 1.5) return { label: "Needs Improvement", color: "#ff9800" };
      return { label: "Poor", color: "#d32f2f" };
    }

    let passThreshold = thresholds.pass;
    if (type === 'quiz') passThreshold = thresholds.quizPassScore || 70;
    if (type === 'lab') passThreshold = thresholds.labPassScore || 75;

    if (score >= passThreshold) return { label: "Excellent", color: "#2e7d32" };
    if (score >= thresholds.average) return { label: "Pass (Minor Comments)", color: "#66bb6a" };
    if (score >= thresholds.fail) return { label: "Pass (With Comments)", color: "#ffa726" };
    return { label: "Fail", color: "#d32f2f" };
  };

export const getPerformanceColor = (score, type = 'general') => {
    return getAssessmentStatus(score, type).color;
  };

export const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

export const calculateAverageScore = (results) => {
    if (results.length === 0) return 0;
    const totalScore = results.reduce((sum, result) => {
      return sum + (result.overallScore || result.percentage || 0);
    }, 0);
    return totalScore / results.length;
  };

export const calculateMedianScore = (results) => {
    const scores = results.map((result) => result.overallScore || result.percentage || 0).sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    return scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
  };

export const calculateStandardDeviation = (results) => {
    const average = calculateAverageScore(results);
    const variance = results.reduce((sum, result) => {
      const score = result.overallScore || result.percentage || 0;
      return sum + Math.pow(score - average, 2);
    }, 0) / results.length;
    return Math.sqrt(variance);
  };

export const calculatePercentageAboveThreshold = (data, threshold) => {
    if (!data || data.length === 0) return 0;
    const above = data.filter(item => (item.percentage || item.overallScore || item.totalScore || 0) >= threshold);
    return (above.length / data.length) * 100;
  };

export const getHeatmapColor = (value, min = 0, max = 100, type = 'blue') => {
    const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const colors = {
      green: `rgba(16, 185, 129, ${percentage * 0.4 + 0.05})`,
      blue: `rgba(59, 130, 246, ${percentage * 0.4 + 0.05})`,
      orange: `rgba(245, 158, 11, ${percentage * 0.4 + 0.05})`,
      red: `rgba(239, 68, 68, ${percentage * 0.4 + 0.05})`,
      purple: `rgba(139, 92, 246, ${percentage * 0.4 + 0.05})`
    };
    return colors[type] || colors.blue;
  };

export const calculateHighestScore = (results) => {
    if (results.length === 0) return 0;
    return Math.max(...results.map(result => result.overallScore || result.percentage || 0));
  };

export const calculateLowestScore = (results) => {
    if (results.length === 0) return 0;
    return Math.min(...results.map(result => result.overallScore || result.percentage || 0));
  };

export const getScoreDistribution = (results) => {
    const distribution = {
      '0-49': 0,
      '50-74': 0,
      '75-89': 0,
      '90-100': 0
    };

    results.forEach(result => {
      const score = result.overallScore || result.percentage || 0;
      if (score >= 90) {
        distribution['90-100']++;
      } else if (score >= 75) {
        distribution['75-89']++;
      } else if (score >= 50) {
        distribution['50-74']++;
      } else {
        distribution['0-49']++;
      }
    });

    return distribution;
  };

export const identifyStrengthsAndWeaknesses = () => {
    const categories = {};

    // Aggregate from quizzes
    quizResults.forEach(res => {
      res.userAnswers?.forEach(ans => {
        if (!ans.category) return;
        if (!categories[ans.category]) categories[ans.category] = { total: 0, count: 0, type: 'theoretical' };
        categories[ans.category].total += (ans.score || 0);
        categories[ans.category].count += 2; // Each MCQ is 2 points
      });
    });

    // Aggregate from practicals
    jobAssessments.forEach(res => {
      res.checkpoints?.forEach(cp => {
        if (!cp.category) return;
        if (!categories[cp.category]) categories[cp.category] = { total: 0, count: 0, type: 'practical' };
        categories[cp.category].total += (cp.score || 0);
        categories[cp.category].count += 5; // practical scale 0-5
      });
    });

    const analysis = Object.keys(categories).map(cat => ({
      name: cat,
      score: (categories[cat].total / categories[cat].count) * 100,
      type: categories[cat].type
    })).sort((a, b) => b.score - a.score);

    return {
      strengths: analysis.slice(0, 3).filter(a => a.score >= 75),
      weaknesses: analysis.slice(-3).reverse().filter(a => a.score < 60)
    };
  };

