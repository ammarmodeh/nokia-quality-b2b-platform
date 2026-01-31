import { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate, useBlocker } from 'react-router-dom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Box,
    Typography
} from '@mui/material';
import api from '../api/api';
import { Timer } from '../components/Timer';

const IQQuiz = () => {
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
        teamCode: '',
        teamId: '',
        loading: true,
        error: null,
        hasSubmitted: false
    });

    const [settings, setSettings] = useState(null);
    const answersRef = useRef([]);

    // Navigation Blocker (English)
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            !quizState.hasSubmitted && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        answersRef.current = quizState.userAnswers;
    }, [quizState.userAnswers]);

    useEffect(() => {
        // Security measures
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

        // Load IQ quiz data
        const authData = locationState?.fieldTeamAuth ||
            JSON.parse(sessionStorage.getItem('fieldTeamAuth'));

        if (!authData) {
            setQuizState(prev => ({ ...prev, error: 'Unauthorized Access', loading: false }));
            return;
        }

        setQuizState(prev => ({
            ...prev,
            teamId: authData.teamId,
            teamName: authData.teamName,
            teamCompany: authData.teamCompany,
            quizCode: authData.quizCode,
            teamCode: authData.teamCode,
            loading: false
        }));

        const loadQuestions = async () => {
            try {
                const [questionsRes, settingsRes] = await Promise.all([
                    api.get('/quiz/questions?quizType=IQ'),
                    api.get('/settings')
                ]);

                const responseData = questionsRes.data;
                setSettings(settingsRes.data);

                const savedProgress = JSON.parse(sessionStorage.getItem('iqQuizProgress') || '{}');

                const initialUserAnswers = responseData.map((question, index) => {
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
                    questions: responseData,
                    userAnswers: initialUserAnswers,
                    currentQuestion: savedProgress.currentQuestion || 0,
                    selectedOption: initialUserAnswers[savedProgress.currentQuestion || 0]?.selectedAnswer || '',
                    essayAnswer: initialUserAnswers[savedProgress.currentQuestion || 0]?.essayAnswer || ''
                }));
            } catch (err) {
                setQuizState(prev => ({ ...prev, error: 'Failed to load questions or settings' }));
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
            sessionStorage.setItem('iqQuizProgress', JSON.stringify({
                currentQuestion: quizState.currentQuestion,
                userAnswers: quizState.userAnswers
            }));
        }
        if (quizState.hasSubmitted) {
            sessionStorage.removeItem('iqQuizProgress');
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
            const unansweredCount = userAnswers.filter((a, i) => {
                const q = questions[i];
                if (q.type === 'essay') return !a.essayAnswer;
                return !a.selectedAnswer;
            }).length;

            let message = 'Are you sure you want to finish the IQ Test? You cannot go back after submitting.';
            if (unansweredCount > 0) {
                message = `You have ${unansweredCount} unanswered questions. Are you sure you want to finish the IQ Test?`;
            }

            const confirmSubmit = window.confirm(message);
            if (confirmSubmit) {
                submitScore(userAnswers);
            }
        }
    };

    const submitScore = async (userAnswers) => {
        if (quizState.hasSubmitted) return;
        setQuizState(prev => ({ ...prev, hasSubmitted: true }));

        // Calculate score: 2 points for correct MCQ, essay initialized to 0
        const finalScore = userAnswers.reduce((score, answer, index) => {
            if (quizState.questions[index].type === 'essay') return score;
            return answer.isCorrect ? score + 2 : score;
        }, 0);

        const totalQuestionsCount = quizState.questions.length;
        const maxScore = totalQuestionsCount * 2;
        const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;
        const result = `${percentage}/100`;

        const resultsData = {
            teamId: quizState.teamId,
            teamName: quizState.teamName,
            teamCompany: quizState.teamCompany,
            quizCode: quizState.quizCode,
            teamCode: quizState.teamCode,
            correctAnswers: finalScore,
            totalQuestions: totalQuestionsCount,
            quizType: 'IQ',
            userAnswers: userAnswers.map((answer, index) => ({
                question: quizState.questions[index].question,
                options: quizState.questions[index].options,
                correctAnswer: quizState.questions[index].correctAnswer,
                selectedAnswer: answer.selectedAnswer,
                essayAnswer: answer.essayAnswer,
                score: answer.score || 0,
                isScored: quizState.questions[index].type === 'options',
                isCorrect: answer.isCorrect,
                category: quizState.questions[index].category,
                type: quizState.questions[index].type || 'options'
            })),
            questions: quizState.questions,
            percentage,
            score: result
        };

        const clearQuizSession = () => {
            sessionStorage.removeItem('iqQuizProgress');
            sessionStorage.removeItem('quizTimer');
            sessionStorage.removeItem('quizInProgress');
            sessionStorage.removeItem('fieldTeamAuth');
        };

        try {
            await api.post('/quiz-results', resultsData);
            localStorage.setItem('quizResultsFallback', JSON.stringify({
                ...resultsData,
                isFieldTeam: true
            }));
            clearQuizSession();
            navigate('/quiz-results', {
                state: {
                    quizResults: resultsData,
                    isFieldTeam: true
                },
                replace: true
            });
        } catch (error) {
            console.error('Error saving IQ results:', error);
            sessionStorage.setItem('quizResultsFallback', JSON.stringify({
                ...resultsData,
                isFieldTeam: true
            }));
            clearQuizSession();
            navigate('/quiz-results', {
                state: {
                    quizResults: resultsData,
                    isFieldTeam: true
                },
                replace: true
            });
        }
    };

    if (quizState.error) {
        return <Navigate to="/fieldteam-login" replace />;
    }

    if (quizState.loading || quizState.questions.length === 0 || !settings) {
        return (
            <div className="p-4 bg-[#f9fafb] min-h-screen flex items-center justify-center text-white" dir="ltr">
                Loading...
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
            dir="ltr"
            style={{
                ...quizStyles,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="max-w-3xl mx-auto w-full mb-4">
                <div className="flex justify-between items-center py-3 border-b-2 border-white">
                    <div className="flex items-center gap-4">
                        <div>
                            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Team</span>
                            <h2 className="text-lg font-black text-white leading-none uppercase">{teamName}</h2>
                        </div>
                        <div className="bg-white px-2 py-0.5 ml-2">
                            <span className="text-[10px] text-black font-black uppercase">IQ Test</span>
                        </div>
                    </div>
                    <Timer
                        teamId={quizState.teamId}
                        timeLimit={(settings?.globalTimer || 60) * 60}
                        onTimeUp={() => {
                            if (!quizState.hasSubmitted) {
                                submitScore(answersRef.current);
                            }
                        }}
                    />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {questions.map((_, idx) => {
                        const isAnswered = userAnswers[idx]?.selectedAnswer || userAnswers[idx]?.essayAnswer;
                        const isCurrent = idx === currentQuestion;
                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    setQuizState(prev => ({
                                        ...prev,
                                        currentQuestion: idx,
                                        selectedOption: prev.userAnswers[idx]?.selectedAnswer || '',
                                        essayAnswer: prev.userAnswers[idx]?.essayAnswer || ''
                                    }));
                                }}
                                className={`
                  w-8 h-8 text-[11px] font-black border-2 transition-all duration-300
                  ${isCurrent ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.5)] scale-110 z-10' :
                                        isAnswered ? 'bg-[#222] text-white border-white/40 hover:border-white' :
                                            'bg-transparent text-white/30 border-white/10 hover:border-white/40'}
                `}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="max-w-3xl mx-auto w-full flex-grow">
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
                    <div className="mt-2 text-[10px] text-gray-500 text-center uppercase tracking-widest">
                        {userAnswers.filter(a => a.selectedAnswer || a.essayAnswer).length} of {questions.length} answered
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto w-full">
                <div className="bg-[#111111] border-2 border-white p-6 md:p-10 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
                    <div className="mb-8">
                        <span className="inline-block px-2 py-0.5 bg-white text-black text-[10px] font-bold uppercase tracking-tighter mb-4">
                            {currentQ.category || 'IQ Question'}
                        </span>
                        <h3 className="text-xl md:text-2xl font-black text-white leading-tight mb-4">
                            {currentQ.question}
                        </h3>
                        {currentQ.questionImage && (
                            <div className="mb-6 rounded-lg overflow-hidden border border-white/20">
                                <img
                                    src={currentQ.questionImage}
                                    alt="Question"
                                    className="w-full max-h-[400px] object-contain bg-black"
                                />
                            </div>
                        )}
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
                      group relative flex flex-col sm:flex-row items-center p-4 border-2 transition-all cursor-pointer gap-4
                      ${selectedOption === option
                                                ? 'bg-white border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]'
                                                : 'bg-transparent border-white/10 hover:border-white'}
                    `}
                                    >
                                        <div className="flex items-center w-full">
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
                                        </div>

                                        {currentQ.optionsImages && currentQ.optionsImages[index] && (
                                            <div className="mt-2 sm:mt-0 sm:ml-auto shrink-0">
                                                <img
                                                    src={currentQ.optionsImages[index]}
                                                    alt={`Option ${index + 1}`}
                                                    className="max-h-[120px] max-w-full sm:max-w-[150px] rounded border border-gray-500 object-cover"
                                                />
                                            </div>
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center mt-10 pt-6 border-t border-white/10">
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
                            <span className="text-lg">←</span>
                            <span>Back</span>
                        </button>

                        <button
                            className="px-6 py-3 bg-white text-black font-black uppercase text-sm tracking-widest hover:bg-gray-200 transition-colors flex items-center gap-2 group shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] active:translate-y-0.5 active:shadow-none font-bold"
                            onClick={handleSubmit}
                        >
                            <span>{currentQuestion === questions.length - 1 ? "Finish Test" : "Next Question"}</span>
                            <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                    </div>
                </div>
            </div>
            <Dialog
                open={blocker.state === "blocked"}
                onClose={() => blocker.reset && blocker.reset()}
                PaperProps={{
                    sx: {
                        bgcolor: '#111',
                        color: 'white',
                        border: '2px solid white',
                        borderRadius: 0,
                        boxShadow: '8px 8px 0px 0px rgba(255,255,255,1)',
                        minWidth: '320px'
                    }
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: '900', textTransform: 'uppercase' }}>
                    Leave IQ Test?
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Are you sure you want to leave the IQ Test? Your unsaved progress will be lost.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 2 }}>
                    <Button
                        onClick={() => blocker.reset && blocker.reset()}
                        sx={{
                            color: 'white',
                            fontWeight: 'bold',
                            border: '1px solid rgba(255,255,255,0.2)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                        }}
                    >
                        Stay
                    </Button>
                    <Button
                        onClick={() => blocker.proceed && blocker.proceed()}
                        sx={{
                            bgcolor: 'white',
                            color: 'black',
                            fontWeight: 'bold',
                            '&:hover': { bgcolor: '#eee' }
                        }}
                    >
                        Leave
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default IQQuiz;
