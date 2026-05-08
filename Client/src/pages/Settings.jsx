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

  const [time, setTime] = useState("01:15");

  // Fetch Settings

  const fetchSettings = async () => {
    try {
      const response = await api.get("/settings");

      setSettings(response.data.data);

      const cron = response.data.data.backupTime;

      const parts = cron.split(" ");

      setTime(`${parts[1].padStart(2, "0")}:${parts[0].padStart(2, "0")}`);
    } catch (error) {
      console.log(error);
    }
  };

  const convertToCron = (value) => {
    const [hour, minute] = value.split(":");

    return `
${parseInt(minute)}
${parseInt(hour)}
* * *
`
      .replace(/\n/g, " ")
      .trim();
  };
  // Save Settings

  const saveSettings = async () => {
    try {
      toast.loading("Saving Settings...", {
        id: "settings",
      });

      await api.put("/settings", {
        ...settings,

        backupTime: convertToCron(time),
      });

      toast.success("Settings Updated", {
        id: "settings",
      });
    } catch (error) {
      console.log(error);

      toast.error("Update Failed", {
        id: "settings",
      });
    }
  };

  useEffect(() => {
    fetchSettings();
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
        Settings
      </h1>

      <div
        className="
        bg-white
        p-8
        rounded-2xl
        shadow-sm
        max-w-2xl
        space-y-6
      "
      >
        {/* Backup Time */}

        <div>
          <label
            className="
            block
            mb-2
            font-medium
          "
          >
            Backup Cron Time
          </label>

          <div
            className="
  border
  rounded-2xl
  px-4
  py-3
  bg-gray-50
  focus-within:border-black
  transition
"
          >
            <TimePicker
              onChange={setTime}
              value={time}
              disableClock={true}
              clearIcon={null}
              clockIcon={null}
              format="hh:mm a"
              className="custom-time-picker"
            />
          </div>
        </div>

        {/* Retention Days */}

        <div>
          <label
            className="
            block
            mb-2
            font-medium
          "
          >
            Retention Days
          </label>

          <input
            type="number"
            value={settings.retentionDays}
            onChange={(e) =>
              setSettings({
                ...settings,
                retentionDays: e.target.value,
              })
            }
            className="
              w-full
              border
              p-3
              rounded-xl
            "
          />
        </div>

        {/* Email Notification */}

        <div
          className="
          flex
          items-center
          gap-3
        "
        >
          <input
            type="checkbox"
            checked={settings.emailNotification}
            onChange={(e) =>
              setSettings({
                ...settings,
                emailNotification: e.target.checked,
              })
            }
          />

          <label>Email Notifications</label>
        </div>

        {/* WhatsApp Notification */}

        <div
          className="
          flex
          items-center
          gap-3
        "
        >
          <input
            type="checkbox"
            checked={settings.whatsappNotification}
            onChange={(e) =>
              setSettings({
                ...settings,
                whatsappNotification: e.target.checked,
              })
            }
          />

          <label>WhatsApp Notifications</label>
        </div>

        <button onClick={saveSettings} className="primary-btn">
          Save Settings
        </button>
      </div>
    </div>
  );
}

export default Settings;
