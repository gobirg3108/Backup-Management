import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    backupTime: {
      type: String,
      default: "30 19 * * *", // Every Day 07:30 PM
    },

    retentionDays: {
      type: Number,
      default: 30,
    },

    emailNotification: {
      type: Boolean,
      default: true,
    },

    whatsappNotification: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Settings", settingsSchema);
