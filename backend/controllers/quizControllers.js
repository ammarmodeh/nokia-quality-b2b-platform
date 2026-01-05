import { QuizSchema } from "../models/quizModel.js";


// Get All questions
export const getAllQuestions = async (req, res) => {
  try {
    const questions = await QuizSchema.find().sort({ order: 1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add a new question
export const addQuestion = async (req, res) => {
  const { question, questionImage, options, optionsImages, correctAnswer, category, type, guideline } = req.body;
  const newQuestion = new QuizSchema({
    question,
    questionImage,
    options,
    optionsImages,
    correctAnswer,
    category,
    type,
    guideline
  });

  try {
    const count = await QuizSchema.countDocuments();
    newQuestion.order = count;
    const savedQuestion = await newQuestion.save();
    res.status(201).json(savedQuestion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Reorder questions
export const reorderQuestions = async (req, res) => {
  try {
    const { questions } = req.body; // Array of { _id, order }

    // Bulk write for performance
    const bulkOps = questions.map((q) => ({
      updateOne: {
        filter: { _id: q._id },
        update: { $set: { order: q.order } }
      }
    }));

    await QuizSchema.bulkWrite(bulkOps);

    res.json({ message: 'Questions reordered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
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