import express from 'express';
import { addTrash, getAllTrashes, deleteTaskPermanently } from '../controllers/trashControllers.js';

const router = express.Router();

// Get All trashes
router.get('/get-all-trashes', getAllTrashes);

// Fetch all quiz questions
router.post('/add-trash', addTrash);

// Delete a task from trash (permanently)
router.delete('/delete-permanently/:id', deleteTaskPermanently);

export default router;