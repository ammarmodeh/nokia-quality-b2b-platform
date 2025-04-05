import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addFieldTeam, getAllFieldTeams, deleteFieldTeam, updateFieldTeam, updateTeamScore, getFieldTeamByQuizCode, getTeamEvaluationHistory, suspendTeam, terminateTeam, reactivateTeam, onLeaveTeam, resignedTeam, addSession, updateSessionForTeam, deleteSessionForTeam, reportAbsence, getTeamViolations } from "../controllers/fieldTeamsControllers.js";

const router = express.Router();

// Get All Field Teams
router.get("/get-field-teams", protect, getAllFieldTeams);

// GET /field-teams/get-team-by-quiz-code/:quizCode
router.get('/get-team-by-quiz-code/:quizCode', getFieldTeamByQuizCode);

// Add New Field Team
router.post("/add-field-team", protect, addFieldTeam);


// Suspend field team
router.post("/suspend-field-team/:teamId", protect, suspendTeam);

// Terminate field team
router.post("/terminate-field-team/:teamId", protect, terminateTeam);

// reactivate field team
router.post("/reactivate-field-team/:teamId", protect, reactivateTeam);

// On Leave field team
router.post("/on-leave-field-team/:teamId", protect, onLeaveTeam);

// Resigned field team
router.post("/resigned-field-team/:teamId", protect, resignedTeam);


// Delete Field Team
router.delete("/delete-field-team/:id", protect, deleteFieldTeam);

// Update Field Team
router.put("/update-field-team/:id", protect, updateFieldTeam);

// Update team score
router.post('/update-score', protect, updateTeamScore);

// Fetching evaluation history
router.get('/get-evaluation-history/:teamId', protect, getTeamEvaluationHistory);


// Add Session data
router.post("/:teamId/add-session", protect, addSession);

router.put("/:teamId/update-session/:sessionId", protect, updateSessionForTeam);

// Example backend route (Express.js)
router.delete("/:teamId/delete-session/:sessionId", protect, deleteSessionForTeam);

router.post("/:teamId/report-absence", protect, reportAbsence);
router.get("/:teamId/violations", protect, getTeamViolations)

export default router;
