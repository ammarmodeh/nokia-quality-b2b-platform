import { useEffect } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Button, Typography, Alert } from '@mui/material';

const QuizResults = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Get results from either location state or sessionStorage
  const results = state?.results || JSON.parse(sessionStorage.getItem('quizResults'));

  // Check if coming from Quiz with valid results data
  useEffect(() => {
    // If no results data, redirect to login
    if (!results) {
      navigate('/fieldteam-login', { replace: true });
    }

    // Clear the storage as the quiz is complete
    sessionStorage.removeItem('fieldTeamAuth');
    sessionStorage.removeItem('quizResults');
  }, [navigate, results]);

  if (!results) {
    return <Navigate to="/fieldteam-login" replace />;
  }

  const { teamName, correctAnswers, totalQuestions, userAnswers, questions } = results;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  const qrData = [
    `الفريق: ${teamName}`,
    `النتيجة: ${correctAnswers}/${totalQuestions} (${percentage}%)`,
    ...questions.map((q, index) => {
      const isCorrect = userAnswers[index]?.isCorrect ? "✅" : "❌";
      return `${index + 1} - ${isCorrect}`;
    }),
  ].join("\n");

  const maxQRLength = 650;
  const finalQrData = qrData.length > maxQRLength ? qrData.substring(0, maxQRLength - 3) + "..." : qrData;

  const shareResults = () => {
    const resultMessage = `الفريق: ${teamName}\nنتيجتي في الاختبار: ${correctAnswers}/${totalQuestions} (${percentage}%).`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(resultMessage)}`;
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=نتيجة الاختبار&body=${encodeURIComponent(resultMessage)}`;

    if (confirm('هل تريد مشاركة النتائج عبر واتساب؟')) {
      window.open(whatsappLink, '_blank');
    } else if (confirm('هل تريد مشاركة النتائج عبر البريد الإلكتروني؟')) {
      window.open(gmailLink, '_blank');
    }
  };

  return (
    <Box sx={{
      maxWidth: '600px',
      mx: 'auto',
      p: 4,
      bgcolor: '#1e1e1e',
      borderRadius: 2,
      boxShadow: 3,
      border: '1px solid #444',
      textAlign: 'center',
      direction: 'rtl'
    }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'white', fontWeight: 'bold' }}>
        انتهى الاختبار!
      </Typography>
      <Typography variant="h6" sx={{ mb: 2, color: 'grey.300' }}>
        نتيجتك: <span style={{ color: '#3ea6ff', fontWeight: 'bold' }}>{correctAnswers}</span>/
        <span style={{ fontWeight: 'bold' }}>{totalQuestions}</span> (
        <span style={{ fontWeight: 'bold' }}>{percentage}%</span>)
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <QRCodeSVG value={finalQrData} size={256} level="M" />
      </Box>

      <Button
        variant="contained"
        color="primary"
        onClick={shareResults}
        sx={{
          bgcolor: '#3ea6ff',
          '&:hover': { bgcolor: '#1d4ed8' },
          px: 4,
          py: 2
        }}
      >
        مشاركة النتائج
      </Button>

      <Alert severity="info" sx={{ mt: 3 }}>
        تم حفظ نتائجك بنجاح. يمكنك إغلاق هذه الصفحة الآن.
      </Alert>
    </Box>
  );
};

export default QuizResults;