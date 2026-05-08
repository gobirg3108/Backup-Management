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

export const sendBackupMail = async ({ status, fileName, errorMessage }) => {
  try {
    let subject = "";
    let html = "";

    if (status === "success") {
      subject = "Mongo DB  Backup Completed";

      html = `
<div style="
  font-family: Arial;
  background: #f4f4f4;
  padding: 30px;
">

  <div style="
    max-width: 600px;
    margin: auto;
    background: white;
    border-radius: 12px;
    overflow: hidden;
  ">

    <div style="
      background: #000;
      color: white;
      padding: 20px;
      text-align: center;
    ">

      <h1>
        Mongo Backup System
      </h1>

    </div>

    <div style="padding: 30px;">

      <h2 style="color: green;">
         Backup Completed
      </h2>

      <p>
        Your MongoDB backup
        completed successfully.
      </p>

      <table style="
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      ">

        <tr>
          <td style="
            padding: 10px;
            border: 1px solid #ddd;
          ">
            Backup File
          </td>

          <td style="
            padding: 10px;
            border: 1px solid #ddd;
          ">
            ${fileName}
          </td>
        </tr>

        <tr>
          <td style="
            padding: 10px;
            border: 1px solid #ddd;
          ">
            Status
          </td>

          <td style="
            padding: 10px;
            border: 1px solid #ddd;
            color: green;
          ">
            Success
          </td>
        </tr>

        <tr>
          <td style="
            padding: 10px;
            border: 1px solid #ddd;
          ">
            Time
          </td>

          <td style="
            padding: 10px;
            border: 1px solid #ddd;
          ">
            ${new Date().toLocaleString()}
          </td>
        </tr>

      </table>

    </div>

    <div style="
      background: #f5f5f5;
      padding: 15px;
      text-align: center;
      font-size: 12px;
      color: gray;
    ">

      Mongo Backup Monitoring System

    </div>

  </div>

</div>
`;
    } else {
      subject = "Mongo Backup Failed";

      html = `
<div style="
  font-family: Arial;
  background: #f4f4f4;
  padding: 30px;
">

  <div style="
    max-width: 600px;
    margin: auto;
    background: white;
    border-radius: 12px;
    overflow: hidden;
  ">

    <div style="
      background: #dc2626;
      color: white;
      padding: 20px;
      text-align: center;
    ">

      <h1>
        Mongo Backup Failed
      </h1>

    </div>

    <div style="padding: 30px;">

      <h2 style="color: red;">
         Backup Failed
      </h2>

      <p>
        Backup process failed.
      </p>

      <table style="
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      ">

        <tr>
          <td style="
            padding: 10px;
            border: 1px solid #ddd;
          ">
            Error
          </td>

          <td style="
            padding: 10px;
            border: 1px solid #ddd;
            color: red;
          ">
            ${errorMessage}
          </td>
        </tr>

        <tr>
          <td style="
            padding: 10px;
            border: 1px solid #ddd;
          ">
            Time
          </td>

          <td style="
            padding: 10px;
            border: 1px solid #ddd;
          ">
            ${new Date().toLocaleString()}
          </td>
        </tr>

      </table>

    </div>

  </div>

</div>
`;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,

      to: process.env.EMAIL_TO,

      subject,

      html,
    });

    console.log("Email Sent Successfully");
  } catch (error) {
    console.log("Mail Error:", error.message);
  }
};
