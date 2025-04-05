import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createSuggestion, deleteSuggestion, getSuggestionDetails, getSuggestions, getUserSuggestions, markResponseAsRead, markSuggestionAsRead, updateSuggestionStatus } from "../controllers/suggestionsControllers.js";

const router = express.Router();

// Public routes
// None - all suggestion routes require authentication

// User routes
router.route("/")
  .post(protect, createSuggestion);

router.route("/user")
  .get(protect, getUserSuggestions);

// Admin routes
router.route("/")
  .get(protect, getSuggestions);

router.route("/:id")
  .get(protect, getSuggestionDetails)
  .put(protect, updateSuggestionStatus)
  .delete(protect, deleteSuggestion);

router.route("/:id/mark-read")
  .patch(protect, markSuggestionAsRead);

router.route("/:id/mark-response-read")
  .patch(protect, markResponseAsRead);

export default router;