import express from "express";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import multer from "multer";
import unzipper from "unzipper";
import {
  createMongoBackup,
  isBackupRunning,
} from "../services/backup.service.js";
import { sseManager } from "../utils/sse.util.js";
import Log from "../models/log.model.js";

if (!fs.existsSync("./restore")) {
  fs.mkdirSync("./restore", { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./restore"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

const router = express.Router();

const BACKUP_DB_NAME = process.env.BACKUP_DB_NAME;

router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  res.write(
    `data: ${JSON.stringify({ type: "connected", backupRunning: isBackupRunning() })}\n\n`,
  );

  sseManager.addClient(res);

  req.on("close", () => {
    sseManager.removeClient(res);
  });
});

// Create Backup
router.post("/create", async (req, res) => {
  if (isBackupRunning()) {
    return res.status(409).json({
      success: false,
      message: "A backup is already running. Please wait for it to complete.",
    });
  }

  try {
    const result = await createMongoBackup("manual");
    return res.status(200).json({
      success: true,
      message: "Backup Created Successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// List Backups
router.get("/", async (req, res) => {
  try {
    const backupPath = process.env.LOCAL_BACKUP_PATH;

    if (!fs.existsSync(backupPath)) {
      return res.status(200).json({ success: true, data: [] });
    }

    const files = fs.readdirSync(backupPath);
    const backupFiles = files
      .filter((file) => file.endsWith(".zip"))
      .map((file) => {
        const filePath = path.join(backupPath, file);
        const stats = fs.statSync(filePath);
        return {
          fileName: file,
          size: (stats.size / 1024 / 1024).toFixed(2) + " MB",
          createdAt: stats.birthtime,
        };
      });

    backupFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res
      .status(200)
      .json({ success: true, count: backupFiles.length, data: backupFiles });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Download Backup
router.get("/download/:fileName", async (req, res) => {
  try {
    const safeFileName = path.basename(req.params.fileName);
    const filePath = path.join(process.env.LOCAL_BACKUP_PATH, safeFileName);

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "Backup File Not Found" });
    }

    return res.download(filePath);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Restore Backup
router.post("/restore", upload.single("backup"), async (req, res) => {
  if (isBackupRunning()) {
    return res.status(409).json({
      success: false,
      message: "A backup is currently running. Please wait before restoring.",
    });
  }

  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Backup File Required" });
  }

  res.status(200).json({ success: true, message: "Restore started" });

  const zipPath = req.file.path;
  const extractPath = `./restore/extracted-${Date.now()}`;

  try {
    sseManager.broadcast({
      type: "restore_start",
      percent: 0,
      message: "Starting restore...",
    });

    sseManager.broadcast({
      type: "restore_progress",
      percent: 10,
      message: "Extracting ZIP...",
    });

    await fs
      .createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();

    sseManager.broadcast({
      type: "restore_progress",
      percent: 35,
      message: "Verifying backup contents...",
    });

    const dbFolder = path.join(extractPath, BACKUP_DB_NAME);

    if (!fs.existsSync(dbFolder)) {
      fs.rmSync(zipPath, { force: true });
      fs.rmSync(extractPath, { recursive: true, force: true });

      await Log.create({
        status: "failed",
        message: `Invalid backup — folder "${BACKUP_DB_NAME}" not found in ZIP`,
        backupType: "restore",
      });
      sseManager.broadcast({
        type: "restore_error",
        percent: 100,
        message: `Invalid backup file — "${BACKUP_DB_NAME}" folder not found`,
      });
      return;
    }

    sseManager.broadcast({
      type: "restore_progress",
      percent: 50,
      message: "Running mongorestore...",
    });

    exec(
      `mongorestore --drop --db=${BACKUP_DB_NAME} "${dbFolder}"`,
      async (error) => {
        fs.rmSync(zipPath, { force: true });
        fs.rmSync(extractPath, { recursive: true, force: true });

        if (error) {
          await Log.create({
            status: "failed",
            message: "Restore failed: " + error.message,
            backupType: "restore",
          });
          sseManager.broadcast({
            type: "restore_error",
            percent: 100,
            message: "Restore failed: " + error.message,
          });
          return;
        }

        sseManager.broadcast({
          type: "restore_progress",
          percent: 90,
          message: "Finalizing restore...",
        });

        await Log.create({
          status: "success",
          message: "Database restored successfully",
          backupType: "restore",
        });

        sseManager.broadcast({
          type: "restore_done",
          percent: 100,
          message: "Database restored successfully!",
        });
        sseManager.broadcast({ type: "refresh" });
      },
    );
  } catch (error) {
    if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
    if (fs.existsSync(extractPath))
      fs.rmSync(extractPath, { recursive: true, force: true });

    await Log.create({
      status: "failed",
      message: error.message,
      backupType: "restore",
    });
    sseManager.broadcast({
      type: "restore_error",
      percent: 100,
      message: error.message,
    });
  }
});

// Delete Backup
router.delete("/:fileName", async (req, res) => {
  try {
    const safeFileName = path.basename(req.params.fileName);
    const filePath = path.join(process.env.LOCAL_BACKUP_PATH, safeFileName);

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "Backup File Not Found" });
    }

    fs.unlinkSync(filePath);

    return res
      .status(200)
      .json({ success: true, message: "Backup Deleted Successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Backup Status
router.get("/status", (req, res) => {
  return res
    .status(200)
    .json({ success: true, backupRunning: isBackupRunning() });
});

export default router;
