import { TrashSchema } from "../models/trashModel.js";
import { TaskSchema } from "../models/taskModel.js";
import mongoose from "mongoose";

// Add task to trash
export const addToTrash = async (req, res) => {
  try {
    const {
      slid,
      pisDate,
      contactNumber,
      requestNumber,
      governorate,
      district,
      teamName,
      teamId,
      teamCompany,
      date,
      tarrifName,
      customerType,
      customerFeedback,
      customerName,
      reason,
      interviewDate,
      priority,
      status,
      assignedTo,
      whomItMayConcern,
      createdBy,
      category,
      validationStatus,
      validationCat,
      responsibility,
      readBy,
      taskLogs,
      subTasks,
      evaluationScore,
      // readByWhenClosed,
      notifications,
      deletedBy,
      deletionReason
    } = req.body;

    if (!slid || !deletedBy) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: slid and deletedBy"
      });
    }

    const trashItem = new TrashSchema({
      slid,
      pisDate,
      contactNumber,
      requestNumber,
      governorate,
      district,
      teamName,
      teamId,
      teamCompany,
      date,
      tarrifName,
      customerType,
      customerFeedback,
      customerName,
      reason,
      interviewDate,
      priority,
      status,
      assignedTo,
      whomItMayConcern,
      createdBy,
      category,
      validationStatus,
      validationCat,
      responsibility,
      readBy,
      taskLogs,
      subTasks,
      evaluationScore,
      // readByWhenClosed,
      notifications,
      deletedBy,
      deletionReason: deletionReason || "No reason provided",
    });

    await trashItem.save();

    res.status(201).json({
      success: true,
      message: "Task moved to trash successfully",
      data: trashItem
    });
  } catch (error) {
    // console.error("Error adding to trash:", error);
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

    // 2. Create new task from trash data
    const {
      slid,
      pisDate,
      contactNumber,
      requestNumber,
      governorate,
      district,
      teamName,
      teamId,
      teamCompany,
      date,
      tarrifName,
      customerType,
      customerFeedback,
      customerName,
      reason,
      interviewDate,
      priority,
      status,
      assignedTo,
      whomItMayConcern,
      createdBy,
      category,
      validationStatus,
      validationCat,
      responsibility,
      readBy,
      taskLogs,
      subTasks,
      evaluationScore,
      // readByWhenClosed,
      notifications
    } = trashItem;

    const newTask = new TaskSchema({
      slid,
      pisDate,
      contactNumber,
      requestNumber,
      governorate,
      district,
      teamName,
      teamId,
      teamCompany,
      date,
      tarrifName,
      customerType,
      customerFeedback,
      customerName,
      reason,
      interviewDate,
      priority,
      status,
      assignedTo,
      whomItMayConcern,
      createdBy,
      category,
      validationStatus,
      validationCat,
      responsibility,
      readBy,
      taskLogs,
      subTasks,
      evaluationScore,
      // readByWhenClosed,
      notifications,
      isDeleted: false,
      createdAt: new Date(),
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
