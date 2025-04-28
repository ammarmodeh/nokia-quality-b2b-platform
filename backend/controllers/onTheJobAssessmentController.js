import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import { OnTheJobAssessment } from "../models/onTheJobAssessmentModel.js";


// Create a new assessment
export const createAssessment = async (req, res) => {
  try {
    const { fieldTeamId, conductedBy, checkPoints, feedback, categoryWeights } = req.body;

    // Verify field team exists
    const fieldTeam = await FieldTeamsSchema.findById(fieldTeamId);
    if (!fieldTeam) {
      return res.status(404).json({ message: "Field team not found" });
    }

    const assessment = new OnTheJobAssessment({
      fieldTeamId,
      fieldTeamName: fieldTeam.teamName,
      conductedBy,
      checkPoints,
      feedback,
      categoryWeights: categoryWeights || undefined, // Use default weights if not provided
    });

    await assessment.save();

    // Update field team's evaluation history
    fieldTeam.evaluationHistory.push({
      score: assessment.overallScore.toString(),
      date: assessment.assessmentDate,
    });
    fieldTeam.lastEvaluationDate = assessment.assessmentDate;
    fieldTeam.isEvaluated = true;
    await fieldTeam.save();

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

    if (checkPoints) assessment.checkPoints = checkPoints;
    if (feedback) assessment.feedback = feedback;
    if (status) assessment.status = status;
    if (categoryWeights) assessment.categoryWeights = categoryWeights;

    await assessment.save();

    // Update field team's evaluation history if score changed
    const fieldTeam = await FieldTeamsSchema.findById(assessment.fieldTeamId);
    if (fieldTeam) {
      // Find the evaluation that matches this assessment date
      const evalIndex = fieldTeam.evaluationHistory.findIndex(
        evaluation => evaluation.date.getTime() === assessment.assessmentDate.getTime()
      );

      if (evalIndex !== -1) {
        fieldTeam.evaluationHistory[evalIndex].score = assessment.overallScore.toString();
        await fieldTeam.save();
      }
    }

    res.status(200).json(assessment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all assessments
export const getAllAssessments = async (req, res) => {
  try {
    const assessments = await OnTheJobAssessment.find().populate(
      "fieldTeamId",
      "teamName teamCompany"
    );
    res.status(200).json(assessments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get assessments for a specific field team
export const getAssessmentsByFieldTeam = async (req, res) => {
  try {
    const { fieldTeamId } = req.params;
    const assessments = await OnTheJobAssessment.find({ fieldTeamId }).sort({
      assessmentDate: -1,
    });
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
    const assessment = await OnTheJobAssessment.findByIdAndDelete(id);
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }
    res.status(200).json({ message: "Assessment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get assessment statistics
export const getAssessmentStatistics = async (req, res) => {
  try {
    const stats = await OnTheJobAssessment.aggregate([
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

    // Calculate average scores by category across all assessments
    const categoryStats = await OnTheJobAssessment.aggregate([
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