import mongoose from 'mongoose';

const auditRecordSchema = new mongoose.Schema({
    auditId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuditLog',
        required: true,
    },
    slid: {
        type: String,
        required: true,
    },
    interviewDate: {
        type: Date,
    },
    evaluationScore: {
        type: Number,
    },
    customerFeedback: {
        type: String,
    },
    isMatched: {
        type: Boolean,
        default: false,
    },
    matchedIssues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerIssue',
    }],
    status: {
        type: String,
        enum: ['Pending', 'Imported', 'Ignored', 'Manually Added'],
        default: 'Pending',
    },
    actionLog: [{
        action: String,
        timestamp: { type: Date, default: Date.now },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String
    }],
    linkedTask: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
    },
    linkedIssue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerIssue',
    },
    rawRowData: {
        type: mongoose.Schema.Types.Mixed,
    }
}, {
    timestamps: true,
});

// Index for quick lookup of specific SLID audits
auditRecordSchema.index({ slid: 1 });
auditRecordSchema.index({ auditId: 1 });

const AuditRecord = mongoose.model('AuditRecord', auditRecordSchema);

export default AuditRecord;
