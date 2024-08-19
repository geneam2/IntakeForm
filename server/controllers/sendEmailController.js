import express from "express";
import dotenv from "dotenv";
import { sendEmail } from "../emailClient.js";

const router = express.Router();
dotenv.config();

// TODO: add attachment
router.post("/sendEmail", async (req, res) => {
  const { emailTo, name: patient, message: insurance } = req.body;

  if (!emailTo || !patient) {
    return res.status(400).json({
      error: "Missing required fields: emailTo or patient object",
    });
  }

  const icdLines = patient.ICDRecommendations.split("\n");
  const htmlFormattedICDRecommendations = icdLines
    .map((line) => {
      if (line.trim().length === 0) return null;
      return `<li>${line.replace(/ - /, "- ")}</li>`;
    })
    .filter((line) => line)
    .join("");

  const subject = `${patient.ClientName} Billing`;
  const htmlBody = `
    <h3>Hello! Here's information regarding ${patient.ClientName}:</h3>
    <p><strong>Patient Full Name:</strong> ${patient.ClientName}</p>
    <p><strong>Patient DOB:</strong> ${patient.ClientDOB}</p>
    <p><strong>Address:</strong> ${patient.ClientAddress}, ${
    patient.ClientCity
  }, ${patient.ClientState} ${patient.ClientZip}</p>
    <p><strong>Insurance Name:</strong> ${
      patient.PrimaryInsurance || insurance?.provider || ""
    }</p>
    <p><strong>Insurance Id:</strong> ${
      patient.PolicyNumber || insurance?.policyNumber || ""
    }</p>
    <p><strong>Dates of Service:</strong> ${
      patient.ServiceDates || insurance?.serviceDates || ""
    }</p>
    <p><strong>ICD recommendations:</strong><ul>${htmlFormattedICDRecommendations}</ul></p>
    <h3>Thank you!</h3>
  `;

  try {
    await sendEmail(emailTo, subject, htmlBody, insurance);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
