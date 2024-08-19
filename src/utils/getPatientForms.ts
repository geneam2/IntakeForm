import { Patient } from "../types/Patient";

export const getPatientForms = async (): Promise<Patient[]> => {
  // console.log("Fetching data...");

  try {
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_URL}/intakeAPI/patientsFromIntake`,
      requestOptions
    );

    if (!response.ok) {
      const errorMessage = await response.json();
      throw new Error(`Failed to fetch patient forms, ${errorMessage.error}`);
    }

    const intakeForms: Patient[] = await response.json();

    const questionPromises = intakeForms.map(async (form) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/intakeAPI/patientProblemDescription/${form.Id}`,
        requestOptions
      );

      if (!res.ok) {
        const errorMessage = await res.json();
        throw new Error(
          `Failed to fetch data for form ${form.Id}: ${errorMessage.error}`
        );
      }

      return res.json();
    });

    const questions = await Promise.all(questionPromises);
    const questionMap = new Map(questions.map((q) => [q.Id, q]));

    const mergedData = intakeForms.map((form) => ({
      ...form,
      ...(questionMap.get(form.Id) || {}),
    }));

    // console.log("Done fetching forms");
    return mergedData;
  } catch (error) {
    console.error("Error merging data:", error);
    return [];
  }
};
