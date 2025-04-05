import { SuggestionSchema } from "../models/suggestionsModel.js";

// Create a new suggestion
export const createSuggestion = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const userId = req.user._id;

    const suggestion = new SuggestionSchema({
      user: userId,
      title,
      description,
      category,
    });

    await suggestion.save();

    res.status(201).json({
      success: true,
      data: suggestion,
      message: "Suggestion submitted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Get all suggestions (for admin)
export const getSuggestions = async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;

    const suggestions = await SuggestionSchema.find(filter)
      .populate("user", "name email")
      .populate("respondedBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Get suggestions by user
export const getUserSuggestions = async (req, res) => {
  try {
    const suggestions = await SuggestionSchema.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Update suggestion status (admin only)
export const updateSuggestionStatus = async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    const suggestion = await SuggestionSchema.findById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        error: "Suggestion not found",
      });
    }

    // Add to response log
    suggestion.responseLog.push({
      status: status || suggestion.status,
      response: adminResponse || '',
      respondedBy: req.user._id,
      respondedAt: new Date()
    });

    // Update suggestion
    suggestion.status = status || suggestion.status;
    suggestion.lastRespondedAt = new Date();
    suggestion.lastRespondedBy = req.user._id;

    await suggestion.save();

    res.status(200).json({
      success: true,
      data: suggestion,
      message: "Suggestion updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

export const getSuggestionDetails = async (req, res) => {
  try {
    const suggestion = await SuggestionSchema.findById(req.params.id)
      .populate("user", "name email")
      .populate("lastRespondedBy", "name")
      .populate("responseLog.respondedBy", "name");

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        error: "Suggestion not found",
      });
    }

    res.status(200).json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete suggestion (admin only)
export const deleteSuggestion = async (req, res) => {
  try {
    const suggestion = await SuggestionSchema.findByIdAndDelete(req.params.id);

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        error: "Suggestion not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {},
      message: "Suggestion deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// In suggestionsControllers.js
export const markSuggestionAsRead = async (req, res) => {
  try {
    const suggestion = await SuggestionSchema.findById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        error: "Suggestion not found",
      });
    }

    // Add user to readBy array if not already there
    if (!suggestion.readBy.includes(req.user._id)) {
      suggestion.readBy.push(req.user._id);

      // Update last responded fields if they don't exist
      if (!suggestion.lastRespondedAt) {
        suggestion.lastRespondedAt = new Date();
      }
      if (!suggestion.lastRespondedBy) {
        suggestion.lastRespondedBy = req.user._id;
      }

      await suggestion.save();
    }

    res.status(200).json({
      success: true,
      data: suggestion,
      message: "Suggestion marked as read",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Add this to your suggestionsControllers.js
export const markResponseAsRead = async (req, res) => {
  try {
    const { responseId } = req.body;
    const userId = req.user._id;
    const suggestion = await SuggestionSchema.findById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        error: "Suggestion not found",
      });
    }

    // Find the response in the log and mark as read
    const response = suggestion.responseLog.id(responseId);
    if (response) {
      if (!response.readBy) {
        response.readBy = [];
      }
      if (!response.readBy.includes(userId)) {
        response.readBy.push(userId);
        await suggestion.save();
      }
    }

    res.status(200).json({
      success: true,
      data: suggestion,
      message: "Response marked as read",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};