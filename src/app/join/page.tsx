import type { Metadata } from "next";
import { Suspense } from "react";
import JoinAdmissionFlow from "../../components/JoinAdmissionFlow";
import JoinAdmissionFlowFromSearch from "../../components/JoinAdmissionFlowFromSearch";
import { fetchPublishedCourses } from "../../lib/publicCourses";
import { fetchSiteSettings } from "../../lib/siteSettings";

export const metadata: Metadata = {
  title: "Join a Course | Nipracademy",
  description: "Start Nipracademy admission, choose online or offline mode, and complete secure course payment.",
};

export default async function JoinPage() {
  const [courses, siteSettings] = await Promise.all([fetchPublishedCourses(), fetchSiteSettings()]);

  return (
    <Suspense fallback={<JoinAdmissionFlow courses={courses} siteSettings={siteSettings} />}>
      <JoinAdmissionFlowFromSearch courses={courses} siteSettings={siteSettings} />
    </Suspense>
  );
}
