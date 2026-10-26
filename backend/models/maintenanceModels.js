import mongoose from "mongoose";

// DVOC · Maintenance — its own collections (maintenance_*), separate from the DVOC Installation
// tasks, field teams, samples and Q-Ops tickets. Nothing outside controllers/maintenanceController.js
// reads or writes these, so maintenance records never reach existing reports or dashboards.
const { Schema, model, models } = mongoose;
const ObjectId = Schema.Types.ObjectId;

export const MAINTENANCE_TEAM_STATUSES = ["Active", "Inactive"];
export const MAINTENANCE_SHIFTS = ["Morning", "Evening", "Night", "Rotating"];
export const MAINTENANCE_TASK_STATUSES = ["Todo", "In Progress", "Closed"];
export const MAINTENANCE_PRIORITIES = ["High", "Medium", "Low"];

const memberSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "Technician" }, // Technician | Team leader | Driver …
    phone: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const maintenanceTeamSchema = new Schema(
  {
    teamName: { type: String, required: [true, "Team name is required"], trim: true },
    teamCode: { type: String, trim: true, uppercase: true, default: "" },
    company: { type: String, trim: true, default: "" }, // subcontractor
    supervisor: { type: String, trim: true, default: "" },
    supervisorPhone: { type: String, trim: true, default: "" },
    governorate: { type: String, trim: true, default: "" },
    coverageAreas: { type: [String], default: [] }, // districts / exchanges the team covers
    shift: { type: String, enum: [...MAINTENANCE_SHIFTS, ""], default: "" },
    vehicle: { type: String, trim: true, default: "" },
    members: { type: [memberSchema], default: [] },
    status: { type: String, enum: MAINTENANCE_TEAM_STATUSES, default: "Active" },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: ObjectId, ref: "User" },
    updatedBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);
// Case-insensitive uniqueness on the name; codes unique when set.
maintenanceTeamSchema.index({ teamName: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
maintenanceTeamSchema.index({ teamCode: 1 }, { unique: true, partialFilterExpression: { teamCode: { $type: "string", $gt: "" } } });
maintenanceTeamSchema.index({ status: 1, teamName: 1 });

// Monthly survey sample count per maintenance team (same shape as TeamSamplesToken, own collection).
const maintenanceSurveySampleSchema = new Schema(
  {
    team: { type: ObjectId, ref: "MaintenanceTeam", required: [true, "Team is required"] },
    year: { type: Number, required: true, min: 2000, max: 2100 },
    month: { type: Number, required: true, min: 1, max: 12 },
    sampleSize: { type: Number, required: true, min: [0, "Samples can't be negative"] },
    promoters: { type: Number, min: 0, default: null },
    neutrals: { type: Number, min: 0, default: null },
    detractors: { type: Number, min: 0, default: null },
    source: { type: String, trim: true, default: "" }, // e.g. survey vendor / batch
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: ObjectId, ref: "User" },
    updatedBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);
maintenanceSurveySampleSchema.index({ team: 1, year: 1, month: 1 }, { unique: true }); // one entry per team per month
maintenanceSurveySampleSchema.index({ year: 1, month: 1 });

const maintenanceTaskSchema = new Schema(
  {
    taskNumber: { type: String, required: true, trim: true }, // MT-YYMM-#### (readable reference)
    slid: { type: String, required: [true, "SLID is required"], trim: true },
    ticketNumber: { type: String, trim: true, default: "" }, // fault / trouble-ticket number
    customerName: { type: String, trim: true, default: "" },
    contactNumber: { type: String, trim: true, default: "" },
    governorate: { type: String, trim: true, default: "" },
    district: { type: String, trim: true, default: "" },
    team: { type: ObjectId, ref: "MaintenanceTeam", required: [true, "Maintenance team is required"] },
    surveySample: { type: ObjectId, ref: "MaintenanceSurveySample", default: null },
    evaluationScore: { type: Number, min: 1, max: 10, default: null },
    customerFeedback: { type: String, trim: true, default: "" },
    interviewDate: { type: Date, default: null },
    faultDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    faultType: { type: String, trim: true, default: "" },
    priority: { type: String, enum: MAINTENANCE_PRIORITIES, default: "Medium" },
    status: { type: String, enum: MAINTENANCE_TASK_STATUSES, default: "Todo" },
    assignedTo: [{ type: ObjectId, ref: "User" }],
    rca: {
      type: [
        new Schema(
          {
            reason: { type: String, trim: true, default: "" },
            subReason: { type: String, trim: true, default: "" },
            rootCause: { type: String, trim: true, default: "" },
            responsible: { type: String, trim: true, default: "" },
            teamAccountability: { type: String, enum: ["Yes", "No", "Not specified"], default: "Not specified" },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    notes: { type: String, trim: true, default: "" },
    closedAt: { type: Date, default: null },
    ticketCount: { type: Number, default: 0 },
    lastTicketAt: { type: Date, default: null },
    requestKey: { type: String, default: undefined }, // client idempotency key (retries / double submit)
    createdBy: { type: ObjectId, ref: "User" },
    updatedBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);
maintenanceTaskSchema.index({ taskNumber: 1 }, { unique: true });
maintenanceTaskSchema.index({ requestKey: 1 }, { unique: true, sparse: true });
maintenanceTaskSchema.index({ team: 1, createdAt: -1 });
maintenanceTaskSchema.index({ status: 1, createdAt: -1 });
maintenanceTaskSchema.index({ slid: 1 });
maintenanceTaskSchema.index({ dueDate: 1 });
maintenanceTaskSchema.index({ surveySample: 1 });

// Processing log / tickets for maintenance tasks (modelled on the Q-Ops ticket log, own collection).
const maintenanceTicketSchema = new Schema(
  {
    ticketId: { type: String, required: true, trim: true }, // MQ-XXXXXXXX
    task: { type: ObjectId, ref: "MaintenanceTask", required: true },
    team: { type: ObjectId, ref: "MaintenanceTeam", required: true }, // copied from the task when recorded
    transactionType: { type: String, required: [true, "Transaction type is required"], trim: true }, // INIT, CONTACT, REFLECT, VISIT, RESOLVE …
    transactionState: { type: String, trim: true, default: "" },
    unfReasonCode: { type: String, trim: true, default: "" },
    gaiaTicket: { type: String, trim: true, default: "" }, // external GAIA / trouble-ticket reference
    status: { type: String, enum: MAINTENANCE_TASK_STATUSES, required: true }, // task status after this step
    previousStatus: { type: String, enum: [...MAINTENANCE_TASK_STATUSES, null], default: null },
    eventDate: { type: Date, default: Date.now },
    followUpDate: { type: Date, default: null },
    note: { type: String, trim: true, default: "" },
    agentName: { type: String, trim: true, default: "" },
    recordedBy: { type: ObjectId, ref: "User", required: true },
    editedBy: { type: ObjectId, ref: "User", default: null },
    editedAt: { type: Date, default: null },
    requestKey: { type: String, default: undefined },
  },
  { timestamps: true }
);
maintenanceTicketSchema.index({ ticketId: 1 }, { unique: true });
maintenanceTicketSchema.index({ requestKey: 1 }, { unique: true, sparse: true });
maintenanceTicketSchema.index({ task: 1, eventDate: 1, createdAt: 1 });
maintenanceTicketSchema.index({ team: 1, eventDate: -1 });

// Who changed what in the maintenance module.
const maintenanceAuditSchema = new Schema(
  {
    entity: { type: String, enum: ["team", "sample", "task", "ticket"], required: true },
    entityId: { type: ObjectId, required: true },
    action: { type: String, enum: ["create", "update", "delete", "status"], required: true },
    changes: { type: Schema.Types.Mixed, default: null }, // { field: { from, to } }
    summary: { type: String, default: "" },
    user: { type: ObjectId, ref: "User" },
    userName: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
maintenanceAuditSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

export const MaintenanceTeam = models.MaintenanceTeam || model("MaintenanceTeam", maintenanceTeamSchema, "maintenance_teams");
export const MaintenanceSurveySample = models.MaintenanceSurveySample || model("MaintenanceSurveySample", maintenanceSurveySampleSchema, "maintenance_survey_samples");
export const MaintenanceTask = models.MaintenanceTask || model("MaintenanceTask", maintenanceTaskSchema, "maintenance_tasks");
export const MaintenanceTicket = models.MaintenanceTicket || model("MaintenanceTicket", maintenanceTicketSchema, "maintenance_tickets");
export const MaintenanceAudit = models.MaintenanceAudit || model("MaintenanceAudit", maintenanceAuditSchema, "maintenance_audit_logs");
