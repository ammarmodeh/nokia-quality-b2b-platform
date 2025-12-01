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


// controllers/aiController.js (Logic remains complex but the API call is now wrapped)
export const deepWeeklyAnalysis = async (req, res) => {
  try {
    // --- 1. Dynamic Team Count & Limit (UPDATED: Neutral Limit Calculation Added) ---
    const totalTeams = await FieldTeamsSchema.countDocuments({ role: 'fieldTeam', isActive: true });
    const actualTotalTeams = totalTeams > 0 ? totalTeams : 1;

    const SAMPLES_PER_WEEK = 115;
    const WEEKS_PER_YEAR = 52;

    // Detractor Limits (9% max)
    const MAX_DETRACTOR_RATE = 0.09;
    const MAX_YEARLY_DETRACTORS_POOL = Math.floor(SAMPLES_PER_WEEK * WEEKS_PER_YEAR * MAX_DETRACTOR_RATE);
    const YTD_DETRACTOR_LIMIT_PER_TEAM = Math.floor(MAX_YEARLY_DETRACTORS_POOL / actualTotalTeams);

    // Neutral Limits (16% max) <<< NEW CALCULATION IMPLEMENTED
    const MAX_NEUTRAL_RATE = 0.16;
    const MAX_YEARLY_NEUTRALS_POOL = Math.floor(SAMPLES_PER_WEEK * WEEKS_PER_YEAR * MAX_NEUTRAL_RATE);
    const YTD_NEUTRAL_LIMIT_PER_TEAM = Math.floor(MAX_YEARLY_NEUTRALS_POOL / actualTotalTeams);

    // --- 2. Dynamic Base Date: First Monday of actual data ---
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
      const day = firstDate.getDay(); // 0 = Sun, 1 = Mon...
      const diffToMonday = day === 0 ? 1 : (8 - day) % 7;
      baseDate = new Date(firstDate);
      baseDate.setDate(firstDate.getDate() + diffToMonday);
    } else {
      baseDate = new Date(2024, 11, 30); // Fallback: Monday 30 Dec 2024
    }
    baseDate.setHours(0, 0, 0, 0);

    // --- 3. Helper: Week number since project start ---
    const getWeekNumber = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((d - baseDate) / 86400000);
      const weekNum = Math.floor(diffDays / 7) + 1; // Week 1 = first full week
      return weekNum >= 1 ? weekNum : 1;
    };

    // --- 4. Fetch detractor/neutral tasks only ---
    const tasks = await TaskSchema.find({
      evaluationScore: { $gte: 1, $lte: 8 },
      interviewDate: { $exists: true }
    })
      .select("interviewDate teamName reason validationStatus evaluationScore")
      .lean();

    if (tasks.length === 0) {
      return res.json({
        analysis: `## 🟢 QoS Executive Report — All Clear\n\n**No detractor or neutral cases found in the current period.**\n\nAll customers are Promoters (9–10). Outstanding performance maintained.\n\nKeep pushing for excellence.`,
        metadata: { totalCases: 0, generatedAt: new Date().toLocaleString() }
      });
    }

    // --- 5. Aggregations ---
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const teamCurrentMonth = {};
    const teamLast3Weeks = {};
    const teamLast2Weeks = {};
    const teamWeeklyCount = {};
    const teamYTDCount = {};
    const teamYTDDetractorOnlyCount = {};
    const teamYTDNeutralOnlyCount = {};
    const reasonCount = {};
    const closure = { fixed: 0, pending: 0 };

    // Define the names to exclude from the report/analysis (unregistered teams)
    const EXCLUDE_TEAMS = ["Unknown Team", "غير معروف"];

    tasks.forEach(t => {
      const team = (t.teamName || "Unknown Team").trim();
      const reason = String(t.reason || "Unspecified").trim();
      const weekNum = getWeekNumber(t.interviewDate);
      const weekKey = `Wk-${weekNum}`;
      const isDetractor = t.evaluationScore >= 1 && t.evaluationScore <= 6;
      const isNeutral = t.evaluationScore >= 7 && t.evaluationScore <= 8;

      // Check if the team should be excluded (Crucial filtering step)
      if (EXCLUDE_TEAMS.includes(team)) return;

      // YTD counts (Detractor + Neutral)
      teamYTDCount[team] = (teamYTDCount[team] || 0) + 1;
      reasonCount[reason] = (reasonCount[reason] || 0) + 1;

      // YTD Detractor Only Count
      if (isDetractor) {
        teamYTDDetractorOnlyCount[team] = (teamYTDDetractorOnlyCount[team] || 0) + 1;
      }

      // YTD Neutral Only Count
      if (isNeutral) {
        teamYTDNeutralOnlyCount[team] = (teamYTDNeutralOnlyCount[team] || 0) + 1;
      }

      // Closure
      if (t.validationStatus === "Validated") closure.fixed++;
      else closure.pending++;

      // Current month
      if (t.interviewDate >= startOfMonth) {
        teamCurrentMonth[team] = (teamCurrentMonth[team] || 0) + 1;
      }
      // Last 3 & 2 weeks
      if (t.interviewDate >= threeWeeksAgo) teamLast3Weeks[team] = (teamLast3Weeks[team] || 0) + 1;
      if (t.interviewDate >= twoWeeksAgo) teamLast2Weeks[team] = (teamLast2Weeks[team] || 0) + 1;

      // Weekly repeat offenders
      if (!teamWeeklyCount[weekKey]) teamWeeklyCount[weekKey] = {};
      teamWeeklyCount[weekKey][team] = (teamWeeklyCount[weekKey][team] || 0) + 1;
    });

    // --- 6. New Insights ---
    const formatTopTeamProfessional = (obj) => {
      if (Object.keys(obj).length === 0) return "**NONE** (Zero registered team violations)";
      const [team, count] = Object.entries(obj).sort((a, b) => b[1] - a[1])[0];
      return `**${team}** (${count} cases)`;
    };

    const mostRepeatedCurrentMonth = formatTopTeamProfessional(teamCurrentMonth);
    const mostRepeatedLast3Weeks = formatTopTeamProfessional(teamLast3Weeks);
    const mostRepeatedLast2Weeks = formatTopTeamProfessional(teamLast2Weeks);

    const weeklyRepeatOffenders = [];
    Object.entries(teamWeeklyCount).forEach(([week, teams]) => {
      Object.entries(teams)
        .filter(([_, count]) => count >= 2)
        .forEach(([team, count]) => {
          if (!EXCLUDE_TEAMS.includes(team)) {
            weeklyRepeatOffenders.push(`• **${team}** — ${count} cases in ${week}`);
          }
        });
    });
    const weeklyRepeatOffendersText = weeklyRepeatOffenders.length > 0
      ? weeklyRepeatOffenders.sort().join('\n')
      : "None detected in registered teams";


    // --- 7. Existing Top 5 Reasons & Chronic Offenders ---
    const totalCases = tasks.length;

    const topReasons = Object.entries(reasonCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([r, c], i) => `${i + 1}. **${r}** — ${c} cases (${((c / totalCases) * 100).toFixed(1)}%)`);

    // Use Detractor-Only Count for Chronic Offenders check
    const chronicOffenders = Object.entries(teamYTDDetractorOnlyCount)
      .filter(([_, c]) => c >= YTD_DETRACTOR_LIMIT_PER_TEAM)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([team, detractorCount]) => {
        const teamReasons = tasks
          .filter(t => (t.teamName || "Unknown Team").trim() === team)
          .map(t => String(t.reason || "Unspecified").trim());
        const topReason = Object.entries(teamReasons.reduce((a, r) => (a[r] = (a[r] || 0) + 1, a), {}))
          .sort((a, b) => b[1] - a[1])[0]?.[0] || "Mixed";

        const neutralCount = teamYTDNeutralOnlyCount[team] || 0;
        const totalDNCount = detractorCount + neutralCount;

        const exceededBy = detractorCount - YTD_DETRACTOR_LIMIT_PER_TEAM;
        const percentExceeded = ((exceededBy / YTD_DETRACTOR_LIMIT_PER_TEAM) * 100).toFixed(1);

        return `• **${team}** — ${detractorCount} Detractors (Limit: ${YTD_DETRACTOR_LIMIT_PER_TEAM}) (+${neutralCount} Neutrals, Limit: ${YTD_NEUTRAL_LIMIT_PER_TEAM}). Total D/N: ${totalDNCount}. **Exceeds Detractor Limit By: ${percentExceeded}%**. Top failure: "${topReason}"`;
      });

    const closureRate = ((closure.fixed / totalCases) * 100).toFixed(1);

    // --- 8. Final Prompt to Gemini (UPDATED: KPI Table and Section 7 instructions) ---
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      temperature: 0.3,
    });

    // =================================================================
    // === START OF COMPLETE PROMPT STRING (UPDATED KPI TABLE AND SECTION 7.2) ===
    // =================================================================
    const prompt = `
        You are an **AI Senior Quality Intelligence Advisor** for the OrangeJO–Nokia FTTH Program. 
        Your mission is to convert detractor/neutral cases (scores 1–8) into a **high-authority, trend-driven, executive intelligence report** with deep operational insights.

        Audience: CTO, PMO Directors, Nokia Quality Managers
        Tone: **Executive, highly professional, direct, data-driven, and assertive.**

        **STRICT FORMATTING RULES (MANDATORY):**
        1.  **Avoid excessive bullet points (* or -):** For interpretation sections, use **structured paragraphs** and **bold key findings** instead of simple lists.
        2.  **Use Tables for Data Comparison:** Whenever listing chronic offenders, top teams, or key metrics, format the data using **Markdown Tables** to improve readability and professionalism.
        3.  **Use Subheadings (###) to separate points** within major sections (1-10) for better hierarchy.
        4.  **Do not use any teams named "غير معروف" or "Unknown Team".**

        ---

        # 🚨 Operational Intelligence Flags (High-Priority)

        * **CRITICAL: Most Repeated Team (Current Month):** ${mostRepeatedCurrentMonth}
        * **HIGH RISK: Most Repeated Team (Last 3 Weeks):** ${mostRepeatedLast3Weeks}
        * **IMMEDIATE: Most Repeated Team (Last 2 Weeks):** ${mostRepeatedLast2Weeks}

        ## 📉 Weekly Repeat Offender Analysis (Structural Failure Indicator)
        Teams demonstrating 2 or more detractor/neutral cases in the same calendar week, indicating process and quality control breakdown:
        ${weeklyRepeatOffendersText}

        ---

        # 📊 Key Performance Indicators & Load Indicators

        | Metric | Value | Interpretation |
        | :--- | :--- | :--- |
        | **Total Cases (Score 1-8)** | ${tasks.length} | Operational Failure Load |
        | **Validated Closure Rate** | ${closureRate}% | Effectiveness of Corrective Action (Target: >95%) |
        | **Active Field Teams** | ${totalTeams} | Total operational entities managed |
        | **YTD Max Detractor Allowance Per Team** | ${YTD_DETRACTOR_LIMIT_PER_TEAM} | Proactive Annual Performance Ceiling (9% max) |
        | **YTD Max Neutral Allowance Per Team** | ${YTD_NEUTRAL_LIMIT_PER_TEAM} | Logical Annual Performance Ceiling (16% max) |

        ---

        # 🚩 Top 5 Root Causes (Weighted YTD Failure Modes)
        These represent the highest-frequency failure modes contributing to customer dissatisfaction:
        ${topReasons.join("\n")}

        ---

        # 🚧 Chronic Offenders (Exceeded Annual Detractor Threshold)
        Teams that have critically breached the Year-to-Date Maximum **Detractor Allowance** (Limit: ${YTD_DETRACTOR_LIMIT_PER_TEAM} cases). This signals a **structural quality failure** requiring executive intervention.
        ${chronicOffenders.length > 0 ? chronicOffenders.join("\n") : "No registered teams exceeded the YTD Detractor threshold."}

        ---

        # 🎯 REQUIRED OUTPUT FORMAT (STRICT & PROFESSIONAL)

        Generate a **deep, insight-rich, aggressive Markdown report** structured EXACTLY as follows. Ensure all interpretations use professional language, avoiding asterisk-based lists wherever a structured paragraph or subheading is better suited.

        ---
        ---

        ## 1. 🛡️ Annual Performance Overview

        ### 1.1. Health Trajectory & Load
        Analyze the current detractor volume (${tasks.length} cases). State whether this load is sustainable and what it signals about the systemic state of quality control across the program.

        ### 1.2. KPI Risk Assessment (Closure Rate & Allowance)
        Critically assess the **${closureRate}% Validated Closure Rate** against the >95% target. Analyze the implication of multiple teams routinely breaching the **${YTD_DETRACTOR_LIMIT_PER_TEAM} detractor allowance** and the supplementary **${YTD_NEUTRAL_LIMIT_PER_TEAM} neutral allowance**.

        ---

        ## 2. 📈 QoS Metrics Snapshot: Operational Deterioration

        ### 2.1. Clustering, Spikes, and Escalation
        Focus the analysis on the single team appearing highest across the current month, last 3 weeks, and last 2 weeks. Confirm if this constitutes a **persistent and escalating failure point**.

        ### 2.2. Structural Failure Indicators
        Interpret the significance of the **Weekly Repeat Offenders** list. This must be presented as evidence of widespread deficiencies in supervision, process adherence, and quality control at the operational level.

        ---

        ## 3. 🗓️ Quarterly Trend & Volatility Analysis (13 Weeks)

        ### 3.1. Directional Trend Analysis
        Identify teams exhibiting a clear **rising detractor trajectory** over the recent weeks (Wk-45, Wk-46, Wk-47) based on the computed recurrence data.

        ### 3.2. Volatility Zones and Concentrated Breakdown
        Highlight specific weeks that demonstrate significant surges (Volatility Zones) and demand immediate investigation into the common factors contributing to the quality breakdown during those concentrated periods.

        ### 3.3. Structural Instability Confirmation
        Conclude by confirming if the consistent recurrence of chronic teams across the quarter provides **irrefutable evidence of systemic instability** in quality control processes.

        ---

        ## 4. 🧠 Team Trend Intelligence: Early-Warning System (MANDATORY SECTION)

        ### 4.1. High Alert: 4-Week Deterioration
        Identify and flag the specific team appearing in **≥3 of the last 4 weeks** as a **HIGH ALERT** entity requiring immediate executive intervention. Analyze the nature of its deterioration.

        ### 4.2. Persistent Violators & Systemic Deficiencies
        List the top three teams based on recurring appearances across the weekly and quarterly intervals. State that these represent **deep-seated, systemic performance deficiencies**.

        ### 4.3. Critical Cross-Window Violation
        Identify the single team appearing in **ALL FOUR** high-priority lists (Current Month, Last 3 Weeks, Last 2 Weeks, Weekly Repeat Offenders). Flag this as a **critical, entrenched structural failure**.

        ### 4.4. Centralized Failure Point (Cumulative Load)
        Identify the team with the highest **Cumulative Detractor Load (YTD)** and explain the operational implication of this centralized failure point.

        ---

        ## 5. 🛠️ Dominant Failure Modes (YTD Deep Dive)

        ### 5.1. Root Cause Interpretation and Data Integrity
        Provide a concise, executive interpretation of the Top 5 Root Causes. **Critically address the "Positive Feedback" entry** as a data integrity anomaly that must be rectified immediately. Map the technical causes (Speed, WiFi Coverage) to the relevant operational segments (Installation Quality, Network Provisioning).

        ### 5.2. Acceleration and Operational Triggers
        Define the most likely **Operational Triggers** for the top technical failures (e.g., poor in-home setup, inadequate expectation management, network bottlenecks).

        ---

        ## 6. 🔄 Monthly Failure Mode Evolution

        Acknowledge the **critical data limitation**: without month-over-month cause data, strategic analysis of shifts in failure hierarchy, emergence of new drivers, or contextual changes is **currently hindered**. State the necessity of implementing this data capture for future reports.

        ---

        ## 7. 🎯 Accountability & Exceeded Limits

        ### 7.1. Direct Accountability Call-Out
        Aggressively call out the single **Most Repeated Team** in the last month and the last 2 weeks as a critical, ongoing operational liability.

        ### 7.2. Risk Listing: Breached Allowance
        Present a list of all teams that have critically exceeded the annual **detractor** allowance of ${YTD_DETRACTOR_LIMIT_PER_TEAM} cases. Format this list professionally, including the **percentage** by which they exceed the limit. **MANDATORY: For each chronic team, you must analyze the volume of Neutral (Passive) cases and compare them to the Neutral Limit (${YTD_NEUTRAL_LIMIT_PER_TEAM}), stating that a high Neutral count, especially when combined with a Detractor breach, indicates a profound systemic failure to deliver quality beyond minimum acceptable standards.**

        ---

        ## 8. 🔍 Recurrence and Quality Gap

        Provide an analysis explaining the pervasive recurrence mechanism, focusing on: **Skill Gap**, **Process Non-Compliance**, **Supervisory Deficiency**, and the distortion caused by the **Data Integrity Failure**. Conclude with the full **Clear Cause Chain** summary.

        ---

        ## 9. ✅ Immediate & Strategic Solutions (Pre-Approved Library)

        Provide actionable, prioritized solutions. **Crucially, reference the existence of specific training materials** related to the top failure modes (e.g., WiFi, Speed) in the Field Team Resources library to make the solutions concrete.

        ### 9.1. Immediate Actions (0–2 weeks)
        Focus on **Mandatory Executive Intervention** for chronic teams, the **Critical Data Audit**, and immediate deployment of **Targeted Re-training & Certification** (referencing the training materials).

        ### 9.2. Tactical Improvements (1–3 months)
        Focus on **Enhanced Supervisory Models**, **SOP Reinforcement**, and establishing an **Integrated Feedback Loop**.

        ### 9.3. Strategic Corrections (Quarter Scale)
        Focus on implementing a **Comprehensive Quality Management Framework**, a **Tiered Technical Certification Program**, and **Performance-Based Accountability** overhaul.

        ### 9.4. MANDATORY: Promoter Score Directive
        Include the non-negotiable directive that **only customer scores of 9–10 unequivocally designate a "Promoter"**.

        ---

        ## 10. ⚠️ Strategic Risk Outlook

        ### 10.1. Risk Prediction & Operational Instability
        Predict the high-risk teams for the upcoming 4–8 weeks. State the implication of the weekly repeat offender trend on broad operational stability.

        ### 10.2. KPI Severity Signal & Escalation Zones
        Declare the overall KPI Severity Signal (Low / Medium / High / **CRITICAL**) based on the closure rate failure and widespread allowance breach. Identify the specific **Teams/Regions** that are primary escalation zones.

        ---
        `;
    // =================================================================
    // === END OF COMPLETE PROMPT STRING ===
    // =================================================================

    // 9. Execute with Retry
    const apiCall = async () => {
      const result = await model.generateContent(prompt);
      return result.response.text();
    };

    const analysis = await retryApiCall(apiCall);

    // 10. Final Response (unchanged)
    res.json({
      analysis,
      metadata: {
        model: "gemini-2.5-flash",
        totalCases: tasks.length,
        mostRepeatedCurrentMonth,
        mostRepeatedLast3Weeks,
        mostRepeatedLast2Weeks,
        weeklyRepeatOffenders: weeklyRepeatOffenders.length,
        closureRate: `${closureRate}%`,
        totalTeams,
        detractorLimitPerTeam: YTD_DETRACTOR_LIMIT_PER_TEAM,
        generatedAt: new Date().toLocaleString("en-GB", {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }),
      },
    });
  } catch (error) {
    console.error("AI Report Failed:", error.originalError || error);
    res.status(error.status || 500).json({
      error: error.message || "Failed to generate report",
      details: error.message || 'Server error'
    });
  }
};