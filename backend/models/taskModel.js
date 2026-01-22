import mongoose from "mongoose";

const justificationSchema = new mongoose.Schema({
  question: String,
  choices: [
    {
      label: String,
      value: String,
    },
  ],
  selected: {
    type: String,
    default: null,
  },
  notes: {
    question: String,
    value: {
      type: String,
      default: "",
    },
  },
}, { _id: false });

const checkpointSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Checkpoint name is required"],
  },
  checked: {
    type: Boolean,
    default: false,
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    required: false,
    validate: {
      validator: function (value) {
        return value === null || (Number.isInteger(value) && value >= 0 && value <= 100);
      },
      message: "Score must be null or an integer between 0 and 100",
    },
  },
  options: {
    type: {
      type: String,
      enum: ["conditional", "text", null],
      default: null,
    },
    question: {
      type: String,
    },
    choices: [
      {
        label: String,
        value: mongoose.Schema.Types.Mixed, // Changed to Mixed to handle both String and null
      },
    ],
    selected: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    value: {
      type: String,
      default: "",
    },
    simpleQuestion: {
      type: Boolean,
      default: false
    },
    followUpQuestion: {
      question: String,
      choices: [
        {
          label: String,
          value: mongoose.Schema.Types.Mixed,
        },
      ],
      selected: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      actionTaken: {
        question: String,
        choices: [
          {
            label: String,
            value: String,
          },
        ],
        selected: {
          type: String,
          default: null,
        },
        justification: justificationSchema,
      },
    },
    actionTaken: {
      question: String,
      choices: [
        {
          label: String,
          value: String,
        },
      ],
      selected: {
        type: String,
        default: null,
      },
      justification: justificationSchema,
    },
    generalJustification: justificationSchema,
  },
  signalTestNotes: {
    type: String,
    default: "",
  },
});

const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Subtask title is required"]
  },
  note: {
    type: String,
    default: ""
  },
  dateTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ["Open", "Closed"],
    default: "Open"
  },
  checkpoints: [checkpointSchema],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  shortNote: {
    type: String,
    default: ""
  },
  optional: {
    type: Boolean,
    default: false
  }
});

const taskSchema = new mongoose.Schema(
  {
    slid: { type: String, required: [true, "SLID is required"], trim: true },
    operation: { type: String, default: "" },
    interviewDate: { type: Date, default: null },
    pisDate: {
      type: Date,
      required: false,
      default: null
    },
    contactNumber: {
      type: Number,
      required: false,
      default: null
    },
    requestNumber: {
      type: Number,
      required: [true, "Request number is required"],
      unique: true
    },
    governorate: {
      type: String,
      required: false,
      default: null
    },
    district: {
      type: String,
      required: false,
      default: null
    },
    teamName: {
      type: String,
      required: false,
      trim: true,
      default: null
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldTeams",
      required: false,
      default: null,
      validate: {
        validator: function (id) {
          return !id || mongoose.Types.ObjectId.isValid(id);
        },
        message: "Invalid team ID",
      },
    },
    teamCompany: {
      type: String,
      required: false,
      default: null
    },
    date: {
      type: Date,
      default: null
    },
    tarrifName: { type: String, trim: true, required: false, default: null },
    customerType: { type: String, trim: true, required: false, default: null },
    customerFeedback: { type: String, trim: true, required: false, default: null },
    dashboardShortNote: { type: String, trim: true, default: "" },
    customerName: { type: String, trim: true, required: false, default: null },
    responsible: { type: String, trim: true, default: null },
    reason: { type: String, trim: true, required: false, default: null },
    subReason: { type: String, trim: true, default: null },
    rootCause: { type: String, trim: true, default: null },
    ontType: { type: String, trim: true, default: null },
    freeExtender: { type: String, enum: ["Yes", "No", null], default: null },
    extenderType: { type: String, trim: true, default: null },
    extenderNumber: { type: Number, default: 0 },
    closureCallEvaluation: { type: Number, min: 1, max: 10, default: null },
    closureCallFeedback: { type: String, trim: true, default: null },
    interviewDate: {
      type: Date,
      required: false,
      default: null
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
      required: false,
    },
    validationStatus: {
      type: String,
      enum: {
        values: ["Validated", "Not validated"],
        message: "Validation status must be either Validated or Not validated",
      },
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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
        description: String,
      },
    ],
    subtaskType: {
      type: String,
      enum: ["original", "visit", "phone", "no_answer", "others"],
      default: "original"
    },
    resolutionStatus: {
      type: String,
      enum: ["No Answer", "Answered and resolved", "Appointment scheduled", "No action taken", "Pending", null],
      default: "Pending"
    },
    subTasks: [subtaskSchema],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    evaluationScore: {
      type: Number,
      default: 1,
      required: false,
    },
    notifications: [{
      recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      message: { type: String, required: true },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }],

    speed: {
      type: Number,
      default: null
    },
    serviceRecipientInitial: {
      type: String,
      enum: ["Authorized Representative", "Primary Subscriber"],
      default: null
    },
    serviceRecipientQoS: {
      type: String,
      enum: ["Authorized Representative", "Primary Subscriber"],
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add index for better performance on frequently queried fields
taskSchema.index({ slid: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ isDeleted: 1 });
taskSchema.index({ interviewDate: -1 });
taskSchema.index({ pisDate: -1 });

export const TaskSchema = mongoose.model("Task", taskSchema);