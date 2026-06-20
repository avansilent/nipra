"use client";

import { useSearchParams } from "next/navigation";
import JoinAdmissionFlow from "./JoinAdmissionFlow";
import type { AdmissionCourse } from "../types/admission";
import type { SiteSettings } from "../types/site";

type AdmissionSiteSettings = Pick<SiteSettings, "siteName" | "contactPhone">;

type JoinAdmissionFlowFromSearchProps = {
  courses: AdmissionCourse[];
  siteSettings: AdmissionSiteSettings;
};

export default function JoinAdmissionFlowFromSearch({ courses, siteSettings }: JoinAdmissionFlowFromSearchProps) {
  const searchParams = useSearchParams();
  const interest = searchParams.get("interest") || "";

  return <JoinAdmissionFlow courses={courses} siteSettings={siteSettings} interest={interest} />;
}
