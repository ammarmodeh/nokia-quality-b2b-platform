import mongoose from "mongoose";

const ontTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "ONT Type Name is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export const ONTType = mongoose.model("ONTType", ontTypeSchema);
