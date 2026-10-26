import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getTeamTrends } from "../controllers/teamTrendsController.js";

const router = express.Router();
router.use(protect);

// Worst-performing teams by accountable DVOC for a period (Teams → Trends).
router.get("/", getTeamTrends);

export default router;
