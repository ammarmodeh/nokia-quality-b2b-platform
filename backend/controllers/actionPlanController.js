
import { GoogleGenerativeAI, GoogleGenerativeAIError } from "@google/generative-ai";
import { TaskSchema } from "../models/taskModel.js";

// Initialize the Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Executes a Gemini API call with retry logic and exponential backoff
 * specifically for transient 503 errors.
 */
async function retryApiCall(apiCall, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      const is503 = error instanceof GoogleGenerativeAIError && error.status === 503;
      if (is503 && attempt < maxRetries - 1) {
        attempt++;
        const delay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw { status: error.status || 500, message: error.message || 'An unknown error occurred.', originalError: error };
      }
    }
  }
}

export const generateActionPlan = async (req, res) => {
  try {
    const { period = 'last_week' } = req.body;
    const now = new Date();
    let startDate, endDate;
    let periodTitle = "";

    const getStartOfWeek = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day;
      return new Date(d.setDate(diff));
    };

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
      const startOfCurrentWeek = getStartOfWeek(now);
      startDate = new Date(startOfCurrentWeek);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startOfCurrentWeek);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      periodTitle = "Last Week";
    }

    if (!endDate) endDate = new Date();

    const aggregationResults = await TaskSchema.aggregate([
      {
        $match: {
          evaluationScore: { $gte: 1, $lte: 8 },
          interviewDate: { $exists: true, $gte: startDate, $lte: endDate }
        }
      },
      {
        $facet: {
          totalCases: [{ $count: "count" }],
          reasons: [
            {
              $group: {
                _id: { $ifNull: ["$reason", "Unspecified"] },
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          teams: [
            {
              $group: {
                _id: { $ifNull: ["$teamName", "Unknown Team"] },
                count: { $sum: 1 },
                reasons: { $push: { $ifNull: ["$reason", "Unspecified"] } }
              }
            },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);

    const results = aggregationResults[0];
    const totalCases = results.totalCases[0]?.count || 0;
    const topReasons = results.reasons.map(r => `${r._id} (${r.count} cases)`);
    const worstTeams = results.teams.slice(0, 5).map(t => {
      const teamReasonCounts = t.reasons.reduce((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {});
      const topReason = Object.entries(teamReasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Mixed";
      return `${t._id} - ${t.count} violations (Top issue: ${topReason})`;
    });

    const teamsCount = results.teams.length;

    // --- Chart Generation Helpers (QuickChart.io) ---
    // 1. Violations by Team (Bar Chart)
    const teamsLabels = results.teams.slice(0, 5).map(t => t._id.substring(0, 15)); // Shorten names
    const teamsData = results.teams.slice(0, 5).map(t => t.count);
    const teamChartConfig = {
      type: 'bar',
      data: {
        labels: teamsLabels,
        datasets: [{ label: 'Violations', data: teamsData, backgroundColor: '#dc3545' }]
      },
      options: {
        title: { display: true, text: 'Top 5 Teams by Violations' },
        plugins: { datalabels: { anchor: 'end', align: 'top' } }
      }
    };
    const teamChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(teamChartConfig))}&width=500&height=300`;

    // 2. Violations by Reason (Pie Chart)
    const reasonLabels = results.reasons.slice(0, 5).map(r => r._id);
    const reasonData = results.reasons.slice(0, 5).map(r => r.count);
    const reasonChartConfig = {
      type: 'pie',
      data: {
        labels: reasonLabels,
        datasets: [{ data: reasonData, backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'] }]
      },
      options: {
        title: { display: true, text: 'Top Violation Reasons' }
      }
    };
    const reasonChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(reasonChartConfig))}&width=500&height=300`;

    const dataContext = `
    PERIOD: ${periodTitle}
    TOTAL VIOLATIONS: ${totalCases}
    TEAMS WITH VIOLATIONS: ${teamsCount}
    
    TOP RECURRING ISSUES:
    ${topReasons.slice(0, 5).join('\n')}

    TOP UNDERPERFORMING TEAMS:
    ${worstTeams.join('\n')}
    `;

    const prompt = `
    You are the Quality Assurance Manager for a Fiber Installation Contractor.
    **Goal:** Create a **Strategic, Deep-Dive Action Plan** for the Operator.
    
    **INTELLIGENT FILTERING & DEPTH:**
    *   **Filter:** ONLY include sections that directly address the **TOP RECURRING ISSUES** found in the Data Context.
    *   **Depth:** For every issue you identity, do NOT just list it. Provide specific, **detailed technical protocols** and **behavioral scripts** to fix it.
    *   *Example:* If "Wi-Fi Coverage" is an issue, don't just say "Train on coverage." Say "Implement mandatory 'Room-by-Room Speed Test' protocol with customer signature required on results."

    **Tone:** Expert, Thorough, Authoritative, yet Action-Oriented.

    DATA CONTEXT:
    ${dataContext}

    **CHART LINKS:**
    *   Reasons Chart: ![Top Reasons Chart](${reasonChartUrl})
    *   Teams Chart: ![Top Teams Chart](${teamChartUrl})

    **REQUIRED STRUCTURE:**

    # Strategic Quality Remediation Plan (${periodTitle})

    **1. Executive Diagnosis**
    *   **Root Cause Analysis:** We have filtered the noise and identified that **${topReasons.slice(0, 3).map(r => r.split('(')[0]).join(', ')}** are responsible for the majority of violations (${totalCases} total).
    *   **Strategic Shift:** We are shifting from generic training to **targeted intervention** for these specific failure modes.
    ![Top Reasons Chart](${reasonChartUrl})

    **2. Deep-Dive Corrective Modules (Dynamic)**
    *(Instructions: Create a detailed subsection for EACH of the Top 3 Recurring Issues. For each issue, provide:
      A. **The Specific Technical Standard** (What is the correct way?)
      B. **The New On-Site Protocol** (What must the technician physically do differently?)
      C. **Verification Method** (How do we prove it was done right?))*
    
    **3. High-Risk Team Accountability**
    *   **The "Watchlist":** The following teams contribute disproportionately to the failure rate: **${worstTeams.map(t => t.split(' - ')[0]).slice(0, 3).join(', ')}**.
    *   **Mandatory PIP (Performance Improvement Plan):** These teams are placed on immediate supervised probation. Every installation they perform will require **Vide/Photo Call Approval** from a Supervisor before they are allowed to leave the customer's home.
    ![Top Teams Chart](${teamChartUrl})

    **4. Systemic Preventive Measures**
    *(Instructions: Select 2-3 detailed process improvements from the pool below that map to the data. Elaborate on them.
    Pool: [Mandatory "Customer Education" Walkthrough, Pre-Installation Signal Audit, Uniform & ID Check, "Zero-Defect" Supervisor Sign-off])*

    **5. Enforcement & Sustainability**
    *   **Violation Policy:** Implementation of a strict "Three Strikes" rule for technical negligence.
    *   **Incentive Alignment:** Good performance (0 violations) will be rewarded with priority routing.

    **Conclusion:**
    This rigorous, data-backed plan ensures that we not only fix the current faults but permanently upgrade the standard of operation for the Operator's network.
    `;

    const apiCall = async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    };

    const text = await retryApiCall(apiCall);

    res.status(200).json({ plan: text, metadata: { totalCases, teamsCount, period: periodTitle } });

  } catch (error) {
    console.error("Error generating Action Plan:", error);
    res.status(500).json({ message: "Failed to generate action plan", error: error.message });
  }
};
