import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import { OnTheJobAssessment } from "../models/onTheJobAssessmentModel.js";
import { UserSchema } from "../models/userModel.js";

// Create a new assessment
export const createAssessment = async (req, res) => {
  try {
    const { fieldTeamId, conductedBy, conductedById, checkPoints, feedback, categoryWeights, overallScore } = req.body;

    // console.log({ fieldTeamId, conductedById });

    // Verify field team exists
    const fieldTeam = await FieldTeamsSchema.findById(fieldTeamId);
    if (!fieldTeam) {
      return res.status(404).json({ message: "Field team not found" });
    }
    // console.log({ fieldTeam });

    const supervisor = await UserSchema.findById(conductedById);
    if (!supervisor) {
      return res.status(404).json({ message: "Supervisor not found" });
    }

    // console.log({ supervisor });

    const assessment = new OnTheJobAssessment({
      fieldTeamId,
      fieldTeamName: fieldTeam.teamName,
      conductedBy,
      conductedById,
      checkPoints,
      feedback,
      categoryWeights: categoryWeights || undefined, // Use default weights if not provided
      overallScore
    });

    await assessment.save();

    // Update field team's evaluation history
    // fieldTeam.evaluationHistory.push({
    //   score: assessment.overallScore.toString(),
    //   date: assessment.assessmentDate,
    // });
    // fieldTeam.lastEvaluationDate = assessment.assessmentDate;
    // fieldTeam.isEvaluated = true;
    // await fieldTeam.save();

    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update assessment
export const updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkPoints, feedback, status, categoryWeights } = req.body;

    const assessment = await OnTheJobAssessment.findById(id);
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    console.log(assessment.conductedBy, req.user._id.toString());

    if (checkPoints) assessment.checkPoints = checkPoints;
    if (feedback) assessment.feedback = feedback;
    if (status) assessment.status = status;
    if (categoryWeights) assessment.categoryWeights = categoryWeights;

    await assessment.save();

    // Update field team's evaluation history if score changed
    // const fieldTeam = await FieldTeamsSchema.findById(assessment.fieldTeamId);
    // if (fieldTeam) {
    //   // Find the evaluation that matches this assessment date
    //   const evalIndex = fieldTeam.evaluationHistory.findIndex(
    //     evaluation => evaluation.date.getTime() === assessment.assessmentDate.getTime()
    //   );

    //   if (evalIndex !== -1) {
    //     fieldTeam.evaluationHistory[evalIndex].score = assessment.overallScore.toString();
    //     await fieldTeam.save();
    //   }
    // }

    res.status(200).json(assessment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all assessments
export const getAllAssessments = async (req, res) => {
  try {
    const assessments = await OnTheJobAssessment.find({ isDeleted: false })
      .populate("fieldTeamId", "teamName teamCompany");
    res.status(200).json(assessments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get assessments for a specific field team
export const getAssessmentsByFieldTeam = async (req, res) => {
  try {
    const { fieldTeamId } = req.params;
    const assessments = await OnTheJobAssessment.find({
      fieldTeamId,
      isDeleted: false
    }).sort({ assessmentDate: -1 });
    res.status(200).json(assessments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get assessment by ID
export const getAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await OnTheJobAssessment.findById(id).populate(
      "fieldTeamId",
      "teamName teamCompany contactNumber"
    );
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }
    res.status(200).json(assessment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete assessment
export const deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: "Only admins can delete assessments" });
    }

    // Perform soft delete instead of hard delete
    const assessment = await OnTheJobAssessment.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user._id
      },
      { new: true }
    );

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    res.status(200).json({
      message: "Assessment marked as deleted (soft delete)",
      assessment,
      undoAvailableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours to undo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get assessment statistics
export const getAssessmentStatistics = async (req, res) => {
  try {
    const stats = await OnTheJobAssessment.aggregate([
      {
        $match: { isDeleted: false } // Add this match stage to filter out soft-deleted
      },
      {
        $group: {
          _id: null,
          totalAssessments: { $sum: 1 },
          averageScore: { $avg: "$overallScore" },
          minScore: { $min: "$overallScore" },
          maxScore: { $max: "$overallScore" },
          completedAssessments: {
            $sum: {
              $cond: [{ $eq: ["$status", "Completed"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalAssessments: 1,
          averageScore: { $round: ["$averageScore", 2] },
          minScore: 1,
          maxScore: 1,
          completedAssessments: 1,
        },
      },
    ]);

    const fieldTeamStats = await OnTheJobAssessment.aggregate([
      {
        $match: { isDeleted: false } // Add this match stage to filter out soft-deleted
      },
      {
        $group: {
          _id: "$fieldTeamId",
          teamName: { $first: "$fieldTeamName" },
          assessmentCount: { $sum: 1 },
          averageScore: { $avg: "$overallScore" },
          lastAssessmentDate: { $max: "$assessmentDate" },
        },
      },
      {
        $project: {
          _id: 1,
          teamName: 1,
          assessmentCount: 1,
          averageScore: { $round: ["$averageScore", 2] },
          lastAssessmentDate: 1,
        },
      },
      { $sort: { averageScore: -1 } },
    ]);

    const categoryStats = await OnTheJobAssessment.aggregate([
      {
        $match: { isDeleted: false } // Add this match stage to filter out soft-deleted
      },
      {
        $group: {
          _id: null,
          Equipment: { $avg: "$categoryScores.Equipment" },
          Splicing: { $avg: "$categoryScores.Splicing" },
          Configuration: { $avg: "$categoryScores.Configuration" },
          Validation: { $avg: "$categoryScores.Validation" },
          Customer: { $avg: "$categoryScores.Customer" },
          Service: { $avg: "$categoryScores.Service" },
        }
      },
      {
        $project: {
          _id: 0,
          Equipment: { $round: ["$Equipment", 2] },
          Splicing: { $round: ["$Splicing", 2] },
          Configuration: { $round: ["$Configuration", 2] },
          Validation: { $round: ["$Validation", 2] },
          Customer: { $round: ["$Customer", 2] },
          Service: { $round: ["$Service", 2] },
        }
      }
    ]);

    res.status(200).json({
      overallStats: stats[0] || {},
      fieldTeamStats,
      categoryStats: categoryStats[0] || {},
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const softDeleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    const assessment = await OnTheJobAssessment.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user._id
      },
      { new: true }
    );

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    // Get updated stats after deletion
    const updatedStats = await getUpdatedStats();

    res.status(200).json({
      message: "Assessment marked as deleted",
      assessment,
      stats: updatedStats, // Include updated stats in response
      undoAvailableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper function to get updated stats
const getUpdatedStats = async () => {
  const stats = await OnTheJobAssessment.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        totalAssessments: { $sum: 1 },
        averageScore: { $avg: "$overallScore" }
      }
    }
  ]);

  return stats[0] || { totalAssessments: 0, averageScore: 0 };
};

export const restoreAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    // Look for soft-deleted assessments specifically
    const assessment = await OnTheJobAssessment.findOneAndUpdate(
      {
        _id: id,
        isDeleted: true,
        deletedAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within 24 hours
        }
      },
      {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      },
      { new: true }
    ).populate('fieldTeamId', 'teamName');

    if (!assessment) {
      return res.status(404).json({
        message: "Assessment not found, already restored, or undo period expired"
      });
    }

    res.status(200).json({
      message: "Assessment restored successfully",
      assessment: {
        ...assessment._doc,
        teamName: assessment.fieldTeamId.teamName
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAssessmentsWithDeleted = async (req, res) => {
  try {
    const assessments = await OnTheJobAssessment.find()
      .populate("fieldTeamId", "teamName teamCompany");
    res.status(200).json(assessments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};