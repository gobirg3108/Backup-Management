import { useState } from "react";

import toast from "react-hot-toast";

import api from "../services/api";

function Restore() {
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);

  // Restore Backup
  const handleRestore = async () => {
    if (!file) {
      return toast.error("Select Backup File");
    }

    try {
      setLoading(true);

      toast.loading("Restoring Backup...", {
        id: "restore",
      });

      const formData = new FormData();

      formData.append("backup", file);

      await api.post("/backup/restore", formData);

      toast.success("Database Restored Successfully", {
        id: "restore",
      });

      setFile(null);
    } catch (error) {
      console.log(error);

      toast.error("Restore Failed", {
        id: "restore",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Restore Backup</h1>

        <p className="text-gray-500">Upload ZIP backup file</p>
      </div>

      {/* Card */}

      <div
        className="
        bg-white
        p-8
        rounded-2xl
        shadow-sm
        max-w-xl
      "
      >
        <label
          className="
    flex
    items-center
    justify-center
    w-full
    border-2
    border-dashed
    border-gray-300
    rounded-2xl
    p-8
    cursor-pointer
    hover:border-black
    hover:bg-gray-50
    transition
  "
        >
          <input
            type="file"
            accept=".zip"
            hidden
            onChange={(e) => setFile(e.target.files[0])}
          />

          <div className="text-center">
            <p
              className="
      text-lg
      font-medium
    "
            >
              Click to Upload ZIP
            </p>

            <p
              className="
      text-sm
      text-gray-500
      mt-2
    "
            >
              Restore MongoDB Backup
            </p>
          </div>
        </label>

        {file && (
          <p
            className="
            mt-4
            text-sm
            text-gray-600
          "
          >
            Selected: {file.name}
          </p>
        )}

        <button
          onClick={handleRestore}
          disabled={loading}
          className="
    primary-btn
    mt-6
    disabled:opacity-50
  "
        >
          {loading ? "Restoring..." : "Restore Backup"}
        </button>
      </div>
    </div>
  );
}

export default Restore;
