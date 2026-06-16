import { revalidatePath, revalidateTag } from "next/cache";
import { homeContentCacheTag } from "./homeContent";
import { publishedCoursesCacheTag } from "./publicCourses";
import { siteSettingsCacheTag } from "./siteSettings";

export type RevalidationArea = "site" | "courses" | "learning" | "all";

const sitePaths = ["/", "/about", "/courses", "/join", "/terms-and-conditions"];
const learningPaths = ["/admin/dashboard", "/student/dashboard", "/books", "/notes"];

function revalidateTagSafely(tag: string) {
  try {
    revalidateTag(tag, "max");
  } catch {
    // Cache invalidation is best-effort after the database write succeeds.
  }
}

function revalidatePathSafely(path: string, type?: "layout" | "page") {
  try {
    if (type) {
      revalidatePath(path, type);
      return;
    }

    revalidatePath(path);
  } catch {
    // Cache invalidation is best-effort after the database write succeeds.
  }
}

export function revalidateAdminContent(area: RevalidationArea = "all") {
  const includeSite = area === "site" || area === "all";
  const includeCourses = area === "courses" || area === "all";
  const includeLearning = area === "learning" || area === "all";
  const paths = new Set<string>();

  if (includeSite) {
    revalidateTagSafely(homeContentCacheTag);
    revalidateTagSafely(siteSettingsCacheTag);
    sitePaths.forEach((path) => paths.add(path));
    revalidatePathSafely("/", "layout");
  }

  if (includeCourses) {
    revalidateTagSafely(publishedCoursesCacheTag);
    paths.add("/courses");
    paths.add("/join");
    revalidatePathSafely("/courses/[courseId]", "page");
  }

  if (includeLearning) {
    learningPaths.forEach((path) => paths.add(path));
  }

  paths.forEach((path) => revalidatePathSafely(path));
}
