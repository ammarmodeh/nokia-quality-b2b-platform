import { useState, useEffect } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { Timer } from '../components/Timer';

const Quiz = () => {
  const { state } = useLocation();
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
    error: null
  });

  useEffect(() => {
    const authenticateTeam = () => {
      if (state?.teamId && state?.teamName && state?.quizCode) {
        const authData = {
          teamId: state.teamId,
          teamName: state.teamName,
          quizCode: state.quizCode
        };
        sessionStorage.setItem('fieldTeamAuth', JSON.stringify(authData));
        return authData;
      }

      const savedAuth = JSON.parse(sessionStorage.getItem('fieldTeamAuth'));
      return savedAuth || null;
    };

    const authData = authenticateTeam();
    if (!authData) {
      setQuizState(prev => ({ ...prev, error: 'غير مصرح بالوصول. يرجى تسجيل الدخول أولاً.', loading: false }));
      return;
    }

    setQuizState(prev => ({
      ...prev,
      teamId: authData.teamId,
      teamName: authData.teamName,
      quizCode: authData.quizCode,
      loading: false
    }));

    api.get('/quiz/questions')
      .then(response => setQuizState(prev => ({ ...prev, questions: response.data })))
      .catch(err => {
        console.error('Error fetching questions:', err);
        setQuizState(prev => ({ ...prev, error: 'فشل تحميل الأسئلة. يرجى المحاولة مرة أخرى.' }));
      });
  }, [state]);

  const handleOptionChange = (e) => {
    setQuizState(prev => ({ ...prev, selectedOption: e.target.value }));
  };

  const handleSubmit = () => {
    const { questions, currentQuestion, selectedOption, score, userAnswers } = quizState;
    const isCorrect = selectedOption === questions[currentQuestion].correctAnswer;
    const newScore = isCorrect ? score + 1 : score;
    const newUserAnswers = [...userAnswers];

    newUserAnswers[currentQuestion] = {
      selectedAnswer: selectedOption,
      isCorrect
    };

    if (currentQuestion < questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
        selectedOption: '',
        score: newScore,
        userAnswers: newUserAnswers
      }));
    } else {
      submitScore(newScore, newUserAnswers);
    }
  };

  const submitScore = async (finalScore, answers) => {
    try {
      const percentage = Math.round((finalScore / quizState.questions.length) * 100);
      const result = `${finalScore}/${quizState.questions.length} ${percentage}%`;

      const response = await api.post('/field-teams/update-score', {
        teamId: quizState.teamId,
        quizCode: quizState.quizCode,
        score: result
      });

      if (response.data.success) {
        const results = {
          teamName: quizState.teamName,
          correctAnswers: finalScore,
          totalQuestions: quizState.questions.length,
          userAnswers: answers,
          questions: quizState.questions
        };

        sessionStorage.setItem('quizResults', JSON.stringify(results));
        navigate('/quiz-results', { replace: true });
      }
    } catch (err) {
      if (err.response?.status === 403) {
        const results = {
          teamName: quizState.teamName,
          correctAnswers: finalScore,
          totalQuestions: quizState.questions.length,
          userAnswers: answers,
          questions: quizState.questions
        };

        sessionStorage.setItem('quizResults', JSON.stringify(results));
        navigate('/quiz-results', { replace: true });
      } else {
        alert(err.response?.data?.message || 'Failed to submit results');
      }
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

  const { questions, currentQuestion, selectedOption, teamName, score } = quizState;
  const currentQ = questions[currentQuestion];

  return (
    <div className="p-4 bg-[#121212] min-h-screen" dir="rtl">
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-xl font-bold text-[#3ea6ff]"> اسم الفريق: {teamName}</h2>
        <Timer timeLimit={3000} onTimeUp={() => submitScore(score, quizState.userAnswers)} />
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
                selectedOption: prev.userAnswers[prev.currentQuestion - 1]?.selectedOption || ''
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