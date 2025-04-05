import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { addPolicy, deletePolicy, getAllPolicies, getPolicyNotifications, getPolicytStatus, markPolicyAsRead, markPolicyResponseAsRead, updatePolicy } from '../controllers/policyControllers.js';

const router = express.Router();

// Store policy action
router.post('/add-policy', protect, addPolicy);

router.get('/get-all-policies', protect, getAllPolicies);

router.get('/agreement-status', protect, getPolicytStatus);

router.put('/update-policy/:id', protect, updatePolicy);

// Delete Policy
router.delete('/delete-policy/:id', protect, deletePolicy); // Add the delete route

router.route("/:id/mark-read")
  .patch(protect, markPolicyAsRead);

router.route("/:id/mark-response-read")
  .patch(protect, markPolicyResponseAsRead);

router.route("/notifications")
  .get(protect, getPolicyNotifications);

export default router;