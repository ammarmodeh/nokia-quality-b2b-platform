import express from 'express';
import { getAllTeams, getQuizResultById, getQuizResults, saveQuizResults } from '../controllers/quizResultControllers.js';

const router = express.Router();

// Save quiz results (used by the quiz component)
router.post('/', saveQuizResults);

// Get quiz results
router.get('/', getQuizResults);

// Get specific quiz result
router.get('/:id', getQuizResultById);

// Add this route
router.get('/teams/all', getAllTeams);

export default router;