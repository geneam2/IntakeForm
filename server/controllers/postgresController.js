import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { encrypt, decrypt } from "../postgresClient.js";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();
dotenv.config();
const SUPABASE_PROJECT_URL = process.env.SUPABASE_PROJECT_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;

router.get("/getPatients", async (req, res) => {
  try {
    const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_API_KEY);

    const { data, error } = await supabase.from("patients").select("*");

    if (error) {
      throw new Error(error.message);
    }

    const jsonDict = data.reduce((acc, curr) => {
      acc[decrypt(curr.user_id)] = {
        icd_codes: decrypt(curr.icd_codes),
        emailSent: curr.emailsent,
      };
      return acc;
    }, {});

    res.status(200).json(jsonDict);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching patients", details: error.message });
  }
});

router.post("/postNewPatient", async (req, res) => {
  const { user_id, icd_codes, emailSent = false } = req.body;

  if (!user_id || icd_codes == null) {
    return res.status(400).send("Missing or invalid user_id or icd_codes");
  }

  try {
    const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_API_KEY);
    const { error } = await supabase.from("patients").insert([
      {
        user_id: encrypt(user_id),
        icd_codes: encrypt(icd_codes),
        emailsent: emailSent,
      },
    ]);

    if (error) {
      if (error.code === "23505") {
        // 23505 is the error code for unique violation in PostgreSQL
        return res.status(409).send("Patient with this ID already exists");
      } else {
        throw error;
      }
    }

    res.status(201).send("Patient added successfully");
  } catch (error) {
    console.error("Error inserting patient:", error);
    res.status(500).send("Error inserting patient");
  }
});

router.put("/updateSentEmail/:user_id", async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).send("Missing or invalid userID.");
  }

  try {
    const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_API_KEY);

    // Fetch all user_ids from the patients table
    const { data: patients, error: fetchError } = await supabase
      .from("patients")
      .select("user_id");

    if (fetchError) {
      return res
        .status(500)
        .send(`Error fetching patients: ${fetchError.message}`);
    }

    // Find the encrypted user_id that matches the provided user_id
    const encryptedUserId = patients
      .filter((row) => user_id === decrypt(row.user_id))
      .reduce((acc, row) => row.user_id, null);

    if (!encryptedUserId) {
      return res.status(404).send("Patient not found.");
    }

    // Update the emailsent status
    const { error: updateError } = await supabase
      .from("patients")
      .update({ emailsent: true })
      .eq("user_id", encryptedUserId);

    if (updateError) {
      return res
        .status(500)
        .send(`Error updating email sent status: ${updateError.message}`);
    }

    res.status(200).send("Email sent status updated successfully.");
  } catch (error) {
    res.status(500).send(`Error updating email sent status: ${error.message}`);
  }
});

router.put("/updatePatient", async (req, res) => {
  const { user_id, icd_codes } = req.body;

  if (!user_id || icd_codes == null) {
    return res.status(400).send("Missing or invalid userID or ICD codes.");
  }

  try {
    const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_API_KEY);

    // Fetch all user_ids from the patients table
    const { data: patients, error: fetchError } = await supabase
      .from("patients")
      .select("user_id");

    if (fetchError) {
      return res
        .status(500)
        .send(`Error fetching patients: ${fetchError.message}`);
    }

    // Find the encrypted user_id that matches the provided user_id
    const encryptedUserId = patients
      .filter((row) => user_id === decrypt(row.user_id))
      .reduce((acc, row) => row.user_id, null);

    if (!encryptedUserId) {
      return res.status(404).send("Patient not found.");
    }

    // Update both user_id and icd_codes
    const { error: updateError } = await supabase
      .from("patients")
      .update({
        user_id: encrypt(user_id),
        icd_codes: encrypt(icd_codes),
      })
      .eq("user_id", encryptedUserId);

    if (updateError) {
      return res
        .status(500)
        .send(`Error updating patient: ${updateError.message}`);
    }

    res.status(200).send("Patient ICD code updated successfully.");
  } catch (error) {
    res.status(500).send(`Error updating patient: ${error.message}`);
  }
});

export default router;
