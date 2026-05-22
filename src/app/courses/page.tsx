import CoursesExperience from "../../components/CoursesExperience";
import { getAdmissionOpenCatalogIds } from "../../lib/courseCatalog";
import { fetchPublishedCourses } from "../../lib/publicCourses";
import { fetchSiteSettings } from "../../lib/siteSettings";

type CoursesPageProps = {
  searchParams?: Promise<{
    program?: string;
    intent?: string;
  }>;
};

export default async function Courses({ searchParams }: CoursesPageProps) {
  const resolvedSearchParams = await searchParams;
  const [siteSettings, publishedCourses] = await Promise.all([fetchSiteSettings(), fetchPublishedCourses()]);

  return (
    <CoursesExperience
      contactPhone={siteSettings.contactPhone}
      admissionOpenCourseIds={getAdmissionOpenCatalogIds(publishedCourses)}
      initialProgramId={resolvedSearchParams?.program}
      initialIntent={resolvedSearchParams?.intent === "buy" ? "buy" : "explore"}
    />
  );
}
