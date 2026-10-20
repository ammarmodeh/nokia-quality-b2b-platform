// Team codes move between people. A ticket's team is found from its code AND its date:
// the team that held the code that day (TeamCodeAssignment periods). When a code has no
// recorded history yet, the team that currently carries it is used. The answer is stored on
// the record when it is saved, so later reassignments never rewrite old records.
import { TeamCodeAssignment } from "../models/qopsModels.js";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";

export const EPOCH = new Date(Date.UTC(2000, 0, 1));
export const normCode = (c) => (c === undefined || c === null ? "" : String(c).trim().toUpperCase());

/**
 * A resolver with a per-call cache, for imports and batches.
 * resolve(code, date) → { fieldTeamId, teamName, source: "history" | "current" } | null
 */
export const makeResolver = () => {
  const periods = new Map(); // code → assignments (newest first)
  const current = new Map(); // code → team
  const teamNames = new Map();
  const load = async (code) => {
    if (periods.has(code)) return;
    const list = await TeamCodeAssignment.find({ code }).sort({ from: -1 }).lean();
    periods.set(code, list);
    if (!list.length) {
      const rx = new RegExp(`^\\s*${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
      const teams = await FieldTeamsSchema.find({ teamCode: rx }, { teamName: 1, isTerminated: 1, updatedAt: 1 }).lean();
      // an active team wins over terminated ones; then the most recently updated
      const team = teams.sort((a, b) => Number(a.isTerminated) - Number(b.isTerminated) || new Date(b.updatedAt) - new Date(a.updatedAt))[0];
      current.set(code, team || null);
    }
  };
  const nameOf = async (id) => {
    const k = String(id);
    if (!teamNames.has(k)) teamNames.set(k, (await FieldTeamsSchema.findById(id, { teamName: 1 }).lean())?.teamName || null);
    return teamNames.get(k);
  };
  return async (rawCode, date) => {
    const code = normCode(rawCode);
    if (!code) return null;
    await load(code);
    const at = date ? new Date(date) : new Date();
    const list = periods.get(code);
    if (list.length) {
      const hit = list.find((p) => p.from <= at && (!p.to || p.to > at));
      if (!hit) return null;
      return { fieldTeamId: hit.fieldTeamId, teamName: await nameOf(hit.fieldTeamId), source: "history" };
    }
    const team = current.get(code);
    return team ? { fieldTeamId: team._id, teamName: team.teamName, source: "current" } : null;
  };
};

/**
 * Record a code change on a field team (called by the team update endpoint).
 * Closes the old code's period at `at`, opens the new one, and — the first time a code is
 * seen — writes the history that was implicit until now, so tickets dated before the change
 * keep resolving to the person who held the code then.
 */
export const recordCodeChange = async ({ team, oldCode, newCode, at = new Date(), user }) => {
  const oldC = normCode(oldCode);
  const newC = normCode(newCode);
  if (!newC || oldC === newC) return;
  const when = new Date(at);
  if (oldC) {
    const open = await TeamCodeAssignment.findOne({ code: oldC, fieldTeamId: team._id, to: null });
    if (open) {
      open.to = when;
      await open.save();
    } else if (!(await TeamCodeAssignment.exists({ code: oldC }))) {
      await TeamCodeAssignment.create({ code: oldC, fieldTeamId: team._id, from: EPOCH, to: when, source: "backfill", createdBy: user?._id, note: "Held before history was recorded" });
    }
  }
  if (!(await TeamCodeAssignment.exists({ code: newC }))) {
    // the code's previous holder (a team that still carries it, usually terminated) keeps the past
    const rx = new RegExp(`^\\s*${newC.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
    const prev = (await FieldTeamsSchema.find({ teamCode: rx, _id: { $ne: team._id } }, { _id: 1, updatedAt: 1 }).lean()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
    if (prev) await TeamCodeAssignment.create({ code: newC, fieldTeamId: prev._id, from: EPOCH, to: when, source: "backfill", createdBy: user?._id, note: "Held before history was recorded" });
  } else {
    await TeamCodeAssignment.updateMany({ code: newC, to: null, from: { $lt: when } }, { $set: { to: when } });
  }
  await TeamCodeAssignment.create({ code: newC, fieldTeamId: team._id, from: when, to: null, source: "team-update", createdBy: user?._id });
};

/** Overlap check for manual edits: another period of the same code that intersects [from, to). */
export const findOverlap = async ({ code, from, to, exceptId }) => {
  const f = new Date(from);
  const t = to ? new Date(to) : null;
  return TeamCodeAssignment.findOne({
    code: normCode(code),
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
    $and: [{ $or: [{ to: null }, { to: { $gt: f } }] }, ...(t ? [{ from: { $lt: t } }] : [])],
  }).populate("fieldTeamId", "teamName").lean();
};
