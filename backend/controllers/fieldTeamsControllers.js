import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import dotenv from "dotenv";
dotenv.config();

export const getAllFieldTeams = async (req, res) => {
  try {
    const users = await FieldTeamsSchema.find();
    if (!users) return res.status(404).json({ message: "Field Teams not found" });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get Field Team by Quiz Code
export const getFieldTeamByQuizCode = async (req, res) => {
  const { quizCode } = req.params;

  try {
    const team = await FieldTeamsSchema.findOne({ quizCode });
    if (team) {
      res.json(team);
    } else {
      res.status(404).json({ message: 'Team not found' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Add New Field Team
export const addFieldTeam = async (req, res) => {
  try {
    const { teamName, teamCompany, contactNumber, fsmSerialNumber, laptopSerialNumber } = req.body;

    // Generate a random 10-character alphanumeric quiz code
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const quizCode = Array.from({ length: 10 }, () => characters[Math.floor(Math.random() * characters.length)]).join("");

    // Ensure all required fields are provided
    if (!teamName || !teamCompany || !contactNumber) {
      return res.status(400).json({ error: "Missing required fields: teamName, teamCompany, or contactNumber" });
    }

    const newFieldTeam = new FieldTeamsSchema({
      teamName,
      teamCompany,
      contactNumber,
      fsmSerialNumber: fsmSerialNumber || 'N/A',
      laptopSerialNumber: laptopSerialNumber || 'N/A',
      quizCode,
      canTakeQuiz: false, // Default to false - requires admin approval
      isActive: true, // Default active status
      isSuspended: false, // Default not suspended
      isTerminated: false, // Default not terminated
    });

    await newFieldTeam.save();
    res.status(201).json(newFieldTeam);
  } catch (error) {
    console.error("Error adding field team:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Suspend Field Team
export const suspendTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { suspensionStartDate, suspensionEndDate, suspensionReason } = req.body;

    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Clear existing statuses
    team.isOnLeave = false;
    team.leaveReason = null;
    team.leaveStartDate = null;
    team.leaveEndDate = null;

    team.isResigned = false;
    team.resignationReason = null;

    // Set suspension status
    team.isSuspended = true;
    team.suspensionStartDate = suspensionStartDate;
    team.suspensionEndDate = suspensionEndDate;
    team.suspensionReason = suspensionReason;
    team.isActive = false;

    // Add to state log
    team.stateLogs.push({
      state: "Suspended",
      reason: suspensionReason,
      startDate: suspensionStartDate,
      endDate: suspensionEndDate,
    });

    await team.save();
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Terminate Field Team
export const terminateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { terminationReason } = req.body;

    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Clear existing statuses
    team.isOnLeave = false;
    team.leaveReason = null;
    team.leaveStartDate = null;
    team.leaveEndDate = null;

    team.isSuspended = false;
    team.suspensionReason = null;
    team.suspensionStartDate = null;
    team.suspensionEndDate = null;

    team.isResigned = false;
    team.resignationReason = null;

    // Set termination status
    team.isTerminated = true;
    team.terminationReason = terminationReason;
    team.isActive = false;

    // Add to state log
    team.stateLogs.push({
      state: "Terminated",
      reason: terminationReason,
    });

    await team.save();
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reactivate Field Team
export const reactivateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Clear suspension-related fields
    team.isSuspended = false;
    team.suspensionReason = null;
    team.suspensionStartDate = null;
    team.suspensionEndDate = null;

    // Clear termination-related fields
    team.isTerminated = false;
    team.terminationReason = null;

    // Clear on leave-related fields
    team.isOnLeave = false;
    team.leaveReason = null;
    team.leaveStartDate = null;
    team.leaveEndDate = null;

    // Clear resigned-related fields
    team.isResigned = false;
    team.resignationReason = null;

    team.isActive = true;

    // Add to state log
    team.stateLogs.push({
      state: "Active",
      changedAt: new Date(),
    });

    await team.save();
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// On Leave Field Team
export const onLeaveTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { leaveReason, leaveStartDate, leaveEndDate } = req.body;

    // console.log({ teamId, leaveReason, leaveStartDate, leaveEndDate });

    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    team.isOnLeave = true;
    team.leaveReason = leaveReason;
    team.leaveStartDate = leaveStartDate;
    team.leaveEndDate = leaveEndDate;
    team.isActive = false;

    // Add to state log
    team.stateLogs.push({
      state: "On Leave",
      reason: leaveReason,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
    });

    await team.save();
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Resigned Field Team
export const resignedTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { resignationReason } = req.body;

    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    team.isResigned = true;
    team.resignationReason = resignationReason;
    team.isActive = false;

    // Add to state log
    team.stateLogs.push({
      state: "Resigned",
      reason: resignationReason,
    });

    await team.save();
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Field Team
export const deleteFieldTeam = async (req, res) => {
  try {
    const teamId = req.params.id;

    const deletedFieldTeam = await FieldTeamsSchema.findByIdAndDelete(teamId);

    if (!deletedFieldTeam) {
      return res.status(404).json({ message: "Field Team not found" });
    }

    res.status(200).json({ message: "Field Team deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Field Team
export const updateFieldTeam = async (req, res) => {
  try {
    const teamId = req.params.id;

    const updatedFieldTeam = await FieldTeamsSchema.findByIdAndUpdate(teamId, req.body, {
      new: true,
    });

    if (!updatedFieldTeam) {
      return res.status(404).json({ message: "Field Team not found" });
    }

    res.status(200).json(updatedFieldTeam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update team score
export const updateTeamScore = async (req, res) => {
  const { quizCode, score } = req.body; // score will be in the "correctAnswers/totalQuestions percentage%" format
  // console.log({ quizCode, score });

  try {
    const team = await FieldTeamsSchema.findOneAndUpdate(
      { quizCode },
      {
        $push: {
          evaluationHistory: {
            score: score,
            date: new Date(), // Date when the score was submitted
          },
        },
        evaluationScore: score, // Optionally update the latest score
        lastEvaluationDate: new Date(),
        isEvaluated: true, // Marks the team as evaluated
      },
      { new: true, upsert: true } // Returns the updated document
    );

    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTeamEvaluationHistory = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).send('Team not found');
    }
    return res.json(team.evaluationHistory); // assuming 'evaluations' is an array of history data
  } catch (error) {
    console.error('Error fetching evaluation history:', error);
    res.status(500).send('Server error');
  }
}

// Add session
export const addSession = async (req, res) => {
  const { teamId } = req.params;
  const { sessionDate, conductedBy, sessionTitle, outlines } = req.body;

  try {
    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    // Create new session with all fields
    const newSession = {
      sessionDate,
      conductedBy,
      sessionTitle,
      outlines,
      status: "Completed"
    };

    // Add session to history
    team.sessionHistory.push(newSession);
    team.totalViolationPoints = Math.max(0, (team.totalViolationPoints || 0) - 2);

    await team.save();

    // Get the saved session with _id
    const savedSession = team.sessionHistory[team.sessionHistory.length - 1];

    res.status(200).json({
      success: true,
      message: "Session added successfully",
      session: savedSession,  // Return the full session with _id
      updatedViolationPoints: team.totalViolationPoints
    });
  } catch (error) {
    console.error("Error adding session:", error);
    res.status(500).json({
      success: false,
      message: "Error adding session",
      error: error.message
    });
  }
};

// Update session
export const updateSessionForTeam = async (req, res) => {
  try {
    const { teamId, sessionId } = req.params;
    console.log({ teamId, sessionId });
    const { sessionDate, conductedBy, sessionTitle, outlines } = req.body;

    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    const sessionIndex = team.sessionHistory.findIndex(
      session => session._id.toString() === sessionId
    );

    if (sessionIndex === -1) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    team.sessionHistory[sessionIndex] = {
      ...team.sessionHistory[sessionIndex],
      sessionDate,
      conductedBy,
      sessionTitle,
      outlines,
      updatedAt: new Date()
    };

    await team.save();

    res.status(200).json({
      success: true,
      message: "Session updated successfully",
      session: team.sessionHistory[sessionIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating session",
      error: error.message
    });
  }
};

export const deleteSessionForTeam = async (req, res) => {
  try {
    const { teamId, sessionId } = req.params;

    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    // Find session to get violation points
    const sessionToDelete = team.sessionHistory.find(
      session => session._id.toString() === sessionId
    );

    if (!sessionToDelete) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Calculate points to deduct (only from session now)
    const pointsToDeduct = sessionToDelete.violationPoints || 0;

    // Remove session
    team.sessionHistory = team.sessionHistory.filter(
      session => session._id.toString() !== sessionId
    );

    // Adjust violation points (ensure it doesn't go below 0)
    team.totalViolationPoints = Math.max(0, (team.totalViolationPoints || 0) - pointsToDeduct);

    await team.save();

    res.status(200).json({
      success: true,
      message: "Session deleted successfully",
      deletedSession: sessionToDelete,
      pointsDeducted: pointsToDeduct,
      updatedViolationPoints: team.totalViolationPoints
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting session",
      error: error.message
    });
  }
};
// Report absence
export const reportAbsence = async (req, res) => {
  const { teamId } = req.params;
  const { sessionDate, reason } = req.body;

  try {
    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Create a missed session record with violation info
    const newSession = {
      sessionDate,
      conductedBy: req.user.name || "System",
      notes: `Missed session - ${reason || "No reason provided"}`,
      status: "Missed",
      violationPoints: 2, // 2 points for missing a session
      reason,
      violationType: "Absence" // Added this to replace violations.type
    };

    // Update the team
    team.sessionHistory.push(newSession);
    team.totalViolationPoints += 2;

    await team.save();

    res.status(200).json({
      success: true,
      message: "Absence reported successfully",
      team: {
        _id: team._id,
        teamName: team.teamName,
        totalViolationPoints: team.totalViolationPoints
      }
    });
  } catch (error) {
    console.error("Error reporting absence:", error);
    res.status(500).json({
      success: false,
      message: "Failed to report absence",
      error: error.message
    });
  }
};

// Get team violations
export const getTeamViolations = async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await FieldTeamsSchema.findById(teamId)
      .select("sessionHistory totalViolationPoints teamName");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Filter sessions that have violationPoints > 0
    const violations = team.sessionHistory.filter(
      session => session.violationPoints > 0
    ).map(session => ({
      type: session.violationType,
      points: session.violationPoints,
      description: `Missed confirmed training session on ${new Date(session.sessionDate).toLocaleDateString()}`,
      reason: session.reason,
      relatedSession: session._id,
      date: session.sessionDate
    }));

    res.status(200).json({
      success: true,
      violations,
      totalViolationPoints: team.totalViolationPoints,
      teamName: team.teamName
    });
  } catch (error) {
    console.error("Error fetching violations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch violations",
      error: error.message
    });
  }
};

export const toggleQuizPermission = async (req, res) => {
  try {
    const { canTakeQuiz } = req.body;
    const teamId = req.params.id;

    const updatedTeam = await FieldTeamsSchema.findByIdAndUpdate(
      teamId,
      {
        $set: { canTakeQuiz },
        $push: {
          stateLogs: {
            state: 'Quiz Permission Changed',
            quizPermissionChanged: true,
            newQuizPermission: canTakeQuiz,
            changedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updatedTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.status(200).json(updatedTeam);
  } catch (error) {
    console.error("Error updating quiz permission:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};