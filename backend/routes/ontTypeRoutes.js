import express from "express";
import { createONTType, getONTTypes, deleteONTType } from "../controllers/ontTypeControllers.js";
import { protect, adminOnly as admin } from "../middleware/authMiddleware.js"; // Assuming auth middleware exists

const router = express.Router();

router.route("/").post(protect, admin, createONTType).get(protect, getONTTypes);
router.route("/:id").delete(protect, admin, deleteONTType);

export default router;
