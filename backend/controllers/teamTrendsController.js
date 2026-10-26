import { TaskSchema as Task } from "../models/taskModel.js";
import TeamSamplesToken from "../models/teamSamplesTokenModel.js";
import TeamOnlineData from "../models/teamOnlineDataModel.js";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import { buildTeamTrends, parseMonths, rankTeams, summarize, METRICS } from "../utils/teamTrends.js";

// GET /api/team-trends?from=ISO&to=ISO&months=2026-9,2026-10&metric=perSample
// from/to: the period (client resolves it with the app's week/month rules).
// months: the whole calendar months the period covers. Samples and online volumes are stored per
// team per month, so rates are only computed when the period is made of whole months.
export const getTeamTrends = async (req, res) => {
  try {
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      return res.status(400).json({ message: "from and to must be valid dates, from ≤ to" });
    }
    const months = parseMonths(req.query.months);
    const metric = METRICS[req.query.metric] ? req.query.metric : "perSample";
    const monthMatch = months.length ? { $or: months.map(({ year, month }) => ({ year, month })) } : null;

    const [tasks, samples, online, teams] = await Promise.all([
      // Same DVOC scope as the existing DVOC/Sample and DVOC/Online figures (onlineSummary).
      Task.find(
        { interviewDate: { $gte: from, $lte: to }, teamName: { $exists: true, $nin: [null, ""] } },
        { teamName: 1, teamAccountability: 1, responsible: 1 }
      ).lean(),
      monthMatch ? TeamSamplesToken.find(monthMatch, { teamName: 1, sampleSize: 1 }).lean() : [],
      monthMatch ? TeamOnlineData.find(monthMatch, { teamName: 1, onlineTransactions: 1 }).lean() : [],
      FieldTeamsSchema.find({}, { teamName: 1, teamCompany: 1, teamCode: 1, isTerminated: 1 }).lean(),
    ]);

    const rows = rankTeams(buildTeamTrends({ tasks, samples, online, teams, ratesAvailable: months.length > 0 }), metric);
    res.json({
      period: { from, to, months },
      metric,
      ratesAvailable: months.length > 0,
      summary: summarize(rows),
      rows,
    });
  } catch (error) {
    console.error("team trends failed:", error);
    res.status(500).json({ message: "Couldn't calculate team trends", error: error.message });
  }
};
