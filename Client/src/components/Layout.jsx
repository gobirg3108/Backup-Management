import {
  Database,
  HardDrive,
  RefreshCcw,
  Settings,
  ScrollText,
} from "lucide-react";

import { Link } from "react-router-dom";

const menuItems = [
  {
    title: "Dashboard",
    icon: Database,
    path: "/",
  },
  {
    title: "Restore",
    icon: RefreshCcw,
    path: "/restore",
  },
  {
    title: "Logs",
    icon: ScrollText,
    path: "/logs",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}

      <div className="w-64 bg-black text-white p-5">
        <h1 className="text-2xl font-bold mb-10">Mongo Backup</h1>

        <div className="space-y-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <Link
                to={item.path}
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer"
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
