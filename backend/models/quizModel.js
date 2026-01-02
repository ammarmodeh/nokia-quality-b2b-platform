import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
  category: { type: String, default: 'General' },
  type: { type: String, enum: ['options', 'essay'], default: 'options' },
  guideline: { type: String }
});

export const QuizSchema = mongoose.model('Quiz', quizSchema);