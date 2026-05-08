import express from "express";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import multer from "multer";
import unzipper from "unzipper";
import { createMongoBackup } from "../services/backup.service.js";

if (!fs.existsSync("./restore")) {
  fs.mkdirSync("./restore", {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./restore");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

const router = express.Router();

const BACKUP_DB_NAME = process.env.BACKUP_DB_NAME;

// Create Backup
router.post("/create", async (req, res) => {
  try {
    const result = await createMongoBackup("manual");

    return res.status(200).json({
      success: true,
      message: "Backup Created Successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const backupPath = process.env.LOCAL_BACKUP_PATH;

    if (!fs.existsSync(backupPath)) {
      return res.status(200).json({
        success: true,
        data: [],
      });
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

    return res.status(200).json({
      success: true,
      count: backupFiles.length,
      data: backupFiles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/download/:fileName", async (req, res) => {
  try {
    const { fileName } = req.params;

    const filePath = path.join(process.env.LOCAL_BACKUP_PATH, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Backup File Not Found",
      });
    }

    return res.download(filePath);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/restore", upload.single("backup"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Backup File Required",
      });
    }

    const zipPath = req.file.path;

    const extractPath = `./restore/extracted-${Date.now()}`;

    // Extract ZIP
    await fs
      .createReadStream(zipPath)
      .pipe(
        unzipper.Extract({
          path: extractPath,
        }),
      )
      .promise();

    // Find DB Folder by exact DB name
    const dbFolder = path.join(extractPath, BACKUP_DB_NAME);

    if (!fs.existsSync(dbFolder)) {
      fs.rmSync(zipPath, { force: true });
      fs.rmSync(extractPath, { recursive: true, force: true });

      return res.status(400).json({
        success: false,
        message: `Invalid backup file — folder "${BACKUP_DB_NAME}" not found inside ZIP`,
      });
    }

    // Restore MongoDB
    exec(
      `mongorestore --drop --db=${BACKUP_DB_NAME} "${dbFolder}"`,
      (error) => {
        if (error) {
          fs.rmSync(zipPath, {
            force: true,
          });

          fs.rmSync(extractPath, {
            recursive: true,
            force: true,
          });

          return res.status(500).json({
            success: false,
            message: "Restore Failed",
            error: error.message,
          });
        }

        // Cleanup

        fs.rmSync(zipPath, {
          force: true,
        });

        fs.rmSync(extractPath, {
          recursive: true,
          force: true,
        });

        return res.status(200).json({
          success: true,
          message: "Database Restored Successfully",
        });
      },
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.delete("/:fileName", async (req, res) => {
  try {
    const { fileName } = req.params;

    const filePath = path.join(process.env.LOCAL_BACKUP_PATH, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Backup File Not Found",
      });
    }

    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      message: "Backup Deleted Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
export default router;
