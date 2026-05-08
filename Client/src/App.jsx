import { useState, useCallback } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Restore from "./pages/Restore";
import Settings from "./pages/Settings";
import Logs from "./pages/Logs";
import { Routes, Route } from "react-router-dom";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [backupRunning, setBackupRunning] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <Layout
      onRefresh={triggerRefresh}
      backupRunning={backupRunning}
      setBackupRunning={setBackupRunning}
    >
      <Routes>
        <Route
          path="/"
          element={<Dashboard key={refreshKey} backupRunning={backupRunning} />}
        />
        <Route
          path="/restore"
          element={<Restore backupRunning={backupRunning} />}
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="/logs" element={<Logs key={refreshKey} />} />
      </Routes>
    </Layout>
  );
}

export default App;
