import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  bulkUploadTasks,
  createSample,
  createTask,
  createTeam,
  deleteSample,
  deleteTask,
  deleteTeam,
  deleteTicket,
  getMeta,
  getOverview,
  getTask,
  getTeam,
  listSamples,
  listTaskTickets,
  listTasks,
  listTeams,
  processingQueue,
  recordTicket,
  updateSample,
  updateTask,
  updateTeam,
  updateTicket,
} from "../controllers/maintenanceController.js";

// DVOC · Maintenance (/api/maintenance). Signed-in users create and edit; deletes are admin-only
// (checked in the controller so the message explains why).
const router = express.Router();
router.use(protect);

router.get("/meta", getMeta);
router.get("/overview", getOverview);

router.get("/teams", listTeams);
router.post("/teams", createTeam);
router.get("/teams/:id", getTeam);
router.put("/teams/:id", updateTeam);
router.delete("/teams/:id", deleteTeam);

router.get("/samples", listSamples);
router.post("/samples", createSample);
router.put("/samples/:id", updateSample);
router.delete("/samples/:id", deleteSample);

router.get("/tasks", listTasks);
router.post("/tasks/bulk-upload", bulkUploadTasks);
router.post("/tasks", createTask);
router.get("/processing", processingQueue);
router.get("/tasks/:id", getTask);
router.put("/tasks/:id", updateTask);
router.delete("/tasks/:id", deleteTask);

router.get("/tasks/:id/tickets", listTaskTickets);
router.post("/tasks/:id/tickets", recordTicket);
router.put("/tickets/:ticketId", updateTicket);
router.delete("/tickets/:ticketId", deleteTicket);

export default router;
