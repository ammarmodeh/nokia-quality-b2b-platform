import express from "express";
import {
  uploadDetractors,
  getDetractors,
  getUploadHistory,
  getDetractorsByBatch,
  updateDetractor,
  deleteDetractor,
  createDetractor,
  deleteBatchColumn,
  deleteBatch,
  checkDuplicates,
  getAnalyticsOverview,
  getTeamViolations,
  getTrendAnalysis,
  getRootCauseAnalysis
} from "../controllers/detractorController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/upload", protect, adminOnly, uploadDetractors);
router.get("/", protect, getDetractors);

// New Management Routes
router.get("/history", protect, getUploadHistory);
router.get("/batch/:fileName", protect, getDetractorsByBatch);
router.post("/create", protect, adminOnly, createDetractor);
router.put("/:id", protect, adminOnly, updateDetractor);
router.delete("/:id", protect, adminOnly, deleteDetractor);
router.delete("/batch/:fileName/column/:columnName", protect, adminOnly, deleteBatchColumn);
router.delete("/batch/:fileName", protect, adminOnly, deleteBatch);
router.post("/check-duplicates", protect, adminOnly, checkDuplicates);

// Analytics Routes
router.get("/analytics/overview", protect, getAnalyticsOverview);
router.get("/analytics/team-violations", protect, getTeamViolations);
router.get("/analytics/trends", protect, getTrendAnalysis);
router.get("/analytics/root-cause", protect, getRootCauseAnalysis);

export default router;
