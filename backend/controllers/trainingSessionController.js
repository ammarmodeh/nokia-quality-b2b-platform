import { TrainingSession } from "../models/trainingSessionModel.js";

// @desc    Fetch all training sessions
// @route   GET /api/training-sessions
// @access  Public
export const getTrainingSessions = async (req, res) => {
  try {
    const sessions = await TrainingSession.find({})
      .populate("participants")
      .sort({ sessionDate: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single training session by ID
// @route   GET /api/training-sessions/:id
// @access  Public
export const getTrainingSessionById = async (req, res) => {
  try {
    const session = await TrainingSession.findById(req.params.id).populate("participants");

    if (session) {
      res.json(session);
    } else {
      res.status(404).json({ message: "Training Session not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
