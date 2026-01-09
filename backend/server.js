import express from "express";
import compression from "compression";
import cors from "cors";
import { connectDB } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import favouriteRoutes from "./routes/favouriteRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import quizResultRoutes from "./routes/quizResultRoutes.js";
import trashRoutes from "./routes/trashRoutes.js";
import archiveRoutes from "./routes/archiveRoutes.js";
import fieldTeamsRoutes from "./routes/fieldTeamsRoutes.js";
import policyRoutes from "./routes/policyRoutes.js";
import suggestionsRoutes from "./routes/suggestionsRoutes.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import customerIssueRoutes from "./routes/customerIssueRoutes.js";
import onTheJobAssessmentRoutes from "./routes/onTheJobAssessmentRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import detractorRoutes from "./routes/detractorRoutes.js";
import samplesTokenRoutes from "./routes/samplesTokenRoutes.js";
import actionPlanRoutes from "./routes/actionPlanRoutes.js";
import dropdownOptionRoutes from "./routes/dropdownOptionRoutes.js";
import ontTypeRoutes from "./routes/ontTypeRoutes.js";
import labAssessmentRoutes from "./routes/labAssessmentRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";


dotenv.config();

console.log('process.env.FRONTEND_URL:', process.env.FRONTEND_URL);

const app = express();

app.use(compression());

// ------------------------------------------------------------------
// Request Logging Middleware
// ------------------------------------------------------------------
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.originalUrl} | Origin: ${req.headers.origin}`);
  next();
});

// ------------------------------------------------------------------
// CORS configuration
// ------------------------------------------------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL, // e.g. https://nokia-quality-b2b-platform.vercel.app
  "https://nokia-quality-b2b-platform-bfrq.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked Origin: ${origin}`);
      // For debugging, you might temporarily allow all:
      // callback(null, true);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Explicitly handle pre-flight OPTIONS requests
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// ------------------------------------------------------------------
// Database connection
// ------------------------------------------------------------------
connectDB();

// ------------------------------------------------------------------
// API routes
// ------------------------------------------------------------------
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/favourites", favouriteRoutes);
app.use("/api/field-teams", fieldTeamsRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/quiz-results", quizResultRoutes);
app.use("/api/on-the-job-assessments", onTheJobAssessmentRoutes);
app.use("/api/archive", archiveRoutes);
app.use("/api/trash", trashRoutes);
app.use("/api/customer-issues-notifications", customerIssueRoutes);
app.use("/api/suggestions", suggestionsRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/detractors", detractorRoutes);
app.use("/api/samples-token", samplesTokenRoutes);
app.use("/api/action-plan", actionPlanRoutes);
app.use("/api/dropdown-options", dropdownOptionRoutes);
app.use("/api/ont-types", ontTypeRoutes);
app.use("/api/lab-assessments", labAssessmentRoutes);
app.use("/api/settings", settingsRoutes);


// ------------------------------------------------------------------
// 404 Handler
// ------------------------------------------------------------------
app.use((req, res, next) => {
  console.log(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ------------------------------------------------------------------
// Global Error Handler
// ------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`, err.stack);

  // Handle CORS errors specifically
  if (err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;