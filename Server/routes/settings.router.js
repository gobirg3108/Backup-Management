import express from "express";
import Settings from "../models/settings.model.js";
import { startBackupCron } from "../cron/cronManager.js";

const router = express.Router();

// GET SETTINGS
router.get("/", async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE SETTINGS
router.put("/", async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    settings = await Settings.findByIdAndUpdate(settings._id, req.body, {
      new: true,
    });

    await startBackupCron();

    return res.status(200).json({
      success: true,
      message: "Settings Updated",
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
