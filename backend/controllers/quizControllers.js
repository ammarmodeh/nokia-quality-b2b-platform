import { QuizSchema } from "../models/quizModel.js";


// Get All questions
export const getAllQuestions = async (req, res) => {
  try {
    const questions = await QuizSchema.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
} 