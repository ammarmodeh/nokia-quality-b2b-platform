import { TrashSchema } from "../models/trashModel.js";


// Get all trashes
export const getAllTrashes = async (req, res) => {
  try {
    const trashes = await TrashSchema.find();
    res.status(200).json(trashes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Add trash
export const addTrash = async (req, res) => {
  const data = req.body
  // console.log({ data });
  // return
  try {
    const trash = await TrashSchema.create(data);
    res.status(200).json(trash);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Delete a task permanently from trash collection
export const deleteTaskPermanently = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete the task from the trash collection
    const deletedTask = await TrashSchema.findByIdAndDelete(id);
    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found in trash" });
    }

    res.status(200).json({ message: "Task deleted permanently", deletedTask });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};