import fs from "fs";
import path from "path";
import { exec } from "child_process";
import archiver from "archiver";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { sendBackupMail } from "./mail.service.js";
import { sendWhatsAppMessage } from "./whatsapp.service.js";
import Settings from "../models/settings.model.js";
import Log from "../models/log.model.js";
import { sseManager } from "../utils/sse.util.js";

dotenv.config();

const LOCAL_BACKUP_PATH = process.env.LOCAL_BACKUP_PATH;
const ONEDRIVE_BACKUP_PATH = process.env.ONEDRIVE_BACKUP_PATH;
const DB_NAME = process.env.BACKUP_DB_NAME;

// Backup Lock
let backupRunning = false;
export const isBackupRunning = () => backupRunning;

// Helpers
const sendProgress = (percent, message, type = "progress") => {
  sseManager.broadcast({ type, percent, message });
};

const deleteOldBackups = async (retentionDays) => {
  if (!fs.existsSync(LOCAL_BACKUP_PATH)) return;
  const files = fs.readdirSync(LOCAL_BACKUP_PATH);
  const now = Date.now();
  files.forEach((file) => {
    if (!file.endsWith(".zip")) return;
    const filePath = path.join(LOCAL_BACKUP_PATH, file);
    const stats = fs.statSync(filePath);
    const days = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
    if (days > Number(retentionDays)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted Old Backup: ${file}`);
    }
  });
};

// Main Backup
export const createMongoBackup = async (backupType = "auto") => {
  if (backupRunning) {
    throw new Error("A backup is already in progress. Please wait.");
  }

  backupRunning = true;
  sendProgress(0, "Starting backup...", "backup_start");

  return new Promise(async (resolve, reject) => {
    const done = async (err, result) => {
      backupRunning = false;
      if (err) {
        sendProgress(100, err.message, "backup_error");
        sseManager.broadcast({ type: "refresh" });
        reject(err);
      } else {
        sendProgress(100, "Backup completed successfully!", "backup_done");
        sseManager.broadcast({ type: "refresh" });
        resolve(result);
      }
    };

    try {
      sendProgress(5, "Loading settings...");
      let settings = await Settings.findOne();
      if (!settings) settings = await Settings.create({});

      const date = new Date().toISOString().replace(/:/g, "-");
      const dumpPath = path.join(LOCAL_BACKUP_PATH, date);
      const localZipPath = path.join(LOCAL_BACKUP_PATH, `${date}.zip`);
      const oneDriveZipPath = path.join(ONEDRIVE_BACKUP_PATH, `${date}.zip`);

      sendProgress(10, "Checking backup directories...");
      if (!fs.existsSync(LOCAL_BACKUP_PATH)) {
        fs.mkdirSync(LOCAL_BACKUP_PATH, { recursive: true });
      }
      if (!fs.existsSync(ONEDRIVE_BACKUP_PATH)) {
        fs.mkdirSync(ONEDRIVE_BACKUP_PATH, { recursive: true });
      }

      sendProgress(15, "Verifying database exists...");
      try {
        const adminDb = mongoose.connection.db.admin();
        const { databases } = await adminDb.listDatabases();
        const dbNames = databases.map((d) => d.name);

        if (!dbNames.includes(DB_NAME)) {
          const errorMessage = `Database "${DB_NAME}" not found in MongoDB`;
          await Log.create({
            status: "failed",
            message: errorMessage,
            backupType,
          });

          if (settings.emailNotification) {
            const ok = await sendBackupMail({
              status: "failed",
              dbName: DB_NAME,
              errorMessage,
            });
            sseManager.broadcast({
              type: "notification",
              channel: "email",
              notifStatus: ok ? "sent" : "failed",
            });
          }
          if (settings.whatsappNotification) {
            const ok = await sendWhatsAppMessage({
              status: "failed",
              dbName: DB_NAME,
              errorMessage,
            });
            sseManager.broadcast({
              type: "notification",
              channel: "whatsapp",
              notifStatus: ok ? "sent" : "failed",
            });
          }
          return done(new Error(errorMessage));
        }
      } catch (dbCheckError) {
        return done(dbCheckError);
      }

      sendProgress(25, "Running mongodump...");
      exec(`mongodump --db=${DB_NAME} --out="${dumpPath}"`, async (error) => {
        if (error) return done(error);

        sendProgress(50, "Dump complete. Verifying files...");
        const dbDumpPath = path.join(dumpPath, DB_NAME);

        if (!fs.existsSync(dbDumpPath)) {
          const errorMessage = "Dump folder not found — DB may be empty";
          fs.rmSync(dumpPath, { recursive: true, force: true });
          await Log.create({
            status: "failed",
            message: errorMessage,
            backupType,
          });
          return done(new Error(errorMessage));
        }

        const dumpFiles = fs.readdirSync(dbDumpPath);
        if (!dumpFiles.some((f) => f.endsWith(".bson"))) {
          const errorMessage = `Database "${DB_NAME}" has no collections`;
          fs.rmSync(dumpPath, { recursive: true, force: true });
          await Log.create({
            status: "failed",
            message: errorMessage,
            backupType,
          });
          return done(new Error(errorMessage));
        }

        sendProgress(58, "Creating ZIP archive...");
        const output = fs.createWriteStream(localZipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        let fileCount = 0;
        archive.on("entry", () => {
          fileCount++;
          const p = Math.min(78, 58 + fileCount * 2);
          sendProgress(p, `Compressing... (${fileCount} files)`);
        });

        archive.on("error", (err) => {
          if (fs.existsSync(localZipPath))
            fs.rmSync(localZipPath, { force: true });
          done(err);
        });

        output.on("close", async () => {
          sendProgress(82, "ZIP created. Cleaning temp files...");
          fs.rmSync(dumpPath, { recursive: true, force: true });
          await deleteOldBackups(settings.retentionDays);

          sendProgress(87, "Syncing to OneDrive...");
          let oneDriveSynced = true;
          try {
            fs.copyFileSync(localZipPath, oneDriveZipPath);
          } catch (err) {
            oneDriveSynced = false;
            console.log("OneDrive Copy Failed:", err.message);
            sseManager.broadcast({
              type: "warning",
              message: "OneDrive sync failed: " + err.message,
            });
          }

          const fileSizeBytes = fs.statSync(localZipPath).size;
          const fileSize = (fileSizeBytes / 1024 / 1024).toFixed(2) + " MB";

          sendProgress(92, "Sending notifications...");
          const freshSettings = await Settings.findOne();

          if (freshSettings.emailNotification) {
            const ok = await sendBackupMail({
              status: "success",
              fileName: `${date}.zip`,
              fileSize,
              dbName: DB_NAME,
            });
            sseManager.broadcast({
              type: "notification",
              channel: "email",
              notifStatus: ok ? "sent" : "failed",
            });
          }

          if (freshSettings.whatsappNotification) {
            const ok = await sendWhatsAppMessage({
              status: "success",
              fileName: `${date}.zip`,
              fileSize,
              dbName: DB_NAME,
            });
            sseManager.broadcast({
              type: "notification",
              channel: "whatsapp",
              notifStatus: ok ? "sent" : "failed",
            });
          }

          sendProgress(97, "Saving log entry...");
          await Log.create({
            fileName: `${date}.zip`,
            status: "success",
            message: oneDriveSynced
              ? "Backup created and synced to OneDrive"
              : "Backup created (OneDrive sync failed)",
            backupType,
          });

          done(null, { success: true, file: `${date}.zip`, fileSize });
        });

        archive.pipe(output);
        archive.directory(dumpPath, false);
        archive.finalize();
      });
    } catch (error) {
      done(error);
    }
  });
};
