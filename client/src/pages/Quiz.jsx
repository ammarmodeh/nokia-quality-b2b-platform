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
    essayAnswer: '',
    userAnswers: [],
    teamName: '',
    teamCompany: '',
    quizCode: '',
    teamId: '',
    loading: true,
    error: null,
    hasSubmitted: false
  });

  useEffect(() => {
    // Security measures (unchanged)
    const preventDefault = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('cut', preventDefault);
    document.addEventListener('dragstart', preventDefault);

    const handleKeyDown = (e) => {
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C' ||
        e.key === 'x' || e.key === 'X' ||
        e.key === 'a' || e.key === 'A')) {
        preventDefault(e);
      }
      if (e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'U')) {
        preventDefault(e);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

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
      teamCompany: authData.teamCompany,
      quizCode: authData.quizCode,
      loading: false
    }));

    const loadQuestions = async () => {
      try {
        const response = await api.get('/quiz/questions');
        const savedProgress = JSON.parse(sessionStorage.getItem('quizProgress') || '{}');

        const initialUserAnswers = response.data.map((question, index) => {
          if (savedProgress.userAnswers && savedProgress.userAnswers[index]) {
            return savedProgress.userAnswers[index];
          }
          return {
            category: question.category,
            type: question.type || 'options'
          };
        });

        setQuizState(prev => ({
          ...prev,
          questions: response.data,
          userAnswers: initialUserAnswers,
          currentQuestion: savedProgress.currentQuestion || 0,
          selectedOption: initialUserAnswers[savedProgress.currentQuestion || 0]?.selectedAnswer || '',
          essayAnswer: initialUserAnswers[savedProgress.currentQuestion || 0]?.essayAnswer || ''
        }));
      } catch (err) {
        setQuizState(prev => ({ ...prev, error: 'فشل تحميل الأسئلة' }));
      }
    };

    loadQuestions();

    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('cut', preventDefault);
      document.removeEventListener('dragstart', preventDefault);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    };
  }, [locationState]);

  // Save progress effect
  useEffect(() => {
    if (quizState.questions.length > 0 && !quizState.hasSubmitted) {
      sessionStorage.setItem('quizProgress', JSON.stringify({
        currentQuestion: quizState.currentQuestion,
        userAnswers: quizState.userAnswers
      }));
    }
    if (quizState.hasSubmitted) {
      sessionStorage.removeItem('quizProgress');
    }
  }, [quizState.currentQuestion, quizState.userAnswers, quizState.hasSubmitted, quizState.questions.length]);

  const handleOptionChange = (e) => {
    const { value } = e.target;
    setQuizState(prev => {
      const updatedUserAnswers = [...prev.userAnswers];
      updatedUserAnswers[prev.currentQuestion] = {
        ...updatedUserAnswers[prev.currentQuestion],
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

  const handleEssayChange = (e) => {
    const { value } = e.target;
    setQuizState(prev => {
      const updatedUserAnswers = [...prev.userAnswers];
      updatedUserAnswers[prev.currentQuestion] = {
        ...updatedUserAnswers[prev.currentQuestion],
        essayAnswer: value,
        score: 0
      };

      return {
        ...prev,
        essayAnswer: value,
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
        selectedOption: prev.userAnswers[prev.currentQuestion + 1]?.selectedAnswer || '',
        essayAnswer: prev.userAnswers[prev.currentQuestion + 1]?.essayAnswer || ''
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

    // Calculate score only for options-type questions
    const finalScore = userAnswers.reduce((score, answer, index) => {
      if (quizState.questions[index].type === 'essay') return score; // Essay questions contribute 0 to score
      return answer.isCorrect ? score + 1 : score;
    }, 0);

    // Count all questions (options and essay)
    const totalQuestions = quizState.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0;
    const result = `${finalScore}/${totalQuestions} ${percentage}%`;

    const resultsData = {
      teamId: quizState.teamId,
      teamName: quizState.teamName,
      teamCompany: quizState.teamCompany,
      quizCode: quizState.quizCode,
      correctAnswers: finalScore,
      totalQuestions: totalQuestions,
      userAnswers: userAnswers.map((answer, index) => ({
        question: quizState.questions[index].question,
        options: quizState.questions[index].options,
        correctAnswer: quizState.questions[index].correctAnswer,
        selectedAnswer: answer.selectedAnswer,
        essayAnswer: answer.essayAnswer,
        score: answer.score || 0,
        isCorrect: answer.isCorrect,
        category: quizState.questions[index].category,
        type: quizState.questions[index].type || 'options'
      })),
      questions: quizState.questions,
      percentage,
      score: result
    };

    try {
      await api.post('/quiz-results', resultsData);
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
      console.error('Error saving results:', error);
      sessionStorage.setItem('quizResultsFallback', JSON.stringify({
        teamName: quizState.teamName,
        correctAnswers: finalScore,
        totalQuestions: totalQuestions,
        userAnswers: userAnswers,
        questions: quizState.questions,
        percentage
      }));

      navigate('/quiz-results', { replace: true });
    }
  };

  if (quizState.error) {
    return <Navigate to="/fieldteam-login" replace />;
  }

  if (quizState.loading || quizState.questions.length === 0) {
    return (
      <div className="p-4 bg-[#f9fafb] min-h-screen flex items-center justify-center text-white" dir="rtl">
        جار التحميل...
      </div>
    );
  }

  const { questions, currentQuestion, selectedOption, essayAnswer, teamName, userAnswers } = quizState;
  const currentQ = questions[currentQuestion];

  const quizStyles = {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none'
  };

  return (
    <div
      className="min-h-screen flex flex-col py-6 px-4 md:px-6 bg-[#000000]"
      dir="rtl"
      style={{
        ...quizStyles,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header Section - Compact Inverted */}
      <div className="max-w-3xl mx-auto w-full mb-4">
        <div className="flex justify-between items-center py-3 border-b-2 border-white">
          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-white/20"></div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Team</span>
              <h2 className="text-lg font-black text-white leading-none uppercase">{teamName}</h2>
            </div>
          </div>
          <Timer
            teamId={quizState.teamId}
            timeLimit={3000}
            onTimeUp={() => {
              if (!quizState.hasSubmitted) {
                submitScore(userAnswers);
              }
            }}
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full flex-grow">
        {/* Progress Bar - Minimalist Dark */}
        <div className="mb-6">
          <div className="flex justify-between text-[11px] font-bold text-white uppercase mb-1">
            <span>Question {currentQuestion + 1}/{questions.length}</span>
            <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="h-1 w-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500 ease-out shadow-[0_0_8px_rgba(255,255,255,0.3)]"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Area - Classic Dark Card */}
        <div className="bg-[#111111] border-2 border-white p-6 md:p-10 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
          <div className="mb-8">
            <span className="inline-block px-2 py-0.5 bg-white text-black text-[10px] font-bold uppercase tracking-tighter mb-4">
              {currentQ.category || 'General'}
            </span>
            <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
              {currentQ.question}
            </h3>
          </div>

          <div className="space-y-3">
            {currentQ.type === 'essay' ? (
              <div>
                {currentQ.guideline && (
                  <div className="p-3 bg-white/5 border-l-4 border-white mb-4">
                    <p className="text-xs text-gray-400 italic">
                      <strong>Note:</strong> {currentQ.guideline}
                    </p>
                  </div>
                )}
                <textarea
                  className="w-full p-4 text-white bg-[#000000] border-2 border-white focus:bg-white/5 transition-colors outline-none placeholder-white/20 min-h-[150px] text-base leading-relaxed"
                  value={essayAnswer}
                  onChange={handleEssayChange}
                  placeholder="Type your response here..."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {currentQ.options.map((option, index) => (
                  <label
                    key={index}
                    className={`
                      group relative flex items-center p-4 border-2 transition-all cursor-pointer
                      ${selectedOption === option
                        ? 'bg-white border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]'
                        : 'bg-transparent border-white/10 hover:border-white'}
                    `}
                  >
                    <input
                      type="radio"
                      value={option}
                      checked={selectedOption === option}
                      onChange={handleOptionChange}
                      className="hidden"
                    />
                    <div className={`
                      w-4 h-4 rounded-full border-2 mr-3 shrink-0 flex items-center justify-center
                      ${selectedOption === option ? 'border-black bg-black' : 'border-white/20'}
                    `}>
                      {selectedOption === option && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                    <span className={`text-base font-bold transition-colors ${selectedOption === option ? 'text-black' : 'text-white/70 group-hover:text-white'}`}>
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Navigation - Distinct Dark */}
          <div className="flex flex-row-reverse justify-between items-center mt-10 pt-6 border-t border-white/10">
            <button
              className="px-6 py-3 bg-white text-black font-black uppercase text-sm tracking-widest hover:bg-gray-200 transition-colors flex items-center gap-2 group shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] active:translate-y-0.5 active:shadow-none font-bold"
              onClick={handleSubmit}
            >
              <span>{currentQuestion === questions.length - 1 ? "Finish Quiz" : "Next Question"}</span>
              <span className="text-lg group-hover:translate-x-[-4px] transition-transform">←</span>
            </button>

            <button
              className={`
                px-6 py-3 font-bold uppercase text-sm tracking-widest transition-colors flex items-center gap-2
                ${currentQuestion === 0
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white hover:bg-white/10'}
              `}
              onClick={() => {
                setQuizState(prev => ({
                  ...prev,
                  currentQuestion: prev.currentQuestion - 1,
                  selectedOption: prev.userAnswers[prev.currentQuestion - 1]?.selectedAnswer || '',
                  essayAnswer: prev.userAnswers[prev.currentQuestion - 1]?.essayAnswer || ''
                }));
              }}
              disabled={currentQuestion === 0}
            >
              <span className="text-lg">→</span>
              <span>Back</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
