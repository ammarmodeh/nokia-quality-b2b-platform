import { useState, useEffect } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { Timer } from '../components/Timer';
import { QRCodeSVG } from 'qrcode.react';

const Quiz = () => {
  const { state } = useLocation();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [userAnswers, setUserAnswers] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [quizCode, setQuizCode] = useState('');
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Authentication check
  useEffect(() => {
    // Check if coming from FieldTeamLogin with valid data
    if (state?.teamId && state?.teamName && state?.quizCode) {
      setTeamId(state.teamId);
      setTeamName(state.teamName);
      setQuizCode(state.quizCode);
      setLoading(false);
      // Store in sessionStorage for refresh persistence
      sessionStorage.setItem('fieldTeamAuth', JSON.stringify({
        teamId: state.teamId,
        teamName: state.teamName,
        quizCode: state.quizCode
      }));
    } else {
      // Check sessionStorage for existing auth
      const savedAuth = JSON.parse(sessionStorage.getItem('fieldTeamAuth'));
      if (savedAuth) {
        setTeamId(savedAuth.teamId);
        setTeamName(savedAuth.teamName);
        setQuizCode(savedAuth.quizCode);
        setLoading(false);
      } else {
        setError('غير مصرح بالوصول. يرجى تسجيل الدخول أولاً.');
        setLoading(false);
      }
    }
  }, [state]);

  // Fetch questions
  useEffect(() => {
    if (teamId && !loading) {
      api.get('/quiz/questions')
        .then((response) => setQuestions(response.data))
        .catch((err) => {
          console.error('Error fetching questions:', err);
          setError('فشل تحميل الأسئلة. يرجى المحاولة مرة أخرى.');
        });
    }
  }, [teamId, loading]);

  const handleOptionChange = (e) => {
    setSelectedOption(e.target.value);
  };

  const handleSubmit = () => {
    let updatedScore = score;
    const isCorrect = selectedOption === questions[currentQuestion].correctAnswer;
    if (isCorrect) {
      updatedScore = score + 1;
      setScore(updatedScore);
      setCorrectAnswers(correctAnswers + 1);
    }

    const updatedUserAnswers = [...userAnswers];
    updatedUserAnswers[currentQuestion] = {
      selectedAnswer: selectedOption,
      isCorrect,
    };
    setUserAnswers(updatedUserAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prevQuestion) => prevQuestion + 1);
      setSelectedOption('');
    } else {
      submitScore(updatedScore);
    }
  };

  const handleGoBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prevQuestion) => prevQuestion - 1);
      setSelectedOption(userAnswers[currentQuestion - 1]?.selectedAnswer || '');
    }
  };

  const submitScore = async (finalScore) => {
    try {
      const percentage = Math.round((finalScore / questions.length) * 100);
      const result = `${finalScore}/${questions.length} ${percentage}%`;

      const response = await api.post(
        `/field-teams/update-score`,
        {
          teamId,
          quizCode,
          score: result
        }, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        // Store results in sessionStorage before navigation
        sessionStorage.setItem('quizResults', JSON.stringify({
          teamName,
          correctAnswers: finalScore,
          totalQuestions: questions.length,
          userAnswers,
          questions
        }));

        // Navigate to results page
        navigate('/quiz-results', {
          replace: true // Prevent going back to quiz
        });
      }
    } catch (err) {
      console.error('Submission error:', err);

      // If it's a 403 (already submitted), still navigate to results
      if (err.response?.status === 403) {
        sessionStorage.setItem('quizResults', JSON.stringify({
          teamName,
          correctAnswers: finalScore,
          totalQuestions: questions.length,
          userAnswers,
          questions
        }));

        navigate('/quiz-results', {
          replace: true
        });
      } else {
        alert(err.response?.data?.message || 'Failed to submit results');
      }
    }
  };

  const shareResults = () => {
    const resultMessage = `الفريق: ${teamName}\nنتيجتي في الاختبار: ${correctAnswers}/${questions.length} (${Math.round(
      (correctAnswers / questions.length) * 100
    )}%).`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(resultMessage)}`;
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=نتيجة الاختبار&body=${encodeURIComponent(
      resultMessage
    )}`;

    if (confirm('هل تريد مشاركة النتائج عبر واتساب؟')) {
      window.open(whatsappLink, '_blank');
    } else if (confirm('هل تريد مشاركة النتائج عبر البريد الإلكتروني؟')) {
      window.open(gmailLink, '_blank');
    }
  };

  // Redirect if not authenticated
  if (error) {
    return <Navigate to="/fieldteam-login" replace />;
  }

  if (loading) {
    return (
      <div className="p-4 bg-[#121212] min-h-screen flex items-center justify-center text-white" dir="rtl">
        جار التحميل...
      </div>
    );
  }

  if (isSubmitted) {
    const percentage = Math.round((correctAnswers / questions.length) * 100);
    const qrData = [
      `الفريق: ${teamName}`,
      `النتيجة: ${correctAnswers}/${questions.length} (${percentage}%)`,
      ...questions.map((q, index) => {
        const isCorrect = userAnswers[index]?.isCorrect ? "✅" : "❌";
        return `${index + 1} - ${isCorrect}`;
      }),
    ].join("\n");

    const maxQRLength = 650;
    const finalQrData = qrData.length > maxQRLength ? qrData.substring(0, maxQRLength - 3) + "..." : qrData;

    return (
      <div className="max-w-[600px] mx-auto p-6 bg-[#1e1e1e] rounded-lg shadow-lg font-sans border border-[#444]" dir="rtl">
        <h3 className="text-2xl font-bold text-white mb-6">انتهى الاختبار!</h3>
        <p className="text-gray-300 text-xl mb-4">
          نتيجتك: <span className="font-bold text-[#3ea6ff]">{correctAnswers}</span>/<span className="font-bold">{questions.length}</span> (<span className="font-bold">{percentage}%</span>)
        </p>
        <div className="flex justify-center mt-4 mb-6">
          <QRCodeSVG value={finalQrData} size={256} level="M" />
        </div>
        <div className="flex justify-center space-x-4">
          <button
            className="bg-[#3ea6ff] text-white px-4 py-2 rounded hover:bg-[#1d4ed8]"
            onClick={shareResults}
          >
            مشاركة النتائج
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-4 bg-[#121212] min-h-screen flex items-center justify-center text-white" dir="rtl">
        جار تحميل الأسئلة...
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#121212] min-h-screen" dir="rtl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[#3ea6ff]">فريق: {teamName}</h2>
        <Timer timeLimit={300} onTimeUp={() => submitScore(score)} />
      </div>

      <div className="max-w-[1000px] mx-auto">
        <h3 className="text-2xl font-bold text-white mb-4">
          {questions[currentQuestion].question}
        </h3>
        {questions[currentQuestion].options.map((option, index) => (
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
            onClick={handleGoBack}
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