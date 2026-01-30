import { DropdownOption } from "../models/dropdownOptionModel.js";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import { UserSchema } from "../models/userModel.js";

// Get all options grouped by category
export const getAllOptions = async (req, res) => {
  try {
    const options = await DropdownOption.find({ isActive: true }).sort({ order: 1 });
    const groupedOptions = options.reduce((acc, option) => {
      if (!acc[option.category]) {
        acc[option.category] = [];
      }
      acc[option.category].push(option);
      return acc;
    }, {});

    // --- Dynamic Categories Injection ---

    // 1. Field Teams
    const fieldTeams = await FieldTeamsSchema.find({ isActive: true }).select('teamName');
    groupedOptions['FIELD_TEAMS'] = fieldTeams.map((team, index) => ({
      _id: team._id,
      category: 'FIELD_TEAMS',
      value: team.teamName,
      label: team.teamName,
      order: index + 1
    }));

    // 2. Supervisors/Users
    const supervisors = await UserSchema.find().select('name');
    groupedOptions['SUPERVISORS'] = supervisors.map((user, index) => ({
      _id: user._id,
      category: 'SUPERVISORS',
      value: user.name,
      label: user.name,
      order: index + 1
    }));

    res.status(200).json(groupedOptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get options for a specific category
export const getOptionsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    // Handle dynamic categories
    if (category === 'FIELD_TEAMS') {
      const fieldTeams = await FieldTeamsSchema.find({ isActive: true }).select('teamName');
      return res.status(200).json(fieldTeams.map((team, index) => ({
        _id: team._id,
        category: 'FIELD_TEAMS',
        value: team.teamName,
        label: team.teamName,
        order: index + 1
      })));
    }

    if (category === 'SUPERVISORS') {
      const supervisors = await UserSchema.find().select('name');
      return res.status(200).json(supervisors.map((user, index) => ({
        _id: user._id,
        category: 'SUPERVISORS',
        value: user.name,
        label: user.name,
        order: index + 1
      })));
    }

    const options = await DropdownOption.find({ category, isActive: true }).sort({ order: 1 });
    res.status(200).json(options);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a new option
export const addOption = async (req, res) => {
  try {
    const { category, value, label, order, parentCategory, parentValue } = req.body;

    // Check if option already exists in this category
    const existing = await DropdownOption.findOne({ category, value });
    if (existing) {
      return res.status(200).json(existing); // Return existing instead of erroring
    }

    const newOption = new DropdownOption({ category, value, label, order, parentCategory, parentValue });
    await newOption.save();
    res.status(201).json(newOption);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update an existing option
export const updateOption = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOption = await DropdownOption.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedOption) return res.status(404).json({ message: "Option not found" });
    res.status(200).json(updatedOption);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete an option (or deactivate it)
export const deleteOption = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOption = await DropdownOption.findByIdAndDelete(id);
    if (!deletedOption) return res.status(404).json({ message: "Option not found" });
    res.status(200).json({ message: "Option deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reorder options
export const reorderOptions = async (req, res) => {
  try {
    const { options } = req.body;

    // Use bulkWrite for efficient updates
    const bulkOps = options.map((option, index) => ({
      updateOne: {
        filter: { _id: option._id },
        update: { $set: { order: index + 1 } }
      }
    }));

    if (bulkOps.length > 0) {
      await DropdownOption.bulkWrite(bulkOps);
    }

    res.status(200).json({ message: "Options reordered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Seed initial options if the collection is empty
export const seedOptions = async (req, res) => {
  try {
    // For GAIA specific categories, we want to ensure the new workflow is present
    const gaiaCategories = ["TRANSACTION_TYPE", "TRANSACTION_STATE"];

    // Define the options to seed
    const initialOptions = [
      // Priority
      { category: "PRIORITY", value: "High", label: "High", order: 1 },
      { category: "PRIORITY", value: "Medium", label: "Medium", order: 2 },
      { category: "PRIORITY", value: "Normal", label: "Normal", order: 3 },
      { category: "PRIORITY", value: "Low", label: "Low", order: 4 },

      // Task Categories
      { category: "TASK_CATEGORIES", value: "Orange HC detractor", label: "Orange HC detractor", order: 1 },
      { category: "TASK_CATEGORIES", value: "Orange Closure", label: "Orange Closure", order: 2 },
      { category: "TASK_CATEGORIES", value: "Orange Joint", label: "Orange Joint", order: 3 },
      { category: "TASK_CATEGORIES", value: "Nokia MS detractor", label: "Nokia MS detractor", order: 4 },
      { category: "TASK_CATEGORIES", value: "Nokia FAT", label: "Nokia FAT", order: 5 },
      { category: "TASK_CATEGORIES", value: "Nokia Closure", label: "Nokia Closure", order: 6 },
      { category: "TASK_CATEGORIES", value: "TRC", label: "TRC", order: 7 },
      { category: "TASK_CATEGORIES", value: "TCRM", label: "TCRM", order: 8 },
      { category: "TASK_CATEGORIES", value: "Others", label: "Others", order: 9 },

      // Team Company
      { category: "TEAM_COMPANY", value: "INH-1", label: "INH-1", order: 1 },
      { category: "TEAM_COMPANY", value: "INH-2", label: "INH-2", order: 2 },
      { category: "TEAM_COMPANY", value: "INH-3", label: "INH-3", order: 3 },
      { category: "TEAM_COMPANY", value: "INH-4", label: "INH-4", order: 4 },
      { category: "TEAM_COMPANY", value: "INH-5", label: "INH-5", order: 5 },
      { category: "TEAM_COMPANY", value: "INH-6", label: "INH-6", order: 6 },
      { category: "TEAM_COMPANY", value: "Al-Dar 2", label: "Al-Dar 2", order: 7 },
      { category: "TEAM_COMPANY", value: "Orange Team", label: "Orange Team", order: 8 },
      { category: "TEAM_COMPANY", value: "غير معروف", label: "غير معروف", order: 9 },

      // Evaluation Score
      { category: "EVALUATION_SCORE", value: "1", label: "1", order: 1 },
      { category: "EVALUATION_SCORE", value: "2", label: "2", order: 2 },
      { category: "EVALUATION_SCORE", value: "3", label: "3", order: 3 },
      { category: "EVALUATION_SCORE", value: "4", label: "4", order: 4 },
      { category: "EVALUATION_SCORE", value: "5", label: "5", order: 5 },
      { category: "EVALUATION_SCORE", value: "6", label: "6", order: 6 },
      { category: "EVALUATION_SCORE", value: "7", label: "7", order: 7 },
      { category: "EVALUATION_SCORE", value: "8", label: "8", order: 8 },

      // Jordan Governorates
      { category: "GOVERNORATES", value: "عمَان", label: "عمَان", order: 1 },
      { category: "GOVERNORATES", value: "الزرقاء", label: "الزرقاء", order: 2 },
      { category: "GOVERNORATES", value: "إربد", label: "إربد", order: 3 },
      { category: "GOVERNORATES", value: "العقبة", label: "العقبة", order: 4 },
      { category: "GOVERNORATES", value: "المفرق", label: "المفرق", order: 5 },
      { category: "GOVERNORATES", value: "مادبا", label: "مادبا", order: 6 },
      { category: "GOVERNORATES", value: "البلقاء", label: "البلقاء", order: 7 },
      { category: "GOVERNORATES", value: "جرش", label: "جرش", order: 8 },
      { category: "GOVERNORATES", value: "معان", label: "معان", order: 9 },
      { category: "GOVERNORATES", value: "الكرك", label: "الكرك", order: 10 },
      { category: "GOVERNORATES", value: "عجلون", label: "عجلون", order: 11 },
      { category: "GOVERNORATES", value: "الطفيلة", label: "الطفيلة", order: 12 },

      // Customer Type
      { category: "CUSTOMER_TYPE", value: "CBU", label: "CBU", order: 1 },
      { category: "CUSTOMER_TYPE", value: "EBU", label: "EBU", order: 2 },

      // Validation Status
      { category: "VALIDATION_STATUS", value: "Validated", label: "Validated", order: 1 },
      { category: "VALIDATION_STATUS", value: "Not validated", label: "Not validated", order: 2 },



      // Reason
      { category: "REASON", value: "Technical Issue", label: "Technical Issue", order: 1 },
      { category: "REASON", value: "Customer Education", label: "Customer Education", order: 2 },
      { category: "REASON", value: "Safety Violation", label: "Safety Violation", order: 3 },
      { category: "REASON", value: "Access Problem", label: "Access Problem", order: 4 },
      { category: "REASON", value: "Equipment Failure", label: "Equipment Failure", order: 5 },
      { category: "REASON", value: "Others", label: "Others", order: 6 },

      // Responsibility
      { category: "RESPONSIBILITY", value: "Field Team", label: "Field Team", order: 1 },
      { category: "RESPONSIBILITY", value: "Call Center", label: "Call Center", order: 2 },
      { category: "RESPONSIBILITY", value: "Sales", label: "Sales", order: 3 },
      { category: "RESPONSIBILITY", value: "Technical Team", label: "Technical Team", order: 4 },
      { category: "RESPONSIBILITY", value: "Customer", label: "Customer", order: 5 },
      { category: "RESPONSIBILITY", value: "Others", label: "Others", order: 6 },

      // CIN Supervisors (Quality Supervisors)
      { category: "CIN_SUPERVISORS", value: "Supervisor 1", label: "Supervisor 1", order: 1 },
      { category: "CIN_SUPERVISORS", value: "Supervisor 2", label: "Supervisor 2", order: 2 },

      // --- GAIA SYSTEM PARAMETERS ---
      // Transaction Types (Activity Codes)
      { category: "TRANSACTION_TYPE", value: "INIT", label: "Ticket Initiated", order: 1 },
      { category: "TRANSACTION_TYPE", value: "CONTACT", label: "Customer Contacted", order: 2 },
      { category: "TRANSACTION_TYPE", value: "REFLECT", label: "Reflected to Team (Dispatch)", order: 3 },
      { category: "TRANSACTION_TYPE", value: "VISIT", label: "Site Visit", order: 4 },
      { category: "TRANSACTION_TYPE", value: "RESOLVE", label: "Resolution", order: 5 },

      // Transaction States (Outcome Codes)
      { category: "TRANSACTION_STATE", value: "APPT_SET", label: "Appointment Set", order: 1 },
      { category: "TRANSACTION_STATE", value: "SOLVED_REMOTE", label: "Solved by Phone", order: 2 },
      { category: "TRANSACTION_STATE", value: "NO_ANSWER", label: "No Answer", order: 3 },
      { category: "TRANSACTION_STATE", value: "REFUSED", label: "Customer Refused Solutions", order: 4 },
      { category: "TRANSACTION_STATE", value: "WAIT", label: "Customer Wait for Solutions", order: 5 },
      { category: "TRANSACTION_STATE", value: "VISIT_OK", label: "Visit Success", order: 6 },
      { category: "TRANSACTION_STATE", value: "ISSUE_RESOLVED", label: "Issue Resolved", order: 7 },
      { category: "TRANSACTION_STATE", value: "VISIT_FAIL", label: "Visit Failed / No Show", order: 8 },
      { category: "TRANSACTION_STATE", value: "PENDING_CONTACT", label: "Pending Customer Contact", order: 9 },
      { category: "TRANSACTION_STATE", value: "ANGRY_CLOSE", label: "Customer Angry / Hung Up", order: 10 },
      { category: "TRANSACTION_STATE", value: "AWAITING_REPLY", label: "Awaiting Customer Reply", order: 11 },

      // Unfulfillment Reason Codes (Failure Reason Codes)
      // 100 Series: Customer Requests & Availability
      { category: "UNF_REASON_CODE", value: "101", label: "Callback Requested by Customer", order: 1 },
      { category: "UNF_REASON_CODE", value: "102", label: "Visit Postponed by Customer Request", order: 2 },
      { category: "UNF_REASON_CODE", value: "103", label: "Customer Busy / Requested Later Contact", order: 3 },
      { category: "UNF_REASON_CODE", value: "104", label: "Customer Refused Visit / Cancellation", order: 4 },
      { category: "UNF_REASON_CODE", value: "105", label: "Customer No Show / Absent", order: 5 },

      // 200 Series: Resolutions & Findings
      { category: "UNF_REASON_CODE", value: "201", label: "No Issue Found / False Alarm", order: 6 },
      { category: "UNF_REASON_CODE", value: "202", label: "Issue Resolved via Phone Call", order: 7 },
      { category: "UNF_REASON_CODE", value: "203", label: "Technical Team Visited & Resolved", order: 8 },
      { category: "UNF_REASON_CODE", value: "204", label: "Scheduled for Site Survey / Inspection", order: 9 },
      { category: "UNF_REASON_CODE", value: "205", label: "Documentation Updated / Completed", order: 10 },
      { category: "UNF_REASON_CODE", value: "206", label: "Issue Fully Resolved / Ticket Closed", order: 11 },

      // 300 Series: Status & Monitoring
      { category: "UNF_REASON_CODE", value: "301", label: "Customer Will Monitor & Report", order: 11 },
      { category: "UNF_REASON_CODE", value: "302", label: "Escalated to Higher Level Support", order: 12 },
      { category: "UNF_REASON_CODE", value: "303", label: "Pending Equipment/Parts Arrival", order: 13 },
      { category: "UNF_REASON_CODE", value: "304", label: "Waiting for Civil Works / Third Party", order: 14 },
      { category: "UNF_REASON_CODE", value: "305", label: "Technical Impediment / Network Issue", order: 15 },
      { category: "UNF_REASON_CODE", value: "001", label: "Reason Specified in Remarks", order: 16 },
      { category: "UNF_REASON_CODE", value: "002", label: "Generic Minor Unfreeze Reason", order: 17 },

      // System Flow Status
      { category: "SYSTEM_FLOW_STATUS", value: "Todo", label: "Todo", order: 1 },
      { category: "SYSTEM_FLOW_STATUS", value: "In Progress", label: "In Progress", order: 2 },
      { category: "SYSTEM_FLOW_STATUS", value: "Closed", label: "Closed", order: 3 },
      { category: "SYSTEM_FLOW_STATUS", value: "Completed", label: "Completed", order: 4 },
    ];

    const bulkOps = initialOptions.map(opt => ({
      updateOne: {
        filter: { category: opt.category, value: opt.value },
        update: { $set: opt },
        upsert: true
      }
    }));

    await DropdownOption.bulkWrite(bulkOps);
    res.status(201).json({ message: "Database seeded/updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
