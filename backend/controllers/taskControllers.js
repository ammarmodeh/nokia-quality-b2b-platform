import { TaskSchema } from "../models/taskModel.js";
import { CustomerIssueSchema } from "../models/customerIssueModel.js";
import { FavouriteSchema } from "../models/favouriteModel.js";
import { TrashSchema } from "../models/trashModel.js";
import { ArchiveSchema } from "../models/archiveModel.js";
import { ReachSupervisorIssue } from "../models/reachSupervisorIssueModel.js";
import { TaskTicket } from "../models/taskTicketModel.js";
import AuditLog from "../models/auditLogModel.js";
import AuditRecord from "../models/auditRecordModel.js";
import mongoose from "mongoose";
import fs from "fs";
import PreventionStrategy from "../models/preventionStrategyModel.js";
import SamplesToken from "../models/samplesTokenModel.js";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const addTask = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    Object.keys(req.body).forEach((key) => {
      // Skip array fields from being setting to null if they are empty strings
      // or specifically convert them to empty arrays
      if (["reason", "subReason", "rootCause", "responsible"].includes(key)) {
        if (!Array.isArray(req.body[key])) {
          req.body[key] = req.body[key] ? [req.body[key]] : [];
        }
        return;
      }

      if (req.body[key] === "") {
        req.body[key] = null;
      }
    });

    // --- SOW Automation Logic ---
    let initialTransactionState = "VA"; // Default: Valid/Validated/Approved

    // Check case-insensitive "SOW" in operation or other relevant fields if needed
    if (req.body.operation && req.body.operation.toUpperCase().trim() === "SOW") {
      req.body.operation = "WO"; // Auto-convert to WO
      initialTransactionState = "PENDING_CONTACT";
    }

    const task = new TaskSchema({
      ...req.body,
      createdBy: req.user._id,
    });

    // Create the initial "Ticket Initiated" ticket
    const initialTicket = new TaskTicket({
      taskId: task._id,
      mainCategory: "INIT", // Correct GAIA Code
      transactionType: "INIT",
      transactionState: initialTransactionState,
      status: "Todo", // System Flow Status
      note: "Initial task creation",
      agentName: "SYSTEM",
      recordedBy: req.user._id,
      eventDate: null, // N/A Execution Date
    });

    // Create the second "Work order initiated" ticket
    const secondaryTicket = new TaskTicket({
      taskId: task._id,
      mainCategory: "WO",
      transactionType: "WO",
      transactionState: "OP",
      status: "In Progress",
      note: "Work order initiated.",
      agentName: req.user.name,
      recordedBy: req.user._id,
      eventDate: null, // N/A Execution Date
    });

    await task.save({ session });
    await initialTicket.save({ session });
    await secondaryTicket.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Task created successfully!", task });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists.` });
    }
    res.status(500).json({ error: error.message });
  }
};


export const updateTask = async (req, res) => {
  const { _id, createdAt, updatedAt, __v, ...updatedData } = req.body;
  const id = req.params.id;

  // Flatten populated fields to IDs
  if (Array.isArray(updatedData.assignedTo)) {
    updatedData.assignedTo = updatedData.assignedTo.map(u => (u && u._id) ? u._id : u);
  }
  if (Array.isArray(updatedData.whomItMayConcern)) {
    updatedData.whomItMayConcern = updatedData.whomItMayConcern.map(u => (u && u._id) ? u._id : u);
  }
  if (updatedData.createdBy && typeof updatedData.createdBy === 'object') {
    updatedData.createdBy = updatedData.createdBy._id || updatedData.createdBy;
  }
  if (updatedData.teamId && typeof updatedData.teamId === 'object') {
    updatedData.teamId = updatedData.teamId._id || updatedData.teamId;
  }

  // Sanitize empty strings to null
  Object.keys(updatedData).forEach((key) => {
    // Skip array fields from being setting to null if they are empty strings
    if (["reason", "subReason", "rootCause", "responsible"].includes(key)) {
      if (!Array.isArray(updatedData[key])) {
        // If legacy string comes in, wrap it; if null/empty, make empty array
        if (updatedData[key] === "" || updatedData[key] === null) {
          updatedData[key] = [];
        } else {
          updatedData[key] = [updatedData[key]];
        }
      }
      return;
    }

    if (updatedData[key] === "") {
      updatedData[key] = null;
    }
  });

  try {
    const updatedTask = await TaskSchema.findByIdAndUpdate(id, updatedData, { new: true })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: "Error updating task", error: error.message });
  }
};

export const getTask = async (req, res) => {
  try {
    const task = await TaskSchema.findById(req.params.id)
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};






export const getCurrentYearTasks = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const tasks = await TaskSchema.find({
      interviewDate: { $gte: startOfYear }
    })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ interviewDate: -1 });

    if (!tasks.length) {
      return res.status(404).json({ message: "Tasks not found" });
    }

    return res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const { search, priority, status, governorate, district, teamCompany, assignedTo, teamName, validationStatus, teamId } = req.query;

    const mongoQuery = {};

    if (teamId && teamId !== 'all') {
      mongoQuery.teamId = teamId;
    }

    if (priority && priority !== 'all') {
      mongoQuery.priority = priority;
    }

    if (status && status !== 'all') {
      if (status === 'Open') {
        mongoQuery.status = { $in: ['Todo', 'In Progress'] };
      } else {
        mongoQuery.status = status;
      }
    }

    if (governorate && governorate !== 'all') {
      mongoQuery.governorate = governorate;
    }

    if (district && district !== 'all') {
      mongoQuery.district = district;
    }

    if (teamCompany && teamCompany !== 'all') {
      mongoQuery.teamCompany = teamCompany;
    }

    if (assignedTo && assignedTo !== 'all') {
      mongoQuery.assignedTo = assignedTo;
    }

    if (teamName && teamName !== 'all') {
      mongoQuery.teamName = teamName;
    }

    if (validationStatus && validationStatus !== 'all') {
      mongoQuery.validationStatus = validationStatus;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      mongoQuery.$or = [
        { slid: searchRegex },
        { customerName: searchRegex },
        { teamName: searchRegex },
        { operation: searchRegex },
      ];

      // Add requestNumber if it's a number
      if (!isNaN(search)) {
        mongoQuery.$or.push({ requestNumber: Number(search) });
      }
    }

    const totalTasks = await TaskSchema.countDocuments(mongoQuery);
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: mongoQuery },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "tasktickets",
          localField: "_id",
          foreignField: "taskId",
          as: "tickets"
        }
      },
      {
        $addFields: {
          latestGaia: { $arrayElemAt: [{ $sortArray: { input: "$tickets", sortBy: { timestamp: -1 } } }, 0] }
        }
      }
    ];

    const tasks = await TaskSchema.aggregate(pipeline);

    // Convert aggregation results (POJOs) to populated documents if needed, 
    // but since we only need a few fields, we can just return these.
    // However, for consistency with existing frontend expectations (populated users),
    // we should populate the IDs in the aggregation results.
    const populatedTasks = await TaskSchema.populate(tasks, [
      { path: "assignedTo", select: "name email" },
      { path: "createdBy", select: "name email" },
      { path: "teamId", select: "contactNumber" }
    ]);

    return res.json({
      success: true,
      data: populatedTasks,
      pagination: {
        total: totalTasks,
        page,
        limit,
        totalPages: Math.ceil(totalTasks / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDetractorTasks = async (req, res) => {
  try {
    const detractorTasks = await TaskSchema.find({
      evaluationScore: { $gte: 1, $lte: 6 },
    });

    res.status(200).json(detractorTasks);
  } catch (error) {
    // console.error("Error fetching detractor tasks:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const getDetractorTasksPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const { search, priority, status, governorate, district, teamCompany, assignedTo, teamName, validationStatus, teamId } = req.query;

    const mongoQuery = {
      evaluationScore: { $gte: 1, $lte: 6 }
    };

    if (teamId && teamId !== 'all') {
      mongoQuery.teamId = teamId;
    }

    if (priority && priority !== 'all') {
      mongoQuery.priority = priority;
    }

    if (status && status !== 'all') {
      if (status === 'Open') {
        mongoQuery.status = { $in: ['Todo', 'In Progress'] };
      } else {
        mongoQuery.status = status;
      }
    }

    if (governorate && governorate !== 'all') {
      mongoQuery.governorate = governorate;
    }

    if (district && district !== 'all') {
      mongoQuery.district = district;
    }

    if (teamCompany && teamCompany !== 'all') {
      mongoQuery.teamCompany = teamCompany;
    }

    if (assignedTo && assignedTo !== 'all') {
      mongoQuery.assignedTo = assignedTo;
    }

    if (teamName && teamName !== 'all') {
      mongoQuery.teamName = teamName;
    }

    if (validationStatus && validationStatus !== 'all') {
      if (validationStatus === 'Pending') {
        mongoQuery.validationStatus = { $ne: 'Validated' };
      } else {
        mongoQuery.validationStatus = validationStatus;
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      mongoQuery.$or = [
        { slid: searchRegex },
        { customerName: searchRegex },
        { teamName: searchRegex },
        { operation: searchRegex },
      ];

      if (!isNaN(search)) {
        mongoQuery.$or.push({ requestNumber: Number(search) });
      }
    }

    const totalTasks = await TaskSchema.countDocuments(mongoQuery);
    const skip = (page - 1) * limit;

    const detractorTasks = await TaskSchema.find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("teamId", "contactNumber");

    return res.json({
      success: true,
      data: detractorTasks,
      pagination: {
        total: totalTasks,
        page,
        limit,
        totalPages: Math.ceil(totalTasks / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getNeutralTasks = async (req, res) => {
  try {
    const detractorTasks = await TaskSchema.find({
      evaluationScore: { $gte: 7, $lte: 8 },
    });

    res.status(200).json(detractorTasks);
  } catch (error) {
    // console.error("Error fetching detractor tasks:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const getNeutralTasksPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const { search, priority, status, governorate, district, teamCompany, assignedTo, teamName, validationStatus, teamId } = req.query;

    const mongoQuery = {
      evaluationScore: { $gte: 7, $lte: 8 }
    };

    if (teamId && teamId !== 'all') {
      mongoQuery.teamId = teamId;
    }

    if (priority && priority !== 'all') {
      mongoQuery.priority = priority;
    }

    if (status && status !== 'all') {
      if (status === 'Open') {
        mongoQuery.status = { $in: ['Todo', 'In Progress'] };
      } else {
        mongoQuery.status = status;
      }
    }

    if (governorate && governorate !== 'all') {
      mongoQuery.governorate = governorate;
    }

    if (district && district !== 'all') {
      mongoQuery.district = district;
    }

    if (teamCompany && teamCompany !== 'all') {
      mongoQuery.teamCompany = teamCompany;
    }

    if (assignedTo && assignedTo !== 'all') {
      mongoQuery.assignedTo = assignedTo;
    }

    if (teamName && teamName !== 'all') {
      mongoQuery.teamName = teamName;
    }

    if (validationStatus && validationStatus !== 'all') {
      if (validationStatus === 'Pending') {
        mongoQuery.validationStatus = { $ne: 'Validated' };
      } else {
        mongoQuery.validationStatus = validationStatus;
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      mongoQuery.$or = [
        { slid: searchRegex },
        { customerName: searchRegex },
        { teamName: searchRegex },
        { operation: searchRegex },
      ];

      if (!isNaN(search)) {
        mongoQuery.$or.push({ requestNumber: Number(search) });
      }
    }

    const totalTasks = await TaskSchema.countDocuments(mongoQuery);
    const skip = (page - 1) * limit;

    const tasks = await TaskSchema.find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("teamId", "contactNumber");

    return res.json({
      success: true,
      data: tasks,
      pagination: {
        total: totalTasks,
        page,
        limit,
        totalPages: Math.ceil(totalTasks / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTasksAssignedToMe = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { validationStatus } = req.query;

    const mongoQuery = { assignedTo: currentUserId };
    if (validationStatus && validationStatus !== 'all') {
      mongoQuery.validationStatus = validationStatus;
    }

    const tasks = await TaskSchema.find(mongoQuery)
      .sort({ createdAt: -1 })
      .select("-notifications")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("teamId", "contactNumber");

    return res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTasksAssignedToMePaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const { validationStatus } = req.query;

    const mongoQuery = { assignedTo: req.user._id };
    if (validationStatus && validationStatus !== 'all') {
      mongoQuery.validationStatus = validationStatus;
    }

    const totalTasks = await TaskSchema.countDocuments(mongoQuery);
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]);
    }

    const tasks = await TaskSchema.find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    return res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDetractorTasksAssignedToMe = async (req, res) => {
  try {
    const { validationStatus } = req.query;
    const mongoQuery = {
      evaluationScore: { $gte: 1, $lte: 6 },
      assignedTo: req.user._id
    };

    if (validationStatus && validationStatus !== 'all') {
      mongoQuery.validationStatus = validationStatus;
    }

    const detractorTasks = await TaskSchema.find(mongoQuery);

    res.status(200).json(detractorTasks);
  } catch (error) {
    // console.error("Error fetching detractor tasks:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const getDetractorTasksAssignedToMePaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const { validationStatus } = req.query;

    const mongoQuery = {
      evaluationScore: { $gte: 1, $lte: 6 },
      assignedTo: req.user._id
    };

    if (validationStatus && validationStatus !== 'all') {
      mongoQuery.validationStatus = validationStatus;
    }

    const totalTasks = await TaskSchema.countDocuments(mongoQuery);
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]);
    }

    const tasks = await TaskSchema.find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    return res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getNeutralTasksAssignedToMe = async (req, res) => {
  try {
    const { validationStatus } = req.query;
    const mongoQuery = {
      evaluationScore: { $gte: 7, $lte: 8 },
      assignedTo: req.user._id
    };

    if (validationStatus && validationStatus !== 'all') {
      mongoQuery.validationStatus = validationStatus;
    }

    const neutralTasks = await TaskSchema.find(mongoQuery);

    res.status(200).json(neutralTasks);
  } catch (error) {
    // console.error("Error fetching neutral tasks:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const getNeutralTasksAssignedToMePaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const { validationStatus } = req.query;

    const mongoQuery = {
      evaluationScore: { $gte: 7, $lte: 8 },
      assignedTo: req.user._id
    };

    if (validationStatus && validationStatus !== 'all') {
      mongoQuery.validationStatus = validationStatus;
    }

    const totalTasks = await TaskSchema.countDocuments(mongoQuery);
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]);
    }

    const tasks = await TaskSchema.find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("teamId", "contactNumber");

    return res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getDeletedTasks = async (req, res) => {
  try {
    const deletedTasks = await TrashSchema.find({}); // Fetch from Trash collection instead

    if (!deletedTasks.length) {
      return res.status(404).json({ message: "Deleted tasks not found" });
    }

    return res.json(deletedTasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const restoreTask = async (req, res) => {
  try {
    const { id } = req.params;

    const taskInTrash = await TrashSchema.findById(id);
    if (!taskInTrash) {
      return res.status(404).json({ message: "Task not found in trash" });
    }

    const restoredTask = await TaskSchema.create(taskInTrash.toObject());

    await TrashSchema.findByIdAndDelete(id);

    res.status(200).json({ message: "Task restored successfully", restoredTask });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const restoreTaskFromArchive = async (req, res) => {
  try {
    const { id } = req.params;

    const taskInArchive = await ArchiveSchema.findById(id);
    if (!taskInArchive) {
      return res.status(404).json({ message: "Task not found in archive" });
    }

    const restoredTask = await TaskSchema.create(taskInArchive.toObject());

    await ArchiveSchema.findByIdAndDelete(id);

    res.status(200).json({ message: "Task restored successfully", restoredTask });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export const searchTasks = async (req, res) => {
  const { query } = req.query;
  try {
    const tasks = await TaskSchema.find({ slid: { $regex: query, $options: 'i' } });
    res.json(tasks);
  } catch (error) {
    res.status(500).send("Error fetching tasks");
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await TaskSchema.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    await TaskSchema.deleteOne({ _id: req.params.id });

    res.status(200).json({ status: 204, message: "Task deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const softDeleteTask = async (req, res) => {
  try {
    const task = await TaskSchema.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Move to Trash
    await TrashSchema.create({
      ...task.toObject(),
      deletedBy: req.user._id,
      deletedAt: new Date()
    });

    await TaskSchema.findByIdAndDelete(req.params.id);
    res.status(200).json({ status: 204, message: "Task moved to trash successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



export const notifications = async (req, res) => {
  res.status(501).json({ message: "Notifications removed in flat model" });
};

export const unreadCount = async (req, res) => {
  try {
    const usersWhoReadTasks = await TaskSchema.distinct('readBy');
    res.status(200).json(usersWhoReadTasks);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users who have read tasks' });
  }
};

export const updateTaskByTeamId = async (req, res) => {
  const { teamId } = req.params;
  const { teamName } = req.body;

  try {
    const result = await TaskSchema.updateMany(
      { teamId: teamId },
      { $set: { teamName: teamName } }
    );

    res.status(200).json({
      message: 'Tasks update completed',
      updatedCount: result.modifiedCount,
      tasksFound: result.matchedCount
    });
  } catch (error) {
    // console.error('Error updating tasks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getUnreadNotificationsCount = async (req, res) => {
  res.status(501).json({ message: "Notifications removed in flat model" });
};

export const getNotifications = async (req, res) => {
  res.status(501).json({ message: "Notifications removed in flat model" });
};

export const markNotificationAsRead = async (req, res) => {
  res.status(501).json({ message: "Notifications removed in flat model" });
};

export const createNotification = async (req, res) => {
  res.status(501).json({ message: "Notifications removed in flat model" });
};

export const clearNotifications = async (req, res) => {
  res.status(501).json({ message: "Notifications removed in flat model" });
};

export const getAllTasks = async (req, res) => {
  try {
    const pipeline = [
      { $match: {} },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "tasktickets",
          localField: "_id",
          foreignField: "taskId",
          as: "tickets"
        }
      },
      {
        $addFields: {
          latestGaia: { $arrayElemAt: [{ $sortArray: { input: "$tickets", sortBy: { timestamp: -1 } } }, 0] }
        }
      },
      { $project: { "subTasks.checkpoints": 0 } }
    ];

    const tasks = await TaskSchema.aggregate(pipeline);
    const populatedTasks = await TaskSchema.populate(tasks, [
      { path: "assignedTo", select: "name email role" },
      { path: "whomItMayConcern", select: "name email role" },
      { path: "createdBy", select: "name email" }
    ]);

    res.status(200).json(populatedTasks);
  } catch (error) {
    console.error("Error fetching all tasks:", error);
    res.status(500).json({ error: error.message });
  }
};

export const viewTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await TaskSchema.findById(taskId)
      .populate("assignedTo", "name email title role phoneNumber")
      .populate("whomItMayConcern", "name email title role phoneNumber")
      .populate("createdBy", "name email title role phoneNumber")
      .populate("teamId");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const tickets = await TaskTicket.find({ taskId }).populate("recordedBy", "name").sort({ timestamp: -1 });

    res.status(200).json({ task, tickets });
  } catch (error) {
    console.error("View Task Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const addTaskTicket = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      taskId, taskType, mainCategory, status, note,
      eventDate, resolutionDate, closureDate,
      rootCause, subReason, actionTaken,
      followUpRequired, followUpDate,
      transactionType, transactionState, unfReasonCode, agentName
    } = req.body;

    const ticket = new TaskTicket({
      taskId,
      taskType: taskType || 'Task',
      mainCategory,
      status,
      note,
      eventDate,
      resolutionDate,
      closureDate,
      rootCause,
      subReason,
      actionTaken,
      followUpRequired,
      followUpDate,
      transactionType,
      transactionState,
      unfReasonCode,
      agentName,
      recordedBy: req.user._id
    });

    await ticket.save({ session });

    // Update task status if it changed
    await TaskSchema.findByIdAndUpdate(taskId, { status }, { session });

    await session.commitTransaction();
    session.endSession();

    const populatedTicket = await TaskTicket.findById(ticket._id).populate("recordedBy", "name");
    res.status(201).json(populatedTicket);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
};

export const updateTaskTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedTicket = await TaskTicket.findByIdAndUpdate(id, updateData, { new: true })
      .populate("recordedBy", "name");

    if (!updatedTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Sync task status if provided
    if (updateData.status) {
      await TaskSchema.findByIdAndUpdate(updatedTicket.taskId, { status: updateData.status });
    }

    res.status(200).json(updatedTicket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTaskTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTicket = await TaskTicket.findByIdAndDelete(id);

    if (!deletedTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // If we deleted the ticket, we might need to update the task status based on the NEW latest ticket
    const latestTicket = await TaskTicket.findOne({ taskId: deletedTicket.taskId })
      .sort({ eventDate: -1, timestamp: -1 });

    if (latestTicket) {
      await TaskSchema.findByIdAndUpdate(deletedTicket.taskId, { status: latestTicket.status });
    } else {
      // If no tickets left, maybe default to "Todo" or keep as is? 
      // User request implies syncing with logs, so if logs are gone, "Todo" is reasonable.
      await TaskSchema.findByIdAndUpdate(deletedTicket.taskId, { status: "Todo" });
    }

    res.status(200).json({ message: "Ticket deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTaskTickets = async (req, res) => {
  try {
    const tickets = await TaskTicket.find({ taskId: req.params.taskId })
      .populate("recordedBy", "name")
      .sort({ eventDate: 1, createdAt: 1 });
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getIssuePreventionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build query for all tasks in the period
    const query = {};

    // Use interviewDate for filtering as requested
    if (startDate && endDate) {
      query.interviewDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.interviewDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.interviewDate = { $lte: new Date(endDate) };
    }

    // 1. Fetch all NPS tasks within the period
    const npsTasks = await TaskSchema.find(query)
      .select('slid evaluationScore customerFeedback createdAt interviewDate pisDate status teamName teamCompany subReason rootCause reason requestNumber operation customerName contactNumber tarrifName customerType governorate district priority validationStatus assignedTo gaiaCheck gaiaContent responsible')
      .populate('assignedTo', 'name email');

    const taskSlids = npsTasks.map(t => t.slid);

    // 2. Find matching issues from BOTH sources
    const [ojoReports, reachReports] = await Promise.all([
      CustomerIssueSchema.find({ slid: { $in: taskSlids } })
        .select('slid fromMain fromSub reporter reporterNote createdAt date solved issues resolveDate'),
      ReachSupervisorIssue.find({ slid: { $in: taskSlids } })
        .select('slid fromMain fromSub reporter reporterNote createdAt date solved issues resolveDate source')
    ]);

    // Combine and normalize reports
    const normalizedOjo = ojoReports.map(r => ({ ...r.toObject(), _sourceType: 'OJO Team (Manual)' }));
    const normalizedReach = reachReports.map(r => ({ ...r.toObject(), _sourceType: 'Reach Supervisors (Audit)' }));
    const priorReports = [...normalizedOjo, ...normalizedReach];

    // 3. Optimize overlap detection using a Map
    const reportsBySlid = new Map();
    priorReports.forEach(report => {
      if (!reportsBySlid.has(report.slid)) {
        reportsBySlid.set(report.slid, []);
      }
      reportsBySlid.get(report.slid).push(report);
    });

    let preventedOverlapCount = 0;
    let failureOverlapCount = 0;
    const overlapNpsBreakdown = { promoters: 0, neutrals: 0, detractors: 0 };
    const overlaps = [];

    npsTasks.forEach(task => {
      const reports = reportsBySlid.get(task.slid) || [];

      // Filter for reports that happened BEFORE the task's interview/creation
      const priorToTask = reports.filter(r => {
        const reportDate = new Date(r.date || r.createdAt);
        const taskDate = new Date(task.interviewDate || task.createdAt);
        return reportDate < taskDate;
      });

      priorToTask.forEach(report => {
        const score = task.evaluationScore;
        const isPrevented = score >= 9;

        if (isPrevented) {
          preventedOverlapCount++;
          overlapNpsBreakdown.promoters++;
        } else {
          failureOverlapCount++;
          if (score >= 7) overlapNpsBreakdown.neutrals++;
          else overlapNpsBreakdown.detractors++;
        }

        overlaps.push({
          task,
          report,
          isPrevented
        });
      });
    });

    // 4. Source Breakdown (ONLY for overlapping reports for consistency)
    const sourceBreakdown = overlaps.reduce((acc, item) => {
      const source = item.report.fromMain || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    // 4b. Overlap Source Breakdowns
    const overlapMainBreakdown = overlaps.reduce((acc, item) => {
      const source = item.report.fromMain || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    const overlapSubBreakdown = overlaps.reduce((acc, item) => {
      const source = item.report.fromSub || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    // 6. Reporter Stats (ONLY for overlapping reports for consistency)
    const reporterStats = overlaps.reduce((acc, item) => {
      const reporter = item.report.reporter || 'Unknown';
      acc[reporter] = (acc[reporter] || 0) + 1;
      return acc;
    }, {});

    // 7. Trend Data (Overlaps by Month)
    const trendData = overlaps.reduce((acc, item) => {
      const interviewDate = item.task.interviewDate || item.task.createdAt;
      if (!interviewDate) return acc;
      const date = new Date(interviewDate);
      const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // 8. Reason Stats (Root Cause Analysis - for all overlaps)
    const reasonStats = overlaps.reduce((acc, item) => {
      const reasons = Array.isArray(item.task.reason) ? item.task.reason : [item.task.reason || 'Unknown'];
      reasons.forEach(r => {
        const reason = r || 'Unknown';
        acc[reason] = (acc[reason] || 0) + 1;
      });
      return acc;
    }, {});

    // 9. Company Stats (Vendor Performance - for all overlaps)
    const companyStats = overlaps.reduce((acc, item) => {
      const company = item.task.teamCompany || 'Unknown';
      acc[company] = (acc[company] || 0) + 1;
      return acc;
    }, {});

    // 10. Reporter Comparison Stats
    const reporterComparisonMap = {};

    // 11. Diagnosis Accuracy & QoS/Installation Analysis
    let totalMatches = 0;
    let totalComparisons = 0;

    const qosMatrix = { confirmed: 0, falseAlarm: 0, missed: 0 };
    const installationMatrix = { confirmed: 0, falseAlarm: 0, missed: 0 };

    // Process Efficiency Stats
    let totalResolutionTime = 0;
    let totalClosureTime = 0;
    let totalLifecycleTime = 0;
    let countResolution = 0;
    let countClosure = 0;
    let countLifecycle = 0;
    const pendingBottlenecks = [];
    const now = new Date();

    overlaps.forEach(item => {
      const taskReasons = Array.isArray(item.task.reason) ? item.task.reason : [item.task.reason || "Unknown Task Reason"];
      const report = item.report;

      const reporter = report.reporter || "Unknown Reporter";
      const reportDate = new Date(report.date || report.createdAt);

      // Supervisor Dispatch Speed
      let dispatchEnd = report.dispatchedAt ? new Date(report.dispatchedAt) : (report.dispatched === 'no' ? now : null);
      if (!dispatchEnd && report.dispatched === 'yes') dispatchEnd = reportDate;

      if (dispatchEnd && dispatchEnd >= reportDate) {
        const dispatchTime = (dispatchEnd - reportDate) / (1000 * 60 * 60 * 24);
        totalClosureTime += dispatchTime;
        countClosure++;
      }

      // Field Resolution Speed
      if (report.dispatchedAt || report.dispatched === 'yes') {
        let resStart = report.dispatchedAt ? new Date(report.dispatchedAt) : reportDate;
        let resEnd = report.resolveDate ? new Date(report.resolveDate) : (report.solved === 'no' ? now : null);
        if (resStart && resEnd && resEnd >= resStart) {
          const resTime = (resEnd - resStart) / (1000 * 60 * 60 * 24);
          totalResolutionTime += resTime;
          countResolution++;
        }
      }

      // Total Lifecycle
      let lifeEnd = report.closedAt ? new Date(report.closedAt) : (report.solved === 'no' ? now : null);
      if (lifeEnd && lifeEnd >= reportDate) {
        const lifeTime = (lifeEnd - reportDate) / (1000 * 60 * 60 * 24);
        totalLifecycleTime += lifeTime;
        countLifecycle++;
      }

      // Bottleneck Detection
      if (report.solved === 'no') {
        pendingBottlenecks.push({
          id: report._id,
          slid: report.slid,
          age: ((now - reportDate) / (1000 * 60 * 60 * 24)).toFixed(1),
          stage: report.dispatched === 'no' ? 'Awaiting Dispatch' : 'Field Work',
          reportDate: report.date || report.createdAt,
          assignedTo: (report.assignedTo && report.assignedTo.name) || 'Unassigned',
          supervisor: report.closedBy || 'Unassigned',
          originalReport: report
        });
      }

      const reportedCategories = report.issues && report.issues.length > 0 ? report.issues.map(i => i.category) : ["No Category"];
      const reportedCategoriesString = reportedCategories.join(", ");

      const isMatch = reportedCategories.some(cat =>
        taskReasons.some(tr =>
          cat.toLowerCase().includes(tr.toLowerCase()) ||
          tr.toLowerCase().includes(cat.toLowerCase())
        )
      );

      totalComparisons++;
      if (isMatch) totalMatches++;

      // QoS Analysis
      const reportedQoS = reportedCategories.some(cat => cat.toLowerCase().includes("qos"));
      const actualQoS = taskReasons.some(tr => tr.toLowerCase().includes("qos"));
      if (reportedQoS && actualQoS) qosMatrix.confirmed++;
      else if (reportedQoS && !actualQoS) qosMatrix.falseAlarm++;
      else if (!reportedQoS && actualQoS) qosMatrix.missed++;

      // Installation Analysis
      const reportedInstall = reportedCategories.some(cat => cat.toLowerCase().includes("install"));
      const actualInstall = taskReasons.some(tr => tr.toLowerCase().includes("install"));
      if (reportedInstall && actualInstall) installationMatrix.confirmed++;
      else if (reportedInstall && !actualInstall) installationMatrix.falseAlarm++;
      else if (!reportedInstall && actualInstall) installationMatrix.missed++;

      if (!reporterComparisonMap[reporter]) {
        reporterComparisonMap[reporter] = { reporterName: reporter, totalNonPrevented: 0, comparisons: [] };
      }
      reporterComparisonMap[reporter].totalNonPrevented++;
      const taskReasonsString = taskReasons.join(", ");
      const existingComp = reporterComparisonMap[reporter].comparisons.find(c => c.reportedCategory === reportedCategoriesString && c.actualReason === taskReasonsString);
      if (existingComp) existingComp.count++;
      else reporterComparisonMap[reporter].comparisons.push({ reportedCategory: reportedCategoriesString, actualReason: taskReasonsString, count: 1 });
    });

    const globalCategoryReasonMatrix = overlaps.reduce((acc, item) => {
      const taskReasons = Array.isArray(item.task.reason) ? item.task.reason : [item.task.reason || "Unknown Task Reason"];
      const reportedCategories = item.report.issues && item.report.issues.length > 0 ? item.report.issues.map(i => i.category) : ["No Category"];
      reportedCategories.forEach(cat => {
        if (!acc[cat]) acc[cat] = {};
        taskReasons.forEach(tr => { acc[cat][tr] = (acc[cat][tr] || 0) + 1; });
      });
      return acc;
    }, {});

    const reporterComparisonStats = Object.values(reporterComparisonMap).sort((a, b) => b.totalNonPrevented - a.totalNonPrevented).slice(0, 10);

    const stats = {
      totalNpsTasks: npsTasks.length,
      reportedOverlapCount: overlaps.length,
      preventedOverlapCount,
      failureOverlapCount,
      overlapMainBreakdown,
      overlapSubBreakdown,
      overlapNpsBreakdown,
      sourceBreakdown,
      reporterStats,
      globalCategoryReasonMatrix,
      trendData,
      reasonStats,
      companyStats,
      reporterComparisonStats,
      diagnosisAccuracy: {
        rate: totalComparisons > 0 ? ((totalMatches / totalComparisons) * 100).toFixed(1) : 0,
        totalMatches,
        totalComparisons
      },
      qosMatrix,
      installationMatrix,
      processEfficiency: {
        avgResolutionTime: countResolution > 0 ? (totalResolutionTime / countResolution).toFixed(1) : 0,
        avgDispatchTime: countClosure > 0 ? (totalClosureTime / countClosure).toFixed(1) : 0,
        avgLifecycleTime: countLifecycle > 0 ? (totalLifecycleTime / countLifecycle).toFixed(1) : 0,
        oldestPending: pendingBottlenecks.sort((a, b) => b.age - a.age),
        countResolution,
        countClosure
      },
      overlaps: overlaps.sort((a, b) => new Date(b.task.interviewDate || b.task.createdAt) - new Date(a.task.interviewDate || a.task.createdAt)),
      preventionRate: overlaps.length > 0 ? ((preventedOverlapCount / overlaps.length) * 100).toFixed(1) : 0
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error("Error in getIssuePreventionStats:", error);
    res.status(500).json({ error: error.message });
  }
};
export const getPreventionDeepDiveStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {
      evaluationScore: { $gte: 1, $lte: 8 }
    };

    // Use interviewDate for filtering as requested
    if (startDate && endDate) {
      query.interviewDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.interviewDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.interviewDate = { $lte: new Date(endDate) };
    }

    const tasks = await TaskSchema.find(query)
      .populate('assignedTo', 'name');

    const scoreDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0
    };

    const actionTakenStats = {};
    const justificationStats = {};
    const reasonStats = {};
    const companyStats = {};

    tasks.forEach(task => {
      // Score Distribution
      const score = Math.floor(task.evaluationScore);
      if (scoreDistribution[score] !== undefined) {
        scoreDistribution[score]++;
      }

      // Reason Stats
      const reason = task.reason || 'Unknown';
      reasonStats[reason] = (reasonStats[reason] || 0) + 1;

      // Company Stats
      const company = task.teamCompany || 'Unknown';
      companyStats[company] = (companyStats[company] || 0) + 1;

      // Subtask Level Stats
      if (task.subTasks && task.subTasks.length > 0) {
        task.subTasks.forEach(subtask => {
          if (subtask.checkpoints && subtask.checkpoints.length > 0) {
            subtask.checkpoints.forEach(cp => {
              // Deeply nested action/justification logic based on SubtaskManager structure
              const processAction = (actionObj) => {
                if (actionObj && actionObj.selected) {
                  const action = actionObj.selected;
                  actionTakenStats[action] = (actionTakenStats[action] || 0) + 1;

                  if (action === 'no_action' && actionObj.justification && actionObj.justification.selected) {
                    const justification = actionObj.justification.selected;
                    justificationStats[justification] = (justificationStats[justification] || 0) + 1;
                  }
                }
              };

              // Check primary actionTaken
              processAction(cp.options?.actionTaken);

              // Check followUp actionTaken
              processAction(cp.options?.followUpQuestion?.actionTaken);
            });
          }
        });
      }
    });

    const formatStats = (statsObj) => {
      return Object.entries(statsObj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    };

    res.status(200).json({
      totalTasks: tasks.length,
      scoreDistribution: Object.entries(scoreDistribution).map(([name, value]) => ({ name: `Score ${name}`, value })),
      actionTakenStats: formatStats(actionTakenStats),
      justificationStats: formatStats(justificationStats),
      reasonStats: formatStats(reasonStats).slice(0, 10),
      companyStats: formatStats(companyStats).slice(0, 10),
      recentTasks: tasks.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50)
    });
  } catch (error) {
    console.error("Error in getPreventionDeepDiveStats:", error);
    res.status(500).json({ error: error.message });
  }
};

// Upload and process audit Excel sheet
export const uploadAuditSheet = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const XLSX = await import('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); // defval to ensure empty cells are present

    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ error: "Excel file is empty" });
    }

    // Identify columns handling
    const firstRow = jsonData[0];
    const columnKeys = Object.keys(firstRow);

    // Find critical columns
    const slidKey = columnKeys.find(key =>
      key.toLowerCase().replace(/[^a-z0-9]/g, '') === 'slid'
    );

    // "HH" column - Interview Date
    const hhKey = columnKeys.find(key => key.trim().toUpperCase() === 'HH');

    // NPS Columns
    const npsScoreKey = columnKeys.find(key => key.includes('Question 1 (NPS) - Scale Value'));
    const npsCommentKey = columnKeys.find(key => key.includes('Question 1 (NPS) - Scale Comment'));

    if (!slidKey) {
      return res.status(400).json({
        error: "SLID column not found in Excel. Please ensure the file has a 'SLID' column.",
        availableColumns: columnKeys
      });
    }

    // --- Persistence Logic ---
    const uploadDir = path.join(__dirname, '../uploads/audit_sheets');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${req.file.originalname}`;
    const filePath = path.join(uploadDir, filename);

    // Save file to disk
    await fs.promises.writeFile(filePath, req.file.buffer);

    // Create Audit Log entry
    const auditLog = await AuditLog.create({
      filename: filename,
      originalName: req.file.originalname,
      path: filePath,
      uploadedBy: req.user._id,
      status: 'Uploaded',
      auditType: 'DVOC',
      importStats: {
        totalRows: jsonData.length,
        updatedTasks: 0
      }
    });

    // Helper for Excel Dates
    const parseExcelDate = (serial) => {
      if (!serial) return null;
      if (typeof serial === 'number' && serial > 20000) {
        const date = new Date((serial - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
      return serial;
    };

    // Extract unique SLIDs from Excel
    const excelSlids = [...new Set(jsonData.map(row => row[slidKey]).filter(Boolean))];

    // Find matching customer issues from BOTH sources (OJO and Reach Supervisors)
    const [ojoIssues, reachIssues] = await Promise.all([
      CustomerIssueSchema.find({ slid: { $in: excelSlids } })
        .select('slid fromMain fromSub reporter reporterNote createdAt date solved issues resolveDate'),
      ReachSupervisorIssue.find({ slid: { $in: excelSlids } })
        .select('slid fromMain fromSub reporter reporterNote createdAt date solved issues resolveDate source')
    ]);

    // Create a map for quick lookup
    const issueMap = new Map();

    // Process OJO (Manual) Issues
    ojoIssues.forEach(issue => {
      if (!issueMap.has(issue.slid)) issueMap.set(issue.slid, []);
      issueMap.get(issue.slid).push({ ...issue.toObject(), _sourceType: 'OJO Team (Manual)' });
    });

    // Process Reach (Audit) Issues
    reachIssues.forEach(issue => {
      if (!issueMap.has(issue.slid)) issueMap.set(issue.slid, []);
      issueMap.get(issue.slid).push({ ...issue.toObject(), _sourceType: 'Reach Supervisors (Audit)' });
    });

    // Process each row from Excel
    const results = jsonData.map(row => {
      const slid = row[slidKey];
      const issues = issueMap.get(slid) || [];

      // Look for Interview Date in HH column
      let interviewDate = null;
      if (hhKey && row[hhKey]) {
        interviewDate = parseExcelDate(row[hhKey]);
        row[hhKey] = interviewDate || row[hhKey];
      }

      const evaluationScore = npsScoreKey ? row[npsScoreKey] : null;
      const customerComment = npsCommentKey ? row[npsCommentKey] : null;

      return {
        ...row,
        _slid: slid,
        _interviewDate: interviewDate,
        _evaluationScore: evaluationScore,
        _customerComment: customerComment,
        _hasMatch: issues.length > 0,
        _matchCount: issues.length,
        _matchedIssues: issues.map(issue => ({
          id: issue._id,
          fromMain: issue.fromMain,
          fromSub: issue.fromSub,
          reporter: issue.reporter,
          reporterNote: issue.reporterNote,
          date: issue.date || issue.createdAt,
          solved: issue.solved,
          issues: issue.issues,
          sourceType: issue._sourceType
        }))
      };
    });

    // Summary statistics
    const totalRows = results.length;
    const matchedRows = results.filter(r => r._hasMatch).length;
    const unmatchedRows = totalRows - matchedRows;
    const totalMatches = results.reduce((sum, r) => sum + r._matchCount, 0);

    // --- Persist Detailed Records ---
    const auditRecordsData = results.map(r => ({
      auditId: auditLog._id,
      slid: r._slid,
      interviewDate: r._interviewDate,
      evaluationScore: r._evaluationScore,
      customerFeedback: r._customerComment,
      isMatched: r._hasMatch,
      matchedIssues: r._matchedIssues.map(issue => issue.id),
      rawRowData: r
    }));

    await AuditRecord.insertMany(auditRecordsData);

    res.status(200).json({
      success: true,
      auditId: auditLog._id, // Return the ID for the commit step
      summary: {
        totalRows,
        matchedRows,
        unmatchedRows,
        totalMatches,
        matchRate: totalRows > 0 ? ((matchedRows / totalRows) * 100).toFixed(1) : 0
      },
      data: results,
      columns: columnKeys
    });

  } catch (error) {
    console.error("Error processing audit sheet:", error);
    res.status(500).json({ error: error.message });
  }
};

// --- Reach Supervisors Audit Flow ---

export const uploadReachSupervisorAudit = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const XLSX = await import('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });

    if (!jsonData.length) return res.status(400).json({ error: "Excel file is empty" });

    const columnKeys = Object.keys(jsonData[0]);
    const slidKey = columnKeys.find(key => key.toLowerCase().replace(/[^a-z0-9]/g, '') === 'slid');

    if (!slidKey) return res.status(400).json({ error: "SLID column not found" });

    const uploadDir = path.join(__dirname, '../uploads/reach_sheets');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `reach-${Date.now()}-${req.file.originalname}`;
    const filePath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filePath, req.file.buffer);

    const auditLog = await AuditLog.create({
      filename,
      originalName: req.file.originalname,
      path: filePath,
      uploadedBy: req.user._id,
      status: 'Uploaded',
      auditType: 'ReachSupervisors',
      importStats: { totalRows: jsonData.length, matchedRows: 0, updatedTasks: 0 }
    });

    const results = jsonData.map(row => ({
      ...row,
      _slid: row[slidKey],
      _status: 'Pending'
    }));

    res.status(200).json({
      auditId: auditLog._id,
      filename: auditLog.originalName,
      stats: auditLog.importStats,
      records: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const commitReachSupervisorData = async (req, res) => {
  try {
    const { auditId } = req.body;
    const auditLog = await AuditLog.findById(auditId);
    if (!auditLog || auditLog.status === 'Imported') {
      return res.status(400).json({ error: "Invalid audit or already imported" });
    }

    const fileBuffer = await fs.promises.readFile(auditLog.path);
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });

    const columnKeys = Object.keys(jsonData[0]);
    const slidKey = columnKeys.find(key => key.toLowerCase().replace(/[^a-z0-9]/g, '') === 'slid');
    const reporterKey = columnKeys.find(k => k.toLowerCase().includes('reporter') || k.toLowerCase().includes('agent')) || slidKey;
    const noteKey = columnKeys.find(k => k.toLowerCase().includes('note') || k.toLowerCase().includes('comment') || k.toLowerCase().includes('feedback')) || slidKey;
    const teamKey = columnKeys.find(k => k.toLowerCase().includes('team') || k.toLowerCase().includes('vendor')) || slidKey;
    const hhKey = columnKeys.find(key => key.trim().toUpperCase() === 'HH');

    const issuesToCreate = jsonData.map(row => {
      let interviewDate = null;
      if (hhKey && row[hhKey]) {
        if (typeof row[hhKey] === 'number' && row[hhKey] > 20000) {
          interviewDate = new Date((row[hhKey] - 25569) * 86400 * 1000);
        } else {
          interviewDate = new Date(row[hhKey]);
        }
      }

      return {
        slid: String(row[slidKey]),
        fromMain: "Reach Supervisors Audit",
        fromSub: auditLog.originalName,
        reporter: String(row[reporterKey] || "Reach Auditor"),
        reporterNote: String(row[noteKey] || "No note provided"),
        contactMethod: "Reach Audit",
        teamCompany: String(row[teamKey] || "Unknown"),
        issues: [{ category: "Audit Reach" }],
        solved: "no",
        assignedTo: "Reach Supervisors",
        source: "Reach Supervisors",
        auditId: auditLog._id,
        interviewDate: (interviewDate && !isNaN(interviewDate.getTime())) ? interviewDate : null
      };
    });

    await ReachSupervisorIssue.insertMany(issuesToCreate);

    auditLog.status = 'Imported';
    auditLog.importStats.updatedTasks = issuesToCreate.length;
    await auditLog.save();

    res.status(200).json({ success: true, message: `Imported ${issuesToCreate.length} issues.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const commitAuditData = async (req, res) => {
  try {
    const { auditId } = req.body;
    const auditLog = await AuditLog.findById(auditId);

    if (!auditLog) {
      return res.status(404).json({ error: "Audit log not found" });
    }

    if (auditLog.status === 'Imported') {
      return res.status(400).json({ error: "This file has already been imported." });
    }

    // Read file from disk
    const fileBuffer = await fs.promises.readFile(auditLog.path);
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    // Identify columns handling (same logic as upload)
    const firstRow = jsonData[0];
    const columnKeys = Object.keys(firstRow);
    const slidKey = columnKeys.find(key => key.toLowerCase().replace(/[^a-z0-9]/g, '') === 'slid');
    const hhKey = columnKeys.find(key => key.trim().toUpperCase() === 'HH');
    const npsScoreKey = columnKeys.find(key => key.includes('Question 1 (NPS) - Scale Value'));
    const npsCommentKey = columnKeys.find(key => key.includes('Question 1 (NPS) - Scale Comment'));

    if (!slidKey) return res.status(400).json({ error: "Invalid file structure (missing SLID)" });

    let updatedCount = 0;
    const parseExcelDate = (serial) => {
      if (!serial) return null;
      if (typeof serial === 'number' && serial > 20000) {
        return new Date((serial - 25569) * 86400 * 1000);
      }
      return new Date(serial); // Try parsing string
    };

    for (const row of jsonData) {
      const slid = row[slidKey];
      if (!slid) continue;

      const updates = {};

      if (hhKey && row[hhKey]) {
        const date = parseExcelDate(row[hhKey]);
        if (date && !isNaN(date.getTime())) updates.interviewDate = date;
      }

      if (npsScoreKey && row[npsScoreKey] !== undefined) {
        updates.evaluationScore = Number(row[npsScoreKey]);
      }

      if (npsCommentKey && row[npsCommentKey]) {
        updates.customerFeedback = String(row[npsCommentKey]);
      }

      if (Object.keys(updates).length > 0) {
        // Use findOneAndUpdate to get the task ID for linking
        const task = await TaskSchema.findOneAndUpdate(
          { slid: slid },
          { $set: updates },
          { new: true }
        );

        if (task) {
          updatedCount++;
          // Also update the AuditRecord status and link it
          await AuditRecord.findOneAndUpdate(
            { auditId: auditId, slid: slid },
            {
              $set: {
                status: 'Imported',
                linkedTask: task._id
              },
              $push: {
                actionLog: {
                  action: 'Imported',
                  performedBy: req.user._id,
                  note: 'Automatically imported via Bulk Commit'
                }
              }
            }
          );
        }
      }
    }

    // Update Audit Log
    auditLog.status = 'Imported';
    auditLog.importStats = {
      totalRows: jsonData.length,
      updatedTasks: updatedCount
    };
    await auditLog.save();

    res.status(200).json({
      success: true,
      message: `Import completed. Updated ${updatedCount} tasks.`,
      stats: auditLog.importStats
    });

  } catch (error) {
    console.error("Error committing audit data:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const { auditType = 'DVOC' } = req.query;
    const logs = await AuditLog.find({ auditType })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const downloadAuditSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const auditLog = await AuditLog.findById(id);

    if (!auditLog) {
      return res.status(404).json({ error: "Audit log not found" });
    }

    if (!fs.existsSync(auditLog.path)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    res.download(auditLog.path, auditLog.originalName);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ error: error.message });
  }
};

export const savePreventionStrategy = async (req, res) => {
  try {
    const { content } = req.body;

    // Create new strategy (always append new one, or update single one?)
    // Requirement is "keep a copy", implies history? Or just "a prevention strategy"?
    // Let's assume a single active strategy for now, or just create new versions.
    // Creating new document for version history is safer.

    const strategy = await PreventionStrategy.create({
      content,
      updatedBy: req.user._id
    });

    res.status(200).json(strategy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPreventionStrategy = async (req, res) => {
  try {
    // Get the latest strategy
    const strategy = await PreventionStrategy.findOne()
      .sort({ createdAt: -1 })
      .populate('updatedBy', 'name');

    res.status(200).json(strategy || { content: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAuditRecords = async (req, res) => {
  try {
    const { auditId } = req.params;
    const { page = 1, limit = 100, isMatched } = req.query;

    const query = { auditId };
    if (isMatched !== undefined) {
      query.isMatched = isMatched === 'true';
    }

    let recordsQuery = AuditRecord.find(query)
      .populate({
        path: 'matchedIssues',
        select: 'reporter reporterNote slid date createdAt fromMain fromSub issues resolveDate'
      })
      .populate({
        path: 'linkedTask',
        select: 'slid reason subReason rootCause evaluationScore interviewDate pisDate customerFeedback assignedTo gaiaCheck gaiaContent responsible',
        populate: { path: 'assignedTo', select: 'name email' }
      });

    if (parseInt(limit) !== 0) {
      recordsQuery = recordsQuery
        .limit(limit * 1)
        .skip((page - 1) * limit);
    }

    const records = await recordsQuery.exec();
    const count = await AuditRecord.countDocuments(query);

    res.status(200).json({
      records,
      totalPages: parseInt(limit) === 0 ? 1 : Math.ceil(count / limit),
      currentPage: parseInt(limit) === 0 ? 1 : page,
      totalRecords: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAuditDeepStats = async (req, res) => {
  try {
    const { auditId } = req.params;

    const auditLog = await AuditLog.findById(auditId);

    // Find records for this audit and populate linkedTask
    const records = await AuditRecord.find({ auditId }).populate('linkedTask');

    if (!records || records.length === 0) {
      return res.status(200).json({
        noRecords: true,
        message: "This audit was uploaded before deep analytics were enabled or has no row-level data."
      });
    }

    const total = records.length;
    const matchedRecords = records.filter(r => r.isMatched);
    const matchedCount = matchedRecords.length;
    const unmatched = total - matchedCount;

    // NPS Calculation from Audit Rows
    const validScores = records.filter(r => r.evaluationScore !== null && r.evaluationScore !== undefined).map(r => r.evaluationScore);
    const promoters = validScores.filter(s => s >= 9).length;
    const detractors = validScores.filter(s => s <= 6).length;
    const neutrals = validScores.length - promoters - detractors;

    const nps = validScores.length > 0
      ? (((promoters - detractors) / validScores.length) * 100).toFixed(1)
      : "N/A";

    // KPI: Manual (OJO) Performance among overlaps - categorize by AUDIT score
    const manualPromoterRecords = matchedRecords.filter(r => r.evaluationScore >= 9);
    const manualDetractorRecords = matchedRecords.filter(r => r.evaluationScore >= 1 && r.evaluationScore <= 6);
    const manualNeutralRecords = matchedRecords.filter(r => r.evaluationScore >= 7 && r.evaluationScore <= 8);
    const manualUnscoredRecords = matchedRecords.filter(r => r.evaluationScore === null || r.evaluationScore === undefined);

    const manualPromoters = manualPromoterRecords.length;
    const manualDetractors = manualDetractorRecords.length;
    const manualNeutrals = manualNeutralRecords.length;
    const manualUnscored = manualUnscoredRecords.length;
    const validManualScores = manualPromoters + manualNeutrals + manualDetractors;

    const manualOverlapNps = validManualScores > 0
      ? (((manualPromoters - manualDetractors) / validManualScores) * 100).toFixed(1)
      : "N/A";

    // Tracker side stats for comparison
    let trackerStats = null;
    if (auditLog && auditLog.startDate && auditLog.endDate) {
      const start = new Date(auditLog.startDate);
      const end = new Date(auditLog.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const tasksInPeriod = await TaskSchema.find({
        interviewDate: { $gte: start, $lte: end }
      }).select('evaluationScore');

      const trackerTotal = tasksInPeriod.length;
      const trackerPromoters = tasksInPeriod.filter(t => t.evaluationScore >= 9).length;
      const trackerDetractors = tasksInPeriod.filter(t => t.evaluationScore <= 6).length;
      const trackerNps = trackerTotal > 0
        ? (((trackerPromoters - trackerDetractors) / trackerTotal) * 100).toFixed(1)
        : "N/A";

      trackerStats = {
        total: trackerTotal,
        promoters: trackerPromoters,
        detractors: trackerDetractors,
        nps: trackerNps
      };
    }

    // "Samples Token" (DVOC) Alignment Stats
    const itnRelated = records.filter(r => {
      const raw = JSON.stringify(r.rawRowData).toLowerCase();
      return raw.includes('technical') || raw.includes('support') || raw.includes('itn');
    }).length;

    res.status(200).json({
      summary: {
        total,
        matched: matchedCount,
        unmatched,
        matchRate: ((matchedCount / total) * 100).toFixed(1)
      },
      npsData: {
        score: nps,
        promoters,
        detractors,
        neutrals,
        validSample: validScores.length
      },
      manualOverlapStats: {
        score: manualOverlapNps,
        promoters: manualPromoters,
        detractors: manualDetractors,
        neutrals: manualNeutrals,
        unscored: manualUnscored,
        totalMatched: matchedCount,
        slidLists: {
          promoters: manualPromoterRecords.map(r => r.slid),
          neutrals: manualNeutralRecords.map(r => r.slid),
          detractors: manualDetractorRecords.map(r => r.slid),
          unscored: manualUnscoredRecords.map(r => r.slid)
        }
      },
      trackerStats,
      dvocMetrics: {
        totalSamples: total,
        npsRelated: validScores.length,
        itnRelated,
        promotersPercentage: ((promoters / total) * 100).toFixed(1),
        detractorsPercentage: ((detractors / total) * 100).toFixed(1),
        neutralsPercentage: ((neutrals / total) * 100).toFixed(1)
      },
      potentialRegistrationGaps: records.filter(r => !r.isMatched && r.evaluationScore <= 8).length,
      neutralMatches: records.filter(r => r.isMatched && r.evaluationScore >= 7 && r.evaluationScore <= 8).length
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update individual audit record details
 */
export const updateAuditRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const updates = req.body;

    const record = await AuditRecord.findById(recordId);
    if (!record) return res.status(404).json({ error: "Record not found" });

    // Update allowed fields
    const allowedFields = ['slid', 'interviewDate', 'evaluationScore', 'customerFeedback', 'isMatched', 'matchedIssues'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) record[field] = updates[field];
    });

    record.actionLog.push({
      action: 'Edited',
      performedBy: req.user._id,
      note: updates.note || 'Details updated via dashboard'
    });

    await record.save();
    res.status(200).json({ success: true, record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Manually create a task from an audit record
 */
export const processAuditRecordManually = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { taskData } = req.body; // Additional task fields from front-end

    const record = await AuditRecord.findById(recordId);
    if (!record) return res.status(404).json({ error: "Record not found" });

    if (record.status === 'Imported' || record.status === 'Manually Added') {
      return res.status(400).json({ error: "Record already processed" });
    }

    // Create the task
    const newTask = await TaskSchema.create({
      ...taskData,
      slid: record.slid,
      interviewDate: record.interviewDate,
      evaluationScore: record.evaluationScore,
      customerFeedback: record.customerFeedback,
      auditRef: record.auditId,
      recordRef: record._id
    });

    record.status = 'Manually Added';
    record.linkedTask = newTask._id;
    record.actionLog.push({
      action: 'Task Created',
      performedBy: req.user._id,
      note: `Manually added to tracker as task ID: ${newTask._id}`
    });

    await record.save();
    res.status(200).json({ success: true, taskId: newTask._id, message: "Task created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Revert a processed audit record (Undo)
 */
export const revertAuditRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const record = await AuditRecord.findById(recordId);
    if (!record) return res.status(404).json({ error: "Record not found" });

    if (record.status === 'Pending') {
      return res.status(400).json({ error: "Record is already in pending state" });
    }

    // If it was manually added, we might want to delete the task? Or just unlink it?
    // User requested "Undo", usually means revert the action.
    if (record.linkedTask) {
      await TaskSchema.findByIdAndDelete(record.linkedTask);
    }

    record.status = 'Pending';
    record.linkedTask = undefined;
    record.actionLog.push({
      action: 'Reverted',
      performedBy: req.user._id,
      note: 'Status reverted to Pending'
    });

    await record.save();
    res.status(200).json({ success: true, message: "Action reverted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAuditLogDates = async (req, res) => {
  try {
    const { auditId } = req.params;
    const { startDate, endDate } = req.body;

    const auditLog = await AuditLog.findByIdAndUpdate(
      auditId,
      {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      },
      { new: true }
    );

    if (!auditLog) return res.status(404).json({ error: "Audit log not found" });

    res.status(200).json({ message: "Audit dates updated successfully", auditLog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
