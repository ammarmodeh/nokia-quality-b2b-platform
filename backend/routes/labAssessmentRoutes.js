import express from "express";
import {
  createAssessment,
  getAllAssessments,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  getAssessmentsByTeam,
} from "../controllers/labAssessmentControllers.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, createAssessment).get(protect, getAllAssessments);
router.route("/team/:teamId").get(protect, getAssessmentsByTeam);
router
  .route("/:id")
  .get(protect, getAssessmentById)
  .put(protect, updateAssessment)
  .delete(protect, deleteAssessment);

export default router;
