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
  checkSlid,
  previewTaskAssignments
} from "../controllers/fieldAuditController.js";

import multer from "multer";
import path from "path";
import fs from "fs";

// --- AWS S3 SETUP ---
import { S3Client } from "@aws-sdk/client-s3";
import multerS3 from "multer-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET || "missing-bucket-name", // Fallback to prevent immediate crash
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      // Access metadata sent from frontend. 
      // Note: These must be appended to FormData BEFORE the image file.
      const auditorName = req.body.auditorName || "Auditor";
      const slid = req.body.slid || "UnknownSLID";
      const checkpointName = req.body.checkpointName || "Checkpoint";
      const scheduledDate = req.body.scheduledDate || new Date().toISOString();
      const actualName = req.body.actualName || "image";

      // Sanitize for S3 (remove spaces, etc)
      const cleanAuditor = auditorName.replace(/[^a-z0-9]/gi, '_');
      const cleanSlid = slid.replace(/[^a-z0-9]/gi, '_');
      const cleanCheckpoint = checkpointName.replace(/[^a-z0-9]/gi, '_');
      const cleanDate = scheduledDate.split('T')[0];
      const cleanActualName = actualName.replace(/[^a-z0-9]/gi, '_');

      // Convention: [actualName]-[slid]-[checkpointName]-[auditorName]-[submittedDate]-[timestamp]
      const fileName = `${cleanActualName}-${cleanSlid}-${cleanCheckpoint}-${cleanAuditor}-${cleanDate}-${Date.now()}${path.extname(file.originalname)}`;
      const fullPath = `${cleanAuditor}/${cleanSlid}/${fileName}`;

      cb(null, fullPath);
    },
  }),
});

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
router.post("/tasks/:taskId/photo", protectAuditor, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("[Multer/S3 Error]:", err);
      return res.status(500).json({
        message: "S3 Upload Failed",
        error: err.message,
        code: err.code || err.name
      });
    }
    next();
  });
}, uploadTaskPhoto);
router.delete("/tasks/:taskId/photo/:photoId", protectAuditor, deleteTaskPhoto);

// Admin
router.post("/register", protectAuditor, adminOnly, registerAuditUser); // Admin creates users
router.post("/upload-tasks", protectAuditor, adminOnly, uploadTasks);
router.post("/preview-assignments", protectAuditor, adminOnly, previewTaskAssignments);
router.post("/manual-task", protectAuditor, adminOnly, createManualTask);
router.get("/tasks-list", protectAuditor, adminOnly, getAllTasks);
router.get("/stats", protectAuditor, adminOnly, getAuditorStats);
router.put("/tasks/:taskId/assign", protectAuditor, adminOnly, assignTask);
router.put("/tasks/:taskId/reschedule", protectAuditor, adminOnly, rescheduleTask);
router.put("/tasks/:taskId/visibility", protectAuditor, adminOnly, toggleTaskVisibility);
router.delete("/tasks/:id", protectAuditor, adminOnly, deleteTask);
router.put("/users/:id", protectAuditor, adminOnly, updateAuditUser);
router.delete("/users/:id", protectAuditor, adminOnly, deleteAuditUser);
router.get("/check-slid/:slid", protectAuditor, adminOnly, checkSlid);

export default router;
