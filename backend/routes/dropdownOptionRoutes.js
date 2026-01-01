import express from "express";
import {
  getAllOptions,
  getOptionsByCategory,
  addOption,
  updateOption,
  deleteOption,
  seedOptions,
} from "../controllers/dropdownOptionControllers.js";

const router = express.Router();

// Public/User routes (GET only)
router.get("/all", getAllOptions);
router.get("/category/:category", getOptionsByCategory);

// Admin routes (CRUD + Seed)
router.post("/add", addOption);
router.patch("/update/:id", updateOption);
router.delete("/delete/:id", deleteOption);
router.post("/seed", seedOptions);

export default router;
