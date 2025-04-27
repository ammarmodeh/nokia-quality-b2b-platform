import mongoose from 'mongoose';

const quizResultSchema = new mongoose.Schema({
  teamId: {
    type: String,
    required: true
  },
  teamName: {
    type: String,
    required: true
  },
  quizCode: {
    type: String,
    required: true
  },
  score: {
    type: String,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  userAnswers: [{
    question: String,
    options: [String],
    correctAnswer: String,
    selectedAnswer: String,
    isCorrect: Boolean,
    category: String // Add this line to include the category
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

export default QuizResult;