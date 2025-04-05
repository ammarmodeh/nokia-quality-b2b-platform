import mongoose from 'mongoose';

const unhashedPasswordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
  },
  { timestamps: true }
);

// 🔹 **Prevent duplicate email errors (indexing issue)**
unhashedPasswordSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("Email already exists. Please use a different email."));
  } else {
    next(error);
  }
});

export const UnhashedPasswordSchema = mongoose.model("UnhashedPassword", unhashedPasswordSchema);
