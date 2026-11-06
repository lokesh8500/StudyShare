
const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    fileName: {
      type: String,
      required: true
    },

    storedName: {
      type: String,
      required: true
    },

    fileType: {
      type: String,
      required: true
    },

    fileSize: {
      type: Number,
      required: true
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    downloads: {
      type: Number,
      default: 0
    },

    aiSummary: {
      content: {
        overview: {
          type: String,
          default: ""
        },
        mainSummary: {
          type: String,
          default: ""
        },
        importantConcepts: {
          type: [String],
          default: []
        },
        keyDefinitions: {
          type: [{
            term: { type: String },
            definition: { type: String }
          }],
          default: []
        },
        importantPoints: {
          type: [String],
          default: []
        },
        conclusion: {
          type: String,
          default: ""
        }
      },
      generatedAt: {
        type: Date
      },
      model: {
        type: String,
        default: ""
      },
      version: {
        type: Number,
        default: 1
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
