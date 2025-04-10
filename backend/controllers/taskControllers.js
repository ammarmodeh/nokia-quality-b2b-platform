import { FavouriteSchema } from "../models/favouriteModel.js";
import { TaskSchema } from "../models/taskModel.js";

export const addTask = async (req, res) => {
  try {
    const { slid, contactNumber, customerName, requestNumber, governorate, district,
      date, priority, assignedTo, whomItMayConcern, reason, interviewDate,
      category, tarrifName, teamName, teamId, customerFeedback, customerType,
      teamCompany, evaluationScore, pisDate, validationStatus, responsibility, validationCat,
    } = req.body;

    const predefinedSubtasks = [
      { title: "Receive the task", progress: 0, note: "" },
      { title: "Called to the customer and specify an appointment", progress: 0, note: "" },
      { title: "Reach at the customer and solve the problem", progress: 0, note: "" },
      { title: "If the customer refuses the visit to close the task", progress: 0, note: "" },
    ];

    const task = new TaskSchema({
      slid,
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
      responsibility,
      validationCat,
      // readByWhenClosed: []
    });

    task.taskLogs.push({
      action: "created",
      user: req.user._id,
      description: `Ticket created with SLID "${slid}"`,
    });

    await task.save();
    res.status(201).json({ message: "Task created successfully!", task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTask = async (req, res) => {
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
      if (key !== "readBy" && task[key] !== undefined) {
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
      'slid', 'pisDate', 'contactNumber', 'requestNumber', 'governorate',
      'district', 'teamName', 'teamCompany', 'date', 'tarrifName',
      'customerType', 'customerFeedback', 'customerName', 'reason',
      'interviewDate', 'priority', 'status', 'assignedTo', 'whomItMayConcern',
      'category', 'validationStatus', 'validationCat', 'responsibility',
      'subTasks', 'evaluationScore', 'isDeleted',
    ];

    syncFields.forEach(field => {
      if (updatedData[field] !== undefined) {
        updateOperation.$set[field] = updatedData[field];
      } else if (task[field] !== undefined) {
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

export const updateSubtask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const newSubtasks = req.body;

    const task = await TaskSchema.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const changes = [];
    const oldSubtasks = task.subTasks || [];

    // Check if this is a reset operation (all subtasks progress set to 0)
    const isResetOperation = newSubtasks.every(sub => sub.progress === 0) &&
      !oldSubtasks.every(sub => sub.progress === 0);

    newSubtasks.forEach((newSub, index) => {
      const oldSub = oldSubtasks[index];
      if (oldSub) {
        if (newSub.progress !== oldSub.progress) {
          changes.push(`Subtask "${newSub.title}" progress changed from ${oldSub.progress} to ${newSub.progress}`);
        }
        if (newSub.note !== oldSub.note) {
          changes.push(`Subtask "${newSub.title}" note changed`);
        }
      }
    });

    task.subTasks = newSubtasks;

    // If this is a reset operation, clear all notifications
    if (isResetOperation) {
      task.notifications = [];
      changes.push("All notifications cleared due to subtasks reset");
    }

    if (changes.length > 0) {
      const updateLog = {
        action: "updated",
        user: req.user._id,
        description: `Subtasks updated: ${changes.join(", ")}`,
        timestamp: new Date()
      };
      task.taskLogs.push(updateLog);
    }

    const updateOperation = {
      $set: {
        subTasks: newSubtasks,
        // Add notifications to the update operation if it's a reset
        ...(isResetOperation && { notifications: [] })
      }
    };

    if (changes.length > 0) {
      updateOperation.$push = {
        taskLogs: {
          $each: [{
            action: "updated",
            user: req.user._id,
            description: `Subtasks updated: ${changes.join(", ")}`,
            timestamp: new Date()
          }],
          $position: 0
        }
      };
    }

    await Promise.all([
      task.save(),
      task.slid && TaskSchema.updateMany(
        { slid: task.slid, _id: { $ne: task._id } },
        updateOperation
      ),
      task.slid && FavouriteSchema.updateMany(
        { slid: task.slid },
        updateOperation
      )
    ]);

    res.status(200).json(task);

  } catch (error) {
    res.status(500).json({
      message: "Error updating subtasks",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getAllTasks = async (req, res) => {
  try {
    const tasks = await TaskSchema.find({ isDeleted: false })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")

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

    const totalTasks = await TaskSchema.countDocuments({ isDeleted: false });
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]);
    }

    const tasks = await TaskSchema.find({ isDeleted: false })
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

    const totalTasks = await TaskSchema.countDocuments({ evaluationScore: { $gte: 1, $lte: 6 } });
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]);
    }

    const detractorTasks = await TaskSchema.find({ evaluationScore: { $gte: 1, $lte: 6 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    return res.json(detractorTasks);
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

    const totalTasks = await TaskSchema.countDocuments({ evaluationScore: { $gte: 7, $lte: 8 } });
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]);
    }

    const tasks = await TaskSchema.find({ evaluationScore: { $gte: 7, $lte: 8 } })
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

export const getTasksAssignedToMe = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const tasks = await TaskSchema.find({ assignedTo: currentUserId })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    return res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTasksAssignedToMePaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;

    const totalTasks = await TaskSchema.countDocuments({ assignedTo: req.user._id });
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]);
    }

    const tasks = await TaskSchema.find({ assignedTo: req.user._id })
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
    const detractorTasks = await TaskSchema.find({
      evaluationScore: { $gte: 1, $lte: 6 },
      assignedTo: req.user._id
    });

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

    const totalTasks = await TaskSchema.countDocuments({ evaluationScore: { $gte: 1, $lte: 6 }, assignedTo: req.user._id });
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]);
    }

    const tasks = await TaskSchema.find({ evaluationScore: { $gte: 1, $lte: 6 }, assignedTo: req.user._id })
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
    const neutralTasks = await TaskSchema.find({
      evaluationScore: { $gte: 7, $lte: 8 },
      assignedTo: req.user._id
    });

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

    const totalTasks = await TaskSchema.countDocuments({ evaluationScore: { $gte: 7, $lte: 8 }, assignedTo: req.user._id });
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]);
    }

    const tasks = await TaskSchema.find({ evaluationScore: { $gte: 7, $lte: 8 }, assignedTo: req.user._id })
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

    const task = await TaskSchema.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const notification = {
      recipient,
      message,
      read: false,
      createdAt: new Date()
    };

    task.notifications.push(notification);
    await task.save();

    res.status(201).json(notification);
  } catch (error) {
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

    // Clear the notifications array
    task.notifications = [];
    await task.save();

    res.status(200).json({ message: "Notifications cleared successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
