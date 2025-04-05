import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Button, Typography, Alert } from '@mui/material';

const QuizResults = () => {
  const navigate = useNavigate();
  const results = JSON.parse(sessionStorage.getItem('quizResults'));

  useEffect(() => {
    if (!results) {
      navigate('/fieldteam-login', { replace: true });
    }

    // Prevent going back
    const handleBackButton = () => {
      navigate('/fieldteam-login', { replace: true });
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [navigate, results]);

  const handleExit = () => {
    // Clear session storage
    sessionStorage.removeItem('fieldTeamAuth');
    sessionStorage.removeItem('quizResults');

    // Navigate to login and prevent going back
    window.history.pushState(null, '', '/fieldteam-login');
    navigate('/fieldteam-login', { replace: true });
  };

  if (!results) {
    return null;
  }

  const { teamName, correctAnswers, totalQuestions, userAnswers, questions } = results;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  const generateQRData = () => {
    const baseData = [
      `الفريق: ${teamName}`,
      `النتيجة: ${correctAnswers}/${totalQuestions} (${percentage}%)`,
      ...questions.map((q, index) => {
        const isCorrect = userAnswers[index]?.isCorrect ? "✅" : "❌";
        return `${index + 1} - ${isCorrect}`;
      })
    ].join("\n");

    const maxLength = 650;
    return baseData.length > maxLength ? baseData.substring(0, maxLength - 3) + "..." : baseData;
  };

  const shareResults = (platform) => {
    const message = `الفريق: ${teamName}\nنتيجتي في الاختبار: ${correctAnswers}/${totalQuestions} (${percentage}%).`;
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      email: `https://mail.google.com/mail/?view=cm&fs=1&to=&su=نتيجة الاختبار&body=${encodeURIComponent(message)}`
    };

    window.open(links[platform], '_blank');
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
          نتيجتك: <span style={{ color: '#3ea6ff', fontWeight: 'bold' }}>{correctAnswers}</span>/
          <span style={{ fontWeight: 'bold' }}>{totalQuestions}</span> (
          <span style={{ fontWeight: 'bold' }}>{percentage}%</span>)
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
            onClick={() => shareResults('whatsapp')}
            sx={{
              bgcolor: '#25D366',
              '&:hover': { bgcolor: '#128C7E' },
              minWidth: 140,
              py: 1,
              fontSize: '0.875rem'
            }}
          >
            مشاركة عبر واتساب
          </Button>
          <Button
            variant="contained"
            onClick={() => shareResults('email')}
            sx={{
              bgcolor: '#EA4335',
              '&:hover': { bgcolor: '#D33426' },
              minWidth: 140,
              py: 1,
              fontSize: '0.875rem'
            }}
          >
            مشاركة عبر البريد
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
          يمكنك مشاركة نتائجك مع فريقك
        </Alert>
      </Box>
    </Box>
  );
};

export default QuizResults;