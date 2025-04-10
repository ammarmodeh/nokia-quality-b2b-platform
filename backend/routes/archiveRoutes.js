import express from 'express';
import { addArchive, getAllArchives, restoreFromArchive } from '../controllers/archiveControllers.js';

const router = express.Router();

// Get All trashes
router.get('/get-all-archives', getAllArchives);

// Fetch all quiz questions
router.post('/add-archive', addArchive);

router.post('/:id/restore', restoreFromArchive);

// Delete a task from trash (permanently)
// router.delete('/delete-archive/:id', deleteTaskPermanently);

export default router;