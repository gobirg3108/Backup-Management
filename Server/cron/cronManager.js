import cron from "node-cron";
import Settings from "../models/settings.model.js";
import {
  createMongoBackup,
  isBackupRunning,
} from "../services/backup.service.js";
import { retryOperation } from "../utils/retry.util.js";

let backupTask = null;

export const startBackupCron = async () => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});

    if (backupTask) {
      backupTask.stop();
      console.log("Old Cron Stopped");
    }

    if (!cron.validate(settings.backupTime)) {
      console.error("Invalid cron expression:", settings.backupTime);
      return;
    }

    console.log(`Cron Started: ${settings.backupTime}`);

    backupTask = cron.schedule(settings.backupTime, async () => {
      console.log("Running Auto Backup...");

      if (isBackupRunning()) {
        console.log("Backup already running — skipping auto backup this cycle");
        return;
      }

      try {
        const result = await retryOperation(
          () => createMongoBackup("auto"),
          3,
          5000,
        );
        console.log("Auto Backup Success:", result.file);
      } catch (error) {
        console.log("Auto Backup Failed After Retries:", error.message);
      }
    });
  } catch (error) {
    console.log("Cron Manager Error:", error.message);
  }
};
