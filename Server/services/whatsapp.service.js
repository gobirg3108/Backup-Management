import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

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
      body = `✅ *Mongo DB Backup Success*\n\n📊 Database : ${dbName}\n\n📁 File : ${fileName}\n\n📦 File Size : ${fileSize}\n\n📅 Date & Time : ${new Date().toLocaleString()}\n\n☁ Local + OneDrive Sync Completed\n\n🚀 Mongo Backup Monitoring System`;
    } else {
      body = `❌ *Mongo DB Backup Failed*\n\n📊 Database : ${dbName}\n\n🚫 Error : ${errorMessage}\n\n📅 Date & Time : ${new Date().toLocaleString()}\n\n🔄 Retry System Triggered\n\n🚨 Immediate Attention Required`;
    }

    await client.messages.create({
      body,
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.TWILIO_WHATSAPP_TO,
    });

    console.log("WhatsApp Message Sent");
    return true;
  } catch (error) {
    console.log("WhatsApp Error:", error.message);
    return false;
  }
};
