import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export const sendWhatsAppMessage = async ({
  status,
  fileName,
  errorMessage,
}) => {
  try {
    let body = "";

    if (status === "success") {
      body = `*Mongo DB Backup Success* ✅ 

📁 File: ${fileName}

📅 Date & Time : ${new Date().toLocaleString()}

☁ Local + OneDrive Sync Completed

🚀 Mongo Backup Monitoring System`;
    } else {
      body = ` *Mongo DB Backup Failed* ❌

⚠ Error: ${errorMessage}

📅 Date & Time : ${new Date().toLocaleString()}

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
