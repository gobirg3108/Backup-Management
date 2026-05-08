import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
    },

    status: {
      type: String,
      enum: ["success", "failed"],
    },

    message: {
      type: String,
    },

    backupType: {
      type: String,
      default: "auto",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Log", logSchema);
