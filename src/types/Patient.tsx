/*
 * Patient keys are largely based on the order in which they appear on the AccordionList.
 * A ? denotes that the field is optional as listed on the survey.
 */
export type Patient = {
  Id: number;
  QuestionnaireId: string;
  DateSubmitted: number;
  ClientName: string;
  ClientSex: string;
  ClientDOB: string;
  ClientAddress: string;
  ClientCity: string;
  ClientState: string;
  ClientZip: number;
  ClientEmail?: string;
  ClientNumber: string;
  PrimaryInsurance?: string;
  PolicyNumber?: string;
  ServiceDates?: string;
  DoctorName?: string;
  DoctorNumber?: string;
  BodyParts: string;
  PatientComplaint: string;
  ICDRecommendations: string;
  EmailSent: boolean;
};

export type PatientMap = {
  [Id: string]: Patient;
};
