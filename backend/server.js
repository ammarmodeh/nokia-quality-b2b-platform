import "dotenv/config";
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
import trainingSessionRoutes from "./routes/trainingSessionRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import docRoutes from "./routes/docRoutes.js";
import userNoteRoutes from "./routes/userNoteRoutes.js";
import fieldAuditRoutes from "./routes/fieldAuditRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import path from "path";
import { errorHandler, routeNotFound } from "./middlewares/errorMiddleware.js";

console.log('process.env.FRONTEND_URL:', process.env.FRONTEND_URL);

const app = express();

// Trust proxy for Render/Vercel (fixes ERR_TOO_MANY_REDIRECTS)
app.set('trust proxy', 1);

app.use(compression());

// ------------------------------------------------------------------
// Request Logging Middleware
// ------------------------------------------------------------------
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.originalUrl} | Protocol: ${req.protocol} | Secure: ${req.secure} | Host: ${req.get('host')} | Origin: ${req.headers.origin}`);
  // Log specific headers that might cause redirection loops
  if (req.headers['x-forwarded-proto']) {
    console.log(`[Proxy] X-Forwarded-Proto: ${req.headers['x-forwarded-proto']}`);
  }
  next();
});

// ------------------------------------------------------------------
// CORS configuration
// ------------------------------------------------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3002",
  "http://localhost:5173", // Common Vite port
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:5173",
].map(o => o?.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman, health checks)
    if (!origin) return callback(null, true);

    // Development fallback: Allow all localhost/127.0.0.1 origins
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked request from origin: "${origin}"`);
    console.warn(`[CORS] Allowed Origins were: ${JSON.stringify(allowedOrigins)}`);
    return callback(new Error(`CORS policy: origin ${origin} is not allowed`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 204
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
app.use("/api/customer-issues", customerIssueRoutes);
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
app.use("/api/docs", docRoutes);
app.use("/api/user-notes", userNoteRoutes);
app.use("/api/audit", fieldAuditRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/training-sessions", trainingSessionRoutes);

// Static Uploads Folder
const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ------------------------------------------------------------------
// 404 Handler
// ------------------------------------------------------------------
// ------------------------------------------------------------------

// ... existing code ...

// ------------------------------------------------------------------
// 404 Handler && Global Error Handler
// ------------------------------------------------------------------
app.use(routeNotFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// ------------------------------------------------------------------
// Global Error Handlers
// ------------------------------------------------------------------
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit the process, just log the error
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
