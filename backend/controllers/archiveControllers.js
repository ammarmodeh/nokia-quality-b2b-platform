import { ArchiveSchema } from "../models/archiveModel.js";
import { TrashSchema } from "../models/trashModel.js";


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