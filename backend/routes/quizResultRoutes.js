import express from 'express';
import { getQuizResultById, getQuizResults, saveQuizResults } from '../controllers/quizResultControllers.js';

const router = express.Router();

// Save quiz results (used by the quiz component)
router.post('/', saveQuizResults);

// Get quiz results (admin protected)
router.get('/', getQuizResults);

// Get specific quiz result (admin protected)
router.get('/:id', getQuizResultById);

export default router;