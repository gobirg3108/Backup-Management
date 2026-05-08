import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { Download, Trash2 } from "lucide-react";

function Dashboard() {
  const [backups, setBackups] = useState([]);

  const [loading, setLoading] = useState(false);

  // Fetch Backups

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

  const createBackup = async () => {
    try {
      toast.loading("Creating Backup...", {
        id: "backup",
      });

      await api.post("/backup/create");

      toast.success("Backup Created Successfully", {
        id: "backup",
      });

      fetchBackups();
    } catch (error) {
      console.log(error);

      toast.error("Backup Failed", {
        id: "backup",
      });
    }
  };

  const deleteBackup = async (fileName) => {
    const confirmDelete = window.confirm("Delete this backup?");

    if (!confirmDelete) return;

    try {
      toast.loading("Deleting Backup...", {
        id: "delete",
      });

      await api.delete(`/backup/${fileName}`);

      toast.success("Backup Deleted", {
        id: "delete",
      });

      fetchBackups();
    } catch (error) {
      console.log(error);

      toast.error("Delete Failed", {
        id: "delete",
      });
    }
  };

  const downloadBackup = (fileName) => {
    window.open(`http://localhost:5000/backup/download/${fileName}`);
  };

  return (
    <div>
      {/* Header */}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Mongo Backup Monitoring</p>
        </div>

        <button onClick={createBackup} className="primary-btn">
          Create Backup
        </button>
      </div>

      {/* Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className=" bg-white p-5 rounded-2xl shadow-sm">
          <h2 className="text-gray-500">Total Backups</h2>
          <p className="
            text-3xl
            font-bold
            mt-3
          "
          >
            {backups.length}
          </p>
        </div>
      </div>

      {/* Backup Table */}

      <div
        className="
        mt-10
        bg-white
        rounded-2xl
        shadow-sm
        p-5
      "
      >
        <h2
          className="
          text-xl
          font-bold
          mb-5
        "
        >
          Recent Backups
        </h2>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr
                className="
                text-left
                border-b
              "
              >
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
                        className=" icon-btn  bg-red-100"
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
