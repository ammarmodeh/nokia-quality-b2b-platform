import express from "express";
import { generateInsights, handleChat, analyzeChartData, deepWeeklyAnalysis } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js"; // Assuming you have auth middleware

const router = express.Router();

router.post("/insights", protect, generateInsights);
router.post("/chat", protect, handleChat);
router.post("/analyze-chart", protect, analyzeChartData);
router.post("/deep-weekly-analysis", protect, deepWeeklyAnalysis);// ← NEW

export default router;
