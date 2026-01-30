import mongoose from "mongoose";

const technicalDetailSchema = new mongoose.Schema(
    {
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true,
        },
        operation: { type: String, default: "" },
        tarrifName: { type: String, trim: true, default: null },
        speed: { type: Number, default: null },
        ontType: { type: String, trim: true, default: null },
        freeExtender: { type: String, enum: ["Yes", "No", null], default: null },
        extenderType: { type: String, trim: true, default: null },
        extenderNumber: { type: Number, default: 0 },
        reason: { type: String, trim: true, default: null },
        subReason: { type: String, trim: true, default: null },
        rootCause: { type: String, trim: true, default: null },
    },
    { timestamps: true }
);

export const TechnicalDetail = mongoose.model("TechnicalDetail", technicalDetailSchema);
