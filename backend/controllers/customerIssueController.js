import { CustomerIssueSchema } from "../models/customerIssueModel.js";

// Create a new customer issue
export const createIssue = async (req, res) => {
  try {
    const validTeams = ['INH-1', 'INH-2', 'INH-3', 'INH-4', 'INH-5', 'INH-6', 'Al-Dar 2', 'Orange Team', 'Others'];

    if (!req.body.teamCompany || !validTeams.includes(req.body.teamCompany)) {
      return res.status(400).json({
        success: false,
        message: 'Valid team/company is required'
      });
    }

    const issueData = {
      ...req.body,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      pisDate: req.body.pisDate ? new Date(req.body.pisDate) : new Date()
    };

    const newIssue = new CustomerIssueSchema(issueData);
    const savedIssue = await newIssue.save();

    res.status(201).json({
      success: true,
      data: savedIssue,
      message: 'Customer issue reported successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all customer issues
export const getAllIssues = async (req, res) => {
  try {
    const { solved, assignedTo, teamCompany, pisDate, sortBy } = req.query;
    const query = {};

    if (solved) query.solved = solved;
    if (assignedTo) query.assignedTo = assignedTo;
    if (teamCompany) query.teamCompany = teamCompany;
    if (pisDate) {
      const date = new Date(pisDate);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      query.pisDate = {
        $gte: date,
        $lt: nextDay
      };
    }

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = -1; // Descending
    } else {
      sortOptions.createdAt = -1; // Default sort by newest
    }

    const issues = await CustomerIssueSchema.find(query).sort(sortOptions);

    res.status(200).json({
      success: true,
      data: issues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single issue by ID
export const getIssueById = async (req, res) => {
  try {
    const issue = await CustomerIssueSchema.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }
    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update an issue
export const updateIssue = async (req, res) => {
  try {
    if (req.body.teamCompany) {
      const validTeams = ['INH-1', 'INH-2', 'INH-3', 'INH-4', 'INH-5', 'INH-6', 'Al-Dar 2', 'Orange Team', 'Others'];
      if (!validTeams.includes(req.body.teamCompany)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid team/company value'
        });
      }
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    if (req.body.pisDate) {
      updateData.pisDate = new Date(req.body.pisDate);
    }

    const updatedIssue = await CustomerIssueSchema.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedIssue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedIssue
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete an issue
export const deleteIssue = async (req, res) => {
  try {
    const deletedIssue = await CustomerIssueSchema.findByIdAndDelete(req.params.id);

    if (!deletedIssue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Issue deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};