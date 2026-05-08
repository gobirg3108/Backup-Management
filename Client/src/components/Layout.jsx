import {
  Database,
  HardDrive,
  RefreshCcw,
  Settings,
  ScrollText,
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-black text-white p-5 flex flex-col">
        <h1 className="text-2xl font-bold mb-2">Mongo Backup</h1>

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

        <div className="space-y-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                to={item.path}
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  active
                    ? "bg-white text-black"
                    : "hover:bg-gray-800 text-white"
                }`}
              >
                <Icon size={20} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 bg-gray-100">{children}</div>
    </div>
  );
}

export default Layout;
