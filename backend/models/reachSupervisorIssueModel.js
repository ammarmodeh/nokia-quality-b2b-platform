import mongoose from "mongoose";

const reachSupervisorIssueSchema = new mongoose.Schema({
    slid: { type: String, required: true },
    ticketId: { type: String, required: false },
    pisDate: {
        type: Date,
        default: null
    },
    fromMain: { type: String, required: true },
    fromSub: { type: String },
    reporter: { type: String, required: true },
    reporterNote: { type: String },
    contactMethod: {
        type: String,
        required: true
    },
    issues: [{
        category: { type: String, required: true },
        subCategory: { type: String }
    }],
    teamCompany: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
    },
    customerContact: {
        type: String,
    },
    assigneeNote: {
        type: String,
    },
    resolvedBy: {
        type: String,
        enum: ['Phone', 'Visit', ''],
        default: ''
    },
    date: { type: Date, default: Date.now },
    solved: {
        type: String,
        required: true,
        enum: ['yes', 'no'],
        default: 'no'
    },
    resolveDate: { type: Date },
    closedBy: { type: String },
    closedAt: { type: Date },
    resolutionDetails: { type: String },
    assignedTo: { type: String, required: true },
    installingTeam: { type: String },
    dispatched: {
        type: String,
        enum: ['yes', 'no'],
        default: 'no'
    },
    dispatchedAt: { type: Date },
    area: { type: String },
    callerName: { type: String },
    callerDetails: { type: String },
    callDate: { type: Date },
    interviewDate: { type: Date },
    source: {
        type: String,
        default: 'Reach Supervisors'
    },
    auditId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuditLog'
    }
}, {
    timestamps: true
});

reachSupervisorIssueSchema.index({ slid: 1 });
reachSupervisorIssueSchema.index({ assignedTo: 1 });
reachSupervisorIssueSchema.index({ teamCompany: 1 });
reachSupervisorIssueSchema.index({ solved: 1 });
reachSupervisorIssueSchema.index({ pisDate: -1 });

export const ReachSupervisorIssue = mongoose.model('ReachSupervisorIssue', reachSupervisorIssueSchema);
