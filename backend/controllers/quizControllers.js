import { QuizSchema } from "../models/quizModel.js";


// Get All questions
export const getAllQuestions = async (req, res) => {
  try {
    const questions = await QuizSchema.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add a new question
export const addQuestion = async (req, res) => {
  const { question, options, correctAnswer } = req.body;
  const newQuestion = new QuizSchema({
    question,
    options,
    correctAnswer
  });

  try {
    const savedQuestion = await newQuestion.save();
    res.status(201).json(savedQuestion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update a question
export const updateQuestion = async (req, res) => {
  try {
    const updatedQuestion = await QuizSchema.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedQuestion) return res.status(404).json({ message: 'Question not found' });
    res.json(updatedQuestion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a question
export const deleteQuestion = async (req, res) => {
  try {
    const deletedQuestion = await QuizSchema.findByIdAndDelete(req.params.id);
    if (!deletedQuestion) return res.status(404).json({ message: 'Question not found' });
    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};