import express from 'express';
import { addToTrash, deletePermanently, emptyTrash, getTrashItems, restoreFromTrash } from '../controllers/trashControllers.js';


const router = express.Router();

router.route('/')
  .get(getTrashItems) // Get all trash items
  .delete(emptyTrash); // Empty entire trash

router.route('/add-trash')
  .post(addToTrash); // Add task to trash without authentication

router.route('/:id')
  .delete(deletePermanently); // Delete single item

router.route('/:id/restore')
  .post(restoreFromTrash);   // Restore single item

export default router;
