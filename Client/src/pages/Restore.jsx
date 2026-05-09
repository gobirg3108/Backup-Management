import { useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { useSSE } from "../hooks/useSSE";
import ProgressBar from "../components/ProgressBar";

function Restore({ backupRunning }) {
  const [file, setFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(null);

  useSSE({
    restore_start: (data) => {
      setRestoring(true);
      setProgress({
        percent: data.percent,
        message: data.message,
        status: "running",
      });
    },
    restore_progress: (data) => {
      setProgress({
        percent: data.percent,
        message: data.message,
        status: "running",
      });
    },
    restore_done: (data) => {
      setRestoring(false);
      setFile(null);
      setProgress({ percent: 100, message: data.message, status: "done" });
      setTimeout(() => setProgress(null), 4000);
    },
    restore_error: (data) => {
      setRestoring(false);
      setProgress({ percent: 100, message: data.message, status: "error" });
      setTimeout(() => setProgress(null), 5000);
    },
  });

  const handleRestore = async () => {
    if (!file) return toast.error("Select a backup ZIP file");

    if (backupRunning) {
      return toast.error("A backup is running. Please wait before restoring.");
    }

    try {
      const formData = new FormData();
      formData.append("backup", file);
      // Server responds immediately, progress comes via SSE
      await api.post("/backup/restore", formData);
    } catch (error) {
      const msg = error?.response?.data?.message || "Restore Failed";
      toast.error(msg);
      setRestoring(false);
    }
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Restore Backup</h1>
        <p className="text-gray-500 text-sm sm:text-base">
          Upload a ZIP backup file to restore your database
        </p>
      </div>

      <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm w-full max-w-xl">
        {/* Upload area */}
        <label
          className={`flex items-center justify-center w-full border-2 border-dashed rounded-2xl p-6 sm:p-8 transition ${
            restoring
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300 cursor-pointer hover:border-black hover:bg-gray-50"
          }`}
        >
          <input
            type="file"
            accept=".zip"
            hidden
            disabled={restoring}
            onChange={(e) => setFile(e.target.files[0])}
          />
          <div className="text-center">
            <p className="text-base sm:text-lg font-medium">
              Click to Upload ZIP
            </p>
            <p className="text-sm text-gray-500 mt-2">Restore MongoDB Backup</p>
          </div>
        </label>

        {file && (
          <p className="mt-4 text-sm text-gray-600">
            Selected: <span className="font-medium break-all">{file.name}</span>
          </p>
        )}

        {/* Progress bar */}
        {progress && (
          <div className="mt-5">
            <ProgressBar
              percent={progress.percent}
              message={progress.message}
              status={progress.status}
            />
          </div>
        )}

        <button
          onClick={handleRestore}
          disabled={restoring || backupRunning}
          className="primary-btn mt-6 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {restoring ? "Restoring..." : "Restore Backup"}
        </button>

        {backupRunning && !restoring && (
          <p className="mt-3 text-sm text-orange-500">
            ⚠️ A backup is currently running. Restore is disabled.
          </p>
        )}
      </div>
    </div>
  );
}

export default Restore;
