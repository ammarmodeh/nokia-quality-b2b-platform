import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { importEntities, importRows } from "../controllers/importController.js";

const router = express.Router();

// Bulk imports are admin-only; every row goes through the normal controllers.
router.get("/entities", protect, adminOnly, importEntities);
router.post("/:entity", protect, adminOnly, importRows);

export default router;
