import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addTask,
  deleteTask,
  getTasks,
  getTask,
  updateTask,
  updateSubtask,
  viewTask,
  unreadCount,
  notifications,
  searchTasks,
  getAllTasks,
  getCurrentYearTasks,
  getTasksAssignedToMe,
  getDetractorTasks,
  getNeutralTasks,
  softDeleteTask,
  getDeletedTasks,
  // restoreDeletedTask,
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
  getIssuePreventionStats,
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
} from "../controllers/taskControllers.js";

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


// Get deleted tasks
router.get("/get-deleted-tasks", protect, getDeletedTasks);

// Restore deleted task (set isDeleted to false)
// router.patch("/:taskId/restore", restoreDeletedTask);


// Restore a task from trash to tasks collection
router.post("/:id/restore", restoreTask);

// Restore a task from archive to tasks collection
router.post("/:id/restoreFromArchive", restoreTaskFromArchive);


router.get("/search-tasks", protect, searchTasks);

// Hard Delete Task (Admin deletes any)
router.delete("/delete-task/:id", protect, deleteTask);

// Soft Delete Task (Admin deletes any)
router.delete("/soft-delete-task/:id", protect, softDeleteTask);

// Update Task (Admin updates any)
router.put("/update-task/:id", protect, updateTask);

router.put('/update-subtask/:id', protect, updateSubtask);

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


export default router;
