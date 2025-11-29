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
    // --- 1. Dynamic Team Count & Limit ---
    const totalTeams = await FieldTeamsSchema.countDocuments({ role: 'fieldTeam', isActive: true });
    const actualTotalTeams = totalTeams > 0 ? totalTeams : 1;

    const SAMPLES_PER_WEEK = 115;
    const WEEKS_PER_YEAR = 52;
    const MAX_DETRACTOR_RATE = 0.09;
    const MAX_YEARLY_DETRACTORS_POOL = Math.round(SAMPLES_PER_WEEK * WEEKS_PER_YEAR * MAX_DETRACTOR_RATE);
    const YTD_DETRACTOR_LIMIT_PER_TEAM = Math.ceil(MAX_YEARLY_DETRACTORS_POOL / actualTotalTeams);

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
      .select("interviewDate teamName reason validationStatus")
      .lean();

    if (tasks.length === 0) {
      return res.json({
        analysis: `# QoS Executive Report — All Clear\n\n**No detractor or neutral cases found.**\n\nAll customers are Promoters (9–10). Outstanding performance.\n\nKeep pushing for excellence.`,
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
    const teamWeeklyCount = {}; // For 2+ in same week
    const teamYTDCount = {};
    const reasonCount = {};
    const closure = { fixed: 0, pending: 0 };

    tasks.forEach(t => {
      const team = (t.teamName || "Unknown Team").trim();
      const reason = String(t.reason || "Unspecified").trim();
      const weekNum = getWeekNumber(t.interviewDate);
      const weekKey = `Wk-${weekNum}`;

      // YTD counts
      teamYTDCount[team] = (teamYTDCount[team] || 0) + 1;
      reasonCount[reason] = (reasonCount[reason] || 0) + 1;

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
    const formatTopTeam = (obj) => {
      if (Object.keys(obj).length === 0) return "None";
      const [team, count] = Object.entries(obj).sort((a, b) => b[1] - a[1])[0];
      return `**${team}** (${count} cases)`;
    };

    const mostRepeatedCurrentMonth = formatTopTeam(teamCurrentMonth);
    const mostRepeatedLast3Weeks = formatTopTeam(teamLast3Weeks);
    const mostRepeatedLast2Weeks = formatTopTeam(teamLast2Weeks);

    const weeklyRepeatOffenders = [];
    Object.entries(teamWeeklyCount).forEach(([week, teams]) => {
      Object.entries(teams)
        .filter(([_, count]) => count >= 2)
        .forEach(([team, count]) => {
          weeklyRepeatOffenders.push(`• **${team}** — ${count} cases in ${week}`);
        });
    });
    const weeklyRepeatOffendersText = weeklyRepeatOffenders.length > 0
      ? weeklyRepeatOffenders.sort().join('\n')
      : "None detected";

    // --- 7. Existing Top 5 Reasons & Chronic Offenders ---
    const topReasons = Object.entries(reasonCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([r, c], i) => `${i + 1}. **${r}** — ${c} cases (${((c / tasks.length) * 100).toFixed(1)}%)`);

    const chronicOffenders = Object.entries(teamYTDCount)
      .filter(([_, c]) => c >= YTD_DETRACTOR_LIMIT_PER_TEAM)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([team, c]) => {
        const teamReasons = tasks
          .filter(t => (t.teamName || "Unknown Team").trim() === team)
          .map(t => String(t.reason || "Unspecified").trim());
        const topReason = Object.entries(teamReasons.reduce((a, r) => (a[r] = (a[r] || 0) + 1, a), {}))
          .sort((a, b) => b[1] - a[1])[0]?.[0] || "Mixed";
        return `• **${team}** — ${c} cases (Limit: ${YTD_DETRACTOR_LIMIT_PER_TEAM}). Top failure: "${topReason}"`;
      });

    const closureRate = ((closure.fixed / tasks.length) * 100).toFixed(1);

    // --- 8. Final Prompt to Gemini ---
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      temperature: 0.3,
    });

    const prompt = `
      You are an **AI Senior Quality Intelligence Advisor** for the OrangeJO–Nokia FTTH Program.  
Your mission is to convert detractor/neutral cases (scores 1–8) into a **high-authority, trend-driven, executive intelligence report** with deep operational insights.

Audience: CTO, PMO Directors, Nokia Quality Managers  
Tone: Executive, strict, data-driven, no soft language.  
Always interpret the data — never restate it blindly.

---

# 🔸 Raw Operational Flags (Computed)
- **Most repeated team (Current Month):** ${mostRepeatedCurrentMonth}
- **Most repeated team (Last 3 Weeks):** ${mostRepeatedLast3Weeks}
- **Most repeated team (Last 2 Weeks):** ${mostRepeatedLast2Weeks}
- **Weekly repeat offenders (≥2 cases in same week):**
${weeklyRepeatOffendersText}

---

# 🔸 KPIs & Load Indicators
- **Total Detractor/Neutral Cases (Score 1–8):** ${tasks.length}
- **Validated Closures:** ${closureRate}%
- **Active Field Teams:** ${totalTeams}
- **Dynamic YTD Maximum Detractor Allowance Per Team:** ${YTD_DETRACTOR_LIMIT_PER_TEAM}

---

# 🔸 Top 5 Root Causes (Weighted YTD)
${topReasons.join("\n")}

---

# 🔸 Chronic Offenders (Exceeded Annual Threshold)
${chronicOffenders.length > 0 ? chronicOffenders.join("\n") : "No teams exceeded threshold."}

---

# 🎯 REQUIRED OUTPUT FORMAT (STRICT)

Generate a **deep, insight-rich, aggressive Markdown report** structured EXACTLY as follows:

---

### **1. Annual Performance Overview**
- High-level health of detractor behavior.
- Whether the current trajectory risks breaching annual KPI ceilings.
- Macro failure pressure points.

---

### **2. QoS Metrics Snapshot**
- Include repeat offenders across weeks and months.
- Highlight clusters, spikes, and operational anomalies.
- Identify any teams showing pattern-level deterioration.

---

### **3. Quarterly Trend & Volatility Analysis**
Perform **trend analytics over the last 13 weeks (quarter)**:
- Identify rising vs. declining teams.
- Highlight volatility zones (weeks with surge vs. calm).
- Detect structural instability (recurrence patterns).

---

### **4. Team Trend Intelligence (MANDATORY SECTION)**
Provide deep trend analytics for team-level behavior:

#### **a. 4-Week Rolling Trend (Per Team)**
- Identify the most frequently recurring teams across the last 4 full weeks.
- Highlight teams showing continuous deterioration or week-over-week increase.
- Flag any team appearing in **≥3 of the last 4 weeks**.

#### **b. Quarter Trend (13 Weeks)**
- Identify the **top persistent violators** across the quarter.
- Highlight teams with recurring presence across multiple intervals.
- Determine if violations are spiking, plateauing, or cyclic.

#### **c. Repeat Appearance Analysis**
- List any team appearing in multiple trend windows:
  - Current Month  
  - Last 3 Weeks  
  - Last 2 Weeks  
  - Weekly repeat offenders  
- Clearly flag teams that create **cross-window violations** (structural issue).

#### **d. “Most Violating Team Over Time”**
- Identify the team with the highest cumulative detractor load across:
  - 4-week window  
  - 8-week window  
  - Quarter window  
  - YTD (if applicable)  
- Explain the operational implication.

This section must read like a **Quality Intelligence Early-Warning System**.

---

### **5. Dominant Failure Modes (YTD)**
- Interpretation of root causes.
- Which failure modes are accelerating.
- Their operational trigger points.

---

### **6. Monthly Failure Mode Evolution**
- How root causes shifted month-over-month.
- Detect newly emerging failure drivers.
- Identify seasonal/logistical/coverage-driven cause changes.

---

### **7. Accountability & Exceeded Limits**
You must:
- Aggressively call out the **most repeated teams**.
- Highlight weekly repeat offenders.
- List all teams approaching or exceeding YTD detractor ceilings.
- Present consequences from an operational risk perspective.

---

### **8. Recurrence and Quality Gap**
- Explain why certain teams repeatedly appear.
- Identify skill gaps, process non-compliance, installation issues, or customer-interaction issues.
- Provide clear cause chains:  
  **Process → Skill → Customer Experience → Score Impact**

---

### **9. Immediate & Strategic Solutions**
Use only the **Pre-Approved Solutions Library**.  
Provide:
- Immediate actions (0–2 weeks)
- Tactical improvements (1–3 months)
- Strategic corrections (quarter scale)
- **MANDATORY:** Include customer scoring education (9–10 = Promoter).

Tone must be strict, operational, and executive.

---

### **10. Strategic Risk Outlook**
- Predict high-risk teams for upcoming 4–8 weeks.
- Assess likelihood of KPI failure.
- Provide a 4-level severity signal: Low / Medium / High / Critical.
- Identify regions or teams likely to escalate.

---

# STYLE RULES
- No generic text.  
- Must not repeat numerical stats without interpretation.  
- Use decision-oriented, operational language.  
- The final output must resemble a **CTO-level executive intelligence brief**.

Now generate the full report.

`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

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
    console.error("AI Report Failed:", error);
    res.status(500).json({ error: "Failed to generate report", details: error.message });
  }
};