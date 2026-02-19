import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Tabs,
  Tab,
  IconButton,
  Divider,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  Close as CloseIcon,
  Language as LanguageIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { TextField } from '@mui/material';
import { toast } from 'sonner';
import { getWeekNumber, getCustomWeekNumber } from '../utils/helpers';
import { filterTasksByWeek, aggregateSamples } from '../utils/dateFilterHelpers';
import { startOfWeek, subWeeks, format } from 'date-fns';

const ManagementEmailDialog = ({ open, onClose, type = 'dashboard', data = {}, period = '', startDate = null, endDate = null, settings = {} }) => {
  const [tab, setTab] = useState(0);
  const [managementName, setManagementName] = useState('Management');
  const [managementNameAr, setManagementNameAr] = useState('الإدارة الموقرة');

  if (!data) return null;

  const todayDate = new Date().toLocaleDateString();

  const generateEmail = (lang) => {
    if (type === 'dashboard') {
      const { tasks = [], teamsData = [], samplesData = [], allTasks = [] } = data;
      const totalTasks = tasks.length;

      const detractorCount = tasks.filter(t => t.evaluationScore >= 1 && t.evaluationScore <= 6).length;
      const neutralCount = tasks.filter(t => t.evaluationScore >= 7 && t.evaluationScore <= 8).length;

      // Use passed totalSamples (which respects filters) or fallback to summing all samples
      const totalSamples = data.totalSamples !== undefined
        ? data.totalSamples
        : samplesData.reduce((sum, s) => sum + (s.sampleSize || 0), 0);

      const promoterCount = Math.max(0, totalSamples - (detractorCount + neutralCount));
      const promotersPercent = totalSamples > 0 ? Math.round((promoterCount / totalSamples) * 100) : 0;
      const detractorsPercent = totalSamples > 0 ? Math.round((detractorCount / totalSamples) * 100) : 0;
      const neutralsPercent = totalSamples > 0 ? Math.round((neutralCount / totalSamples) * 100) : 0;
      const npsScore = promotersPercent - detractorsPercent;

      const targetPromoters = 75;
      const targetDetractors = 8;
      const npsTarget = 66;

      const isPromoterAlarm = promotersPercent < targetPromoters && totalSamples > 0;
      const isDetractorAlarm = detractorsPercent > targetDetractors && totalSamples > 0;
      const isNPSAlarm = npsScore < npsTarget && totalSamples > 0;

      const criticalTasks = tasks.filter(t => t.priority === 'High' || t.priority === 'Medium').length;
      const mostCommonReason = tasks.reduce((acc, t) => {
        if (t.reason) acc[t.reason] = (acc[t.reason] || 0) + 1;
        return acc;
      }, {});
      const topReason = Object.entries(mostCommonReason).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      const evaluatedPercent = Math.round((teamsData.filter(t => t.isEvaluated).length / (teamsData.length || 1)) * 100);

      const dateStr = period || todayDate;

      // Check if period string already contains year/dates to avoid redundancy
      const hasDates = /\d{4}|\/|[A-Z][a-z]{2}\s\d+/.test(dateStr);
      const explicitDates = (startDate && endDate && !hasDates)
        ? `(${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})`
        : '';

      // Calculate included weeks if we have a range and it's likely a month/period view
      let weeksList = '';
      if (startDate && endDate && (period.includes('Month') || !period.includes('Wk'))) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const uniqueWeeks = new Set();

        // Iterate through days to find all unique weeks
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const { week } = getWeekNumber(d);
          uniqueWeeks.add(String(week).padStart(2, '0'));
        }
        weeksList = Array.from(uniqueWeeks).sort().join(', ');
      }

      // --- 4-Week Trend Analysis ---
      let trendSection = '';
      if (allTasks.length > 0) { // Only if we have the full dataset
        const getStatsForWeek = (targetDate) => {
          const year = targetDate.getFullYear();
          const weekNum = getCustomWeekNumber(targetDate, year, settings);

          const weeklyTasks = filterTasksByWeek(allTasks, year, weekNum, settings);

          // Should use aggregateSamples for this week to be accurate on total samples
          // We can construct a "value" object for aggregateSamples('week', ...)
          const weekStart = startOfWeek(targetDate, { weekStartsOn: settings.weekStartDay || 0 });
          const weeklySamples = aggregateSamples(samplesData, 'week', {
            weekNumber: weekNum,
            year: year,
            startDate: weekStart
          }, settings);

          const wDet = weeklyTasks.filter(t => t.evaluationScore >= 1 && t.evaluationScore <= 6).length;
          const wNeu = weeklyTasks.filter(t => t.evaluationScore >= 7 && t.evaluationScore <= 8).length;
          const wProm = Math.max(0, weeklySamples - (wDet + wNeu));

          const pPct = weeklySamples > 0 ? Math.round((wProm / weeklySamples) * 100) : 0;
          const dPct = weeklySamples > 0 ? Math.round((wDet / weeklySamples) * 100) : 0;
          const nPct = weeklySamples > 0 ? Math.round((wNeu / weeklySamples) * 100) : 0;
          const nps = pPct - dPct;

          // Calculate Response Rate (Unique Teams Evaluated / Total Teams)
          const uniqueTeamsEvaluated = new Set(weeklyTasks.map(t => t.teamName)).size;
          const totalTeamsCount = teamsData.length > 0 ? teamsData.length : 1;
          const respRate = Math.round((uniqueTeamsEvaluated / totalTeamsCount) * 100);

          return {
            weekNum,
            year,
            nps,
            pPct,
            dPct,
            nPct,
            samples: weeklySamples,
            respRate
          };
        };

        // Determine anchor date. Use endDate if available, else today.
        const anchor = endDate ? new Date(endDate) : new Date();
        const statsHistory = [];

        // Collect stats for last 4 weeks (Anchor, -1, -2, -3)
        for (let i = 0; i < 4; i++) {
          const d = subWeeks(anchor, i);
          statsHistory.push(getStatsForWeek(d));
        }

        const buildRow = (s, prev) => {
          const npsDiff = prev ? s.nps - prev.nps : 0;
          const promDiff = prev ? s.pPct - prev.pPct : 0;
          const detDiff = prev ? s.dPct - prev.dPct : 0;
          const pasDiff = prev ? s.nPct - prev.nPct : 0;

          const npsSign = npsDiff > 0 ? '+' : '';
          const promSign = promDiff > 0 ? '+' : '';
          const detSign = detDiff > 0 ? '+' : '';
          const pasSign = pasDiff > 0 ? '+' : '';

          // User requested format:
          // Wk-04 (2026)
          // 63 75% (+15) Met Target 83% (+13) 8% (-2) 10% (-10)

          // Replicating the columns visually in text
          // Week | NPS | Resp | Target | Prom | Det | Pass
          const wkLabel = `Wk-${String(s.weekNum).padStart(2, '0')} (${s.year})`;
          const npsStr = `${s.nps}`;
          // For delta, user put it in a separate visual column or next to it. 
          // "63 ... (+15)"

          // To make it look like the requested table behavior:
          // Wk-XX | NPS: 63 (+15) | Resp: 75% | Prom: 83% (+13) | Det: 8% (-2) | Pas: 10% (-10)

          // Logic for "Met Target" (NPS Target)
          const npsTargetStatus = s.nps >= npsTarget ? (lang === 'en' ? 'Met Target' : 'حقق المستهدف') : (lang === 'en' ? 'Below Target' : 'أقل من المستهدف');

          if (lang === 'en') {
            return `${wkLabel}\n` +
              `NPS: ${npsStr} (${npsSign}${npsDiff !== 0 ? npsDiff : 0}) | ${npsTargetStatus}\n` +
              `Response: ${s.respRate}% | Promoters: ${s.pPct}% (${promSign}${promDiff}) | Detractors: ${s.dPct}% (${detSign}${detDiff}) | Passives: ${s.nPct}% (${pasSign}${pasDiff})\n`;
          } else {
            return `${wkLabel}\n` +
              `NPS: ${npsStr} (${npsSign}${npsDiff}) | ${npsTargetStatus}\n` +
              `الاستجابة: ${s.respRate}% | مروجون: ${s.pPct}% (${promSign}${promDiff}) | منتقدون: ${s.dPct}% (${detSign}${detDiff}) | محايدون: ${s.nPct}% (${pasSign}${pasDiff})\n`;
          }
        };

        // Note: statsHistory is [Current, -1, -2, -3]. 
        // We need to compare Current with -1, -1 with -2, etc.
        // But for the report, we iterate 0..3. The "prev" for 0 is 1.

        // Wait, to calculate delta for week X, I need week X-1.
        // So I actually need 5 weeks of data to compute deltas for the 4 displayed weeks.
        const prevWeekStats = getStatsForWeek(subWeeks(anchor, 4));
        statsHistory.push(prevWeekStats);

        if (lang === 'en') {
          trendSection = `\nMonthly Performance Trend (Last 4 Weeks):\n----------------------------------------\n`;
          for (let i = 0; i < 4; i++) {
            trendSection += buildRow(statsHistory[i], statsHistory[i + 1]) + '\n';
          }
        } else {
          trendSection = `\nاتجاه الأداء الشهري (آخر 4 أسابيع):\n----------------------------------------\n`;
          for (let i = 0; i < 4; i++) {
            trendSection += buildRow(statsHistory[i], statsHistory[i + 1]) + '\n';
          }
        }
      }

      // --- Detailed Aggregation Helper ---
      const getDetailedSummary = (taskList, lang) => {
        if (!taskList || taskList.length === 0) return lang === 'en' ? '  - No data available for this section.' : '  - لا توجد بيانات متوفرة لهذا القسم.';

        const total = taskList.length;
        const stats = { byOwner: {}, byReason: {}, bySubReason: {}, byRootCause: {}, itnYes: 0, subYes: 0 };

        const addToStats = (obj, value) => {
          if (!value) return;
          const items = Array.isArray(value) ? value : String(value).split(/,\s*/);
          items.forEach(item => {
            const trimmed = item.trim();
            if (trimmed && trimmed !== 'N/A') {
              obj[trimmed] = (obj[trimmed] || 0) + 1;
            }
          });
        };

        taskList.forEach(t => {
          const ownerValue = t.responsible || t.assignedTo?.name || (t.assignedTo && typeof t.assignedTo === 'string' ? t.assignedTo : 'Unassigned');
          addToStats(stats.byOwner, ownerValue);
          addToStats(stats.byReason, t.reason);
          addToStats(stats.bySubReason, t.subReason);
          addToStats(stats.byRootCause, t.rootCause);

          if (((Array.isArray(t.itnRelated) && t.itnRelated.includes('Yes')) || t.itnRelated === 'Yes' || t.itnRelated === true)) stats.itnYes++;
          if (((Array.isArray(t.relatedToSubscription) && t.relatedToSubscription.includes('Yes')) || t.relatedToSubscription === 'Yes' || t.relatedToSubscription === true)) stats.subYes++;
        });

        const getAllFormatted = (obj) => {
          const entries = Object.entries(obj);
          if (entries.length === 0) return 'N/A';
          const categoryTotal = entries.reduce((sum, [, count]) => sum + count, 0);

          // Calculate initial percentages and remainders (Largest Remainder Method)
          const items = entries
            .sort((a, b) => b[1] - a[1]) // Sort primarily by count descending
            .map(([label, count]) => {
              const exact = (count / categoryTotal) * 100;
              return {
                label,
                count,
                floor: Math.floor(exact),
                remainder: exact - Math.floor(exact)
              };
            });

          const currentSum = items.reduce((sum, item) => sum + item.floor, 0);
          let difference = 100 - currentSum;

          // Distribute the difference to items with the largest remainders
          if (difference > 0) {
            // Sort a copy by remainder descending to find which items to increment
            const sortedByRemainder = [...items].sort((a, b) => b.remainder - a.remainder || b.count - a.count);
            for (let i = 0; i < difference; i++) {
              sortedByRemainder[i % sortedByRemainder.length].floor += 1;
            }
          }

          return items
            .map(item => `${item.label} (${item.count} - ${item.floor}%)`)
            .join(', ');
        };

        const itnPct = Math.round((stats.itnYes / total) * 100);
        const subPct = Math.round((stats.subYes / total) * 100);

        if (lang === 'en') {
          return `  - Reasons: ${getAllFormatted(stats.byReason)}\n` +
            `  - Sub-Reasons: ${getAllFormatted(stats.bySubReason)}\n` +
            `  - Root Causes: ${getAllFormatted(stats.byRootCause)}\n` +
            `  - Owners: ${getAllFormatted(stats.byOwner)}\n` +
            `  - ITN Related (Tasks): ${stats.itnYes} (${itnPct}%) | Subscription Related (Tasks): ${stats.subYes} (${subPct}%)`;
        } else {
          return `  - الأسباب: ${getAllFormatted(stats.byReason)}\n` +
            `  - الأسباب الفرعية: ${getAllFormatted(stats.bySubReason)}\n` +
            `  - الأسباب الجذرية: ${getAllFormatted(stats.byRootCause)}\n` +
            `  - المسؤولون: ${getAllFormatted(stats.byOwner)}\n` +
            `  - متعلق بـ ITN (المهام): ${stats.itnYes} (${itnPct}%) | متعلق بالاشتراك (المهام): ${stats.subYes} (${subPct}%)`;
        }
      };

      const detractorsSummary = getDetailedSummary(tasks.filter(t => t.evaluationScore >= 1 && t.evaluationScore <= 6), lang);
      const neutralsSummary = getDetailedSummary(tasks.filter(t => t.evaluationScore >= 7 && t.evaluationScore <= 8), lang);
      const overallSummary = getDetailedSummary(tasks, lang);

      if (lang === 'en') {
        const greeting = `Dear ${managementName},`;
        return `Subject: NPS & Workforce Analytics Report

${greeting}

Please find attached the NPS analysis and high-level operations performance summary for the mentioned period, based on the latest field and workforce data.

Reporting Period: ${dateStr} ${explicitDates}
${weeksList ? `Weeks Included: ${weeksList}` : ''}

Net Promoter Score (NPS) Analysis:
- Total Samples Taken: ${totalSamples}
- Promoters: ${promoterCount} (${promotersPercent}%) ${isPromoterAlarm ? `[ALARM: Below Target ${targetPromoters}%]` : `[Target Met: ≥${targetPromoters}%]`}
- Detractors: ${detractorCount} (${detractorsPercent}%) ${isDetractorAlarm ? `[ALARM: Above Target ${targetDetractors}%]` : `[Target Met: ≤${targetDetractors}%]`}
- Neutrals: ${neutralCount}
- Overall NPS Score: ${npsScore} ${isNPSAlarm ? `[ALARM: Below Target ${npsTarget}]` : `[Target Met: ≥${npsTarget}]`}

1. Detractors Analysis:
${detractorsSummary}

2. Neutrals Analysis:
${neutralsSummary}

3. Overall Analysis (All Feedback):
${overallSummary}
${trendSection}
Operational Key Performance Indicators:
- Total Cases Recorded: ${totalTasks}
- High / Medium Priority Issues: ${criticalTasks}
- Dominant Violation Category: ${topReason}
- Total Evaluated Teams: ${teamsData.filter(t => t.isEvaluated).length} / ${teamsData.length} (${evaluatedPercent}%)

Operational Insights:
1. Customer Sentiment: ${isPromoterAlarm || isDetractorAlarm || isNPSAlarm ? 'URGENT: Some NPS targets are currenty not met. Immediate focus on quality improvement is recommended.' : 'Our current NPS trends are within healthy operational targets.'}
2. Workforce Quality: Approximately ${evaluatedPercent}% of teams have undergone quality assessment.
3. Risk Focus: "${topReason}" remains the primary reason for recorded violations.

Strategic Action Plan:
1. Immediate Focus: Initiate a targeted review of "${topReason}" cases to identify and mitigate recurring root causes.
2. Training Reinforcement: Schedule refresher training sessions specifically addressing the skills gaps related to "${topReason}".
3. Process Optimization: Review current standard operating procedures (SOPs) to ensure they adequately cover scenarios leading to "${topReason}".

Best Regards,
Quality Team`;
      } else {
        const greeting = `إلى ${managementNameAr}،`;
        return `الموضوع: ملخص أداء العمليات - تحليلات الجودة والقوى العاملة

${greeting}

نرفق لكم ملخصاً رفيع المستوى للعمليات بناءً على أحدث البيانات الميدانية.

فترة التقرير: ${dateStr} ${explicitDates}
${weeksList ? `الأسابيع المشمولة: ${weeksList}` : ''}

تحليل مؤشر صافي الترويج (NPS):
- إجمالي العينات المأخوذة: ${totalSamples}
- المروجون: ${promoterCount} (${promotersPercent}%) ${isPromoterAlarm ? `[تنبيه: أقل من المستهدف ${targetPromoters}%]` : `[تم تحقيق المستهدف: ≥${targetPromoters}%]`}
- المنتقدون: ${detractorCount} (${detractorsPercent}%) ${isDetractorAlarm ? `[تنبيه: أعلى من المستهدف ${targetDetractors}%]` : `[تم تحقيق المستهدف: ≤${targetDetractors}%]`}
- المحايدون: ${neutralCount}
- صافي مؤشر الترويج (NPS): ${npsScore} ${isNPSAlarm ? `[تنبيه: أقل من المستهدف ${npsTarget}]` : `[تم تحقيق المستهدف: ≥${npsTarget}]`}

1. تحليل المنتقدين (Detractors):
${detractorsSummary}

2. تحليل المحايدين (Neutrals):
${neutralsSummary}

3. التحليل الشامل (Overall):
${overallSummary}
${trendSection}
مؤشرات الأداء الرئيسية للعمليات:
- إجمالي الحالات المسجلة: ${totalTasks}
- المشكلات ذات الأولوية العالية / المتوسطة: ${criticalTasks}
- فئة المخالفة المهيمنة: ${topReason}
- إجمالي الفرق التي تم تقييمها: ${teamsData.filter(t => t.isEvaluated).length} / ${teamsData.length} (${evaluatedPercent}%)

رؤى تشغيلية:
1. انطباع العملاء: ${isPromoterAlarm || isDetractorAlarm || isNPSAlarm ? 'عاجل: تقييمات NPS حالياً خارج النطاق المستهدف. نوصي بالتركيز الفوري على تحسين جودة العمل.' : 'اتجاهات NPS الحالية ضمن النطاق التشغيلي المستهدف.'}
2. جودة القوى العاملة: خضع ما يقرب من ${evaluatedPercent}% من الفرق لتقييم الجودة.
3. التركيز على المخاطر: لا يزال (${topReason}) هو السبب الرئيسي للمخالفات المسجلة.

خطة العمل الاستراتيجية:
1. التركيز الفوري: البدء بمراجعة مستهدفة لحالات "${topReason}" لتحديد الأسباب الجذرية المتكررة ومعالجتها.
2. تعزيز التدريب: جدولة جلسات تدريب تنشيطية تتناول بشكل خاص الفجوات المهارية المتعلقة بـ "${topReason}".
3. تحسين العمليات: مراجعة إجراءات التشغيل القياسية الحالية (SOPs) لضمان تغطيتها بشكل كافٍ للسيناريوهات المؤدية إلى "${topReason}".

مع خالص التقدير،
فريق العمليات`;
      }
    } else {
      const {
        totalCriticalTasks = 0,
        reportedOverlapCount = 0,
        preventionRate = 0,
        diagnosisAccuracy = {},
        processEfficiency = {},
        reasonStats = {},
        companyStats = {},
      } = data;

      const topReasons = Object.entries(reasonStats || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      const topCompanies = Object.entries(companyStats || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2);

      const dateStr = period || todayDate;
      // Check if period string already contains year/dates to avoid redundancy
      const hasDates = /\d{4}|\/|[A-Z][a-z]{2}\s\d+/.test(dateStr);
      const explicitDates = (startDate && endDate && !hasDates)
        ? `(${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})`
        : '';

      if (lang === 'en') {
        const greeting = `Dear ${managementName},`;
        return `Subject: Weekly Quality & Issue Prevention Performance Report

${greeting}

Please find the latest performance and issue prevention insights based on our analytics dashboard.

Reporting Period: ${dateStr} ${explicitDates}

Executive Summary:
- Total Tasks (Detractors / Neutrals): ${totalCriticalTasks}
- Failed Preventions (Reported issues that escalated): ${reportedOverlapCount}
- Prevention Gap Rate: ${Math.round(preventionRate)}%
- Diagnosis Accuracy: ${Math.round(diagnosisAccuracy?.rate || 0)}%

Process Efficiency (Aging Analysis):
- Avg. Supervisor Dispatch Speed: ${processEfficiency?.avgDispatchTime || 0} days
- Avg. Field Resolution Speed: ${processEfficiency?.avgResolutionTime || 0} days
- Total Lifecycle duration: ${processEfficiency?.avgLifecycleTime || 0} days

Top Root Causes for Escalation:
${topReasons.map(([reason, count]) => `- ${reason}: ${count} cases`).join('\n')}

Actionable Insights:
1. Efficiency Bottleneck: The current dispatch/resolution speed of ${processEfficiency?.avgLifecycleTime} days is a primary driver for customer dissatisfaction.
2. Vendor Performance: ${topCompanies.map(([company]) => company).join(' and ')} are contributing significantly to failed preventions.
3. Recommendation: Implement a 48-hour mandatory resolution protocol for high-risk reported cases to prevent further escalation.

Best Regards,
Quality Assurance Team`;
      } else {
        const greeting = `إلى ${managementNameAr}،`;
        return `الموضوع: تقرير أداء الجودة ومنع تفاقم المشكلات

${greeting}

نرفق لكم أحدث نتائج تحليل الأداء ومنع تفاقم المشكلات بناءً على لوحة البيانات الخاصة بنا.

فترة التقرير: ${dateStr} ${explicitDates}

ملخص تنفيذي:
- إجمالي المهام الحرجة (العملاء غير الراضين / المحايدين): ${totalCriticalTasks}
- فشل منع التصعيد (مشاكل تم الإبلاغ عنها وتفاقمت): ${reportedOverlapCount}
- معدل فجوة الوقاية: ${Math.round(preventionRate)}%
- دقة التشخيص: ${Math.round(diagnosisAccuracy?.rate || 0)}%

كفاءة العمليات (تحليل التأخير):
- متوسط سرعة توجيه المشرفين: ${processEfficiency?.avgDispatchTime || 0} أيام
- متوسط سرعة الحل الميداني: ${processEfficiency?.avgResolutionTime || 0} أيام
- إجمالي دورة حياة البلاغ: ${processEfficiency?.avgLifecycleTime || 0} أيام

أبرز الأسباب الجذرية للتصعيد:
${topReasons.map(([reason, count]) => `- ${reason}: ${count} حالة`).join('\n')}

توصيات العمل:
1. عنق الزجاجة في الكفاءة: سرعة التوجيه / الحل الحالية (${processEfficiency?.avgLifecycleTime} أيام) هي المحرك الرئيسي لعدم رضا العملاء.
2. أداء الموردين: تساهم شركات (${topCompanies.map(([company]) => company).join(' و ')}) بشكل كبير في حالات فشل منع التصعيد.
3. التوصية: تطبيق بروتوكول حل إلزامي خلال 48 ساعة للحالات المبلغ عنها عالية المخاطر لمنع تدهور تقييم NPS.

مع خالص التقدير،
فريق ضمان الجودة`;
      }
    }
  };

  const currentEmail = tab === 0 ? generateEmail('en') : generateEmail('ar');

  const handleCopy = () => {
    navigator.clipboard.writeText(currentEmail);
    toast.success('Email text copied to clipboard!');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          color: '#fff',
          borderRadius: 3,
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <EmailIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight="bold">Generate Management Report</Typography>
        </Stack>
        <IconButton onClick={onClose} sx={{ color: 'grey.500' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{
            borderBottom: '1px solid #333',
            '& .MuiTab-root': { color: 'grey.500' },
            '& .Mui-selected': { color: 'primary.main' },
          }}
        >
          <Tab icon={<LanguageIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="English" />
          <Tab icon={<LanguageIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Arabic (العربية)" />
        </Tabs>

        <Box sx={{ px: 3, pt: 2 }}>
          <TextField
            fullWidth
            size="small"
            label={tab === 0 ? "Recipient Management Name" : "اسم الإدارة المستلمة"}
            value={tab === 0 ? managementName : managementNameAr}
            onChange={(e) => tab === 0 ? setManagementName(e.target.value) : setManagementNameAr(e.target.value)}
            InputProps={{
              startAdornment: <PersonIcon sx={{ color: 'primary.main', mr: 1, fontSize: 20 }} />,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: '#333' },
                '&:hover fieldset': { borderColor: 'primary.main' },
              },
              '& .MuiInputLabel-root': { color: 'grey.500' },
              mb: 2,
            }}
          />
        </Box>

        <Box sx={{ p: 3, pt: 0 }}>
          <Box
            component="pre"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              color: 'grey.300',
              bgcolor: '#262626',
              p: 3,
              borderRadius: 2,
              border: '1px solid #333',
              direction: tab === 1 ? 'rtl' : 'ltr',
              lineHeight: 1.6,
            }}
          >
            {currentEmail}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #333', p: 2, justifyContent: 'space-between' }}>
        <Typography variant="caption" color="grey.500" sx={{ ml: 1 }}>
          * Stats are automatically calculated based on current dashboard data.
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button onClick={onClose} sx={{ color: 'grey.400' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<CopyIcon />}
            onClick={handleCopy}
            sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
          >
            Copy to Clipboard
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default ManagementEmailDialog;
