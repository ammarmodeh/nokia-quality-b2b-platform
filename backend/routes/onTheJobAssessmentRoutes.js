// routes/onTheJobAssessmentRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createAssessment,
  deleteAssessment,
  getAllAssessments,
  getAssessmentById,
  getAssessmentsByFieldTeam,
  getAssessmentStatistics,
  updateAssessment,
  softDeleteAssessment,
  restoreAssessment,
  getAssessmentsWithDeleted
} from "../controllers/onTheJobAssessmentController.js";

const router = express.Router();

router.post("/", protect, createAssessment);
router.get("/", protect, getAllAssessments);
router.get("/stats", protect, getAssessmentStatistics);
router.get("/field-team/:fieldTeamId", protect, getAssessmentsByFieldTeam);
router.get("/:id", protect, getAssessmentById);
router.put("/:id", protect, updateAssessment);
router.delete("/:id", protect, deleteAssessment); // Only admin can delete
router.patch("/:id/soft-delete", protect, softDeleteAssessment); // Soft delete
router.patch("/:id/restore", protect, restoreAssessment); // Restore soft deleted
router.get('/with-deleted', protect, getAssessmentsWithDeleted);

export default router;