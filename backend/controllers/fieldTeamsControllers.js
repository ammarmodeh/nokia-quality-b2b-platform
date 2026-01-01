import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import dotenv from "dotenv";
dotenv.config();

export const validateTeam = async (req, res) => {
  const { teamId, quizCode } = req.body;
  try {
    const team = await FieldTeamsSchema.findOne({ _id: teamId, quizCode });
    if (!team) {
      return res.status(404).json({ message: 'Team not found or invalid quiz code' });
    }

    if (!team.canTakeQuiz) {
      return res.status(403).json({ message: 'This team is not authorized to take the quiz' });
    }

    res.json({
      isValid: true,
      team: {
        _id: team._id,
        teamName: team.teamName,
        firstName: team.firstName,
        secondName: team.secondName,
        thirdName: team.thirdName,
        surname: team.surname,
        teamCompany: team.teamCompany,
        quizCode: team.quizCode,
        canTakeQuiz: team.canTakeQuiz
      }
    });
  } catch (error) {
    console.error(`Error in validateTeam for team ${teamId}:`, error);
    res.status(500).json({ message: error.message });
  }
}

export const getAllFieldTeams = async (req, res) => {
  try {
    const users = await FieldTeamsSchema.find();
    if (!users) return res.status(404).json({ message: "Field Teams not found" });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getTeamPerformanceData = async (req, res) => {
  try {
    const { teamId } = req.params;

    const tasks = await FieldTeamsSchema.find({
      teamId: teamId,
      isDeleted: false
    }).sort({ pisDate: 1 });

    if (!tasks.length) {
      return res.status(404).json({ message: "No tasks found for this team" });
    }

    // Parse evaluationScore strings (format: "correctAnswers/maxScore percentage%") to extract correctAnswers
    const evaluationScores = tasks
      .map(task => {
        if (!task.evaluationScore || task.evaluationScore === "N/A") return null;
        const match = task.evaluationScore.match(/^([\d.]+)\/(\d+)\s+(\d+)%$/);
        return match ? parseFloat(match[1]) : null;
      })
      .filter(score => score !== null);

    const detractors = evaluationScores.filter(score => score >= 1 && score <= 6).length;
    const passives = evaluationScores.filter(score => score >= 7 && score <= 8).length;
    const promoters = evaluationScores.filter(score => score >= 9 && score <= 10).length;

    const violationReasons = {};
    tasks.forEach(task => {
      if (task.reason) {
        if (!violationReasons[task.reason]) {
          violationReasons[task.reason] = {
            total: 0,
            before: 0,
            after: 0,
            scores: []
          };
        }
        violationReasons[task.reason].total++;
        const score = task.evaluationScore && task.evaluationScore !== "N/A"
          ? parseFloat(task.evaluationScore.split('/')[0])
          : 0;
        violationReasons[task.reason].scores.push(score);
      }
    });

    const violationPercentages = Object.keys(violationReasons)
      .map(reason => ({
        reason,
        percentage: (violationReasons[reason].total / tasks.length) * 100,
        ...violationReasons[reason]
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const firstTaskDate = tasks[0].pisDate;
    const lastTaskDate = tasks[tasks.length - 1].pisDate;

    const response = {
      teamName: tasks[0].teamName,
      totalTasks: tasks.length,
      evaluationScores,
      detractors,
      passives,
      promoters,
      nps: promoters > 0 || detractors > 0 ?
        ((promoters - detractors) / (promoters + passives + detractors)) * 100 : 0,
      violationReasons,
      violationPercentages,
      firstTaskDate,
      lastTaskDate,
      tasks
    };

    return res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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

export const addFieldTeam = async (req, res) => {
  try {
    const { teamName, firstName, secondName, thirdName, surname, teamCompany, contactNumber, fsmSerialNumber, laptopSerialNumber } = req.body;

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const quizCode = Array.from({ length: 10 }, () => characters[Math.floor(Math.random() * characters.length)]).join("");

    if (!teamName || !teamCompany || !contactNumber) {
      return res.status(400).json({ error: "Missing required fields: teamName, teamCompany, or contactNumber" });
    }

    const newFieldTeam = new FieldTeamsSchema({
      teamName,
      firstName,
      secondName,
      thirdName,
      surname,
      teamCompany,
      contactNumber,
      fsmSerialNumber: fsmSerialNumber || 'N/A',
      laptopSerialNumber: laptopSerialNumber || 'N/A',
      quizCode,
      canTakeQuiz: false,
      isActive: true,
      isSuspended: false,
      isTerminated: false,
    });

    await newFieldTeam.save();
    res.status(201).json(newFieldTeam);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const suspendTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { suspensionStartDate, suspensionEndDate, suspensionReason } = req.body;

    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    team.isOnLeave = false;
    team.leaveReason = null;
    team.leaveStartDate = null;
    team.leaveEndDate = null;

    team.isResigned = false;
    team.resignationReason = null;

    team.isSuspended = true;
    team.suspensionStartDate = suspensionStartDate;
    team.suspensionEndDate = suspensionEndDate;
    team.suspensionReason = suspensionReason;
    team.isActive = false;

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

export const terminateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { terminationReason } = req.body;

    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

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

    team.isTerminated = true;
    team.terminationReason = terminationReason;
    team.isActive = false;

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

export const reactivateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    team.isSuspended = false;
    team.suspensionReason = null;
    team.suspensionStartDate = null;
    team.suspensionEndDate = null;

    team.isTerminated = false;
    team.terminationReason = null;

    team.isOnLeave = false;
    team.leaveReason = null;
    team.leaveStartDate = null;
    team.leaveEndDate = null;

    team.isResigned = false;
    team.resignationReason = null;

    team.isActive = true;

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

export const onLeaveTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { leaveReason, leaveStartDate, leaveEndDate } = req.body;

    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    team.isOnLeave = true;
    team.leaveReason = leaveReason;
    team.leaveStartDate = leaveStartDate;
    team.leaveEndDate = leaveEndDate;
    team.isActive = false;

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

export const updateTeamScore = async (req, res) => {
  const { teamId, quizCode, correctAnswers, totalQuestions, percentage } = req.body;

  // Validate input
  if (!teamId || !quizCode || correctAnswers === undefined || totalQuestions === undefined || percentage === undefined) {
    return res.status(400).json({
      message: 'Missing required fields: teamId, quizCode, correctAnswers, totalQuestions, or percentage'
    });
  }

  // Validate numeric inputs
  const parsedCorrectAnswers = parseFloat(correctAnswers);
  const parsedTotalQuestions = parseInt(totalQuestions);
  const parsedPercentage = parseInt(percentage);
  if (isNaN(parsedCorrectAnswers) || parsedCorrectAnswers < 0) {
    return res.status(400).json({
      message: 'correctAnswers must be a valid non-negative number'
    });
  }
  if (isNaN(parsedTotalQuestions) || parsedTotalQuestions <= 0) {
    return res.status(400).json({
      message: 'totalQuestions must be a positive integer'
    });
  }
  if (isNaN(parsedPercentage) || parsedPercentage < 0 || parsedPercentage > 100) {
    return res.status(400).json({
      message: 'percentage must be a valid number between 0 and 100'
    });
  }

  try {
    const currentDate = new Date();
    const maxScore = parsedTotalQuestions * 2;
    const scoreString = `${parsedCorrectAnswers}/${maxScore} ${parsedPercentage}%`;

    // Verify team exists and quiz code matches
    const team = await FieldTeamsSchema.findOne({
      _id: teamId,
      quizCode
    });

    if (!team) {
      return res.status(404).json({
        message: 'Team not found or quiz code mismatch'
      });
    }

    // Check if team is allowed to take the quiz
    if (!team.canTakeQuiz) {
      return res.status(403).json({
        message: 'This team is not authorized to take the quiz'
      });
    }

    // Check if an evaluationHistory entry exists for this quizCode
    const historyIndex = team.evaluationHistory.findIndex(
      entry => entry.quizCode === quizCode
    );

    const updateQuery = {
      $set: {
        evaluationScore: scoreString,
        lastEvaluationDate: currentDate,
        isEvaluated: true,
        canTakeQuiz: false,
        isActive: true
      }
    };

    if (historyIndex >= 0) {
      // Update existing evaluationHistory entry
      updateQuery.$set[`evaluationHistory.${historyIndex}.score`] = scoreString;
      updateQuery.$set[`evaluationHistory.${historyIndex}.date`] = currentDate;
    } else {
      // Add new evaluationHistory entry
      updateQuery.$push = {
        evaluationHistory: {
          score: scoreString,
          date: currentDate,
          quizCode: quizCode
        }
      };
    }

    // Update team score and state
    const updatedTeam = await FieldTeamsSchema.findByIdAndUpdate(
      teamId,
      updateQuery,
      { new: true, runValidators: true }
    );

    // Verify canTakeQuiz was set to false
    if (updatedTeam.canTakeQuiz) {
      console.error(`Failed to set canTakeQuiz to false for team ${teamId}`);
    } else {
      console.log(`Successfully set canTakeQuiz to false for team ${teamId}`);
    }

    res.json({
      success: true,
      team: updatedTeam,
    });

  } catch (err) {
    console.error(`Error in updateTeamScore for team ${teamId}:`, err);
    res.status(500).json({
      message: 'Failed to update score',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const getTeamEvaluationHistory = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).send('Team not found');
    }
    return res.json(team.evaluationHistory);
  } catch (error) {
    res.status(500).send('Server error');
  }
}

export const addSession = async (req, res) => {
  const { teamId } = req.params;
  const { sessionDate, conductedBy, sessionTitle, outlines } = req.body;

  try {
    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    const newSession = {
      sessionDate,
      conductedBy,
      sessionTitle,
      outlines,
      status: "Completed"
    };

    team.sessionHistory.push(newSession);
    team.totalViolationPoints = Math.max(0, (team.totalViolationPoints || 0) - 2);

    await team.save();

    const savedSession = team.sessionHistory[team.sessionHistory.length - 1];

    res.status(200).json({
      success: true,
      message: "Session added successfully",
      session: savedSession,
      updatedViolationPoints: team.totalViolationPoints
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding session",
      error: error.message
    });
  }
};

export const updateSessionForTeam = async (req, res) => {
  try {
    const { teamId, sessionId } = req.params;
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

    const sessionToDelete = team.sessionHistory.find(
      session => session._id.toString() === sessionId
    );

    if (!sessionToDelete) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const pointsToDeduct = sessionToDelete.violationPoints || 0;

    team.sessionHistory = team.sessionHistory.filter(
      session => session._id.toString() !== sessionId
    );

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

export const reportAbsence = async (req, res) => {
  const { teamId } = req.params;
  const { sessionDate, reason } = req.body;

  try {
    const team = await FieldTeamsSchema.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const newSession = {
      sessionDate,
      conductedBy: req.user.name || "System",
      notes: `Missed session - ${reason || "No reason provided"}`,
      status: "Missed",
      violationPoints: 2,
      reason,
      violationType: "Absence"
    };

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
    res.status(500).json({
      success: false,
      message: "Failed to report absence",
      error: error.message
    });
  }
};

export const getTeamViolations = async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await FieldTeamsSchema.findById(teamId)
      .select("sessionHistory totalViolationPoints teamName");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

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
      },
      { new: true }
    );

    if (!updatedTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    console.log(`Updated canTakeQuiz to ${canTakeQuiz} for team ${teamId}`);
    res.status(200).json(updatedTeam);
  } catch (error) {
    console.error(`Error in toggleQuizPermission for team ${teamId}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};