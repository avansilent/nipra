export type AdmissionCourse = {
  id: string;
  instituteId: string;
  title: string;
  description: string | null;
  priceText: string | null;
  ctaLabel: string | null;
};

export type AdmissionCredentials = {
  studentId: string;
  email: string;
  password: string;
};

export type AdmissionPaymentDetails = {
  orderId: string;
  paymentId: string;
  amountLabel: string;
  method: string | null;
  status: "verified" | "captured";
};

export type AdmissionResult = {
  studentName: string;
  courseTitle: string;
  credentials: AdmissionCredentials;
  payment?: AdmissionPaymentDetails;
};