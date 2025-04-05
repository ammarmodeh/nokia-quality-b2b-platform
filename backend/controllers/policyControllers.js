// controllers/policyControllers.js
import bcrypt from 'bcryptjs';
import { UserSchema } from '../models/userModel.js';
import { PolicyAction } from '../models/policyModel.js';

/**
 * Validate the provided password against the stored hashed password.
 * @param {string} providedPassword - The password provided by the user.
 * @param {string} storedHashedPassword - The hashed password stored in the database.
 * @returns {Promise<boolean>} - Returns true if the password is valid, false otherwise.
 */
async function validatePassword(providedPassword, storedHashedPassword) {
  try {
    const isMatch = await bcrypt.compare(providedPassword, storedHashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Error validating password:', error);
    return false;
  }
}

const storeAcceptanceInDatabase = async (name, action, content, createdBy) => {
  const newPolicy = await PolicyAction.create({
    name,
    action,
    content,
    approvedBy: null, // Set the manager as the approver if action is 'agree'
    approvedAt: null, // Set the approval timestamp if action is 'agree'
    rejectedBy: null, // Set the manager as the rejecter if action is 'disagree'
    rejectedAt: null, // Set the rejection timestamp if action is 'disagree'
    createdBy, // Set the creator of the policy
    createdAt: Date.now(), // Set the creation timestamp
    lastUpdate: Date.now(), // Set the last update timestamp
  });

  return newPolicy;
};

export const addPolicy = async (req, res) => {
  const { action, password, name, content } = req.body;
  const userId = req.user.id;
  console.log({ action, password, name, content, userId });

  const user = await UserSchema.findById(userId)
  // console.log({ user });


  if (!user) {
    console.log(`User not found with ID: ${userId}`);
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const isValidPassword = await validatePassword(password, user.password);
  if (!isValidPassword) {
    console.log(`Invalid password provided by user: ${userId}`);
    return res.status(401).json({ success: false, message: 'Invalid password' });
  }

  try {
    const newPolicy = await PolicyAction.create({
      name,
      action,
      content,
      createdBy: userId,
      logs: [
        {
          action: 'create',
          details: `Policy "${name}" created by user ${user.name}`,
          performedBy: userId,
        },
      ],
    });

    // console.log(`New policy added: ${newPolicy.name} by user: ${user.name}`);
    return res.json({ success: true, message: 'Policy added successfully', policy: newPolicy });
  } catch (error) {
    console.error('Error adding policy:', error);
    return res.status(500).json({ success: false, message: 'Failed to add policy' });
  }
};

export const updatePolicy = async (req, res) => {
  const { id } = req.params; // Get the policy ID from the URL parameters
  const { name, content, action, password } = req.body; // Expect updated fields in the request body

  // Validate required fields
  if (!name || !content || !action || !password) {
    console.log('Missing required fields in update request');
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    // Fetch the manager's details from the database
    const manager = await UserSchema.findById(req.user.id); // Assuming `req.user` is set by the `protect` middleware
    if (!manager) {
      console.log(`Manager not found with ID: ${req.user.id}`);
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }

    // Check if the user is a manager
    if (!manager.isManager) {
      console.log(`User is not a manager: ${req.user.id}`);
      return res.status(403).json({ success: false, message: 'Not authorized, only managers can perform this action' });
    }

    // Validate the password
    const isValidPassword = await validatePassword(password, manager.password);
    if (!isValidPassword) {
      console.log(`Invalid password provided by manager: ${req.user.id}`);
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // Prepare the update object
    const updateFields = {
      name,
      content,
      action,
      lastUpdate: Date.now(),
    };

    // Handle different actions
    if (action === 'agree') {
      // Set approvedBy and approvedAt if the action is 'agree'
      updateFields.approvedBy = manager._id;
      updateFields.approvedAt = Date.now();
      updateFields.rejectedBy = null;
      updateFields.rejectedAt = null;
      console.log(`Policy approved by manager: ${req.user.name}`);
    } else if (action === 'disagree') {
      // Set rejectedBy and rejectedAt if the action is 'disagree'
      updateFields.rejectedBy = manager._id;
      updateFields.rejectedAt = Date.now();
      updateFields.approvedBy = null;
      updateFields.approvedAt = null;
      console.log(`Policy rejected by manager: ${req.user.name}`);
    } else if (action === 'pending') {
      // Nullify both approved and rejected fields if the action is 'pending'
      updateFields.approvedBy = null;
      updateFields.approvedAt = null;
      updateFields.rejectedBy = null;
      updateFields.rejectedAt = null;
      console.log(`Policy set to pending by manager: ${req.user.name}`);
    }

    // Add a log entry for the update
    const logEntry = {
      action: 'update',
      details: `Policy "${name}" updated by manager ${manager.name}. Action: ${action}`,
      performedBy: manager._id,
    };

    // Find the policy by ID and update its fields
    const updatedPolicy = await PolicyAction.findByIdAndUpdate(
      id,
      { ...updateFields, $push: { logs: logEntry } },
      { new: true }
    );

    if (!updatedPolicy) {
      console.log(`Policy not found with ID: ${id}`);
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    // console.log(`Policy updated: ${updatedPolicy.name} by manager: ${req.user.id}`);
    return res.json({ success: true, policy: updatedPolicy });
  } catch (error) {
    console.error('Error updating policy:', error);
    return res.status(500).json({ success: false, message: 'Failed to update policy' });
  }
};

export const getAllPolicies = async (req, res) => {
  try {
    // Fetch all policies from the database
    const policies = await PolicyAction.find()
      .populate('createdBy', 'name _id')
      .populate('approvedBy', 'name _id')
      .populate('rejectedBy', 'name _id');

    return res.json({ success: true, policies });
  } catch (error) {
    console.error('Error fetching policies:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch policies' });
  }
};

export const getPolicytStatus = async (req, res) => {
  const { name } = req.query; // Get the document name from the query parameters

  try {
    // Find the agreement in the database
    const agreement = await PolicyAction.findOne({ name });

    if (agreement) {
      return res.json({ success: true, agreementStatus: agreement.action });
    } else {
      return res.json({ success: true, agreementStatus: null }); // No agreement found
    }
  } catch (error) {
    console.error('Error fetching agreement status:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch agreement status' });
  }
};

export const deletePolicy = async (req, res) => {
  const { id } = req.params; // Get the policy ID from the URL parameters
  const { password } = req.body; // Expect the manager's password in the request body

  try {
    // Fetch the manager's details from the database
    const manager = await UserSchema.findById(req.user.id); // Assuming `protect` middleware attaches the user to `req.user`
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }

    // Check if the user is a manager
    if (!manager.isManager) {
      return res.status(403).json({ success: false, message: 'Not authorized, only managers can perform this action' });
    }

    // Validate the password
    const isValidPassword = await validatePassword(password, manager.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // Find the policy by ID and delete it
    const deletedPolicy = await PolicyAction.findByIdAndDelete(id);

    if (!deletedPolicy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    return res.json({ success: true, message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete policy' });
  }
};

// In your policy controller
export const markPolicyAsRead = async (req, res) => {
  try {
    const policy = await PolicyAction.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ success: false, error: "Policy not found" });
    }

    // Add user to readBy array if not already there
    if (!policy.readBy.includes(req.user._id)) {
      policy.readBy.push(req.user._id);
      await policy.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking policy as read:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const markPolicyResponseAsRead = async (req, res) => {
  try {
    const { logId } = req.body;
    const policy = await PolicyAction.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ success: false, error: "Policy not found" });
    }

    // Find the log entry and mark as read
    const logEntry = policy.logs.id(logId);
    if (logEntry) {
      if (!logEntry.readBy) logEntry.readBy = [];
      if (!logEntry.readBy.includes(req.user._id)) {
        logEntry.readBy.push(req.user._id);
        await policy.save();
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking response as read:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// In your policy controller
export const getPolicyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const policies = await PolicyAction.find({
      $or: [
        // For managers: unread policies created by admins
        {
          createdBy: { $ne: userId },
          "logs.action": "create",
          readBy: { $ne: userId }
        },
        // For admins: their policies with unread manager updates
        {
          createdBy: userId,
          "logs": {
            $elemMatch: {
              action: "update",
              performedBy: { $ne: userId },
              readBy: { $ne: userId }
            }
          }
        }
      ]
    })
      .populate('createdBy', 'name _id')
      .populate('logs.performedBy', 'name _id')
      .populate('readBy', '_id')
      .sort({ lastUpdate: -1 });

    res.json({ success: true, data: policies });
  } catch (error) {
    console.error('Error fetching policy notifications:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};