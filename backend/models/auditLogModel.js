import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
    {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        path: { type: String, required: true },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["Uploaded", "Imported"],
            default: "Uploaded",
        },
        auditType: {
            type: String,
            enum: ["DVOC", "ReachSupervisors"],
            default: "DVOC",
        },
        importStats: {
            totalRows: { type: Number, default: 0 },
            matchedRows: { type: Number, default: 0 },
            updatedTasks: { type: Number, default: 0 },
        },
        startDate: { type: Date },
        endDate: { type: Date },
    },
    {
        timestamps: true,
    }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
