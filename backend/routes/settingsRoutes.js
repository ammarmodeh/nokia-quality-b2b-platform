import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsControllers.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get settings - Public (Authenticated users can view, but also needed for login page)
router.get("/", getSettings);

// Update settings - Admin only
router.put("/", protect, adminOnly, updateSettings);

export default router;
