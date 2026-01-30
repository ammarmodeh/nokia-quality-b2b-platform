import { TrashSchema } from "../models/trashModel.js";
import { TaskSchema } from "../models/taskModel.js";
import mongoose from "mongoose";

// Add task to trash
export const addToTrash = async (req, res) => {
  try {
    const { slid, deletedBy, ...taskData } = req.body;

    if (!slid || !deletedBy) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: slid and deletedBy"
      });
    }

    // Create trash item with a snapshot of all data
    const trashItem = new TrashSchema({
      slid,
      requestNumber: taskData.requestNumber,
      originalTaskId: taskData._id || taskData.id,
      customerName: taskData.customerName || taskData.customer?.customerName,
      contactNumber: taskData.contactNumber || taskData.customer?.contactNumber,
      operation: taskData.operation || taskData.technicalDetails?.operation,
      teamName: taskData.teamName,
      status: taskData.status,
      priority: taskData.priority,
      createdBy: taskData.createdBy,
      taskData: taskData, // Store the full object for restoration
      deletedBy
    });

    await trashItem.save();

    res.status(201).json({
      success: true,
      message: "Task moved to trash successfully",
      data: trashItem
    });
  } catch (error) {
    console.error("Error adding to trash:", error);
    res.status(500).json({
      success: false,
      message: "Failed to move task to trash",
      error: error.message
    });
  }
};

// Get paginated trash items
export const getTrashItems = async (req, res) => {
  try {
    const trashes = await TrashSchema.find()
      .populate('deletedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 }); // Sort by newest first

    // console.log('Trash Items:', trashes); // Log the trash items

    res.status(200).json({
      success: true,
      data: trashes // Return all items directly
    });
  } catch (error) {
    // console.error("Error getting trash items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve trash items",
      error: error.message
    });
  }
};


// Permanently delete single item
export const deletePermanently = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const trashItem = await TrashSchema.findById(id).session(session);
    if (!trashItem) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Trash item not found"
      });
    }

    await TrashSchema.findByIdAndDelete(id).session(session);
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Permanently deleted from trash",
      data: {
        id: trashItem._id,
        slid: trashItem.slid
      }
    });
  } catch (error) {
    await session.abortTransaction();
    // console.error("Error deleting permanently:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete permanently",
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Empty entire trash
export const emptyTrash = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await TrashSchema.deleteMany({}).session(session);
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Trash emptied successfully",
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    await session.abortTransaction();
    // console.error("Error emptying trash:", error);
    res.status(500).json({
      success: false,
      message: "Failed to empty trash",
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Restore task from trash
export const restoreFromTrash = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // 1. Get item from trash
    const trashItem = await TrashSchema.findById(id).session(session);
    if (!trashItem) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Trash item not found"
      });
    }

    // 2. Create new task from trash data snapshot
    const { taskData } = trashItem;

    if (!taskData) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "This trash item is using an old format and cannot be restored."
      });
    }

    const newTask = new TaskSchema({
      ...taskData,
      isDeleted: false,
      updatedAt: new Date()
    });

    await newTask.save({ session });

    // 3. Remove from trash
    await TrashSchema.findByIdAndDelete(id).session(session);

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Task restored successfully",
      data: newTask
    });
  } catch (error) {
    await session.abortTransaction();
    // console.error("Error restoring from trash:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore from trash",
      error: error.message
    });
  } finally {
    session.endSession();
  }
};
