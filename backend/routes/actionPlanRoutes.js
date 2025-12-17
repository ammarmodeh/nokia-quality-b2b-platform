
import express from "express";
import { generateActionPlan } from "../controllers/actionPlanController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, generateActionPlan);

export default router;
