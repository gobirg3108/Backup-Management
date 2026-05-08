import { useEffect, useState } from "react";
import api, { API_URL } from "../services/api";
import toast from "react-hot-toast";
import { Download, Trash2 } from "lucide-react";
import { useSSE } from "../hooks/useSSE";
import ProgressBar from "../components/ProgressBar";

function Dashboard({ backupRunning }) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Progress state
  const [progress, setProgress] = useState(null);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await api.get("/backup");
      setBackups(response.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  // Listen to SSE progress events
  useSSE({
    backup_start: (data) => {
      setProgress({
        percent: data.percent,
        message: data.message,
        status: "running",
      });
    },
    progress: (data) => {
      setProgress({
        percent: data.percent,
        message: data.message,
        status: "running",
      });
    },
    backup_done: (data) => {
      setProgress({ percent: 100, message: data.message, status: "done" });
      fetchBackups();
      setTimeout(() => setProgress(null), 3000);
    },
    backup_error: (data) => {
      setProgress({ percent: 100, message: data.message, status: "error" });
      setTimeout(() => setProgress(null), 5000);
    },
  });

  const createBackup = async () => {
    if (backupRunning) {
      toast.error("A backup is already running. Please wait.");
      return;
    }

    try {
      toast.loading("Starting backup...", { id: "backup" });
      await api.post("/backup/create");
      toast.dismiss("backup");
    } catch (error) {
      const msg = error?.response?.data?.message || "Backup Failed";
      toast.error(msg, { id: "backup" });
    }
  };

  const deleteBackup = async (fileName) => {
    if (!window.confirm("Delete this backup?")) return;

    try {
      toast.loading("Deleting Backup...", { id: "delete" });
      await api.delete(`/backup/${fileName}`);
      toast.success("Backup Deleted", { id: "delete" });
      fetchBackups();
    } catch (error) {
      toast.error("Delete Failed", { id: "delete" });
    }
  };

  const downloadBackup = async (fileName) => {
    try {
      toast.loading("Preparing download...", { id: "download" });

      const response = await api.get(`/backup/download/${fileName}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Download started!", { id: "download" });
    } catch (error) {
      toast.error("Download failed", { id: "download" });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Mongo Backup Monitoring</p>
        </div>
        <button
          onClick={createBackup}
          disabled={backupRunning}
          className="primary-btn disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {backupRunning ? "Backup Running..." : "Create Backup"}
        </button>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="mb-6 bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
            {progress.status === "done"
              ? "Backup Complete"
              : progress.status === "error"
                ? "Backup Failed"
                : "Backup In Progress"}
          </h3>
          <ProgressBar
            percent={progress.percent}
            message={progress.message}
            status={progress.status}
          />
        </div>
      )}

      {/* Auto Backup */}
      {backupRunning && !progress && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          <p className="text-blue-700 text-sm font-medium">
            Auto backup is running in the background...
          </p>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <h2 className="text-gray-500">Total Backups</h2>
          <p className="text-3xl font-bold mt-3">{backups.length}</p>
        </div>
      </div>

      {/* Backup Table */}
      <div className="mt-10 bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-xl font-bold mb-5">Recent Backups</h2>

        {loading ? (
          <p className="text-center text-gray-400 py-10">Loading...</p>
        ) : backups.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No backups yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-3">File Name</th>
                <th className="pb-3">Size</th>
                <th className="pb-3">Date & Time</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup, index) => (
                <tr key={index} className="border-b">
                  <td className="py-4">{backup.fileName}</td>
                  <td>{backup.size}</td>
                  <td>{new Date(backup.createdAt).toLocaleString()}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => downloadBackup(backup.fileName)}
                        className="icon-btn bg-blue-100"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => deleteBackup(backup.fileName)}
                        className="icon-btn bg-red-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
