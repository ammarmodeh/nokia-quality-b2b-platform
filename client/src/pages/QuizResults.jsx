import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { FaWhatsapp } from 'react-icons/fa';

const QuizResults = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  // Get results from either navigation state or fallback storage
  const results = state || JSON.parse(sessionStorage.getItem('quizResultsFallback')) || {
    teamName: 'فريق غير معروف',
    correctAnswers: 0,
    totalQuestions: 1,
    userAnswers: [],
    questions: [],
    percentage: 0
  };

  useEffect(() => {
    // Clean up fallback storage
    sessionStorage.removeItem('quizResultsFallback');

    // Redirect if no results data
    if (!state && !sessionStorage.getItem('quizResultsFallback')) {
      navigate('/fieldteam-login', { replace: true });
      return;
    }

    // Auto-redirect after 3 minutes
    const timeoutId = setTimeout(() => {
      navigate('/fieldteam-login', { replace: true });
    }, 180000);

    // Prevent back navigation
    const handleBackButton = () => {
      navigate('/fieldteam-login', { replace: true });
    };

    window.addEventListener('popstate', handleBackButton);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [navigate, state]);

  const handleExit = () => {
    navigate('/fieldteam-login', { replace: true });
  };

  const generateQRData = () => {
    return `الفريق: ${results.teamName}\nالنتيجة: ${results.correctAnswers}/${results.totalQuestions} (${results.percentage}%)`;
  };

  const shareResults = () => {
    let message = `نتيجة اختبار فريق ${results.teamName}:\n`;
    message += `النتيجة النهائية: ${results.correctAnswers}/${results.totalQuestions} (${results.percentage}%)\n\n`;

    results.questions.forEach((question, index) => {
      const userAnswer = results.userAnswers[index]?.selectedAnswer || 'لم يتم الإجابة';
      message += `السؤال ${index + 1}: ${question.question}\n`;
      message += `إجابتي: ${userAnswer}\n\n`;
    });

    const link = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(link, '_blank');
  };

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#121212',
      p: 2
    }}>
      <Box sx={{
        width: '100%',
        maxWidth: '500px',
        mx: 'auto',
        p: 3,
        bgcolor: '#1e1e1e',
        borderRadius: 2,
        boxShadow: 3,
        border: '1px solid #444',
        textAlign: 'center',
        direction: 'rtl'
      }}>
        <Typography variant="h5" sx={{ mb: 2, color: 'white', fontWeight: 'bold' }}>
          انتهى الاختبار!
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 1.5, color: 'grey.300' }}>
          نتيجتك: <span style={{ color: '#3ea6ff', fontWeight: 'bold' }}>{results.correctAnswers}</span>/
          <span style={{ fontWeight: 'bold' }}>{results.totalQuestions}</span> (
          <span style={{ fontWeight: 'bold' }}>{results.percentage}%</span>)
        </Typography>

        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          my: 2,
          p: 1.5,
          backgroundColor: '#121212',
          borderRadius: 1
        }}>
          <QRCodeSVG
            value={generateQRData()}
            size={180}
            level="M"
            bgColor="#121212"
            fgColor="#ffffff"
          />
        </Box>

        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 1.5,
          mb: 2,
          flexWrap: 'wrap'
        }}>
          <Button
            variant="contained"
            onClick={shareResults}
            sx={{
              bgcolor: '#25D366',
              '&:hover': { bgcolor: '#128C7E' },
              minWidth: 140,
              py: 1,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <FaWhatsapp size={20} />
            <Typography>مشاركة النتيجة</Typography>
          </Button>
        </Box>

        <Button
          variant="contained"
          onClick={handleExit}
          sx={{
            bgcolor: '#3ea6ff',
            '&:hover': { bgcolor: '#1d4ed8' },
            width: '100%',
            py: 1.5,
            mt: 2,
            fontSize: '1rem'
          }}
        >
          العودة إلى صفحة الدخول
        </Button>

        <Alert severity="info" sx={{ mt: 2, py: 0.5, fontSize: '0.875rem' }}>
          يمكنك مشاركة الاسئلة مع الاجابات عبر الواتساب
        </Alert>
      </Box>
    </Box>
  );
};

export default QuizResults;