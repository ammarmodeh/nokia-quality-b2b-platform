import { GoogleGenerativeAI, GoogleGenerativeAIError } from "@google/generative-ai";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js"; // Required for dynamic team count
import { TaskSchema } from "../models/taskModel.js";
import { UserSchema } from "../models/userModel.js";
import QuizResult from "../models/quizResultModel.js";
import { OnTheJobAssessment } from "../models/onTheJobAssessmentModel.js";
import { SuggestionSchema } from "../models/suggestionsModel.js";
import { CustomerIssueSchema } from "../models/customerIssueModel.js";
import { AIReport } from "../models/aiReportModel.js";

import htmlPdfNode from 'html-pdf-node';
import markdownit from 'markdown-it';
import HTMLtoDOCX from 'html-to-docx';

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
                    img { max-width: 100%; height: auto; display: block; margin: 20px 0; border-radius: 8px; }
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
      try {
        console.log(`[PDF Gen] Starting PDF generation for: ${title}`);
        const file = { content: styledHtml };
        const options = { format: 'A4', printBackground: true };

        const pdfBuffer = await htmlPdfNode.generatePdf(file, options);
        console.log(`[PDF Gen] PDF generation successful. Buffer size: ${pdfBuffer.length}`);

        const safeTitle = title.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, "_");
        const filename = `${safeTitle || 'Report'}_${Date.now()}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(title)}_${Date.now()}.pdf`);
        res.status(200).send(pdfBuffer);
      } catch (pdfError) {
        console.error("[PDF Gen] html-pdf-node failed:", pdfError);
        throw pdfError;
      }
    } else if (format === 'docx') {
      try {
        console.log(`[DOCX Gen] Starting DOCX generation for: ${title}`);
        const docxBuffer = await HTMLtoDOCX(styledHtml, null, {
          table: { row: { cantSplit: true } },
          footer: true,
          pageNumber: true,
        });
        console.log(`[DOCX Gen] DOCX generation successful. Buffer size: ${docxBuffer.length}`);

        const safeTitle = title.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, "_");
        const filename = `${safeTitle || 'Report'}_${Date.now()}.docx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(title)}_${Date.now()}.docx`);
        res.status(200).send(docxBuffer);
      } catch (docxError) {
        console.error("[DOCX Gen] HTMLtoDOCX failed:", docxError);
        throw docxError;
      }
    } else {
      res.status(400).json({ error: "Unsupported file format." });
    }

  } catch (error) {
    console.error("Report Generation Overall Failure:", error);
    res.status(500).json({
      error: "Failed to generate report file.",
      details: error.message
    });
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

    // Performance Assessments
    const totalQuizResults = await QuizResult.countDocuments();
    const avgQuizScore = await QuizResult.aggregate([
      { $group: { _id: null, avgPercentage: { $avg: "$percentage" } } }
    ]);
    const totalAssessments = await OnTheJobAssessment.countDocuments();
    const avgAssessmentScore = await OnTheJobAssessment.aggregate([
      { $group: { _id: null, avgScore: { $avg: "$score" } } }
    ]);

    // Customer Feedback
    const totalCustomerIssues = await CustomerIssueSchema.countDocuments();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentIssues = await CustomerIssueSchema.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Suggestions
    const totalSuggestions = await SuggestionSchema.countDocuments();
    const pendingSuggestions = await SuggestionSchema.countDocuments({ status: "Pending" });
    const approvedSuggestions = await SuggestionSchema.countDocuments({ status: "Approved" });

    const context = `
        COMPREHENSIVE SYSTEM DATA SUMMARY:
        
        === TASK MANAGEMENT ===
      - Total Tasks: ${totalTasks}
    - High Priority Tasks: ${highPriorityTasks}
    - Completed / Validated Tasks: ${completedTasks}
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
      - Total On - the - Job Assessments: ${totalAssessments}
    - Average Assessment Score: ${avgAssessmentScore[0]?.avgScore?.toFixed(2) || 'N/A'}
        
        === CUSTOMER FEEDBACK ===
      - Total Customer Issues: ${totalCustomerIssues}
    - Recent Issues(Last 7 Days): ${recentIssues}
        
        === SUGGESTIONS ===
      - Total Suggestions: ${totalSuggestions}
    - Pending: ${pendingSuggestions}
    - Approved: ${approvedSuggestions}
    `;

    // 2. Define Prompt
    const prompt = `
        You are an AI assistant for a Quality Operations Tracker app used by Nokia.
        Analyze the following comprehensive data summary and provide 5 - 7 key strategic insights and actionable recommendations for the operations manager.
        
        Focus on:
    1. Efficiency and productivity trends
    2. Resource allocation optimization
    3. Potential bottlenecks or risks
    4. Team performance patterns
    5. Customer satisfaction indicators
    6. Areas for improvement
        
        Keep it professional, data - driven, and actionable.Use bullet points for clarity.

      Data:
        ${context}
    `;

    // 3. Execute with Retry
    const apiCall = async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
        
        Keep it brief(3 - 5 bullet points) and actionable.
        `;

    // Execute with Retry
    const apiCall = async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
        REPORT CONTEXT FOR Q & A:
    ---
      ${reportContext}
    ---
      USER'S QUESTION: ${userQuery}
        `;

    historyParts.push({ role: 'user', parts: [{ text: finalPrompt }] });

    // Execute with Retry
    const apiCall = async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Send the entire history and context as a single request
      const result = await model.generateContent({
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


// controllers/aiController.js (Optimized with MongoDB Aggregation)
export const deepWeeklyAnalysis = async (req, res) => {
  try {
    const { period = 'ytd' } = req.body;
    const now = new Date();
    let startDate, endDate;
    let periodTitle = "Year-to-Date (YTD)";

    // Helper to get start of week (Monday)
    // Helper to get start of week (Sunday - Jordan Standard)
    const getStartOfWeek = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day; // 0 is Sunday, so just subtract day
      return new Date(d.setDate(diff));
    };

    // Calculate Date Range based on period
    if (period === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      periodTitle = "Last Month";
    } else if (period === 'current_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodTitle = "Current Month";
    } else if (period === 'last_week') {
      const startOfCurrentWeek = getStartOfWeek(now);
      startDate = new Date(startOfCurrentWeek);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startOfCurrentWeek);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      periodTitle = "Last Week";
    } else if (period === 'current_week') {
      startDate = getStartOfWeek(now);
      startDate.setHours(0, 0, 0, 0);
      periodTitle = "Current Week";
    } else if (period === 'custom') {
      const { startDate: customStart, endDate: customEnd } = req.body;
      if (!customStart || !customEnd) {
        throw { status: 400, message: "Start date and End date are required for custom period." };
      }
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);

      periodTitle = `Custom Range (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;
    } else {
      // YTD
      startDate = new Date(now.getFullYear(), 0, 1);
      // For YTD, implicit end date is now
      periodTitle = `Year-to-Date (YTD) (${startDate.toLocaleDateString()} - Present)`;
    }

    // Append dates to standard periods if not already formatted
    if (period !== 'custom' && period !== 'ytd') {
      const endStr = endDate ? endDate.toLocaleDateString() : 'Present';
      periodTitle += ` (${startDate.toLocaleDateString()} - ${endStr})`;
    }

    // --- 1. Dynamic Team Count & Limit ---
    const totalTeams = await FieldTeamsSchema.countDocuments({ role: 'fieldTeam', isActive: true });
    const actualTotalTeams = totalTeams > 0 ? totalTeams : 1;

    const SAMPLES_PER_WEEK = 115;
    const WEEKS_PER_YEAR = 52;

    // Limits
    const MAX_DETRACTOR_RATE = 0.09;
    const MAX_YEARLY_DETRACTORS_POOL = Math.floor(SAMPLES_PER_WEEK * WEEKS_PER_YEAR * MAX_DETRACTOR_RATE);
    const YTD_DETRACTOR_LIMIT_PER_TEAM = Math.floor(MAX_YEARLY_DETRACTORS_POOL / actualTotalTeams);

    const MAX_NEUTRAL_RATE = 0.16;
    const MAX_YEARLY_NEUTRALS_POOL = Math.floor(SAMPLES_PER_WEEK * WEEKS_PER_YEAR * MAX_NEUTRAL_RATE);
    const YTD_NEUTRAL_LIMIT_PER_TEAM = Math.floor(MAX_YEARLY_NEUTRALS_POOL / actualTotalTeams);

    // --- 2. Dynamic Base Date ---
    const firstTask = await TaskSchema.findOne({
      evaluationScore: { $lte: 8 },
      interviewDate: { $exists: true }
    })
      .sort({ interviewDate: 1 })
      .select('interviewDate')
      .lean();

    let baseDate;
    if (firstTask?.interviewDate) {
      const firstDate = new Date(firstTask.interviewDate);
      firstDate.setHours(0, 0, 0, 0);
      const day = firstDate.getDay();
      const diffToMonday = day === 0 ? 1 : (8 - day) % 7;
      baseDate = new Date(firstDate);
      baseDate.setDate(firstDate.getDate() + diffToMonday);
    } else {
      baseDate = new Date(2024, 11, 30);
    }
    baseDate.setHours(0, 0, 0, 0);

    // --- 3. Aggregation Pipeline ---
    // --- 3. Aggregation Pipeline ---
    const referenceDate = endDate || now; // Use endDate as reference if custom/past, otherwise now
    const startOfReferenceMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const threeWeeksBeforeRef = new Date(referenceDate.getTime() - 21 * 24 * 60 * 60 * 1000);
    const twoWeeksBeforeRef = new Date(referenceDate.getTime() - 14 * 24 * 60 * 60 * 1000);

    const EXCLUDE_TEAMS = ["Unknown Team", "غير معروف"];

    const aggregationResults = await TaskSchema.aggregate([
      {
        $match: {
          evaluationScore: { $gte: 1, $lte: 8 },
          interviewDate: {
            $exists: true,
            $gte: startDate,
            ...(endDate && { $lte: endDate })
          },
          teamName: { $nin: EXCLUDE_TEAMS }
        }
      },
      {
        $facet: {
          // Total Cases
          totalCases: [{ $count: "count" }],

          // Closure Rate
          closure: [
            {
              $group: {
                _id: "$validationStatus",
                count: { $sum: 1 }
              }
            }
          ],

          // All Reasons (Breakdown)
          reasons: [
            {
              $group: {
                _id: { $ifNull: ["$reason", "Unspecified"] },
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
            // Removed limit to show all drivers as requested
          ],

          // Team Stats (YTD, Detractor, Neutral, Recent Periods)
          teamStats: [
            {
              $group: {
                _id: { $ifNull: ["$teamName", "Unknown Team"] },
                totalYTD: { $sum: 1 },
                detractors: {
                  $sum: { $cond: [{ $lte: ["$evaluationScore", 6] }, 1, 0] }
                },
                neutrals: {
                  $sum: { $cond: [{ $and: [{ $gte: ["$evaluationScore", 7] }, { $lte: ["$evaluationScore", 8] }] }, 1, 0] }
                },
                currentMonth: {
                  $sum: { $cond: [{ $gte: ["$interviewDate", startOfReferenceMonth] }, 1, 0] }
                },
                last3Weeks: {
                  $sum: { $cond: [{ $gte: ["$interviewDate", threeWeeksBeforeRef] }, 1, 0] }
                },
                last2Weeks: {
                  $sum: { $cond: [{ $gte: ["$interviewDate", twoWeeksBeforeRef] }, 1, 0] }
                },
                // Collect reasons for chronic offender analysis
                reasons: { $push: { $ifNull: ["$reason", "Unspecified"] } }
              }
            }
          ],

          // Weekly Repeat Offenders
          weeklyStats: [
            {
              $project: {
                teamName: { $ifNull: ["$teamName", "Unknown Team"] },
                weekNum: {
                  $floor: {
                    $divide: [
                      { $subtract: ["$interviewDate", baseDate] },
                      1000 * 60 * 60 * 24 * 7
                    ]
                  }
                }
              }
            },
            {
              $project: {
                teamName: 1,
                weekNum: { $add: ["$weekNum", 1] } // 1-based week number
              }
            },
            {
              $group: {
                _id: { team: "$teamName", week: "$weekNum" },
                count: { $sum: 1 }
              }
            },
            {
              $match: { count: { $gte: 2 } }
            },
            { $sort: { "_id.week": 1 } }
          ]
        }
      }
    ]);

    const results = aggregationResults[0];
    const totalCases = results.totalCases[0]?.count || 0;

    if (totalCases === 0) {
      return res.json({
        analysis: `## 🟢 QoS Executive Report — All Clear\n\n ** No detractor or neutral cases found in the current period.**\n\nAll customers are Promoters(9–10).Outstanding performance maintained.\n\nKeep pushing for excellence.`,
        metadata: { totalCases: 0, generatedAt: new Date().toLocaleString() }
      });
    }

    // --- 4. Process Aggregated Data ---

    // Closure Rate
    const fixedCount = results.closure.find(c => c._id === "Validated")?.count || 0;
    const closureRate = ((fixedCount / totalCases) * 100).toFixed(1);

    // Top Reasons
    const topReasons = results.reasons.map((r, i) =>
      `${i + 1}. ** ${r._id}** — ${r.count} cases(${((r.count / totalCases) * 100).toFixed(1)}%)`
    );

    // Team Stats Processing
    const teamStats = results.teamStats;

    // Helper to find max in array
    const findMaxTeam = (key) => {
      if (!teamStats.length) return "**NONE** (Zero registered team violations)";
      const top = teamStats.sort((a, b) => b[key] - a[key])[0];
      return top && top[key] > 0 ? `** ${top._id}** (${top[key]} cases)` : "**NONE** (Zero registered team violations)";
    };

    const mostRepeatedCurrentMonth = findMaxTeam('currentMonth');
    const mostRepeatedLast3Weeks = findMaxTeam('last3Weeks');
    const mostRepeatedLast2Weeks = findMaxTeam('last2Weeks');

    // Weekly Repeat Offenders Text
    const weeklyRepeatOffendersText = results.weeklyStats.length > 0
      ? results.weeklyStats.map(w => `• ** ${w._id.team}** — ${w.count} cases in Wk - ${w._id.week} `).join('\n')
      : "None detected in registered teams";

    // Chronic Offenders
    const chronicOffenders = teamStats
      .filter(t => t.detractors >= YTD_DETRACTOR_LIMIT_PER_TEAM)
      .sort((a, b) => b.detractors - a.detractors)
      .slice(0, 7)
      .map(t => {
        // Find top reason for this team
        const teamReasonCounts = t.reasons.reduce((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {});
        const topReason = Object.entries(teamReasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Mixed";

        const totalDNCount = t.detractors + t.neutrals;
        const exceededBy = t.detractors - YTD_DETRACTOR_LIMIT_PER_TEAM;
        const percentExceeded = ((exceededBy / YTD_DETRACTOR_LIMIT_PER_TEAM) * 100).toFixed(1);

        return `• ** ${t._id}** — ${t.detractors} Detractors(Limit: ${YTD_DETRACTOR_LIMIT_PER_TEAM})(+${t.neutrals} Neutrals, Limit: ${YTD_NEUTRAL_LIMIT_PER_TEAM}).Total D / N: ${totalDNCount}. ** Exceeds Detractor Limit By: ${percentExceeded}%**.Top failure: "${topReason}"`;
      });

    // Full Team Breakdown (All Teams found in period)
    const allTeamsStatsText = teamStats
      .sort((a, b) => b.totalYTD - a.totalYTD)
      .map(t => {
        const teamReasonCounts = t.reasons.reduce((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {});

        // List all reasons with their counts
        const allReasons = Object.entries(teamReasonCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([r, c]) => `${r} (${c})`)
          .join(', ');

        return `| ${t._id} | ${t.totalYTD} | ${t.detractors} | ${t.neutrals} | ${allReasons} |`;
      }).join('\n');

    const allTeamsTable = `
| Team Name | Total Cases | Detractors | Neutrals | Failure Breakdown |
| :--- | :---: | :---: | :---: | :--- |
${allTeamsStatsText}
    `;

    // --- 5. Generate Prompt (Dynamic) ---
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      temperature: 0.3,
    });

    let prompt = "";

    // Standard Prompt for YTD/Month (Detailed Structured Report)
    const standardPrompt = `
        You are an ** AI Senior Quality Advisor ** for the OrangeJO–Nokia FTTH Project. 
        Your mission is to convert detractor/neutral cases(scores 1–8) into a ** high - authority, trend - driven, executive report ** with deep operational insights.
        
        ** REPORT PERIOD: ${periodTitle} **
        (Please explicitly mention "AI Model: Gemini 2.5 Flash" at the top of the report)
        (Note: "Total Cases" and statistics usually refer to YTD, but currently reflect the selected period: ${periodTitle}. Adapt your language accordingly.)

        ** STRICT FORMATTING RULES(MANDATORY):**
         1. ** Avoid excessive bullet points(* or -):** For interpretation sections, use ** structured paragraphs ** and ** bold key findings ** instead of simple lists.
         2. ** Use Tables for Data Comparison:** Whenever listing chronic offenders, top teams, or key metrics, format the data using ** Markdown Tables ** to improve readability and professionalism.
         3. ** Use Subheadings(###) to separate points ** within major sections(1 - 10) for better hierarchy.
         4. ** Do not use any teams named "غير معروف" or "Unknown Team".**

        # 🚨 Operational Intelligence Flags(High - Priority)
          * ** CRITICAL: Most Repeated Team(Period End):** ${mostRepeatedCurrentMonth}
          * ** HIGH RISK: Most Repeated Team(Last 3 Weeks of Period):** ${mostRepeatedLast3Weeks}
          * ** IMMEDIATE: Most Repeated Team(Last 2 Weeks of Period):** ${mostRepeatedLast2Weeks}

        ## 📉 Weekly Repeat Offender Analysis(Structural Failure Indicator)
        Teams demonstrating 2 or more detractor / neutral cases in the same calendar week within the period:
        ${weeklyRepeatOffendersText}

        # 📊 Key Performance Indicators & Load Indicators
        | Metric | Value | Interpretation |
        | : --- | : --- | : --- |
        | ** Total Cases(Score 1 - 8) ** | ${totalCases} | Operational Failure Load |
        | ** Validated Closure Rate ** | ${closureRate}% | Effectiveness of Corrective Action(Target: > 95 %) |
        | ** Active Field Teams ** | ${actualTotalTeams} | Total operational entities managed |
        | ** YTD Max Detractor Allowance Per Team ** | ${YTD_DETRACTOR_LIMIT_PER_TEAM} | Proactive Annual Performance Ceiling(9 % max) |
        | ** YTD Max Neutral Allowance Per Team ** | ${YTD_NEUTRAL_LIMIT_PER_TEAM} | Logical Annual Performance Ceiling(16 % max) |

        # 🚩 Failure Drivers Breakdown (Complete List & Weighted %)
        These represent the failure modes contributing to customer dissatisfaction, sorted by frequency:
        ${topReasons.join("\n")}

        # 🚧 Chronic Offenders(Exceeded Annual Detractor Threshold)
        ${chronicOffenders.length > 0 ? chronicOffenders.join("\n") : "No registered teams exceeded the YTD Detractor threshold."}

        # 📋 Full Team Performance Breakdown (All Active Teams in Period)
        ${allTeamsTable}

        # 🎯 REQUIRED OUTPUT FORMAT(STRICT & PROFESSIONAL)
         Generate a ** deep, insight - rich, aggressive Markdown report **.

        ## 1. 🛡️ Period Performance Overview
        Analyze the current detractor volume(${totalCases} cases). State whether this load is sustainable.

        ## 2. 📈 QoS Metrics Snapshot: Operational Deterioration
        Focus on the single team appearing highest across the current period and recent weeks.
        Interpret the "Weekly Repeat Offenders" list as evidence of widespread deficiencies.

        ## 3. 🗓️ Trend & Volatility Analysis
        Identify teams exhibiting a clear ** rising detractor trajectory ** over the period.
        Highlight specific weeks/days that demonstrate significant surges.

        ## 4. 🧠 Team Trend Intelligence: Early - Warning System
        Identify high alert teams appearing frequently in the last few weeks of the period.
        Referece the "Full Team Performance Breakdown" table to discuss broader team performance.

        ## 5. 🛠️ Dominant Failure Modes
        Provide a concise, executive interpretation of the Top 5 Root Causes.

        ## 6. 🔄 Failure Mode Evolution
        Acknowledge data limitations if month-over-month cause data is missing.

        ## 7. 🎯 Accountability & Exceeded Limits
        Call out the ** Most Repeated Team ** as a critical liability.
        List teams that have exceeded their allowance.

        ## 8. 🔍 Recurrence and Quality Gap
        Analyze the recurrence mechanism (Skill Gap, Process Non-Compliance).

        ## 9. ⚠️ Strategic Risk Outlook
        Predict high-risk teams for the upcoming weeks based on this period's data.
    `;

    // Adaptive Prompt for Custom Ranges (Simpler, Context-Aware)
    let customPrompt = "";
    if (period === 'custom' || period === 'current_week' || period === 'last_week') {
      const endStr = endDate ? endDate.toLocaleDateString() : new Date().toLocaleDateString();
      customPrompt = `
        You are an ** AI Senior Quality Intelligence Advisor ** for the OrangeJO–Nokia FTTH Project.
        
        ** CUSTOM REPORT PERIOD: ${periodTitle} **
        (Please explicitly mention "AI Model: Gemini 2.5 Flash" at the top of the report)
        ** DATA CONTEXT **: The statistics provided below are STRICTLY calculated for the custom range: ${startDate.toLocaleDateString()} to ${endStr}.
        
        ** Audience **: CTO, PMO Directors, Nokia Quality Managers
        ** Tone **: Executive, highly professional, direct, data - driven.

        ** KEY STATISTICS FOR THIS PERIOD **:
        - ** Total Detractor / Neutral Cases **: ${totalCases}
        - ** Closure Rate **: ${closureRate}%
        - ** Top Failure Modes **:
        ${topReasons.join("\n")}
        
        - ** Most Active Offender (Entire Custom Period) **: ${mostRepeatedCurrentMonth}
        - ** Recent Spikes (Last 2-3 Weeks of Selection) **: ${mostRepeatedLast2Weeks} / ${mostRepeatedLast3Weeks}
        
        - ** Repeat Offenders ( > 1 case / week) **:
        ${weeklyRepeatOffendersText}

        - ** Chronic Threshold Breaches (YTD Context) **:
        ${chronicOffenders.length > 0 ? chronicOffenders.join("\n") : "No teams exceeded YTD limits."}

        - ** Full Team Performance Breakdown **:
        ${allTeamsTable}

        ** INSTRUCTIONS **:
        Generate a concise, high-impact executive summary for this specific custom period.
        Do NOT hallucinate trends outside this date range.
        Do NOT force "Quarterly" or "Annual" analysis if the period is short.
        
        Structure:
        ## 1. 📊 Custom Period Overview
        Analyze the volume (${totalCases}) and the closure rate (${closureRate}%) within this specific window.
        
        ## 2. 🚩 Key Failure Drivers (Full Breakdown)
        Analyze the failure drivers listed above, paying attention to both high-frequency issues and smaller recurring problems.
        
        ## 3. ⚠️ Team Performance & Risks
        - List **EVERY TEAM** from the "Full Team Performance Breakdown" table that has recorded violations.
        - For **EACH** team, explicitly state their Name and the specific **Failure Breakdown** (reasons and counts).
        - Do not summarize or group them. I want a line item for each team with their specific issues.
        - Discuss the "Repeat Offenders" if any are listed.
        

    `;
    }

    prompt = (period === 'custom' || period === 'current_week' || period === 'last_week') ? customPrompt : standardPrompt;


    // 6. Execute with Retry
    const apiCall = async () => {
      const result = await model.generateContent(prompt);
      return result.response.text();
    };

    const analysis = await retryApiCall(apiCall);

    // --- 7. Save Report to History ---
    // Extract metadata for saving
    const reportMetadata = {
      model: "gemini-2.5-flash",
      period: periodTitle,
      totalCases: totalCases,
      mostRepeatedCurrentMonth,
      mostRepeatedLast3Weeks,
      mostRepeatedLast2Weeks,
      weeklyRepeatOffenders: results.weeklyStats.length,
      closureRate: `${closureRate}% `,
      totalTeams: actualTotalTeams,
      detractorLimitPerTeam: YTD_DETRACTOR_LIMIT_PER_TEAM,
      generatedAt: new Date().toLocaleString("en-GB", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    };

    try {
      await AIReport.create({
        period: period,
        periodTitle: periodTitle,
        startDate: startDate,
        endDate: endDate || new Date(), // Use current date if undefined (like for YTD)
        analysis: analysis,
        metadata: {
          totalCases: totalCases,
          closureRate: `${closureRate}%`,
          totalTeams: actualTotalTeams,
          detractorLimitPerTeam: YTD_DETRACTOR_LIMIT_PER_TEAM
        },
        generatedBy: req.user?._id // Assuming middleware adds user to req
      });
    } catch (saveError) {
      console.error("Failed to save report to history:", saveError);
      // Constructive failure - don't block the response, just log it
    }

    res.json({
      analysis,
      metadata: reportMetadata
    });
  } catch (error) {
    console.error("Error generating deep weekly analysis:", error);
    res.status(500).json({ error: "Failed to generate deep weekly analysis." });
  }
};

export const analyzeTrendData = async (req, res) => {
  try {
    const {
      period = 'week',
      range = 8,
      analysisType = 'team',
      selectedEntities = [],
      metric = 'totalViolations',
      customStart,
      customEnd
    } = req.body;

    // Determine date range based on filters
    let startDate, endDate;
    const now = new Date();

    if (range === 'custom') {
      if (!customStart || !customEnd) {
        return res.status(400).json({ error: "Custom range requires start and end dates" });
      }
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else if (range === 'all') {
      startDate = new Date(now.getFullYear(), 0, 1); // YTD
      endDate = now;
    } else {
      // Last N periods
      const periodsBack = typeof range === 'number' ? range : 8;
      if (period === 'week') {
        startDate = new Date(now.getTime() - (periodsBack * 7 * 24 * 60 * 60 * 1000));
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - periodsBack, 1);
      }
      endDate = now;
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Build match criteria
    const matchCriteria = {
      evaluationScore: { $gte: 1, $lte: 8 },
      interviewDate: { $gte: startDate, $lte: endDate },
      teamName: { $nin: ["Unknown Team", "غير معروف"] }
    };

    // Filter by selected entities if specified
    if (selectedEntities.length > 0) {
      if (analysisType === 'team') {
        matchCriteria.teamName = { $in: selectedEntities };
      } else {
        matchCriteria.reason = { $in: selectedEntities };
      }
    }

    // Aggregate data
    const aggregationResults = await TaskSchema.aggregate([
      { $match: matchCriteria },
      {
        $facet: {
          totalCases: [{ $count: "count" }],

          byEntity: [
            {
              $group: {
                _id: analysisType === 'team' ? "$teamName" : { $ifNull: ["$reason", "Unspecified"] },
                totalViolations: { $sum: 1 },
                detractors: { $sum: { $cond: [{ $lte: ["$evaluationScore", 6] }, 1, 0] } },
                neutrals: { $sum: { $cond: [{ $and: [{ $gte: ["$evaluationScore", 7] }, { $lte: ["$evaluationScore", 8] }] }, 1, 0] } },
                avgScore: { $avg: "$evaluationScore" },
                reasons: { $push: { $ifNull: ["$reason", "Unspecified"] } },
                teams: { $push: { $ifNull: ["$teamName", "Unknown"] } }
              }
            },
            { $sort: { totalViolations: -1 } }
          ],

          closureStats: [
            {
              $group: {
                _id: "$validationStatus",
                count: { $sum: 1 }
              }
            }
          ],

          topReasons: [
            {
              $group: {
                _id: { $ifNull: ["$reason", "Unspecified"] },
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);

    const results = aggregationResults[0];
    const totalCases = results.totalCases[0]?.count || 0;

    if (totalCases === 0) {
      return res.json({
        analysis: `## 🟢 Trend Analysis Report — No Data\n\n**No violations found in the selected period and filters.**\n\nAll metrics are clear for the specified criteria.`,
        metadata: {
          totalCases: 0,
          period,
          range,
          analysisType,
          generatedAt: new Date().toLocaleString()
        }
      });
    }

    // Calculate closure rate
    const fixedCount = results.closureStats.find(c => c._id === "Validated")?.count || 0;
    const closureRate = ((fixedCount / totalCases) * 100).toFixed(1);

    // Format entity data
    const entityData = results.byEntity.map(entity => {
      const equivalentDetractors = entity.detractors + Math.floor(entity.neutrals / 3);

      let topIssue = "N/A";
      if (analysisType === 'team') {
        const reasonCounts = entity.reasons.reduce((acc, r) => {
          acc[r] = (acc[r] || 0) + 1;
          return acc;
        }, {});
        topIssue = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Mixed";
      } else {
        const teamCounts = entity.teams.reduce((acc, t) => {
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {});
        topIssue = Object.entries(teamCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Multiple";
      }

      return {
        name: entity._id,
        total: entity.totalViolations,
        detractors: entity.detractors,
        neutrals: entity.neutrals,
        equivalentDetractors,
        avgScore: entity.avgScore.toFixed(2),
        topIssue
      };
    });

    // Format top reasons
    const topReasons = results.topReasons.map((r, i) =>
      `${i + 1}. **${r._id}** — ${r.count} cases (${((r.count / totalCases) * 100).toFixed(1)}%)`
    );

    // Create entity table
    const entityTable = entityData.map(e =>
      `| ${e.name} | ${e.total} | ${e.detractors} | ${e.neutrals} | ${e.avgScore} | ${e.topIssue} |`
    ).join('\n');

    // Generate comprehensive prompt
    const periodLabel = range === 'custom'
      ? `Custom Range (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
      : range === 'all'
        ? 'Year-to-Date (YTD)'
        : `Last ${range} ${period}s`;

    const entityTypeLabel = analysisType === 'team' ? 'Teams' : 'Failure Reasons';
    const filterNote = selectedEntities.length > 0
      ? `\n**FILTERED VIEW**: Analysis limited to selected ${analysisType}s: ${selectedEntities.join(', ')}`
      : `\n**FULL VIEW**: Analysis includes all ${analysisType}s with violations in the period`;

    const prompt = `
You are an **AI Senior Quality Advisor** for the OrangeJO–Nokia FTTH Project.

**TREND ANALYSIS REPORT**
(Please explicitly mention "AI Model: Gemini 2.5 Flash" at the top of the report)

**Analysis Period**: ${periodLabel}
**Analysis Type**: ${entityTypeLabel}
**Metric Focus**: ${metric === 'totalViolations' ? 'Total Violations' : 'Equivalent Detractors'}
${filterNote}

# 📊 Key Performance Indicators

| Metric | Value |
|:---|:---|
| **Total Cases (Score 1-8)** | ${totalCases} |
| **Closure Rate** | ${closureRate}% |
| **${entityTypeLabel} Analyzed** | ${entityData.length} |
| **Period Type** | ${period === 'week' ? 'Weekly' : 'Monthly'} Trend |

# 🚩 Top Failure Drivers

${topReasons.join('\n')}

# 📋 ${entityTypeLabel} Performance Breakdown

| ${analysisType === 'team' ? 'Team Name' : 'Failure Reason'} | Total | Detractors (1-6) | Neutrals (7-8) | Avg Score | ${analysisType === 'team' ? 'Top Issue' : 'Top Team'} |
|:---|:---:|:---:|:---:|:---:|:---|
${entityTable}

# 🎯 REQUIRED OUTPUT FORMAT

Generate a **comprehensive, data-driven trend analysis report** in Markdown format.

## 1. 📈 Trend Overview
Analyze the overall trend across the ${periodLabel}. Discuss the total volume (${totalCases} cases) and closure effectiveness (${closureRate}%).

## 2. 🔍 ${entityTypeLabel} Performance Analysis
**CRITICAL RANKING RULE**: When identifying "worst performers", prioritize **IMPACT over percentages**. A team with 17 cases and 8 detractors has MORE IMPACT than a team with 5 cases and 3 detractors, even if the latter has a higher percentage.

**Ranking Criteria (in order of priority)**:
1. **Primary**: Total Detractors (1-6 scores) - absolute impact on customers
2. **Secondary**: Total Violations (volume)
3. **Tertiary**: Detractor Percentage (only as a tiebreaker)
4. **Minimum**: Only consider ${analysisType}s with **at least 3 total cases**

Provide detailed analysis:
- Identify the **top 3 worst performers** from ${analysisType}s with **3+ cases**, ranked by:
  - **First**: Highest detractors count (scores 1-6) - most customer impact
  - **Second**: Highest total violations (most volume)
  - **Third**: Lowest average score / highest detractor % (severity)
- For each worst performer, clearly state:
  - Total cases
  - Detractors (1-6) count (PRIMARY metric)
  - Neutrals (7-8) count
  - Detractor percentage
  - Average score
  - Top issue
- Highlight any ${analysisType}s showing **improvement or deterioration**
- Discuss the distribution of violations across ${analysisType}s
- Mention high-percentage but low-volume ${analysisType}s separately as "high severity, low impact - monitor closely"
- Mention low-volume ${analysisType}s (1-2 cases) separately as "insufficient data for ranking"

## 3. 🚨 Critical Insights
**STATISTICAL SIGNIFICANCE RULE**: Focus on ${analysisType}s with meaningful sample sizes (3+ cases) when identifying critical issues.

- Which ${analysisType}s with **3+ cases** require **immediate intervention**?
- Are there any **emerging patterns** or **recurring issues** among high-volume offenders?
- What does the average score distribution tell us about quality trends?
- Note: ${analysisType}s with only 1-2 cases should be monitored but not flagged as critical concerns yet

## 4. 💡 Root Cause Analysis
Based on the failure drivers and ${analysisType} breakdown:
- What are the **primary systemic issues**?
- Are problems concentrated in specific ${analysisType}s or widespread?
- How do the top issues correlate with ${analysisType} performance?

## 5. ⚠️ Risk Assessment
- Which ${analysisType}s with **significant case volumes (3+)** are at **high risk** of continued poor performance?
- What trends suggest **potential escalation**?
- Are there any **positive trends** worth noting?

## 6. 🎯 Strategic Recommendations
Provide **3-5 actionable recommendations** based on this trend data:
- Prioritize interventions by **both impact (volume) and urgency (severity)**
- Suggest specific actions for worst-performing ${analysisType}s **with meaningful case counts**
- Recommend preventive measures for emerging issues
- Suggest monitoring protocols for low-volume ${analysisType}s

**FORMATTING RULES**:
- Use **bold** for key findings and metrics
- Use tables where appropriate for comparisons
- Keep paragraphs concise and data-driven
- Avoid generic statements—tie everything to the specific data provided
- **NEVER rank ${analysisType}s with fewer than 3 cases as "worst performers"**
    `;

    // Execute AI generation with retry
    const apiCall = async () => {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        temperature: 0.3,
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    };

    const analysis = await retryApiCall(apiCall);

    // Return response with metadata
    res.json({
      analysis,
      metadata: {
        totalCases,
        closureRate: `${closureRate}%`,
        period: periodLabel,
        analysisType: entityTypeLabel,
        entitiesAnalyzed: entityData.length,
        generatedAt: new Date().toLocaleString("en-GB", {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    });

  } catch (error) {
    console.error("Error analyzing trend data:", error);
    res.status(500).json({ error: "Failed to generate trend analysis." });
  }
};

export const getReportHistory = async (req, res) => {
  try {
    const history = await AIReport.find()
      .sort({ generatedAt: -1 })
      .limit(50)
      .select('periodTitle generatedAt analysis metadata'); // Select necessary fields

    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching report history:", error);
    res.status(500).json({ error: "Failed to fetch report history." });
  }
};







