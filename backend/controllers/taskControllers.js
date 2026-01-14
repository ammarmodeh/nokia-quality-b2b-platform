import { TaskSchema } from "../models/taskModel.js";
import { CustomerIssueSchema } from "../models/customerIssueModel.js";
import { FavouriteSchema } from "../models/favouriteModel.js";
import { TrashSchema } from "../models/trashModel.js";
import { ArchiveSchema } from "../models/archiveModel.js";
import mongoose from "mongoose";

export const addTask = async (req, res) => {
  try {
    console.log("addTask Request Body (Raw):", req.body);

    // Sanitize empty strings to null to prevent CastErrors for Date/Number fields
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] === "") {
        req.body[key] = null;
      }
    });

    const {
      slid,
      operation,
      contactNumber,
      customerName,
      requestNumber,
      governorate,
      district,
      date,
      priority,
      assignedTo,
      whomItMayConcern,
      reason,
      interviewDate,
      category,
      tarrifName,
      teamName,
      teamId,
      customerFeedback,
      customerType,
      teamCompany,
      evaluationScore,
      pisDate,
      validationStatus,
      responsible,
      subReason,
      rootCause,
      ontType,
      freeExtender,
      extenderType,
      extenderNumber,
      closureCallEvaluation,
      closureCallFeedback,
    } = req.body;

    // Define the predefined subtasks with the desired structure
    const predefinedSubtasks = [
      {
        title: "Task Reception",
        note: "",
        progress: 0,
        status: "Open",
      },
      {
        title: "Customer Contact and Appointment Scheduling",
        note: "",
        progress: 0,
        status: "Open",
      },
      {
        title: "On-Site Problem Resolution",
        note: "",
        progress: 0,
        status: "Open",
      },
      {
        title: "Task Closure for Declined Visits",
        note: "",
        progress: 0,
        status: "Open",
      },
    ];

    const task = new TaskSchema({
      slid,
      operation,
      pisDate,
      contactNumber,
      requestNumber,
      governorate,
      district,
      tarrifName,
      customerFeedback,
      customerName,
      customerType,
      reason,
      interviewDate,
      date,
      priority,
      validationStatus,
      assignedTo,
      whomItMayConcern,
      category,
      teamName,
      teamId,
      teamCompany,
      evaluationScore,
      createdBy: req.user._id,
      subTasks: predefinedSubtasks,
      responsible,
      subReason,
      rootCause,
      ontType,
      freeExtender,
      extenderType,
      extenderNumber,
      closureCallEvaluation,
      closureCallFeedback,
      subtaskType: "original", // Set the default subtask type to "original"
    });

    task.taskLogs.push({
      action: "created",
      user: req.user._id,
      description: `Ticket created with SLID "${slid}"`,
    });

    await task.save();
    res.status(201).json({ message: "Task created successfully!", task });
  } catch (error) {
    console.error("Add Task Error:", error);
    if (error.code === 11000) {
      // Extract duplicate field
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists. Please use a unique value.` });
    }
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};


export const updateTask = async (req, res) => {
  // Sanitize empty strings to null to prevent CastErrors for Date/Number fields
  Object.keys(req.body).forEach((key) => {
    if (req.body[key] === "") {
      req.body[key] = null;
    }
  });

  const updatedData = req.body;
  const id = req.params.id;

  try {
    const task = await TaskSchema.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const originalValues = {
      slid: task.slid,
      readBy: [...(task.readBy || [])],
      // readByWhenClosed: [...(task.readByWhenClosed || [])],
      ...Object.keys(updatedData).reduce((acc, key) => {
        if (task[key] !== undefined) acc[key] = task[key];
        return acc;
      }, {})
    };

    let changes = [];
    for (let key in updatedData) {
      if (key !== "readBy") {
        const oldValue = JSON.stringify(task[key]);
        const newValue = JSON.stringify(updatedData[key]);
        if (oldValue !== newValue) {
          changes.push(`${key} changed from ${oldValue} to ${newValue}`);
          task[key] = updatedData[key];
        }
      }
    }

    task.readBy = [...new Set([...originalValues.readBy, ...(updatedData.readBy || [])])];
    // task.readByWhenClosed = [...new Set([...originalValues.readByWhenClosed, ...(updatedData.readByWhenClosed || [])])];

    const updateLog = {
      action: "updated",
      user: req.user._id,
      description: changes.length > 0
        ? `Task updated: ${changes.join(", ")}`
        : "Task fields updated",
      timestamp: new Date()
    };

    if (changes.length > 0) {
      task.taskLogs.push(updateLog);
    }

    const updateOperation = {
      $set: {},
      $addToSet: { readBy: { $each: originalValues.readBy } },
      $push: {
        taskLogs: {
          $each: [updateLog],
          $position: 0
        }
      }
    };

    const syncFields = [
      'slid', 'operation', 'pisDate', 'contactNumber', 'requestNumber', 'governorate',
      'district', 'teamName', 'teamCompany', 'date', 'tarrifName',
      'customerType', 'customerFeedback', 'customerName', 'interviewDate',
      'priority', 'status', 'assignedTo', 'whomItMayConcern',
      'category', 'validationStatus', 'responsible', 'reason', 'subReason', 'rootCause',
      'ontType', 'freeExtender', 'extenderType', 'extenderNumber',
      'closureCallEvaluation', 'closureCallFeedback',
      'subTasks', 'evaluationScore', 'isDeleted',
    ];

    syncFields.forEach(field => {
      if (updatedData[field] !== undefined) {
        updateOperation.$set[field] = updatedData[field];
      } else {
        updateOperation.$set[field] = task[field];
      }
    });

    if (originalValues.slid) {
      const favourites = await FavouriteSchema.find({ slid: originalValues.slid });
      for (const favourite of favourites) {
        for (const field of syncFields) {
          if (updatedData[field] !== undefined) {
            favourite[field] = updatedData[field];
          } else if (task[field] !== undefined) {
            favourite[field] = task[field];
          }
        }
        favourite.readBy = [...new Set([...favourite.readBy, ...originalValues.readBy])];
        favourite.taskLogs = [...(favourite.taskLogs || []), updateLog];
        await favourite.save();
      }
    }

    if (originalValues.slid) {
      await TaskSchema.updateMany(
        {
          $or: [
            { slid: originalValues.slid, _id: { $ne: task._id } },
            ...(task.slid !== originalValues.slid ? [{ slid: task.slid }] : [])
          ]
        },
        updateOperation
      );
    }

    const updatedTask = await task.save();
    res.status(200).json(updatedTask);

  } catch (error) {
    res.status(500).json({
      message: "Error updating task",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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


// backend/controllers/taskController.js
export const updateSubtask = async (req, res) => {
  try {
    const taskId = req.params.id;
    if (!taskId) {
      return res.status(400).json({ message: "Task ID is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid Task ID" });
    }

    const { subtasks: newSubtasks, subtaskType, ontType, speed, serviceRecipientInitial, serviceRecipientQoS } = req.body;

    if (!newSubtasks || !Array.isArray(newSubtasks)) {
      return res.status(400).json({ message: "Subtasks must be a non-empty array" });
    }

    const task = await TaskSchema.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Validate subtaskType
    const validSubtaskTypes = ["original", "visit", "phone", "no_answer", "others"];
    if (subtaskType && !validSubtaskTypes.includes(subtaskType)) {
      return res.status(400).json({ message: "Invalid subtaskType" });
    }

    // Update task with the correct subtaskType
    if (subtaskType) {
      task.subtaskType = subtaskType;
    }

    // Validate and normalize subtasks structure
    const normalizedSubtasks = newSubtasks.map((subtask, index) => {
      if (!subtask.title) {
        throw new Error(`Subtask at index ${index} is missing required field: title`);
      }

      return {
        _id: subtask._id || undefined,
        title: subtask.title,
        note: subtask.note || "",
        dateTime: subtask.dateTime || null,
        status: subtask.status || "Open",
        shortNote: subtask.shortNote || "",
        checkpoints: subtask.checkpoints ? subtask.checkpoints.map((checkpoint, cpIndex) => {
          if (!checkpoint.name) {
            throw new Error(`Checkpoint at index ${cpIndex} in subtask "${subtask.title}" is missing required field: name`);
          }
          return {
            _id: checkpoint._id || undefined,
            name: checkpoint.name,
            checked: checkpoint.checked || false,
            score: checkpoint.score || 0,
            options: checkpoint.options ? {
              type: checkpoint.options.type || null,
              question: checkpoint.options.question || "",
              choices: checkpoint.options.choices || [],
              selected: checkpoint.options.selected || null,
              value: checkpoint.options.value || "",
              followUpQuestion: checkpoint.options.followUpQuestion ? {
                question: checkpoint.options.followUpQuestion.question || "",
                choices: checkpoint.options.followUpQuestion.choices || [],
                selected: checkpoint.options.followUpQuestion.selected || null,
                actionTaken: checkpoint.options.followUpQuestion.actionTaken ? {
                  question: checkpoint.options.followUpQuestion.actionTaken.question || "",
                  choices: checkpoint.options.followUpQuestion.actionTaken.choices || [],
                  selected: checkpoint.options.followUpQuestion.actionTaken.selected || null,
                  justification: checkpoint.options.followUpQuestion.actionTaken.justification ? {
                    question: checkpoint.options.followUpQuestion.actionTaken.justification.question || "",
                    choices: checkpoint.options.followUpQuestion.actionTaken.justification.choices || [],
                    selected: checkpoint.options.followUpQuestion.actionTaken.justification.selected || null,
                    notes: checkpoint.options.followUpQuestion.actionTaken.justification.notes ? {
                      question: checkpoint.options.followUpQuestion.actionTaken.justification.notes.question || "",
                      value: checkpoint.options.followUpQuestion.actionTaken.justification.notes.value || ""
                    } : null
                  } : null
                } : null
              } : null,
              actionTaken: checkpoint.options.actionTaken ? {
                question: checkpoint.options.actionTaken.question || "",
                choices: checkpoint.options.actionTaken.choices || [],
                selected: checkpoint.options.actionTaken.selected || null,
                justification: checkpoint.options.actionTaken.justification ? {
                  question: checkpoint.options.actionTaken.justification.question || "",
                  choices: checkpoint.options.actionTaken.justification.choices || [],
                  selected: checkpoint.options.actionTaken.justification.selected || null,
                  notes: checkpoint.options.actionTaken.justification.notes ? {
                    question: checkpoint.options.actionTaken.justification.notes.question || "",
                    value: checkpoint.options.actionTaken.justification.notes.value || ""
                  } : null
                } : null
              } : null,
            } : null,
            signalTestNotes: checkpoint.signalTestNotes || "",
          };
        }) : [],
      };
    });

    // After normalizing checkpoints, add validation
    // In your updateSubtask controller:
    normalizedSubtasks.forEach((subtask) => {
      subtask.checkpoints.forEach((checkpoint) => {
        if (checkpoint.options?.simpleQuestion) return;
        // Check followUpQuestion actionTaken justification
        const followUpAction = checkpoint.options?.followUpQuestion?.actionTaken;
        if (followUpAction?.selected === "no_action" &&
          followUpAction.justification &&
          !followUpAction.justification.selected) {
          throw new Error(`Justification required for "No corrective action" in ${checkpoint.name}`);
        }

        // Check main actionTaken justification
        const mainAction = checkpoint.options?.actionTaken;
        if (mainAction?.selected === "no_action" &&
          mainAction.justification &&
          !mainAction.justification.selected) {
          throw new Error(`Justification required for "No corrective action" in ${checkpoint.name}`);
        }
      });
    });

    task.subTasks = normalizedSubtasks;
    if (subtaskType && ["original", "visit", "phone"].includes(subtaskType)) {
      task.subtaskType = subtaskType;
    }
    // Update task-level fields
    task.ontType = ontType || null;
    task.speed = speed || null;
    task.serviceRecipientInitial = serviceRecipientInitial || null;
    task.serviceRecipientQoS = serviceRecipientQoS || null;

    task.status = getStatusFromCheckpoints(task.subTasks);

    const updateOperation = {
      $set: {
        subTasks: task.subTasks,
        status: task.status,
        subtaskType: task.subtaskType,
        ontType: task.ontType,
        speed: task.speed,
        serviceRecipientInitial: task.serviceRecipientInitial,
        serviceRecipientQoS: task.serviceRecipientQoS,
      },
    };

    await Promise.all([
      task.save(),
      task.slid && TaskSchema.updateMany(
        { slid: task.slid, _id: { $ne: task._id } },
        updateOperation
      ),
      task.slid && FavouriteSchema.updateMany(
        { slid: task.slid },
        updateOperation
      ),
    ]);
    console.log("Saved task:", JSON.stringify(task.subTasks, null, 2)); // Debug log

    res.status(200).json(task);
  } catch (error) {
    console.error("Update subtask error:", error);
    res.status(500).json({
      message: "Error updating subtasks",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Helper function to determine status based on checkpoints
// Helper function to determine status based on checkpoints and activity
function getStatusFromCheckpoints(subtasks) {
  if (!subtasks || subtasks.length === 0) return "Todo";

  // Check if all subtasks are "Closed"
  const allSubtasksClosed = subtasks.every(subtask => subtask.status === "Closed");

  if (allSubtasksClosed) return "Closed";

  // Check if any subtask is active
  // A subtask is active if it's "Closed", has a note, or has any checked checkpoints.
  const someSubtasksActive = subtasks.some(subtask => {
    const hasNote = subtask.note && subtask.note.trim().length > 0;
    const hasCheckedCheckpoints = subtask.checkpoints && subtask.checkpoints.some(cp => cp.checked);
    return subtask.status === "Closed" || hasNote || hasCheckedCheckpoints;
  });

  if (someSubtasksActive) return "In Progress";

  return "Todo";
}



export const getCurrentYearTasks = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const tasks = await TaskSchema.find({
      isDeleted: false,
      interviewDate: { $gte: startOfYear }
    })
      .select("-taskLogs -notifications -readBy")
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
    const { search, priority, status, governorate, district, teamCompany, assignedTo, teamName, validationStatus } = req.query;

    const mongoQuery = { isDeleted: false };

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

    const tasks = await TaskSchema.find(mongoQuery)
      .select("-taskLogs -notifications -readBy")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

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
    const { search, priority, status, governorate, district, teamCompany, assignedTo, teamName, validationStatus } = req.query;

    const mongoQuery = {
      isDeleted: false,
      evaluationScore: { $gte: 1, $lte: 6 }
    };

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
      .populate("createdBy", "name email");

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
    const { search, priority, status, governorate, district, teamCompany, assignedTo, teamName, validationStatus } = req.query;

    const mongoQuery = {
      isDeleted: false,
      evaluationScore: { $gte: 7, $lte: 8 }
    };

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
      .populate("createdBy", "name email");

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
      .select("-taskLogs -notifications -readBy")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    // Self-healing: Ensure all tasks have correct status based on subtasks
    let hasChanges = false;
    for (const task of tasks) {
      const correctStatus = getStatusFromCheckpoints(task.subTasks);
      if (task.status !== correctStatus) {
        task.status = correctStatus;
        await task.save();
        hasChanges = true;
      }
    }

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

    // Self-healing: Ensure all tasks have correct status based on subtasks
    for (const task of tasks) {
      const correctStatus = getStatusFromCheckpoints(task.subTasks);
      if (task.status !== correctStatus) {
        task.status = correctStatus;
        await task.save();
      }
    }

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
      .populate("createdBy", "name email");

    return res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getDeletedTasks = async (req, res) => {
  try {
    const deletedTasks = await TaskSchema.find({ isDeleted: true });

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

    const taskLog = {
      action: "deleted",
      user: req.user._id,
      description: `Task deleted by user ${req.user.name}`,
      timestamp: new Date(),
    };

    await TaskSchema.updateOne(
      { _id: req.params.id },
      { $push: { taskLogs: taskLog } }
    );

    await TaskSchema.deleteOne({ _id: req.params.id });

    res.status(200).json({ status: 204, message: "Task deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const softDeleteTask = async (req, res) => {
  try {
    const task = await TaskSchema.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const taskLog = {
      action: "deleted",
      user: req.user._id,
      description: `Task deleted by user ${req.user.name}`,
      timestamp: new Date(),
    };

    const updatedTask = await TaskSchema.updateOne(
      { _id: req.params.id },
      { $set: { isDeleted: true } }
    );

    res.status(200).json({ status: 204, message: "Task deleted successfully!", updatedTask });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const viewTask = async (req, res) => {
  try {
    const { id: taskId } = req.params;
    const userId = req.user._id;

    const task = await TaskSchema.findById(taskId)
      .populate("createdBy", "name")
      .populate("taskLogs.user", "name");

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!task.readBy.includes(userId)) {
      task.readBy.push(userId);
      task.taskLogs.push({
        action: "read",
        user: userId,
        description: `Task viewed by user ${req.user.name}`,
      });

      await task.save({ timestamps: false });
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const notifications = async (req, res) => {
  const userId = req.user._id;

  try {
    const unreadNotifications = await TaskSchema.find({
      readBy: { $nin: [userId] },
    }).sort({ createdAt: -1 });
    res.status(200).json(unreadNotifications);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching notifications' });
  }
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
  try {
    const count = await TaskSchema.countDocuments({
      'notifications.recipient': req.user._id,
      'notifications.read': false
    });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const tasksWithNotifications = await TaskSchema.find({
      'notifications.recipient': req.user._id
    })
      .select('slid notifications')
      .populate('notifications.recipient', 'name');

    const notifications = tasksWithNotifications.flatMap(task =>
      task.notifications
        .filter(notification => notification.recipient._id.equals(req.user._id))
        .map(notification => ({
          ...notification.toObject(),
          taskSlid: task.slid,
          taskId: task._id
        }))
    );

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { taskId, notificationId } = req.params;

    const updatedTask = await TaskSchema.findOneAndUpdate(
      {
        _id: taskId,
        'notifications._id': notificationId,
        'notifications.recipient': req.user._id
      },
      { $set: { 'notifications.$.read': true } },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const createNotification = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { recipient, message } = req.body;
    console.log({ taskId, recipient, message });

    // Validate input
    if (!recipient || !message) {
      return res.status(400).json({ message: "Recipient and message are required" });
    }

    const task = await TaskSchema.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Log the creation of a notification for debugging and monitoring purposes
    console.log(`Creating notification for task: ${taskId}`);

    const notification = {
      recipient,
      message,
      read: false,
      createdAt: new Date()
    };

    task.notifications.push(notification);
    await task.save();

    // Log successful creation of notification
    console.log(`Notification created successfully for task: ${taskId}`);

    res.status(201).json(notification);
  } catch (error) {
    // Log the error for debugging purposes
    console.error(`Error creating notification for task ${taskId}:`, error);

    res.status(500).json({ error: error.message });
  }
};

export const clearNotifications = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await TaskSchema.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Log the clearing of notifications for debugging and monitoring purposes
    console.log(`Clearing notifications for task: ${taskId}`);

    // Clear the notifications array
    task.notifications = [];
    await task.save();

    // Log successful clearing of notifications
    console.log(`Notifications cleared successfully for task: ${taskId}`);

    res.status(200).json({ message: "Notifications cleared successfully" });
  } catch (error) {
    // Log the error for debugging purposes
    console.error(`Error clearing notifications for task ${taskId}:`, error);

    res.status(500).json({ error: error.message });
  }
};

export const getAllTasks = async (req, res) => {
  try {
    const tasks = await TaskSchema.find()
      .select("-taskLogs -notifications -readBy")
      .populate("assignedTo", "name email role")
      .populate("whomItMayConcern", "name email role")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    // Debug: Check if subReason and rootCause are present
    console.log("Sample task data (first task):", {
      slid: tasks[0]?.slid,
      subReason: tasks[0]?.subReason,
      rootCause: tasks[0]?.rootCause,
      reason: tasks[0]?.reason
    });

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching all tasks:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getIssuePreventionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build query
    const query = {
      evaluationScore: { $lte: 8 },
      isDeleted: false
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // 1. Fetch all Detractor and Neutral tasks (score <= 8)
    const criticalTasks = await TaskSchema.find(query)
      .select('slid evaluationScore customerFeedback createdAt interviewDate status teamName teamCompany subReason rootCause reason requestNumber operation customerName contactNumber tarrifName customerType governorate district priority validationStatus assignedTo subTasks')
      .populate('assignedTo', 'name email');

    const taskSlids = criticalTasks.map(t => t.slid);

    // 3. Find matching CustomerIssue records for these SLIDs
    // distinct issues categories
    const priorReports = await CustomerIssueSchema.find({
      slid: { $in: taskSlids }
    }).select('slid fromMain reporter reporterNote createdAt date solved issues resolveDate closedAt dispatched dispatchedAt closedBy');

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

    const reporterComparisonStats = Object.values(reporterComparisonMap)
      .sort((a, b) => b.totalNonPrevented - a.totalNonPrevented)
      .slice(0, 10);

    const stats = {
      totalCriticalTasks: criticalTasks.length,
      reportedOverlapCount: overlaps.length,
      sourceBreakdown,
      reporterStats,
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
