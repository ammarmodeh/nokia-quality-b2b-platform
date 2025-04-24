import { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { Timer } from '../components/Timer';

const Quiz = () => {
  const { state: locationState } = useLocation();
  const navigate = useNavigate();
  const [quizState, setQuizState] = useState({
    questions: [],
    currentQuestion: 0,
    selectedOption: '',
    userAnswers: [],
    teamName: '',
    quizCode: '',
    teamId: '',
    loading: true,
    error: null,
    hasSubmitted: false
  });

  useEffect(() => {
    // Security measures
    const preventDefault = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevent right-click context menu
    document.addEventListener('contextmenu', preventDefault);

    // Prevent copy/cut
    document.addEventListener('copy', preventDefault);
    document.addEventListener('cut', preventDefault);

    // Prevent drag start
    document.addEventListener('dragstart', preventDefault);

    // Prevent keyboard shortcuts
    const handleKeyDown = (e) => {
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C' ||
        e.key === 'x' || e.key === 'X' ||
        e.key === 'a' || e.key === 'A')) {
        preventDefault(e);
      }

      // Disable F12 and other dev tools shortcuts
      if (e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'U')) {
        preventDefault(e);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Blur content when window loses focus
    const handleBlur = () => {
      document.body.style.filter = 'blur(5px)';
      setTimeout(() => document.body.style.filter = '', 1000);
    };
    window.addEventListener('blur', handleBlur);

    // Load quiz data
    const authData = locationState?.fieldTeamAuth ||
      JSON.parse(sessionStorage.getItem('fieldTeamAuth'));

    if (!authData) {
      setQuizState(prev => ({ ...prev, error: 'غير مصرح بالوصول', loading: false }));
      return;
    }

    setQuizState(prev => ({
      ...prev,
      teamId: authData.teamId,
      teamName: authData.teamName,
      quizCode: authData.quizCode,
      loading: false
    }));

    const loadQuestions = async () => {
      try {
        const response = await api.get('/quiz/questions');
        // Initialize userAnswers array with empty objects
        const initialUserAnswers = response.data.map(() => ({}));
        setQuizState(prev => ({
          ...prev,
          questions: response.data,
          userAnswers: initialUserAnswers
        }));
      } catch (err) {
        setQuizState(prev => ({ ...prev, error: 'فشل تحميل الأسئلة' }));
      }
    };

    loadQuestions();

    return () => {
      // Cleanup all event listeners
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('cut', preventDefault);
      document.removeEventListener('dragstart', preventDefault);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    };
  }, [locationState]);

  const handleOptionChange = (e) => {
    const { value } = e.target;
    setQuizState(prev => {
      const updatedUserAnswers = [...prev.userAnswers];
      updatedUserAnswers[prev.currentQuestion] = {
        selectedAnswer: value,
        isCorrect: value === prev.questions[prev.currentQuestion].correctAnswer
      };

      return {
        ...prev,
        selectedOption: value,
        userAnswers: updatedUserAnswers
      };
    });
  };

  const handleSubmit = () => {
    if (quizState.hasSubmitted) return;

    const { questions, currentQuestion, userAnswers } = quizState;

    if (currentQuestion < questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
        selectedOption: prev.userAnswers[prev.currentQuestion + 1]?.selectedAnswer || ''
      }));
    } else {
      const confirmSubmit = window.confirm('هل أنت متأكد أنك تريد إنهاء الاختبار؟ لا يمكنك العودة بعد الإرسال.');
      if (confirmSubmit) {
        submitScore(userAnswers);
      }
    }
  };

  const submitScore = async (userAnswers) => {
    if (quizState.hasSubmitted) return;
    setQuizState(prev => ({ ...prev, hasSubmitted: true }));

    const finalScore = userAnswers.reduce((score, answer, index) => {
      return answer.isCorrect ? score + 1 : score;
    }, 0);

    const percentage = Math.round((finalScore / quizState.questions.length) * 100);
    const result = `${finalScore}/${quizState.questions.length} ${percentage}%`;

    const resultsData = {
      teamName: quizState.teamName,
      correctAnswers: finalScore,
      totalQuestions: quizState.questions.length,
      userAnswers: userAnswers,
      questions: quizState.questions,
      percentage
    };

    try {
      await api.post('/field-teams/update-score', {
        teamId: quizState.teamId,
        quizCode: quizState.quizCode,
        score: result
      });

      navigate('/quiz-results', {
        state: { quizResults: resultsData },
        replace: true
      });
    } catch (error) {
      sessionStorage.setItem('quizResultsFallback', JSON.stringify(resultsData));
      navigate('/quiz-results', { replace: true });
    }
  };

  if (quizState.error) {
    return <Navigate to="/fieldteam-login" replace />;
  }

  if (quizState.loading || quizState.questions.length === 0) {
    return (
      <div className="p-4 bg-[#121212] min-h-screen flex items-center justify-center text-white" dir="rtl">
        جار التحميل...
      </div>
    );
  }

  const { questions, currentQuestion, selectedOption, teamName, userAnswers } = quizState;
  const currentQ = questions[currentQuestion];

  // CSS styles to prevent text selection
  const quizStyles = {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none'
  };

  return (
    <div
      className="p-4 bg-[#121212] min-h-screen"
      dir="rtl"
      style={quizStyles}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-xl font-bold text-[#3ea6ff]">اسم الفريق: {teamName}</h2>
        <Timer
          timeLimit={3000}
          onTimeUp={() => {
            if (!quizState.hasSubmitted) {
              const confirmTimeUp = window.confirm('انتهى وقت الاختبار! سيتم إرسال إجاباتك الآن.');
              if (confirmTimeUp) {
                submitScore(userAnswers);
              }
            }
          }}
        />
      </div>

      <div className="max-w-[1000px] mx-auto">
        <h3 className="text-2xl font-bold text-white mb-4">{currentQ.question}</h3>

        {currentQ.options.map((option, index) => (
          <div key={index} className="mb-2">
            <label className="flex items-center bg-[#1e1e1e] p-3 rounded border border-[#444] hover:border-[#3ea6ff]">
              <input
                type="radio"
                value={option}
                checked={selectedOption === option}
                onChange={handleOptionChange}
                className="ml-2"
              />
              <span className="text-white">{option}</span>
            </label>
          </div>
        ))}

        <div className="flex justify-between gap-2 mt-4">
          <button
            className="bg-[#3ea6ff] text-white px-4 py-2 rounded hover:bg-[#1d4ed8]"
            onClick={handleSubmit}
          >
            {currentQuestion === questions.length - 1 ? "إنهاء الاختبار" : "التالي"}
          </button>
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            onClick={() => {
              setQuizState(prev => ({
                ...prev,
                currentQuestion: prev.currentQuestion - 1,
                selectedOption: prev.userAnswers[prev.currentQuestion - 1]?.selectedAnswer || ''
              }));
            }}
            disabled={currentQuestion === 0}
          >
            السابق
          </button>
        </div>
      </div>
    </div>
  );
};

export default Quiz;