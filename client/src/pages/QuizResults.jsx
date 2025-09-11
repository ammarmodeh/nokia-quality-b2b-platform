import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Button, Typography } from '@mui/material';

const QuizResults = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const results = state?.quizResults ||
    JSON.parse(sessionStorage.getItem('quizResultsFallback')) || {
    teamName: 'فريق غير معروف',
    correctAnswers: 0,
    totalQuestions: 1,
    percentage: 0,
    questions: [],
    userAnswers: [],
    teamId: null,
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

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = 'Are you sure you want to leave?';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate, results]);

  const maxScore = results.totalQuestions * 2;

  const generateQRData = () => {
    return `الفريق: ${results.teamName}\nالنتيجة: ${results.correctAnswers}/${maxScore} (${results.percentage}%)`;
  };

  const handleExit = async () => {
    const isFieldTeam = JSON.parse(sessionStorage.getItem('fieldTeamAuth'));
    const teamId = sessionStorage.getItem('teamId') || results.teamId;

    if (teamId) {
      try {
        const response = await fetch(`/field-teams/toggle-quiz-permission/${teamId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ canTakeQuiz: false }),
        });
        if (!response.ok) {
          console.error('Failed to toggle quiz permission on exit');
        }
      } catch (error) {
        console.error('Error toggling quiz permission:', error);
      }
    }

    sessionStorage.removeItem('quizTimer');
    sessionStorage.removeItem('quizInProgress');
    sessionStorage.removeItem('teamName');
    sessionStorage.removeItem('teamId');

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
          نتيجتك:
          {/* <span style={{ fontWeight: 'bold' }}>{maxScore}</span> */}
          <span style={{ fontWeight: 'bold' }}>{results.percentage}%</span>
        </Typography>
        <Typography variant="body1" sx={{ mb: 2, color: '#ffca28', fontWeight: 'bold' }}>
          هذه النتيجة غير مكتملة بسبب عدم تدقيق الأسئلة المقالية بعد. سيتم إرسال النتيجة النهائية بعد استكمال التدقيق خلال 24 ساعة عبر WhatsApp.
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
      </Box>
    </Box>
  );
};

export default QuizResults;