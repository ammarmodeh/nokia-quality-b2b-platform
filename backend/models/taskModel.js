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
    requestNumber: {
      type: Number,
      required: [true, "Request number is required"],
      unique: true
    },
    subtaskType: { type: String, trim: true, default: null },
    // Search-optimized flat fields
    customerName: { type: String, trim: true },
    customerType: { type: String, trim: true, default: null },
    contactNumber: { type: String, trim: true },
    governorate: { type: String, default: null },
    district: { type: String, default: null },
    customerFeedback: { type: String, trim: true, default: null },

    operation: { type: String, trim: true },
    tarrifName: { type: String, trim: true, default: null },
    speed: { type: Number, default: null },
    ontType: { type: String, trim: true, default: null },
    freeExtender: { type: String, enum: ["Yes", "No", null], default: null },
    extenderType: { type: String, trim: true, default: null },
    extenderNumber: { type: Number, default: 0 },
    itnRelated: { type: [String], default: [] },
    relatedToSubscription: { type: [String], default: [] },
    reason: { type: [String], default: [] },
    subReason: { type: [String], default: [] },
    rootCause: { type: [String], default: [] },
    gaiaCheck: { type: String, enum: ["Yes", "No", null], default: null },
    isQoS: { type: Boolean, default: false },
    scoringKeys: { type: [String], default: [] },
    gaiaContent: { type: String, trim: true, default: null },
    contractDate: { type: Date, default: null },
    inDate: { type: Date, default: null },
    appDate: { type: Date, default: null },
    closeDate: { type: Date, default: null },

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
    },
    teamCompany: {
      type: String,
      required: false,
      default: null
    },
    pisDate: {
      type: Date,
      required: false,
      default: null
    },
    responsible: { type: [String], default: [] },
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
        values: ["Todo", "In Progress", "Closed", "Completed"],
        message: "Status must be one of Todo, In Progress, Closed, or Completed",
      },
      default: "Todo",
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    whomItMayConcern: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "CreatedBy is required"],
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
    evaluationScore: {
      type: Number,
      default: 1,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Add index for better performance on frequently queried fields
taskSchema.index({ slid: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ interviewDate: -1 });
taskSchema.index({ pisDate: -1 });
taskSchema.index({ contractDate: -1 });

export const TaskSchema = mongoose.model("Task", taskSchema);