import { CustomerIssueSchema } from "../models/customerIssueModel.js";
import { CustomerIssueLog } from "../models/customerIssueLogModel.js";

const calculateDiff = (oldData, newData) => {
  const diff = {};
  const skipFields = ['_id', 'createdAt', 'updatedAt', '__v'];

  for (const key in newData) {
    if (skipFields.includes(key)) continue;

    // Handle nested arrays (like 'issues')
    if (Array.isArray(newData[key])) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        diff[key] = { from: oldData[key], to: newData[key] };
      }
      continue;
    }

    // Handle dates
    if (newData[key] instanceof Date || (typeof newData[key] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(newData[key]))) {
      const oldDate = oldData[key] ? new Date(oldData[key]).toISOString().split('T')[0] : null;
      const newDate = newData[key] ? new Date(newData[key]).toISOString().split('T')[0] : null;
      if (oldDate !== newDate) {
        diff[key] = { from: oldDate, to: newDate };
      }
      continue;
    }

    if (oldData[key] !== newData[key]) {
      diff[key] = { from: oldData[key], to: newData[key] };
    }
  }
  return diff;
};

// Create a new customer issue
export const createIssue = async (req, res) => {
  try {
    // Filter out issues where category is empty
    if (req.body.issues && Array.isArray(req.body.issues)) {
      req.body.issues = req.body.issues.filter(issue => issue.category && issue.category.trim() !== '');
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

    // Create Log
    await CustomerIssueLog.create({
      slid: savedIssue.slid,
      issueId: savedIssue._id,
      action: 'ADD',
      performedBy: req.user?.name || 'Unknown',
      details: `New issue reported for SLID: ${savedIssue.slid} from ${savedIssue.fromMain}`,
      newData: savedIssue
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
    if (req.query.slid) query.slid = req.query.slid; // Exact match for duplicate checking
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
        { ticketId: { $regex: search, $options: 'i' } },
        { reporter: { $regex: search, $options: 'i' } },
        { teamCompany: { $regex: search, $options: 'i' } },
        { assignedTo: { $regex: search, $options: 'i' } },
        { installingTeam: { $regex: search, $options: 'i' } },
        { fromMain: { $regex: search, $options: 'i' } },
        { fromSub: { $regex: search, $options: 'i' } },
        { closedBy: { $regex: search, $options: 'i' } },
        { assigneeNote: { $regex: search, $options: 'i' } },
        { resolutionDetails: { $regex: search, $options: 'i' } },
        { customerContact: { $regex: search, $options: 'i' } },
        { area: { $regex: search, $options: 'i' } },
        { callerName: { $regex: search, $options: 'i' } },
        { callerDetails: { $regex: search, $options: 'i' } },
        { "issues.category": { $regex: search, $options: 'i' } },
        { "issues.subCategory": { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = -1; // Descending
    } else {
      sortOptions.createdAt = -1; // Default sort by newest
    }

    const total = await CustomerIssueSchema.countDocuments(query);

    // Aggregation pipeline for GAIA metrics
    const pipeline = [
      { $match: query },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "tasktickets",
          localField: "_id",
          foreignField: "taskId",
          as: "tickets"
        }
      },
      {
        $addFields: {
          latestGaia: {
            $arrayElemAt: [
              { $sortArray: { input: "$tickets", sortBy: { timestamp: -1 } } },
              0
            ]
          }
        }
      },
      { $project: { tickets: 0 } }
    ];

    const issues = await CustomerIssueSchema.aggregate(pipeline);

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
    const { id } = req.params;
    const oldIssue = await CustomerIssueSchema.findById(id);
    if (!oldIssue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }
    const oldData = oldIssue.toObject();

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
      id,
      updateData,
      { new: true, runValidators: true }
    );

    // Create Log with Diff
    const newData = updatedIssue.toObject();
    const changes = calculateDiff(oldData, newData);
    const changeCount = Object.keys(changes).length;

    res.status(200).json({
      success: true,
      data: updatedIssue
    });

    if (changeCount > 0) {
      await CustomerIssueLog.create({
        slid: updatedIssue.slid,
        issueId: updatedIssue._id,
        action: 'UPDATE',
        performedBy: req.user?.name || 'Unknown',
        details: `Issue updated for SLID: ${updatedIssue.slid}. (${changeCount} fields modified)`,
        prevData: oldData,
        newData: newData,
        changes: changes // Store explicit changes
      });
    }
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

    // Create Log
    await CustomerIssueLog.create({
      slid: deletedIssue.slid,
      issueId: deletedIssue._id,
      action: 'DELETE',
      performedBy: req.user?.name || 'Unknown',
      details: `Issue deleted for SLID: ${deletedIssue.slid}`,
      prevData: deletedIssue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get logs for customer issues
export const getIssueLogs = async (req, res) => {
  try {
    const { slid, limit = 50 } = req.query;
    const query = {};
    if (slid) {
      // Check if it's a valid ObjectId for direct ID search
      if (slid.match(/^[0-9a-fA-F]{24}$/)) {
        query.$or = [
          { issueId: slid },
          { slid: { $regex: slid, $options: 'i' } }
        ];
      } else {
        query.slid = { $regex: slid, $options: 'i' };
      }
    }

    const logs = await CustomerIssueLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};