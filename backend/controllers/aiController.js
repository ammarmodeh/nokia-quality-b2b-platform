import { GoogleGenerativeAI } from "@google/generative-ai";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js"; // Required for dynamic team count
import { TaskSchema } from "../models/taskModel.js";
import { UserSchema } from "../models/userModel.js";
import QuizResult from "../models/quizResultModel.js";
import { OnTheJobAssessment } from "../models/onTheJobAssessmentModel.js";
import { SuggestionSchema } from "../models/suggestionsModel.js";
import { CustomerIssueSchema } from "../models/customerIssueModel.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateInsights = async (req, res) => {
  try {
    // 1. Gather Comprehensive Context Data

    // Task Data
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

    // User & Team Data
    const totalUsers = await UserSchema.countDocuments();
    const totalTeams = await FieldTeamsSchema.countDocuments();
    const usersByRole = await UserSchema.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    // Quiz Results Data
    const totalQuizResults = await QuizResult.countDocuments();
    const avgQuizScore = await QuizResult.aggregate([
      { $group: { _id: null, avgPercentage: { $avg: "$percentage" } } }
    ]);

    // Assessment Data
    const totalAssessments = await OnTheJobAssessment.countDocuments();
    const avgAssessmentScore = await OnTheJobAssessment.aggregate([
      { $group: { _id: null, avgScore: { $avg: "$totalScore" } } }
    ]);

    // Customer Issues
    const totalCustomerIssues = await CustomerIssueSchema.countDocuments();
    const recentIssues = await CustomerIssueSchema.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
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

    // 2. Prompt Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ insights: text });
  } catch (error) {
    console.error("Error generating insights:", error);
    res.status(500).json({ message: "Failed to generate insights", error: error.message });
  }
};

export const analyzeChartData = async (req, res) => {
  try {
    const { chartType, data, title, context: additionalContext } = req.body;

    if (!data) {
      return res.status(400).json({ message: "Chart data is required" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ analysis: text });
  } catch (error) {
    console.error("Error analyzing chart data:", error);
    res.status(500).json({ message: "Failed to analyze chart data", error: error.message });
  }
};

export const handleChat = async (req, res) => {
  try {
    const { message } = req.body;

    // Fetch current system state for context
    const totalTasks = await TaskSchema.countDocuments();
    const highPriorityTasks = await TaskSchema.countDocuments({ priority: "High" });
    const completedTasks = await TaskSchema.countDocuments({ validationStatus: "Validated" });
    const totalUsers = await UserSchema.countDocuments();
    const totalTeams = await FieldTeamsSchema.countDocuments();

    const context = `
   Current System State:
   - Total Tasks: ${totalTasks}
   - High Priority Tasks: ${highPriorityTasks}
   - Completed Tasks: ${completedTasks}
   - Total Users: ${totalUsers}
   - Total Field Teams: ${totalTeams}
  `;

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "You are a helpful AI assistant for the Nokia Quality Task Tracker app. You have access to real-time system stats and can answer questions about tasks, teams, performance, and operations." }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I am ready to assist with inquiries regarding the Quality Task Tracker. I have access to current system statistics and can provide insights on tasks, teams, performance metrics, and operational data." }],
        },
      ],
    });

    const result = await chat.sendMessage(`${context}\n\nUser Query: ${message}`);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Error in chat:", error);
    res.status(500).json({ message: "Chat failed", error: error.message });
  }
};


// controllers/aiController.js → Replace only the deepWeeklyAnalysis function

export const deepWeeklyAnalysis = async (req, res) => {
  try {
    // --- 1. Dynamic Team Count and Limit Calculation ---
    const totalTeams = await FieldTeamsSchema.countDocuments({ role: 'fieldTeam', isActive: true });
    const actualTotalTeams = totalTeams > 0 ? totalTeams : 1;

    // Target calculation: Dynamic calculation based on project KPIs (9% of annual sample)
    const SAMPLES_PER_WEEK = 115;
    const WEEKS_PER_YEAR = 52;
    const MAX_DETRACTOR_RATE = 0.09; // 9%

    // Calculate the Project-Wide Annual Detractor/Neutral Limit
    const MAX_YEARLY_DETRACTORS_POOL = Math.round(SAMPLES_PER_WEEK * WEEKS_PER_YEAR * MAX_DETRACTOR_RATE);
    // Allocate pool limit equally among active teams, rounded up.
    const YTD_DETRACTOR_LIMIT_PER_TEAM = Math.ceil(MAX_YEARLY_DETRACTORS_POOL / actualTotalTeams);


    // Helper functions
    const getWeekNumber = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const baseDate = new Date(2024, 11, 29);
      baseDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((d - baseDate) / 86400000);
      return Math.floor(diffDays / 7);
    };

    const getQuarterNumber = (date) => {
      const d = new Date(date);
      const month = d.getMonth() + 1; // getMonth() returns 0-11
      return Math.ceil(month / 3);
    };

    // Fetch ALL tasks
    const allTasks = await TaskSchema.find()
      .select("interviewDate evaluationScore reason responsibility teamName teamCompany validationStatus")
      .sort({ interviewDate: 1 });

    // Filter the tasks to only include Detractor/Neutral cases (Score 1-8). This is the correct scope for the report.
    const tasks = allTasks.filter(t => t.evaluationScore >= 1 && t.evaluationScore <= 8);

    console.log(`AI Report: Processing ${tasks.length} detractor/neutral cases`);

    if (tasks.length === 0) {
      return res.json({
        analysis: `# QoS Executive Report — All Clear\n\n**No detractor or neutral cases (score 1-8) found.**\n\nAll customers are Promoters (9–10). Outstanding performance across all teams.\n\nKeep pushing for excellence.`,
      });
    }

    // Aggregations
    const weekly = {}; // For volume and trend
    const monthly = {}; // For volume and trend
    const reasonCount = {}; // For YTD top 5 reasons
    const teamDetractorCount = {}; // For chronic offenders
    const closure = { fixed: 0, pending: 0 };

    // NEW AGGREGATIONS
    const quarterly = {};
    const monthlyReason = {}; // For month-to-month reason trend
    const weeklyReason = {}; // For week-to-week reason trend

    tasks.forEach(t => {
      const weekNum = getWeekNumber(t.interviewDate);
      const weekKey = `Wk-${weekNum}`;
      const monthKey = new Date(t.interviewDate).toLocaleString('en-US', { year: 'numeric', month: 'short' });
      const quarterNum = getQuarterNumber(t.interviewDate);
      const quarterKey = `Q${quarterNum}`;

      const reason = String(t.reason || "Unspecified").trim();
      const team = (t.teamName || "Unknown Team").trim();

      // Weekly & Monthly Aggregation
      if (!weekly[weekKey]) weekly[weekKey] = { total: 0, detractorNeutrals: 0 };
      if (!monthly[monthKey]) monthly[monthKey] = { total: 0, detractorNeutrals: 0 };

      weekly[weekKey].total++;
      monthly[monthKey].total++;
      weekly[weekKey].detractorNeutrals++;
      monthly[monthKey].detractorNeutrals++;

      teamDetractorCount[team] = (teamDetractorCount[team] || 0) + 1;

      // Reasons (YTD)
      reasonCount[reason] = (reasonCount[reason] || 0) + 1;

      // NEW: QUARTERLY Aggregation
      if (!quarterly[quarterKey]) quarterly[quarterKey] = { total: 0, reasons: {} };
      quarterly[quarterKey].total++;
      quarterly[quarterKey].reasons[reason] = (quarterly[quarterKey].reasons[reason] || 0) + 1;

      // NEW: MONTHLY REASON Aggregation
      if (!monthlyReason[monthKey]) monthlyReason[monthKey] = { reasons: {} };
      monthlyReason[monthKey].reasons[reason] = (monthlyReason[monthKey].reasons[reason] || 0) + 1;

      // NEW: WEEKLY REASON Aggregation
      if (!weeklyReason[weekKey]) weeklyReason[weekKey] = { reasons: {} };
      weeklyReason[weekKey].reasons[reason] = (weeklyReason[weekKey].reasons[reason] || 0) + 1;

      // Closure Metrics
      if (t.validationStatus === "Validated") {
        closure.fixed++;
      } else {
        closure.pending++;
      }
    });

    // --- 2. Post-Loop Processing ---

    // Helper to get top reason string
    const getTopReason = (reasonsObj) => {
      if (Object.keys(reasonsObj).length === 0) return 'N/A';
      const top = Object.entries(reasonsObj)
        .sort((a, b) => b[1] - a[1])[0];
      return `${top[0]} (${top[1]})`;
    };

    // Quarterly Summary and Analysis String
    const sortedQuarters = Object.entries(quarterly)
      .sort(([qA], [qB]) => parseInt(qA.substring(1)) - parseInt(qB.substring(1))); // Sort Q1, Q2, Q3, Q4

    const quarterlyAnalysis = sortedQuarters.map(([q, data], index) => {
      const topReason = getTopReason(data.reasons);
      let trend = "";
      let changeAnalysis = "";

      // Compare with the previous quarter if it exists
      if (index > 0) {
        const prevQ = sortedQuarters[index - 1][0];
        const prevData = sortedQuarters[index - 1][1];
        const caseChange = data.total - prevData.total;
        const prevTopReason = getTopReason(prevData.reasons);

        trend = caseChange > 0 ? ` (▲ ${caseChange} cases)` : (caseChange < 0 ? ` (▼ ${Math.abs(caseChange)} cases)` : ` (— Stable)`);

        if (topReason !== prevTopReason) {
          changeAnalysis = `The primary failure mode shifted from **${prevTopReason.split(' (')[0]}** in ${prevQ} to **${topReason.split(' (')[0]}** in ${q}.`;
        } else {
          changeAnalysis = `The primary failure mode of **${topReason.split(' (')[0]}** persisted from ${prevQ}.`;
        }
      }

      return `• **${q}**: ${data.total} reported cases${trend}. Primary Failure: "${topReason}". ${changeAnalysis}`;
    }).join('\n');


    // Monthly Trend Analysis String
    const sortedMonths = Object.keys(monthlyReason)
      .sort((a, b) => new Date(a.replace(' ', ' 1, ')) - new Date(b.replace(' ', ' 1, '))); // Sort chronologically

    const monthlyTrendSummary = sortedMonths.map((month, index) => {
      const topReason = getTopReason(monthlyReason[month].reasons);
      let changeNote = "";

      if (index > 0) {
        const prevMonth = sortedMonths[index - 1];
        const prevTopReason = getTopReason(monthlyReason[prevMonth].reasons);
        if (topReason !== prevTopReason) {
          changeNote = ` (Shift from ${prevTopReason.split(' (')[0]})`;
        }
      }
      return `• **${month}**: Top Failure: ${topReason}${changeNote}`;
    }).join('\n');

    // Weekly Trend Analysis String (Last 4 Weeks)
    const sortedWeeks = Object.keys(weekly).sort((a, b) => {
      const aNum = parseInt(a.replace("Wk-", ""));
      const bNum = parseInt(b.replace("Wk-", ""));
      return bNum - aNum;
    });

    const weeklyTrendSummary = sortedWeeks.slice(0, 4)
      .map(week => {
        const topReason = getTopReason(weeklyReason[week].reasons);
        return `• **${week}**: Top Failure: ${topReason}`;
      }).join('\n');


    // YTD Summary Metrics
    const lastWeek = sortedWeeks[0] || "N/A";
    const lastWeekCases = weekly[lastWeek]?.total || 0;
    const currentMonth = new Date().toLocaleString('en-US', { year: 'numeric', month: 'short' });
    const currentMonthCases = monthly[currentMonth]?.total || 0;
    const totalYTDDetractors = tasks.length;
    const maxQuarter = sortedQuarters.reduce((max, [q, data]) => data.total > max.total ? { q, total: data.total } : max, { q: 'N/A', total: 0 });


    // Top 5 Reasons
    const topReasons = Object.entries(reasonCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([r, c], i) => `${i + 1}. **${r}** — ${c} cases (${((c / totalYTDDetractors) * 100).toFixed(1)}%)`);

    // Chronic Offenders (Teams Exceeding Dynamic YTD Detractor Limit)
    const chronicOffenders = Object.entries(teamDetractorCount)
      .filter(([_, c]) => c >= YTD_DETRACTOR_LIMIT_PER_TEAM)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([team, c]) => {
        const teamReasons = tasks
          .filter(t => (t.teamName || "Unknown Team").trim() === team)
          .map(t => String(t.reason || "Unspecified").trim());

        const reasonCounts = teamReasons.reduce((acc, reason) => {
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {});

        const topReason = Object.entries(reasonCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mixed/Unspecified';

        return `• **${team}** — ${c} cases (Limit: ${YTD_DETRACTOR_LIMIT_PER_TEAM}). Top failure: "${topReason}"`;
      });

    const closureRate = totalYTDDetractors > 0
      ? ((closure.fixed / totalYTDDetractors) * 100).toFixed(1)
      : 0;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      temperature: 0.3,
    });

    const prompt = `
You are an **AI Quality Analyst** dedicated to the OrangeJO-Nokia FTTH Project Quality Team.
Your task is to generate a comprehensive, data-driven report focusing exclusively on **Reported Detractor (1-6) and Neutral (7-8) Customer Feedback (QoS/NPS)**.

The primary audience is the Quality Control team, which requires detailed statistical analysis, root cause identification, and actionable solutions based on provided best practices.

### Key Data Summary:
- Total **Reported** Cases (Year-to-Date, Score 1-8): ${totalYTDDetractors}
- Last Week (${lastWeek}): ${lastWeekCases} reported cases
- Current Month (${currentMonth}): ${currentMonthCases} reported cases
- Total Cases Validated/Fixed: ${closure.fixed} (${closureRate}%)
- Total Cases Pending Validation: **${closure.pending}**
- Total Teams Monitored: **${totalTeams}**
- Team YTD Detractor Limit (Calculated Target): **${YTD_DETRACTOR_LIMIT_PER_TEAM}** cases (9% of annual sample allocated per team).

---
### Detailed Trends:
#### Top 5 Persistent Root Causes (Total Count and Percentage of YTD Reported Cases):
${topReasons.join("\n")}

#### Chronic Offenders (Teams Exceeding YTD Detractor Limit of ${YTD_DETRACTOR_LIMIT_PER_TEAM}):
${chronicOffenders.length > 0 ? chronicOffenders.join("\n") : "None detected"}

---

### Pre-Approved Solutions Library (Use to inform recommendations):
* **Splicing & Installation:** Adhere to best practices for fusion splicing, ensure clean cleaving, and regular calibration of equipment to minimize signal loss. (Source: FTTH Training Guide) 
* **Customer Education - Technical:** Provide clear guidance on Wi-Fi optimization, proper router placement (high, open, away from electronics), and the difference between 2.4GHz/5GHz bands. (Source: FTTH Training Guide, Router Placement Guide) 
* **Customer Education - Scoring System:** **HIGH PRIORITY:** Teams must proactively educate customers that scores **1-8 indicate dissatisfaction** and **9-10 indicate satisfaction (Promoter status)**, as this impacts the validity of positive feedback. This education also addresses the nuance of customer perception. (Source: User Request)
* **Team Coaching:** Implement intensive coaching sessions focused on correct fiber installation, activation procedures, and effective customer communication (positive, direct, setting clear next steps). (Source: Comprehensive Action Plan, Customer Talk Tips)
* **On-Site Verification:** Conduct immediate, targeted field inspections for teams flagged as chronic offenders to enforce adherence to quality standards. (Source: Comprehensive Action Plan)

---

### Strict Report Generation Rules:

1.  **Format:** Must be a **clean, visually structured, and professional report in Markdown only.** Use headings, tables, and **bold** for clarity.
2.  **Tone:** Analytical, direct, focused purely on operational statistics and technical insights.
3.  **Cross-Reference:** Explicitly link the **Top 5 Root Causes** to the teams listed under **Chronic Offenders**.
4.  **Customer Perception Acknowledgment:** In the recurrence analysis, acknowledge that root causes can sometimes be **soft issues** such as unmet customer expectations or poor communication, even if the service is technically flawless (due to the score system nuance).
5.  **Actionable Solutions:** The recommendations must be aggressive, concrete, and must be based on or directly align with the points in the **Pre-Approved Solutions Library**.
6.  **Required Sections (in this EXACT order):**

| # | Section Title | Content Focus |
|---|---|---|
| 1 | **Annual Performance Overview** | One sentence verdict on the overall YTD performance trend (improving, stable, escalating) and a summary of the largest quarter (**${maxQuarter.q}**). |
| 2 | **QoS Metrics Snapshot** | A Markdown table comparing Last Week vs. Current Month metrics (Total Reported Cases, YTD Validated Rate, Total Pending). |
| 3 | **Quarterly Trend & Volatility Analysis** | Deep analysis of the changes from quartile to quartile. Use the following data: \n${quarterlyAnalysis} \n Analyze volatility in case volume and the **change in the top failure mode** between quarters. |
| 4 | **Dominant Failure Modes (YTD)** | Deep dive into the **Top 3 Root Causes** of the Top 5. Analyze their technical implications and persistence across the year. |
| 5 | **Monthly Failure Mode Evolution** | Analyze the month-to-month changes in the top root cause. Use the following data: \n${monthlyTrendSummary}\nAlso, report the top reason for the **last 4 weeks**:\n${weeklyTrendSummary} |
| 6 | **Accountability & Exceeded Limits** | Direct analysis of teams exceeding the YTD detractor limit. Identify their top failure mode. |
| 7 | **Recurrence and Quality Gap** | Analyze why the Top 3 YTD Root Causes are reappearing. Address the role of **customer perception and expectation management** in recurrence. |
| 8 | **Immediate & Strategic Solutions** | **5 numbered, high-priority actions.** Must include the specific action to **Educate Customers on the Scoring System** (9-10 is Promoter). |
| 9 | **Strategic Risk Outlook** | A final paragraph on the operational risk if the Top 3 Root Causes are not immediately resolved (e.g., impact on overall quality score, cost of repeat visits). |
`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    res.json({
      analysis,
      metadata: {
        model: "gemini-2.5-flash",
        totalCases: totalYTDDetractors,
        lastWeek: lastWeek,
        currentMonthCases,
        closureRate: `${closureRate}%`,
        totalTeams: totalTeams,
        detractorLimitPerTeam: YTD_DETRACTOR_LIMIT_PER_TEAM,
        generatedAt: new Date().toLocaleString("en-GB", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      },
    });
  } catch (error) {
    console.error("AI Report Failed:", error);
    res.status(500).json({ error: "Failed to generate executive report", details: error.message });
  }
};