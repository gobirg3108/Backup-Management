import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export const sendWhatsAppMessage = async ({
  status,
  fileName,
  fileSize,
  dbName,
  errorMessage,
}) => {
  try {
    let body = "";

    if (status === "success") {
      body = `✅ *Mongo DB Backup Success*

📊 Database : ${dbName}

📁 File : ${fileName}

📦 File Size : ${fileSize}

📅 Date & Time : ${new Date().toLocaleString()}

☁ Local + OneDrive Sync Completed

🚀 Mongo Backup Monitoring System`;
    } else {
      body = `❌ *Mongo DB Backup Failed*

📊 Database : ${dbName}

🚫 Error : ${errorMessage}

📅 Date & Time : ${new Date().toLocaleString()}

🔄 Retry System Triggered

🚨 Immediate Attention Required`;
    }

    await client.messages.create({
      body,

      from: process.env.TWILIO_WHATSAPP_FROM,

      to: process.env.TWILIO_WHATSAPP_TO,
    });

    console.log("WhatsApp Message Sent");
  } catch (error) {
    console.log("WhatsApp Error:", error.message);
  }
};
