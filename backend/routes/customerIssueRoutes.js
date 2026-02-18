import express from 'express';
const router = express.Router();
import { createIssue, deleteIssue, getAllIssues, getIssueById, updateIssue, getIssueLogs } from '../controllers/customerIssueController.js';
import { protect } from '../middleware/authMiddleware.js';


// Protect all routes with authentication
router.use(protect);

// Get logs for customer issues
router.get('/logs', getIssueLogs);

// Create a new customer issue
router.post('/', createIssue);

// Get all customer issues
router.get('/', getAllIssues);
router.get('/get-all-issues', getAllIssues);

// Get single issue
router.get('/:id', getIssueById);

// Update an issue
router.put('/:id', updateIssue);

// Delete an issue
router.delete('/:id', deleteIssue);

export default router;