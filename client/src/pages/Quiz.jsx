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
    score: 0,
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
        setQuizState(prev => ({ ...prev, questions: response.data }));
      } catch (err) {
        setQuizState(prev => ({ ...prev, error: 'فشل تحميل الأسئلة' }));
      }
    };

    loadQuestions();
  }, [locationState]);

  const handleOptionChange = (e) => {
    setQuizState(prev => ({ ...prev, selectedOption: e.target.value }));
  };

  const handleSubmit = () => {
    if (quizState.hasSubmitted) return;

    const { questions, currentQuestion, selectedOption, score, userAnswers } = quizState;
    const isCorrect = selectedOption === questions[currentQuestion].correctAnswer;
    const newScore = isCorrect ? score + 1 : score;
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestion] = { selectedAnswer: selectedOption, isCorrect };

    if (currentQuestion < questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
        selectedOption: newUserAnswers[prev.currentQuestion + 1]?.selectedAnswer || '',
        score: newScore,
        userAnswers: newUserAnswers
      }));
    } else {
      submitScore(newScore, newUserAnswers);
    }
  };

  const submitScore = async (finalScore, answers) => {
    if (quizState.hasSubmitted) return;
    setQuizState(prev => ({ ...prev, hasSubmitted: true }));

    const percentage = Math.round((finalScore / quizState.questions.length) * 100);
    const result = `${finalScore}/${quizState.questions.length} ${percentage}%`;

    const resultsData = {
      teamName: quizState.teamName,
      correctAnswers: finalScore,
      totalQuestions: quizState.questions.length,
      userAnswers: answers,
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

  const { questions, currentQuestion, selectedOption, teamName } = quizState;
  const currentQ = questions[currentQuestion];

  return (
    <div className="p-4 bg-[#121212] min-h-screen" dir="rtl">
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-xl font-bold text-[#3ea6ff]">اسم الفريق: {teamName}</h2>
        <Timer
          timeLimit={3000}
          onTimeUp={() => !quizState.hasSubmitted && submitScore(quizState.score, quizState.userAnswers)}
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