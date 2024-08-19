import express from "express";
import axios from "axios";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();

const getDateEightMonthsAgo = () => {
  const now = new Date();
  now.setMonth(now.getMonth() - 8);
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

router.get("/patientsFromIntake", async (req, res) => {
  const INTAKEQ_API_KEY = process.env.INTAKEQ_API_KEY;
  const INTAKEQ_FORM_KEY = process.env.INTAKEQ_FORM_KEY;

  if (!INTAKEQ_API_KEY) {
    return res.status(500).json({ error: "INTAKEQ_API_KEY is not set" });
  }

  if (!INTAKEQ_FORM_KEY) {
    return res.status(500).json({ error: "INTAKEQ_FORM_KEY is not set" });
  }

  try {
    const dateEightMonthsAgo = getDateEightMonthsAgo();
    const getFormsBaseUrl = `https://intakeq.com/api/v1/intakes/summary?startDate=${dateEightMonthsAgo}`;
    const header = {
      headers: {
        "X-auth-key": INTAKEQ_API_KEY,
      },
    };
    const { data, status } = await axios.get(getFormsBaseUrl, header);

    if (status !== 200) {
      return res.status(status).json({
        error: `unexpected response status ${status} retrieving form ids`,
      });
    }

    const filteredFields = [
      "Id",
      "QuestionnaireId",
      "DateSubmitted",
      "ClientName",
      "ClientEmail",
    ];
    const intakeForms = data
      .filter(
        (patient) => patient && patient.QuestionnaireId === INTAKEQ_FORM_KEY
      )
      .filter(
        (patient) =>
          new Date(patient.DateSubmitted) >= new Date(dateEightMonthsAgo)
      )

      .map((patient) => {
        let filteredPatient = {};
        filteredFields.forEach((field) => {
          if (field in patient) {
            filteredPatient[field] = patient[field];
          } else {
            console.warn(`Field ${field} not found in client data`);
          }
        });
        return filteredPatient;
      });

    res.status(200).json(intakeForms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/patientProblemDescription/:intakeId", async (req, res) => {
  const intakeId = req.params.intakeId;
  const INTAKEQ_API_KEY = process.env.INTAKEQ_API_KEY;

  if (!INTAKEQ_API_KEY) {
    return res.status(500).json({ error: "INTAKEQ_API_KEY is not set" });
  }

  if (!intakeId) {
    return res.status(400).json({ error: "intakeId is not set" });
  }

  try {
    const header = {
      headers: {
        "X-auth-key": INTAKEQ_API_KEY,
      },
    };
    const { data, status } = await axios.get(
      `https://intakeq.com/api/v1/intakes/${intakeId}`,
      header
    );

    if (status !== 200) {
      return res.status(status).json({
        error: `unexpected response status ${status} retrieving patient complaint`,
      });
    }

    const filteredClient = { Id: intakeId };
    const questionIds = {
      "dznt-8": "ClientSex",
      "dznt-2": "ClientDOB",
      "dznt-9": "ClientAddress",
      "dznt-11": "ClientCity",
      "dznt-12": "ClientState",
      "dznt-13": "ClientZip",
      "dznt-6": "ClientNumber",
      "nk3s-1": "PrimaryInsurance",
      "nk3s-2": "PolicyNumber",
      "nk3s-4": "DoctorName",
      "nk3s-5": "DoctorNumber",
      s6cd: "PatientComplaintAndBodyParts",
    };

    data.Questions.forEach((question) => {
      const field = questionIds[question.Id];
      if (field) {
        if (question.Id === "s6cd") {
          filteredClient.PatientComplaint = question.FurtherExplanation;
          filteredClient.BodyParts = question.Answer;
        } else {
          filteredClient[field] = question.Answer;
        }
      }
    });

    res.status(200).json(filteredClient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
