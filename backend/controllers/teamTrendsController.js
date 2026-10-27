import { TaskSchema as Task } from "../models/taskModel.js";
import TeamSamplesToken from "../models/teamSamplesTokenModel.js";
import TeamOnlineData from "../models/teamOnlineDataModel.js";
import SamplesToken from "../models/samplesTokenModel.js";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import { buildTeamTrends, parseMonths, rankTeams, summarize, METRICS } from "../utils/teamTrends.js";

// GET /api/team-trends?from=ISO&to=ISO&months=2026-9,2026-10:0.2258&metric=perSample
// from/to: the period (client resolves it with the app's week/month rules).
// months: the months whose full team samples / online volumes the period uses (the app sends whole
// months, e.g. a week uses its month). ":w" (0–1) would scale a month; the app doesn't use it.
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
    const weightOf = new Map(months.map((m) => [`${m.year}-${m.month}`, m.weight]));
    const weigh = (rows) => rows.map((r) => ({ ...r, weight: weightOf.get(`${r.year}-${r.month}`) ?? 1 }));

    // Official monthly totals (Survey samples → Monthly totals) are stored as weekNumber 100 + month.
    const officialMatch = months.length ? { $or: months.map(({ year, month }) => ({ year, weekNumber: 100 + month })) } : null;
    const [tasks, samples, online, teams, official] = await Promise.all([
      // Same DVOC scope as the existing DVOC/Sample and DVOC/Online figures (onlineSummary).
      Task.find(
        { interviewDate: { $gte: from, $lte: to }, teamName: { $exists: true, $nin: [null, ""] } },
        { teamId: 1, teamName: 1, teamAccountability: 1, responsible: 1 }
      ).lean(),
      monthMatch ? TeamSamplesToken.find(monthMatch, { teamId: 1, teamName: 1, sampleSize: 1, year: 1, month: 1 }).lean() : [],
      monthMatch ? TeamOnlineData.find(monthMatch, { teamCode: 1, teamName: 1, onlineTransactions: 1, year: 1, month: 1 }).lean() : [],
      FieldTeamsSchema.find({}, { teamName: 1, teamCompany: 1, teamCode: 1, isTerminated: 1 }).lean(),
      officialMatch ? SamplesToken.find(officialMatch, { year: 1, weekNumber: 1, sampleSize: 1 }).lean() : [],
    ]);

    const rows = rankTeams(buildTeamTrends({ tasks, samples: weigh(samples), online: weigh(online), teams, ratesAvailable: months.length > 0 }), metric);
    res.json({
      period: { from, to, months },
      metric,
      ratesAvailable: months.length > 0,
      estimated: months.some((m) => m.weight < 1), // samples/online pro-rated from monthly figures
      summary: summarize(rows),
      // Official monthly total for the same months, to compare with the sum of team samples (null = not entered).
      officialSamples: official.length ? official.reduce((n, o) => n + (Number(o.sampleSize) || 0), 0) : null,
      officialMonths: official.map((o) => ({ year: o.year, month: o.weekNumber - 100, sampleSize: o.sampleSize })),
      rows,
    });
  } catch (error) {
    console.error("team trends failed:", error);
    res.status(500).json({ message: "Couldn't calculate team trends", error: error.message });
  }
};
