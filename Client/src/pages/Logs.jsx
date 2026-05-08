import { useEffect, useState } from "react";
import api from "../services/api";

function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get("/logs");
      setLogs(response.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Backup Logs</h1>
        <button onClick={fetchLogs} className="primary-btn text-sm px-4 py-2">
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        {loading ? (
          <p className="text-center text-gray-400 py-10">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No logs yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-3">Status</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">File</th>
                <th className="pb-3">Message</th>
                <th className="pb-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b">
                  <td className="py-4">
                    {log.status === "success" ? "✅" : "❌"}
                  </td>
                  <td>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        log.backupType === "auto"
                          ? "bg-blue-100 text-blue-700"
                          : log.backupType === "restore"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {log.backupType}
                    </span>
                  </td>
                  <td className="text-sm">{log.fileName || "—"}</td>
                  <td className="text-sm text-gray-600">{log.message}</td>
                  <td className="text-sm">
                    {new Date(log.createdAt).toLocaleString()}
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

export default Logs;
