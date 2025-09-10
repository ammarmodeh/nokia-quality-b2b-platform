import express from 'express';
import { getAllTeams, getQuizResultById, getQuizResults, saveQuizResults, updateEssayScore, getTeamsEvaluation } from '../controllers/quizResultControllers.js';

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

export default router;