import * as React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LinkIcon from "@mui/icons-material/Link";
import PendingIcon from "@mui/icons-material/Pending";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import PublishIcon from "@mui/icons-material/Publish";
import FileUpload from "../components/FileUpload";
import { Button } from "../components/Button";
import { ButtonConf } from "../components/ButtonConf";
import { Select } from "../components/Select";
import { Textarea } from "@headlessui/react";
import { Patient } from "../types/Patient";
import { getPatientForms } from "@/utils/getPatientForms";
import { calculateTimeAgo } from "@/utils/calculateTimeAgo";
import { formatDate } from "@/utils/formatDate";
import { isValidEmail } from "@/utils/isValidEmail";
import { useState, useEffect, useCallback } from "react";

const AccordionList: React.FC = () => {
  const [formData, setFormData] = useState<Patient[]>([]);
  const [expanded, setExpanded] = useState<string | false>("");
  const [textareaValue, setTextareaValue] = useState<string>("Loading...");
  const [billerEmail, setBillerEmail] = useState("genelam@seas.upenn.edu");
  const [recCounter, setRecCounter] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [insurance, setInsurance] = useState<{
    policyNumber?: string;
    provider?: string;
    serviceDates?: string;
    cardData?: string;
    mimeType?: string;
    status?: string;
  } | null>(null);

  const handleGetPatientForms = async () => {
    setIsLoading(true);
    try {
      const newFormData = await getPatientForms();
      if (newFormData.length > 0) {
        setAlertMessage("Forms successfully received");
      } else {
        setAlertMessage("Forms not received");
      }
      setFormData(newFormData);
      setLastRefreshed(formatDate(new Date()));
    } catch (error) {
      console.error("Error fetching patient forms:", error);
      setAlertMessage("Error fetching patient forms");
    } finally {
      setIsLoading(false);
      setTimeout(() => setAlertMessage(null), 5000);
    }
  };

  useEffect(() => {
    handleGetPatientForms();
  }, []);

  const handleTextareaChange = async (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newText = event.target.value;
    setTextareaValue(newText);
    if (expanded) {
      const index = parseInt(expanded.substring(5));
      const patient = formData[index];
      patient.ICDRecommendations = newText;
    }
  };

  const saveICDRecs = async () => {
    if (expanded) {
      try {
        const index = parseInt(expanded.substring(5));
        const patient = formData[index];

        const requestOptions = {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: patient.Id,
            icd_codes: patient.ICDRecommendations,
          }),
        };

        const updateDatabaseResponse = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/postgres/updatePatient`,
          requestOptions
        );

        if (!updateDatabaseResponse.ok) {
          const errorMessage = await updateDatabaseResponse.text();
          throw new Error(`${errorMessage} ${patient.ClientName}`);
        }

        await updateDatabaseResponse.text();
        setAlertMessage(`Recommendations saved successfully`);
      } catch (error) {
        setAlertMessage(`${error}`);
      } finally {
        setTimeout(() => setAlertMessage(null), 5000);
      }
    } else {
      setAlertMessage("Select a patient to send form");
      setTimeout(() => setAlertMessage(null), 5000);
    }
  };

  const handleChange =
    (panel: string, personId: number) =>
    (event: React.SyntheticEvent, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : false);

      if (newExpanded) {
        const patient_rec = formData.find(
          (f) => f.Id === personId
        )?.ICDRecommendations;
        if (patient_rec) {
          setTextareaValue(patient_rec);
        }
      }
    };

  const fetchICDCodes = useCallback(async () => {
    // console.log("Getting recommendations...");

    const dbRequestOptions = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/postgres/getPatients`,
        dbRequestOptions
      );

      if (!response.ok) {
        throw new Error(
          "cannot get ICD recommendations from postgres database."
        );
      }

      const data = await response.json();

      for (const f of formData) {
        if (
          f.PatientComplaint &&
          (!f.ICDRecommendations || f.ICDRecommendations === "")
        ) {
          if (f.Id in data) {
            f.ICDRecommendations = data[f.Id].icd_codes;
            f.EmailSent = data[f.Id].emailSent;
          } else {
            const claudeRequestOptions = {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userPrompt: f.PatientComplaint }),
            };
            const claudeResponse = await fetch(
              `${process.env.NEXT_PUBLIC_URL}/claude/classify`,
              claudeRequestOptions
            );

            if (!claudeResponse.ok) {
              throw new Error(
                `unable to get claude recommendations for ${f.ClientName}`
              );
            }

            const claudeData = await claudeResponse.json();

            f.ICDRecommendations = claudeData.response;

            setRecCounter((prev) => prev + 1); // Delete later

            const dbPostRequestOptions = {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: f.Id,
                icd_codes: f.ICDRecommendations,
                emailSent: false,
              }),
            };
            const dbPostResponse = await fetch(
              `${process.env.NEXT_PUBLIC_URL}/postgres/postNewPatient`,
              dbPostRequestOptions
            );

            if (!dbPostResponse.ok) {
              const errorText = await dbPostResponse.text();
              throw new Error(
                `${dbPostResponse.statusText} - ${errorText} for ${f.ClientName}`
              );
            }

            const dbData = await dbPostResponse.text();
            // console.log(`${dbPostResponse.statusText} for ${f.ClientName}`);
            // console.log(dbData);
          }
        }
      }
      // console.log("Done fetching recommendations");
    } catch (error) {
      console.error("Error:", error);
    }
  }, [formData]);

  useEffect(() => {
    const fetchAllICDCodes = async () => {
      try {
        await fetchICDCodes();
      } catch (error) {
        console.error("Error fetching ICD codes:", error);
      }
    };

    fetchAllICDCodes();
  }, [fetchICDCodes]);

  const updateEmailSentStatus = async (patientId: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/postgres/updateSentEmail/${patientId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update email sent status");
      }

      setFormData((prevData) =>
        prevData.map((patient) =>
          patient.Id === patientId ? { ...patient, emailSent: true } : patient
        )
      );

      setAlertMessage("Email sent status updated successfully");
    } catch (error) {
      console.error("Error updating email sent status:", error);
      setAlertMessage("Failed to update email sent status");
    } finally {
      setTimeout(() => setAlertMessage(null), 5000);
    }
  };

  const sendEmail = async () => {
    if (expanded) {
      const index = parseInt(expanded.substring(5));
      const patient = formData[index];
      // console.log("The biller email is ", billerEmail);

      try {
        if (!isValidEmail(billerEmail)) {
          throw new Error("Enter a valid email address");
        }

        const sendEmailRequestOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailTo: billerEmail,
            name: patient,
            message: insurance,
          }),
        };
        const sendEmailResponse = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/email/sendEmail`,
          sendEmailRequestOptions
        );

        if (!sendEmailResponse.ok) {
          const errorText = await sendEmailResponse.text();
          throw new Error(
            `${sendEmailResponse.statusText} - ${errorText} for ${patient.ClientName}`
          );
        }

        const emailData = await sendEmailResponse.json();
        if (emailData.error) {
          throw new Error(emailData.error);
        }

        setFormData((prevData) =>
          prevData.map((p) =>
            p.Id === patient.Id ? { ...p, EmailSent: true } : p
          )
        );

        await updateEmailSentStatus(patient.Id);

        setAlertMessage("Email sent successfully");
      } catch (error) {
        setAlertMessage(`${error}`);
      } finally {
        // Clear alert message after 5 seconds
        setTimeout(() => setAlertMessage(null), 5000);
      }
    } else {
      setAlertMessage("Select a patient to send form");
      setTimeout(() => setAlertMessage(null), 5000);
    }
  };

  useEffect(() => {
    if (!expanded) {
      setTextareaValue("Please select a form.");
    }
  }, [expanded]);

  useEffect(() => {
    if (expanded) {
      const index = parseInt(expanded.substring(5));
      const patient = formData[index];
      patient.PrimaryInsurance = insurance?.provider;
      patient.PolicyNumber = insurance?.policyNumber;
    }
  }, [insurance?.policyNumber, insurance?.provider]);

  const handleInsuranceInputChange = (field: string, value: string) => {
    if (expanded) {
      const index = parseInt(expanded.substring(5));
      const updatedFormData = [...formData];
      const currentPatient = updatedFormData[index];
      const updatedPatient: Patient = {
        ...currentPatient,
        [field]: value,
      };
      updatedFormData[index] = updatedPatient;
      setFormData(updatedFormData);
    }
  };

  useEffect(() => {
    if (insurance?.status) {
      setAlertMessage(insurance?.status);
      setTimeout(() => setAlertMessage(null), 5000);
    }
  }, [insurance?.status]);

  return (
    <div className="flex flex-row lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
      <div className="flex-1 flex flex-col items-center mr-4">
        <h1 className="text-center font-semibold text-xl mb-2">
          Patient Intake Forms
        </h1>
        <div className="h-80 overflow-y-auto border border-gray-300 p-2 rounded-lg resize-y min-h-80 w-96 max-h-full max-w-full">
          {formData.map((patient, index) => (
            <Accordion
              key={`${patient.Id}-${patient.EmailSent}`}
              expanded={expanded === `panel${index}`}
              onChange={handleChange(`panel${index}`, patient.Id)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <div className="flex justify-between w-full">
                  <div className="flex items-center">
                    <Typography component={"span"} variant="subtitle1">
                      {patient.ClientName}
                    </Typography>
                    <Typography component={"span"}>
                      <p className="mt-1 mr-2 ml-2 text-xs text-gray-500">
                        {calculateTimeAgo(patient.DateSubmitted)}
                      </p>
                    </Typography>
                  </div>
                  <a
                    href={`https://intakeq.com/#/history/${patient.Id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {patient.EmailSent && (
                      <MarkEmailReadIcon className="text-green-500 h-5 w-5" />
                    )}

                    <LinkIcon />
                  </a>
                </div>
              </AccordionSummary>
              <AccordionDetails>
                <div className="flex">
                  <div className="flex1">
                    <Typography component={"span"}>
                      {[
                        { label: "Sex", value: patient.ClientSex },
                        { label: "DOB", value: patient.ClientDOB },
                        {
                          label: "Address",
                          value:
                            patient.ClientAddress +
                            " " +
                            patient.ClientCity +
                            ", " +
                            patient.ClientState +
                            " " +
                            patient.ClientZip,
                        },
                        { label: "Email", value: patient.ClientEmail },
                        { label: "Phone", value: patient.ClientNumber },
                        {
                          label: "Provider",
                          value: (
                            <input
                              type="text"
                              value={patient?.PrimaryInsurance || ""}
                              className="w-3/4 border border-gray-300 rounded p-1"
                              onChange={(e) =>
                                handleInsuranceInputChange(
                                  "PrimaryInsurance",
                                  e.target.value
                                )
                              }
                            />
                          ),
                        },
                        {
                          label: "Policy Number",
                          value: (
                            <input
                              type="text"
                              value={patient?.PolicyNumber || ""}
                              className="w-2/3 border border-gray-300 rounded p-1"
                              onChange={(e) =>
                                handleInsuranceInputChange(
                                  "PolicyNumber",
                                  e.target.value
                                )
                              }
                            />
                          ),
                        },
                        {
                          label: "Dates of Service",
                          value: (
                            <input
                              type="text"
                              value={patient?.ServiceDates || ""}
                              className="w-7/12 border border-gray-300 rounded p-1"
                              onChange={(e) =>
                                handleInsuranceInputChange(
                                  "ServiceDates",
                                  e.target.value
                                )
                              }
                            />
                          ),
                        },
                        { label: "Doctor Name", value: patient.DoctorName },
                        { label: "Doctor Number", value: patient.DoctorNumber },
                        { label: "Area(s) of pain", value: patient.BodyParts },
                        {
                          label: "Patient Complaint",
                          value: patient.PatientComplaint,
                        },
                      ].map((item, index) => (
                        <p key={index} className="text-sm text-gray-700">
                          {item.label}: {item.value}
                        </p>
                      ))}
                    </Typography>
                  </div>
                </div>
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
        <div className="flex justify-between items-center w-full">
          <h1 className="mt-1 ml-3 text-sm text-gray-500">
            {formData.length} forms
          </h1>
          <h1 className="mt-1 ml-auto mr-3 text-sm text-gray-500">
            Last refreshed: {lastRefreshed}
          </h1>
        </div>
        <Button className="mt-2" onClick={handleGetPatientForms}>
          Get Forms
        </Button>
        {isLoading && <PendingIcon className="text-yellow-500 animate-spin" />}
        <>
          {/* Comment out during deployment */}
          {/* <h1 className="mt-2">Server: {process.env.NEXT_PUBLIC_URL}</h1>
          <h1>Claude calls: {recCounter}</h1> */}
        </>
      </div>
      <div className="flex-1 ml-4 flex flex-col justify-center items-center">
        <h1 className="text-center font-semibold text-xl mb-2">
          Suggested ICD Codes
        </h1>
        <div className="relative">
          <Textarea
            value={textareaValue}
            onChange={handleTextareaChange}
            className="min-h-72 w-96 max-h-full max-w-full border border-gray-300 rounded-lg p-2.5 text-black pr-10"
          />
          <button
            className="absolute top-2 right-2"
            onClick={saveICDRecs}
            aria-label="Save ICD Recommendations"
          >
            <PublishIcon />
          </button>
        </div>

        <Select
          className="mt-2"
          name="biller"
          value={billerEmail}
          onChange={(e) => setBillerEmail(e.target.value)}
        >
          <option value="genelam@seas.upenn.edu">Biller 1</option>
          <option value="genelam@seas.upenn.edu">Biller 2</option>
          <option value="genelam@seas.upenn.edu">Biller 3</option>
        </Select>
        <ButtonConf onConfirm={sendEmail} className="mt-2">
          Send Email
        </ButtonConf>
        <div className="mt-2 text-sm">
          <FileUpload setData={setInsurance} />
        </div>
      </div>
      {alertMessage && (
        <div
          className={`fixed top-4 right-4 p-4 rounded shadow-lg ${
            alertMessage.includes("successfully")
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {alertMessage}
        </div>
      )}
    </div>
  );
};

export default AccordionList;
