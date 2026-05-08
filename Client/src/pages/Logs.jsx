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
      <h1
        className="
        text-3xl
        font-bold
        mb-8
      "
      >
        Backup Logs
      </h1>

      <div
        className="
        bg-white
        rounded-2xl
        shadow-sm
        p-5
      "
      >
        {loading ? (
          <p className="text-center text-gray-400 py-10">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No logs yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr
                className="
              text-left
              border-b
            "
              >
                <th className="pb-3">Status</th>

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

                  <td>{log.fileName}</td>

                  <td>{log.message}</td>

                  <td>{new Date(log.createdAt).toLocaleString()}</td>
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
