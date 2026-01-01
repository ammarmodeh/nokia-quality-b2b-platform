import { ONTType } from "../models/ontTypeModel.js";

export const createONTType = async (req, res) => {
  try {
    const { name, description } = req.body;

    const existingType = await ONTType.findOne({ name });
    if (existingType) {
      return res.status(400).json({ message: "ONT Type already exists" });
    }

    const ontType = await ONTType.create({ name, description });
    res.status(201).json(ontType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getONTTypes = async (req, res) => {
  try {
    const ontTypes = await ONTType.find({}).sort({ createdAt: -1 });
    res.status(200).json(ontTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteONTType = async (req, res) => {
  try {
    const { id } = req.params;
    const ontType = await ONTType.findByIdAndDelete(id);

    if (!ontType) {
      return res.status(404).json({ message: "ONT Type not found" });
    }

    res.status(200).json({ message: "ONT Type deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
