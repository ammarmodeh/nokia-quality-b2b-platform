import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

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
    <div
      className="min-h-screen flex flex-col justify-center items-center p-6 bg-[#000000]"
      dir="rtl"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      <div className="w-full max-w-md bg-[#111111] border-2 border-white p-8 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] text-center">
        <span className="inline-block px-2 py-0.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest mb-4">
          Quiz Completed
        </span>

        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">
          انتهى الاختبار!
        </h1>

        <div className="mb-6 py-4 border-y border-white/10">
          <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Final Score</p>
          <div className="text-5xl font-black text-white italic">
            {results.percentage}%
          </div>
        </div>

        <div className="p-4 bg-white/5 border-l-4 border-white mb-8 text-right">
          <p className="text-[13px] leading-relaxed text-gray-300">
            <strong className="text-white">تنبيه:</strong> هذه النتيجة غير مكتملة بسبب عدم تدقيق الأسئلة المقالية بعد. سيتم إرسال النتيجة النهائية بعد استكمال التدقيق خلال 24 ساعة عبر WhatsApp.
          </p>
        </div>

        <div className="flex justify-center mb-10 p-4 bg-white border-4 border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <QRCodeSVG
            value={generateQRData()}
            size={160}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        <button
          onClick={handleExit}
          className="w-full py-4 bg-white text-black font-black uppercase text-sm tracking-widest hover:bg-gray-200 transition-colors shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] active:translate-y-0.5 active:shadow-none"
        >
          العودة إلى الصفحة الرئيسية
        </button>
      </div>
    </div>
  );
};

export default QuizResults;