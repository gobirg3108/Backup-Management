import cron from "node-cron";
import Settings from "../models/settings.model.js";
import { createMongoBackup } from "../services/backup.service.js";
import { retryOperation } from "../utils/retry.util.js";

let backupTask = null;

// START CRON
export const startBackupCron = async () => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    if (backupTask) {
      backupTask.stop();

      console.log("Old Cron Stopped");
    }

    console.log(`Cron Started: ${settings.backupTime}`);

    backupTask = cron.schedule(
      settings.backupTime,

      async () => {
        console.log("Running Auto Backup...");

        try {
          const result = await retryOperation(
            () => createMongoBackup("auto"),
            3,
            5000,
          );

          console.log("Backup Success:", result.file);
        } catch (error) {
          console.log("Backup Failed After Retries:", error.message);
        }
      },
    );
  } catch (error) {
    console.log("Cron Manager Error:", error.message);
  }
};
