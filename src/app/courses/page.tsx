import CoursesExperience from "../../components/CoursesExperience";
import { getAdmissionOpenCatalogIds } from "../../lib/courseCatalog";
import { fetchPublishedCourses } from "../../lib/publicCourses";
import { fetchSiteSettings } from "../../lib/siteSettings";

export default async function Courses() {
  const [siteSettings, publishedCourses] = await Promise.all([fetchSiteSettings(), fetchPublishedCourses()]);

  return (
    <CoursesExperience
      contactPhone={siteSettings.contactPhone}
      admissionOpenCourseIds={getAdmissionOpenCatalogIds(publishedCourses)}
    />
  );
}
