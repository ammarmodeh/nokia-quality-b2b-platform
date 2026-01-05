import { getAllQuestions, addQuestion, updateQuestion, deleteQuestion, reorderQuestions } from '../controllers/quizControllers.js';
import express from 'express';

const router = express.Router();

// Fetch all quiz questions
router.get('/questions', getAllQuestions);

// Add a new question
router.post('/', addQuestion);

// Reorder questions
router.put('/reorder', reorderQuestions);

// Update an existing question
router.put('/:id', updateQuestion);

// Delete a question
router.delete('/:id', deleteQuestion);

export default router;