import mongoose from "mongoose";

const dropdownOptionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      index: true,
    },
    value: {
      type: String,
      required: [true, "Value is required"],
      trim: true,
    },
    label: {
      type: String,
      required: [true, "Label is required"],
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    parentCategory: { type: String, default: null },
    parentValue: { type: String, default: null },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness within a category
dropdownOptionSchema.index({ category: 1, value: 1 }, { unique: true });

export const DropdownOption = mongoose.model("DropdownOption", dropdownOptionSchema);
