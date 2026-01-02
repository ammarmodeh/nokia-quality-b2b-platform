import { Settings } from "../models/settingsModel.js";

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await Settings.create({});
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching settings", error: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const updatedSettings = await Settings.findOneAndUpdate(
      {},
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.status(200).json(updatedSettings);
  } catch (error) {
    res.status(500).json({ message: "Error updating settings", error: error.message });
  }
};
