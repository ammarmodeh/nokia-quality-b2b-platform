import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { FaWhatsapp } from 'react-icons/fa';

const QuizResults = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const results = state?.quizResults ||
    JSON.parse(sessionStorage.getItem('quizResultsFallback')) ||
  {
    teamName: 'فريق غير معروف',
    correctAnswers: 0,
    totalQuestions: 1,
    percentage: 0,
    questions: [],
    userAnswers: []
  };

  useEffect(() => {
    sessionStorage.removeItem('quizResultsFallback');

    if (!results.teamName || results.teamName === 'فريق غير معروف') {
      const isFieldTeam = JSON.parse(sessionStorage.getItem('fieldTeamAuth'));
      navigate(isFieldTeam ? '/fieldteam-login' : '/auth', { replace: true });
    }

    const timeoutId = setTimeout(() => {
      const isFieldTeam = JSON.parse(sessionStorage.getItem('fieldTeamAuth'));
      navigate(isFieldTeam ? '/fieldteam-login' : '/', { replace: true });
    }, 180000);

    return () => clearTimeout(timeoutId);
  }, [navigate, results]);

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

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleExit = () => {
    const isFieldTeam = JSON.parse(sessionStorage.getItem('fieldTeamAuth'));
    if (isFieldTeam) {
      sessionStorage.removeItem('fieldTeamAuth');
      navigate('/fieldteam-login', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
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

        {/* <Box sx={{
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
        </Box> */}

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
          العودة إلى الصفحة الرئيسية
        </Button>

        {/* <Alert severity="info" sx={{ mt: 2, py: 0.5, fontSize: '0.875rem' }}>
          يمكنك مشاركة الاسئلة مع الاجابات عبر الواتساب
        </Alert> */}
      </Box>
    </Box>
  );
};

export default QuizResults;