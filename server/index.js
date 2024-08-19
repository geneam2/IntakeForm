import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

import intakeController from "./controllers/intakeController.js";
import postgresController from "./controllers/postgresController.js";
import claudeController from "./controllers/claudeController.js";
import sendEmailController from "./controllers/sendEmailController.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json({ limit: "10mb" })); // Adjust the limit as needed
app.use(cors());

// routes
app.use("/intakeAPI", intakeController);
app.use("/postgres", postgresController);
app.use("/claude", claudeController);
app.use("/email", sendEmailController);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
