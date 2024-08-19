import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const requiredEnvVars = [
  { name: "GCP_CLIENT_ID", value: process.env.GCP_CLIENT_ID },
  { name: "GCP_CLIENT_SECRET", value: process.env.GCP_CLIENT_SECRET },
  { name: "GCP_EMAIL_SENDER", value: process.env.GCP_EMAIL_SENDER },
  { name: "GCP_REDIRECT_URI", value: process.env.GCP_REDIRECT_URI },
  { name: "GCP_REFRESH_TOKEN", value: process.env.GCP_REFRESH_TOKEN },
];

for (const { name, value } of requiredEnvVars) {
  if (!value) {
    throw new Error(`${name} is not set in env`);
  }
}

function createClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GCP_CLIENT_ID,
    process.env.GCP_CLIENT_SECRET,
    process.env.GCP_REDIRECT_URI
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GCP_REFRESH_TOKEN });

  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  return gmail;
}

export async function sendEmail(emailTo, subject, htmlBody, attachment) {
  const gmail = createClient();

  let attachmentParts;
  if (attachment && attachment.mimeType && attachment.cardData) {
    attachmentParts = `--boundary\nContent-Type: ${attachment.mimeType}\nContent-Transfer-Encoding: base64\nContent-Disposition: attachment; filename="cardImage"\n\n${attachment.cardData}\n`;
  } else {
    attachmentParts = null;
  }

  const message = [
    `From: ${process.env.GCP_EMAIL_SENDER}`,
    `To: ${emailTo}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary=boundary`,
    "",
    "This is a multi-part message in MIME format.",
    `--boundary`,
    "Content-Type: text/html; charset=utf-8",
    "",
    htmlBody,
    ...(attachmentParts ? [attachmentParts] : []),
    `--boundary--`,
  ].join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sendRequest = {
    userId: "me",
    resource: {
      raw: encodedMessage,
    },
  };

  return gmail.users.messages.send(sendRequest);
}
