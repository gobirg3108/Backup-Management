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

    if (days > retentionDays) {
      fs.unlinkSync(filePath);

      console.log(`Deleted Old Backup: ${file}`);
    }
  });
};

export const createMongoBackup = async () => {
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
        fs.mkdirSync(LOCAL_BACKUP_PATH, {
          recursive: true,
        });
      }

      if (!fs.existsSync(ONEDRIVE_BACKUP_PATH)) {
        fs.mkdirSync(ONEDRIVE_BACKUP_PATH, {
          recursive: true,
        });
      }

      console.log("Checking if Database Exists...");

      try {
        const adminDb = mongoose.connection.db.admin();
        const { databases } = await adminDb.listDatabases();
        const dbNames = databases.map((d) => d.name);

        console.log("Available DBs:", dbNames);
        console.log("Configured DB_NAME:", DB_NAME);

        if (!dbNames.includes(DB_NAME)) {
          const errorMessage = `Database "${DB_NAME}" not found in MongoDB`;
          console.log("X " + errorMessage);

          await Log.create({ status: "failed", message: errorMessage });

          if (settings.emailNotification) {
            await sendBackupMail({ status: "failed", errorMessage });
          }
          if (settings.whatsappNotification) {
            await sendWhatsAppMessage({ status: "failed", errorMessage });
          }

          return reject(new Error(errorMessage));
        }

        console.log("DB found. Proceeding with dump...");
      } catch (dbCheckError) {
        console.log("DB existence check failed:", dbCheckError.message);
        return reject(dbCheckError);
      }

      const runDump = () => {
        console.log("Starting Mongo Dump...");

        exec(
          `mongodump --db=${DB_NAME} --excludeCollection=logs --excludeCollection=settings --out="${dumpPath}"`,
          async (error) => {
            if (error) {
              console.log(error);

              return reject(error);
            }

            console.log("Mongo Dump Completed");

            console.log("dumpPath:", dumpPath);
            console.log("DB_NAME:", DB_NAME);
            console.log("dumpPath exists:", fs.existsSync(dumpPath));
            if (fs.existsSync(dumpPath)) {
              console.log("dumpPath contents:", fs.readdirSync(dumpPath));
            }

            const dbDumpPath = path.join(dumpPath, DB_NAME);
            console.log("dbDumpPath:", dbDumpPath);
            console.log("dbDumpPath exists:", fs.existsSync(dbDumpPath));
            if (fs.existsSync(dbDumpPath)) {
              console.log("dbDumpPath contents:", fs.readdirSync(dbDumpPath));
            }

            // Check DB Folder Exists

            if (!fs.existsSync(dbDumpPath)) {
              const errorMessage = `Database "${DB_NAME}" folder not found after dump — DB may not exist`;

              fs.rmSync(dumpPath, {
                recursive: true,
                force: true,
              });

              await Log.create({
                status: "failed",
                message: errorMessage,
              });

              if (settings.emailNotification) {
                await sendBackupMail({ status: "failed", errorMessage });
              }
              if (settings.whatsappNotification) {
                await sendWhatsAppMessage({ status: "failed", errorMessage });
              }

              return reject(new Error(errorMessage));
            }

            const files = fs.readdirSync(dbDumpPath);

            const bsonFiles = files.filter((file) => file.endsWith(".bson"));

            if (bsonFiles.length === 0) {
              const errorMessage = `Database "${DB_NAME}" has no collections — wrong DB name or empty DB`;

              fs.rmSync(dumpPath, {
                recursive: true,
                force: true,
              });

              await Log.create({
                status: "failed",
                message: errorMessage,
              });

              if (settings.emailNotification) {
                await sendBackupMail({ status: "failed", errorMessage });
              }
              if (settings.whatsappNotification) {
                await sendWhatsAppMessage({ status: "failed", errorMessage });
              }

              return reject(new Error(errorMessage));
            }

            const output = fs.createWriteStream(localZipPath);

            const archive = archiver("zip", {
              zlib: { level: 9 },
            });

            archive.on("error", (err) => {
              if (fs.existsSync(localZipPath)) {
                fs.rmSync(localZipPath, {
                  force: true,
                });
              }

              reject(err);
            });

            output.on("close", async () => {
              console.log("ZIP Created Successfully");

              // DELETE TEMP DUMP FOLDER

              fs.rmSync(dumpPath, {
                recursive: true,
                force: true,
              });

              await deleteOldBackups(settings.retentionDays);

              try {
                fs.copyFileSync(localZipPath, oneDriveZipPath);

                console.log("Copied to OneDrive");
              } catch (error) {
                console.log("OneDrive Copy Failed:", error.message);
              }

              if (settings.emailNotification) {
                await sendBackupMail({
                  status: "success",
                  fileName: `${date}.zip`,
                });
              }

              if (settings.whatsappNotification) {
                await sendWhatsAppMessage({
                  status: "success",
                  fileName: `${date}.zip`,
                });
              }

              await Log.create({
                fileName: `${date}.zip`,
                status: "success",
                message: "Backup Created Successfully and Synced",
              });

              resolve({
                success: true,
                file: `${date}.zip`,
              });
            });

            archive.pipe(output);

            // ZIP THE ENTIRE DUMP FOLDER

            archive.directory(dumpPath, false);

            archive.finalize();
          },
        );
      };

      runDump();
    } catch (error) {
      reject(error);
    }
  });
};
