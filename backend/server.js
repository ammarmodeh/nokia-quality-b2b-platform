import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import favouriteRoutes from "./routes/favouriteRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import trashRoutes from "./routes/trashRoutes.js";
import archiveRoutes from "./routes/archiveRoutes.js";
import fieldTeamsRoutes from "./routes/fieldTeamsRoutes.js";
import policyRoutes from "./routes/policyRoutes.js";
import suggestionsRoutes from "./routes/suggestionsRoutes.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import customerIssueRoutes from "./routes/customerIssueRoutes.js";

dotenv.config();

const corsOptions = {
  origin: [
    // "http://localhost:3000", // For local development
    // "https://nokia-jo-qos-platform.netlify.app", // For production on Netlify
    "https://nokia-quality-b2b-platform-bfrq-kuo8m1lfn.vercel.app",
    "https://nokia-quality-b2b-platform-bfrq.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true, // Allow cookies to be sent with requests
};


const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

connectDB();

// app.get("/", (req, res) => {
//   res.send("Hello World!");
// });

app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/favourites", favouriteRoutes);
app.use("/api/field-teams", fieldTeamsRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/archive", archiveRoutes);
app.use("/api/trash", trashRoutes);
app.use("/api/customer-issues-notifications", customerIssueRoutes);
app.use("/api/suggestions", suggestionsRoutes);
app.use("/api/policies", policyRoutes);

// const PORT = process.env.PORT || 5001;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// This export is used to export the app object, which is the main entry point for your Express application.
export default app;