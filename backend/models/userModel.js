import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },

    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"], // Matches international phone formats
    },

    role: {
      type: String,
      enum: {
        values: ["Admin", "Member"],
        message: "Invalid role selected",
      },
      default: "Member",
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      default: "Team Member",
      trim: true,
    },

    department: {
      type: String,
      default: "Quality",
    },

    subDepartment: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    color: {
      type: String,
      required: true,
      unique: true, // Ensures that each user gets a unique color
    },

    isManager: {
      type: Boolean,
      default: false,
    },

    visibleTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  // console.log({ enteredPassword });
  return bcrypt.compare(enteredPassword, this.password);
};

// Prevent duplicate email errors
userSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("Email already exists. Please use a different email."));
  } else {
    next(error);
  }
});

export const UserSchema = mongoose.model("User", userSchema);
