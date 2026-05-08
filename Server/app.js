import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import { startBackupCron } from "./cron/cronManager.js";
import settingsRouter from "./routes/settings.router.js";
import logRouter from "./routes/log.router.js";

// Routes
import backupRouter from "./routes/backup.router.js";

dotenv.config();

const { PORT, MONGO_URI, BACKUP_DB_NAME ,PROJECT_DB} = process.env;

const app = express();

app.use(express.json());
app.use(cors());

app.use("/backup", backupRouter);
app.use("/settings", settingsRouter);
app.use("/logs", logRouter);

mongoose
  .connect(`${MONGO_URI}${PROJECT_DB}`)
  .then(() => {
    console.log("MongoDB Connected 👌");

    startBackupCron();
  })
  .catch((err) => {
    console.error("MongoDB Connection Failed 😬", err);
  });

app.listen(PORT, () => {
  console.log(`Server Running on Port ${PORT}`);
});
