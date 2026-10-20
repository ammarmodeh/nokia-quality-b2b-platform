// Additive collections for trackers added online, team-code history and calendar entries.
// Nothing here changes an existing model.
import mongoose from "mongoose";

const { Schema, model, models } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * A tracker added from the UI (the built-in ones — Closure Call, OJO Snags, DVOC, TCRM,
 * TRC, Internal Audit (FAT) — live in utils/taxonomy.js). Its records are custom tables.
 */
const trackerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true }, // url slug: /trackers/<key>
    description: { type: String, default: "" },
    color: { type: String, default: "#475569" },
    icon: { type: String, default: "track_changes" },
    subs: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
    createdBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);
trackerSchema.index({ key: 1 }, { unique: true });
trackerSchema.index({ name: 1 }, { unique: true });

/**
 * Who held a team code, and when. `to` is exclusive and null while the period is open.
 * A ticket's code + date resolves through these periods (see utils/teamCodes.js), so
 * reassigning a code never moves old tickets to the new holder.
 */
const teamCodeAssignmentSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    fieldTeamId: { type: ObjectId, ref: "FieldTeams", required: true },
    from: { type: Date, required: true },
    to: { type: Date, default: null },
    note: { type: String, default: "" },
    source: { type: String, enum: ["manual", "team-update", "backfill"], default: "manual" },
    createdBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);
teamCodeAssignmentSchema.index({ code: 1, from: -1 });
teamCodeAssignmentSchema.index({ fieldTeamId: 1, from: -1 });

/**
 * A ticket put on the calendar on purpose: a visit, follow-up, callback… on a day.
 * The target's title, SLID, tracker and team are copied in when the entry is saved
 * so the calendar can be filtered without loading every tracker.
 */
const calendarEntrySchema = new Schema(
  {
    target: {
      kind: { type: String, enum: ["row", "issue", "task"], required: true },
      id: { type: ObjectId, required: true },
      tableId: { type: ObjectId, ref: "CustomTable", default: null },
    },
    date: { type: Date, required: true },
    time: { type: String, default: "" }, // "HH:mm", optional
    type: { type: String, default: "Visit", trim: true },
    note: { type: String, default: "" },
    status: { type: String, enum: ["planned", "done", "cancelled"], default: "planned" },
    // snapshot of the target
    title: { type: String, default: "" },
    slid: { type: String, default: "" },
    issueCategory: { type: String, default: null },
    issueSubCategory: { type: String, default: null },
    tableName: { type: String, default: null },
    fieldTeamId: { type: ObjectId, ref: "FieldTeams", default: null },
    teamName: { type: String, default: null },
    assignees: [{ type: ObjectId, ref: "User" }],
    createdBy: { type: ObjectId, ref: "User" },
    updatedBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);
calendarEntrySchema.index({ date: 1 });
calendarEntrySchema.index({ "target.id": 1 });

export const Tracker = models.Tracker || model("Tracker", trackerSchema, "trackers");
export const TeamCodeAssignment = models.TeamCodeAssignment || model("TeamCodeAssignment", teamCodeAssignmentSchema, "team_code_assignments");
export const CalendarEntry = models.CalendarEntry || model("CalendarEntry", calendarEntrySchema, "calendar_entries");
