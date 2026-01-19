import { FieldAuditUser } from "../models/fieldAuditUser.js";
import { FieldAuditTask } from "../models/fieldAuditTask.js";
import { generateToken } from "../utils/generateToken.js";
import jwt from "jsonwebtoken";

// --- AUTHENTICATION ---

export const registerAuditUser = async (req, res) => {
  try {
    const { username, password, name, role } = req.body;

    const userExists = await FieldAuditUser.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const user = await FieldAuditUser.create({
      username,
      password,
      name,
      role
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginAuditUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await FieldAuditUser.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(res, user._id, user.role);

      res.json({
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        token
      });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutAuditUser = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
};

export const updateAuditUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, password } = req.body;

    const user = await FieldAuditUser.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name || user.name;
    user.username = username || user.username;

    if (password) {
      user.password = password; // Will be hashed by pre-save hook
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      username: updatedUser.username,
      role: updatedUser.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAuditUser = async (req, res) => {
  try {
    const { id } = req.params;
    await FieldAuditUser.findByIdAndDelete(id);
    res.json({ message: "Auditor removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- ADMIN TASK MANAGEMENT ---

// Comprehensive Checklist Definition (Full 98 items)
const DEFAULT_CHECKLIST = [
  // Info / Identification
  { checkpointName: "INSTALLATION TEAM", status: "Pending" },
  { checkpointName: "SPLICING TEAM", status: "Pending" },
  { checkpointName: "REQ #", status: "Pending" },
  { checkpointName: "INT #", status: "Pending" },
  { checkpointName: "OPERATION", status: "Pending" },
  { checkpointName: "CBU/EBU", status: "Pending" },
  { checkpointName: "VOIP", status: "Pending" },
  { checkpointName: "MODEM TYPE", status: "Pending" },
  { checkpointName: "FREE AirTies", status: "Pending" },
  { checkpointName: "CUST NAME", status: "Pending" },
  { checkpointName: "FEEDBACK FOR ORANGE", status: "Pending" },
  { checkpointName: "FEEDBACK DETAILS", status: "Pending" },
  { checkpointName: "CUST CONT", status: "Pending" },
  { checkpointName: "Governorate", status: "Pending" },
  { checkpointName: "TOWN", status: "Pending" },
  { checkpointName: "DISTRICT", status: "Pending" },
  { checkpointName: "STREET", status: "Pending" },
  { checkpointName: "BUILDING", status: "Pending" },
  { checkpointName: "SPEED", status: "Pending" },
  { checkpointName: "USERNAME", status: "Pending" },
  { checkpointName: "PW", status: "Pending" },
  { checkpointName: "DISPATSHER NAME", status: "Pending" },
  { checkpointName: "APP DATE", status: "Pending" },
  { checkpointName: "APP TIME", status: "Pending" },
  { checkpointName: "ORANGE COMMENT", status: "Pending" },
  { checkpointName: "FDB #", status: "Pending" },

  // Technical Quantities / Details
  { checkpointName: "Splitter #", status: "Pending" },
  { checkpointName: "Splitter Port #", status: "Pending" },
  { checkpointName: "BEP #", status: "Pending" },
  { checkpointName: "BEP Port #", status: "Pending" },
  { checkpointName: "Comment", status: "Pending" },
  { checkpointName: "New / Change", status: "Pending" },
  { checkpointName: "Drop Cable", status: "Pending" },
  { checkpointName: "No Of Drop Cable", status: "Pending" },
  { checkpointName: "L1083-4 CABLE IMM 4FO MODULO 4 FTTH (N9730A)Drop Indoor/Outdoor", status: "Pending" },
  { checkpointName: "Indoor Cable Type", status: "Pending" },
  { checkpointName: "Indoor Cable", status: "Pending" },
  { checkpointName: "Galvanized Steel Hook", status: "Pending" },
  { checkpointName: "Drop Anchor", status: "Pending" },
  { checkpointName: "Splicing Qty", status: "Pending" },
  { checkpointName: "Poles", status: "Pending" },
  { checkpointName: "Microtrenching", status: "Pending" },
  { checkpointName: "Digging Asphalt", status: "Pending" },
  { checkpointName: "Digging", status: "Pending" },
  { checkpointName: "PVC Pipe", status: "Pending" },
  { checkpointName: "BEP Floor MOUNTED BOX up to 12 Splices - Verthor Box", status: "Pending" },
  { checkpointName: "Trunk", status: "Pending" },
  { checkpointName: "Patch Cord", status: "Pending" },
  { checkpointName: "Fiber Termination Box, 1 fibers (OTO)", status: "Pending" },
  { checkpointName: "Plastic Elbow", status: "Pending" },
  { checkpointName: "Rainy Protection Box", status: "Pending" },
  { checkpointName: "PVC Coupler", status: "Pending" },
  { checkpointName: "U gard", status: "Pending" },
  { checkpointName: "ONT SN", status: "Pending" },
  { checkpointName: "ONT Type", status: "Pending" },
  { checkpointName: "Power ((-)dbm)", status: "Pending" },
  { checkpointName: "Pigtail", status: "Pending" },
  { checkpointName: "BEP STICKER", status: "Pending" },
  { checkpointName: "AIRTIES SN", status: "Pending" },
  { checkpointName: "Free AIRTIES SN", status: "Pending" }, // Added distinct label for 2nd airties if implies qty
  { checkpointName: "Suspension Console", status: "Pending" },
  { checkpointName: "EXT-Type", status: "Pending" },
  { checkpointName: "OTO approval", status: "Pending" },
  { checkpointName: "Area", status: "Pending" },
  { checkpointName: "Lat", status: "Pending" },
  { checkpointName: "Long", status: "Pending" },

  // Core Inspection / Audit Points
  { checkpointName: "DB Closing", status: "Pending" },
  { checkpointName: "DB DF's Label", status: "Pending" },
  { checkpointName: "DB Cabling system", status: "Pending" },
  { checkpointName: "UG Installation", status: "Pending" },
  { checkpointName: "DF Laying on Poles", status: "Pending" },
  { checkpointName: "DF Accessories", status: "Pending" },
  { checkpointName: "DF Laying to BEP/OTO", status: "Pending" },
  { checkpointName: "BEP Install & location", status: "Pending" },
  { checkpointName: "BEP label (Orange sticker)", status: "Pending" },
  { checkpointName: "BEP Cabling system", status: "Pending" },
  { checkpointName: "BEP DFs label", status: "Pending" },
  { checkpointName: "BEP DF Indoor laying", status: "Pending" },
  { checkpointName: "OTO Install", status: "Pending" },
  { checkpointName: "OTO label", status: "Pending" },
  { checkpointName: "Modem label", status: "Pending" },
  { checkpointName: "Modem Location", status: "Pending" },
  { checkpointName: "Modem Power level > -23", status: "Pending" },
  { checkpointName: "Modem/Extender Config", status: "Pending" },
  { checkpointName: "Wi-Fi Coverage", status: "Pending" },
  { checkpointName: "(FTTH Offer) speed test", status: "Pending" },
  { checkpointName: "VOIP Active", status: "Pending" },
  { checkpointName: "Civil Work (HC) Status Restoration", status: "Pending" },
  { checkpointName: "Indoor, Status Restoration", status: "Pending" },
  { checkpointName: "Clean waste & material", status: "Pending" },
  { checkpointName: "Technicians Skills", status: "Pending" },
  { checkpointName: "Technicians Behavior", status: "Pending" },
  { checkpointName: "Technicians Clothes", status: "Pending" },
  { checkpointName: "Technicians Health & Safety", status: "Pending" },
  { checkpointName: "Snags Solved By REACH", status: "Pending" },
  { checkpointName: "RE_SOLVED COMMENT", status: "Pending" },
  { checkpointName: "Overall Comment", status: "Pending" }
];

// Helper for Noon UTC Date
const parseToNoonUTC = (dateString) => {
  if (!dateString) return Date.now();
  const parts = dateString.split("-");
  if (parts.length !== 3) return Date.now(); // Fallback
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
};

export const uploadTasks = async (req, res) => {
  try {
    const { tasks, scheduledDate } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ message: "Invalid tasks data" });
    }

    // Determine Scheduled Date (Noon UTC)
    // If not provided, defaults to Now (which might be risky for boundary, but acceptable for 'immediate')
    const targetDate = scheduledDate ? parseToNoonUTC(scheduledDate) : Date.now();

    const createdTasks = [];
    for (const taskData of tasks) {
      const slid = taskData.SLID || taskData.slid || taskData["REQ #"] || "UNKNOWN";

      const newTask = await FieldAuditTask.create({
        slid,
        scheduledDate: targetDate, // Use robust date
        siteDetails: taskData,
        checklist: DEFAULT_CHECKLIST,
        uploadedBy: req.user?._id
      });
      createdTasks.push(newTask);
    }

    res.status(201).json({ message: `Uploaded ${createdTasks.length} tasks successfully`, tasks: createdTasks });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createManualTask = async (req, res) => {
  try {
    const { slid, To, scheduledDate, siteDetails, auditorId } = req.body;

    // Use robust date or default to now
    const targetDate = scheduledDate ? parseToNoonUTC(scheduledDate) : Date.now();

    const newTask = await FieldAuditTask.create({
      slid,
      scheduledDate: targetDate,
      siteDetails,
      checklist: DEFAULT_CHECKLIST,
      uploadedBy: req.user._id,
      auditor: auditorId || null,
      status: auditorId ? "In Progress" : "Pending"
    });

    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllTasks = async (req, res) => {
  try {
    const { date } = req.query;
    let query = {};

    if (date) {
      // Filter by scheduledDate (UTC Midnight to UTC Midnight next day)
      // Frontend sends YYYY-MM-DD which parses to UTC Midnight
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1); // Next day

      console.log(`Querying Tasks for Date: ${date} | UTC Range: ${start.toISOString()} - ${end.toISOString()}`);

      // Fallback: If scheduledDate doesn't exist, check createdAt
      query.$or = [
        { scheduledDate: { $gte: start, $lt: end } },
        { scheduledDate: { $exists: false }, createdAt: { $gte: start, $lt: end } }
      ];
    }

    // Fallback: If no date provided? Usually frontend sends one.
    // If no date, we return all (as per previous logic).

    const tasks = await FieldAuditTask.find(query).populate("auditor", "name").sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { auditorId } = req.body;

    const task = await FieldAuditTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.auditor = auditorId;
    task.status = "In Progress";
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    await FieldAuditTask.findByIdAndDelete(id);
    res.json({ message: "Task removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export const toggleTaskVisibility = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await FieldAuditTask.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.isVisible = !task.isVisible;
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rescheduleTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { scheduledDate } = req.body;

    const task = await FieldAuditTask.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!scheduledDate) return res.status(400).json({ message: "Date is required" });

    // Robust Date Parsing: YYYY-MM-DD
    // We explicitly verify the format 
    const parts = scheduledDate.split("-");
    if (parts.length !== 3) {
      return res.status(400).json({ message: "Invalid Date Format. Expected YYYY-MM-DD" });
    }

    // Construct Date in UTC
    // Note: Month is 0-indexed in JS Date
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    // Set to NOON (12:00) UTC to avoid midnight boundary edge cases
    const dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0));

    console.log(`Rescheduling Task ${taskId} to ${scheduledDate} -> Saved as: ${dateObj.toISOString()}`);

    task.scheduledDate = dateObj;
    await task.save();

    res.json(task);
  } catch (error) {
    console.error("Reschedule Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// --- STATS ---

export const getAuditorStats = async (req, res) => {
  try {
    const stats = await FieldAuditUser.aggregate([
      { $match: { role: "Auditor" } },
      {
        $lookup: {
          from: "fieldaudittasks",
          localField: "_id",
          foreignField: "auditor",
          as: "tasks"
        }
      },
      {
        $project: {
          name: 1,
          username: 1,
          totalTasks: { $size: "$tasks" },
          submittedTasks: {
            $size: {
              $filter: {
                input: "$tasks",
                as: "task",
                cond: { $eq: ["$$task.status", "Submitted"] }
              }
            }
          },
          pendingTasks: {
            $size: {
              $filter: {
                input: "$tasks",
                as: "task",
                cond: { $in: ["$$task.status", ["Pending", "In Progress"]] }
              }
            }
          }
        }
      }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


// --- AUDITOR ACTIONS ---

export const getMyTasks = async (req, res) => {
  try {
    const { date } = req.query;
    let query = {
      auditor: req.user._id,
      isVisible: true
    };

    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.$or = [
        { scheduledDate: { $gte: start, $lt: end } },
        { scheduledDate: { $exists: false }, createdAt: { $gte: start, $lt: end } }
      ];
    }

    const tasks = await FieldAuditTask.find(query);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTaskBySlid = async (req, res) => {
  try {
    const { slid } = req.params;
    // Case insensitive search might be safer?
    const task = await FieldAuditTask.findOne({ slid });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


export const updateTaskChecklist = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { checklist } = req.body;

    const task = await FieldAuditTask.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.checklist = checklist;
    await task.save();
    res.json(task);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { processSlid } = req.body; // User entered SLID

    const task = await FieldAuditTask.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // SLID Validation logic
    if (processSlid && processSlid.trim() !== task.slid.trim()) {
      return res.status(400).json({ message: "SLID Verification Failed: The entered SLID does not match the task SLID." });
    }

    task.status = "Submitted";
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export const uploadTaskPhoto = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { checkpointName, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No photo uploaded" });
    }

    const task = await FieldAuditTask.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const photoUrl = `/uploads/audit-photos/${req.file.filename}`;

    const newPhoto = {
      url: photoUrl,
      checkpointName,
      description,
      uploadedAt: new Date()
    };

    task.photos.push(newPhoto);
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
