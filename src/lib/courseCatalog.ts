import { academyCatalog, findAcademyCatalogCourse, type AcademyCatalogCourse } from "../data/academyCatalog";
import type { AdmissionCourse } from "../types/admission";

export function getCatalogCourseById(courseId: string): AcademyCatalogCourse | null {
  return academyCatalog.find((course) => course.id === courseId) ?? null;
}

export function findAdmissionCourseForCatalogCourse(
  courseId: string,
  publishedCourses: AdmissionCourse[]
): AdmissionCourse | null {
  return (
    publishedCourses.find((course) => findAcademyCatalogCourse(course.title)?.id === courseId) ?? null
  );
}

export function getAdmissionOpenCatalogIds(publishedCourses: AdmissionCourse[]): string[] {
  const ids = new Set<string>();

  for (const course of publishedCourses) {
    const catalogId = findAcademyCatalogCourse(course.title)?.id;
    if (catalogId) {
      ids.add(catalogId);
    }
  }

  return [...ids];
}