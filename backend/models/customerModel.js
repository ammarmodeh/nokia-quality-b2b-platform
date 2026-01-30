import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
    {
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true,
        },
        customerName: { type: String, trim: true, default: null },
        customerType: { type: String, trim: true, default: null },
        contactNumber: { type: Number, default: null },
        governorate: { type: String, default: null },
        district: { type: String, default: null },
        customerFeedback: { type: String, trim: true, default: null },
    },
    { timestamps: true }
);

export const Customer = mongoose.model("Customer", customerSchema);
