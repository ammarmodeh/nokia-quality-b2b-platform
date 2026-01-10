import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addDoc, deleteDoc, getDocs, updateDoc } from "../controllers/docController.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(path.resolve(), 'uploads');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.route("/").get(getDocs);
router.route("/add").post(protect, addDoc);
router.route("/:id").delete(protect, deleteDoc).put(protect, updateDoc);

export default router;
