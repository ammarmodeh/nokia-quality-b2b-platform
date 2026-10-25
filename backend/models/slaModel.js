import mongoose from "mongoose";

const { Schema, model, models } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const slaRenewalSchema = new Schema(
  {
    previousTargetDate: { type: Date, required: true },
    newTargetDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    isCustomerRequested: { type: Boolean, default: true },
    note: { type: String, default: "" },
    renewedBy: { type: ObjectId, ref: "User" },
    renewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const slaRecordSchema = new Schema(
  {
    target: {
      kind: { type: String, enum: ["task", "issue", "row"], required: true },
      id: { type: ObjectId, required: true },
      tableId: { type: ObjectId, ref: "CustomTable", default: null },
    },
    // Snapshot fields for fast querying
    slid: { type: String, default: "" },
    title: { type: String, default: "" },
    issueCategory: { type: String, default: null },
    issueSubCategory: { type: String, default: null },
    tableName: { type: String, default: null },
    fieldTeamId: { type: ObjectId, ref: "FieldTeams", default: null },
    teamName: { type: String, default: null },
    teamCode: { type: String, default: null },

    // SLA configuration
    slaHours: { type: Number, default: 24 },
    startDate: { type: Date, default: Date.now },
    targetDate: { type: Date, required: true },
    warningThresholdHours: { type: Number, default: 4 },

    // Status: active | met | breached | rescheduled | cancelled
    status: {
      type: String,
      enum: ["active", "met", "breached", "rescheduled", "cancelled"],
      default: "active",
    },
    priority: { type: String, enum: ["High", "Medium", "Low", "Critical"], default: "Medium" },

    // Manual SLA calculation & tracking fields
    ticketCreationDate: { type: Date, default: null },
    responseDate: { type: Date, default: null },
    noResponse: { type: Boolean, default: false },
    slaDifferenceHours: { type: Number, default: null },
    slaDifferenceText: { type: String, default: "" },
    closedBy: { type: String, default: "" },

    // Linked Calendar Entry
    calendarEntryId: { type: ObjectId, ref: "CalendarEntry", default: null },

    // Resolution details
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: ObjectId, ref: "User", default: null },
    resolutionNote: { type: String, default: "" },
    isBreached: { type: Boolean, default: false },

    // Customer Reschedule Renewals (Team Exemption)
    renewals: [slaRenewalSchema],
    teamExempt: { type: Boolean, default: false },

    createdBy: { type: ObjectId, ref: "User" },
    updatedBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);

slaRecordSchema.index({ "target.id": 1, "target.kind": 1 });
slaRecordSchema.index({ fieldTeamId: 1, status: 1 });
slaRecordSchema.index({ status: 1, targetDate: 1 });
slaRecordSchema.index({ targetDate: 1 });
slaRecordSchema.index({ slid: 1 });

export const SlaRecord = models.SlaRecord || model("SlaRecord", slaRecordSchema, "sla_records");
