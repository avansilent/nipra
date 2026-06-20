import type { Metadata } from "next";
import { Suspense } from "react";
import JoinAdmissionFlow from "../../components/JoinAdmissionFlow";
import JoinAdmissionFlowFromSearch from "../../components/JoinAdmissionFlowFromSearch";
import { fetchPublishedCourses } from "../../lib/publicCourses";
import { fetchSiteSettings } from "../../lib/siteSettings";

export const metadata: Metadata = {
  title: "Online Admission | Nipracademy | Pay Securely via Razorpay",
  description:
    "Apply online to Nipracademy. Choose your course, fill admission form, and pay via Razorpay. Instant student portal access after verified payment.",
};

export default async function JoinPage() {
  const [courses, siteSettings] = await Promise.all([fetchPublishedCourses(), fetchSiteSettings()]);
  const admissionSiteSettings = {
    siteName: siteSettings.siteName,
    contactPhone: siteSettings.contactPhone,
  };

  return (
    <Suspense fallback={<JoinAdmissionFlow courses={courses} siteSettings={admissionSiteSettings} />}>
      <JoinAdmissionFlowFromSearch courses={courses} siteSettings={admissionSiteSettings} />
    </Suspense>
  );
}
