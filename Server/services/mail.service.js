import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendBackupMail = async ({
  status,
  fileName,
  fileSize,
  dbName,
  errorMessage,
}) => {
  try {
    const subject =
      status === "success"
        ? "Mongo Backup Completed ✅"
        : "Mongo Backup Failed ❌";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; color: #111827; }
    .container { max-width: 650px; margin: auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .header-success { background: linear-gradient(135deg, #16a34a, #22c55e); color: white; text-align: center; padding: 25px; }
    .header-failed { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; text-align: center; padding: 25px; }
    .header-title { font-size: 30px; font-weight: bold; }
    .content { padding: 30px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .table td { border: 1px solid #e5e7eb; padding: 14px; font-size: 16px; }
    .label { font-weight: bold; background: #f9fafb; width: 40%; }
    .success { color: #16a34a; font-weight: bold; }
    .failed { color: #dc2626; font-weight: bold; }
    .footer { background: #f3f4f6; text-align: center; padding: 18px; font-size: 13px; color: #6b7280; }
    .alert-box { margin-top: 20px; padding: 16px; background: #fef2f2; border-left: 5px solid #dc2626; color: #991b1b; border-radius: 8px; font-size: 15px; }
    @media only screen and (max-width: 600px) {
      body { padding: 10px; }
      .content { padding: 18px; }
      .header-title { font-size: 22px; }
      .table td { font-size: 14px; padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="${status === "success" ? "header-success" : "header-failed"}">
      <div class="header-title">${status === "success" ? "Mongo Backup Completed ✅" : "Mongo Backup Failed ❌"}</div>
    </div>
    <div class="content">
      <table class="table">
        <tr><td class="label">Database</td><td>${dbName || "N/A"}</td></tr>
        ${
          status === "success"
            ? `<tr><td class="label">Backup File</td><td>${fileName || "N/A"}</td></tr>
             <tr><td class="label">File Size</td><td>${fileSize || "N/A"}</td></tr>`
            : `<tr><td class="label">Error</td><td class="failed">${errorMessage || "Unknown Error"}</td></tr>`
        }
        <tr><td class="label">Status</td><td class="${status === "success" ? "success" : "failed"}">${status === "success" ? "Success" : "Failed"}</td></tr>
        <tr><td class="label">Time</td><td>${new Date().toLocaleString()}</td></tr>
      </table>
      ${status !== "success" ? `<div class="alert-box">Immediate attention required.<br/>Retry system has been triggered.</div>` : ""}
    </div>
    <div class="footer">Mongo Backup Monitoring System</div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject,
      html,
    });

    console.log("Email Sent Successfully");
    return true;
  } catch (error) {
    console.log("Mail Error:", error.message);
    return false;
  }
};
