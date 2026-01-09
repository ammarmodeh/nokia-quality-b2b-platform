import { CustomerIssueSchema } from "../models/customerIssueModel.js";

// Create a new customer issue
export const createIssue = async (req, res) => {
  try {
    // Filter out issues where category is empty
    if (req.body.issues && Array.isArray(req.body.issues)) {
      req.body.issues = req.body.issues.filter(issue => issue.category && issue.category.trim() !== '');
    }

    if (!req.body.teamCompany) {
      return res.status(400).json({
        success: false,
        message: 'Team/company is required'
      });
    }

    const issueData = {
      ...req.body,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      pisDate: req.body.pisDate ? new Date(req.body.pisDate) : new Date(),
      resolveDate: (req.body.solved === 'yes' && req.body.resolveDate) ? new Date(req.body.resolveDate) : null
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

// Get all customer issues with pagination
export const getAllIssues = async (req, res) => {
  try {
    const { solved, assignedTo, teamCompany, pisDate, sortBy, search } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

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

    if (search) {
      query.$or = [
        { slid: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { ticketId: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = -1; // Descending
    } else {
      sortOptions.createdAt = -1; // Default sort by newest
    }

    const total = await CustomerIssueSchema.countDocuments(query);
    const issues = await CustomerIssueSchema.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: issues,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
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
    if (req.body.issues && Array.isArray(req.body.issues)) {
      req.body.issues = req.body.issues.filter(issue => issue.category && issue.category.trim() !== '');
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    if (req.body.pisDate) {
      updateData.pisDate = new Date(req.body.pisDate);
    }

    if (req.body.resolveDate) {
      updateData.resolveDate = new Date(req.body.resolveDate);
    } else if (req.body.solved === 'no') {
      updateData.resolveDate = null;
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