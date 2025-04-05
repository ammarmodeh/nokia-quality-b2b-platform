import { ArchiveSchema } from "../models/archiveModel.js";
import { FavouriteSchema } from "../models/favouriteModel.js";
import { TaskSchema } from "../models/taskModel.js";
import { TrashSchema } from "../models/trashModel.js";

export const addTask = async (req, res) => {
  try {
    const { slid, contactNumber, customerName, requestNumber, governorate, district,
      date, priority, assignedTo, whomItMayConcern, reason, interviewDate,
      category, tarrifName, teamName, teamId, customerFeedback, customerType,
      teamCompany, evaluationScore, pisDate, validationStatus, responsibility, validationCat,
    } = req.body;

    // console.log({ date });
    // const taskDate = new Date(date);
    // console.log({ taskDate });
    // if (isNaN(taskDate.getTime())) {
    //   return res.status(400).json({ error: "Invalid date format" });
    // }

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
      // status,
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
      validationCat
    });

    // Log task creation
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
    // 1. Find the original task
    const task = await TaskSchema.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // 2. Store original values before any updates
    const originalValues = {
      slid: task.slid,
      readBy: [...(task.readBy || [])],
      // Clone other important fields if needed
      ...Object.keys(updatedData).reduce((acc, key) => {
        if (task[key] !== undefined) acc[key] = task[key];
        return acc;
      }, {})
    };

    // 3. Track changes and update fields
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

    // 4. Handle readBy updates
    task.readBy = [...new Set([...originalValues.readBy, ...(updatedData.readBy || [])])];

    // 5. Prepare update log
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

    // 6. Prepare complete update operation for both collections
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

    // 7. Include ALL fields that should be synchronized
    const syncFields = [
      'slid', 'pisDate', 'contactNumber', 'requestNumber', 'governorate',
      'district', 'teamName', 'teamCompany', 'date', 'tarrifName',
      'customerType', 'customerFeedback', 'customerName', 'reason',
      'interviewDate', 'priority', 'status', 'assignedTo', 'whomItMayConcern',
      'category', 'validationStatus', 'validationCat', 'responsibility',
      'subTasks', 'evaluationScore', 'isDeleted'
    ];

    // Add fields to update operation from either updatedData or task
    syncFields.forEach(field => {
      if (updatedData[field] !== undefined) {
        updateOperation.$set[field] = updatedData[field];
      } else if (task[field] !== undefined) {
        updateOperation.$set[field] = task[field];
      }
    });

    // 8. Update Favourites collection FIRST (using original SLID)
    if (originalValues.slid) {
      // Find all favourites with original slid
      const favourites = await FavouriteSchema.find({ slid: originalValues.slid });

      // Update each favourite individually
      for (const favourite of favourites) {
        // Apply all field updates
        for (const field of syncFields) {
          if (updatedData[field] !== undefined) {
            favourite[field] = updatedData[field];
          } else if (task[field] !== undefined) {
            favourite[field] = task[field];
          }
        }

        // Handle special fields
        favourite.readBy = [...new Set([...favourite.readBy, ...originalValues.readBy])];
        favourite.taskLogs = [...(favourite.taskLogs || []), updateLog];

        // Save the updated favourite
        await favourite.save();
      }
    }

    // 9. Update other Tasks in Task collection (using original SLID)
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

    // 10. Finally save the main task (which may have new values)
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

    // 1. Find and update the main task
    const task = await TaskSchema.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // 2. Track changes in subtasks
    const changes = [];
    const oldSubtasks = task.subTasks || [];

    // Compare old and new subtasks
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

    // 3. Update the task's subtasks
    task.subTasks = newSubtasks;

    // 4. Add update log if there are changes
    if (changes.length > 0) {
      const updateLog = {
        action: "updated",
        user: req.user._id,
        description: `Subtasks updated: ${changes.join(", ")}`,
        timestamp: new Date()
      };
      task.taskLogs.push(updateLog);
    }

    // 5. Prepare update operation for both collections
    const updateOperation = {
      $set: { subTasks: newSubtasks }
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

    // 6. Update all related documents
    await Promise.all([
      // Update the main task
      task.save(),

      // Update other tasks with the same slid
      task.slid && TaskSchema.updateMany(
        { slid: task.slid, _id: { $ne: task._id } },
        updateOperation
      ),

      // Update favourites with the same slid
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

// Get All tasks without pagination
export const getAllTasks = async (req, res) => {
  try {
    const tasks = await TaskSchema.find({ isDeleted: false }) // Filtering only non-deleted tasks
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
// Get tasks with pagination
export const getTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;

    const totalTasks = await TaskSchema.countDocuments({ isDeleted: false });
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]); // Return an empty array instead of 204
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

// Get detractors w/o pagination
export const getDetractorTasks = async (req, res) => {
  try {
    const detractorTasks = await TaskSchema.find({
      evaluationScore: { $gte: 1, $lte: 6 },
    });

    res.status(200).json(detractorTasks);
  } catch (error) {
    console.error("Error fetching detractor tasks:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
// Get detractors with pagination
export const getDetractorTasksPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;

    const totalTasks = await TaskSchema.countDocuments({ evaluationScore: { $gte: 1, $lte: 6 } });
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]); // Return an empty array instead of 204
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
    console.error("Error fetching detractor tasks:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
// Get neutral tasks with pagination:
export const getNeutralTasksPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;

    const totalTasks = await TaskSchema.countDocuments({ evaluationScore: { $gte: 7, $lte: 8 } });
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]); // Return an empty array instead of 204
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
    const currentUserId = req.user._id; // Assuming the current user's ID is available in `req.user`
    const tasks = await TaskSchema.find({ assignedTo: currentUserId })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    return res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Get tasks assigned to me with pagination
export const getTasksAssignedToMePaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;

    const totalTasks = await TaskSchema.countDocuments({ assignedTo: req.user._id });
    const skip = (page - 1) * limit;

    if (skip >= totalTasks) {
      return res.json([]); // Return an empty array instead of 204
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
    console.error("Error fetching detractor tasks:", error);
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
      return res.json([]); // Return an empty array instead of 204
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
    console.error("Error fetching neutral tasks:", error);
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
      return res.json([]); // Return an empty array instead of 204
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


// Get deleted tasks
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

// Restore a task from trash to tasks collection
export const restoreTask = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the task in the trash collection
    const taskInTrash = await TrashSchema.findById(id);
    console.log({ taskInTrash });
    // return
    if (!taskInTrash) {
      return res.status(404).json({ message: "Task not found in trash" });
    }

    // Add the task back to the tasks collection
    const restoredTask = await TaskSchema.create(taskInTrash.toObject());

    // Delete the task from the trash collection
    await TrashSchema.findByIdAndDelete(id);

    res.status(200).json({ message: "Task restored successfully", restoredTask });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Restore a task from archive to tasks collection
export const restoreTaskFromArchive = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the task in the archive collection
    const taskInArchive = await ArchiveSchema.findById(id);
    if (!taskInArchive) {
      return res.status(404).json({ message: "Task not found in archive" });
    }

    // Add the task back to the tasks collection
    const restoredTask = await TaskSchema.create(taskInArchive.toObject());

    // Delete the task from the archive collection
    await ArchiveSchema.findByIdAndDelete(id);

    res.status(200).json({ message: "Task restored successfully", restoredTask });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export const searchTasks = async (req, res) => {
  const { query } = req.query;
  try {
    const tasks = await TaskSchema.find({ slid: { $regex: query, $options: 'i' } }); // Case-insensitive search
    // console.log({ tasks });
    res.json(tasks);
  } catch (error) {
    res.status(500).send("Error fetching tasks");
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await TaskSchema.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Log task deletion in a separate collection (if needed)
    const taskLog = {
      action: "deleted",
      user: req.user._id,
      description: `Task deleted by user ${req.user.name}`,
      timestamp: new Date(),
    };

    // Optional: Save logs before deletion (if logging is required)
    await TaskSchema.updateOne(
      { _id: req.params.id },
      { $push: { taskLogs: taskLog } }
    );

    await TaskSchema.deleteOne({ _id: req.params.id }); // Proper deletion

    res.status(200).json({ status: 204, message: "Task deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Soft Delete Task
export const softDeleteTask = async (req, res) => {
  try {
    const task = await TaskSchema.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Log task deletion in a separate collection (if needed)
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
    // console.log({ updatedTask });

    res.status(200).json({ status: 204, message: "Task deleted successfully!", updatedTask });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const viewTask = async (req, res) => {
  try {
    const { id: taskId } = req.params;
    const userId = req.user._id;

    // Find the task without updating the `lastUpdated` field
    const task = await TaskSchema.findById(taskId)
      .populate("createdBy", "name")
      .populate("taskLogs.user", "name");

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Check if the user has already read the task
    if (!task.readBy.includes(userId)) {
      // Add the user to the `readBy` array and log the "read" action
      task.readBy.push(userId);
      task.taskLogs.push({
        action: "read",
        user: userId,
        description: `Task viewed by user ${req.user.name}`,
      });

      // Save the task without updating the `lastUpdated` field
      await task.save({ timestamps: false }); // Disable timestamps for this save
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
    // Retrieve all distinct users who have marked any task as read
    const usersWhoReadTasks = await TaskSchema.distinct('readBy');
    // console.log({ usersWhoReadTasks });

    // Send back the list of users who have read at least one task
    res.status(200).json(usersWhoReadTasks);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users who have read tasks' });
  }
};

// Update Task by team id
export const updateTaskByTeamId = async (req, res) => {
  const { teamId } = req.params;
  const { teamName } = req.body;

  try {
    // Update all tasks with the matching teamId
    const result = await TaskSchema.updateMany(
      { teamId: teamId },
      { $set: { teamName: teamName } }
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({ message: 'Tasks updated successfully', updatedCount: result.modifiedCount });
    } else {
      res.status(404).json({ message: 'No tasks found with the specified teamId' });
    }
  } catch (error) {
    console.error('Error updating tasks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}