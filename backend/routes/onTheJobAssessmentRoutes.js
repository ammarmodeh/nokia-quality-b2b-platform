import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createAssessment, deleteAssessment, getAllAssessments, getAssessmentById, getAssessmentsByFieldTeam, getAssessmentStatistics, updateAssessment } from "../controllers/onTheJobAssessmentController.js";

const router = express.Router();

router.post("/", protect, createAssessment);
router.get("/", protect, getAllAssessments);
router.get("/stats", protect, getAssessmentStatistics);
router.get("/field-team/:fieldTeamId", protect, getAssessmentsByFieldTeam);
router.get("/:id", protect, getAssessmentById);
router.put("/:id", protect, updateAssessment);
router.delete("/:id", protect, deleteAssessment);

export default router;