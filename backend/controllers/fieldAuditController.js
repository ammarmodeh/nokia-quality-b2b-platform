import { FieldAuditUser } from "../models/fieldAuditUser.js";
import { FieldAuditTask } from "../models/fieldAuditTask.js";
import { generateToken } from "../utils/generateToken.js";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

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

    // Check if user exists
    const user = await FieldAuditUser.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has any assigned tasks
    const assignedTasksCount = await FieldAuditTask.countDocuments({
      "auditor._id": id
    });

    if (assignedTasksCount > 0) {
      return res.status(400).json({
        message: `Cannot delete auditor "${user.name}". They have ${assignedTasksCount} assigned task(s).`,
        assignedTasks: assignedTasksCount,
        auditorName: user.name,
        suggestion: "Please reassign or complete these tasks before deleting the auditor."
      });
    }

    // Safe to delete - no assigned tasks
    await FieldAuditUser.findByIdAndDelete(id);

    res.json({
      message: `Auditor "${user.name}" has been successfully deleted.`,
      deletedUser: {
        _id: user._id,
        name: user.name,
        username: user.username
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- ADMIN TASK MANAGEMENT ---

// Comprehensive Checklist Definition (Full 98 items)
const DEFAULT_CHECKLIST = [
  // Info / Identification
  { checkpointName: "INSTALLATION TEAM", status: "OK" },
  { checkpointName: "SPLICING TEAM", status: "OK" },
  { checkpointName: "REQ #", status: "OK" },
  { checkpointName: "INT #", status: "OK" },
  { checkpointName: "OPERATION", status: "OK" },
  { checkpointName: "CBU/EBU", status: "OK" },
  { checkpointName: "VOIP", status: "OK" },
  { checkpointName: "MODEM TYPE", status: "OK" },
  { checkpointName: "FREE AirTies", status: "OK" },
  { checkpointName: "CUST NAME", status: "OK" },
  { checkpointName: "FEEDBACK FOR ORANGE", status: "OK" },
  { checkpointName: "FEEDBACK DETAILS", status: "OK" },
  { checkpointName: "CUST CONT", status: "OK" },
  { checkpointName: "Governorate", status: "OK" },
  { checkpointName: "TOWN", status: "OK" },
  { checkpointName: "DISTRICT", status: "OK" },
  { checkpointName: "STREET", status: "OK" },
  { checkpointName: "BUILDING", status: "OK" },
  { checkpointName: "SPEED", status: "OK" },
  { checkpointName: "USERNAME", status: "OK" },
  { checkpointName: "PW", status: "OK" },
  { checkpointName: "DISPATSHER NAME", status: "OK" },
  { checkpointName: "APP DATE", status: "OK" },
  { checkpointName: "APP TIME", status: "OK" },
  { checkpointName: "ORANGE COMMENT", status: "OK" },
  { checkpointName: "FDB #", status: "OK" },

  // Technical Quantities / Details
  { checkpointName: "Splitter #", status: "OK" },
  { checkpointName: "Splitter Port #", status: "OK" },
  { checkpointName: "BEP #", status: "OK" },
  { checkpointName: "BEP Port #", status: "OK" },
  { checkpointName: "Comment", status: "OK" },
  { checkpointName: "New / Change", status: "OK" },
  { checkpointName: "Drop Cable", status: "OK" },
  { checkpointName: "No Of Drop Cable", status: "OK" },
  { checkpointName: "L1083-4 CABLE IMM 4FO MODULO 4 FTTH (N9730A)Drop Indoor/Outdoor", status: "OK" },
  { checkpointName: "Indoor Cable Type", status: "OK" },
  { checkpointName: "Indoor Cable", status: "OK" },
  { checkpointName: "Galvanized Steel Hook", status: "OK" },
  { checkpointName: "Drop Anchor", status: "OK" },
  { checkpointName: "Splicing Qty", status: "OK" },
  { checkpointName: "Poles", status: "OK" },
  { checkpointName: "Microtrenching", status: "OK" },
  { checkpointName: "Digging Asphalt", status: "OK" },
  { checkpointName: "Digging", status: "OK" },
  { checkpointName: "PVC Pipe", status: "OK" },
  { checkpointName: "BEP Floor MOUNTED BOX up to 12 Splices - Verthor Box", status: "OK" },
  { checkpointName: "Trunk", status: "OK" },
  { checkpointName: "Patch Cord", status: "OK" },
  { checkpointName: "Fiber Termination Box, 1 fibers (OTO)", status: "OK" },
  { checkpointName: "Plastic Elbow", status: "OK" },
  { checkpointName: "Rainy Protection Box", status: "OK" },
  { checkpointName: "PVC Coupler", status: "OK" },
  { checkpointName: "U gard", status: "OK" },
  { checkpointName: "ONT SN", status: "OK" },
  { checkpointName: "ONT Type", status: "OK" },
  { checkpointName: "Power ((-)dbm)", status: "OK" },
  { checkpointName: "Pigtail", status: "OK" },
  { checkpointName: "BEP STICKER", status: "OK" },
  { checkpointName: "AIRTIES SN", status: "OK" },
  { checkpointName: "Free AIRTIES SN", status: "OK" }, // Added distinct label for 2nd airties if implies qty
  { checkpointName: "Suspension Console", status: "OK" },
  { checkpointName: "EXT-Type", status: "OK" },
  { checkpointName: "OTO approval", status: "OK" },
  { checkpointName: "Area", status: "OK" },
  { checkpointName: "Lat", status: "OK" },
  { checkpointName: "Long", status: "OK" },

  // Core Inspection / Audit Points
  { checkpointName: "DB Closing", status: "OK" },
  { checkpointName: "DB DF's Label", status: "OK" },
  { checkpointName: "DB Cabling system", status: "OK" },
  { checkpointName: "UG Installation", status: "OK" },
  { checkpointName: "DF Laying on Poles", status: "OK" },
  { checkpointName: "DF Accessories", status: "OK" },
  { checkpointName: "DF Laying to BEP/OTO", status: "OK" },
  { checkpointName: "BEP Install & location", status: "OK" },
  { checkpointName: "BEP label (Orange sticker)", status: "OK" },
  { checkpointName: "BEP Cabling system", status: "OK" },
  { checkpointName: "BEP DFs label", status: "OK" },
  { checkpointName: "BEP DF Indoor laying", status: "OK" },
  { checkpointName: "OTO Install", status: "OK" },
  { checkpointName: "OTO label", status: "OK" },
  { checkpointName: "Modem label", status: "OK" },
  { checkpointName: "Modem Location", status: "OK" },
  { checkpointName: "Modem Power level > -23", status: "OK" },
  { checkpointName: "Modem/Extender Config", status: "OK" },
  { checkpointName: "Wi-Fi Coverage", status: "OK" },
  { checkpointName: "(FTTH Offer) speed test", status: "OK" },
  { checkpointName: "VOIP Active", status: "OK" },
  { checkpointName: "Civil Work (HC) Status Restoration", status: "OK" },
  { checkpointName: "Indoor, Status Restoration", status: "OK" },
  { checkpointName: "Clean waste & material", status: "OK" },
  { checkpointName: "Technicians Skills", status: "OK" },
  { checkpointName: "Technicians Behavior", status: "OK" },
  { checkpointName: "Technicians Clothes", status: "OK" },
  { checkpointName: "Technicians Health & Safety", status: "OK" },
  { checkpointName: "Snags Solved By REACH", status: "OK" },
  { checkpointName: "RE_SOLVED COMMENT", status: "OK" },
  { checkpointName: "Overall Comment", status: "OK" }
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

// Helper: Delete object from S3 by URL
const deleteS3Object = async (url) => {
  if (!url || !url.startsWith("http")) return;
  try {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Extract key from URL (https://bucket.s3.region.amazonaws.com/key)
    const urlParts = url.split('/');
    const key = urlParts.slice(3).join('/'); // Skip protocol, empty string, and bucket domain

    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    }));
    console.log(`Deleted S3 object: ${key}`);
  } catch (s3Error) {
    console.error("Error deleting from S3:", s3Error);
  }
};

// Smart Assignment Helper Function
const assignTasksToAuditors = async (tasks, strategy = 'round-robin') => {
  // Get all active auditors
  const auditors = await FieldAuditUser.find({ role: 'Auditor' });

  if (auditors.length === 0) {
    throw new Error('No auditors available for assignment');
  }

  // Get current workload for each auditor
  const workloadPromises = auditors.map(async (auditor) => {
    const pendingCount = await FieldAuditTask.countDocuments({
      'auditor._id': auditor._id,
      status: { $in: ['Pending', 'In Progress'] }
    });
    return { auditor, pendingCount };
  });

  const auditorsWithWorkload = await Promise.all(workloadPromises);

  const assignments = [];
  let currentIndex = 0;

  for (const task of tasks) {
    let selectedAuditor;

    switch (strategy) {
      case 'round-robin':
        // Rotate through auditors equally
        selectedAuditor = auditors[currentIndex % auditors.length];
        currentIndex++;
        break;

      case 'workload-balanced':
        // Assign to auditor with least pending tasks
        auditorsWithWorkload.sort((a, b) => a.pendingCount - b.pendingCount);
        selectedAuditor = auditorsWithWorkload[0].auditor;
        auditorsWithWorkload[0].pendingCount++; // Update for next iteration
        break;

      case 'geographic':
        // Assign based on town proximity (simple: same town first)
        const taskTown = task.To?.toLowerCase() || '';
        const matchingAuditor = auditorsWithWorkload.find(a =>
          a.auditor.name.toLowerCase().includes(taskTown) ||
          taskTown.includes(a.auditor.name.toLowerCase())
        );
        selectedAuditor = matchingAuditor ? matchingAuditor.auditor : auditors[currentIndex % auditors.length];
        currentIndex++;
        break;

      case 'performance-based':
        // Assign to highest-rated auditors (based on completion rate)
        // For now, use workload as proxy - can enhance with actual performance metrics
        auditorsWithWorkload.sort((a, b) => a.pendingCount - b.pendingCount);
        selectedAuditor = auditorsWithWorkload[0].auditor;
        auditorsWithWorkload[0].pendingCount++;
        break;

      default:
        selectedAuditor = auditors[currentIndex % auditors.length];
        currentIndex++;
    }

    assignments.push({
      task,
      auditor: {
        _id: selectedAuditor._id,
        name: selectedAuditor.name,
        username: selectedAuditor.username
      }
    });
  }

  return assignments;
};

export const uploadTasks = async (req, res) => {
  try {
    const { tasks, scheduledDate, assignmentStrategy = 'round-robin', autoAssign = true } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ message: "Invalid tasks data" });
    }

    // Determine Scheduled Date (Noon UTC)
    const targetDate = scheduledDate ? parseToNoonUTC(scheduledDate) : Date.now();

    const createdTasks = [];
    const skippedTasks = [];
    const tasksToAssign = [];

    // First pass: validate and prepare tasks
    for (const taskData of tasks) {
      const slid = (taskData.SLID || taskData.slid || taskData["REQ #"] || "UNKNOWN").trim();

      if (slid === "UNKNOWN") {
        skippedTasks.push({ slid, reason: "Missing SLID" });
        continue;
      }

      // Check if SLID already exists
      const existingTask = await FieldAuditTask.findOne({ slid });
      if (existingTask) {
        skippedTasks.push({ slid, reason: "SLID already exists" });
        continue;
      }

      tasksToAssign.push({ slid, taskData, targetDate });
    }

    // Get smart assignments if auto-assign is enabled
    let assignments = [];
    if (autoAssign && tasksToAssign.length > 0) {
      assignments = await assignTasksToAuditors(
        tasksToAssign.map(t => t.taskData),
        assignmentStrategy
      );
    }

    // Create tasks with assignments
    for (let i = 0; i < tasksToAssign.length; i++) {
      const { slid, taskData, targetDate } = tasksToAssign[i];
      const assignment = assignments[i];

      const newTask = await FieldAuditTask.create({
        slid,
        scheduledDate: targetDate,
        siteDetails: taskData,
        checklist: DEFAULT_CHECKLIST,
        uploadedBy: req.user?._id,
        ...(assignment && { auditor: assignment.auditor })
      });
      createdTasks.push(newTask);
    }

    res.status(201).json({
      message: `Successfully uploaded ${createdTasks.length} tasks${autoAssign ? ` with ${assignmentStrategy} assignment` : ''}. Skipped ${skippedTasks.length} duplicates/invalid.`,
      tasks: createdTasks,
      skipped: skippedTasks,
      assignmentStrategy: autoAssign ? assignmentStrategy : 'none'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const previewTaskAssignments = async (req, res) => {
  try {
    const { tasks, assignmentStrategy = 'round-robin' } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ message: "Invalid tasks data" });
    }

    // Validate tasks and check for duplicates
    const validTasks = [];
    const invalidTasks = [];

    for (const taskData of tasks) {
      const slid = (taskData.SLID || taskData.slid || taskData["REQ #"] || "UNKNOWN").trim();

      if (slid === "UNKNOWN") {
        invalidTasks.push({ task: taskData, reason: "Missing SLID" });
        continue;
      }

      // Check if SLID already exists
      const existingTask = await FieldAuditTask.findOne({ slid });
      if (existingTask) {
        invalidTasks.push({ task: taskData, slid, reason: "SLID already exists" });
        continue;
      }

      validTasks.push(taskData);
    }

    // Get assignment preview
    let assignments = [];
    if (validTasks.length > 0) {
      assignments = await assignTasksToAuditors(validTasks, assignmentStrategy);
    }

    // Format preview data
    const preview = assignments.map((assignment, index) => ({
      slid: validTasks[index].SLID || validTasks[index].slid || validTasks[index]["REQ #"],
      customerName: validTasks[index]["Customer Name"] || validTasks[index].customerName || "N/A",
      town: validTasks[index].To || validTasks[index].town || "N/A",
      assignedTo: assignment.auditor.name,
      auditorUsername: assignment.auditor.username,
      auditorId: assignment.auditor._id
    }));

    res.json({
      strategy: assignmentStrategy,
      totalTasks: tasks.length,
      validTasks: validTasks.length,
      invalidTasks: invalidTasks.length,
      preview,
      invalid: invalidTasks
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createManualTask = async (req, res) => {
  try {
    const { slid, To, scheduledDate, siteDetails, auditorId } = req.body;

    if (!slid) {
      return res.status(400).json({ message: "SLID is required" });
    }

    // Check if SLID already exists
    const existingTask = await FieldAuditTask.findOne({ slid: slid.trim() });
    if (existingTask) {
      return res.status(400).json({ message: `A task with SLID "${slid}" already exists.` });
    }

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
    const task = await FieldAuditTask.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // 1. Delete all associated photos from S3
    if (task.photos && task.photos.length > 0) {
      console.log(`Deleting ${task.photos.length} photos from S3 for task ${id}`);
      await Promise.all(task.photos.map(photo => deleteS3Object(photo.url)));
    }

    // 2. Delete task from DB
    await FieldAuditTask.findByIdAndDelete(id);
    res.json({ message: "Task removed and S3 photos cleaned up" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
    const { checklist, finalFeedback } = req.body;

    const task = await FieldAuditTask.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (checklist) task.checklist = checklist;
    if (finalFeedback !== undefined) task.finalFeedback = finalFeedback;

    await task.save();
    res.json(task);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { processSlid, checklist, finalFeedback } = req.body; // User entered SLID and latest checklist state

    const task = await FieldAuditTask.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Update checklist with the one sent from frontend if provided
    if (checklist && Array.isArray(checklist)) {
      task.checklist = checklist;
    }

    if (finalFeedback !== undefined) {
      task.finalFeedback = finalFeedback;
    }

    // Auto-convert any remaining "Pending" items to "OK" as per user request
    if (task.checklist && Array.isArray(task.checklist)) {
      task.checklist = task.checklist.map(item => ({
        ...item,
        status: item.status === 'Pending' ? 'OK' : item.status
      }));
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

    const task = await FieldAuditTask.findById(taskId).populate("auditor", "name");
    if (!task) return res.status(404).json({ message: "Task not found" });

    // [SUPPORT MULTI-PHOTO]: Removed auto-replace logic. Multiple photos per checkpoint are now allowed.

    // The file is already on S3 at req.file.location
    const newPhoto = {
      url: req.file.location, // S3 URL
      checkpointName,
      description,
      uploadedAt: new Date()
    };

    task.photos.push(newPhoto);
    await task.save();

    res.json(task);
  } catch (error) {
    console.error("S3 Upload Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteTaskPhoto = async (req, res) => {
  try {
    const { taskId, photoId } = req.params;

    const task = await FieldAuditTask.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const photo = task.photos.id(photoId);
    if (!photo) return res.status(404).json({ message: "Photo not found" });

    // Delete from S3 using helper
    await deleteS3Object(photo.url);

    // Remove from task array
    task.photos.pull(photoId);
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkSlid = async (req, res) => {
  try {
    const { slid } = req.params;
    const task = await FieldAuditTask.findOne({ slid: slid.trim() });
    res.json({ exists: !!task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
