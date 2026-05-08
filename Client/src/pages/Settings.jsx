import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import TimePicker from "react-time-picker";

function Settings() {
  const [settings, setSettings] = useState({
    backupTime: "",
    retentionDays: 30,
    emailNotification: true,
    whatsappNotification: true,
  });

  const [time, setTime] = useState("19:30");

  const fetchSettings = async () => {
    try {
      const response = await api.get("/settings");
      const data = response.data.data;
      setSettings(data);

      const parts = data.backupTime.split(" ");
      if (parts.length >= 2) {
        const h = parts[1].padStart(2, "0");
        const m = parts[0].padStart(2, "0");
        setTime(`${h}:${m}`);
      }
    } catch (error) {
      toast.error("Failed to load settings");
      console.log(error);
    }
  };

  const convertToCron = (value) => {
    const [hour, minute] = value.split(":");
    return `${parseInt(minute)} ${parseInt(hour)} * * *`;
  };

  const saveSettings = async () => {
    try {
      toast.loading("Saving Settings...", { id: "settings" });

      await api.put("/settings", {
        ...settings,
        backupTime: convertToCron(time),
      });

      toast.success("Settings Updated", { id: "settings" });
    } catch (error) {
      const msg = error?.response?.data?.message || "Update Failed";
      toast.error(msg, { id: "settings" });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="bg-white p-8 rounded-2xl shadow-sm max-w-2xl space-y-6">
        {/* Backup Time */}
        <div>
          <label className="block mb-2 font-medium">Backup Cron Time</label>
          <div className="border rounded-2xl px-4 py-3 bg-gray-50 focus-within:border-black transition">
            <TimePicker
              onChange={setTime}
              value={time}
              disableClock={true}
              clearIcon={null}
              clockIcon={null}
              format="HH:mm"
              className="custom-time-picker"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Cron: {convertToCron(time || "19:30")}
          </p>
        </div>

        {/* Retention Days */}
        <div>
          <label className="block mb-2 font-medium">Retention Days</label>
          <input
            type="number"
            min="1"
            max="365"
            value={settings.retentionDays}
            onChange={(e) =>
              setSettings({
                ...settings,
                retentionDays: Number(e.target.value),
              })
            }
            className="w-full border p-3 rounded-xl"
          />
        </div>

        {/* Email Notification */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="emailNotif"
            checked={settings.emailNotification}
            onChange={(e) =>
              setSettings({ ...settings, emailNotification: e.target.checked })
            }
          />
          <label htmlFor="emailNotif">Email Notifications</label>
        </div>

        {/* WhatsApp Notification */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="waNotif"
            checked={settings.whatsappNotification}
            onChange={(e) =>
              setSettings({
                ...settings,
                whatsappNotification: e.target.checked,
              })
            }
          />
          <label htmlFor="waNotif">WhatsApp Notifications</label>
        </div>

        <button onClick={saveSettings} className="primary-btn">
          Save Settings
        </button>
      </div>
    </div>
  );
}

export default Settings;
