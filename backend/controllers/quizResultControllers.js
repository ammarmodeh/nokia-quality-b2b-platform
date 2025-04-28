import QuizResult from "../models/quizResultModel.js";


export const saveQuizResults = async (req, res) => {
  try {
    const {
      teamId,
      quizCode,
      teamName,
      correctAnswers,
      totalQuestions,
      userAnswers,
      questions,
      percentage
    } = req.body;

    // Create the score string
    const score = `${correctAnswers}/${totalQuestions} ${percentage}%`;

    // Map user answers with questions for better structure
    const detailedAnswers = userAnswers.map((answer, index) => ({
      question: questions[index].question,
      options: questions[index].options,
      correctAnswer: questions[index].correctAnswer,
      selectedAnswer: answer.selectedAnswer,
      isCorrect: answer.isCorrect,
      category: questions[index].category // Add this line
    }));

    // Create new quiz result
    const quizResult = new QuizResult({
      teamId,
      quizCode,
      teamName,
      score,
      percentage,
      correctAnswers,
      totalQuestions,
      userAnswers: detailedAnswers
    });

    // Save to database
    await quizResult.save();

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
      .sort({ submittedAt: -1 }) // Newest first
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

// Add this new controller function
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