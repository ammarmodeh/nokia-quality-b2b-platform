import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import {
  addTask,
  deleteTask,
  getTasks,
  getTask,
  updateTask,
  viewTask,
  unreadCount,
  notifications,
  searchTasks,
  getAllTasks,
  getCurrentYearTasks,
  getTasksAssignedToMe,
  getDetractorTasks,
  getNeutralTasks,
  restoreTask,
  restoreTaskFromArchive,
  getNeutralTasksPaginated,
  getDetractorTasksPaginated,
  getTasksAssignedToMePaginated,
  getDetractorTasksAssignedToMe,
  getDetractorTasksAssignedToMePaginated,
  getNeutralTasksAssignedToMe,
  getNeutralTasksAssignedToMePaginated,
  updateTaskByTeamId,
  createNotification,
  clearNotifications,
  markNotificationAsRead,
  getNotifications,
  getUnreadNotificationsCount,
  getIssuePreventionStats,
  getPreventionDeepDiveStats,
  addTaskTicket,
  getTaskTickets,
  updateTaskTicket,
  deleteTaskTicket,
  uploadAuditSheet,
  commitAuditData,
  getAuditLogs,
  downloadAuditSheet,
  savePreventionStrategy,
  getPreventionStrategy,
  getAuditDeepStats,
  getAuditRecords,
  updateAuditRecord,
  processAuditRecordManually,
  revertAuditRecord,
  uploadReachSupervisorAudit,
  commitReachSupervisorData,
  updateAuditLogDates,
  deleteAuditLog
} from "../controllers/taskControllers.js";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|xlsm)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  }
});

const router = express.Router();

// Create Task (Employees can create, Admin can assign)
router.post("/add-task", protect, addTask);

// Get All Tasks
router.get("/get-all-tasks", protect, getAllTasks);
// Get Tasks with pagination (Employees see their tasks, Admin sees all)
router.get("/get-tasks", protect, getTasks);


router.get("/get-detractor-tasks", protect, getDetractorTasks);
router.get("/get-paginated-detractor-tasks", protect, getDetractorTasksPaginated);


router.get("/get-neutral-tasks", protect, getNeutralTasks);
router.get("/get-paginated-neutral-tasks", protect, getNeutralTasksPaginated);


// Get all assignedToME tasks getTasksAssignedToMePaginated
router.get("/get-assigned-tasks", protect, getTasksAssignedToMe);
router.get("/get-paginated-assigned-tasks", protect, getTasksAssignedToMePaginated);

router.get('/get-detractor-assigned-tasks', protect, getDetractorTasksAssignedToMe);
router.get('/get-paginated-detractor-assigned-tasks', protect, getDetractorTasksAssignedToMePaginated);


router.get('/get-neutral-assigned-tasks', protect, getNeutralTasksAssignedToMe);
router.get('/get-paginated-neutral-assigned-tasks', protect, getNeutralTasksAssignedToMePaginated);


// Restore a task from trash to tasks collection


// Restore a task from trash to tasks collection
router.post("/:id/restore", restoreTask);

// Restore a task from archive to tasks collection
router.post("/:id/restoreFromArchive", restoreTaskFromArchive);


router.get("/search-tasks", protect, searchTasks);

// Hard Delete Task (Admin deletes any)
router.delete("/delete-task/:id", protect, deleteTask);

// Update Task (Admin updates any)
router.put("/update-task/:id", protect, updateTask);

router.get('/get-task/:id', protect, getTask)

// View Task (Employees view their tasks)
router.get("/view-task/:id", protect, viewTask);

router.get("/notifications", protect, notifications);

router.get("/unread-count", protect, unreadCount);

// Update task by team id
router.put('/update-tasks-by-team-id/:teamId', protect, updateTaskByTeamId);

router.get("/notifications", protect, getNotifications);
router.get("/notifications/unread-count", protect, getUnreadNotificationsCount);
router.put("/:taskId/notifications/:notificationId/read", protect, markNotificationAsRead);
router.post("/:taskId/notifications", protect, createNotification);
router.put("/:taskId/clear-notifications", protect, clearNotifications);
router.get("/prevention-stats", protect, getIssuePreventionStats);
router.get("/prevention-deep-dive", protect, getPreventionDeepDiveStats);

router.post("/tickets", protect, addTaskTicket);
router.get("/tickets/:taskId", protect, getTaskTickets);
router.put("/tickets/:id", protect, updateTaskTicket);
router.delete("/tickets/:id", protect, deleteTaskTicket);

// Upload audit Excel sheet
router.post("/upload-audit-sheet", protect, upload.single('file'), uploadAuditSheet);
// Audit History & Analysis
router.get("/audit-logs", protect, getAuditLogs);
router.get("/audit-sheet/:id/download", protect, downloadAuditSheet);
router.get("/audit-records/:auditId", protect, getAuditRecords);
router.get("/audit-stats/:auditId", protect, getAuditDeepStats);
router.post("/commit-audit-data", protect, commitAuditData);

// Advanced Audit Records Management
router.put("/audit-records/:recordId", protect, updateAuditRecord);
router.post("/audit-records/:recordId/process-manual", protect, processAuditRecordManually);
router.post("/audit-records/:recordId/revert", protect, revertAuditRecord);

// Prevention Strategy
router.get("/prevention-strategy", protect, getPreventionStrategy);
router.post("/prevention-strategy", protect, savePreventionStrategy);

// Reach Supervisors Audit
router.post("/upload-reach-audit", protect, upload.single('file'), uploadReachSupervisorAudit);
router.post("/commit-reach-audit", protect, commitReachSupervisorData);
router.put("/update-audit-dates/:auditId", protect, updateAuditLogDates);
router.delete("/audit-logs/:id", protect, deleteAuditLog);


export default router;
