import { FieldAuditUser } from "../models/fieldAuditUser.js";
import { FieldAuditTask } from "../models/fieldAuditTask.js";
import { generateToken } from "../utils/generateToken.js";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// ... existing code ...

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
