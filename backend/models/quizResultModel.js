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
  teamCompany: {
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
    question: {
      type: String,
      required: true
    },
    options: [String], // Optional, only for options-type questions
    correctAnswer: String, // Optional, only for options-type questions
    selectedAnswer: String, // Optional, only for options-type questions
    essayAnswer: String, // Optional, for essay-type questions
    score: {
      type: Number,
      default: 0 // Default score of 0 for essay questions
    },
    isCorrect: Boolean, // Optional, only for options-type questions
    isScored: {
      type: Boolean,
      default: false
    },
    category: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['options', 'essay'],
      default: 'options' // Default to options for backward compatibility
    }
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

export default QuizResult;