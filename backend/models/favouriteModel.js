import mongoose from "mongoose";

const favouriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    originalTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task", // Assuming your original tasks are in a "Task" collection
      required: true
    },

    slid: { type: String, required: [true, "SLID is required"], trim: true },

    pisDate: {
      type: Date,
      required: [true, "PIS Date is required"], // Ensure it's required
    },

    contactNumber: {
      type: Number,
      required: [true, "Contact number is required"],
    },

    requestNumber: {
      type: Number,
      required: [true, "Request number is required"],
    },

    governorate: {
      type: String,
      required: [true, "Governorate is required"],
    },

    district: {
      type: String,
      required: [true, "District is required"],
    },

    teamName: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
    },

    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldTeams",
      required: [true, "Team ID is required"],
      validate: {
        validator: function (id) {
          return mongoose.Types.ObjectId.isValid(id);
        },
        message: "Invalid team ID",
      },
    },

    teamCompany: {
      type: String,
      required: [true, "Team company is required"],
    },

    date: {
      type: Date,
      // required: [true, "Date is required"],
    },

    tarrifName: { type: String, trim: true, required: [true, "Tarrif Name is required"] },

    customerType: { type: String, trim: true, required: [true, "Customer Type is required"] },

    customerFeedback: { type: String, trim: true, required: [true, "Customer feedback is required"] },

    customerName: { type: String, trim: true, required: [true, "Customer name is required"] },

    reason: { type: String, trim: true, required: [true, "Reason is required"] },

    interviewDate: {
      type: Date,
      required: [true, "Interview Date is required"], // Ensure it's required
    },

    priority: {
      type: String,
      enum: {
        values: ["High", "Medium", "Normal", "Low"],
        message: "Priority must be one of High, Medium, Normal, or Low",
      },
      default: "Normal",
    },

    status: {
      type: String,
      enum: {
        values: ["Todo", "In Progress", "Closed"],
        message: "Status must be one of Todo, In Progress, or Closed",
      },
      default: "Todo",
    },

    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        validate: {
          validator: function (value) {
            const ids = Array.isArray(value) ? value : [value];
            return ids.every((id) => mongoose.Types.ObjectId.isValid(id));
          },
          message: "Invalid user ID in assignedTo field",
        },
      },
    ],

    whomItMayConcern: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        validate: {
          validator: function (value) {
            const ids = Array.isArray(value) ? value : [value];
            return ids.every((id) => mongoose.Types.ObjectId.isValid(id));
          },
          message: "Invalid user ID in whomItMayConcern field",
        },
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "CreatedBy is required"],
      validate: {
        validator: function (id) {
          return mongoose.Types.ObjectId.isValid(id);
        },
        message: "Invalid createdBy user ID",
      },
    },

    category: {
      type: String,
      enum: {
        values: [
          "Orange HC detractor",
          "Orange Closure",
          "Orange Joint",
          "Nokia MS detractor",
          "Nokia FAT",
          "Nokia Closure",
          "TRC",
          "TCRM",
          "Others",
        ],
        message: "Invalid category",
      },
      required: [true, "Category is required"],
    },

    validationStatus: {
      type: String,
      enum: {
        values: ["Validated", "Not validated"],
        message: "Validation status must be either Pending, Approved, or Rejected",
      },
    },

    validationCat: {
      type: String,
      required: [true, "Validation category is required"],
    },

    responsibility: {
      type: String,
      required: [true, "Responsibility is required"],
      enum: {
        values: ["Activation Team", "Installation Team", "Customer", "Others"],
      }
    },

    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Users who have read this task
      },
    ],

    taskLogs: [
      {
        action: {
          type: String,
          enum: ["created", "updated", "read", "deleted", "assigned"],
          required: true,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        description: String, // Optional additional info about the action
      },
    ],

    subTasks: [
      {
        title: { type: String, },
        note: { type: String, },
        progress: { type: Number, },
      }
    ],

    isDeleted: {
      type: Boolean,
      default: false,
    },

    evaluationScore: {
      type: Number,
      default: 1,
      required: [true, "Evaluation score is required"],
    },

  }, { timestamps: true }
);

export const FavouriteSchema = mongoose.model("Favourite", favouriteSchema);