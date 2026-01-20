import express from "express";
import {
  registerAuditUser,
  loginAuditUser,
  logoutAuditUser,
  uploadTasks,
  getAllTasks,
  assignTask,
  deleteTask,
  getMyTasks,
  getTaskBySlid,
  updateTaskChecklist,
  submitTask,
  uploadTaskPhoto,
  deleteTaskPhoto,
  createManualTask,
  getAuditorStats,
  deleteAuditUser,
  updateAuditUser,
  toggleTaskVisibility,
  rescheduleTask,
  checkSlid
} from "../controllers/fieldAuditController.js";

import multer from "multer";
import path from "path";
import fs from "fs";

// --- MULTER SETUP ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/audit-photos';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Naming convention: SLID-USERID-TIMESTAMP
    // Pass taskId in body or params ideally, accessing it here is tricky without parsing body first
    // Simplify: file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    // Detailed naming can be enforced by renaming after save or strictly passing params
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const router = express.Router();

// Public / Auth
router.post("/login", loginAuditUser);
router.post("/logout", logoutAuditUser);

// Protected Routes (Audit Team)
// Note: Middleware 'protectAudit' needs to be implemented or reused
// For rapid dev, I'll define a simple middleware here or inline if standard one doesn't fit 'FieldAuditUser'

import jwt from "jsonwebtoken";
import { FieldAuditUser } from "../models/fieldAuditUser.js";
import { UserSchema as User } from "../models/userModel.js";

const protectAuditor = async (req, res, next) => {
  let token;
  token = req.cookies.jwt;

  // Also check header for mobile
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token && token !== "undefined" && token !== "null") {
    try {
      // Basic sanity check to avoid malformed errors if cookie is messed up
      if (typeof token !== 'string' || token.split('.').length !== 3) {
        console.error("Malformed Token detected:", token);
        return res.status(401).json({ message: "Not authorized, malformed token" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Try finding in FieldAuditUser first
      let user = await FieldAuditUser.findById(decoded.id).select("-password");

      // If not found, try the main User model (for Admin bypass)
      if (!user) {
        user = await User.findById(decoded.id).select("-password");
      }

      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      if (user.isActive === false) {
        return res.status(401).json({ message: "Not authorized, account is deactivated" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("JWT Verification Error:", error.message);
      res.status(401).json({ message: `Not authorized, token failed: ${error.message}` });
    }
  } else {
    // If we're here, it means token was missing or literally the string "undefined"/"null"
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "Admin") {
    next();
  } else {
    res.status(401).json({ message: "Not authorized as admin" });
  }
};


// Auditors
router.get("/my-tasks", protectAuditor, getMyTasks);
router.get("/tasks/:slid", protectAuditor, getTaskBySlid);
router.put("/tasks/:taskId/checklist", protectAuditor, updateTaskChecklist);
router.put("/tasks/:taskId/submit", protectAuditor, submitTask);
router.post("/tasks/:taskId/photo", protectAuditor, upload.single("image"), uploadTaskPhoto);
router.delete("/tasks/:taskId/photo/:photoId", protectAuditor, deleteTaskPhoto);

// Admin
router.post("/register", protectAuditor, adminOnly, registerAuditUser); // Admin creates users
router.post("/upload-tasks", protectAuditor, adminOnly, uploadTasks);
router.post("/manual-task", protectAuditor, adminOnly, createManualTask);
router.get("/all-tasks", protectAuditor, adminOnly, getAllTasks);
router.get("/stats", protectAuditor, adminOnly, getAuditorStats);
router.put("/tasks/:taskId/assign", protectAuditor, adminOnly, assignTask);
router.put("/tasks/:taskId/reschedule", protectAuditor, adminOnly, rescheduleTask);
router.put("/tasks/:taskId/visibility", protectAuditor, adminOnly, toggleTaskVisibility);
router.delete("/tasks/:id", protectAuditor, adminOnly, deleteTask);
router.put("/users/:id", protectAuditor, adminOnly, updateAuditUser);
router.delete("/users/:id", protectAuditor, adminOnly, deleteAuditUser);
router.get("/check-slid/:slid", protectAuditor, adminOnly, checkSlid);

export default router;
