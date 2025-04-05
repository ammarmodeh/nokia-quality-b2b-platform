import { getAllQuestions } from '../controllers/quizControllers.js';
import express from 'express';

const router = express.Router();

// Fetch all quiz questions
router.get('/questions', getAllQuestions);

export default router;