import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import { getResponse, extractCardData } from "../claude.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
dotenv.config();

router.post("/classify", async (req, res) => {
  try {
    const problemDescription = req.body.userPrompt;

    if (!problemDescription) {
      return res
        .status(400)
        .json({ error: "Invalid or missing problemDesc in request body" });
    }

    const response = await getResponse(problemDescription);

    res.json({ response });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/extractCardData",
  upload.single("cardImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const result = await extractCardData(req.file);

      const result1 = {
        provider: result.provider,
        policyNumber: result.policyNumber,
        cardData: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      };

      res.status(200).json(result1);
    } catch (error) {
      console.error("Error:", error);
      res
        .status(500)
        .json({ error: error.message || "An unexpected error occurred" });
    }
  }
);

export default router;
