import { getAllQuestions, addQuestion, updateQuestion, deleteQuestion, reorderQuestions } from '../controllers/quizControllers.js';
import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Fetch all quiz questions
router.get('/questions', getAllQuestions);

// Add a new question
router.post('/', protect, adminOnly, addQuestion);

// Reorder questions
router.put('/reorder', protect, adminOnly, reorderQuestions);

// Update an existing question
router.put('/:id', protect, adminOnly, updateQuestion);

// Delete a question
router.delete('/:id', protect, adminOnly, deleteQuestion);

export default router;