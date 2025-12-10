import express from "express";
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

dotenv.config();

console.log('process.env.FRONTEND_URL:', process.env.FRONTEND_URL);

const app = express();

// ------------------------------------------------------------------
// CORS configuration – allow both production and Vercel preview domains
// ------------------------------------------------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL, // e.g. https://nokia-quality-b2b-platform.vercel.app
  "https://nokia-quality-b2b-platform-bfrq.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
};

// Explicitly handle pre‑flight OPTIONS requests for all routes
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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export the app for testing or serverless usage
export default app;