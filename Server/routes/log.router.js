import express from "express";
import Log from "../models/log.model.js";
const router = express.Router();

// GET LOGS
router.get("/", async (req, res) => {
  try {
    const logs = await Log.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
