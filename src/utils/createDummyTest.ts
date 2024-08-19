import { Patient } from "@/types/Patient";

export function createDummyTest(): Patient[] {
  const n = 10000;
  const patients: Patient[] = [];
  const templatePatient: Patient = {
    Id: 1,
    ClientName: "Bob",
    ClientEmail: "bobsomething@gmail.com",
    ClientNumber: "",
    ClientAddress: "12 asdas ",
    ClientZip: 0,
    ClientState: "",
    ClientCity: "",
    ClientDOB: "",
    ClientSex: "",
    DoctorName: "",
    DoctorNumber: "",
    DateSubmitted: 0,
    BodyParts: "",
    QuestionnaireId: "",
    PatientComplaint: "",
    ICDRecommendations: "",
    EmailSent: false
  };

  for (let i = 0; i < n; i++) {
    patients.push({ ...templatePatient, Id: i + 1 });
  }

  return patients;
}
