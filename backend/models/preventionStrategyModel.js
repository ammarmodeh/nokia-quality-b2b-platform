import mongoose from "mongoose";

const preventionStrategySchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const PreventionStrategy = mongoose.model("PreventionStrategy", preventionStrategySchema);
export default PreventionStrategy;
