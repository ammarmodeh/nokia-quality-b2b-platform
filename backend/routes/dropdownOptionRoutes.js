import express from "express";
import {
  getAllOptions,
  getOptionsByCategory,
  addOption,
  updateOption,
  deleteOption,
  reorderOptions,
  seedOptions,
  getRcaUsage,
  bulkAddOptions,
  orderByUsage,
} from "../controllers/dropdownOptionControllers.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public/User routes (GET only)
router.get("/all", getAllOptions);
router.get("/category/:category", getOptionsByCategory);

// Admin routes (CRUD + Seed)
// adding a value stays open to signed-in users (forms save new supervisor names); the rest is admin-only
router.post("/add", protect, addOption);
router.patch("/update/:id", protect, adminOnly, updateOption);
router.delete("/delete/:id", protect, adminOnly, deleteOption);
router.put("/reorder", protect, adminOnly, reorderOptions);
router.post("/seed", protect, adminOnly, seedOptions);
// Fill RCA lists from what tasks actually use (reviewed and confirmed in Dropdown Management)
router.get("/usage/:category", protect, adminOnly, getRcaUsage);
router.post("/bulk-add", protect, adminOnly, bulkAddOptions);
router.post("/order-by-usage/:category", protect, adminOnly, orderByUsage);

export default router;
