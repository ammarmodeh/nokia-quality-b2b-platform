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

const ManagementEmailDialog = ({ open, onClose, type = 'dashboard', data = {}, period = '', startDate = null, endDate = null }) => {
  const [tab, setTab] = useState(0);
  const [managementName, setManagementName] = useState('Management');
  const [managementNameAr, setManagementNameAr] = useState('الإدارة الموقرة');

  if (!data) return null;

  const todayDate = new Date().toLocaleDateString();

  const generateEmail = (lang) => {
    if (type === 'dashboard') {
      const { tasks = [], teamsData = [], samplesData = [] } = data;
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
      const npsScore = promotersPercent - detractorsPercent;

      const targetPromoters = 75;
      const targetDetractors = 9;

      const isPromoterAlarm = promotersPercent < targetPromoters && totalSamples > 0;
      const isDetractorAlarm = detractorsPercent > targetDetractors && totalSamples > 0;

      const criticalTasks = tasks.filter(t => t.priority === 'High' || t.priority === 'Medium').length;
      const mostCommonReason = tasks.reduce((acc, t) => {
        if (t.reason) acc[t.reason] = (acc[t.reason] || 0) + 1;
        return acc;
      }, {});
      const topReason = Object.entries(mostCommonReason).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      const evaluatedPercent = ((teamsData.filter(t => t.isEvaluated).length / (teamsData.length || 1)) * 100).toFixed(1);

      const dateStr = period || todayDate;
      const explicitDates = (startDate && endDate)
        ? `(${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})`
        : '';

      if (lang === 'en') {
        const greeting = `Dear ${managementName},`;
        return `Subject: NPS & Workforce Analytics

${greeting}

Please find attached the NPS analysis and high-level operations performance summary for the mentioned period, based on the latest field and workforce data.

Reporting Period: ${dateStr} ${explicitDates}

Net Promoter Score (NPS) Analysis:
- Total Samples Taken: ${totalSamples}
- Promoters: ${promoterCount} (${promotersPercent}%) ${isPromoterAlarm ? '[ALARM: Below Target 75%]' : '[Target Met]'}
- Detractors: ${detractorCount} (${detractorsPercent}%) ${isDetractorAlarm ? '[ALARM: Above Target 9%]' : '[Target Met]'}
- Neutrals: ${neutralCount}
- Overall NPS Score: ${npsScore}

Operational Key Performance Indicators:
- Total Cases Recorded: ${totalTasks}
- High / Medium Priority Issues: ${criticalTasks}
- Dominant Violation Category: ${topReason}
- Total Evaluated Teams: ${teamsData.filter(t => t.isEvaluated).length} / ${teamsData.length} (${evaluatedPercent}%)

Operational Insights:
1. Customer Sentiment: ${isPromoterAlarm || isDetractorAlarm ? 'URGENT: Some NPS targets are currenty not met. Immediate focus on promoter growth is recommended.' : 'Our current NPS trends are within healthy operational targets.'}
2. Workforce Quality: Approximately ${evaluatedPercent}% of teams have undergone quality assessment.
3. Risk Focus: "${topReason}" remains the primary reason for recorded violations.

Best Regards,
Quality Team`;
      } else {
        const greeting = `إلى ${managementNameAr}،`;
        return `الموضوع: ملخص أداء العمليات - تحليلات الجودة والقوى العاملة

${greeting}

نرفق لكم ملخصاً رفيع المستوى للعمليات بناءً على أحدث البيانات الميدانية.

فترة التقرير: ${dateStr} ${explicitDates}

تحليل مؤشر صافي الترويج (NPS):
- إجمالي العينات المأخوذة: ${totalSamples}
- المروجون: ${promoterCount} (${promotersPercent}%) ${isPromoterAlarm ? '[تنبيه: أقل من المستهدف 75%]' : '[تم تحقيق المستهدف]'}
- المنتقدون: ${detractorCount} (${detractorsPercent}%) ${isDetractorAlarm ? '[تنبيه: أعلى من المستهدف 9%]' : '[تم تحقيق المستهدف]'}
- المحايدون: ${neutralCount}
- صافي مؤشر الترويج (NPS): ${npsScore}

مؤشرات الأداء الرئيسية للعمليات:
- إجمالي الحالات المسجلة: ${totalTasks}
- المشكلات ذات الأولوية العالية / المتوسطة: ${criticalTasks}
- فئة المخالفة المهيمنة: ${topReason}
- إجمالي الفرق التي تم تقييمها: ${teamsData.filter(t => t.isEvaluated).length} / ${teamsData.length} (${evaluatedPercent}%)

رؤى تشغيلية:
1. انطباع العملاء: ${isPromoterAlarm || isDetractorAlarm ? 'عاجل: تقييمات NPS حالياً خارج النطاق المستهدف. نوصي بالتركيز الفوري على تحسين رضا العملاء.' : 'اتجاهات NPS الحالية ضمن النطاق التشغيلي المستهدف.'}
2. جودة القوى العاملة: خضع ما يقرب من ${evaluatedPercent}% من الفرق لتقييم الجودة.
3. التركيز على المخاطر: لا يزال (${topReason}) هو السبب الرئيسي للمخالفات المسجلة.

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
      const explicitDates = (startDate && endDate)
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
- Prevention Gap Rate: ${preventionRate}%
- Diagnosis Accuracy: ${diagnosisAccuracy?.rate || 0}%

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
- معدل فجوة الوقاية: ${preventionRate}%
- دقة التشخيص: ${diagnosisAccuracy?.rate || 0}%

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
