import { useState, useEffect } from 'react';
import api from '../api/api';
import { Timer } from '../components/Timer';
import { QRCodeSVG } from 'qrcode.react';

const Quiz = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [userAnswers, setUserAnswers] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizCode, setQuizCode] = useState('');
  const [quizStarted, setQuizStarted] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    if (quizStarted) {
      api.get('/quiz/questions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })
        .then((response) => setQuestions(response.data))
        .catch((err) => console.log(err));
    }
  }, [quizStarted]);

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
      setIsSubmitted(true);
      submitScore(updatedScore);
    }
  };

  const handleGoBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prevQuestion) => prevQuestion - 1);
      setSelectedOption(userAnswers[currentQuestion - 1]?.selectedAnswer || '');
    }
  };

  const submitScore = (finalScore) => {
    const unansweredQuestions = questions.length - (currentQuestion + 1);
    finalScore += 0 * unansweredQuestions;

    const percentage = Math.round((finalScore / questions.length) * 100);
    const result = `${finalScore}/${questions.length} ${percentage}%`;

    console.log('Final Result Before Submission:', result);

    api.post(
      '/field-teams/update-score',
      {
        quizCode,
        score: result,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      }
    )
      .then((response) => {
        console.log('Score updated in backend:', response.data);
        setIsSubmitted(true);
      })
      .catch((err) => console.log(err));
  };

  const handleCheckCode = () => {
    api.get(`/field-teams/get-team-by-quiz-code/${quizCode}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    })
      .then((response) => {
        if (response.data) {
          setTeamName(response.data.teamName);
          setIsCodeValid(true);
        } else {
          alert('الكود غير صحيح. يرجى المحاولة مرة أخرى.');
        }
      })
      .catch((err) => {
        console.error('Error fetching team:', err);
        alert('الكود غير صحيح. يرجى المحاولة مرة أخرى.');
      });
  };

  const handleStartQuiz = () => {
    if (isCodeValid) {
      setQuizStarted(true);
    } else {
      alert('يرجى التحقق من الكود أولاً.');
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

  if (!quizStarted) {
    return (
      <div className="p-4 bg-[#121212] min-h-screen flex flex-col items-center justify-center text-white" dir="rtl">
        <input
          type="text"
          placeholder="أدخل رقم الكود الخاص بالفريق الفني"
          value={quizCode}
          onChange={(e) => setQuizCode(e.target.value)}
          className="p-2 mb-4 bg-[#1e1e1e] text-white rounded border border-[#444] focus:border-[#3ea6ff] focus:outline-none w-full max-w-[300px]"
        />
        <button
          className="bg-[#3ea6ff] text-white px-4 py-2 rounded hover:bg-[#1d4ed8]"
          onClick={handleCheckCode}
        >
          التحقق من الكود
        </button>
        {isCodeValid && (
          <div className="mt-4 text-center">
            <p className="text-gray-400 mb-2">إسم الفريق: {teamName}</p>
            <button
              className="bg-[#3ea6ff] text-white px-4 py-2 rounded hover:bg-[#1d4ed8]"
              onClick={handleStartQuiz}
            >
              بدء الاختبار
            </button>
          </div>
        )}
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
          {/* <button
            className="bg-[#4caf50] text-white px-4 py-2 rounded hover:bg-[#388e3c]"
            onClick={() => setShowAnswers(!showAnswers)}
          >
            {showAnswers ? "إخفاء" : "عرض"} الإجابات
          </button> */}
        </div>
        {showAnswers && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-white mb-3">الإجابات:</h4>
            {questions.map((q, index) => (
              <div key={index} className="mb-4">
                <p className="font-medium text-gray-300">{q.question}</p>
                <p className="text-green-400">الإجابة الصحيحة: {q.correctAnswer}</p>
                <p className={`${userAnswers[index]?.isCorrect ? "text-blue-400" : "text-red-400"}`}>
                  إجابتك: {userAnswers[index]?.selectedAnswer || "لم يتم اختيار إجابة"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="p-4 bg-[#121212] min-h-screen flex items-center justify-center text-white" dir="rtl">جار التحميل...</div>;
  }

  return (
    <div className="p-4 bg-[#121212] min-h-screen" dir="rtl">
      <Timer timeLimit={300} onTimeUp={() => submitScore(score)} />
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