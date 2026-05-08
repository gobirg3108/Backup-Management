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

dotenv.config();

const LOCAL_BACKUP_PATH = process.env.LOCAL_BACKUP_PATH;

const ONEDRIVE_BACKUP_PATH = process.env.ONEDRIVE_BACKUP_PATH;

const DB_NAME = process.env.BACKUP_DB_NAME;

const deleteOldBackups = async (retentionDays) => {
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

// backupType: "auto" | "manual"
export const createMongoBackup = async (backupType = "auto") => {
  return new Promise(async (resolve, reject) => {
    try {
      let settings = await Settings.findOne();

      if (!settings) {
        settings = await Settings.create({});
      }

      const date = new Date().toISOString().replace(/:/g, "-");
      const dumpPath = path.join(LOCAL_BACKUP_PATH, date);
      const localZipPath = path.join(LOCAL_BACKUP_PATH, `${date}.zip`);
      const oneDriveZipPath = path.join(ONEDRIVE_BACKUP_PATH, `${date}.zip`);

      if (!fs.existsSync(LOCAL_BACKUP_PATH)) {
        fs.mkdirSync(LOCAL_BACKUP_PATH, { recursive: true });
      }

      if (!fs.existsSync(ONEDRIVE_BACKUP_PATH)) {
        fs.mkdirSync(ONEDRIVE_BACKUP_PATH, { recursive: true });
      }

      // Check if DB exists before dumping
      console.log("Checking if Database Exists...");
      try {
        const adminDb = mongoose.connection.db.admin();
        const { databases } = await adminDb.listDatabases();
        const dbNames = databases.map((d) => d.name);

        if (!dbNames.includes(DB_NAME)) {
          const errorMessage = `Database "${DB_NAME}" not found in MongoDB`;
          console.log("X " + errorMessage);

          await Log.create({
            status: "failed",
            message: errorMessage,
            backupType,
          });

          if (settings.emailNotification) {
            await sendBackupMail({
              status: "failed",
              dbName: DB_NAME,
              errorMessage,
            });
          }
          if (settings.whatsappNotification) {
            await sendWhatsAppMessage({
              status: "failed",
              dbName: DB_NAME,
              errorMessage,
            });
          }

          return reject(new Error(errorMessage));
        }

        console.log(`DB "${DB_NAME}" found. Proceeding with dump...`);
      } catch (dbCheckError) {
        console.log("DB existence check failed:", dbCheckError.message);
        return reject(dbCheckError);
      }

      // Run mongodump
      console.log("Starting Mongo Dump...");

      exec(`mongodump --db=${DB_NAME} --out="${dumpPath}"`, async (error) => {
        if (error) {
          console.log("Mongo Dump Error:", error.message);
          return reject(error);
        }

        console.log("Mongo Dump Completed");

        const dbDumpPath = path.join(dumpPath, DB_NAME);

        // Check DB folder exists after dump
        if (!fs.existsSync(dbDumpPath)) {
          const errorMessage = `Dump folder not found after backup — DB may be empty`;

          fs.rmSync(dumpPath, { recursive: true, force: true });

          await Log.create({
            status: "failed",
            message: errorMessage,
            backupType,
          });

          if (settings.emailNotification) {
            await sendBackupMail({
              status: "failed",
              dbName: DB_NAME,
              errorMessage,
            });
          }
          if (settings.whatsappNotification) {
            await sendWhatsAppMessage({
              status: "failed",
              dbName: DB_NAME,
              errorMessage,
            });
          }

          return reject(new Error(errorMessage));
        }

        // Check BSON files exist (means collections exist)
        const files = fs.readdirSync(dbDumpPath);
        const bsonFiles = files.filter((file) => file.endsWith(".bson"));

        if (bsonFiles.length === 0) {
          const errorMessage = `Database "${DB_NAME}" has no collections — empty DB`;

          fs.rmSync(dumpPath, { recursive: true, force: true });

          await Log.create({
            status: "failed",
            message: errorMessage,
            backupType,
          });

          if (settings.emailNotification) {
            await sendBackupMail({
              status: "failed",
              dbName: DB_NAME,
              errorMessage,
            });
          }
          if (settings.whatsappNotification) {
            await sendWhatsAppMessage({
              status: "failed",
              dbName: DB_NAME,
              errorMessage,
            });
          }

          return reject(new Error(errorMessage));
        }

        // Create ZIP
        const output = fs.createWriteStream(localZipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.on("error", (err) => {
          if (fs.existsSync(localZipPath)) {
            fs.rmSync(localZipPath, { force: true });
          }
          reject(err);
        });

        output.on("close", async () => {
          console.log("ZIP Created Successfully");

          // Cleanup temp dump folder
          fs.rmSync(dumpPath, { recursive: true, force: true });

          await deleteOldBackups(settings.retentionDays);

          // Copy to OneDrive
          try {
            fs.copyFileSync(localZipPath, oneDriveZipPath);
            console.log("Copied to OneDrive");
          } catch (err) {
            console.log("OneDrive Copy Failed:", err.message);
          }

          // Get file size
          const fileSizeBytes = fs.statSync(localZipPath).size;
          const fileSize = (fileSizeBytes / 1024 / 1024).toFixed(2) + " MB";

          // Notifications
          if (settings.emailNotification) {
            await sendBackupMail({
              status: "success",
              fileName: `${date}.zip`,
              fileSize,
              dbName: DB_NAME,
            });
          }
          if (settings.whatsappNotification) {
            await sendWhatsAppMessage({
              status: "success",
              fileName: `${date}.zip`,
              fileSize,
              dbName: DB_NAME,
            });
          }

          await Log.create({
            fileName: `${date}.zip`,
            status: "success",
            message: "Backup Created Successfully and Synced",
            backupType,
          });

          resolve({ success: true, file: `${date}.zip` });
        });

        archive.pipe(output);
        archive.directory(dumpPath, false);
        archive.finalize();
      });
    } catch (error) {
      reject(error);
    }
  });
};
