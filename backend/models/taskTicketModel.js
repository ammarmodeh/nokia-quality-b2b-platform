import mongoose from "mongoose";

const taskTicketSchema = new mongoose.Schema(
    {
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'taskType',
            index: true,
        },
        taskType: {
            type: String,
            required: true,
            enum: ['Task', 'CustomerIssue'],
            default: 'Task'
        },
        mainCategory: {
            type: String,
            enum: [
                "Called", "Postponed", "Visited", "Resolved", "Ticket Reopened", "Closed", "No Answer", "Todo",
                "MOD", "DMOK", "VAL", "SWO", "LWO", "RWO", "PSR", "MUTIN", "DNEn",
                "FMC", "Remote", "Visit Success", "No Show",
                "INIT", "CONTACT", "REFLECT", "VISIT", "RESOLVE"
            ],
            required: true,
        },
        status: {
            type: String,
            enum: ["Todo", "In Progress", "Closed", "Completed"],
            required: true,
        },
        note: { type: String, trim: true, default: "" },
        eventDate: {
            type: Date,
            default: Date.now,
        },
        resolutionDate: { type: Date, default: null },
        closureDate: { type: Date, default: null },
        rootCause: { type: String, trim: true, default: "" },
        subReason: { type: String, trim: true, default: "" },
        actionTaken: { type: String, trim: true, default: "" },
        followUpRequired: { type: Boolean, default: false },
        followUpDate: { type: Date, default: null },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        ticketId: {
            type: String,
            unique: true,
            index: true
        },
        transactionType: { type: String, trim: true, default: "" }, // GAIA: MOD, VAL, SWO, etc.
        transactionState: { type: String, trim: true, default: "" }, // GAIA: FE, VA, RE, PS, etc.
        unfReasonCode: { type: String, trim: true, default: "" }, // GAIA: RES03, 615, 722, etc.
        agentName: { type: String, trim: true, default: "" },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

taskTicketSchema.pre("save", async function (next) {
    if (!this.ticketId) {
        // Generate a random ID like QOPS-A1B2C3
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.ticketId = `QOPS-${randomStr}`;
    }
    next();
});

export const TaskTicket = mongoose.model("TaskTicket", taskTicketSchema);
