import { GoogleGenerativeAI, GoogleGenerativeAIError } from "@google/generative-ai";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js"; // Required for dynamic team count
import { TaskSchema } from "../models/taskModel.js";
import { UserSchema } from "../models/userModel.js";
import QuizResult from "../models/quizResultModel.js";
import { OnTheJobAssessment } from "../models/onTheJobAssessmentModel.js";
import { SuggestionSchema } from "../models/suggestionsModel.js";
import { CustomerIssueSchema } from "../models/customerIssueModel.js";

import htmlPdfNode from 'html-pdf-node';
import markdownit from 'markdown-it';

// Initialize markdown parser
const md = markdownit();

// Initialize the Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// =========================================================================
// === UTILITY: RETRY LOGIC FOR TRANSIENT GEMINI API ERRORS (e.g., 503) ===
// =========================================================================

/**
 * Executes a Gemini API call with retry logic and exponential backoff
 * specifically for transient 503 errors.
 * @param {Function} apiCall - The async function that executes the Gemini API call.
 * @param {number} maxRetries - Maximum number of retries.
 * @returns {Promise<any>} - The result of the successful API call.
 */
async function retryApiCall(apiCall, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      // Try the API call
      return await apiCall();
    } catch (error) {
      // Check if the error is a transient 503 (Service Unavailable)
      const is503 = error instanceof GoogleGenerativeAIError && error.status === 503;

      if (is503 && attempt < maxRetries - 1) {
        attempt++;
        // Exponential backoff with jitter: (2^attempt) * 1000ms + jitter
        const delay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000);
        console.warn(`[Gemini API] 503 error. Retrying in ${delay / 1000}s. Attempt ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // If it's not a 503, or max retries reached, re-throw the error
        console.error('[Gemini API] Final call failed or non-retryable error:', error.message);
        // Attach the error status for better client-side handling
        const status = error.status || 500;
        const message = error.message || 'An unknown error occurred with the Gemini API.';
        throw { status, message, originalError: error };
      }
    }
  }
}

// =========================================================================
// === CONTROLLER FUNCTIONS ===
// =========================================================================

export const generateReportFile = async (req, res) => {
  try {
    const { reportContent, format = 'pdf', title = 'QoS Executive Report' } = req.body;

    if (!reportContent) {
      return res.status(400).json({ error: "Report content is required." });
    }

    // 1. Convert Markdown to HTML
    let htmlContent = md.render(reportContent);

    // Optional: Add professional CSS styling for the PDF
    const styledHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: 'Arial', sans-serif; line-height: 1.6; padding: 30px; color: #333; }
                    h1 { color: #007bff; border-bottom: 3px solid #007bff; padding-bottom: 10px; margin-top: 40px; }
                    h2 { color: #28a745; margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                    h3 { color: #dc3545; margin-top: 20px; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    strong { font-weight: 700; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <div style="margin-bottom: 30px; font-size: 0.9em;">
                    Report Generated on: ${new Date().toLocaleString()}
                </div>
                ${htmlContent}
            </body>
            </html>
        `;

    if (format === 'pdf') {
      const file = { content: styledHtml };
      const options = { format: 'A4', printBackground: true };

      const pdfBuffer = await htmlPdfNode.generatePdf(file, options);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s/g, '_')}_${Date.now()}.pdf"`);
      res.send(pdfBuffer);
    } else {
      res.status(400).json({ error: "Unsupported file format." });
    }

  } catch (error) {
    console.error("PDF Generation Failed:", error);
    res.status(500).json({ error: "Failed to generate report file." });
  }
}

export const generateInsights = async (req, res) => {
  try {
    // 1. Gather Comprehensive Context Data (unchanged)
    const totalTasks = await TaskSchema.countDocuments();
    const highPriorityTasks = await TaskSchema.countDocuments({ priority: "High" });
    const completedTasks = await TaskSchema.countDocuments({ validationStatus: "Validated" });
    const pendingTasks = await TaskSchema.countDocuments({ validationStatus: { $ne: "Validated" } });

    const tasksByGovernorate = await TaskSchema.aggregate([
      { $group: { _id: "$governorate", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const tasksByPriority = await TaskSchema.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ]);

    const totalUsers = await UserSchema.countDocuments();
    const totalTeams = await FieldTeamsSchema.countDocuments();
    const usersByRole = await UserSchema.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    const totalQuizResults = await QuizResult.countDocuments();
    const avgQuizScore = await QuizResult.aggregate([
      { $group: { _id: null, avgPercentage: { $avg: "$percentage" } } }
    ]);

    const totalAssessments = await OnTheJobAssessment.countDocuments();
    const avgAssessmentScore = await OnTheJobAssessment.aggregate([
      { $group: { _id: null, avgScore: { $avg: "$totalScore" } } }
    ]);

    const totalCustomerIssues = await CustomerIssueSchema.countDocuments();
    const recentIssues = await CustomerIssueSchema.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const totalSuggestions = await SuggestionSchema.countDocuments();
    const pendingSuggestions = await SuggestionSchema.countDocuments({ status: "Pending" });
    const approvedSuggestions = await SuggestionSchema.countDocuments({ status: "Approved" });

    const context = `
        COMPREHENSIVE SYSTEM DATA SUMMARY:
        
        === TASK MANAGEMENT ===
        - Total Tasks: ${totalTasks}
        - High Priority Tasks: ${highPriorityTasks}
        - Completed/Validated Tasks: ${completedTasks}
        - Pending Tasks: ${pendingTasks}
        - Tasks by Priority: ${JSON.stringify(tasksByPriority)}
        - Top 5 Governorates by Task Count: ${JSON.stringify(tasksByGovernorate)}
        
        === TEAM & USERS ===
        - Total Users: ${totalUsers}
        - Total Field Teams: ${totalTeams}
        - Users by Role: ${JSON.stringify(usersByRole)}
        
        === PERFORMANCE ASSESSMENTS ===
        - Total Quiz Results: ${totalQuizResults}
        - Average Quiz Score: ${avgQuizScore[0]?.avgPercentage?.toFixed(2) || 'N/A'}%
        - Total On-the-Job Assessments: ${totalAssessments}
        - Average Assessment Score: ${avgAssessmentScore[0]?.avgScore?.toFixed(2) || 'N/A'}
        
        === CUSTOMER FEEDBACK ===
        - Total Customer Issues: ${totalCustomerIssues}
        - Recent Issues (Last 7 Days): ${recentIssues}
        
        === SUGGESTIONS ===
        - Total Suggestions: ${totalSuggestions}
        - Pending: ${pendingSuggestions}
        - Approved: ${approvedSuggestions}
        `;

    // 2. Define Prompt
    const prompt = `
        You are an AI assistant for a Quality Operations Tracker app used by Nokia.
        Analyze the following comprehensive data summary and provide 5-7 key strategic insights and actionable recommendations for the operations manager.
        
        Focus on:
        1. Efficiency and productivity trends
        2. Resource allocation optimization
        3. Potential bottlenecks or risks
        4. Team performance patterns
        5. Customer satisfaction indicators
        6. Areas for improvement
        
        Keep it professional, data-driven, and actionable. Use bullet points for clarity.

        Data:
        ${context}
        `;

    // 3. Execute with Retry
    const apiCall = async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    };

    const text = await retryApiCall(apiCall);

    res.status(200).json({ insights: text });
  } catch (error) {
    console.error("Error generating insights:", error.originalError || error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to generate insights",
      error: error.message || 'Server error'
    });
  }
};

export const analyzeChartData = async (req, res) => {
  try {
    const { chartType, data, title, context: additionalContext } = req.body;

    if (!data) {
      return res.status(400).json({ message: "Chart data is required" });
    }

    const prompt = `
        You are an AI data analyst for a Quality Operations Tracker.
        
        Chart Title: ${title || 'Untitled Chart'}
        Chart Type: ${chartType || 'Unknown'}
        
        Data:
        ${JSON.stringify(data, null, 2)}
        
        ${additionalContext ? `Additional Context: ${additionalContext}` : ''}
        
        Provide a concise analysis of this chart data including:
        1. Key trends or patterns
        2. Notable outliers or anomalies
        3. Actionable insights
        4. Recommendations for improvement
        
        Keep it brief (3-5 bullet points) and actionable.
        `;

    // Execute with Retry
    const apiCall = async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    };

    const text = await retryApiCall(apiCall);

    res.status(200).json({ analysis: text });
  } catch (error) {
    console.error("Error analyzing chart data:", error.originalError || error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to analyze chart data",
      error: error.message || 'Server error'
    });
  }
};

export const handleChat = async (req, res) => {
  try {
    const { userQuery, reportContext, chatHistory } = req.body; // Using the request body from the front-end dialog

    if (!userQuery) {
      return res.status(400).json({ message: "User query is required" });
    }

    // === Constructing history in the required format for the API ===
    const historyParts = [
      {
        role: "user",
        parts: [{ text: "You are an AI assistant for the Nokia Quality Task Tracker app. You are currently analyzing the provided report context and answering questions about it. Do not discuss anything outside of the report context." }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I will answer all questions based solely on the provided report data and context." }],
      },
    ];

    // Add previous user questions and model responses to history
    if (Array.isArray(chatHistory)) {
      // chatHistory comes from the client as { sender: 'user'/'ai', text: '...' }
      chatHistory.forEach(msg => {
        if (msg.sender === 'user') {
          historyParts.push({ role: 'user', parts: [{ text: msg.text }] });
        } else if (msg.sender === 'ai') {
          historyParts.push({ role: 'model', parts: [{ text: msg.text }] });
        }
      });
    }

    // Final message from the user, including the report context
    const finalPrompt = `
        REPORT CONTEXT FOR Q&A:
        ---
        ${reportContext}
        ---
        USER'S QUESTION: ${userQuery}
        `;

    historyParts.push({ role: 'user', parts: [{ text: finalPrompt }] });

    // Execute with Retry
    const apiCall = async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      // Send the entire history and context as a single request
      const result = await model.generateContent({
        model: "gemini-flash-latest",
        contents: historyParts,
      });

      return result.response.text();
    };

    const text = await retryApiCall(apiCall);

    res.status(200).json({ chatResponse: text });
  } catch (error) {
    console.error("Error in chat:", error.originalError || error);
    res.status(error.status || 500).json({
      message: error.message || "Chat failed",
      error: error.message || 'Server error'
    });
  }
};


export const deepWeeklyAnalysis = async (req, res) => {
  try {
    // Simple placeholder implementation to verify endpoint and CORS.
    // In production you would replace this with the full analysis logic.
    const dummyResult = {
      analysis: "## 🟢 QoS Executive Report — Placeholder\n\n**CORS Check Successful.**\n\nThis is a placeholder response to verify that the CORS configuration is working correctly on Vercel.",
      metadata: {
        generatedAt: new Date().toLocaleString(),
        totalCases: 0
      }
    };
    res.status(200).json(dummyResult);
  } catch (error) {
    console.error('deepWeeklyAnalysis error:', error);
    res.status(500).json({ error: 'Internal server error in deepWeeklyAnalysis', details: error.message });
  }
};