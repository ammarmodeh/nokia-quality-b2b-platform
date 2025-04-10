import { ArchiveSchema } from "../models/archiveModel.js";
import { TaskSchema } from "../models/taskModel.js";

// Get all archives
export const getAllArchives = async (req, res) => {
  try {
    const archives = await ArchiveSchema.find();
    res.status(200).json(archives);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Add archive
export const addArchive = async (req, res) => {
  const data = req.body
  try {
    const archive = await ArchiveSchema.create(req.body);
    res.status(200).json(archive);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export const restoreFromArchive = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the archived task
    const archivedTask = await ArchiveSchema.findById(id);
    if (!archivedTask) {
      return res.status(404).json({ message: "Archived task not found" });
    }

    // Convert to plain object and remove _id to avoid duplicate key error
    const taskData = archivedTask.toObject();
    delete taskData._id;

    // Create new task from archive
    const restoredTask = await TaskSchema.create(taskData);

    // Delete from archive
    await ArchiveSchema.findByIdAndDelete(id);

    res.status(200).json(restoredTask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}