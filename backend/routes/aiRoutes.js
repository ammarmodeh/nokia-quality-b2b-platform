import express from "express";
import { generateInsights, handleChat, analyzeChartData, deepWeeklyAnalysis, generateReportFile, getReportHistory, analyzeTrendData } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js"; // Assuming you have auth middleware

const router = express.Router();

router.post("/insights", protect, generateInsights);
router.post("/chat", protect, handleChat);
router.post("/analyze-chart", protect, analyzeChartData);

router.post("/report/download", protect, generateReportFile);
router.post("/deep-weekly-analysis", protect, deepWeeklyAnalysis);

router.post("/analyze-trend", protect, analyzeTrendData);
router.get("/report/history", protect, getReportHistory);

export default router;
