import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/api';

const QuizResults = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [quizData, setQuizData] = useState(() => {
    const stateData = location.state?.quizResults;
    if (stateData) return stateData;

    try {
      const fallback = localStorage.getItem('quizResultsFallback');
      if (fallback) return JSON.parse(fallback);
    } catch (e) { }
    return null;
  });

  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (quizData) return;

    let attempts = 0;
    const maxAttempts = 10;

    const pollInterval = setInterval(() => {
      attempts++;
      const stateData = location.state?.quizResults;
      if (stateData) {
        setQuizData(stateData);
        clearInterval(pollInterval);
        return;
      }

      try {
        const fallback = localStorage.getItem('quizResultsFallback');
        if (fallback) {
          setQuizData(JSON.parse(fallback));
          clearInterval(pollInterval);
          return;
        }
      } catch (e) { }

      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
      }
    }, 300);

    return () => clearInterval(pollInterval);
  }, [quizData, location.state]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        setSettings(response.data);
      } catch (err) {
        console.error('Failed to fetch settings');
      }
    };
    fetchSettings();
  }, []);

  const isFieldTeam = location.state?.isFieldTeam || quizData?.isFieldTeam || true;
  const isIQ = quizData?.quizType === 'IQ';

  useEffect(() => {
    if (!quizData) {
      const timer = setTimeout(() => {
        if (!quizData) {
          navigate('/fieldteam-login', { replace: true });
        }
      }, 5000);
      return () => clearTimeout(timer);
    }

    if (settings && quizData) {
      const timeoutMillis = (settings.sessionTimeout || 3) * 60 * 1000;
      const timeoutId = setTimeout(() => {
        navigate(isFieldTeam ? '/fieldteam-login' : '/', { replace: true });
      }, timeoutMillis);
      return () => clearTimeout(timeoutId);
    }
  }, [quizData, settings, navigate, isFieldTeam]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = 'Are you sure you want to leave?';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  if (!quizData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] text-white p-4">
        <div className="w-12 h-12 border-4 border-white border-t-transparent animate-spin mb-4" />
        <p className="text-xl mb-4 font-bold tracking-widest uppercase text-center">
          {isIQ ? 'Retrieving results...' : 'جارٍ انتزاع بيانات النتائج...'}
          <br />
          <span className="text-xs font-normal text-white/50 lowercase mt-2 block">Verifying final results from storage</span>
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-white text-black font-black uppercase text-xs"
        >
          {isIQ ? 'Refresh Page' : 'تحديث الصفحة يدويًا'}
        </button>
      </div>
    );
  }

  const getStat = (key, fallback = 0) => quizData[key] !== undefined ? quizData[key] : fallback;
  const userAnswersArr = quizData.userAnswers || [];

  const mcQuestions = userAnswersArr.filter(q => q.type !== 'essay');
  const essayQuestions = userAnswersArr.filter(q => q.type === 'essay');

  const stats = {
    total: getStat('totalQuestions', 0),
    correctMC: mcQuestions.filter(q => q.isCorrect).length,
    incorrectMC: mcQuestions.filter(q => !q.isCorrect && (q.selectedAnswer || q.essayAnswer)).length,
    unansweredMC: mcQuestions.filter(q => !q.selectedAnswer).length,
    totalMC: mcQuestions.length,
    answeredEssay: essayQuestions.filter(q => q.essayAnswer && q.essayAnswer.trim()).length,
    totalEssay: essayQuestions.length,
    percentage: getStat('percentage', 0)
  };

  const generateQRData = () => {
    try {
      if (isIQ) {
        return [
          `Team: ${quizData.teamName || 'N/A'}`,
          `Code: ${quizData.teamCode || 'N/A'}`,
          `Score: ${stats.percentage}%`,
          `Correct: ${stats.correctMC}/${stats.totalMC}`,
          `Incorrect: ${stats.incorrectMC}`,
          `Essay: ${stats.answeredEssay}/${stats.totalEssay}`,
        ].join('\n');
      }
      return [
        `فريق: ${quizData.teamName || 'N/A'}`,
        `كود: ${quizData.teamCode || 'N/A'}`,
        `النتيجة: ${stats.percentage}%`,
        `صح: ${stats.correctMC}/${stats.totalMC}`,
        `خطأ: ${stats.incorrectMC}`,
        `مقالي: ${stats.answeredEssay}/${stats.totalEssay}`,
      ].join('\n');
    } catch (e) {
      return 'Data error';
    }
  };

  const labels = isIQ ? {
    completed: 'Test Completed',
    finished: 'Test Finished!',
    score: 'Final Score',
    mcSection: 'Multiple Choice Questions',
    correct: 'Correct',
    incorrect: 'Incorrect',
    essaySection: 'Essay Questions',
    answered: 'Answered',
    note: 'Note:',
    noteContent: 'The score shown is for multiple choice questions only. Essay questions will be reviewed manually and the final score will be updated within 24 hours.'
  } : {
    completed: 'Quiz Completed',
    finished: 'انتهى الاختبار!',
    score: 'Final Score',
    mcSection: 'أسئلة الاختيار من متعدد',
    correct: 'صحيحة',
    incorrect: 'خاطئة',
    essaySection: 'الأسئلة المقالية',
    answered: 'تمت الإجابة',
    note: 'تنبيه:',
    noteContent: 'الدرجة تظهر لأسئلة الاختيار فقط. سيتم تدقيق الأسئلة المقالية يدويًا وتحديث النتيجة النهائية خلال 24 ساعة.'
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-6 bg-[#000000]"
      dir={isIQ ? 'ltr' : 'rtl'}
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      <div className="w-full max-w-md bg-[#111111] border-2 border-white p-8 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] text-center">
        <span className="inline-block px-2 py-0.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest mb-4">
          {labels.completed}
        </span>

        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">
          {labels.finished}
        </h1>

        <div className="mb-6 py-4 border-y border-white/10">
          <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">{labels.score}</p>
          <div className="text-5xl font-black text-white italic">
            {stats.percentage}%
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-white/5 border border-white/10 p-4">
            <span className="block text-[10px] uppercase text-gray-400 font-bold mb-2 pb-1 border-b border-white/10 text-center">
              {labels.mcSection}
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-green-400">{stats.correctMC}<span className="text-xs font-normal text-white/40">/{stats.totalMC}</span></span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">{labels.correct}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-red-500">{stats.incorrectMC}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">{labels.incorrect}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-4">
            <span className="block text-[10px] uppercase text-gray-400 font-bold mb-2 pb-1 border-b border-white/10 text-center">
              {labels.essaySection}
            </span>
            <div className="flex justify-center items-end gap-2">
              <span className="text-3xl font-black text-white">{stats.answeredEssay}<span className="text-sm font-normal text-white/40">/{stats.totalEssay}</span></span>
              <span className="text-[10px] font-bold text-blue-400 uppercase pb-1">{labels.answered}</span>
            </div>
          </div>
        </div>

        <div className={`p-4 bg-white/5 border-${isIQ ? 'l' : 'r'}-4 border-white mb-8 ${isIQ ? 'text-left' : 'text-right'}`}>
          <p className="text-[13px] leading-relaxed text-gray-300">
            <strong className="text-white">{labels.note}</strong> {labels.noteContent}
          </p>
        </div>

        <div className="flex justify-center mb-10 p-4 bg-white border-4 border-white shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-transform hover:scale-105">
          <QRCodeSVG
            value={generateQRData()}
            size={160}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
      </div>
    </div>
  );
};

export default QuizResults;