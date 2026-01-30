import { TaskSchema } from "../models/taskModel.js";
import { CustomerIssueSchema } from "../models/customerIssueModel.js";
import { FavouriteSchema } from "../models/favouriteModel.js";
import { TrashSchema } from "../models/trashModel.js";
import { ArchiveSchema } from "../models/archiveModel.js";
import { TaskTicket } from "../models/taskTicketModel.js";
import mongoose from "mongoose";

export const addTask = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] === "") {
        req.body[key] = null;
      }
    });

    const task = new TaskSchema({
      ...req.body,
      createdBy: req.user._id,
    });

    const initialTicket = new TaskTicket({
      taskId: task._id,
      mainCategory: "Todo",
      status: "Todo",
      note: "Initial task creation",
      agentName: "SYSTEM",
      recordedBy: req.user._id,
    });

    await task.save({ session });
    await initialTicket.save({ session });

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
      },
      { $project: { tickets: 0 } }
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
      { $project: { "subTasks.checkpoints": 0, tickets: 0 } }
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
      .sort({ eventDate: 1, timestamp: 1 });
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getIssuePreventionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build query
    const query = {
      evaluationScore: { $lte: 8 }
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // 1. Fetch all Detractor and Neutral tasks (score <= 8)
    const criticalTasks = await TaskSchema.find(query)
      .select('slid evaluationScore customerFeedback createdAt interviewDate pisDate status teamName teamCompany subReason rootCause reason requestNumber operation customerName contactNumber tarrifName customerType governorate district priority validationStatus assignedTo')
      .populate('assignedTo', 'name email');

    const taskSlids = criticalTasks.map(t => t.slid);

    // 3. Find matching CustomerIssue records for these SLIDs
    // distinct issues categories
    const priorReports = await CustomerIssueSchema.find({
      slid: { $in: taskSlids }
    }).select('slid fromMain fromSub reporter reporterNote createdAt date solved issues resolveDate closedAt dispatched dispatchedAt closedBy');

    // 3. Aggregate data
    const overlaps = criticalTasks.map(task => {
      const reports = priorReports.filter(r => r.slid === task.slid);
      if (reports.length > 0) {
        return {
          task,
          reports
        };
      }
      return null;
    }).filter(item => item !== null);

    // 4. Source Breakdown
    const sourceBreakdown = priorReports.reduce((acc, report) => {
      const source = report.fromMain || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    // 4b. Overlap Source Breakdowns (Crucial for KPI Card)
    const overlapMainBreakdown = overlaps.reduce((acc, item) => {
      const source = item.reports[0]?.fromMain || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    const overlapSubBreakdown = overlaps.reduce((acc, item) => {
      const source = item.reports[0]?.fromSub || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    // 5. Calculate Prevention Gap (Time between first report and task creation) - unused but potential for future

    // 6. Reporter Stats (Who reported issues that became detractors?)
    const reporterStats = priorReports.reduce((acc, report) => {
      const reporter = report.reporter || 'Unknown';
      acc[reporter] = (acc[reporter] || 0) + 1;
      return acc;
    }, {});

    // 7. Trend Data (Overlaps by Month)
    const trendData = overlaps.reduce((acc, item) => {
      if (!item.task.interviewDate) return acc;
      const date = new Date(item.task.interviewDate);
      const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // 8. Reason Stats (Root Cause Analysis)
    const reasonStats = overlaps.reduce((acc, item) => {
      const reason = item.task.reason || 'Unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

    // 9. Company Stats (Vendor Performance)
    const companyStats = overlaps.reduce((acc, item) => {
      const company = item.task.teamCompany || 'Unknown';
      acc[company] = (acc[company] || 0) + 1;
      return acc;
    }, {});

    // 10. Reporter Comparison Stats (Top Non-Preventive Reporters)
    const reporterComparisonMap = {};

    // 11. Diagnosis Accuracy & QoS/Installation Analysis
    let totalMatches = 0;
    let totalComparisons = 0;

    const qosMatrix = {
      confirmed: 0,
      falseAlarm: 0,
      missed: 0
    };

    const installationMatrix = {
      confirmed: 0,
      falseAlarm: 0,
      missed: 0
    };

    // Process Efficiency Stats
    let totalResolutionTime = 0; // Field Team Speed
    let totalClosureTime = 0;    // Supervisor Speed
    let totalLifecycleTime = 0;  // End-to-End
    let countResolution = 0;
    let countClosure = 0;
    let countLifecycle = 0;
    const pendingBottlenecks = [];
    const now = new Date();

    // Removed impactStats as requested

    overlaps.forEach(item => {
      const taskReason = item.task.reason || "Unknown Task Reason";
      const interviewDate = item.task.interviewDate ? new Date(item.task.interviewDate) : null;

      item.reports.forEach(report => {
        const reporter = report.reporter || "Unknown Reporter";
        const reportDate = new Date(report.date || report.createdAt);

        // Process Efficiency Calculations (Refined Logic)
        const now = new Date();

        // 1. Supervisor Dispatch Speed: Reported -> Dispatched (OR Reported -> Now if undispatched)
        let dispatchEnd = report.dispatchedAt ? new Date(report.dispatchedAt) : (report.dispatched === 'no' ? now : null);

        // Fallback for historical 'yes' without date
        if (!dispatchEnd && report.dispatched === 'yes') dispatchEnd = reportDate;

        if (dispatchEnd && dispatchEnd >= reportDate) {
          const dispatchTime = (dispatchEnd - reportDate) / (1000 * 60 * 60 * 24);
          totalClosureTime += dispatchTime;
          countClosure++;
        }

        // 2. Field Resolution Speed (Dispatched -> Resolved OR Dispatched -> Now)
        // Only measure field speed if a dispatch event exists
        if (report.dispatchedAt || report.dispatched === 'yes') {
          let resStart = report.dispatchedAt ? new Date(report.dispatchedAt) : reportDate;
          let resEnd = report.resolveDate ? new Date(report.resolveDate) : (report.solved === 'no' ? now : null);

          if (resStart && resEnd && resEnd >= resStart) {
            const resTime = (resEnd - resStart) / (1000 * 60 * 60 * 24);
            totalResolutionTime += resTime;
            countResolution++;
          }
        }

        // 3. Total Lifecycle: Reported -> Closed (OR Reported -> Now if open)
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
            originalReport: report // Send full object for viewing
          });
        }

        // Calculate Gap (Days)
        const gap = interviewDate ? Math.abs((interviewDate - reportDate) / (1000 * 60 * 60 * 24)) : 0;

        // Get all categories from report
        const reportedCategories = report.issues && report.issues.length > 0
          ? report.issues.map(i => i.category)
          : ["No Category"];

        const reportedCategoriesString = reportedCategories.join(", ");

        // Check for Match (Case-insensitive, simplistic check)
        // We assume "Match" if ANY reported category includes the task reason string, or vice versa
        // Ideally this should be a mapped comparison (e.g. "Slow Net" -> "QoS")
        const isMatch = reportedCategories.some(cat =>
          cat.toLowerCase().includes(taskReason.toLowerCase()) ||
          taskReason.toLowerCase().includes(cat.toLowerCase())
        );

        totalComparisons++;
        if (isMatch) totalMatches++;

        // QoS Analysis
        const reportedQoS = reportedCategories.some(cat => cat.toLowerCase().includes("qos"));
        const actualQoS = taskReason.toLowerCase().includes("qos");

        if (reportedQoS && actualQoS) qosMatrix.confirmed++;
        else if (reportedQoS && !actualQoS) qosMatrix.falseAlarm++;
        else if (!reportedQoS && actualQoS) qosMatrix.missed++;

        // Installation Analysis
        const reportedInstall = reportedCategories.some(cat => cat.toLowerCase().includes("install"));
        const actualInstall = taskReason.toLowerCase().includes("install");

        if (reportedInstall && actualInstall) installationMatrix.confirmed++;
        else if (reportedInstall && !actualInstall) installationMatrix.falseAlarm++;
        else if (!reportedInstall && actualInstall) installationMatrix.missed++;

        // --- Existing Reporter Logic ---
        if (!reporterComparisonMap[reporter]) {
          reporterComparisonMap[reporter] = {
            reporterName: reporter,
            totalNonPrevented: 0,
            comparisons: []
          };
        }

        reporterComparisonMap[reporter].totalNonPrevented++;

        const existingComp = reporterComparisonMap[reporter].comparisons.find(
          c => c.reportedCategory === reportedCategoriesString && c.actualReason === taskReason
        );

        if (existingComp) {
          existingComp.count++;
        } else {
          reporterComparisonMap[reporter].comparisons.push({
            reportedCategory: reportedCategoriesString,
            actualReason: taskReason,
            count: 1
          });
        }
      });
    });

    const globalCategoryReasonMatrix = overlaps.reduce((acc, item) => {
      const taskReason = item.task.reason || "Unknown Task Reason";
      item.reports.forEach(report => {
        const reportedCategories = report.issues && report.issues.length > 0
          ? report.issues.map(i => i.category)
          : ["No Category"];

        reportedCategories.forEach(cat => {
          if (!acc[cat]) acc[cat] = {};
          acc[cat][taskReason] = (acc[cat][taskReason] || 0) + 1;
        });
      });
      return acc;
    }, {});

    const reporterComparisonStats = Object.values(reporterComparisonMap)
      .sort((a, b) => b.totalNonPrevented - a.totalNonPrevented)
      .slice(0, 10);

    const stats = {
      totalCriticalTasks: criticalTasks.length,
      reportedOverlapCount: overlaps.length,
      overlapMainBreakdown,
      overlapSubBreakdown,
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
      installationMatrix, // Add newly calculated matrix
      processEfficiency: {
        avgResolutionTime: countResolution > 0 ? (totalResolutionTime / countResolution).toFixed(1) : 0,
        avgDispatchTime: countClosure > 0 ? (totalClosureTime / countClosure).toFixed(1) : 0, // Using countClosure for dispatch as per historical naming
        avgLifecycleTime: countLifecycle > 0 ? (totalLifecycleTime / countLifecycle).toFixed(1) : 0,
        oldestPending: pendingBottlenecks.sort((a, b) => b.age - a.age),
        countResolution,
        countClosure
      },
      overlaps: overlaps.sort((a, b) => b.task.createdAt - a.task.createdAt),
      preventionRate: criticalTasks.length > 0
        ? ((overlaps.length / criticalTasks.length) * 100).toFixed(2)
        : 0
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

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
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
