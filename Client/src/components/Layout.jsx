import {
  Database,
  RefreshCcw,
  Settings,
  ScrollText,
  Menu,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSSE } from "../hooks/useSSE";
import { useState } from "react";
import toast from "react-hot-toast";

const menuItems = [
  { title: "Dashboard", icon: Database, path: "/" },
  { title: "Restore", icon: RefreshCcw, path: "/restore" },
  { title: "Logs", icon: ScrollText, path: "/logs" },
  { title: "Settings", icon: Settings, path: "/settings" },
];

function Layout({ children, onRefresh, setBackupRunning, backupRunning }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useSSE({
    connected: (data) => {
      setBackupRunning(data.backupRunning);
    },
    backup_start: () => {
      setBackupRunning(true);
    },
    backup_done: () => {
      setBackupRunning(false);
      toast.success("Backup completed successfully!");
      onRefresh();
    },
    backup_error: (data) => {
      setBackupRunning(false);
      toast.error("Backup failed: " + data.message);
      onRefresh();
    },
    restore_done: () => {
      toast.success("Database restored successfully!");
      onRefresh();
    },
    restore_error: (data) => {
      toast.error("Restore failed: " + data.message);
    },
    notification: (data) => {
      if (data.channel === "email") {
        data.notifStatus === "sent"
          ? toast.success("Email notification sent!")
          : toast.error("Email notification failed to send");
      } else if (data.channel === "whatsapp") {
        data.notifStatus === "sent"
          ? toast.success("WhatsApp notification sent!")
          : toast.error("WhatsApp notification failed to send");
      }
    },
    warning: (data) => {
      toast("⚠️ " + data.message, { icon: "⚠️" });
    },
    refresh: () => {
      onRefresh();
    },
  });

  const NavLinks = ({ onNavigate }) => (
    <div className="space-y-3">
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        const active = location.pathname === item.path;
        return (
          <Link
            to={item.path}
            key={index}
            onClick={onNavigate}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              active ? "bg-white text-black" : "hover:bg-gray-800 text-white"
            }`}
          >
            <Icon size={20} />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-black text-white p-5 flex flex-col transform transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Mongo Backup</h1>
          <button
            className="md:hidden text-white p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Backup running indicator */}
        {backupRunning && (
          <div className="mb-6 mt-2 flex items-center gap-2 bg-blue-900 rounded-xl px-3 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-300"></span>
            </span>
            <span className="text-xs text-blue-200 font-medium">
              Backup Running...
            </span>
          </div>
        )}

        {!backupRunning && <div className="mb-6" />}

        <NavLinks onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 bg-gray-100 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 bg-black text-white px-4 py-3 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="p-1">
            <Menu size={22} />
          </button>
          <span className="font-bold text-lg">Mongo Backup</span>
          {backupRunning && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-300"></span>
              </span>
              Running...
            </span>
          )}
        </div>

        <div className="flex-1 p-4 sm:p-6 md:p-8">{children}</div>
      </div>
    </div>
  );
}

export default Layout;
