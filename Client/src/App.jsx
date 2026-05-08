import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Restore from "./pages/Restore";
import Settings from "./pages/Settings";
import Logs from "./pages/Logs";

import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route path="/restore" element={<Restore />} />

        <Route path="/settings" element={<Settings />} />
        <Route path="/logs" element={<Logs />} />
      </Routes>
    </Layout>
  );
}

export default App;
