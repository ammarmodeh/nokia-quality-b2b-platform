import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  question: { type: String, required: true },
  questionImage: { type: String }, // Base64 string for question image
  options: { type: [String], required: true },
  optionsImages: { type: [String], default: [] }, // Array of Base64 strings corresponding to options
  correctAnswer: { type: String, required: true },
  category: { type: String },
  type: { type: String, enum: ['options', 'essay'], default: 'options' },
  guideline: { type: String },
  order: { type: Number, default: 0 },
  quizType: { type: String, enum: ['Performance', 'IQ'], default: 'Performance' }
});

export const QuizSchema = mongoose.model('Quiz', quizSchema);