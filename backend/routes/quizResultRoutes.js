import express from 'express';
import { getAllTeams, getQuizResultById, getQuizResults, saveQuizResults, updateEssayScore, getTeamsEvaluation, deleteQuizResult } from '../controllers/quizResultControllers.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Save quiz results
router.post('/', saveQuizResults);

// Get quiz results
router.get('/', getQuizResults);

// Get specific quiz result
router.get('/:id', getQuizResultById);

// Update essay question score
router.patch('/:id/score', updateEssayScore);

// Get all teams
router.get('/teams/all', getAllTeams);

router.get('/teams/evaluation', getTeamsEvaluation);

// Delete quiz result
router.delete('/:id', protect, adminOnly, deleteQuizResult);

export default router;