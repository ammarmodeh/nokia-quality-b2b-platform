import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/api';

const QuizResults = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [quizData, setQuizData] = useState(() => {
    // 1. Initial immediate check
    const stateData = location.state?.quizResults;
    if (stateData) return stateData;

    try {
      const fallback = sessionStorage.getItem('quizResultsFallback');
      if (fallback) return JSON.parse(fallback);
    } catch (e) { }
    return null;
  });

  const [settings, setSettings] = useState(null);

  // 2. Polling Effect: If quizData is missing on mount, try to find it for up to 3 seconds
  useEffect(() => {
    if (quizData) return;

    let attempts = 0;
    const maxAttempts = 10; // 3 seconds total with 300ms intervals

    const pollInterval = setInterval(() => {
      attempts++;
      console.log(`QuizResults: Polling for data (attempt ${attempts})...`);

      const stateData = location.state?.quizResults;
      if (stateData) {
        setQuizData(stateData);
        clearInterval(pollInterval);
        return;
      }

      try {
        const fallback = sessionStorage.getItem('quizResultsFallback');
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

  useEffect(() => {
    if (!quizData) {
      const timer = setTimeout(() => {
        if (!quizData) {
          navigate('/fieldteam-login', { replace: true });
        }
      }, 5000); // Wait 5 seconds before giving up
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
          جارٍ انتزاع بيانات النتائج...<br />
          <span className="text-xs font-normal text-white/50 lowercase mt-2 block">Verifying final results from storage</span>
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-white text-black font-black uppercase text-xs"
        >
          تحديث الصفحة يدويًا
        </button>
      </div>
    );
  }

  const getStat = (key, fallback = 0) => quizData[key] !== undefined ? quizData[key] : fallback;
  const userAnswersArr = quizData.userAnswers || [];

  // Calculate breakdown
  const mcQuestions = userAnswersArr.filter(q => q.type !== 'essay');
  const essayQuestions = userAnswersArr.filter(q => q.type === 'essay');

  const stats = {
    total: getStat('totalQuestions', 0),
    correctMC: mcQuestions.filter(q => q.isCorrect).length,
    incorrectMC: mcQuestions.filter(q => !q.isCorrect && (q.selectedAnswer || q.essayAnswer)).length, // Count only answered but wrong
    unansweredMC: mcQuestions.filter(q => !q.selectedAnswer).length,
    totalMC: mcQuestions.length,
    answeredEssay: essayQuestions.filter(q => q.essayAnswer && q.essayAnswer.trim()).length,
    totalEssay: essayQuestions.length,
    percentage: getStat('percentage', 0)
  };

  const generateQRData = () => {
    try {
      return [
        `فريق: ${quizData.teamName || 'N/A'}`,
        `النتيجة: ${stats.percentage}%`,
        `صح: ${stats.correctMC}/${stats.totalMC}`,
        `خطأ: ${stats.incorrectMC}`,
        `مقالي: ${stats.answeredEssay}/${stats.totalEssay}`,
        `كود: ${quizData.quizCode || 'N/A'}`
      ].join('\n');
    } catch (e) {
      return 'Data error';
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
            {stats.percentage}%
          </div>
        </div>

        {/* Stats Grid - Detailed Breakdown */}
        <div className="space-y-4 mb-8">
          {/* Multiple Choice Section */}
          <div className="bg-white/5 border border-white/10 p-4 text-right">
            <span className="block text-[10px] uppercase text-gray-400 font-bold mb-2 pb-1 border-b border-white/10 text-center">
              أسئلة الاختيار من متعدد
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-green-400">{stats.correctMC}<span className="text-xs font-normal text-white/40">/{stats.totalMC}</span></span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">صحيحة</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-red-500">{stats.incorrectMC}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">خاطئة</span>
              </div>
            </div>
          </div>

          {/* Essay Section */}
          <div className="bg-white/5 border border-white/10 p-4 text-right">
            <span className="block text-[10px] uppercase text-gray-400 font-bold mb-2 pb-1 border-b border-white/10 text-center">
              الأسئلة المقالية
            </span>
            <div className="flex justify-center items-end gap-2">
              <span className="text-3xl font-black text-white">{stats.answeredEssay}<span className="text-sm font-normal text-white/40">/{stats.totalEssay}</span></span>
              <span className="text-[10px] font-bold text-blue-400 uppercase pb-1">تمت الإجابة</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white/5 border-l-4 border-white mb-8 text-right">
          <p className="text-[13px] leading-relaxed text-gray-300">
            <strong className="text-white">تنبيه:</strong> الدرجة تظهر لأسئلة الاختيار فقط. سيتم تدقيق الأسئلة المقالية يدويًا وتحديث النتيجة النهائية خلال 24 ساعة.
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