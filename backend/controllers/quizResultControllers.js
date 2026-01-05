import QuizResult from "../models/quizResultModel.js";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import { updateTeamScore } from "../controllers/fieldTeamsControllers.js";

export const saveQuizResults = async (req, res) => {
  try {
    const {
      teamId,
      quizCode,
      teamName,
      teamCompany,
      totalQuestions,
      userAnswers,
      questions
    } = req.body;

    // Map user answers with questions for better structure
    const detailedAnswers = userAnswers.map((answer, index) => ({
      question: questions[index].question,
      options: questions[index].options || [],
      correctAnswer: questions[index].correctAnswer,
      selectedAnswer: answer.selectedAnswer,
      essayAnswer: answer.essayAnswer,
      score: answer.score || 0,
      isCorrect: answer.isCorrect,
      isScored: (questions[index].type || 'options') !== 'essay',
      category: questions[index].category,
      type: questions[index].type || 'options'
    }));

    // Calculate initial score (points-based: 2 points per correct MCQ)
    const calculatedScore = detailedAnswers.reduce((acc, answer) => {
      if (answer.type === 'essay') {
        return acc + (answer.score || 0);
      }
      return answer.isCorrect ? acc + 2 : acc;
    }, 0);

    const totalQuestionsCount = userAnswers.length;
    const maxScore = totalQuestionsCount * 2;
    const calculatedPercentage = maxScore > 0 ? Math.round((calculatedScore / maxScore) * 100) : 0;
    const scoreString = `${calculatedPercentage}/100`;

    // Create new quiz result
    const quizResult = new QuizResult({
      teamId,
      quizCode,
      teamName,
      teamCompany,
      score: scoreString,
      percentage: calculatedPercentage,
      correctAnswers: calculatedScore,
      totalQuestions: totalQuestionsCount,
      userAnswers: detailedAnswers
    });

    // Save to database
    await quizResult.save();

    // Update FieldTeamsSchema with the quiz score
    await updateTeamScore({
      body: { teamId, quizCode, correctAnswers: calculatedScore, totalQuestions: totalQuestionsCount, percentage: calculatedPercentage }
    }, { json: () => { }, status: () => ({ json: () => { } }) });

    res.status(201).json({
      success: true,
      message: 'Quiz results saved successfully',
      data: quizResult
    });
  } catch (error) {
    console.error('Error saving quiz results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save quiz results',
      error: error.message
    });
  }
};

export const getQuizResults = async (req, res) => {
  try {
    const { teamId, quizCode } = req.query;

    let query = {};
    if (teamId) query.teamId = teamId;
    if (quizCode) query.quizCode = quizCode;

    const results = await QuizResult.find(query)
      .sort({ submittedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz results',
      error: error.message
    });
  }
};

export const getQuizResultById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await QuizResult.findById(id).lean();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Quiz result not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching quiz result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz result',
      error: error.message
    });
  }
};

export const getAllTeams = async (req, res) => {
  try {
    const teams = await QuizResult.aggregate([
      {
        $group: {
          _id: "$teamId",
          teamName: { $first: "$teamName" }
        }
      },
      {
        $project: {
          _id: 0,
          teamId: "$_id",
          teamName: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: teams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teams',
      error: error.message
    });
  }
};

export const updateEssayScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionIndex, score } = req.body;

    // Validate inputs
    if (!Number.isInteger(questionIndex) || questionIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question index'
      });
    }
    const parsedScore = parseFloat(score);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 2) {
      return res.status(400).json({
        success: false,
        message: 'Score must be a number between 0 and 2'
      });
    }

    // Find the quiz result
    const quizResult = await QuizResult.findById(id);
    if (!quizResult) {
      return res.status(404).json({
        success: false,
        message: 'Quiz result not found'
      });
    }

    // Check if the question at questionIndex is an essay question
    if (quizResult.userAnswers[questionIndex]?.type !== 'essay') {
      return res.status(400).json({
        success: false,
        message: 'Specified question is not an essay question'
      });
    }

    // Update the score and mark as scored
    quizResult.userAnswers[questionIndex].score = parsedScore;
    quizResult.userAnswers[questionIndex].isScored = true;

    // Recalculate correctAnswers (sum of options questions with isCorrect: true * 2 + essay question scores)
    const correctAnswers = quizResult.userAnswers.reduce((acc, answer) => {
      if (answer.type === 'essay') {
        return acc + (answer.score || 0);
      }
      return answer.isCorrect ? acc + 2 : acc;
    }, 0);

    // Recalculate percentage and score string (using 2-point scale)
    const totalQuestions = quizResult.userAnswers.length;
    const maxScore = totalQuestions * 2;
    const percentage = maxScore > 0 ? Math.round((correctAnswers / maxScore) * 100) : 0;
    quizResult.correctAnswers = correctAnswers;
    quizResult.totalQuestions = totalQuestions;
    quizResult.percentage = percentage;
    quizResult.score = `${percentage}/100`;

    // Save the updated quiz result
    await quizResult.save();

    // Update FieldTeamsSchema with the new quiz score
    await updateTeamScore({
      body: { teamId: quizResult.teamId, quizCode: quizResult.quizCode, correctAnswers, totalQuestions, percentage }
    }, { json: () => { }, status: () => ({ json: () => { } }) });

    res.status(200).json({
      success: true,
      message: 'Essay score updated successfully',
      data: quizResult
    });
  } catch (error) {
    console.error('Error updating essay score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update essay score',
      error: error.message
    });
  }
};

export const getTeamsEvaluation = async (req, res) => {
  try {
    // Aggregate unique teams from QuizResult, assuming this represents the teams in FieldTeams that have quiz activity
    // If FieldTeams has additional teams without quizzes, the FieldTeam model would need to be imported and queried instead
    const teams = await QuizResult.aggregate([
      {
        $group: {
          _id: "$teamId",
          teamName: { $first: "$teamName" },
          teamCompany: { $first: "$teamCompany" }
        }
      },
      {
        $sort: { teamName: 1 } // Sort teams alphabetically by name for consistent output
      },
      {
        $project: {
          _id: 0,
          teamId: "$_id",
          teamName: 1,
          teamCompany: 1
        }
      }
    ]);

    // For each team, fetch their full quiz history including evaluation details (userAnswers)
    const teamsEvaluation = await Promise.all(teams.map(async (team) => {
      const history = await QuizResult.find({ teamId: team.teamId }, {
        _id: 1,
        quizCode: 1,
        score: 1,
        percentage: 1,
        correctAnswers: 1,
        totalQuestions: 1,
        userAnswers: 1, // Includes detailed answers, scores, correctness for evaluation
        submittedAt: 1
      })
        .sort({ submittedAt: -1 }) // Latest first
        .lean();

      return {
        ...team,
        history
      };
    }));

    res.status(200).json({
      success: true,
      data: teamsEvaluation
    });
  } catch (error) {
    console.error('Error fetching teams evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teams evaluation',
      error: error.message
    });
  }
};

export const deleteQuizResult = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the quiz result to get teamId and quizCode
    const result = await QuizResult.findById(id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Quiz result not found'
      });
    }

    const { teamId, quizCode } = result;

    // 2. Delete the quiz result record
    await QuizResult.findByIdAndDelete(id);

    // 3. Update the FieldTeam document to remove this history entry and update summary scores
    const team = await FieldTeamsSchema.findById(teamId);
    if (team) {
      // Remove from evaluationHistory
      team.evaluationHistory = team.evaluationHistory.filter(h => h.quizCode !== quizCode);

      // Fetch remaining history from QuizResult to find the latest
      const remainingHistory = await QuizResult.find({ teamId })
        .sort({ submittedAt: -1 })
        .limit(1)
        .lean();

      if (remainingHistory.length > 0) {
        const latest = remainingHistory[0];
        team.evaluationScore = latest.score;
        team.lastEvaluationDate = latest.submittedAt;
        team.isEvaluated = true;
      } else {
        // No more evaluations left
        team.evaluationScore = "N/A";
        team.lastEvaluationDate = null;
        team.isEvaluated = false;
      }

      await team.save();
    }

    res.status(200).json({
      success: true,
      message: 'Quiz result deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting quiz result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz result',
      error: error.message
    });
  }
};
